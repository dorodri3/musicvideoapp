/**
 * art1: painted world plates (bg + optional fg) drawn full-bleed with
 * Ken Burns drift, parallax, beat push, soft-clipped energy pulse and crossfades.
 * Procedural presets stay underneath as fallback / light texture.
 */
const BASE = new URL('../../assets/worlds/', import.meta.url).href;
export const ART_WORLDS = {
  meadow_fauna: { fg: true, rim: 'rgba(255,190,120,0.9)' },
  misty_lake: { fg: true, rim: 'rgba(200,215,240,0.85)' },
  forest: { fg: true, rim: 'rgba(220,235,180,0.85)' },
  dream_clouds: { fg: true, rim: 'rgba(255,215,240,0.9)' },
  space: { fg: false, rim: 'rgba(140,190,255,0.9)' },
  rainy_city: { fg: true, rim: 'rgba(255,120,190,0.9)' },
  apocalyptic_warzone: { fg: true, rim: 'rgba(255,140,60,0.95)' },
  metal_hall: { fg: true, rim: 'rgba(255,90,50,0.95)' },
  storm: { fg: true, rim: 'rgba(190,205,255,0.9)' },
  red_void: { fg: false, rim: 'rgba(255,80,70,0.9)' },
  dark_sparse: { fg: true, rim: 'rgba(190,195,220,0.8)' },
  cathedral_space: { fg: true, rim: 'rgba(230,200,255,0.85)' }
};
const VER = 'art1';
const cache = {};
function load(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img;
}
function get(id) {
  if (!ART_WORLDS[id]) return null;
  if (!cache[id]) {
    cache[id] = { bg: load(`${BASE}${id}/bg.jpg?v=${VER}`), fg: ART_WORLDS[id].fg ? load(`${BASE}${id}/fg.webp?v=${VER}`) : null };
  }
  return cache[id];
}
const ready = (img) => img && img.complete && img.naturalWidth > 0;
export function preloadArt() { for (const id of Object.keys(ART_WORLDS)) get(id); }

export class ArtPlates {
  constructor() {
    this.cur = null; this.prev = null; this.mix = 1;
    this.push = 0; this.pulse = 0; this.lastT = 0;
    preloadArt();
  }
  /** Does the current (resolved) preset have a ready painted plate? */
  has(id) { const a = get(id); return !!(a && ready(a.bg)); }
  rim(id) { return ART_WORLDS[id]?.rim || null; }
  active() { return this.cur && this.has(this.cur) ? this.cur : null; }

  _drawImg(ctx, img, w, h, zoom, ox, oy) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.drawImage(img, (w - dw) / 2 + ox, (h - dh) / 2 + oy, dw, dh);
  }
  _drawWorld(ctx, id, w, h, t, alpha, layer) {
    const a = get(id); if (!a) return;
    const seed = id.length * 1.7;
    const kb = 1.05 + 0.035 * Math.sin(t * 0.045 + seed) + this.push;
    const dx = Math.sin(t * 0.06 + seed) * w * 0.035;
    const dy = Math.cos(t * 0.05 + seed) * h * 0.02;
    ctx.globalAlpha = alpha;
    if (layer === 'bg' && ready(a.bg)) this._drawImg(ctx, a.bg, w, h, kb, dx, dy);
    if (layer === 'fg' && ready(a.fg)) this._drawImg(ctx, a.fg, w, h, kb + 0.04 + this.push * 0.8, dx * 2.2, dy * 1.6 + h * 0.01);
  }
  /** Background plate: call right after the procedural preset. Returns true if drawn. */
  drawBg(ctx, w, h, preset, state, reduceMotion = false) {
    const t = state?.t || 0;
    const dt = Math.min(0.1, Math.max(0, t - (this.lastT || t))); this.lastT = t;
    if (preset !== this.cur) {
      if (this.has(preset)) { this.prev = this.active(); this.cur = preset; this.mix = this.prev ? 0 : 1; }
      else if (!this.has(this.cur || '')) { this.cur = preset; this.prev = null; }
      else { this.prev = this.cur; this.cur = preset; this.mix = 0; }
    }
    this.mix = Math.min(1, this.mix + dt / 1.6);
    const au = state?.audio || {};
    if (!reduceMotion && (au.beat || (au.onset || 0) > 0.6)) this.push = Math.min(0.05, this.push + 0.022);
    this.push *= Math.pow(0.12, dt);
    const e = Number(au.energy || 0);
    this.pulse += (Math.tanh(e * 1.3) - this.pulse) * Math.min(1, dt * 6);

    const curOk = this.has(this.cur);
    const prevOk = this.prev && this.has(this.prev);
    if (!curOk && !prevOk) return false;
    ctx.save();
    // procedural shows through lightly (particles/shafts), plate owns the frame
    if (prevOk && this.mix < 1) this._drawWorld(ctx, this.prev, w, h, t, 0.92, 'bg');
    if (curOk) this._drawWorld(ctx, this.cur, w, h, t, (prevOk ? this.mix : Math.max(0.0, this.mix)) * 0.9, 'bg');
    // soft-clipped energy pulse: lift via 'screen', capped low (never sustained white)
    const lift = 0.16 * this.pulse + 0.1 * this.push / 0.05;
    if (lift > 0.01) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = Math.min(0.28, lift);
      ctx.fillStyle = '#ffe6c8';
      ctx.fillRect(-w * 0.2, -h * 0.2, w * 1.4, h * 1.4);
    }
    ctx.restore();
    return true;
  }
  drawFg(ctx, w, h, state) {
    const t = state?.t || 0;
    ctx.save();
    if (this.prev && this.mix < 1 && this.has(this.prev)) this._drawWorld(ctx, this.prev, w, h, t, 1 - this.mix, 'fg');
    if (this.has(this.cur)) this._drawWorld(ctx, this.cur, w, h, t, this.mix, 'fg');
    ctx.restore();
  }
}

