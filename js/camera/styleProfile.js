/**
 * Camera Style Profiles (CEO Rule 1, Nov 24 2026): ONE visual style per video.
 *
 * The camera profile FOLLOWS the Scene Director style lock
 * (directive.styleLock / directive.styleLook from Worlds styleFamilies.js).
 * It is not a separate deterministic pick. Mid-song chip taps that change
 * the director lock also change the camera profile once (smooth 0.5–1s
 * lens ease, no flap).
 *
 * While directive.stylePending is true (auto intro, up to ~6s), the camera
 * holds the fallback profile and does not commit. After pending clears,
 * the lock is committed and later styleLock changes are followed once each.
 *
 * Mapping (director ids + aliases):
 *   happy_pop / candy_pop     → kinetic_tight
 *   heavy_evil / ember_wasteland → kinetic_tight_heavy (heavier kick/drop
 *                                 shake + dutch on hits)
 *   sad                       → intimate_portrait
 *   horror                    → dread_still
 *   cinematic                 → cinematic_dolly
 *   cozy                      → cozy_dolly  (sixth locked style; shake 0 /
 *                                 dutch 0 at baseline; may go chaotic only
 *                                 when composition.intensity is high)
 *   missing / unknown         → ethereal_float (fallback only)
 *
 * Lens feel, move speed, allowed moves, shake grammar, and reaction whip
 * stay consistent within the locked profile. Section dynamics breathe
 * inside those ranges. No random orbit arcs.
 */

