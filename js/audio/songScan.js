import { resolveExplicitGenre } from './genreFamily.js?v=mood4';

/**
 * Full-song PRE-SCAN (Audio Pulse, mood3).
 * Runs once at Generate on the decoded file so Scene can lock a style at 0s
 * instead of guessing from a quiet intro. Contract: ./ROLES.md § "Song pre-scan".
 *
 * Same code path in browser and node harness: analyzePCM(channels, sampleRate).
 * Coarse: mono downmix → integer decimation to ~22 kHz → 1024-pt FFT, hop 512
 * (~23 ms). Yields to the event loop every chunk so the UI never hangs.
 * If the projected time (decode + analysis) would blow budgetMs (default 2800),
 * it analyzes ~30 s as six evenly spread 5 s slices → scan.mode = 'sampled30'
 * (sections then come from a coarse whole-song RMS pass).
 */

export const SONGSCAN_VERSION = 'songscan-mood3-1';

const TARGET_SR = 22050;
const WIN = 1024;
const HOP = 512;
const CHUNK_FRAMES = 192;

const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

/** Minimum p90−p10 span so a flat/mastered song doesn't explode relative loudness. */
export const LOUDNESS_MIN_SPAN = 0.06;

/**
 * RMS loudness 0..1 (dB-mapped: −30 dBFS → 0, −8 dBFS → 1).
 * Canonical scale for energyP10/P50/P90, section.loudness, and live sectionLoudness.
 * (energyMean / energyPeak also blend in spectral flux; do not mix those with p10..p90.)
 */
export function perceivedLoudness(rms) {
  const db = 20 * Math.log10(Math.max(0, rms) + 1e-6);
  return clamp01((db + 30) / 22);
}

/** Perceived 1s energy used by energyMean (loudness + spectral activity). */
export function perceivedEnergy(rms, fluxNorm = 0) {
  const fluxTerm = clamp01(((fluxNorm || 0) - 0.1) / 0.2);
  return clamp01(perceivedLoudness(rms) * 0.6 + fluxTerm * 0.4);
}

/** Map an energy value through a song's p10..p90 → 0..1, clamped. */
export function relativeLoudness(energy, p10, p90, minSpan = LOUDNESS_MIN_SPAN) {
  const lo = Number(p10) || 0;
  const hi = Number(p90) || 0;
  const span = Math.max(minSpan, hi - lo);
  return clamp01(((Number(energy) || 0) - lo) / span);
}
const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
// Yield to the event loop between chunks (MessageChannel: no 4 ms timer clamp)
const yieldTick = (() => {
  if (typeof MessageChannel === 'function' && typeof window !== 'undefined') {
    const ch = new MessageChannel();
    const q = [];
    ch.port1.onmessage = () => { const r = q.shift(); if (r) r(); };
    return () => new Promise((r) => { q.push(r); ch.port2.postMessage(0); });
  }
  return () => new Promise((r) => setTimeout(r, 0));
})();

/* ---------- FFT (radix-2, in place) ---------- */
function makeFFT(n) {
  const levels = Math.log2(n) | 0;
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < levels; b++) r |= ((i >>> b) & 1) << (levels - 1 - b);
    rev[i] = r;
  }
  const cos = new Float32Array(n / 2);
  const sin = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sin[i] = Math.sin((2 * Math.PI * i) / n);
  }
  return function fft(re, im) {
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = i, k = 0; j < i + half; j++, k += step) {
          const l = j + half;
          const tre = re[l] * cos[k] + im[l] * sin[k];
          const tim = -re[l] * sin[k] + im[l] * cos[k];
          re[l] = re[j] - tre; im[l] = im[j] - tim;
          re[j] += tre; im[j] += tim;
        }
      }
    }
  };
}

/** Mono downmix + box-filter decimation by an integer factor (chunked, yields). */
async function downmix(channels, sampleRate) {
  const factor = Math.max(1, Math.round(sampleRate / TARGET_SR));
  const len = channels[0].length;
  const outLen = Math.floor(len / factor);
  const out = new Float32Array(outLen);
  const nc = channels.length;
  const g = 1 / (factor * nc);
  const CH = 1 << 18; // ~262k output samples per slice
  for (let o0 = 0; o0 < outLen; o0 += CH) {
    const o1 = Math.min(outLen, o0 + CH);
    for (let o = o0, i = o0 * factor; o < o1; o++) {
      let s = 0;
      for (let k = 0; k < factor; k++, i++) {
        for (let c = 0; c < nc; c++) s += channels[c][i];
      }
      out[o] = s * g;
    }
    if (o1 < outLen) await yieldTick();
  }
  return { pcm: out, sr: sampleRate / factor };
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = Array.from(arr).sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))))];
}
const mean = (a, s = 0, e = a.length) => {
  let t = 0; for (let i = s; i < e; i++) t += a[i];
  return e > s ? t / (e - s) : 0;
};

