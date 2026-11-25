/**
 * Framing helpers — Fury Road eye-trace / phone LED center bias.
 * Used by CameraSystem; keep imports self-contained under js/camera/.
 *
 * MUSIC-BRIEF-20260924-2118: shake/punch overlays the center; never throws
 * the silhouette off LED mid. Environmental type stays readable.
 *
 * MUSIC-BRIEF-20260924-2122 + cast contract: Scene Director
 *   directive.cast = { kind, action, placement, count, conceptId }
 *   placement: 'sky' | 'mid' | 'foreground'
 * Cast framing prefers staged figure over random shake; psych slice
 * (build→push earns chorus pull, kick-only shake, dutch tension-only).
 *
 * CEO Direction (Nov 24 2026):
 * - No tracking shots that follow aimless walking (subject stays anchored
 *   on crosshair; lateral travel wander suppressed).
 * - Reaction framing: brief reaction push toward world event/focal point,
 *   then re-crosshair figure.
 */

/** Soft phone-LED wander limits (pre-scaleMul). Subject stays near crosshair. */
export const FRAME_MAX_X = 16;
export const FRAME_MAX_Y = 11;
/** Tighter envelope for kick/drop punch so silhouette survives shake. */
export const PUNCH_MAX_X = 6;
export const PUNCH_MAX_Y = 4.5;
export const FRAME_MAX_ROT = 0.045; // ~2.6° — keeps environmental type readable
export const ZOOM_MIN = 0.94;
export const ZOOM_MAX = 1.2; // HOLD: room for cast intimate push-in

/**
 * Clamp pan/orbit wander so the subject never leaves LED center.
 * When `reactionWeight > 0`, gently widens bounds slightly so sky/focal
 * reaction pushes read clearly without breaking LED framing.
 */
export function clampToCenter(x, y, scaleMul = 1, reactionWeight = 0) {
  const rxBoost = 1 + 0.32 * Math.max(0, Math.min(1, reactionWeight || 0));
  const sx = FRAME_MAX_X * (0.85 + 0.15 * Math.min(scaleMul, 1.5)) * rxBoost;
  const sy = FRAME_MAX_Y * (0.85 + 0.15 * Math.min(scaleMul, 1.5)) * rxBoost;
  return {
    x: Math.max(-sx, Math.min(sx, x)),
    y: Math.max(-sy, Math.min(sy, y)),
  };
}

/** Clamp punch shake to a small envelope around crosshair. */
export function clampPunch(x, y) {
  return {
    x: Math.max(-PUNCH_MAX_X, Math.min(PUNCH_MAX_X, x)),
    y: Math.max(-PUNCH_MAX_Y, Math.min(PUNCH_MAX_Y, y)),
  };
}

/** Bias offsets toward origin so hits stay near crosshair. */
export function biasTowardCenter(x, y, strength = 0.35) {
  const s = Math.max(0, Math.min(1, strength));
  return { x: x * (1 - s), y: y * (1 - s) };
}

/** Bias offsets toward a rest point (composition focal / edge frame). */
export function biasTowardPoint(x, y, px, py, strength = 0.35) {
  const s = Math.max(0, Math.min(1, strength));
  return {
    x: x * (1 - s) + (px || 0) * s,
    y: y * (1 - s) + (py || 0) * s,
  };
}

export function clampZoom(z) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
}

/** Clamp zoom inside a locked camera style profile's lens envelope. */
export function clampZoomToRange(z, minZ = ZOOM_MIN, maxZ = ZOOM_MAX) {
  const lo = Math.max(ZOOM_MIN, minZ);
  const hi = Math.min(ZOOM_MAX, Math.max(lo, maxZ));
  return Math.max(lo, Math.min(hi, z));
}

export function clampRotation(r, maxRot = FRAME_MAX_ROT, opts = {}) {
  const hard = opts && Number.isFinite(opts.hardCap) ? opts.hardCap : FRAME_MAX_ROT;
  const cap = Math.min(hard, Math.max(0, maxRot));
  return Math.max(-cap, Math.min(cap, r));
}

/** Smoothstep for build→push, dutch ease, whip settle. */
export function smooth01(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Exponential decay helper (per-frame amp *= decay^scaledDt). */
export function decayToward(current, target, rate, dt) {
  const a = 1 - Math.exp(-rate * Math.max(0, dt));
  return current + (target - current) * a;
}

const LONE_KINDS = new Set(['traveler', 'figure_lone', 'silhouette']);
const CROWD_KINDS = new Set(['crowd_ghosts', 'congregation']);

/**
 * Scene Director cast → camera biases.
 * Prefer cast over random shake when kind is active (not none / missing).
 *
 * @param {null|{kind?:string,action?:string,placement?:string,count?:number}} cast
 * @returns {{active:boolean,yBias:number,zoomBias:number,shakeMul:number,noTracking:boolean}}
 */
export function castFraming(cast) {
  if (!cast || cast.kind === 'none') {
    return { active: false, yBias: 0, zoomBias: 0, shakeMul: 1, noTracking: true };
  }

  const placement = cast.placement || 'mid';
  const count = Number.isFinite(cast.count) ? cast.count : 1;
  const kind = cast.kind || '';
  const action = cast.action || '';

  // HOLD (bot 1): characters not clear — when cast is active, bias toward
  // cast-foreground intimate push-in so the figure fills the LED and stays
  // on crosshair. Placement still shades look direction, but never leaves
  // the body small/wide in mid/sky.
  const isCrowd = CROWD_KINDS.has(kind) || count >= 3;
  const isDuo = kind === 'duo' || count === 2;
  const isLone =
    !isCrowd &&
    !isDuo &&
    (count <= 1 || LONE_KINDS.has(kind));

  // Baseline intimate foreground push whenever cast is staged
  let yBias = -2.4; // default look-down toward body (foreground bias)
  let zoomBias = 0.055; // readable figure scale on phone LED

  if (placement === 'sky') {
    // Keep a little upward look, but still push in — figure must read
    yBias = 1.6;
    zoomBias = 0.04;
  } else if (placement === 'foreground') {
    yBias = -4.0;
    zoomBias = 0.08;
  } else {
    // mid → treat closer to foreground for clarity
    yBias = -2.8;
    zoomBias = 0.062;
  }

  if (isLone) {
    zoomBias += 0.045; // hard intimate push on lone traveler / silhouette
  } else if (isDuo) {
    zoomBias += 0.02;
  } else if (isCrowd) {
    // Still show formation, but do NOT pull so far figures vanish
    zoomBias -= 0.015;
    yBias *= 0.7;
  }

  // Action reinforces intimacy / look (no lateral tracking for walk/run/flee)
  if (action === 'look_up') {
    yBias += 1.2;
  } else if (action === 'kneel') {
    yBias -= 1.8;
    zoomBias += 0.025;
  } else if (action === 'rise') {
    yBias += 0.8;
    zoomBias += 0.015;
  }

  // Prefer cast over shake harder — keep silhouette locked
  const shakeMul = 0.42;

  return { active: true, yBias, zoomBias, shakeMul, noTracking: true };
}
