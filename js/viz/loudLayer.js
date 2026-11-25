/**
 * polish6 / fixmood2 / perf (Nov 2026): LOUD sections visibly break apart in a STILL frame, every style —
 * while the figure stays fixed and findable within 0.5s, and heavy loud runs >= 40fps on mobile/SwiftShader:
 *   - Offscreen sprite caches for radial glow / smoke / furnace haze (zero per-frame createRadialGradient)
 *   - Offscreen cached Beast silhouette (wings + body + horns + talons + skull + fire catch) re-baked ~5Hz
 *   - Zero ctx.shadowBlur (layered soft halos / wider aura fills instead of CPU Gaussian blur)
 *   - Pooled particles & color-batched fills/strokes (zero per-frame array/gradient churn)
 */
const TAU = Math.PI * 2;
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const sm = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const rgba = (rgb, a) => `rgba(${rgb},${Math.max(0, Math.min(1, a)).toFixed(3)})`;

// Pre-rendered 128x128 radial glow sprite cache (replaces hundreds of per-frame createRadialGradient calls)
const _SPR = new Map();
function glowSprite(key, stops) {
  let c = _SPR.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [off, col] of stops) rg.addColorStop(off, col);
  g.fillStyle = rg;
  g.fillRect(0, 0, 128, 128);
  _SPR.set(key, c);
  return c;
}

const sprFurnace = () => glowSprite('furnace', [[0, 'rgba(255,152,48,1)'], [0.36, 'rgba(224,72,20,0.78)'], [0.68, 'rgba(140,26,10,0.38)'], [1, 'rgba(60,8,4,0)']]);
const sprCrest = () => glowSprite('crest', [[0, 'rgba(255,170,72,1)'], [0.5, 'rgba(225,74,22,0.52)'], [1, 'rgba(120,20,8,0)']]);
const sprSmokeDark = () => glowSprite('smokeD', [[0, 'rgba(6,3,4,0.92)'], [0.55, 'rgba(12,5,5,0.48)'], [1, 'rgba(6,3,4,0)']]);
const sprSmokeCol = () => glowSprite('smokeC', [[0, 'rgba(16,8,8,0.88)'], [0.6, 'rgba(22,10,9,0.42)'], [1, 'rgba(14,6,6,0)']]);
const sprSmokeEmber = () => glowSprite('smokeE', [[0, 'rgba(72,24,12,0.72)'], [0.55, 'rgba(24,8,6,0.35)'], [1, 'rgba(6,3,4,0)']]);
const sprEyeRed = () => glowSprite('eyeR', [[0, 'rgba(255,70,16,0.95)'], [0.45, 'rgba(200,32,8,0.42)'], [1, 'rgba(150,15,4,0)']]);
const sprEyeGold = () => glowSprite('eyeG', [[0, 'rgba(255,190,68,1)'], [1, 'rgba(255,90,20,0)']]);
const sprDebrisGlow = () => glowSprite('debG', [[0, 'rgba(255,170,70,0.92)'], [0.5, 'rgba(255,80,20,0.35)'], [1, 'rgba(255,80,20,0)']]);
const sprHorrorGlow = () => glowSprite('horG', [[0, 'rgba(170,190,220,0.9)'], [0.6, 'rgba(110,130,170,0.35)'], [1, 'rgba(80,90,120,0)']]);
const sprCineFire = () => glowSprite('cinF', [[0, 'rgba(255,150,60,0.95)'], [1, 'rgba(255,100,40,0)']]);

/** chaos amount 0..1 from composition chaos (0.3 -> 0, 0.75 -> 1) */
export function loudAmount(CH) { return sm((Number(CH) - 0.3) / 0.45); }

/** the mid-layer clear zone (figure + its head room). Returns 0 inside, 1 outside, soft edge. */
function clearMask(x, y, Z) {
  const dx = Math.abs(x - Z.cx) / Z.rx, dy = Math.abs(y - Z.cy) / Z.ry;
  const d = Math.max(dx, dy);
  return d < 1 ? 0 : d < 1.35 ? (d - 1) / 0.35 : 1;
}
function zoneOf(L) { return { cx: L.fx, cy: L.gy - L.H * 0.55, rx: Math.max(L.w * 0.17, L.H * 0.42), ry: L.H * 0.85 }; }

/** One main motion direction per burst: re-chosen only when a new burst starts (>=2.5s apart, on a kick). */
function burstDir(st, raw, t, a) {
  if (st.bDir == null) st.bDir = 1;
  if (a > 0.05 && raw.k > 0.7 && t - (st.bAt ?? -9) > 2.5) { st.bAt = t; st.bDir = hash(Math.floor(t * 10)) > 0.5 ? 1 : -1; st.bSeed = Math.floor(t * 7); }
  return st.bDir;
}

/** Sample a smooth closed curve with multi-frequency organic noise displacement (no straight polygon edges). */
function traceOrganic(ctx, pts, P, ampPx, t, seed, closed = true, sub = 4) {
  const n = pts.length;
  const dense = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(pts[(i - 1 + n) % n][0], pts[(i - 1 + n) % n][1]);
    const p1 = P(pts[i][0], pts[i][1]);
    const p2 = P(pts[(i + 1) % n][0], pts[(i + 1) % n][1]);
    const p3 = P(pts[(i + 2) % n][0], pts[(i + 2) % n][1]);
    const m0 = closed || i > 0 ? p0 : p1, m3 = closed || i + 2 < n ? p3 : p2;
    const wgt = pts[i][2] ?? 1;
    for (let s = 0; s < sub; s++) {
      const u = s / sub, u2 = u * u, u3 = u2 * u;
      const x = 0.5 * ((2 * p1[0]) + (-m0[0] + p2[0]) * u + (2 * m0[0] - 5 * p1[0] + 4 * p2[0] - m3[0]) * u2 + (-m0[0] + 3 * p1[0] - 3 * p2[0] + m3[0]) * u3);
      const y = 0.5 * ((2 * p1[1]) + (-m0[1] + p2[1]) * u + (2 * m0[1] - 5 * p1[1] + 4 * p2[1] - m3[1]) * u2 + (-m0[1] + 3 * p1[1] - 3 * p2[1] + m3[1]) * u3);
      dense.push([x, y, wgt]);
    }
  }
  if (!closed) {
    const last = P(pts[n - 1][0], pts[n - 1][1]);
    dense.push([last[0], last[1], pts[n - 1][2] ?? 1]);
  }
  const M = dense.length;
  ctx.beginPath();
  for (let i = 0; i < M; i++) {
    const prev = dense[(i - 1 + M) % M], cur = dense[i], nxt = dense[(i + 1) % M];
    const tx = nxt[0] - prev[0], ty = nxt[1] - prev[1], len = Math.hypot(tx, ty) || 1;
    const nx = ty / len, ny = -tx / len;
    const u = i / M;
    const turb = 0.52 * Math.sin(u * 29 + t * 1.9 + seed) + 0.3 * Math.sin(u * 61 - t * 3.4 + seed * 1.7) + 0.25 * Math.sin(u * 113 + t * 5.1 + seed * 3.1);
    const disp = ampPx * cur[2] * turb;
    const px = cur[0] + nx * disp, py = cur[1] + ny * disp;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  if (closed) ctx.closePath();
}

