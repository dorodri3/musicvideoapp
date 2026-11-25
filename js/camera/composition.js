/**
 * Camera-side composition + intensity helpers.
 *
 * Reads directive.composition from Scene Director (js/director/composition.js).
 * Live fields: look, variant, layout, mode ('loud'|'quiet'), intensity (0..1),
 * energy, tempo, tone, focal, focalU, focalV, negativeSpace, spacing, edges,
 * light, texture, motionMul, horizonTilt, …  Aliases accepted:
 *   emptySpace → negativeSpace, tilt → horizonTilt.
 *
 * Intensity mapping (0..1, CompositionDirector:
 *   clamp01(energy*0.6 + tempoN*0.25 + 0.075 + lyricTone)):
 *   - Deadzone below 0.32 → drive 0 (calm; near-zero shake / whip / fast push).
 *   - Smoothstep 0.32 → 0.85 → drive 1.
 *   - chaos = drive * profile.chaosCeiling
 *       dread_still 0.42 (most restrained)
 *       cozy_dolly 0.50
 *       intimate_portrait 0.55
 *       ethereal_float 0.58
 *       cinematic_dolly 0.72
 *       kinetic_tight 0.90
 *       kinetic_tight_heavy 1.00
 *   - kick/drop shake: (kickScale + chaosKick) * chaos   [no-comp: raw profile]
 *   - whip-pan amplitude: whipAmp * chaos; returns to ONE rest focal, never empty
 *   - dutch-on-hits / tension dutch: dutchMax * chaos when composition is present
 *   - fast push-ins: peak/build amount * (0.10 + 0.90*drive); ease rate rises with drive
 *
 * composition.variant === 'cozy' is INERT here. Cozy is a locked sixth
 * styleLock mapped to the cozy_dolly profile, not a composition variant.
 */
import { smooth01 } from './framing.js?v=mood4';

export const INTENSITY_DEADZONE = 0.32;
export const INTENSITY_FULL = 0.85;

/** Per-profile ceiling on chaos (drive * ceiling). */
export const DEFAULT_CHAOS_CEILING = Object.freeze({
  dread_still: 0.42,
  cozy_dolly: 0.5,
  intimate_portrait: 0.55,
  ethereal_float: 0.58,
  cinematic_dolly: 0.72,
  kinetic_tight: 0.9,
  kinetic_tight_heavy: 1,
});

/** Same u/v convention as gaze: (0,0)=top-left, v increases downward. */
export const COMP_SPAN_X = 34;
export const COMP_SPAN_Y = 22;

/** ~4.3° — covers sad loud horizonTilt: 4. */
export const COMPOSITION_TILT_MAX = 0.075;

export const DEFAULT_WHIP_AMP = 10;

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function hasComposition(directive) {
  return !!(
    directive &&
    directive.composition &&
    typeof directive.composition === 'object'
  );
}

/**
 * Normalize directive.composition. Returns null when absent so the camera
 * keeps its current (no-composition) behavior.
 */
export function readComposition(directive) {
  if (!hasComposition(directive)) return null;
  const c = directive.composition;
  const intensity = clamp01(c.intensity);
  const motionRaw = Number(c.motionMul);
  const motionMul = Number.isFinite(motionRaw) ? clamp(motionRaw, 0.05, 1.8) : 1;
  let focalU;
  if (Number.isFinite(Number(c.focalU))) {
    focalU = clamp01(c.focalU);
  } else if (c.focal === 'edge') {
    focalU = 0.15;
  } else if (c.focal === 'thirds') {
    focalU = 0.64;
  } else {
    focalU = 0.5;
  }
  const focalV = Number.isFinite(Number(c.focalV)) ? clamp01(c.focalV) : 0.5;
  const negativeSpace = Number(c.emptySpace ?? c.negativeSpace) || 0;
  const horizonTilt = Number(c.tilt ?? c.horizonTilt) || 0;
  const mode = c.mode === 'loud' ? 'loud' : c.mode === 'quiet' ? 'quiet' : null;
  const look = typeof c.look === 'string' ? c.look.toLowerCase() : '';
  // variant is accepted for API compat but intentionally unused.
  const variant = typeof c.variant === 'string' ? c.variant : '';
  return {
    intensity,
    motionMul,
    focalU,
    focalV,
    negativeSpace,
    horizonTilt,
    mode,
    look,
    variant,
  };
}

/** 0..1 shaped drive: 0 below the deadzone, 1 by INTENSITY_FULL. */
export function intensityDrive(intensity) {
  const i = clamp01(intensity);
  const span = INTENSITY_FULL - INTENSITY_DEADZONE;
  return smooth01((i - INTENSITY_DEADZONE) / span);
}

