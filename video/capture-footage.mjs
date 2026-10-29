// Records REAL footage of the live Murmur app: a scripted, human-paced session driven through Chrome.
//   node capture-footage.mjs            (uses the live site, real model call)
// Output: footage/frames/%06d.jpg at a constant 30 fps, footage/marks.json (named moments + element rects),
//         footage/mobile-results.png, footage/mobile-hero.png, footage/result.json (what the model really returned)
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'footage');
const FRAMES = join(OUT, 'frames');
const BASE = process.env.MURMUR_URL || 'https://murmur-voice-review.netlify.app';
const PR = 'https://github.com/expressjs/express/pull/7459';
const W = 1600, H = 900, FPS = 30;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// what a developer might actually say; Wispr Flow pastes the finished utterance when the hotkey is released
const RAMBLE = "Okay, this express pull request fixes the ETag getting skipped when Transfer-Encoding is set. The core fix in response dot js is right, it always computes the length and only guards the Content-Length header. I like that. One question though, what happens with an empty body? And the test only covers a string body, I'd want a buffer case too.";

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text', `--window-size=${W},${H}`, '--force-dark-mode', '--enable-features=WebContentsForceDark'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
});
await browser.defaultBrowserContext().overridePermissions(BASE, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
const client = await page.createCDPSession();
const frames = [];
client.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  frames.push({ t: metadata.timestamp, data });
  try { await client.send('Page.screencastFrameAck', { sessionId }); } catch { /* closing */ }
});

let result = null;
page.on('response', async (res) => {
  if (res.url().endsWith('/api/review') && res.ok()) { try { result = await res.json(); } catch { /* ignore */ } }
});

const marks = {};
let t0 = null;
const now = () => Date.now() / 1000;
const mark = async (name, selectors = []) => {
  const t = now();
  const rects = await page.evaluate((sels) => Object.fromEntries(sels.map((s) => [s, [...document.querySelectorAll(s)].slice(0, 8).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })])), selectors);
  marks[name] = { t, rects };
};

