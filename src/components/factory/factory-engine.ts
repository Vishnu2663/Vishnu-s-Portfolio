// @ts-nocheck
/* VISHH Robot Factory engine — plain Three.js, mounted by src/components/robot-factory.tsx */
import * as THREE from 'three';
import { DATA, ZONES } from '@/lib/sections';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function startFactory(CFG = {}) {
  let __stopped = false, __raf = 0;
  const __offs = [];
  const __on = (t, type, fn, opt) => { if (!t) return; t.addEventListener(type, fn, opt); __offs.push(() => t.removeEventListener(type, fn, opt)); };
  const FACE_URI = CFG.faceUrl;
  const RESUME_B64 = CFG.resumeB64 || null;
  window.__factoryLoaded = true;


  /* =====================================================================
     UTILITIES
     ===================================================================== */
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const V3 = THREE.Vector3;
  const TAU = Math.PI * 2;

  const isMobile = matchMedia('(max-width: 820px)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const LOW = isMobile;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =====================================================================
     RESUME DATA — single source of truth (Vishnu Vasavan)
     ===================================================================== */
  // resume data lives in src/lib/sections.ts (single source of truth)


  const HUB_Z = 12;
  const GATE_Z = [0, -28, -56, -84, -112, -140];
  const HALL_FRONT = 27, HALL_BACK = -168, HALL_X = 18;

  /* =====================================================================
     RENDERER / SCENE / POST
     ===================================================================== */
  const canvas = CFG.canvas || $('#gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
  } catch (e) {
    document.body.classList.add('nogl');
    throw e;
  }
  const DPR = Math.min(devicePixelRatio || 1, LOW ? 1.3 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.78;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !LOW;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.FogExp2(0x080909, LOW ? 0.03 : 0.024);

  const camera = new THREE.PerspectiveCamera(isMobile ? 52 : 40, innerWidth / innerHeight, 0.1, 170);
  camera.position.set(8, 7, 30);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(DPR);
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), LOW ? 0.38 : 0.46, 0.42, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* =====================================================================
     TEXTURES
     ===================================================================== */
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.userData = { canvas: c, ctx: g };
    return t;
  }
  const FONT = '"Chakra Petch", "Rajdhani", "Arial Narrow", sans-serif';
  const ORANGE = '#c9a24a', AMBER = '#e3c67f';

  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#0f1112'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 12 + Math.random() * 16 | 0; g.fillStyle = `rgba(${v + 10},${v + 12},${v + 13},${Math.random() * 0.5})`; g.fillRect(Math.random() * w, Math.random() * h, rand(1, 6), rand(1, 3)); }
    for (let i = 0; i <= 4; i++) {
      g.fillStyle = '#050606'; g.fillRect(i * 128 - 2, 0, 3, h); g.fillRect(0, i * 128 - 2, w, 3);
      g.fillStyle = '#23282a'; g.fillRect(i * 128 + 1, 0, 1, h); g.fillRect(0, i * 128 + 1, w, 1);
    }
    g.fillStyle = '#2c3133';
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (const [dx, dy] of [[10, 10], [118, 10], [10, 118], [118, 118]]) { g.beginPath(); g.arc(x * 128 + dx, y * 128 + dy, 3, 0, TAU); g.fill(); }
    // tread plates
    g.strokeStyle = 'rgba(60,66,70,.35)'; g.lineWidth = 2;
    for (let k = 0; k < 90; k++) { const x = 136 + (k % 9) * 13, y = 264 + Math.floor(k / 9) * 12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y + 5); g.stroke(); }
  }, [18, 60]);

  const wallTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#121415'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 2; x++) {
      const px = x * 256 + 6, py = y * 128 + 6;
      const gr = g.createLinearGradient(px, py, px, py + 116); gr.addColorStop(0, '#1d2123'); gr.addColorStop(1, '#101213');
      g.fillStyle = gr; g.fillRect(px, py, 244, 116);
      g.strokeStyle = '#2a2f31'; g.strokeRect(px + .5, py + .5, 243, 115);
      g.fillStyle = '#0a0b0c'; for (let i = 0; i < 6; i++) g.fillRect(px + 20 + i * 12, py + 90, 6, 16);
    }
    g.fillStyle = 'rgba(201,162,74,.55)'; g.fillRect(0, 250, w, 3);
  }, [40, 2]);

  const hazardTex = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#111'; g.fillRect(0, 0, w, h); g.fillStyle = '#a8883f';
    for (let x = -64; x < w + 64; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 20, 0); g.lineTo(x - 12, h); g.lineTo(x - 32, h); g.fill(); }
  }, [4, 1]);

  const beltTex = canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#151718'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#26292b'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 5);
    g.fillStyle = 'rgba(201,162,74,.35)'; g.fillRect(2, 0, 2, h); g.fillRect(w - 4, 0, 2, h);
  }, [1, 8]);

  const glowTex = canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,220,170,.6)'); gr.addColorStop(1, 'rgba(214,176,96,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const smokeTex = canvasTex(128, 128, (g, w) => {
    for (let i = 0; i < 18; i++) {
      const x = w / 2 + rand(-22, 22), y = w / 2 + rand(-22, 22), r = rand(20, 44);
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(210,200,190,.18)'); gr.addColorStop(1, 'rgba(210,200,190,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }
  });

  function wrapLines(g, text, maxW) {
    const words = text.split(' '); const lines = []; let cur = '';
    for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }
  function frameDeco(g, w, h, col = 'rgba(201,162,74,.9)') {
    g.strokeStyle = col; g.lineWidth = 4; const L = 34;
    for (const [x, y, sx, sy] of [[6, 6, 1, 1], [w - 6, 6, -1, 1], [6, h - 6, 1, -1], [w - 6, h - 6, -1, -1]]) { g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke(); }
    g.strokeStyle = 'rgba(201,162,74,.25)'; g.lineWidth = 2; g.strokeRect(14, 14, w - 28, h - 28);
  }
  function labelTex(lines, { w = 512, h = 128, size = 64, color = AMBER, bg = null, weight = 700, frame = false, align = 'center', sub = null } = {}) {
    return canvasTex(w, h, (g) => {
      if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
      if (frame) frameDeco(g, w, h);
      g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color;
      const arr = Array.isArray(lines) ? lines : [lines];
      const lh = size * 1.12; const total = arr.length * lh + (sub ? size * 0.8 : 0);
      let y = h / 2 - total / 2 + lh / 2;
      const x = align === 'center' ? w / 2 : 40;
      arr.forEach((ln) => { g.font = `${weight} ${size}px ${FONT}`; g.fillText(ln, x, y); y += lh; });
      if (sub) { g.font = `500 ${size * 0.42}px ${FONT}`; g.fillStyle = 'rgba(255,230,200,.8)'; g.fillText(sub, x, y - lh * 0.1); }
    });
  }

  /* =====================================================================
     MATERIALS
     ===================================================================== */
  function std(o) { const { env = 0.35, ...rest } = o; const m = new THREE.MeshStandardMaterial(rest); m.envMapIntensity = env; return m; }
  const M = {
    white: std({ color: 0xb4b1ac, roughness: 0.4, metalness: 0.1, env: 0.45 }),
    armShell: std({ color: 0x5b5d61, roughness: 0.34, metalness: 0.8, env: 0.55 }),
    fabric: std({ color: 0xbcb8b2, roughness: 0.86, metalness: 0, env: 0.3 }),
    fabric2: std({ color: 0x8e8a85, roughness: 0.9, metalness: 0, env: 0.3 }),
    graphite: std({ color: 0x2b2e31, roughness: 0.42, metalness: 0.75, env: 0.5 }),
    black: std({ color: 0x131416, roughness: 0.6, metalness: 0.35 }),
    pants: std({ color: 0x141517, roughness: 0.88, metalness: 0.02 }),
    steel: std({ color: 0x70767b, roughness: 0.3, metalness: 0.92, env: 0.7 }),
    darkSteel: std({ color: 0x3a3f43, roughness: 0.38, metalness: 0.85, env: 0.45 }),
    paint: std({ color: 0x7a6440, roughness: 0.38, metalness: 0.7, env: 0.5 }),
    wall: std({ color: 0x55595e, map: wallTex, roughness: 0.7, metalness: 0.4, env: 0.2 }),
    floor: std({ color: 0x4a4e53, map: floorTex, roughness: 0.5, metalness: 0.55, env: 0.22 }),
    hazard: std({ map: hazardTex, roughness: 0.6, metalness: 0.2 }),
    belt: std({ map: beltTex, roughness: 0.8, metalness: 0.2 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x223036, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.22, envMapIntensity: 1.2 }),
    orange: std({ color: 0xc9962f, emissive: 0xb07a1c, emissiveIntensity: 1.2, roughness: 0.35, metalness: 0.6 }),
    amberGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe0bb64).multiplyScalar(1.6) }),
    orangeGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xc38f2c).multiplyScalar(1.5) }),
    whiteGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf3e6c8).multiplyScalar(1.25) }),
    cyanGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xaab6c2).multiplyScalar(1.1) }),
    skin: std({ color: 0xb8683f, roughness: 0.52, metalness: 0, emissive: 0x2a0d04, emissiveIntensity: 0.35, env: 0.45 }),
    lip: std({ color: 0x7d3a26, roughness: 0.45, metalness: 0 }),
    hair: std({ color: 0x17100f, roughness: 0.42, metalness: 0.12, env: 0.7 }),
    beard: std({ color: 0x21140f, roughness: 0.8, metalness: 0 }),
    stubble: new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.95, transparent: true, opacity: 0.4, depthWrite: false }),
    sclera: std({ color: 0xd6d0c6, roughness: 0.3, metalness: 0, env: 0.4 }),
    iris: std({ color: 0x4d2a12, roughness: 0.2, emissive: 0xc9962f, emissiveIntensity: 0.0, env: 0.9 }),
    pupil: std({ color: 0x050303, roughness: 0.1 }),
    tilak: std({ color: 0xe9cfae, roughness: 0.8 }),
    sole: std({ color: 0xd9d6d0, roughness: 0.7 }),
  };
  M.glass.depthWrite = false;

  /* hologram shader */
  const holoVS = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`;
  const holoFS = `uniform sampler2D map; uniform float useMap; uniform vec3 color; uniform float time; uniform float opacity; uniform float reveal; uniform float tint;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  float hash(float n){ return fract(sin(n)*43758.5453); }
  void main(){
    vec4 tex = useMap > 0.5 ? texture2D(map, vUv) : vec4(color*0.35, 0.35);
    float lum = dot(tex.rgb, vec3(0.3,0.59,0.11));
    vec3 base = mix(tex.rgb, color*lum*1.7, tint);
    float scan = 0.78 + 0.22*sin(vUv.y*380.0 - time*5.0);
    float roll = smoothstep(0.0, 0.06, abs(fract(vUv.y*0.8 - time*0.22) - 0.5));
    float fl = 0.9 + 0.1*hash(floor(time*16.0));
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
    float vis = step(vUv.y, reveal);
    float edge = (1.0 - smoothstep(0.0, 0.018, abs(vUv.y - reveal))) * (1.0 - step(0.999, reveal));
    vec3 c = base*scan*fl*(0.75+0.25*roll)*0.95 + color*fres*0.3 + vec3(1.0,0.85,0.55)*edge*1.5;
    float a = clamp((tex.a*0.9 + fres*0.15)*vis + edge, 0.0, 1.0) * opacity;
    gl_FragColor = vec4(c*a, a);
  }`;
  const holoMats = [];
  function holoMat({ map = null, color = 0xd6ad5a, opacity = 1, tint = 0.2 } = {}) {
    const m = new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, useMap: { value: map ? 1 : 0 }, color: { value: new THREE.Color(color) }, time: { value: 0 }, opacity: { value: opacity }, reveal: { value: 1 }, tint: { value: tint } },
      vertexShader: holoVS, fragmentShader: holoFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    holoMats.push(m); return m;
  }
  /* volumetric-looking light cone */
  const beamMats = [];
  function beamMat(color = 0xd9b060, strength = 0.18) {
    const m = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, strength: { value: strength }, time: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 color; uniform float strength; uniform float time; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(vUv.y, 1.6) * pow(f, 1.5) * strength; a *= 0.85 + 0.15*sin(time*3.0 + vUv.y*9.0); gl_FragColor = vec4(color*a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    beamMats.push(m); return m;
  }

  /* geometry helpers */
  function mesh(geo, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, shadow = false) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    if (parent) parent.add(m); return m;
  }
  const G = {
    box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
    cyl: (rt, rb, h, s = 20, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open),
    sph: (r, ws = 24, hs = 16) => new THREE.SphereGeometry(r, ws, hs),
    tor: (r, t, rs = 12, ts = 48, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    cap: (r, l, cs = 6, rs = 16) => new THREE.CapsuleGeometry(r, l, cs, rs),
  };
  function group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }

  /* =====================================================================
     THE ROBOT — "Vishnu transformed into a developer robot"
     Human face, curly black hair, brown eyes, moustache & goatee,
     white hoodie exo-suit, black pants, white sneakers, orange core.
     ===================================================================== */
  function buildRobot() {
    const R = {};
    const root = group(scene, 0, 0, HUB_Z); R.root = root;
    const hips = group(root, 0, 0.98, 0); R.hips = hips;
    const SH = true;

    // ---- pelvis
    mesh(G.cap(0.2, 0.26, 6, 16), M.pants, hips, 0, 0.02, 0, 0, 0, Math.PI / 2, SH).scale.set(1, 1.15, 0.85);
    mesh(G.cyl(0.33, 0.33, 0.1, 28), M.graphite, hips, 0, 0.13, 0, 0, 0, 0, SH).scale.set(1, 1, 0.72);
    mesh(G.box(0.12, 0.07, 0.02), M.orangeGlow, hips, 0, 0.13, 0.245);

    // ---- legs
    function leg(side) {
      const thigh = group(hips, side * 0.15, -0.02, 0);
      mesh(G.sph(0.11, 16, 12), M.graphite, thigh, 0, 0, 0, 0, 0, 0, SH);
      mesh(G.cap(0.12, 0.3, 6, 14), M.pants, thigh, 0, -0.22, 0, 0, 0, 0, SH);
      const knee = group(thigh, 0, -0.46, 0);
      mesh(G.sph(0.1, 16, 12), M.graphite, knee, 0, 0, 0, 0, 0, 0, SH);
      mesh(G.tor(0.1, 0.012, 8, 28), M.orangeGlow, knee, side * 0.02, 0, 0, 0, Math.PI / 2, 0);
      mesh(G.box(0.14, 0.12, 0.05), M.white, knee, 0, 0.02, 0.09, 0, 0, 0, SH);
      mesh(G.cap(0.105, 0.28, 6, 14), M.pants, knee, 0, -0.21, 0, 0, 0, 0, SH);
      mesh(G.cyl(0.1, 0.1, 0.05, 18), M.graphite, knee, 0, -0.38, 0, 0, 0, 0, SH);
      const ankle = group(knee, 0, -0.44, 0);
      // sneaker
      const shoe = mesh(G.cap(0.095, 0.2, 6, 14), M.white, ankle, 0, -0.005, 0.07, Math.PI / 2, 0, 0, SH); shoe.scale.set(1.05, 1, 0.72);
      mesh(G.box(0.2, 0.045, 0.4), M.sole, ankle, 0, -0.045, 0.07, 0, 0, 0, SH);
      mesh(G.box(0.205, 0.012, 0.3), M.orangeGlow, ankle, 0, -0.018, 0.04);
      for (let i = 0; i < 3; i++) mesh(G.box(0.1, 0.012, 0.012), M.fabric2, ankle, 0, 0.055 - i * 0.004, 0.1 + i * 0.045, -0.4);
      return { thigh, knee, ankle };
    }
    R.legL = leg(1); R.legR = leg(-1);

    // ---- spine / torso (white hoodie exosuit)
    const spine = group(hips, 0, 0.06, 0); R.spine = spine;
    const chest = group(spine, 0, 0, 0); R.chest = chest;
    const torso = mesh(G.cap(0.3, 0.3, 8, 24), M.fabric, chest, 0, 0.42, 0, 0, 0, 0, SH); torso.scale.set(1.18, 0.94, 0.78);
    mesh(G.cyl(0.33, 0.35, 0.1, 28), M.fabric2, chest, 0, 0.06, 0, 0, 0, 0, SH).scale.set(1.08, 1, 0.8); // hoodie hem
    // kangaroo pocket
    const pocket = mesh(G.box(0.4, 0.17, 0.05), M.fabric2, chest, 0, 0.2, 0.225, -0.12, 0, 0, SH); pocket.scale.set(1, 1, 1);
    // exo side plates
    for (const s of [-1, 1]) {
      mesh(G.box(0.05, 0.42, 0.26), M.graphite, chest, s * 0.36, 0.4, 0, 0, 0, s * 0.08, SH);
      mesh(G.box(0.012, 0.3, 0.02), M.orangeGlow, chest, s * 0.387, 0.4, 0.08, 0, 0, s * 0.08);
    }
    // chest core
    const coreG = group(chest, 0, 0.52, 0.245); R.coreG = coreG;
    mesh(G.cyl(0.1, 0.1, 0.04, 32), M.graphite, coreG, 0, 0, 0, Math.PI / 2, 0, 0, SH);
    R.coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xc9962f).multiplyScalar(3) });
    mesh(G.cyl(0.062, 0.062, 0.05, 32), R.coreMat, coreG, 0, 0, 0.005, Math.PI / 2, 0, 0);
    R.coreRing = mesh(G.tor(0.082, 0.009, 8, 40, TAU * 0.8), M.amberGlow, coreG, 0, 0, 0.03);
    R.coreHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xcf9f45, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    R.coreHalo.scale.set(0.6, 0.6, 1); R.coreHalo.position.z = 0.05; coreG.add(R.coreHalo);
    // hood collar + drawstrings
    const hood = mesh(G.tor(0.2, 0.075, 12, 32), M.fabric, chest, 0, 0.8, -0.02, Math.PI / 2 - 0.2, 0, 0, SH); hood.scale.set(1.1, 1, 1);
    mesh(G.sph(0.2, 20, 14), M.fabric, chest, 0, 0.78, -0.2, 0, 0, 0, SH).scale.set(1.2, 0.8, 0.7);
    for (const s of [-1, 1]) {
      mesh(G.cyl(0.009, 0.009, 0.26, 6), M.fabric2, chest, s * 0.07, 0.66, 0.24, 0.12, 0, 0);
      mesh(G.cyl(0.013, 0.013, 0.04, 8), M.orangeGlow, chest, s * 0.07, 0.52, 0.255, 0.12, 0, 0);
    }
    // back plate + name decal
    mesh(G.box(0.34, 0.4, 0.06), M.graphite, chest, 0, 0.45, -0.22, 0, 0, 0, SH);
    for (let i = 0; i < 4; i++) mesh(G.box(0.24, 0.014, 0.01), M.orangeGlow, chest, 0, 0.35 + i * 0.05, -0.255);
    const decal = mesh(new THREE.PlaneGeometry(0.3, 0.075), new THREE.MeshBasicMaterial({ map: labelTex('VISHH', { w: 256, h: 64, size: 44 }), transparent: true, toneMapped: false }), chest, 0, 0.6, -0.253, 0, Math.PI, 0);
    decal.renderOrder = 2;

    // ---- arms
    function arm(side) {
      const sh = group(chest, side * 0.42, 0.68, 0);
      mesh(G.sph(0.125, 18, 14), M.white, sh, 0, 0, 0, 0, 0, 0, SH).scale.set(1, 0.9, 1);
      mesh(G.tor(0.11, 0.012, 8, 30), M.orangeGlow, sh, side * 0.06, 0, 0, 0, Math.PI / 2, 0);
      mesh(G.cap(0.095, 0.2, 6, 14), M.fabric, sh, 0, -0.19, 0, 0, 0, 0, SH);
      const el = group(sh, 0, -0.37, 0);
      mesh(G.sph(0.075, 14, 10), M.graphite, el, 0, 0, 0, 0, 0, 0, SH);
      mesh(G.tor(0.075, 0.01, 8, 24), M.orangeGlow, el, 0, 0, 0, 0, Math.PI / 2, 0);
      mesh(G.cap(0.085, 0.18, 6, 14), M.fabric, el, 0, -0.16, 0, 0, 0, 0, SH);
      mesh(G.cyl(0.075, 0.07, 0.07, 16), M.graphite, el, 0, -0.3, 0, 0, 0, 0, SH);
      if (side > 0) { // smartwatch on left wrist (as in reference)
        mesh(G.box(0.07, 0.03, 0.08), M.black, el, 0.0, -0.29, 0.06, 0, 0, 0);
        mesh(G.box(0.05, 0.005, 0.06), M.cyanGlow, el, 0.0, -0.29, 0.1, Math.PI / 2, 0, 0);
      }
      const hand = group(el, 0, -0.35, 0);
      mesh(G.box(0.1, 0.1, 0.05), M.graphite, hand, 0, -0.04, 0, 0, 0, 0, SH);
      const fingers = [];
      for (let i = 0; i < 4; i++) {
        const f = group(hand, (i - 1.5) * 0.024, -0.09, 0.005);
        mesh(G.box(0.018, 0.055, 0.02), M.steel, f, 0, -0.025, 0);
        const f2 = group(f, 0, -0.055, 0); mesh(G.box(0.016, 0.04, 0.018), M.white, f2, 0, -0.02, 0);
        f.rotation.x = -0.35; f2.rotation.x = -0.5; fingers.push(f);
      }
      const th = group(hand, -side * -0.06, -0.04, 0.03); mesh(G.box(0.02, 0.05, 0.02), M.steel, th, 0, -0.025, 0); th.rotation.set(-0.5, 0, side * 0.5);
      return { sh, el, hand, fingers };
    }
    R.armL = arm(1); R.armR = arm(-1);

    // ---- neck
    const neck = group(chest, 0, 0.8, 0); R.neck = neck;
    mesh(G.cyl(0.085, 0.1, 0.16, 16), M.skin, neck, 0, 0.06, 0.01, 0, 0, 0, SH);
    for (let i = 0; i < 2; i++) mesh(G.tor(0.1 - i * 0.008, 0.012, 8, 26), i ? M.orangeGlow : M.graphite, neck, 0, 0.0 + i * 0.03, 0, Math.PI / 2, 0, 0);
    mesh(G.box(0.05, 0.1, 0.03), M.graphite, neck, 0, 0.06, -0.09, 0, 0, 0); // spinal servo

    // ---- head
    const head = group(neck, 0, 0.44, 0.02); R.head = head;
    const skull = mesh(G.sph(0.34, 48, 36), M.skin, head, 0, 0, 0, 0, 0, 0, SH); skull.scale.set(0.9, 1.02, 0.95);
    mesh(G.sph(0.22, 32, 24), M.skin, head, 0, -0.16, 0.09, 0, 0, 0, SH).scale.set(1.08, 0.86, 1.02); // jaw
    mesh(G.sph(0.08, 16, 12), M.skin, head, 0, -0.29, 0.2, 0, 0, 0, SH).scale.set(1.1, 0.7, 0.8); // chin
    for (const s of [-1, 1]) mesh(G.sph(0.09, 16, 12), M.skin, head, s * 0.15, -0.09, 0.2, 0, 0, 0).scale.set(1, 0.8, 0.8); // cheeks
    // stubble jaw shell + goatee + moustache
    const st = mesh(new THREE.SphereGeometry(0.226, 32, 16, 0, TAU, Math.PI * 0.52, Math.PI * 0.4), M.stubble, head, 0, -0.16, 0.095); st.scale.set(1.08, 0.88, 1.04);
    mesh(G.sph(0.05, 14, 10), M.beard, head, 0, -0.295, 0.245, 0, 0, 0).scale.set(1.15, 0.75, 0.55);
    const mo = mesh(G.tor(0.058, 0.011, 8, 20, Math.PI * 0.9), M.beard, head, 0, -0.176, 0.3, 0, 0, Math.PI * 1.05); mo.scale.set(1.2, 0.55, 1);
    // mouth
    const lips = mesh(G.sph(0.04, 16, 10), M.lip, head, 0, -0.2, 0.3, 0, 0, 0); lips.scale.set(1.5, 0.32, 0.45); R.lips = lips;
    // nose
    mesh(G.sph(0.042, 16, 12), M.skin, head, 0, -0.085, 0.325, 0, 0, 0).scale.set(1.05, 0.85, 0.95);
    mesh(G.box(0.035, 0.1, 0.04), M.skin, head, 0, -0.03, 0.31, -0.2, 0, 0);
    // tilak (from reference)
    mesh(G.box(0.018, 0.05, 0.004), M.tilak, head, 0, 0.19, 0.318, -0.35, 0, 0);
    // eyes
    R.eyes = []; R.lids = [];
    for (const s of [-1, 1]) {
      const eg = group(head, s * 0.108, 0.035, 0.265);
      mesh(G.sph(0.058, 20, 16), M.sclera, eg);
      const irisG = group(eg, 0, 0, 0); R.eyes.push(irisG);
      mesh(G.sph(0.034, 18, 14), M.iris, irisG, 0, 0, 0.034).scale.set(1, 1, 0.45);
      mesh(G.sph(0.016, 12, 10), M.pupil, irisG, 0, 0, 0.047).scale.set(1, 1, 0.4);
      mesh(G.sph(0.007, 8, 6), M.whiteGlow, irisG, 0.012, 0.012, 0.052);
      const lid = mesh(new THREE.SphereGeometry(0.063, 20, 10, 0, TAU, 0, Math.PI / 2), M.skin, eg, 0, 0, 0); lid.rotation.x = -0.3; R.lids.push(lid);
      const low = mesh(new THREE.SphereGeometry(0.062, 20, 8, 0, TAU, Math.PI * 0.72, Math.PI * 0.28), M.skin, eg, 0, 0, 0);
      // eyebrows (thick, dark)
      const br = mesh(G.cap(0.016, 0.085, 4, 8), M.hair, head, s * 0.11, 0.125, 0.283, 0, 0, Math.PI / 2 + s * 0.12); br.scale.set(1, 1, 0.6);
      // robotic ear pods
      const ear = group(head, s * 0.3, -0.02, -0.01);
      mesh(G.cyl(0.085, 0.085, 0.06, 24), M.graphite, ear, 0, 0, 0, 0, 0, Math.PI / 2, SH);
      mesh(G.tor(0.066, 0.009, 8, 28), M.orangeGlow, ear, s * 0.032, 0, 0, 0, Math.PI / 2, 0);
      mesh(G.cyl(0.03, 0.03, 0.02, 16), M.amberGlow, ear, s * 0.036, 0, 0, 0, 0, Math.PI / 2);
      mesh(G.box(0.016, 0.1, 0.02), M.darkSteel, ear, s * 0.01, -0.1, 0.02, 0.3, 0, 0);
    }
    // temple HUD plate + floating HUD arc (right eye side)
    mesh(G.box(0.012, 0.05, 0.08), M.graphite, head, -0.285, 0.1, 0.1, 0, -0.3, 0);
    mesh(G.box(0.006, 0.012, 0.012), M.orangeGlow, head, -0.292, 0.1, 0.13);
    R.hud = mesh(G.tor(0.09, 0.0035, 6, 40, TAU * 0.55), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd6ad5a).multiplyScalar(2), transparent: true, opacity: 0.8, depthWrite: false }), head, -0.108, 0.035, 0.33, 0, 0, 0.6);

    // hair: faded sides shell + voluminous curls on top (instanced)
    const shell = mesh(new THREE.SphereGeometry(0.355, 40, 24, Math.PI / 2 + 0.95, TAU - 1.9, 0, 1.68), M.hair, head, 0, 0.005, -0.005, 0, 0, 0, SH);
    shell.scale.set(0.93, 1.03, 0.97);
    const curlGeo = new THREE.IcosahedronGeometry(1, 1);
    const N = LOW ? 190 : 300;
    const curls = new THREE.InstancedMesh(curlGeo, M.hair, N); curls.castShadow = true;
    const dm = new THREE.Object3D(); const col = new THREE.Color(); let k = 0; let guard = 0;
    while (k < N && guard++ < 20000) {
      const d = new V3(rand(-1, 1), rand(-0.1, 1), rand(-1, 1)).normalize();
      if (d.y < 0.3) continue;
      if (d.z > 0.55 && d.y < 0.55) continue; // hairline: keep forehead clear
      if (Math.abs(d.x) > 0.8 && d.y < 0.5) continue;
      const vol = 0.02 + 0.1 * Math.pow(d.y, 1.3) + 0.06 * Math.max(0, d.z) * d.y;
      const p = new V3(d.x * 0.31, d.y * 0.35, d.z * 0.33).addScaledVector(d, vol);
      p.y += 0.02; p.z += 0.02 * d.y;
      dm.position.copy(p);
      const s = rand(0.045, 0.078) * (0.8 + d.y * 0.4);
      dm.scale.set(s, s * rand(0.75, 1.05), s);
      dm.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
      dm.updateMatrix(); curls.setMatrixAt(k, dm.matrix);
      const v = rand(0.75, 1.25); col.setRGB(0.09 * v, 0.063 * v, 0.058 * v); curls.setColorAt(k, col);
      k++;
    }
    curls.count = k; head.add(curls);
    // front quiff swoop
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * 1.6;
      const c = mesh(G.sph(0.06, 12, 10), M.hair, head, Math.sin(a) * 0.2, 0.27 + Math.cos(a) * 0.02, 0.2 + Math.cos(a) * 0.05, rand(0, 3), rand(0, 3), 0, SH);
      c.scale.set(1.1, 0.8, 1);
    }

    // parts for assembly sequence
    R.parts = [
      { o: R.legL.thigh, off: new V3(0, -1.4, 0), t0: 3.7 }, { o: R.legR.thigh, off: new V3(0, -1.4, 0), t0: 3.9 },
      { o: chest, off: new V3(0, 3.2, 0), t0: 4.3 },
      { o: R.armL.sh, off: new V3(1.5, 0.4, 0), t0: 4.9 }, { o: R.armR.sh, off: new V3(-1.5, 0.4, 0), t0: 5.05 },
      { o: head, off: new V3(0, 2.6, 0), t0: 5.4 },
    ];
    R.parts.forEach((p) => { p.rest = p.o.position.clone(); p.done = false; });

    R.heading = 0; R.walk = 0; R.phase = 0; R.blinkT = 2; R.blink = 0;
    R.look = new V3(0, 2.3, HUB_Z + 5); R.lookCur = new V3(0, 2.3, HUB_Z + 5);
    R.pose = { name: 'none', w: 0 }; R.eyeGlow = 0;
    return R;
  }
  const robot = buildRobot();
  robot.root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });


  /* =====================================================================
     LIGHTING
     ===================================================================== */
  const L = {};
  L.hemi = new THREE.HemisphereLight(0x8d939c, 0x1a0c04, 0); scene.add(L.hemi);
  L.key = new THREE.DirectionalLight(0xffe4c8, 0);
  L.key.castShadow = !LOW; L.key.shadow.mapSize.set(1024, 1024);
  Object.assign(L.key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 });
  L.key.shadow.bias = -0.0008; L.key.shadow.normalBias = 0.02;
  scene.add(L.key); scene.add(L.key.target);
  L.rim = new THREE.PointLight(0xc9962f, 0, 10, 2); scene.add(L.rim);
  L.fill = new THREE.PointLight(0xf2e4d0, 0, 9, 2); scene.add(L.fill);

  /* =====================================================================
     FACTORY HALL
     ===================================================================== */
  const world = group(scene);
  const hallLen = HALL_FRONT - HALL_BACK, hallMid = (HALL_FRONT + HALL_BACK) / 2;
  const floor = mesh(new THREE.PlaneGeometry(HALL_X * 2, hallLen), M.floor, world, 0, 0, hallMid, -Math.PI / 2);
  floor.receiveShadow = true;
  floorTex.repeat.set(HALL_X * 2 / 4, hallLen / 4);
  // walkway strip
  mesh(new THREE.PlaneGeometry(4.4, hallLen), std({ color: 0x0b0c0d, roughness: 0.35, metalness: 0.7 }), world, 0, 0.005, hallMid, -Math.PI / 2).receiveShadow = true;
  // walls & ceiling
  for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(hallLen, 15), M.wall, world, s * HALL_X, 7.5, hallMid, 0, -s * Math.PI / 2);
  mesh(new THREE.PlaneGeometry(HALL_X * 2, 15), M.wall, world, 0, 7.5, HALL_BACK, 0, 0);
  mesh(new THREE.PlaneGeometry(HALL_X * 2, 15), M.wall, world, 0, 7.5, HALL_FRONT, 0, Math.PI);
  mesh(new THREE.PlaneGeometry(HALL_X * 2, hallLen), std({ color: 0x08090a, roughness: 0.9 }), world, 0, 15, hallMid, Math.PI / 2);

  // instanced helpers
  function instanced(geo, mat, list, shadow = false) {
    const im = new THREE.InstancedMesh(geo, mat, list.length); const d = new THREE.Object3D();
    list.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.rotation.set(p[3] || 0, p[4] || 0, p[5] || 0); d.scale.set(p[6] || 1, p[7] || 1, p[8] || 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    if (shadow) im.receiveShadow = true; world.add(im); return im;
  }
  // pillars, trusses, pipes
  const pil = [], truss = [], brackets = [];
  for (let z = HALL_FRONT - 3; z > HALL_BACK; z -= 10) { for (const s of [-1, 1]) { pil.push([s * 16.2, 7, z]); brackets.push([s * 17.2, 9.8, z]); } truss.push([0, 13.6, z]); }
  instanced(G.box(1.1, 14, 1.1), M.graphite, pil, true);
  instanced(G.box(36, 0.5, 0.6), M.darkSteel, truss);
  instanced(G.box(1.6, 2.6, 0.3), M.darkSteel, brackets);
  const pilLights = []; pil.forEach((p) => pilLights.push([p[0] - Math.sign(p[0]) * 0.56, 3.2, p[2], 0, 0, 0, 1, 1, 1]));
  instanced(G.box(0.04, 1.6, 0.14), M.orangeGlow, pilLights);
  for (const s of [-1, 1]) {
    [[9.2, 0.3, M.steel], [10.1, 0.22, M.paint], [10.8, 0.26, M.darkSteel], [11.6, 0.14, M.orange]].forEach(([y, r, m], i) => {
      mesh(G.cyl(r, r, hallLen, 14, true), m, world, s * (17.3 - i * 0.12), y, hallMid, Math.PI / 2, 0, 0);
    });
  }
  // ceiling lamps (instanced, power-up staggered)
  const lampPos = []; for (let z = HALL_FRONT - 6; z > HALL_BACK; z -= 8) for (const x of [-6.5, 6.5]) lampPos.push([x, 13.2, z]);
  const lamps = instanced(G.box(4.6, 0.12, 0.7), new THREE.MeshBasicMaterial({ color: 0xffffff }), lampPos);
  const lampCol = new THREE.Color();
  lampPos.forEach((p, i) => lamps.setColorAt(i, lampCol.setRGB(0, 0, 0)));
  // hanging cables
  const cables = group(world);
  for (let z = HALL_FRONT - 3; z > HALL_BACK + 10; z -= 20) {
    for (const s of [-1, 1]) {
      const a = new V3(s * 15.6, 12.5, z), b = new V3(s * 15.6, 12.5, z - 10);
      const mid = a.clone().lerp(b, 0.5); mid.y -= rand(1.2, 2.4); mid.x -= s * 0.6;
      const curve = new THREE.CatmullRomCurve3([a, mid, b]);
      mesh(new THREE.TubeGeometry(curve, 20, 0.045, 5), M.black, cables);
    }
  }
  // server racks with blinking LEDs
  const rackPos = [], ledPos = [];
  for (const zc of [HUB_Z, ...ZONES.map((z) => z.z)]) for (const s of [-1, 1]) for (let i = -2; i <= 2; i++) {
    if (Math.abs(i) < 1) continue;
    const x = s * 16.9, z = zc + i * 2.3 + 4;
    rackPos.push([x, 1.5, z]);
    for (let r = 0; r < 7; r++) ledPos.push([x - s * 0.52, 0.5 + r * 0.33, z + rand(-0.4, 0.4), 0, s * Math.PI / 2, 0]);
  }
  instanced(G.box(1.0, 3, 1.4), M.black, rackPos, true);
  const leds = instanced(G.box(0.02, 0.05, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff }), ledPos);
  const ledCol = new THREE.Color();
  function paintLeds() {
    for (let i = 0; i < ledPos.length; i++) {
      const r = Math.random();
      if (r < 0.62) ledCol.setRGB(1.5, 1.08, 0.38); else if (r < 0.78) ledCol.setRGB(0.9, 0.95, 1.0); else if (r < 0.86) ledCol.setRGB(1.3, 1.2, 1.0); else ledCol.setRGB(0.05, 0.03, 0.02);
      leds.setColorAt(i, ledCol.multiplyScalar(S_power()));
    }
    leds.instanceColor.needsUpdate = true;
  }
  // walkway path lights
  const pathPos = []; for (let z = HALL_FRONT - 1; z > HALL_BACK + 1; z -= 1.6) for (const x of [-2.25, 2.25]) pathPos.push([x, 0.02, z]);
  const pathLights = instanced(G.box(0.12, 0.03, 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff }), pathPos);
  pathPos.forEach((p, i) => pathLights.setColorAt(i, lampCol.setRGB(0, 0, 0)));
  // hazard floor bands at gates
  GATE_Z.forEach((z) => mesh(new THREE.PlaneGeometry(10, 0.7), M.hazard, world, 0, 0.012, z + 1.2, -Math.PI / 2));

  /* gear geometry */
  function gearGeo(r, teeth, thick) {
    const sh = new THREE.Shape(); const rin = r * 0.84;
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = (i / (teeth * 2)) * TAU, a1 = ((i + 1) / (teeth * 2)) * TAU, rr = i % 2 ? rin : r;
      if (i === 0) sh.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr); else sh.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
      sh.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
    }
    const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.3, 0, TAU, true); sh.holes.push(hole);
    return new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false, curveSegments: 6 });
  }
  const gears = [];
  function addGear(parent, x, y, z, r, teeth, speed, ry = 0, mat = M.darkSteel) {
    const g = mesh(gearGeo(r, teeth, 0.25), mat, parent, x, y, z, 0, ry, 0); g.userData.speed = speed; gears.push(g); return g;
  }
  // wall gear clusters
  for (const zc of [HUB_Z, -28, -70, -126]) for (const s of [-1, 1]) {
    addGear(world, s * 17.7, 6.2, zc + 2, 1.6, 18, 0.4 * s, s * Math.PI / 2);
    addGear(world, s * 17.6, 4.3, zc + 4.1, 0.95, 11, -0.66 * s, s * Math.PI / 2, M.paint);
  }

  /* robotic arm */
  const arms = [];
  function makeArm(parent, x, z, ry = 0, scale = 1) {
    const A = {};
    const g = group(parent, x, 0, z); g.rotation.y = ry; g.scale.setScalar(scale); A.g = g;
    mesh(G.cyl(0.55, 0.65, 0.3, 24), M.graphite, g, 0, 0.15, 0, 0, 0, 0, true);
    mesh(G.tor(0.55, 0.03, 6, 32), M.orangeGlow, g, 0, 0.3, 0, Math.PI / 2, 0, 0);
    A.turret = group(g, 0, 0.3, 0);
    mesh(G.cyl(0.36, 0.42, 0.5, 20), M.armShell, A.turret, 0, 0.25, 0, 0, 0, 0, true);
    A.shoulder = group(A.turret, 0, 0.62, 0);
    mesh(G.cyl(0.26, 0.26, 0.6, 18), M.graphite, A.shoulder, 0, 0, 0, 0, 0, Math.PI / 2, true);
    mesh(G.box(0.34, 1.9, 0.34), M.armShell, A.shoulder, 0, 0.95, 0, 0, 0, 0, true);
    mesh(G.box(0.36, 0.08, 0.36), M.orangeGlow, A.shoulder, 0, 1.2, 0);
    mesh(G.cyl(0.05, 0.05, 1.5, 8), M.steel, A.shoulder, 0.24, 0.9, 0.1, 0.1, 0, 0);
    A.elbow = group(A.shoulder, 0, 1.9, 0);
    mesh(G.cyl(0.2, 0.2, 0.46, 18), M.graphite, A.elbow, 0, 0, 0, 0, 0, Math.PI / 2, true);
    mesh(G.box(0.26, 1.4, 0.26), M.armShell, A.elbow, 0, 0.7, 0, 0, 0, 0, true);
    A.wrist = group(A.elbow, 0, 1.4, 0);
    mesh(G.cyl(0.14, 0.16, 0.22, 14), M.graphite, A.wrist, 0, 0.1, 0, 0, 0, 0, true);
    A.claws = [];
    for (const s of [-1, 1]) { const c = group(A.wrist, s * 0.08, 0.22, 0); mesh(G.box(0.05, 0.28, 0.12), M.steel, c, 0, 0.14, 0); A.claws.push(c); }
    A.tip = mesh(G.sph(0.05, 10, 8), M.amberGlow, A.wrist, 0, 0.3, 0);
    A.phase = rand(0, TAU); A.speed = rand(0.6, 1); A.active = 0.2; A.weld = false;
    arms.push(A); return A;
  }
  function animArm(A, t, dt) {
    const k = A.active, p = t * A.speed + A.phase;
    A.turret.rotation.y = Math.sin(p * 0.7) * 0.9 * k + (A.baseYaw || 0);
    A.shoulder.rotation.x = -0.35 + Math.sin(p) * 0.35 * k + (A.lean || 0);
    A.elbow.rotation.x = -1.2 + Math.sin(p * 1.3 + 1) * 0.45 * k;
    A.wrist.rotation.y += dt * 2 * k;
    const c = 0.2 + Math.max(0, Math.sin(p * 2)) * 0.35 * k;
    A.claws[0].rotation.z = c; A.claws[1].rotation.z = -c;
  }

  /* conveyor */
  const conveyors = [];
  function makeConveyor(parent, x, z, len, axis = 'z', crates = 6) {
    const C = { speed: 0, target: 0.35 };
    const g = group(parent, x, 0, z); if (axis === 'x') g.rotation.y = Math.PI / 2; C.g = g;
    mesh(G.box(1.6, 0.8, len), M.graphite, g, 0, 0.4, 0, 0, 0, 0, true);
    const t = beltTex.clone(); t.needsUpdate = true; t.repeat.set(1, len / 2); C.tex = t;
    mesh(new THREE.PlaneGeometry(1.4, len), std({ map: t, roughness: 0.8, metalness: 0.2 }), g, 0, 0.81, 0, -Math.PI / 2);
    for (const s of [-1, 1]) mesh(G.box(0.08, 0.12, len), M.orangeGlow, g, s * 0.8, 0.8, 0);
    C.items = []; C.len = len;
    for (let i = 0; i < crates; i++) {
      const it = group(g, 0, 0.81, -len / 2 + (i / crates) * len);
      mesh(G.box(0.8, 0.55, 0.8), i % 2 ? M.white : M.paint, it, 0, 0.28, 0, 0, 0, 0, true);
      mesh(G.box(0.82, 0.06, 0.82), M.graphite, it, 0, 0.45, 0);
      C.items.push(it);
    }
    conveyors.push(C); return C;
  }

  /* sparks */
  const SPARKS = LOW ? 160 : 360;
  const spGeo = new THREE.BufferGeometry();
  const spPos = new Float32Array(SPARKS * 3), spVel = new Float32Array(SPARKS * 3), spLife = new Float32Array(SPARKS);
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ map: glowTex, color: 0xe0c07a, size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false; scene.add(sparks); spPos.fill(-999);
  let spHead = 0;
  function emitSparks(p, n = 20, spd = 3) {
    for (let i = 0; i < n; i++) {
      const j = spHead++ % SPARKS;
      spPos[j * 3] = p.x; spPos[j * 3 + 1] = p.y; spPos[j * 3 + 2] = p.z;
      spVel[j * 3] = rand(-1, 1) * spd; spVel[j * 3 + 1] = rand(0.2, 1.4) * spd; spVel[j * 3 + 2] = rand(-1, 1) * spd;
      spLife[j] = rand(0.4, 1.0);
    }
  }
  function updateSparks(dt) {
    for (let i = 0; i < SPARKS; i++) {
      if (spLife[i] <= 0) continue;
      spLife[i] -= dt; spVel[i * 3 + 1] -= 9 * dt;
      spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt; spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
      if (spPos[i * 3 + 1] < 0.02) { spPos[i * 3 + 1] = 0.02; spVel[i * 3 + 1] *= -0.3; spVel[i * 3] *= 0.6; spVel[i * 3 + 2] *= 0.6; }
      if (spLife[i] <= 0) spPos[i * 3 + 1] = -999;
    }
    spGeo.attributes.position.needsUpdate = true;
  }
  /* steam */
  const steam = [];
  for (let i = 0; i < (LOW ? 16 : 34); i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0xcfc6bb, transparent: true, opacity: 0, depthWrite: false }));
    s.visible = false; scene.add(s); steam.push({ s, life: 0, v: new V3() });
  }
  let stHead = 0;
  function emitSteam(p, n = 8, spread = 4) {
    for (let i = 0; i < n; i++) {
      const o = steam[stHead++ % steam.length];
      o.s.position.set(p.x + rand(-spread, spread), p.y + rand(-0.5, 1), p.z + rand(-0.5, 0.5));
      o.v.set(rand(-0.4, 0.4), rand(0.4, 1.1), rand(-0.3, 0.3)); o.life = 1; o.s.visible = true; o.max = rand(1.6, 2.6);
    }
  }
  function updateSteam(dt) {
    for (const o of steam) {
      if (o.life <= 0) continue;
      o.life -= dt / o.max; o.s.position.addScaledVector(o.v, dt);
      const k = 1 - o.life; o.s.scale.setScalar(1.5 + k * 4); o.s.material.opacity = Math.sin(Math.min(1, o.life) * Math.PI) * 0.55;
      if (o.life <= 0) o.s.visible = false;
    }
  }
  /* floating dust (GPU animated) */
  const DUST = LOW ? 700 : 2200;
  const dGeo = new THREE.BufferGeometry(); const dP = new Float32Array(DUST * 3), dS = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dP[i * 3] = rand(-HALL_X, HALL_X); dP[i * 3 + 1] = rand(0, 13); dP[i * 3 + 2] = rand(HALL_BACK, HALL_FRONT); dS[i] = Math.random(); }
  dGeo.setAttribute('position', new THREE.BufferAttribute(dP, 3)); dGeo.setAttribute('seed', new THREE.BufferAttribute(dS, 1));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, map: { value: glowTex }, power: { value: 0 }, pr: { value: DPR } },
    vertexShader: `attribute float seed; uniform float time; uniform float pr; varying float vA;
      void main(){ vec3 p = position; p.x += sin(time*0.15 + seed*40.0)*0.8; p.y = mod(p.y + time*(0.05+seed*0.12), 13.0); p.z += cos(time*0.1 + seed*30.0)*0.8;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (2.0+seed*5.0)*pr*(12.0/-mv.z); vA = 0.25+0.75*fract(seed*7.3); }`,
    fragmentShader: `uniform sampler2D map; uniform float power; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(1.0,0.72,0.42)*t.a*vA*0.55*power, t.a*vA*power); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dGeo, dustMat); dust.frustumCulled = false; scene.add(dust);

  /* =====================================================================
     INDUSTRIAL GATES
     ===================================================================== */
  const gates = [];
  function makeGate(z, frontLabel, backLabel) {
    const Gt = { z, target: 0, lock: 0, open: 0, steamed: false };
    const g = group(world, 0, 0, z); Gt.g = g;
    // bulkheads
    for (const s of [-1, 1]) {
      mesh(G.box(13, 14.6, 0.8), M.graphite, g, s * 11.5, 7.3, 0, 0, 0, 0, true);
      mesh(G.box(12, 0.12, 0.84), M.orangeGlow, g, s * 11.5, 8.9, 0);
      mesh(G.box(9.6, 2.4, 0.9), M.glass, g, s * 11.3, 11.2, 0);
      for (let i = 0; i < 5; i++) mesh(G.box(0.12, 2.6, 0.95), M.darkSteel, g, s * (7 + i * 2.2), 11.2, 0);
    }
    mesh(G.box(10, 6.4, 0.8), M.graphite, g, 0, 11.4, 0, 0, 0, 0, true); // lintel
    mesh(G.box(10.4, 0.5, 1.0), M.hazard, g, 0, 8.35, 0);
    for (const s of [-1, 1]) mesh(G.box(0.5, 8.2, 1.0), M.hazard, g, s * 5.1, 4.1, 0, 0, 0, Math.PI / 2 * 0);
    // doors
    Gt.doors = [];
    for (const s of [-1, 1]) {
      const d = group(g, s * 2.5, 0, 0);
      mesh(G.box(5, 8.1, 0.45), M.darkSteel, d, 0, 4.05, 0, 0, 0, 0, true);
      for (let i = 0; i < 4; i++) mesh(G.box(4.4, 0.08, 0.5), M.graphite, d, 0, 1.2 + i * 1.9, 0);
      mesh(G.box(0.3, 8.1, 0.5), M.hazard, d, -s * 2.35, 4.05, 0);
      mesh(G.box(0.06, 6, 0.52), M.orangeGlow, d, s * 1.9, 4.2, 0);
      Gt.doors.push({ d, s });
    }
    // lock wheel
    Gt.lockG = group(g, 0, 4.2, 0.5);
    mesh(G.tor(1.05, 0.12, 10, 40), M.steel, Gt.lockG, 0, 0, 0);
    for (let i = 0; i < 4; i++) mesh(G.box(2.1, 0.12, 0.1), M.steel, Gt.lockG, 0, 0, 0, 0, 0, i * Math.PI / 4);
    mesh(G.cyl(0.3, 0.3, 0.2, 20), M.orangeGlow, Gt.lockG, 0, 0, 0, Math.PI / 2, 0, 0);
    Gt.lockB = Gt.lockG.clone(); Gt.lockB.position.z = -0.5; g.add(Gt.lockB);
    // pistons
    Gt.pistons = [];
    for (const s of [-1, 1]) {
      mesh(G.cyl(0.22, 0.22, 1.4, 14), M.graphite, g, s * 4.4, 9.6, 0.7, 0, 0, 0);
      const rod = mesh(G.cyl(0.1, 0.1, 1.4, 10), M.steel, g, s * 4.4, 8.9, 0.7); Gt.pistons.push(rod);
    }
    // beacons
    Gt.beacons = [];
    for (const s of [-1, 1]) {
      const b = group(g, s * 5.6, 8.9, 0.7);
      mesh(G.cyl(0.18, 0.2, 0.3, 14), M.graphite, b, 0, -0.15, 0);
      const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xb07a1c).multiplyScalar(0.3) });
      mesh(G.sph(0.18, 14, 10), bm, b, 0, 0.08, 0); Gt.beacons.push(bm);
    }
    // signs
    if (frontLabel) mesh(new THREE.PlaneGeometry(7.2, 1.35), new THREE.MeshBasicMaterial({ map: labelTex(frontLabel, { w: 1024, h: 192, size: 78, frame: true, bg: 'rgba(8,8,8,.9)' }), toneMapped: false }), g, 0, 10.3, 0.42);
    if (backLabel) mesh(new THREE.PlaneGeometry(7.2, 1.35), new THREE.MeshBasicMaterial({ map: labelTex(backLabel, { w: 1024, h: 192, size: 78, frame: true, bg: 'rgba(8,8,8,.9)' }), toneMapped: false }), g, 0, 10.3, -0.42, 0, Math.PI, 0);
    gates.push(Gt); return Gt;
  }
  makeGate(0, 'ENTER THE WORKSHOP', 'ASSEMBLY BAY // VISHH');
  for (let i = 1; i < GATE_Z.length; i++) makeGate(GATE_Z[i], `ZONE ${ZONES[i].num} // ${ZONES[i].nav}`, `ZONE ${ZONES[i - 1].num} // ${ZONES[i - 1].nav}`);
  // sign for zone 1 on first gate backside handled; add zone 01 label over first room entry
  function updateGate(Gt, dt, t) {
    if (Gt.target) {
      if (Gt.lock < 1) Gt.lock = Math.min(1, Gt.lock + dt * 2.6);
      else Gt.open = Math.min(1, Gt.open + dt * 1.1);
    } else {
      if (Gt.open > 0) Gt.open = Math.max(0, Gt.open - dt * 0.9);
      else Gt.lock = Math.max(0, Gt.lock - dt * 2.2);
    }
    if (Gt.target && Gt.lock > 0.95 && !Gt.steamed) { Gt.steamed = true; emitSteam(new V3(0, 1.5, Gt.z), LOW ? 6 : 12, 4.5); sfx.hiss(); }
    if (!Gt.target && Gt.open < 0.01) Gt.steamed = false;
    const o = ease(Gt.open);
    Gt.doors.forEach(({ d, s }) => { d.position.x = s * (2.5 + o * 5.0); });
    for (const lg of [Gt.lockG, Gt.lockB]) { lg.rotation.z = ease(Gt.lock) * Math.PI * 1.5; lg.position.y = 4.2 + o * 5.5; }
    Gt.pistons.forEach((r) => { r.position.y = 8.9 - Gt.lock * 0.3 + o * 0.6; });
    const blink = (Gt.target || Gt.open > 0.01) ? (Math.sin(t * 12) > 0 ? 3 : 0.2) : 0.35;
    Gt.beacons.forEach((m) => m.color.setRGB(blink, blink * 0.72, blink * 0.25));
  }

  /* =====================================================================
     ZONE BUILDERS
     ===================================================================== */
  const zoneObjs = [];
  function makePlatform(parent, r = 2.3) {
    const P = {};
    const g = group(parent, 0, 0, 0); P.g = g;
    mesh(G.cyl(r + 0.25, r + 0.4, 0.22, 48), M.graphite, g, 0, 0.11, 0, 0, 0, 0, true).receiveShadow = true;
    mesh(G.cyl(r, r, 0.24, 48), M.black, g, 0, 0.12, 0).receiveShadow = true;
    P.ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xc9962f) });
    mesh(G.tor(r + 0.1, 0.03, 6, 64), P.ringMat, g, 0, 0.24, 0, Math.PI / 2, 0, 0);
    P.spin = group(g, 0, 0.25, 0);
    mesh(G.tor(r * 0.72, 0.02, 6, 64, TAU * 0.7), P.ringMat, P.spin, 0, 0, 0, Math.PI / 2, 0, 0);
    mesh(G.tor(r * 0.5, 0.015, 6, 48, TAU * 0.4), P.ringMat, P.spin, 0, 0, 0, Math.PI / 2, 0, 2);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; mesh(G.box(0.05, 0.02, 0.3), P.ringMat, P.spin, Math.cos(a) * r * 0.86, 0, Math.sin(a) * r * 0.86, 0, -a, 0); }
    P.beam = mesh(G.cyl(r * 0.55, r * 1.05, 11, 32, true), beamMat(0xd9b060, 0.12), g, 0, 5.5, 0);
    return P;
  }
  const lightPool = [0, 1].map(() => { const k = new THREE.PointLight(0xf0dcb0, 0, 38, 2), r = new THREE.PointLight(0xc9962f, 0, 18, 2); scene.add(k, r); return { k, r }; });
  function assignZoneLights(zones, camZ) {
    const near = zones.slice().sort((a, b) => Math.abs(a.z - camZ) - Math.abs(b.z - camZ));
    lightPool.forEach((p, i) => { const Z = near[i]; p.k.position.copy(Z.light.position); p.k.color.copy(Z.light.color); p.k.intensity = Z.light.intensity; p.r.position.copy(Z.rim.position); p.r.color.copy(Z.rim.color); p.r.intensity = Z.rim.intensity; });
  }
  function baseZone(idx, z) {
    const Z = { idx, z, power: 0.15, enterT: -99, g: group(world, 0, 0, z) };
    Z.plat = makePlatform(Z.g);
    // virtual lights: a small pool of real PointLights is re-assigned to the nearest zones each frame (keeps shader light count low)
    Z.light = { intensity: 0, position: new THREE.Vector3(0, 9, z + 1), color: new THREE.Color(0xf0dcb0) };
    Z.rim = { intensity: 0, position: new THREE.Vector3(0, 4, z - 7), color: new THREE.Color(idx === 1 ? 0xaab6c2 : 0xc9962f) };
    return Z;
  }
  function consoleDesk(parent, x, z, ry) {
    const g = group(parent, x, 0, z); g.rotation.y = ry;
    mesh(G.box(1.8, 1.0, 0.8), M.graphite, g, 0, 0.5, 0, 0, 0, 0, true);
    mesh(G.box(1.9, 0.08, 0.95), M.black, g, 0, 1.04, 0.08, -0.25, 0, 0);
    const sm = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tex = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#14120e'; c.fillRect(0, 0, w, h); for (let i = 0; i < 18; i++) { c.fillStyle = i % 3 ? '#c9a24a' : '#f0dca8'; c.fillRect(12 + (i % 6) * 40, 12 + Math.floor(i / 6) * 26, 28, 14); } });
    sm.map = tex; sm.color.setScalar(1.6);
    mesh(new THREE.PlaneGeometry(1.6, 0.6), sm, g, 0, 1.1, 0.1, -Math.PI / 2 - 0.25 + Math.PI, Math.PI, 0);
    return g;
  }

  /* ---------- HUB: assembly bay ---------- */
  const hub = (() => {
    const Z = baseZone(-1, HUB_Z);
    Z.plat.g.scale.setScalar(1.25);
    Z.arms = [makeArm(Z.g, -3.2, -1.6, 0.6), makeArm(Z.g, 3.2, -1.6, -0.6), makeArm(Z.g, -3.4, 2.2, 2.4, 0.9), makeArm(Z.g, 3.4, 2.2, -2.4, 0.9)];
    Z.arms.forEach((a) => { a.weld = true; a.lean = -0.1; });
    Z.conv = [makeConveyor(Z.g, -9, 0, 20, 'z', 7), makeConveyor(Z.g, 9, 0, 20, 'z', 7)];
    Z.scanRing = mesh(G.tor(1.3, 0.035, 8, 64), M.amberGlow, Z.g, 0, -5, 0, Math.PI / 2, 0, 0);
    Z.scanDisc = mesh(new THREE.CircleGeometry(1.28, 48), new THREE.MeshBasicMaterial({ color: 0xcf9f45, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), Z.g, 0, -5, 0, Math.PI / 2, 0, 0);
    // big factory screen above gate
    const scr = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#070707'; g.fillRect(0, 0, w, h); frameDeco(g, w, h); g.textAlign = 'center'; g.fillStyle = ORANGE; g.font = `700 92px ${FONT}`; g.fillText('ROBOT FACTORY', w / 2, 118); g.fillStyle = '#f3ede4'; g.font = `500 40px ${FONT}`; g.fillText('UNIT VISHH   //   SOFTWARE ENGINEER', w / 2, 190); });
    Z.screen = mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshBasicMaterial({ map: scr, toneMapped: false, color: 0x000000 }), world, 0, 12.4, 0.43);
    // sweeping scanner wall (intro)
    Z.sweep = mesh(new THREE.PlaneGeometry(26, 13), new THREE.MeshBasicMaterial({ color: 0xcf9f45, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), Z.g, 0, 6.5, 0, 0, Math.PI / 2, 0);
    Z.sweepLine = mesh(new THREE.PlaneGeometry(0.12, 26), M.amberGlow, Z.g, 0, 0.03, 0, -Math.PI / 2, 0, 0); Z.sweepLine.visible = false;
    Z.update = (dt, t) => {};
    return Z;
  })();

  /* ---------- ZONE 01: identity core ---------- */
  let faceTexture = new THREE.TextureLoader().load(FACE_URI); faceTexture.colorSpace = THREE.SRGBColorSpace;
  const about = (() => {
    const Z = baseZone(0, ZONES[0].z);
    Z.column = mesh(G.cyl(2.2, 2.2, 7, 48, true), holoMat({ color: 0xd4aa55, opacity: 0.0 }), Z.g, 0, 3.5, 0);
    Z.scanRing = mesh(G.tor(2.25, 0.04, 8, 72), M.amberGlow, Z.g, 0, 6, 0, Math.PI / 2, 0, 0);
    Z.bigRing = group(Z.g, 2.2, 4.4, -6.5);
    mesh(G.tor(3.6, 0.05, 8, 96), M.orangeGlow, Z.bigRing);
    mesh(G.tor(3.3, 0.02, 6, 96, TAU * 0.7), M.amberGlow, Z.bigRing);
    for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; mesh(G.box(0.05, i % 4 ? 0.18 : 0.4, 0.05), M.amberGlow, Z.bigRing, Math.cos(a) * 3.9, Math.sin(a) * 3.9, 0, 0, 0, a + Math.PI / 2); }
    Z.portraitMat = holoMat({ map: faceTexture, color: 0xe0c07a, opacity: 0, tint: 0.28 });
    Z.portrait = mesh(new THREE.PlaneGeometry(3.0, 3.0), Z.portraitMat, Z.g, 3.4, 4.1, -5.2, 0, -0.25, 0);
    Z.pFrame = group(Z.g, 3.4, 4.1, -5.25); Z.pFrame.rotation.y = -0.25;
    mesh(G.tor(2.2, 0.03, 6, 6), M.orangeGlow, Z.pFrame, 0, 0, 0, 0, 0, Math.PI / 6);
    Z.pLabel = mesh(new THREE.PlaneGeometry(3.2, 0.5), holoMat({ map: labelTex('IDENTITY: VISHNU VASAVAN', { w: 1024, h: 160, size: 64 }), opacity: 0, tint: 0 }), Z.g, 3.4, 2.1, -5.1, 0, -0.25, 0);
    consoleDesk(Z.g, -5.5, -2, 0.5); consoleDesk(Z.g, 5.8, 1.5, -0.9);
    Z.onEnter = () => { Z.column.material.uniforms.opacity.value = 0; };
    Z.update = (dt, t, e) => {
      Z.bigRing.rotation.z += dt * 0.08;
      Z.pFrame.rotation.z -= dt * 0.3;
      Z.scanRing.position.y = e < 2.2 ? lerp(6.5, 0.3, easeOut(clamp(e / 1.8, 0, 1))) : 0.3 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 5.5;
      Z.column.material.uniforms.opacity.value = damp(Z.column.material.uniforms.opacity.value, (e < 2.2 ? 0.55 : 0.12) * (Z.power > 0.5 ? 1 : 0.4), 3, dt);
      const r = clamp((e - 0.6) / 1.6, 0, 1);
      Z.portraitMat.uniforms.reveal.value = r; Z.portraitMat.uniforms.opacity.value = Z.power > 0.5 ? 1 : 0.25;
      Z.pLabel.material.uniforms.reveal.value = clamp((e - 1.8) / 0.6, 0, 1); Z.pLabel.material.uniforms.opacity.value = Z.power > 0.5 ? 1 : 0.2;
    };
    return Z;
  })();

  /* ---------- ZONE 02: engineering lab ---------- */
  const CHIP_LABELS = ['JAVASCRIPT', 'JAVA', 'SQL', 'NODE.JS', 'EXPRESS.JS', 'GRAPHQL', 'REST APIs', 'POSTGRESQL', 'MYSQL', 'DYNAMODB', 'AWS LAMBDA', 'S3', 'EC2', 'APPSYNC', 'ODOO ERP', 'DOCKER'];
  const skills = (() => {
    const Z = baseZone(1, ZONES[1].z);
    Z.arms = [makeArm(Z.g, -3.3, -2.4, 0.5), makeArm(Z.g, 3.3, -2.4, -0.5)];
    Z.arms.forEach((a) => { a.weld = true; });
    Z.conv = makeConveyor(Z.g, 9.5, -3, 16, 'z', 6);
    Z.scanRing = mesh(G.tor(1.25, 0.04, 8, 64), M.cyanGlow, Z.g, 0, -3, 0, Math.PI / 2, 0, 0);
    // workbenches
    for (const [x, z] of [[-8, -6], [-8, 3], [7, 6]]) { const b = group(Z.g, x, 0, z); mesh(G.box(3, 1, 1.2), M.graphite, b, 0, 0.5, 0, 0, 0, 0, true); mesh(G.box(3.1, 0.08, 1.3), M.steel, b, 0, 1.02, 0); mesh(G.box(0.6, 0.4, 0.4), M.paint, b, -0.8, 1.26, 0); mesh(G.cyl(0.18, 0.18, 0.5, 12), M.white, b, 0.7, 1.3, 0); }
    // chips
    Z.chips = CHIP_LABELS.map((lab, i) => {
      const tex = canvasTex(512, 256, (g, w, h) => {
        g.fillStyle = '#0d0f10'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#d6a14a'; for (let k = 0; k < 14; k++) { g.fillRect(24 + k * 33, 0, 12, 14); g.fillRect(24 + k * 33, h - 14, 12, 14); }
        g.strokeStyle = 'rgba(201,162,74,.5)'; g.lineWidth = 2; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(20, 40 + k * 32); g.lineTo(70, 40 + k * 32); g.lineTo(90, 60 + k * 30); g.stroke(); }
        g.strokeStyle = ORANGE; g.lineWidth = 4; g.strokeRect(10, 22, w - 20, h - 44);
        g.fillStyle = '#ecd08a'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `700 ${lab.length > 8 ? 62 : 78}px ${FONT}`; g.fillText(lab, w / 2 + 20, h / 2 + 4);
      });
      const face = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.55, metalness: 0.2 });
      const c = new THREE.Mesh(G.box(0.95, 0.48, 0.07), [M.graphite, M.graphite, M.graphite, M.graphite, face, face]);
      c.castShadow = true; Z.g.add(c);
      const ring = i < 8 ? 0 : 1;
      return { m: c, i, start: new V3(9.5, 1.4 + (i % 4) * 0.1, -9 + (i % 8) * 1.6), ring, slot: (i % 8) / 8 * TAU + ring * 0.4 };
    });
    Z.onEnter = () => {};
    const tmp = new V3();
    Z.update = (dt, t, e) => {
      Z.scanRing.position.y = e < 3 ? 0.2 + Math.abs(Math.sin(e * 1.6)) * 2.6 : -3;
      Z.chips.forEach((c) => {
        const st = 0.9 + c.i * 0.13, k = clamp((e - st) / 1.1, 0, 1);
        const orbitR = c.ring ? 2.05 : 1.75, oy = c.ring ? 3.25 : 1.0;
        const a = c.slot + t * (c.ring ? -0.35 : 0.3);
        const target = tmp.set(Math.cos(a) * orbitR, oy + Math.sin(t * 1.3 + c.i) * 0.08, Math.sin(a) * orbitR);
        if (k <= 0) { c.m.position.copy(c.start); c.m.rotation.set(-Math.PI / 2, 0, 0); c.m.visible = e > 0; }
        else {
          const arm = Z.arms[c.i % 2]; const tipW = arm.tip.getWorldPosition(new V3()); Z.g.worldToLocal(tipW);
          const kk = ease(k);
          if (kk < 0.5) c.m.position.lerpVectors(c.start, tipW, kk * 2); else c.m.position.lerpVectors(tipW, target, (kk - 0.5) * 2);
          c.m.position.y += Math.sin(kk * Math.PI) * 1.2;
          c.m.rotation.set(lerp(-Math.PI / 2, 0, kk), lerp(0, -a + Math.PI / 2, kk), Math.sin(t * 2 + c.i) * 0.08 * kk);
          c.m.visible = true;
          if (k > 0.98 && !c.sparked) { c.sparked = true; emitSparks(tmp.copy(c.m.position).add(Z.g.position), 6, 1.5); }
        }
        if (e < 0.05) c.sparked = false;
      });
    };
    return Z;
  })();

  /* ---------- ZONE 03: command center ---------- */
  const exper = (() => {
    const Z = baseZone(2, ZONES[2].z);
    Z.screens = [];
    const logs = ['GET /graphql 200', 'POST /api/v1/payroll 201', 'EXPLAIN ANALYZE SELECT ...', 'CREATE OR REPLACE FUNCTION', 'lambda.invoke() OK', 'appsync.resolver OK', 'odoo.jsonrpc invoice.sync', 'CREATE INDEX CONCURRENTLY', 's3.putObject OK', 'cache HIT /api/attendance'];
    const drawMain = (g, w, h, t) => {
      g.fillStyle = '#060504'; g.fillRect(0, 0, w, h); frameDeco(g, w, h);
      g.textAlign = 'left'; g.fillStyle = ORANGE; g.font = `700 70px ${FONT}`; g.fillText('MOBI80 SOLUTIONS', 50, 105);
      g.fillStyle = '#f5efe6'; g.font = `600 44px ${FONT}`; g.fillText('SOFTWARE ENGINEER', 50, 165);
      g.fillStyle = AMBER; g.font = `500 32px ${FONT}`; g.fillText('DEC 2025 — PRESENT   |   BANGALORE, INDIA', 50, 215);
      g.fillStyle = 'rgba(201,162,74,.25)'; g.fillRect(50, 240, w - 100, 2);
      g.font = `500 26px ${FONT}`;
      for (let i = 0; i < 6; i++) { const idx = (Math.floor(t * 2) + i) % logs.length; g.fillStyle = `rgba(255,${190 - i * 12},${120 - i * 12},${1 - i * 0.14})`; g.fillText('> ' + logs[idx], 50, 285 + i * 36); }
    };
    const makeScreen = (x, y, z, ry, w, h, draw) => {
      const tex = canvasTex(1024, Math.round(1024 * h / w), (g, W, H) => draw(g, W, H, 0));
      const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0x000000 });
      const grp = group(Z.g, x, y, z); grp.rotation.y = ry;
      mesh(G.box(w + 0.3, h + 0.3, 0.2), M.graphite, grp, 0, 0, -0.12, 0, 0, 0, true);
      mesh(new THREE.PlaneGeometry(w, h), mat, grp, 0, 0, 0);
      const S = { tex, mat, draw, on: 0 }; Z.screens.push(S); return S;
    };
    Z.main = makeScreen(0, 5.4, -8.2, 0, 7.2, 3.9, drawMain);
    const sideDraw = (title, lines) => (g, w, h) => { g.fillStyle = '#060504'; g.fillRect(0, 0, w, h); frameDeco(g, w, h); g.fillStyle = ORANGE; g.font = `700 54px ${FONT}`; g.textAlign = 'left'; g.fillText(title, 44, 90); g.font = `500 34px ${FONT}`; lines.forEach((l, i) => { g.fillStyle = i % 2 ? '#f0e6d8' : AMBER; g.fillText(l, 44, 160 + i * 52); }); };
    makeScreen(-6.4, 4.6, -6.6, 0.55, 4, 2.6, sideDraw('AWS PIPELINE', ['LAMBDA', '→ S3', '→ DYNAMODB', '→ APPSYNC']));
    makeScreen(6.4, 4.6, -6.6, -0.55, 4, 2.6, sideDraw('ERP SYNC', ['ODOO ERP', 'JSON-RPC', 'INVOICING', 'WORKFLOWS']));
    makeScreen(-9.2, 2.4, -3.2, 0.9, 3, 1.8, sideDraw('POSTGRESQL', ['FUNCTIONS', 'PROCEDURES']));
    makeScreen(9.2, 2.4, -3.2, -0.9, 3, 1.8, sideDraw('API LAYER', ['REST', 'GRAPHQL']));
    Z.console = consoleDesk(Z.g, 1.9, 0.7, -0.9);
    // timeline nodes
    Z.nodes = [];
    const tl = group(Z.g, -1.2, 8.4, -8.1);
    mesh(G.box(6.4, 0.03, 0.03), M.amberGlow, tl, 1.2, 0, 0);
    for (let i = 0; i < 5; i++) { const n = mesh(G.sph(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: 0x331a08 }), tl, -1.6 + i * 1.4 + 1.2, 0, 0); Z.nodes.push(n); }
    addGear(Z.g, -8.5, 7.2, -8.4, 1.4, 16, 0.5); addGear(Z.g, -6.7, 8.5, -8.3, 0.8, 10, -0.9, 0, M.paint);
    addGear(Z.g, 8.5, 7.2, -8.4, 1.4, 16, -0.5); addGear(Z.g, 6.7, 8.5, -8.3, 0.8, 10, 0.9, 0, M.paint);
    // data streams
    const n = LOW ? 120 : 360; const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p[i * 3] = rand(-12, 12); p[i * 3 + 1] = rand(0, 12); p[i * 3 + 2] = rand(-9.5, -8.6); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    Z.stream = new THREE.Points(gg, new THREE.PointsMaterial({ map: glowTex, color: 0xd4aa55, size: 0.12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    Z.g.add(Z.stream);
    let acc = 0;
    Z.update = (dt, t, e) => {
      const pa = Z.stream.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) { let y = pa.getY(i) - dt * (2 + (i % 5)); if (y < 0) y = 12; pa.setY(i, y); }
      pa.needsUpdate = true;
      Z.screens.forEach((S, i) => { const on = Z.power > 0.5 ? clamp((e - 0.2 - i * 0.18) / 0.4, 0, 1) : 0.25; S.on = on; const fl = on < 1 && on > 0 ? (Math.random() > 0.5 ? 1 : 0.2) : 1; S.mat.color.setScalar(on * fl * 0.85); });
      acc += dt; if (acc > 0.25 && Z.power > 0.5) { acc = 0; const S = Z.main; S.draw(S.tex.userData.ctx, 1024, S.tex.userData.canvas.height, t); S.tex.needsUpdate = true; }
      Z.nodes.forEach((nd, i) => { const on = e > 1.4 + i * 0.35 && Z.power > 0.5; nd.material.color.setRGB(on ? 1.7 : 0.2, on ? 1.3 : 0.15, on ? 0.5 : 0.05); nd.scale.setScalar(on ? 1 + Math.sin(t * 4 + i) * 0.12 : 0.8); });
    };
    return Z;
  })();

  /* ---------- ZONE 04: project workshop ---------- */
  function drawProjectScreen(id) {
    return canvasTex(1024, 640, (g, w, h) => {
      g.fillStyle = 'rgba(12,8,4,0.95)'; g.fillRect(0, 0, w, h); frameDeco(g, w, h);
      const P = DATA.projects.find((p) => p.id === id);
      g.textAlign = 'left'; g.fillStyle = ORANGE; g.font = `700 86px ${FONT}`; g.fillText(P.name.toUpperCase(), 48, 112);
      g.fillStyle = '#f4ede2'; g.font = `500 36px ${FONT}`; g.fillText(P.sub, 50, 164);
      g.fillStyle = 'rgba(201,162,74,.3)'; g.fillRect(48, 190, w - 96, 2);
      if (id === 'presence') {
        g.font = `600 26px ${FONT}`; g.fillStyle = AMBER; g.fillText('ATTENDANCE // LIVE', 50, 236);
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        days.forEach((d, i) => { const bh = 120 + ((i * 53) % 150); g.fillStyle = i % 2 ? '#c9a24a' : '#e3c67f'; g.fillRect(70 + i * 105, 540 - bh, 60, bh); g.fillStyle = '#cfc4b4'; g.fillText(d, 70 + i * 105, 580); });
        for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(730, 250 + i * 80, 240, 60); g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(760, 280 + i * 80, 12, 0, TAU); g.fill(); g.fillStyle = '#eee'; g.fillText(['CHECK-IN', 'SHIFT', 'LEAVE', 'REPORT'][i], 790, 290 + i * 80); }
      } else if (id === 'glyd') {
        g.font = `600 26px ${FONT}`; g.fillStyle = AMBER; g.fillText('TRAVEL + EXPENSE FLOW', 50, 236);
        ['TRAVEL REQUEST', 'APPROVAL', 'EXPENSE CLAIM', 'PROCESSED'].forEach((s, i) => { const x = 60 + i * 235; g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.strokeRect(x, 280, 200, 90); g.fillStyle = '#f2e9dd'; g.font = `600 24px ${FONT}`; g.fillText(s, x + 14, 332); if (i < 3) { g.fillStyle = '#c9a24a'; g.fillRect(x + 202, 322, 30, 4); } });
        g.strokeStyle = '#e3c67f'; g.lineWidth = 5; g.beginPath(); for (let i = 0; i < 12; i++) { const x = 60 + i * 80, y = 540 - Math.abs(Math.sin(i * 1.3)) * 110; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      } else {
        g.font = `600 26px ${FONT}`; g.fillStyle = AMBER; g.fillText('PAYROLL RUN // INVOICE SYNC', 50, 236);
        for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(201,162,74,.1)'; g.fillRect(50, 260 + i * 56, 560, 48); g.fillStyle = '#eee'; g.font = `500 24px ${FONT}`; g.fillText(['EMPLOYEE', 'SALARY ADVANCE', 'VALIDATION', 'PAYROLL', 'INVOICE'][i], 70, 292 + i * 56); g.fillStyle = '#c9a24a'; g.fillRect(470, 276 + i * 56, 110, 16); }
        g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.strokeRect(680, 290, 280, 90); g.strokeRect(680, 440, 280, 90);
        g.fillStyle = '#f2e9dd'; g.font = `700 30px ${FONT}`; g.fillText('SALARY365', 710, 345); g.fillText('ODOO ERP', 710, 495);
        g.fillStyle = '#e3c67f'; g.fillRect(815, 385, 4, 50); g.fillRect(830, 385, 4, 50);
      }
    });
  }
  const STATION_X = [-7, 0, 7];
  const projects = (() => {
    const Z = baseZone(3, ZONES[3].z);
    Z.conv = makeConveyor(Z.g, 0, -12.5, 22, 'x', 9); Z.conv.target = 0;
    Z.stations = DATA.projects.map((P, i) => {
      const x = STATION_X[i]; const g = group(Z.g, x, 0, -8.5);
      mesh(G.cyl(1.1, 1.3, 0.9, 6), M.graphite, g, 0, 0.45, 0, 0, 0, 0, true);
      mesh(G.tor(1.12, 0.03, 6, 6), M.orangeGlow, g, 0, 0.92, 0, Math.PI / 2, 0, 0);
      mesh(G.cyl(0.08, 0.1, 2.1, 10), M.steel, g, -1.7, 1.9, 0); mesh(G.cyl(0.08, 0.1, 2.1, 10), M.steel, g, 1.7, 1.9, 0);
      const mat = holoMat({ map: drawProjectScreen(P.id), color: 0xdcb868, opacity: 0.25, tint: 0.08 });
      const scr = mesh(new THREE.PlaneGeometry(3.6, 2.25), mat, g, 0, 3.3, 0);
      const prop = group(g, 0, 1.4, 0.3);
      if (i === 0) { for (let k = 0; k < 5; k++) mesh(G.box(0.14, 0.2 + k * 0.1, 0.14), M.orangeGlow, prop, -0.4 + k * 0.2, 0.1 + k * 0.05, 0); }
      else if (i === 1) { mesh(G.box(0.7, 0.45, 0.35), M.paint, prop, 0, 0.1, 0); mesh(G.box(0.3, 0.12, 0.05), M.graphite, prop, 0, 0.39, 0); }
      else { for (let k = 0; k < 4; k++) mesh(G.box(0.55, 0.04, 0.4), k % 2 ? M.white : M.orange, prop, 0, k * 0.08, 0, 0, k * 0.2, 0); }
      return { g, mat, scr, prop, x };
    });
    // academic mini-stations
    Z.acad = DATA.academic.map((A, i) => {
      const s = i === 1 ? 1 : -1; const g = group(Z.g, s * 12.4, 0, i === 2 ? 3.5 : -2.5);
      mesh(G.cyl(0.6, 0.7, 1, 8), M.graphite, g, 0, 0.5, 0, 0, 0, 0, true);
      const cube = mesh(G.box(0.55, 0.55, 0.55), holoMat({ color: 0xe0c07a, opacity: 0.8 }), g, 0, 1.7, 0);
      mesh(new THREE.PlaneGeometry(2.8, 0.7), holoMat({ map: labelTex([A.name.toUpperCase()], { w: 1024, h: 200, size: 50 }), opacity: 0.9, tint: 0 }), g, 0, 2.6, 0, 0, -s * Math.PI / 2 * 0.7, 0);
      return { g, cube };
    });
    // gantry crane
    Z.crane = group(Z.g, 0, 11, 0);
    mesh(G.box(34, 0.6, 0.8), M.paint, Z.crane, 0, 0, 0, 0, 0, 0);
    Z.trolley = group(Z.crane, 0, -0.5, 0); mesh(G.box(1.2, 0.5, 1.2), M.graphite, Z.trolley);
    mesh(G.cyl(0.03, 0.03, 5, 6), M.steel, Z.trolley, 0, -2.7, 0);
    mesh(G.box(1.1, 0.8, 1.1), M.white, Z.trolley, 0, -5.4, 0, 0, 0, 0, true);
    Z.update = (dt, t, e) => {
      Z.conv.target = Z.power > 0.5 ? 0.9 : 0.06;
      Z.stations.forEach((s, i) => {
        const k = Z.power > 0.5 ? clamp((e - 0.6 - i * 0.45) / 0.9, 0, 1) : 0.15;
        s.mat.uniforms.reveal.value = Z.power > 0.5 ? k : 1; s.mat.uniforms.opacity.value = Z.power > 0.5 ? 0.95 : 0.2;
        s.prop.rotation.y += dt * 0.6; s.prop.position.y = 1.4 + Math.sin(t * 1.5 + i) * 0.06;
        const sel = S.station === i; s.scr.scale.setScalar(damp(s.scr.scale.x, sel ? 1.18 : 1, 4, dt));
      });
      Z.acad.forEach((a, i) => { a.cube.rotation.set(t * 0.4 + i, t * 0.6, 0); });
      Z.crane.position.z = Math.sin(t * 0.12) * 7; Z.trolley.position.x = Math.sin(t * 0.21) * 10;
    };
    return Z;
  })();

  /* ---------- ZONE 05: knowledge archive ---------- */
  const edu = (() => {
    const Z = baseZone(4, ZONES[4].z);
    Z.arms = [makeArm(Z.g, -4.6, -2.8, 0.7, 1.1), makeArm(Z.g, 4.6, -2.8, -0.7, 1.1)];
    // archive shelves with data crystals
    const cubes = [];
    for (const s of [-1, 1]) for (let r = 0; r < 3; r++) {
      const x = s * (9.5 + r * 2.2);
      mesh(G.box(0.8, 7, 12), M.black, Z.g, x, 3.5, -1, 0, 0, 0, true);
      for (let row = 0; row < 7; row++) for (let c = 0; c < (LOW ? 5 : 10); c++) cubes.push([x - s * 0.45, 0.6 + row * 0.95, -6 + c * (LOW ? 2.2 : 1.1)]);
    }
    const cm = new THREE.InstancedMesh(G.box(0.22, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }), cubes.length);
    const d = new THREE.Object3D(); cubes.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.updateMatrix(); cm.setMatrixAt(i, d.matrix); cm.setColorAt(i, new THREE.Color(0.1, 0.05, 0.02)); });
    Z.g.add(cm); Z.cubes = cm; Z.cubeN = cubes.length;
    // floating education cards
    Z.cards = DATA.education.map((E, i) => {
      const tex = canvasTex(1024, 600, (g, w, h) => {
        g.fillStyle = 'rgba(10,7,4,.92)'; g.fillRect(0, 0, w, h); frameDeco(g, w, h);
        g.textAlign = 'left'; g.fillStyle = ORANGE; g.font = `700 40px ${FONT}`; g.fillText(E.year, 52, 92);
        g.fillStyle = '#f7f1e8'; g.font = `700 62px ${FONT}`;
        wrapLines(g, E.school.toUpperCase(), w - 110).forEach((ln, k) => g.fillText(ln, 52, 180 + k * 70));
        g.fillStyle = AMBER; g.font = `500 40px ${FONT}`; g.fillText(E.degree, 52, 420); g.fillStyle = '#d9cfc2'; g.fillText(E.city + '   |   ' + E.score, 52, 490);
      });
      const mat = holoMat({ map: tex, color: 0xe0c07a, opacity: 0.2, tint: 0.06 });
      const m = mesh(new THREE.PlaneGeometry(2.9, 1.7), mat, Z.g, 0, 0, 0);
      const home = [new V3(-3.6, 3.7, -5), new V3(0.4, 5.6, -6.5), new V3(4.2, 3.7, -5)][i];
      return { m, mat, home, from: new V3(i === 1 ? 0 : (i ? 10 : -10), 3, -2), ry: [0.35, 0, -0.35][i] };
    });
    // certification badges
    Z.badges = DATA.certifications.map((c, i) => {
      const tex = canvasTex(512, 512, (g, w) => {
        g.translate(w / 2, w / 2); g.strokeStyle = ORANGE; g.lineWidth = 12; g.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU + Math.PI / 6; g.lineTo(Math.cos(a) * 225, Math.sin(a) * 225); } g.stroke();
        g.fillStyle = 'rgba(20,10,4,.9)'; g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `700 50px ${FONT}`;
        const lines = wrapLines(g, c.toUpperCase(), 330); lines.forEach((ln, k) => g.fillText(ln, 0, (k - (lines.length - 1) / 2) * 58 + 16));
        g.fillStyle = ORANGE; g.font = `600 30px ${FONT}`; g.fillText('CERTIFIED', 0, -130);
      });
      const m = mesh(new THREE.PlaneGeometry(1.2, 1.2), holoMat({ map: tex, opacity: 0.9, tint: 0 }), Z.g, 5.8, 1.2 + i * 1.35, -1.2, 0, -0.6, 0);
      return m;
    });
    Z.update = (dt, t, e) => {
      const on = Z.power > 0.5;
      Z.cards.forEach((c, i) => {
        const k = on ? ease(clamp((e - 0.5 - i * 0.45) / 1.2, 0, 1)) : 1;
        c.m.position.lerpVectors(c.from, c.home, k); c.m.position.y += Math.sin(k * Math.PI) * 1.5 + Math.sin(t + i) * 0.05;
        c.m.rotation.y = c.ry + (1 - k) * Math.PI * 1.2;
        c.mat.uniforms.opacity.value = on ? 1 : 0.2; c.mat.uniforms.reveal.value = on ? clamp((e - 0.9 - i * 0.45) / 0.8, 0, 1) : 1;
      });
      Z.badges.forEach((b, i) => { b.rotation.y = -0.6 + Math.sin(t * 0.8 + i) * 0.3; b.material.uniforms.opacity.value = on ? clamp((e - 2 - i * 0.2) / 0.5, 0, 1) : 0.15; });
      if (Math.random() < dt * 6) { const i = Math.random() * Z.cubeN | 0; const v = Z.power * rand(0.4, 2.8); Z.cubes.setColorAt(i, new THREE.Color(v, v * 0.52, v * 0.14)); Z.cubes.instanceColor.needsUpdate = true; }
    };
    // initial cube lighting
    for (let i = 0; i < cubes.length; i++) { const v = Math.random() < 0.5 ? rand(0.6, 2.4) : 0.08; cm.setColorAt(i, new THREE.Color(v, v * 0.5, v * 0.14)); }
    return Z;
  })();

  /* ---------- ZONE 06: communication hub ---------- */
  const contact = (() => {
    const Z = baseZone(5, ZONES[5].z);
    // dish antenna
    Z.dishBase = group(Z.g, 7.5, 0, -6);
    mesh(G.cyl(0.7, 1, 1.2, 16), M.graphite, Z.dishBase, 0, 0.6, 0, 0, 0, 0, true);
    mesh(G.cyl(0.25, 0.3, 3, 12), M.darkSteel, Z.dishBase, 0, 2.6, 0, 0, 0, 0, true);
    Z.dishYaw = group(Z.dishBase, 0, 4.2, 0);
    Z.dish = group(Z.dishYaw, 0, 0, 0);
    const pts = []; for (let i = 0; i <= 16; i++) { const r = i / 16 * 2.6; pts.push(new THREE.Vector2(r, r * r * 0.18)); }
    mesh(new THREE.LatheGeometry(pts, 40), std({ color: 0xe6e3de, roughness: 0.35, metalness: 0.4, side: THREE.DoubleSide }), Z.dish, 0, 0, 0, -Math.PI / 2, 0, 0, true);
    mesh(G.cyl(0.03, 0.03, 1.6, 6), M.steel, Z.dish, 0, 0, 0.8, Math.PI / 2, 0, 0);
    mesh(G.sph(0.12, 12, 10), M.amberGlow, Z.dish, 0, 0, 1.6);
    // antenna tower
    const tw = group(Z.g, -7.5, 0, -7);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; mesh(G.cyl(0.06, 0.08, 10, 6), M.darkSteel, tw, Math.cos(a) * 0.6, 5, Math.sin(a) * 0.6); }
    for (let y = 1; y < 10; y += 1.2) mesh(G.tor(0.62, 0.03, 6, 4), M.darkSteel, tw, 0, y, 0, Math.PI / 2, 0, Math.PI / 4);
    Z.tip = mesh(G.sph(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xb07a1c }), tw, 0, 10.2, 0);
    // expanding waves
    Z.waves = [0, 1, 2, 3].map((i) => mesh(G.tor(1, 0.03, 6, 72), new THREE.MeshBasicMaterial({ color: 0xd4aa55, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), Z.g, 0, 0.3, 0, Math.PI / 2, 0, 0));
    // comm terminal
    const tex = canvasTex(1024, 640, (g, w, h) => {
      g.fillStyle = 'rgba(10,7,4,.94)'; g.fillRect(0, 0, w, h); frameDeco(g, w, h); g.textAlign = 'left';
      g.fillStyle = ORANGE; g.font = `700 64px ${FONT}`; g.fillText('VISHNU VASAVAN', 52, 110);
      g.fillStyle = '#efe6d9'; g.font = `500 38px ${FONT}`;
      ['BANGALORE, INDIA', '+91 62827 49334', 'vishnuvasavan26@gmail.com', 'linkedin.com/in/v-vishnu-vish260623', 'github.com/Vishnu2663'].forEach((l, i) => { g.fillStyle = i % 2 ? AMBER : '#efe6d9'; g.fillText(l, 52, 200 + i * 78); });
    });
    Z.termMat = holoMat({ map: tex, opacity: 0.2, tint: 0.05 });
    Z.term = mesh(new THREE.PlaneGeometry(4.2, 2.6), Z.termMat, Z.g, 3.6, 3.4, -4.6, 0, -0.35, 0);
    consoleDesk(Z.g, 3.4, -3.2, -0.35);
    Z.update = (dt, t, e) => {
      const on = Z.power > 0.5;
      Z.dishYaw.rotation.y = Math.sin(t * 0.3) * 0.8 - 0.6; Z.dish.rotation.x = -0.35 + Math.sin(t * 0.4) * 0.15;
      Z.tip.material.color.setScalar(Math.sin(t * 5) > 0.3 ? 3 : 0.2).multiply(new THREE.Color(1, 0.4, 0));
      Z.waves.forEach((w, i) => { const p = ((t * 0.35 + i / 4) % 1); w.scale.setScalar(2.4 + p * 9); w.material.opacity = on ? (1 - p) * 0.7 : 0.08 * (1 - p); });
      Z.termMat.uniforms.opacity.value = on ? 1 : 0.2; Z.termMat.uniforms.reveal.value = on ? clamp((e - 0.8) / 1, 0, 1) : 1;
    };
    return Z;
  })();
  zoneObjs.push(about, skills, exper, projects, edu, contact);
  const allZones = [hub, ...zoneObjs];
  // zone-01 entry sign on hall side walls
  ZONES.forEach((zn, i) => {
    const tex = labelTex([`${zn.num} // ${zn.code}`], { w: 1024, h: 160, size: 70, color: ORANGE });
    for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }), world, s * 17.9, 9.3, zn.z, 0, -s * Math.PI / 2, 0);
  });


  /* =====================================================================
     STATE
     ===================================================================== */
  const S = { t: 0, power: 0, mode: 'boot', introT: 0, zone: -1, target: -1, station: null, panelOpen: false, collapsed: false, arrivedT: -99, lampsDone: false };
  function S_power() { return S.power; }

  /* =====================================================================
     SOUND (WebAudio synth — starts on first click)
     ===================================================================== */
  const sfx = (() => {
    let ctx = null, master = null, on = true, nb = null;
    function init() {
      if (ctx) return;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = on ? 0.45 : 0; master.connect(ctx.destination);
        nb = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o1.type = 'sawtooth'; o1.frequency.value = 48; o2.type = 'sine'; o2.frequency.value = 96.4; f.type = 'lowpass'; f.frequency.value = 160; g.gain.value = 0.06;
        o1.connect(f); o2.connect(f); f.connect(g); g.connect(master); o1.start(); o2.start();
      } catch (e) { ctx = null; }
    }
    function noise(dur, f0, f1, gain, q = 1.2) {
      if (!ctx) return; const s = ctx.createBufferSource(); s.buffer = nb; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
      const g = ctx.createGain(); const t = ctx.currentTime; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
    }
    function tone(type, f0, f1, dur, gain) {
      if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime; o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    return {
      init,
      step: () => { noise(0.07, 1400, 500, 0.09, 2); tone('sine', 90, 45, 0.09, 0.08); },
      hiss: () => { noise(1.3, 3200, 500, 0.14, 0.7); tone('sawtooth', 70, 40, 0.8, 0.05); },
      blip: (f = 880) => tone('square', f, f * 1.01, 0.06, 0.025),
      servo: () => tone('sawtooth', 180, 420, 0.28, 0.03),
      boom: () => { tone('sine', 120, 30, 1.2, 0.2); noise(0.8, 800, 100, 0.08); },
      toggle() { on = !on; if (!ctx) init(); if (master) master.gain.value = on ? 0.45 : 0; return on; },
      get on() { return on; },
      close() { try { ctx && ctx.close(); } catch (e) {} ctx = null; },
    };
  })();

  /* =====================================================================
     ROBOT ANIMATION
     ===================================================================== */
  const tmpV = new V3(), tmpV2 = new V3();
  function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
  const R = robot;
  R.moving = false; R.stepRate = 0; R.lastStep = 0; R.poseName = 'none'; R.poseW = 0;

  function poseFor(z, e) {
    if (S.mode !== 'present' || e < 0.2) return 'none';
    const c = e % 8;
    switch (z) {
      case 0: return e < 2.8 ? 'wave' : (c > 5 ? 'point' : 'none');
      case 1: return c > 1.5 && c < 5.5 ? 'palm' : 'none';
      case 2: return c < 5 ? 'operate' : 'none';
      case 3: return S.station != null ? (c < 4 ? 'point' : 'none') : (c > 4 ? 'point' : 'none');
      case 4: return c > 2 && c < 6 ? 'palm' : 'none';
      case 5: return e < 2.8 ? 'wave' : (c > 5 ? 'point' : 'none');
    }
    return 'none';
  }

  function animateRobot(dt, t) {
    R.walk = damp(R.walk, R.moving ? 1 : (R.turning ? 0.35 : 0), 7, dt);
    R.phase += dt * R.stepRate;
    const stepIdx = Math.floor(R.phase / Math.PI);
    if (stepIdx !== R.lastStep) { R.lastStep = stepIdx; if (R.walk > 0.3) sfx.step(); }
    const w = R.walk, ph = R.phase, amp = 0.5 + Math.min(0.2, R.stepRate * 0.008);
    const { legL, legR, armL, armR } = R;
    legL.thigh.rotation.x = -Math.sin(ph) * amp * w;
    legR.thigh.rotation.x = Math.sin(ph) * amp * w;
    legL.knee.rotation.x = Math.max(0, Math.cos(ph)) * 0.95 * w + 0.03;
    legR.knee.rotation.x = Math.max(0, -Math.cos(ph)) * 0.95 * w + 0.03;
    legL.ankle.rotation.x = -(legL.thigh.rotation.x + legL.knee.rotation.x) * 0.55;
    legR.ankle.rotation.x = -(legR.thigh.rotation.x + legR.knee.rotation.x) * 0.55;
    const breathe = Math.sin(t * 1.7);
    R.hips.position.y = 0.98 + w * (0.045 * (1 - Math.abs(Math.sin(ph))) - 0.035) + breathe * 0.003;
    R.hips.rotation.y = Math.sin(ph) * 0.12 * w;
    R.hips.rotation.z = Math.cos(ph) * 0.03 * w + Math.sin(t * 0.6) * 0.01 * (1 - w);
    R.spine.rotation.y = -Math.sin(ph) * 0.2 * w;
    R.spine.rotation.x = 0.1 * w + Math.sin(t * 0.8) * 0.01;
    R.chest.scale.set(1 + breathe * 0.008, 1 + breathe * 0.012, 1 + breathe * 0.012);
    // arms base
    armL.sh.rotation.set(Math.sin(ph) * 0.6 * w + Math.sin(t * 0.9) * 0.02, 0, 0.12 + breathe * 0.01);
    armR.sh.rotation.set(-Math.sin(ph) * 0.6 * w + Math.sin(t * 0.9 + 1) * 0.02, 0, -0.12 - breathe * 0.01);
    armL.el.rotation.set(-0.22 - 0.35 * w, 0, 0); armR.el.rotation.set(-0.22 - 0.35 * w, 0, 0);
    // gesture poses
    const desired = poseFor(S.zone, S.t - S.arrivedT);
    if (desired === R.poseName) R.poseW = damp(R.poseW, desired === 'none' ? 0 : 1, 4, dt);
    else { R.poseW = damp(R.poseW, 0, 6, dt); if (R.poseW < 0.03) R.poseName = desired; }
    const pw = ease(clamp(R.poseW, 0, 1)) * (1 - w);
    switch (R.poseName) {
      case 'wave': armR.sh.rotation.z += -2.55 * pw; armR.sh.rotation.x += -0.25 * pw; armR.el.rotation.z += (-0.35 + Math.sin(t * 9) * 0.45) * pw; armR.el.rotation.x += 0.2 * pw; break;
      case 'point': armR.sh.rotation.x += -1.3 * pw; armR.sh.rotation.z += -0.35 * pw; armR.el.rotation.x += 0.18 * pw; break;
      case 'operate': armR.sh.rotation.x += -0.7 * pw; armR.sh.rotation.z += -0.3 * pw; armR.el.rotation.x += (-0.75 + Math.sin(t * 14) * 0.07) * pw; armL.sh.rotation.x += -0.35 * pw; armL.el.rotation.x += -0.6 * pw; break;
      case 'palm': armL.sh.rotation.x += -0.75 * pw; armL.sh.rotation.z += 0.15 * pw; armL.el.rotation.x += -0.95 * pw; armL.el.rotation.y += 0.6 * pw; break;
    }
    armL.fingers.forEach((f, i) => { f.rotation.x = -0.35 - (R.poseName === 'palm' ? -0.3 * pw : 0) + Math.sin(t * 2 + i) * 0.03; });
    armR.fingers.forEach((f, i) => { f.rotation.x = -0.35 - (R.poseName === 'point' && i > 0 ? 0.9 * pw : 0) + Math.sin(t * 2.2 + i) * 0.03; });
    // head look
    R.root.updateMatrixWorld();
    R.lookCur.lerp(R.look, 1 - Math.exp(-3 * dt));
    const local = R.root.worldToLocal(tmpV.copy(R.lookCur));
    const yaw = clamp(Math.atan2(local.x, local.z), -0.95, 0.95);
    const pitch = clamp(-Math.atan2(local.y - 2.3, Math.hypot(local.x, local.z)), -0.35, 0.45);
    R.head.rotation.y = damp(R.head.rotation.y, yaw * 0.7, 5, dt);
    R.neck.rotation.y = damp(R.neck.rotation.y, yaw * 0.3, 5, dt);
    R.head.rotation.x = damp(R.head.rotation.x, pitch * 0.8 + Math.sin(t * 0.7) * 0.02, 5, dt);
    R.head.rotation.z = Math.sin(t * 0.5) * 0.025 * (1 - w);
    const sacc = Math.sin(t * 0.9) * 0.08 + (Math.sin(t * 3.1) > 0.97 ? 0.1 : 0);
    R.eyes.forEach((e) => { e.rotation.y = clamp(yaw * 0.35 + sacc, -0.4, 0.4); e.rotation.x = pitch * 0.3; });
    // blink
    R.blinkT -= dt; if (R.blinkT < 0) { R.blink = 1; R.blinkT = rand(2.2, 5); }
    R.blink = Math.max(0, R.blink - dt * 6.5);
    const b = Math.sin(R.blink * Math.PI);
    R.lids.forEach((l) => { l.rotation.x = lerp(-0.3, 1.45, b); });
    // core + glow
    const cp = 2.2 + Math.sin(t * 3) * 0.7;
    R.coreMat.color.setRGB(cp * 1.0, cp * 0.74, cp * 0.3).multiplyScalar(Math.max(0.05, S.power));
    R.coreRing.rotation.z += dt * 2.2; R.coreHalo.material.opacity = (0.55 + Math.sin(t * 3) * 0.2) * S.power;
    M.iris.emissiveIntensity = R.eyeGlow * (0.55 + Math.sin(t * 2) * 0.1);
    R.hud.material.opacity = R.eyeGlow * (0.55 + (Math.random() > 0.96 ? -0.4 : 0)); R.hud.rotation.z = 0.6 + Math.sin(t * 0.8) * 0.3;
  }

  /* =====================================================================
     TRAVEL
     ===================================================================== */
  let travel = null;
  function travelTo(dest, finalHeading, onArrive) {
    const p0 = R.root.position.clone(); p0.y = 0;
    const pts = [p0];
    const crosses = GATE_Z.some((g) => (g - p0.z) * (g - dest.z) < 0);
    if (crosses) {
      if (Math.abs(p0.x) > 0.1) pts.push(new V3(0, 0, p0.z - Math.sign(dest.z - p0.z) * 0.01));
      if (Math.abs(dest.x) > 0.1) pts.push(new V3(0, 0, dest.z));
    }
    pts.push(dest.clone());
    const segs = []; let L = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = pts[i].distanceTo(pts[i + 1]); if (l > 0.001) { segs.push({ a: pts[i], b: pts[i + 1], l, s0: L }); L += l; } }
    travel = { segs, L, s: 0, finalHeading, onArrive, phase: segs.length ? 'turn' : 'final', v: clamp(L / 3.3, 3.2, 10.5), dir: Math.sign(dest.z - p0.z) || 1 };
    S.mode = 'travel';
  }
  function segAt(s) { for (const sg of travel.segs) if (s <= sg.s0 + sg.l) return sg; return travel.segs[travel.segs.length - 1]; }
  function updateTravel(dt) {
    if (!travel) return;
    const tr = travel;
    if (tr.phase === 'turn') {
      const sg = tr.segs[0]; const want = Math.atan2(sg.b.x - sg.a.x, sg.b.z - sg.a.z);
      const d = angDiff(R.heading, want); R.heading += d * (1 - Math.exp(-7 * dt)); R.turning = true; R.stepRate = 7;
      if (Math.abs(d) < 0.2) { tr.phase = 'walk'; R.turning = false; }
    } else if (tr.phase === 'walk') {
      const sf = Math.min(1, 0.22 + tr.s / 2.2) * Math.min(1, 0.18 + (tr.L - tr.s) / 2.4);
      const v = tr.v * sf; tr.s = Math.min(tr.L, tr.s + v * dt);
      const sg = segAt(tr.s); const k = (tr.s - sg.s0) / sg.l;
      R.root.position.lerpVectors(sg.a, sg.b, clamp(k, 0, 1));
      const want = Math.atan2(sg.b.x - sg.a.x, sg.b.z - sg.a.z);
      R.heading += angDiff(R.heading, want) * (1 - Math.exp(-8 * dt));
      R.moving = true; R.stepRate = v * 2.3;
      if (tr.s >= tr.L - 0.001) { tr.phase = 'final'; R.moving = false; }
      const prog = tr.s / tr.L; $('#transitBar').style.transform = `scaleX(${prog})`;
    } else {
      R.moving = false; R.turning = true; R.stepRate = 5;
      const d = angDiff(R.heading, tr.finalHeading); R.heading += d * (1 - Math.exp(-6 * dt));
      if (Math.abs(d) < 0.04) { R.turning = false; R.stepRate = 0; travel = null; tr.onArrive && tr.onArrive(); }
    }
    R.root.rotation.y = R.heading;
  }

  /* =====================================================================
     CAMERA RIG (spherical orbit around a pivot, damped)
     ===================================================================== */
  const rig = { pivot: new V3(0, 2, HUB_Z), theta: 1.0, R: 19, h: 8, lookY: 0, shiftX: 0, shiftY: 0, kp: 3, k: 1.8,
    tgt: { pivot: new V3(0, 2, HUB_Z), theta: 1.0, R: 19, h: 8, lookY: 0, shiftX: 0, shiftY: 0 } };
  let vo = { x: 999, y: 999 };
  function setCam(o) { Object.assign(rig.tgt, o); if (o.pivot) rig.tgt.pivot = o.pivot.clone(); }
  function panelShift() {
    if (S.collapsed || !S.panelOpen) return { shiftX: 0, shiftY: isMobile ? 0.08 : 0 };
    return isMobile ? { shiftX: 0, shiftY: 0.24 } : { shiftX: 0.2, shiftY: 0 };
  }
  function camTargets(t) {
    const rp = R.root.position;
    if (S.mode === 'boot') return; // scripted in intro
    if (S.mode === 'hero') {
      setCam({ pivot: tmpV2.set(rp.x, 1.45, rp.z), theta: -0.06 + Math.sin(t * 0.2) * 0.05, R: isMobile ? 10 : 7.4, h: 0.85, lookY: 0.05, shiftX: isMobile ? 0 : 0.2, shiftY: isMobile ? 0.17 : 0 });
      rig.kp = 3; rig.k = 1.6;
    } else if (S.mode === 'travel') {
      const back = travel && travel.dir > 0;
      setCam({ pivot: tmpV2.set(rp.x, 1.5, rp.z), theta: back ? Math.PI - 0.36 : 0.36, R: (isMobile ? 9.2 : 7.6) + Math.sin(t * 0.55) * 1.8, h: 2.3 + Math.sin(t * 0.37 + 1) * 1.1, lookY: 0.35, shiftX: 0, shiftY: 0 });
      rig.kp = 5; rig.k = 1.5;
    } else if (S.mode === 'present') {
      if (S.station != null) {
        const sx = STATION_X[S.station];
        setCam({ pivot: tmpV2.set(sx + 1.0, 2.5, ZONES[3].z - 7.2), theta: 0.16, R: isMobile ? 11 : 8.4, h: 0.5, lookY: 0, ...panelShift() });
      } else {
        setCam({ pivot: tmpV2.set(rp.x, 1.45, rp.z), theta: 0.12 + Math.sin(t * 0.18) * 0.04, R: isMobile ? 10.2 : 7.4, h: isMobile ? 1.9 : 1.25, lookY: 0.08, ...panelShift() });
      }
      rig.kp = 3; rig.k = 1.7;
    }
  }
  function updateCamera(dt, t) {
    const T = rig.tgt;
    rig.pivot.x = damp(rig.pivot.x, T.pivot.x, rig.kp, dt); rig.pivot.y = damp(rig.pivot.y, T.pivot.y, rig.kp, dt); rig.pivot.z = damp(rig.pivot.z, T.pivot.z, rig.kp, dt);
    for (const k of ['theta', 'R', 'h', 'lookY']) rig[k] = damp(rig[k], T[k], rig.k, dt);
    rig.shiftX = damp(rig.shiftX, T.shiftX, 2.4, dt); rig.shiftY = damp(rig.shiftY, T.shiftY, 2.4, dt);
    const x = rig.pivot.x + Math.sin(rig.theta) * rig.R, z = rig.pivot.z + Math.cos(rig.theta) * rig.R, y = rig.pivot.y + rig.h;
    camera.position.set(clamp(x, -16.5, 16.5), clamp(y, 0.4, 13.5), clamp(z, HALL_BACK + 1, HALL_FRONT - 0.4));
    camera.position.x += Math.sin(t * 0.7) * 0.03; camera.position.y += Math.sin(t * 0.9) * 0.02;
    camera.lookAt(rig.pivot.x, rig.pivot.y + rig.lookY, rig.pivot.z);
    const W = innerWidth, H = innerHeight;
    const ox = -rig.shiftX * W, oy = rig.shiftY * H;
    if (Math.abs(ox - vo.x) > 0.3 || Math.abs(oy - vo.y) > 0.3) { vo = { x: ox, y: oy }; camera.setViewOffset(W, H, ox, oy, W, H); }
  }

  /* =====================================================================
     UI HELPERS
     ===================================================================== */
  const ui = {
    boot: $('#boot'), bootLine: $('#bootLine'), bootSub: $('#bootSub'), hero: $('#hero'), hud: $('#hud'), nav: $('#nav'), panel: $('#panel'),
    pCode: $('#panelCode'), pTitle: $('#panelTitle'), pBody: $('#panelBody'), mod: $('#modTitle'), transit: $('#transit'), zoneLbl: $('#zoneLabel'), toast: $('#toast'),
  };
  let typeTok = 0;
  function typeText(el, text, speed = 28) {
    const tok = ++typeTok; el.textContent = ''; const glyphs = '█▓▒░<>/\\_#';
    let i = 0;
    return new Promise((res) => {
      const step = () => {
        if (tok !== typeTok) return res();
        i++; el.textContent = text.slice(0, i) + (i < text.length ? glyphs[(Math.random() * glyphs.length) | 0] : '');
        if (i % 2 === 0) sfx.blip(1200 + Math.random() * 400);
        if (i < text.length) setTimeout(step, reduceMotion ? 0 : speed); else res();
      };
      step();
    });
  }
  function scrambleIn(el, text, dur = 700) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#<>'; const start = performance.now();
    const f = () => {
      const p = clamp((performance.now() - start) / dur, 0, 1); const n = Math.floor(p * text.length);
      el.textContent = text.slice(0, n) + text.slice(n).replace(/[^ ]/g, () => chars[(Math.random() * chars.length) | 0]);
      if (p < 1) requestAnimationFrame(f); else el.textContent = text;
    }; f();
  }
  let bootMsgTimer = null;
  function bootMessage(text, big = true) {
    ui.bootLine.classList.remove('show'); void ui.bootLine.offsetWidth;
    ui.bootLine.classList.toggle('big', big); ui.bootLine.classList.add('show');
    typeText(ui.bootLine, text, 32);
  }
  function hideBootMessage() { ui.bootLine.classList.remove('show'); }
  function toast(msg) { ui.toast.textContent = msg; ui.toast.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => ui.toast.classList.remove('show'), 2600); }

  /* ---------- section content ---------- */
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let rvIdx = 0;
  const rv = (html, cls = '') => `<div class="rv ${cls}" style="--d:${(rvIdx++) * 70}ms">${html}</div>`;
  function renderZone(i) {
    rvIdx = 0; const D = DATA;
    if (i === 0) {
      return rv(`<div class="id-card"><div class="id-photo"><img src="${FACE_URI}" alt="Portrait of Vishnu Vasavan from the 3D character reference"><span class="scanbar"></span></div>
        <div><p class="id-name">VISHNU VASAVAN</p><p class="id-role">Software Engineer</p><p class="muted">${esc(D.location)} &nbsp;|&nbsp; Mobi80 Solutions</p></div></div>`) +
        rv(`<p class="lead">${esc(D.summary)}</p>`) +
        rv(`<h4>Core focus</h4><div class="tags">${D.focus.map((f) => `<span class="tag">${f}</span>`).join('')}</div>`) +
        rv(`<h4>Production platforms</h4><div class="tags">${D.projects.map((p, k) => `<button class="tag link" data-goproj="${k}">${p.name}</button>`).join('')}</div>`) +
        rv(`<h4>Languages spoken</h4><div class="tags">${D.languages.map((l) => `<span class="tag ghost">${l}</span>`).join('')}</div>`) +
        rv(`<div class="row-actions"><button class="btn" data-go="1">Scan skill modules</button><button class="btn ghost" data-resume>Download resume</button></div>`);
    }
    if (i === 1) {
      return D.skills.map((g) => rv(`<div class="skill-group"><div class="sg-head"><span class="sg-icon">${g.icon}</span><h4>${esc(g.group)}</h4></div>
        <div class="chips">${g.items.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div></div>`)).join('') +
        rv(`<p class="muted small">Every module above is installed on unit VISHH and running in production workloads.</p>`);
    }
    if (i === 2) {
      const E = D.experience;
      return rv(`<div class="job"><p class="job-co">${esc(E.company.toUpperCase())}</p><p class="job-title">${esc(E.title)}</p>
        <div class="job-meta"><span>${esc(E.dates)}</span><span>${esc(E.location)}</span></div></div>`) +
        `<ol class="timeline">${E.points.map((p, k) => `<li class="rv" style="--d:${(rvIdx++) * 160 + 300}ms"><span class="node">${String(k + 1).padStart(2, '0')}</span><p>${esc(p)}</p></li>`).join('')}</ol>` +
        rv(`<div class="row-actions"><button class="btn" data-go="3">Open the project workshop</button></div>`);
    }
    if (i === 3) {
      return rv(`<p class="muted">Three production platforms, each built on a live station. Select one to walk the robot over.</p>`) +
        `<div class="proj-grid">${D.projects.map((p, k) => rv(`<button class="proj" data-proj="${k}"><span class="proj-n">STATION ${k + 1}</span><span class="proj-name">${esc(p.name)}</span><span class="proj-sub">${esc(p.sub)}</span><span class="proj-tech">${p.tech.map(esc).join(' / ')}</span></button>`)).join('')}</div>` +
        rv(`<h4>Academic R&amp;D stations</h4>`) +
        D.academic.map((a) => rv(`<div class="acad"><p class="acad-name">${esc(a.name)}</p><p class="acad-sub">${esc(a.sub)}</p><p>${esc(a.text)}</p></div>`)).join('');
    }
    if (i === 4) {
      return D.education.map((e) => rv(`<div class="edu"><span class="edu-year">${e.year}</span><div><p class="edu-school">${esc(e.school)}</p><p class="edu-deg">${esc(e.degree)}</p><p class="muted">${esc(e.city)} &nbsp;|&nbsp; <strong class="score">${esc(e.score)}</strong></p></div></div>`)).join('') +
        rv(`<h4>Certification chips</h4><div class="certs">${D.certifications.map((c) => `<div class="cert"><span class="hex"></span>${esc(c)}</div>`).join('')}</div>`);
    }
    if (i === 5) {
      const li = 'https://' + D.linkedin, gh = 'https://' + D.github;
      const row = (label, value, href, act, copy) => rv(`<div class="contact-row"><div><p class="c-label">${label}</p><p class="c-val">${esc(value)}</p></div>
        <div class="c-actions">${href ? `<a class="btn" href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${act}</a>` : ''}${copy ? `<button class="btn ghost sm" data-copy="${esc(value)}">Copy</button>` : ''}</div></div>`);
      return rv(`<p class="c-name">VISHNU VASAVAN</p><p class="muted">${esc(D.location)} &nbsp;|&nbsp; Software Engineer</p>`) +
        row('Email', D.email, 'mailto:' + D.email, 'Email', true) +
        row('Phone', D.phone, D.phoneHref, 'Call', true) +
        row('LinkedIn', D.linkedin, li, 'LinkedIn', false) +
        row('GitHub', D.github, gh, 'GitHub', false) +
        rv(`<div class="row-actions"><button class="btn ghost" data-resume>Download resume</button><button class="btn ghost" data-v01>Ask V-26</button></div>`);
    }
    return '';
  }
  function renderStation(k) {
    rvIdx = 0; const P = DATA.projects[k];
    return rv(`<button class="back" data-back>← Return to workshop</button>`) +
      rv(`<p class="proj-n">STATION ${k + 1} // PROFESSIONAL PROJECT</p><p class="st-name">${esc(P.name.toUpperCase())}</p><p class="st-sub">${esc(P.sub)}</p>`) +
      rv(`<h4>Technology</h4><div class="chips">${P.tech.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>`) +
      `<ul class="bullets">${P.points.map((p) => `<li class="rv" style="--d:${(rvIdx++) * 140 + 200}ms">${esc(p)}</li>`).join('')}</ul>` +
      rv(`<div class="row-actions">${k > 0 ? `<button class="btn ghost" data-proj="${k - 1}">← ${esc(DATA.projects[k - 1].name)}</button>` : ''}${k < 2 ? `<button class="btn" data-proj="${k + 1}">${esc(DATA.projects[k + 1].name)} →</button>` : ''}</div>`);
  }
  function openPanel(code, title, html) {
    ui.panel.classList.remove('live'); ui.pBody.innerHTML = html; ui.pBody.scrollTop = 0;
    ui.panel.classList.add('open'); S.panelOpen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => ui.panel.classList.add('live')));
    typeText(ui.pCode, code, 22); scrambleIn(ui.pTitle, title, 650);
  }
  function closePanel() { ui.panel.classList.remove('open', 'live'); S.panelOpen = false; }
  function showModule(z) {
    $('#modSub').textContent = `[ SYSTEM MODULE ${z.num} ]`; $('#modName').textContent = z.title; $('#modName').dataset.text = z.title;
    ui.mod.classList.remove('show'); void ui.mod.offsetWidth; ui.mod.classList.add('show');
    sfx.boom();
  }
  function setNavActive(i, pending = false) {
    document.querySelectorAll('#nav .nv').forEach((b, k) => { b.classList.toggle('active', k === i); b.classList.toggle('pending', pending && k === i); b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  }

  /* ---------- zone navigation ---------- */
  function goZone(i) {
    if (!['present', 'travel', 'hero'].includes(S.mode) || i < 0 || i >= ZONES.length) return;
    if (S.mode === 'hero') { ui.hero.classList.remove('show'); showChrome(); }
    sfx.blip(660);
    const z = ZONES[i];
    closePanel(); S.station = null; S.target = i; setNavActive(i, true);
    const here = S.zone === i && R.root.position.distanceTo(tmpV.set(0, 0, z.z)) < 0.3 && S.mode === 'present';
    if (here) { arrive(i); return; }
    S.zone = -1;
    $('#transitText').textContent = `IN TRANSIT  →  ZONE ${z.num} // ${z.nav}`;
    ui.transit.classList.add('show'); $('#transitBar').style.transform = 'scaleX(0)';
    sfx.servo();
    travelTo(new V3(0, 0, z.z), -0.32, () => arrive(i));
  }
  function arrive(i) {
    const z = ZONES[i]; S.zone = i; S.mode = 'present'; S.arrivedT = S.t;
    zoneObjs[i].enterT = S.t; zoneObjs[i].onEnter && zoneObjs[i].onEnter();
    ui.transit.classList.remove('show'); setNavActive(i);
    ui.zoneLbl.textContent = `ZONE ${z.num} // ${z.nav}`;
    showModule(z);
    emitSparks(tmpV.set(0, 0.4, z.z + 2.3), 26, 3);
    const tok = ++arrive.tok;
    setTimeout(() => { if (tok === arrive.tok && S.zone === i && S.station == null) openPanel(`${z.num} // ${z.code}`, z.title, renderZone(i)); }, reduceMotion ? 100 : 1150);
  }
  arrive.tok = 0;
  function openStation(k) {
    if (S.zone !== 3 && S.target !== 3) { goZone(3); setTimeout(() => openStation(k), 100); return; }
    if (S.mode !== 'present') { const iv = setInterval(() => { if (__stopped) { clearInterval(iv); return; } if (S.mode === 'present' && S.zone === 3) { clearInterval(iv); openStation(k); } }, 200); return; }
    S.station = k; arrive.tok++; sfx.servo(); closePanel();
    const sx = STATION_X[k];
    travelTo(new V3(sx + 2.1, 0, ZONES[3].z - 5.3), -0.75, () => {
      S.mode = 'present'; S.arrivedT = S.t - 3;
      openPanel(`04 // STATION ${k + 1}`, DATA.projects[k].name.toUpperCase(), renderStation(k));
    });
  }
  function backToWorkshop() {
    S.station = null; closePanel(); arrive.tok++;
    travelTo(new V3(0, 0, ZONES[3].z), -0.32, () => { S.mode = 'present'; S.zone = 3; S.arrivedT = S.t - 3; openPanel(`04 // ${ZONES[3].code}`, ZONES[3].title, renderZone(3)); });
  }
  function returnToFactory() {
    if (!['present', 'travel'].includes(S.mode)) return;
    closePanel(); S.station = null; S.zone = -1; arrive.tok++; setNavActive(-1);
    $('#transitText').textContent = 'RETURNING TO ASSEMBLY BAY'; ui.transit.classList.add('show');
    travelTo(new V3(0, 0, HUB_Z), 0, () => { S.mode = 'hero'; ui.transit.classList.remove('show'); ui.zoneLbl.textContent = 'ASSEMBLY BAY'; ui.hero.classList.add('show', 'again'); });
  }

  /* ---------- chrome ---------- */
  function buildNav() {
    ui.nav.innerHTML = ZONES.map((z, i) => `<button class="nv" data-go="${i}" aria-label="Go to ${z.title}"><span class="nv-n">${z.num}</span><span class="nv-l">${z.nav}</span><span class="led"></span></button>`).join('');
  }
  buildNav();
  function showChrome() { document.body.classList.add('touring'); }

  __on(document, 'click', (e) => {
    const t = e.target.closest('button, a'); if (!t) return;
    if (t.dataset.go != null) { goZone(+t.dataset.go); }
    else if (t.dataset.proj != null) { openStation(+t.dataset.proj); }
    else if (t.dataset.goproj != null) { openStation(+t.dataset.goproj); }
    else if (t.hasAttribute('data-back')) backToWorkshop();
    else if (t.hasAttribute('data-resume')) downloadResume();
    else if (t.hasAttribute('data-v01')) openV01();
    else if (t.dataset.copy) { navigator.clipboard?.writeText(t.dataset.copy).then(() => toast('Copied: ' + t.dataset.copy), () => toast(t.dataset.copy)); }
  });
  __on($('#panelToggle'), 'click', () => { S.collapsed = !S.collapsed; ui.panel.classList.toggle('collapsed', S.collapsed); $('#panelToggle').textContent = S.collapsed ? 'Show panel' : 'Hide panel'; $('#panelToggle').setAttribute('aria-expanded', String(!S.collapsed)); });
  __on($('#homeBtn'), 'click', returnToFactory);
  // compact ◀ ▶ zone controls (mobile)
  const stepZone = (d) => { const cur = S.zone >= 0 ? S.zone : S.target; goZone(clamp((cur < 0 ? -1 : cur) + d, 0, 5)); };
  __on($('#zonePrev'), 'click', () => stepZone(-1));
  __on($('#zoneNext'), 'click', () => stepZone(1));
  __on($('#soundBtn'), 'click', () => { const on = sfx.toggle(); $('#soundBtn').textContent = on ? 'Sound: on' : 'Sound: off'; $('#soundBtn').setAttribute('aria-pressed', String(on)); });
  __on($('#resumeBtn'), 'click', downloadResume);
  __on(window, 'keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (S.mode === 'boot' && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { skipIntro(); return; }
    const cur = S.zone >= 0 ? S.zone : S.target;
    if (e.key === 'ArrowRight') goZone(Math.min(5, cur + 1));
    if (e.key === 'ArrowLeft') goZone(Math.max(0, cur - 1));
    if (/^[1-6]$/.test(e.key)) goZone(+e.key - 1);
  });
  // touch swipe controls on the 3D view
  let sw = null;
  __on(canvas, 'pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  __on(canvas, 'pointerup', (e) => {
    if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; const quick = performance.now() - sw.t < 600; sw = null;
    if (quick && Math.abs(dx) > 60 && Math.abs(dy) < 60) { const cur = S.zone >= 0 ? S.zone : S.target; goZone(clamp(cur + (dx < 0 ? 1 : -1), 0, 5)); }
  });

  /* ---------- runtime capabilities (downloads + Claude sample for V-26) ---------- */
  const cap = (name) => (window.claude && typeof window.claude.use === 'function') ? window.claude.use(name).catch(() => null) : Promise.resolve(null);
  const dlP = CFG.resumeB64 ? cap('downloads') : Promise.resolve(null), sampleP = CFG.ask ? Promise.resolve(null) : cap('sample');
  function b64bytes(b) { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  async function downloadResume() {
    sfx.blip(990);
    if (!RESUME_B64) { const a = document.createElement('a'); a.href = CFG.resumeUrl; a.download = CFG.resumeName || 'Vishnu_Vasavan_Resume.pdf'; document.body.appendChild(a); a.click(); a.remove(); toast('Downloading resume'); return; }
    const bytes = b64bytes(RESUME_B64);
    const dl = await Promise.race([dlP, sleep(2500).then(() => null)]);
    if (dl) {
      try { await dl.save({ filename: 'Vishnu_Vasavan_Resume.pdf', data: bytes }); toast('Resume saved'); return; }
      catch (err) { if (err && err.code === 'declined') { toast('Download cancelled'); return; } if (err && err.code === 'rate_limited') { toast('A save prompt is already open'); return; } }
    }
    try { const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); const a = document.createElement('a'); a.href = url; a.download = 'Vishnu_Vasavan_Resume.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
    catch (e) { toast('Download is unavailable in this view'); }
  }

  /* =====================================================================
     V-26 ROBOT ASSISTANT
     ===================================================================== */
  const RESUME_TEXT = (() => {
    const D = DATA;
    return `NAME: ${D.name}\nROLE: ${D.role}\nLOCATION: ${D.location}\nPHONE: ${D.phone}\nEMAIL: ${D.email}\nLINKEDIN: ${D.linkedin}\nGITHUB: ${D.github}\nSUMMARY: ${D.summary}\n` +
      `SKILLS:\n${D.skills.map((g) => `- ${g.group}: ${g.items.join(', ')}`).join('\n')}\n` +
      `EXPERIENCE: ${D.experience.company} — ${D.experience.title}, ${D.experience.location}, ${D.experience.dates}\n${D.experience.points.map((p) => '- ' + p).join('\n')}\n` +
      `PROFESSIONAL PROJECTS:\n${D.projects.map((p) => `- ${p.name} (${p.sub}); tech: ${p.tech.join(', ')}\n${p.points.map((x) => '  * ' + x).join('\n')}`).join('\n')}\n` +
      `ACADEMIC PROJECTS:\n${D.academic.map((a) => `- ${a.name} (${a.sub}): ${a.text}`).join('\n')}\n` +
      `EDUCATION:\n${D.education.map((e) => `- ${e.school}, ${e.city} — ${e.degree}, ${e.year}, ${e.score}`).join('\n')}\n` +
      `CERTIFICATIONS: ${D.certifications.join('; ')}\nLANGUAGES SPOKEN: ${D.languages.join(', ')}`;
  })();
  function localAnswer(q) {
    const s = q.toLowerCase(); const has = (...k) => k.some((x) => s.includes(x)); const D = DATA;
    if (has('prezence', 'presence', 'attendance')) { const p = D.projects[0]; return { text: `${p.name} is an ${p.sub.toLowerCase()} built with ${p.tech.join(', ')}. ${p.points.join(' ')}`, zone: 3, proj: 0 }; }
    if (has('glyd', 'travel', 'expense')) { const p = D.projects[1]; return { text: `${p.name} is an ${p.sub.toLowerCase()} platform built with ${p.tech.join(', ')}. ${p.points.join(' ')}`, zone: 3, proj: 1 }; }
    if (has('salary', 'payroll', '365')) { const p = D.projects[2]; return { text: `${p.name} is a ${p.sub.toLowerCase()} built with ${p.tech.join(', ')}. ${p.points.join(' ')}`, zone: 3, proj: 2 }; }
    if (has('contact', 'email', 'mail', 'phone', 'call', 'reach', 'linkedin', 'github', 'hire', 'number')) return { text: `You can reach Vishnu at ${D.email} or ${D.phone}. LinkedIn: ${D.linkedin}. GitHub: ${D.github}. He's based in ${D.location}.`, zone: 5 };
    if (has('speak', 'spoken', 'kannada', 'tamil', 'hindi', 'malayalam')) return { text: `Vishnu speaks ${D.languages.join(', ')}.`, zone: 0 };
    if (has('cert')) return { text: `Certifications: ${D.certifications.join(', ')}.`, zone: 4 };
    if (has('educat', 'college', 'degree', 'cgpa', 'school', 'puc', 'sslc', 'study', 'studied', 'graduat')) return { text: D.education.map((e) => `${e.degree} — ${e.school}, ${e.city} (${e.year}, ${e.score})`).join('. ') + '.', zone: 4 };
    if (has('academic', 'sentiment', 'spring', 'machine learning')) return { text: D.academic.map((a) => `${a.name} (${a.sub}): ${a.text}`).join(' '), zone: 3 };
    if (has('project', 'built', 'platform', 'portfolio')) return { text: `Vishnu works on three production platforms: Prezence (attendance management), Glyd (employee travel & expense management) and Salary365 (payroll management). Academic work includes sentiment analysis, a Dockerized Spring Boot app, and a Java deployment on AWS EC2.`, zone: 3 };
    if (has('experience', 'work', 'job', 'mobi80', 'company', 'role', 'current', 'employ')) return { text: `Vishnu is a ${D.experience.title} at ${D.experience.company}, ${D.experience.location}, since Dec 2025. He builds REST and GraphQL APIs with Node.js/Express, optimizes PostgreSQL, and integrates AWS with Odoo ERP.`, zone: 2 };
    if (has('aws', 'cloud', 'lambda', 'appsync', 's3', 'ec2')) return { text: `On AWS, Vishnu works with Lambda, S3, EC2, DynamoDB and AppSync — for example integrating them with Odoo ERP for invoicing and workflow automation at Mobi80 Solutions.`, zone: 1 };
    if (has('odoo', 'erp')) return { text: `Vishnu integrates Odoo ERP via JSON-RPC and APIs — including invoice generation and bidirectional data sync in Salary365.`, zone: 3, proj: 2 };
    if (has('sql', 'postgres', 'database', 'db', 'mysql', 'dynamo')) return { text: `Databases: PostgreSQL, MySQL, DynamoDB, plus functions and stored procedures. He tunes SQL, designs indexing strategies, and adds API-level caching for performance.`, zone: 1 };
    if (has('skill', 'stack', 'tech', 'language', 'know', 'tools', 'node', 'java', 'docker')) return { text: D.skills.map((g) => `${g.group}: ${g.items.join(', ')}`).join('. ') + '.', zone: 1 };
    if (has('who', 'about', 'summary', 'yourself', 'vishnu', 'hello', 'hi')) return { text: D.summary, zone: 0 };
    return { text: `I only have data about Vishnu's resume. Try asking about his experience, skills, projects, education, or how to contact him.`, zone: null };
  }
  const v01 = { el: $('#v01'), log: $('#v01Log'), input: $('#v01Input'), hist: [], busy: false };
  function openV01() { v01.el.classList.add('open'); $('#v01Btn').setAttribute('aria-expanded', 'true'); setTimeout(() => v01.input.focus(), 200); sfx.blip(520); }
  function closeV01() { v01.el.classList.remove('open'); $('#v01Btn').setAttribute('aria-expanded', 'false'); }
  __on($('#v01Btn'), 'click', () => (v01.el.classList.contains('open') ? closeV01() : openV01()));
  __on($('#v01Close'), 'click', closeV01);
  function addMsg(who, text) {
    const d = document.createElement('div'); d.className = 'msg ' + who; const p = document.createElement('p'); p.textContent = text; d.appendChild(p);
    v01.log.appendChild(d); v01.log.scrollTop = v01.log.scrollHeight; return { d, p };
  }
  function addAction(m, a) {
    if (a.zone == null) return;
    const b = document.createElement('button'); b.className = 'msg-act';
    b.textContent = a.proj != null ? `Walk to ${DATA.projects[a.proj].name} station` : `Walk to zone ${ZONES[a.zone].num} // ${ZONES[a.zone].nav}`;
    __on(b, 'click', () => { if (S.mode === 'boot') return; if (S.mode === 'hero') { ui.hero.classList.remove('show'); showChrome(); S.mode = 'present'; } if (a.proj != null) openStation(a.proj); else goZone(a.zone); if (isMobile) closeV01(); });
    m.d.appendChild(b);
  }
  async function ask(q) {
    if (v01.busy || !q.trim()) return; v01.busy = true;
    addMsg('user', q); const m = addMsg('bot', 'Processing…'); m.d.classList.add('thinking');
    const local = localAnswer(q);
    let sample = CFG.ask ? null : await Promise.race([sampleP, sleep(400).then(() => null)]);
    let answered = false;
    if (CFG.ask) {
      try {
        const txt = await CFG.ask({ question: q, history: v01.hist.slice(-8), zone: S.zone >= 0 ? ZONES[S.zone].title : 'ASSEMBLY BAY', onText: (text) => { m.d.classList.remove('thinking'); m.p.textContent = text; v01.log.scrollTop = v01.log.scrollHeight; } });
        if (txt && txt.trim()) { m.p.textContent = txt.trim(); answered = true; }
      } catch (err) { answered = false; }
    } else if (sample) {
      try {
        const convo = v01.hist.slice(-6).map((h) => `${h.r === 'u' ? 'Visitor' : 'V-26'}: ${h.t}`).join('\n');
        const prompt = `You are V-26, the robot assistant inside the 3D "Robot Factory" portfolio of Vishnu Vasavan, a software engineer. Answer the visitor using ONLY the resume below. If the answer is not in the resume, say you don't have that information. Speak about Vishnu in the third person, be friendly and precise, plain text only, no markdown, at most 80 words.\n\nRESUME:\n${RESUME_TEXT}\n\n${convo ? 'CONVERSATION SO FAR:\n' + convo + '\n\n' : ''}Visitor: ${q}\nV-26:`;
        const res = await sample(prompt, { modelTier: 'quick', cache: false, onText: ({ text }) => { m.d.classList.remove('thinking'); m.p.textContent = text; v01.log.scrollTop = v01.log.scrollHeight; } });
        m.p.textContent = res.text.trim(); answered = true;
      } catch (err) { answered = false; }
    }
    m.d.classList.remove('thinking');
    if (!answered) await typeInto(m.p, local.text);
    addAction(m, local);
    v01.hist.push({ r: 'u', t: q }, { r: 'b', t: m.p.textContent });
    v01.busy = false; v01.log.scrollTop = v01.log.scrollHeight;
  }
  function typeInto(el, text) { return new Promise((res) => { let i = 0; const f = () => { i = Math.min(text.length, i + 3); el.textContent = text.slice(0, i); v01.log.scrollTop = v01.log.scrollHeight; if (i < text.length) setTimeout(f, 12); else res(); }; f(); }); }
  __on($('#v01Form'), 'submit', (e) => { e.preventDefault(); const q = v01.input.value; v01.input.value = ''; ask(q); });
  document.querySelectorAll('#v01 .quick button').forEach((b) => __on(b, 'click', () => ask(b.textContent)));

  /* =====================================================================
     INTRO SEQUENCE
     ===================================================================== */
  const introEvents = [
    [0.15, () => ui.boot.classList.add('dot')],
    [0.95, () => { ui.boot.classList.add('fade'); sub('MAIN POWER'); }],
    [1.6, () => sub('CONVEYOR LINES')],
    [2.1, () => sub('ROBOTIC ARMS')],
    [2.5, () => sub('DISPLAYS')],
    [2.9, () => sub('SCANNERS')],
    [3.4, () => sub('ASSEMBLY PLATFORM')],
    [6.1, () => bootMessage('INITIALIZING...')],
    [7.4, () => bootMessage('ROBOT UNIT: VISHH')],
    [8.4, () => bootMessage('SYSTEM STATUS: ONLINE')],
    [9.3, () => bootMessage('SOFTWARE ENGINEER')],
    [10.2, () => bootMessage('WELCOME TO MY DIGITAL WORKSHOP')],
    [11.8, () => finishIntro()],
  ];
  let introIdx = 0;
  function sub(txt) { const li = document.createElement('li'); li.innerHTML = `<span>${txt}</span><b>ONLINE</b>`; ui.bootSub.appendChild(li); }
  function runIntro(dt) {
    S.introT += dt; const it = S.introT;
    while (introIdx < introEvents.length && it >= introEvents[introIdx][0]) introEvents[introIdx++][1]();
    S.power = sstep(1.0, 3.0, it);
    hub.arms.forEach((a) => (a.active = 0.2 + sstep(1.8, 2.6, it) * 0.8));
    hub.conv.forEach((c) => (c.target = 0.6 * sstep(1.5, 2.2, it)));
    // scanner sweep
    const sp = clamp((it - 2.7) / 1.3, 0, 1);
    hub.sweep.position.x = lerp(-14, 14, ease(sp)); hub.sweep.material.opacity = Math.sin(sp * Math.PI) * 0.16;
    hub.sweepLine.visible = sp > 0 && sp < 1; hub.sweepLine.position.x = hub.sweep.position.x;
    // assembly
    R.parts.forEach((p) => {
      const k = clamp((it - p.t0) / 0.75, 0, 1);
      p.o.visible = it >= p.t0 - 0.05;
      p.o.position.copy(p.rest).addScaledVector(p.off, 1 - easeOut(k));
      if (k >= 1 && !p.done) { p.done = true; p.o.getWorldPosition(tmpV); emitSparks(tmpV, 30, 3.2); }
    });
    R.head.rotation.y = it < 6 ? (1 - clamp((it - 5.4) / 0.75, 0, 1)) * Math.PI * 2 : R.head.rotation.y;
    // face scan
    const fs = clamp((it - 6.0) / 1.4, 0, 1);
    hub.scanRing.position.y = fs > 0 && fs < 1 ? 2.95 - Math.sin(fs * Math.PI) * 1.0 : -5; hub.scanDisc.position.y = hub.scanRing.position.y;
    R.eyeGlow = sstep(7.4, 8.4, it);
    // camera script
    if (it < 3.5) setCam({ pivot: tmpV2.set(0, 2.2, HUB_Z), theta: lerp(1.0, 0.45, sstep(0, 3.5, it)), R: lerp(19, 12, sstep(0, 3.5, it)), h: lerp(8, 4.5, sstep(0, 3.5, it)), lookY: 0, shiftX: 0, shiftY: 0 });
    else if (it < 6.0) setCam({ pivot: tmpV2.set(0, 1.5, HUB_Z), theta: 0.32, R: isMobile ? 10 : 8.4, h: 1.7, lookY: 0.1 });
    else if (it < 7.6) setCam({ pivot: tmpV2.set(0, 2.32, HUB_Z), theta: 0.1, R: isMobile ? 3.6 : 2.5, h: 0.08, lookY: 0 });
    else setCam({ pivot: tmpV2.set(0, 1.9, HUB_Z), theta: -0.05, R: isMobile ? 7 : 4.8, h: 0.4, lookY: 0 });
    rig.kp = 2.2; rig.k = it < 3.5 ? 2.5 : 1.7;
    R.look.set(camera.position.x, camera.position.y, camera.position.z);
  }
  function finishIntro() {
    S.introT = 99; introIdx = introEvents.length; S.power = 1;
    R.parts.forEach((p) => { p.o.visible = true; p.o.position.copy(p.rest); p.done = true; });
    R.head.rotation.y = 0; R.eyeGlow = 1;
    hub.arms.forEach((a) => (a.active = 1)); hub.conv.forEach((c) => (c.target = 0.6));
    hub.sweep.material.opacity = 0; hub.sweepLine.visible = false; hub.scanRing.position.y = -5; hub.scanDisc.position.y = -5;
    ui.boot.classList.add('fade', 'gone'); hideBootMessage(); ui.bootSub.classList.add('gone'); $('#skipBtn').classList.add('gone');
    S.mode = 'hero'; ui.hero.classList.add('show');
    setTimeout(() => $('#enterBtn').focus({ preventScroll: true }), 400);
  }
  function skipIntro() { if (S.mode === 'boot') finishIntro(); }
  __on($('#skipBtn'), 'click', skipIntro);
  __on($('#enterBtn'), 'click', async () => {
    if (S.mode !== 'hero') return;
    sfx.init(); sfx.boom();
    const again = ui.hero.classList.contains('again');
    ui.hero.classList.remove('show');
    if (!again) {
      bootMessage('INITIALIZING DIGITAL WORKSHOP...', false);
      await sleep(reduceMotion ? 200 : 1300);
      bootMessage('WELCOME TO MY ROBOT FACTORY', false);
      setTimeout(hideBootMessage, 2300);
    }
    showChrome();
    goZone(0);
  });

  /* =====================================================================
     PER-FRAME WORLD UPDATE
     ===================================================================== */
  let ledAcc = 0;
  function updateWorld(dt, t) {
    const rp = R.root.position;
    // global lights
    const P = S.power;
    L.hemi.intensity = 0.32 * P;
    L.key.intensity = 1.25 * P; L.key.position.set(rp.x + 4, 11, rp.z + 7); L.key.target.position.set(rp.x, 1, rp.z);
    const cd = tmpV.subVectors(camera.position, rp).setY(0).normalize();
    L.fill.position.set(rp.x + cd.x * 3.2, 2.5, rp.z + cd.z * 3.2); L.fill.intensity = 2.6 * P;
    L.rim.position.set(rp.x - cd.x * 2.4, 3.2, rp.z - cd.z * 2.4); L.rim.intensity = 10 * P;
    dustMat.uniforms.time.value = t; dustMat.uniforms.power.value = P;
    hub.screen.material.color.setScalar(P * 0.9 * (P < 1 ? (Math.random() > 0.3 ? 1 : 0.3) : 1));
    // ceiling lamps
    if (!S.lampsDone) {
      lampPos.forEach((p, i) => {
        const dz = Math.abs(p[2] - HUB_Z), on = S.mode === 'boot' ? sstep(1.0 + dz / 90, 1.3 + dz / 90, S.introT) : 1;
        const fl = on > 0 && on < 1 ? (Math.random() > 0.4 ? 1 : 0.1) : 1;
        lamps.setColorAt(i, lampCol.setRGB(1.2, 1.1, 0.95).multiplyScalar(on * fl));
      });
      lamps.instanceColor.needsUpdate = true;
      if (S.mode !== 'boot') S.lampsDone = true;
    }
    // path lights chase toward destination
    const dest = travel ? travel.segs.length && travel.segs[travel.segs.length - 1].b.z : null;
    pathPos.forEach((p, i) => {
      const z = p[2]; let b = 0.18;
      const dr = Math.abs(z - rp.z); b += Math.max(0, 1 - dr / 5) * 1.4;
      if (dest != null && (z - rp.z) * (z - dest) <= 0) { const dir = Math.sign(dest - rp.z) || 1; b += 0.6 + Math.max(0, Math.sin((z * -dir) * 0.9 + t * 14)) * 1.6; }
      lampCol.setRGB(1.45 * b, 1.02 * b, 0.36 * b).multiplyScalar(P);
      pathLights.setColorAt(i, lampCol);
    });
    pathLights.instanceColor.needsUpdate = true;
    ledAcc += dt; if (ledAcc > 0.18) { ledAcc = 0; paintLeds(); }
    // gates
    gates.forEach((g) => { const near = (travel && Math.abs(rp.z - g.z) < 8.5) || Math.abs(camera.position.z - g.z) < 3; g.target = near ? 1 : 0; updateGate(g, dt, t); });
    // zones
    allZones.forEach((Z) => {
      let tgt = 0.14;
      if (Z === hub) tgt = S.mode === 'boot' ? S.power : (Math.abs(rp.z - HUB_Z) < 16 ? 1 : 0.3);
      else if (S.mode === 'present' && S.zone === Z.idx) tgt = 1;
      else if (Math.abs(rp.z - Z.z) < 17) tgt = 0.5;
      Z.power = damp(Z.power, tgt, 2.5, dt);
      Z.light.intensity = Z.power * 52 * P; Z.rim.intensity = Z.power * 18 * P;
      const e = t - Z.enterT;
      const spinBoost = e < 1.6 ? 7 * (1 - e / 1.6) : 0;
      Z.plat.spin.rotation.y += dt * (0.25 + spinBoost);
      Z.plat.ringMat.color.setRGB(1, 0.76, 0.32).multiplyScalar((0.25 + Z.power * 1.25 + spinBoost * 0.12) * P);
      Z.plat.beam.material.uniforms.strength.value = (0.015 + Z.power * 0.07 + spinBoost * 0.02) * P;
      if (Math.abs(camera.position.z - Z.z) < 48 && Z.update) Z.update(dt, t, e);
      if (Z.arms) Z.arms.forEach((a) => { if (Z !== hub) a.active = 0.15 + Z.power * 0.85; });
    });
    assignZoneLights(allZones, (camera.position.z + rp.z) * 0.5);
    // machines
    arms.forEach((A) => {
      animArm(A, t, dt);
      if (A.weld && A.active > 0.6 && Math.random() < dt * 1.3 && Math.abs(A.g.getWorldPosition(tmpV).z - camera.position.z) < 30) { A.tip.getWorldPosition(tmpV); emitSparks(tmpV, 10, 2.2); }
    });
    conveyors.forEach((C) => {
      C.speed = damp(C.speed, C.target * P, 1.5, dt);
      C.tex.offset.y -= C.speed * dt * 0.5;
      C.items.forEach((it) => { it.position.z += C.speed * dt * 2; if (it.position.z > C.len / 2) it.position.z -= C.len; });
    });
    gears.forEach((g) => { g.rotation.z += g.userData.speed * dt * P; });
    cables.rotation.z = Math.sin(t * 0.4) * 0.003;
    updateSparks(dt); updateSteam(dt);
    holoMats.forEach((m) => (m.uniforms.time.value = t)); beamMats.forEach((m) => (m.uniforms.time.value = t));
  }

  /* robot look target by context */
  function updateLook(t) {
    const rp = R.root.position;
    if (S.mode === 'travel' && travel) {
      const hd = R.heading; R.look.set(rp.x + Math.sin(hd) * 6, 2.1, rp.z + Math.cos(hd) * 6);
    } else if (S.mode === 'present') {
      if (S.station != null) { R.look.set(STATION_X[S.station], 3.3, ZONES[3].z - 8.5); }
      else {
        const phase = Math.floor((t - S.arrivedT) / 4) % 2;
        if (phase === 0 && S.panelOpen && !S.collapsed) { if (isMobile) R.look.set(rp.x, 0.8, rp.z + 4); else R.look.set(rp.x - 3.4, 2.0, rp.z + 2.4); }
        else R.look.copy(camera.position);
      }
    } else if (S.mode === 'hero') R.look.copy(camera.position);
  }

  /* =====================================================================
     MAIN LOOP (+ adaptive quality)
     ===================================================================== */
  const DT_CAP = 0.05;
  let last = performance.now(), perfAcc = 0, perfN = 0, degraded = false;
  function frame(now) {
    if (__stopped) return;
    __raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    let dt = Math.min(DT_CAP, (now - last) / 1000); last = now;
    if (reduceMotion) dt *= 1;
    S.t += dt; const t = S.t;
    if (S.mode === 'boot') runIntro(dt);
    updateTravel(dt);
    updateLook(t);
    animateRobot(dt, t);
    camTargets(t);
    updateCamera(dt, t);
    updateWorld(dt, t);
    composer.render();
    // adaptive quality
    if (!degraded && S.t > 4) { perfAcc += dt; perfN++; if (perfN >= 150) { const avg = perfAcc / perfN; perfAcc = 0; perfN = 0; if (avg > 0.04) { degraded = true; renderer.setPixelRatio(1); composer.setPixelRatio(1); renderer.shadowMap.enabled = false; bloom.strength *= 0.8; onResize(); } } }
  }
  function onResize() {
    const W = innerWidth, H = innerHeight;
    renderer.setSize(W, H); composer.setSize(W, H); bloom.resolution.set(W, H);
    camera.aspect = W / H; vo = { x: 999, y: 999 }; camera.updateProjectionMatrix();
  }
  __on(window, 'resize', onResize);
  paintLeds();
  document.body.classList.add('ready');
  if (reduceMotion) finishIntro();
  __raf = requestAnimationFrame((n) => { last = n; frame(n); });

  return function stopFactory() {
    __stopped = true; cancelAnimationFrame(__raf); __offs.forEach((f) => f()); sfx.close();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach((m) => { Object.values(m).forEach((v) => v && v.isTexture && v.dispose()); if (m.uniforms) Object.values(m.uniforms).forEach((u) => u && u.value && u.value.isTexture && u.value.dispose()); m.dispose(); });
    });
    try { composer.dispose && composer.dispose(); } catch (e) {}
    renderer.dispose();
    document.body.classList.remove('touring', 'ready', 'nogl');
    ['#boot', '#hero', '#panel', '#transit', '#modTitle', '#v01', '#bootLine', '#bootSub', '#skipBtn'].forEach((s) => { const el = $(s); if (el) el.className = ''; });
    const bs = $('#bootSub'); if (bs) bs.innerHTML = '';
  };
}