/** Angular polygon with broken, textured edges: every edge is split into short jittered segments. */
function traceBroken(ctx, pts, P, jit, t, seed) {
  ctx.beginPath();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = P(pts[i][0], pts[i][1]), b = P(pts[(i + 1) % n][0], pts[(i + 1) % n][1]);
    if (i === 0) ctx.moveTo(a[0], a[1]);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), segs = Math.max(2, Math.min(6, Math.round(len / Math.max(4, jit * 2.5))));
    const nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1);
    for (let k = 1; k <= segs; k++) {
      const u = k / segs, e = k === segs ? 0 : 1;
      const d = e * jit * (hash(seed + i * 17.3 + k * 3.7) - 0.5 + 0.35 * Math.sin(t * 2.1 + i + k * 1.3));
      ctx.lineTo(a[0] + (b[0] - a[0]) * u + nx * d, a[1] + (b[1] - a[1]) * u + ny * d);
    }
  }
  ctx.closePath();
}

/** Smooth curved, continuously tapering horn polygon. */
function traceHorn(ctx, d, hd, P, t, br, root = 0.865, rootX = 0.088) {
  const N = 14;
  const spine = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = d * (rootX + 0.25 * Math.sin(u * Math.PI * 0.76) - 0.04 * u * u);
    const y = (root - hd) + u * (0.40 + 0.015 * br) + 0.025 * Math.sin(u * Math.PI);
    const hw = 0.038 * Math.pow(1 - u, 1.32) * (1 + 0.09 * Math.sin(u * 24));
    spine.push([x, y, Math.max(0.0018, hw)]);
  }
  const outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const p = spine[Math.max(0, i - 1)], q = spine[Math.min(N, i + 1)];
    const tx = q[0] - p[0], ty = q[1] - p[1], len = Math.hypot(tx, ty) || 1;
    const nx = (ty / len) * d, ny = -(tx / len) * d;
    const [cx0, cy0, hw] = spine[i];
    const jit = 0.0018 * Math.sin(i * 2.3 + t * 2.4 + d);
    outer.push(P(cx0 + nx * (hw + jit), cy0 + ny * (hw + jit)));
    inner.push(P(cx0 - nx * hw, cy0 - ny * hw));
  }
  ctx.beginPath();
  ctx.moveTo(outer[0][0], outer[0][1]);
  for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i][0], outer[i][1]);
  for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i][0], inner[i][1]);
  ctx.closePath();
  return outer;
}

/* ---------------------------------------------------------------- heavy beast ---------------------------------------------------------------- */
/**
 * Bake the static/slow-breathing Beast body+wings+horns+talons+skull into an offscreen sprite.
 * Eliminates all per-frame shadowBlur & polygon tessellation; re-baked at ~5Hz or on resize/lunge change.
 */
