/**
 * art3: music-video performers over painted plates.
 * Anatomical silhouette (egg head, neck, shoulders, torso taper, hips, tapered limbs, hands, shoes)
 * built on a small skeleton with two-bone IK so arm/leg motion is smooth.
 * Each audio role gets its own look:
 *   vocalist  (vocalish/lead vocal/performer) — long coat, tousled hair, holds a mic to the mouth
 *   guitarist (lead/harsh)                    — short jacket, long rocker hair, electric guitar
 *   bassist   (bass)                          — hoodie with hood up, long-neck bass
 *   dancer    (pads)                          — flared dress, long swinging hair, flowing arms
 *   rhythm    (kick/snare/hats)               — bomber jacket + cap, pumping arms, stepping feet
 * Rendered as: blurred rim (world palette, light side) + faint back-rim + dark body with
 * subtle interior shading and outfit detail lines. Never a glow blob, never pure flat black.
 */
const TAU = Math.PI * 2;
const pool = new Map(); // idx -> { m, r, b, e, hv, last }
function mk() {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(8, 8);
  const c = document.createElement('canvas'); c.width = 8; c.height = 8; return c;
}
function slot(i) {
  let s = pool.get(i);
  if (!s) { s = { m: mk(), r: mk(), b: mk(), e: 0, hv: 0, last: null }; pool.set(i, s); }
  return s;
}
export function roleLook(roleId, idx = 0) {
  const r = String(roleId || '').toLowerCase();
  if (/vocal|singer|performer|^lead_vocal/.test(r)) return 'vocalist';
  if (/harsh|lead|guitar/.test(r)) return 'guitarist';
  if (/bass/.test(r)) return 'bassist';
  if (/pad|keys|string|choir/.test(r)) return 'dancer';
  if (/kick|snare|hat|drum|perc/.test(r)) return 'rhythm';
  return ['vocalist', 'guitarist', 'dancer', 'bassist', 'rhythm'][idx % 5];
}
const lerp = (a, b, k) => a + (b - a) * k;
function rgba(col, a) {
  const m = String(col || '').match(/rgba?\(([^)]+)\)/);
  if (!m) return `rgba(255,200,150,${a})`;
  const p = m[1].split(',').map(s => s.trim());
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
}
/** Two-bone IK: shoulder/hip S → target T, elbow/knee chosen on the `out` side. */
function ik(S, T, L1, L2, outX) {
  let dx = T[0] - S[0], dy = T[1] - S[1];
  let d = Math.hypot(dx, dy) || 1e-3;
  const dMax = (L1 + L2) * 0.995, dMin = Math.abs(L1 - L2) + 0.5;
  const dc = Math.max(dMin, Math.min(dMax, d));
  const ux = dx / d, uy = dy / d;
  const Tc = [S[0] + ux * dc, S[1] + uy * dc];
  const a = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + dc * dc - L2 * L2) / (2 * L1 * dc))));
  const th = Math.atan2(uy, ux);
  const e1 = [S[0] + Math.cos(th + a) * L1, S[1] + Math.sin(th + a) * L1];
  const e2 = [S[0] + Math.cos(th - a) * L1, S[1] + Math.sin(th - a) * L1];
  const E = (e1[0] - S[0]) * outX >= (e2[0] - S[0]) * outX ? e1 : e2;
  return [E, Tc];
}

/** Build the pose in height units (X right, Y up from the ground; full height ≈ 100). */
/** art6: side-on walk cycle (the dreamer walking through the world as the camera tracks). */
function walkPose(t, ph, f, e) {
  const sw = Math.sin(ph), cw = Math.cos(ph);
  const hipX = 0, hipY = 49.5 - 1.1 * Math.abs(cw);
  const lean = 1.2 * f;
  const shC = [hipX + lean, hipY + 31.5];
  const shL = [shC[0] - 2.6, shC[1] + 0.3], shR = [shC[0] + 2.6, shC[1] - 0.3];
  const head = [shC[0] + 1.3 * f, shC[1] + 11.8];
  const hipL = [hipX - 1.4, hipY], hipR = [hipX + 1.4, hipY];
  const ankL = [f * 8.5 * sw, 4 + Math.max(0, cw) * 3.2], ankR = [-f * 8.5 * sw, 4 + Math.max(0, -cw) * 3.2];
  const [kneeL] = ik(hipL, ankL, 24.5, 23, f);
  const [kneeR] = ik(hipR, ankR, 24.5, 23, f);
  const tL = [shC[0] - f * (6 + 2 * e) * sw, 60 + 1.5 * Math.abs(sw)], tR = [shC[0] + f * (6 + 2 * e) * sw, 60 + 1.5 * Math.abs(sw)];
  const [elL, haL] = ik(shL, tL, 16.5, 15, -f);
  const [elR, haR] = ik(shR, tR, 16.5, 15, -f);
  return { ph, sw: sw * 0.4, hipX, hipY, shC, shL, shR, head, hipL, hipR, kneeL, kneeR, ankL, ankR, elL, elR, haL, haR, prop: null, shW: 2.6, lean, walk: true, facing: f };
}

