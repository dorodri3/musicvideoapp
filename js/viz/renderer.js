/**
 * rAF compose; Canvas2D; 60fps target; quality scale.
 * Roles animate HOW the world moves; lyrics direct WHAT world.
 * Prefer audio.roles || audio.instruments (see js/audio/ROLES.md).
 */
import { ContinuityEngine } from '../scene/continuity.js';
import { CameraSystem } from '../camera/system.js';
import { LightingSystem } from '../lighting/system.js';
import { TypographySystem, TYPO_BUILD } from '../typography/system.js?v=cast-detail1';
import { resolveCastLook, drawCastFigure, drawRoleAgentFx, drawWeaponProp, ARCHETYPE_IDS, OUTFIT_IDS } from './castLibrary.js';
import { getMotionComfort } from '../a11y/motionPrefs.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.continuity = new ContinuityEngine();
    this.camera = new CameraSystem();
    this.lighting = new LightingSystem();
    this.typography = new TypographySystem();
    this.quality = 1;
    this.running = false;
    this._raf = null;
    this._last = 0;
    this._frames = 0;
    this._fpsCheck = 0;
    this.fps = 60;
    this.showCharacters = true;
    this._typoBuild = TYPO_BUILD; // HOLD-2149 cache-bust verify
    this.onFrame = null;
    this._kickFlash = 0;
    this._groundShake = 0;
    this._worldScale = 1;
    this._vignette = 0.25;
    this._sparkBurst = 0;
    this._fog = 0.2;
    this._beam = 0;
    this._glitch = 0;
    this._snareFlash = 0;
    this._lastWhiteFlash = 0;
    this._lastEdmBloom = 0;
    this._pleasure = null;
    this._figureAnchor = null; // {x,y} chest/head aim for lead beam
    this._lastLyricStickExpire = null;
    this._lastSectionChangeId = null;
  }

  setQuality(q) {
    this.quality = Math.max(0.5, Math.min(1, q));
    this._resize();
  }

  setCharacters(on) {
    this.showCharacters = !!on;
  }

  setLyrics(on) {
    this.typography.setEnabled(on);
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.quality;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  start(frameFn) {
    this.onFrame = frameFn;
    this.running = true;
    this._last = performance.now();
    this._fpsCheck = this._last;
    this._frames = 0;
    const loop = (now) => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this._frames++;
      if (now - this._fpsCheck > 1000) {
        this.fps = this._frames;
        this._frames = 0;
        this._fpsCheck = now;
        if (this.fps < 40 && this.quality > 0.55) this.setQuality(this.quality - 0.1);
        else if (this.fps > 55 && this.quality < 1) this.setQuality(Math.min(1, this.quality + 0.05));
      }
      this._resize();
      if (this.onFrame) this.onFrame(dt, now);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _roles(audio) {
    return audio?.roles || audio?.instruments || {};
  }

  _leadLevel(roles, audio) {
    let lead = Math.max(roles.lead || 0, roles.vocalish || 0);
    if (audio?.vocal) {
      const v = Math.max(
        audio.vocal.intensity || 0,
        audio.vocal.likelyVocal ? (audio.vocal.activity || 0) : 0
      );
      lead = Math.max(lead, v * 0.95);
    }
    return lead;
  }

  _rolesIntent(directive) {
    // Director field is rolesIntent; tolerate accidental alias if ever present
    return directive?.rolesIntent || directive?.roleIntents || {};
  }


  /**
   * GENRE-MAP-PLEASURE-20260924-2140 — fan-pleasure multipliers / refuse flags.
   * Pleasure never unlocks weapons (Scene stamps weaponId). Does not replace vibe.
   */
  _resolveGenreFamily(directive, state) {
    return (
      directive?.genreFamily ||
      directive?.genre ||
      state?.genreFamily ||
      state?.audio?.genreFamily ||
      directive?.concept?.genreFamily ||
      ''
    ).toString().toLowerCase();
  }

  _pleasureGate(directive, state = {}) {
    const genre = this._resolveGenreFamily(directive, state);
    const vibe = (directive?.vibe || directive?.mood || state?.vibe || '').toString().toLowerCase();
    const sectionType = (
      directive?.sectionType ||
      state?.sectionType ||
      directive?.section ||
      state?.section ||
      ''
    ).toString().toLowerCase();
    const audio = state?.audio || {};
    const energy = Number(audio.energy ?? state?.energy ?? 0) || 0;
    const drop = Number(audio.drop ?? 0) || 0;
    const texture = audio.texture || directive?.texture || {};
    const isLift =
      /drop|chorus|climax|lift|peak/.test(sectionType) ||
      drop > 0.45 ||
      energy > 0.78;
    const isChorus = /chorus|lift|drop|climax/.test(sectionType);
    const ambientLean =
      /\bambient\b/.test(genre + ' ' + vibe) ||
      ((genre === 'electronic' || /electro|edm|idm/.test(genre)) &&
        ((texture.ambient || 0) > 0.4 || /ambient|drone|pad|still|float/.test(vibe)) &&
        (texture.fourOnFloor || 0) < 0.28 &&
        drop < 0.35);
    const metalLean =
      /\b(metal|punk|hardcore|doom|industrial)\b/.test(genre + ' ' + vibe) ||
      genre === 'noise';
    const balladLean = /ballad|slow|quiet.?storm|intimate|ache/.test(vibe + ' ' + sectionType);

    const g = {
      family: genre || 'unknown',
      whiteFlashOk: false,
      strobeRefuse: false,
      glitchOk: false,
      bloomOnce: false,
      silkMode: false,
      graceLight: false,
      velvetClose: false,
      landscapeHonesty: false,
      negativeSpace: false,
      scaleSwell: false,
      barEnergy: false,
      laserDrop: false,
      colorHip: false,
      formationClarity: false,
      noiseTexture: false,
      popSparkle: false,
      rockPunch: false,
      kickMul: 1,
      snareMul: 1,
      sparkMul: 1,
      glitchMul: 1,
      whiteMinGapMs: 500, // A11y ≤3 Hz full white
      isLift,
      isChorus,
      ambientLean,
      metalLean
    };

    // --- family defaults (anti-pattern refuse + core pleasure) ---
    if (genre === 'spoken' || ambientLean) {
      g.silkMode = true;
      g.strobeRefuse = true;
      g.whiteFlashOk = false;
      g.kickMul = 0.22;
      g.snareMul = 0.15;
      g.sparkMul = 0.2;
      g.glitchMul = 0.08;
    } else if (genre === 'classical') {
      g.silkMode = true;
      g.scaleSwell = true;
      g.strobeRefuse = true;
      g.whiteFlashOk = false;
      g.kickMul = 0.25;
      g.snareMul = 0.2;
      g.sparkMul = 0.22;
      g.glitchMul = 0.1;
    } else if (genre === 'jazz') {
      g.negativeSpace = true;
      g.strobeRefuse = true;
      g.whiteFlashOk = false;
      g.kickMul = 0.4;
      g.snareMul = 0.35;
      g.sparkMul = 0.28;
      g.glitchMul = 0.2;
    } else if (genre === 'gospel') {
      g.graceLight = true;
      g.strobeRefuse = true;
      g.glitchMul = 0;
      g.whiteFlashOk = isChorus || isLift; // sparingly on lift/chorus only
      g.whiteMinGapMs = 900;
      g.kickMul = 0.45;
      g.snareMul = 0.35;
      g.sparkMul = 0.35;
    } else if (genre === 'folk' || /country|americana|bluegrass/.test(genre)) {
      g.landscapeHonesty = true;
      g.strobeRefuse = true;
      g.whiteFlashOk = false;
      g.kickMul = 0.55;
      g.snareMul = 0.4;
      g.sparkMul = 0.25; // no EDM spark spam
      g.glitchMul = 0.15;
    } else if (genre === 'rnb' || balladLean && /rnb|soul/.test(genre + vibe)) {
      g.velvetClose = true;
      g.strobeRefuse = true;
      g.whiteFlashOk = false;
      g.kickMul = 0.5;
      g.snareMul = 0.4;
      g.sparkMul = 0.35;
      g.glitchMul = 0.12;
    } else if (genre === 'indie') {
      g.strobeRefuse = true;
      g.whiteFlashOk = false;
      g.kickMul = 0.6;
      g.snareMul = 0.5;
      g.sparkMul = 0.45;
      g.glitchMul = 0.25;
    } else if (genre === 'soundtrack') {
      g.strobeRefuse = !isLift;
      g.whiteFlashOk = isLift;
      g.whiteMinGapMs = 1000;
      g.kickMul = 0.55;
      g.snareMul = 0.5;
      g.sparkMul = 0.4;
    } else if (genre === 'electronic' || /edm|electro|house|techno/.test(genre)) {
      if (ambientLean) {
        g.silkMode = true;
        g.strobeRefuse = true;
        g.whiteFlashOk = false;
        g.kickMul = 0.25;
        g.snareMul = 0.18;
        g.sparkMul = 0.22;
        g.glitchMul = 0.15;
      } else {
        g.laserDrop = true;
        g.bloomOnce = true;
        g.whiteFlashOk = isLift; // drop/chorus only
        g.whiteMinGapMs = 1200;
        g.kickMul = 1.05;
        g.snareMul = 1.05;
        g.sparkMul = 0.95;
        g.glitchMul = 0.45; // not ash spam
      }
    } else if (genre === 'rock') {
      g.rockPunch = true;
      g.whiteFlashOk = true;
      g.whiteMinGapMs = metalLean ? 500 : 500;
      g.kickMul = 1.1;
      g.snareMul = 1.08;
      g.sparkMul = metalLean ? 0.35 : 0.55; // refuse candy as default for metal
      g.glitchMul = metalLean ? 1.15 : 0.7;
      g.glitchOk = metalLean;
    } else if (genre === 'hiphop') {
      g.barEnergy = true;
      g.whiteFlashOk = isChorus;
      g.whiteMinGapMs = 700;
      g.kickMul = 1.12; // 808/kick ground readable
      g.snareMul = 0.95;
      g.sparkMul = 0.4; // no candy formation sparkle
      g.glitchMul = 0.35;
    } else if (genre === 'pop') {
      g.popSparkle = true;
      g.whiteFlashOk = isChorus;
      g.whiteMinGapMs = 500;
      g.kickMul = 0.95;
      g.snareMul = 0.95;
      g.sparkMul = isChorus ? 1.15 : 0.7;
      g.glitchMul = 0.2; // refuse metal ash default
    } else if (genre === 'latin' || genre === 'afro') {
      g.colorHip = true;
      g.whiteFlashOk = isChorus;
      g.whiteMinGapMs = 550;
      g.kickMul = 1.05;
      g.snareMul = 1.0;
      g.sparkMul = 0.85;
      g.glitchMul = 0.2;
    } else if (genre === 'kpop') {
      g.formationClarity = true;
      g.popSparkle = true;
      g.whiteFlashOk = isChorus;
      g.whiteMinGapMs = 500;
      g.kickMul = 1.05;
      g.snareMul = 1.05;
      g.sparkMul = isChorus ? 1.25 : 0.85;
      g.glitchMul = 0.15; // refuse jazz sparse / metal ash
    } else if (genre === 'noise') {
      g.noiseTexture = true;
      g.glitchOk = true;
      g.whiteFlashOk = false;
      g.strobeRefuse = false; // glitch/ash ok, not candy white
      g.kickMul = 0.5;
      g.snareMul = 0.45;
      g.sparkMul = 0.15; // mute candy sparkle
      g.glitchMul = 1.25;
    } else {
      // unknown — mild defaults, no strobe spam
      g.whiteFlashOk = isLift;
      g.whiteMinGapMs = 500;
    }

    // Hard strobe refuse for silk / intimate / pastoral families
    if (
      g.silkMode ||
      g.velvetClose ||
      g.landscapeHonesty ||
      g.negativeSpace ||
      genre === 'spoken' ||
      genre === 'classical' ||
      genre === 'jazz' ||
      genre === 'folk' ||
      genre === 'rnb' ||
      genre === 'indie' ||
      ambientLean
    ) {
      g.strobeRefuse = true;
      g.whiteFlashOk = false;
    }
    // Gospel: refuse spam, but allow one soft flash on lift/chorus
    if (genre === 'gospel') {
      g.strobeRefuse = true;
      g.whiteFlashOk = !!(isChorus || isLift);
      g.whiteMinGapMs = Math.max(g.whiteMinGapMs || 0, 900);
      g.glitchMul = 0;
    }
    if (g.glitchOk && g.noiseTexture) g.sparkMul = Math.min(g.sparkMul, 0.2);
    return g;
  }

  /** Gate white_flash / bloom — shared gap with near-full kick/snare; A11y comfort. */
  _tryWhiteFlash(now, reason = 'kick') {
    const g = this._pleasure;
    if (!g) return false;
    const comfort = getMotionComfort();
    if (comfort.muteWhiteOut) return false;
    if (comfort.muteKickStrobe && (reason === 'kick' || reason === 'snare')) return false;
    if (g.strobeRefuse && !(g.graceLight && g.whiteFlashOk)) return false;
    if (!g.whiteFlashOk) return false;
    // Shared gap: default ≥500 (≤3Hz); EDM 1200; comfort may raise further
    const gap = Math.max(g.whiteMinGapMs || 500, comfort.minFullWhiteGapMs || 500);
    if (now - this._lastWhiteFlash < gap) return false;
    if (g.laserDrop || g.bloomOnce) {
      if (!g.isLift && reason !== 'drop') return false;
      if (g.bloomOnce && now - this._lastEdmBloom < 1200 && reason === 'drop') return false;
      if (reason === 'drop' || g.isLift) {
        this.lighting.trigger('white_flash');
        this._lastWhiteFlash = now;
        if (g.bloomOnce) this._lastEdmBloom = now;
        return true;
      }
      return false;
    }
    this.lighting.trigger('white_flash');
    this._lastWhiteFlash = now;
    return true;
  }

  /** Shared clock for near-full whiteOut bumps (kick_punch / snare_flash ≥0.45). */
  _noteNearFullWhite(now) {
    this._lastWhiteFlash = now;
  }

  _updateInstruments(audio, dt, now, rolesIntent = {}) {
    const roles = this._roles(audio);
    const ri = rolesIntent || {};
    const g = this._pleasure || {};
    const kMul = g.kickMul != null ? g.kickMul : 1;
    const sMul = g.snareMul != null ? g.snareMul : 1;
    const spMul = g.sparkMul != null ? g.sparkMul : 1;
    const glMul = g.glitchMul != null ? g.glitchMul : 1;
    // Blend director intents as boost multipliers (don't replace audio.roles)
    const kick = (roles.kick || 0) * (1 + (ri.kickPunch || 0) * 0.85);
    const bass = (roles.bass || 0) * (1 + (ri.bassWeight || 0) * 0.75);
    const snare = (roles.snare || 0) * (1 + (ri.snareFlash || 0) * 0.85);
    const hats = (roles.hats || 0) * (1 + Math.max(ri.hatsSparks || 0, ri.rainNeedles || 0) * 0.9);
    const pads = (roles.pads || 0) * (1 + Math.max(ri.padsWash || 0, ri.skyFog || 0) * 0.85);
    const harsh = (roles.harsh || 0) * (1 + (ri.harshGlitch || 0) * 0.95);
    const lead = this._leadLevel(roles, audio) * (1 + (ri.leadBeam || 0) * 0.9);
    const shakeBoost = Math.max(ri.shake || 0, ri.kickPunch || 0);
    const vigBoost = Math.max(ri.vignette || 0, ri.bassWeight || 0);

    // Kick → horizon punch / ground flash / shake + gated white_flash
    if (kick > 0.4) {
      this._kickFlash = Math.max(this._kickFlash, kick * 1.15 * kMul);
      const _gc = getMotionComfort();
      if (!_gc.muteGroundShake) {
        this._groundShake = Math.max(this._groundShake, kick * 18 * (1 + shakeBoost * 0.6) * Math.min(1.2, 0.35 + kMul) * (_gc.localFlashScale || 1));
      }
    }
    if (shakeBoost > 0.55) {
      const _gc2 = getMotionComfort();
      if (!_gc2.muteGroundShake) {
        this._groundShake = Math.max(this._groundShake, shakeBoost * 14 * Math.min(1.2, 0.35 + kMul) * (_gc2.localFlashScale || 1));
      }
    }
    if (kick > 0.7) {
      this._tryWhiteFlash(now, g.laserDrop && g.isLift ? 'drop' : 'kick');
    }
    this._kickFlash *= 0.84;
    this._groundShake *= 0.86;

    // Bass → world scale / vignette weight (+ classical scaleSwell)
    let targetScale = 1 + bass * 0.08 + vigBoost * 0.04;
    let vig = 0.2 + bass * 0.52 + vigBoost * 0.28;
    if (g.scaleSwell) {
      const rise = Math.max(pads, Number(audio?.energy || 0) * 0.85, bass);
      targetScale += rise * 0.06;
      vig += rise * 0.12;
    }
    if (g.velvetClose) vig = Math.min(0.92, vig + 0.12);
    this._worldScale += (targetScale - this._worldScale) * 0.18;
    this._vignette = vig;

    // Snare → mid punch flash (gated)
    if (snare > 0.45) {
      this._snareFlash = Math.max(this._snareFlash, snare * sMul);
      this._kickFlash = Math.max(this._kickFlash, snare * 0.6 * kMul);
      if (snare > 0.75 && audio?.beat) {
        this._tryWhiteFlash(now, g.laserDrop && g.isLift ? 'drop' : 'snare');
      }
    }
    this._snareFlash *= 0.85;

    // Hats → sparks / rain needles (muted when glitchOk / pastoral)
    let sparkIn = hats * 1.0 * spMul;
    if (g.glitchOk || g.noiseTexture) sparkIn *= 0.25; // mute candy sparkle
    if (g.landscapeHonesty || g.negativeSpace) sparkIn *= 0.55;
    this._sparkBurst = Math.max(this._sparkBurst * 0.88, sparkIn);

    // Pads → sky / fog
    this._fog += ((pads * 0.65) - this._fog) * 0.1;

    // Lead/vocalish → center beams (+ gospel grace boost)
    let beamTarget = lead * 0.8;
    if (g.graceLight) beamTarget = Math.min(1, beamTarget * 1.2 + 0.1);
    this._beam += (Math.min(0.7, beamTarget) - this._beam) * 0.22;
    this._beam = Math.min(this._beam, 0.55);

    // Harsh → glitch/ash (gated; rock/metal ok, gospel zero)
    let glIn = harsh * 0.9 * glMul;
    if (g.graceLight) glIn = 0;
    if (!g.glitchOk && !g.rockPunch && !g.noiseTexture) glIn *= 0.55;
    this._glitch = Math.max(this._glitch * 0.82, glIn);

    // Beat punch into lighting pulse — throttle for silk / negative space
    if (audio?.beat) {
      const beatNudge = g.silkMode || g.negativeSpace ? 0.12 : g.barEnergy ? 0.42 : 0.35;
      this._kickFlash = Math.max(this._kickFlash, beatNudge * kMul);
    }

    // EDM: one earned bloom on drop (tracked via _lastEdmBloom)
    if (g.bloomOnce && g.laserDrop && g.isLift && (audio?.drop || 0) > 0.5) {
      this._tryWhiteFlash(now, 'drop');
    }
  }

  render(payload) {
    const {
      directive,
      audio,
      emotion,
      phrase,
      wordIndex,
      now = performance.now()
    } = payload;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = now / 1000;
    const dt = 0.016;
    const roles = this._roles(audio);

    const rolesIntent = this._rolesIntent(directive);
    this._updateInstruments(audio, dt, now, rolesIntent);

    if (directive?.events) {
      for (const ev of directive.events) {
        const _c = getMotionComfort();
        // Share near-full white gap for kick_punch / snare_flash (whiteOut≥0.45)
        const nearFull = (ev === 'kick_punch' || ev === 'snare_flash' ||
          ev === 'white_flash' || ev === 'white_out' || ev === 'sky_tear');
        if (nearFull && _c.muteWhiteOut) {
          /* PRM: skip full white triggers */
        } else if (nearFull && (now - this._lastWhiteFlash < Math.max(500, _c.minFullWhiteGapMs || 500))) {
          /* shared gap — skip stacked near-white */
        } else {
          this.lighting.trigger(ev);
          if (nearFull) this._noteNearFullWhite(now);
        }
        // Local visual spikes (don't rely only on lighting)
        const locScale = _c.localFlashScale != null ? _c.localFlashScale : 1;
        if (ev === 'kick_punch') {
          this._kickFlash = Math.max(this._kickFlash, 0.95 * locScale);
          if (!_c.muteGroundShake) this._groundShake = Math.max(this._groundShake, 22 * locScale);
        } else if (ev === 'snare_flash') {
          this._snareFlash = Math.max(this._snareFlash, 0.9 * locScale);
          this._kickFlash = Math.max(this._kickFlash, 0.55 * locScale);
        } else if (ev === 'harsh_glitch') {
          this._glitch = Math.max(this._glitch, 0.95);
        } else if (ev === 'collapse') {
          this._glitch = Math.max(this._glitch, 0.7);
          this._vignette = Math.max(this._vignette, 0.85);
          if (!_c.muteGroundShake) this._groundShake = Math.max(this._groundShake, 16 * locScale);
        }
      }
    }
    this.lighting.setModes(directive?.lighting || ['wash']);
    const light = this.lighting.update(audio, emotion, directive?.intensity || 0.5);

    // Camera: honor CameraSystem + directive.camera; A11y mutes shake/whip
    const _camC = getMotionComfort();
    let camMode = directive?.camera || 'drift';
    if (_camC.muteCameraShakeWhip && (camMode === 'shake' || camMode === 'whip' || camMode === 'punch')) {
      camMode = 'drift';
    }
    if (_camC.muteGroundShake) this._groundShake = 0;
    this.camera.setMode(camMode);
    const camRi = _camC.muteCameraShakeWhip
      ? { ...rolesIntent, shake: 0, kickPunch: Math.min(rolesIntent?.kickPunch || 0, 0.2) }
      : rolesIntent;
    const cam = this.camera.update(
      dt,
      audio,
      emotion,
      (directive?.scale?.cameraMul || 1) * this._worldScale,
      camRi,
      directive?.cast ?? directive?.characters ?? null
    );

    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    this.camera.apply(ctx, w, h, cam);

    if (Math.abs(this._worldScale - 1) > 0.005) {
      ctx.translate(w / 2, h / 2);
      ctx.scale(this._worldScale, this._worldScale);
      ctx.translate(-w / 2, -h / 2);
    }

    const cast = directive?.cast ?? null;
    const motifProps = directive?.motifProps ?? null;
    const state = {
      t,
      audio: audio || { energy: 0, bass: 0, mid: 0, treble: 0, onset: 0, beat: false, roles: {}, instruments: {} },
      emotion: emotion || {},
      intensity: directive?.intensity || 0.5,
      palette: directive?.palette || [],
      characters: this.showCharacters || !!cast,
      cast,
      motifProps,
      directive,
      events: directive?.events || [],
      preset: directive?.preset || 'white_void',
      motif: directive?.motif,
      scale: directive?.scale,
      instruments: roles,
      roles,
      quality: this.quality
    };

    this.continuity.draw(ctx, w, h, state, directive?.transition);

    // Motif props early; cast drawn AFTER typography so wash never covers figures
    this._drawMotifProps(ctx, w, h, directive, state);

    // Light vibe / speechLike hooks (scenic owns frame; minimal flash)
    this._applyVibeHooks(ctx, w, h, directive, state);

    // Pads → sky fog wash
    if (this._fog > 0.05) {
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      g.addColorStop(0, `rgba(180,200,255,${this._fog * 0.42})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h * 0.55);
    }

    // Hats → spark / rain needles (density × quality)
    if (this._sparkBurst > 0.08) {
      ctx.save();
      ctx.strokeStyle = `rgba(220,230,255,${0.28 + this._sparkBurst * 0.55})`;
      ctx.lineWidth = 1.2;
      const n = Math.floor((14 + this._sparkBurst * 48) * this.quality);
      for (let i = 0; i < n; i++) {
        const x = (Math.sin(t * 9 + i * 1.7) * 0.5 + 0.5) * w;
        const y = ((t * 200 + i * 37) % (h * 0.85));
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 1.5, y + 10 + this._sparkBurst * 12);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Lead/vocalish → ONE soft beam (comfort: never wash whole canvas white)
    if (this._beam > 0.08) {
      const ax = this._figureAnchor?.x ?? w * 0.5;
      const ay = this._figureAnchor?.y ?? h * 0.48;
      const beamCap = Math.min(0.55, this._beam);
      ctx.save();
      ctx.globalAlpha = beamCap * 0.22;
      const beam = ctx.createLinearGradient(ax, 0, ax, ay + h * 0.08);
      beam.addColorStop(0, 'rgba(255,248,232,0.32)');
      beam.addColorStop(0.55, 'rgba(255,240,210,0.12)');
      beam.addColorStop(1, 'rgba(255,248,232,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(ax - 14, 0);
      ctx.lineTo(ax + 16, 0);
      ctx.lineTo(ax + 28, ay + h * 0.1);
      ctx.lineTo(ax - 22, ay + h * 0.1);
      ctx.closePath();
      ctx.fill();
      const glow = ctx.createRadialGradient(ax, ay, 4, ax, ay, 50 + beamCap * 28);
      glow.addColorStop(0, `rgba(255,250,230,${0.10 + beamCap * 0.12})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(ax - 70, ay - 70, 140, 140);
      ctx.restore();
    }

    // Kick → ground / horizon flash (_groundShake = flash intensity only, NOT camera)
    if (this._kickFlash > 0.05 || this._groundShake > 2) {
      const shakeBoost = Math.min(0.35, this._groundShake / 40);
      const kf = Math.min(1, this._kickFlash + shakeBoost);
      const g = ctx.createLinearGradient(0, h * 0.5, 0, h);
      g.addColorStop(0, 'rgba(255,200,120,0)');
      g.addColorStop(0.55, `rgba(255,190,100,${kf * 0.22})`);
      g.addColorStop(1, `rgba(255,255,220,${kf * 0.32})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.45, w, h * 0.55);
    }

    // Snare → mid-screen punch flash
    if (this._snareFlash > 0.08) {
      const sg = ctx.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, w * 0.4);
      sg.addColorStop(0, `rgba(255,255,255,${this._snareFlash * 0.18})`);
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
    }

    // Harsh → glitch / ash (density × quality)
    if (this._glitch > 0.12) {
      ctx.save();
      ctx.globalAlpha = this._glitch * 0.45;
      const bars = Math.floor(8 * this.quality);
      for (let i = 0; i < bars; i++) {
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
        ctx.fillRect(0, y, w, 2 + Math.random() * 4);
      }
      ctx.fillStyle = `rgba(200,180,160,${this._glitch * 0.65})`;
      const ash = Math.floor(24 * this.quality);
      for (let i = 0; i < ash; i++) {
        ctx.fillRect(
          Math.random() * w,
          Math.random() * h,
          1 + Math.random() * 2,
          1 + Math.random() * 2
        );
      }
      ctx.restore();
    }

    if (directive?.motif && directive.motifAction) {
      this._drawMotif(ctx, w, h, directive.motif, directive.motifAction, state, directive);
    }

    ctx.restore();

    // Bass vignette weight (screen space)
    if (this._vignette > 0.05) {
      const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.22, w / 2, h / 2, w * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,0,0,${Math.min(0.8, this._vignette)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }

    this.lighting.apply(ctx, w, h, light, directive?.palette, this.quality);

    // Typography — scenic; clear sticky on lyricStickExpire / sectionChangeId
    const stickExpire = !!(directive?.lyricStickExpire);
    const secChangeId = directive?.sectionChangeId;
    if (
      (stickExpire && stickExpire !== this._lastLyricStickExpire) ||
      (secChangeId != null && secChangeId !== this._lastSectionChangeId)
    ) {
      if (typeof this.typography.clearSticky === 'function') this.typography.clearSticky();
    }
    this._lastLyricStickExpire = stickExpire;
    if (secChangeId != null) this._lastSectionChangeId = secChangeId;

    const lyricEmphasis = Math.max(
      rolesIntent.lyricEmphasis || 0,
      rolesIntent.leadBeam || 0,
      this._figureAnchor ? 0.25 : 0
    );
    if (directive && this._figureAnchor && !directive.lyricPlacement) {
      const pl = (directive.cast?.placement || '').toString().toLowerCase();
      if (pl === 'sky' || pl === 'upper') directive.lyricPlacement = 'horizon';
    }
    // speechLike: scenic type owns frame — keep emphasis, no extra flash
    if (directive?.speechLike) {
      /* typography owns readability; beam already soft */
    }
    this.typography.update(phrase, wordIndex, directive, now, audio, lyricEmphasis);
    this.typography.draw(ctx, w, h, emotion);

    // Cast AFTER typography — figures never under lyric wash; camera owns framing
    this._drawCast(ctx, w, h, directive, state);

    if (directive?.sectionType === 'intro' && directive.theme && (audio?.energy || 0) < 0.25) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.font = `300 ${Math.min(22, w / 28)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(directive.theme.slice(0, 60), w / 2, h * 0.18);
      ctx.restore();
    }
  }

  _drawMotif(ctx, w, h, motif, action, state, directive = null) {
    const amplify = action === 'amplify' ? 1.4 : action === 'maximize' ? 2 : action === 'alone' ? 1.2 : 1;
    // motifStrength: verse plant ~low, chorus escalate, peak ~1
    const strength = Math.max(0, Math.min(1, directive?.motifStrength ?? 0.45));
    const strengthMul = 0.35 + strength * 0.9;
    const variant = directive?.motifVariant;
    ctx.save();
    ctx.globalAlpha = 0.35 * amplify * strengthMul;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 * (0.7 + strength * 0.6);
    // Light stroke-style variation from motifVariant (no new assets)
    if (typeof variant === 'string') {
      const v = variant.toLowerCase();
      if (/dash|rain|needle|spark/.test(v)) ctx.setLineDash([6, 5]);
      else if (/double|echo|mirror|twin/.test(v)) ctx.lineWidth *= 1.35;
      else if (/glow|soft|wash|fog/.test(v)) {
        ctx.shadowColor = 'rgba(255,255,255,0.55)';
        ctx.shadowBlur = 12 + strength * 18;
      } else if (/harsh|glitch|ash/.test(v)) ctx.setLineDash([2, 3, 6, 3]);
    }
    const cx = w * 0.5, cy = h * 0.35;
    const r = (30 * amplify + (state.audio.energy || 0) * 20) * (0.75 + strength * 0.55);
    const strokeOnce = () => {
      if (/mirror|doppel/.test(motif)) {
        ctx.strokeRect(cx - r, cy - r, r * 0.8, r * 1.6);
        ctx.strokeRect(cx + r * 0.2, cy - r, r * 0.8, r * 1.6);
      } else if (/fire|ember/.test(motif)) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + r);
        ctx.quadraticCurveTo(cx - r, cy, cx, cy - r);
        ctx.quadraticCurveTo(cx + r, cy, cx, cy + r);
        ctx.stroke();
      } else if (/wing|chain/.test(motif)) {
        ctx.beginPath();
        ctx.ellipse(cx - r, cy, r * 0.8, r * 0.4, -0.4, 0, Math.PI * 2);
        ctx.ellipse(cx + r, cy, r * 0.8, r * 0.4, 0.4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    strokeOnce();
    if (typeof variant === 'string' && /double|echo|mirror|twin/.test(variant.toLowerCase())) {
      ctx.globalAlpha *= 0.55;
      ctx.lineWidth *= 0.7;
      ctx.setLineDash([]);
      const r2 = r * 1.12;
      // re-stroke slightly larger for double
      if (/mirror|doppel/.test(motif)) {
        ctx.strokeRect(cx - r2, cy - r2, r2 * 0.8, r2 * 1.6);
        ctx.strokeRect(cx + r2 * 0.2, cy - r2, r2 * 0.8, r2 * 1.6);
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, r2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _stageY(h, placement, directive, state) {
    const p = (placement || 'foreground').toString().toLowerCase();
    const bands = directive?.stageBands || state?.stageBands || null;
    if (bands) {
      if (p === 'sky' || p === 'upper') return bands.sky ?? bands.figureStage ?? h * 0.28;
      if (p === 'mid' || p === 'middle' || p === 'path') return bands.mid ?? bands.typePlane ?? h * 0.55;
      return bands.foreground ?? bands.motifMarks ?? h * 0.72;
    }
    if (p === 'sky' || p === 'upper') return h * 0.28;
    if (p === 'mid' || p === 'middle' || p === 'path') return h * 0.55;
    return h * 0.72;
  }

  _normalizeCastList(directive) {
    const raw = directive?.cast ?? directive?.characters ?? null;
    const list = [];
    const pushFig = (fig) => {
      if (!fig) return;
      const suggests =
        fig.suggestsCharacter ||
        (typeof fig.presence === 'number' ? fig.presence > 0.15 : !!fig.presence) ||
        !!(fig.characterId || fig.archetype || fig.kind || fig.outfitId || fig.members);
      if (!suggests && fig.presence !== 0) {
        if (!(fig.characterId || fig.archetype || fig.kind)) return;
      }
      if (fig.suggestsCharacter || (typeof fig.presence === 'number' ? fig.presence > 0.15 : !!fig.presence) ||
          fig.characterId || fig.archetype || fig.kind || fig.members) {
        list.push({
          kind: fig.kind || 'silhouette',
          count: 1,
          scale: Math.max(1.55, Number(fig.scale) || 1.55),
          placement: fig.placement || 'foreground',
          opacity: typeof fig.presence === 'number' ? Math.min(1, Math.max(0.9, 0.5 + fig.presence * 0.5)) : 0.95,
          action: fig.action || 'stand',
          holdSilent: !!fig.holdSilent,
          conceptId: fig.conceptId,
          characterId: fig.characterId,
          archetype: fig.archetype,
          outfitId: fig.outfitId || fig.outfit || fig.outfitTheme,
          style: fig.style || fig.look || fig.renderStyle,
          members: fig.members
        });
      }
    };
    if (!raw) {
      const fig = directive?.concept?.figure || directive?.phraseConcept?.figure || directive?.figure;
      pushFig(fig);
      return list;
    }
    if (Array.isArray(raw)) {
      for (const c of raw) {
        if (typeof c === 'object' && c) {
          list.push({ ...c, placement: c.placement || 'foreground' });
        } else {
          list.push({ kind: 'silhouette', count: 1, placement: 'foreground' });
        }
      }
    } else if (typeof raw === 'object') {
      list.push({ ...raw, placement: raw.placement || 'foreground' });
    }
    // Characters on + empty members but concept.figure suggests → fallback silhouette
    if (!list.length) {
      const fig = directive?.concept?.figure || directive?.phraseConcept?.figure || directive?.figure;
      pushFig(fig);
    }
    // Ensure each entry has placement default
    for (const c of list) {
      if (!c.placement) c.placement = 'foreground';
    }
    return list;
  }

  _drawOneFigure(ctx, w, h, spec, idx, total, directive, state) {
    const placement = spec.placement || 'foreground';
    const baseY = this._stageY(h, placement, directive, state);
    const count = Math.max(1, Math.min(6, Number(spec.count) || 1));
    const rawScale = Number(spec.scale);
    const dirScale = Math.max(1.55, Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1.55);
    const isLead = idx === 0;
    const targetFrac = isLead ? 0.62 : Math.max(0.42, 0.52 - idx * 0.04);
    const BODY_REF = 48;
    // HOLD-1345: NO max-16 clamp — lead body ≥ 0.55h on any canvas height
    let scale = (h * targetFrac / BODY_REF) * (dirScale / 1.55);
    if (!Number.isFinite(scale) || scale < 4) scale = Math.max(4, h * 0.55 / BODY_REF);
    let opacity = spec.opacity != null ? Number(spec.opacity) : 0.95;
    if (!Number.isFinite(opacity)) opacity = 0.95;
    const holdSilent = !!spec.holdSilent;
    if (holdSilent) opacity = Math.min(opacity, 0.35);
    else opacity = Math.max(0.9, Math.min(1, opacity)); // Characters-on opacity floor ≥0.9
    const action = (spec.action || 'stand').toString().toLowerCase();
    const t = state?.t || 0;
    const vibe = directive?.vibe || directive?.mood || state?.vibe || '';
    const sceneCast = directive?.cast && !Array.isArray(directive.cast) && typeof directive.cast === 'object' ? directive.cast : null;
    const requestedStyle =
      (spec.style === 'neon' || spec.style === 'dream') ? spec.style :
      (sceneCast?.style === 'neon' || sceneCast?.style === 'dream') ? sceneCast.style : null;
    const readableCast = !!(spec.readableCast || sceneCast?.readableCast);
    const lookSpec = requestedStyle
      ? { ...spec, style: requestedStyle }
      : (readableCast ? { ...spec, style: spec.style || 'neon', readableCast: true } : spec);
    const look = resolveCastLook(lookSpec, vibe);
    const spread = look.formation ? 0.36 : 0.28;
    const i = idx % Math.max(1, count);
    // Center-frame single dancer / fg lead; formation keeps lead near center-readable
    const tt = count === 1 ? 0.5 : (0.5 - spread / 2) + (spread * i) / Math.max(1, count - 1);
    const sway = holdSilent ? 0 : Math.sin(t * 0.35 + i) * 6;
    const fx = w * tt + sway;

    // Dance / role wiring for castLibrary (stacks on draw; never replaces lyrics/type)
    const roles = state?.audio?.roles || state?.roles || directive?.roles || {};
    const speechLike = !!(
      directive?.speechLike ||
      directive?.rolesIntent?.speechLike ||
      look.archetype === 'spoken_intimate' ||
      spec.archetype === 'spoken_intimate'
    );
    const danceIntent =
      spec.danceIntent ||
      spec.dance ||
      directive?.danceIntent ||
      directive?.cast?.dance ||
      directive?.cast?.danceIntent ||
      directive?.concept?.dance ||
      null;
    const section = directive?.section || state?.section || directive?.sectionId || '';
    const genreFamily =
      directive?.genreFamily ||
      directive?.genre ||
      state?.genreFamily ||
      directive?.concept?.genreFamily ||
      '';

    const drawn = drawCastFigure(ctx, {
      x: fx,
      baseY,
      scale,
      action,
      t,
      i,
      look,
      opacity,
      kind: spec.kind,
      archetype: look.archetype || spec.archetype,
      roles,
      roleId: spec.roleId || look.roleId || null,
      rolePulse: spec.rolePulse,
      danceIntent,
      speechLike,
      holdSilent,
      vibe,
      section,
      genreFamily
    });

    // Role-agent pulse FX + weapon story props (stack on cast; never replace)
    const roleId = spec.roleId || look.roleId || null;
    if (roleId && drawn) {
      drawRoleAgentFx(ctx, drawn, {
        roleId,
        rolePulse: spec.rolePulse,
        roles,
        audio: state?.audio,
        look,
        archetype: look.archetype || spec.archetype,
        style: look.style,
        t
      });
    }
    const weaponId = spec.weaponId || directive?.weaponId || null;
    if (weaponId && drawn) {
      drawWeaponProp(ctx, drawn, {
        weaponId,
        style: look.style,
        look,
        opacity,
        events: directive?.events || state?.events,
        t: state?.t ?? t,
        lyricIrony: !!(spec.lyricIrony || look.lyricIrony || directive?.lyricIrony || spec.irony || look.irony)
      });
    }

    if (idx === 0 && drawn) {
      this._figureAnchor = { x: drawn.fx, y: (drawn.headY + drawn.chestY) * 0.5 };
    }
  }

  /**
   * Stylized cast from directive.cast / characters / concept.figure.
   * Placement: sky~0.28h, mid~0.55h, foreground~0.72h (or Worlds stageBands).
   */
  _drawCast(ctx, w, h, directive, state) {
    this._figureAnchor = null;
    const castRaw = directive?.cast || directive?.characters || null;
    const kindNone = !!(castRaw && typeof castRaw === 'object' && !Array.isArray(castRaw) &&
      String(castRaw.kind || '').toLowerCase() === 'none');
    // Characters-on OR cast present → always attempt paint (kind=none still falls through to silhouette)
    if (!this.showCharacters && !castRaw && !directive?.concept?.figure && !directive?.figure) return;
    let list = kindNone ? [] : this._normalizeCastList(directive);
    // HOLD-2149: empty members / kind=none / Characters on → one large FG silhouette
    if (!list.length && (this.showCharacters || castRaw || directive?.concept?.figure || directive?.figure)) {
      const fig = directive?.concept?.figure || directive?.phraseConcept?.figure || directive?.figure || {};
      list = [{
        kind: (fig.kind && String(fig.kind).toLowerCase() !== 'none') ? fig.kind : 'silhouette',
        count: 1,
        scale: Math.max(1.55, Number(fig.scale) || 1.55),
        placement: fig.placement || 'foreground',
        opacity: 0.95,
        action: fig.action || 'stand',
        characterId: fig.characterId,
        archetype: fig.archetype || 'tableau_figure',
        outfitId: fig.outfitId || fig.outfit,
        style: fig.style || fig.look
      }];
    }
    if (!list.length) return;
    const CAP = 6;
    let drawn = 0;
    for (let s = 0; s < list.length; s++) {
      const spec = list[s];
      const members = Array.isArray(spec.members) ? spec.members : null;
      if (members && members.length) {
        for (let m = 0; m < members.length; m++) {
          const mem = members[m] || {};
          const merged = {
            ...spec,
            ...mem,
            // member fields win; keep parent archetype/outfit as fallback via resolve
            archetype: mem.archetype || spec.archetype,
            outfitId: mem.outfitId || mem.outfit || spec.outfitId || spec.outfit,
            style: mem.style || spec.style,
            characterId: mem.characterId || spec.characterId,
            kind: mem.kind || spec.kind,
            placement: mem.placement || spec.placement,
            // HOLD-2149: coerce NaN/'cinematic' → 1.55; hub=members[0]
            scale: Math.max(1.55, Number(mem.scale) || Number(spec.scale) || 1.55),
            opacity: Math.max(0.9, Number(mem.opacity) || Number(spec.opacity) || 0.95),
            action: mem.action || spec.action,
            holdSilent: mem.holdSilent != null ? mem.holdSilent : spec.holdSilent,
            roleId: mem.roleId || spec.roleId,
            rolePulse: mem.rolePulse != null ? mem.rolePulse : spec.rolePulse,
            weaponId: mem.weaponId || spec.weaponId,
            danceIntent: mem.danceIntent || mem.dance || spec.danceIntent || spec.dance,
            count: members.length
          };
          this._drawOneFigure(ctx, w, h, merged, drawn, members.length, directive, state);
          drawn++;
          if (drawn >= CAP) break;
        }
      } else {
        const n = Math.max(1, Math.min(CAP, Number(spec.count) || 1));
        for (let i = 0; i < n; i++) {
          this._drawOneFigure(ctx, w, h, { ...spec, count: n }, drawn, n, directive, state);
          drawn++;
          if (drawn >= CAP) break;
        }
      }
      if (drawn >= CAP) break;
    }
  }

  /** Scenic marks from directive.motifProps [{id,variant,strength,stage}]. */
  _drawMotifProps(ctx, w, h, directive, state) {
    const props = directive?.motifProps ?? state?.motifProps ?? null;
    if (!props) return;
    const items = Array.isArray(props) ? props.slice(0, 4) : [props];
    ctx.save();
    for (let i = 0; i < items.length; i++) {
      const p = items[i] || {};
      const strength = Math.max(0, Math.min(1, Number(p.strength) ?? 0.5));
      const stage = (p.stage || p.placement || 'mid').toString().toLowerCase();
      const y = this._stageY(h, stage, directive, state);
      const x = w * (0.22 + i * 0.2 + (i % 2) * 0.05);
      const variant = (p.variant || p.id || 'ember').toString().toLowerCase();
      ctx.globalAlpha = 0.15 + strength * 0.55;
      if (/line|slash|needle|dash/.test(variant)) {
        ctx.strokeStyle = 'rgba(255,240,210,0.85)';
        ctx.lineWidth = 1.5 + strength;
        ctx.beginPath();
        ctx.moveTo(x - 14, y);
        ctx.lineTo(x + 14, y - 18 * strength);
        ctx.stroke();
      } else if (/ember|fire|spark/.test(variant)) {
        ctx.fillStyle = `rgba(255,160,60,${0.35 + strength * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, 3 + strength * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,220,120,${0.2 + strength * 0.3})`;
        ctx.beginPath();
        ctx.arc(x + 4, y - 8, 2 + strength * 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(x, y, 5 + strength * 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${0.08 + strength * 0.12})`;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** Light vibe hooks — peaceful soft / chaos fracture / scary sparse. speechLike = minimal flash. */
  _applyVibeHooks(ctx, w, h, directive, state) {
    const vibe = (directive?.vibe || directive?.mood || '').toString().toLowerCase();
    const speechLike = !!(directive?.speechLike || directive?.rolesIntent?.speechLike);
    if (speechLike) {
      // Scenic type owns frame — throttle local flash spikes
      this._kickFlash *= 0.55;
      this._snareFlash *= 0.5;
      this._beam = Math.min(this._beam, 0.35);
      return;
    }
    if (!vibe) return;
    ctx.save();
    if (/peace|calm|soft|gentle|warm/.test(vibe)) {
      ctx.globalAlpha = 0.12;
      const g = ctx.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h * 0.4, w * 0.55);
      g.addColorStop(0, 'rgba(255,240,220,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      this._glitch *= 0.4;
    } else if (/chaos|fracture|glitch|wild/.test(vibe)) {
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < 5; i++) {
        const y = ((state?.t || 0) * 40 + i * 73) % h;
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, y, w, 2 + (i % 3));
      }
    } else if (/scar|horror|dark|sparse|lonely/.test(vibe)) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(0, 0, w, h * 0.35);
      ctx.fillRect(0, h * 0.75, w, h * 0.25);
      this._sparkBurst *= 0.35;
    }
    ctx.restore();
  }
}