/**
 * Analyze decoded PCM.
 * @param {Float32Array[]} channels
 * @param {number} sampleRate
 * @param {{ genre?: string, fantasy?: string, styles?: string[], onProgress?: (p:number)=>void,
 *   budgetMs?: number, forceWindow?: boolean, startedAt?: number }} [opts]
 */
export async function analyzePCM(channels, sampleRate, opts = {}) {
  const t0 = opts.startedAt ?? nowMs();
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
  const budgetMs = opts.budgetMs ?? 2800; // incl. decode time when startedAt is passed
  const { pcm, sr } = await downmix(channels, sampleRate);
  const duration = pcm.length / sr;
  if (!(duration >= 3)) {
    onProgress(1);
    return { version: SONGSCAN_VERSION, ok: false, reason: 'too-short', duration: +(duration || 0).toFixed(2), genreConf: 0, vibeConf: 0, energyP10: 0, energyP50: 0, energyP90: 0, sections: [] };
  }

  // Coarse RMS pass (1 s blocks) — whole-song sections in sampled fallback
  const blk = Math.floor(sr);
  const nBlk = Math.max(1, Math.floor(pcm.length / blk));
  const blockRms = new Float32Array(nBlk);
  for (let b = 0; b < nBlk; b++) {
    let s = 0;
    for (let i = b * blk, e = i + blk; i < e; i += 4) s += pcm[i] * pcm[i];
    blockRms[b] = Math.sqrt(s / (blk / 4));
  }
  onProgress(0.02);

  const totalFrames = Math.max(0, Math.floor((pcm.length - WIN) / HOP) + 1);
  const fft = makeFFT(WIN);
  const hann = new Float32Array(WIN);
  for (let i = 0; i < WIN; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (WIN - 1));
  const re = new Float32Array(WIN);
  const im = new Float32Array(WIN);
  const nb = WIN / 2;
  const binHz = sr / WIN;
  const bin = (f) => Math.min(nb - 1, Math.max(1, Math.round(f / binHz)));
  const B = { sub: bin(30), low: bin(150), lowMid: bin(400), mid: bin(2000), hiMid: bin(5000), top: bin(Math.min(10500, sr / 2 - 50)) };
  const prevLog = new Float32Array(nb);

  // Frame plan: full song, or (fallback) ~30 s of evenly spread 5 s slices.
  // Measured: a single "loudest 30 s" window biases loudness/crest (Night Owl
  // read upbeat, Cullah aggressive) — spread slices keep the song's real shape.
  const sliceFrames = Math.floor((5 * sr) / HOP);
  const sampledPlan = () => {
    const out = [];
    const nS = 6;
    const lo = Math.floor(totalFrames * 0.05), hi = Math.floor(totalFrames * 0.95) - sliceFrames;
    for (let i = 0; i < nS; i++) {
      const st = Math.max(0, Math.round(lo + ((hi - lo) * i) / (nS - 1)));
      out.push([st, Math.min(totalFrames, st + sliceFrames)]);
    }
    return out;
  };
  let mode = opts.forceWindow ? 'sampled30' : 'full';
  let plan = mode === 'full' ? [[0, totalFrames]] : sampledPlan();
  const flat = (pl) => {
    let len = 0; for (const [a0, b0] of pl) len += Math.max(0, b0 - a0);
    const idx = new Int32Array(len), start = new Uint8Array(len);
    let j = 0;
    for (const [a0, b0] of pl) for (let f0 = a0; f0 < b0; f0++, j++) { idx[j] = f0; start[j] = f0 === a0 ? 1 : 0; }
    return { idx, start, len };
  };
  let P = flat(plan);

  const F = {
    rms: new Float32Array(totalFrames), flux: new Float32Array(totalFrames), lowFlux: new Float32Array(totalFrames),
    centroid: new Float32Array(totalFrames), flat: new Float32Array(totalFrames), hiRatio: new Float32Array(totalFrames),
    lowRatio: new Float32Array(totalFrames)
  };
  const magA = new Float32Array(nb), magB = new Float32Array(nb);
  const scale = 1 / (WIN / 4);
  let n = 0;
  const frameFeatures = (mags, ss, isStart) => {
    let flux = 0, lowFlux = 0, wsum = 0, msum = 0, lowE = 0, hiE = 0, totE = 0;
    let logSum = 0, linSum = 0, flatN = 0;
    for (let k = 1; k < B.top; k++) {
      const m = mags[k];
      const lg = Math.log1p(1000 * m);
      const d = lg - prevLog[k];
      prevLog[k] = lg;
      if (d > 0) { flux += d; if (k < B.low) lowFlux += d; }
      const e = m * m;
      totE += e;
      if (k >= B.sub && k < B.low) lowE += e;
      if (k >= B.mid) hiE += e;
      wsum += k * m; msum += m;
      if (k >= B.lowMid && k < B.hiMid) { logSum += Math.log(m + 1e-9); linSum += m; flatN++; }
    }
    F.rms[n] = Math.sqrt(ss / WIN);
    F.flux[n] = isStart ? (n > 0 ? F.flux[n - 1] : 0) : flux / B.top;
    F.lowFlux[n] = isStart ? (n > 0 ? F.lowFlux[n - 1] : 0) : lowFlux / Math.max(1, B.low);
    F.centroid[n] = msum > 1e-9 ? (wsum / msum) * binHz : 0;
    F.flat[n] = flatN && linSum > 1e-9 ? Math.exp(logSum / flatN) / (linSum / flatN) : 0;
    F.hiRatio[n] = totE > 1e-12 ? hiE / totE : 0;
    F.lowRatio[n] = totE > 1e-12 ? lowE / totE : 0;
    n++;
  };

  const loopStart = nowMs();
  let j = 0;
  let checked = false;
  while (j < P.len) {
    const stop = Math.min(P.len, j + CHUNK_FRAMES);
    // Two real frames per complex FFT (A in re, B in im) — halves FFT cost
    while (j < stop) {
      const fa = P.idx[j];
      const hasB = j + 1 < stop;
      const fb = hasB ? P.idx[j + 1] : fa;
      const offA = fa * HOP, offB = fb * HOP;
      let ssA = 0, ssB = 0;
      for (let i = 0; i < WIN; i++) {
        const xa = pcm[offA + i], xb = pcm[offB + i];
        ssA += xa * xa; ssB += xb * xb;
        re[i] = xa * hann[i];
        im[i] = hasB ? xb * hann[i] : 0;
      }
      fft(re, im);
      for (let k = 1; k < B.top; k++) {
        const nk = WIN - k;
        const ar = (re[k] + re[nk]) * 0.5, ai = (im[k] - im[nk]) * 0.5;
        const br = (im[k] + im[nk]) * 0.5, bi = (re[nk] - re[k]) * 0.5;
        magA[k] = Math.sqrt(ar * ar + ai * ai) * scale;
        magB[k] = Math.sqrt(br * br + bi * bi) * scale;
      }
      frameFeatures(magA, ssA, P.start[j] === 1);
      if (hasB) frameFeatures(magB, ssB, P.start[j + 1] === 1);
      j += hasB ? 2 : 1;
    }
    // Budget check after first chunk: project total; fall back to sampled 30 s
    if (!checked && mode === 'full') {
      checked = true;
      const spent = nowMs() - loopStart;
      const projected = (spent / Math.max(1, n)) * (P.len - n);
      const elapsedSoFar = nowMs() - t0;
      if (elapsedSoFar + projected * 1.2 + 120 > budgetMs && totalFrames > sliceFrames * 6 * 1.5) {
        mode = 'sampled30';
        plan = sampledPlan();
        P = flat(plan);
        n = 0; j = 0; prevLog.fill(0);
      }
    }
    onProgress(0.05 + 0.88 * (j / Math.max(1, P.len)));
    await yieldTick();
  }

  const fps = sr / HOP;
  const scan = summarize(F, n, fps, { duration, mode, blockRms, opts });
  scan.elapsedMs = Math.round(nowMs() - t0);
  scan.analyzedSeconds = +(n / fps).toFixed(1);
  scan.decodeMs = opts.decodeMs != null ? Math.round(opts.decodeMs) : null;
  onProgress(1);
  return scan;
}

