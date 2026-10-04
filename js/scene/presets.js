/**
 * Scene presets — directed fantasy worlds (not spectrum toys).
 * Each preset draws a coherent environment; audio modulates, does not own, the image.
 */

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

function fillSky(ctx, w, h, c0, c1, c2) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, c0);
  g.addColorStop(0.55, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawStars(ctx, w, h, n, bright, seed = 1) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = ((Math.sin(i * 12.9898 + seed) * 43758.5453) % 1 + 1) % 1 * w;
    const y = ((Math.sin(i * 78.233 + seed) * 23421.631) % 1 + 1) % 1 * h * 0.7;
    const a = 0.3 + ((i * 17) % 7) / 10;
    ctx.fillStyle = `rgba(255,255,255,${a * bright})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function silhouettes(ctx, w, h, groundY, count, jagged, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, groundY);
  for (let i = 0; i <= count; i++) {
    const x = (i / count) * w;
    const peak = groundY - (20 + jagged * (0.5 + Math.abs(Math.sin(i * 1.7 + 2))));
    ctx.lineTo(x, peak);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

/** Shared particle field for atmosphere — secondary to scene, not the show */
function atmosParticles(ctx, w, h, t, audio, kind, intensity) {
  const n = Math.floor(20 + intensity * 40);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const phase = i * 1.7;
    let x, y, r, alpha;
    if (kind === 'rain') {
      x = ((i * 97 + t * 180) % (w + 40)) - 20;
      y = ((i * 53 + t * 420) % (h + 40));
      ctx.strokeStyle = `rgba(180,200,230,${0.15 + intensity * 0.25})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 12 + audio.energy * 10);
      ctx.stroke();
      continue;
    }
    if (kind === 'embers') {
      x = (Math.sin(t * 0.3 + phase) * 0.5 + 0.5) * w;
      y = h - ((t * 40 + i * 50) % (h * 0.9));
      r = 1 + (i % 3);
      alpha = 0.3 + audio.bass * 0.4;
      ctx.fillStyle = `rgba(255,${120 + (i % 80)},40,${alpha})`;
    } else if (kind === 'snow') {
      x = ((i * 60 + Math.sin(t + i) * 30) % w);
      y = ((t * 30 + i * 40) % h);
      r = 1.2 + (i % 2);
      alpha = 0.4;
      ctx.fillStyle = `rgba(240,248,255,${alpha})`;
    } else if (kind === 'dust') {
      x = ((Math.sin(t * 0.2 + phase) * 0.5 + 0.5) * w);
      y = ((Math.cos(t * 0.15 + phase * 0.7) * 0.5 + 0.5) * h);
      r = 0.8;
      alpha = 0.15 + intensity * 0.2;
      ctx.fillStyle = `rgba(220,200,160,${alpha})`;
    } else {
      // sparks / soft orbs
      x = ((Math.sin(t * 0.4 + phase) * 0.5 + 0.5) * w);
      y = ((Math.cos(t * 0.35 + phase) * 0.5 + 0.5) * h);
      r = 1 + audio.onset * 3;
      alpha = 0.2 + intensity * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}


/** Cast / characters truthy check (director may emit cast or characters). */
function wantsFigures(state) {
  if (!state) return false;
  if (state.characters) return true;
  const cast = state.cast || state.directive?.cast;
  if (cast == null) return false;
  if (Array.isArray(cast)) return cast.length > 0;
  if (typeof cast === 'object') return Object.keys(cast).length > 0;
  return !!cast;
}

function getMotifProps(state) {
  return state?.motifProps || state?.directive?.motifProps || null;
}

/**
 * Shared foreground silhouette stage band + optional figures.
 * Leaves mid-ground clear for path/props; FG is the character plane.
 * opts: { groundY, bandH, color, count, pose: 'stand'|'kneel'|'float'|'walk', spread }
 */
