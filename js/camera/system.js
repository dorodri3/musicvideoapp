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
 * 9. Travel / orbit (CEO keep-adding): intentional pan/dolly/crane/drift
 *    moves through the frame (not locked static). Occasional short orbit
 *    arcs when energy earns it (high energy / drop / peak chorus / build
 *    crest) — punctuation, not constant spin. With cast active, travel
 *    orbits the subject; never pan into empty frame.
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

    // Earned orbit punctuation — short arcs, not endless spin
    this._orbitT = 0; // remaining arc seconds
    this._orbitCd = 0; // cooldown between arcs
    this._orbitAng = 0; // phase angle during arc
    this._orbitSide = 1;
    this._orbitAmp = 0; // radius of current arc
    this._prevEnergy = 0;
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
    const buildRising = build > this._prevBuild + 0.015;
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

    // Kinetic travel scale — stronger when energy/build live; soft in silence
    const soft = silence ? 0.35 : 1;
    const travelMul =
      soft *
      (0.85 +
        0.45 * smooth01(energy) +
        0.2 * smooth01(build) +
        (chorusOpen ? 0.15 * smooth01(energy) : 0));
    // With cast staged, keep travel but orbit the subject (not empty frame)
    const subjectMul = cf.active ? 0.58 : 1;

    let x = 0;
    let y = 0;
    let zoom = 1;
    let rotation = 0;

    const mode = this.mode;
    const tm = travelMul * subjectMul * scaleMul;

    switch (mode) {
      case 'dolly':
      case 'slow_dolly': {
        const rate = mode === 'slow_dolly' ? 0.09 : 0.14;
        zoom = 1 + Math.sin(t * rate) * 0.03 * scaleMul * soft;
        // Stronger forward/back + vertical travel through space
        y = Math.sin(t * 0.07) * 6.5 * soft * subjectMul;
        x = Math.sin(t * 0.05) * 4.5 * tm;
        zoom += smooth01(build) * 0.05 * scaleMul;
        if (chorusOpen) zoom -= 0.045 * scaleMul * smooth01(energy);
        break;
      }
      case 'pan':
        // Sweep through frame — intentional lateral travel
        x = Math.sin(t * 0.16) * 15 * tm;
        y = Math.sin(t * 0.065) * 4.5 * soft * subjectMul;
        zoom = 1 + Math.sin(t * 0.05) * 0.012 * soft;
        break;
      case 'orbit':
        // Mode orbit = gentle base circle; earned arc (below) adds punctuation.
        // Avoid endless fast spin — slow base only when energy supports it.
        {
          const orbitFuel = Math.max(energy, drop, smooth01(build));
          const baseR = (6 + 6 * smooth01(orbitFuel)) * tm;
          const spd = 0.12 + 0.08 * smooth01(orbitFuel);
          x = Math.cos(t * spd) * baseR;
          y = Math.sin(t * spd) * baseR * 0.55 * (cf.active ? 0.5 : 1);
          zoom = 1.02 + Math.sin(t * 0.18) * 0.018 * soft;
        }
        break;
      case 'shake': {
        // Low kick/drop/intent → behave like gentle drift (stable character)
        const shakeFuel = Math.max(kick, drop, shakeIntent);
        if (shakeFuel < 0.35) {
          x = Math.sin(t * 0.1) * 7.5 * soft * subjectMul;
          y = Math.cos(t * 0.075) * 5 * soft * subjectMul;
          zoom = 1 + Math.sin(t * 0.07) * 0.015;
        } else {
          // Framing stays near center; punch overlay handles the hit
          x = Math.sin(t * 0.4) * 2 * soft;
          y = Math.cos(t * 0.35) * 1.5 * soft;
        }
        break;
      }
      case 'drift':
        // Soft verse float — still travels, not locked
        x =
          (Math.sin(t * 0.09) * 9 + Math.sin(t * 0.035) * 4.5) *
          soft *
          subjectMul *
          (0.9 + 0.35 * smooth01(energy));
        y = Math.cos(t * 0.07) * 6.5 * soft * subjectMul;
        zoom = 1 + Math.sin(t * 0.055) * 0.018 * soft;
        break;
      case 'push':
        // Intimate push toward figure; build escalates anticipation
        zoom = 1 + (0.04 + smooth01(build) * 0.08 + (intimate ? 0.025 : 0)) * scaleMul;
        zoom += Math.sin(t * 0.35) * 0.008 * soft;
        // Micro lateral travel so push isn't a static lock
        x = Math.sin(t * 0.11) * 3.5 * soft * subjectMul;
        y = Math.sin(t * 0.08) * 2.2 * soft * subjectMul;
        break;
      case 'pull':
        // World / formation open — chorus energy pulls further (reward)
        zoom = 1 - (0.035 + (chorusOpen ? 0.04 * smooth01(energy) : 0)) * scaleMul;
        zoom += Math.sin(t * 0.08) * 0.008 * soft;
        x = Math.sin(t * 0.1) * 5 * tm;
        y = Math.cos(t * 0.07) * 3.5 * soft * subjectMul;
        break;
      case 'dutch': {
        // Tension only; clear toward 0 when chorus opens / aggression+build low
        const tense = Math.max(smooth01(build), aggression);
        if (chorusOpen || tense < 0.2) {
          rotation = 0;
        } else {
          rotation = Math.sin(t * 0.28) * 0.028 * tense + aggression * 0.02;
        }
        x = Math.sin(t * 0.14) * 8 * soft * subjectMul;
        y = Math.sin(t * 0.09) * 3 * soft * subjectMul;
        break;
      }
      case 'crane':
        // Vertical travel through frame — stronger sweep
        y = Math.sin(t * 0.1) * 16 * tm;
        x = Math.sin(t * 0.055) * 5 * soft * subjectMul;
        zoom = 1.03 + (chorusOpen ? -0.02 : intimate ? 0.02 : 0) * scaleMul;
        break;
      case 'whip':
        // Gate motion handled below; hold a calm base framing mid-whip
        x = 0;
        y = Math.sin(t * 0.05) * 2 * soft;
        zoom = 1.01;
        break;
      default:
        x = Math.sin(t * 0.085) * 7 * soft * subjectMul;
        y = Math.cos(t * 0.06) * 3.5 * soft * subjectMul;
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

    // --- Earned orbit / spin punctuation (short arcs, not constant) ---
    this._orbitCd = Math.max(0, this._orbitCd - d);
    this._orbitT = Math.max(0, this._orbitT - d);

    const energyRise = energy > this._prevEnergy + 0.06;
    const dropPulseGate = drop > 0.55 && this._prevDrop < 0.4;
    // Build crest: late build peaking or just tipping into fall
    const buildCrest =
      (build > 0.78 && buildRising) || (build > 0.72 && buildFalling && this._prevBuild > 0.75);
    // Peak chorus open with heat
    const peakChorus = chorusOpen && energy > 0.68;
    // High-energy storm while mode itself is orbit (Scene picked it)
    const orbitModeEarn = mode === 'orbit' && energy > 0.55 && drop < 0.85;

    const canEarnOrbit =
      !silence &&
      !intimate &&
      this._orbitT <= 0 &&
      this._orbitCd <= 0 &&
      mode !== 'whip' &&
      (dropPulseGate ||
        buildCrest ||
        peakChorus ||
        (energyRise && energy > 0.72) ||
        (orbitModeEarn && energyRise));

    if (canEarnOrbit) {
      // Short arc duration — punctuation, not a carousel
      const heat = Math.max(energy, drop, smooth01(build));
      this._orbitT = 0.85 + 0.45 * smooth01(heat); // ~0.85–1.3s
      this._orbitCd = 2.6 + 1.4 * (1 - smooth01(heat)); // longer cool when cooler
      this._orbitSide = Math.random() < 0.5 ? -1 : 1;
      this._orbitAng = Math.random() * Math.PI * 2;
      // Radius: roomy when no cast; tighter orbit around subject when cast live
      this._orbitAmp =
        (cf.active ? 7.5 : 12) * (0.7 + 0.45 * smooth01(heat)) * soft * scaleMul;
    }

    let orbitX = 0;
    let orbitY = 0;
    let orbitRot = 0;
    if (this._orbitT > 0 && this._orbitAmp > 0) {
      // Envelope: ease in/out so arcs feel intentional, not abrupt
      const dur = 0.85 + 0.45; // nominal max used for envelope shape
      const life = Math.min(1, this._orbitT / Math.max(0.35, dur * 0.55));
      const env = Math.sin(Math.min(1, life) * Math.PI); // 0→1→0 over remaining feel
      const spd = 2.1 * this._orbitSide; // rad/s — ~1/3–1/2 turn per arc
      this._orbitAng += spd * d;
      const r = this._orbitAmp * env * (cf.active ? 0.72 : 1);
      orbitX = Math.cos(this._orbitAng) * r;
      orbitY = Math.sin(this._orbitAng) * r * (cf.active ? 0.35 : 0.55);
      // Tiny spin lean during arc (not dutch — orbit punctuation only)
      orbitRot = Math.sin(this._orbitAng) * 0.012 * env * (cf.active ? 0.55 : 1);
    }

    // --- Cast placement + character scale (HOLD: intimate FG push, keep crosshair) ---
    // Travel pass: do NOT push intimate zoom harder — keep prior biases; allow
    // lateral travel around the subject instead of killing wander to static.
    this._castY = decayToward(this._castY, cf.yBias * soft, 7, d);
    this._castZoom = decayToward(this._castZoom, cf.zoomBias * scaleMul, 7, d);
    if (cf.active) {
      y += this._castY;
      zoom += this._castZoom;
      // Travel around subject — keep most intentional X, damp empty-frame drift
      x *= 0.55;
      // Cast look owns Y; mode + orbit whisper around placement
      y = this._castY + (y - this._castY) * 0.28;
      // Don't give away the intimate push on chorus open while cast is staged
      if (chorusOpen) zoom += 0.035 * scaleMul;
    } else {
      this._castY = decayToward(this._castY, 0, 6, d);
      this._castZoom = decayToward(this._castZoom, 0, 6, d);
    }

    // Fold earned orbit into mode targets before smoothing
    x += orbitX;
    y += orbitY;
    rotation += orbitRot;

    // Smooth intentional pose toward mode targets (continuity inside section)
    const ease = mode === 'whip' ? 14 : this._orbitT > 0 ? 8 : 5.5;
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
    // Cast: keep crosshair but allow travel to read (softer bias than prior lock)
    const centerBias = cf.active
      ? 0.34 + reSnap * 0.32
      : 0.18 + reSnap * 0.22;
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