/* ---------- summary ---------- */
function summarize(F, n, fps, ctx) {
  const { duration, mode, blockRms, opts } = ctx;
  const sl = (a) => a.subarray(0, n);
  const rms = sl(F.rms);

  // Energy 0..1 from dBFS (−42 dB → 0, −8 dB → 1), smoothed to 1 s
  const perSec = Math.max(1, Math.floor(fps));
  const nSec = Math.max(1, Math.floor(n / perSec));
  const secE = new Float32Array(nSec);
  const secFlux = new Float32Array(nSec);
  const secDb = new Float32Array(nSec);
  for (let s = 0; s < nSec; s++) {
    let ss = 0, fx = 0;
    for (let i = s * perSec; i < (s + 1) * perSec; i++) { ss += rms[i] * rms[i]; fx += F.flux[i]; }
    const r = Math.sqrt(ss / perSec);
    const db = 20 * Math.log10(r + 1e-6);
    secDb[s] = db;
    secFlux[s] = fx / perSec;
    // perceived energy: loudness + spectral activity
    secE[s] = clamp01(clamp01((db + 30) / 22) * 0.6 + clamp01((secFlux[s] - 0.1) / 0.2) * 0.4);
  }
  const dbMean = mean(Array.from(secDb).filter((d) => d > -38));
  let crestDb = 0;
  { let pk = 0, ss = 0; for (let i = 0; i < n; i++) { pk = Math.max(pk, rms[i]); ss += rms[i] * rms[i]; } crestDb = 20 * Math.log10((pk + 1e-6) / (Math.sqrt(ss / Math.max(1, n)) + 1e-6)); }
  const loudSecs = Array.from(secE).filter((e, i) => secDb[i] > -38);
  const energyPool = loudSecs.length ? loudSecs : Array.from(secE);
  const energyMean = mean(energyPool);
  const energyPeak = percentile(secE, 0.95);
  const energyLow = percentile(energyPool, 0.15);
  // mood3: relative-loudness percentiles over audible 1s RMS loudness (dB-mapped).
  // Not flux-blended: live sectionLoudness can only see RMS, and must share this scale.
  const secLoud = Float32Array.from(secDb, (d) => clamp01((d + 30) / 22));
  const loudPool = Array.from(secLoud).filter((_, i) => secDb[i] > -38);
  const pPool = loudPool.length ? loudPool : Array.from(secLoud);
  let energyP10 = percentile(pPool, 0.10);
  let energyP50 = percentile(pPool, 0.50);
  let energyP90 = percentile(pPool, 0.90);
  if (energyP90 - energyP10 < LOUDNESS_MIN_SPAN) {
    const mid = energyP50;
    energyP10 = clamp01(mid - LOUDNESS_MIN_SPAN / 2);
    energyP90 = clamp01(mid + LOUDNESS_MIN_SPAN / 2);
  }
  const dynamics = clamp01((percentile(secDb, 0.95) - percentile(Array.from(secDb).filter((d) => d > -38), 0.15)) / 12); // 0 = flat/compressed, 1 = wide

  // Weighted (loud-frame) averages of timbre
  const gate = percentile(rms, 0.3);
  let wN = 0, flatM = 0, hiM = 0, cenM = 0, lowM = 0, fluxM = 0;
  for (let i = 0; i < n; i++) {
    if (rms[i] < gate) continue;
    wN++; flatM += F.flat[i]; hiM += F.hiRatio[i]; cenM += F.centroid[i]; lowM += F.lowRatio[i]; fluxM += F.flux[i];
  }
  wN = Math.max(1, wN);
  flatM /= wN; hiM /= wN; cenM /= wN; lowM /= wN; fluxM /= wN;

  // Tempo + pulse clarity: autocorrelation of onset envelope (flux, mean-removed, half-wave)
  const tempoInfo = (env) => {
    const L = env.length;
    const m = mean(env);
    const x = new Float32Array(L);
    for (let i = 0; i < L; i++) x[i] = Math.max(0, env[i] - m);
    let e0 = 0; for (let i = 0; i < L; i++) e0 += x[i] * x[i];
    const minLag = Math.max(2, Math.floor((60 / 200) * fps));
    const maxLag = Math.ceil((60 / 55) * fps);
    const acf = new Float32Array(maxLag + 2);
    for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
      let s = 0;
      for (let i = lag; i < L; i++) s += x[i] * x[i - lag];
      acf[lag] = e0 > 0 ? s / e0 : 0;
    }
    let best = minLag, bestScore = -1;
    for (let lag = minLag; lag <= maxLag; lag++) {
      const bpm = (60 * fps) / lag;
      const w = Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.9) ** 2); // gentle prior
      // reward lags whose double also correlates (metrical support)
      const dbl = 2 * lag <= maxLag + 1 ? acf[2 * lag] || 0 : acf[lag];
      const sc = (acf[lag] + 0.5 * dbl) * w;
      if (sc > bestScore) { bestScore = sc; best = lag; }
    }
    // parabolic refine
    const a = acf[best - 1] || 0, b = acf[best], c = acf[best + 1] || 0;
    const den = a - 2 * b + c;
    const shift = den !== 0 ? Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / den)) : 0;
    let bpm = (60 * fps) / (best + shift);
    // Local contrast: periodic peak vs neighborhood valley
    let valley = Infinity;
    for (let lag = Math.max(minLag - 1, Math.round(best * 0.6)); lag <= Math.round(best * 0.8); lag++) valley = Math.min(valley, acf[lag] || 0);
    if (!Number.isFinite(valley)) valley = 0;
    return { bpm, clarity: clamp01(b), contrast: clamp01(b - valley) };
  };
  const tFull = tempoInfo(sl(F.flux));
  const tLow = tempoInfo(sl(F.lowFlux));
  let tempo = tFull.bpm;
  if (tempo < 70) tempo *= 2;
  if (tempo > 180) tempo /= 2;

  // Onset density: peaks per second above adaptive threshold
  let peaks = 0;
  {
    const fx = sl(F.flux);
    const W = Math.round(fps * 0.5);
    for (let i = 1; i < n - 1; i++) {
      if (fx[i] <= fx[i - 1] || fx[i] < fx[i + 1]) continue;
      const lo = Math.max(0, i - W), hi = Math.min(n, i + W);
      const loc = mean(fx, lo, hi);
      if (fx[i] > loc * 1.4 && fx[i] > fluxM * 0.6) peaks++;
    }
  }
  const onsetRate = peaks / Math.max(1, n / fps);

  // ---- Derived axes (calibrated on light-show-qa/internet set; see ROLES.md) ----
  const loudN = clamp01((dbMean + 16) / 6);          // −16 dBFS → 0, −10 → 1
  const fluxN = clamp01((fluxM - 0.15) / 0.13);
  const brightness = clamp01((cenM - 1000) / 1400);
  const noisiness = clamp01((flatM - 0.38) / 0.3);   // dense/distorted mids
  const compress = clamp01((8.5 - crestDb) / 3.5);   // brickwalled = low crest
  let aggression = clamp01(noisiness * 0.35 + brightness * 0.2 + loudN * 0.15 + compress * 0.15 + fluxN * 0.15);

  const pulse = clamp01(tFull.contrast / 0.5);
  const pulseLow = clamp01(tLow.contrast / 0.35);
  const tempoFit = Math.exp(-0.5 * ((tempo - 112) / 30) ** 2);
  const danceability = clamp01(
    pulseLow * 0.4 + pulse * 0.25 + clamp01((onsetRate - 2) / 3) * 0.2 + tempoFit * 0.15
  );
  const calm = clamp01(
    (1 - brightness) * 0.3 + (1 - fluxN) * 0.25 + clamp01((crestDb - 6) / 3) * 0.25 + (1 - loudN) * 0.2
  );
  // Orchestral-martial bed (Clash Defiant class): heavy low end, dense mids, no regular kick grid
  const martialScore = clamp01((lowM - 0.5) / 0.25) * clamp01((flatM - 0.45) / 0.15) * clamp01((dbMean + 17) / 4);
  const orchestralMartial = martialScore > 0.35 && tLow.contrast < 0.2;
  if (orchestralMartial) aggression = Math.max(aggression, clamp01(0.58 + martialScore * 0.25));

  // Sections: full mode → analyzed 1 s energy; sampled mode → coarse RMS pass over the whole song
  let sections;
  let ce, audible;
  if (mode === 'full') {
    sections = buildSections(secE, energyMean, energyPeak, mode);
  } else {
    // Coarse whole-song 1s RMS — already on the perceivedLoudness scale; also becomes energyP*.
    ce = Float32Array.from(blockRms, (r) => perceivedLoudness(r));
    audible = Array.from(ce).filter((e) => e > 0.05);
    const cPool = audible.length ? audible : Array.from(ce);
    energyP10 = percentile(cPool, 0.10);
    energyP50 = percentile(cPool, 0.50);
    energyP90 = percentile(cPool, 0.90);
    if (energyP90 - energyP10 < LOUDNESS_MIN_SPAN) {
      const mid = energyP50;
      energyP10 = clamp01(mid - LOUDNESS_MIN_SPAN / 2);
      energyP90 = clamp01(mid + LOUDNESS_MIN_SPAN / 2);
    }
    sections = buildSections(ce, audible.length ? mean(audible) : mean(ce), percentile(ce, 0.95), mode);
  }
  for (const sec of sections) {
    const lo = Math.max(0, Math.round(sec.start));
    const hi = Math.max(lo + 1, Math.round(sec.end));
    const e = (mode === 'full')
      ? mean(secLoud, Math.min(lo, secLoud.length - 1), Math.min(hi, secLoud.length))
      : sec.energy;
    sec.loudness = Math.round(relativeLoudness(e, energyP10, energyP90) * 1000) / 1000;
  }
  const firstStrong = sections.find((s) => s.strong);

  // Vibe (scan-level). Ladder mirrors live vibe.ladder names.
  const scores = {
    aggressive: aggression,
    upbeat: clamp01(danceability * (1 - Math.max(0, calm - 0.6)) * (1 - Math.max(0, aggression - 0.55))),
    peaceful: clamp01(calm * (1 - aggression * 0.5)),
    tense: clamp01(dynamics * 0.6 + (1 - pulse) * 0.4) * clamp01(1 - calm * 0.5)
  };
  let vibe = 'warm';
  if (aggression >= 0.6 || orchestralMartial) vibe = 'aggressive';
  else if (calm >= 0.75) vibe = 'peaceful';
  else if (danceability >= 0.6) vibe = 'upbeat';
  else if (scores.tense > 0.55) vibe = 'tense';
  const ladder = { aggressive: 'aggressive', upbeat: 'warm', warm: 'warm', peaceful: 'peaceful', tense: 'tense' }[vibe];
  const ordered = Object.values(scores).sort((x, y) => y - x);
  const vibeConf = clamp01(0.5 + (ordered[0] - ordered[1]) * 1.2 - (mode === 'full' ? 0 : 0.1));

  // Genre: explicit ID3/styles/fantasy wins; audio lean is a cross-check / fallback
  const explicit = resolveExplicitGenre({ genre: opts.genre || '', fantasy: opts.fantasy || '', styles: opts.styles || [] });
  let genreAudio = 'indie', gaConf = 0.38;
  if (aggression >= 0.6 && noisiness > 0.6) { genreAudio = noisiness > 0.95 && pulse < 0.3 ? 'noise' : 'rock'; gaConf = 0.5 + (aggression - 0.6) * 0.8; }
  else if (orchestralMartial || (dynamics > 0.6 && pulseLow < 0.3)) { genreAudio = 'soundtrack'; gaConf = 0.45; }
  else if (calm >= 0.75 && pulseLow >= 0.5) { genreAudio = 'electronic'; gaConf = 0.45; }
  else if (calm >= 0.75) { genreAudio = 'folk'; gaConf = 0.4; }
  else if (danceability >= 0.6 && tempo < 100) { genreAudio = 'hiphop'; gaConf = 0.42; }
  else if (danceability >= 0.6) { genreAudio = 'pop'; gaConf = 0.45; }
  gaConf = clamp01(gaConf);
  const genre = explicit.family || genreAudio;
  const genreSource = explicit.family ? explicit.source : 'scan';
  const genreConf = explicit.family ? (explicit.source === 'id3' ? 0.9 : 0.75) : gaConf;

  const r3 = (v) => Math.round(v * 1000) / 1000;
  return {
    version: SONGSCAN_VERSION,
    ok: true,
    mode,
    duration: +duration.toFixed(2),
    energyMean: r3(energyMean),
    energyPeak: r3(energyPeak),
    energyP10: r3(energyP10),
    energyP50: r3(energyP50),
    energyP90: r3(energyP90),
    dynamics: r3(dynamics),
    aggression: r3(aggression),
    danceability: r3(danceability),
    tempo: Math.round(tempo * 10) / 10,
    pulse: r3(pulse),
    pulseLow: r3(pulseLow),
    calm: r3(calm),
    orchestralMartial,
    martialScore: r3(martialScore),
    brightness: r3(brightness),
    noisiness: r3(noisiness),
    onsetRate: r3(onsetRate),
    genre,
    genreConf: r3(genreConf),
    genreSource,
    genreAudio,
    vibe,
    vibeConf: r3(vibeConf),
    vibeScores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, r3(v)])),
    ladder,
    firstStrongAt: firstStrong ? firstStrong.start : null,
    sections,
    raw: {
      dbMean: r3(dbMean), flat: r3(flatM), centroid: Math.round(cenM), hiRatio: r3(hiM), lowRatio: r3(lowM),
      flux: r3(fluxM), pulseFull: r3(tFull.contrast), clarityFull: r3(tFull.clarity),
      pulseLow: r3(tLow.contrast), clarityLow: r3(tLow.clarity), bpmLow: Math.round(tLow.bpm), crestDb: r3(crestDb)
    }
  };
}

