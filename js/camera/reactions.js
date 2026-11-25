/**
 * Camera Reaction Beat System (CEO Rule 2, Nov 24 2026):
 * Character REACTS to the world instead of wandering.
 *
 * Beat sequence:
 *   detect event/reaction -> HOLD on figure (0.4-0.8s)
 *   -> PUSH / WHIP toward event or focal position
 *   -> RETURN smoothly to figure crosshair.
 *
 * Scene Director contract (v2-scene-20261124-214348-auto5-kit-react):
 *   directive.reaction = {
 *     verb, target, gazeU, gazeV, strength, since, until, why, locomotion
 *   }
 *   directive.focal = { u, v, x, y, target, why }  // x/y alias of u/v
 *
 * Gaze convention (plate / screen, from js/director/reaction.js):
 *   u, v in 0..1; (0,0) = top-left, v increases downward.
 *   Camera offset: x = (0.5 - u) * spanX  (look right → negative x)
 *                  y = (0.5 - v) * spanY  (look up / small v → positive y)
 *
 * Rules:
 *   - Push only when why !== 'idle'
 *   - Skip beat verbs 'bounce' and 'headbang' (no reaction beat)
 *   - A new `since` (or since+verb) starts a beat; the same `since` never retriggers
 *   - Use gazeU/gazeV as the push target; fall back to directive.focal when
 *     there is no gaze, also requiring why !== 'idle'
 *
 * Per-style verbs (director reaction.js STYLE):
 *   horror: still_breath, slow_head_turn, freeze, step_back, lift_lantern, startle
 *   cinematic: watch_vista, look_up, look_toward, turn, brace, shield_eyes, raise_arms
 *   sad: head_low, gaze, look_down, look_toward_light, lift_head, hold_memory
 *   candy_pop: bounce (SKIP), wave, point_up, dance
 *   ember_wasteland: defiant, scan, turn, brace, raise_fists, step_back, headbang (SKIP)
 */

import { smooth01 } from './framing.js?v=mood4';

/** Normalized (u, v) screen/plate defaults (0,0 = top-left, 0.5,0.5 = center). */
export const EVENT_DEFAULT_TARGETS = Object.freeze({
  lightning: Object.freeze({ u: 0.62, v: 0.14 }),
  sky_tear: Object.freeze({ u: 0.54, v: 0.18 }),
  white_flash: Object.freeze({ u: 0.52, v: 0.2 }),
  flash: Object.freeze({ u: 0.52, v: 0.22 }),
  birds: Object.freeze({ u: 0.68, v: 0.15 }),
  crows: Object.freeze({ u: 0.66, v: 0.16 }),
  stars: Object.freeze({ u: 0.55, v: 0.14 }),
  clouds: Object.freeze({ u: 0.5, v: 0.18 }),
  snowfall: Object.freeze({ u: 0.45, v: 0.2 }),
  stair_top: Object.freeze({ u: 0.55, v: 0.12 }),
  fire: Object.freeze({ u: 0.58, v: 0.54 }),
  furnace: Object.freeze({ u: 0.5, v: 0.42 }),
  water: Object.freeze({ u: 0.5, v: 0.66 }),
  horizon: Object.freeze({ u: 0.5, v: 0.42 }),
  neon_sign: Object.freeze({ u: 0.7, v: 0.34 }),
  skyline: Object.freeze({ u: 0.6, v: 0.3 }),
  altar_light: Object.freeze({ u: 0.5, v: 0.28 }),
  monolith: Object.freeze({ u: 0.6, v: 0.35 }),
  void_core: Object.freeze({ u: 0.5, v: 0.38 }),
  vanishing_point: Object.freeze({ u: 0.5, v: 0.46 }),
  focal_point: Object.freeze({ u: 0.56, v: 0.36 }),
  focal: Object.freeze({ u: 0.56, v: 0.36 }),
  collapse: Object.freeze({ u: 0.5, v: 0.34 }),
  blackout: Object.freeze({ u: 0.5, v: 0.32 }),
  look_up: Object.freeze({ u: 0.54, v: 0.18 }),
  turn: Object.freeze({ u: 0.64, v: 0.26 }),
  raise_arms: Object.freeze({ u: 0.5, v: 0.24 }),
  rise: Object.freeze({ u: 0.5, v: 0.24 }),
  brace: Object.freeze({ u: 0.56, v: 0.32 }),
  step_back: Object.freeze({ u: 0.58, v: 0.48 }),
  kneel: Object.freeze({ u: 0.5, v: 0.68 }),
});

