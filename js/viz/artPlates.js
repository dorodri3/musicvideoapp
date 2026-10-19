/**
 * art2: painted cinematic world plates (1280x720 landscape) on a portrait phone.
 * Cover-fit on FULL HEIGHT, then the spare width becomes a slow horizontal pan
 * across the scene + Ken Burns drift. Beat push-in, soft-clipped energy lift
 * (never sustained white) and a 1.6s crossfade between worlds.
 * The plate owns the frame at ~100% opacity; old procedural fg layers are off
 * (backups kept as bg_procedural.jpg / fg_procedural.webp). Light particles
 * (rain / embers / fireflies / motes) ride on top where they help the painting.
 */
const BASE = new URL('../../assets/worlds/', import.meta.url).href;
// pan: [from,to] fraction of the spare width (0 = left edge, 1 = right edge)
// fx: particle overlay that suits the painting; ground: feet line (fraction of h), default 0.8
// stage: screen-x of the lead (default 0.5); light: key-light side for the rim (+1 right / -1 left)
export const ART_WORLDS = {
  meadow_fauna: { rim: 'rgba(255,200,120,0.95)', pan: [0.15, 0.85], fx: 'fireflies', light: 1 },
  misty_lake: { rim: 'rgba(200,220,255,0.9)', pan: [0.0, 0.06], fx: null, ground: 0.665, stage: 0.4, light: -1 }, // art5: stand on the left shore rocks, not the water
  forest: { rim: 'rgba(190,255,200,0.9)', pan: [0.2, 0.8], fx: 'fireflies', light: 1 },
  dream_clouds: { rim: 'rgba(255,215,240,0.95)', pan: [0.1, 0.9], fx: 'motes', light: 1 },
  space: { rim: 'rgba(150,200,255,0.95)', pan: [0.1, 0.9], fx: null, light: -1 },
  rainy_city: { rim: 'rgba(255,110,200,0.95)', pan: [0.1, 0.9], fx: 'rain', light: -1 },
  apocalyptic_warzone: { rim: 'rgba(255,140,60,0.98)', pan: [0.05, 0.95], fx: 'embers', light: 1 },
  metal_hall: { rim: 'rgba(255,80,50,0.98)', pan: [0.2, 0.8], fx: 'embers', light: 1 },
  storm: { rim: 'rgba(200,170,255,0.95)', pan: [0.08, 0.42], stage: 0.46, fx: 'rain', light: 1 },
  red_void: { rim: 'rgba(255,70,60,0.95)', pan: [0.1, 0.9], fx: 'embers', light: 1 },
  dark_sparse: { rim: 'rgba(190,205,235,0.9)', pan: [0.15, 0.85], fx: null, light: 1 },
  cathedral_space: { rim: 'rgba(255,215,170,0.92)', pan: [0.25, 0.75], fx: 'motes', light: 1 }
};
/**
 * art6: the painting's own geography, in PLATE coordinates (u across the image width, v down the
 * image height, both 0..1). gp = ground profile [u,v] where a person can stand (feet line);
 * walk = [u0,u1] walkable span (misty_lake: only the left shore; storm: only the cliff);
 * focal = [[u,v,r]] the painting's subject(s) the dreamer must never cover; fh = a person's
 * height as a fraction of the plate height at that ground line (small against the vista);
 * water = the scene has water/puddles for bass ripples; birds = sky creatures that suit it;
 * accent = how guitar/synth shows up in this world; mist = pad-driven fog colour.
 */
