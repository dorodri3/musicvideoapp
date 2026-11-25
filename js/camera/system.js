/**
 * CameraSystem — character-centric MV/film craft (CEO Direction Nov 24 2026).
 *
 * Rules:
 * 1. ONE visual style per video, FOLLOWING the Scene Director style lock
 *    (directive.styleLock / styleLook from Worlds styleFamilies.js). The
 *    camera does not pick its own style. While stylePending is true (auto
 *    intro, ≤~6s) the fallback profile is held and not committed. Once
 *    pending clears, the lock is committed once per track. Mid-song
 *    styleLock debounce remains as a harmless hold (style chips are being
 *    removed — do not rely on a chip-switch path). cozy is a sixth locked
 *    styleLock mapped to cozy_dolly.
 * 2. Character REACTS to the world instead of wandering (reactions.js):
 *    - NO tracking shots that follow aimless walking (lateral drift removed).
 *    - Reaction beats: detect directive.reaction (why !== 'idle', skip
 *      bounce/headbang) using gazeU/gazeV and `since` -> HOLD on figure
 *      (0.4–0.8s) -> PUSH/WHIP toward the gaze/focal -> RETURN to figure.
 *    - Slow push-ins on peaks (no random orbit spin arcs).
 * 3. Preserved craft:
 *    - Crosshair the cast through kick/drop, except sad+composition, which
 *      holds the figure at the composition edge (focalU/focalV) and leaves
 *      the empty/negative space empty — chaos must not recenter it.
 *    - Intimate foreground bias when cast is active (suppressed for sad+comp).
 *    - Shake = kick + drop ONLY. With composition, shake / whip / hit-dutch /
 *      fast push-ins scale with composition.intensity (low = calm, high =
 *      chaotic) times the profile chaos ceiling (dread_still most restrained;
 *      cozy_dolly shake 0 / dutch 0 at baseline, chaotic only at high I).
 *    - Dutch = tension-only, except heavy_evil which also allows dutch on hits
 *      (both intensity-scaled when composition is present). Loud sad may use
 *      composition.horizonTilt / tilt as roll; quiet sad has none.
 *    - Whip-pans re-crosshair / return to ONE readable focal (composition
 *      focalU/V, or reaction gaze, or cast) — never into empty frame.
 *    - motionMul scales travel amplitude and speed. No composition → current
 *      behavior (full profile grammar, no edge bias).
 *
 * API:
 *   setMode(mode)
 *   lockStyle(opts) / reset()
 *   getStyleProfile() / getReactionState() / getStyleSwitchCount() / isStyleCommitted() / getCompositionState()
 *   update(dt, audio, emotion, scaleMul=1, rolesIntent=null, cast=null, directive=null)
 *   apply(ctx, w, h, transform)
 */
import {
  biasTowardCenter,
  biasTowardPoint,
  castFraming,
  clampPunch,
  clampRotation,
  clampToCenter,
  clampZoomToRange,
  decayToward,
  smooth01,
} from './framing.js?v=mood4';
import {
  CAMERA_STYLE_PROFILES,
  FALLBACK_PROFILE_ID,
  constrainMode,
  extractTrackKey,
  isKnownStyleLock,
  isStylePending,
  pickCameraStyleProfile,
  profileForStyleLock,
  readStyleLock,
} from './styleProfile.js?v=mood4';
import {
  COMPOSITION_TILT_MAX,
  chaosAmount,
  compositionRestOffset,
  compositionTiltRad,
  effectiveShakeScales,
  intensityDrive,
  isSadComposition,
  pushIntensityScale,
  readComposition,
  sadReactionOffset,
  whipAmplitude,
  whipDirectionX,
} from './composition.js?v=mood4';