export const CAMERA_STYLE_PROFILES = Object.freeze({
  intimate_portrait: Object.freeze({
    id: 'intimate_portrait',
    label: 'Intimate Portrait',
    lens: Object.freeze({
      baseZoom: 1.02,
      zoomMin: 0.99,
      zoomMax: 1.19,
      zoomBreath: 0.008,
      buildPushScale: 0.045,
      chorusPullScale: 0.025,
      peakPushScale: 0.05,
    }),
    motion: Object.freeze({
      moveSpeed: 0.6,
      easeRate: 4.5,
      travelAmpX: 0,
      travelAmpY: 1.4,
      allowedMoves: Object.freeze(['slow_dolly', 'push', 'pull', 'drift']),
      defaultMove: 'slow_dolly',
      modeMap: Object.freeze({
        orbit: 'push',
        spin: 'push',
        pan: 'slow_dolly',
        whip: 'push',
        shake: 'slow_dolly',
        dutch: 'slow_dolly',
        crane: 'slow_dolly',
        dolly: 'slow_dolly',
      }),
    }),
    shake: Object.freeze({
      kickScale: 0.2,
      dropScale: 0.35,
      dutchMax: 0,
      whipSpeed: 8.5,
    }),
    reaction: Object.freeze({
      holdSec: 0.6,
      pushSec: 0.85,
      returnSec: 0.7,
      cooldownSec: 4.0,
      pushZoom: 0.05,
    }),
  }),

  ethereal_float: Object.freeze({
    id: 'ethereal_float',
    label: 'Ethereal Float',
    lens: Object.freeze({
      baseZoom: 0.985,
      zoomMin: 0.95,
      zoomMax: 1.17,
      zoomBreath: 0.011,
      buildPushScale: 0.04,
      chorusPullScale: 0.045,
      peakPushScale: 0.045,
    }),
    motion: Object.freeze({
      moveSpeed: 0.52,
      easeRate: 3.8,
      travelAmpX: 0,
      travelAmpY: 2.0,
      allowedMoves: Object.freeze(['slow_dolly', 'crane', 'pull', 'push', 'drift']),
      defaultMove: 'drift',
      modeMap: Object.freeze({
        orbit: 'crane',
        spin: 'crane',
        pan: 'slow_dolly',
        whip: 'push',
        shake: 'drift',
        dutch: 'drift',
        dolly: 'slow_dolly',
      }),
    }),
    shake: Object.freeze({
      kickScale: 0,
      dropScale: 0.18,
      dutchMax: 0,
      whipSpeed: 6.5,
    }),
    reaction: Object.freeze({
      holdSec: 0.65,
      pushSec: 0.95,
      returnSec: 0.8,
      cooldownSec: 4.5,
      pushZoom: 0.045,
    }),
  }),

  cinematic_dolly: Object.freeze({
    id: 'cinematic_dolly',
    label: 'Cinematic Dolly',
    lens: Object.freeze({
      baseZoom: 1.0,
      zoomMin: 0.96,
      zoomMax: 1.19,
      zoomBreath: 0.009,
      buildPushScale: 0.055,
      chorusPullScale: 0.045,
      peakPushScale: 0.06,
    }),
    motion: Object.freeze({
      moveSpeed: 0.82,
      easeRate: 5.5,
      travelAmpX: 0,
      travelAmpY: 1.8,
      allowedMoves: Object.freeze(['dolly', 'slow_dolly', 'push', 'pull', 'crane', 'dutch', 'drift']),
      defaultMove: 'dolly',
      modeMap: Object.freeze({
        orbit: 'push',
        spin: 'push',
        pan: 'dolly',
        whip: 'push',
        shake: 'dolly',
      }),
    }),
    shake: Object.freeze({
      kickScale: 0.55,
      dropScale: 0.75,
      dutchMax: 0.022,
      whipSpeed: 11.5,
    }),
    reaction: Object.freeze({
      holdSec: 0.55,
      pushSec: 0.75,
      returnSec: 0.65,
      cooldownSec: 3.5,
      pushZoom: 0.06,
    }),
  }),

  dread_still: Object.freeze({
    id: 'dread_still',
    label: 'Dread Still',
    lens: Object.freeze({
      baseZoom: 1.015,
      zoomMin: 0.98,
      zoomMax: 1.2,
      zoomBreath: 0.005,
      buildPushScale: 0.065,
      chorusPullScale: 0.015,
      peakPushScale: 0.06,
    }),
    motion: Object.freeze({
      moveSpeed: 0.45,
      easeRate: 4.0,
      travelAmpX: 0,
      travelAmpY: 0.9,
      allowedMoves: Object.freeze(['slow_dolly', 'push', 'dutch', 'drift']),
      defaultMove: 'slow_dolly',
      modeMap: Object.freeze({
        orbit: 'push',
        spin: 'push',
        pan: 'slow_dolly',
        crane: 'slow_dolly',
        pull: 'slow_dolly',
        whip: 'push',
        shake: 'dutch',
        dolly: 'slow_dolly',
      }),
    }),
    shake: Object.freeze({
      kickScale: 0.25,
      dropScale: 0.65,
      dutchMax: 0.028,
      whipSpeed: 14.0,
    }),
    reaction: Object.freeze({
      holdSec: 0.7,
      pushSec: 0.65,
      returnSec: 0.6,
      cooldownSec: 3.6,
      pushZoom: 0.065,
    }),
  }),

  kinetic_tight: Object.freeze({
    id: 'kinetic_tight',
    label: 'Kinetic Tight',
    lens: Object.freeze({
      baseZoom: 1.005,
      zoomMin: 0.96,
      zoomMax: 1.2,
      zoomBreath: 0.01,
      buildPushScale: 0.07,
      chorusPullScale: 0.05,
      peakPushScale: 0.07,
    }),
    motion: Object.freeze({
      moveSpeed: 1.05,
      easeRate: 6.5,
      travelAmpX: 0,
      travelAmpY: 1.6,
      allowedMoves: Object.freeze(['push', 'pull', 'dolly', 'shake', 'dutch', 'whip', 'drift']),
      defaultMove: 'push',
      modeMap: Object.freeze({
        orbit: 'push',
        spin: 'push',
        pan: 'dolly',
        crane: 'push',
        slow_dolly: 'dolly',
      }),
    }),
    shake: Object.freeze({
      kickScale: 1.0,
      dropScale: 1.0,
      dutchMax: 0.036,
      whipSpeed: 16.0,
    }),
    reaction: Object.freeze({
      holdSec: 0.45,
      pushSec: 0.65,
      returnSec: 0.55,
      cooldownSec: 2.8,
      pushZoom: 0.075,
    }),
  }),


  /**
   * heavy_evil / ember_wasteland override of kinetic_tight:
   * same language, heavier kick/drop shake, dutch allowed on hits.
   */
  kinetic_tight_heavy: Object.freeze({
    id: 'kinetic_tight_heavy',
    label: 'Kinetic Tight (Heavy)',
    variantOf: 'kinetic_tight',
    heavy: true,
    lens: Object.freeze({
      baseZoom: 1.005,
      zoomMin: 0.96,
      zoomMax: 1.2,
      zoomBreath: 0.01,
      buildPushScale: 0.07,
      chorusPullScale: 0.05,
      peakPushScale: 0.07,
    }),
    motion: Object.freeze({
      moveSpeed: 1.05,
      easeRate: 6.5,
      travelAmpX: 0,
      travelAmpY: 1.6,
      allowedMoves: Object.freeze(['push', 'pull', 'dolly', 'shake', 'dutch', 'whip', 'drift']),
      defaultMove: 'push',
      modeMap: Object.freeze({
        orbit: 'push',
        spin: 'push',
        pan: 'dolly',
        crane: 'push',
        slow_dolly: 'dolly',
      }),
    }),
    shake: Object.freeze({
      kickScale: 1.45,
      dropScale: 1.6,
      dutchMax: 0.048,
      dutchOnHits: true,
      whipSpeed: 16.0,
    }),
    reaction: Object.freeze({
      holdSec: 0.45,
      pushSec: 0.65,
      returnSec: 0.55,
      cooldownSec: 2.8,
      pushZoom: 0.075,
    }),
  }),

  /**
   * cozy — locked sixth style (v2-worlds-20261124-220146-cozy-lock).
   * Slow, gentle intimate dolly. Shake 0 and dutch 0 at baseline.
   * Soft chorus push-ins (gentle, not punchy). Gentle reaction beat.
   * May go chaotic only when composition.intensity is high; ceiling is modest.
   */
  cozy_dolly: Object.freeze({
    id: 'cozy_dolly',
    label: 'Cozy Dolly',
    lens: Object.freeze({
      baseZoom: 1.025,
      zoomMin: 0.99,
      zoomMax: 1.14,
      zoomBreath: 0.006,
      buildPushScale: 0.02,
      chorusPullScale: 0,
      chorusPushScale: 0.022,
      peakPushScale: 0.028,
    }),
    motion: Object.freeze({
      moveSpeed: 0.32,
      easeRate: 3.2,
      travelAmpX: 0,
      travelAmpY: 1.1,
      allowedMoves: Object.freeze(['slow_dolly', 'dolly', 'push', 'drift']),
      defaultMove: 'slow_dolly',
      modeMap: Object.freeze({
        orbit: 'slow_dolly',
        spin: 'slow_dolly',
        pan: 'slow_dolly',
        whip: 'slow_dolly',
        shake: 'drift',
        dutch: 'slow_dolly',
        crane: 'slow_dolly',
        pull: 'slow_dolly',
        push: 'push',
        dolly: 'dolly',
      }),
    }),
    shake: Object.freeze({
      kickScale: 0,
      dropScale: 0,
      dutchMax: 0,
      dutchOnHits: false,
      whipSpeed: 5.5,
      chaosKick: 0.7,
      chaosDrop: 0.8,
    }),
    chaosCeiling: 0.5,
    reaction: Object.freeze({
      holdSec: 0.7,
      pushSec: 0.9,
      returnSec: 0.85,
      cooldownSec: 5.0,
      pushZoom: 0.03,
    }),
  }),

});


