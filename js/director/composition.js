/**
 * Darrell Nov24 — mood sets the DIRECTION, the song sets the EXPRESSION.
 * Layout source of truth = Worlds' styleComposition(look) (focal, negativeSpace, spacing, edges, light, texture,
 * maxElements, quiet/loud). Scene adds the song-driven INTENSITY: smoothed energy + tempo + lyric tone,
 * and picks quiet vs loud with hysteresis, switching only at section boundaries (no mid-phrase flicker).
 * Visual reads directive.composition.
 */
import { styleComposition } from '../scene/styleFamilies.js?v=mood4';

const FOCAL_U = { edge: 0.15, thirds: 0.64, center: 0.5, scattered: 0.5 };
const COLOR = { // drives grade intent where Worlds' table is prose
  sad: { saturation: 0.3, warmth: -0.35, contrast: 0.45 }, horror: { saturation: 0.4, warmth: -0.15, contrast: 0.85 },
  cinematic: { saturation: 0.6, warmth: 0.2, contrast: 0.5 }, candy_pop: { saturation: 0.95, warmth: 0.3, contrast: 0.75 },
  cozy: { saturation: 0.65, warmth: 0.75, contrast: 0.4 }, ember_wasteland: { saturation: 0.7, warmth: 0.4, contrast: 0.9 }
};
const TONE = { breakup: 0.12, violent: 0.15, tender: -0.1, neutral: 0 };

/** Song-relative loudness 0..1 of the scan section at time t (scan units, known at 0s). */
function scanRel(scan, t) {
  const S = scan && scan.ok !== false && Array.isArray(scan.sections) ? scan.sections : null;
  if (!S || S.length < 2) return null;
  let i = S.findIndex(x => t >= x.start && t < x.end);
  if (i < 0) i = t < S[0].start ? 0 : S.length - 1;
  // duration-weighted percentile RANK of this section's energy within the song (each song splits on its own curve)
  const e = +S[i].energy || 0;
  let below = 0, same = 0, tot = 0;
  for (const x of S) { const d = Math.max(0.1, x.end - x.start), ex = +x.energy || 0; tot += d; if (ex < e - 1e-4) below += d; else if (Math.abs(ex - e) <= 1e-4) same += d; }
  const rank = tot ? (below + same * 0.5) / tot : 0.5;
  const es = S.map(x => +x.energy || 0), span = Math.max(...es) - Math.min(...es);
  return { rel: Math.max(0, Math.min(1, rank)), idx: i, strong: !!S[i].strong, flat: span < 0.05 };
}
const rankOf = (arr, v) => { if (!arr.length) return 0.5; let b = 0; for (const x of arr) if (x < v) b++; return b / arr.length; };
const pct = (arr, q) => { if (!arr.length) return 0; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.max(0, Math.round((a.length - 1) * q)))]; };

/**
 * QA-20261125-0335 #3: compMode + chaos come from EACH SONG's own dynamics (percentiles of its scan sections
 * + its own live-energy history), not fixed thresholds. Quiet parts calm (Heavy keeps a small floor),
 * every song with real dynamics reaches loud at its peaks.
 */
