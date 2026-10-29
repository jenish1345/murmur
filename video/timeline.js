// One clock for picture and sound. Everything is in seconds on the final film's timeline.
export const FPS = 30, W = 1920, H = 1080;

// scene → [start, end]
export const S = {
  race: [0, 11.5], title: [11.5, 21], demo: [21, 70], stand: [70, 99], addons: [99, 108], close: [108, 118],
};
export const TOTAL = 118;

// transitions at scene boundaries (centered on `at`)
export const TRANS = [
  { at: 11.5, type: 'glitch', d: 0.6 }, { at: 21, type: 'eq', d: 0.9 }, { at: 70, type: 'thread', d: 0.9 },
  { at: 99, type: 'eq', d: 0.8 }, { at: 108, type: 'iris', d: 0.8 },
];

// the four "only Murmur" cards inside the stand scene
export const CARDS = [{ k: 'receipt', a: 70.4, b: 80.2 }, { k: 'gate', a: 80.2, b: 88.2 }, { k: 'only', a: 88.2, b: 94.2 }, { k: 'works', a: 94.2, b: 99 }];

// ---------------------------------------------------------------- real footage: film time → footage time
export const FOOT = [
  { v: [21, 27], f: [7.0, 13.0] },
  { v: [27, 28], f: [14.6, 16.1] },
  { v: [28, 36], f: [16.14, 21.34] },
  { v: [36, 39.5], f: [21.35, 24.3] },
  { v: [39.5, 41.5], f: [24.3, 26.1] },
  { v: [41.5, 45.5], f: [26.1, 29.96] },
  { v: [45.5, 57], f: [29.96, 41.4] },
  { v: [57, 62.5], f: [43.15, 47.9] },
  { v: [62.5, 70], f: [48.6, 55.4] },
];
export function footageTime(T) {
  for (const s of FOOT) if (T >= s.v[0] && T < s.v[1]) return s.f[0] + (s.f[1] - s.f[0]) * ((T - s.v[0]) / (s.v[1] - s.v[0]));
  return T < FOOT[0].v[0] ? FOOT[0].f[0] : FOOT[FOOT.length - 1].f[1];
}
// inverse: when (film time) does a footage moment happen?
export function vAt(f) {
  for (const s of FOOT) if (f >= s.f[0] && f <= s.f[1]) return s.v[0] + (s.v[1] - s.v[0]) * ((f - s.f[0]) / (s.f[1] - s.f[0]));
  return f < FOOT[0].f[0] ? FOOT[0].v[0] : FOOT[FOOT.length - 1].v[1];
}
export let MK = {}; // footage marks (seconds in the footage), set from footage/marks.json
export const setMarks = (m) => { MK = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.t])); };

// beats the picture and the sound share
export const E1 = { go: 1.9, raceEnd: 7.9, faster: 7.4, scatter: 8.7, noLine: 10.0 };
export const E2 = { letters: 12.6, tag: 14.2, pill: 16.2, small: 17.8 };
export const TALK = { a: 28.0, b: 36.0 }; // the "hold the hotkey and talk" stretch drawn over the footage
export const HITS = [7.4, 10.0, 12.9, 36.0, 58.3 /* trace click */, 108.9, 112.0];

// ---------------------------------------------------------------- narration  (say = what the TTS reads; text = what the captions show)
export const VO = [
  { t: 0.7, text: 'Every code review starts the same way.' },
  { t: 3.5, text: 'You read the code. Then you type every single thought.' },
  { t: 7.0, text: 'You speak three times faster than you type. But speech has no line numbers.' },
  { t: 12.5, text: 'This is Murmur.' },
  { t: 13.9, text: 'Review pull requests by talking. Powered by your voice, and Wispr Flow.', say: 'Review pull requests by talking. Powered by your voice, and Whisper Flow.' },
  { t: 21.8, text: 'Paste any public pull request. Murmur pulls the real diff. No sign-in.' },
  { t: 27.7, text: 'Now just talk. Hold your Wispr Flow hotkey, and ramble. Release, and Flow types it into the box.', say: 'Now just talk. Hold your Whisper Flow hotkey, and ramble. Release, and Flow types it into the box.' },
  { t: 35.2, text: "Name a file. Say what worries you. It doesn't have to be neat." },
  { t: 40.1, text: 'One click. Murmur reads the diff, and pins each thought to a real line.' },
  { t: 47.6, text: 'Severity. The exact line. And your own sentence, attached as the receipt.' },
  { t: 57.5, text: 'Click what you said, and it jumps to the comment.' },
  { t: 63.0, text: 'Then copy it as markdown, or post it as a real GitHub review.' },
  { t: 70.9, text: 'Four things make Murmur different.' },
  { t: 74.0, text: 'One. Every comment carries your own words. Your sentence is the receipt.' },
  { t: 80.7, text: "Two. It can't invent a line. Every anchor is checked against the real diff, and failures are shown as unpinned." },
  { t: 88.5, text: 'Three. It says only what you said. No opinions of its own.' },
  { t: 94.4, text: 'Four. It just works. Live, no sign-in, nothing stored.' },
  { t: 99.6, text: 'And the details. Severity levels, suggested code, shortcuts, a phone layout, and tests.' },
  { t: 111.0, text: 'Murmur. Say it. Ship the review.' },
  { t: 114.1, text: 'Live now. Open it, and talk.' },
];