/** Fallback / pending-intro / unknown styleLock. */
export const FALLBACK_PROFILE_ID = 'ethereal_float';

/**
 * Scene Director styleLock / styleLook (string) → camera profile id.
 * Live Worlds (v2-worlds-20261124-220146-cozy-lock): AUTO_STYLES =
 *   candy_pop, ember_wasteland, sad, horror, cinematic, cozy.
 * STYLE_NAMES: candy_pop→happy_pop, ember_wasteland→heavy_evil, cozy→cozy.
 * COLLAPSE alias: golden_pastoral→cozy. Genre keys that Auto maps to cozy:
 *   soul_room, intimate, warm, country, country_road.
 */
export const STYLE_LOCK_TO_PROFILE = Object.freeze({
  happy_pop: 'kinetic_tight',
  candy_pop: 'kinetic_tight',
  candy: 'kinetic_tight',
  pop_bright: 'kinetic_tight',
  stage_pop: 'kinetic_tight',
  heavy_evil: 'kinetic_tight_heavy',
  ember_wasteland: 'kinetic_tight_heavy',
  heavy: 'kinetic_tight_heavy',
  chaos: 'kinetic_tight_heavy',
  sad: 'intimate_portrait',
  melancholy: 'intimate_portrait',
  horror: 'dread_still',
  cold_dread: 'dread_still',
  cinematic: 'cinematic_dolly',
  cozy: 'cozy_dolly',
  golden_pastoral: 'cozy_dolly',
  warm: 'cozy_dolly',
  intimate: 'cozy_dolly',
  soul_room: 'cozy_dolly',
  country: 'cozy_dolly',
  country_road: 'cozy_dolly',
});

