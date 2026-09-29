# Robot Factory — Vishnu Vasavan

An interactive 3D portfolio set inside a cinematic robot factory. The robot **VISHH** — a human face based on Vishnu's character reference on a white/graphite robot body — powers up, assembles itself on the platform and physically walks between six factory zones that present the resume.

Built with Next.js (App Router), React, TypeScript, Tailwind CSS and plain Three.js.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

Optional: set `GEMINI_API_KEY` (e.g. in `.env.local`) to let the **V-26** assistant answer with Gemini. Without a key, V-26 still answers from a built-in keyword engine over the resume data.

## Where things live

| Path | What it does |
| --- | --- |
| `src/lib/sections.ts` | **Single source of truth** for all resume data (`DATA`), the six factory zones (`ZONES`) and `resumeAsText()` for the assistant. Edit this to update content. |
| `src/components/robot-factory.tsx` | Client component: HUD, zone nav, info panel, intro overlays, V-26 terminal, WebGL fallback. Mounts / disposes the engine. |
| `src/components/factory/factory-engine.ts` | Three.js world: factory hall, gates, conveyors, robotic arms, holo screens, sparks/steam/dust, the VISHH robot rig & animation, camera rig, intro timeline, navigation, sound. |
| `src/app/factory.css` | Industrial HUD styling (desktop side panel, mobile bottom sheet). |
| `src/app/api/chat/route.ts` | V-26 assistant endpoint (Gemini, grounded on `resumeAsText()`). |
| `public/Vishnu_Vasavan_Resume.pdf` | Resume served by every "Download resume" button. |
| `public/vishnu-face.jpg` | Portrait crop from the character reference (ID card + holo portrait). |

## Controls

- Nav bar or keys **1–6** — walk the robot to a zone; **← / →** — previous / next zone
- Mobile: ◀ / ▶ buttons above the info panel, or swipe left/right on the 3D view
- **Esc / Enter** during the intro — skip it
- "Return to factory" — walk back to the assembly bay
