/**
 * CameraSystem — character-centric MV/film craft (MUSIC-BRIEF camera slice).
 *
 * Contract (MUSIC-BRIEF-20260924-2118 supersedes/tightens 2115;
 *           MUSIC-BRIEF-20260924-2122 psych + Scene Director cast framing):
 * 1. Always crosshair the human (Fury Road) THROUGH kick shake / drop —
 *    punch overlays center; never throws silhouette off LED mid.
 * 2. Verse = tighter on figure (intimate zoom). Chorus = pull back for
 *    formation / world open (ease zoom out on high energy + build fall /
 *    section intensity — not only when build falls).
 * 3. Push-in tracks audio.build (0→1) — anticipation earns chorus pull-back
 *    reward (2122 psych); dutch only when world is tense (build high /
 *    emotion.aggression); clear dutch on chorus resolve / release.
 * 4. Shake = kick amplitude + drop burst ONLY (fast decay) — groove pulse,
 *    not startle spam. Mode 'shake' with low kick/drop/rolesIntent.shake
 *    → gentle drift (stable character).
 * 5. Drift/float soft in verse & breakdown; modest zoom; no wild rotation.
 * 6. Whip / hard reframe only at section gates (mode whip or drop pulse):
 *    brief lateral snap toward a wall/sign plane, then ease back to center.
 *    After startle/whip: re-crosshair human immediately (snap bias to cast).
 * 7. Quiet verse → slight push intimacy; huge energy → open/pull — don't
 *    fight abstract LED with chaos cinema. Lyrics stay readable.
 * 8. Cast framing (directive.cast / characters): placement sky|mid|foreground
 *    HOLD: when cast active → bias toward foreground intimate push-in; lock crosshair.
 *    + character scale (lone / duo / crowd). Prefer cast over random shake
 *    when kind !== 'none'. Hold longer on figure in sad/dark lyric windows;
 *    pull back for bright chorus formation.
 *
 * Cast shape: { kind, action, placement, count, conceptId }
 *   placement: 'sky' | 'mid' | 'foreground'
 *   kind examples: traveler, figure_lone, silhouette, duo, crowd_ghosts,
 *                  congregation, beast, none
 *
 * API (stable): setMode(mode);
 *   update(dt,audio,emotion,scaleMul,rolesIntent,cast=null)
 *   → {x,y,zoom,rotation}; apply(ctx,w,h,transform).
 *   cast also accepted via rolesIntent.cast as fallback.
 */
import {
  biasTowardCenter,
  castFraming,
  clampPunch,
  clampRotation,
  clampToCenter,
  clampZoom,
  decayToward,
  smooth01,
} from './framing.js';