function buildSections(secE, eMean, ePeak, mode) {
  const offsetSec = 0;
  const N = secE.length;
  if (N < 4) return [{ start: offsetSec, end: offsetSec + N, energy: +mean(secE).toFixed(3), loudness: 0.5, label: 'mid', strong: false }];
  // smooth 3 s
  const sm = new Float32Array(N);
  for (let i = 0; i < N; i++) sm[i] = mean(secE, Math.max(0, i - 1), Math.min(N, i + 2));
  const W = 6;
  const nov = new Float32Array(N);
  for (let i = W; i < N - W; i++) nov[i] = Math.abs(mean(sm, i, i + W) - mean(sm, i - W, i));
  const cuts = [0];
  const MIN = 8;
  const thr = Math.max(0.06, percentile(nov, 0.8));
  for (let i = W; i < N - W; i++) {
    if (nov[i] < thr || nov[i] < nov[i - 1] || nov[i] < nov[i + 1]) continue;
    if (i - cuts[cuts.length - 1] < MIN) {
      // keep the stronger boundary
      const last = cuts[cuts.length - 1];
      if (last > 0 && nov[i] > nov[last]) cuts[cuts.length - 1] = i;
      continue;
    }
    cuts.push(i);
  }
  if (N - cuts[cuts.length - 1] < MIN / 2 && cuts.length > 1) cuts.pop();
  cuts.push(N);
  const out = [];
  for (let c = 0; c < cuts.length - 1; c++) {
    const s = cuts[c], e = cuts[c + 1];
    const en = mean(secE, s, e);
    let label = 'mid';
    const strong = en >= Math.max(0.42, ePeak * (mode === 'full' ? 0.82 : 0.9));
    if (strong) label = 'peak';
    else if (en < eMean * 0.7) label = c === 0 ? 'intro' : (c === cuts.length - 2 ? 'outro' : 'quiet');
    out.push({ start: +(offsetSec + s).toFixed(1), end: +(offsetSec + e).toFixed(1), energy: +en.toFixed(3), label, strong });
  }
  return out;
}

/**
 * Browser entry: decode a Blob/ArrayBuffer with the app AudioContext and scan it.
 * @param {Blob|ArrayBuffer} src
 * @param {BaseAudioContext} ctx
 */
export async function scanSong(src, ctx, opts = {}) {
  const t0 = nowMs();
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
  onProgress(0);
  const ab = src instanceof ArrayBuffer ? src.slice(0) : await src.arrayBuffer();
  const buf = await new Promise((resolve, reject) => {
    // callback form for older Safari/Samsung; promise form elsewhere
    const p = ctx.decodeAudioData(ab, resolve, reject);
    if (p && typeof p.then === 'function') p.then(resolve, reject);
  });
  const decodeMs = nowMs() - t0;
  const channels = [];
  for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) channels.push(buf.getChannelData(c));
  const scan = await analyzePCM(channels, buf.sampleRate, { ...opts, startedAt: t0, decodeMs });
  return scan;
}
