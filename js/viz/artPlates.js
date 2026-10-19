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
  misty_lake: { rim: 'rgba(200,220,255,0.9)', pan: [0.0, 0.3], fx: null, ground: 0.775, light: -1 },
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
const VER = 'art4';
const PLATE_ALPHA = 1.0;
const XFADE = 1.6;
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
    const x = -spareX * u;
    const y = -spareY * vy;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y, dw, dh);
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
    }
    this.mix = Math.min(1, this.mix + dt / XFADE);
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
    if (prevOk && this.mix < 1) this._drawWorld(ctx, this.prev, w, h, t, PLATE_ALPHA);
    if (curOk) this._drawWorld(ctx, this.cur, w, h, t, (prevOk ? smooth(this.mix) : 1) * PLATE_ALPHA);
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
      const n = Math.floor((70 + e * 60) * q);
      ctx.strokeStyle = 'rgba(210,220,255,0.9)'; ctx.lineWidth = 1;
      ctx.globalAlpha = (0.18 + e * 0.14) * a;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const sp = 620 + (i % 7) * 70;
        const x = ((hash('r' + i) * 1.3 * w) + t * 60) % (w * 1.1) - w * 0.05;
        const y = ((hash('y' + i) * h) + t * sp) % (h + 40) - 20;
        ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 16 + (i % 3) * 5);
      }
      ctx.stroke();
    } else if (fx === 'embers') {
      const n = Math.floor((28 + e * 34) * q);
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