export function profileChaosCeiling(profile) {
  if (profile && Number.isFinite(profile.chaosCeiling)) return profile.chaosCeiling;
  const id = profile && profile.id;
  return DEFAULT_CHAOS_CEILING[id] ?? 0.65;
}

/** drive * ceiling. 0 when intensity is in the calm deadzone. */
export function chaosAmount(intensity, profile) {
  return intensityDrive(intensity) * profileChaosCeiling(profile);
}

export function isSadComposition(comp, styleLock) {
  if (!comp) return false;
  const lock = String(styleLock || '').toLowerCase();
  return comp.look === 'sad' || lock === 'sad' || lock === 'melancholy';
}

/**
 * Camera offset that places the figure at composition focalU/focalV.
 * u>0.5 → positive x (figure sits right of center); v>0.5 → positive y (down).
 */
export function compositionRestOffset(comp, scaleMul = 1) {
  if (!comp) return { x: 0, y: 0 };
  const s = 0.7 + 0.3 * Math.min(Math.max(scaleMul, 0), 1.5);
  return {
    x: (comp.focalU - 0.5) * COMP_SPAN_X * s,
    y: (comp.focalV - 0.5) * COMP_SPAN_Y * s,
  };
}

/** +1 = empty region is to the right of the figure (do not whip +x into it). */
export function emptySideX(comp) {
  if (!comp) return 0;
  if (comp.focalU < 0.45) return 1;
  if (comp.focalU > 0.55) return -1;
  return 0;
}

/** Whip direction that never enters the empty-space side. */
export function whipDirectionX(comp, restX = 0) {
  const empty = emptySideX(comp);
  if (empty > 0) return -1;
  if (empty < 0) return 1;
  return restX >= 0 ? 1 : -1;
}

/**
 * Effective kick/drop/dutch scales.
 * With no composition, return the profile baselines unchanged.
 * With composition, scale by chaos (low I → near-zero; high I → ceiling).
 * cozy_dolly uses chaosKick/chaosDrop because its baseline kick/drop is 0.
 */
export function effectiveShakeScales(shakeCfg, chaos, hasComp) {
  const kick = (shakeCfg && shakeCfg.kickScale) || 0;
  const drop = (shakeCfg && shakeCfg.dropScale) || 0;
  const chaosKick = (shakeCfg && shakeCfg.chaosKick) || 0;
  const chaosDrop = (shakeCfg && shakeCfg.chaosDrop) || 0;
  const dutchMax = (shakeCfg && shakeCfg.dutchMax) || 0;
  if (!hasComp) {
    return { kickScale: kick, dropScale: drop, dutchMax };
  }
  const c = Math.max(0, chaos);
  return {
    kickScale: (kick + chaosKick) * c,
    dropScale: (drop + chaosDrop) * c,
    dutchMax: dutchMax * c,
  };
}

/** Scale for peak/build "fast push-ins". No-comp: 1 (unchanged). */
export function pushIntensityScale(hasComp, drive) {
  if (!hasComp) return 1;
  return 0.1 + 0.9 * Math.max(0, Math.min(1, drive));
}

/**
 * Sad + composition reaction: keep the figure at its edge rest.
 * A subtle gaze push is kept only if it does not travel toward center /
 * into the empty-space region; otherwise hold the rest pose.
 */
export function sadReactionOffset(rest, push, { maxTowardCenter = 0.22 } = {}) {
  const rx = rest && Number.isFinite(rest.x) ? rest.x : 0;
  const ry = rest && Number.isFinite(rest.y) ? rest.y : 0;
  const px = push && Number.isFinite(push.x) ? push.x : 0;
  const py = push && Number.isFinite(push.y) ? push.y : 0;
  let x = rx + px * 0.28;
  let y = ry + py * 0.28;
  if (rx < 0) {
    const limit = rx * (1 - maxTowardCenter);
    if (x > limit || x > -1) x = rx;
  } else if (rx > 0) {
    const limit = rx * (1 - maxTowardCenter);
    if (x < limit || x < 1) x = rx;
  }
  return { x, y };
}

/**
 * Roll from composition tilt. Sad: loud (or high-intensity + tilt) only;
 * quiet sad is 0. Other looks do not invent roll from composition.
 */
export function compositionTiltRad(comp, { sad } = {}) {
  if (!comp) return 0;
  const deg = comp.horizonTilt || 0;
  if (!sad) return 0;
  const loud =
    comp.mode === 'loud' ||
    (deg !== 0 && intensityDrive(comp.intensity) > 0.55);
  if (!loud || deg === 0) return 0;
  return (deg * Math.PI) / 180;
}

export function whipAmplitude(shakeCfg, chaos, hasComp) {
  if (!hasComp) return 0;
  const base =
    (shakeCfg && Number.isFinite(shakeCfg.whipAmp) && shakeCfg.whipAmp) ||
    DEFAULT_WHIP_AMP;
  return base * Math.max(0, chaos);
}