// ---------------------------------------------------------------- music sections (audio.py reads these)
export const MUSIC = [
  { t0: 0, t1: 11.5, gain: 0.5, arp: 0, drums: 0, dark: 0.85 },
  { t0: 11.5, t1: 21, gain: 1.0, arp: 1, drums: 1, dark: 0 },
  { t0: 21, t1: 70, gain: 0.7, arp: 0.7, drums: 1, dark: 0 },
  { t0: 70, t1: 99, gain: 0.95, arp: 1, drums: 2, dark: 0 },
  { t0: 99, t1: 108, gain: 1.0, arp: 1, drums: 2, dark: 0 },
  { t0: 108, t1: 118, gain: 0.85, arp: 0.8, drums: 1, dark: 0, resolve: 1 },
];
export const RESOLVE_AT = 111.0;

// ---------------------------------------------------------------- sound cues
// type: whoosh(dir,dur) pop(f) tick(f) slam thud ping(f) tension(dur) clang(f) chime riser(dur) downfall(dur)
//       bwomp stamp glitch(dur) type(n,dur) count(n,dur) swell(dur) scribe(dur) hit
export function buildCues() {
  const cues = [];
  const cue = (t, type, o = {}) => cues.push({ t: +t.toFixed(3), type, ...o });
  const note = (base, semis) => base * Math.pow(2, semis / 12);

  // 1  the race
  cue(0.1, 'swell', { dur: 3 });
  [0.35, 0.9].forEach((t) => cue(t, 'tick', { f: 1100 }));
  cue(1.0, 'whoosh', { dir: 'in', dur: 0.8 });
  cue(1.4, 'tick', { f: 900 }); cue(1.65, 'tick', { f: 1100 }); cue(E1.go, 'ping', { f: 1320 });
  cue(E1.go, 'type', { n: 24, dur: 5.6 }); // the slow one
  for (let i = 0; i < 14; i++) cue(E1.go + 0.2 + i * 0.37, 'tick', { f: 1700 + (i % 3) * 120 }); // the fast one, a soft patter
  cue(5.7, 'ping', { f: 1760 }); cue(6.0, 'riser', { dur: 1.4 });
  cue(E1.faster, 'slam');
  cue(E1.scatter - 0.1, 'downfall', { dur: 1.2 }); cue(9.0, 'bwomp'); [9.1, 9.5, 9.85].forEach((t, i) => cue(t, 'pop', { f: 300 + i * 40 }));
  cue(E1.noLine, 'slam'); cue(10.9, 'glitch', { dur: 0.5 });

  // 2  title
  cue(11.5, 'hit'); cue(11.9, 'whoosh', { dir: 'up', dur: 0.9 });
  [0, 2, 4, 7, 9, 12].forEach((s, i) => cue(E2.letters + 0.14 * i, 'pop', { f: note(392, s) }));
  cue(13.55, 'chime'); cue(E2.tag, 'type', { n: 30, dur: 1.9 });
  cue(E2.pill, 'whoosh', { dir: 'in', dur: 0.6 }); cue(E2.pill + 0.5, 'ping', { f: 1175 });
  cue(19.6, 'riser', { dur: 1.2 });

  // 3  the demo, tied to the footage moments
  const V = (k) => vAt(MK[k] ?? 0);
  cue(20.9, 'whoosh', { dir: 'up', dur: 0.8 });
  cue(V('urlFocus') - 0.15, 'tick', { f: 1000 });
  cue(V('urlFocus'), 'type', { n: 46, dur: V('urlTyped') - V('urlFocus') });
  cue(V('prLoaded'), 'pop', { f: 660 }); cue(V('prLoaded') + 0.05, 'whoosh', { dir: 'in', dur: 0.6 });
  cue(V('talkFocus') - 0.1, 'tick', { f: 900 }); cue(TALK.a + 0.1, 'swell', { dur: 6.8 });
  for (let i = 0; i < 16; i++) cue(TALK.a + 0.6 + i * 0.46, 'tick', { f: 1500 + 110 * (i % 4) });
  cue(TALK.b - 0.25, 'tick', { f: 700 }); cue(TALK.b, 'pop', { f: 520 }); cue(TALK.b + 0.05, 'whoosh', { dir: 'in', dur: 0.7 }); cue(TALK.b + 0.4, 'ping', { f: 1046 });
  cue(V('run') - 0.2, 'tick', { f: 1100 }); cue(V('run'), 'stamp'); cue(V('run') + 0.2, 'tension', { dur: V('results') - V('run') - 0.2 });
  cue(V('results'), 'chime'); [0, 1, 2].forEach((i) => cue(V('results') + 0.15 + i * 0.28, 'pop', { f: note(523, [0, 4, 7][i]) }));
  cue(vAt(32.8), 'whoosh', { dir: 'up', dur: 0.8 }); cue(vAt(35.4), 'ping', { f: 880 });
  cue(vAt(44.3), 'tick', { f: 1200 }); cue(vAt(44.55), 'ping', { f: 1320 }); cue(vAt(44.6), 'whoosh', { dir: 'up', dur: 0.6 });
  cue(vAt(49.7), 'tick', { f: 1000 }); cue(V('copied'), 'chime');
  cue(vAt(52.6), 'tick', { f: 900 }); cue(vAt(52.9), 'pop', { f: 740 });
  cue(69.4, 'riser', { dur: 0.7 });

  // 4  four things only Murmur does
  cue(70.0, 'whoosh', { dir: 'up', dur: 0.8 }); cue(70.45, 'hit'); cue(71.4, 'ping', { f: 988 });
  // A  receipt
  cue(74.3, 'tick', { f: 1000 }); cue(75.2, 'whoosh', { dir: 'in', dur: 1.2 }); cue(77.0, 'stamp'); cue(77.15, 'ping', { f: 1568 });
  // B  the gate
  cue(80.2, 'whoosh', { dir: 'out', dur: 0.5 }); cue(81.6, 'tick', { f: 1300 }); cue(82.3, 'pop', { f: 659 }); cue(83.2, 'pop', { f: 784 });
  cue(84.2, 'tension', { dur: 0.9 }); cue(85.1, 'clang', { f: 330 }); cue(85.15, 'downfall', { dur: 0.9 }); cue(86.4, 'thud');
  // C  only what you said
  cue(88.2, 'whoosh', { dir: 'out', dur: 0.5 });
  [89.5, 90.4, 91.3].forEach((t, i) => { cue(t, 'glitch', { dur: 0.15 }); cue(t + 0.1, 'pop', { f: 220 + i * 30 }); });
  cue(92.6, 'stamp'); cue(92.7, 'slam');
  // D  just works
  cue(94.2, 'whoosh', { dir: 'out', dur: 0.5 }); cue(94.6, 'type', { n: 31, dur: 1.5 });
  [96.2, 96.7, 97.2, 97.7, 98.2].forEach((t, i) => cue(t, 'ping', { f: note(659, [0, 2, 4, 7, 9][i]) }));

  // 5  the details
  cue(99.0, 'whoosh', { dir: 'up', dur: 0.7 });
  for (let i = 0; i < 12; i++) cue(99.5 + i * 0.4, 'tick', { f: 1000 + 70 * (i % 6) });
  cue(103.9, 'whoosh', { dir: 'in', dur: 0.6 }); cue(104.5, 'ping', { f: 1397 });

  // 6  the scorecard and close
  cue(107.8, 'riser', { dur: 0.6 });
  [108.4, 109.0, 109.6, 110.2].forEach((t, i) => { cue(t, 'stamp'); cue(t + 0.05, 'ping', { f: note(784, [0, 4, 7, 12][i]) }); });
  cue(111.0, 'hit'); cue(111.05, 'slam'); cue(111.15, 'chime');
  cue(113.0, 'type', { n: 30, dur: 1.4 }); cue(114.8, 'ping', { f: 1568 });
  return cues;
}
