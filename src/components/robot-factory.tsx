'use client';

/**
 * VISHH Robot Factory — replaces the old space/UFO scene.
 *
 * React renders the HUD/overlay markup; the Three.js world, the robot,
 * the intro timeline, zone navigation and the V-26 assistant are driven by
 * the imperative engine in ./factory/factory-engine.ts, which is started on
 * mount and fully disposed on unmount (safe under React Strict Mode).
 */
import { useEffect, useRef } from 'react';
import { DATA } from '@/lib/sections';

type AskArgs = {
  question: string;
  history: { r: 'u' | 'b'; t: string }[];
  zone: string;
  onText: (text: string) => void;
};

/** Streams an answer from the Gemini-backed /api/chat route. Throws on failure so the engine can fall back to local answers. */
async function askV01({ question, history, zone, onText }: AskArgs): Promise<string> {
  const messages = [
    ...history.map((h) => ({ role: h.r === 'u' ? 'user' : 'assistant', content: h.t })),
    { role: 'user', content: question },
  ];
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, selectedSectionTitle: zone }),
  });
  if (!res.ok || !res.body) throw new Error(`V-26 link failed (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
  return text;
}

export default function RobotFactory() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    const canvas = document.createElement('canvas');
    canvas.id = 'gl';
    canvas.tabIndex = -1;
    canvas.setAttribute('aria-label', "Interactive 3D robot factory. The robot VISHH walks between six factory zones that present Vishnu Vasavan's portfolio.");
    host.appendChild(canvas);

    import('./factory/factory-engine')
      .then(({ startFactory }) => {
        if (cancelled) return;
        try {
          stop = startFactory({
            canvas,
            faceUrl: '/vishnu-face.jpg',
            resumeUrl: '/Vishnu_Vasavan_Resume.pdf',
            resumeName: 'Vishnu_Vasavan_Resume.pdf',
            ask: askV01,
          });
        } catch (err) {
          console.error('Robot factory failed to start', err);
          document.body.classList.add('nogl');
        }
      })
      .catch((err) => {
        console.error(err);
        document.body.classList.add('nogl');
      });

    return () => {
      cancelled = true;
      stop?.();
      canvas.remove();
    };
  }, []);

  const D = DATA;
  return (
    <>
      <div id="glHost" ref={hostRef} />

      <div id="boot" aria-hidden="true" />
      <ul id="bootSub" aria-hidden="true" />
      <p id="bootLine" role="status" aria-live="polite" />
      <button id="skipBtn" type="button">Skip intro ›</button>

      <section id="hero" aria-labelledby="heroTitle">
        <p className="hero-tag rise">ROBOT UNIT: VISHH // ONLINE</p>
        <h1 id="heroTitle" className="rise">Vishnu<br />Vasavan</h1>
        <p className="hero-role rise">SOFTWARE ENGINEER</p>
        <p className="hero-stack rise">BACKEND • CLOUD • DATABASES</p>
        <div className="rise" style={{ display: 'flex', flexDirection: 'column' }}>
          <button id="enterBtn" type="button">ENTER THE WORKSHOP</button>
          <p className="hero-hint">Node.js · PostgreSQL · AWS · GraphQL · Odoo ERP — {D.location}</p>
        </div>
      </section>

      <header id="hud">
        <div className="hud-id">
          <p className="hud-t">ROBOT FACTORY // VISHH</p>
          <p className="hud-s"><i />SYSTEM STATUS: ONLINE <span id="zoneLabel">ASSEMBLY BAY</span></p>
        </div>
        <div className="hud-r">
          <button className="hbtn" id="homeBtn" type="button">Return to factory</button>
          <button className="hbtn" id="soundBtn" type="button" aria-pressed="true">Sound: on</button>
          <button className="hbtn pri" id="resumeBtn" type="button">Download resume</button>
        </div>
      </header>

      <nav id="nav" aria-label="Factory zones" />

      <section id="panel" aria-live="polite" aria-labelledby="panelTitle">
        <div className="p-head">
          <div><p id="panelCode" /><h2 id="panelTitle" /></div>
          <button id="panelToggle" type="button" aria-expanded="true">Hide panel</button>
        </div>
        <div id="panelBody" />
      </section>
      <div id="zoneArrows" aria-label="Previous or next zone">
        <button id="zonePrev" type="button" aria-label="Previous zone">◀</button>
        <button id="zoneNext" type="button" aria-label="Next zone">▶</button>
      </div>

      <div id="modTitle" aria-hidden="true"><p id="modSub" /><p id="modName" data-text="" /></div>
      <div id="transit" aria-live="polite"><div id="transitText" /><div className="tb"><div id="transitBar" /></div></div>

      <button id="v01Btn" type="button" aria-expanded="false" aria-controls="v01"><span className="v-face" />Ask V-26</button>
      <section id="v01" aria-label="V-26 robot assistant">
        <div className="v-head">
          <span className="v-face" />
          <div><p className="v-t">V-26 ROBOT ASSISTANT</p><p className="v-s">● V-26 ONLINE // DIAGNOSTIC TERMINAL</p></div>
          <button id="v01Close" type="button" aria-label="Close assistant">×</button>
        </div>
        <div id="v01Log"><div className="msg bot"><p>V-26 online. How can I help you explore Vishnu&apos;s portfolio?</p></div></div>
        <div className="quick">
          <button type="button">What does Vishnu do at Mobi80?</button>
          <button type="button">Tell me about Salary365</button>
          <button type="button">What AWS services does he use?</button>
          <button type="button">How can I contact him?</button>
        </div>
        <form id="v01Form" autoComplete="off">
          <input id="v01Input" type="text" placeholder="Ask about Vishnu's experience, skills…" aria-label="Question for V-26" maxLength={300} />
          <button className="btn" type="submit">Send</button>
        </form>
      </section>

      <div id="toast" role="status" />

      {/* Shown only when WebGL is unavailable */}
      <div id="nogl">
        <h1>{D.name.toUpperCase()}</h1>
        <p style={{ fontFamily: 'var(--disp)', letterSpacing: '.16em', color: 'var(--amb)' }}>SOFTWARE ENGINEER — BACKEND • CLOUD • DATABASES</p>
        <p className="muted">The 3D robot factory needs WebGL, which isn&apos;t available in this browser. Here is the portfolio in plain form.</p>
        <h2>SUMMARY</h2><p>{D.summary}</p>
        <h2>EXPERIENCE</h2>
        <p><b>{D.experience.company} — {D.experience.title}</b><br />{D.experience.location} · {D.experience.dates}</p>
        <ul>{D.experience.points.map((p) => <li key={p}>{p}</li>)}</ul>
        <h2>PROJECTS</h2>
        {D.projects.map((p) => <p key={p.id}><b>{p.name}</b> — {p.sub} ({p.tech.join(', ')})</p>)}
        <h2>SKILLS</h2>
        {D.skills.map((g) => <p key={g.group}><b>{g.group}:</b> {g.items.join(', ')}</p>)}
        <h2>EDUCATION</h2>
        {D.education.map((e) => <p key={e.school}>{e.school}, {e.city} — {e.degree}, {e.year}, {e.score}</p>)}
        <h2>CONTACT</h2>
        <p>{D.phone} · <a href={`mailto:${D.email}`}>{D.email}</a><br />
          <a href={`https://${D.linkedin}`} target="_blank" rel="noopener noreferrer">{D.linkedin}</a> · <a href={`https://${D.github}`} target="_blank" rel="noopener noreferrer">{D.github}</a></p>
        <p><a className="btn" href="/Vishnu_Vasavan_Resume.pdf" download>Download resume</a></p>
      </div>
    </>
  );
}