/**
 * art1: human-scale silhouette — dark body, thin rim light on one side, gentle motion.
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
  const limb = (pts, wd) => { ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]); ctx.stroke(); };
  const body = (col, dx) => {
    ctx.strokeStyle = col; ctx.fillStyle = col;
    // legs
    const st = o.hard ? 9 : 6;
    limb([[x - 4 * u + dx, hipY], [x - st * u + sw * 2 * u + dx, by - 24 * u], [x - (st + 1) * u + dx, by]], 5.2 * u);
    limb([[x + 4 * u + dx, hipY], [x + st * u - sw * 2 * u + dx, by - 24 * u], [x + (st + 1) * u + dx, by]], 5.2 * u);
    // torso
    ctx.beginPath();
    ctx.moveTo(x - 8.5 * u + lean + dx, shY); ctx.quadraticCurveTo(x + lean + dx, shY - 2 * u, x + 8.5 * u + lean + dx, shY);
    ctx.quadraticCurveTo(x + 7 * u + lean * 0.5 + dx, hipY - 14 * u, x + 6 * u + dx, hipY + 3 * u); ctx.lineTo(x - 6 * u + dx, hipY + 3 * u);
    ctx.quadraticCurveTo(x - 7 * u + lean * 0.5 + dx, hipY - 14 * u, x - 8.5 * u + lean + dx, shY); ctx.closePath(); ctx.fill();
    // arms
    const raise = o.hard ? (0.4 + e * 0.6) : 0.15 + 0.2 * Math.max(0, Math.sin(t * 0.7 + k));
    limb([[x - 9 * u + lean + dx, shY + 2 * u], [x - 15 * u + lean + dx, shY + (16 - 30 * raise) * u], [x - 14 * u + lean + sw * 3 * u + dx, shY + (32 - 62 * raise) * u]], 3.6 * u);
    limb([[x + 9 * u + lean + dx, shY + 2 * u], [x + 15 * u + lean + dx, shY + (16 - 22 * raise * (o.hard ? 1 : 0.4)) * u], [x + 13 * u + lean - sw * 3 * u + dx, shY + (32 - 50 * raise * (o.hard ? 1 : 0.3)) * u]], 3.6 * u);
    // neck + head
    limb([[x + lean + dx, shY], [x + lean * 1.1 + dx, headY + 5 * u]], 4 * u);
    ctx.beginPath(); ctx.ellipse(x + lean * 1.2 + dx, headY, 4.6 * u, 5.6 * u, 0, 0, Math.PI * 2); ctx.fill();
  };
  // rim: same shape offset toward the light, then dark body on top
  ctx.globalAlpha = (o.opacity ?? 0.96) * 0.8;
  body(o.rim || 'rgb(255,200,150)', -1.1 * u * (o.rimSide || 1));
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