export class CameraSystem {
  constructor() {
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

    // Whip gate: brief lateral reveal toward a side plane, then settle
    this._whipX = 0;
    this._whipSide = 1;
    this._whipCooldown = 0;
    this._prevDrop = 0;
    this._prevBuild = 0;

    // Cast placement bias (smoothed) + post-whip re-crosshair snap
    this._castY = 0;
    this._castZoom = 0;
    this._recrosshair = 0;
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
   * @returns {{x,y,zoom,rotation}} transform to apply around center
   */
  update(dt, audio, emotion, scaleMul = 1, rolesIntent = null, cast = null) {
    const t = performance.now() / 1000;
    const d = Math.max(0.001, Math.min(0.05, dt || 0.016));
    const energy = audio?.energy || 0;
    const build = audio?.build || 0;
    const drop = audio?.drop || 0;
    const silence = !!audio?.silence;
    const aggression = emotion?.aggression || emotion?.tension || 0;
    const ri = rolesIntent || {};
    const kick = (audio?.roles || audio?.instruments || {}).kick || 0;
    const shakeIntent = Math.max(ri.shake || 0, ri.kickPunch || 0);

    // Cast: explicit 6th arg, else rolesIntent.cast fallback
    const castIn = cast ?? ri.cast ?? null;
    const cf = castFraming(castIn);

    // Chorus-open proxy: high section intensity with build falling / low
    // (2122: prediction reward — world opens as expected after build tension)
    const buildFalling = build < this._prevBuild - 0.02;
    const chorusOpen =
      energy > 0.55 && (build < 0.35 || buildFalling) && drop < 0.4;
    // Quiet verse / breakdown: low energy, low build
    const intimate = !chorusOpen && energy < 0.4 && build < 0.45 && drop < 0.25;

    // Sad/dark lyric window → hold longer on figure (2122 valence)
    const darkHold =
      !chorusOpen &&
      Math.max(
        emotion?.sadness || 0,
        emotion?.darkness || 0,
        emotion?.melancholy || 0,
        (emotion?.valence != null && emotion.valence < 0
          ? -emotion.valence
          : 0)
      );

    let x = 0;
    let y = 0;
    let zoom = 1;
    let rotation = 0;

    const mode = this.mode;
    const soft = silence ? 0.35 : 1;

    switch (mode) {
      case 'dolly':
      case 'slow_dolly': {
        const rate = mode === 'slow_dolly' ? 0.1 : 0.15;
        zoom = 1 + Math.sin(t * rate) * 0.025 * scaleMul * soft;
        y = Math.sin(t * 0.08) * 3.5 * soft;
        // Build rides the dolly in; chorus eases open (earned pull-back)
        zoom += smooth01(build) * 0.05 * scaleMul;
        if (chorusOpen) zoom -= 0.045 * scaleMul * smooth01(energy);
        break;
      }
      case 'pan':
        x = Math.sin(t * 0.18) * 10 * scaleMul * soft;
        y = Math.sin(t * 0.07) * 2 * soft;
        break;
      case 'orbit':
        x = Math.cos(t * 0.2) * 11 * scaleMul * soft;
        y = Math.sin(t * 0.2) * 6 * scaleMul * soft;
        zoom = 1.015 + Math.sin(t * 0.22) * 0.015 * soft;
        break;
      case 'shake': {
        // Low kick/drop/intent → behave like gentle drift (stable character)
        const shakeFuel = Math.max(kick, drop, shakeIntent);
        if (shakeFuel < 0.35) {
          x = Math.sin(t * 0.11) * 5 * soft;
          y = Math.cos(t * 0.08) * 3.5 * soft;
          zoom = 1 + Math.sin(t * 0.07) * 0.015;
        } else {
          // Framing stays near center; punch overlay handles the hit
          x = Math.sin(t * 0.4) * 2 * soft;
          y = Math.cos(t * 0.35) * 1.5 * soft;
        }
        break;
      }
      case 'drift':
        x = (Math.sin(t * 0.1) * 6 + Math.sin(t * 0.04) * 3) * soft;
        y = Math.cos(t * 0.075) * 4.5 * soft;
        zoom = 1 + Math.sin(t * 0.06) * 0.015 * soft;
        break;
      case 'push':
        // Intimate push toward figure; build escalates anticipation
        zoom = 1 + (0.04 + smooth01(build) * 0.08 + (intimate ? 0.025 : 0)) * scaleMul;
        zoom += Math.sin(t * 0.35) * 0.008 * soft;
        break;
      case 'pull':
        // World / formation open — chorus energy pulls further (reward)
        zoom = 1 - (0.035 + (chorusOpen ? 0.04 * smooth01(energy) : 0)) * scaleMul;
        zoom += Math.sin(t * 0.08) * 0.008 * soft;
        break;
      case 'dutch': {
        // Tension only; clear toward 0 when chorus opens / aggression+build low
        const tense = Math.max(smooth01(build), aggression);
        if (chorusOpen || tense < 0.2) {
          rotation = 0;
        } else {
          rotation = Math.sin(t * 0.28) * 0.028 * tense + aggression * 0.02;
        }
        x = Math.sin(t * 0.16) * 5 * soft;
        break;
      }
      case 'crane':
        y = Math.sin(t * 0.12) * 12 * scaleMul * soft;
        zoom = 1.03 + (chorusOpen ? -0.02 : intimate ? 0.02 : 0) * scaleMul;
        break;
      case 'whip':
        // Gate motion handled below; hold a calm base framing mid-whip
        x = 0;
        y = Math.sin(t * 0.05) * 2 * soft;
        zoom = 1.01;
        break;
      default:
        x = Math.sin(t * 0.09) * 4 * soft;
        break;
    }

    // --- Character staging zoom overlay (all modes) ---
    // 2122 psych: escalate push during build (anticipation), then clearly
    // reward with pull-back when chorus opens (prediction / peak pleasure).
    // Escalation is nonlinear so late-build feels tighter than early.
    const buildPush = Math.pow(smooth01(build), 1.35) * 0.065 * scaleMul;
    const versePush = intimate ? 0.03 * scaleMul : 0;
    // Dark/sad hold: linger tighter on figure (analytic lyric attention)
    const darkPush = darkHold > 0.25 ? 0.022 * scaleMul * smooth01(darkHold) : 0;
    // Chorus pull-back reward — stronger than prior so the open is felt
    const chorusPull = chorusOpen
      ? 0.06 * scaleMul * smooth01(energy)
      : 0;
    // Huge energy without build → open/pull (don't fight with chaos zoom)
    const energyOpen =
      energy > 0.75 && build < 0.5 && !intimate ? 0.025 * scaleMul * energy : 0;
    zoom += buildPush + versePush + darkPush - chorusPull - energyOpen;

    // --- Cast placement + character scale (HOLD: intimate FG push, keep crosshair) ---
    this._castY = decayToward(this._castY, cf.yBias * soft, 7, d);
    this._castZoom = decayToward(this._castZoom, cf.zoomBias * scaleMul, 7, d);
    if (cf.active) {
      y += this._castY;
      zoom += this._castZoom;
      // Kill wander — figure stays on crosshair (characters must read)
      x *= 0.28;
      // Cast look owns Y; mode only whispers
      y = this._castY + (y - this._castY) * 0.2;
      // Don't give away the intimate push on chorus open while cast is staged
      if (chorusOpen) zoom += 0.035 * scaleMul;
    } else {
      this._castY = decayToward(this._castY, 0, 6, d);
      this._castZoom = decayToward(this._castZoom, 0, 6, d);
    }

    // Smooth intentional pose toward mode targets (continuity inside section)
    const ease = mode === 'whip' ? 14 : 6;
    this._mx = decayToward(this._mx, x, ease, d);
    this._my = decayToward(this._my, y, ease, d);
    this._mZoom = decayToward(this._mZoom, zoom, ease, d);
    // Dutch clears faster on chorus resolve / release
    const rotEase = chorusOpen || (build < 0.25 && aggression < 0.25) ? 10 : 5;
    this._mRot = decayToward(this._mRot, rotation, rotEase, d);

    // --- Whip / drop gate: brief lateral reveal of wall/sign plane ---
    // Gate-only — never every bar (2122: startle = single gate then restore)
    this._whipCooldown = Math.max(0, this._whipCooldown - d);
    const dropPulse = drop > 0.55 && this._prevDrop < 0.4;
    const whipMode = mode === 'whip';
    let whipFired = false;
    if ((whipMode || dropPulse) && this._whipCooldown <= 0) {
      this._whipSide = Math.random() < 0.5 ? -1 : 1;
      // Small offset toward a side plane (environmental type reveal), then settle
      this._whipX = this._whipSide * (10 + 4 * Math.min(1, drop + (whipMode ? 0.5 : 0)));
      this._whipCooldown = whipMode ? 0.85 : 0.7;
      whipFired = true;
      // After startle/whip: re-crosshair human immediately
      this._recrosshair = 0.45;
    }
    // Ease whip offset back toward center (never sticky)
    this._whipX = decayToward(this._whipX, 0, 4.5, d);
    this._recrosshair = Math.max(0, this._recrosshair - d);

    // --- Punch shake overlay (kick + drop ONLY — groove, not startle spam) ---
    const shakeMul = cf.active ? cf.shakeMul : 1;
    let punchFuel = 0;
    if (kick > 0.55) {
      punchFuel = Math.max(punchFuel, kick * 9 * (1 + shakeIntent * 0.4));
    }
    if (drop > 0.5) {
      punchFuel = Math.max(punchFuel, drop * 11);
    }
    if (shakeIntent > 0.55 && (kick > 0.4 || drop > 0.35)) {
      punchFuel = Math.max(punchFuel, shakeIntent * 10);
    }
    // Beat may add a tiny zoom tick but does NOT drive continuous shake
    if (audio?.beat && (kick > 0.45 || drop > 0.4)) {
      punchFuel = Math.max(punchFuel, 5);
      this._mZoom += 0.012 * scaleMul;
    }
    punchFuel *= shakeMul;
    if (punchFuel > this.shakeAmp) this.shakeAmp = punchFuel;

    if (this.shakeAmp > 0.4) {
      const amp = this.shakeAmp;
      // Overlay around origin — will be clamped so silhouette stays centered
      this._px = (Math.random() - 0.5) * amp * 0.55;
      this._py = (Math.random() - 0.5) * amp * 0.4;
      this._pRot = (Math.random() - 0.5) * 0.008 * Math.min(amp, 12);
      // Fast decay after bursts
      this.shakeAmp *= Math.exp(-10 * d);
    } else {
      this.shakeAmp = 0;
      this._px = decayToward(this._px, 0, 18, d);
      this._py = decayToward(this._py, 0, 18, d);
      this._pRot = decayToward(this._pRot, 0, 18, d);
    }

    const punch = clampPunch(this._px, this._py);

    // Compose: intentional framing + whip reveal + punch overlay
    let outX = this._mx + this._whipX + punch.x;
    let outY = this._my + punch.y;
    let outZoom = this._mZoom;
    let outRot = this._mRot + this._pRot;

    // Post-whip re-crosshair: snap bias back to cast placement center
    const reSnap = this._recrosshair > 0 ? 0.55 + 0.35 * (this._recrosshair / 0.45) : 0;
    const centerBias = cf.active ? 0.42 + reSnap * 0.3 : 0.28 + reSnap * 0.2;
    // During re-crosshair, pull Y toward cast placement (or 0), kill whip residual faster
    if (reSnap > 0) {
      const targetY = cf.active ? this._castY : 0;
      outY = outY * (1 - reSnap * 0.7) + targetY * (reSnap * 0.7);
      outX *= 1 - reSnap * 0.5;
      if (whipFired) this._whipX *= 0.35;
    }

    // Center bias then hard clamp — subject never leaves phone LED crosshair
    const biased = biasTowardCenter(outX, outY, centerBias);
    const clamped = clampToCenter(biased.x, biased.y, scaleMul);
    outX = clamped.x;
    outY = clamped.y;
    outZoom = clampZoom(outZoom);
    outRot = clampRotation(outRot);

    this._prevDrop = drop;
    this._prevBuild = build;

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