const WORLD_REACTION_EVENTS = new Set([
  'sky_tear',
  'lightning',
  'birds',
  'crows',
  'white_flash',
  'flash',
  'collapse',
  'blackout',
  'focal',
]);

/** Beat verbs that must never start a camera reaction cutaway. */
export const SKIP_REACTION_VERBS = Object.freeze(['bounce', 'headbang']);
const SKIP_VERBS = new Set(SKIP_REACTION_VERBS);

const ACTION_TRIGGERS = new Set(['look_up', 'kneel', 'rise']);

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function isIdleWhy(why) {
  return String(why || '').toLowerCase() === 'idle';
}

/**
 * Read u/v from a reaction/focal-shaped object.
 * Prefers gazeU/gazeV, then top-level u/v, then x/y (director focal aliases
 * of the same 0..1 plate coords), then target:{u,v}|{x,y}|[u,v].
 */
export function normalizeTargetUV(reaction, kind) {
  const readXY = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (Number.isFinite(obj.gazeU) && Number.isFinite(obj.gazeV)) {
      return { u: clamp01(obj.gazeU), v: clamp01(obj.gazeV), hasExplicitPos: true };
    }
    if (Number.isFinite(obj.u) && Number.isFinite(obj.v)) {
      return { u: clamp01(obj.u), v: clamp01(obj.v), hasExplicitPos: true };
    }
    if (Number.isFinite(obj.x) && Number.isFinite(obj.y)) {
      const tx = obj.x;
      const ty = obj.y;
      // Director focal sets x=gazeU, y=gazeV already in 0..1
      if (tx >= 0 && tx <= 1 && ty >= 0 && ty <= 1) {
        return { u: tx, v: ty, hasExplicitPos: true };
      }
      if (tx >= -1 && tx <= 1 && ty >= -1 && ty <= 1) {
        return { u: clamp01(0.5 + tx * 0.5), v: clamp01(0.5 + ty * 0.5), hasExplicitPos: true };
      }
      return { u: clamp01(tx / 430), v: clamp01(ty / 760), hasExplicitPos: true };
    }
    return null;
  };

  const fromSelf = readXY(reaction);
  if (fromSelf) return fromSelf;

  const tgt = reaction?.target;
  if (Array.isArray(tgt) && tgt.length >= 2 && Number.isFinite(tgt[0]) && Number.isFinite(tgt[1])) {
    return { u: clamp01(tgt[0]), v: clamp01(tgt[1]), hasExplicitPos: true };
  }
  const fromTgt = readXY(tgt);
  if (fromTgt) return fromTgt;

  const key = String(kind || '').toLowerCase();
  const def = EVENT_DEFAULT_TARGETS[key] || EVENT_DEFAULT_TARGETS.focal_point;
  return { u: def.u, v: def.v, hasExplicitPos: false };
}

/**
 * Map plate/screen gaze (u,v 0..1, v down) to CameraSystem apply() offsets.
 * +x shifts the world right (camera looks left); +y shifts the world down
 * (camera looks up). So a target at u>0.5 (right) yields negative x, and a
 * target at v<0.5 (upper frame / sky) yields positive y.
 */
export function gazeToCameraOffset(u, v, scaleMul = 1) {
  const spanX = 34 * (scaleMul || 1);
  const spanY = 26 * (scaleMul || 1);
  return {
    x: (0.5 - clamp01(u)) * spanX,
    y: (0.5 - clamp01(v)) * spanY,
  };
}