function pose(look, t, k, e, hv, side, beatPh = null, move = null, facing = 1, rx = null) {
  const w = lerp(1.2, 2.5, hv);
  const ph = beatPh != null ? beatPh : t * w + k * 1.7;
  if (move === 'walk') return walkPose(t, ph, facing >= 0 ? 1 : -1, e);
  const amp = lerp(0.35 + 0.3 * e, 0.65 + 0.35 * e, hv) * (rx && Number.isFinite(rx.swayMul) ? rx.swayMul : 1);
  const sw = Math.sin(ph) * amp;
  const bob = (0.5 - 0.5 * Math.cos(2 * ph)) * lerp(0.8, 1.15, hv) * amp;
  const hipX = sw * 2.2;
  let hipY = 50 - bob;
  const lean = -sw * 1.3;
  const tilt = sw * 1.4;
  const dancer = look === 'dancer';
  const shW = dancer ? 9.6 : look === 'rhythm' ? 12 : 11;
  const shY = hipY + 31.5;
  const shC = [hipX + lean, shY];
  const shL = [shC[0] - shW, shY - tilt], shR = [shC[0] + shW, shY + tilt];
  const head = [shC[0] + lean * 0.4, shY + 11.8];
  // legs
  const stance = look === 'rhythm' ? lerp(5.5, 6.8, hv) : dancer ? 4 : lerp(5, 6.4, hv);
  let liftL = 0, liftR = 0;
  if (look === 'rhythm' || hv > 0.5) { liftL = Math.max(0, Math.sin(ph)) * lerp(2, 3.2, hv); liftR = Math.max(0, Math.sin(ph + Math.PI)) * lerp(2, 3.2, hv); }
  if (dancer) { liftR = Math.max(0, Math.sin(ph * 0.5)) * 3; }
  const hipL = [hipX - (dancer ? 4.6 : 4.2), hipY], hipR = [hipX + (dancer ? 4.6 : 4.2), hipY];
  const ankL = [-stance + (dancer ? 1.5 : 0), 4 + liftL], ankR = [stance + (dancer ? 1.5 * Math.sin(ph * 0.5) : 0), 4 + liftR];
  let [kneeL] = ik(hipL, ankL, 24.5, 23, -1);
  let [kneeR] = ik(hipR, ankR, 24.5, 23, 1);
  // front view: soften the sideways knee splay of 2D IK (reads as a squat) — keep 45% of it
  const kx = (k0, h0, a0) => [lerp((h0[0] + a0[0]) / 2, k0[0], 0.45), k0[1]];
  kneeL = kx(kneeL, hipL, ankL); kneeR = kx(kneeR, hipR, ankR);
  // arms: hand targets per role
  let tL, tR, prop = null;
  const hard = hv;
  if (look === 'vocalist') {
    const micSide = side; // mic hand on the light side
    const mic = [head[0] + 4.2 * micSide, head[1] - 10.5];
    const free = [-micSide * lerp(17 + 3 * Math.sin(ph * 0.7), 21, hard), lerp(48 + 7 * Math.sin(ph * 0.5 + 1), 104 + 6 * Math.sin(ph), Math.min(1, hard * (0.5 + e)))];
    free[0] += shC[0];
    if (micSide > 0) { tR = mic; tL = free; } else { tL = mic; tR = free; }
    prop = { kind: 'mic', at: micSide > 0 ? 'R' : 'L', mouth: [head[0] + 2.4 * micSide, head[1] - 3.6] };
  } else if (look === 'wanderer') { // art6: no props — hands relaxed by the sides, a little sway
    tL = [shC[0] - 12.5 + 1.2 * Math.sin(ph), 54 + 2 * Math.sin(ph + 0.5)];
    tR = [shC[0] + 12.5 + 1.2 * Math.sin(ph), 54 + 2 * Math.sin(ph + 2.1)];
  } else if (look === 'guitarist' || look === 'bassist') {
    const bass = look === 'bassist';
    const G = [hipX + 2.5, bass ? 52 : 55];
    const N = [G[0] - (bass ? 36 : 30), G[1] + (bass ? 15 : 18) + Math.sin(ph) * 1.5];
    const strum = Math.sin(t * lerp(5, 11, hard) + k) * lerp(1.2, 2.6, hard);
    tL = [lerp(G[0], N[0], bass ? 0.6 : 0.66), lerp(G[1], N[1], bass ? 0.6 : 0.66) - 1.2];
    tR = [G[0] + 2.5, G[1] + 1 + strum];
    prop = { kind: bass ? 'bass' : 'guitar', G, N };
  } else if (dancer) {
    const up = lerp(0, 22, hard) + 6 * e;
    tL = [shC[0] - 19 + 5 * Math.cos(ph), 70 + up + 13 * Math.sin(ph)];
    tR = [shC[0] + 19 + 5 * Math.cos(ph + 2.1), 70 + up + 13 * Math.sin(ph + 2.4)];
  } else { // rhythm
    const p1 = Math.max(0, Math.sin(2 * ph)), p2 = Math.max(0, Math.sin(2 * ph + Math.PI));
    tL = [shC[0] - 9 - 3 * p1, 68 + 10 * p1 + hard * 26 * p1];
    tR = [shC[0] + 9 + 3 * p2, 68 + 10 * p2 + hard * 8 * p2];
  }
  // art5: named dance moves (picked per section / energy in the renderer, blended over 0.7s)
  const beat = Math.max(0, Math.cos(ph * 2)); // 1 on each beat-ish, 0 between
  const bob2 = (0.5 - 0.5 * Math.cos(ph * 2));
  const moveTorso = (dx, dy, dh) => { for (const q of [shC, shL, shR]) { q[0] += dx; q[1] += dy; } head[0] += dx + (dh || 0); head[1] += dy - Math.abs(dh || 0) * 0.4; };
  const crouch = (dy) => { hipY -= dy; hipL[1] -= dy; hipR[1] -= dy; for (const q of [shC, shL, shR, head]) q[1] -= dy; };
  switch (move) {
    case 'reach': { // free hand stretches out toward the camera side, slow
      const fs = look === 'vocalist' && prop ? (prop.at === 'R' ? 'L' : 'R') : 'L';
      const tg = [shC[0] + (fs === 'L' ? -1 : 1) * (21 + 2 * Math.sin(ph * 0.5)), 84 + 6 * Math.sin(ph * 0.5)];
      if (fs === 'L') tL = tg; else tR = tg; break; }
    case 'fist': { // free fist pumps up on the beat
      const fs = prop && prop.at === 'R' ? 'L' : 'R';
      const tg = [shC[0] + (fs === 'L' ? -1 : 1) * 9, 92 + 16 * beat];
      if (fs === 'L') tL = tg; else tR = tg; break; }
    case 'lean': moveTorso(-side * 2.2, -0.5, -side * 1.2); { const fs = prop && prop.at === 'R' ? 'L' : 'R'; const tg = [shC[0] + (fs === 'L' ? -1 : 1) * 24, 62 + 4 * Math.sin(ph)]; if (fs === 'L') tL = tg; else tR = tg; } break;
    case 'headbang': moveTorso(0, -2.6 * beat, 1.6 * beat); break;
    case 'rock': moveTorso(-1.6, 0.4, -1.2); if (prop && prop.N) { prop.N = [prop.N[0], prop.N[1] + 7]; tL = [lerp(prop.G[0], prop.N[0], 0.62), lerp(prop.G[1], prop.N[1], 0.62) - 1]; } break;
    case 'step': { const s2 = Math.sin(ph); ankL[0] += -3 * Math.max(0, s2); ankR[0] += 3 * Math.max(0, -s2); if (look === 'rhythm') { tL = [shC[0] - 13 - 4 * s2, 58 + 4 * Math.abs(s2)]; tR = [shC[0] + 13 - 4 * s2, 58 + 4 * Math.abs(s2)]; } break; }
    case 'clap': { const c = beat; tL = [shC[0] - lerp(13, 2.2, c), 74 + 6 * c]; tR = [shC[0] + lerp(13, 2.2, c), 74 + 6 * c]; break; }
    case 'point': tR = [shC[0] + 12 + 3 * beat, 104 + 6 * beat]; tL = [shC[0] - 12, 62 + 6 * bob2]; break;
    case 'armsup': tL = [shC[0] - 9 + 5 * Math.sin(ph), 104 + 4 * Math.cos(ph)]; tR = [shC[0] + 9 + 5 * Math.sin(ph), 104 + 4 * Math.cos(ph + 1)]; break;
    case 'hips': { const hs2 = Math.sin(ph) * 3.4; hipL[0] += hs2; hipR[0] += hs2; tL = [hipL[0] - 7, hipL[1] + 6]; tR = [hipR[0] + 7, hipR[1] + 6]; break; }
    case 'wave': { const wv = Math.sin(ph); tL = [shC[0] - 21, 76 + 14 * wv]; tR = [shC[0] + 21, 76 - 14 * wv]; break; }
    case 'groove': moveTorso(0, -1.2 * bob2, 0); break;
    case 'idle': break; // standing, looking into the world
    case 'gaze': tR = [head[0] + 4, head[1] + 1]; break; // shading the eyes, looking out over the vista
    case 'open': tL = [shC[0] - 22, 70 + 3 * Math.sin(ph * 0.5)]; tR = [shC[0] + 22, 70 + 3 * Math.sin(ph * 0.5 + 1)]; break; // arms opening to the sky
    // ---- style1 reactive vocabulary (stand-and-react; no traversal) ----
    case 'stand': tL = [shC[0] - 12.2, 51]; tR = [shC[0] + 12.2, 51]; break; // polish6: arms hang relaxed (never hands-on-hips)
    // polish6 cozy: both hands cup a mug at the chest; every ~9s a slow sip lifts it toward the mouth
    case 'mug': case 'mug_look': {
      const sipK = Math.max(0, Math.sin((t * 0.7 + k) % (Math.PI * 2) * 0.5) ** 24); // brief, rare
      const my = 63 + 18 * sipK, mx = shC[0] + side * (1.5 - 1.2 * sipK);
      tL = [mx - 3.4, my - 0.5]; tR = [mx + 3.4, my - 0.5]; if (sipK > 0.2) { head[1] -= 0.8 * sipK; }
      break; }
    // polish6 heavy: roar / brace up at the beast — wide stance, knees bent, chest & head tilted up, arms out with clenched fists
    case 'roar': crouch(3.6 - 0.8 * beat); ankL[0] -= 4.8; ankR[0] += 4.8; tL = [shC[0] - 22, 92 + 3 * beat]; tR = [shC[0] + 22, 92 + 3 * beat]; head[1] += 2.2; break;
    case 'brace_up': crouch(5.2); ankL[0] -= 5.4; ankR[0] += 5.4; tL = [shC[0] - 20, 87 + 2 * beat]; tR = [shC[0] + 20, 87 + 2 * beat]; head[1] += 1.8; break;
    case 'pockets': tL = [hipL[0] - 3.2, hipY + 4]; tR = [hipR[0] + 3.2, hipY + 4]; break; // hands in coat pockets
    case 'look_up_soft': tL = [hipL[0] - 3.2, hipY + 4]; tR = [hipR[0] + 3.2, hipY + 4]; break; // head lifts (see gaze), hands stay
    case 'lantern': tL = [shC[0] - 12, 55]; tR = [shC[0] + 14 * side, 62]; break; // lantern held low in front, light side
    case 'turn_lantern': moveTorso(side * 1.2, 0, side * 1.4); tL = [shC[0] - 12, 56]; tR = [shC[0] + 18 * side, 70]; break;
    case 'lift_lantern': tL = [shC[0] - 11, 58]; tR = [shC[0] + 16 * side, 92]; break; // lifts the lantern toward the sound
    case 'freeze': moveTorso(0, -1.6, 0); tL = [shC[0] - 7, 66]; tR = [shC[0] + 9 * side, 64]; ankL[0] -= 1.2; ankR[0] += 1.2; break;
    case 'step_back': moveTorso(-side * 2.6, -0.6, -side * 1.6); ankL[0] -= side * 3.5; tL = [shC[0] - 15, 64]; tR = [shC[0] + 15, 66]; break;
    case 'brace': moveTorso(0, -2.4, 0); ankL[0] -= 2.5; ankR[0] += 2.5; tL = [shC[0] - 10, 74]; tR = [shC[0] + 10, 76]; break; // guard up, knees soft
    case 'turn': moveTorso(side * 1.6, 0, side * 1.8); tL = [shC[0] - 12, 56]; tR = [shC[0] + 12, 56]; break;
    case 'look_up': tL = [shC[0] - 12, 55]; tR = [shC[0] + 12, 55]; break;
    case 'reach_light': tL = [shC[0] - 12, 56]; tR = [shC[0] + 14 * side, 108]; break; // one arm into the light
    case 'raise_fists': crouch(2.4); tL = [shC[0] - 19, 104 + 2 * beat]; tR = [shC[0] + 19, 104 + 2 * beat]; ankL[0] -= 4.2; ankR[0] += 4.2; head[1] += 2.0; break; // polish6: wide stance, knees bent, fists apart in a V roaring up
    case 'defiant': ankL[0] -= 2.8; ankR[0] += 2.8; tL = [shC[0] - 15, 56]; tR = [shC[0] + 15, 56]; moveTorso(0, -2.4 * beat * (hv > 0.3 ? 1 : 0.4), 1.4 * beat); break; // wide stance, headbang on kick
    case 'bounce': moveTorso(0, -2.2 * bob2, 0); tL = [shC[0] - 16, 70 + 8 * beat]; tR = [shC[0] + 16, 70 + 8 * beat]; break;
    case 'point_up': tR = [shC[0] + 8, 110]; tL = [shC[0] - 14, 64 + 4 * bob2]; break;
    default: break; // sway / strum / flow / pump = base pose
  }
  // style1: gaze (head turns/lifts toward the target) + hunch (head low)
  if (rx) {
    const gx = Math.max(-1, Math.min(1, Number(rx.gx) || 0)), gy = Math.max(-1, Math.min(1, Number(rx.gy) || 0)), hu = Math.max(0, Math.min(1, Number(rx.hunch) || 0));
    head[0] += gx * 2.4; head[1] += gy * 1.6 - hu * 2.2 * (1 - Math.max(0, gy));
    shC[0] += gx * 0.6; shL[1] -= hu * 0.8; shR[1] -= hu * 0.8;
  }
  if (move === 'step' || move === 'hips' || move === 'freeze' || move === 'step_back' || move === 'brace' || move === 'raise_fists' || move === 'defiant' || move === 'roar' || move === 'brace_up') {
    [kneeL] = ik(hipL, ankL, 24.5, 23, -1); [kneeR] = ik(hipR, ankR, 24.5, 23, 1);
    kneeL = kx(kneeL, hipL, ankL); kneeR = kx(kneeR, hipR, ankR);
  }
  const [elL, haL] = ik(shL, tL, 16.5, 15, -1);
  const [elR, haR] = ik(shR, tR, 16.5, 15, 1);
  return { ph, sw, hipX, hipY, shC, shL, shR, head, hipL, hipR, kneeL, kneeR, ankL, ankR, elL, elR, haL, haR, prop, shW, lean };
}