const STYLE_DEBOUNCE_SEC = 0.15;
const LENS_BLEND_SEC = 0.75;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function blendLens(fromProf, toProf, t) {
  const k = Math.max(0, Math.min(1, t));
  if (!fromProf || k >= 1) {
    return { lens: toProf.lens, motion: toProf.motion, shake: toProf.shake };
  }
  const fl = fromProf.lens;
  const tl = toProf.lens;
  const fm = fromProf.motion;
  const tm = toProf.motion;
  const fs = fromProf.shake;
  const ts = toProf.shake;
  return {
    lens: {
      baseZoom: lerp(fl.baseZoom, tl.baseZoom, k),
      zoomMin: lerp(fl.zoomMin, tl.zoomMin, k),
      zoomMax: lerp(fl.zoomMax, tl.zoomMax, k),
      zoomBreath: lerp(fl.zoomBreath, tl.zoomBreath, k),
      buildPushScale: lerp(fl.buildPushScale, tl.buildPushScale, k),
      chorusPullScale: lerp(fl.chorusPullScale || 0, tl.chorusPullScale || 0, k),
      chorusPushScale: lerp(fl.chorusPushScale || 0, tl.chorusPushScale || 0, k),
      peakPushScale: lerp(fl.peakPushScale, tl.peakPushScale, k),
    },
    motion: {
      ...tm,
      moveSpeed: lerp(fm.moveSpeed, tm.moveSpeed, k),
      easeRate: lerp(fm.easeRate, tm.easeRate, k),
      travelAmpY: lerp(fm.travelAmpY, tm.travelAmpY, k),
    },
    shake: {
      ...ts,
      kickScale: lerp(fs.kickScale || 0, ts.kickScale || 0, k),
      dropScale: lerp(fs.dropScale || 0, ts.dropScale || 0, k),
      dutchMax: lerp(fs.dutchMax || 0, ts.dutchMax || 0, k),
      whipSpeed: lerp(fs.whipSpeed, ts.whipSpeed, k),
      chaosKick: lerp(fs.chaosKick || 0, ts.chaosKick || 0, k),
      chaosDrop: lerp(fs.chaosDrop || 0, ts.chaosDrop || 0, k),
    },
  };
}
import { ReactionBeatTracker } from './reactions.js?v=mood4';

export class CameraSystem {
  constructor() {
    this._reactions = new ReactionBeatTracker();
    this.reset();
  }

  reset() {
    this.mode = 'drift';
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.rotation = 0;

    // Intentional mode pose (character framing) — separate from punch overlay
    this._mx = 0;
    this._my = 0;
    this._mZoom = 1;
    this._mRot = 0;

    // Kick/drop punch overlay (decays fast; clamped to crosshair)
    this.shakeAmp = 0;
    this._px = 0;
    this._py = 0;
    this._pRot = 0;

    // Drop gate / re-crosshair snap
    this._whipX = 0;
    this._whipY = 0;
    this._whipCooldown = 0;
    this._compState = null;
    this._prevDrop = 0;
    this._prevBuild = 0;
    this._prevEnergy = 0;

    // Cast placement bias (smoothed) + post-reaction/drop re-crosshair snap
    this._castY = 0;
    this._castZoom = 0;
    this._recrosshair = 0;

    // Slow peak push-in state
    this._peakPush = 0;

    // Style profile follows Scene Director styleLock (fallback until committed)
    this._styleProfile = CAMERA_STYLE_PROFILES[FALLBACK_PROFILE_ID];
    this._styleLocked = true;
    this._styleCommitted = false;
    this._committedLockKey = '';
    this._pendingCandidate = '';
    this._pendingHold = 0;
    this._styleSwitchCount = 0;
    this._lensFrom = null;
    this._lensBlendT = 1;
    this._hitDutch = 0;
    this._hitDutchSign = 1;
    this._lockedTrackKey = '';

    // Deterministic simulation clock + wall-gap show-restart detector
    this._simT = 0;
    this._lastWallMs = 0;

    this._reactions.reset();
  }

