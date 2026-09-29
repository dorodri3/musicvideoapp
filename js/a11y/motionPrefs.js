/**
 * A11y motion / flash comfort prefs — STUB for Visual Engine to wire.
 * Additive only. No UI chrome (Phone Polish owns UI).
 * Do NOT import from typography / casting / scenic lyric paths.
 *
 * Wire examples (Visual owns call sites):
 *   import { getMotionComfort } from '../a11y/motionPrefs.js';
 *   const c = getMotionComfort();
 *   // lighting: if (c.muteWhiteOut) skip white_flash / white_out peaks
 *   // renderer: whiteMinGapMs = Math.max(g.whiteMinGapMs, c.minFullWhiteGapMs)
 *   // bloom: Math.min(c.bloomCap, rawBloom)
 *   // camera: if (c.muteShake) skip punch/whip; mute groundShake contribution
 *
 * Future UI may set: document.documentElement.dataset.lessFlash = '1'
 * or window.__lightShowSettings = { lessFlash: true }
 */
export function getMotionComfort(opts = {}) {
  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lessFlash =
    !!opts.lessFlash ||
    !!(typeof window !== 'undefined' && window.__lightShowSettings?.lessFlash) ||
    (typeof document !== 'undefined' &&
      document.documentElement?.dataset?.lessFlash === '1');

  const comfort = reduceMotion || lessFlash;

  return {
    reduceMotion,
    lessFlash,
    /** Hard cap for full-frame whiteOut trigger rate (Hz). */
    maxFlashHz: comfort ? 1 : 3,
    /** Shared min gap between full white-outs (ms). */
    minFullWhiteGapMs: reduceMotion ? 99999 : lessFlash ? 1000 : 500,
    /** Soft-clip ceiling for lighting.bloom (artistic extreme ~0.72). */
    bloomCap: reduceMotion ? 0.35 : lessFlash ? 0.4 : 0.55,
    /** Peak whiteOut alpha under comfort modes (artistic = 1). */
    whiteOutPeakCap: reduceMotion ? 0 : lessFlash ? 0.35 : 0.85,
    muteWhiteOut: reduceMotion,
    muteKickStrobe: comfort,
    muteCameraShakeWhip: comfort,
    muteGroundShake: comfort,
    /** Local kick/snare horizon punches may stay (scaled). */
    localFlashScale: reduceMotion ? 0.35 : lessFlash ? 0.55 : 1
  };
}
