/**
 * rAF compose; Canvas2D; 60fps target; quality scale.
 * Roles animate HOW the world moves; lyrics direct WHAT world.
 * Prefer audio.roles || audio.instruments (see js/audio/ROLES.md).
 */
import { ContinuityEngine } from '../scene/continuity.js?v=cohere7';
import { CameraSystem } from '../camera/system.js';
import { LightingSystem } from '../lighting/system.js?v=cohere7';
import { TypographySystem, TYPO_BUILD } from '../typography/system.js?v=cohere7';
import { resolveCastLook, drawCastFigure, drawRoleAgentFx, drawWeaponProp, ARCHETYPE_IDS, OUTFIT_IDS } from './castLibrary.js?v=cohere7';
import { getMotionComfort } from '../a11y/motionPrefs.js';


/** HOLD-0330: module-level HUD — never depends on prototype lookup (TypeError-proof). */
function drawDebugHudImpl(ctx, w, h, directive, audio) {
  let show = true;
  try {
    const q = (typeof location !== 'undefined' && location.search) ? location.search : '';
    if (/[?&]debug=0(?:&|$)/.test(q)) show = false;
    else if (/[?&]debug=1(?:&|$)/.test(q)) show = true;
  } catch (_) { /* soft */ }
  if (!show) return;

  const vibe = audio?.vibe || {};
  const moment = audio?.moment || vibe?.moment || {};
  const hud = directive?.hardHud || {};
  const preset = directive?.preset || hud.preset || '—';
  const hardIds = hud.hardLockIds || ['metal_hall', 'reality_fracture', 'apocalyptic_warzone', 'red_void', 'storm'];
  const lines = [
    'LS DEBUG cohere7',
    `pinArmed ${!!(vibe.pinArmed || moment.pinArmed || hud.pinArmed)}  martial ${!!(vibe.martial || moment.martial || hud.martial)}`,
    `orchMart ${!!(vibe.orchestralMartial || moment.orchestralMartial || hud.orchestralMartial)}  softClear ${!!(vibe.softClear || moment.softClear)}`,
    `forbidPast ${!!(directive?.forbidPastoral || vibe.forbidPastoral || moment.forbidPastoral)}  aggLock ${!!(directive?.aggressionLock || vibe.aggressionLock || moment.aggressionLock)}`,
    `hardOnly ${!!(directive?.hardOnly || hud.hardOnly)}  nuclear ${!!hud.nuclearHard}  latch ${!!hud.latchLive}`,
    `hotMs ${hud.hotMs ?? '—'}  energy ${hud.energy ?? (audio?.energy != null ? Number(audio.energy).toFixed(3) : '—')}  kick ${hud.kick ?? '—'}`,
    `preset ${preset}  pack ${directive?.packFamily || hud.packFamily || '—'}  ladder ${hud.ladder || vibe.ladder || '—'}`
  ];

  // Paint never throws — box + text each guarded (empty B5 box = text fail)
  try {
    ctx.save();
    try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (_) { /* soft */ }
    const pad = 8;
    const lineH = 14;
    const boxW = Math.min((w || 400) - 16, 460);
    const boxH = pad * 2 + lines.length * lineH;
    try {
      ctx.globalAlpha = 0.78;
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.fillRect(8, 8, boxW, boxH);
    } catch (_) { /* soft */ }
    try {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#7CFFB2';
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let y = 8 + pad;
      for (const line of lines) {
        ctx.fillText(String(line), 8 + pad, y);
        y += lineH;
      }
    } catch (_) {
      try {
        ctx.fillStyle = '#7CFFB2';
        ctx.font = '12px monospace';
        ctx.fillText('LS DEBUG cohere7 (fallback)', 16, 20);
      } catch (__) { /* soft */ }
    }
    try { ctx.restore(); } catch (_) { /* soft */ }
  } catch (_) { /* never throw from HUD */ }
}

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
    this._vibeMatch = null; // live aggression ladder (WAVE vibe-match)
    this._aggSticky = 0; // decay-hold so soft packs can't flash pastoral mid-aggression
    this._hardLock = false; // Audio forbidPastoral / aggressionLock / ladder=aggressive
    this._hardHoldUntil = 0; // ms — Visual sticky hard look ≥15s once earned (pair Audio pin)
    this._motifMemoryUntil = 0; // ms — re-emphasize motif rim after chaos cool-down
    this._lastChaosPeakAt = 0;
    // HOLD-0330: bind HUD on instance so missing prototype never TypeErrors
    this._drawDebugHud = drawDebugHudImpl.bind(this);
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
   * LIVE vibe aggression 0..1 (WAVE vibe-match / MUSIC-BRIEF ladder).
   * Prefer audio.vibe.aggression; fallback chaos / harshWall / roles storm / directive / emotion.
   * Spoken/peace/ambient damp. Does not invent world themes.
   */
  _deriveVibeAggression(audio, directive, emotion) {
    const vibe = audio?.vibe || {};
    const texture = audio?.texture || {};
    const roles = this._roles(audio);
    const dirStr = (directive?.vibe || directive?.mood || '').toString().toLowerCase();
    const energy = Number(audio?.energy || 0);

    let agg = Number(vibe.aggression ?? vibe.aggressive ?? NaN);
    if (!Number.isFinite(agg)) {
      const chaos = Math.max(Number(vibe.chaos || 0), Number(vibe.chaotic || 0));
      const harshWall = Number(texture.harshWall || 0);
      const storm = Math.min(
        1,
        Number(roles.harsh || 0) * 0.45 +
          Number(roles.kick || 0) * 0.35 +
          energy * 0.35
      );
      const dirHit = /chaos|fracture|wild|aggress|metal|punk|war/.test(dirStr) ? 0.72 : 0;
      const emoAgg = Number(emotion?.aggression || emotion?.arousal || 0);
      agg = Math.max(chaos * 0.9, harshWall * 0.85, storm * 0.8, dirHit, emoAgg * 0.7);
    }
    agg = Math.max(0, Math.min(1, agg));

    const spoken = Math.max(
      Number(vibe.spoken || 0),
      Number(vibe.speechLike || 0),
      directive?.speechLike ? 0.7 : 0
    );
    const peace = Math.max(
      Number(vibe.peaceful || 0),
      Number(vibe.peace || 0),
      Number(vibe.calm || 0)
    );

    // Audio hard-lock flags (QA HOLD): forbidPastoral / aggressionLock / ladder=aggressive
    // Prefer live moment.* over smoothed vibe when present (NOW punches)
    const moment = audio?.moment || vibe?.moment || {};
    const ladder = (moment.ladder || vibe.ladder || '').toString().toLowerCase();
    const forbidPastoral = !!(moment.forbidPastoral || vibe.forbidPastoral || directive?.forbidPastoral);
    const aggressionLock = !!(moment.aggressionLock || vibe.aggressionLock || directive?.aggressionLock);
    const ladderAgg = ladder === 'aggressive' || ladder === 'chaos';
    const chaosN = Math.max(Number(vibe.chaos || 0), Number(vibe.chaotic || 0));
    const momentAgg = Number(moment.aggression || 0);
    if (Number.isFinite(momentAgg) && momentAgg > agg) agg = momentAgg;
    // HOLD-0321: Scene nuclear hardOnly must reach Visual (cannot lose to soft paint)
    let hardLock = forbidPastoral || aggressionLock || ladderAgg || agg >= 0.55 || chaosN > 0.55
      || !!(directive?.hardOnly || directive?.hardLock || directive?.hardHud?.hardOnly || directive?.hardHud?.nuclearHard);

    // Visual sticky hard look ≥15s once earned (Audio may dip soft mid-phrase — HOLD QA B2/B3)
    const nowHold = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (hardLock || agg >= 0.55) {
      this._hardHoldUntil = Math.max(this._hardHoldUntil || 0, nowHold + 15000);
    }
    const holdActive = nowHold < (this._hardHoldUntil || 0);
    if (holdActive) hardLock = true;

    if (hardLock) {
      // Floor aggression; never damp for soft/spoken while lock / hold active
      agg = Math.max(agg, aggressionLock || ladderAgg || forbidPastoral || holdActive ? 0.72 : 0.58);
    } else {
      if (spoken > 0.4) agg *= 1 - spoken * 0.85;
      else if (peace > 0.55 && agg < 0.5) agg *= 1 - peace * 0.55;
    }
    agg = Math.max(0, Math.min(1, agg));

    // Sticky agg: hold floor during 15s window; short cool only after timer expires
    if (agg >= 0.55 || hardLock || holdActive) {
      this._aggSticky = Math.max(this._aggSticky, agg, 0.72);
    } else {
      this._aggSticky *= 0.965; // short cool after 15s hold ends
      if (this._aggSticky < 0.2) this._aggSticky = 0;
    }
    const stickyAgg = Math.max(agg, this._aggSticky, holdActive ? 0.72 : 0);

    const scary = Math.max(
      Number(vibe.scary || 0),
      /scar|horror|dread|isolat/.test(dirStr) ? 0.6 : 0
    );
    const tense = Math.max(
      Number(vibe.tense || 0),
      /tense|build|tighten/.test(dirStr) ? 0.5 : 0
    );
    const dominant = (vibe.dominant || '').toString().toLowerCase();

    const pack = (
      directive?.preset || directive?.world || directive?.pack || directive?.worldId ||
      directive?.worldPack || directive?.packFamily || directive?.worldFamily || ''
    ).toString().toLowerCase();
    let packChaos = /warzone|fracture|storm|void.?red|industrial|chaos|ash|tunnel|metal.?hall/.test(pack);
    let packPastoral = /pastoral|forest|ocean|meadow|dream.?cloud|highway.?dusk|heal|snow|deer/.test(pack);
    // Hard lock: treat pack as chaos for lighting/motion; NEVER pastoral bloom
    if (hardLock || stickyAgg >= 0.55) {
      packChaos = true;
      packPastoral = false;
      agg = Math.min(1, Math.max(stickyAgg, 0.62) + 0.08);
    } else {
      if (packChaos) agg = Math.min(1, Math.max(agg, 0.62) + 0.08);
      if (packPastoral && agg < 0.5) agg *= 0.7;
    }

    let mode = 'neutral';
    if (hardLock || stickyAgg >= 0.55 || packChaos || dominant === 'chaos' || chaosN > 0.55) {
      mode = 'chaos';
    } else if (spoken > 0.45 || dominant === 'spoken') mode = 'spoken';
    else if ((scary > 0.45 && stickyAgg < 0.55) || dominant === 'scary') mode = 'scary';
    else if (tense > 0.45 || dominant === 'tense') mode = 'tense';
    else if (peace > 0.45 || dominant === 'peace' || packPastoral) mode = 'peace';

    this._hardLock = !!(hardLock || holdActive || mode === 'chaos');

    // Motif memory: after chaos peak cool-down, briefly re-emphasize planted motif/cast rim
    const now = nowHold;
    if (mode === 'chaos' && stickyAgg >= 0.7) {
      this._lastChaosPeakAt = now;
    } else if (
      this._lastChaosPeakAt > 0 &&
      now - this._lastChaosPeakAt > 900 &&
      now - this._lastChaosPeakAt < 2800 &&
      this._motifMemoryUntil < now
    ) {
      this._motifMemoryUntil = now + 1100;
    }

    return {
      aggression: Math.max(0, Math.min(1, Math.max(agg, stickyAgg))),
      mode,
      spoken,
      peace: hardLock ? 0 : peace,
      scary,
      tense,
      dominant,
      chaos: chaosN,
      packChaos,
      packPastoral: hardLock ? false : packPastoral,
      hardLock: this._hardLock,
      forbidPastoral,
      aggressionLock,
      ladder,
      stickyAgg,
      hardHoldUntil: this._hardHoldUntil || 0,
      hardHoldActive: holdActive
    };
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

  /**
   * Coherence-hard transition bridge: prefer morph/crossfade; refuse jump-cut soup
   * unless Scene stamped an earned cut (breakdown/drop/chapter) or mode=cut + earnedCut.
   * Mid-aggression: never let a soft pastoral destination "win" the morph visually —
   * keep hardLock intensity sticky (overlays handle HARD lighting).
   */
  _resolveCoherentTransition(directive, audio, vm) {
    const tr = directive?.transition;
    if (!tr || !tr.from) return tr || null;
    const sec = (directive?.sectionType || directive?.section || '').toString().toLowerCase();
    const earned =
      tr.earnedCut === true ||
      tr.mode === 'earned_cut' ||
      tr.chapterCut === true ||
      /^(breakdown|drop|chapter)$/.test(sec) ||
      (Array.isArray(directive?.events) && directive.events.some(
        (e) => e === 'sky_tear' || e === 'collapse' || (e && e.type === 'chapter_cut')
      ));
    const toStr = (tr.to || '').toString().toLowerCase();
    const fromStr = (tr.from || '').toString().toLowerCase();
    // HARD_LOCK allowlist — anything else under pin is a soft/pale/copper win risk (Path F)
    const HARD_IDS = /^(metal_hall|reality_fracture|apocalyptic_warzone|red_void|storm)$/;
    const toSoft = !HARD_IDS.test(toStr) ||
      /pastoral|forest|meadow|ocean|heal|snow|dream.?cloud|deer|white_void|empty_highway|linen|moss|spoken|highway.?dusk/.test(toStr);
    const moment = audio?.moment || directive?.moment || {};
    const hard = !!(
      vm?.hardLock || vm?.hardHoldActive || vm?.mode === 'chaos' ||
      vm?.forbidPastoral || vm?.aggressionLock ||
      directive?.forbidPastoral || directive?.aggressionLock ||
      directive?.hardOnly || directive?.hardLock || directive?.hardHud?.nuclearHard ||
      moment.forbidPastoral || moment.aggressionLock ||
      (moment.ladder || vm?.ladder || '') === 'aggressive' ||
      (vm?.aggression || 0) >= 0.55 || (vm?.stickyAgg || 0) >= 0.55
    );

    // Refuse unearned hard cuts mid-phrase → force morph
    let mode = tr.mode || 'morph';
    if (mode === 'cut' && !earned) mode = 'morph';
    // Mid-aggression: refuse soft destination "winning" via cut; morph + hard overlays
    if (hard && toSoft && !earned) mode = 'morph';

    const out = { ...tr, mode, forceMorph: mode === 'morph' };
    // Path F: ANY non-hard destination under hardLock → Continuity skips soft `to` paint
    if (hard && (toSoft || !HARD_IDS.test(toStr))) out.refuseSoftWin = true;
    // Preserve world-family continuity hint for ContinuityEngine bridge
    out.worldFamily = directive?.worldFamily || directive?.packFamily || null;
    out.hardLock = hard;
    return out;
  }

  /** Scene-stamped weaponId only (stickyWeaponId / cast / members / motifProps). */
  _resolveWeaponId(directive, spec = null) {
    const pick = (v) => {
      if (v == null) return null;
      const s = String(v).toLowerCase().replace(/-/g, '_');
      return (!s || s === 'none') ? null : s;
    };
    const fromSpec = pick(spec?.weaponId);
    if (fromSpec) return fromSpec;
    const cast = directive?.cast;
    if (cast && typeof cast === 'object' && !Array.isArray(cast)) {
      const hub = pick(cast.weaponId) || pick(cast.stickyWeaponId);
      if (hub) return hub;
      if (Array.isArray(cast.members)) {
        for (const m of cast.members) {
          const w = pick(m?.weaponId);
          if (w) return w;
        }
      }
    }
    const sticky = pick(directive?.stickyWeaponId) || pick(directive?.weaponId);
    if (sticky) return sticky;
    const props = directive?.motifProps;
    if (Array.isArray(props)) {
      for (const p of props) {
        const w = pick(p?.weaponId);
        if (w) return w;
      }
    }
    return null;
  }

  /**
   * After chaos/aggression peak cool-down — briefly re-emphasize planted motif / sticky cast rim
   * so the brain stitches continuity (MUSIC-BRIEF motif memory). Subtle, not new FX soup.
   */
  _drawMotifMemory(ctx, w, h, directive, state) {
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now > this._motifMemoryUntil) return;
    const remain = (this._motifMemoryUntil - now) / 1100;
    const alpha = Math.max(0, Math.min(0.22, remain * 0.22));
    if (alpha < 0.03) return;
    const ax = this._figureAnchor?.x ?? w * 0.5;
    const ay = this._figureAnchor?.y ?? h * 0.48;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Soft rim ring on sticky figure / motif locus — continuity stitch, not teleport FX
    ctx.strokeStyle = 'rgba(255,230,200,0.85)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(ax, ay, w * 0.07, h * 0.14, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (directive?.motif || directive?.stickyCharacterId) {
      ctx.strokeStyle = 'rgba(255,200,140,0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(ax, ay - h * 0.08, 10 + (1 - remain) * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Shared clock for near-full whiteOut bumps (kick_punch / snare_flash ≥0.45). */
  _noteNearFullWhite(now) {
    this._lastWhiteFlash = now;
  }

  _updateInstruments(audio, dt, now, rolesIntent = {}) {
    const roles = this._roles(audio);
    const ri = rolesIntent || {};
    const g = this._pleasure || {};
    const vm = this._vibeMatch || { aggression: 0, mode: 'neutral' };
    // LIVE NOW — prefer audio.moment / vibe.moment over smoothed roles for punch attack
    const moment = audio?.moment || audio?.vibe?.moment || {};
    const mKick = Number(moment.kick ?? roles.kick ?? 0);
    const mSnare = Number(moment.snare ?? roles.snare ?? 0);
    const mVocal = Number(moment.vocalish ?? roles.vocalish ?? roles.lead ?? 0);
    const mHarsh = Number(moment.harsh ?? roles.harsh ?? 0);
    const mDrop = Number(moment.drop ?? audio?.drop ?? 0);
    const mAgg = Number(moment.aggression ?? vm.aggression ?? 0);
    const mLock = !!(moment.aggressionLock || moment.forbidPastoral || vm.hardLock ||
      vm.aggressionLock || vm.forbidPastoral || (vm.ladder || moment.ladder) === 'aggressive');
    let agg = Math.max(vm.aggression || 0, mAgg);
    let mode = mLock ? 'chaos' : (vm.mode || 'neutral');
    if (mLock) agg = Math.max(agg, 0.72);
    // Fast-attack NOW punches (before mul/decay) — sticky world, live punch
    if (mKick > 0.4) {
      this._kickFlash = Math.max(this._kickFlash, mKick * (mLock ? 1.25 : 1.05));
      if (!getMotionComfort().muteGroundShake) {
        this._groundShake = Math.max(this._groundShake, mKick * (mLock ? 22 : 16));
      }
    }
    if (mSnare > 0.45) {
      this._snareFlash = Math.max(this._snareFlash, mSnare * (mLock ? 1.15 : 0.95));
      this._kickFlash = Math.max(this._kickFlash, mSnare * 0.55);
    }
    if (mHarsh > 0.5 || (mLock && mAgg >= 0.55)) {
      this._glitch = Math.max(this._glitch, Math.min(0.95, mHarsh * 0.9 + (mLock ? 0.35 : 0)));
    }
    if (mVocal > 0.35) {
      this._beam = Math.max(this._beam, Math.min(0.55, mVocal * 0.75));
    }
    if (mDrop > 0.5) {
      this._kickFlash = Math.max(this._kickFlash, mDrop * 0.85);
    }

    let kMul = g.kickMul != null ? g.kickMul : 1;
    let sMul = g.snareMul != null ? g.snareMul : 1;
    let spMul = g.sparkMul != null ? g.sparkMul : 1;
    let glMul = g.glitchMul != null ? g.glitchMul : 1;
    // MUSIC-BRIEF ladder: mood-distinct motion sharpness (not palette recolor)
    let punchExtra = 1;
    let flashDecay = 0.84;
    let shakeDecay = 0.86;
    if (mode === 'spoken' || mode === 'peace' || vm.packPastoral) {
      const soft = Math.max(vm.spoken || 0, vm.peace || 0, vm.packPastoral ? 0.7 : 0, 0.55);
      kMul *= 0.28 + (1 - soft) * 0.35;
      sMul *= 0.22;
      glMul *= 0.08;
      spMul *= 0.55;
      punchExtra = 0.35;
      flashDecay = 0.78;
      shakeDecay = 0.72;
    } else if (mode === 'scary') {
      kMul *= 0.4; // sparse startle — not party strobe
      sMul *= 0.35;
      glMul *= 0.5;
      spMul *= 0.3;
      punchExtra = 0.45;
      flashDecay = 0.8;
    } else if (mode === 'tense') {
      kMul *= 0.85 + agg * 0.2;
      sMul *= 0.9 + agg * 0.1;
      glMul *= 0.35 + agg * 0.25;
      punchExtra = 0.9 + agg * 0.15;
    } else if (mode === 'chaos' || agg >= 0.55 || vm.packChaos) {
      const packBoost = vm.packChaos ? 0.12 : 0;
      kMul *= 1 + agg * 0.55 + packBoost; // sharper kick punch / warzone
      sMul *= 1 + agg * 0.45 + packBoost;
      glMul *= 1 + agg * 0.75 + packBoost; // fracture/ash
      spMul *= 0.35; // mute candy sparkle in storm
      punchExtra = 1 + agg * 0.55 + packBoost;
      flashDecay = 0.88; // hold punch a tick longer
      shakeDecay = 0.9;
    }
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
        this._groundShake = Math.max(
          this._groundShake,
          kick * 18 * (1 + shakeBoost * 0.6) * Math.min(1.35, 0.35 + kMul) * punchExtra * (_gc.localFlashScale || 1)
        );
      }
    }
    if (shakeBoost > 0.55) {
      const _gc2 = getMotionComfort();
      if (!_gc2.muteGroundShake) {
        this._groundShake = Math.max(
          this._groundShake,
          shakeBoost * 14 * Math.min(1.35, 0.35 + kMul) * punchExtra * (_gc2.localFlashScale || 1)
        );
      }
    }
    if (kick > 0.7) {
      this._tryWhiteFlash(now, g.laserDrop && g.isLift ? 'drop' : 'kick');
    }
    this._kickFlash *= flashDecay;
    this._groundShake *= shakeDecay;

    // Bass → world scale / vignette weight (+ classical scaleSwell)
    // Tense/chaos tighten vignette; peace keeps open frame (continuity, not teleport)
    let targetScale = 1 + bass * 0.08 + vigBoost * 0.04;
    let vig = 0.2 + bass * 0.52 + vigBoost * 0.28;
    if (mode === 'tense') vig += 0.08 + (vm.tense || 0.4) * 0.12;
    else if (mode === 'chaos' || agg >= 0.55) vig += 0.1 + agg * 0.12;
    else if (mode === 'scary') vig += 0.14;
    else if (mode === 'peace' || mode === 'spoken') vig *= 0.72;
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

    // Pads → sky / fog (peace/spoken silk bloom bed)
    let fogTarget = pads * 0.65;
    if (mode === 'peace' || mode === 'spoken') fogTarget = Math.max(fogTarget, 0.32 + (vm.peace || vm.spoken || 0) * 0.2);
    else if (mode === 'chaos' || agg >= 0.55) fogTarget *= 0.45; // clearer fracture, less wash
    else if (mode === 'scary') fogTarget = Math.max(fogTarget * 0.5, 0.12);
    this._fog += (fogTarget - this._fog) * 0.1;

    // Lead/vocalish → center beams (+ gospel grace boost)
    let beamTarget = lead * 0.8;
    if (g.graceLight) beamTarget = Math.min(1, beamTarget * 1.2 + 0.1);
    this._beam += (Math.min(0.7, beamTarget) - this._beam) * 0.22;
    this._beam = Math.min(this._beam, 0.55);

    // Harsh → glitch/ash (gated; rock/metal ok, gospel zero; chaos boosts)
    let glIn = harsh * 0.9 * glMul;
    if (g.graceLight) glIn = 0;
    if (!g.glitchOk && !g.rockPunch && !g.noiseTexture) glIn *= 0.55;
    if (mode === 'chaos' || agg >= 0.55) {
      glIn = Math.max(glIn, agg * 0.55 * glMul);
    } else if (mode === 'scary') {
      glIn = Math.min(glIn, 0.28); // rare startle, not ash spam
    }
    this._glitch = Math.max(this._glitch * 0.82, glIn);

    // Beat punch into lighting pulse — throttle for silk / negative space / spoken
    if (audio?.beat) {
      let beatNudge = g.silkMode || g.negativeSpace ? 0.12 : g.barEnergy ? 0.42 : 0.35;
      if (mode === 'spoken' || mode === 'peace') beatNudge *= 0.35;
      else if (mode === 'scary') beatNudge *= 0.4;
      else if (mode === 'chaos' || agg >= 0.55) beatNudge *= 1 + agg * 0.35;
      this._kickFlash = Math.max(this._kickFlash, beatNudge * kMul);
    }

    // EDM: one earned bloom on drop (tracked via _lastEdmBloom)
    if (g.bloomOnce && g.laserDrop && g.isLift && (audio?.drop || 0) > 0.5) {
      this._tryWhiteFlash(now, 'drop');
    }

    // Soft ladder damp after spikes (peace/spoken never keep flashy residue)
    if (mode === 'spoken' || mode === 'peace') {
      this._kickFlash *= 0.55;
      this._snareFlash *= 0.5;
      this._glitch *= 0.2;
      this._groundShake *= 0.35;
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

    // Live vibe ladder → lighting/motion (Audio vibe-match; Scene packs may lag)
    this._vibeMatch = this._deriveVibeAggression(audio, directive, emotion);

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
    const light = this.lighting.update(
      audio,
      emotion,
      directive?.intensity || 0.5,
      this._vibeMatch
    );

    // Camera: earned travel/spin punctuation only (coherence-hard). Soft/peace/spoken → drift.
    // Push/orbit only on energy/chorus/drop peaks — NOT constant chaos. A11y mutes shake/whip.
    const _camC = getMotionComfort();
    let camMode = directive?.camera || null;
    const vmCam = this._vibeMatch || {};
    const energyCam = Number(audio?.energy || 0);
    const dropCam = Number(audio?.drop || 0);
    const secCam = (directive?.sectionType || directive?.section || '').toString().toLowerCase();
    const chorusPeak = /chorus|drop|breakdown/.test(secCam) || dropCam > 0.45;
    const hardCam = !!(vmCam.hardLock || vmCam.hardHoldActive || vmCam.mode === 'chaos' || (vmCam.aggression || 0) >= 0.55 || (vmCam.stickyAgg || 0) >= 0.55);
    if (_camC.reduceMotion) {
      camMode = 'drift';
    } else if (!camMode) {
      if (vmCam.mode === 'spoken' || vmCam.mode === 'peace' || (vmCam.packPastoral && !hardCam)) {
        camMode = 'drift'; // slow drift only
      } else if (vmCam.mode === 'scary') {
        camMode = 'drift';
      } else if (hardCam && (chorusPeak || energyCam > 0.55)) {
        camMode = 'push'; // earned peak punctuation
      } else if (vmCam.mode === 'tense' && (chorusPeak || energyCam > 0.58)) {
        camMode = 'push';
      } else if (hardCam && energyCam > 0.42) {
        camMode = 'push';
      } else {
        camMode = 'drift';
      }
    } else if ((vmCam.mode === 'spoken' || vmCam.mode === 'peace') && !hardCam) {
      // Soft song: Scene-stamped orbit/spin → demote to drift (punctuation only when hard)
      if (camMode === 'orbit' || camMode === 'spin' || camMode === 'whip') camMode = 'drift';
    } else if (!chorusPeak && !hardCam && energyCam < 0.5 && (camMode === 'orbit' || camMode === 'spin')) {
      camMode = 'drift'; // refuse constant spin
    }
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
      quality: this.quality,
      // HOLD-0321: Worlds hard flags → presets fauna/soft-strip
      forbidPastoral: !!(directive?.forbidPastoral || directive?.hardOnly || this._hardLock),
      hardLock: !!(directive?.hardLock || directive?.hardOnly || this._hardLock),
      hardOnly: !!directive?.hardOnly
    };

    const coherentTr = this._resolveCoherentTransition(directive, audio, this._vibeMatch);
    this.continuity.draw(ctx, w, h, state, coherentTr);

    // Through-screen scenic travel (parallax/drift/sweep) — not a static postcard
    this._drawScenicTravel(ctx, w, h, state, directive);

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

    // Motif memory after chaos cool-down (subtle rim stitch)
    this._drawMotifMemory(ctx, w, h, directive, state);

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

    // HOLD-0338 DEBUG HUD — call ONLY module drawDebugHudImpl (no this._drawDebugHud TypeError)
    try {
      drawDebugHudImpl(ctx, w, h, directive, audio);
    } catch (_) { /* never break render */ }
  }


  /**
   * HOLD-0330: on-canvas proof HUD — delegates to module impl (prototype always present).
   * Default ON; ?debug=0 off; ?debug=1 forces on.
   */
  _drawDebugHud(ctx, w, h, directive, audio) {
    drawDebugHudImpl(ctx, w, h, directive, audio);
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
    const vmLook = this._vibeMatch || {};
    // Live directive/moment — even if vibeMatch lag (Path F / cohere2 verify)
    const momentLook = state?.audio?.moment || directive?.moment || {};
    const hardLook = !!(
      vmLook.hardLock || vmLook.hardHoldActive || vmLook.mode === 'chaos' ||
      vmLook.forbidPastoral || vmLook.aggressionLock ||
      directive?.forbidPastoral || directive?.aggressionLock ||
      momentLook.forbidPastoral || momentLook.aggressionLock ||
      (momentLook.ladder || vmLook.ladder || '') === 'aggressive' ||
      (vmLook.aggression || 0) >= 0.55 || (vmLook.stickyAgg || 0) >= 0.55
    );
    // Mid-aggression / hard hold: NEVER pale soft / green rim / pastoral (QA HOLD B2/B3)
    let lookSpecBase = requestedStyle
      ? { ...spec, style: requestedStyle }
      : (readableCast ? { ...spec, style: spec.style || 'neon', readableCast: true } : { ...spec });
    if (hardLook) {
      const softOutfit = /linen_dawn|aisle_linen|pastoral|moss|meadow|forest|pale_void|room_clothes|water_gloss|industrial_hazard|highway_dust/.test(
        String(lookSpecBase.outfitId || lookSpecBase.outfit || lookSpecBase.archetype || '').toLowerCase()
      );
      const softArch = /pastoral_walker|nature_fauna|sacred_solitary|void_presence|spoken_intimate|cosmic_dissolve/.test(
        String(lookSpecBase.archetype || '').toLowerCase()
      );
      if (softOutfit || softArch) {
        lookSpecBase = {
          ...lookSpecBase,
          archetype: isLead ? 'fg_performer' : 'chaos_fracture',
          outfitId: isLead ? 'ember_coat' : 'fracture_rag',
          outfit: isLead ? 'ember_coat' : 'fracture_rag',
          style: 'silhouette'
        };
      } else {
        // Neon glow amplifies any residual green — force silhouette under hard hold
        lookSpecBase = { ...lookSpecBase, style: 'silhouette' };
      }
    }
    const look = resolveCastLook(lookSpecBase, hardLook ? 'chaos' : vibe);
    if (hardLook && look.palette) {
      // Warzone/fracture ash-ember-red ONLY — kill green + pale soft + pastoral copper
      look.palette = {
        fill: 'rgba(6,5,6,0.97)',
        rim: 'rgba(255,120,60,0.95)',
        accent: 'rgba(220,40,30,0.85)',
        shadow: 'rgba(4,3,4,0.75)'
      };
      look.style = 'silhouette';
      if (look.fauna) look.fauna = false;
    }
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

    const energy = Number(state?.audio?.energy ?? state?.energy ?? 0);
    const arousal = Number(
      state?.audio?.vibe?.arousal ?? state?.emotion?.arousal ?? this._vibeMatch?.aggression ?? 0
    );
    const castRole =
      spec.role ||
      spec.castRole ||
      directive?.cast?.role ||
      sceneCast?.role ||
      null;
    const packId =
      directive?.worldPack ||
      directive?.packId ||
      directive?.world?.id ||
      directive?.world?.pack ||
      state?.worldPack ||
      '';
    // Sticky cast identity + hardLock → phone-readable vocalist (QA HOLD B2/B3 blob fix)
    const stickyId = spec.characterId || directive?.stickyCharacterId || sceneCast?.characterId || null;
    const vmCast = this._vibeMatch || {};
    const hardCast = !!(vmCast.hardLock || vmCast.hardHoldActive || vmCast.mode === 'chaos' || (vmCast.aggression || 0) >= 0.55 || (vmCast.stickyAgg || 0) >= 0.55);
    let roleIdDraw = spec.roleId || look.roleId || null;
    // Lead FG / sticky performer → force vocalist-readable silhouette when Characters on
    if (!roleIdDraw && isLead && (this.showCharacters || !!directive?.cast)) {
      if (castRole && /vocal|performer|singer|lead/.test(String(castRole).toLowerCase())) {
        roleIdDraw = /performer/.test(String(castRole).toLowerCase()) ? 'performer' : 'vocalish';
      } else if (
        stickyId ||
        look.archetype === 'fg_performer' ||
        /foreground|fg/.test(placement) ||
        hardCast
      ) {
        // Lead FG present → coat/mic wedge must read (not pastoral blob)
        roleIdDraw = 'vocalish';
      }
    }
    const drawn = drawCastFigure(ctx, {
      x: fx,
      baseY,
      scale,
      action,
      t,
      i,
      look,
      opacity: hardCast ? Math.max(opacity, 0.95) : opacity,
      kind: spec.kind,
      archetype: look.archetype || spec.archetype,
      roles,
      roleId: roleIdDraw,
      rolePulse: spec.rolePulse,
      danceIntent,
      speechLike: hardCast ? false : speechLike,
      holdSilent,
      vibe: hardCast ? 'chaos' : vibe,
      section,
      genreFamily,
      energy,
      arousal,
      placement,
      isLead,
      castRole,
      directiveRole: castRole,
      packId: hardCast ? (packId || 'warzone') : packId,
      characterId: stickyId,
      stickyCharacterId: stickyId,
      hardLock: hardCast,
      aggression: vmCast.aggression || 0,
      charactersOn: !!(this.showCharacters || !!directive?.cast)
    });

    // Role-agent pulse FX + weapon story props (stack on cast; never replace)
    let roleId = roleIdDraw || spec.roleId || look.roleId || null;
    if (!roleId && castRole && /vocal|performer|singer|lead/.test(String(castRole).toLowerCase())) {
      roleId = /performer/.test(String(castRole).toLowerCase()) ? 'performer' : 'vocalish';
    }
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
    // Scene-stamped weaponId only (stickyWeaponId / cast / members / motifProps)
    const weaponId = this._resolveWeaponId(directive, spec);
    if (weaponId && drawn) {
      const vmW = this._vibeMatch || {};
      const hardW = !!(vmW.hardLock || vmW.hardHoldActive || vmW.mode === 'chaos' || (vmW.aggression || 0) >= 0.55 || (vmW.stickyAgg || 0) >= 0.55);
      drawWeaponProp(ctx, drawn, {
        weaponId,
        style: hardW ? (look.style === 'dream' ? 'silhouette' : look.style) : look.style,
        look,
        opacity: Math.max(opacity, hardW ? 0.94 : opacity),
        events: directive?.events || state?.events,
        t: state?.t ?? t,
        vibe,
        packId: hardW ? (packId || 'warzone') : packId,
        worldPack: hardW ? (packId || 'warzone') : packId,
        hardLock: hardW,
        aggression: vmW.aggression || 0,
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

  /**
   * Through-screen scenic travel — parallax haze / sweep / ground push.
   * Intensity follows vibe.ladder + pack family (chaos/warzone harder, pastoral soft).
   * A11y reduceMotion → skip. Does not invent worlds; overlays only.
   */
  _drawScenicTravel(ctx, w, h, state, directive) {
    const comfort = getMotionComfort();
    if (comfort.reduceMotion) return;

    const audio = state?.audio || {};
    const vm = this._vibeMatch || {};
    const energy = Number(audio.energy || 0);
    const bass = Number(audio.bass || audio.roles?.bass || 0);
    const kick = Number(audio.roles?.kick || 0);
    const drop = Number(audio.drop || 0);
    const t = state?.t || 0;
    const mode = vm.mode || 'neutral';
    const agg = vm.aggression || 0;
    const hard = !!(vm.hardLock || vm.hardHoldActive || mode === 'chaos' || agg >= 0.55 || (vm.stickyAgg || 0) >= 0.55
      || directive?.hardOnly || directive?.hardLock || directive?.hardHud?.hardOnly || directive?.hardHud?.nuclearHard
      || vm.forbidPastoral || vm.aggressionLock);
    const pack = (
      directive?.preset || directive?.world || directive?.pack || directive?.worldId ||
      directive?.packFamily || ''
    ).toString().toLowerCase();
    const packChaos = hard || /warzone|fracture|storm|void.?red|industrial|chaos|ash|tunnel|metal.?hall|red.?void/.test(pack);
    const packPastoral = !hard && /pastoral|forest|ocean|meadow|dream.?cloud|highway.?dusk|heal|snow/.test(pack);
    const sec = (directive?.sectionType || directive?.section || '').toString().toLowerCase();
    const peak = /chorus|drop|breakdown/.test(sec) || drop > 0.45 || (kick > 0.55 && energy > 0.5);

    // Earned travel only: soft/peace/spoken → slow drift; sweep/punch on peaks
    let speed = 0.18 + energy * 0.55;
    let alpha = 0.035 + energy * 0.045;
    let allowSweep = false;
    let allowPunch = false;
    if (mode === 'spoken' || mode === 'peace' || packPastoral) {
      speed *= 0.28; // slow drift only
      alpha *= 0.4;
      allowSweep = false;
      allowPunch = false;
    } else if (mode === 'scary') {
      speed *= 0.32;
      alpha *= 0.55;
    } else if (mode === 'tense') {
      speed *= 0.7;
      alpha *= 0.85;
      allowSweep = peak;
      allowPunch = peak && kick > 0.4;
    } else if (hard || packChaos || agg >= 0.55) {
      // Punctuation on peaks — not constant chaos soup
      speed *= peak ? (1.15 + agg * 0.35) : (0.55 + energy * 0.35);
      alpha *= peak ? 1.15 : 0.7;
      allowSweep = peak || energy > 0.58;
      allowPunch = peak || (kick > 0.5 && agg >= 0.55);
    } else {
      allowSweep = peak;
      allowPunch = peak && kick > 0.45;
    }
    if (comfort.lessFlash) { speed *= 0.5; alpha *= 0.55; allowSweep = false; }
    if (alpha < 0.025 && speed < 0.15) return;

    ctx.save();
    // Far layer — slow horizontal haze bands (parallax)
    const driftFar = ((t * 22 * speed) % (w * 0.5)) - w * 0.15;
    ctx.globalAlpha = Math.min(0.14, alpha * 0.9);
    for (let i = 0; i < 3; i++) {
      const y = h * (0.12 + i * 0.1);
      const g = ctx.createLinearGradient(driftFar + i * 80, y, driftFar + w * 0.55 + i * 80, y + 8);
      if (mode === 'chaos' || packChaos) {
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.4, 'rgba(180,40,30,0.55)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
      } else if (mode === 'peace' || packPastoral) {
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.4, 'rgba(200,230,255,0.5)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
      } else {
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.4, 'rgba(160,180,220,0.45)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, y, w, 10 + i * 3);
    }

    // Mid layer — diagonal sweep ONLY when earned (peak/high energy)
    if (allowSweep) {
      const sweep = ((t * 40 * speed) % (w * 1.2)) - w * 0.3;
      ctx.globalAlpha = Math.min(0.12, alpha);
      ctx.beginPath();
      ctx.moveTo(sweep, 0);
      ctx.lineTo(sweep + w * 0.18, 0);
      ctx.lineTo(sweep + w * 0.05, h);
      ctx.lineTo(sweep - w * 0.12, h);
      ctx.closePath();
      if (hard || mode === 'chaos' || packChaos) ctx.fillStyle = 'rgba(160,200,230,0.32)'; // cold steel, not warm peach
      else if (mode === 'scary') ctx.fillStyle = 'rgba(40,60,90,0.4)';
      else ctx.fillStyle = 'rgba(255,250,235,0.3)';
      ctx.fill();
    }

    // Near layer — ground push only when earned punch / hard peak
    const groundShift = Math.sin(t * (1.2 + speed)) * w * 0.02 * (0.4 + bass + kick);
    const punch = allowPunch
      ? Math.min(0.16, (kick * 0.1 + bass * 0.06) * (hard || packChaos ? 1.35 : 1))
      : 0;
    if (!comfort.muteGroundShake && allowPunch && (punch > 0.02 || Math.abs(groundShift) > 1)) {
      ctx.globalAlpha = Math.min(0.18, alpha + punch);
      const gg = ctx.createLinearGradient(0, h * 0.62, 0, h);
      gg.addColorStop(0, 'rgba(0,0,0,0)');
      if (hard || mode === 'chaos' || packChaos) {
        // HOLD-0330: ash / crimson / steel — NEVER warm orange punch under hardLock
        gg.addColorStop(1, `rgba(140,40,30,${0.28 + punch})`);
      } else if (mode === 'peace' || packPastoral) {
        gg.addColorStop(1, `rgba(180,210,255,${0.18 + punch * 0.5})`);
      } else {
        gg.addColorStop(1, `rgba(255,230,180,${0.2 + punch})`);
      }
      ctx.fillStyle = gg;
      ctx.fillRect(groundShift, h * 0.6, w, h * 0.4);
    }
    ctx.restore();
  }

  /**
   * Mood-distinct lighting/motion overlays (coherence brief).
   * Not palette recolor — contrast / fracture / flash duty / motion sharpness per rung.
   * Soft-clip / whiteOut gates untouched; scenic continuity preserved.
   */
  _applyVibeHooks(ctx, w, h, directive, state) {
    const audio = state?.audio || {};
    const vm = this._vibeMatch || this._deriveVibeAggression(audio, directive, state?.emotion);
    const vibe = (directive?.vibe || directive?.mood || vm.dominant || '').toString().toLowerCase();
    const agg = vm.aggression || 0;
    const hard = !!(vm.hardLock || vm.hardHoldActive || vm.forbidPastoral || vm.aggressionLock ||
      vm.ladder === 'aggressive' || vm.mode === 'chaos' || agg >= 0.55 ||
      (vm.stickyAgg || 0) >= 0.55 || (vm.chaos || 0) > 0.55 ||
      directive?.hardOnly || directive?.hardLock || directive?.hardHud?.nuclearHard ||
      directive?.hardHud?.hardOnly);
    const speechLike = !!(
      directive?.speechLike ||
      directive?.rolesIntent?.speechLike ||
      vm.mode === 'spoken'
    );
    const t = state?.t || 0;

    // HARD HOLD: denser fracture even if pack briefly soft — NEVER peace bloom / green wash (QA B2/B3)
    if (hard) {
      const aHold = Math.max(agg, vm.stickyAgg || 0, 0.72);
      this._glitch = Math.max(this._glitch, 0.42 + aHold * 0.5);
      this._kickFlash = Math.max(this._kickFlash, 0.32 + aHold * 0.38);
      this._fog *= 0.22;
      this._sparkBurst *= 0.18; // mute candy
      ctx.save();
      // Denser fracture scanlines under hard hold
      const bars = Math.floor(10 + aHold * 16);
      ctx.globalAlpha = Math.min(0.55, 0.22 + aHold * 0.32);
      for (let i = 0; i < bars; i++) {
        const y = (t * (60 + aHold * 80) + i * 47) % h;
        ctx.fillStyle = (i % 2)
          ? `rgba(160,200,230,${0.1 + aHold * 0.14})` // cold steel flash, not warm peach
          : `rgba(0,0,0,${0.26 + aHold * 0.22})`;
        ctx.fillRect(0, y, w, 1 + (i % 3) + (aHold > 0.6 ? 2 : 0));
      }
      // Storm contrast edges (ash-ember-red ONLY — NOT green / pastoral)
      ctx.globalAlpha = Math.min(0.28, 0.14 + aHold * 0.26);
      const edge = ctx.createLinearGradient(0, 0, w, 0);
      edge.addColorStop(0, 'rgba(180,40,20,1)');
      edge.addColorStop(0.5, 'rgba(0,0,0,0)');
      edge.addColorStop(1, 'rgba(50,18,30,1)');
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, w, h);
      // Ash dust denser
      ctx.globalAlpha = Math.min(0.42, 0.16 + aHold * 0.28);
      ctx.fillStyle = 'rgba(200,170,150,0.9)';
      const ash = Math.floor(28 + aHold * 36);
      for (let i = 0; i < ash; i++) {
        ctx.fillRect(
          (Math.sin(t * 3 + i * 2.1) * 0.5 + 0.5) * w,
          (Math.cos(t * 2.2 + i * 1.7) * 0.5 + 0.5) * h,
          1 + (i % 3),
          1 + (i % 2)
        );
      }
      // Side vignette pressure
      ctx.globalAlpha = Math.min(0.34, 0.14 + aHold * 0.22);
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fillRect(0, 0, w * 0.08, h);
      ctx.fillRect(w * 0.92, 0, w * 0.08, h);
      ctx.restore();
      return;
    }

    if (speechLike || vm.mode === 'spoken') {
      // Intimate room — lyric-as-world; throttle flash/glitch/shake
      this._kickFlash *= 0.42;
      this._snareFlash *= 0.38;
      this._glitch *= 0.12;
      this._groundShake *= 0.28;
      this._beam = Math.min(this._beam, 0.35);
      ctx.save();
      ctx.globalAlpha = 0.11;
      const g = ctx.createRadialGradient(w / 2, h * 0.42, 16, w / 2, h * 0.42, w * 0.48);
      g.addColorStop(0, 'rgba(255,245,230,0.32)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      return;
    }

    ctx.save();
    if (vm.mode === 'peace' || /peace|calm|soft|gentle|heal/.test(vibe)) {
      // Soft bloom silk / heal light — open frame, no ash
      ctx.globalAlpha = 0.14;
      const g = ctx.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h * 0.4, w * 0.58);
      g.addColorStop(0, 'rgba(255,242,220,0.42)');
      g.addColorStop(0.55, 'rgba(200,220,255,0.08)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      this._glitch *= 0.22;
      this._kickFlash *= 0.52;
      this._snareFlash *= 0.48;
      this._groundShake *= 0.38;
    } else if (vm.mode === 'chaos' || agg >= 0.55 || /chaos|fracture|glitch|wild|aggress/.test(vibe)) {
      // Fracture / scanline / ash pressure — scales with aggression (flashy OK, bleach NOT)
      const bars = Math.floor(5 + agg * 10);
      ctx.globalAlpha = Math.min(0.4, 0.14 + agg * 0.24);
      for (let i = 0; i < bars; i++) {
        const y = (t * (48 + agg * 55) + i * 59) % h;
        const hi = i % 2;
        ctx.fillStyle = hi
          ? `rgba(255,255,255,${0.1 + agg * 0.14})`
          : `rgba(0,0,0,${0.18 + agg * 0.18})`;
        ctx.fillRect(0, y, w, 1 + (i % 3) + (agg > 0.7 ? 1 : 0));
      }
      // Cold/red storm edge — contrast cue, not full-frame white
      if (agg > 0.6) {
        ctx.globalAlpha = Math.min(0.14, (agg - 0.6) * 0.4);
        const edge = ctx.createLinearGradient(0, 0, w, 0);
        edge.addColorStop(0, 'rgba(160,30,24,1)');
        edge.addColorStop(0.5, 'rgba(0,0,0,0)');
        edge.addColorStop(1, 'rgba(40,20,80,1)');
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, w, h);
      }
      // Slight dutch lean pressure via asymmetric vignette (continuity-safe)
      ctx.globalAlpha = Math.min(0.22, 0.08 + agg * 0.18);
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fillRect(0, 0, w * 0.06, h);
      ctx.fillRect(w * 0.94, 0, w * 0.06, h);
    } else if (vm.mode === 'scary' || /scar|horror|dark|sparse|lonely|dread/.test(vibe)) {
      // Sparse cold isolation — NOT party strobe / chaos ash
      ctx.fillStyle = 'rgba(0,6,16,0.34)';
      ctx.fillRect(0, 0, w, h * 0.38);
      ctx.fillRect(0, h * 0.74, w, h * 0.26);
      ctx.globalAlpha = 0.12;
      const cold = ctx.createRadialGradient(w / 2, h * 0.5, 10, w / 2, h * 0.5, w * 0.55);
      cold.addColorStop(0, 'rgba(0,0,0,0)');
      cold.addColorStop(1, 'rgba(0,10,24,0.55)');
      ctx.fillStyle = cold;
      ctx.fillRect(0, 0, w, h);
      this._sparkBurst *= 0.22;
      this._kickFlash *= 0.48;
      this._snareFlash *= 0.42;
      this._glitch = Math.min(this._glitch, 0.32);
      this._groundShake *= 0.45;
    } else if (vm.mode === 'tense' || /tense|build|tighten/.test(vibe)) {
      // Storm-edge pressure / dutch lean — tighten without full chaos
      const press = 0.1 + (vm.tense || 0.45) * 0.14;
      ctx.fillStyle = `rgba(0,0,0,${press})`;
      ctx.fillRect(0, 0, w * 0.1, h);
      ctx.fillRect(w * 0.9, 0, w * 0.1, h);
      ctx.globalAlpha = 0.08 + (vm.tense || 0.4) * 0.08;
      const cold = ctx.createLinearGradient(0, 0, 0, h);
      cold.addColorStop(0, 'rgba(40,60,90,1)');
      cold.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cold;
      ctx.fillRect(0, 0, w, h * 0.35);
      this._vignette = Math.max(this._vignette, 0.38 + (vm.tense || 0.4) * 0.22);
      this._glitch = Math.min(this._glitch, 0.38);
    } else if (/warm|groove|night.?street|rain.?city/.test(vibe) || (agg < 0.4 && (vm.peace || 0) < 0.4)) {
      // Warm groove — body pocket wash, not war (light continuity bed)
      ctx.globalAlpha = 0.08;
      const warm = ctx.createRadialGradient(w / 2, h * 0.55, 20, w / 2, h * 0.55, w * 0.5);
      warm.addColorStop(0, 'rgba(255,160,90,0.25)');
      warm.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }
}

// HOLD-0330 belt-and-suspenders — prototype always has HUD even if class parse races
Renderer.prototype._drawDebugHud = drawDebugHudImpl;