/**
 * Inspect directive / cast / rolesIntent / audio / __LS_AGENTS__ for a
 * newly-triggered world reaction or cast reaction event.
 * Returns null if no reaction signal is present (idle, bounce, headbang).
 */
export function resolveReactionSignal({
  directive = null,
  cast = null,
  rolesIntent = null,
  audio = null,
  prevCastAction = '',
  prevBirdsFlying = false,
} = {}) {
  let skippedBeat = false;
  const r = directive?.reaction ?? cast?.reaction ?? rolesIntent?.reaction ?? null;
  if (r && typeof r === 'object') {
    const verb = String(r.verb || r.kind || '').toLowerCase();
    const why = String(r.why || '').toLowerCase();
    const tgtName =
      typeof r.target === 'string'
        ? r.target.toLowerCase()
        : String(r.kind || verb || 'focal_point').toLowerCase();
    if (isIdleWhy(why) || verb === 'idle' || verb === 'idle_sway') {
      // Ambient idle pose — no camera cutaway. Focal from the same idle tick is also skipped.
    } else if (SKIP_VERBS.has(verb)) {
      skippedBeat = true;
    } else {
      const uv = normalizeTargetUV(r, tgtName || verb);
      const strength = Number.isFinite(r.strength) ? clamp01(r.strength) : 0.75;
      const stamp = r.since ?? r.t ?? '';
      return {
        key: `rx|${stamp}|${verb}`,
        since: r.since ?? r.t ?? null,
        kind: tgtName || verb || 'focal_point',
        verb: verb || 'look_toward',
        why: why || r.why || '',
        u: uv.u,
        v: uv.v,
        strength,
        hasExplicitPos: uv.hasExplicitPos,
        source: 'directive.reaction',
      };
    }
  }

  const focal = directive?.focal ?? cast?.focal ?? rolesIntent?.focal ?? null;
  if (!skippedBeat && focal && typeof focal === 'object' && !isIdleWhy(focal.why)) {
    const kind = String(focal.target || focal.kind || 'focal_point').toLowerCase();
    const uv = normalizeTargetUV(focal, kind);
    const stamp = focal.since ?? focal.t ?? '';
    return {
      key: `focal|${stamp}|${kind}`,
      since: focal.since ?? focal.t ?? null,
      kind,
      verb: 'look_toward',
      why: String(focal.why || ''),
      u: uv.u,
      v: uv.v,
      strength: Number.isFinite(focal.strength) ? clamp01(focal.strength) : 0.7,
      hasExplicitPos: uv.hasExplicitPos,
      source: 'directive.focal',
    };
  }

  const events = directive?.events ?? rolesIntent?.events ?? null;
  if (Array.isArray(events) && events.length) {
    for (const rawEv of events) {
      const ev = String(rawEv || '').toLowerCase();
      if (!WORLD_REACTION_EVENTS.has(ev)) continue;
      const uv = normalizeTargetUV(null, ev);
      const strength = ev === 'collapse' || ev === 'sky_tear' || ev === 'lightning' ? 0.9 : 0.78;
      return {
        key: `ev|${ev}`,
        since: null,
        kind: ev,
        verb: ev === 'sky_tear' || ev === 'lightning' || ev === 'birds' ? 'look_up' : 'turn',
        why: ev,
        u: uv.u,
        v: uv.v,
        strength,
        hasExplicitPos: false,
        source: 'directive.events',
      };
    }
  }

  const action = String(cast?.action || '').toLowerCase();
  if (action && action !== prevCastAction && ACTION_TRIGGERS.has(action)) {
    const uv = normalizeTargetUV(null, action);
    return {
      key: `act|${action}|${cast?.conceptId || ''}`,
      since: null,
      kind: action,
      verb: action,
      why: 'cast.action',
      u: uv.u,
      v: uv.v,
      strength: 0.65,
      hasExplicitPos: false,
      source: 'cast.action',
    };
  }

  try {
    const agents = typeof globalThis !== 'undefined' ? globalThis.__LS_AGENTS__ : null;
    if (agents) {
      const flying = !!agents.animals?.flying;
      if (flying && !prevBirdsFlying) {
        const uv = normalizeTargetUV(null, 'birds');
        return {
          key: `agent|birds|${agents.animals?.agent || 'birds'}`,
          since: null,
          kind: agents.animals?.agent || 'birds',
          verb: 'look_up',
          why: 'fauna',
          u: uv.u,
          v: uv.v,
          strength: 0.6,
          hasExplicitPos: false,
          source: '__LS_AGENTS__.animals',
        };
      }
      if (
        agents.guitarSynth?.agent === 'lightning' &&
        (agents.guitarSynth.lv > 0.55 || (audio?.onset || 0) > 0.65)
      ) {
        const uv = normalizeTargetUV(null, 'lightning');
        return {
          key: 'agent|lightning',
          since: null,
          kind: 'lightning',
          verb: 'look_up',
          why: 'lightning',
          u: uv.u,
          v: uv.v,
          strength: 0.8,
          hasExplicitPos: false,
          source: '__LS_AGENTS__.lightning',
        };
      }
    }
  } catch (_) {
    /* optional global */
  }

  return null;
}

