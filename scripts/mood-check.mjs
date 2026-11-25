// mood-check (style1): renders each locked style headless with the REAL renderer (painted plate + grade +
// composition + kit + figure), quiet and loud, then measures grayscale composition stats.
// FAILS if Sad reads like Calm/Cozy (centered, full, warm) or two moods' stats are near-identical.
// Usage: node scripts/mood-check.mjs   (needs :8765 up)  → prints table + writes /workspace/light-show-versions/review-style1/mood-*.png
import { chromium } from '/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright/index.mjs';
const OUT = '/workspace/light-show-versions/review-style1/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8765/?debug=0');
await p.waitForTimeout(1200);
const tag = await p.evaluate(() => (document.querySelector('script[type=module]')?.src.match(/\?v=([\w.-]+)/) || [])[1] || 'mood1');
const CASES = [
  ['sad', 'rainy_city'], ['horror', 'dark_sparse'], ['cinematic', 'cathedral_space'],
  ['candy_pop', 'dream_clouds'], ['ember_wasteland', 'metal_hall'], ['cozy', 'forest']
];
const res = [];
for (const [look, preset] of CASES) for (const mode of ['quiet', 'loud']) {
  const r = await p.evaluate(async ({ look, preset, mode, tag }) => {
    const { Renderer } = await import(`/js/viz/renderer.js?v=${tag}`);
    let CD = null; try { const m = await import(`/js/director/composition.js?v=${tag}`); CD = new m.CompositionDirector(); } catch (_) { CD = null; }
    document.querySelectorAll('canvas.mood').forEach(c => c.remove());
    const c = document.createElement('canvas'); c.className = 'mood'; c.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;z-index:99999';
    document.body.appendChild(c);
    const R = new Renderer(c); R._resize?.(); R.start?.(() => {}); R.stop?.();
    const loud = mode === 'loud';
    const audio = (k) => ({ energy: loud ? 0.8 : 0.2, bass: loud ? 0.7 : 0.2, mid: 0.3, treble: 0.3, onset: loud && k % 4 === 0 ? 0.8 : 0.1, beat: loud && k % 8 === 0, bpm: loud ? 140 : 72,
      roles: { kick: loud && k % 8 === 0 ? 0.9 : 0.05, snare: loud && k % 16 === 4 ? 0.8 : 0, hats: loud ? 0.7 : 0.1, bass: loud ? 0.7 : 0.2, pads: 0.4, vocalish: 0.4, harsh: loud ? 0.5 : 0 } });
    const dir = (now) => ({ preset, styleLock: look, styleSource: 'auto', stylePending: false, intensity: loud ? 0.85 : 0.3, sectionType: loud ? 'chorus' : 'verse', events: [],
      reaction: { locomotion: false, verb: 'idle_sway', since: 0, sway: 0.3 }, cast: { locomotion: false },
      composition: CD ? (() => { CD.e = loud ? 0.85 : 0.15; return CD.tick({ look, energy: loud ? 0.85 : 0.15, bpm: loud ? 150 : 70, lyricMood: null, sectionId: 'x', now }); })() : undefined });
    const t0 = performance.now();
    // let the plate load (ArtPlates preloads on first draw)
    for (let k = 0; k < 200; k++) {
      const now = t0 + k * 33;
      R.render({ directive: dir(now), audio: audio(k), emotion: {}, phrase: null, wordIndex: -1, now });
      if (k % 20 === 19) await new Promise(r => setTimeout(r, 30));
    }
    const ctx = c.getContext('2d'); const W = c.width, H = c.height;
    const d = ctx.getImageData(0, 0, W, H).data;
    // luminance + warmth
    const L = new Float32Array(W * H); let sum = 0, sum2 = 0, warm = 0, satS = 0;
    for (let i = 0, j = 0; i < d.length; i += 4, j++) { const r = d[i], g = d[i + 1], bl = d[i + 2]; const y = 0.299 * r + 0.587 * g + 0.114 * bl; L[j] = y; sum += y; sum2 += y * y; warm += r - bl; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); satS += mx ? (mx - mn) / mx : 0; }
    const N = W * H, mean = sum / N, contrast = Math.sqrt(sum2 / N - mean * mean);
    // edge density (sobel-ish) on the band between lyric zone and controls (y 8%..75%)
    let edge = 0, ecx = 0, ew = 0; const y0 = Math.floor(H * 0.08), y1 = Math.floor(H * 0.75);
    for (let y = y0; y < y1; y += 2) for (let x = 1; x < W - 1; x += 2) { const i = y * W + x; const gx = L[i + 1] - L[i - 1], gy = L[i + W] - L[i - W]; const m = Math.abs(gx) + Math.abs(gy); edge += m; ecx += m * x; ew += m; }
    const nE = ((y1 - y0) / 2) * ((W - 2) / 2);
    // empty-space fraction: 16px blocks with low local variance
    let empty = 0, blocks = 0;
    for (let by = y0; by + 16 <= y1; by += 16) for (let bx = 0; bx + 16 <= W; bx += 16) { let s1 = 0, s2 = 0; for (let y = by; y < by + 16; y += 2) for (let x = bx; x < bx + 16; x += 2) { const v = L[y * W + x]; s1 += v; s2 += v * v; } const n = 64, m = s1 / n, sd = Math.sqrt(Math.max(0, s2 / n - m * m)); blocks++; if (sd < 7) empty++; }
    // polish6: 10px-block grayscale thumbnail (loud vs quiet must differ in grayscale, not only in colour)
    const thumb = []; for (let by = 0; by + 10 <= H; by += 10) for (let bx = 0; bx + 10 <= W; bx += 10) { let s1 = 0; for (let y = by; y < by + 10; y += 2) for (let x = bx; x < bx + 10; x += 2) s1 += L[y * W + x]; thumb.push(Math.round(s1 / 25)); }
    const A = globalThis.__LS_ART__ || {};
    return { thumb, look, mode, preset, plate: A.shown, emptyFrac: +(empty / blocks).toFixed(3), figureU: A.composition?.figureU ?? null, edgeCentroidU: +(ecx / ew / W).toFixed(3), edge: +(edge / nE).toFixed(2), contrast: +contrast.toFixed(1), mean: +mean.toFixed(1), warmth: +(warm / N).toFixed(1), sat: +(satS / N).toFixed(3), kit: (A.styleKitActive || []).join('|'), tilt: A.tiltDeg, compSrc: A.composition?.source, compMode: A.composition?.mode, chaos: A.composition?.chaos, move: A.castMove, png: c.toDataURL('image/png') };
  }, { look, preset, mode, tag });
  const fs = await import('fs'); const buf = Buffer.from(r.png.split(',')[1], 'base64'); fs.writeFileSync(`${OUT}mood-${look}-${mode}.png`, buf); fs.writeFileSync(`${OUT}polish-${look}-${mode}.png`, buf); delete r.png;
  res.push(r);
}
console.table(res.map(r => ({ look: r.look, mode: r.mode, plate: r.plate, empty: r.emptyFrac, figU: r.figureU, edge: r.edge, contrast: r.contrast, mean: r.mean, warmth: r.warmth, sat: r.sat, chaos: r.chaos, tilt: r.tilt, src: r.compSrc, kit: r.kit })));
const fails = [];
const q = (look, mode = 'quiet') => res.find(r => r.look === look && r.mode === mode);
const sad = q('sad'), calm = q('cinematic'), cozy = q('cozy');
// Sad vs Calm: the cathedral/vista plates are dark and smooth, so raw emptyFrac alone is plate-biased. Sad must read different in
// grayscale: figure pushed to the edge while Calm is centered (hard rule) AND flatter or emptier (fewer edges or ≥ Calm's empty share − 0.05).
if (sad && calm) {
  const off = (r) => Math.abs((r.figureU ?? 0.5) - 0.5);
  if (off(sad) - off(calm) < 0.15) fails.push(`Sad placement reads like Calm (sad off-center ${off(sad).toFixed(2)} vs calm ${off(calm).toFixed(2)})`);
  if (!(sad.edge < calm.edge || sad.emptyFrac >= calm.emptyFrac - 0.05)) fails.push(`Sad not flatter/emptier than Calm (edge ${sad.edge} vs ${calm.edge}, empty ${sad.emptyFrac} vs ${calm.emptyFrac})`);
  if (Math.abs(sad.warmth - calm.warmth) < 8) fails.push(`Sad tone ≈ Calm (warmth ${sad.warmth} vs ${calm.warmth})`);
}
if (sad && cozy && sad.sat >= cozy.sat) fails.push(`Sad not more drained than Cozy (sat ${sad.sat} >= ${cozy.sat})`);
if (sad && cozy && sad.emptyFrac <= cozy.emptyFrac) fails.push(`Sad not emptier than Cozy (${sad.emptyFrac} <= ${cozy.emptyFrac})`);
if (sad && sad.figureU != null && sad.figureU > 0.35 && sad.figureU < 0.65) fails.push(`Sad figure centered (figureU ${sad.figureU})`);
if (sad && cozy && sad.warmth >= cozy.warmth) fails.push(`Sad warmer than Cozy (${sad.warmth} >= ${cozy.warmth})`);
if (sad && sad.sat > 0.35) fails.push(`Sad too saturated (${sad.sat})`);
const quiet = res.filter(r => r.mode === 'quiet');
for (let i = 0; i < quiet.length; i++) for (let j = i + 1; j < quiet.length; j++) {
  const a = quiet[i], c = quiet[j];
  const near = (x, y, tol) => Math.abs(x - y) <= tol;
  if (near(a.emptyFrac, c.emptyFrac, 0.03) && near(a.edge, c.edge, 1) && near(a.contrast, c.contrast, 3) && near(a.warmth, c.warmth, 4)) fails.push(`${a.look} ≈ ${c.look} (stats near-identical)`);
}
// polish6: LOUD must visibly break apart vs QUIET in grayscale — mean abs block-luma difference (or busier edges), plus loud chaos elements drawn
const gdiff = (a, b) => { let d = 0; for (let i = 0; i < Math.min(a.thumb.length, b.thumb.length); i++) d += Math.abs(a.thumb[i] - b.thumb[i]); return +(d / a.thumb.length).toFixed(1); };
// fixmood2: loud Sad = heavy slow rain + hairline crack (no glass/lightning/white cracks); loud Heavy = fissures + fire + embers
const LOUD_EL = { sad: /heavy_rain/, horror: /crow_burst/, cinematic: /battle/, candy_pop: /sunburst/, ember_wasteland: /fissures.*fire_licks|fire_licks.*fissures/ };
const LOUD_NEVER = { sad: /glass|lightning|frame_damage|near_debris|storm/, candy_pop: /rain|storm|lightning|sea|ocean|wave/ };
for (const look of ['sad', 'horror', 'cinematic', 'candy_pop', 'ember_wasteland']) {
  const a = q(look), l = q(look, 'loud'); if (!a || !l) continue;
  const d = gdiff(a, l); l.grayDiff = d;
  console.log(`  ${look}: quiet→loud grayscale diff ${d}, edge ${a.edge}→${l.edge}, contrast ${a.contrast}→${l.contrast}`);
  if (d < 8 && l.edge <= a.edge) fails.push(`${look}: loud ≈ quiet in grayscale (diff ${d}, edge ${l.edge} <= ${a.edge})`);
  if (!LOUD_EL[look].test(l.kit)) fails.push(`${look}: loud chaos layer missing (${l.kit})`);
  if (LOUD_NEVER[look] && LOUD_NEVER[look].test(l.kit)) fails.push(`${look}: loud draws a never-list FX (${l.kit})`);
  if (look === 'candy_pop' && /storm|ocean|rainy/.test(String(l.plate || ''))) fails.push(`candy_pop: loud plate left the candy world (${l.plate})`);
}
{ const c = q('candy_pop'), cl = q('candy_pop', 'loud'); for (const r of [c, cl]) if (r && /rain/.test(r.kit)) fails.push('candy_pop draws rain'); }
{ const z = q('cozy'); if (z && /rain|lantern(?!.)|crow/.test(z.kit.replace('porchlamp', ''))) fails.push(`cozy kit has storm/searcher elements (${z.kit})`); }
{ const e = q('ember_wasteland'); if (e && !/beast/.test(e.kit)) fails.push('heavy: beast missing'); }
console.log(errs.length ? 'page errors: ' + errs.slice(0, 5).join(' | ') : 'page errors: 0');
console.log(fails.length ? 'MOOD-CHECK FAIL:\n - ' + fails.join('\n - ') : 'MOOD-CHECK PASS');
await b.close();
process.exit(fails.length ? 1 : 0);