let mx = 800, my = 450;
const glide = async (x, y, ms = 700) => {
  const sx = mx, sy = my, steps = Math.max(8, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const e = i / steps, k = e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
    await page.mouse.move(sx + (x - sx) * k, sy + (y - sy) * k);
    await sleep(ms / steps);
  }
  mx = x; my = y;
};
const center = async (sel, i = 0) => page.evaluate((s, k) => { const e = document.querySelectorAll(s)[k]; if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel, i);
const byText = async (tag, text) => page.evaluate((t, x) => { const e = [...document.querySelectorAll(t)].find((n) => n.textContent.trim().startsWith(x)); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, tag, text);
const clickXY = async (c, ms = 800) => { if (!c) throw new Error('missing target'); await glide(c[0], c[1], ms); await sleep(160); await page.mouse.down(); await sleep(70); await page.mouse.up(); };

await client.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
t0 = now();

try {
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.mouse.move(mx, my);
  await sleep(2600);
  await mark('hero', ['h1', '#pr', 'button']);

  await clickXY(await center('#pr'), 1000);
  await mark('urlFocus', ['#pr']);
  await page.keyboard.type(PR, { delay: 38 });
  await mark('urlTyped', ['#pr']);
  await page.waitForSelector('textarea', { timeout: 30000 });
  await mark('prLoaded', ['textarea', 'aside', 'section']);
  await sleep(2400);

  await clickXY(await center('textarea'), 900);
  await mark('talkFocus', ['textarea', 'aside']);
  await sleep(5200); // the film draws the "hold your hotkey and talk" moment over this stretch
  await mark('talkRelease', ['textarea']);
  await page.evaluate((text) => { // Wispr Flow pastes the finished utterance in one go
    const ta = document.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, text);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, RAMBLE);
  await mark('talkDone', ['textarea', 'aside']);
  await sleep(2600);

  const run = await byText('button', 'Turn it into a review');
  await clickXY(run, 900);
  await mark('run', ['aside']);
  await page.waitForFunction(() => document.body.innerText.includes('Copy review'), { timeout: 90000 });
  await mark('results', ['aside', 'mark']);
  await sleep(2800);

  // first comment on the diff
  await page.evaluate(() => document.getElementById('cm-c0')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await sleep(2600);
  await mark('comments', ['[id^="cm-"]']);
  await sleep(1400);
  const ids = await page.evaluate(() => [...document.querySelectorAll('[id^="cm-"]')].map((e) => e.id));
  if (ids[1]) { await page.evaluate((id) => document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'center' }), ids[1]); await sleep(2200); }
  if (ids[2]) { await page.evaluate((id) => document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'center' }), ids[2]); await sleep(2200); }
  await mark('comments2', ['[id^="cm-"]']);

  // trace: click a highlighted phrase in "What you said"
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(1500);
  const markCenters = await page.evaluate(() => [...document.querySelectorAll('mark')].map((e) => { const r = e.getBoundingClientRect(); return [r.x + Math.min(r.width / 2, 120), r.y + r.height / 2]; }));
  await mark('beforeTrace', ['mark', 'aside']);
  await clickXY(markCenters[Math.min(2, markCenters.length - 1)], 1000);
  await sleep(2600);
  await mark('traced', ['[id^="cm-"]', 'mark']);

  // dismiss one, then ship it
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(1400);
  const copy = await byText('button', 'Copy review');
  await mark('beforeCopy', ['aside', 'button']);
  await clickXY(copy, 900);
  await sleep(300);
  await mark('copied', ['button']);
  await sleep(1300);
  const post = await byText('summary', 'Post to GitHub');
  if (post) { await clickXY(post, 800); await sleep(1800); }
  await mark('post', ['details']);
  await sleep(800);
} finally {
  const tEnd = now();
  await client.send('Page.stopScreencast').catch(() => {});

  // ---- mobile stills (real, from the live site)
  try {
    const m = await browser.newPage();
    await m.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await m.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await m.goto(BASE, { waitUntil: 'networkidle2' });
    await sleep(800);
    await m.screenshot({ path: join(OUT, 'mobile-hero.png') });
    await m.type('#pr', PR, { delay: 5 });
    await m.waitForSelector('textarea', { timeout: 30000 });
    await m.evaluate((text) => {
      const ta = document.querySelector('textarea');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, text);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, RAMBLE);
    await sleep(400);
    await m.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Turn it into a review')).click());
    await m.waitForFunction(() => document.body.innerText.includes('Copy review'), { timeout: 90000 });
    await sleep(1200);
    await m.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    await m.screenshot({ path: join(OUT, 'mobile-results.png') });
    await m.evaluate(() => document.getElementById('cm-c0')?.scrollIntoView({ block: 'center' }));
    await sleep(600);
    await m.screenshot({ path: join(OUT, 'mobile-diff.png') });
  } catch (e) { console.error('mobile stills failed:', e.message); }

  await browser.close();
  marks._start = { t: t0, rects: {} }; marks._end = { t: tEnd, rects: {} };

  frames.sort((a, b) => a.t - b.t);
  const dur = tEnd - t0, n = Math.floor(dur * FPS);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const tt = t0 + i / FPS;
    while (j + 1 < frames.length && frames[j + 1].t <= tt) j++;
    writeFileSync(join(FRAMES, `${String(i).padStart(6, '0')}.jpg`), Buffer.from(frames[Math.max(0, j)].data, 'base64'));
  }
  const out = { fps: FPS, width: W, height: H, frames: n, marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, { t: +(v.t - t0).toFixed(2), rects: v.rects }])) };
  writeFileSync(join(OUT, 'marks.json'), JSON.stringify(out, null, 1));
  writeFileSync(join(OUT, 'result.json'), JSON.stringify(result, null, 1));
  console.log(`captured ${frames.length} raw frames → ${n} frames @ ${FPS}fps (${dur.toFixed(1)}s)`);
  console.log(Object.entries(out.marks).map(([k, v]) => `${k}@${v.t}s`).join('  '));
  if (result) console.log('model returned', result.review?.comments?.length, 'comments,', result.review?.unmapped?.length, 'unmapped');
}
