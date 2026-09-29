import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { resumeAsText } from "@/lib/sections";

/* ---------- limits (tweak these to taste) ---------- */
const MAX_MESSAGE_CHARS = 500;   // longest single message we accept
const MAX_REPLY_CONTEXT_CHARS = 1500; // earlier V-01 replies are trimmed to this before being resent
const MAX_HISTORY = 6;           // only the last N messages are sent to Gemini
const MAX_OUTPUT_TOKENS = 200;   // the prompt asks for ~90 words; this enforces it
const RATE_LIMIT = 10;           // requests allowed per IP...
const RATE_WINDOW_MS = 60_000;   // ...per this window (1 minute)
const MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];
const MAX_ATTEMPTS = 2;          // attempts per model on transient errors

/* ---------- simple in-memory per-IP rate limiter ----------
   Good enough for a portfolio. On serverless hosts (e.g. Vercel) each
   instance keeps its own counter and it resets on cold start, so it stops
   casual spam but is not a hard guarantee. */
const hits = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Returns 0 if allowed, otherwise the number of seconds to wait. */
function checkRateLimit(ip: string): number {
  const now = Date.now();

  // opportunistic cleanup so the map can't grow forever
  if (hits.size > 500) {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }

  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return 0;
  }
  if (entry.count >= RATE_LIMIT) {
    return Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  }
  entry.count += 1;
  return 0;
}

let chatInstance: GoogleGenAI | null = null;

function getChatClient(): GoogleGenAI {
  if (!chatInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API key environment variable is not set. Please configure the required environment variable.");
    }
    chatInstance = new GoogleGenAI({
      apiKey,
    });
  }
  return chatInstance;
}

export async function POST(req: NextRequest) {
  try {
    // 1. rate limit first, before doing any work
    const retryAfter = checkRateLimit(getClientIp(req));
    if (retryAfter > 0) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const { messages, selectedSectionTitle } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid or missing messages array" }, { status: 400 });
    }

    // 2. keep only well-formed user/assistant text messages, newest few only
    const cleaned = messages
      .filter((m: any) => m && typeof m.content === "string" && m.content.trim() !== "")
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        text: m.content.trim(),
      }))
      .slice(-MAX_HISTORY)
      // earlier assistant replies can be longer than a typed question, so trim
      // them instead of rejecting the whole request
      .map((m) => (m.role === "model" ? { ...m, text: m.text.slice(0, MAX_REPLY_CONTEXT_CHARS) } : m));

    // Gemini expects the conversation to start with a user turn
    while (cleaned.length > 0 && cleaned[0].role !== "user") cleaned.shift();

    if (cleaned.length === 0) {
      return NextResponse.json({ error: "No valid messages found to send" }, { status: 400 });
    }

    // 3. reject over-long visitor questions instead of silently cutting them
    if (cleaned.some((m) => m.role === "user" && m.text.length > MAX_MESSAGE_CHARS)) {
      return NextResponse.json(
        { error: `Messages must be ${MAX_MESSAGE_CHARS} characters or fewer.` },
        { status: 400 }
      );
    }

    const formattedContents = cleaned.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const sectionTitle =
      typeof selectedSectionTitle === "string" ? selectedSectionTitle.slice(0, 60) : "";

    const client = getChatClient();

    const systemInstruction = `You are V-01, the robot assistant inside the 3D "Robot Factory" portfolio of Vishnu Vasavan, a Software Engineer.
Answer the visitor's questions using ONLY the resume below. If something is not in the resume, say you don't have that information.

STYLE:
1. Professional, friendly and precise. Keep the robot/factory theme subtle.
2. Plain text only — no markdown, no asterisks, no headings. Short lists may use "- " at the start of a line.
3. At most about 90 words. Refer to Vishnu in the third person.
4. If the question is unrelated to Vishnu, politely steer back to his portfolio.

RESUME:
${resumeAsText()}

The visitor is currently at: ${sectionTitle || "the assembly bay"}.`;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    let responseStream = null;
    let lastError: any = null;

    for (const modelName of MODELS) {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const stream = await client.models.generateContentStream({
            model: modelName,
            contents: formattedContents,
            config: {
              systemInstruction,
              temperature: 0.4,
              maxOutputTokens: MAX_OUTPUT_TOKENS,
            }
          });
          if (stream) {
            responseStream = stream;
            break;
          }
        } catch (err: any) {
          lastError = err;

          const errString = String(err);
          const isTransient = errString.includes("503") || errString.includes("429") || errString.includes("UNAVAILABLE") || errString.includes("ResourceExhausted") || errString.includes("busy");

          if (!isTransient || attempt >= MAX_ATTEMPTS) {
            break;
          }

          await delay(attempt * 300);
        }
      }
      if (responseStream) {
        break;
      }
    }

    if (!responseStream) {
      throw lastError || new Error("The service is currently experiencing high demand. Please try again in a few moments.");
    }

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
        } catch (e) {
          controller.error(e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "An error occurred processing the request" }, { status: 500 });
  }
}