/**
 * Normalize directive.styleLock / styleLook (string, or object with a
 * family/id/look field) into a lowercase id, or null if missing.
 */
export function readStyleLock(directive) {
  if (!directive || typeof directive !== 'object') return null;
  const raw =
    directive.styleLock ??
    directive.styleLook ??
    directive.styleFamily ??
    null;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') {
    const inner = raw.id || raw.family || raw.look || raw.style || raw.name || '';
    const s = String(inner).trim().toLowerCase();
    return s || null;
  }
  const s = String(raw).trim().toLowerCase();
  return s || null;
}

/** True when the director is still auditioning Auto (do not commit). */
export function isStylePending(directive) {
  return !!(directive && directive.stylePending);
}

/**
 * Map a director styleLock value to a camera profile.
 * Known ids/aliases → mapped profile; missing/unknown → fallback.
 */
export function profileForStyleLock(styleLock) {
  if (!styleLock) return CAMERA_STYLE_PROFILES[FALLBACK_PROFILE_ID];
  const key = String(styleLock).trim().toLowerCase();
  const id = STYLE_LOCK_TO_PROFILE[key];
  if (id && CAMERA_STYLE_PROFILES[id]) return CAMERA_STYLE_PROFILES[id];
  if (CAMERA_STYLE_PROFILES[key]) return CAMERA_STYLE_PROFILES[key];
  return CAMERA_STYLE_PROFILES[FALLBACK_PROFILE_ID];
}

/** True when the lock is one we have an explicit mapping for. */
export function isKnownStyleLock(styleLock) {
  if (!styleLock) return false;
  const key = String(styleLock).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(STYLE_LOCK_TO_PROFILE, key);
}

/** Deterministic FNV-1a 32-bit hash (kept for track-key helpers only). */
export function hashTrackSeed(seedStr) {
  const s = String(seedStr || 'default');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Derive stable track key from available audio / directive metadata.
 */
export function extractTrackKey(audio = null, directive = null, cast = null) {
  const raw =
    audio?.trackId ||
    audio?.songId ||
    audio?.title ||
    audio?.src ||
    directive?.trackId ||
    directive?.songId ||
    directive?.theme ||
    '';
  if (raw) return String(raw).trim();
  const concept = cast?.conceptId || '';
  return concept ? `concept:${concept}` : '';
}

/**
 * Resolve the camera profile that should be active for this frame.
 *
 * Follows the Scene Director lock when present and not pending.
 * Hash / vibe / genre picks are demoted: they do not choose a style when
 * a styleLock exists. With no lock (or an unknown value) the fallback is
 * always ethereal_float.
 *
 * Callers (CameraSystem) still own pending-hold / debounce / blend.
 */
export function pickCameraStyleProfile({
  directive = null,
  allowPending = false,
} = {}) {
  const pending = isStylePending(directive);
  if (pending && !allowPending) {
    return CAMERA_STYLE_PROFILES[FALLBACK_PROFILE_ID];
  }
  const explicit = directive?.cameraStyle || directive?.cameraProfile;
  if (explicit && CAMERA_STYLE_PROFILES[explicit]) {
    return CAMERA_STYLE_PROFILES[explicit];
  }
  const lock = readStyleLock(directive);
  return profileForStyleLock(lock);
}

/**
 * Constrain any Scene-requested camera mode to the locked profile's
 * compatible move subset so mid-song directives never swap camera language
 * except when the director style lock itself changes.
 */
export function constrainMode(profile, requestedMode) {
  const p = profile || CAMERA_STYLE_PROFILES[FALLBACK_PROFILE_ID];
  const raw = String(requestedMode || p.motion.defaultMove).toLowerCase();
  const mapped = p.motion.modeMap[raw] || raw;
  if (p.motion.allowedMoves.includes(mapped)) return mapped;
  return p.motion.defaultMove;
}