/**
 * Stateful 3-phase reaction beat tracker driven by simulation dt.
 * Phases: idle -> hold (0.4-0.8s on figure) -> push_to_event -> return -> idle
 */
export class ReactionBeatTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.phase = 'idle'; // 'idle' | 'hold' | 'push_to_event' | 'return'
    this.phaseT = 0;
    this.cooldown = 0;
    this.kind = null;
    this.verb = null;
    this.source = null;
    this.u = 0.5;
    this.v = 0.5;
    this.strength = 0;
    this.holdSec = 0.55;
    this.pushSec = 0.75;
    this.returnSec = 0.65;
    this.pushZoom = 0.06;
    this._lastKey = '';
    this._lastKeyAge = 999;
    this._lastSince = null;
    this._lastVerb = null;
    this._prevCastAction = '';
    this._prevBirdsFlying = false;
  }

  /**
   * Advance reaction state by `dt` seconds and return camera weights/offsets.
   *
   * @param {number} dt
   * @param {object} inputs { directive, cast, rolesIntent, audio, profile, scaleMul }
   */
  update(dt, inputs = {}) {
    const d = Math.max(0.001, Math.min(0.05, dt || 0.016));
    const profile = inputs.profile;
    const rxCfg = profile?.reaction || {
      holdSec: 0.55,
      pushSec: 0.75,
      returnSec: 0.65,
      cooldownSec: 3.5,
      pushZoom: 0.06,
    };

    this.cooldown = Math.max(0, this.cooldown - d);
    this._lastKeyAge += d;

    let birdsFlying = false;
    try {
      birdsFlying = !!(
        typeof globalThis !== 'undefined' && globalThis.__LS_AGENTS__?.animals?.flying
      );
    } catch (_) {
      birdsFlying = false;
    }

    const sig = resolveReactionSignal({
      directive: inputs.directive,
      cast: inputs.cast,
      rolesIntent: inputs.rolesIntent,
      audio: inputs.audio,
      prevCastAction: this._prevCastAction,
      prevBirdsFlying: this._prevBirdsFlying,
    });

    this._prevCastAction = String(inputs.cast?.action || '').toLowerCase();
    this._prevBirdsFlying = birdsFlying;

    if (sig) {
      // A new `since` (or since+verb) starts a beat. The same `since` never
      // retriggers, even after the previous beat has returned to idle.
      const sameSince =
        sig.since != null &&
        this._lastSince != null &&
        sig.since === this._lastSince &&
        (sig.verb || '') === (this._lastVerb || '');
      const isNewKey = !sameSince && (
        sig.key !== this._lastKey ||
        (sig.source === 'directive.events' && this._lastKeyAge > 1.2)
      );
      const fromIdle = this.phase === 'idle' && (this.cooldown <= 0 || sig.since != null || sig.strength >= 0.88);
      const fromReturn = this.phase === 'return' && sig.strength >= 0.88;
      if (!sameSince && isNewKey && (fromIdle || fromReturn || this._lastSince == null)) {
        this._lastKey = sig.key;
        this._lastKeyAge = 0;
        this._lastSince = sig.since ?? this._lastSince;
        this._lastVerb = sig.verb || null;
        this.phase = 'hold';
        this.phaseT = 0;
        this.kind = sig.kind;
        this.verb = sig.verb;
        this.source = sig.source;
        this.u = sig.u;
        this.v = sig.v;
        this.strength = sig.strength;
        // Clamp hold duration strictly to 0.4s..0.8s per direction
        this.holdSec = Math.max(0.4, Math.min(0.8, rxCfg.holdSec));
        this.pushSec = Math.max(0.45, rxCfg.pushSec);
        this.returnSec = Math.max(0.4, rxCfg.returnSec);
        this.pushZoom = rxCfg.pushZoom * (0.75 + 0.35 * sig.strength);
        this.cooldown = rxCfg.cooldownSec;
      }
    }

    // Advance active phase
    if (this.phase !== 'idle') {
      this.phaseT += d;
      if (this.phase === 'hold' && this.phaseT >= this.holdSec) {
        this.phase = 'push_to_event';
        this.phaseT = 0;
      } else if (this.phase === 'push_to_event' && this.phaseT >= this.pushSec) {
        this.phase = 'return';
        this.phaseT = 0;
      } else if (this.phase === 'return' && this.phaseT >= this.returnSec) {
        this.phase = 'idle';
        this.phaseT = 0;
      }
    }

    // Compute normalized weights and screen-space pan offset (Canvas2D apply sign:
    // +x shifts world right → camera looks left; +y shifts world down → camera looks up).
    const scaleMul = inputs.scaleMul || 1;
    const { x: targetDx, y: targetDy } = gazeToCameraOffset(this.u, this.v, scaleMul);

    let holdWeight = 0;
    let eventWeight = 0;
    let zoomDelta = 0;
    let shakeDamp = 1;
    let recrosshairTrigger = false;

    if (this.phase === 'hold') {
      const p = smooth01(this.phaseT / Math.max(0.01, this.holdSec));
      holdWeight = 1;
      eventWeight = 0;
      zoomDelta = 0.022 * p * scaleMul;
      shakeDamp = 0.35; // steady frame while character notices event
    } else if (this.phase === 'push_to_event') {
      const p = smooth01(this.phaseT / Math.max(0.01, this.pushSec));
      holdWeight = 1 - p;
      eventWeight = p;
      zoomDelta = (0.022 + (this.pushZoom - 0.022) * p) * scaleMul;
      shakeDamp = 0.55;
    } else if (this.phase === 'return') {
      const p = smooth01(this.phaseT / Math.max(0.01, this.returnSec));
      holdWeight = p;
      eventWeight = 1 - p;
      zoomDelta = this.pushZoom * (1 - p) * scaleMul;
      shakeDamp = 0.7 + 0.3 * p;
      if (this.phaseT <= d * 1.5) recrosshairTrigger = true;
    }

    return {
      active: this.phase !== 'idle',
      phase: this.phase,
      kind: this.kind,
      verb: this.verb,
      source: this.source,
      u: this.u,
      v: this.v,
      holdWeight,
      eventWeight,
      offsetX: targetDx * eventWeight,
      offsetY: targetDy * eventWeight,
      zoomDelta,
      shakeDamp,
      recrosshairTrigger,
    };
  }

  getState() {
    return {
      phase: this.phase,
      phaseT: +this.phaseT.toFixed(3),
      cooldown: +this.cooldown.toFixed(3),
      kind: this.kind,
      verb: this.verb,
      source: this.source,
      since: this._lastSince,
      u: this.u,
      v: this.v,
    };
  }
}
