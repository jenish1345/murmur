// The film's renderer. renderFrame(f) draws frame f as a pure function of time: no state between frames.
import { FPS, W, H, S, TRANS, CARDS, HITS, E1, E2, TALK, footageTime, setMarks } from './timeline.js';

const INK = '#14130f', INK2 = '#1c1a15', INK3 = '#26231c', PAPER = '#f3efe6', MUTED = '#9a9585', LINE = '#3a362b';
const VERM = '#ff6a4d', MUST = '#e0a63c', GREEN = '#5fc489', BLUE = '#6aa3f0', RED = '#ff5a4a';
const SEV = { blocking: VERM, suggestion: MUST, nit: MUTED, question: BLUE, praise: GREEN };
const DISP = '"Fraunces", Georgia, serif';
const TEXT = '"Inter Tight", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ math
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eo3 = (t) => 1 - Math.pow(1 - clamp(t), 3);
const eio = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const ebk = (t) => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const prog = (t, a, b) => clamp((t - a) / (b - a));
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// ------------------------------------------------------------------ canvases
const cv = document.getElementById('cv'); const ctx = cv.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const cA = mk(), cB = mk(), grid = mk();
const gA = cA.getContext('2d'), gB = cB.getContext('2d');
{ // the studio floor, drawn once: ink, faint dot grid, scanlines, vignette
  const g = grid.getContext('2d'); g.fillStyle = INK; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(243,239,230,0.07)';
  for (let x = 24; x < W; x += 48) for (let y = 24; y < H; y += 48) g.fillRect(x, y, 2, 2);
  g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
  const v = g.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.98); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}
const bg = (c) => c.drawImage(grid, 0, 0);