function bakeBeastSprite(st, o) {
  const { bh, sx, sy, br, hd, lunge, rear, lv, env, t, w, h } = o;
  // Sprite bounds in beast space: x in [-1.18*bh*sx, +1.18*bh*sx], y in [-0.5*bh*sy, +1.36*bh*sy]
  const scale = 0.72; // crisp smoky outline at 52% fewer pixels than full DPR2
  const halfW = bh * sx * 1.18, topH = bh * sy * 1.38, botH = bh * sy * 0.52;
  const cw = Math.max(128, Math.min(1024, Math.ceil(halfW * 2 * scale)));
  const ch = Math.max(128, Math.min(1200, Math.ceil((topH + botH) * scale)));
  const c = st._beastSpr || (st._beastSpr = document.createElement('canvas'));
  if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
  const bc = c.getContext('2d');
  bc.setTransform(scale, 0, 0, scale, cw * 0.5, topH * scale);
  bc.clearRect(-halfW - 20, -topH - 20, halfW * 2 + 40, topH + botH + 40);

  const P = (x, y) => [x * bh * sx, -y * bh * sy];
  const amp = Math.max(2.5, bh * 0.0095) * (1 + 0.4 * lv.b);
  const lift = 0.08 * lunge + 0.16 * rear, sp = 0.06 * lunge + 0.08 * rear;

  const rightSide = [
    [0.36, -0.45, 1.4], [0.30, 0.14, 1.5], [0.34, 0.34, 1.4],
    [0.36 + sp, 0.24 + lift, 0.9], [0.45 + sp, 0.18 + lift, 0.9], [0.56 + sp, 0.28 + lift, 1.2],
    [0.64, 0.48 + lift * 0.5, 1.4], [0.64, 0.68, 1.5],
    [0.51, 0.83, 1.4], [0.33, 0.90 + 0.01 * br, 1.3], [0.16, 0.87, 0.9],
    [0.105, 0.79 - hd, 0.25], [0.055, 0.805 - hd, 0.2], [0, 0.79 - hd, 0.2]
  ];
  const leftSide = rightSide.slice(0, -1).reverse().map(([x, y, m]) => [-x, y, m]);
  const bodyPts = [...rightSide, ...leftSide];
  const wing = (d) => [
    [d * 0.34, 0.78, 1.0],
    [d * 0.68, 0.98 + 0.03 * br + 0.07 * rear, 1.5],
    [d * 1.08, 1.20 + 0.09 * rear, 1.7],
    [d * 0.96, 0.98, 1.5], [d * 1.04, 0.85, 1.6],
    [d * 0.88, 0.78, 1.3], [d * 0.94, 0.65, 1.6],
    [d * 0.78, 0.59, 1.2], [d * 0.82, 0.46, 1.5],
    [d * 0.64, 0.44, 1.2], [d * 0.48, 0.52, 1.0]
  ];

  // 1. Wings with soft smoky edge strokes (replaces 80px shadowBlur)
  bc.lineJoin = 'round';
  for (const d of [-1, 1]) {
    traceOrganic(bc, wing(d), P, amp * 1.45, t, d * 7.3, true, 4);
    bc.globalAlpha = 0.24; bc.strokeStyle = 'rgb(8,3,4)'; bc.lineWidth = Math.max(12, bh * 0.055); bc.stroke();
    bc.globalAlpha = 0.46; bc.lineWidth = Math.max(6, bh * 0.025); bc.stroke();
    bc.globalAlpha = 0.82; bc.fillStyle = 'rgb(5,3,4)'; bc.fill();
  }

  // 2. Core void silhouette with soft perimeter halo (replaces 60px shadowBlur)
  traceOrganic(bc, bodyPts, P, amp, t, 1.9, true, 4);
  bc.globalAlpha = 0.26; bc.strokeStyle = 'rgb(4,2,3)'; bc.lineWidth = Math.max(10, bh * 0.042); bc.stroke();
  bc.globalAlpha = 0.55; bc.lineWidth = Math.max(4, bh * 0.018); bc.stroke();
  bc.globalAlpha = 0.99; bc.fillStyle = 'rgb(3,2,3)'; bc.fill();

  // 3. Curved horns + subtle fire-catch rim
  const hornOuters = [];
  bc.fillStyle = 'rgb(3,2,3)';
  for (const d of [-1, 1]) {
    const outPts = traceHorn(bc, d, hd, P, t, br, 0.865, 0.088);
    bc.fill();
    hornOuters.push(outPts);
  }
  bc.save();
  bc.globalCompositeOperation = 'screen';
  bc.lineCap = 'round'; bc.lineJoin = 'round';
  const rimA = 0.24 + 0.16 * lv.b + 0.16 * env;
  bc.strokeStyle = rgba('255,118,40', rimA);
  bc.lineWidth = Math.max(1.2, bh * 0.0035);
  for (const outPts of hornOuters) {
    bc.beginPath();
    const startI = 4, endI = Math.floor(outPts.length * 0.78);
    bc.moveTo(outPts[startI][0], outPts[startI][1]);
    for (let i = startI + 1; i < endI; i++) bc.lineTo(outPts[i][0], outPts[i][1]);
    bc.stroke();
  }
  bc.restore();

  // 4. Angular broken-edge skull (cranium, brow, cheekbones, jaw, sockets, ember catch-light)
  {
    const R = [[0, 0.975], [0.03, 0.972], [0.058, 0.955], [0.083, 0.92], [0.097, 0.875], [0.093, 0.83], [0.1, 0.8], [0.118, 0.78], [0.096, 0.758],
      [0.088, 0.742], [0.122, 0.712], [0.1, 0.692], [0.08, 0.664], [0.072, 0.636], [0.05, 0.612], [0.026, 0.597], [0, 0.592]];
    const sk = [...R.map(([x, y]) => [x, y - (y < 0.9 ? hd : hd * 0.5)]), ...R.slice(1, -1).reverse().map(([x, y]) => [-x, y - (y < 0.9 ? hd : hd * 0.5)])];
    const jit = Math.max(1.5, bh * 0.0042) * (1 + 0.35 * lv.b);
    bc.globalAlpha = 1; bc.fillStyle = 'rgb(4,2,3)';
    traceBroken(bc, sk, P, jit, t, 4.1); bc.fill();
    for (const d of [-1, 1]) {
      traceOrganic(bc, [[d * 0.06, 0.9 - hd * 0.5], [d * 0.13, 0.9], [d * 0.19, 0.86], [d * 0.17, 0.76], [d * 0.1, 0.7 - hd], [d * 0.08, 0.8 - hd]], P, jit * 0.8, t, 6 + d, true, 3);
      bc.fill();
    }
    bc.save(); traceBroken(bc, sk, P, jit, t, 4.1); bc.clip();
    const [jx, jy] = P(0, 0.56 - hd); const jr = bh * 0.2;
    const jg = bc.createRadialGradient(jx, jy, 0, jx, jy, jr);
    jg.addColorStop(0, rgba('150,40,14', 0.52 + 0.22 * lv.b + 0.18 * env));
    jg.addColorStop(0.55, rgba('70,16,8', 0.3)); jg.addColorStop(1, 'rgba(20,6,4,0)');
    bc.globalCompositeOperation = 'screen'; bc.fillStyle = jg; bc.fillRect(jx - jr, jy - jr, jr * 2, jr * 2);
    bc.globalCompositeOperation = 'source-over'; bc.fillStyle = 'rgb(3,2,3)';
    for (const d of [-1, 1]) {
      traceBroken(bc, [[d * 0.012, 0.77], [d * 0.05, 0.778], [d * 0.092, 0.768], [d * 0.082, 0.726], [d * 0.04, 0.718], [d * 0.014, 0.735]].map(([x, y]) => [x, y - hd]), P, jit * 0.6, t, 9 + d); bc.fill();
      traceBroken(bc, [[d * 0.03, 0.704], [d * 0.085, 0.69], [d * 0.07, 0.655], [d * 0.035, 0.66]].map(([x, y]) => [x, y - hd]), P, jit * 0.6, t, 13 + d); bc.fill();
    }
    traceBroken(bc, [[0, 0.722], [0.014, 0.69], [0, 0.676], [-0.014, 0.69]].map(([x, y]) => [x, y - hd]), P, jit * 0.4, t, 17); bc.fill();
    const mo = 0.006 + 0.022 * lunge + 0.012 * rear;
    const mpts = [[-0.05, 0.645], [0.05, 0.645]];
    for (let i = 0; i <= 8; i++) { const u = i / 8; mpts.push([0.05 - u * 0.1, 0.645 - mo - (i % 2 ? 0.012 : 0)]); }
    traceBroken(bc, mpts.map(([x, y]) => [x, y - hd]), P, jit * 0.3, t, 21); bc.fill();
    bc.restore();

    // Ember catch-light on cheekbone/jaw/brow undersides (2 passes instead of shadowBlur)
    bc.save();
    bc.globalCompositeOperation = 'screen'; bc.lineCap = 'round'; bc.lineJoin = 'miter';
    const line = (pts) => { bc.beginPath(); pts.forEach(([x, y], i) => { const q2 = P(x, y - hd); if (i) bc.lineTo(q2[0], q2[1]); else bc.moveTo(q2[0], q2[1]); }); bc.stroke(); };
    const ca = 0.38 + 0.22 * lv.b + 0.22 * env;
    for (const [lw, al] of [[Math.max(3, bh * 0.008), ca * 0.25], [Math.max(1.1, bh * 0.0028), ca]]) {
      bc.strokeStyle = rgba('255,110,40', al); bc.lineWidth = lw;
      for (const d of [-1, 1]) {
        line([[d * 0.122, 0.712], [d * 0.1, 0.692], [d * 0.08, 0.664]]);
        line([[d * 0.072, 0.636], [d * 0.05, 0.612], [d * 0.026, 0.597]]);
        line([[d * 0.118, 0.78], [d * 0.096, 0.758]]);
      }
    }
    bc.restore();
  }

  // 5. Shadowed talons curling inward from the massive forearms
  bc.fillStyle = 'rgb(3,2,3)';
  for (const d of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const cx0 = d * (0.38 + sp + i * 0.028), cy0 = 0.20 + lift + (i === 1 || i === 2 ? -0.008 : 0.004);
      const p0 = P(cx0 - d * 0.009, cy0 + 0.01), p1 = P(cx0 + d * 0.009, cy0 + 0.01);
      const tip = P(cx0 - d * (0.032 + 0.008 * (i === 1 ? 1 : 0)), cy0 - 0.042 - 0.01 * (i === 1 || i === 2 ? 1 : 0));
      const cp = P(cx0 + d * 0.004, cy0 - 0.028);
      bc.beginPath(); bc.moveTo(p0[0], p0[1]); bc.quadraticCurveTo(cp[0], cp[1], tip[0], tip[1]); bc.lineTo(p1[0], p1[1]); bc.closePath(); bc.fill();
    }
  }

  // 6. Fire underlight clipped to lower body
  bc.save();
  traceOrganic(bc, bodyPts, P, amp, t, 1.9, true, 4);
  bc.clip();
  const fire = 0.28 + 0.2 * lv.b + 0.16 * env;
  const [, yTop] = P(0, 0.42), [, yBot] = P(0, -0.35);
  const ug = bc.createLinearGradient(0, yBot, 0, yTop);
  ug.addColorStop(0, 'rgba(60,10,4,0)');
  ug.addColorStop(0.28, rgba('210,72,22', fire));
  ug.addColorStop(0.6, rgba('130,30,10', fire * 0.4));
  ug.addColorStop(1, 'rgba(60,10,4,0)');
  bc.globalCompositeOperation = 'screen';
  bc.globalAlpha = 1; bc.fillStyle = ug;
  bc.fillRect(-halfW, yTop, halfW * 2, yBot - yTop);
  bc.restore();

  void w; void h;
  st._beastMeta = { bh, sx, sy, halfW, topH, botH, lunge, t, w, h };
}

