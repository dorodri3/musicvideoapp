// polish6 focused checks with the REAL renderer (needs :8765): candy chorus friends enter/exit, heavy beast breathe vs lunge,
// cozy blanket+mug close-up, figure pinned while the plate pans (no fade/teleport) over 6 simulated minutes per style.
// Writes review-style1/polish-*.png; exits 1 on failure.
import { chromium } from '/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = '/workspace/light-show-versions/review-style1/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8765/?debug=0'); await p.waitForTimeout(1200);
const res = await p.evaluate(async () => {
  const { Renderer } = await import('/js/viz/renderer.js?v=mood3');
  const { CompositionDirector } = await import('/js/director/composition.js?v=mood3');
  const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;z-index:99999'; document.body.appendChild(c);
  const shots = {}, out = {};
  const mk = () => { const R = new Renderer(c); R._resize?.(); R.start?.(() => {}); R.stop?.(); return R; };
  const audio = (k, loud, kick) => ({ energy: loud ? 0.8 : 0.2, bass: loud ? 0.7 : 0.25, mid: 0.3, treble: 0.3, onset: 0.1, beat: k % 8 === 0, bpm: loud ? 140 : 80,
    roles: { kick: kick ? 0.95 : (loud && k % 8 === 0 ? 0.6 : 0.05), snare: 0, hats: loud ? 0.6 : 0.1, bass: loud ? 0.7 : 0.25, pads: 0.4, vocalish: 0.4, harsh: 0 } });
  const run = async (R, CD, look, preset, from, to, opt) => {
    for (let k = from; k < to; k++) {
      const now = 1000 + k * 33, sec = opt.sec(k), loud = opt.loud(k);
      CD.e = loud ? 0.85 : 0.15;
      const comp = CD.tick({ look, energy: loud ? 0.85 : 0.15, bpm: loud ? 140 : 80, lyricMood: null, sectionId: sec, now });
      R.render({ directive: { preset, styleLock: look, styleSource: 'auto', stylePending: false, intensity: loud ? 0.85 : 0.3, sectionType: sec, events: [], reaction: { locomotion: false, verb: 'idle_sway', since: 0, sway: 0.3 }, cast: { locomotion: false }, composition: comp }, audio: audio(k, loud, opt.kick?.(k)), emotion: {}, phrase: null, wordIndex: -1, now });
      if (opt.each) opt.each(k, R);
      if (opt.shots && opt.shots[k]) shots[opt.shots[k]] = c.toDataURL('image/png');
      if (k % 25 === 24) await new Promise(r => setTimeout(r, 10));
    }
  };
  // 1) candy chorus: verse 0–90, chorus 90–330, verse 330–450 (33ms frames)
  { const R = mk(), CD = new CompositionDirector(); const shown = [];
    await run(R, CD, 'candy_pop', 'dream_clouds', 0, 450, { sec: k => (k >= 90 && k < 330 ? 'chorus' : 'verse'), loud: k => k >= 90 && k < 330,
      each: (k) => shown.push(globalThis.__LS_ART__?.candyFriendsShown ?? 0), shots: { 80: 'polish-candy-friends-0-verse', 118: 'polish-candy-friends-1-entering', 200: 'polish-candy-friends-2-chorus', 372: 'polish-candy-friends-3-exiting', 440: 'polish-candy-friends-4-after' } });
    out.candy = { verseMax: Math.max(...shown.slice(0, 90)), chorusMax: Math.max(...shown.slice(110, 330)), afterEnd: shown.at(-1), kit: (globalThis.__LS_ART__?.styleKitActive || []).join('|') }; }
  // 2) heavy beast: quiet breathe then loud with a kick lunge at k=300
  { const R = mk(), CD = new CompositionDirector(); const kinds = [];
    await run(R, CD, 'ember_wasteland', 'metal_hall', 0, 340, { sec: k => (k < 200 ? 'verse' : 'chorus'), loud: k => k >= 200, kick: k => k === 300,
      each: (k, R2) => kinds.push(R2.kitPainter.beastState), shots: { 150: 'polish-heavy-beast-quiet-breathe', 280: 'polish-heavy-beast-loud-still', 307: 'polish-heavy-beast-lunge', 339: 'polish-heavy-beast-after-lunge' } });
    out.heavy = { kinds: [...new Set(kinds)], pose: globalThis.__LS_ART__?.castPose }; }
  // 3) cozy close-up
  { const R = mk(), CD = new CompositionDirector();
    await run(R, CD, 'cozy', 'forest', 0, 200, { sec: () => 'verse', loud: () => false, shots: { 120: 'polish-cozy-mug', 199: 'polish-cozy-mug-2' } });
    out.cozy = { pose: globalThis.__LS_ART__?.castPose, kit: (globalThis.__LS_ART__?.styleKitActive || []).join('|') }; }
  // 4) pan keep: 6 simulated minutes per style at 0.25s steps; figure screen x must stay inside its band, never jump, alpha never dips
  out.pan = {};
  for (const [look, preset] of [['sad', 'rainy_city'], ['horror', 'dark_sparse'], ['cinematic', 'cathedral_space'], ['candy_pop', 'dream_clouds'], ['ember_wasteland', 'metal_hall']]) {
    const R = mk(), CD = new CompositionDirector(); let minX = 1e9, maxX = -1e9, maxStep = 0, prev = null, minA = 1, onScreenMin = 1;
    for (let k = 0; k < 1440; k++) {
      const now = 1000 + k * 250; const comp = CD.tick({ look, energy: 0.2, bpm: 80, lyricMood: null, sectionId: 'v', now });
      R.render({ directive: { preset, styleLock: look, styleSource: 'auto', stylePending: false, intensity: 0.3, sectionType: 'verse', events: [], reaction: { locomotion: false, verb: 'idle_sway', since: 0 }, cast: { locomotion: false }, composition: comp }, audio: audio(k, false), emotion: {}, phrase: null, wordIndex: -1, now });
      const x = R._sd?.lastX; if (x == null || k < 40) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); if (prev != null) maxStep = Math.max(maxStep, Math.abs(x - prev)); prev = x; minA = Math.min(minA, R._sd.a);
      if (k % 50 === 0) await new Promise(r => setTimeout(r, 0));
    }
    out.pan[look] = { minU: +(minX / c.width).toFixed(3), maxU: +(maxX / c.width).toFixed(3), maxStepPx: +maxStep.toFixed(1), minAlpha: +minA.toFixed(2), jumps: R._sd?.jumps || 0, keep: R.art.keep };
  }
  return { out, shots };
});
for (const [k, v] of Object.entries(res.shots)) fs.writeFileSync(`${OUT}${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
console.log(JSON.stringify(res.out, null, 1));
const f = [], o = res.out;
if (o.candy.verseMax !== 0) f.push('candy friends during verse');
if (o.candy.chorusMax < 2) f.push('candy friends did not join on chorus');
if (o.candy.afterEnd !== 0) f.push('candy friends did not exit after chorus');
if (/rain/.test(o.candy.kit)) f.push('candy rain');
if (!o.heavy.kinds.includes('lunge')) f.push('beast never lunged');
if (!o.heavy.kinds.includes('breathe')) f.push('beast never breathed');
if (!/^mug/.test(o.cozy.pose || '')) f.push('cozy pose not mug: ' + o.cozy.pose);
for (const [k, v] of Object.entries(o.pan)) { if (v.jumps) f.push(`${k}: figure jumped`); if (v.minAlpha < 0.9) f.push(`${k}: figure faded (${v.minAlpha})`); if (v.minU < 0.07 || v.maxU > 0.93) f.push(`${k}: figure left the frame band`); if (v.maxStepPx > 12) f.push(`${k}: figure step ${v.maxStepPx}px`); }
console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'page errors: 0');
console.log(f.length ? 'POLISH-CHECK FAIL\n - ' + f.join('\n - ') : 'POLISH-CHECK PASS');
await b.close(); process.exit(f.length || errs.length ? 1 : 0);