export function drawPerformer(ctx, o) {
  const H = o.heightPx, x = o.x, by = o.baseY, t = o.t || 0, k = o.i || 0;
  const look = o.look || 'vocalist';
  const st = slot(k);
  const dt = st.last == null ? 0.016 : Math.max(0, Math.min(0.1, t - st.last)); st.last = t;
  st.e += (Math.min(1, o.energy || 0) - st.e) * Math.min(1, dt * 2.5);
  st.hv += ((o.hard ? 1 : 0) - st.hv) * Math.min(1, dt * 1.2);
  const side = o.lightSide || 1;
  let P = pose(look, t, k, st.e, st.hv, side, o.beatPh ?? null, o.move || null, o.facing ?? 1, o.react || null);
  if (o.moveFrom && o.moveFrom !== o.move && (o.moveMix ?? 1) < 1) {
    // ease between two moves (smoothstep), joint by joint
    const P0 = pose(look, t, k, st.e, st.hv, side, o.beatPh ?? null, o.moveFrom, o.facing ?? 1, o.react || null);
    const m = o.moveMix, sm = m * m * (3 - 2 * m);
    const mixV = (a, b) => (Array.isArray(a) && Array.isArray(b)) ? a.map((v, j) => (typeof v === 'number' && typeof b[j] === 'number') ? lerp(v, b[j], sm) : b[j]) : b;
    for (const key of Object.keys(P)) {
      const a = P0[key], b = P[key];
      if (typeof b === 'number' && typeof a === 'number') P[key] = lerp(a, b, sm);
      else if (Array.isArray(b)) P[key] = mixV(a, b);
    }
    if (P.prop && P0.prop) for (const key of ['G', 'N', 'mouth']) if (P.prop[key] && P0.prop[key]) P.prop[key] = mixV(P0.prop[key], P.prop[key]);
  }
  const u = H / 100;
  const S = Math.max(1, Math.min(3, (ctx.getTransform ? ctx.getTransform().a : 1)));
  const BW = 110, BT = 132, BB = 8; // local box in height units
  const cw = Math.ceil(BW * u * S), ch = Math.ceil((BT + BB) * u * S);
  for (const c of [st.m, st.r, st.b]) if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
  const L = (p) => [p[0] * u, -p[1] * u];
  const prep = (c) => { const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, cw, ch); g.setTransform(S, 0, 0, S, BW / 2 * u * S, BT * u * S); return g; };

  // ---------- silhouette mask (union of all parts) ----------
  const g = prep(st.m);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineJoin = 'round'; g.lineCap = 'round';
  const circ = (p, r) => { const q = L(p); g.beginPath(); g.arc(q[0], q[1], r * u, 0, TAU); g.fill(); };
  const caps = (a, b, ra, rb) => {
    const A = L(a), B = L(b); const dx = B[0] - A[0], dy = B[1] - A[1]; const d = Math.hypot(dx, dy) || 1e-3;
    const nx = -dy / d, ny = dx / d;
    g.beginPath(); g.moveTo(A[0] + nx * ra * u, A[1] + ny * ra * u); g.lineTo(B[0] + nx * rb * u, B[1] + ny * rb * u);
    g.lineTo(B[0] - nx * rb * u, B[1] - ny * rb * u); g.lineTo(A[0] - nx * ra * u, A[1] - ny * ra * u); g.closePath(); g.fill();
    circ(a, ra); circ(b, rb);
  };
  const poly = (pts, curve = true) => {
    const q = pts.map(L); g.beginPath(); g.moveTo(q[0][0], q[0][1]);
    if (!curve) { for (let i = 1; i < q.length; i++) g.lineTo(q[i][0], q[i][1]); }
    else { for (let i = 1; i < q.length; i++) { const m = [(q[i - 1][0] + q[i][0]) / 2, (q[i - 1][1] + q[i][1]) / 2]; g.quadraticCurveTo(q[i - 1][0], q[i - 1][1], m[0], m[1]); } g.lineTo(q[q.length - 1][0], q[q.length - 1][1]); }
    g.closePath(); g.fill();
  };
  const { shL, shR, shC, head, hipL, hipR, kneeL, kneeR, ankL, ankR, elL, elR, haL, haR, hipX, hipY, sw, ph } = P;
  const baggy = look === 'rhythm' || look === 'bassist';
  // legs (+ shoes)
  const thR = baggy ? 5.3 : 4.9, shinR = baggy ? 3.9 : 3.3, ank = baggy ? 2.9 : 2.1;
  caps(hipL, kneeL, thR, shinR); caps(kneeL, ankL, shinR, ank);
  caps(hipR, kneeR, thR, shinR); caps(kneeR, ankR, shinR, ank);
  const calf = (k0, a0) => circ([lerp(k0[0], a0[0], 0.3), lerp(k0[1], a0[1], 0.3)], shinR + 0.45);
  calf(kneeL, ankL); calf(kneeR, ankR);
  const shoe = (a, dir) => caps([a[0], a[1] - 1.5], [a[0] + dir * 5.2, a[1] - 3], 2.4, 1.9);
  if (P.walk) { shoe(ankL, P.facing); shoe(ankR, P.facing); } else { shoe(ankL, -1); shoe(ankR, 1); }
  // torso: shoulders → waist taper → hips
  const dancer = look === 'dancer';
  const waistW = dancer ? 5.8 : look === 'rhythm' ? 9 : 7.2, hipW = dancer ? 8.6 : 8.2;
  const wY = hipY + 12, wX = hipX + P.lean * 0.45;
  poly([[shL[0] - 1.2, shL[1] - 1.2], [shL[0] - 0.4, shL[1] - 8], [wX - waistW, wY], [hipX - hipW, hipY - 1], [hipX + hipW, hipY - 1], [wX + waistW, wY], [shR[0] + 0.4, shR[1] - 8], [shR[0] + 1.2, shR[1] - 1.2], [shC[0] + 3, shC[1] + 1.8], [shC[0] - 3, shC[1] + 1.8]], true);
  circ(shL, 4.3); circ(shR, 4.3); // deltoids
  circ([shC[0], shC[1] - 6.5], dancer ? 6.2 : 8.2); // rounded chest/ribcage
  // outfit silhouettes
  if (look === 'vocalist' || look === 'wanderer') { // long coat to the knee, hem swings behind the motion
    // two open-front panels: legs stay readable between them, hems lag the motion
    const wind = Number(o.react?.wind) || 0, cloak = o.react?.coat === 'cloak', torn = o.react?.coat === 'torn';
    const hem = cloak ? 18 : torn ? 26 : 31, fl = (cloak ? 15 : 11.5) + 1.2 * Math.abs(sw) + wind * 3, lag = -sw * 2.6 + wind * (cloak ? 7 : 3) * Math.sin(t * 1.7 + k);
    poly([[shL[0] - 1.5, shL[1] - 1], [hipX - hipW - 1.8, hipY], [hipX - fl + lag, hem], [hipX - 3.2 + lag, hem + 1.5], [hipX - 0.6, hipY + 5], [shC[0] - 2, shC[1] - 4]], false);
    poly([[shR[0] + 1.5, shR[1] - 1], [hipX + hipW + 1.8, hipY], [hipX + fl + lag, hem], [hipX + 3.2 + lag, hem + 1.5], [hipX + 0.6, hipY + 5], [shC[0] + 2, shC[1] - 4]], false);
    poly([[shC[0] - 3.5, shC[1] + 1], [shC[0] - 5.5, shC[1] + 6], [shC[0] - 1.5, shC[1] + 3]], false); // collar
    poly([[shC[0] + 3.5, shC[1] + 1], [shC[0] + 5.5, shC[1] + 6], [shC[0] + 1.5, shC[1] + 3]], false);
  } else if (look === 'guitarist') { // short boxy jacket
    poly([[shL[0] - 1.8, shL[1]], [hipX - 10, hipY - 2.5], [hipX + 10, hipY - 2.5], [shR[0] + 1.8, shR[1]]], false);
  } else if (look === 'bassist') { // hoodie body
    poly([[shL[0] - 1.6, shL[1]], [hipX - 10.5, hipY - 3], [hipX + 10.5, hipY - 3], [shR[0] + 1.6, shR[1]]], true);
  } else if (dancer) { // flared dress, hem waves
    const hem = 30, fl = 17 + 2 * Math.abs(sw);
    const wav = (i) => Math.sin(ph * 1.3 + i) * 1.4;
    poly([[wX - waistW, wY], [hipX - hipW - 1.5, hipY + 1], [hipX - fl - sw * 3, hem + wav(0)], [hipX - fl * 0.35 - sw * 3, hem - 1.5 + wav(1)], [hipX + fl * 0.35 - sw * 3, hem - 1.5 + wav(2)], [hipX + fl - sw * 3, hem + wav(3)], [hipX + hipW + 1.5, hipY + 1], [wX + waistW, wY]], true);
  } else { // rhythm: puffy bomber
    poly([[shL[0] - 2.4, shL[1]], [hipX - 11.5, hipY + 1.5], [hipX + 11.5, hipY + 1.5], [shR[0] + 2.4, shR[1]]], true);
  }
  // arms + hands
  const uaR = look === 'rhythm' ? 3.8 : look === 'dancer' ? 2.7 : 3.4, faR = look === 'dancer' ? 2.0 : 2.5;
  const arm = (sh, el, ha) => {
    caps(sh, el, uaR, faR + 0.35); caps(el, ha, faR + 0.35, faR * 0.8);
    circ([lerp(el[0], ha[0], 0.28), lerp(el[1], ha[1], 0.28)], faR + 0.45); // forearm muscle
    const dx = ha[0] - el[0], dy = ha[1] - el[1], d = Math.hypot(dx, dy) || 1;
    if (o.move === 'roar' || o.move === 'brace_up' || o.move === 'raise_fists') { circ(ha, 2.7); } else {
      const tip = [ha[0] + dx / d * 4.6, ha[1] + dy / d * 4.6];
      caps(ha, tip, 1.9, 1.6); // palm + fingers
      circ([ha[0] + (-dy / d) * 1.7 + dx / d * 1.2, ha[1] + (dx / d) * 1.7 + dy / d * 1.2], 0.95); // thumb
    }
    if (look === 'rhythm') caps([el[0] + dx * 0.78, el[1] + dy * 0.78], ha, 2.9, 2.7); // cuffs
  };
  arm(shL, elL, haL); arm(shR, elR, haR);
  // polish6 cozy: knit blanket draped over the shoulders, falling past the hips (hands + mug come out in front)
  const blanket = !!o.react?.blanket;
  // two draped panels wrapped round the shoulders and forearms; open at the front so the sweater, hands and mug show
  const wv = (i) => 1.1 * Math.sin(t * 0.8 + k + i);
  const panelL = blanket ? [[shC[0] - 2.5, shC[1] + 3.4], [shL[0] - 2.5, shL[1] + 3.2], [shL[0] - 6.8, shL[1] - 4], [shL[0] - 8.2, shL[1] - 16], [hipX - 15 - sw * 1.2, 40 + wv(0)], [hipX - 13.5 - sw * 1.2, 31 + wv(1)], [hipX - 6, 33.5 + wv(2)], [hipX - 3.2, 36], [shC[0] - 5.2, shC[1] - 15.5], [shC[0] - 3.4, shC[1] - 4]] : null;
  const panelR = blanket ? [[shC[0] + 2.5, shC[1] + 3.4], [shR[0] + 2.5, shR[1] + 3.2], [shR[0] + 6.8, shR[1] - 4], [shR[0] + 8.2, shR[1] - 16], [hipX + 15 - sw * 1.2, 36 + wv(3)], [hipX + 14 - sw * 1.2, 26.5 + wv(4)], [hipX + 6, 29 + wv(5)], [hipX + 3.2, 32], [shC[0] + 5.2, shC[1] - 15.5], [shC[0] + 3.4, shC[1] - 4]] : null;
  if (blanket) { poly(panelL, true); poly(panelR, true); }
  const mug = o.react?.mug ? [(haL[0] + haR[0]) / 2, (haL[1] + haR[1]) / 2 + 1.2] : null;
  if (mug) { const mq = L(mug); g.beginPath(); g.rect(mq[0] - 3.4 * u, mq[1] - 4 * u, 6.8 * u, 8 * u); g.fill(); }
  // neck + head (egg: wider crown, narrow jaw)
  caps([shC[0], shC[1] + 1], [head[0], head[1] - 5], 2.5, 2.2);
  const hq = L(head);
  g.beginPath();
  g.ellipse(hq[0], hq[1] - 0.6 * u, 5.1 * u, 5.7 * u, 0, Math.PI, TAU); // crown
  g.bezierCurveTo(hq[0] + 5.1 * u, hq[1] + 3.5 * u, hq[0] + 2.6 * u, hq[1] + 6.8 * u, hq[0], hq[1] + 7 * u);
  g.bezierCurveTo(hq[0] - 2.6 * u, hq[1] + 6.8 * u, hq[0] - 5.1 * u, hq[1] + 3.5 * u, hq[0] - 5.1 * u, hq[1] - 0.6 * u);
  g.fill();
  // hair / headwear
  const hs = -sw * 1.6;
  if (look === 'wanderer' && o.react?.hood) {
    // style1: hood up (horror searcher / sad figure) — rounded hood falling onto the shoulders
    poly([[head[0] - 6.6, head[1] - 2], [head[0] - 7.4, head[1] + 3.5], [head[0] - 4, head[1] + 9.2], [head[0] + 0.4, head[1] + 10],
      [head[0] + 4.6, head[1] + 9], [head[0] + 7.4, head[1] + 3.5], [head[0] + 6.6, head[1] - 2], [shC[0] + 7, shC[1] - 1], [shC[0] - 7, shC[1] - 1]], true);
  } else if (look === 'wanderer') {
    // seen from behind: hair covers the whole back of the head and falls to the nape
    poly([[head[0] - 5.8, head[1] - 4.5], [head[0] - 6.2, head[1] + 2.5], [head[0] - 3.6, head[1] + 7.4], [head[0] + 0.4, head[1] + 8.1],
      [head[0] + 4.4, head[1] + 7.2], [head[0] + 6.2, head[1] + 2.5], [head[0] + 5.8 + hs * 0.5, head[1] - 4.8], [head[0] + 2.5 + hs * 0.8, head[1] - 7.6], [head[0] - 2.5 + hs * 0.8, head[1] - 7.6]], true);
  } else if (look === 'vocalist') {
    // swept-back crop with volume on top and a fringe falling toward the light side
    poly([[head[0] - 5.6, head[1] - 1], [head[0] - 6.0, head[1] + 3.5], [head[0] - 3.5, head[1] + 7.2], [head[0] + 0.5, head[1] + 8.0],
      [head[0] + 4.6, head[1] + 6.6], [head[0] + 6.4 + hs * 0.6, head[1] + 3.0], [head[0] + 6.8 + hs, head[1] - 2.4], [head[0] + 5.0, head[1] + 1.2], [head[0] - 4.8, head[1] + 2.2]], true);
  } else if (look === 'guitarist') { // rocker hair: crown hugs the skull, shaggy strands fall past the shoulders
    const cq = L([head[0], head[1] + 0.6]);
    g.beginPath(); g.ellipse(cq[0], cq[1], 5.7 * u, 6.2 * u, 0, Math.PI * 1.02, Math.PI * 1.98); g.fill();
    for (const sd of [-1, 1]) {
      const top = [head[0] + sd * 4.6, head[1] + 2.5];
      const swing = hs * (sd > 0 ? 1.2 : 0.8);
      caps(top, [head[0] + sd * 6.2 + swing, head[1] - 6], 1.9, 1.6);
      caps([head[0] + sd * 5.6, head[1] - 4], [head[0] + sd * 7.4 + swing * 1.4, head[1] - 12.5], 1.5, 0.6);
      caps([head[0] + sd * 4.4, head[1] - 3], [head[0] + sd * 5.2 + swing * 1.2, head[1] - 10.5], 1.2, 0.5);
    }
  } else if (look === 'bassist') { // hood up
    poly([[head[0] - 7.4, head[1] - 7], [head[0] - 7.6, head[1] + 2], [head[0] - 3.5, head[1] + 8.4], [head[0] + 1.5, head[1] + 9.2], [head[0] + 6.2, head[1] + 6], [head[0] + 7.6, head[1] - 1], [head[0] + 7.2, head[1] - 7.5]], true);
  } else if (dancer) { // long hair, swings with the hips
    poly([[head[0] - 5.2, head[1] + 3.6], [head[0], head[1] + 6.6], [head[0] + 5.2, head[1] + 3.6], [head[0] + 6 + hs * 1.5, head[1] - 13], [head[0] + 2 + hs * 2.2, head[1] - 19], [head[0] - 2.5 + hs * 2.2, head[1] - 18], [head[0] - 6 + hs * 1.5, head[1] - 12]], true);
  } else { // cap with brim
    const cq = L([head[0], head[1] + 2.4]);
    g.beginPath(); g.ellipse(cq[0], cq[1], 5.6 * u, 4.4 * u, 0, Math.PI, TAU); g.fill();
    caps([head[0] - 1, head[1] + 2.2], [head[0] + 8.5 * side, head[1] + 1.4], 1.1, 0.8);
  }
  // props
  const pr = P.prop;
  if (pr && (pr.kind === 'guitar' || pr.kind === 'bass')) {
    const { G, N } = pr; const bass = pr.kind === 'bass';
    const dx = N[0] - G[0], dy = N[1] - G[1], d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
    circ([G[0] + ux * -2 + uy * 0, G[1] + uy * -2], bass ? 8.8 : 8.2);
    circ([G[0] + ux * 5.4 - uy * 1.2, G[1] + uy * 5.4 + ux * 1.2], bass ? 6.4 : 6.0);
    caps([G[0] + ux * 6, G[1] + uy * 6], N, 1.35, 1.15);
    caps(N, [N[0] + ux * 5.2 + uy * 0.8, N[1] + uy * 5.2 - ux * 0.8], 1.9, 1.5); // headstock
  } else if (pr && pr.kind === 'mic') {
    const ha = pr.at === 'R' ? haR : haL, m = pr.mouth;
    const dx = m[0] - ha[0], dy = m[1] - ha[1], d = Math.hypot(dx, dy) || 1;
    const top = [ha[0] + dx / d * Math.min(d - 1.6, 5.5), ha[1] + dy / d * Math.min(d - 1.6, 5.5)];
    caps([ha[0] - dx / d * 1.5, ha[1] - dy / d * 1.5], top, 0.9, 1.1);
    circ(top, 1.9);
  }

  if (o.react?.prop === 'staff') { const ha = side > 0 ? haR : haL; caps([ha[0] + side * 1.5, ha[1] + 12], [ha[0] - side * 3, 1.5], 0.8, 0.7); }
  // ---------- rim (world palette) ----------
  const rimCol = o.rim || 'rgba(255,200,150,0.95)';
  const r = st.r.getContext('2d'); r.setTransform(1, 0, 0, 1, 0, 0); r.globalCompositeOperation = 'source-over'; r.clearRect(0, 0, cw, ch);
  r.drawImage(st.m, 0, 0); r.globalCompositeOperation = 'source-in'; r.fillStyle = rgba(rimCol, 1); r.fillRect(0, 0, cw, ch);
  // ---------- body: dark base + interior shading + outfit detail ----------
  const b = st.b.getContext('2d'); b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1; b.clearRect(0, 0, cw, ch);
  b.drawImage(st.m, 0, 0); b.globalCompositeOperation = 'source-in'; b.fillStyle = o.react?.body || '#0d0b12'; b.fillRect(0, 0, cw, ch);
  b.globalCompositeOperation = 'source-atop';
  const cx0 = BW / 2 * u * S;
  const gx = b.createLinearGradient(cx0 + side * 16 * u * S, 0, cx0 - side * 6 * u * S, 0);
  gx.addColorStop(0, rgba(rimCol, 0.17)); gx.addColorStop(0.4, rgba(rimCol, 0.045)); gx.addColorStop(1, 'rgba(0,0,0,0)');
  b.fillStyle = gx; b.fillRect(0, 0, cw, ch);
  const gy = b.createLinearGradient(0, (BT - 100) * u * S, 0, (BT - 40) * u * S);
  gy.addColorStop(0, 'rgba(255,255,255,0.06)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  b.fillStyle = gy; b.fillRect(0, 0, cw, ch);
  b.setTransform(S, 0, 0, S, cx0, BT * u * S);
  b.lineCap = 'round'; b.lineJoin = 'round';
  const line = (pts, col, wd) => { const q = pts.map(L); b.strokeStyle = col; b.lineWidth = wd * u; b.beginPath(); b.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) b.lineTo(q[i][0], q[i][1]); b.stroke(); };
  const det = rgba(rimCol, 0.22), soft = 'rgba(255,255,255,0.07)';
  if (look === 'wanderer') { line([[shC[0], shC[1] - 1], [hipX, 30]], det, 0.45); line([[hipX - 7, hipY + 3], [hipX + 7, hipY + 3]], soft, 0.5); } // back seam + belt
  else if (look === 'vocalist') { line([[shC[0] - 3, shC[1]], [hipX - 1, hipY + 6], [hipX - 1.2, 28]], det, 0.5); line([[shC[0] + 3, shC[1]], [hipX + 1, hipY + 6]], soft, 0.45); line([[hipX - 8, hipY + 2], [hipX + 8, hipY + 2]], soft, 0.6); }
  else if (look === 'guitarist') { line([[shC[0] - 2.5, shC[1]], [hipX - 1.5, hipY - 2]], det, 0.45); line([[shC[0] + 2.5, shC[1]], [hipX + 1.5, hipY - 2]], soft, 0.45); }
  else if (look === 'bassist') { line([[head[0] - 1, head[1] - 7.5], [head[0] - 1.4, head[1] - 12]], det, 0.35); line([[head[0] + 1, head[1] - 7.5], [head[0] + 1.4, head[1] - 12]], det, 0.35); line([[hipX - 6, hipY + 6], [hipX + 6, hipY + 6]], soft, 0.5); }
  else if (dancer) { line([[wX - waistW, wY], [wX + waistW, wY]], det, 0.55); line([[hipX - 4, hipY], [hipX - 8 - sw * 3, 31]], soft, 0.4); line([[hipX + 4, hipY], [hipX + 8 - sw * 3, 31]], soft, 0.4); }
  else { line([[hipX - 11, hipY + 2], [hipX + 11, hipY + 2]], det, 0.7); line([[shC[0], shC[1]], [hipX, hipY + 2]], soft, 0.45); }
  if (blanket) { // oatmeal wool, lit warm from the lamp side, two muted rust stripes near the hem, soft folds, fringe
    for (const [pi, pts] of [[0, panelL], [1, panelR]]) {
      const bp = pts.map(L); b.save(); b.beginPath(); b.moveTo(bp[0][0], bp[0][1]); for (let i = 1; i < bp.length; i++) { const m = [(bp[i - 1][0] + bp[i][0]) / 2, (bp[i - 1][1] + bp[i][1]) / 2]; b.quadraticCurveTo(bp[i - 1][0], bp[i - 1][1], m[0], m[1]); } b.closePath(); b.clip();
      const lit = (pi === 0 ? -1 : 1) === side;
      const wg = b.createLinearGradient(side * 20 * u, 0, -side * 20 * u, 0); wg.addColorStop(0, 'rgb(196,166,128)'); wg.addColorStop(0.5, 'rgb(132,108,84)'); wg.addColorStop(1, 'rgb(62,48,38)');
      b.fillStyle = wg; b.fillRect(-40 * u, -110 * u, 80 * u, 110 * u);
      b.globalAlpha = 0.7; b.fillStyle = 'rgb(140,70,48)';
      for (const yy of [38.5, 42.5]) { b.save(); b.translate(0, -yy * u); b.rotate((pi ? -1 : 1) * 0.04); b.fillRect(-40 * u, -0.9 * u, 80 * u, 1.5 * u); b.restore(); }
      b.globalAlpha = 0.28; b.strokeStyle = 'rgb(30,20,14)'; b.lineWidth = 1.1 * u; const dx = pi ? 1 : -1;
      for (let f = 0; f < 3; f++) { const x0 = shC[0] + dx * (7 + f * 3.4), x1 = hipX + dx * (6 + f * 3.6) - sw; const q0 = L([x0, shC[1] - 6]), qm = L([x0 + dx * 2.5, 58]), q1 = L([x1, 35]); b.beginPath(); b.moveTo(q0[0], q0[1]); b.quadraticCurveTo(qm[0], qm[1], q1[0], q1[1]); b.stroke(); }
      if (lit) { b.globalAlpha = 0.22; b.fillStyle = 'rgb(255,200,140)'; const q = L([shC[0] + side * 14, 74]); b.beginPath(); b.ellipse(q[0], q[1], 6 * u, 16 * u, 0, 0, TAU); b.fill(); }
      b.restore(); b.globalAlpha = 1;
    }
    const fr = (x0, x1, y0, y1) => { for (let fi = 0; fi <= 6; fi++) { const xx = x0 + (x1 - x0) * fi / 6, yy = y0 + (y1 - y0) * fi / 6; line([[xx, yy], [xx - sw * 0.2, yy - 2.2]], 'rgba(150,120,92,0.9)', 0.45); } };
    fr(hipX - 13.5 - sw * 1.2, hipX - 3.4, 31 + wv(1), 35.6); fr(hipX + 3.4, hipX + 14 - sw * 1.2, 31.6, 26.5 + wv(4));
  }
  if (mug) { const mq = L(mug); const mg2 = b.createLinearGradient(mq[0] + side * 3 * u, 0, mq[0] - side * 3 * u, 0); mg2.addColorStop(0, 'rgb(240,222,196)'); mg2.addColorStop(1, 'rgb(150,128,108)'); b.fillStyle = mg2; b.fillRect(mq[0] - 3 * u, mq[1] - 3.6 * u, 6 * u, 7.2 * u); b.fillStyle = 'rgba(90,50,30,0.6)'; b.fillRect(mq[0] - 3 * u, mq[1] - 3.6 * u, 6 * u, 0.9 * u);
    b.strokeStyle = 'rgb(226,206,180)'; b.lineWidth = 0.9 * u; b.beginPath(); b.arc(mq[0] + side * 3.6 * u, mq[1], 1.8 * u, -Math.PI / 2, Math.PI / 2, side < 0); b.stroke();
    for (const hp of [haL, haR]) { const hq = L(hp); b.fillStyle = 'rgba(180,120,90,0.9)'; b.beginPath(); b.arc(hq[0], hq[1], 1.5 * u, 0, TAU); b.fill(); } } // hands wrapped round it
  if (pr && (pr.kind === 'guitar' || pr.kind === 'bass')) {
    const { G, N } = pr; const q = L(G);
    b.strokeStyle = rgba(rimCol, 0.4); b.lineWidth = 0.5 * u; b.beginPath(); b.arc(q[0], q[1], 2.2 * u, 0, TAU); b.stroke();
    line([[G[0] - 1, G[1] - 3], N], rgba(rimCol, 0.25), 0.3);
    b.strokeStyle = rgba(rimCol, 0.18); b.lineWidth = 0.45 * u; const q2 = L([G[0] - 1.2, G[1] - 1]); b.beginPath(); b.arc(q2[0], q2[1], 8 * u, 0.2, 2.6); b.stroke();
  } else if (pr && pr.kind === 'mic') {
    const ha = pr.at === 'R' ? haR : haL; line([ha, [ha[0] + 0.4, ha[1] + 2]], rgba(rimCol, 0.5), 0.6);
  }

  // ---------- composite into the frame ----------
  const ox = x - BW / 2 * u, oy = by - BT * u, dw = BW * u, dh = (BT + BB) * u;
  const op = o.opacity ?? 0.97;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  // contact shadow
  ctx.globalAlpha = 0.5 * op; ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath(); ctx.ellipse(x + P.hipX * u * 0.5, by + 0.8 * u, 15 * u, 2.4 * u, 0, 0, TAU); ctx.fill();
  // faint back-rim on the shadow side (stronger warm fire rim in Heavy so the frontman pops off the black beast)
  const glow = Math.max(0, Math.min(1, o.glow || 0));
  ctx.globalAlpha = (o.hard ? 0.65 : 0.28) * op;
  ctx.drawImage(st.r, ox - side * (o.hard ? 1.25 : 0.8) * u, oy - (o.hard ? 0.6 : 0.3) * u, dw, dh);
  if (o.hard) { ctx.globalAlpha = 0.55 * op; ctx.drawImage(st.r, ox, oy - 1.1 * u, dw, dh); }
  // main rim on the light side (layered halo stamps — zero shadowBlur)
  const rimA = Math.min(1, (o.hard ? 0.95 : 0.8) + 0.3 * glow) * op;
  ctx.globalAlpha = rimA * 0.32 * (0.6 + 0.6 * glow);
  ctx.drawImage(st.r, ox + side * (o.hard ? 2.2 : 1.85) * u, oy - 0.9 * u, dw, dh);
  ctx.globalAlpha = rimA;
  ctx.drawImage(st.r, ox + side * (o.hard ? 1.45 : 1.25) * u, oy - 0.5 * u, dw, dh);
  ctx.globalAlpha = op;
  ctx.drawImage(st.b, ox, oy, dw, dh);
  ctx.restore();
  const Y = (p) => by - p[1] * u;
  const X = (p) => x + p[0] * u;
  if (mug) { // steam: three thin wisps curling up and thinning out (slow, never a cartoon puff)
    const mx = X(mug), my = Y([0, mug[1] + 3.6]);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ph2 = t * 0.9 + i * 2.1, len = (11 + 3 * i) * u, x0 = mx + (i - 1) * 1.3 * u;
      for (let sgm = 0; sgm < 6; sgm++) {
        const a0 = sgm / 6, a1 = (sgm + 1) / 6;
        const px0 = x0 + Math.sin(ph2 + a0 * 4.2) * 1.8 * u * (0.3 + a0), py0 = my - a0 * len;
        const px1 = x0 + Math.sin(ph2 + a1 * 4.2) * 1.8 * u * (0.3 + a1), py1 = my - a1 * len;
        ctx.globalAlpha = op * 0.32 * (1 - a0) * (0.6 + 0.4 * Math.sin(t * 0.7 + i)); ctx.strokeStyle = 'rgb(255,236,214)'; ctx.lineWidth = Math.max(0.6, (0.9 + a0 * 1.4) * u);
        ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px1, py1); ctx.stroke();
      }
    }
    ctx.restore();
  }
  return { chestY: Y(shC) + 8 * u, headY: Y(head), fx: x + head[0] * u, baseY: by, scale: H / 48, handY: Y(haR), bodyH: H, dance: 'sway', vocalist: look === 'vocalist', look,
    hands: { L: [X(haL), Y(haL)], R: [X(haR), Y(haR)], lantern: [X(haR), Y(haR)] }, head: [X(head), Y(head)], mug: mug ? [X(mug), Y(mug)] : null };
}