export class CompositionDirector {
  constructor() { this.reset(); }
  reset() { this.e = null; this.eFast = null; this.mode = null; this.secId = null; this.wantSince = 0; this.wantMode = null; this.hist = []; this.lastSampleT = -1; this.lo = null; this.hi = null; this.lastPctT = -99; this.lastT = null; }
  /** s: { look, variant, energy, bpm, lyricMood, sectionId, now, time, scan } */
  tick(s = {}) {
    const look = s.look || 'cinematic';
    const heavy = look === 'ember_wasteland';
    const e0 = Math.max(0, Math.min(1, +s.energy || 0));
    this.e = this.e == null ? e0 : this.e * 0.99 + e0 * 0.01;          // ~5s
    this.eFast = this.eFast == null ? e0 : this.eFast * 0.93 + e0 * 0.07; // ~0.7s
    const t = +s.time || 0;
    if (t - this.lastSampleT >= 0.5 || t < this.lastSampleT) { this.hist.push(this.eFast); this.lastSampleT = t; if (this.hist.length > 1400) this.hist.shift(); }
    if (t - this.lastPctT >= 2 || t < this.lastPctT) { this.lo = pct(this.hist, 0.15); this.hi = pct(this.hist, 0.92); this.lastPctT = t; }
    const liveRel = this.hist.length >= 24 && this.hi - this.lo > 0.03 ? rankOf(this.hist, this.eFast) : null;
    const sr = scanRel(s.scan, t);
    // Audio Pulse mood3 contract: canonical song-relative loudness. Live frame sectionLoudness (scan-mapped, 1.5s smoothed)
    // wins; else the scan section's own loudness at t; 'live' source (mic, rolling 60s) is blended with our history.
    const SL = Number.isFinite(+s.loudness) && s.loudness != null ? Math.max(0, Math.min(1, +s.loudness)) : null;
    const secL = (() => { const S = s.scan && s.scan.ok !== false && Array.isArray(s.scan.sections) ? s.scan.sections : null;
      if (!S) return null; const x = S.find(q => t >= q.start && t < q.end); return x && Number.isFinite(+x.loudness) ? +x.loudness : null; })();
    let rel, relSrc;
    if (SL != null && s.loudSrc !== 'live') { rel = SL; relSrc = 'sectionLoudness'; }
    else if (secL != null) { rel = secL; relSrc = 'scan.section.loudness'; }
    else if (SL != null) { rel = liveRel != null ? SL * 0.5 + liveRel * 0.5 : SL; relSrc = 'live'; }
    else { rel = sr && liveRel != null ? sr.rel * 0.6 + liveRel * 0.4 : sr ? sr.rel : liveRel != null ? liveRel : Math.min(1, this.e * 1.4); relSrc = 'fallback'; }
    this.relSrc = relSrc;
    const tone = TONE[s.lyricMood] ?? 0;
    rel = Math.max(0, Math.min(1, rel + tone * 0.5));
    // song-relative hysteresis
    // thresholds on the loudness scale (Audio: quiet <=0.3, loud >=0.8); hysteresis band between
    const canon = relSrc === 'sectionLoudness' || relSrc === 'scan.section.loudness';
    const ON = canon ? 0.75 : 0.66, OFF = canon ? 0.45 : 0.5;
    const want = this.mode === 'loud' ? (rel >= OFF ? 'loud' : 'quiet') : (rel >= ON ? 'loud' : 'quiet');
    const now = +s.now || 0;
    const secKey = sr ? 'scan' + sr.idx : s.sectionId;
    if (want !== this.wantMode) { this.wantMode = want; this.wantSince = now; }
    // clear reads (<=0.3 calm, >=0.8 loud) commit in 1s; band values need 3s; a seek/jump re-decides at once
    const jump = this.lastT != null && Math.abs(t - this.lastT) > 2; this.lastT = t;
    const clear = canon && (rel <= 0.3 || rel >= 0.8);
    const dwell = clear ? 1000 : 3000;
    if (this.mode == null || jump || secKey !== this.secId || (want !== this.mode && now - this.wantSince >= dwell)) { this.mode = want; this.secId = secKey; }
    const loud = this.mode === 'loud';
    // Intensity maps the song's own range. Quiet: calm (Heavy keeps an ember floor). Loud: chaos climbs with how far
    // into the song's top third we are, capped per look (Heavy goes all the way; sad/cozy stay readable).
    const CAP = { ember_wasteland: 1, candy_pop: 0.9, cinematic: 0.9, horror: 0.85, sad: 0.75, cozy: 0.72 };
    const cap = CAP[s.variant === 'cozy' ? 'cozy' : look] ?? 0.9;
    const xL = Math.max(0, Math.min(1, (rel - 0.5) / 0.5)) * Math.max(0, (cap - 0.59) / 0.61);
    const xQ = Math.min(1, rel / 0.66);
    const intensity = loud ? 0.55 + 0.4 * xL : heavy ? 0.47 + 0.18 * xQ : 0.3 + 0.25 * xQ;
    const layout = s.variant === 'cozy' ? 'cozy' : look;
    const base = styleComposition(layout, { energy: loud ? 1 : 0 });
    const col = COLOR[layout] || COLOR[look] || COLOR.cinematic;
    const ex = base.expression || {};
    const motionMul = loud ? 0.6 + 0.5 * xL : Math.min(0.5, (ex.motion ?? 0.3) * (0.6 + intensity * 0.8));
    // same formula Visual's resolveComposition uses, emitted so HUD/QA read one number
    const chaos = Math.max(0, Math.min(1, (loud ? 0.45 : 0) + Math.max(0, intensity - 0.45) * 0.9 + Math.max(0, motionMul - 0.5) * 0.5));
    const bpm = +s.bpm || 0;
    return {
      look, variant: s.variant || null, layout, mode: this.mode, intensity: +intensity.toFixed(3), rel: +rel.toFixed(3), chaos: +chaos.toFixed(3),
      energy: +this.e.toFixed(3), tempo: bpm || null, tone: s.lyricMood || null, relSource: sr ? (liveRel != null ? 'scan+live' : 'scan') : liveRel != null ? 'live' : 'warmup',
      focal: base.focal, focalU: FOCAL_U[base.focal] ?? 0.5, focalV: 0.6, negativeSpace: base.negativeSpace, spacing: base.spacing,
      edges: base.edges, light: base.light, texture: base.texture, maxElements: base.maxElements, test: base.test,
      expression: ex, motionMul: +motionMul.toFixed(3),
      horizonTilt: loud ? (ex.horizonTilt || 0) : 0, crack: loud ? (ex.crack || 0) : 0, note: ex.note || '',
      ...col,
      fauna: !(look === 'sad' || look === 'horror'), warmLight: layout === 'cozy' || look === 'cinematic' || look === 'candy_pop',
      why: `${look}${s.variant ? '+' + s.variant : ''}/${this.mode} rel=${rel.toFixed(2)}(${this.relSrc}) i=${intensity.toFixed(2)} chaos=${chaos.toFixed(2)}${sr ? ' scanSec=' + sr.idx : ''}`
    };
  }
}