  /** Apply a target profile, optionally blending lens/zoom over LENS_BLEND_SEC. */
  _applyProfile(profile, lockKey, { countSwitch = false, snap = false } = {}) {
    const next = profile || CAMERA_STYLE_PROFILES[FALLBACK_PROFILE_ID];
    const same = this._styleProfile && this._styleProfile.id === next.id;
    if (!same) {
      this._lensFrom = snap ? null : this._styleProfile;
      this._lensBlendT = snap || !this._styleProfile ? 1 : 0;
      this._styleProfile = next;
    }
    this._styleLocked = true;
    if (lockKey != null && lockKey !== '') this._committedLockKey = lockKey;
    if (countSwitch && !same) this._styleSwitchCount += 1;
    return this._styleProfile;
  }

  _ensureFallback(snap = false) {
    if (!this._styleProfile || this._styleProfile.id !== FALLBACK_PROFILE_ID) {
      this._applyProfile(CAMERA_STYLE_PROFILES[FALLBACK_PROFILE_ID], '', { snap });
    }
    return this._styleProfile;
  }

  /**
   * Follow directive.styleLock / styleLook. Holds fallback while stylePending.
   * Commits once pending clears (not counted as a switch). Later lock value
   * changes debounce (~150ms) then switch once, blending lens 0.75s.
   */
  _followDirectorStyle(directive, dt) {
    const pending = isStylePending(directive);
    const lock = readStyleLock(directive);

    if (pending) {
      this._ensureFallback(this._simT < 0.05);
      this._styleCommitted = false;
      this._pendingCandidate = '';
      this._pendingHold = 0;
      return;
    }

    if (!lock || !isKnownStyleLock(lock)) {
      if (!this._styleCommitted) this._ensureFallback(this._simT < 0.05);
      this._pendingCandidate = '';
      this._pendingHold = 0;
      return;
    }

    const want = profileForStyleLock(lock);

    if (!this._styleCommitted) {
      // First director commit after pending (or on a ready lock) — not a switch
      this._applyProfile(want, lock, { countSwitch: false, snap: this._simT < 0.05 });
      this._styleCommitted = true;
      this._committedLockKey = lock;
      this._pendingCandidate = '';
      this._pendingHold = 0;
      return;
    }

    if (lock === this._committedLockKey) {
      this._pendingCandidate = '';
      this._pendingHold = 0;
      return;
    }

    if (this._pendingCandidate !== lock) {
      this._pendingCandidate = lock;
      this._pendingHold = 0;
      return;
    }
    this._pendingHold += dt;
    if (this._pendingHold >= STYLE_DEBOUNCE_SEC) {
      this._applyProfile(want, lock, { countSwitch: true, snap: false });
      this._committedLockKey = lock;
      this._pendingCandidate = '';
      this._pendingHold = 0;
    }
  }

  /** Explicitly lock from a directive (tests / callers). Does not snap mid-show. */
  lockStyle(opts = {}) {
    const trackKey = opts.trackKey ?? extractTrackKey(opts.audio, opts.directive, opts.cast);
    this._lockedTrackKey = trackKey || this._lockedTrackKey || '';
    if (opts.directive) {
      this._followDirectorStyle(opts.directive, 0);
      return this._styleProfile;
    }
    const profile = pickCameraStyleProfile({ directive: opts.directive });
    return this._applyProfile(profile, readStyleLock(opts.directive) || '', {
      countSwitch: false,
      snap: !!opts.snap,
    });
  }

  getStyleProfile() {
    return this._styleProfile;
  }

  getStyleSwitchCount() {
    return this._styleSwitchCount;
  }

  isStyleCommitted() {
    return !!this._styleCommitted;
  }

  getCommittedStyleLock() {
    return this._committedLockKey;
  }

  getReactionState() {
    return this._reactions.getState();
  }

  getCompositionState() {
    return (
      this._compState || {
        hasComp: false,
        chaos: 0,
        drive: 0,
        sad: false,
        restX: 0,
        restY: 0,
        kickScale: 0,
        dropScale: 0,
      }
    );
  }