export const WORLD_GEO = {
  misty_lake: { gp: [[0, 0.6], [0.1, 0.63], [0.2, 0.655], [0.3, 0.665]], walk: [0.03, 0.29], focal: [[0.1, 0.48, 0.06], [0.23, 0.16, 0.05], [0.6, 0.3, 0.1]], fh: 0.115, water: [0.3, 1, 0.7], birds: 'birds', accent: 'aurora', mist: '205,220,245' },
  meadow_fauna: { gp: [[0, 0.68], [0.5, 0.66], [1, 0.68]], walk: [0.04, 0.96], focal: [[0.5, 0.38, 0.14], [0.1, 0.47, 0.05]], fh: 0.11, water: null, birds: 'birds', accent: 'fireflies', mist: '255,236,200' },
  forest: { gp: [[0.2, 0.79], [0.5, 0.75], [0.8, 0.79]], walk: [0.22, 0.78], focal: [[0.56, 0.42, 0.12]], fh: 0.12, water: null, birds: null, accent: 'fireflies', mist: '200,245,220' },
  dream_clouds: { gp: [[0, 0.7], [0.5, 0.68], [1, 0.7]], walk: [0.04, 0.96], focal: [[0.25, 0.33, 0.12], [0.86, 0.5, 0.07], [0.55, 0.3, 0.06]], fh: 0.075, water: null, birds: 'birds', accent: 'aurora', mist: '255,225,245' },
  space: { gp: [[0, 0.8], [0.5, 0.78], [1, 0.8]], walk: [0.04, 0.96], focal: [[0.72, 0.36, 0.16], [0.3, 0.33, 0.1]], fh: 0.1, water: null, birds: null, accent: 'aurora', mist: '190,210,255' },
  rainy_city: { gp: [[0, 0.84], [0.5, 0.78], [1, 0.84]], walk: [0.06, 0.94], focal: [[0.2, 0.25, 0.08], [0.8, 0.26, 0.07]], fh: 0.13, water: [0, 1, 0.82], birds: null, accent: 'neon', mist: '255,170,230' },
  apocalyptic_warzone: { gp: [[0, 0.74], [0.5, 0.72], [1, 0.74]], walk: [0.04, 0.96], focal: [[0.5, 0.45, 0.14]], fh: 0.09, water: null, birds: 'crows', accent: 'lightning', mist: '120,90,80' },
  metal_hall: { gp: [[0, 0.82], [0.5, 0.8], [1, 0.82]], walk: [0.06, 0.94], focal: [[0.5, 0.5, 0.14]], fh: 0.11, water: null, birds: null, accent: 'flare', mist: '120,70,60' },
  storm: { gp: [[0, 0.6], [0.15, 0.62], [0.3, 0.66], [0.37, 0.69]], walk: [0.03, 0.35], focal: [[0.62, 0.3, 0.12]], fh: 0.09, water: [0.4, 1, 0.72], birds: 'crows', accent: 'lightning', mist: '180,170,215' },
  red_void: { gp: [[0, 0.72], [0.5, 0.7], [1, 0.72]], walk: [0.06, 0.94], focal: [[0.5, 0.33, 0.12], [0.5, 0.88, 0.1]], fh: 0.085, water: [0, 1, 0.74], birds: 'crows', accent: 'lightning', mist: '150,40,40' },
  dark_sparse: { gp: [[0, 0.86], [0.5, 0.81], [1, 0.86]], walk: [0.06, 0.94], focal: [[0.47, 0.2, 0.06], [0.6, 0.45, 0.06]], fh: 0.12, water: null, birds: 'crows', accent: 'lamp', mist: '190,205,230' },
  cathedral_space: { gp: [[0, 0.86], [0.5, 0.81], [1, 0.86]], walk: [0.08, 0.92], focal: [[0.48, 0.18, 0.12], [0.5, 0.55, 0.1]], fh: 0.12, water: null, birds: null, accent: 'rays', mist: '255,225,190' }
};
const VER = 'art8';
const PLATE_ALPHA = 1.0;
const XFADE = 1.6;
/** art7 (QA-0350): hard→hard world swaps (storm → red_void …) looked muddy/ghosted as a 1.6s
 *  double exposure of two dark busy plates. They now DIP THROUGH DARK in 0.9s: the old plate dims to
 *  ~45% and the new one rises out of it — never both at once, never black. */
const DIP_XFADE = 0.9, DIP_DEPTH = 0.55;
const HARD_PLATES = ['storm', 'apocalyptic_warzone', 'metal_hall', 'red_void'];
const cache = {};
function load(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img;
}
function get(id) {
  if (!ART_WORLDS[id]) return null;
  if (!cache[id]) cache[id] = { bg: load(`${BASE}${id}/bg.jpg?v=${VER}`) };
  return cache[id];
}
const ready = (img) => img && img.complete && img.naturalWidth > 0;
export function preloadArt() { for (const id of Object.keys(ART_WORLDS)) get(id); }
const smooth = (x) => x * x * (3 - 2 * x);
const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h / 9973; };