function figureStage(ctx, w, h, state, opts = {}) {
  const cast = state?.cast || state?.directive?.cast || null;
  const castObj = cast && !Array.isArray(cast) && typeof cast === 'object' ? cast : null;
  const placement = (castObj?.placement || opts.placement || 'foreground').toString().toLowerCase();

  // Honor cast.placement: sky → upper float, mid → mid path, foreground → FG band
  let groundY = opts.groundY ?? h * 0.78;
  let pose = opts.pose || 'stand';
  let drawBand = opts.band !== false;
  if (placement === 'sky' || placement === 'upper') {
    groundY = opts.skyY ?? h * 0.32;
    pose = 'float';
    drawBand = false;
  } else if (placement === 'mid' || placement === 'middle' || placement === 'path') {
    groundY = opts.midY ?? h * 0.62;
    pose = opts.pose || 'walk';
    drawBand = false;
  } else {
    // foreground (default)
    groundY = opts.groundY ?? h * 0.78;
  }

  const bandH = opts.bandH ?? h * 0.22;
  const opacity = castObj?.opacity != null ? Number(castObj.opacity) : (opts.opacity ?? 0.82);
  const baseColor = opts.color ?? `rgba(0,0,0,${Math.max(0.15, Math.min(1, opacity))})`;
  const color = baseColor;
  const action = (castObj?.action || castObj?.kind || opts.action || '').toString().toLowerCase();
  if (action === 'kneel' || action === 'kneeling') pose = 'kneel';
  else if (action === 'float' || action === 'dissolve' || action === 'fly') pose = 'float';
  else if (action === 'walk' || action === 'run' || action === 'runner') pose = 'walk';
  else if (action === 'stand' || action === 'still') pose = 'stand';
  const spread = opts.spread ?? 0.35;

  // Soft FG silhouette band — only when figures staged in foreground
  if (drawBand) {
    ctx.fillStyle = opts.bandColor || 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, groundY + bandH * 0.15);
    const segs = opts.bandSegs || 12;
    for (let i = 0; i <= segs; i++) {
      const x = (i / segs) * w;
      const jagged = (opts.bandJagged ?? 8) * (0.4 + Math.abs(Math.sin(i * 2.3 + 1)));
      ctx.lineTo(x, groundY + bandH * 0.1 - jagged);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  if (!wantsFigures(state)) return { groundY, bandH, placement };

  let count = opts.count;
  if (count == null) {
    if (Array.isArray(cast)) count = Math.min(3, Math.max(1, cast.length));
    else if (castObj?.count != null) count = Math.min(3, Math.max(1, Number(castObj.count) || 1));
    else count = 1;
  }

  ctx.save();
  if (opacity < 0.99) ctx.globalAlpha = Math.max(0.1, Math.min(1, opacity));
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const tt = count === 1 ? 0.5 : (0.5 - spread / 2) + (spread * i) / Math.max(1, count - 1);
    const fx = w * tt + Math.sin((state.t || 0) * 0.2 + i) * (opts.sway ?? 8);
    const baseY = groundY - 2;
    let bodyH = Math.max(Number(opts.bodyH) || 0, h * 0.55);
    let headR = Math.max(Number(opts.headR) || 0, bodyH * 0.18);
    const bodyW = Math.max(12, bodyH * 0.28);
    let bodyTop = baseY - bodyH;
    if (pose === 'kneel') {
      bodyH *= 0.68;
      bodyTop = baseY - bodyH;
      ctx.fillRect(fx - bodyW / 2, baseY - 8, bodyW, 8);
    } else if (pose === 'float') {
      bodyTop = groundY - bodyH - (placement === 'sky' || placement === 'upper' ? 0 : 30) - Math.sin((state.t || 0) * 0.8 + i) * 12;
    }
    ctx.fillRect(fx - bodyW / 2, bodyTop, bodyW, bodyH);
    ctx.beginPath();
    ctx.arc(fx, bodyTop, headR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return { groundY, bandH, placement, pose, count };
}

/** Soft mid-ground panel / glass / neon sign plane — empty for typography lane. */
function typePlane(ctx, w, h, opts = {}) {
  const x = opts.x ?? w * 0.62;
  const y = opts.y ?? h * 0.28;
  const pw = opts.w ?? w * 0.22;
  const ph = opts.h ?? h * 0.1;
  const a = opts.alpha ?? 0.12;
  const fill = opts.fill || `rgba(200,220,255,${a})`;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, pw, ph);
  ctx.strokeStyle = opts.stroke || `rgba(255,255,255,${a + 0.08})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, pw, ph);
  // inner readable inset
  ctx.strokeStyle = `rgba(255,255,255,${a * 0.5})`;
  ctx.strokeRect(x + 4, y + 4, pw - 8, ph - 8);
}

/** Reserve / lightly mark 1–2 mid-ground scenic props from motifProps. */
function motifMarks(ctx, w, h, state, opts = {}) {
  if (wantsFigures(state)) return;
  const props = getMotifProps(state);
  if (!props) return;
  const midY = opts.midY ?? h * 0.58;
  const items = Array.isArray(props) ? props.slice(0, 2) : [props];
  ctx.save();
  for (let i = 0; i < items.length; i++) {
    const x = w * (0.28 + i * 0.32);
    const y = midY - (i % 2) * 12;
    ctx.fillStyle = opts.color || 'rgba(255,220,160,0.22)';
    ctx.beginPath();
    ctx.arc(x, y, 6 + i * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = opts.stroke || 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 14, y - 18, 28, 22);
  }
  ctx.restore();
}



/** When true, skip pastoral fauna (deer/fish/herd/bird) — set by drawPreset under hard. */
let _forbidPastoralFauna = false;

/** Stylized soft fauna silhouettes (deer / bird / fish / herd) — not photoreal.
 * HOLD-0321: under hardLock / forbidPastoral / hardOnly NEVER paint pastoral fauna.
 */
function faunaSilhouette(ctx, x, y, kind, scale = 1, color = 'rgba(0,0,0,0.55)') {
  if (_forbidPastoralFauna) return;
  if (kind === 'deer' || kind === 'fish' || kind === 'herd') {
    /* gated above — kept for clarity */
  }
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (kind === 'deer') {
    // body
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // neck + head
    ctx.fillRect(10, -14, 4, 12);
    ctx.beginPath();
    ctx.ellipse(14, -16, 5, 3.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // antlers (simple V)
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(12, -18); ctx.lineTo(8, -28); ctx.moveTo(12, -18); ctx.lineTo(16, -26);
    ctx.stroke();
    // legs
    ctx.fillRect(-8, 6, 2.5, 12);
    ctx.fillRect(-2, 6, 2.5, 12);
    ctx.fillRect(4, 6, 2.5, 11);
    ctx.fillRect(10, 6, 2.5, 11);
  } else if (kind === 'bird') {
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2, 0); ctx.quadraticCurveTo(-14, -8, -18, -2); ctx.quadraticCurveTo(-8, 2, -2, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.quadraticCurveTo(12, -6, 16, 0); ctx.quadraticCurveTo(8, 2, 2, 0);
    ctx.fill();
  } else if (kind === 'fish') {
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(-14, -5); ctx.lineTo(-14, 5); ctx.closePath();
    ctx.fill();
  } else if (kind === 'herd') {
    // distant multi-blob herd
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(-18 + i * 12, (i % 2) * 2, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-20 + i * 12, 3, 1.5, 6);
      ctx.fillRect(-14 + i * 12, 3, 1.5, 6);
    }
  }
  ctx.restore();
}

export const PRESETS = {
  rainy_city(ctx, w, h, state) {
    const { t, audio, emotion, intensity, palette } = state;
    fillSky(ctx, w, h, '#060810', '#121828', '#1a2230');
    // distant skyline
    ctx.fillStyle = '#0a0e18';
    for (let i = 0; i < 18; i++) {
      const bw = w / 16;
      const x = i * bw - 5;
      const bh = 80 + Math.abs(Math.sin(i * 2.1)) * 180; // geometry locked — bass ≠ height
      ctx.fillRect(x, h * 0.55 - bh * 0.3, bw * 0.85, bh);
      // windows
      if (i % 2 === 0) {
        ctx.fillStyle = `rgba(255,200,100,${0.15 + emotion.hope * 0.3 + audio.mid * 0.2 + audio.bass * 0.25})`;
        for (let wy = 0; wy < 8; wy++) {
          ctx.fillRect(x + 4, h * 0.55 - bh * 0.3 + 10 + wy * 14, 3, 4);
          ctx.fillRect(x + bw * 0.4, h * 0.55 - bh * 0.3 + 10 + wy * 14, 3, 4);
        }
        ctx.fillStyle = '#0a0e18';
      }
    }
    // wet street reflection
    const streetPulse = 0.3 + audio.bass * 0.25;
    const rg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    rg.addColorStop(0, `rgba(20,30,50,${streetPulse})`);
    rg.addColorStop(1, '#05070c');
    ctx.fillStyle = rg;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // wet-street bass pulse highlight
    ctx.fillStyle = `rgba(80,160,220,${0.04 + audio.bass * 0.12})`;
    ctx.fillRect(0, h * 0.72, w, h * 0.06);
    // neon streak
    ctx.strokeStyle = `rgba(80,200,255,${0.3 + audio.treble * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72 + Math.sin(t) * 3);
    ctx.lineTo(w, h * 0.74);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,40,120,${0.25 + audio.mid * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.76);
    ctx.lineTo(w, h * 0.73 + Math.cos(t * 0.7) * 4);
    ctx.stroke();
    atmosParticles(ctx, w, h, t, audio, 'rain', intensity);
    // neon / glass signage plane for typography
    typePlane(ctx, w, h, { x: w * 0.08, y: h * 0.32, w: w * 0.18, h: h * 0.08, alpha: 0.14 + audio.treble * 0.1, fill: `rgba(80,200,255,${0.1 + audio.treble * 0.12})` });
    typePlane(ctx, w, h, { x: w * 0.7, y: h * 0.38, w: w * 0.2, h: h * 0.07, alpha: 0.12, fill: `rgba(255,40,120,${0.1 + audio.mid * 0.1})` });
    motifMarks(ctx, w, h, state, { midY: h * 0.62 });
    // wet-street walker plane (FG)
    figureStage(ctx, w, h, state, { groundY: h * 0.78, bandH: h * 0.2, color: 'rgba(0,0,0,0.85)', pose: 'walk', bandColor: 'rgba(5,8,14,0.55)', bandJagged: 4 });
  },

  empty_highway(ctx, w, h, state) {
    const { t, audio, emotion, intensity } = state;
    fillSky(ctx, w, h, '#1a1030', '#c87840', '#201018');
    // sun / afterglow
    const sx = w * 0.7, sy = h * 0.42;
    const glow = ctx.createRadialGradient(sx, sy, 5, sx, sy, 180 + audio.energy * 80);
    glow.addColorStop(0, `rgba(255,220,140,${0.7 + emotion.hope * 0.3})`);
    glow.addColorStop(0.4, 'rgba(255,120,60,0.25)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // road vanishing
    ctx.fillStyle = '#141018';
    ctx.beginPath();
    ctx.moveTo(w * 0.45, h * 0.55);
    ctx.lineTo(w * 0.55, h * 0.55);
    ctx.lineTo(w * 1.1, h);
    ctx.lineTo(-w * 0.1, h);
    ctx.closePath();
    ctx.fill();
    // center dashes
    ctx.strokeStyle = `rgba(255,220,100,${0.4 + audio.onset * 0.4})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 30]);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.56);
    ctx.lineTo(w * 0.5, h);
    ctx.stroke();
    ctx.setLineDash([]);
    // horizon haze
    ctx.fillStyle = 'rgba(255,180,100,0.08)';
    ctx.fillRect(0, h * 0.5, w, h * 0.08);
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity);
    // roadside billboard plane (typography hook)
    typePlane(ctx, w, h, { x: w * 0.72, y: h * 0.3, w: w * 0.16, h: h * 0.09, alpha: 0.15, fill: 'rgba(255,200,120,0.12)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.58 });
    // vanishing-point runner / shoulder band
    figureStage(ctx, w, h, state, { groundY: h * 0.82, bandH: h * 0.16, color: 'rgba(10,8,12,0.88)', pose: 'walk', bandColor: 'rgba(20,16,22,0.5)', bandJagged: 3, bodyH: 40 });
  },

  burning_desert(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#1a0800', '#c04010', '#401000');
    // dunes
    ctx.fillStyle = '#6a3010';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const y = h * 0.55 + Math.sin(x * 0.01 + t * 0.1) * 30 + Math.sin(x * 0.03) * 15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.fillStyle = '#8a4820';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const y = h * 0.68 + Math.sin(x * 0.015 + 2) * 25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.fill();
    // heat shimmer sun
    const sun = ctx.createRadialGradient(w * 0.5, h * 0.35, 10, w * 0.5, h * 0.35, 100 + audio.bass * 60);
    sun.addColorStop(0, `rgba(255,255,200,${0.9})`);
    sun.addColorStop(0.3, `rgba(255,100,20,${0.4 + emotion.aggression * 0.3})`);
    sun.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    atmosParticles(ctx, w, h, t, audio, 'embers', intensity);
    motifMarks(ctx, w, h, state, { midY: h * 0.62, color: 'rgba(255,160,60,0.28)' });
    figureStage(ctx, w, h, state, { groundY: h * 0.8, bandH: h * 0.14, color: 'rgba(20,8,0,0.85)', pose: 'walk', bandColor: 'rgba(60,30,10,0.45)', bandJagged: 8 });
  },

  ancient_ruins(ctx, w, h, state) {
    const { t, audio, intensity } = state;
    fillSky(ctx, w, h, '#1a1828', '#3a4058', '#2a2830');
    drawStars(ctx, w, h, 40, 0.4, 3);
    // pillars
    ctx.fillStyle = '#2a2830';
    for (let i = 0; i < 7; i++) {
      const x = w * (0.1 + i * 0.12);
      const ph = 120 + Math.sin(i + t * 0.05) * 20 + audio.energy * 30;
      ctx.fillRect(x, h * 0.75 - ph, 28, ph);
      ctx.fillRect(x - 6, h * 0.75 - ph - 12, 40, 14);
      // cracks
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.moveTo(x + 10, h * 0.75 - ph * 0.5);
      ctx.lineTo(x + 18, h * 0.75 - ph * 0.2);
      ctx.stroke();
    }
    // ground
    ctx.fillStyle = '#1a1818';
    ctx.fillRect(0, h * 0.75, w, h * 0.25);
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity);
    typePlane(ctx, w, h, { x: w * 0.55, y: h * 0.42, w: w * 0.2, h: h * 0.08, alpha: 0.1, fill: 'rgba(180,170,140,0.1)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.7 });
    figureStage(ctx, w, h, state, { groundY: h * 0.8, bandH: h * 0.18, color: 'rgba(8,8,10,0.9)', pose: 'kneel', bandColor: 'rgba(18,16,14,0.65)', bandJagged: 14 });
  },

  cathedral_space(ctx, w, h, state) {
    const { t, audio, emotion, intensity } = state;
    fillSky(ctx, w, h, '#080810', '#101028', '#0a0a18');
    // arches
    ctx.strokeStyle = `rgba(180,160,220,${0.25 + emotion.hope * 0.3})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const x = w * (0.15 + i * 0.15);
      ctx.beginPath();
      ctx.moveTo(x - 40, h);
      ctx.quadraticCurveTo(x, h * 0.15, x + 40, h);
      ctx.stroke();
    }
    // light shafts
    const shaftAlpha = 0.08 + audio.treble * 0.15 + emotion.hope * 0.12;
    for (let i = 0; i < 3; i++) {
      const x = w * (0.3 + i * 0.2) + Math.sin(t * 0.3 + i) * 10;
      const g = ctx.createLinearGradient(x, 0, x + 40, h);
      g.addColorStop(0, `rgba(255,240,200,${shaftAlpha})`);
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 20, 0);
      ctx.lineTo(x + 30, 0);
      ctx.lineTo(x + 80, h);
      ctx.lineTo(x - 60, h);
      ctx.fill();
    }
    // stained bloom
    const sg = ctx.createRadialGradient(w * 0.5, h * 0.2, 10, w * 0.5, h * 0.2, 120);
    sg.addColorStop(0, `rgba(255,200,100,${0.25 + audio.mid * 0.3})`);
    sg.addColorStop(0.5, `rgba(120,60,200,${0.15})`);
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.6);
    // stained-glass / wall plane for typography
    typePlane(ctx, w, h, { x: w * 0.38, y: h * 0.18, w: w * 0.24, h: h * 0.14, alpha: 0.14, fill: `rgba(255,200,100,${0.08 + audio.mid * 0.1})` });
    motifMarks(ctx, w, h, state, { midY: h * 0.55 });
    figureStage(ctx, w, h, state, { groundY: h * 0.88, bandH: h * 0.1, color: 'rgba(5,5,12,0.8)', pose: 'stand', band: false, bodyH: 48, headR: 8 });
  },

  space(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#000008', '#050518', '#0a0520');
    drawStars(ctx, w, h, 120 + Math.floor(intensity * 80), 0.6 + audio.treble * 0.4, 7);
    // nebula
    const nx = w * 0.5 + Math.sin(t * 0.1) * 40;
    const ny = h * 0.45;
    const neb = ctx.createRadialGradient(nx, ny, 20, nx, ny, 220 + audio.energy * 100);
    neb.addColorStop(0, `rgba(180,100,255,${0.25 + emotion.hope * 0.2})`);
    neb.addColorStop(0.4, `rgba(40,80,200,${0.15})`);
    neb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, w, h);
    // planet
    const px = w * 0.75, py = h * 0.7;
    const pg = ctx.createRadialGradient(px - 20, py - 20, 5, px, py, 70);
    pg.addColorStop(0, '#80a0c0');
    pg.addColorStop(0.7, '#203050');
    pg.addColorStop(1, '#050810');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, 70, 0, Math.PI * 2);
    ctx.fill();
    atmosParticles(ctx, w, h, t, audio, 'orbs', intensity * 0.5);
    typePlane(ctx, w, h, { x: w * 0.12, y: h * 0.2, w: w * 0.18, h: h * 0.07, alpha: 0.1, fill: 'rgba(160,180,255,0.1)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.5, color: 'rgba(180,200,255,0.25)' });
    figureStage(ctx, w, h, state, { groundY: h * 0.7, band: false, color: 'rgba(200,210,255,0.45)', pose: 'float', bodyH: 32 });
  },

  /** HOLD-0330: cold lightning / slate storm — NEVER cozy warm stage */
  storm(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    // HOLD-0330: cold thunder palette — dark steel/blue, NOT warm stage
    fillSky(ctx, w, h, '#050810', '#0c1420', '#080c14');
    // thunderheads — cold blue-grey (deterministic, no Math.random wash)
    ctx.fillStyle = 'rgba(18,28,42,0.82)';
    for (let i = 0; i < 7; i++) {
      const x = ((i * 167 + t * 28) % (w + 220)) - 110;
      ctx.beginPath();
      ctx.ellipse(x, h * 0.18 + (i % 3) * 22, 110 + (i % 4) * 12, 36 + (i % 3) * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    silhouettes(ctx, w, h, h * 0.72, 20, 40, '#04060c');
    // lightning bolts — cold blue-white flashes (kick/onset/bass)
    const boltTrig = (audio.onset || 0) > 0.35 || (audio.bass || 0) > 0.55
      || (state.events && state.events.includes('sky_tear'))
      || ((Math.sin(t * 7.3) * 0.5 + 0.5) > 0.82 && (audio.energy || 0) > 0.4);
    if (boltTrig) {
      const boltA = 0.55 + (audio.onset || 0) * 0.35 + (audio.bass || 0) * 0.2;
      const seed = Math.floor(t * 4) * 17;
      for (let b = 0; b < 2; b++) {
        const lx = w * (0.22 + ((seed + b * 41) % 55) / 100);
        ctx.strokeStyle = `rgba(190,220,255,${boltA})`;
        ctx.lineWidth = 2.5 + (audio.onset || 0) * 2.5;
        ctx.shadowColor = 'rgba(160,200,255,0.85)';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        let y = 0;
        let x = lx;
        let step = 0;
        while (y < h * 0.72 && step < 14) {
          step++;
          y += 28 + ((seed + step * 13 + b) % 22);
          x += (((seed + step * 7 + b * 3) % 70) - 35);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        // fork
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(lx + (x - lx) * 0.45, h * 0.32);
        ctx.lineTo(lx + (x - lx) * 0.45 + 40, h * 0.48);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(180,210,255,${0.08 + (audio.onset || 0) * 0.18})`;
      ctx.fillRect(0, 0, w, h);
    }
    // rain streaks — cold blue-white
    ctx.save();
    ctx.strokeStyle = `rgba(160,190,230,${0.18 + intensity * 0.22})`;
    ctx.lineWidth = 1;
    const rainN = Math.floor(40 + intensity * 50);
    for (let i = 0; i < rainN; i++) {
      const rx = ((i * 97 + t * 380) % (w + 40)) - 20;
      const ry = ((i * 53 + t * 520) % (h + 60)) - 30;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 4, ry + 18 + (i % 5));
      ctx.stroke();
    }
    ctx.restore();
    atmosParticles(ctx, w, h, t, audio, 'rain', intensity);
    motifMarks(ctx, w, h, state, { midY: h * 0.65, color: 'rgba(140,180,230,0.28)', stroke: 'rgba(180,210,255,0.22)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.8, bandH: h * 0.15, color: 'rgba(0,0,0,0.92)', pose: 'stand',
      bandColor: 'rgba(8,12,22,0.65)', bandJagged: 8
    });
  },

  ocean(ctx, w, h, state) {
    if (_forbidPastoralFauna) return PRESETS.storm(ctx, w, h, state);
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#061018', '#0a2838', '#0a2030');
    // moon
    ctx.fillStyle = `rgba(230,240,255,${0.7 + emotion.hope * 0.2})`;
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.25, 28, 0, Math.PI * 2);
    ctx.fill();
    // waves
    for (let layer = 0; layer < 4; layer++) {
      ctx.fillStyle = `rgba(${10 + layer * 15},${40 + layer * 20},${60 + layer * 25},${0.5})`;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) {
        const y = h * (0.55 + layer * 0.08) +
          Math.sin(x * 0.02 + t * (0.8 + layer * 0.3) + layer) * (12 + audio.bass * 20) +
          Math.sin(x * 0.05 + t) * 5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.fill();
    }
    // underwater light rays when hopeful
    if (emotion.hope > 0.4) {
      ctx.fillStyle = `rgba(100,180,220,${0.05 + emotion.hope * 0.08})`;
      for (let i = 0; i < 4; i++) {
        const x = w * (0.2 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.5);
        ctx.lineTo(x + 30, h);
        ctx.lineTo(x - 30, h);
        ctx.fill();
      }
    }
    faunaSilhouette(ctx, w * 0.3, h * 0.7, 'fish', 0.85, 'rgba(10,40,60,0.35)');
    faunaSilhouette(ctx, w * 0.55, h * 0.75, 'fish', 0.7, 'rgba(10,40,60,0.3)');
    faunaSilhouette(ctx, w * 0.75, h * 0.68, 'fish', 0.6, 'rgba(10,40,60,0.25)');
    typePlane(ctx, w, h, { x: w * 0.15, y: h * 0.32, w: w * 0.25, h: h * 0.09, alpha: 0.1, fill: 'rgba(180,210,230,0.1)' });
    atmosParticles(ctx, w, h, t, audio, 'orbs', intensity * 0.4);
    motifMarks(ctx, w, h, state, { midY: h * 0.6, color: 'rgba(100,180,220,0.25)' });
    figureStage(ctx, w, h, state, { groundY: h * 0.82, bandH: h * 0.12, color: 'rgba(0,10,20,0.8)', pose: 'stand', bandColor: 'rgba(5,20,35,0.45)', bandJagged: 4 });
  },

  forest(ctx, w, h, state) {
    if (_forbidPastoralFauna) return PRESETS.metal_hall(ctx, w, h, state);
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#0a1208', '#142018', '#0c180c');
    // mist
    ctx.fillStyle = `rgba(160,180,160,${0.08 + emotion.darkness * 0.05})`;
    ctx.fillRect(0, h * 0.4, w, h * 0.3);
    // trees
    for (let i = 0; i < 14; i++) {
      const x = (i / 14) * w + Math.sin(i * 3) * 10;
      const th = 180 + Math.abs(Math.sin(i * 1.3)) * 120;
      ctx.fillStyle = i % 3 === 0 ? '#0a1008' : '#121a10';
      ctx.fillRect(x - 8, h - th, 16, th);
      // canopy
      ctx.beginPath();
      ctx.moveTo(x - 40, h - th + 40);
      ctx.lineTo(x, h - th - 40 - audio.energy * 20);
      ctx.lineTo(x + 40, h - th + 40);
      ctx.fill();
    }
    // soft fauna proxies (heal — not destroy)
    faunaSilhouette(ctx, w * 0.72, h * 0.72, 'deer', 0.95, 'rgba(8,12,6,0.5)');
    faunaSilhouette(ctx, w * 0.25, h * 0.35, 'bird', 0.8, 'rgba(10,14,8,0.4)');
    faunaSilhouette(ctx, w * 0.4, h * 0.3, 'bird', 0.65, 'rgba(10,14,8,0.35)');
    typePlane(ctx, w, h, { x: w * 0.55, y: h * 0.4, w: w * 0.22, h: h * 0.08, alpha: 0.1, fill: 'rgba(160,180,140,0.1)' });
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.5);
    motifMarks(ctx, w, h, state, { midY: h * 0.7 });
    figureStage(ctx, w, h, state, { groundY: h * 0.88, bandH: h * 0.1, color: 'rgba(4,8,4,0.85)', pose: 'walk', bandColor: 'rgba(8,12,8,0.45)', bandJagged: 10 });
  },

  snow(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#1a2838', '#8090a0', '#c0d0e0');
    // distant hills
    ctx.fillStyle = '#d8e4f0';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) {
      ctx.lineTo(x, h * 0.55 + Math.sin(x * 0.008) * 40);
    }
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.fillStyle = '#eef4fa';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // lone tree
    ctx.fillStyle = '#203040';
    ctx.fillRect(w * 0.3 - 4, h * 0.55, 8, 80);
    ctx.beginPath();
    ctx.moveTo(w * 0.3 - 30, h * 0.6);
    ctx.lineTo(w * 0.3, h * 0.45);
    ctx.lineTo(w * 0.3 + 30, h * 0.6);
    ctx.fill();
    atmosParticles(ctx, w, h, t, audio, 'snow', intensity);
    typePlane(ctx, w, h, { x: w * 0.65, y: h * 0.35, w: w * 0.14, h: h * 0.06, alpha: 0.12, fill: 'rgba(200,220,240,0.12)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.68 });
    faunaSilhouette(ctx, w * 0.55, h * 0.58, 'herd', 0.65, 'rgba(60,70,80,0.35)');
    typePlane(ctx, w, h, { x: w * 0.1, y: h * 0.3, w: w * 0.2, h: h * 0.08, alpha: 0.1, fill: 'rgba(200,210,220,0.1)' });
    figureStage(ctx, w, h, state, { groundY: h * 0.82, bandH: h * 0.14, color: 'rgba(20,30,40,0.75)', pose: 'walk', bandColor: 'rgba(220,230,240,0.35)', bandJagged: 4 });
  },

  futuristic_city(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    const q = state.quality ?? 1;
    const roles = state.roles || state.instruments || {};
    fillSky(ctx, w, h, '#04041a', '#0a0a30', '#120820');
    drawStars(ctx, w, h, Math.floor(30 * q), 0.35, 2);
    // LED panel backdrop columns
    const cols = Math.floor(18 * q);
    for (let i = 0; i < cols; i++) {
      const bw = 20 + (i % 5) * 10;
      const x = (i * w) / Math.max(16, cols - 2);
      const bh = 100 + Math.abs(Math.sin(i * 2.4)) * 220; // geometry locked — bass ≠ height
      ctx.fillStyle = '#080818';
      ctx.fillRect(x, h - bh, bw, bh);
      // soft panel glow bands
      ctx.fillStyle = `rgba(0,255,220,${0.28 + (roles.hats || audio.treble) * 0.45 + (roles.bass || audio.bass) * 0.35})`;
      ctx.fillRect(x + 2, h - bh + 4, bw - 4, 4);
      for (let py = 12; py < bh - 10; py += 18) {
        ctx.fillStyle = `rgba(80,200,255,${0.06 + intensity * 0.08})`;
        ctx.fillRect(x + 3, h - bh + py, bw - 6, 2);
      }
      if (i % 3 === 0) {
        ctx.fillStyle = `rgba(255,0,180,${0.22 + (roles.lead || audio.mid) * 0.35})`;
        ctx.fillRect(x + bw - 4, h - bh * 0.6, 3, bh * 0.4);
      }
    }
    // hologram / LED floor grid
    ctx.strokeStyle = `rgba(0,200,255,${0.18 + intensity * 0.18})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < Math.floor(12 * q); i++) {
      const y = h * 0.75 + i * 12;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // horizontal glow wash (festival LED strip)
    const strip = ctx.createLinearGradient(0, h * 0.62, 0, h * 0.72);
    strip.addColorStop(0, 'rgba(0,0,0,0)');
    strip.addColorStop(0.5, `rgba(120,200,255,${0.12 + (roles.pads || 0) * 0.2 + (roles.bass || audio.bass) * 0.18})`);
    strip.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = strip;
    ctx.fillRect(0, h * 0.62, w, h * 0.1);
    atmosParticles(ctx, w, h, t, audio, 'orbs', intensity);
    // LED / glass panel planes for typography
    typePlane(ctx, w, h, { x: w * 0.1, y: h * 0.25, w: w * 0.2, h: h * 0.1, alpha: 0.16, fill: `rgba(0,255,220,${0.1 + intensity * 0.08})` });
    typePlane(ctx, w, h, { x: w * 0.68, y: h * 0.35, w: w * 0.22, h: h * 0.08, alpha: 0.14, fill: `rgba(255,0,180,${0.1 + audio.mid * 0.1})` });
    motifMarks(ctx, w, h, state, { midY: h * 0.7, color: 'rgba(0,255,220,0.25)' });
    figureStage(ctx, w, h, state, { groundY: h * 0.86, bandH: h * 0.12, color: 'rgba(0,0,10,0.85)', pose: 'walk', bandColor: 'rgba(0,20,40,0.45)', bandJagged: 2 });
  },

  dream_clouds(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#181030', '#403070', '#8060a0');
    for (let i = 0; i < 8; i++) {
      const x = w * (0.1 + (i % 4) * 0.25) + Math.sin(t * 0.2 + i) * 30;
      const y = h * (0.2 + Math.floor(i / 4) * 0.35) + Math.cos(t * 0.15 + i) * 20;
      const g = ctx.createRadialGradient(x, y, 10, x, y, 100 + audio.energy * 40);
      g.addColorStop(0, `rgba(255,240,255,${0.35 + emotion.hope * 0.2})`);
      g.addColorStop(0.5, `rgba(180,140,255,${0.2})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, 110, 50, Math.sin(t + i) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // floating island hint
    ctx.fillStyle = 'rgba(60,40,80,0.5)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.65, 80 + audio.mid * 30, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    faunaSilhouette(ctx, w * 0.3, h * 0.35, 'bird', 0.9, 'rgba(80,60,120,0.4)');
    faunaSilhouette(ctx, w * 0.7, h * 0.28, 'bird', 0.7, 'rgba(80,60,120,0.35)');
    typePlane(ctx, w, h, { x: w * 0.35, y: h * 0.45, w: w * 0.3, h: h * 0.1, alpha: 0.12, fill: 'rgba(220,200,255,0.12)' });
    atmosParticles(ctx, w, h, t, audio, 'orbs', intensity * 0.7);
    motifMarks(ctx, w, h, state, { midY: h * 0.65, color: 'rgba(200,180,255,0.25)' });
    figureStage(ctx, w, h, state, { groundY: h * 0.75, band: false, pose: 'float', color: 'rgba(40,30,60,0.5)', bodyH: 34 });
  },

  endless_staircase(ctx, w, h, state) {
    const { t, audio, intensity } = state;
    fillSky(ctx, w, h, '#101018', '#181828', '#0c0c14');
    ctx.strokeStyle = `rgba(200,200,220,${0.35 + audio.energy * 0.3})`;
    ctx.lineWidth = 1.5;
    const steps = 18;
    const scroll = (t * 40) % 40;
    for (let i = -2; i < steps; i++) {
      const y = h * 0.15 + i * 40 + scroll;
      const inset = 40 + i * 8;
      ctx.strokeRect(inset, y, w - inset * 2, 36);
      // vertical risers perspective
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(w * 0.5 - 20, h * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w - inset, y);
      ctx.lineTo(w * 0.5 + 20, h * 0.1);
      ctx.stroke();
    }
    // vanishing glow
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.1, 5, w * 0.5, h * 0.1, 80);
    vg.addColorStop(0, `rgba(255,255,255,${0.4 + audio.treble * 0.3})`);
    vg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  },

  industrial_tunnel(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#0a0a0a', '#121212', '#080808');
    // perspective walls
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.35, h * 0.35);
    ctx.lineTo(w * 0.35, h * 0.65);
    ctx.lineTo(0, h);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w * 0.65, h * 0.35);
    ctx.lineTo(w * 0.65, h * 0.65);
    ctx.lineTo(w, h);
    ctx.fill();
    // lights along tunnel
    for (let i = 0; i < 8; i++) {
      const p = i / 8;
      const x = lerp(w * 0.5, w * 0.5, p);
      const y = lerp(h * 0.38, h * 0.2, 1 - p);
      const s = lerp(40, 8, 1 - (i / 8));
      const on = Math.sin(t * 2 + i + audio.onset * 5) > -0.2;
      ctx.fillStyle = on
        ? `rgba(255,180,60,${0.4 + audio.bass * 0.4})`
        : 'rgba(40,40,40,0.5)';
      ctx.beginPath();
      ctx.arc(lerp(w * 0.2, w * 0.45, p), lerp(h * 0.2, h * 0.4, p), s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lerp(w * 0.8, w * 0.55, p), lerp(h * 0.2, h * 0.4, p), s * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    // vanishing point
    ctx.fillStyle = `rgba(255,100,40,${0.1 + emotion.aggression * 0.2 + audio.energy * 0.15})`;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, 30 + audio.bass * 40, 0, Math.PI * 2);
    ctx.fill();
    atmosParticles(ctx, w, h, t, audio, 'embers', intensity * 0.6);
    typePlane(ctx, w, h, { x: w * 0.38, y: h * 0.42, w: w * 0.24, h: h * 0.08, alpha: 0.12, fill: 'rgba(255,180,60,0.1)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.55, color: 'rgba(255,160,60,0.28)' });
    figureStage(ctx, w, h, state, { groundY: h * 0.78, bandH: h * 0.14, color: 'rgba(0,0,0,0.9)', pose: 'walk', bandColor: 'rgba(15,15,15,0.55)', bandJagged: 4 });
  },

  white_void(ctx, w, h, state) {
    const { t, audio, emotion, intensity } = state;
    const q = state.quality ?? 1;
    const roles = state.roles || state.instruments || {};
    const base = 220 + emotion.hope * 30;
    ctx.fillStyle = `rgb(${base},${base},${base + 5})`;
    ctx.fillRect(0, 0, w, h);
    // soft LED panel grid (subtle festival backdrop, not stage geometry)
    ctx.strokeStyle = `rgba(180,185,200,${0.08 + intensity * 0.1})`;
    ctx.lineWidth = 1;
    const cols = Math.max(4, Math.floor(8 * q));
    const rows = Math.max(3, Math.floor(5 * q));
    for (let c = 1; c < cols; c++) {
      const x = (c / cols) * w;
      ctx.beginPath();
      ctx.moveTo(x, h * 0.1);
      ctx.lineTo(x, h * 0.9);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      const y = (r / rows) * h;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, y);
      ctx.lineTo(w * 0.92, y);
      ctx.stroke();
    }
    // soft glow bands
    const band = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.45);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, `rgba(200,210,255,${0.08 + (roles.pads || 0) * 0.12})`);
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, h * 0.3, w, h * 0.15);
    // soft horizon
    const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
    g.addColorStop(0, 'rgba(200,200,210,0)');
    g.addColorStop(1, 'rgba(160,160,170,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    // lone motif mark
    ctx.strokeStyle = `rgba(40,40,50,${0.15 + intensity * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.48, 40 + audio.energy * 30, 0, Math.PI * 2);
    ctx.stroke();
    // soft wall / glass plane for typography
    typePlane(ctx, w, h, { x: w * 0.15, y: h * 0.22, w: w * 0.2, h: h * 0.09, alpha: 0.1, fill: 'rgba(160,170,190,0.1)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.52, color: 'rgba(80,80,100,0.2)' });
    // void is costume — still stage a figure when cast/characters ON
    figureStage(ctx, w, h, state, { groundY: h * 0.72, bandH: h * 0.12, color: 'rgba(20,20,30,0.55)', pose: 'stand', bandColor: 'rgba(160,160,170,0.25)', bandJagged: 2, bodyH: 42, headR: 8 });
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.3);
  },

  /** HOLD-0330: deep crimson void — NOT brown bands / warm stage */
  red_void(ctx, w, h, state) {
    const { t, audio, emotion, intensity } = state;
    // HOLD-0330: deep crimson void — harsh sparse geometry, NOT soft orange wash
    const pulse = 0.45 + Math.sin(t * (1.6 + (emotion.aggression || 0) * 2.2)) * 0.15 + (audio.bass || 0) * 0.25;
    ctx.fillStyle = `rgb(${Math.floor(18 + pulse * 28)},0,${Math.floor(4 + pulse * 6)})`;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w * 0.5, h * 0.48, 12, w * 0.5, h * 0.48, w * 0.72);
    g.addColorStop(0, `rgba(160,8,18,${0.35 + (audio.onset || 0) * 0.25})`);
    g.addColorStop(0.45, `rgba(70,0,10,${0.55})`);
    g.addColorStop(1, 'rgba(4,0,0,0.97)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // sparse harsh geometry — thin crimson planes (not soft ovals)
    ctx.save();
    ctx.strokeStyle = `rgba(220,40,50,${0.22 + (emotion.aggression || 0) * 0.25})`;
    ctx.lineWidth = 2;
    const planes = [
      [0.12, 0.22, 0.28, 0.08], [0.55, 0.18, 0.32, 0.06],
      [0.2, 0.55, 0.18, 0.14], [0.62, 0.58, 0.22, 0.1]
    ];
    for (const [px, py, pw, ph] of planes) {
      ctx.strokeRect(w * px, h * py, w * pw, h * ph);
      ctx.fillStyle = `rgba(90,0,12,${0.18 + pulse * 0.12})`;
      ctx.fillRect(w * px, h * py, w * pw, h * ph);
    }
    // single blood-red vertical slash
    ctx.fillStyle = `rgba(180,10,25,${0.2 + (audio.bass || 0) * 0.25})`;
    ctx.fillRect(w * 0.48, h * 0.1, 3 + (audio.onset || 0) * 4, h * 0.7);
    ctx.restore();
    if ((audio.onset || 0) > 0.4 || (emotion.aggression || 0) > 0.7) {
      ctx.strokeStyle = `rgba(255,80,90,${0.18 + (audio.onset || 0) * 0.35})`;
      ctx.lineWidth = 2;
      const r = ((t * 100 + (audio.onset || 0) * 160) % (w * 0.65));
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    atmosParticles(ctx, w, h, t, audio, 'embers', intensity * 0.7);
    typePlane(ctx, w, h, { x: w * 0.35, y: h * 0.28, w: w * 0.3, h: h * 0.1, alpha: 0.1, fill: 'rgba(180,20,30,0.1)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.55, color: 'rgba(200,30,40,0.28)', stroke: 'rgba(255,60,70,0.2)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.78, bandH: h * 0.14, color: 'rgba(8,0,0,0.85)', pose: 'stand',
      bandColor: 'rgba(40,0,8,0.5)', bandJagged: 6
    });
  },


  /** Festival LED-wall backdrop — soft panels + glow bands (no stage geometry) */
  led_wall(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    const q = state.quality ?? 1;
    const roles = state.roles || state.instruments || {};
    fillSky(ctx, w, h, '#050510', '#0c0c22', '#101028');
    const cols = Math.max(6, Math.floor(14 * q));
    const rows = Math.max(4, Math.floor(8 * q));
    const cw = w / cols;
    const ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + c * 0.4 + r * 0.3 + (roles.kick || 0) * 3);
        const a = 0.08 + intensity * 0.12 * pulse + (roles.pads || 0) * 0.1;
        const hue = (c * 25 + r * 15 + t * 40) % 360;
        ctx.fillStyle = `hsla(${hue},70%,55%,${a})`;
        ctx.fillRect(c * cw + 2, r * ch + 2, cw - 4, ch - 4);
      }
    }
    // center wash
    const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.45, w * 0.55);
    g.addColorStop(0, `rgba(255,255,255,${0.12 + (roles.lead || 0) * 0.2})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // horizontal glow band
    ctx.fillStyle = `rgba(180,200,255,${0.1 + (roles.bass || audio.bass) * 0.2})`;
    ctx.fillRect(0, h * 0.48, w, 3 + (roles.kick || 0) * 6);
    atmosParticles(ctx, w, h, t, audio, 'orbs', intensity * 0.5);
  },


  /** Ruined skyline warzone — ash grey + ember crimson; NOT warm pastoral stage */
  apocalyptic_warzone(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    // HOLD-0330: ash grey sky + ember crimson — kill warm orange/brown stage look
    fillSky(ctx, w, h, '#121418', '#2a2428', '#1a1618');
    // smoke plumes — ash grey (not warm brown ovals-as-stage)
    for (let i = 0; i < 6; i++) {
      const x = w * (0.08 + i * 0.16) + Math.sin(t * 0.12 + i) * 10;
      const smoke = ctx.createRadialGradient(x, h * 0.2, 8, x, h * 0.2, 70 + i * 6);
      smoke.addColorStop(0, `rgba(70,68,72,${0.45 + intensity * 0.15})`);
      smoke.addColorStop(0.55, `rgba(40,38,42,${0.28})`);
      smoke.addColorStop(1, 'rgba(20,18,22,0)');
      ctx.fillStyle = smoke;
      ctx.beginPath();
      ctx.ellipse(x, h * 0.22 + (i % 3) * 14, 42 + i * 6, 64 + (i % 2) * 12, -0.15 + i * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    // ruined skyline — cold ash charcoal
    ctx.fillStyle = '#0e1014';
    for (let i = 0; i < 14; i++) {
      const bw = w / 12;
      const x = i * bw - 8;
      const bh = 60 + Math.abs(Math.sin(i * 1.9)) * 160;
      ctx.fillRect(x, h * 0.58 - bh * 0.35, bw * 0.7, bh);
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.58 - bh * 0.35);
        ctx.lineTo(x + bw * 0.35, h * 0.58 - bh * 0.35 - 18);
        ctx.lineTo(x + bw * 0.7, h * 0.58 - bh * 0.35);
        ctx.fill();
      }
      // ember window slits
      if (i % 2 === 0) {
        ctx.fillStyle = `rgba(200,40,20,${0.15 + (audio.bass || 0) * 0.25})`;
        ctx.fillRect(x + bw * 0.15, h * 0.58 - bh * 0.2, bw * 0.15, 6);
        ctx.fillStyle = '#0e1014';
      }
    }
    // rubble bands — ash grey, jagged
    ctx.fillStyle = '#2a282c';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    for (let x = 0; x <= w; x += 18) {
      const j = ((Math.sin(x * 0.05 + 2) * 0.5 + 0.5) * 22);
      ctx.lineTo(x, h * 0.72 - j);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1c1a1e';
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
    // ember crimson glow pockets (NOT warm orange radial stage)
    const glow = ctx.createRadialGradient(w * 0.28, h * 0.62, 8, w * 0.28, h * 0.62, 120 + (audio.bass || 0) * 40);
    glow.addColorStop(0, `rgba(200,35,18,${0.28 + (audio.bass || 0) * 0.3 + (emotion.aggression || 0) * 0.12})`);
    glow.addColorStop(0.5, `rgba(90,20,12,${0.14})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    const glow2 = ctx.createRadialGradient(w * 0.72, h * 0.58, 6, w * 0.72, h * 0.58, 90);
    glow2.addColorStop(0, `rgba(160,30,20,${0.18 + (audio.onset || 0) * 0.2})`);
    glow2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, w, h);
    typePlane(ctx, w, h, { x: w * 0.58, y: h * 0.3, w: w * 0.22, h: h * 0.1, alpha: 0.12, fill: 'rgba(80,70,75,0.14)' });
    atmosParticles(ctx, w, h, t, audio, 'embers', intensity + (audio.bass || 0) * 0.3);
    motifMarks(ctx, w, h, state, { midY: h * 0.6, color: 'rgba(180,50,30,0.28)', stroke: 'rgba(200,80,60,0.2)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.8, bandH: h * 0.2, pose: 'kneel',
      color: 'rgba(6,6,8,0.94)', bandColor: 'rgba(28,24,28,0.75)', bandJagged: 16
    });
  },

  /** Bright pastel candy place — joyful mid path + soft playful FG band */
  candy_happy(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#ffe8f5', '#ffd0e8', '#fff5c8');
    // soft candy clouds
    for (let i = 0; i < 6; i++) {
      const x = w * (0.08 + i * 0.16) + Math.sin(t * 0.25 + i) * 14;
      const y = h * (0.15 + (i % 3) * 0.08);
      const g = ctx.createRadialGradient(x, y, 5, x, y, 55);
      g.addColorStop(0, `rgba(255,255,255,${0.55 + emotion.hope * 0.2})`);
      g.addColorStop(1, 'rgba(255,200,230,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, 60, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // candy-color mid path
    const path = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.85);
    path.addColorStop(0, '#ff9ed2');
    path.addColorStop(0.5, '#ffc46e');
    path.addColorStop(1, '#a8f0ff');
    ctx.fillStyle = path;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.55);
    ctx.lineTo(w * 0.65, h * 0.55);
    ctx.lineTo(w * 1.05, h);
    ctx.lineTo(-w * 0.05, h);
    ctx.closePath();
    ctx.fill();
    // pastel peppermint dashes
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + audio.onset * 0.3})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 22]);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.56);
    ctx.lineTo(w * 0.5, h * 0.9);
    ctx.stroke();
    ctx.setLineDash([]);
    // candy sign / glass plane
    typePlane(ctx, w, h, { x: w * 0.12, y: h * 0.28, w: w * 0.2, h: h * 0.09, alpha: 0.2, fill: `rgba(255,120,200,${0.18 + audio.treble * 0.12})` });
    typePlane(ctx, w, h, { x: w * 0.7, y: h * 0.32, w: w * 0.18, h: h * 0.08, alpha: 0.18, fill: 'rgba(120,220,255,0.16)' });
    // soft glow pulse (bass → glow, not geometry)
    ctx.fillStyle = `rgba(255,255,255,${0.06 + audio.bass * 0.1})`;
    ctx.fillRect(0, h * 0.5, w, h * 0.08);
    atmosParticles(ctx, w, h, t, audio, 'orbs', intensity * 0.7);
    motifMarks(ctx, w, h, state, { midY: h * 0.58, color: 'rgba(255,180,220,0.35)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.82, bandH: h * 0.14, pose: 'walk',
      color: 'rgba(80,40,90,0.55)', bandColor: 'rgba(255,180,210,0.4)', bandJagged: 5, bodyH: 38
    });
  },

  /** Night neon highway PLACE — vanishing road, neon signs, FG shoulder for figures */
  neon_highway(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#040812', '#0a1528', '#081018');
    drawStars(ctx, w, h, 50, 0.35 + audio.treble * 0.2, 11);
    // distant neon city glow
    const cityGlow = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.55);
    cityGlow.addColorStop(0, 'rgba(0,0,0,0)');
    cityGlow.addColorStop(0.5, `rgba(80,40,180,${0.15 + intensity * 0.1})`);
    cityGlow.addColorStop(1, 'rgba(0,200,255,0.08)');
    ctx.fillStyle = cityGlow;
    ctx.fillRect(0, h * 0.35, w, h * 0.22);
    // locked skyline nubs (no bass height)
    ctx.fillStyle = '#060a14';
    for (let i = 0; i < 10; i++) {
      const bw = w / 14;
      const x = w * 0.15 + i * bw;
      const bh = 20 + Math.abs(Math.sin(i * 2.7)) * 40;
      ctx.fillRect(x, h * 0.52 - bh, bw * 0.7, bh);
    }
    // vanishing neon highway
    ctx.fillStyle = '#0a0c14';
    ctx.beginPath();
    ctx.moveTo(w * 0.46, h * 0.52);
    ctx.lineTo(w * 0.54, h * 0.52);
    ctx.lineTo(w * 1.15, h);
    ctx.lineTo(-w * 0.15, h);
    ctx.closePath();
    ctx.fill();
    // lane lights
    ctx.strokeStyle = `rgba(0,255,220,${0.45 + audio.onset * 0.4})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 28]);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.53);
    ctx.lineTo(w * 0.5, h);
    ctx.stroke();
    ctx.setLineDash([]);
    // rain-slick reflection streaks (optional wet)
    ctx.strokeStyle = `rgba(255,40,180,${0.2 + audio.mid * 0.25})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.78 + Math.sin(t) * 2);
    ctx.lineTo(w, h * 0.8);
    ctx.stroke();
    ctx.strokeStyle = `rgba(40,200,255,${0.18 + audio.bass * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.84);
    ctx.lineTo(w, h * 0.82 + Math.cos(t * 0.6) * 3);
    ctx.stroke();
    // neon sign / billboard planes for typography
    typePlane(ctx, w, h, { x: w * 0.06, y: h * 0.22, w: w * 0.2, h: h * 0.1, alpha: 0.2, fill: `rgba(255,40,180,${0.16 + audio.treble * 0.12})` });
    typePlane(ctx, w, h, { x: w * 0.72, y: h * 0.26, w: w * 0.22, h: h * 0.09, alpha: 0.18, fill: `rgba(40,255,220,${0.14 + audio.mid * 0.1})` });
    atmosParticles(ctx, w, h, t, audio, 'rain', intensity * 0.6);
    motifMarks(ctx, w, h, state, { midY: h * 0.58, color: 'rgba(0,255,220,0.3)' });
    // FG shoulder / guardrail band — vanishing-point runner plane
    figureStage(ctx, w, h, state, {
      groundY: h * 0.84, bandH: h * 0.14, pose: 'walk',
      color: 'rgba(0,0,0,0.88)', bandColor: 'rgba(10,14,22,0.65)', bandJagged: 3, bodyH: 40
    });
  },

  /** Warm autumn place — amber sky, leaf path, tree silhouette FG band */
  cozy_autumn(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#2a1810', '#c86828', '#e8a040');
    // warm sun disc
    const sun = ctx.createRadialGradient(w * 0.75, h * 0.28, 8, w * 0.75, h * 0.28, 90 + audio.energy * 40);
    sun.addColorStop(0, `rgba(255,240,180,${0.7 + emotion.hope * 0.2})`);
    sun.addColorStop(0.45, 'rgba(255,140,40,0.25)');
    sun.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    // mid leaf path
    ctx.fillStyle = '#6a3818';
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.58);
    ctx.lineTo(w * 0.7, h * 0.58);
    ctx.lineTo(w * 1.05, h);
    ctx.lineTo(-w * 0.05, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a5020';
    ctx.fillRect(0, h * 0.7, w, h * 0.08);
    // falling leaves (bass → density via intensity blend, not height)
    const leafN = Math.floor(18 + intensity * 30 + audio.bass * 20);
    for (let i = 0; i < leafN; i++) {
      const x = ((i * 73 + t * 35 + Math.sin(t + i) * 40) % (w + 20)) - 10;
      const y = ((t * 28 + i * 47) % (h * 0.75));
      ctx.fillStyle = i % 3 === 0 ? `rgba(220,80,30,${0.55})` : i % 3 === 1 ? `rgba(240,160,40,${0.5})` : `rgba(180,50,30,${0.45})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 3, Math.sin(t + i) * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // tree trunks mid (locked heights)
    for (let i = 0; i < 6; i++) {
      const x = w * (0.08 + i * 0.16);
      const th = 90 + Math.abs(Math.sin(i * 1.4)) * 50;
      ctx.fillStyle = '#1a1008';
      ctx.fillRect(x - 6, h * 0.58 - th * 0.5, 12, th * 0.5);
      ctx.beginPath();
      ctx.moveTo(x - 28, h * 0.58 - th * 0.35);
      ctx.lineTo(x, h * 0.58 - th * 0.55);
      ctx.lineTo(x + 28, h * 0.58 - th * 0.35);
      ctx.fill();
    }
    // wooden sign / barn wall plane for typography
    typePlane(ctx, w, h, { x: w * 0.62, y: h * 0.36, w: w * 0.2, h: h * 0.09, alpha: 0.16, fill: 'rgba(120,60,20,0.18)' });
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.45);
    motifMarks(ctx, w, h, state, { midY: h * 0.62, color: 'rgba(255,180,80,0.3)' });
    // tree silhouette FG band + mid-path walker
    figureStage(ctx, w, h, state, {
      groundY: h * 0.84, bandH: h * 0.16, pose: 'walk',
      color: 'rgba(12,6,2,0.88)', bandColor: 'rgba(30,14,6,0.55)', bandJagged: 18, bodyH: 38
    });
  },


  /** Peace meadow — soft hills, stylized fauna, grass path + FG band */
  meadow_fauna(ctx, w, h, state) {
    if (_forbidPastoralFauna) return PRESETS.metal_hall(ctx, w, h, state);
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#87b8d8', '#c8e0a8', '#e8f0c0');
    // soft sun
    const sun = ctx.createRadialGradient(w * 0.78, h * 0.22, 6, w * 0.78, h * 0.22, 70);
    sun.addColorStop(0, `rgba(255,255,220,${0.55 + emotion.hope * 0.25})`);
    sun.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    // rolling hills (locked geometry)
    ctx.fillStyle = '#6a9a48';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) {
      ctx.lineTo(x, h * 0.52 + Math.sin(x * 0.01 + 1) * 28);
    }
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.fillStyle = '#8aba58';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) {
      ctx.lineTo(x, h * 0.62 + Math.sin(x * 0.014 + 2) * 18);
    }
    ctx.lineTo(w, h);
    ctx.fill();
    // mid grass path
    ctx.fillStyle = '#c8b868';
    ctx.beginPath();
    ctx.moveTo(w * 0.38, h * 0.62);
    ctx.lineTo(w * 0.62, h * 0.62);
    ctx.lineTo(w * 1.05, h);
    ctx.lineTo(-w * 0.05, h);
    ctx.closePath();
    ctx.fill();
    // distant herd + deer + birds (fauna proxies)
    faunaSilhouette(ctx, w * 0.22, h * 0.5, 'herd', 0.7, 'rgba(40,50,20,0.35)');
    faunaSilhouette(ctx, w * 0.7, h * 0.55, 'deer', 1.1, 'rgba(30,40,15,0.55)');
    faunaSilhouette(ctx, w * 0.35, h * 0.28, 'bird', 0.9, 'rgba(20,30,20,0.4)');
    faunaSilhouette(ctx, w * 0.55, h * 0.24, 'bird', 0.7, 'rgba(20,30,20,0.35)');
    typePlane(ctx, w, h, { x: w * 0.08, y: h * 0.3, w: w * 0.18, h: h * 0.08, alpha: 0.12, fill: 'rgba(120,90,40,0.12)' });
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.35);
    motifMarks(ctx, w, h, state, { midY: h * 0.6, color: 'rgba(200,220,120,0.25)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.84, bandH: h * 0.14, pose: 'walk',
      color: 'rgba(20,30,10,0.7)', bandColor: 'rgba(50,80,30,0.45)', bandJagged: 10, bodyH: 38
    });
  },

  /** Quiet misty lake — spoken-friendly water bed */
  misty_lake(ctx, w, h, state) {
    if (_forbidPastoralFauna) return PRESETS.storm(ctx, w, h, state);
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#6a8090', '#a8c0c8', '#d0e0e4');
    // mist band
    ctx.fillStyle = `rgba(220,230,235,${0.25 + emotion.hope * 0.1})`;
    ctx.fillRect(0, h * 0.35, w, h * 0.25);
    // lake
    const water = ctx.createLinearGradient(0, h * 0.55, 0, h);
    water.addColorStop(0, '#7098a8');
    water.addColorStop(1, '#406070');
    ctx.fillStyle = water;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    // soft ripples (bass → alpha only)
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + audio.bass * 0.1})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = h * 0.6 + i * 14 + Math.sin(t * 0.5 + i) * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + Math.sin(i + t) * 3);
      ctx.stroke();
    }
    faunaSilhouette(ctx, w * 0.65, h * 0.68, 'fish', 0.9, 'rgba(20,40,50,0.35)');
    faunaSilhouette(ctx, w * 0.4, h * 0.72, 'fish', 0.7, 'rgba(20,40,50,0.28)');
    typePlane(ctx, w, h, { x: w * 0.55, y: h * 0.28, w: w * 0.28, h: h * 0.12, alpha: 0.14, fill: 'rgba(255,255,255,0.12)' });
    atmosParticles(ctx, w, h, t, audio, 'orbs', intensity * 0.3);
    motifMarks(ctx, w, h, state, { midY: h * 0.58, color: 'rgba(180,210,220,0.25)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.82, bandH: h * 0.12, pose: 'stand',
      color: 'rgba(10,20,30,0.75)', bandColor: 'rgba(40,50,45,0.4)', bandJagged: 4, bodyH: 40
    });
  },

  /** Scary sparse dark — isolation > spectacle */
  dark_sparse(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#020208', '#080810', '#050508');
    // sparse ground line only
    ctx.strokeStyle = `rgba(80,80,90,${0.25 + emotion.darkness * 0.15})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.lineTo(w, h * 0.74);
    ctx.stroke();
    // few distant marks
    ctx.fillStyle = 'rgba(30,30,40,0.5)';
    ctx.fillRect(w * 0.15, h * 0.68, 3, h * 0.04);
    ctx.fillRect(w * 0.82, h * 0.66, 2, h * 0.06);
    // rare cold glint (onset)
    if (audio.onset > 0.55) {
      ctx.fillStyle = `rgba(180,200,220,${0.08 + audio.onset * 0.12})`;
      ctx.fillRect(0, 0, w, h);
    }
    typePlane(ctx, w, h, { x: w * 0.35, y: h * 0.4, w: w * 0.3, h: h * 0.1, alpha: 0.06, fill: 'rgba(100,110,130,0.06)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.55, color: 'rgba(120,120,140,0.12)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.78, bandH: h * 0.08, pose: 'stand',
      color: 'rgba(0,0,0,0.85)', bandColor: 'rgba(8,8,12,0.35)', bandJagged: 2, bodyH: 36, spread: 0.15
    });
  },

  /** HOLD-0330: shards / glitch planes — high contrast, not warm abstract */
  reality_fracture(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    const roles = state.roles || state.instruments || {};
    // HOLD-0330: cold violet/cyan glitch shards — NOT soft warm ovals
    fillSky(ctx, w, h, '#080814', '#121028', '#0a0818');
    const shards = [
      [0.05, 0.1, 0.35, 0.4], [0.4, 0.05, 0.3, 0.35], [0.7, 0.15, 0.28, 0.45],
      [0.1, 0.5, 0.4, 0.35], [0.55, 0.48, 0.4, 0.4]
    ];
    for (let i = 0; i < shards.length; i++) {
      const [px, py, pw, ph] = shards[i];
      const ox = Math.sin(t * 0.35 + i) * 6;
      const oy = Math.cos(t * 0.28 + i) * 4;
      ctx.save();
      ctx.translate(ox, oy);
      // cold broken plane fill
      ctx.fillStyle = i % 2 === 0 ? '#0e1020' : '#16122a';
      ctx.beginPath();
      const x0 = w * px, y0 = h * py, sw = w * pw, sh = h * ph;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + sw * 0.92, y0 + sh * 0.08);
      ctx.lineTo(x0 + sw, y0 + sh * 0.85);
      ctx.lineTo(x0 + sw * 0.1, y0 + sh);
      ctx.closePath();
      ctx.fill();
      // cyan / violet crack edges
      const cold = i % 2 === 0
        ? `rgba(80,220,255,${0.28 + (roles.harsh || audio.onset || 0) * 0.4})`
        : `rgba(180,100,255,${0.26 + (roles.harsh || audio.onset || 0) * 0.35})`;
      ctx.strokeStyle = cold;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // internal glitch cracks
      ctx.beginPath();
      ctx.moveTo(x0 + sw * 0.1, y0 + sh * 0.5);
      ctx.lineTo(x0 + sw * 0.55, y0 + sh * 0.15);
      ctx.lineTo(x0 + sw * 0.9, y0 + sh * 0.7);
      ctx.stroke();
      // chromatic offset shard
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = i % 2 ? 'rgba(0,255,220,0.15)' : 'rgba(160,80,255,0.15)';
      ctx.fillRect(x0 + 4, y0 + 3, sw * 0.35, sh * 0.2);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    // cold fracture pulse (not warm pink)
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.5, 8, w * 0.5, h * 0.5, 200);
    glow.addColorStop(0, `rgba(100,80,255,${0.12 + (audio.bass || 0) * 0.22 + (emotion.aggression || 0) * 0.12})`);
    glow.addColorStop(0.5, `rgba(0,200,220,${0.06 + (audio.onset || 0) * 0.1})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // scan tear lines
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 5; i++) {
      const y = ((t * 90 + i * 73) % h);
      ctx.fillStyle = i % 2 ? 'rgba(0,255,230,0.2)' : 'rgba(160,80,255,0.18)';
      ctx.fillRect(0, y, w, 2);
    }
    ctx.restore();
    atmosParticles(ctx, w, h, t, audio, 'embers', intensity * 0.45);
    typePlane(ctx, w, h, { x: w * 0.3, y: h * 0.35, w: w * 0.4, h: h * 0.12, alpha: 0.1, fill: 'rgba(100,180,255,0.08)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.55, color: 'rgba(120,100,255,0.3)', stroke: 'rgba(0,230,255,0.25)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.82, bandH: h * 0.14, pose: 'walk',
      color: 'rgba(0,0,8,0.92)', bandColor: 'rgba(20,16,40,0.6)', bandJagged: 12, bodyH: 38
    });
  },

  /** Spoken-word bed — soft void, large typePlane, low motion, never neon/LED */
  spoken_word_bed(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    const base = 210 + emotion.hope * 20;
    ctx.fillStyle = `rgb(${base},${base - 2},${base + 5})`;
    ctx.fillRect(0, 0, w, h);
    // soft horizon wash
    const g = ctx.createLinearGradient(0, h * 0.5, 0, h);
    g.addColorStop(0, 'rgba(200,200,210,0)');
    g.addColorStop(1, 'rgba(160,165,175,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    // faint nature hint (not highway)
    ctx.fillStyle = `rgba(140,160,140,${0.06 + intensity * 0.04})`;
    ctx.beginPath();
    ctx.ellipse(w * 0.2, h * 0.7, 80, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // Soft type planes — light fill ≤0.12 so they never read as a lyric card
    typePlane(ctx, w, h, { x: w * 0.12, y: h * 0.28, w: w * 0.76, h: h * 0.18, alpha: 0.1, fill: 'rgba(255,255,255,0.1)' });
    typePlane(ctx, w, h, { x: w * 0.22, y: h * 0.52, w: w * 0.56, h: h * 0.1, alpha: 0.08, fill: 'rgba(240,240,250,0.08)' });
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.2);
    motifMarks(ctx, w, h, state, { midY: h * 0.62, color: 'rgba(180,180,200,0.2)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.78, bandH: h * 0.1, pose: 'stand',
      color: 'rgba(40,40,50,0.45)', bandColor: 'rgba(170,170,180,0.2)', bandJagged: 2, bodyH: 42, headR: 8
    });
  },


  /** Intimate R&B room — desk lamp key, soft rain window, curtains, wood floor. No neon/strobe. */
  soul_room(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#1a100c', '#2a1810', '#1c120e');
    // wood floor
    const floor = ctx.createLinearGradient(0, h * 0.62, 0, h);
    floor.addColorStop(0, '#3a2418');
    floor.addColorStop(1, '#1a1008');
    ctx.fillStyle = floor;
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
    // floor planks (locked)
    ctx.strokeStyle = 'rgba(80,50,30,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const y = h * 0.64 + i * (h * 0.04);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 2);
      ctx.stroke();
    }
    // curtains
    ctx.fillStyle = 'rgba(60,30,40,0.55)';
    ctx.fillRect(w * 0.08, h * 0.12, w * 0.12, h * 0.5);
    ctx.fillRect(w * 0.8, h * 0.12, w * 0.12, h * 0.5);
    // window pane
    ctx.fillStyle = 'rgba(40,50,70,0.35)';
    ctx.fillRect(w * 0.22, h * 0.14, w * 0.28, h * 0.32);
    ctx.strokeStyle = 'rgba(120,90,70,0.4)';
    ctx.strokeRect(w * 0.22, h * 0.14, w * 0.28, h * 0.32);
    ctx.beginPath();
    ctx.moveTo(w * 0.36, h * 0.14);
    ctx.lineTo(w * 0.36, h * 0.46);
    ctx.moveTo(w * 0.22, h * 0.3);
    ctx.lineTo(w * 0.5, h * 0.3);
    ctx.stroke();
    // soft window rain (optional mood)
    if (emotion.darkness > 0.25 || intensity > 0.3) {
      atmosParticles(ctx, w, h, t, audio, 'rain', intensity * 0.35);
    }
    // single desk-lamp radial key
    const lx = w * 0.55, ly = h * 0.42;
    const lamp = ctx.createRadialGradient(lx, ly, 8, lx, ly, 160 + audio.bass * 40);
    lamp.addColorStop(0, `rgba(255,200,120,${0.45 + audio.mid * 0.2})`);
    lamp.addColorStop(0.35, `rgba(255,160,80,${0.18 + audio.bass * 0.12})`);
    lamp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, w, h);
    // lamp fixture
    ctx.fillStyle = 'rgba(40,30,20,0.7)';
    ctx.fillRect(lx - 6, ly - 18, 12, 14);
    ctx.beginPath();
    ctx.moveTo(lx - 18, ly - 4);
    ctx.lineTo(lx + 18, ly - 4);
    ctx.lineTo(lx + 10, ly + 8);
    ctx.lineTo(lx - 10, ly + 8);
    ctx.closePath();
    ctx.fill();
    typePlane(ctx, w, h, { x: w * 0.58, y: h * 0.28, w: w * 0.22, h: h * 0.1, alpha: 0.1, fill: 'rgba(255,200,140,0.1)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.58, color: 'rgba(255,180,120,0.22)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.78, bandH: h * 0.1, pose: 'stand',
      color: 'rgba(20,10,8,0.75)', bandColor: 'rgba(40,24,16,0.4)', bandJagged: 3, bodyH: 44, headR: 8
    });
  },

  /** EDM drop room — dark floor, fixed-height LED risers, laser shafts, haze. Not a road. */
  club_floor(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    const roles = state.roles || state.instruments || {};
    fillSky(ctx, w, h, '#04040c', '#0a0a18', '#080810');
    // dark dance floor
    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    // floor grid (locked)
    ctx.strokeStyle = `rgba(80,100,255,${0.08 + audio.bass * 0.12})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const y = h * 0.58 + i * h * 0.06;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // side LED risers — FIXED height (bass → glow only)
    const riserH = h * 0.42;
    for (let side = 0; side < 2; side++) {
      const x0 = side === 0 ? w * 0.04 : w * 0.88;
      for (let i = 0; i < 5; i++) {
        const y = h * 0.55 - riserH + i * (riserH / 5);
        const pulse = 0.35 + 0.35 * Math.sin(t * 4 + i + (roles.kick || audio.onset) * 6);
        const a = pulse * (0.3 + intensity * 0.4 + audio.bass * 0.3);
        ctx.fillStyle = `hsla(${(i * 40 + t * 60) % 360},90%,60%,${a})`;
        ctx.fillRect(x0, y, w * 0.08, riserH / 5 - 2);
      }
    }
    // laser shafts from onset/energy
    const nLasers = 4 + Math.floor(audio.onset * 3);
    for (let i = 0; i < nLasers; i++) {
      const ang = -0.6 + i * 0.35 + Math.sin(t * 2 + i) * 0.05;
      const ax = w * 0.5 + Math.sin(t + i) * 20;
      ctx.strokeStyle = `hsla(${(i * 55 + t * 80) % 360},100%,65%,${0.12 + audio.energy * 0.25 + audio.onset * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax, h * 0.08);
      ctx.lineTo(ax + Math.sin(ang) * w * 0.55, h * 0.9);
      ctx.stroke();
    }
    // haze bloom
    const bloom = ctx.createRadialGradient(w * 0.5, h * 0.4, 20, w * 0.5, h * 0.4, 200);
    bloom.addColorStop(0, `rgba(180,120,255,${0.1 + audio.bass * 0.2})`);
    bloom.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);
    atmosParticles(ctx, w, h, t, audio, 'orbs', intensity * 0.6);
    typePlane(ctx, w, h, { x: w * 0.35, y: h * 0.22, w: w * 0.3, h: h * 0.1, alpha: 0.12, fill: `rgba(120,200,255,${0.1 + audio.treble * 0.1})` });
    motifMarks(ctx, w, h, state, { midY: h * 0.6, color: 'rgba(180,100,255,0.3)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.82, bandH: h * 0.12, pose: 'walk',
      color: 'rgba(0,0,10,0.85)', bandColor: 'rgba(20,10,40,0.5)', bandJagged: 4, bodyH: 40
    });
  },

  /** Arena / industrial hall — COLD steel blue-grey, rivets, cyan shafts. NOT warm orange. */
  metal_hall(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    // HOLD-0330: cold steel blue-grey — kill #1a0808 warm-red / orange motif language
    fillSky(ctx, w, h, '#0a1018', '#141c28', '#0c1218');
    // roof girders — cold steel
    ctx.strokeStyle = `rgba(140,165,190,${0.45 + (emotion.aggression || 0) * 0.2})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const x = w * (0.1 + i * 0.15);
      ctx.beginPath();
      ctx.moveTo(x - 30, h * 0.08);
      ctx.lineTo(x, h * 0.28);
      ctx.lineTo(x + 30, h * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, h * 0.08);
      ctx.lineTo(x, h * 0.32);
      ctx.stroke();
      // cross-brace
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 22, h * 0.14);
      ctx.lineTo(x + 22, h * 0.22);
      ctx.stroke();
      ctx.lineWidth = 3;
    }
    // riveted side panels — blue-grey steel
    ctx.fillStyle = '#151c26';
    ctx.fillRect(0, h * 0.28, w * 0.14, h * 0.52);
    ctx.fillRect(w * 0.86, h * 0.28, w * 0.14, h * 0.52);
    ctx.fillStyle = '#1a2430';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 2; col++) {
        const px = 6 + col * (w * 0.07);
        const py = h * 0.32 + row * (h * 0.055);
        ctx.fillRect(px, py, w * 0.055, h * 0.04);
        // rivets
        ctx.fillStyle = 'rgba(160,190,210,0.55)';
        ctx.beginPath();
        ctx.arc(px + 4, py + 4, 1.6, 0, Math.PI * 2);
        ctx.arc(px + w * 0.055 - 4, py + 4, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a2430';
        // mirror right wall
        const rx = w * 0.88 + col * (w * 0.07);
        ctx.fillRect(rx, py, w * 0.055, h * 0.04);
        ctx.fillStyle = 'rgba(160,190,210,0.55)';
        ctx.beginPath();
        ctx.arc(rx + 4, py + 4, 1.6, 0, Math.PI * 2);
        ctx.arc(rx + w * 0.055 - 4, py + 4, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a2430';
      }
    }
    // industrial floor pit — cold steel
    const pit = ctx.createLinearGradient(0, h * 0.55, 0, h);
    pit.addColorStop(0, '#1a2430');
    pit.addColorStop(0.5, '#0c1218');
    pit.addColorStop(1, '#06090e');
    ctx.fillStyle = pit;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    // floor grate lines
    ctx.strokeStyle = 'rgba(80,110,140,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const y = h * 0.58 + i * (h * 0.035);
      ctx.beginPath();
      ctx.moveTo(w * 0.14, y);
      ctx.lineTo(w * 0.86, y);
      ctx.stroke();
    }
    // cyan-steel light shafts (NOT warm orange)
    const shaftA = 0.1 + (audio.treble || 0) * 0.12 + (audio.bass || 0) * 0.08;
    for (let i = 0; i < 4; i++) {
      const x = w * (0.25 + i * 0.16) + Math.sin(t * 0.3 + i) * 6;
      const g = ctx.createLinearGradient(x, 0, x + 20, h * 0.7);
      g.addColorStop(0, `rgba(120,200,230,${shaftA})`);
      g.addColorStop(0.5, `rgba(60,120,160,${shaftA * 0.45})`);
      g.addColorStop(1, 'rgba(40,80,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 12, 0);
      ctx.lineTo(x + 18, 0);
      ctx.lineTo(x + 40, h * 0.72);
      ctx.lineTo(x - 30, h * 0.72);
      ctx.fill();
    }
    // cold steel center wash (bass pulse) — cyan/steel, never orange
    const wash = ctx.createRadialGradient(w * 0.5, h * 0.42, 24, w * 0.5, h * 0.42, 200);
    wash.addColorStop(0, `rgba(100,180,210,${0.08 + (audio.bass || 0) * 0.18 + (emotion.aggression || 0) * 0.08})`);
    wash.addColorStop(0.5, `rgba(40,70,100,${0.1})`);
    wash.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    atmosParticles(ctx, w, h, t, audio, 'embers', intensity * 0.45);
    typePlane(ctx, w, h, { x: w * 0.3, y: h * 0.25, w: w * 0.4, h: h * 0.1, alpha: 0.1, fill: 'rgba(100,160,200,0.1)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.58, color: 'rgba(100,170,210,0.3)', stroke: 'rgba(160,210,230,0.25)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.8, bandH: h * 0.16, pose: 'walk',
      color: 'rgba(0,0,0,0.92)', bandColor: 'rgba(20,30,42,0.6)', bandJagged: 10, bodyH: 42
    });
  },

  /** Jazz club — amber lamps, low stage, smoke, table silhouettes, warm rainy indoor mood. */
  jazz_club(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#120c08', '#1a1410', '#0e0a08');
    // low stage
    ctx.fillStyle = '#1a120c';
    ctx.fillRect(0, h * 0.48, w, h * 0.12);
    ctx.fillStyle = `rgba(255,180,80,${0.08 + audio.mid * 0.1})`;
    ctx.fillRect(w * 0.25, h * 0.48, w * 0.5, 3);
    // floor
    ctx.fillStyle = '#14100c';
    ctx.fillRect(0, h * 0.6, w, h * 0.4);
    // table silhouettes
    for (let i = 0; i < 5; i++) {
      const tx = w * (0.12 + i * 0.18);
      const ty = h * (0.68 + (i % 2) * 0.06);
      ctx.fillStyle = 'rgba(8,6,4,0.75)';
      ctx.beginPath();
      ctx.ellipse(tx, ty, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // chair hints
      ctx.fillRect(tx - 22, ty - 18, 6, 16);
      ctx.fillRect(tx + 16, ty - 18, 6, 16);
    }
    // amber hanging lamps
    for (let i = 0; i < 4; i++) {
      const lx = w * (0.2 + i * 0.2);
      const ly = h * 0.22;
      ctx.strokeStyle = 'rgba(60,40,20,0.5)';
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, ly - 10);
      ctx.stroke();
      const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 70 + audio.bass * 20);
      g.addColorStop(0, `rgba(255,190,100,${0.4 + audio.treble * 0.15})`);
      g.addColorStop(0.4, `rgba(255,140,60,${0.15})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 80, ly - 40, 160, 160);
    }
    // smoke haze
    ctx.fillStyle = `rgba(180,160,140,${0.06 + intensity * 0.06})`;
    ctx.fillRect(0, h * 0.3, w, h * 0.35);
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.5);
    typePlane(ctx, w, h, { x: w * 0.35, y: h * 0.32, w: w * 0.3, h: h * 0.1, alpha: 0.1, fill: 'rgba(255,200,120,0.1)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.52, color: 'rgba(255,180,100,0.25)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.55, bandH: h * 0.08, pose: 'stand',
      color: 'rgba(10,6,4,0.8)', bandColor: 'rgba(30,20,12,0.4)', bandJagged: 3, bodyH: 40, headR: 7
    });
  },

  /** Orchestral hall — seating rows, sky light shafts (cathedral cousin), gold/cream. */
  orchestral_hall(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#1a1810', '#2a2418', '#18140e');
    // vault / ceiling wash
    const ceil = ctx.createLinearGradient(0, 0, 0, h * 0.35);
    ceil.addColorStop(0, '#2a2418');
    ceil.addColorStop(1, 'rgba(40,36,28,0)');
    ctx.fillStyle = ceil;
    ctx.fillRect(0, 0, w, h * 0.35);
    // gold/cream light shafts
    const shaftA = 0.1 + audio.treble * 0.12 + emotion.hope * 0.15;
    for (let i = 0; i < 4; i++) {
      const x = w * (0.22 + i * 0.18) + Math.sin(t * 0.2 + i) * 8;
      const g = ctx.createLinearGradient(x, 0, x + 30, h * 0.7);
      g.addColorStop(0, `rgba(255,230,180,${shaftA})`);
      g.addColorStop(1, 'rgba(255,230,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 15, 0);
      ctx.lineTo(x + 25, 0);
      ctx.lineTo(x + 55, h * 0.75);
      ctx.lineTo(x - 40, h * 0.75);
      ctx.fill();
    }
    // seating row silhouettes (locked)
    for (let r = 0; r < 6; r++) {
      const y = h * 0.48 + r * h * 0.07;
      const inset = r * 8;
      ctx.fillStyle = `rgba(${20 + r * 4},${16 + r * 3},${12 + r * 2},${0.55 + r * 0.05})`;
      ctx.beginPath();
      ctx.moveTo(inset, y + 20);
      for (let i = 0; i <= 16; i++) {
        const x = inset + (i / 16) * (w - inset * 2);
        const peak = y - 6 - Math.abs(Math.sin(i * 1.2 + r)) * 8;
        ctx.lineTo(x, peak);
      }
      ctx.lineTo(w - inset, y + 20);
      ctx.closePath();
      ctx.fill();
    }
    // stage apron glow
    ctx.fillStyle = `rgba(255,220,160,${0.08 + audio.mid * 0.1})`;
    ctx.fillRect(0, h * 0.42, w, 4);
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.4);
    typePlane(ctx, w, h, { x: w * 0.35, y: h * 0.2, w: w * 0.3, h: h * 0.12, alpha: 0.12, fill: `rgba(255,230,180,${0.1 + audio.mid * 0.08})` });
    motifMarks(ctx, w, h, state, { midY: h * 0.4, color: 'rgba(255,220,160,0.25)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.44, band: false, pose: 'stand',
      color: 'rgba(20,16,10,0.7)', bodyH: 36, headR: 7
    });
  },

  /** Latin night plaza — warm lanterns, sunset→night, distant ocean glow, dance ground. */
  latin_night(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#1a1028', '#c06030', '#2a1810');
    drawStars(ctx, w, h, 40, 0.35 + audio.treble * 0.2, 9);
    // distant ocean glow
    const ocean = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.55);
    ocean.addColorStop(0, 'rgba(0,0,0,0)');
    ocean.addColorStop(0.5, `rgba(40,80,120,${0.25 + emotion.hope * 0.1})`);
    ocean.addColorStop(1, 'rgba(20,40,60,0.35)');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, h * 0.42, w, h * 0.15);
    // plaza ground
    const plaza = ctx.createLinearGradient(0, h * 0.55, 0, h);
    plaza.addColorStop(0, '#4a3020');
    plaza.addColorStop(1, '#2a1810');
    ctx.fillStyle = plaza;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    // warm tile marks
    ctx.strokeStyle = `rgba(255,180,80,${0.12 + audio.onset * 0.1})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.strokeRect(w * 0.2 + i * 4, h * 0.6 + i * 12, w * 0.6 - i * 8, 10);
    }
    // plaza lanterns
    for (let i = 0; i < 6; i++) {
      const lx = w * (0.1 + i * 0.15);
      const ly = h * 0.48;
      ctx.fillStyle = 'rgba(40,20,10,0.7)';
      ctx.fillRect(lx - 3, ly - 30, 6, 30);
      const g = ctx.createRadialGradient(lx, ly - 32, 3, lx, ly - 32, 50);
      g.addColorStop(0, `rgba(255,180,60,${0.5 + audio.bass * 0.2})`);
      g.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx, ly - 32, 50, 0, Math.PI * 2);
      ctx.fill();
    }
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.45);
    typePlane(ctx, w, h, { x: w * 0.15, y: h * 0.28, w: w * 0.2, h: h * 0.08, alpha: 0.12, fill: 'rgba(255,160,80,0.12)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.62, color: 'rgba(255,160,80,0.28)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.8, bandH: h * 0.12, pose: 'walk',
      color: 'rgba(20,10,8,0.8)', bandColor: 'rgba(60,30,15,0.45)', bandJagged: 5, bodyH: 40
    });
  },

  /** Gospel light — bright cathedral shafts gold/white hope, choir space. Heal not war. */
  gospel_light(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#f8f0d8', '#fff8e8', '#e8d8b0');
    // soft vault arches
    ctx.strokeStyle = `rgba(180,150,80,${0.25 + emotion.hope * 0.25})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const x = w * (0.15 + i * 0.15);
      ctx.beginPath();
      ctx.moveTo(x - 50, h);
      ctx.quadraticCurveTo(x, h * 0.1, x + 50, h);
      ctx.stroke();
    }
    // bright gold/white shafts
    const shaftA = 0.15 + audio.treble * 0.15 + emotion.hope * 0.2;
    for (let i = 0; i < 4; i++) {
      const x = w * (0.25 + i * 0.15) + Math.sin(t * 0.25 + i) * 6;
      const g = ctx.createLinearGradient(x, 0, x + 20, h);
      g.addColorStop(0, `rgba(255,250,220,${shaftA})`);
      g.addColorStop(0.5, `rgba(255,220,140,${shaftA * 0.5})`);
      g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 25, 0);
      ctx.lineTo(x + 35, 0);
      ctx.lineTo(x + 70, h);
      ctx.lineTo(x - 55, h);
      ctx.fill();
    }
    // choir loft hint
    ctx.fillStyle = 'rgba(200,180,120,0.25)';
    ctx.fillRect(w * 0.2, h * 0.55, w * 0.6, h * 0.08);
    // warm floor
    const fl = ctx.createLinearGradient(0, h * 0.65, 0, h);
    fl.addColorStop(0, '#e8d8b0');
    fl.addColorStop(1, '#c8b080');
    ctx.fillStyle = fl;
    ctx.fillRect(0, h * 0.65, w, h * 0.35);
    // center hope bloom (bass → glow)
    const bloom = ctx.createRadialGradient(w * 0.5, h * 0.35, 10, w * 0.5, h * 0.35, 160);
    bloom.addColorStop(0, `rgba(255,255,240,${0.35 + audio.bass * 0.2})`);
    bloom.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.35);
    typePlane(ctx, w, h, { x: w * 0.32, y: h * 0.22, w: w * 0.36, h: h * 0.12, alpha: 0.14, fill: `rgba(255,240,180,${0.12 + audio.mid * 0.1})` });
    motifMarks(ctx, w, h, state, { midY: h * 0.5, color: 'rgba(220,180,80,0.3)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.78, bandH: h * 0.1, pose: 'stand',
      color: 'rgba(60,40,20,0.55)', bandColor: 'rgba(200,180,120,0.35)', bandJagged: 2, bodyH: 46, headR: 8
    });
  },

  /** Hip-hop block — brick street corner, streetlight pools, optional cipher circle. NOT neon highway. */
  hiphop_block(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#0a0c14', '#141828', '#0c1018');
    drawStars(ctx, w, h, 25, 0.3, 5);
    // brick building faces (locked height)
    ctx.fillStyle = '#2a1814';
    ctx.fillRect(0, h * 0.2, w * 0.28, h * 0.55);
    ctx.fillRect(w * 0.72, h * 0.25, w * 0.28, h * 0.5);
    // brick lines
    ctx.strokeStyle = 'rgba(60,30,25,0.5)';
    ctx.lineWidth = 1;
    for (let y = h * 0.22; y < h * 0.7; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w * 0.28, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.72, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // windows (glow from mid/treble)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        const a = 0.15 + audio.mid * 0.25 * ((i + j) % 2);
        ctx.fillStyle = `rgba(255,200,100,${a})`;
        ctx.fillRect(w * 0.04 + i * w * 0.08, h * 0.28 + j * h * 0.1, w * 0.05, h * 0.06);
        ctx.fillRect(w * 0.78 + i * w * 0.07, h * 0.32 + j * h * 0.09, w * 0.045, h * 0.055);
      }
    }
    // street
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // streetlight pools
    for (let i = 0; i < 3; i++) {
      const lx = w * (0.25 + i * 0.25);
      const ly = h * 0.68;
      ctx.fillStyle = 'rgba(30,30,20,0.8)';
      ctx.fillRect(lx - 3, h * 0.35, 6, h * 0.35);
      const g = ctx.createRadialGradient(lx, ly, 10, lx, ly, 90);
      g.addColorStop(0, `rgba(255,220,140,${0.35 + audio.bass * 0.2})`);
      g.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(lx, ly + 10, 70, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // cipher circle on ground (optional when energy/onset)
    if (intensity > 0.25 || audio.onset > 0.3) {
      ctx.strokeStyle = `rgba(255,200,80,${0.2 + audio.onset * 0.25})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.82, 80, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.4);
    typePlane(ctx, w, h, { x: w * 0.35, y: h * 0.35, w: w * 0.3, h: h * 0.1, alpha: 0.1, fill: 'rgba(255,180,80,0.1)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.72, color: 'rgba(255,180,80,0.25)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.82, bandH: h * 0.12, pose: 'walk',
      color: 'rgba(0,0,0,0.85)', bandColor: 'rgba(20,20,28,0.5)', bandJagged: 4, bodyH: 42
    });
  },

  /** Country porch — golden hour porch + distant golden highway/fields. Warm wood. */
  country_porch(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#4a3020', '#e8a050', '#f0c878');
    // distant golden fields
    ctx.fillStyle = '#c89040';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) {
      ctx.lineTo(x, h * 0.5 + Math.sin(x * 0.012) * 18);
    }
    ctx.lineTo(w, h);
    ctx.fill();
    // distant golden highway ribbon
    ctx.fillStyle = `rgba(255,220,120,${0.35 + emotion.hope * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.52);
    ctx.lineTo(w * 0.58, h * 0.52);
    ctx.lineTo(w * 0.72, h * 0.72);
    ctx.lineTo(w * 0.28, h * 0.72);
    ctx.closePath();
    ctx.fill();
    // porch deck
    ctx.fillStyle = '#5a3820';
    ctx.fillRect(0, h * 0.68, w, h * 0.32);
    // porch posts (locked)
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(w * 0.12, h * 0.35, 10, h * 0.35);
    ctx.fillRect(w * 0.85, h * 0.35, 10, h * 0.35);
    // porch roof
    ctx.fillStyle = '#4a3018';
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.4);
    ctx.lineTo(w * 0.5, h * 0.28);
    ctx.lineTo(w * 0.95, h * 0.4);
    ctx.lineTo(w * 0.95, h * 0.44);
    ctx.lineTo(w * 0.05, h * 0.44);
    ctx.closePath();
    ctx.fill();
    // railing
    ctx.strokeStyle = 'rgba(80,50,25,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.12, h * 0.62);
    ctx.lineTo(w * 0.85, h * 0.62);
    ctx.stroke();
    // golden hour wash (bass → glow)
    const sun = ctx.createRadialGradient(w * 0.75, h * 0.25, 10, w * 0.75, h * 0.25, 180);
    sun.addColorStop(0, `rgba(255,220,120,${0.4 + audio.bass * 0.15})`);
    sun.addColorStop(1, 'rgba(255,180,60,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    atmosParticles(ctx, w, h, t, audio, 'dust', intensity * 0.4);
    typePlane(ctx, w, h, { x: w * 0.55, y: h * 0.38, w: w * 0.22, h: h * 0.08, alpha: 0.12, fill: 'rgba(255,200,100,0.12)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.58, color: 'rgba(255,200,100,0.25)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.78, bandH: h * 0.1, pose: 'stand',
      color: 'rgba(30,18,8,0.75)', bandColor: 'rgba(80,50,25,0.4)', bandJagged: 4, bodyH: 42
    });
  },

  /** Ambient field — soft fog color planes, sparse stars, immersion dissolve. No drop grammar. */
  ambient_field(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    fillSky(ctx, w, h, '#101828', '#1a2838', '#142030');
    drawStars(ctx, w, h, 35 + Math.floor(intensity * 20), 0.35 + audio.treble * 0.2, 13);
    // soft fog color planes
    for (let i = 0; i < 5; i++) {
      const x = w * (0.15 + (i % 3) * 0.3) + Math.sin(t * 0.12 + i) * 40;
      const y = h * (0.25 + Math.floor(i / 3) * 0.3) + Math.cos(t * 0.1 + i) * 20;
      const hue = 200 + i * 25 + emotion.hope * 30;
      const g = ctx.createRadialGradient(x, y, 20, x, y, 140 + audio.energy * 40);
      g.addColorStop(0, `hsla(${hue},40%,60%,${0.12 + intensity * 0.1})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, 150, 70, Math.sin(t * 0.08 + i) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // soft horizon dissolve
    const hor = ctx.createLinearGradient(0, h * 0.55, 0, h);
    hor.addColorStop(0, 'rgba(20,40,55,0)');
    hor.addColorStop(1, `rgba(30,50,70,${0.4 + audio.bass * 0.1})`);
    ctx.fillStyle = hor;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    atmosParticles(ctx, w, h, t, audio, 'orbs', intensity * 0.35);
    typePlane(ctx, w, h, { x: w * 0.3, y: h * 0.4, w: w * 0.4, h: h * 0.12, alpha: 0.08, fill: 'rgba(160,200,220,0.08)' });
    motifMarks(ctx, w, h, state, { midY: h * 0.55, color: 'rgba(160,200,220,0.2)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.72, band: false, pose: 'float',
      color: 'rgba(180,200,220,0.35)', bodyH: 32
    });
  },

  /** Stage pop — clean idol stage, candy lights, formation floor marks. Candy cousin not neon highway. */
  stage_pop(ctx, w, h, state) {
    const { t, audio, intensity, emotion } = state;
    const roles = state.roles || state.instruments || {};
    fillSky(ctx, w, h, '#1a1030', '#302050', '#201838');
    // soft candy backdrop wash
    const wash = ctx.createRadialGradient(w * 0.5, h * 0.3, 20, w * 0.5, h * 0.3, 220);
    wash.addColorStop(0, `rgba(255,180,220,${0.2 + emotion.hope * 0.15})`);
    wash.addColorStop(0.5, `rgba(160,200,255,${0.12})`);
    wash.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    // candy stage lights (fixed positions, bass → alpha)
    for (let i = 0; i < 7; i++) {
      const lx = w * (0.15 + i * 0.12);
      const ly = h * 0.12;
      const hue = (i * 50 + t * 40) % 360;
      const a = 0.35 + 0.35 * Math.sin(t * 3 + i) * (0.5 + audio.onset);
      ctx.fillStyle = `hsla(${hue},90%,70%,${a * (0.4 + audio.bass * 0.3)})`;
      ctx.beginPath();
      ctx.arc(lx, ly, 10 + (roles.hats || audio.treble) * 6, 0, Math.PI * 2);
      ctx.fill();
      // beam down
      const beam = ctx.createLinearGradient(lx, ly, lx, h * 0.7);
      beam.addColorStop(0, `hsla(${hue},90%,70%,${0.15 + audio.energy * 0.1})`);
      beam.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(lx - 8, ly);
      ctx.lineTo(lx + 8, ly);
      ctx.lineTo(lx + 40, h * 0.7);
      ctx.lineTo(lx - 40, h * 0.7);
      ctx.fill();
    }
    // clean stage floor
    const stage = ctx.createLinearGradient(0, h * 0.55, 0, h);
    stage.addColorStop(0, '#2a2040');
    stage.addColorStop(1, '#181028');
    ctx.fillStyle = stage;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    // formation floor marks
    ctx.strokeStyle = `rgba(255,200,230,${0.25 + audio.onset * 0.2})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    for (let i = 0; i < 5; i++) {
      const fx = w * (0.2 + i * 0.15);
      ctx.beginPath();
      ctx.arc(fx, h * 0.78, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // center runway line
    ctx.strokeStyle = `rgba(255,255,255,${0.2 + audio.mid * 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.56);
    ctx.lineTo(w * 0.5, h * 0.92);
    ctx.stroke();
    atmosParticles(ctx, w, h, t, audio, 'orbs', intensity * 0.55);
    typePlane(ctx, w, h, { x: w * 0.3, y: h * 0.28, w: w * 0.4, h: h * 0.1, alpha: 0.14, fill: `rgba(255,160,220,${0.12 + audio.treble * 0.1})` });
    motifMarks(ctx, w, h, state, { midY: h * 0.6, color: 'rgba(255,180,220,0.3)' });
    figureStage(ctx, w, h, state, {
      groundY: h * 0.8, bandH: h * 0.12, pose: 'walk',
      color: 'rgba(40,20,60,0.6)', bandColor: 'rgba(200,140,200,0.35)', bandJagged: 4, bodyH: 40
    });
  },

  // aliases for audio.vibe / director short ids
  meadow(ctx, w, h, state) {
    return PRESETS.meadow_fauna(ctx, w, h, state);
  },
  pastoral(ctx, w, h, state) {
    return PRESETS.meadow_fauna(ctx, w, h, state);
  },
  folk_pastoral(ctx, w, h, state) {
    return PRESETS.meadow_fauna(ctx, w, h, state);
  },
  classical_hall(ctx, w, h, state) {
    return PRESETS.orchestral_hall(ctx, w, h, state);
  },
  cipher(ctx, w, h, state) {
    return PRESETS.hiphop_block(ctx, w, h, state);
  },
  ambient_void(ctx, w, h, state) {
    return PRESETS.ambient_field(ctx, w, h, state);
  },
  rnb_intimate(ctx, w, h, state) {
    return PRESETS.soul_room(ctx, w, h, state);
  },
  soul(ctx, w, h, state) {
    return PRESETS.soul_room(ctx, w, h, state);
  },
  club_edm(ctx, w, h, state) {
    return PRESETS.club_floor(ctx, w, h, state);
  },
  dance_club(ctx, w, h, state) {
    return PRESETS.club_floor(ctx, w, h, state);
  },
  jazz(ctx, w, h, state) {
    return PRESETS.jazz_club(ctx, w, h, state);
  },
  gospel(ctx, w, h, state) {
    return PRESETS.gospel_light(ctx, w, h, state);
  },
  latin(ctx, w, h, state) {
    return PRESETS.latin_night(ctx, w, h, state);
  },
  country(ctx, w, h, state) {
    return PRESETS.country_porch(ctx, w, h, state);
  },
  metal(ctx, w, h, state) {
    return PRESETS.metal_hall(ctx, w, h, state);
  },
  kpop_stage(ctx, w, h, state) {
    return PRESETS.stage_pop(ctx, w, h, state);
  },
  fracture(ctx, w, h, state) {
    return PRESETS.reality_fracture(ctx, w, h, state);
  },
  warzone(ctx, w, h, state) {
    return PRESETS.apocalyptic_warzone(ctx, w, h, state);
  },
  desert(ctx, w, h, state) {
    return PRESETS.burning_desert(ctx, w, h, state);
  }
};

const PRESET_ID_ALIASES = {
  desert: 'burning_desert',
  meadow: 'meadow_fauna',
  pastoral: 'meadow_fauna',
  folk_pastoral: 'meadow_fauna',
  fracture: 'reality_fracture',
  warzone: 'apocalyptic_warzone',
  classical_hall: 'orchestral_hall',
  cipher: 'hiphop_block',
  ambient_void: 'ambient_field',
  rnb_intimate: 'soul_room',
  soul: 'soul_room',
  club_edm: 'club_floor',
  dance_club: 'club_floor',
  jazz: 'jazz_club',
  gospel: 'gospel_light',
  latin: 'latin_night',
  country: 'country_porch',
  metal: 'metal_hall',
  kpop_stage: 'stage_pop'
};

export function getPresetIds() {
  const skip = new Set(['desert', 'meadow', 'fracture', 'warzone', 'pastoral', 'folk_pastoral', 'classical_hall', 'cipher', 'ambient_void', 'rnb_intimate', 'soul', 'club_edm', 'dance_club', 'jazz', 'gospel', 'latin', 'country', 'metal', 'kpop_stage']);
  return Object.keys(PRESETS).filter(k => !skip.has(k));
}

/** Congruent with Worlds HARD_LOCK — Visual paint allowlist under hardOnly */
const HARD_LOCK_PAINT_IDS = new Set([
  'metal_hall', 'reality_fracture', 'apocalyptic_warzone', 'red_void', 'storm'
]);

/** HOLD-0330: under hardOnly force cold/ash/red contrast — refuse warm pastoral bloom */
function applyHardContrastVeil(ctx, w, h, presetId) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  if (presetId === 'metal_hall' || presetId === 'storm') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(40,70,110,0.55)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(8,12,20,0.5)');
    ctx.fillStyle = g;
  } else if (presetId === 'red_void') {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.7);
    g.addColorStop(0, 'rgba(180,0,40,0.35)');
    g.addColorStop(1, 'rgba(8,0,4,0.55)');
    ctx.fillStyle = g;
  } else {
    // warzone / fracture / fallback — ash + ember rim
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(120,20,16,0.45)');
    g.addColorStop(0.5, 'rgba(20,18,22,0.15)');
    g.addColorStop(1, 'rgba(30,20,40,0.4)');
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, w, h);
  // kill residual warm pastoral peach/orange bloom
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = 'rgba(0,8,16,0.85)';
  ctx.fillRect(0, 0, w, h * 0.18);
  ctx.fillRect(0, h * 0.82, w, h * 0.18);
  ctx.restore();
}

export function drawPreset(id, ctx, w, h, state) {
  let resolved = PRESET_ID_ALIASES[id] || id;
  const stIn = state || {};
  const d = stIn.directive || {};
  // P0 novideo2: never feed NaN into addColorStop / rgb() — permanent black canvas
  const n0 = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  const emoIn = stIn.emotion || {};
  const audIn = stIn.audio || {};
  const emotion = {
    ...emoIn,
    hope: n0(emoIn.hope),
    aggression: n0(emoIn.aggression),
    darkness: n0(emoIn.darkness),
    valence: n0(emoIn.valence),
    arousal: n0(emoIn.arousal),
    tension: n0(emoIn.tension)
  };
  const audio = {
    ...audIn,
    bass: n0(audIn.bass),
    mid: n0(audIn.mid),
    treble: n0(audIn.treble),
    energy: n0(audIn.energy),
    onset: n0(audIn.onset),
    rms: n0(audIn.rms),
    peak: n0(audIn.peak),
    flux: n0(audIn.flux),
    build: n0(audIn.build),
    drop: n0(audIn.drop)
  };
  const intensity = n0(stIn.intensity != null ? stIn.intensity : 0.5);
  const st = { ...stIn, emotion, audio, intensity };
  // HOLD-0321/0330/0338: hard latch → strip pastoral; softClear NEVER redirects to metal_hall
  const softClearPaint = !!(st.softClear || d.softClear || d.hardHud?.softClear
    || d.hardHud?.softBedGuard);
  const hardPaint = !softClearPaint && !!(
    st.forbidPastoral || st.hardLock || st.hardOnly
    || d.forbidPastoral || d.hardOnly || d.hardLock || d.aggressionLock
    || d.hardHud?.hardOnly || d.hardHud?.nuclearHard
  );
  _forbidPastoralFauna = hardPaint;
  if (hardPaint && !HARD_LOCK_PAINT_IDS.has(String(resolved || '').toLowerCase())) {
    // Refuse warm pastoral / soft stage paint even if name wrong
    resolved = 'metal_hall';
  }
  try {
    try {
      const fn = PRESETS[resolved] || PRESETS.white_void;
      fn(ctx, w, h, st);
      if (hardPaint) applyHardContrastVeil(ctx, w, h, resolved);
    } catch (err) {
      // P0 novideo2: one bad preset must not leave the frame black after Renderer fillRect
      try { console.warn('[light-show] drawPreset failed:', resolved, err); } catch (_) { /* soft */ }
      try {
        const fallbackId = hardPaint ? 'metal_hall' : 'white_void';
        const fb = PRESETS[fallbackId] || PRESETS.white_void;
        fb(ctx, w, h, st);
        if (hardPaint) applyHardContrastVeil(ctx, w, h, fallbackId);
      } catch (err2) {
        try { console.warn('[light-show] drawPreset fallback failed', err2); } catch (_) { /* soft */ }
        // last resort: solid fill so frame is never empty black-from-throw
        try {
          ctx.fillStyle = hardPaint ? '#1a0808' : '#d8dce8';
          ctx.fillRect(0, 0, w, h);
        } catch (_) { /* soft */ }
      }
    }
  } finally {
    _forbidPastoralFauna = false;
  }
}