// ------------------------------------------------------------------ drawing helpers
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function txt(c, s, x, y, { size = 40, weight = 600, family = TEXT, color = PAPER, align = 'left', base = 'alphabetic', alpha = 1, ls = 0, scale = 1, italic = false, stroke = null } = {}) {
  if (alpha <= 0 || !s) return;
  c.save(); c.globalAlpha *= alpha; c.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`; c.textAlign = align; c.textBaseline = base; c.fillStyle = color; c.letterSpacing = `${ls}px`;
  if (scale !== 1) { c.translate(x, y); c.scale(scale, scale); x = 0; y = 0; }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 3; c.strokeText(s, x, y); } else c.fillText(s, x, y);
  c.restore();
}
const disp = (c, s, x, y, o = {}) => txt(c, s, x, y, { family: DISP, weight: 900, ...o });
const mono = (c, s, x, y, o = {}) => txt(c, s, x, y, { family: MONO, weight: 500, ...o });
const typed = (s, t, t0, cps = 26) => s.slice(0, Math.max(0, Math.floor((t - t0) * cps)));
function slam(c, s, x, y, t, t0, o = {}) { const p = t - t0; if (p < 0) return; const k = eo3(p / 0.38); disp(c, s, x, y, { ...o, scale: lerp(1.5, 1, k), alpha: clamp(p / 0.1) * (o.alpha ?? 1) }); }
function wrapLines(c, s, maxW, font) { c.font = font; const out = []; let line = ''; for (const w of s.split(' ')) { const t = line ? `${line} ${w}` : w; if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; }
const card = (c, x, y, w, h, { fill = INK2, border = LINE, lw = 2, r = 18, alpha = 1, glow = null } = {}) => { c.save(); c.globalAlpha *= alpha; if (glow) { c.shadowColor = glow; c.shadowBlur = 36; } c.fillStyle = fill; rr(c, x, y, w, h, r); c.fill(); c.shadowBlur = 0; c.strokeStyle = border; c.lineWidth = lw; rr(c, x, y, w, h, r); c.stroke(); c.restore(); };
function chip(c, s, x, y, { color = PAPER, size = 28, alpha = 1, scale = 1, fill = INK2, family = TEXT, weight = 600, padX = 22, h = null } = {}) {
  if (alpha <= 0) return 0;
  c.save(); c.globalAlpha *= alpha; c.font = `${weight} ${size}px ${family}`; const w = c.measureText(s).width + padX * 2, hh = h ?? size + 24;
  c.translate(x, y); c.scale(scale, scale); c.fillStyle = fill; rr(c, 0, -hh / 2, w, hh, 12); c.fill(); c.strokeStyle = color; c.lineWidth = 2.5; rr(c, 0, -hh / 2, w, hh, 12); c.stroke();
  c.fillStyle = PAPER; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(s, padX, 2); c.restore(); return w;
}
function check(c, x, y, r, p, color = GREEN) { if (p <= 0) return; c.save(); c.translate(x, y); c.scale(lerp(0.4, 1, ebk(p)), lerp(0.4, 1, ebk(p))); c.globalAlpha *= clamp(p * 3); c.fillStyle = color; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = r * 0.2; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-r * 0.4, 0); c.lineTo(-r * 0.1, r * 0.32); c.lineTo(r * 0.46, -r * 0.32); c.stroke(); c.restore(); }
function cross(c, x, y, r, p, color = RED) { if (p <= 0) return; c.save(); c.translate(x, y); c.scale(lerp(0.4, 1, ebk(p)), lerp(0.4, 1, ebk(p))); c.globalAlpha *= clamp(p * 3); c.fillStyle = color; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = r * 0.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 0.36, -r * 0.36); c.lineTo(r * 0.36, r * 0.36); c.moveTo(r * 0.36, -r * 0.36); c.lineTo(-r * 0.36, r * 0.36); c.stroke(); c.restore(); }
function stamp(c, s, x, y, t, t0, { color = VERM, size = 44, rot = -0.1 } = {}) {
  const p = t - t0; if (p < 0) return; const k = eo3(p / 0.22), sc = lerp(2.0, 1, k), a = clamp(p / 0.08);
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.rotate(rot); c.scale(sc, sc); c.font = `800 ${size}px ${TEXT}`; c.letterSpacing = '4px'; const w = c.measureText(s).width + 44;
  c.strokeStyle = color; c.lineWidth = 6; rr(c, -w / 2, -size * 0.85, w, size * 1.5, 8); c.stroke(); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, -size * 0.1 + 3); c.restore();
}

// the film's through-line: a voice waveform that becomes the underline, the transition, the pins
const wv = (x, t) => Math.sin(x * 0.011 + t * 5.2) * 0.5 + Math.sin(x * 0.027 - t * 8.1) * 0.32 + Math.sin(x * 0.061 + t * 12.7) * 0.18;
function thread(c, x0, x1, y, amp, t, { color = VERM, lw = 5, p = 1, glow = 18 } = {}) {
  if (p <= 0) return; c.save(); c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round'; c.shadowColor = color; c.shadowBlur = glow; c.beginPath();
  const end = lerp(x0, x1, p); for (let x = x0; x <= end; x += 5) { const yy = y + wv(x, t) * amp; x === x0 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); c.restore();
}
function bars(c, x, y, w, h, n, t, { color = VERM, env = 1, seed = 0 } = {}) { // spectrum bars, centred on y
  const gap = w / n; c.save(); c.fillStyle = color; for (let i = 0; i < n; i++) { const e = (0.3 + 0.7 * Math.abs(Math.sin(i * 0.9 + t * 7 + seed) * Math.sin(i * 0.37 - t * 3.3 + seed * 2))) * env; const bh = Math.max(4, h * e); rr(c, x + i * gap, y - bh / 2, gap * 0.56, bh, gap * 0.28); c.fill(); } c.restore();
}

// ------------------------------------------------------------------ footage
const frameCache = new Map();
let FRAME_COUNT = 0;
const fidx = (T) => Math.round(clamp(footageTime(T), 0, 1e6) * FPS);
async function ensureImg(url, key) { if (frameCache.has(key)) return; await new Promise((res) => { const im = new Image(); im.onload = () => { frameCache.set(key, im); res(); }; im.onerror = () => res(); im.src = url; }); }
async function ensure(idx) { if (FRAME_COUNT) idx = Math.min(idx, FRAME_COUNT - 1); if (frameCache.has(idx)) return; await ensureImg(`/footage/frames/${String(idx).padStart(6, '0')}.jpg`, idx); if (frameCache.size > 60) { for (const k of frameCache.keys()) if (typeof k === 'number') { frameCache.delete(k); break; } } }

const PX = 160, PY = 100, PW = 1600, PH = 900;
function camera(keys, T) {
  let a = keys[0], b = keys[keys.length - 1], out;
  if (T <= keys[0].t) out = keys[0]; else if (T >= keys[keys.length - 1].t) out = keys[keys.length - 1];
  else { for (let i = 0; i < keys.length - 1; i++) if (T >= keys[i].t && T < keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; } const k = eio((T - a.t) / (b.t - a.t)); out = { z: lerp(a.z, b.z, k), fx: lerp(a.fx, b.fx, k), fy: lerp(a.fy, b.fy, k) }; }
  return { z: out.z, fx: clamp(out.fx, PW / 2 / out.z, 1600 - PW / 2 / out.z), fy: clamp(out.fy, PH / 2 / out.z, 900 - PH / 2 / out.z) };
}
const toCanvas = (cam, x, y) => [PX + PW / 2 + (x - cam.fx) * cam.z, PY + PH / 2 + (y - cam.fy) * cam.z];
const CAMS = [
  { t: 21, z: 1, fx: 800, fy: 450 }, { t: 26.6, z: 1, fx: 800, fy: 450 }, { t: 28.4, z: 2, fx: 1190, fy: 335 }, { t: 39.2, z: 2, fx: 1190, fy: 335 },
  { t: 40.8, z: 1.55, fx: 1130, fy: 345 }, { t: 45.0, z: 1.55, fx: 1130, fy: 345 }, { t: 47.2, z: 1, fx: 800, fy: 450 }, { t: 49.6, z: 1.45, fx: 580, fy: 330 },
  { t: 56.4, z: 1.45, fx: 580, fy: 330 }, { t: 57.4, z: 1, fx: 800, fy: 450 }, { t: 62.0, z: 1, fx: 800, fy: 450 }, { t: 63.2, z: 1.6, fx: 1130, fy: 330 }, { t: 70, z: 1.6, fx: 1130, fy: 330 },
];

function callout(c, cam, T, { t0, t1, fx, fy, bx, by, lines, color = VERM, w = 560, size = 32 }) {
  if (T < t0 || T > t1) return;
  const a = Math.min(eo3((T - t0) / 0.35), 1 - eo3((T - (t1 - 0.3)) / 0.3)); if (a <= 0) return;
  const [ax, ay] = toCanvas(cam, fx, fy); const h = lines.length * (size + 10) + 34;
  c.save(); c.globalAlpha *= a; const ox = (1 - eo3((T - t0) / 0.35)) * -30;
  const ex = Math.max(bx, Math.min(ax, bx + w)), ey = ay < by ? by : ay > by + h ? by + h : by + h / 2;
  c.strokeStyle = color; c.lineWidth = 3; c.setLineDash([2, 7]); c.lineCap = 'round'; c.beginPath(); c.moveTo(ex + ox, ey); c.lineTo(ax, ay); c.stroke(); c.setLineDash([]);
  c.fillStyle = color; c.beginPath(); c.arc(ax, ay, 9, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
  card(c, bx + ox, by, w, h, { fill: 'rgba(20,19,15,0.96)', border: color, lw: 3, r: 14, glow: color });
  lines.forEach((l, i) => txt(c, l, bx + ox + 26, by + 22 + size + i * (size + 10) - 6, { size, weight: i === 0 ? 700 : 500, color: i === 0 ? PAPER : '#cfc9b8' }));
  c.restore();
}

const TABS = [['1', 'PASTE', 21], ['2', 'TALK', 27.4], ['3', 'PIN', 39.8], ['4', 'TRACE', 55.5], ['5', 'SHIP', 62.6]];
function stepTabs(c, T) {
  const w = 190, gap = 16, x0 = (W - (TABS.length * w + (TABS.length - 1) * gap)) / 2; let act = 0;
  TABS.forEach((t, i) => { if (T >= t[2]) act = i; });
  TABS.forEach((t, i) => {
    const x = x0 + i * (w + gap), on = i === act, done = i < act, a = eo3(prog(T, 21 + i * 0.12, 21.5 + i * 0.12));
    c.save(); c.globalAlpha *= a; card(c, x, 14, w, 38, { fill: on ? VERM : INK2, border: on ? VERM : done ? '#5a5547' : LINE, lw: 2, r: 19 });
    mono(c, `${t[0]}  ${t[1]}`, x + w / 2, 33, { size: 20, weight: 700, color: on ? INK : done ? PAPER : MUTED, align: 'center', base: 'middle', ls: 2 }); c.restore();
  });
}

function windowChrome(c, T) {
  const a = eo3(prog(T, 21, 21.7));
  c.save(); c.globalAlpha *= a;
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 50; c.fillStyle = INK2; rr(c, PX - 6, PY - 48, PW + 12, PH + 54, 16); c.fill(); c.shadowBlur = 0;
  c.fillStyle = INK3; rr(c, PX - 6, PY - 48, PW + 12, 48, 16); c.fill(); c.fillRect(PX - 6, PY - 20, PW + 12, 20);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(PX + 24 + i * 26, PY - 24, 7.5, 0, TAU); c.fill(); });
  c.fillStyle = INK; rr(c, PX + 560, PY - 38, 480, 28, 14); c.fill();
  mono(c, 'murmur-voice-review.netlify.app', PX + 800, PY - 24, { size: 17, color: '#cfc9b8', align: 'center', base: 'middle' });
  c.restore();
}

function drawFootageWindow(c, T, cam) {
  windowChrome(c, T);
  c.save(); c.beginPath(); c.rect(PX, PY, PW, PH); c.clip();
  c.fillStyle = INK; c.fillRect(PX, PY, PW, PH);
  c.translate(PX + PW / 2, PY + PH / 2); c.scale(cam.z, cam.z); c.translate(-cam.fx, -cam.fy);
  const idx = Math.min(fidx(T), FRAME_COUNT ? FRAME_COUNT - 1 : 1e9), im = frameCache.get(idx);
  if (im) c.drawImage(im, 0, 0);
  // the host's badge sits bottom-right of every frame; replace it with our own LIVE tag
  c.fillStyle = INK2; rr(c, 1396, 832, 188, 50, 12); c.fill(); c.strokeStyle = VERM; c.lineWidth = 2; rr(c, 1396, 832, 188, 50, 12); c.stroke();
  c.fillStyle = VERM; c.beginPath(); c.arc(1424, 857, 7 + 2 * Math.sin(T * 5), 0, TAU); c.fill();
  c.fillStyle = PAPER; c.font = `700 22px ${TEXT}`; c.textBaseline = 'middle'; c.letterSpacing = '3px'; c.fillText('LIVE', 1446, 858);
  c.restore();
}

function voicePill(c, cam, T) {
  const a = TALK.a, b = TALK.b; if (T < a - 0.3 || T > b + 1.6) return;
  const [cx, cy] = toCanvas(cam, 1240, 300); const k = cam.z;
  const al = Math.min(eo3(prog(T, a - 0.25, a + 0.25)), 1 - eo3(prog(T, b, b + 0.35))); if (al > 0.01) {
    const w = 360 * k, h = 86 * k; c.save(); c.globalAlpha *= al; c.translate(cx, cy);
    const pulse = 0.5 + 0.5 * Math.sin(T * 9); card(c, -w / 2, -h / 2, w, h, { fill: INK, border: VERM, lw: 3, r: h / 2, glow: VERM });
    c.fillStyle = VERM; c.beginPath(); c.arc(-w / 2 + h / 2, 0, h * 0.34, 0, TAU); c.fill();
    c.strokeStyle = INK; c.lineWidth = 3 * k; c.lineCap = 'round'; rr(c, -w / 2 + h / 2 - 6 * k, -14 * k, 12 * k, 22 * k, 6 * k); c.stroke(); c.beginPath(); c.arc(-w / 2 + h / 2, 2 * k, 13 * k, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke(); c.beginPath(); c.moveTo(-w / 2 + h / 2, 15 * k); c.lineTo(-w / 2 + h / 2, 21 * k); c.stroke();
    const env = 0.35 + 0.65 * Math.abs(Math.sin((T - a) * 3.3) * Math.sin((T - a) * 1.1 + 1)) + 0.12 * pulse;
    bars(c, -w / 2 + h + 8 * k, 0, w - h * 2.45, h * 0.62, 18, T, { color: PAPER, env, seed: 3 });
    const sec = Math.floor(prog(T, a, b) * 23); mono(c, `0:${String(sec).padStart(2, '0')}`, w / 2 - 22 * k, -4 * k, { size: 24 * k, color: PAPER, align: 'right', base: 'middle', weight: 700 });
    mono(c, 'sped up', w / 2 - 22 * k, 20 * k, { size: 13 * k, color: MUTED, align: 'right', base: 'middle' });
    c.restore();
    txt(c, 'HOLD YOUR WISPR FLOW HOTKEY. TALK.', cx, cy - 70 * k, { size: 22 * k, weight: 800, color: VERM, align: 'center', ls: 3 * k, alpha: al });
  }
  if (T >= b && T < b + 1.6) { // release: it lands in one go
    const p = T - b, [tx, ty] = toCanvas(cam, 1240, 440), pa = Math.min(eo3(p / 0.2), 1 - eo3((p - 1.1) / 0.4));
    chip(c, 'RELEASED. FLOW PASTES IT IN ONE GO.', tx - 330 * k * 0.55, ty, { color: VERM, size: 22 * k, alpha: pa, family: TEXT, weight: 800, fill: INK });
  }
}

const CALLS = [
  { t0: 22.7, t1: 26.7, fx: 370, fy: 474, bx: 640, by: 660, lines: ['No sign-in.', 'Any public GitHub pull request.'] },
  { t0: 37.0, t1: 40.0, fx: 1240, fy: 330, bx: 230, by: 690, lines: ['The whole thought, as text.', 'Not a recording. Not a summary.'], w: 600 },
  { t0: 42.2, t1: 45.6, fx: 1240, fy: 557, bx: 190, by: 400, lines: ['Real model. Real diff.', '3.9 s from click to comments.'], w: 560 },
  { t0: 51.6, t1: 56.0, fx: 502, fy: 168, bx: 1060, by: 640, lines: ['A severity. The exact line.', 'And the sentence you said.'], w: 640 },
  { t0: 58.7, t1: 62.4, fx: 1240, fy: 335, bx: 220, by: 700, lines: ['Words to line. Line to words.', 'Click either way.'], w: 600 },
  { t0: 64.0, t1: 67.8, fx: 1240, fy: 430, bx: 240, by: 640, lines: ['Copy as markdown.', 'Or post a real GitHub review.'], w: 600 },
];

function sceneDemo(c, T) {
  bg(c); const cam = camera(CAMS, T);
  drawFootageWindow(c, T, cam); stepTabs(c, T);
  c.save(); c.beginPath(); c.rect(PX, PY, PW, PH); c.clip(); voicePill(c, cam, T); c.restore();
  CALLS.forEach((k) => callout(c, cam, T, k));
}

// ------------------------------------------------------------------ scene 1: the race
const SENT = 'the token check in auth never looks at expiry, and the retry loop needs backoff';
function panelFrame(c, x, y, w, h, label, color, alpha = 1) { card(c, x, y, w, h, { alpha }); c.save(); c.globalAlpha *= alpha; c.fillStyle = color; c.beginPath(); c.arc(x + 36, y + 40, 8, 0, TAU); c.fill(); mono(c, label, x + 58, y + 41, { size: 24, weight: 700, color, base: 'middle', ls: 4 }); c.restore(); }
function sceneRace(c, t) {
  bg(c);
  if (t < 1.6) { const a = 1 - eo3(prog(t, 0.9, 1.4)); if (a > 0 && Math.floor(t * 2.4) % 2 === 0) { c.save(); c.globalAlpha = a; c.fillStyle = PAPER; c.fillRect(W / 2 - 6, H / 2 - 80, 12, 160); c.restore(); } }
  const open = eo3(prog(t, 0.9, 1.7)); if (open <= 0) return;
  const PWd = 780, py = 190, PHt = 560, xL = lerp(-PWd, 120, open), xR = lerp(W, W - 120 - PWd, open);
  const el = clamp(t - E1.go, 0, E1.raceEnd - E1.go), tick = Math.max(0, t - E1.go);
  // the clock
  const sec = el; mono(c, `0:${sec.toFixed(1).padStart(4, '0')}`, W / 2, 110, { size: 70, weight: 700, align: 'center', color: t >= E1.go && t < E1.raceEnd ? PAPER : MUTED, alpha: open });
  if (t > 1.2 && t < E1.go) { const s = t < 1.65 ? '3' : t < 1.9 ? '2' : '1'; void s; }
  txt(c, 'SAME SENTENCE. SAME START LINE.', W / 2, 160, { size: 22, weight: 700, color: MUTED, align: 'center', ls: 5, alpha: open });
  panelFrame(c, xL, py, PWd, PHt, 'TYPING', MUTED, open); panelFrame(c, xR, py, PWd, PHt, 'TALKING', VERM, open);
  // left: slow typing
  const nL = Math.floor(el * 3.5), shownL = SENT.slice(0, nL);
  c.save(); c.font = `500 36px ${MONO}`; const linesL = wrapLines(c, shownL || ' ', PWd - 90, `500 36px ${MONO}`); c.restore();
  linesL.forEach((l, i) => mono(c, l, xL + 44, py + 130 + i * 56, { size: 36, color: PAPER }));
  if (Math.floor(t * 2.6) % 2 === 0 && t < 9) { const last = linesL[linesL.length - 1] ?? ''; c.save(); c.font = `500 36px ${MONO}`; const cw = c.measureText(last).width; c.restore(); c.fillStyle = PAPER; c.fillRect(xL + 46 + cw, py + 130 + (linesL.length - 1) * 56 - 34, 4, 46); }
  // right: fast speech as a waveform and words
  const nR = Math.floor(el * 14), shownR = SENT.slice(0, nR), doneR = nR >= SENT.length, speaking = t >= E1.go && !doneR;
  bars(c, xR + 44, py + 150, PWd - 88, 90, 44, t, { color: VERM, env: speaking ? 1 : 0.07 });
  const scat = prog(t, E1.scatter, E1.scatter + 1.6);
  c.save(); const rl = wrapLines(c, SENT, PWd - 90, `italic 500 42px ${DISP}`); c.restore();
  const rLines = wrapLines(ctx, shownR || ' ', PWd - 90, `italic 500 42px ${DISP}`);
  if (scat <= 0) rLines.forEach((l, i) => txt(c, l, xR + 44, py + 290 + i * 62, { size: 42, italic: true, weight: 500, family: DISP, color: PAPER }));
  else { // the words come loose: nothing anchors them
    const r = rng(41); let wi = 0;
    rl.forEach((l, li) => { let x = xR + 44; l.split(' ').forEach((w) => { c.save(); c.font = `italic 500 42px ${DISP}`; const ww = c.measureText(w + ' ').width; c.restore(); const dx = (r() - 0.5) * 420 * eo3(scat), dy = (r() - 0.7) * 230 * eo3(scat), rot = (r() - 0.5) * 0.9 * eo3(scat); c.save(); c.translate(x + dx, py + 290 + li * 62 + dy + Math.sin(t * 2 + wi) * 6 * scat); c.rotate(rot); txt(c, w, 0, 0, { size: 42, italic: true, weight: 500, family: DISP, color: PAPER, alpha: lerp(1, 0.55, scat) }); c.restore(); x += ww; wi++; }); });
    [['which file?', 140, 250, 9.1], ['which line?', 480, 440, 9.5], ['?', 640, 300, 9.85]].forEach(([s, ox, oy, t0]) => { const p = ebk(prog(t, t0, t0 + 0.35)); chip(c, s, xR + ox, py + oy, { color: VERM, size: 28, scale: p, alpha: clamp(p * 2), family: MONO, fill: INK }); });
  }
  // progress
  const barY = py + PHt - 46; c.fillStyle = INK3; rr(c, xL + 44, barY, PWd - 88, 12, 6); c.fill(); rr(c, xR + 44, barY, PWd - 88, 12, 6); c.fill();
  c.fillStyle = MUTED; rr(c, xL + 44, barY, Math.max(8, (PWd - 88) * clamp(nL / SENT.length)), 12, 6); c.fill(); c.fillStyle = VERM; rr(c, xR + 44, barY, Math.max(8, (PWd - 88) * clamp(nR / SENT.length)), 12, 6); c.fill();
  mono(c, `${Math.round(clamp(nL / SENT.length) * 100)}%`, xL + PWd - 44, py + 41, { size: 24, color: MUTED, align: 'right', base: 'middle' });
  if (doneR) { const p = ebk(prog(t, E1.go + SENT.length / 14, E1.go + SENT.length / 14 + 0.3)); chip(c, 'DONE', xR + PWd - 44 - 90, py + 41, { color: GREEN, size: 22, scale: p, alpha: clamp(p * 2), family: MONO, weight: 700, fill: INK, h: 40 }); }
  // verdicts
  if (t >= E1.faster && t < E1.noLine - 0.1) { const a = 1 - eo3(prog(t, E1.scatter + 0.6, E1.scatter + 1.0)); slam(c, '≈ 3–4× FASTER', W / 2, 890, t, E1.faster, { size: 150, align: 'center', color: VERM, alpha: a }); }
  if (t >= E1.faster) mono(c, 'typing ≈ 40 wpm   ·   speaking ≈ 150 wpm   (typical rates)', W / 2, 960, { size: 24, color: MUTED, align: 'center', alpha: eo3(prog(t, E1.faster + 0.4, E1.faster + 0.9)) });
  if (t >= E1.noLine) slam(c, 'NO FILE. NO LINE NUMBER.', W / 2, 880, t, E1.noLine, { size: 112, align: 'center', color: PAPER });
}

// ------------------------------------------------------------------ scene 2: title
function sceneTitle(c, t) {
  bg(c);
  const gl = c.createRadialGradient(W / 2, 520, 40, W / 2, 520, 720); gl.addColorStop(0, `rgba(255,106,77,${0.22 * eo3(prog(t, 0.4, 2.2))})`); gl.addColorStop(1, 'rgba(255,106,77,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H);
  const amp = lerp(120, 12, eo3(prog(t, 0.2, 2.6)));
  thread(c, 160, 1760, 730, amp, t, { p: eo3(prog(t, 0.1, 1.2)), lw: 6 });
  c.font = `900 330px ${DISP}`; const word = 'MURMUR', ws = [...word].map((ch) => c.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0); let x = W / 2 - tw / 2;
  [...word].forEach((ch, i) => { const p = ebk(prog(t, E2.letters - 11.5 + i * 0.14, E2.letters - 11.5 + i * 0.14 + 0.5)); disp(c, ch, x, 640 + (1 - p) * 120, { size: 330, color: i === 0 || i === 5 ? VERM : PAPER, alpha: clamp(p * 2), scale: lerp(0.6, 1, p) }); x += ws[i]; });
  const shine = prog(t, 2.0, 3.0); if (shine > 0 && shine < 1) { c.save(); c.globalCompositeOperation = 'source-atop'; c.restore(); }
  txt(c, typed('review pull requests by talking.', t, E2.tag - 11.5, 17), W / 2, 820, { size: 58, weight: 600, align: 'center', color: PAPER });
  const pp = eo3(prog(t, E2.pill - 11.5, E2.pill - 11.5 + 0.5)); if (pp > 0) {
    const w = 580, h = 78, x0 = W / 2 - w / 2 + (1 - pp) * 500; c.save(); c.globalAlpha *= pp; card(c, x0, 868, w, h, { fill: INK2, border: VERM, lw: 3, r: 39 });
    c.fillStyle = VERM; c.beginPath(); c.arc(x0 + 44, 907, 24, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 3.5; c.lineCap = 'round'; rr(c, x0 + 38, 895, 12, 22, 6); c.stroke(); c.beginPath(); c.arc(x0 + 44, 909, 14, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke(); c.beginPath(); c.moveTo(x0 + 44, 923); c.lineTo(x0 + 44, 928); c.stroke();
    for (let i = 0; i < 3; i++) { c.strokeStyle = `rgba(255,106,77,${0.9 - i * 0.28 - 0.25 * Math.sin(t * 6 - i)})`; c.lineWidth = 3; c.beginPath(); c.arc(x0 + 44, 907, 36 + i * 9, -0.6, 0.6); c.stroke(); }
    txt(c, 'built with', x0 + 118, 905, { size: 26, color: MUTED, weight: 500, base: 'middle' }); txt(c, 'Wispr Flow', x0 + 250, 905, { size: 38, weight: 800, base: 'middle' }); c.restore();
  }
  mono(c, 'NO HANDS · THE WISPR CHALLENGE · BUILDERS TRACK', W / 2, 970, { size: 22, color: MUTED, align: 'center', ls: 5, alpha: eo3(prog(t, E2.small - 11.5, E2.small - 11.5 + 0.6)) });
}

// ------------------------------------------------------------------ scene 4: four things only Murmur does
function cardHeader(c, i, title, sub, t) {
  const a = eo3(prog(t, 0.1, 0.6));
  c.save(); c.globalAlpha *= a; c.font = `900 200px ${DISP}`; c.strokeStyle = VERM; c.lineWidth = 3; c.textBaseline = 'alphabetic'; c.strokeText(`0${i + 1}`, 120, 270);
  txt(c, 'ONLY MURMUR', 400, 130, { size: 22, weight: 800, color: VERM, ls: 6 });
  title.forEach((l, k) => disp(c, l, 400, 205 + k * 82, { size: 76, color: PAPER }));
  txt(c, sub, 400, 205 + (title.length - 1) * 82 + 56, { size: 32, weight: 500, color: MUTED });
  c.restore();
}
function cardReceipt(c, t) {
  cardHeader(c, 0, ['Your sentence', 'is the receipt.'], 'Every comment carries the words that made it.', t);
  const lx = 120, ly = 440, lw = 800, lh = 470, rx = 1040, rw = 760;
  card(c, lx, ly, lw, lh, { alpha: eo3(prog(t, 0.5, 1.0)) }); mono(c, 'WHAT YOU SAID', lx + 36, ly + 46, { size: 22, color: MUTED, ls: 4, weight: 700, alpha: eo3(prog(t, 0.6, 1.0)) });
  const parts = [['Okay, this express pull request fixes the ETag getting skipped when Transfer-Encoding is set. The core fix is right. ', 0], ['One question though, what happens with an empty body?', 1], [" And the test only covers a string body, I'd want a buffer case too.", 0]];
  const fnt = `italic 500 34px ${DISP}`; c.save(); c.font = fnt; let x = lx + 36, y = ly + 120, hl = null; const maxX = lx + lw - 36;
  for (const [s, h] of parts) for (const w of s.split(/(?<= )/)) { const ww = c.measureText(w).width; if (x + ww > maxX && w.trim()) { x = lx + 36; y += 52; } if (h) { if (!hl) hl = { x0: x, y0: y, x1: x + ww, y1: y }; else { if (Math.abs(y - hl.y0) < 4) hl.x1 = x + ww; hl.lastX = x + ww; hl.lastY = y; } }
    const pa = eo3(prog(t, 0.7, 1.3)); const isH = h && t > 3.4; if (isH) { c.fillStyle = `rgba(255,106,77,${0.32 * eo3(prog(t, 3.4, 3.8))})`; c.fillRect(x - 2, y - 33, ww + 2, 46); } c.globalAlpha = pa; c.fillStyle = isH ? PAPER : '#b9b3a2'; c.fillText(w, x, y); c.globalAlpha = 1; x += ww; }
  c.restore();
  // the comment, on its diff line
  const ra = eo3(prog(t, 2.0, 2.6)), ry = ly + lh / 2 - 190 + (1 - ra) * 40; c.save(); c.globalAlpha *= ra;
  card(c, rx, ry, rw, 380, { fill: INK2 }); c.fillStyle = 'rgba(95,196,137,0.16)'; c.fillRect(rx + 2, ry + 28, rw - 4, 52); mono(c, '166 +   if (chunk !== undefined) {', rx + 28, ry + 56, { size: 26, color: '#a8d98f', base: 'middle' });
  card(c, rx + 24, ry + 112, rw - 48, 244, { fill: INK, border: BLUE, lw: 3, r: 14 }); chip(c, 'QUESTION', rx + 48, ry + 150, { color: BLUE, size: 20, weight: 800, fill: INK, padX: 14, h: 36 });
  wrapLines(c, 'What happens with an empty body here when Transfer-Encoding is set? Is the ETag still generated correctly?', rw - 120, `500 29px ${TEXT}`).forEach((l, i) => txt(c, l, rx + 48, ry + 214 + i * 40, { size: 29, weight: 500 }));
  txt(c, '“…what happens with an empty body?”', rx + 48, ry + 326, { size: 22, italic: true, family: DISP, color: MUTED, weight: 500, alpha: eo3(prog(t, 6.6, 7.0)) }); c.restore();
  // the thread from the words to the comment
  const tp = eo3(prog(t, 4.8, 6.5)); if (tp > 0 && hl) { const sx = lx + lw - 30, sy = hl.lastY ? hl.lastY - 12 : hl.y0 - 12, ex = rx + 24, ey = ry + 232; c.save(); c.strokeStyle = VERM; c.lineWidth = 5; c.lineCap = 'round'; c.shadowColor = VERM; c.shadowBlur = 16; c.beginPath(); for (let k = 0; k <= 60 * tp; k++) { const u = k / 60, bx = (1 - u) ** 3 * sx + 3 * (1 - u) ** 2 * u * (sx + 160) + 3 * (1 - u) * u * u * (ex - 160) + u ** 3 * ex, by = (1 - u) ** 3 * sy + 3 * (1 - u) ** 2 * u * sy + 3 * (1 - u) * u * u * ey + u ** 3 * ey; k ? c.lineTo(bx, by) : c.moveTo(bx, by); } c.stroke(); c.restore(); }
  stamp(c, 'RECEIPT', rx + rw - 170, ry + 338, t, 6.6, { size: 36 });
}
function cardGate(c, t) {
  cardHeader(c, 1, ['It can’t invent', 'a line.'], 'Every anchor is checked against the real diff.', t);
  const gx = 920, top = 420, bot = 940;
  txt(c, 'THE MODEL PROPOSES', 120, 450, { size: 20, weight: 800, color: MUTED, ls: 5, alpha: eo3(prog(t, 0.4, 0.8)) });
  const items = [['lib/response.js : 166', true, 1.4, 2.4], ['test/res.send.js : 624', true, 2.4, 3.4], ['lib/nonexistent.js : 7', false, 4.0, 4.9]];
  // the gate
  const ga = eo3(prog(t, 0.6, 1.2)); c.save(); c.globalAlpha *= ga; c.strokeStyle = VERM; c.lineWidth = 4; c.setLineDash([14, 10]); c.beginPath(); c.moveTo(gx, top); c.lineTo(gx, bot); c.stroke(); c.setLineDash([]);
  const sw = (t * 0.8) % 1; c.fillStyle = 'rgba(255,106,77,0.18)'; c.fillRect(gx - 28, top + sw * (bot - top) - 14, 56, 28); c.restore();
  txt(c, 'IS THIS LINE IN THE REAL DIFF?', gx, top - 18, { size: 20, weight: 800, color: VERM, align: 'center', ls: 3, alpha: ga });
  // the real diff stack, right
  const dx = 1090, dw = 700; card(c, dx, 450, dw, 360, { alpha: ga }); mono(c, 'THE REAL DIFF', dx + 28, 490, { size: 20, color: MUTED, ls: 4, weight: 700, alpha: ga });
  ['lib/response.js', 'test/res.send.js'].forEach((f, i) => { c.save(); c.globalAlpha *= ga; mono(c, f, dx + 28, 560 + i * 150, { size: 22, color: '#cfc9b8' }); c.fillStyle = 'rgba(95,196,137,0.14)'; c.fillRect(dx + 20, 578 + i * 150, dw - 40, 46); mono(c, i ? '624 +   app.use(function(_, res){' : '166 +   if (chunk !== undefined) {', dx + 34, 602 + i * 150, { size: 22, color: '#a8d98f', base: 'middle' }); c.restore(); });
  items.forEach(([label, ok, a0, a1], i) => {
    const y0 = 520 + i * 120, appear = ebk(prog(t, 0.7 + i * 0.25, 1.2 + i * 0.25)); if (appear <= 0) return;
    let x = 130, y = y0, al = 1, col = ok ? GREEN : VERM, tilt = 0;
    const go = eio(prog(t, a0, a1));
    if (ok) { x = lerp(130, dx + 40, go); y = lerp(y0, 612 + (i === 0 ? 0 : 150) - 0 + 30, go); if (go >= 1) { x = dx + 40; } al = 1; }
    else { const reach = eio(prog(t, a0, a1)); x = lerp(130, gx - 380, reach); const bounce = prog(t, 4.9, 5.5); x -= eo3(bounce) * 70; const fall = prog(t, 5.5, 6.2); y = y0 + eo3(fall) * (898 - y0); tilt = Math.sin(fall * Math.PI) * 0.45 + (t >= 4.9 && t < 5.5 ? Math.sin((t - 4.9) * 60) * 0.06 : 0); al = 1 - prog(t, 6.0, 6.4) * 0.0; }
    c.save(); c.globalAlpha *= al; c.translate(x, y); c.rotate(tilt); chip(c, label, 0, 0, { color: col, size: 26, family: MONO, weight: 500, scale: lerp(0.6, 1, appear), alpha: clamp(appear * 2), fill: INK }); c.restore();
    if (ok) check(c, gx, y0 + (i ? 0 : 0) + 0, 26, prog(t, a0 + 0.45, a0 + 0.75));
    else { cross(c, gx, y0, 28, prog(t, 4.9, 5.2)); if (t >= 4.9 && t < 5.15) { c.fillStyle = `rgba(255,90,74,${0.25 * (1 - (t - 4.9) / 0.25)})`; c.fillRect(0, 0, W, H); } }
  });
  // the honest box
  const ba = eo3(prog(t, 5.0, 5.6)); if (ba > 0) { c.save(); c.globalAlpha *= ba; c.strokeStyle = MUTED; c.lineWidth = 3; c.setLineDash([10, 8]); rr(c, 120, 790, 760, 150, 14); c.stroke(); c.setLineDash([]); txt(c, 'COULDN’T PIN TO A LINE', 150, 828, { size: 24, weight: 800, color: PAPER, ls: 2 }); txt(c, 'Shown honestly. Never at a made-up line.', 150, 856, { size: 20, color: MUTED, weight: 500 }); c.restore(); }
}
function cardOnly(c, t) {
  cardHeader(c, 2, ['Only what', 'you said.'], 'No findings of its own. No opinions added.', t);
  const lx = 120, ly = 430, lw = 700, lh = 500; card(c, lx, ly, lw, lh, { alpha: eo3(prog(t, 0.3, 0.8)) }); mono(c, 'WHAT YOU SAID', lx + 32, ly + 44, { size: 20, color: MUTED, ls: 4, weight: 700, alpha: eo3(prog(t, 0.4, 0.8)) });
  const sents = ['The core fix is right, it always computes the length.', 'One question, what happens with an empty body?', "The test only covers a string, I'd want a buffer case."];
  sents.forEach((s, i) => { const a = eo3(prog(t, 0.5 + i * 0.5, 1.0 + i * 0.5)); wrapLines(c, s, lw - 80, `italic 500 33px ${DISP}`).forEach((l, k) => { c.save(); c.globalAlpha *= a; if (k === 0) { const wd = (() => { c.font = `italic 500 33px ${DISP}`; return c.measureText(l).width; })(); c.fillStyle = 'rgba(255,106,77,0.28)'; c.fillRect(lx + 32, ly + 100 + i * 120 + k * 46 - 34, wd + 4, 44); } txt(c, l, lx + 34, ly + 100 + i * 120 + k * 46, { size: 33, italic: true, weight: 500, family: DISP }); c.restore(); }); });
  const cx = 1010, cw = 790; const cards3 = [['praise', 'Computes the length, only guards the header.'], ['question', 'What happens with an empty body?'], ['suggestion', 'Please add a Buffer body case too.']];
  cards3.forEach(([sev, body], i) => { const a = ebk(prog(t, 0.8 + i * 0.5, 1.3 + i * 0.5)); if (a <= 0) return; c.save(); c.globalAlpha *= clamp(a * 2); c.translate(cx, 440 + i * 120 + (1 - a) * 40); card(c, 0, 0, cw, 100, { fill: INK2, border: SEV[sev], lw: 3, r: 14 }); chip(c, sev.toUpperCase(), 22, 32, { color: SEV[sev], size: 17, weight: 800, fill: INK, padX: 12, h: 32 }); txt(c, body, 24, 78, { size: 28, weight: 500 }); c.restore(); });
  // the shield, and the opinions that bounce off it
  const sx = 900; const sa = eo3(prog(t, 1.1, 1.6)); c.save(); c.globalAlpha *= sa; c.strokeStyle = VERM; c.lineWidth = 4; c.setLineDash([4, 10]); c.beginPath(); c.moveTo(sx, 400); c.lineTo(sx, 950); c.stroke(); c.setLineDash([]); c.restore();
  const ghosts = [['// consider adding error handling', 1.3, 560], ['// rename this variable', 2.2, 720], ['// maybe add caching?', 3.1, 640]];
  ghosts.forEach(([s, t0, gy], i) => { const p = t - t0; if (p < 0) return; const fly = eio(clamp(p / 0.7)); const hitT = 0.7, boom = prog(p, hitT, hitT + 0.5); const x = lerp(1500, sx + 20, fly) + boom * 0; const y = lerp(380, gy, fly); c.save(); c.globalAlpha *= (1 - boom); c.translate(x, y); c.rotate(boom * 0.4); const w = chip(c, s, 0, 0, { color: MUTED, size: 24, family: MONO, weight: 500, fill: INK, alpha: 1 }); c.strokeStyle = RED; c.lineWidth = 4; c.globalAlpha *= clamp((p - 0.55) * 6); c.beginPath(); c.moveTo(14, 0); c.lineTo(w - 14, 0); c.stroke(); c.restore();
    if (boom > 0 && boom < 1) { const r = rng(7 + i); for (let k = 0; k < 14; k++) { const a = r() * TAU, d = boom * (40 + r() * 90); c.fillStyle = `rgba(255,106,77,${1 - boom})`; c.fillRect(sx + 20 + Math.cos(a) * d, gy + Math.sin(a) * d, 5, 5); } } });
  stamp(c, '0 OPINIONS OF ITS OWN', 1270, 840, t, 4.4, { size: 40, rot: -0.07 });
}
function cardWorks(c, t) {
  cardHeader(c, 3, ['Open it.', 'It works.'], 'No sign-in. No install. Nothing stored.', t);
  const bw = 1180, bx = 120, by = 440, a = eo3(prog(t, 0.2, 0.6)); c.save(); c.globalAlpha *= a; card(c, bx, by, bw, 86, { fill: INK2, border: VERM, lw: 3, r: 43, glow: VERM });
  c.strokeStyle = PAPER; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(bx + 56, by + 36, 12, Math.PI, TAU - 0.5); c.stroke(); rr(c, bx + 40, by + 38, 32, 24, 5); c.stroke();
  mono(c, typed('murmur-voice-review.netlify.app', t, 0.4, 21), bx + 100, by + 44, { size: 38, color: PAPER, base: 'middle' }); c.restore();
  const items = ['No sign-in', 'No install', 'Nothing stored on the server', 'Any public GitHub PR', 'Open right now'];
  items.forEach((s, i) => { const t0 = 2.0 + i * 0.5, p = prog(t, t0, t0 + 0.3); if (p <= 0) return; const col = i % 2, row = Math.floor(i / 2), x = 140 + col * 620, y = 620 + row * 100; c.save(); c.globalAlpha *= clamp(p * 2); c.translate((1 - eo3(p)) * -30, 0); check(c, x + 28, y, 28, p); txt(c, s, x + 78, y + 12, { size: 38, weight: 600 }); c.restore(); });
  const pa = eo3(prog(t, 3.8, 4.3)); if (pa > 0) { c.save(); c.globalAlpha *= pa; const pulse = 1 + 0.03 * Math.sin(t * 8); c.translate(1560, 700); c.scale(pulse, pulse); card(c, -170, -70, 340, 140, { fill: VERM, border: VERM, r: 70, glow: VERM }); txt(c, 'GO →', 0, 18, { size: 62, weight: 800, color: INK, align: 'center' }); c.restore(); }
}
function sceneStand(c, T) {
  bg(c);
  let i = CARDS.findIndex((k) => T < k.b); if (i < 0) i = CARDS.length - 1;
  const draw = (k, tt, dx, al) => { c.save(); c.globalAlpha *= al; c.translate(dx, 0); ({ receipt: cardReceipt, gate: cardGate, only: cardOnly, works: cardWorks })[CARDS[k].k](c, tt); c.restore(); };
  const t = T - CARDS[i].a; if (i > 0 && t < 0.5) { const p = eo3(t / 0.5); draw(i - 1, CARDS[i - 1].b - CARDS[i - 1].a + t, -p * 500, 1 - p); draw(i, t, (1 - p) * 500, p); } else draw(i, Math.max(0, t), 0, 1);
  if (T < CARDS[0].a + 1.0) { const p = eo3((T - 70) / 1.0); void p; }
  // progress pips
  CARDS.forEach((k, j) => { c.fillStyle = j === i ? VERM : j < i ? '#6b6657' : LINE; rr(c, 1700 + j * 36, 60, 26, 8, 4); c.fill(); });
}

// ------------------------------------------------------------------ scene 5: the details
const DETAILS = [['5 severity levels', 'dots'], ['Edit or dismiss any comment'], ['Suggested code becomes a GitHub suggestion'], ['Copy as markdown'], ['Post as a real GitHub review'], ['⌘ / Ctrl + Enter to run'], ['One-click sample PR'], ['Autosaves your draft'], ['Skips lockfiles and binaries'], ['Rate-limited demo key'], ['Unit tests on the anchor check'], ['Light and dark']];
function sceneAddons(c, t) {
  bg(c);
  disp(c, '…and the details.', 120, 170, { size: 92, alpha: eo3(prog(t, 0.05, 0.5)) });
  DETAILS.forEach((d, i) => { const col = i % 3, row = Math.floor(i / 3), x = 120 + col * 400, y = 250 + row * 168, p = ebk(prog(t, 0.5 + i * 0.4, 0.9 + i * 0.4)); if (p <= 0) return;
    c.save(); c.globalAlpha *= clamp(p * 2); c.translate(x + 190, y + 66); c.scale(lerp(0.85, 1, p), lerp(0.85, 1, p)); card(c, -190, -66, 380, 132, { fill: INK2, border: i === 0 ? VERM : LINE, lw: 2.5, r: 16 });
    const lines = wrapLines(c, d[0], 320, `600 27px ${TEXT}`); lines.forEach((l, k) => txt(c, l, -160, -10 + k * 34 - (lines.length - 1) * 8 + (d[1] ? -12 : 0), { size: 27, weight: 600 }));
    if (d[1]) Object.values(SEV).forEach((col2, k) => { c.fillStyle = col2; c.beginPath(); c.arc(-146 + k * 38, 38, 12, 0, TAU); c.fill(); });
    c.restore(); });
  // the phone
  const pp = eo3(prog(t, 4.9, 5.9)); if (pp > 0) { const im = frameCache.get('mobile'); c.save(); c.globalAlpha *= pp; c.translate(1340, 100 + (1 - pp) * 220); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 50; card(c, 0, 0, 400, 800, { fill: '#0b0a08', border: '#4a463a', lw: 4, r: 52 }); c.shadowBlur = 0;
    if (im) { c.save(); rr(c, 14, 14, 372, 772, 40); c.clip(); c.drawImage(im, 14, 14, 372, 805); const fg = c.createLinearGradient(0, 690, 0, 786); fg.addColorStop(0, 'rgba(11,10,8,0)'); fg.addColorStop(0.55, 'rgba(11,10,8,0.96)'); fg.addColorStop(1, '#0b0a08'); c.fillStyle = fg; c.fillRect(14, 690, 372, 96); c.fillStyle = 'rgba(243,239,230,0.55)'; rr(c, 140, 764, 120, 6, 3); c.fill(); c.restore(); }
    c.fillStyle = '#0b0a08'; rr(c, 150, 22, 100, 24, 12); c.fill(); c.restore();
    txt(c, 'Phone-ready. No sideways scroll.', 1540, 944, { size: 26, weight: 600, color: MUTED, align: 'center', alpha: pp }); }
}

// ------------------------------------------------------------------ scene 6: the scorecard and close
const SCORE = [['30', 'Real problem in my work', 'Reviewing is typing-heavy. Murmur removes the typing.'], ['30', 'Wispr used meaningfully', 'Voice is the input. Flow types straight into it.'], ['25', 'It works', 'Live. No sign-in. Real pull requests, real comments.'], ['15', 'Clear demo', 'Paste. Talk. Review. In under two minutes.']];
function sceneClose(c, t) {
  bg(c);
  const rowsOut = 1 - eo3(prog(t, 2.8, 3.3));
  if (rowsOut > 0) {
    c.save(); c.globalAlpha *= rowsOut; c.translate(0, (1 - rowsOut) * -40);
    txt(c, 'THE FOUR QUESTIONS', 160, 110, { size: 24, weight: 800, color: MUTED, ls: 6 });
    SCORE.forEach((s, i) => { const t0 = 0.4 + i * 0.6, p = eo3(prog(t, t0 - 0.2, t0 + 0.2)); if (p <= 0) return; const y = 150 + i * 190; c.save(); c.globalAlpha *= p; c.translate((1 - p) * 120, 0);
      card(c, 160, y, 1600, 160, { fill: INK2, border: LINE, r: 18 }); const bw = 1600 * (parseInt(s[0], 10) / 30) * 0 + 0; void bw;
      disp(c, `${s[0]}%`, 200, y + 110, { size: 98, color: VERM }); txt(c, s[1], 470, y + 70, { size: 46, weight: 700 }); txt(c, s[2], 470, y + 122, { size: 30, weight: 500, color: MUTED });
      const fill = eo3(prog(t, t0, t0 + 0.7)); c.fillStyle = INK3; rr(c, 1330, y + 62, 250, 12, 6); c.fill(); c.fillStyle = VERM; rr(c, 1330, y + 62, Math.max(8, 250 * fill * (parseInt(s[0], 10) / 30)), 12, 6); c.fill();
      check(c, 1666, y + 80, 34, prog(t, t0 + 0.1, t0 + 0.4)); c.restore(); });
    c.restore();
  }
  if (t >= 3.0) {
    const p = t - 3.0; if (p < 0.2) { c.fillStyle = `rgba(243,239,230,${0.3 * (1 - p / 0.2)})`; c.fillRect(0, 0, W, H); }
    thread(c, 140, 1780, 700, 16 + 10 * Math.sin(t * 2), t, { p: eo3(prog(t, 3.1, 4.0)), lw: 6 });
    slam(c, 'SAY IT.', W / 2, 390, t, 3.0, { size: 230, align: 'center', color: PAPER });
    slam(c, 'SHIP THE REVIEW.', W / 2, 620, t, 3.25, { size: 190, align: 'center', color: VERM });
    txt(c, typed('murmur-voice-review.netlify.app', t, 5.0, 24), W / 2, 800, { size: 70, weight: 700, align: 'center', color: MUST });
    txt(c, typed('github.com/jenish1345/murmur', t, 6.4, 26), W / 2, 878, { size: 44, weight: 500, align: 'center' });
    mono(c, 'BUILT FOR NO HANDS  ·  WEMAKEDEVS × WISPR FLOW', W / 2, 950, { size: 24, color: MUTED, align: 'center', ls: 4, alpha: eo3(prog(t, 7.2, 7.8)) });
  }
  const f = prog(t, 9.1, 9.9); if (f > 0) { c.fillStyle = `rgba(20,19,15,${f})`; c.fillRect(0, 0, W, H); }
}

// ------------------------------------------------------------------ composition
const SCENES = { race: sceneRace, title: sceneTitle, demo: (c, t) => sceneDemo(c, S.demo[0] + t), stand: (c, t) => sceneStand(c, S.stand[0] + t), addons: sceneAddons, close: sceneClose };
const ORDER = Object.keys(S);
const sceneAt = (T) => ORDER.find((k) => T >= S[k][0] && T < S[k][1]) ?? ORDER[ORDER.length - 1];
function drawScene(c, name, T) { c.save(); c.clearRect(0, 0, W, H); SCENES[name](c, Math.max(0, T - S[name][0])); c.restore(); }
function neededFootage(T) {
  const names = new Set([sceneAt(T)]);
  for (const tr of TRANS) if (Math.abs(T - tr.at) <= tr.d / 2 + 0.05) { names.add(sceneAt(tr.at - 0.01)); names.add(sceneAt(tr.at + 0.01)); }
  return names.has('demo') ? [fidx(Math.min(Math.max(T, S.demo[0]), S.demo[1] - 0.001))] : [];
}

function transition(T, tr) {
  const a = sceneAt(tr.at - 0.01), b = sceneAt(tr.at + 0.01), p = eio((T - (tr.at - tr.d / 2)) / tr.d);
  drawScene(gA, a, Math.min(T, S[a][1] + 0.6)); drawScene(gB, b, Math.max(T, S[b][0]));
  const c = ctx; c.drawImage(cA, 0, 0);
  if (tr.type === 'iris') {
    c.save(); c.beginPath(); c.arc(W / 2, H / 2, p * 1250, 0, TAU); c.clip(); c.drawImage(cB, 0, 0); c.restore();
    c.strokeStyle = VERM; c.lineWidth = 8; c.beginPath(); c.arc(W / 2, H / 2, p * 1250, 0, TAU); c.stroke();
  } else if (tr.type === 'eq') { // an equaliser: columns rise like spectrum bars
    const n = 48, bw = W / n, r = rng(5); for (let k = 0; k < n; k++) { const jitter = r() * 0.55, hgt = H * clamp(p * 1.7 - jitter); c.save(); c.beginPath(); c.rect(k * bw, H - hgt, bw + 1, hgt); c.clip(); c.drawImage(cB, 0, 0); c.restore(); if (hgt > 0 && hgt < H) { c.fillStyle = VERM; c.fillRect(k * bw + 2, H - hgt - 5, bw - 4, 6); } }
  } else if (tr.type === 'thread') { // a voice waveform sweeps across and wipes the old scene
    const xs = lerp(-200, W + 200, p); c.save(); c.beginPath(); c.moveTo(0, 0); for (let y = 0; y <= H; y += 8) c.lineTo(xs + Math.sin(y * 0.02 + T * 12) * 70 * Math.sin(p * Math.PI) + wv(y, T) * 40, y); c.lineTo(0, H); c.closePath(); c.clip(); c.drawImage(cB, 0, 0); c.restore();
    c.save(); c.strokeStyle = VERM; c.lineWidth = 8; c.shadowColor = VERM; c.shadowBlur = 24; c.beginPath(); for (let y = 0; y <= H; y += 8) { const x = xs + Math.sin(y * 0.02 + T * 12) * 70 * Math.sin(p * Math.PI) + wv(y, T) * 40; y ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.restore();
  } else if (tr.type === 'glitch') {
    c.clearRect(0, 0, W, H); c.drawImage(p < 0.5 ? cA : cB, 0, 0);
    const r = rng(Math.floor(T * FPS) * 977 + 13), amp = Math.sin(p * Math.PI);
    for (let k = 0; k < 18; k++) { const y = Math.floor(r() * H), h = 20 + Math.floor(r() * 90), off = (r() - 0.5) * 360 * amp, src = p < 0.5 ? cA : cB; c.drawImage(src, 0, y, W, h, off, y, W, h); }
    c.fillStyle = `rgba(255,106,77,${0.12 * amp})`; c.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------------ captions: a clean ink bar, the spoken word lights up, a vermilion line walks under it
let VOL = [];
const prepVO = (ln) => {
  const words = ln.text.split(/\s+/), wt = words.map((w) => w.replace(/[^\w']/g, '').length + 1.5 + (/[.?!:;]$/.test(w) ? 3 : /[,]$/.test(w) ? 1.5 : 0) + (/\.\.\.$/.test(w) ? 2 : 0));
  const total = wt.reduce((a, b) => a + b, 0), span = ln.dur * 0.97; let acc = 0;
  const ws = words.map((w, i) => { const a = ln.t + (acc / total) * span; acc += wt[i]; return { w, a, b: ln.t + (acc / total) * span }; });
  const chunks = []; let cur = [];
  for (const k of ws) { const len = cur.reduce((n, x) => n + x.w.length + 1, 0); if (cur.length && len + k.w.length > 44) { chunks.push(cur); cur = []; } cur.push(k); if (/[.?!:]$/.test(k.w) && cur.length >= 3) { chunks.push(cur); cur = []; } }
  if (cur.length) { if (cur.length < 2 && chunks.length) chunks[chunks.length - 1].push(...cur); else chunks.push(cur); }
  return { ...ln, chunks: chunks.map((words, i) => ({ words, a: words[0].a, b: i + 1 < chunks.length ? chunks[i + 1][0].a : ln.t + ln.dur + 0.3 })) };
};
function drawCaption(c, T) {
  for (const ln of VOL) {
    if (ln.nocap || T < ln.t - 0.05 || T > ln.t + ln.dur + 0.4) continue;
    const ch = ln.chunks.find((k) => T >= k.a - 0.05 && T < k.b); if (!ch) continue;
    const inn = eo3((T - (ch.a - 0.05)) / 0.2), out = 1 - eo3((T - (ch.b - 0.22)) / 0.22), a = Math.min(inn, ch === ln.chunks[ln.chunks.length - 1] ? out : 1);
    if (a <= 0.01) continue;
    c.save(); c.globalAlpha *= a; c.font = `600 44px ${TEXT}`; c.textBaseline = 'alphabetic';
    const sp = c.measureText(' ').width, ww = ch.words.map((k) => c.measureText(k.w).width), tw = ww.reduce((x, y) => x + y, 0) + sp * (ww.length - 1);
    const pw = tw + 100, ph = 70, x0 = 960 - pw / 2, y0 = 1002 + (1 - inn) * 14;
    c.fillStyle = 'rgba(14,13,10,0.94)'; rr(c, x0, y0, pw, ph, 16); c.fill(); c.strokeStyle = 'rgba(243,239,230,0.22)'; c.lineWidth = 2; rr(c, x0, y0, pw, ph, 16); c.stroke();
    c.fillStyle = VERM; rr(c, x0, y0 + 14, 7, ph - 28, 3.5); c.fill();
    let x = x0 + 50; const by = y0 + 49;
    ch.words.forEach((k, i) => {
      const state = T >= k.b ? 2 : T >= k.a ? 1 : 0;
      c.fillStyle = state === 1 ? VERM : state === 2 ? PAPER : 'rgba(154,149,133,0.7)';
      c.fillText(k.w, x, by - (state === 1 ? 2 : 0));
      if (state === 1) { const p = prog(T, k.a, k.b), e = x + ww[i] * p; c.strokeStyle = VERM; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y0 + ph - 9); c.lineTo(e, y0 + ph - 9); c.stroke(); }
      x += ww[i] + sp;
    });
    c.restore();
  }
}

let _o; const scratch = () => (_o ??= mk());
function compose(T) {
  const tr = TRANS.find((x) => T >= x.at - x.d / 2 && T < x.at + x.d / 2);
  if (tr) transition(T, tr); else { ctx.clearRect(0, 0, W, H); drawScene(ctx, sceneAt(T), T); }
  let sx = 0, sy = 0, fl = 0;
  for (const h of HITS) { const d = T - h; if (d >= 0 && d < 0.45) { const k = Math.exp(-d * 13); sx += Math.sin(d * 120) * 12 * k; sy += Math.cos(d * 97) * 8 * k; fl += 0.09 * k; } }
  if (sx || sy) { const oc = scratch(); oc.getContext('2d').clearRect(0, 0, W, H); oc.getContext('2d').drawImage(cv, 0, 0); ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H); ctx.drawImage(oc, sx, sy); }
  if (fl > 0.01) { ctx.fillStyle = `rgba(243,239,230,${Math.min(0.16, fl)})`; ctx.fillRect(0, 0, W, H); }
  drawCaption(ctx, T);
}

window.setFrameCount = (n) => { FRAME_COUNT = n; };
window.renderFrame = async (f) => { const T = f / FPS; await Promise.all(neededFootage(T).map(ensure)); compose(T); return true; };
window.ready = Promise.all([
  fetch('/out/vo.json').then((r) => (r.ok ? r.json() : [])).then((j) => { VOL = j.map(prepVO); }),
  fetch('/footage/marks.json').then((r) => r.json()).then((j) => { setMarks(j.marks); FRAME_COUNT = j.frames; }),
  ensureImg('/footage/mobile-results.png', 'mobile'),
  document.fonts.load('900 100px "Fraunces"'), document.fonts.load('italic 500 100px "Fraunces"'), document.fonts.load('600 40px "Inter Tight"'), document.fonts.load('800 40px "Inter Tight"'), document.fonts.load('500 40px "JetBrains Mono"'), document.fonts.load('700 40px "JetBrains Mono"'),
]).then(() => document.fonts.ready).then(() => true);