export class ArtPlates {
  constructor() {
    this.cur = null; this.prev = null; this.mix = 1;
    this.push = 0; this.pulse = 0; this.lastT = 0; this.hard = false;
    this.since = {}; // world id -> t when it became current (pan clock)
    this.dir = {};   // world id -> pan direction (+1 L→R, -1 R→L), alternates per visit
    this._visits = 0;
    this.map = {};      // art6: world id -> current plate→screen mapping {x,y,dw,dh,vx}
    this.bassSway = 0;
    this.ag = { burst: 0, ripples: [], bolt: null, boltAt: -9, birds: null, birdsAt: 0, accentLv: 0, lastT: 0 };
    preloadArt();
  }
  /** Does the current (resolved) preset have a ready painted plate? */
  has(id) { const a = get(id); return !!(a && ready(a.bg)); }
  rim(id) { return ART_WORLDS[id]?.rim || null; }
  /** Feet line (fraction of h) where the painting's ground sits — lower third. */
  ground(id) { return ART_WORLDS[id]?.ground || 0.8; }
  /** Screen-x fraction where the lead stands (keeps storm cast on the cliff, not the sea). */
  stage(id) { return ART_WORLDS[id]?.stage ?? 0.5; }
  /** Side the painting's key light comes from (+1 right, -1 left) → rim side. */
  light(id) { return ART_WORLDS[id]?.light || 1; }
  active() { return this.cur && this.has(this.cur) ? this.cur : null; }
  /** art6: plate geography + plate↔screen mapping for the dreamer and the world agents. */
  geo(id) { return WORLD_GEO[id] || null; }
  toScreen(id, u, v) { const m = this.map[id]; return m ? [m.x + u * m.dw, m.y + v * m.dh] : null; }
  plateU(id, sx) { const m = this.map[id]; return m ? (sx - m.x) / m.dw : null; }
  plateH(id) { return this.map[id]?.dh || 0; }
  panVx(id) { return this.map[id]?.vx || 0; }
  groundV(id, u) {
    const g = WORLD_GEO[id]?.gp; if (!g) return 0.8;
    if (u <= g[0][0]) return g[0][1];
    for (let i = 1; i < g.length; i++) if (u <= g[i][0]) { const k = (u - g[i - 1][0]) / (g[i][0] - g[i - 1][0] || 1); return g[i - 1][1] + (g[i][1] - g[i - 1][1]) * k; }
    return g[g.length - 1][1];
  }

  _enter(id, t) {
    this.since[id] = t;
    this._visits++;
    this.dir[id] = ((this._visits + Math.floor(hash(id) * 2)) % 2) ? 1 : -1;
  }

  /** Cover-fit on full height; spare width → pan. u in [0,1] across the spare width. */
  _drawWorld(ctx, id, w, h, t, alpha) {
    const a = get(id); if (!a || !ready(a.bg)) return;
    const img = a.bg;
    const cfg = ART_WORLDS[id] || {};
    const seed = hash(id) * 6.28;
    const local = Math.max(0, t - (this.since[id] ?? t));
    // Pan: one slow traverse of the scene per visit (ease in/out), then a gentle drift back.
    const span = this.hard ? 22 : 34; // seconds for one traverse
    const [p0, p1] = cfg.pan || [0.1, 0.9];
    const ph = (local / span) % 2;
    let k = ph < 1 ? smooth(ph) : 1 - smooth(ph - 1);
    if ((this.dir[id] || 1) < 0) k = 1 - k;
    let u = p0 + (p1 - p0) * k;
    // Ken Burns: slow breathing zoom + tiny vertical drift; beat push on top.
    const kb = 1.03 + 0.03 * (0.5 - 0.5 * Math.cos(local * (this.hard ? 0.16 : 0.09) + seed));
    const zoom = kb + this.push;
    const s = Math.max(h / img.naturalHeight, w / img.naturalWidth) * zoom;
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    const spareX = Math.max(0, dw - w), spareY = Math.max(0, dh - h);
    const vy = 0.5 + 0.35 * Math.sin(local * (this.hard ? 0.11 : 0.06) + seed);
    // beat push zooms toward the frame centre (keep centre fixed)
    // art6 (bass → world sway): a slow few-px drift with the low end, kept inside the spare width
    const swayPx = Math.min(spareX * 0.04, w * 0.012) * (this.bassSway || 0) * Math.sin(t * 0.9 + seed);
    const x = Math.max(-spareX, Math.min(0, -spareX * u + swayPx));
    const y = -spareY * vy;
    if (alpha > 0) { ctx.globalAlpha = alpha; ctx.drawImage(img, x, y, dw, dh); }
    const prevMap = this.map[id];
    this.map[id] = { x, y, dw, dh, t, vx: prevMap && t > prevMap.t ? (x - prevMap.x) / Math.max(1e-3, t - prevMap.t) : 0 };
  }