  setMode(mode) {
    this.mode = mode || 'drift';
  }

  /**
   * @param {number} dt
   * @param {object} audio
   * @param {object} emotion
   * @param {number} [scaleMul=1]
   * @param {object|null} [rolesIntent=null]
   * @param {object|null} [cast=null] Scene Director cast; also rolesIntent.cast
   * @param {object|null} [directive=null] Optional Scene Director directive
   * @returns {{x,y,zoom,rotation}} transform to apply around center
   */
  update(
    dt,
    audio,
    emotion,
    scaleMul = 1,
    rolesIntent = null,
    cast = null,
    directive = null
  ) {
    const d = Math.max(0.001, Math.min(0.05, dt || 0.016));
    const wallMs = typeof performance !== 'undefined' ? performance.now() : 0;

    // Detect show exit/restart gap (>3s pause between renders) or track identity change
    const ri = rolesIntent || {};
    const castIn = cast ?? ri.cast ?? directive?.cast ?? directive?.characters ?? null;
    const trackKey = extractTrackKey(audio, directive, castIn);

    if (
      this._styleLocked &&
      this._lastWallMs > 0 &&
      wallMs > 0 &&
      wallMs - this._lastWallMs > 3000 &&
      this._simT > 0.25
    ) {
      this.reset();
    } else if (
      this._styleLocked &&
      trackKey &&
      this._lockedTrackKey &&
      trackKey !== this._lockedTrackKey
    ) {
      this.reset();
    }
    this._lastWallMs = wallMs;
    this._simT += d;
    const t = this._simT;

    if (trackKey && !this._lockedTrackKey) this._lockedTrackKey = trackKey;

    // Follow Scene Director styleLock (pending hold, debounce, mid-song chip tap)
    this._followDirectorStyle(directive, d);
    if (this._lensBlendT < 1) {
      this._lensBlendT = Math.min(1, this._lensBlendT + d / LENS_BLEND_SEC);
    }

    const profile = this._styleProfile || CAMERA_STYLE_PROFILES[FALLBACK_PROFILE_ID];
    const blended = blendLens(this._lensFrom, profile, this._lensBlendT);
    const lens = blended.lens;
    const motion = blended.motion;
    const shakeCfg = blended.shake;

    const comp = readComposition(directive);
    const hasComp = !!comp;
    const drive = hasComp ? intensityDrive(comp.intensity) : 1;
    const chaos = hasComp ? chaosAmount(comp.intensity, profile) : 1;
    const lockKey = this._committedLockKey || readStyleLock(directive) || '';
    const sadComp = isSadComposition(comp, lockKey);
    const rest = hasComp ? compositionRestOffset(comp, scaleMul) : { x: 0, y: 0 };
    const shakeEff = effectiveShakeScales(shakeCfg, chaos, hasComp);
    const pScale = pushIntensityScale(hasComp, hasComp ? drive : 1);
    const motionMul = hasComp ? comp.motionMul : 1;

    this._compState = {
      hasComp,
      chaos,
      drive: hasComp ? drive : 1,
      sad: sadComp,
      restX: rest.x,
      restY: rest.y,
      kickScale: shakeEff.kickScale,
      dropScale: shakeEff.dropScale,
      motionMul,
      intensity: hasComp ? comp.intensity : null,
    };

    const energy = audio?.energy || 0;
    const build = audio?.build || 0;
    const drop = audio?.drop || 0;
    const silence = !!audio?.silence;
    const aggression = emotion?.aggression || emotion?.tension || 0;
    const kick = (audio?.roles || audio?.instruments || {}).kick || 0;
    const shakeIntent = Math.max(ri.shake || 0, ri.kickPunch || 0);
    const cf = castFraming(castIn);

    const buildFalling = build < this._prevBuild - 0.02;
    const chorusOpen =
      energy > 0.55 && (build < 0.35 || buildFalling) && drop < 0.4;
    const intimate = !chorusOpen && energy < 0.4 && build < 0.45 && drop < 0.25;

    const darkHold =
      !chorusOpen &&
      Math.max(
        emotion?.sadness || 0,
        emotion?.darkness || 0,
        emotion?.melancholy || 0,
        emotion?.valence != null && emotion.valence < 0 ? -emotion.valence : 0
      );

    // Constrain requested section mode to locked profile's compatible move subset
    const mode = constrainMode(profile, this.mode);
    const soft = silence ? 0.35 : 1;
    const spd = motion.moveSpeed * motionMul;
    const ampY =
      motion.travelAmpY *
      soft *
      motionMul *
      (sadComp ? 0.22 : cf.active ? 0.45 : 1);

    // Base lens feel stays anchored to the locked profile (NO lateral tracking wander).
    // Composition rest places the figure at focalU/focalV when present.
    let x = rest.x;
    let y = rest.y;
    let zoom = lens.baseZoom;
    let rotation = 0;

    switch (mode) {
      case 'dolly':
      case 'slow_dolly': {
        const rate = (mode === 'slow_dolly' ? 0.14 : 0.22) * spd;
        zoom += Math.sin(t * rate) * lens.zoomBreath * scaleMul * soft;
        y = rest.y + Math.sin(t * 0.12 * spd) * ampY;
        break;
      }
      case 'push': {
        zoom +=
          (0.028 +
            smooth01(build) * lens.buildPushScale * 0.7 * pScale +
            (intimate ? 0.015 : 0)) *
          scaleMul;
        zoom += Math.sin(t * 0.28 * spd) * lens.zoomBreath * 0.6 * soft;
        y = rest.y + Math.sin(t * 0.1 * spd) * ampY * 0.65;
        break;
      }
      case 'pull': {
        const pullAmt = cf.active ? lens.chorusPullScale * 0.35 : lens.chorusPullScale;
        zoom -= (0.02 + (chorusOpen ? pullAmt * smooth01(energy) : 0)) * scaleMul;
        zoom += Math.sin(t * 0.12 * spd) * lens.zoomBreath * 0.7 * soft;
        y = rest.y + Math.cos(t * 0.1 * spd) * ampY * 0.7;
        break;
      }
      case 'crane': {
        y = rest.y + Math.sin(t * 0.14 * spd) * ampY * 1.25;
        zoom += (chorusOpen && !cf.active ? -0.015 : intimate ? 0.015 : 0) * scaleMul;
        zoom += Math.sin(t * 0.14 * spd) * lens.zoomBreath * 0.6 * soft;
        break;
      }
      case 'dutch': {
        // Tension-only dutch, capped by locked profile (intensity-scaled when composition present)
        const tense = Math.max(smooth01(build), aggression);
        if (!chorusOpen && tense >= 0.2 && shakeEff.dutchMax > 0) {
          rotation =
            Math.sin(t * 0.28 * spd) * shakeEff.dutchMax * 0.65 * tense +
            aggression * shakeEff.dutchMax * 0.35;
        }
        y = rest.y + Math.sin(t * 0.12 * spd) * ampY * 0.75;
        zoom += Math.sin(t * 0.16 * spd) * lens.zoomBreath * 0.6 * soft;
        break;
      }
      case 'shake': {
        y = rest.y + Math.cos(t * 0.15 * spd) * ampY * 0.5;
        zoom += Math.sin(t * 0.15 * spd) * lens.zoomBreath * 0.5 * soft;
        break;
      }
      case 'whip': {
        y = rest.y + Math.sin(t * 0.1 * spd) * ampY * 0.4;
        break;
      }
      case 'drift':
      default: {
        y = rest.y + Math.cos(t * 0.11 * spd) * ampY * 0.9;
        zoom += Math.sin(t * 0.11 * spd) * lens.zoomBreath * soft;
        break;
      }
    }

    // heavy_evil: dutch allowed on kick/drop hits (in addition to tension dutch)
    if (shakeCfg.dutchOnHits && shakeEff.dutchMax > 0) {
      const hit = Math.max(kick > 0.5 ? kick : 0, drop > 0.45 ? drop : 0);
      if (hit > 0 && Math.abs(this._hitDutch) < 0.002) {
        this._hitDutchSign = this._hitDutchSign === 1 ? -1 : 1;
      }
      const target =
        hit > 0 ? shakeEff.dutchMax * Math.min(1, hit) * this._hitDutchSign : 0;
      this._hitDutch = decayToward(this._hitDutch, target, hit > 0 ? 18 : 8, d);
      rotation += this._hitDutch;
    } else {
      this._hitDutch = decayToward(this._hitDutch, 0, 10, d);
    }

    // Loud sad may use composition.horizonTilt / tilt as roll; quiet sad has none.
    const tiltRad = compositionTiltRad(comp, { sad: sadComp });
    if (tiltRad) rotation += tiltRad;

    // --- Section & Peak dynamics WITHIN locked profile ---
    const buildPush =
      Math.pow(smooth01(build), 1.35) * lens.buildPushScale * scaleMul * pScale;
    const versePush = intimate ? 0.022 * scaleMul : 0;
    const darkPush = darkHold > 0.25 ? 0.018 * scaleMul * smooth01(darkHold) : 0;
    const chorusPull =
      chorusOpen && !cf.active && !(lens.chorusPushScale > 0)
        ? lens.chorusPullScale * scaleMul * smooth01(energy) * 0.7
        : 0;
    // cozy_dolly: soft chorus push-in (gentle, not punchy)
    const chorusPush =
      chorusOpen && (lens.chorusPushScale || 0) > 0
        ? lens.chorusPushScale * scaleMul * (0.55 + 0.45 * (hasComp ? drive : 1))
        : 0;

    // Push-ins on peaks: with composition, amount + ease scale with intensity
    // (low I = calm/small, high I = faster/stronger push-ins)
    const peakLive =
      !silence && (chorusOpen || energy > 0.65 || build > 0.68 || drop > 0.5);
    const peakStrength = Math.max(energy, build, drop);
    const peakTarget = peakLive
      ? lens.peakPushScale *
        scaleMul *
        Math.max(0.55, Math.min(1, peakStrength)) *
        pScale
      : 0;
    const peakEase = peakLive
      ? hasComp
        ? 1.1 + 5.0 * drive
        : 1.35
      : hasComp
        ? 2.1 + 2.0 * drive
        : 2.1;
    this._peakPush = decayToward(this._peakPush, peakTarget, peakEase, d);

    zoom += buildPush + versePush + darkPush + this._peakPush - chorusPull + chorusPush;

    // --- Cast placement + intimate foreground bias (suppressed for sad+composition) ---
    if (cf.active && !sadComp) {
      this._castY = decayToward(this._castY, cf.yBias * soft, 7, d);
      this._castZoom = decayToward(this._castZoom, cf.zoomBias * scaleMul, 7, d);
      zoom += this._castZoom;
      y = rest.y + this._castY + (y - rest.y) * 0.28;
    } else {
      this._castY = decayToward(this._castY, 0, 6, d);
      this._castZoom = decayToward(this._castZoom, 0, 6, d);
    }

    // --- World Reaction Beat: HOLD on figure -> PUSH/WHIP to event -> RETURN ---
    const rx = this._reactions.update(d, {
      directive,
      cast: castIn,
      rolesIntent: ri,
      audio,
      profile,
      scaleMul,
    });

    if (rx.active) {
      if (sadComp) {
        // Keep the figure at its edge; only a subtle gaze push that stays off-center.
        if (rx.phase === 'hold') {
          x = rest.x;
          y = rest.y;
          zoom += rx.zoomDelta * 0.35;
        } else {
          const kept = sadReactionOffset(rest, {
            x: rx.offsetX,
            y: rx.offsetY,
          });
          x = kept.x;
          y = kept.y;
          zoom += rx.zoomDelta * 0.35;
        }
      } else if (rx.phase === 'hold') {
        x = rest.x;
        y = cf.active ? rest.y + this._castY : rest.y + (y - rest.y) * 0.3;
        zoom += rx.zoomDelta;
      } else {
        // Push toward event/focal, then ease back to the rest focal (not empty frame)
        x = rest.x + rx.offsetX;
        y = cf.active
          ? rest.y + this._castY * (1 - rx.eventWeight) + rx.offsetY
          : y * (1 - rx.eventWeight) + rx.offsetY;
        zoom += rx.zoomDelta;
      }
      if (rx.recrosshairTrigger) {
        this._recrosshair = Math.max(this._recrosshair, 0.45);
      }
    }

    // Smooth intentional pose toward targets
    const ease =
      rx.phase === 'push_to_event'
        ? shakeCfg.whipSpeed
        : rx.phase === 'hold'
          ? Math.max(8, motion.easeRate * 1.6)
          : motion.easeRate;
    this._mx = decayToward(this._mx, x, ease, d);
    this._my = decayToward(this._my, y, ease, d);
    this._mZoom = decayToward(this._mZoom, zoom, Math.min(ease, 9), d);

    const rotEase = chorusOpen || (build < 0.25 && aggression < 0.25) ? 10 : 5;
    this._mRot = decayToward(this._mRot, rotation, rotEase, d);

    // --- Intensity whip-pans (composition only): fire on drop, return to rest focal ---
    this._whipCooldown = Math.max(0, this._whipCooldown - d);
    const dropPulse = drop > 0.55 && this._prevDrop < 0.4;
    const whipAmp = whipAmplitude(shakeCfg, chaos, hasComp);
    if (hasComp && dropPulse && this._whipCooldown <= 0 && whipAmp > 1.2 && !rx.active) {
      const dir = whipDirectionX(comp, rest.x);
      this._whipX = dir * whipAmp;
      this._whipY = 0;
      this._whipCooldown = 0.7;
      this._recrosshair = 0.55;
    } else if (
      !hasComp &&
      dropPulse &&
      this._whipCooldown <= 0 &&
      shakeCfg.dropScale > 0.25 &&
      !rx.active
    ) {
      // No-composition fallback: re-crosshair only, no lateral whip into empty space
      this._whipX = 0;
      this._whipY = 0;
      this._whipCooldown = 0.75;
      this._recrosshair = 0.45;
    }
    const whipSettle = hasComp ? Math.max(4.2, (shakeCfg.whipSpeed || 8) * 0.45) : 5.5;
    this._whipX = decayToward(this._whipX, 0, whipSettle, d);
    this._whipY = decayToward(this._whipY, 0, whipSettle, d);
    this._recrosshair = Math.max(0, this._recrosshair - d);

    // --- Punch shake overlay (kick + drop ONLY — intensity-scaled when composition present) ---
    const shakeMul =
      (cf.active ? cf.shakeMul : 1) * (rx.active ? rx.shakeDamp : 1);
    let punchFuel = 0;
    if (kick > 0.55 && shakeEff.kickScale > 0) {
      punchFuel = Math.max(
        punchFuel,
        kick * 9 * shakeEff.kickScale * (1 + shakeIntent * 0.35)
      );
    }
    if (drop > 0.5 && shakeEff.dropScale > 0) {
      punchFuel = Math.max(punchFuel, drop * 11 * shakeEff.dropScale);
    }
    if (
      shakeIntent > 0.55 &&
      (kick > 0.4 || drop > 0.35) &&
      shakeEff.kickScale > 0
    ) {
      punchFuel = Math.max(punchFuel, shakeIntent * 9 * shakeEff.kickScale);
    }
    if (audio?.beat && (kick > 0.45 || drop > 0.4) && shakeEff.kickScale > 0) {
      punchFuel = Math.max(punchFuel, 4.5 * shakeEff.kickScale);
      this._mZoom += 0.008 * shakeEff.kickScale * scaleMul;
    }
    punchFuel *= shakeMul;
    if (punchFuel > this.shakeAmp) this.shakeAmp = punchFuel;

    if (this.shakeAmp > 0.4) {
      const amp = this.shakeAmp;
      this._px = (Math.random() - 0.5) * amp * 0.55;
      this._py = (Math.random() - 0.5) * amp * 0.4;
      this._pRot =
        shakeEff.kickScale > 0
          ? (Math.random() - 0.5) * 0.007 * Math.min(amp, 12) * shakeEff.kickScale
          : 0;
      this.shakeAmp *= Math.exp(-10 * d);
    } else {
      this.shakeAmp = 0;
      this._px = decayToward(this._px, 0, 18, d);
      this._py = decayToward(this._py, 0, 18, d);
      this._pRot = decayToward(this._pRot, 0, 18, d);
    }

    const punch = clampPunch(this._px, this._py);

    // Compose: intentional framing + whip excursion + punch overlay
    let outX = this._mx + this._whipX + punch.x;
    let outY = this._my + this._whipY + punch.y;
    let outZoom = this._mZoom;
    let outRot = this._mRot + this._pRot;

    // Re-crosshair / return to ONE readable rest focal (composition, gaze rest, or center)
    const reSnap =
      this._recrosshair > 0 ? 0.55 + 0.35 * (this._recrosshair / 0.45) : 0;
    if (reSnap > 0 && rx.eventWeight < 0.1) {
      const targetX = rest.x;
      const targetY = sadComp
        ? rest.y
        : cf.active
          ? rest.y + this._castY
          : rest.y;
      outX = outX * (1 - reSnap * 0.7) + targetX * (reSnap * 0.7);
      outY = outY * (1 - reSnap * 0.7) + targetY * (reSnap * 0.7);
    }

    if (sadComp) {
      // Hold the figure at the edge; never bias back to center, even at high intensity
      const biased = biasTowardPoint(outX, outY, rest.x, rest.y, 0.28);
      const clamped = clampToCenter(biased.x, biased.y, scaleMul, 0.2);
      outX = clamped.x;
      outY = clamped.y;
    } else {
      const baseBias = cf.active ? 0.34 + reSnap * 0.32 : 0.18 + reSnap * 0.22;
      const centerBias =
        rx.eventWeight > 0.02
          ? baseBias * (1 - rx.eventWeight * 0.85)
          : baseBias;
      const toward =
        hasComp && (Math.abs(rest.x) > 0.4 || Math.abs(rest.y) > 0.4)
          ? biasTowardPoint(outX, outY, rest.x, rest.y, centerBias)
          : biasTowardCenter(outX, outY, centerBias);
      const clamped = clampToCenter(toward.x, toward.y, scaleMul, rx.eventWeight);
      outX = clamped.x;
      outY = clamped.y;
    }

    outZoom = clampZoomToRange(outZoom, lens.zoomMin, lens.zoomMax);
    const rotCap = Math.max(
      shakeEff.dutchMax,
      shakeEff.kickScale > 0 ? 0.015 * shakeEff.kickScale : 0,
      tiltRad ? Math.abs(tiltRad) : 0
    );
    outRot = clampRotation(outRot, rotCap, {
      hardCap: tiltRad ? COMPOSITION_TILT_MAX : undefined,
    });

    this._prevDrop = drop;
    this._prevBuild = build;
    this._prevEnergy = energy;

    this.x = outX;
    this.y = outY;
    this.zoom = outZoom;
    this.rotation = outRot;
    return { x: outX, y: outY, zoom: outZoom, rotation: outRot };
  }

  apply(ctx, w, h, transform) {
    const { x, y, zoom, rotation } = transform || this;
    ctx.translate(w / 2 + x, h / 2 + y);
    ctx.rotate(rotation);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);
  }
}