export function drawBeast(ctx, o) {
  const { L, lv, raw, t, st, CH, q = 1, grade } = o;
  const { w, h, H, fx, gy, side: s } = L;
  const a = loudAmount(CH);
  if (a > 0.05 && t - (st.lungeAt ?? -9) > 1.6) {
    if (raw.k > 0.78) { st.lungeAt = t; st.lungeKind = 'lunge'; }
    else if (raw.x > 0.75 || raw.s > 0.85) { st.lungeAt = t; st.lungeKind = 'rear'; }
  }
  const age = t - (st.lungeAt ?? -9);
  const env = age < 0.22 ? sm(age / 0.22) : age < 1.5 ? 1 - sm((age - 0.22) / 1.28) : 0;
  const lunge = st.lungeKind === 'lunge' ? env : 0, rear = st.lungeKind === 'rear' ? env : 0;
  const br = 0.5 - 0.5 * Math.cos(t * 1.25);
  const bh = Math.min(H * 5, Math.max(H * 3.6, h * 0.72)) * (1 + 0.07 * lv.b) * (1 + 0.07 * lunge + 0.05 * rear);
  const cx = fx - s * H * 0.14, by = gy + H * 0.55 + lunge * H * 0.16 - rear * H * 0.26;
  const hd = 0.048 * lunge - 0.018 * rear;
  const sx = (0.76 + 0.014 * br + 0.05 * rear) * Math.min(1, (w / bh) * 1.25 + 0.22), sy = 1 + 0.014 * br;
  const P = (x, y) => [cx + x * bh * sx, by - y * bh * sy];

  // Re-bake cached Beast sprite only when size/lunge/viewport shifts or ~5Hz for organic edge life
  const M = st._beastMeta;
  if (!M || !st._beastSpr || M.w !== w || M.h !== h || Math.abs(bh - M.bh) > M.bh * 0.08 || Math.abs(lunge - M.lunge) > 0.25 || t - M.t > 0.20) {
    bakeBeastSprite(st, { bh, sx, sy, br, hd, lunge, rear, lv, env, t, w, h });
  }
  const bm = st._beastMeta;
  const scaleX = (bh * sx) / (bm.bh * bm.sx), scaleY = (bh * sy) / (bm.bh * bm.sy);

  ctx.save();
  // 1. Furnace fire haze behind shoulders & body (cached sprite blits, zero per-frame gradients)
  {
    const fSpr = sprFurnace(), cSpr = sprCrest();
    const [gx, gyb] = P(0, 0.60);
    const R = bh * 0.95;
    const bl = Math.min(0.95, 0.52 + 0.26 * lv.b + 0.24 * env + (raw.k > 0.7 ? 0.14 : 0));
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = bl;
    ctx.drawImage(fSpr, gx - R * 1.3, gyb - R * 0.92, R * 2.6, R * 1.84);
    const crA = Math.min(0.95, 0.4 + 0.22 * lv.b + 0.18 * env);
    const hr = bh * 0.34;
    ctx.globalAlpha = crA;
    for (const d of [-1, 1]) {
      const [hx, hy] = P(d * 0.36, 0.93);
      ctx.drawImage(cSpr, hx - hr, hy - hr, hr * 2, hr * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // 2. Blit cached beast silhouette (wings + body + horns + talons + skull + underlight)
  ctx.globalAlpha = 1;
  ctx.drawImage(st._beastSpr, cx - bm.halfW * scaleX, by - bm.topH * scaleY, bm.halfW * 2 * scaleX, (bm.topH + bm.botH) * scaleY);

  // 3. Animated perimeter & crown smoke puffs (cached sprite blits, hard-capped by quality)
  const smD = sprSmokeDark(), smE = sprSmokeEmber();
  const nP = Math.min(18, Math.floor((8 + 8 * lv.b + 4 * a) * q));
  const anchors = [[0.54, 0.74], [0.44, 0.87], [0.28, 0.90], [0.62, 0.56], [0.56, 0.36], [0.34, 0.32], [0.36, 0.14], [0.85, 0.72], [0.95, 0.94]];
  for (let i = 0; i < nP; i++) {
    const an = anchors[i % anchors.length], d = i % 2 ? 1 : -1, r0 = hash(i * 3.7 + 1.3);
    const life = (t * (0.06 + 0.05 * r0) + r0) % 1;
    const [px, py] = P(d * an[0] + (r0 - 0.5) * 0.09, an[1] + life * 0.18);
    const R = bh * (0.045 + 0.075 * life) * (0.85 + 0.45 * lv.b);
    ctx.globalAlpha = (an[1] < 0.20 ? 0.55 : 0.8) * (1 - life);
    ctx.drawImage(an[1] < 0.20 ? smE : smD, px - R, py - R, R * 2, R * 2);
  }
  const nCrown = Math.min(7, Math.floor(4 * q) + 2);
  for (let i = 0; i < nCrown; i++) {
    const r0 = hash(i * 5.1 + 0.7), life = (t * (0.07 + 0.05 * r0) + r0) % 1;
    const [px, py] = P((r0 - 0.5) * 0.3 + Math.sin(t * 0.6 + i) * 0.03 + (r0 - 0.5) * life * 0.12, 0.93 + life * 0.32);
    const Rr = bh * (0.04 + 0.075 * life);
    ctx.globalAlpha = 0.52 * (1 - life * 0.7);
    ctx.drawImage(smD, px - Rr, py - Rr, Rr * 2, Rr * 2);
  }

  // 4. Eyes ONLY on the head: fierce slanted demonic slits + cached bloom sprites
  const ea = Math.min(1, 0.65 + 0.35 * Math.max(lv.v, lv.x, env));
  const eR = sprEyeRed(), eG = sprEyeGold();
  ctx.globalCompositeOperation = 'screen';
  for (const d of [-1, 1]) {
    const [ex, ey] = P(d * 0.045, 0.745 - hd);
    const R1 = bh * (0.064 + 0.024 * env);
    ctx.globalAlpha = (0.72 + 0.24 * env) * ea;
    ctx.drawImage(eR, ex - R1, ey - R1, R1 * 2, R1 * 2);
    const R2 = bh * (0.026 + 0.01 * env);
    ctx.globalAlpha = 0.92 * ea;
    ctx.drawImage(eG, ex - R2, ey - R2, R2 * 2, R2 * 2);
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(d * 0.46);
    const ew = bh * (0.023 + 0.005 * env), eh = bh * (0.0052 + 0.0018 * env);
    ctx.globalAlpha = ea; ctx.fillStyle = 'rgb(255,228,140)';
    ctx.beginPath(); ctx.moveTo(-ew, 0); ctx.quadraticCurveTo(0, -eh, ew, 0); ctx.quadraticCurveTo(0, eh * 0.85, -ew, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // 5. Soft ground fire haze where the beast rises from (cached linear gradient)
  const gyQ = Math.round(gy), hQ = Math.round(H);
  if (!st._bgFireG || st._bgFireGy !== gyQ || st._bgFireH !== hQ) {
    st._bgFireGy = gyQ; st._bgFireH = hQ;
    const fg = ctx.createLinearGradient(0, gy - H * 0.35, 0, gy + H * 0.55);
    fg.addColorStop(0, 'rgba(255,95,28,0)');
    fg.addColorStop(0.45, 'rgba(255,95,28,1)');
    fg.addColorStop(0.75, 'rgba(180,40,14,0.6)');
    fg.addColorStop(1, 'rgba(90,15,6,0)');
    st._bgFireG = fg;
  }
  ctx.globalAlpha = Math.min(0.65, 0.24 + 0.22 * lv.b + 0.14 * env);
  ctx.fillStyle = st._bgFireG;
  ctx.fillRect(0, gy - H * 0.35, w, H * 0.9);
  ctx.restore();
  void grade;
  const eye = P(0, 0.745 - hd);
  return { eye, lunge: env, kind: env > 0 ? st.lungeKind : 'breathe' };
}

/* ---------------------------------------------------------------- far layer ---------------------------------------------------------------- */
export function drawChaosFar(ctx, o) {
  const { style, L, lv, raw, t, st, CH, q = 1, grade } = o;
  const B = typeof o.blocked === 'function' ? o.blocked : () => false;
  const SG = o.stormGain ?? 1;
  const a = loudAmount(CH) * SG;
  if (style === 'ember_wasteland' && a <= 0.02) {
    // Heavy quiet: subtle smoldering edge smoke without violent storm debris
    if (!B('smoke')) {
      const { w, h, gy } = L, smC = sprSmokeCol();
      ctx.save();
      ctx.globalAlpha = 0.28 * (1 - a * 20);
      for (const ex of [0.06, 0.94]) {
        const cx0 = w * ex + Math.sin(t * 0.25 + ex * 9) * w * 0.02;
        ctx.drawImage(smC, cx0 - w * 0.16, h * 0.05, w * 0.32, gy);
      }
      ctx.restore();
      return ['smoke'];
    }
    return null;
  }
  if (a <= 0.02 || style === 'cozy') return null;
  const { w, h, H, fx, gy, side: s } = L, Z = zoneOf(L), dir = burstDir(st, raw, t, a);
  const act = [];
  ctx.save();
  if (style === 'ember_wasteland') {
    const n = Math.min(12, Math.floor((6 + 6 * a) * q));
    ctx.fillStyle = 'rgb(8,4,4)';
    for (let i = 0; i < n; i++) {
      const r0 = hash(i * 5.3 + 1), life = (t * (0.18 + 0.2 * r0) + r0) % 1;
      const sideFlank = i % 2 ? 0.82 + 0.22 * r0 : -0.04 + 0.22 * r0;
      const x = sideFlank * w + dir * life * w * 0.14, y = -h * 0.05 + life * (gy - H * 0.2);
      const m = clearMask(x, y, Z); if (m <= 0) continue;
      const sz = H * (0.028 + 0.05 * hash(i + 3)), j1 = 0.5 + hash(i + 7), j2 = 0.5 + hash(i + 9);
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * (0.6 + r0) * dir + i);
      ctx.globalAlpha = 0.85 * m * a;
      ctx.beginPath(); ctx.moveTo(-sz * j1, -sz * 0.3); ctx.lineTo(-sz * 0.3, -sz * 0.6 * j2); ctx.lineTo(sz * 0.2, -sz * 0.45); ctx.lineTo(sz * 0.7 * j2, -sz * 0.5); ctx.lineTo(sz * j1, sz * 0.2); ctx.lineTo(sz * 0.3, sz * 0.55); ctx.lineTo(-sz * 0.5, sz * 0.45 * j1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (!B('smoke')) {
      const smC = sprSmokeCol();
      const nS = Math.min(10, Math.floor((5 + 5 * a) * q));
      for (let i = 0; i < nS; i++) {
        const r0 = hash(i * 7.7 + 0.3), life = (t * (0.025 + 0.03 * r0) + r0) % 1, sd = i % 2 ? 1 : -1;
        const x = w * (sd > 0 ? 0.78 + 0.3 * r0 : 0.22 - 0.3 * r0) + sd * life * w * 0.08, y = h * (0.62 - life * 0.7);
        const R = w * (0.16 + 0.16 * hash(i + 4)) * (0.7 + 0.6 * life);
        ctx.globalAlpha = (0.55 + 0.25 * a) * Math.sin(life * Math.PI);
        ctx.drawImage(smC, x - R, y - R, R * 2, R * 2);
      }
      ctx.globalAlpha = 0.85 * a;
      for (const ex of [0.05, 0.95]) {
        const cx0 = w * ex + Math.sin(t * 0.4 + ex * 9) * w * 0.03;
        ctx.drawImage(smC, cx0 - w * 0.18, -h * 0.05, w * 0.36, gy * 1.1);
      }
      act.push('smoke');
    }
    act.push('ruins');
  } else if (style === 'sad') {
    if (!B('rain')) {
      const n = Math.min(110, Math.floor((50 + 60 * a) * q));
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgb(170,178,192)'; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.2 * a;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const r0 = hash(i * 2.9 + 7), spd = 0.32 + 0.18 * r0;
        const life = (t * spd + hash(i * 1.3)) % 1;
        const x = (r0 * w * 1.1 - w * 0.05) - life * w * 0.03, y = -h * 0.1 + life * h * 1.15, len = H * (0.22 + 0.25 * hash(i + 11));
        ctx.moveTo(x, y); ctx.lineTo(x - len * 0.06, y + len);
      }
      ctx.stroke();
      act.push('heavy_rain');
    }
  } else if (style === 'horror') {
    const n = Math.min(18, Math.floor((10 + 8 * a) * q)), ox0 = fx + s * w * 0.3, oy0 = gy - H * 1.25;
    {
      const R = w * 0.55, cxg = ox0 + dir * w * 0.12, cyg = oy0 - H * 0.9;
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.45 * a;
      ctx.drawImage(sprHorrorGlow(), cxg - R, cyg - R, R * 2, R * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
    st.crowBurstT = st.crowBurstT ?? t;
    ctx.fillStyle = 'rgb(5,5,7)';
    for (let i = 0; i < n; i++) {
      const r0 = hash(i * 4.7 + 2), ang = -Math.PI / 2 + dir * (0.15 + 1.25 * r0), dist = (0.15 + 0.85 * hash(i * 9.1)) * w * 0.55;
      const drift = ((t - st.crowBurstT) * 0.015 * (0.5 + r0)) % 0.25;
      const x = ox0 + Math.cos(ang) * dist * (1 + drift), y = oy0 + Math.sin(ang) * dist * 0.9 * (1 + drift) - H * 0.2;
      const m = clearMask(x, y, Z); if (m <= 0) continue;
      const sz = H * (0.05 + 0.07 * (1 - hash(i * 9.1))), fl = Math.sin(t * 2.2 + i * 1.7) * 0.25 + (i % 3 - 1) * 0.35;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2 + (r0 - 0.5) * 0.6); ctx.globalAlpha = 0.95 * m * Math.min(1, a * 1.6);
      ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.18, sz * 0.42, 0, 0, TAU); ctx.fill();
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -sz * 0.1); ctx.quadraticCurveTo(d * sz * 0.7, -sz * (0.55 + fl), d * sz * 1.25, -sz * (0.2 + fl)); ctx.lineTo(d * sz * 1.05, -sz * (0.05 + fl * 0.6)); ctx.lineTo(d * sz * 0.95, sz * (0.08 - fl * 0.3)); ctx.lineTo(d * sz * 0.7, sz * 0.02); ctx.quadraticCurveTo(d * sz * 0.4, sz * 0.12, 0, sz * 0.18); ctx.closePath(); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-sz * 0.12, sz * 0.38); ctx.lineTo(0, sz * 0.62); ctx.lineTo(sz * 0.12, sz * 0.38); ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.32 * a;
    ctx.fillStyle = 'rgb(70,110,200)'; ctx.beginPath(); ctx.moveTo(s > 0 ? 0 : w, 0); ctx.lineTo(w * 0.5 - s * w * 0.05, 0); ctx.lineTo(w * 0.5 + s * w * 0.15, h); ctx.lineTo(s > 0 ? 0 : w, h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgb(200,20,20)'; ctx.beginPath(); ctx.moveTo(s > 0 ? w : 0, 0); ctx.lineTo(w * 0.5 - s * w * 0.05, 0); ctx.lineTo(w * 0.5 + s * w * 0.15, h); ctx.lineTo(s > 0 ? w : 0, h); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    act.push('crow_burst', 'split_light');
  } else if (style === 'cinematic') {
    const hz = gy - H * 0.45, cSpr = sprCineFire(), smC = sprSmokeCol();
    for (let i = 0; i < 4; i++) {
      const ex = (i < 2 ? 0.06 + 0.16 * i : 0.78 + 0.16 * (i - 2)) * w; if (clearMask(ex, hz, Z) <= 0) continue;
      const R = H * (0.35 + 0.2 * hash(i));
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = (0.45 + 0.25 * lv.b) * a;
      ctx.drawImage(cSpr, ex - R, hz - R, R * 2, R * 2);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.65 * a;
      ctx.drawImage(smC, ex + dir * H * 0.3 - H * 0.32, hz - H * 2.4, H * 0.64, H * 2.4);
    }
    for (const bxF of [0.12, 0.88]) { const bx = bxF * w, top = hz - H * 1.5; ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = 'rgb(14,12,12)'; ctx.lineWidth = Math.max(1.5, H * 0.02); ctx.beginPath(); ctx.moveTo(bx, hz + H * 0.1); ctx.lineTo(bx, top); ctx.stroke(); ctx.fillStyle = 'rgb(60,14,12)'; ctx.beginPath(); ctx.moveTo(bx, top); for (let k = 0; k <= 6; k++) { const xx = bx + dir * (k / 6) * H * 0.7, yy = top + Math.sin(t * 6 + k) * H * 0.04 * (k / 6); ctx.lineTo(xx, yy); } for (let k = 6; k >= 0; k--) { const xx = bx + dir * (k / 6) * H * 0.7 * (k % 2 ? 0.85 : 1), yy = top + H * 0.32 + Math.sin(t * 6 + k + 1) * H * 0.04 * (k / 6); ctx.lineTo(xx, yy); } ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = 'rgba(20,16,14,0.85)'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.7 * a;
    ctx.beginPath();
    for (let i = 0; i < Math.floor(14 * a * q); i++) { const r0 = hash(i * 6.1), life = (t * 0.5 + r0) % 1, x = (r0 * w) + dir * life * w * 0.5, y = h * (0.08 + 0.2 * hash(i + 2)) + Math.sin(life * Math.PI) * -H * 0.3; if (clearMask(x, y, Z) <= 0) continue; ctx.moveTo(x, y); ctx.lineTo(x - dir * H * 0.12, y + H * 0.03); }
    ctx.stroke();
    act.push('battle', 'banners');
  } else if (style === 'candy_pop' && !B('sunburst')) {
    const cx = fx, cy = gy - H * 0.9, R = Math.max(w, h), n = 14, rot = (st.rayRot = (st.rayRot || 0) + (raw.k > 0.6 ? 0.01 : 0.002) * dir);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.22 * a;
    const cols = ['rgb(255,120,200)', 'rgb(120,220,255)', 'rgb(255,230,110)'];
    for (let b = 0; b < 3; b++) {
      ctx.fillStyle = cols[b]; ctx.beginPath();
      for (let i = b * 2; i < n; i += 6) {
        const a0 = rot + (i / n) * TAU, a1 = rot + ((i + 1) / n) * TAU;
        ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); ctx.closePath();
      }
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    act.push('sunburst');
  }
  ctx.restore();
  void grade;
  return act;
}

/* ---------------------------------------------------------------- near layer + frame damage ---------------------------------------------------------------- */
export function drawChaosNear(ctx, o) {
  const { style, L, raw, t, st, CH, q = 1, reduceMotion } = o;
  const B = typeof o.blocked === 'function' ? o.blocked : () => false;
  const a = loudAmount(CH) * (o.stormGain ?? 1); if (a <= 0.02 || style === 'cozy') return null;
  const { w, h, H, gy } = L, Z = zoneOf(L), dir = st.bDir || 1;
  const act = [];
  ctx.save();
  if (!reduceMotion && style !== 'candy_pop' && style !== 'sad') {
    if (style === 'ember_wasteland') {
      // Batched into 2 stroke paths instead of 13 individual strokes
      const n = Math.min(10, Math.floor((4 + 6 * a) * q));
      ctx.globalCompositeOperation = 'screen'; ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.4, H * 0.012); ctx.globalAlpha = 0.52 * a;
      for (let buck = 0; buck < 2; buck++) {
        ctx.strokeStyle = buck ? 'rgb(255,140,48)' : 'rgb(255,95,28)';
        ctx.beginPath();
        for (let i = buck; i < n; i += 2) {
          const r0 = hash(i * 8.3 + (st.bSeed || 0)), life = (t * (0.85 + r0) + r0) % 1;
          const x = dir > 0 ? -w * 0.05 + life * w * 1.1 : w * 1.05 - life * w * 1.1;
          const y = h * (0.45 + 0.45 * hash(i * 3.3 + 1));
          if (clearMask(x, y, Z) <= 0.25) continue;
          if (Math.abs(x - L.fx) < w * 0.24 && y < gy - H * 1.2) continue;
          ctx.moveTo(x, y); ctx.lineTo(x - dir * H * (0.14 + 0.18 * r0), y - H * 0.06);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    } else {
      const col = { horror: '12,12,14', cinematic: '255,170,90' }[style] || '200,200,200';
      const n = Math.min(8, Math.floor((3 + 5 * a) * q));
      ctx.lineCap = 'round'; ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = Math.max(1.5, H * 0.014); ctx.globalAlpha = 0.45 * a;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const r0 = hash(i * 8.3 + (st.bSeed || 0)), life = (t * (0.9 + r0) + r0) % 1;
        const x = dir > 0 ? -w * 0.1 + life * w * 1.2 : w * 1.1 - life * w * 1.2, y = h * (0.1 + 0.75 * hash(i * 3.3 + 1));
        if (clearMask(x, y, Z) <= 0.2) continue;
        ctx.moveTo(x, y); ctx.lineTo(x - dir * H * (0.3 + 0.4 * r0), y - H * 0.04);
      }
      ctx.stroke();
    }
    act.push('near_debris');
  }
  if (style === 'sad' && !B('crack')) {
    const seed = 3, c = seed % 4, x0 = c % 2 ? w : 0, y0 = c < 2 ? 0 : h, dx = c % 2 ? -1 : 1, dy = c < 2 ? 1 : -1;
    ctx.globalAlpha = 0.22 * a; ctx.strokeStyle = 'rgb(120,126,138)'; ctx.lineWidth = 0.75; ctx.lineJoin = 'miter';
    ctx.beginPath(); let x = x0, y = y0; ctx.moveTo(x, y);
    const len = Math.min(w, h) * 0.24;
    for (let j = 1; j <= 7; j++) { x = x0 + dx * len * (j / 7) * (0.9 + 0.2 * hash(j)); y = y0 + dy * len * 0.55 * (j / 7) + (hash(j * 3) - 0.5) * len * 0.06; ctx.lineTo(x, y); }
    ctx.stroke();
    act.push('hairline_crack');
  }
  if (style === 'horror' || style === 'ember_wasteland') {
    const seed = st.bSeed || 1, band = Math.min(w, h) * 0.2;
    ctx.globalAlpha = 0.72 * a; ctx.strokeStyle = style === 'ember_wasteland' ? 'rgb(255,140,70)' : 'rgb(230,234,242)'; ctx.lineWidth = 1;
    const starts = [[0, 0], [w, 0], [0, h], [w, h]];
    ctx.beginPath();
    for (let c = 0; c < 4; c++) {
      const [x0, y0] = starts[c];
      for (let k = 0; k < 5; k++) {
        let x = x0, y = y0; const ang = Math.atan2(h / 2 - y0, w / 2 - x0) + (hash(seed + c * 7 + k) - 0.5) * 1.3;
        ctx.moveTo(x, y);
        const len = band * (0.8 + 1.4 * hash(seed * 3 + k + c));
        for (let j = 1; j <= 5; j++) { x = x0 + Math.cos(ang + (hash(seed + j + k * 5) - 0.5) * 0.5) * len * j / 5; y = y0 + Math.sin(ang + (hash(seed + j * 2 + k) - 0.5) * 0.5) * len * j / 5; ctx.lineTo(x, y); }
      }
    }
    ctx.stroke();
    if (style === 'horror') {
      ctx.globalAlpha = 0.9 * a; ctx.fillStyle = 'rgb(2,2,4)';
      for (const sd of [0, 1]) { ctx.beginPath(); const xe = sd ? w : 0, d2 = sd ? -1 : 1; ctx.moveTo(xe, 0); for (let i = 0; i <= 20; i++) { const y = (i / 20) * h; const tear = w * (0.035 + 0.05 * hash(seed + i * 3.1 + sd) * (i % 4 === 0 ? 1.8 : 1)); ctx.lineTo(xe + d2 * tear, y); } ctx.lineTo(xe, h); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 0.35 * a; ctx.strokeStyle = 'rgb(220,220,226)'; ctx.beginPath();
      for (let i = 0; i < 9; i++) { const x = hash(seed + i * 4.4) < 0.5 ? w * (0.02 + 0.1 * hash(i)) : w * (0.88 + 0.1 * hash(i + 1)); const y = h * hash(seed * 2 + i); ctx.moveTo(x, y); ctx.lineTo(x + (hash(i + 5) - 0.5) * 6, y + h * (0.05 + 0.1 * hash(i + 9))); }
      ctx.stroke();
    }
    act.push('frame_damage');
  }
  ctx.restore();
  return act;
}

/** horror loud: the lantern's light stutters into a HARD shadow of the figure thrown long across the ground. */
export function drawHardShadow(ctx, o) {
  const { L, lantern, a, stutter } = o; if (!lantern || a <= 0.02) return;
  const { H, fx, gy } = L; const d = fx - lantern[0] >= 0 ? 1 : -1;
  ctx.save(); ctx.globalAlpha = 0.75 * a * (stutter ? 1 : 0.85); ctx.fillStyle = 'rgb(0,0,0)';
  ctx.beginPath(); ctx.moveTo(fx - H * 0.08, gy); ctx.lineTo(fx + H * 0.08, gy); ctx.lineTo(fx + d * H * 1.9 + H * 0.22, gy + H * 0.14); ctx.lineTo(fx + d * H * 1.9 - H * 0.05, gy + H * 0.2); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ---------------------------------------------------------------- heavy front (fixmood2 + perf) ---------------------------------------------------------------- */
/**
 * LOUD Heavy chaos drawn in front of the beast, behind the figure:
 * wide glowing ground fissures, organic fire tongues, burning debris, dense batched embers, peak jolt.
 * Zero shadowBlur; cached gradients & glow sprites; pooled/batched particles.
 */
export function drawHeavyFront(ctx, o) {
  const { L, lv, raw, t, st, CH, q = 1, reduceMotion } = o;
  const B = typeof o.blocked === 'function' ? o.blocked : () => false;
  const SG = o.stormGain ?? 1;
  const a = loudAmount(CH) * SG;
  if (a <= 0.02) {
    // Heavy quiet: light ember floor under the figure + beast (no fissures / violent fire / shake)
    const { w, H, gy } = L;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const gyQ = Math.round(gy), hQ = Math.round(H);
    if (!st._qEmberG || st._qEmberGy !== gyQ || st._qEmberH !== hQ) {
      st._qEmberGy = gyQ; st._qEmberH = hQ;
      const g = ctx.createLinearGradient(0, gy - H * 0.18, 0, gy + H * 0.45);
      g.addColorStop(0, 'rgba(255,95,28,0)'); g.addColorStop(0.55, 'rgba(255,95,28,0.45)'); g.addColorStop(1, 'rgba(120,24,8,0)');
      st._qEmberG = g;
    }
    ctx.globalAlpha = 0.24 + 0.14 * lv.b;
    ctx.fillStyle = st._qEmberG;
    ctx.fillRect(0, gy - H * 0.18, w, H * 0.63);
    ctx.restore();
    return { act: ['ember_floor'], shake: 0 };
  }
  const { w, h, H, fx, gy } = L, Z = zoneOf(L);
  const act = [];
  if ((raw.k > 0.72 || raw.x > 0.75) && t - (st.fissAt ?? -9) > 0.9) { st.fissAt = t; st.fissSeed = Math.floor(t * 13) % 97; }
  const fa = t - (st.fissAt ?? -9);
  const peak = fa < 0.12 ? sm(fa / 0.12) : fa < 1.6 ? 1 - sm((fa - 0.12) / 1.48) : 0;
  const open = a * (0.4 + 0.6 * peak);
  ctx.save();

  // 1. Wide glowing fissures across the ground (layered fills replace expensive shadowBlur)
  if (!B('crack')) {
    const sd0 = st.fissSeed ?? 5, gap = H * 0.22;
    const band = (xa, xb, y0, wid, seed) => {
      const N = 8, top = [], bot = [];
      for (let k = 0; k <= N; k++) {
        const u = k / N, x = xa + (xb - xa) * u, taper = Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.02)) ** 0.6;
        const y = y0 + (hash(seed + k * 1.7) - 0.5) * H * 0.07;
        const ww = wid * (0.35 + 0.65 * taper) * (0.7 + 0.6 * hash(seed + k * 4.1));
        top.push([x, y - ww * 0.5]); bot.push([x, y + ww * 0.5]);
      }
      ctx.beginPath(); top.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath();
    };
    const wid = H * (0.025 + 0.085 * open);
    const segs = [[-w * 0.02, fx - gap, gy + H * 0.04, 1], [fx + gap, w * 1.02, gy + H * 0.05, 2]];
    const br = [[fx - gap * 0.8, gy + H * 0.08, -w * 0.05, h * 1.02, 3], [fx + gap * 0.9, gy + H * 0.09, w * 1.05, h * 1.0, 4]];
    ctx.globalCompositeOperation = 'screen';
    const passes = [
      [3.0, rgba('255,70,16', 0.22 * open)],
      [1.75, rgba('255,95,24', 0.36 * open)],
      [0.95, rgba('255,134,38', 0.78 + 0.18 * peak)],
      [0.32, rgba('255,228,150', 0.62 + 0.35 * peak)]
    ];
    for (const [mul, fill] of passes) {
      ctx.fillStyle = fill;
      for (const [xa, xb, y0, sd] of segs) { band(xa, xb, y0, wid * mul, sd0 + sd * 11); ctx.fill(); }
      for (const [x0, y0, x1, y1, sd] of br) {
        const N = 6; ctx.beginPath(); const pts = [];
        for (let k = 0; k <= N; k++) { const u = k / N; pts.push([x0 + (x1 - x0) * u + (hash(sd0 + sd * 7 + k) - 0.5) * H * 0.16, y0 + (y1 - y0) * u]); }
        const ww = (u) => wid * mul * (0.3 + 1.1 * u);
        pts.forEach(([x, y], k) => k ? ctx.lineTo(x - ww(k / N) * 0.5, y) : ctx.moveTo(x - ww(0) * 0.5, y));
        for (let k = N; k >= 0; k--) ctx.lineTo(pts[k][0] + ww(k / N) * 0.5, pts[k][1]);
        ctx.closePath(); ctx.fill();
      }
    }
    const gyQ = Math.round(gy), hQ = Math.round(H);
    if (!st._fissG || st._fissGy !== gyQ || st._fissH !== hQ) {
      st._fissGy = gyQ; st._fissH = hQ;
      const gg = ctx.createLinearGradient(0, gy + H * 0.3, 0, gy - H * 0.6);
      gg.addColorStop(0, 'rgba(255,90,24,1)'); gg.addColorStop(1, 'rgba(255,90,24,0)');
      st._fissG = gg;
    }
    ctx.globalAlpha = 0.32 * open; ctx.fillStyle = st._fissG; ctx.fillRect(0, gy - H * 0.6, w, H * 0.9);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    act.push('fissures');
  }

  // 2. Fire licking along the ground line (ONE cached gradient shared across all tongues)
  if (!B('fire')) {
    const gyQ = Math.round(gy), hQ = Math.round(H);
    if (!st._lickG || st._lickGy !== gyQ || st._lickH !== hQ) {
      st._lickGy = gyQ; st._lickH = hQ;
      const fg = ctx.createLinearGradient(0, gy + H * 0.1, 0, gy - H * 0.58);
      fg.addColorStop(0, 'rgba(255,214,120,0.92)'); fg.addColorStop(0.28, 'rgba(255,120,30,0.75)');
      fg.addColorStop(0.72, 'rgba(200,40,10,0.36)'); fg.addColorStop(1, 'rgba(120,20,6,0)');
      st._lickG = fg;
      const bg = ctx.createLinearGradient(0, gy + H * 0.14, 0, gy - H * 0.22);
      bg.addColorStop(0, 'rgba(255,150,50,1)'); bg.addColorStop(1, 'rgba(255,90,20,0)');
      st._lickBaseG = bg;
    }
    const nF = Math.min(18, Math.floor((10 + 9 * a) * q));
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = st._lickG;
    ctx.globalAlpha = a;
    ctx.beginPath();
    for (let i = 0; i < nF; i++) {
      const r0 = hash(i * 3.3 + 0.9), x = (i + 0.5) / nF * w + (r0 - 0.5) * (w / nF);
      if (Math.abs(x - fx) < H * 0.26) continue;
      const flick = 0.55 + 0.45 * Math.sin(t * (7 + 5 * r0) + i * 2.3) * Math.sin(t * (3.1 + r0) + i);
      const fh = H * (0.12 + 0.48 * a * (0.25 + 1.05 * hash(i * 7.9 + 3))) * (0.65 + 0.35 * flick) * (1 + 0.4 * lv.b + 0.45 * peak);
      const fw = H * (0.05 + 0.08 * hash(i + 2)), base = gy + H * (0.06 + 0.05 * hash(i + 8)), lean = Math.sin(t * 1.7 + i) * fw * 0.6;
      const wob = (k) => Math.sin(t * (6 + 3 * r0) + i * 1.9 + k * 2.4) * fw * 0.35;
      const tipX = x + lean * 1.4 + Math.sin(t * 4.3 + i) * fw * 0.5;
      ctx.moveTo(x - fw * 1.1, base);
      ctx.bezierCurveTo(x - fw * 1.5 + wob(0), base - fh * 0.3, x - fw * 0.2 + wob(1) + lean, base - fh * 0.62, tipX, base - fh);
      ctx.bezierCurveTo(x + fw * 0.35 + wob(2) + lean, base - fh * 0.55, x + fw * 1.4 + wob(3), base - fh * 0.32, x + fw * 1.1, base);
      ctx.closePath();
    }
    ctx.fill();
    ctx.globalAlpha = 0.55 * a; ctx.fillStyle = st._lickBaseG; ctx.fillRect(0, gy - H * 0.22, w, H * 0.36);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    act.push('fire_licks');
  }

  // 3. Burning debris falling through the flanks (cached glow sprite + tapered polygon tail, zero per-debris gradients)
  if (!B('debris')) {
    const dSpr = sprDebrisGlow();
    const nD = Math.min(10, Math.floor((4 + 6 * a) * q));
    for (let i = 0; i < nD; i++) {
      const r0 = hash(i * 6.1 + 2.2), life = (t * (0.32 + 0.3 * r0) + r0) % 1;
      const x = (i % 2 ? 0.66 + 0.36 * r0 : -0.02 + 0.36 * r0) * w + Math.sin(life * 3 + i) * w * 0.02, y = -h * 0.05 + life * (gy + H * 0.2);
      if (clearMask(x, y, Z) <= 0.2) continue;
      if (o.eye && Math.hypot(x - o.eye[0], y - o.eye[1]) < Math.max(w * 0.2, H * 0.9)) continue;
      const sz = H * (0.025 + 0.038 * hash(i + 5)), tl = sz * (4 + 3 * r0), dx = Math.sin(i) * sz;
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.55 * a; ctx.fillStyle = 'rgb(255,115,35)';
      ctx.beginPath(); ctx.moveTo(x - sz * 0.5, y); ctx.lineTo(x + sz * 0.5, y); ctx.lineTo(x + dx, y - tl); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.85 * a;
      ctx.drawImage(dSpr, x - sz * 2.4, y - sz * 2.4, sz * 4.8, sz * 4.8);
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgb(20,8,6)'; ctx.globalAlpha = 0.95;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 * (r0 - 0.5) + i);
      ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.2); ctx.lineTo(-sz * 0.2, -sz * 0.7); ctx.lineTo(sz * 0.8, -sz * 0.3); ctx.lineTo(sz * 0.6, sz * 0.5); ctx.lineTo(-sz * 0.5, sz * 0.6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    act.push('burning_debris');
  }

  // 4. Pooled & batched rising embers (2 fill passes total instead of 200 individual arc calls)
  if (!B('embers')) {
    const pool = st._emberPool || (st._emberPool = Array.from({ length: 84 }, (_, i) => ({
      r0: hash(i * 1.91 + 0.37), x0: hash(i * 2.7), ph: hash(i * 4.3), sz: 1.5 + 2.8 * hash(i + 9), gold: (i & 3) === 0
    })));
    const nE = Math.min(pool.length, Math.floor((36 + 48 * a) * q * (1 + 0.25 * peak)));
    ctx.globalCompositeOperation = 'screen';
    for (let gold = 0; gold < 2; gold++) {
      ctx.fillStyle = gold ? 'rgb(255,220,140)' : 'rgb(255,128,40)';
      ctx.globalAlpha = (gold ? 0.82 : 0.72) * a;
      for (let i = 0; i < nE; i++) {
        const p = pool[i];
        if ((p.gold ? 1 : 0) !== gold) continue;
        const life = (t * (0.12 + 0.2 * p.r0) + p.ph) % 1;
        const x = (p.x0 * 1.1 - 0.05) * w + Math.sin(t * (1 + p.r0) + i) * w * 0.025 + life * w * 0.04 * (p.r0 - 0.5);
        const y = gy + H * 0.15 - life * (gy + H * 0.2);
        if (clearMask(x, y, Z) < 0.35 && p.r0 > 0.25) continue;
        const s2 = p.sz * (1 - life * 0.5);
        ctx.fillRect(x - s2 * 0.5, y - s2 * 0.5, s2, s2);
      }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    act.push('embers_dense');
  }
  ctx.restore();
  const shake = reduceMotion ? 0 : H * 0.035 * a * (fa < 0.35 ? (1 - fa / 0.35) : 0);
  return { act, shake };
}