  /** Background plate: call right after the procedural preset. Returns true if drawn. */
  drawBg(ctx, w, h, preset, state, reduceMotion = false, hard = false, baseXform = null) {
    const t = state?.t || 0;
    const dt = Math.min(0.1, Math.max(0, t - (this.lastT || t))); this.lastT = t;
    this.hard = !!hard;
    if (preset !== this.cur) {
      if (this.has(preset)) { this.prev = this.active(); this.cur = preset; this.mix = this.prev ? 0 : 1; this._enter(preset, t); }
      else if (!this.has(this.cur || '')) { this.cur = preset; this.prev = null; }
      else { this.prev = this.cur; this.cur = preset; this.mix = 0; this._enter(preset, t); }
      this.dip = !!(this.prev && HARD_PLATES.includes(this.prev) && HARD_PLATES.includes(this.cur));
    }
    this.mix = Math.min(1, this.mix + dt / (this.dip ? DIP_XFADE : XFADE));
    if (this.mix >= 1) this.dip = false;
    const au = state?.audio || {};
    const pushMax = this.hard ? 0.07 : 0.035;
    const pushStep = this.hard ? 0.03 : 0.014;
    if (!reduceMotion && (au.beat || (au.onset || 0) > 0.6)) this.push = Math.min(pushMax, this.push + pushStep);
    this.push *= Math.pow(this.hard ? 0.08 : 0.15, dt);
    const e = Number(au.energy || 0);
    this.pulse += (Math.tanh(e * 1.3) - this.pulse) * Math.min(1, dt * 6);

    const curOk = this.has(this.cur);
    const prevOk = this.prev && this.has(this.prev);
    if (!curOk && !prevOk) return false;
    ctx.save();
    // Plate lives in screen space: camera zoom/shake never exposes black edges.
    if (baseXform) ctx.setTransform(baseXform);
    ctx.globalCompositeOperation = 'source-over';
    if (this.dip && prevOk && curOk && this.mix < 1) {
      const m = this.mix, first = m < 0.5;
      this._drawWorld(ctx, first ? this.prev : this.cur, w, h, t, PLATE_ALPHA);
      ctx.globalAlpha = DIP_DEPTH * smooth(first ? m * 2 : (1 - m) * 2);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
      if (!first) this._drawWorld(ctx, this.prev, w, h, t, 0); // keep prev map fresh (agents)
      this.dominant = first ? this.prev : this.cur;
    } else {
      if (prevOk && this.mix < 1) this._drawWorld(ctx, this.prev, w, h, t, PLATE_ALPHA);
      if (curOk) this._drawWorld(ctx, this.cur, w, h, t, (prevOk ? smooth(this.mix) : 1) * PLATE_ALPHA);
      this.dominant = (prevOk && this.mix < 0.5) ? this.prev : this.cur;
    }
    // Soft-clipped energy lift: soft-light, capped low (never sustained white)
    const lift = (this.hard ? 0.12 : 0.1) * this.pulse + 0.1 * (this.push / pushMax);
    if (lift > 0.01) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = Math.min(this.hard ? 0.26 : 0.2, lift);
      ctx.fillStyle = this.hard ? '#ffd8b0' : '#ffeedd';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
    return true;
  }

  /**
   * art6 (Darrell's rule): every audio role is a character or scenic agent IN the world — no band.
   *   pads   → mist drifting along the ground line
   *   bass   → water/ground ripples at the dreamer's feet + a slow world sway (in _drawWorld)
   *   drums  → beat push + light pulse (drawBg) and rain/ember bursts (drawFg)
   *   guitar/synth (harsh, hats, lead w/o vocal) → the world's accent: lightning, neon flicker,
   *            aurora, firefly swirl, forge flare, lamp flicker, cathedral light rays
   *   animals → birds / crows crossing the sky where the world has them
   *   vocals → the dreamer's motion and glow (renderer / performers)
   * Returns the per-role agent levels (also on globalThis.__LS_AGENTS__ for the shoot).
   */
  drawAgents(ctx, w, h, state, baseXform = null, quality = 1, feet = null) {
    const id = this.active(); if (!id) return null;
    const G = WORLD_GEO[id]; if (!G) return null;
    const t = state?.t || 0, A = this.ag;
    const dt = Math.max(0, Math.min(0.1, t - (A.lastT || t))); A.lastT = t;
    const au = state?.audio || {}, R = au.roles || au.instruments || {}, voc = au.vocal || {};
    const num = (v) => Math.max(0, Math.min(1, Number(v) || 0));
    const lv = A.lv || (A.lv = { pads: 0, bass: 0, drums: 0, accent: 0, vocals: 0 });
    const ema = (k, v, tau) => { lv[k] += (v - lv[k]) * (1 - Math.exp(-dt / tau)); };
    const drumsNow = Math.max(num(R.kick), num(R.snare));
    ema('pads', num(R.pads), 1.2); ema('bass', num(R.bass), 0.6); ema('drums', drumsNow, 0.25);
    ema('accent', Math.max(num(R.harsh) * 1.3, num(R.hats) * 0.8, voc.likelyVocal ? 0 : num(R.lead) * 0.6), 0.4);
    ema('vocals', Math.max(num(voc.intensity) * (voc.likelyVocal ? 1 : 0.5), num(R.vocalish) * 0.7), 0.5);
    this.bassSway = lv.bass;
    const a = this.prev && this.mix < 1 ? smooth(this.mix) : 1;
    const m = this.map[id]; if (!m) return null;
    const S = (u, v) => [m.x + u * m.dw, m.y + v * m.dh];
    const q = Math.max(0.5, Math.min(1, quality));
    // drums: a hit (kick/snare transient) kicks a short burst
    if (au.beat && drumsNow > 0.5) A.burst = Math.min(1, A.burst + 0.55);
    A.burst *= Math.pow(0.04, dt);
    ctx.save();
    if (baseXform) ctx.setTransform(baseXform);
    // pads → mist bands drifting along the ground line
    const mistA = (0.04 + 0.2 * lv.pads) * a;
    if (mistA > 0.02) {
      const gv = G.gp[Math.floor(G.gp.length / 2)][1];
      for (let i = 0; i < 3; i++) {
        const yy = S(0, gv - 0.06 + i * 0.05)[1];
        const xx = ((t * (6 + i * 4) + i * w * 0.4) % (w * 1.6)) - w * 0.3;
        const gr = ctx.createRadialGradient(xx, yy, 0, xx, yy, w * 0.7);
        gr.addColorStop(0, `rgba(${G.mist},${mistA * (1 - i * 0.22)})`); gr.addColorStop(1, `rgba(${G.mist},0)`);
        ctx.save(); ctx.translate(xx, yy); ctx.scale(1, 0.18); ctx.translate(-xx, -yy);
        ctx.fillStyle = gr; ctx.fillRect(xx - w * 0.7, yy - w * 0.7, w * 1.4, w * 1.4); ctx.restore();
      }
    }
    // bass → ripples (water worlds) / ground pulse rings at the dreamer's feet
    if (au.beat && lv.bass > 0.45 && (A.ripples.length < 4)) {
      let rx = feet ? feet[0] : w * (0.5 + 0.25 * Math.sin(t * 0.37)), ry = feet ? feet[1] : S(0, G.water ? G.water[2] : G.gp[0][1])[1];
      if (G.water && !feet) ry = S(0, G.water[2] + 0.06)[1];
      A.ripples.push({ x: rx, y: ry, t0: t, k: lv.bass });
    }
    A.ripples = A.ripples.filter(r => t - r.t0 < 1.6);
    for (const r of A.ripples) {
      const k = (t - r.t0) / 1.6;
      ctx.globalAlpha = (1 - k) * 0.35 * r.k * a;
      ctx.strokeStyle = G.water ? 'rgba(220,235,255,1)' : `rgba(${G.mist},1)`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(r.x, r.y + 2, 6 + k * w * 0.16, (6 + k * w * 0.16) * 0.14, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // guitar / synth → the world's accent agent
    const ac = lv.accent;
    ctx.globalCompositeOperation = 'screen';
    if (G.accent === 'lightning') {
      if (ac > 0.4 && t - A.boltAt > 2.6 && (au.beat || (au.onset || 0) > 0.6)) {
        A.boltAt = t; const f = G.focal[0]; const bu = Math.max(0.05, Math.min(0.95, f[0] + (Math.random() - 0.5) * 0.3));
        const pts = []; let px = S(bu, 0)[0], py = S(0, 0.02)[1]; const yEnd = S(0, f[1] + 0.05)[1];
        while (py < yEnd) { pts.push([px, py]); px += (Math.random() - 0.5) * w * 0.06; py += h * (0.03 + Math.random() * 0.03); }
        A.bolt = pts;
      }
      const age = t - A.boltAt;
      if (A.bolt && age < 0.35) {
        const fl = (1 - age / 0.35);
        ctx.globalAlpha = 0.18 * fl * a; ctx.fillStyle = 'rgb(220,215,255)'; ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 0.85 * fl * a; ctx.strokeStyle = 'rgb(235,230,255)'; ctx.lineWidth = 1.6; ctx.shadowColor = 'rgba(200,190,255,1)'; ctx.shadowBlur = 10;
        ctx.beginPath(); A.bolt.forEach((p0, i) => i ? ctx.lineTo(p0[0], p0[1]) : ctx.moveTo(p0[0], p0[1])); ctx.stroke(); ctx.shadowBlur = 0;
      }
    } else if (G.accent === 'neon' || G.accent === 'lamp' || G.accent === 'flare') {
      const flick = ac * (0.55 + 0.45 * Math.sin(t * 23) * Math.sin(t * 7.3)) + 0.15 * A.burst;
      const col = G.accent === 'neon' ? (i) => (i ? 'rgba(80,190,255,' : 'rgba(255,60,200,') : G.accent === 'lamp' ? () => 'rgba(200,225,255,' : () => 'rgba(255,120,40,';
      G.focal.forEach((f, i) => {
        if (G.accent === 'lamp' && i === 0) return; // the moon doesn't flicker
        const [fx, fy] = S(f[0], f[1]); const rr = f[2] * m.dw * (G.accent === 'flare' ? 0.9 : 0.7);
        const gr = ctx.createRadialGradient(fx, fy, 0, fx, fy, rr);
        gr.addColorStop(0, col(i) + (0.35 * flick * a) + ')'); gr.addColorStop(1, col(i) + '0)');
        ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fillRect(fx - rr, fy - rr, rr * 2, rr * 2);
      });
    } else if (G.accent === 'aurora' || G.accent === 'rays') {
      const al = (0.05 + 0.3 * ac) * a;
      if (al > 0.04) {
        ctx.globalAlpha = 1;
        if (G.accent === 'aurora') {
          const top = S(0, 0.08)[1], bh = h * 0.14;
          for (let i = 0; i < 2; i++) {
            const gr = ctx.createLinearGradient(0, top + i * bh * 0.5, 0, top + bh + i * bh * 0.5);
            const c = i ? '140,255,210' : '170,140,255';
            gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(0.5, `rgba(${c},${al * 0.6})`); gr.addColorStop(1, `rgba(${c},0)`);
            ctx.fillStyle = gr; ctx.beginPath();
            const y0 = top + i * bh * 0.5;
            ctx.moveTo(0, y0 + bh);
            for (let xx = 0; xx <= w; xx += w / 12) ctx.lineTo(xx, y0 + Math.sin(xx / w * 5 + t * 0.4 + i) * h * 0.03);
            ctx.lineTo(w, y0 + bh); for (let xx = w; xx >= 0; xx -= w / 12) ctx.lineTo(xx, y0 + bh + Math.sin(xx / w * 4 + t * 0.5 + i) * h * 0.02);
            ctx.closePath(); ctx.fill();
          }
        } else { // cathedral: shafts of light breathing with the guitar/synth
          const [fx, fy] = S(G.focal[0][0], G.focal[0][1]);
          for (let i = -2; i <= 2; i++) {
            const ang = i * 0.16 + Math.sin(t * 0.3) * 0.03;
            const gr = ctx.createLinearGradient(fx, fy, fx + Math.sin(ang) * h * 0.7, fy + h * 0.7);
            gr.addColorStop(0, `rgba(255,230,190,${al * 0.7})`); gr.addColorStop(1, 'rgba(255,230,190,0)');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(fx - 6, fy); ctx.lineTo(fx + 6, fy);
            ctx.lineTo(fx + Math.sin(ang) * h * 0.7 + 30, fy + h * 0.7); ctx.lineTo(fx + Math.sin(ang) * h * 0.7 - 30, fy + h * 0.7); ctx.closePath(); ctx.fill();
          }
        }
      }
    } else if (G.accent === 'fireflies') { // swirl of fireflies around the dreamer (or the glade)
      const n = Math.floor((6 + 26 * ac) * q);
      const [cx, cy] = feet ? [feet[0], feet[1] - h * 0.06] : S(0.5, G.gp[1][1] - 0.08);
      for (let i = 0; i < n; i++) {
        const r0 = hash('s' + i), ang = t * (0.5 + r0 * 0.9) + i * 2.4, rad = w * (0.05 + 0.18 * r0) * (0.6 + 0.6 * ac);
        const xx = cx + Math.cos(ang) * rad, yy = cy + Math.sin(ang) * rad * 0.45;
        ctx.globalAlpha = (0.3 + 0.6 * ac) * (0.5 + 0.5 * Math.sin(t * 3 + i)) * a;
        ctx.fillStyle = 'rgb(235,255,160)'; ctx.beginPath(); ctx.arc(xx, yy, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // animals → a small flock crossing the sky every ~25–40s (sooner on hats sparkle)
    if (G.birds) {
      if (!A.birds && t - A.birdsAt > (lv.accent > 0.4 ? 18 : 30)) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        A.birds = { t0: t, dir, y: h * (0.12 + Math.random() * 0.18), n: 5 + Math.floor(Math.random() * 5), seed: Math.random() * 10 };
        A.birdsAt = t;
      }
      if (A.birds) {
        const B = A.birds, k = (t - B.t0) / 9;
        if (k > 1) A.birds = null;
        else {
          ctx.strokeStyle = G.birds === 'crows' ? 'rgba(10,8,10,0.9)' : 'rgba(20,24,36,0.75)'; ctx.lineWidth = 1.2; ctx.globalAlpha = Math.sin(k * Math.PI) * a;
          for (let i = 0; i < B.n; i++) {
            const lead = B.dir > 0 ? -0.1 + k * 1.2 : 1.1 - k * 1.2;
            const bx = w * lead - B.dir * (i % 2 ? 1 : -1) * 0 - B.dir * Math.ceil(i / 2) * 11;
            const by = B.y + Math.ceil(i / 2) * 6 * (i % 2 ? 1 : -1) * 0.8 + Math.sin(t * 2 + i) * 2;
            const fl = Math.sin(t * 9 + i * 1.3) * 2.2, sz = 3.2;
            ctx.beginPath(); ctx.moveTo(bx - sz, by - fl); ctx.lineTo(bx, by); ctx.lineTo(bx + sz, by - fl); ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
    const out = { pads: { agent: 'mist', lv: +lv.pads.toFixed(2) }, bass: { agent: G.water ? 'water ripple + world sway' : 'ground pulse + world sway', lv: +lv.bass.toFixed(2) },
      drums: { agent: 'beat push + light pulse + ' + (ART_WORLDS[id]?.fx || 'pulse') + ' burst', lv: +lv.drums.toFixed(2) },
      guitarSynth: { agent: G.accent, lv: +lv.accent.toFixed(2) }, animals: { agent: G.birds || 'none', flying: !!A.birds }, vocals: { agent: 'dreamer motion + glow', lv: +lv.vocals.toFixed(2) } };
    globalThis.__LS_AGENTS__ = out;
    return out;
  }

  /** Light particle layer over the painting (rain / embers / fireflies / motes). */
  drawFg(ctx, w, h, state, baseXform = null, quality = 1) {
    const id = this.active(); if (!id) return;
    const fx = ART_WORLDS[id]?.fx; if (!fx) return;
    const t = state?.t || 0;
    const e = Math.min(1, Number(state?.audio?.energy || 0));
    const q = Math.max(0.5, Math.min(1, quality));
    const a = this.prev && this.mix < 1 ? smooth(this.mix) : 1;
    ctx.save();
    if (baseXform) ctx.setTransform(baseXform);
    ctx.globalCompositeOperation = 'source-over';
    if (fx === 'rain') {
      const n = Math.floor((70 + e * 60) * q * (1 + 1.4 * this.ag.burst));
      ctx.strokeStyle = 'rgba(210,220,255,0.9)'; ctx.lineWidth = 1;
      ctx.globalAlpha = Math.min(0.5, (0.18 + e * 0.14 + 0.12 * this.ag.burst) * a);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const sp = 620 + (i % 7) * 70;
        const x = ((hash('r' + i) * 1.3 * w) + t * 60) % (w * 1.1) - w * 0.05;
        const y = ((hash('y' + i) * h) + t * sp) % (h + 40) - 20;
        ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 16 + (i % 3) * 5);
      }
      ctx.stroke();
    } else if (fx === 'embers') {
      const n = Math.floor((28 + e * 34) * q * (1 + 1.2 * this.ag.burst));
      for (let i = 0; i < n; i++) {
        const r0 = hash('e' + i), r1 = hash('f' + i);
        const life = ((t * (0.07 + r1 * 0.08) + r0) % 1);
        const x = (r0 * w + Math.sin(t * (0.6 + r1) + i) * 18 + life * 30) % w;
        const y = h * (1.02 - life * 0.9);
        const al = Math.sin(life * Math.PI) * (0.5 + e * 0.4) * a;
        ctx.globalAlpha = al;
        ctx.fillStyle = i % 3 ? 'rgba(255,150,60,1)' : 'rgba(255,210,120,1)';
        const s = 1.1 + (i % 3) * 0.7;
        ctx.fillRect(x, y, s, s);
      }
    } else if (fx === 'fireflies' || fx === 'motes') {
      const n = Math.floor((fx === 'fireflies' ? 22 : 30) * q);
      const col = fx === 'fireflies' ? 'rgba(230,255,150,1)' : 'rgba(255,240,230,1)';
      for (let i = 0; i < n; i++) {
        const r0 = hash('m' + i), r1 = hash('n' + i);
        const x = (r0 * w + Math.sin(t * 0.21 + i * 1.7) * 26 + t * 4) % w;
        const y = h * (fx === 'fireflies' ? 0.55 + r1 * 0.4 : 0.1 + r1 * 0.75) + Math.cos(t * 0.17 + i) * 14;
        const tw = 0.5 + 0.5 * Math.sin(t * (1.2 + r1 * 2) + i * 2.3);
        ctx.globalAlpha = (fx === 'fireflies' ? 0.25 + tw * 0.6 : 0.12 + tw * 0.25) * a;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, y, fx === 'fireflies' ? 1.6 : 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
}

/**
 * art1/art2: human-scale silhouette — dark body, thin rim light on one side, gentle motion.
 * Returns the anchor object renderer expects ({fx, headY, chestY, baseY, scale, handY}).
 */
export function drawHumanSilhouette(ctx, o) {
  const H = o.heightPx, x = o.x, by = o.baseY, t = o.t || 0, k = o.i || 0;
  const e = Math.min(1, o.energy || 0);
  const amp = o.hard ? 0.5 + e * 0.8 : 0.25 + e * 0.35;
  const sw = Math.sin(t * (o.hard ? 3.2 : 1.3) + k * 1.9) * amp;
  const bob = Math.abs(Math.sin(t * (o.hard ? 3.2 : 1.3) + k)) * H * 0.012 * amp;
  const u = H / 100;
  const hipY = by - 48 * u - bob, shY = by - 82 * u - bob, headY = by - 92 * u - bob;
  const lean = sw * 3 * u;
  ctx.save();
  ctx.globalAlpha = o.opacity ?? 0.96;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // segment-wise widths so limbs taper (thigh > calf, upper arm > forearm) — reads human, not stick
  const limb = (pts, wd) => {
    const ws = Array.isArray(wd) ? wd : pts.map(() => wd);
    for (let p = 1; p < pts.length; p++) {
      ctx.lineWidth = ws[p - 1]; ctx.beginPath(); ctx.moveTo(pts[p - 1][0], pts[p - 1][1]); ctx.lineTo(pts[p][0], pts[p][1]); ctx.stroke();
    }
  };
  const body = (col, dx) => {
    ctx.strokeStyle = col; ctx.fillStyle = col;
    // legs: thigh → knee → ankle, tapered, plus a small foot
    const st = o.hard ? 8 : 4.5;
    const kneeY = by - 25 * u;
    const lk = [x - st * 0.55 * u + sw * 2 * u + dx, kneeY], rk = [x + st * 0.55 * u - sw * 2 * u + dx, kneeY];
    const la = [x - st * u + dx, by - 2 * u], ra = [x + st * u + dx, by - 2 * u];
    limb([[x - 3.8 * u + dx, hipY], lk, la], [8.4 * u, 6.2 * u]);
    limb([[x + 3.8 * u + dx, hipY], rk, ra], [8.4 * u, 6.2 * u]);
    limb([la, [la[0] - 3.2 * u, by]], 4 * u);
    limb([ra, [ra[0] + 3.2 * u, by]], 4 * u);
    // torso: broad shoulders, narrower waist, hips
    ctx.beginPath();
    ctx.moveTo(x - 10.5 * u + lean + dx, shY + 1.5 * u);
    ctx.quadraticCurveTo(x + lean + dx, shY - 3 * u, x + 10.5 * u + lean + dx, shY + 1.5 * u);
    ctx.quadraticCurveTo(x + 7.2 * u + lean * 0.5 + dx, hipY - 16 * u, x + 7.8 * u + dx, hipY + 2 * u);
    ctx.lineTo(x - 7.8 * u + dx, hipY + 2 * u);
    ctx.quadraticCurveTo(x - 7.2 * u + lean * 0.5 + dx, hipY - 16 * u, x - 10.5 * u + lean + dx, shY + 1.5 * u);
    ctx.closePath(); ctx.fill();
    // arms: shoulder → elbow → hand, tapered
    const raise = o.hard ? (0.4 + e * 0.6) : 0.15 + 0.2 * Math.max(0, Math.sin(t * 0.7 + k));
    limb([[x - 9.5 * u + lean + dx, shY + 2.5 * u], [x - 13.5 * u + lean + dx, shY + (17 - 30 * raise) * u], [x - 13 * u + lean + sw * 3 * u + dx, shY + (32 - 62 * raise) * u]], [4.8 * u, 3.9 * u]);
    limb([[x + 9.5 * u + lean + dx, shY + 2.5 * u], [x + 13.5 * u + lean + dx, shY + (17 - 22 * raise * (o.hard ? 1 : 0.4)) * u], [x + 12.5 * u + lean - sw * 3 * u + dx, shY + (32 - 50 * raise * (o.hard ? 1 : 0.3)) * u]], [4.8 * u, 3.9 * u]);
    // neck + head
    limb([[x + lean + dx, shY + 1 * u], [x + lean * 1.1 + dx, headY + 5 * u]], 4.6 * u);
    ctx.beginPath(); ctx.ellipse(x + lean * 1.2 + dx, headY, 5 * u, 6.1 * u, 0, 0, Math.PI * 2); ctx.fill();
  };
  // rim: same shape offset toward the light, then dark body on top
  ctx.globalAlpha = (o.opacity ?? 0.96) * 0.8;
  ctx.save(); ctx.shadowColor = o.rim || 'rgb(255,200,150)'; ctx.shadowBlur = 3.5 * u;
  body(o.rim || 'rgb(255,200,150)', -1.2 * u * (o.rimSide || 1));
  ctx.restore();
  ctx.globalAlpha = o.opacity ?? 0.96;
  body('rgb(9,8,12)', 0);
  // soft contact shadow (dark, never a glow)
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.beginPath(); ctx.ellipse(x, by + 1.5 * u, 16 * u, 2.6 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const scale = H / 48;
  return { chestY: shY + 8 * u, headY, fx: x + lean, baseY: by, scale, handY: shY + 20 * u, bodyH: H, dance: 'sway', vocalist: false };
}
