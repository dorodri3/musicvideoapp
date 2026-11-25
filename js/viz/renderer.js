/**
 * rAF compose; Canvas2D; 60fps target; quality scale.
 * Roles animate HOW the world moves; lyrics direct WHAT world.
 * Prefer audio.roles || audio.instruments (see js/audio/ROLES.md).
 */
import { ContinuityEngine } from '../scene/continuity.js?v=mood4';
import { CameraSystem } from '../camera/system.js?v=mood4';
import { LightingSystem } from '../lighting/system.js?v=mood4';
import { TypographySystem, TYPO_BUILD } from '../typography/system.js?v=mood4';
import { resolveCastLook, drawCastFigure, drawRoleAgentFx, drawWeaponProp, ARCHETYPE_IDS, OUTFIT_IDS } from './castLibrary.js?v=mood4';
import { getMotionComfort } from '../a11y/motionPrefs.js?v=mood4';
import { ArtPlates, ART_WORLDS, drawHumanSilhouette } from './artPlates.js?v=mood4';
import { drawPerformer, roleLook } from './performers.js?v=mood4';
import { VISUAL_STYLES, STYLE_GRADES, normStyle, resolveKit, applyStyleGrade, KitPainter, resolveComposition, capKit, applyComposition, neverHas } from './styleKit.js?v=mood4';
import { styleFamilyOf, pinnedWorld } from '../scene/styleFamilies.js?v=mood4';

/** style1: merge (never clobber) QA fields into globalThis.__LS_ART__. */
function artLog(fields) {
  try { const g = globalThis; g.__LS_ART__ = Object.assign(g.__LS_ART__ && typeof g.__LS_ART__ === 'object' ? g.__LS_ART__ : {}, fields); } catch (_) { /* soft */ }
}
const MOVE_LOG = { idle_sway: 'sway', look_toward: 'gaze', look_up: 'gaze', turn: 'turn', brace: 'brace', step_back: 'step_back', raise_arms: 'raise_arms', walk: 'walk', idle: 'idle',
  // Scene per-style verbs (reaction.js STYLE-BIBLE Addendum 4) → tester vocabulary
  still_breath: 'idle', slow_head_turn: 'turn', freeze: 'brace', startle: 'brace', lift_lantern: 'raise_arms',
  watch_vista: 'gaze', shield_eyes: 'gaze', head_low: 'idle', gaze: 'gaze', look_down: 'gaze', look_toward_light: 'gaze', lift_head: 'gaze', hold_memory: 'idle',
  bounce: 'sway', wave: 'sway', point_up: 'raise_arms', dance: 'sway', defiant: 'idle', scan: 'gaze', raise_fists: 'raise_arms', headbang: 'sway' };
const IDLE_VERBS = new Set(['idle_sway', 'still_breath', 'watch_vista', 'head_low', 'bounce', 'defiant', 'idle']);
const UP_VERBS = new Set(['look_up', 'raise_arms', 'lift_head', 'point_up', 'lift_lantern', 'look_toward_light', 'reach']);
function triggerOf(why, target, verb) {
  const s = `${why || ''} ${target || ''}`.toLowerCase();
  if (verb === 'walk') return 'scene_walk';
  if (/lightning|white_flash|sky_tear|flash/.test(s)) return 'lightning';
  if (/bird|crow/.test(s)) return 'bird';
  if (/fire|furnace|beast/.test(s)) return 'fire';
  if (/storm|rain|wind/.test(s)) return 'storm';
  if (/kick/.test(s)) return 'kick';
  if (/drop|collapse|blackout/.test(s)) return 'drop';
  if (/onset|peak|energy|section/.test(s)) return 'onset';
  if (IDLE_VERBS.has(verb) || !verb || /^idle/.test(s.trim())) return 'none';
  return 'focal';
}



/** HOLD-0330: module-level HUD — never depends on prototype lookup (TypeError-proof). */
function drawDebugHudImpl(ctx, w, h, directive, audio) {
  let show = false;
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
    'LS DEBUG novideo2',
    `pinArmed ${!!(vibe.pinArmed || moment.pinArmed || hud.pinArmed)}  martial ${!!(vibe.martial || moment.martial || hud.martial)}`,
    `orchMart ${!!(vibe.orchestralMartial || moment.orchestralMartial || hud.orchestralMartial)}  softClear ${!!(vibe.softClear || moment.softClear)}`,
    `forbidPast ${!!(directive?.forbidPastoral || vibe.forbidPastoral || moment.forbidPastoral)}  aggLock ${!!(directive?.aggressionLock || vibe.aggressionLock || moment.aggressionLock)}`,
    `hardOnly ${!!(directive?.hardOnly || hud.hardOnly)}  nuclear ${!!hud.nuclearHard}  latch ${!!hud.latchLive}`,
    `hotMs ${hud.hotMs ?? '—'}  energy ${hud.energy ?? (audio?.energy != null ? Number(audio.energy).toFixed(3) : '—')}  kick ${hud.kick ?? '—'}`,
    `preset ${preset}  pack ${directive?.packFamily || hud.packFamily || '—'}  ladder ${hud.ladder || vibe.ladder || '—'}`
  ];
  try { // style1: style lock + reactive cast proof
    const A = globalThis.__LS_ART__ || {};
    lines.push(`style ${A.styleLock || '—'} (${A.styleSource || '—'}) @${A.styleLatchedAt != null ? Math.round(A.styleLatchedAt) : '—'}  changes ${A.styleChanges || 0}`);
    lines.push(`cast ${A.castMove || '—'} ← ${A.castTrigger || '—'}  lat ${A.castLatencyMs != null ? A.castLatencyMs + 'ms' : '—'}  walk ${!!A.castWalking}  startle ${A.startleCount || 0}/${A.startleSuppressed || 0}`);
    lines.push(`outfit ${A.castOutfit || '—'}  kit ${(A.styleKitActive || []).join(',').slice(0, 60)}`);
  } catch (_) { /* soft */ }

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
        ctx.fillText('LS DEBUG novideo2 (fallback)', 16, 20);
      } catch (__) { /* soft */ }
    }
    try { ctx.restore(); } catch (_) { /* soft */ }
  } catch (_) { /* never throw from HUD */ }
}

/**
 * polish6 (bot 1 22:21): while Scene's stylePending is set, Visual renders a LIVING NEUTRAL scene — no dim pass of its own:
 * the plate Scene sends (neutral desat grade), music-driven motion/light, lyrics, a plain neutral figure, no kit/outfit.
 * At the latch: ONE ~1s crossfade (snapshot of the last neutral frame fading out over the locked look).
 */
const NEUTRAL_STYLE = Object.freeze({
  id: 'neutral', source: 'pending', latchedAt: null,
  grade: Object.freeze({ key: '205,206,210', shadow: '10,10,12', rim: '214,216,222', mist: '170,172,178', accent: '224,224,226' }),
  VS: { cast: { outfit: 'neutral_plain', hood: false, coat: 'jacket', prop: null, swayMul: 0.45, hunch: 0.15,
    moves: { idle_sway: 'stand', look_toward: 'stand', look_up: 'look_up', turn: 'turn', brace: 'brace', step_back: 'step_back', raise_arms: 'open', walk: 'walk', startle: 'brace', freeze: 'brace' } } },
  kit: { elements: new Set(), peakMax: 0, figure: null }
});
const NEUTRAL_COMP = Object.freeze({ look: 'neutral', focalU: 0.42, focalV: 0.62, scale: 1, chaos: 0, motionMul: 0.5, intensity: 0.4, tilt: 0, maxElements: 0, fauna: false, warmLight: false, mode: 'quiet' });
const XFADE_MS = 1000;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.continuity = new ContinuityEngine();
    this.art = new ArtPlates();
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
    // style1: per-track style lock + kit + reactive dreamer
    this.kitPainter = new KitPainter();
    this._resetStyleTrack();
  }

  /** style1: new track / show start → unlatch style, clear reaction state (castLog survives for QA). */
  _resetStyleTrack() {
    this._style = null;
    this._styleChanges = 0;
    this._sd = null;
    try { this.kitPainter.reset(); } catch (_) { /* soft */ }
    if (this.typography) this.typography.styleTypo = null;
    if (this.lighting) this.lighting.styleColors = null;
    if (this.art) { this.art.allow = null; this.art.never = null; this.art.liftColor = null; this.art.panSpan = null; this.art.keep = null; }
    this._worldKeep = null; this._clampLast = null; this._softClamp = false; this._heavyStorm = null;
    this._styleShownAt = null; this._styleShownId = null; this._prerollStart = null; this._neutralSeen = false; this._neutral = false; this._xfade = null; this._drawnStyles = []; this._tiltA = 0; this._tiltLogged = 0;
    artLog({ tiltDeg: 0, castPose: null, castJumps: 0, candyFriends: 0, candyFriendsShown: 0, styleShownAt: null, styleShown: null, stylesDrawn: [], styleDrawnNonFinal: false, neutral: null, styleLock: null, styleSource: null, styleLatchedAt: null, styleChanges: 0, startleCount: 0, startleSuppressed: 0 });
  }

  /**
   * style1 / CEO rule 1: ONE grade per track. Follows Scene's directive.styleLock|styleLook (+ styleGrade)
   * when present; else latches from the first preset's Worlds family. The grade object is latched at
   * lock time and held — hard/soft and world changes only modulate strength, never the palette.
   */
  _updateStyle(directive, now) {
    const d = directive || {};
    let id = normStyle(d.styleLock || d.styleLook || d.styleFamily || (typeof d.style === 'string' ? d.style : null));
    let origin = 'scene';
    if (!id || !VISUAL_STYLES[id]) {
      if (this._style) return this._style;
      const fam = normStyle(styleFamilyOf(d.preset));
      if (!fam || !VISUAL_STYLES[fam]) return null;
      id = fam; origin = 'preset';
    }
    const srcRaw = String(d.styleSource || d.styleLookSource || 'auto');
    const source = /^chip|^tap/.test(srcRaw) ? 'chip' : 'auto';
    const pending = !!(d.neutralHold || d.stylePending);
    if (this._style && this._style.id === id) {
      if (this._style.origin === 'preset' && origin === 'scene') { this._style.origin = 'scene'; this._style.source = source; }
      if (this._style.pending && !pending) { this._style.pending = false; this._style.latchedAt = now; this._style.source = source; artLog({ stylePending: false, styleLatchedAt: now, styleSource: source }); }
      return this._style;
    }
    const prev = this._style;
    // Scene auditions Auto for ≤6s of intro (stylePending) — those swaps are not mid-song changes
    if (prev && !prev.pending && prev.origin === 'scene') { this._styleChanges++; this._styleChangeWhy = source === 'chip' ? 'chip' : 'scene-unexpected'; }
    const sceneGrade = (d.styleGrade && typeof d.styleGrade === 'object') ? d.styleGrade : null;
    const grade = Object.freeze({ ...(STYLE_GRADES[id] || {}), ...(sceneGrade || {}) });
    const VS = VISUAL_STYLES[id];
    this._style = { id, grade, source, origin, srcRaw, latchedAt: now, VS, kit: resolveKit(id, (d.styleKit && typeof d.styleKit === 'object') ? d.styleKit : null), pending };
    try { this.kitPainter.reset(); } catch (_) { /* soft */ }
    this._sd = null;
    this._applyStyleCfg(this._style);
    globalThis.__LS_STYLE__ = { id, latchedAt: now, source };
    artLog({ styleLock: id, styleSource: source, styleLatchedAt: now, stylePending: pending, styleOrigin: origin, styleSceneSource: srcRaw, styleChanges: this._styleChanges, styleChangeWhy: this._styleChangeWhy || null, styleKitSource: this._style.kit?.source || null });
    return this._style;
  }

  setQuality(q) {
    this.quality = Math.max(0.5, Math.min(1, q));
    this._resize();
  }

  setCharacters(on) {
    this.showCharacters = !!on;
  }

  /** art7 P0: drop every held caption between songs (typography sticky/hold + last phrase). */
  resetLyricCaches() {
    try { this.typography?.clearSticky?.(); } catch (_) { /* soft */ }
    if (this.typography) { this.typography.currentText = ''; this.typography.words = []; this.typography._lastSection = null; }
    this._lastPhrase = null; this._lastPhraseKey = null;
  }

  setLyrics(on) {
    this.typography.setEnabled(on);
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.quality;
    const rect = this.canvas.getBoundingClientRect();
    // P0 novideo2: after display:none→show, rect can be 0 for a frame → 1×1 black stretch
    let cssW = rect.width;
    let cssH = rect.height;
    if (cssW < 2 || cssH < 2) {
      cssW = window.innerWidth || document.documentElement?.clientWidth || 1;
      cssH = window.innerHeight || document.documentElement?.clientHeight || 1;
    }
    const w = Math.max(1, Math.floor(cssW * dpr));
    const h = Math.max(1, Math.floor(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  start(frameFn) {
    this.onFrame = frameFn;
    this._resetStyleTrack(); // style1: show start = new track → fresh style latch
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
        if (now - (this._qChangedAt || 0) > 1500) {
          if (this.fps < 42 && this.quality > 0.55) { this._qChangedAt = now; this.setQuality(this.quality - 0.1); }
          else if (this.fps > 56 && this.quality < 1) { this._qChangedAt = now; this.setQuality(Math.min(1, this.quality + 0.05)); }
        }
      }
      this._resize();
      if (this.onFrame) this.onFrame(dt, now);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._resetStyleTrack();
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
      directive: _dirRaw,
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
    try { this._updateStyle(_dirRaw, now); } catch (_) { /* soft */ }
    // fixmood2: Visual-side world clamp (pinned world / never-list) BEFORE anything reads the preset
    let directive = _dirRaw;
    try { directive = this._clampWorld(_dirRaw, now); } catch (_) { directive = _dirRaw; }
    this._vibeMatch = this._deriveVibeAggression(audio, directive, emotion);
    try { this._comp = this._style ? resolveComposition(directive, this._style.id) : null; } catch (_) { this._comp = null; }

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
          // style1/Camera: _groundShake only on kick/drop — collapse shakes only when the drop is live
          if (!_c.muteGroundShake && Number(audio?.drop || 0) > 0.5) this._groundShake = Math.max(this._groundShake, 16 * locScale);
        }
      }
    }
    this.lighting.setModes(directive?.lighting || ['wash']);
    const neuLive = !!(directive?.neutralHold || directive?.stylePending || this._neutral);
    const liveInt = neuLive ? Math.max(0.55, Math.min(0.95, Number(audio?.energy || 0) * 0.9 + 0.35)) : (directive?.intensity || 0.5);
    const light = this.lighting.update(
      audio,
      emotion,
      liveInt,
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
      directive?.cast ?? directive?.characters ?? null,
      directive ?? null // Camera style-lock reactions: read-only (reaction, focal, events, styleLook, preset)
    );

    // polish6: neutral hold while Scene's stylePending is set (living scene, no dim); latch → one ~1s crossfade
    this._neutral = this._neutralGate(directive, now, ctx, w, h);
    if (this._neutral) { if (this.typography) this.typography.styleTypo = null; if (this.lighting) this.lighting.styleColors = null; }
    if (this._style && !this._neutral) this._noteDrawn(this._style.id);

    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    // art2: screen-space transform for painted plates (camera never exposes black edges)
    const _baseXform = ctx.getTransform();

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
      intensity: this._neutral ? liveInt : (directive?.intensity || 0.5),
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
      forbidPastoral: !this._softClamp && !!(directive?.forbidPastoral || directive?.hardOnly || this._hardLock),
      hardLock: !this._softClamp && !!(directive?.hardLock || directive?.hardOnly || this._hardLock),
      hardOnly: !!directive?.hardOnly,
      stormGain: (() => {
        const isH = this._style?.id === 'ember_wasteland' && !this._neutral;
        const quietH = isH && this._comp && (this._comp.mode === 'quiet' || (!this._comp.loud && (this._comp.chaos ?? 0) < 0.25));
        const tgt = quietH ? 0 : 1;
        if (this._heavyStorm == null) this._heavyStorm = tgt;
        else this._heavyStorm += (tgt - this._heavyStorm) * (1 - Math.exp(-Math.min(0.1, dt) / 0.7));
        return this._heavyStorm;
      })()
    };

    const coherentTr = this._resolveCoherentTransition(directive, audio, this._vibeMatch);
    this.continuity.draw(ctx, w, h, state, coherentTr);
    // art1: painted plate over procedural fallback (procedural bleeds through lightly)
    const _artPreset = this._pickArtWorld((coherentTr && coherentTr.to && coherentTr.progress < 1) ? coherentTr.to : state.preset, directive, audio, t);
    // polish6 item 3: composition.horizonTilt (alias tilt) rotates the world layers (plate, agents, kit midground) about the
    // figure's feet; lyrics/typography stay level (drawn later in screen space). See _worldTiltXf for units.
    const _tiltXf = this._worldTiltXf(w, h, now);
    this._tiltXfNow = _tiltXf;
    const _worldBase = _tiltXf ? DOMMatrix.fromMatrix(_baseXform).multiply(_tiltXf) : _baseXform;
    this._artOn = this.art.drawBg(ctx, w, h, _artPreset, state, !!getMotionComfort().reduceMotion, !!this._artHard, _worldBase);
    // art2: old procedural fg layers are off; fg = light rain/embers/fireflies over the painting
    if (this._artOn && !this._style) this.art.drawFg(ctx, w, h, state, _baseXform, this.quality); // style1: kit owns particles
    // art6: audio roles → scenic agents in the world (mist, ripples, lightning/neon/aurora, birds)
    if (this._artOn) this.art.drawAgents(ctx, w, h, state, _worldBase, this.quality, this._dreamFeet || null);
    if (this._artOn) {
      // art3: ease the cast ground line + stage x between worlds (no jump on world change)
      const act = this.art.active();
      const gT = this.art.ground(act), sT = this.art.stage(act);
      const dtG = Math.min(0.1, Math.max(0, t - (this._artGT ?? t))); this._artGT = t;
      const kG = 1 - Math.exp(-dtG * 1.8);
      this._artG = this._artG == null ? gT : this._artG + (gT - this._artG) * kG;
      this._artStage = this._artStage == null ? sT : this._artStage + (sT - this._artStage) * kG;
    }
    if (this.typography) this.typography.artAvoidTop = this._artOn ? h * ((this._artG ?? 0.8) - 0.25) : null; // above cast heads + raised hands

    // Through-screen scenic travel (parallax/drift/sweep) — not a static postcard
    if (!this._artOn) this._drawScenicTravel(ctx, w, h, state, directive);

    // Motif props early; cast drawn AFTER typography so wash never covers figures
    if (!this._artOn) this._drawMotifProps(ctx, w, h, directive, state);

    // Light vibe / speechLike hooks (scenic owns frame; minimal flash)
    if (!this._artOn) this._applyVibeHooks(ctx, w, h, directive, state);

    // Pads → sky fog wash
    if (this._fog > 0.05 && !this._artOn) {
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      g.addColorStop(0, `rgba(180,200,255,${this._fog * 0.42})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h * 0.55);
    }

    // Hats → spark / rain needles (density × quality)
    if (this._sparkBurst > 0.08 && !this._style && !this._neutral) { // polish6: locked styles — the kit owns particles (Candy never rains)
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
    if (this._beam > 0.08 && !this._artOn) {
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
    // art2: no yellow ground wash over the painting — beat push lives in ArtPlates
    if (!this._artOn && (this._kickFlash > 0.05 || this._groundShake > 2)) {
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
    if (this._snareFlash > 0.08 && !this._artOn) {
      const sg = ctx.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, w * 0.4);
      sg.addColorStop(0, `rgba(255,255,255,${this._snareFlash * 0.18})`);
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
    }

    // Harsh → glitch / ash (density × quality; stripped in heavy quiet)
    const _glGain = (this._style?.id === 'ember_wasteland' && !this._neutral) ? (this._heavyStorm ?? 1) : 1;
    if (this._glitch * _glGain > 0.12) {
      ctx.save();
      ctx.globalAlpha = this._glitch * 0.45;
      const bars = this._artOn ? 0 : Math.floor(8 * this.quality);
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

    if (directive?.motif && directive.motifAction && !this._artOn) {
      this._drawMotif(ctx, w, h, directive.motif, directive.motifAction, state, directive);
    }

    // Motif memory after chaos cool-down (subtle rim stitch)
    if (!this._artOn) this._drawMotifMemory(ctx, w, h, directive, state);

    ctx.restore();

    // Bass vignette weight (screen space)
    // art2: this radial (w*0.22→w*0.78, up to 0.8 black) + lighting pulse/bloom radials were the
    // big pink/grey haze disk + dark oval vignette over art1 plates. Off while a painting owns the frame.
    if (this._vignette > 0.05 && !this._artOn) {
      const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.22, w / 2, h / 2, w * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,0,0,${Math.min(0.8, this._vignette)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }

    if (!this._artOn) this.lighting.apply(ctx, w, h, light, directive?.palette, this.quality);
    // style1: ONE full-frame grade for the whole track (painted + procedural worlds)
    if (this._neutral) { // neutral grade: desaturated, even, no style hue (music still moves the plate light underneath)
      ctx.save(); try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (_) { /* soft */ }
      ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.82; ctx.fillStyle = 'rgb(128,128,128)'; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over'; const nv = ctx.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.75);
      nv.addColorStop(0, 'rgba(8,8,10,0)'); nv.addColorStop(1, 'rgba(8,8,10,0.45)'); ctx.globalAlpha = 1; ctx.fillStyle = nv; ctx.fillRect(0, 0, w, h); ctx.restore();
    } else if (this._style) { try { applyStyleGrade(ctx, w, h, this._style.grade, { painted: !!this._artOn, intensity: Math.min(1, Number(this._comp?.intensity ?? directive?.intensity ?? 0.5)) }); } catch (_) { /* soft */ } }
    // style1/mood: composition layer — negative space, edge pressure, texture, sat/warmth/contrast, loud fracture
    if (this._style && this._comp && !this._neutral) {
      const _mc = getMotionComfort();
      try { applyComposition(ctx, w, h, this._comp, { figX: this._sd?.lastX, t: now / 1000, reduceMotion: !!_mc.reduceMotion, quality: this.quality, beat: audio?.beat ? 1 : 0 }); } catch (_) { /* soft */ }
      const C = this._comp;
      artLog({ composition: { name: C.mood, look: C.look, variant: C.variant, mode: C.mode, source: C.source, figureU: this._sd?.lastX != null ? +(this._sd.lastX / w).toFixed(3) : null, emptyFrac: C.emptySpace, sat: C.saturation, warmth: C.warmth, contrast: C.contrast, texture: C.texture, chaos: +C.chaos.toFixed(2), maxElements: C.maxElements, fauna: C.fauna } });
    }


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
    const _heavyPostMid = !this._neutral && this._style?.id === 'ember_wasteland';
    if (!_heavyPostMid) this.typography.draw(ctx, w, h, emotion);
    else this._pendingTypoDraw = () => this.typography.draw(ctx, w, h, emotion);

    // Cast AFTER typography — figures never under lyric wash; camera owns framing
    this._drawCast(ctx, w, h, directive, state);
    this._pendingTypoDraw = null;

    if (directive?.sectionType === 'intro' && directive.theme && (audio?.energy || 0) < 0.25) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.font = `300 ${Math.min(22, w / 28)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(directive.theme.slice(0, 60), w / 2, h * 0.18);
      ctx.restore();
    }

    // polish6: the one reveal — last neutral frame fades out over the locked look (~1s)
    if (this._xfade && this._styleShownAt != null) {
      const k = (now - this._styleShownAt) / XFADE_MS;
      if (k >= 1) this._xfade = null;
      else { ctx.save(); try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (_) { /* soft */ } ctx.globalAlpha = 1 - k * k * (3 - 2 * k); ctx.drawImage(this._xfade, 0, 0, w, h); ctx.restore(); }
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
  /**
   * art3 (QA-20261019-0148): the painting FOLLOWS THE DIRECTOR. If the director preset (or the
   * live transition target) has a plate, show it immediately (ArtPlates crossfades 1.6s) — no
   * renderer hold timers, no renderer-side aggression average. Only presets without a plate fall
   * back to a stable look-alike plate of the same polarity. Hard/soft polarity comes from the
   * director (hardOnly / hardLock / forbidPastoral / HARD_LOCK preset), never from the renderer.
   */
  _pickArtWorld(preset, directive, audio, t) {
    const HARD = ['storm', 'apocalyptic_warzone', 'metal_hall', 'red_void'];
    const SOFT = ['misty_lake', 'dream_clouds', 'meadow_fauna', 'forest', 'space', 'rainy_city', 'dark_sparse', 'cathedral_space'];
    const HARD_IDS = ['metal_hall', 'reality_fracture', 'apocalyptic_warzone', 'red_void', 'storm'];
    const FALLBACK = {
      ocean: ['misty_lake', 'storm'], ancient_ruins: ['cathedral_space', 'apocalyptic_warzone'], empty_highway: ['dark_sparse', 'storm'],
      reality_fracture: ['dream_clouds', 'red_void'], white_void: ['dream_clouds', 'red_void'], endless_staircase: ['dark_sparse', 'red_void'],
      candy_happy: ['meadow_fauna', 'red_void'], country_porch: ['country_porch', 'storm'], cozy_autumn: ['country_porch', 'storm'], snow: ['misty_lake', 'storm'],
      futuristic_city: ['rainy_city', 'metal_hall'], neon_highway: ['rainy_city', 'metal_hall'], industrial_tunnel: ['dark_sparse', 'metal_hall'],
      led_wall: ['rainy_city', 'metal_hall'], ambient_field: ['meadow_fauna', 'storm'], orchestral_hall: ['cathedral_space', 'metal_hall'],
      burning_desert: ['meadow_fauna', 'apocalyptic_warzone'], white: ['dream_clouds', 'red_void']
    };
    const id = String(preset || '');
    const hard = !this._softClamp && !!(directive?.hardOnly || HARD_IDS.includes(id)); // director polarity only (never for a no-storm style)
    this._artHard = hard;
    let plate;
    if (this.art.has(id) || ART_WORLDS[id]) plate = id;
    else {
      const fb = FALLBACK[id];
      plate = fb ? fb[hard ? 1 : 0] : null;
      if (!plate) { const pool = hard ? HARD : SOFT; let hsh = 0; for (const c of id) hsh = (hsh * 31 + c.charCodeAt(0)) % 997; plate = pool[hsh % pool.length]; }
    }
    // fixmood2: a pinned style's world never falls through to another style's world, and never-listed plates are blocked
    const S = this._style;
    if (S) {
      let pin = null; try { pin = pinnedWorld(S.id); } catch (_) { pin = null; }
      if (pin && !S.pending && (this.art.has(pin) || ART_WORLDS[pin]) && !neverHas(S.kit, pin)) {
        plate = pin;
      } else if (plate && neverHas(S.kit, plate)) {
        const alt = [pin, this._worldKeep, ...SOFT].find(p => p && !neverHas(S.kit, p) && (this.art.has(p) || ART_WORLDS[p]));
        if (alt) { try { artLog({ plateNeverBlocked: plate, plateNeverAlt: alt }); } catch (_) { /* soft */ } plate = alt; }
      }
    }
    // proof hook for QA shoots: HUD preset vs plate on screen
    try { artLog({ t, hud: directive?.preset || null, target: id, plate, shown: this.art.cur, dominant: this.art.dominant || this.art.cur, dip: !!this.art.dip, mix: this.art.mix, mapped: plate !== id, hard, hardOnly: !!directive?.hardOnly, agg: +(+(audio?.vibe?.aggression ?? 0) || 0).toFixed(2), lad: String(audio?.moment?.ladder || audio?.vibe?.moment?.ladder || audio?.vibe?.ladder || '') }); } catch (_) {}
    return plate;
  }

  /**
   * fixmood2 (bot 1 mood2 P0): the plate stays on the latched style's world for the whole song.
   * Source of Clegg's stormy sea: Scene/Worlds emitted preset 'storm' (cinematic/dreamlike family peak world) for the loud
   * bridge/final chorus of a candy_pop track; ArtPlates followed it. Visual now clamps: Worlds' pinnedWorld(style) wins when
   * set; otherwise a preset that matches the style's never-list is refused and the last good world is kept.
   * Styles whose never-list forbids 'storm' also drop the hard/forbidPastoral polarity (no storm grade on Happy).
   */
  _clampWorld(d, now) {
    const S = this._style;
    if (!d || !S || S.pending) { this._softClamp = false; return d; }
    this._softClamp = neverHas(S.kit, 'storm');
    let pin = null; try { pin = pinnedWorld(S.id); } catch (_) { pin = null; }
    const pre = d.preset ? String(d.preset) : null;
    let to = pre, why = null;
    if (pin && pre !== pin) { to = pin; why = 'pinned'; }
    else if (S.id === 'ember_wasteland') {
      // One location per song for Heavy (never switch storm <-> metal_hall mid-song; storm belongs to calm fallback only)
      if (!this._worldKeep) {
        const heavyBase = (pre && pre !== 'storm' && (this.art.has(pre) || ART_WORLDS[pre])) ? pre : 'metal_hall';
        this._worldKeep = heavyBase;
      }
      if (pre !== this._worldKeep) { to = this._worldKeep; why = 'heavy_pin'; }
    }
    else if (pre && neverHas(S.kit, pre)) { to = this._worldKeep || pin || null; why = 'never'; }
    if (to && !neverHas(S.kit, to)) this._worldKeep = to;
    if (!why && !this._softClamp) return d;
    if (why && to !== this._clampLast) { this._clampLast = to; try { artLog({ worldClamp: { style: S.id, from: pre, to, why, at: Math.round(now) } }); } catch (_) { /* soft */ } }
    const out = { ...d };
    if (why && to) { out.preset = to; if (out.world) out.world = to; }
    if (this._softClamp) { out.hardOnly = false; out.hardLock = false; out.forbidPastoral = false; }
    return out;
  }

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
        ctx.lineWidth *= 1.5;
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
    const targetFrac = isLead ? 0.30 : Math.max(0.22, 0.27 - idx * 0.02); // art1: human scale in a scene
    const BODY_REF = 48;
    // HOLD-1345: NO max-16 clamp — lead body ≥ 0.55h on any canvas height
    let scale = (h * targetFrac / BODY_REF) * (dirScale / 1.55);
    if (!Number.isFinite(scale) || scale < 2) scale = Math.max(2, h * 0.28 / BODY_REF);
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
    // art1: over a painted plate, cast reads as dark rim-lit silhouettes
    if (this._artOn && look.palette) {
      const rim = this.art.rim(this.art.active()) || look.palette.rim;
      look.palette = { ...look.palette, fill: 'rgba(8,7,10,0.96)', rim, shadow: 'rgba(0,0,0,0.6)' };
      look.style = 'silhouette';
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
    if (this._artOn) {
      // art3: music-video performers — role look, eased per-world ground, lead front/centre
      const n = Math.max(1, Math.min(5, Number(total) || 1));
      const stage = this._artStage ?? 0.5;
      const ground = this._artG ?? this.art.ground(this.art.active());
      const slots = [0, -0.25, 0.25, -0.4, 0.4];
      const lead = idx === 0;
      const ax = w * Math.max(0.12, Math.min(0.88, stage + (n > 1 ? slots[idx % 5] : 0))) + (holdSilent ? 0 : Math.sin(t * 0.3 + idx) * 4);
      const roleSrc = lead ? (roleIdDraw || spec.roleId || look.roleId || castRole || 'vocalish') : (spec.roleId || look.roleId || spec.role || null);
      const lk = roleLook(roleSrc, idx);
      const drawnArt = drawPerformer(ctx, {
        x: ax, baseY: h * (ground - (lead ? 0 : 0.014)), heightPx: h * (lead ? 0.205 : 0.172), t, i: idx,
        opacity: holdSilent ? 0.45 : 0.97, energy: Number(state?.audio?.energy || 0), hard: !!this._artHard,
        look: lk, rim: this.art.rim(this.art.active()) || look.palette?.rim, lightSide: this.art.light(this.art.active())
      });
      if (idx === 0) this._figureAnchor = { x: drawnArt.fx, y: (drawnArt.headY + drawnArt.chestY) * 0.5 };
      return;
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
    // art5: over painted worlds the cast is the BAND — one performer per active audio role.
    if (this._style || this._neutral) { try { this._drawStyleDreamer(ctx, w, h, directive, state); } catch (e) { artLog({ castError: String(e && e.message || e) }); } return; } // style1: one held character, reacts, kit around them
    if (this._artOn) { this._drawArtDreamer(ctx, w, h, directive, state); return; } // art6: dreamer in the world (art5 band ensemble retired)
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

  /**
   * art5 (QA-0244 #4): the cast maps to the active audio roles. Each role level is smoothed
   * (~1.5s) with on/off hysteresis, so a member joins after its part has played for a moment and
   * leaves only after ~4s of silence; members fade in/out and glide between slots (no pops).
   * vocalist ← vocal estimate / vocalish, guitarist ← harsh/lead without vocal, bassist ← bass,
   * rhythm ← kick/snare/hats, dancer ← pads. 1 lead + up to 3 more (2–4 when the song has parts).
   * Moves change on beat boundaries every 2–4 bars and on section change, picked by energy.
   */
  _drawArtEnsemble(ctx, w, h, directive, state) {
    const t = Number(state?.t ?? 0) || 0;
    const audio = state?.audio || {};
    const R = audio.roles || audio.instruments || {};
    const voc = audio.vocal || {};
    const E = this._ens || (this._ens = { lv: {}, on: {}, offAt: {}, onAt: {}, mem: {}, lastT: t, beatPh: 0, bpm: 110, eSlow: 0, sec: null, beats: 0 });
    const dt = Math.max(0, Math.min(0.1, t - E.lastT)); E.lastT = t;
    const num = (v) => Math.max(0, Math.min(1, Number(v) || 0));
    const raw = {
      vocalist: Math.max(num(voc.intensity) * (voc.likelyVocal ? 1 : 0.6), num(R.vocalish) * 0.85),
      guitarist: Math.max(num(R.harsh) * 1.3, voc.likelyVocal ? 0 : num(R.lead) * 0.8),
      bassist: num(R.bass),
      rhythm: Math.max(num(R.kick), num(R.snare) * 0.9, num(R.hats) * 0.7),
      dancer: num(R.pads) * 1.1
    };
    const kL = 1 - Math.exp(-dt / 1.5);
    for (const r in raw) E.lv[r] = (E.lv[r] ?? raw[r]) + (raw[r] - (E.lv[r] ?? raw[r])) * kL;
    for (const r in raw) {
      const v = E.lv[r];
      if (!E.on[r]) {
        if (v > 0.3) { E.onAt[r] = E.onAt[r] || t; if (t - E.onAt[r] > 1.2) { E.on[r] = true; E.offAt[r] = 0; } }
        else E.onAt[r] = 0;
      } else if (v < 0.16) { E.offAt[r] = E.offAt[r] || t; if (t - E.offAt[r] > 4) { E.on[r] = false; E.onAt[r] = 0; } }
      else E.offAt[r] = 0;
    }
    // lead: vocalist when singing / vocal-ish, else the strongest part
    const order = ['vocalist', 'guitarist', 'bassist', 'rhythm', 'dancer'];
    // lead has hysteresis too: the vocalist takes the lead once its part is ON and keeps it
    // until it switches OFF; otherwise the current lead stays while its own part is on.
    const strongest = order.filter(r => E.on[r]).sort((a, b) => E.lv[b] - E.lv[a])[0];
    let lead = E.leadRole || null;
    if (E.on.vocalist) lead = 'vocalist';
    else if (!lead || !E.on[lead]) lead = strongest || lead || 'vocalist';
    E.leadRole = lead;
    // sticky membership: members already in the band get a +0.15 bonus, so two parts at similar
    // levels don't keep swapping places
    const prevBand = E.band || [];
    const score = r => E.lv[r] + (prevBand.includes(r) ? 0.15 : 0);
    let band = [lead, ...order.filter(r => r !== lead && E.on[r]).sort((a, b) => score(b) - score(a))].slice(0, 4);
    // a full mix (energy up, ≥2 parts audible) never reads as a lone figure
    const energy = num(audio.energy);
    E.eSlow += (energy - E.eSlow) * (1 - Math.exp(-dt / 6));
    if (band.length < 2 && E.eSlow > 0.28) {
      const extra = order.filter(r => !band.includes(r)).sort((a, b) => E.lv[b] - E.lv[a])[0];
      if (extra && E.lv[extra] > 0.12) band.push(extra);
    }
    E.band = band.slice();
    // beat-locked dance phase: π per beat (one sway every 2 beats), nudged toward beat ticks
    const bpm = Math.max(60, Math.min(180, Number(audio.bpm) || E.bpm)); E.bpm += (bpm - E.bpm) * Math.min(1, dt * 0.5);
    let tempo = E.bpm; while (tempo > 135) tempo /= 2; // dance at a body-friendly tempo
    // soft: one sway per bar (π/2 per beat); hard: one per 2 beats (π per beat); rate eases
    E.rk = (E.rk ?? 0.5) + (((this._artHard ? 1 : 0.5)) - (E.rk ?? 0.5)) * Math.min(1, dt * 0.8);
    const q = Math.PI * E.rk;
    E.beatPh += dt * (tempo / 60) * q;
    if (audio.beat) { const err = Math.round(E.beatPh / q) * q - E.beatPh; E.beatPh += err * 0.3; E.beats++; }
    // section key → move refresh
    const secKey = String(directive?.section?.label || directive?.section || state?.section?.label || state?.sectionType || state?.section || '');
    const secChanged = E.sec != null && secKey !== E.sec; E.sec = secKey;
    // slots: lead centre, others alternate around it; glide to slot
    const stage = this._artStage ?? 0.5;
    const ground = this._artG ?? this.art.ground(this.art.active());
    const n = band.length;
    const SL0 = n <= 1 ? [0] : n === 2 ? [-0.13, 0.15] : n === 3 ? [0, -0.26, 0.26] : [-0.1, 0.11, -0.3, 0.31];
    // keep the whole group inside the frame (misty_lake's shore sits left of centre)
    let shift = 0; const lo = stage + Math.min(...SL0), hi = stage + Math.max(...SL0);
    if (lo < 0.13) shift = 0.13 - lo; else if (hi > 0.87) shift = 0.87 - hi;
    const SL = SL0.map(v => v + shift);
    const rim = this.art.rim(this.art.active());
    const lightSide = this.art.light(this.art.active());
    const hard = !!this._artHard;
    const kA = 1 - Math.exp(-dt / 0.6), kX = 1 - Math.exp(-dt / 1.1);
    // members fade toward target alpha; departing members keep their last slot
    // slot assignment without crossings: the lead takes SL[0]; the others take the remaining
    // slots in left→right order matching their current left→right order (no swaps through each other)
    const slotOf = {};
    if (band.length) {
      slotOf[band[0]] = SL[0];
      const rest = band.slice(1);
      const restSlots = SL.slice(1).sort((x, y) => x - y);
      const cx = r => { const m = E.mem[r]; return m && m.x != null && m.a > 0.05 ? m.x - stage : (SL[band.indexOf(r)] ?? 0); };
      rest.slice().sort((x, y) => cx(x) - cx(y)).forEach((r, j) => { slotOf[r] = restSlots[j]; });
    }
    const kOut = 1 - Math.exp(-dt / 0.3);
    for (const r of order) {
      const m = E.mem[r] || (E.mem[r] = { a: 0, x: null, move: null, from: null, mix: 1, nextAt: 0, seed: order.indexOf(r) });
      const idx = band.indexOf(r);
      const targetA = idx >= 0 ? 1 : 0;
      m.a += (targetA - m.a) * (targetA > m.a ? kA : kOut); // leave faster than arrive
      if (idx >= 0) {
        const tx = stage + slotOf[r];
        m.x = (m.x == null || m.a < 0.08) ? tx : m.x + (tx - m.x) * kX; // newcomers appear in place
        m.lead = idx === 0;
      } else m.lead = false;
      // moves by look + energy band; switch on a beat every 2–4 bars, or on a section change
      const pools = {
        vocalist: [['sway', 'reach'], ['sway', 'reach', 'fist', 'lean']],
        guitarist: [['strum', 'rock'], ['strum', 'headbang', 'rock']],
        bassist: [['groove', 'step'], ['groove', 'headbang', 'step']],
        rhythm: [['step', 'clap'], ['pump', 'clap', 'point', 'step']],
        dancer: [['flow', 'hips', 'wave'], ['flow', 'armsup', 'wave', 'hips']]
      };
      const hi = (E.eSlow > 0.42 || hard) ? 1 : 0;
      const pool = pools[r][hi];
      if (!m.move) { m.move = pool[m.seed % pool.length]; m.from = m.move; m.mix = 1; m.nextAt = t + 6 + m.seed * 1.3; }
      if ((t >= m.nextAt && audio.beat) || (secChanged && m.a > 0.5) || !pool.includes(m.move)) {
        const opts = pool.filter(x => x !== m.move);
        const nm = opts[(Math.floor(t * 7.31) + m.seed * 3) % opts.length] || m.move;
        m.from = m.move; m.move = nm; m.mix = 0;
        m.nextAt = t + (60 / Math.max(60, tempo)) * 4 * (2 + ((m.seed + E.beats) % 3)); // 2–4 bars
      }
      m.mix = Math.min(1, m.mix + dt / 0.7);
    }
    // draw back-to-front: side members first, lead last
    const draw = order.filter(r => E.mem[r].a > 0.02 && E.mem[r].x != null).sort((a, b) => (E.mem[a].lead ? 1 : 0) - (E.mem[b].lead ? 1 : 0));
    let k = 0;
    for (const r of draw) {
      const m = E.mem[r];
      const lead = !!m.lead && band[0] === r;
      const ax = w * Math.max(0.12, Math.min(0.88, m.x)) + Math.sin(t * 0.3 + m.seed) * 4;
      const drawn = drawPerformer(ctx, {
        x: ax, baseY: h * (ground - (lead ? 0 : 0.014)), heightPx: h * (lead ? 0.205 : 0.176), t, i: m.seed,
        opacity: 0.97 * Math.min(1, m.a * 1.15), energy, hard, look: r, rim, lightSide,
        beatPh: E.beatPh + m.seed * 0.6, move: m.move, moveFrom: m.from, moveMix: m.mix, level: E.lv[r]
      });
      if (lead) this._figureAnchor = { x: drawn.fx, y: (drawn.headY + drawn.chestY) * 0.5 };
      k++;
    }
    globalThis.__LS_CAST__ = { band, n: band.length, lead, moves: band.map(r => E.mem[r].move), lv: Object.fromEntries(order.map(r => [r, +E.lv[r].toFixed(2)])) };
  }

  /**
   * style1 (CEO rule 2): ONE held character for the locked style that STANDS AND REACTS.
   * - No traversal: anchored to one plate spot (moves only with the painting's pan, feet never slide).
   *   Walk only when Scene stamps cast.action==='walk' WITH a reason AND locomotion !== false.
   * - Pose from directive.reaction.verb (Scene) via VISUAL_STYLES[style].cast.moves; local Visual
   *   triggers (lightning bolt drawn by ArtPlates, kit crows taking off) react within the same frame.
   * - Gaze: head/torso turn toward the on-screen kit element the reaction names (lantern target,
   *   doorway, streetlamp, landmark, crows/birds, beast, bolt), else reaction.gazeU/V on the plate.
   * - Horror startles honoured at most kit.peakMax (2) per track; extra ones logged as suppressed.
   * - Logs: __LS_ART__.castMove/castTrigger/castTriggerAt/castMoveAt/castLatencyMs/castLog/castOutfit/styleKitActive.
   */
  _drawStyleDreamer(ctx, w, h, directive, state) {
    const NEU = !!this._neutral || !this._style;
    const S = NEU ? NEUTRAL_STYLE : this._style, VS = S.VS, kit = S.kit || { elements: new Set(), peakMax: 2 }, grade = S.grade;
    const CMP = NEU ? NEUTRAL_COMP : this._comp;
    const t = Number(state?.t ?? 0) || 0, now = t * 1000;
    const audio = state?.audio || {};
    const art = this._artOn ? this.art.active() : null;
    const G = art ? this.art.geo(art) : null;
    const D = this._sd || (this._sd = { id: '__', x: null, au: null, a: 0, lastT: t, bph: 0, bpm: 110, move: 'stand', from: 'stand', mix: 1, gx: 0, gy: 0, verbKey: null, cur: null, boltSeen: -1, crowSeen: -1, startles: 0, suppressed: 0, moveAt: now, wph: 0 });
    const dt = Math.max(0, Math.min(0.1, t - D.lastT)); D.lastT = t;
    // tempo phase for sway / headbang / bounce
    const bpm = Math.max(60, Math.min(180, Number(audio.bpm) || D.bpm)); D.bpm += (bpm - D.bpm) * Math.min(1, dt * 0.5);
    let tempo = D.bpm; while (tempo > 135) tempo /= 2;
    const slow = S.id === 'horror' || S.id === 'sad';
    const qd = Math.PI * (S.id === 'ember_wasteland' || S.id === 'candy_pop' ? 1 : 0.5);
    D.bph += dt * (slow ? 0.35 : tempo / 60) * qd;
    if (audio.beat && !slow) D.bph += (Math.round(D.bph / qd) * qd - D.bph) * 0.3;
    // ---- placement (anchored) ----
    let H, gy, x;
    const cast = directive?.cast && typeof directive.cast === 'object' && !Array.isArray(directive.cast) ? directive.cast : {};
    const R = directive?.reaction || cast.reaction || null;
    const noLoco = R?.locomotion === false || cast.locomotion === false;
    const walkReason = cast.walkReason || cast.reason || R?.walkReason || null;
    const walkOk = !noLoco && (cast.action === 'walk' || R?.verb === 'walk') && !!walkReason;
    if (G && this.art.toScreen(art, 0, 0)) {
      const dh = this.art.plateH(art);
      H = Math.max(h * 0.06, G.fh * dh * (CMP?.scale || 1)); // HOLD-1345 human-scale floor; mood scale (sad small, heavy big)
      const halfW = H * 0.22;
      const valid = (sx) => {
        if (sx < w * 0.1 || sx > w * 0.9) return false;
        const u = this.art.plateU(art, sx); if (u == null || u < G.walk[0] || u > G.walk[1]) return false;
        const gv = this.art.groundV(art, u), top = gv - (H * 1.15) / dh;
        if (S.id === 'sad' || S.id === 'horror') for (const f of G.focal) { const fx = this.art.toScreen(art, f[0], f[1])[0], fr = f[2] * this.art.map[art].dw; if ((f[1] + f[2] * 0.6) > top && (f[1] - f[2] * 0.6) < gv && Math.abs(sx - fx) < fr + halfW) return false; }
        return true;
      };
      const fu = Math.max(0.12, Math.min(0.88, Number(CMP?.focalU ?? 0.32)));
      // polish6 item 1: pick the spot nearest where the figure already stands (or the composition focal on first show)
      const respot = () => {
        const c0 = D.lastX != null && D.seen && !D.forceFocal ? D.lastX / w : fu; D.forceFocal = false;
        const c = [0, -0.04, 0.04, -0.08, 0.08, 0.12, -0.12, 0.18, -0.18, 0.3, -0.3].map(d => (c0 + d) * w).find(valid);
        D.au = c != null ? this.art.plateU(art, c) : null; D.keepC = c != null ? c / w : null;
      };
      if (D.id !== art) { // new world (same style): stay where we are in the frame, ease feet onto the new ground — no fade, no walk-in
        if (D.seen && D.lastX != null && D.lastGy != null) { D.blendFrom = [D.lastX, D.lastGy]; D.blendP = 0; }
        D.id = art; D.fade = false; respot();
      }
      if (D.au == null) respot();
      // polish6 item 1: the plate pans UNDER the figure, never the figure off the plate. ArtPlates soft-clamps its pan so the
      // anchor stays inside a band around where it was placed (sad/horror held tight, others looser). No fade-out / re-spot cut.
      if (D.au != null && D.keepC != null) {
        const band = (S.id === 'sad' || S.id === 'horror') ? 0.07 : 0.16;
        this.art.keep = { id: art, u: D.au, lo: Math.max(0.08, D.keepC - band), hi: Math.min(0.92, D.keepC + band) };
      } else this.art.keep = null;
      if (D.au != null) {
        if (walkOk) D.au = Math.max(G.walk[0], Math.min(G.walk[1], D.au + dt * 0.008 * (D.walkDir || 1)));
        x = this.art.toScreen(art, D.au, 0)[0];
        gy = this.art.toScreen(art, 0, this.art.groundV(art, Math.max(G.walk[0], Math.min(G.walk[1], D.au))))[1];
      }
    }
    if (x == null) { // procedural world (or plate without a spot): same third, same scale
      if (D.id !== '__proc') { if (D.seen && D.lastX != null && D.lastGy != null) { D.blendFrom = [D.lastX, D.lastGy]; D.blendP = 0; } D.id = '__proc'; }
      this.art.keep = null;
      H = Math.max(h * 0.06, h * 0.15 * (CMP?.scale || 1)); gy = h * 0.84; x = w * Math.max(0.12, Math.min(0.88, Number(CMP?.focalU ?? 0.32)));
    }
    if (!D.blendFrom && D.seen && D.lastX != null && Math.abs(x - D.lastX) > w * 0.04) { D.blendFrom = [D.lastX, D.lastGy ?? gy]; D.blendP = 0; }
    if (D.blendFrom) { // eased hand-off between worlds / keep-clamp (1s, dt-capped smoothstep) instead of a jump cut
      D.blendP = Math.min(1, (D.blendP || 0) + Math.max(0.016, Math.min(0.05, dt)) / 1.0);
      const k = D.blendP, sm = k * k * (3 - 2 * k);
      x = D.blendFrom[0] + (x - D.blendFrom[0]) * sm; gy = D.blendFrom[1] + (gy - D.blendFrom[1]) * sm;
      if (k >= 1) D.blendFrom = null;
    }
    D.seen = true; D.lastGy = gy;
    { const ox = D.lastX; if (ox != null && Math.abs(x - ox) > w * 0.06) { D.jumps = (D.jumps || 0) + 1; } }
    D.a += ((D.fade ? 0 : 1) - D.a) * (1 - Math.exp(-dt / (D.fade ? 0.35 : 0.9)));
    const side = x < w / 2 ? 1 : -1;
    D.lastX = x;
    this.kitPainter.layout({ w, h, H, fx: x, gy, side });
    const comp = CMP || null, CH = comp?.chaos || 0;
    const allowed = capKit(S.id, kit, comp);
    // ---- reaction selection ----
    const T = this.kitPainter.targets || {};
    const peakMax = Number.isFinite(kit.peakMax) ? kit.peakMax : 2;
    let cand = null;
    if (R && R.verb) {
      const key = `${R.verb}|${R.since ?? ''}|${R.target ?? ''}`;
      if (key !== D.verbKey) { D.verbKey = key; cand = { verb: R.verb, target: R.target || null, why: R.why || null, since: Number.isFinite(+R.since) ? +R.since : now, strength: +R.strength || 0.5, gazeU: R.gazeU, gazeV: R.gazeV, src: 'scene' }; }
    }
    // local Visual triggers (same-frame): lightning drawn by ArtPlates, crows lifting off in the kit
    const A = this.art.ag || {};
    const boltOk = /horror|cinematic|ember_wasteland/.test(S.id) && this.art.allow?.accent?.has('lightning') && (S.id !== 'ember_wasteland' || (this._heavyStorm ?? 1) > 0.35);
    if (boltOk && A.boltAt > D.boltSeen && t - A.boltAt < 0.5 && A.bolt && A.bolt.length) {
      D.boltSeen = A.boltAt; const end = A.bolt[A.bolt.length - 1];
      cand = { verb: S.id === 'horror' ? 'startle' : 'turn', target: 'lightning', why: 'lightning', since: A.boltAt * 1000, strength: 0.85, pos: end, src: 'visual' };
    }
    const ce = this.kitPainter.st?.crowEvent;
    if (allowed.has('crows') && ce != null && ce > D.crowSeen) { D.crowSeen = ce; if (!cand || cand.strength < 0.8) cand = { verb: S.id === 'horror' ? 'freeze' : 'turn', target: 'crows', why: 'bird', since: ce * 1000, strength: 0.8, src: 'visual' }; }
    if (walkOk) cand = cand && cand.verb !== 'idle_sway' ? cand : (D.cur?.verb === 'walk' ? null : { verb: 'walk', target: walkReason, why: 'walk', since: now, strength: 0.4, src: 'scene' });
    if (cand) {
      const busy = D.cur && now < D.cur.until && !IDLE_VERBS.has(D.cur.verb);
      // horror startle cap (per track): first peakMax honoured, the rest suppressed + logged
      const startle = S.id === 'horror' && (cand.verb === 'startle' || (/^(turn|brace|step_back|freeze)$/.test(cand.verb) && (cand.strength >= 0.8 || /flash|collapse|blackout|lightning/.test(String(cand.why || '')))));
      if (startle) {
        if (D.startles >= Math.max(1, peakMax)) { D.suppressed++; this._pushCastLog({ t: now, move: 'gaze', trigger: triggerOf(cand.why, cand.target, cand.verb), triggerAt: cand.since, latencyMs: null, suppressed: true }); cand = { ...cand, verb: 'slow_head_turn', strength: 0.4 }; }
        else D.startles++;
      }
      if (!busy || cand.strength >= (D.cur?.strength || 0) + 0.05 || (cand.src === 'scene' && !IDLE_VERBS.has(cand.verb))) {
        const hold = { turn: 1.8, brace: 1.6, raise_arms: 2.6, step_back: 2.0, look_up: 2.4, look_toward: 3.0, walk: 4, idle_sway: 0.5, startle: 1.4, freeze: 2.2, slow_head_turn: 2.6, lift_head: 3, raise_fists: 2.4 }[cand.verb] || 2;
        D.cur = { ...cand, until: now + hold * 1000 };
      }
    }
    if (!D.cur || (now > D.cur.until && D.cur.verb !== 'walk') || (D.cur.verb === 'walk' && !walkOk)) D.cur = { verb: (R && IDLE_VERBS.has(R.verb)) ? R.verb : 'idle_sway', target: null, why: 'wind', since: D.cur?.verb === 'idle_sway' ? D.cur.since : now, strength: 0.3, until: now + 500, src: 'visual' };
    const verb = D.cur.verb;
    let move = (VS.cast.moves[verb] || VS.cast.moves.idle_sway);
    if (verb === 'walk') move = 'walk';
    if (!NEU && comp?.cozy && verb !== 'walk') move = /look_up|raise|point|lift/.test(verb) ? 'mug_look' : 'mug'; // cozy host styles too
    if (!NEU && S.id === 'horror' && CH > 0.35 && IDLE_VERBS.has(verb)) move = 'lift_lantern'; // loud horror: lantern thrust toward the dark, reads in a still
    if (!NEU && S.id === 'ember_wasteland' && CH > 0.35) { if (IDLE_VERBS.has(verb) || move === 'stand' || move === 'headbang') move = (this.kitPainter.st?.lungeAt != null && t - this.kitPainter.st.lungeAt < 1.4) ? 'raise_fists' : 'roar'; } // loud heavy: always roar/raise_fists, never arms down
    const FR = (!NEU && S.id === 'candy_pop') ? this._candyFriendsUpdate(directive, t) : null;
    if (FR && FR.on && IDLE_VERBS.has(verb)) move = FR.move; // chorus: the lead dances the same step as the friends
    // sad letter: one hand, only when the lyric is about the person
    const letter = !!(directive?.lyricAboutPerson || directive?.aboutPerson || directive?.semantic?.aboutPerson || directive?.lyricPerson);
    if (S.id === 'sad' && letter && (move === 'pockets')) move = 'lantern';
    const letterOn = S.id === 'sad' && (letter || verb === 'hold_memory'); // one hand raised low in front holding the letter
    // ---- gaze target: the on-screen element the reaction is about ----
    const headX = x, headY = gy - H * 0.92;
    const tg = String(D.cur.target || '').toLowerCase();
    let pos = D.cur.pos || null, gsrc = pos ? 'event' : null;
    const pick = (...ks) => { for (const k of ks) if (T[k]) return T[k]; return null; };
    if (!pos) {
      if (/bird|crow/.test(tg)) { pos = pick('crows', 'birds'); if (!pos && Number.isFinite(+D.cur.gazeU) && art) { pos = this.art.toScreen(art, +D.cur.gazeU, +D.cur.gazeV); if (allowed.has('crows') || allowed.has('birds')) this.kitPainter.spawnAt(allowed.has('crows') ? 'crows' : 'birds', pos[0], pos[1], t); } }
      else if (/fire|beast|furnace|void/.test(tg)) pos = pick('beast');
      else if (/lamp|light|window|warm|shaft|sun|altar/.test(tg)) pos = pick('streetlamp', 'beams', 'sun', 'lantern');
      else if (/landmark|horizon|vanishing|skyline|stars|monolith/.test(tg)) pos = pick('landmark');
      else if (/door|sound|behind/.test(tg)) pos = pick('doorway', 'far_figure');
      if (!pos) {
        const up = UP_VERBS.has(verb) || verb === 'shield_eyes';
        const byStyle = {
          horror: up ? ['crows', 'doorway'] : ['doorway', 'far_figure'],
          sad: (verb === 'lift_head' || verb === 'look_up') ? ['streetlamp'] : ['bench', 'puddles'],
          cinematic: up ? ['beams', 'landmark'] : ['landmark', 'birds'],
          candy_pop: ['sun', 'balloons'], ember_wasteland: ['beast']
        }[S.id] || [];
        pos = pick(...byStyle); gsrc = pos ? 'kit' : null;
      } else gsrc = 'kit';
      if (!pos && Number.isFinite(+D.cur.gazeU) && art) { pos = this.art.toScreen(art, +D.cur.gazeU, +D.cur.gazeV); gsrc = 'scene'; }
      if (!pos) { pos = [w * 0.5, h * 0.35]; gsrc = 'default'; }
    }
    let gx = Math.max(-1, Math.min(1, (pos[0] - headX) / (w * 0.22)));
    let gyv = Math.max(-1, Math.min(1, (headY - pos[1]) / (h * 0.3)));
    if (S.id === 'sad' && verb !== 'lift_head' && verb !== 'look_up' && verb !== 'raise_arms') gyv = Math.min(gyv, -0.5); // head low (gazes at the empty bench / puddle)
    if (S.id === 'sad' && (verb === 'lift_head' || verb === 'look_up' || verb === 'raise_arms')) gyv = Math.max(gyv, 0.7);   // lift head into the soft light
    const kG = 1 - Math.exp(-dt / (IDLE_VERBS.has(verb) ? 0.9 : verb === 'slow_head_turn' ? 0.8 : 0.25)); // reactions turn fast, idle drifts
    D.gx += (gx - D.gx) * kG; D.gy += (gyv - D.gy) * kG;
    // ---- pose change (eased; castMoveAt = reaction pose start) ----
    if (move !== D.move) {
      D.from = D.move; D.move = move; D.mix = 0; D.moveAt = now;
      const lm = MOVE_LOG[verb] || 'idle', trig = triggerOf(D.cur.why, D.cur.target, verb);
      const lat = Math.max(0, Math.round(now - (Number.isFinite(D.cur.since) ? D.cur.since : now)));
      D.logMove = lm; D.logTrig = trig; D.trigAt = D.cur.since; D.lat = lat;
      this._pushCastLog({ t: now, move: lm, trigger: trig, triggerAt: Math.round(D.cur.since), latencyMs: lat, pose: move, src: D.cur.src });
    } else if (D.logMove == null) { D.logMove = MOVE_LOG[verb] || 'idle'; D.logTrig = triggerOf(D.cur.why, D.cur.target, verb); D.trigAt = D.cur.since; D.lat = 0; }
    D.mix = Math.min(1, D.mix + dt / (IDLE_VERBS.has(verb) ? 0.9 : 0.35));
    // ---- draw: kit midground → figure → kit foreground ----
    const flashCtx = (col, a) => { if (!this._flashGate(now)) return; ctx.save(); try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (_) { /* soft */ } ctx.globalAlpha = 1; ctx.fillStyle = col + Math.min(0.25, a) + ')'; ctx.fillRect(0, 0, w, h); ctx.restore(); };
    const kitInfo = { reduceMotion: !!getMotionComfort().reduceMotion, xf: this._tiltXfNow || null, style: S.id, kit, allowed, chaos: CH, stormGain: this._heavyStorm ?? 1, motion: comp?.motionMul != null ? Math.max(0.3, Math.min(1.6, comp.motionMul * 1.5)) : 1, warmLight: comp?.warmLight, flashCtx, grade, t, audio, L: { w, h, H, fx: x, gy, side }, quality: this.quality, swell: S.id === 'sad' && (verb === 'lift_head' || verb === 'look_toward_light' || verb === 'look_up') ? 1 : 0, startle: S.id === 'horror' && (verb === 'startle' || (/freeze|step_back/.test(verb) && D.cur.strength >= 0.8)), letter: letterOn };
    if (!NEU) try { this.kitPainter.drawMid(ctx, kitInfo); } catch (e) { artLog({ kitError: String(e && e.message || e) }); }
    if (!NEU && S.id === 'ember_wasteland' && this._pendingTypoDraw) {
      if (this.typography?.currentText && (this.typography?.opacity || 0) > 0.05) { // subtle dark top scrim band behind lyrics over the beast
        if (!this._emberScrimSpr) {
          const sc = document.createElement('canvas'); sc.width = 1; sc.height = 64;
          const sg2 = sc.getContext('2d'), gr = sg2.createLinearGradient(0, 0, 0, 64);
          gr.addColorStop(0, 'rgba(4,2,3,0.58)'); gr.addColorStop(0.65, 'rgba(4,2,3,0.34)'); gr.addColorStop(1, 'rgba(4,2,3,0)');
          sg2.fillStyle = gr; sg2.fillRect(0, 0, 1, 64); this._emberScrimSpr = sc;
        }
        ctx.save(); try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (_) {}
        ctx.drawImage(this._emberScrimSpr, 0, 0, w, h * 0.25); ctx.restore();
      }
      try { this._pendingTypoDraw(); } catch (_) {}
    }
    const voc = this.art.ag?.lv?.vocals || this.kitPainter.lv?.v || 0;
    const swayAmp = Math.max(0.1, Math.min(1, (Number(R?.sway) || 0.3) * 1.6)) * (VS.cast.swayMul ?? 0.5) * (1 + CH * 0.8) * (comp?.motionMul != null ? Math.max(0.25, Math.min(1.5, comp.motionMul * 1.6)) : 1);
    const react = { gx: D.gx, gy: D.gy, hunch: VS.cast.hunch * (gyv > 0.3 ? 0.2 : 1), swayMul: swayAmp, hood: !!VS.cast.hood, coat: VS.cast.coat, prop: VS.cast.prop === 'staff' ? 'staff' : null,
      wind: S.id === 'cinematic' ? 0.35 + 0.65 * voc : S.id === 'sad' ? 0.15 : 0.1, body: VS.cast.bright ? '#c94a8c' : (S.id === 'cozy' ? '#2a1a14' : null),
      blanket: !NEU && (!!VS.cast.blanket || !!comp?.cozy), mug: !NEU && (!!VS.cast.mug || !!comp?.cozy) };
    if (verb === 'walk') { D.wph += dt * 3.2; }
    if (FR) this._drawCandyFriends(ctx, w, h, FR, { x, gy, H, side, t, bph: D.bph, alpha: D.a, rim: `rgba(${grade.rim},0.95)`, energy: Math.min(1, Number(audio.energy) || 0) });
    const dr = drawPerformer(ctx, {
      x, baseY: gy, heightPx: H, t, i: 21, opacity: 0.96 * D.a, energy: Math.min(1, Number(audio.energy) || 0) * (slow ? 0.4 : 0.8), hard: S.id === 'ember_wasteland',
      look: 'wanderer', rim: (!NEU && S.id === 'ember_wasteland') ? 'rgba(255,168,76,0.98)' : `rgba(${grade.rim},0.95)`, lightSide: side, beatPh: verb === 'walk' ? D.wph : D.bph, move, moveFrom: D.from, moveMix: D.mix,
      facing: side, glow: (!NEU && S.id === 'ember_wasteland') ? Math.max(0.35, voc, this.kitPainter.lv?.x || 0, CH * 0.65) : voc * 0.5, react
    });
    if (!NEU) try { this.kitPainter.drawFg(ctx, { ...kitInfo, hands: dr?.hands || null }); } catch (e) { artLog({ kitError: String(e && e.message || e) }); }
    this._figureAnchor = { x: dr.fx, y: (dr.headY + dr.chestY) * 0.5 };
    this._dreamFeet = [x, gy];
    const outfit = VS.cast.outfit + (S.kit?.figure?.costume ? `|${S.kit.figure.costume}` : '');
    globalThis.__LS_CAST__ = { n: 1, move: D.move, walking: verb === 'walk', H: Math.round(H), style: S.id, extras: 0, row: 1, moves: [D.move] };
    artLog({
      castMove: D.logMove, castTrigger: D.logTrig, castTriggerAt: Math.round(D.trigAt), castMoveAt: Math.round(D.moveAt), castLatencyMs: D.lat,
      castPose: D.move, castVerb: verb, castWalking: verb === 'walk', castWalkReason: verb === 'walk' ? walkReason : null, castLocomotion: !noLoco,
      castGaze: { x: Math.round(pos[0]), y: Math.round(pos[1]), target: D.cur.target || null, src: gsrc }, castOutfit: outfit,
      styleKitActive: this.kitPainter.active.slice(), kitTargets: Object.fromEntries(Object.entries(this.kitPainter.targets || {}).map(([k, v]) => [k, [Math.round(v[0]), Math.round(v[1])]])),
      startleCount: D.startles, startleSuppressed: D.suppressed, castNeutral: NEU, castJumps: D.jumps || 0, ...(NEU ? {} : { styleLock: S.id, styleSource: S.source, styleLatchedAt: S.latchedAt })
    });
  }

  /**
   * polish6 item 3: horizon tilt. Reads composition.horizonTilt ?? composition.tilt (resolveComposition → comp.tilt).
   * UNITS: degrees (Worlds/Scene emit e.g. 4 for loud Sad; Camera reads degrees too). A small NON-integer |v| < 0.2 is taken
   * as radians (0.07 → 4.0°). Clamped to ±8°. Eased (τ 0.6s) so quiet→loud leans in instead of snapping. Pivot = figure feet.
   * Returns a DOMMatrix (screen space) or null when level. Overscan: the smallest zoom (≤1.35) that keeps the rotated plate
   * covering the whole frame, computed against the plate rect (uses the plate's spare width before zooming).
   */
  _worldTiltXf(w, h, now) {
    const raw = Number(this._comp?.tilt) || 0;
    let deg = (raw !== 0 && Math.abs(raw) < 0.2 && !Number.isInteger(raw)) ? raw * 180 / Math.PI : raw;
    deg = Math.max(-8, Math.min(8, deg));
    if (this._styleShownAt == null || !this._style) deg = 0;
    const dt = Math.max(0, Math.min(0.1, (now - (this._tiltT ?? now)) / 1000)); this._tiltT = now;
    this._tiltA = (this._tiltA || 0) + (deg - (this._tiltA || 0)) * (1 - Math.exp(-dt / 0.6));
    const a = this._tiltA;
    if (Math.abs(a) < 0.05) { if (this._tiltLogged !== 0) { this._tiltLogged = 0; artLog({ tiltDeg: 0, tiltTarget: +deg.toFixed(2), tiltRaw: raw }); } return null; }
    const px = this._sd?.lastX ?? w * (this._comp?.focalU ?? 0.5), py = this._sd?.lastGy ?? h * 0.8;
    const m = this.art.map?.[this.art.cur] || null;
    const rx0 = m ? m.x : 0, ry0 = m ? m.y : 0, rx1 = m ? m.x + m.dw : w, ry1 = m ? m.y + m.dh : h;
    const th = -a * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
    let sc = 1;
    for (; sc < 1.35; sc += 0.01) {
      let ok = true;
      for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) { const dx = (cx - px) / sc, dy = (cy - py) / sc; const qx = px + dx * c - dy * sn, qy = py + dx * sn + dy * c; if (qx < rx0 + 1 || qx > rx1 - 1 || qy < ry0 + 1 || qy > ry1 - 1) { ok = false; break; } }
      if (ok) break;
    }
    const r = +a.toFixed(1);
    if (this._tiltLogged !== r) { this._tiltLogged = r; artLog({ tiltDeg: r, tiltTarget: +deg.toFixed(2), tiltRaw: raw, tiltScale: +sc.toFixed(2), tiltPivot: [Math.round(px), Math.round(py)] }); }
    return new DOMMatrix().translate(px, py).rotate(a).scale(sc).translate(-px, -py);
  }

  /**
   * polish6 item 4: Candy chorus friends. Scene's directive.sectionType ('chorus' — also 'drop'/'hook') turns them on after
   * 0.4s of chorus; 2–3 friends enter staggered (0.35s apart) rising out of a crouch beside the lead (no walking in), dance
   * the SAME step on the SAME beat phase as the lead (step changes every bar: bounce → clap → armsup → wave), and after the
   * chorus has been gone 1s they wave and sink/fade out staggered. Logged as __LS_ART__.candyFriends.
   */
  _candyFriendsUpdate(directive, t) {
    const sec = String(directive?.sectionType || directive?.section || '').toLowerCase();
    const chorus = /chorus|drop|hook/.test(sec);
    const F = this._friends || (this._friends = { on: false, since: -99, offAt: -99, seen: null, last: -99, n: 0 });
    if (chorus) { if (F.seen == null) F.seen = t; F.last = t; if (!F.on && t - F.seen > 0.4) { F.on = true; F.since = t; F.n = (F.n || 0) + 1; artLog({ candyFriends: { on: true, at: Math.round(t * 1000), entries: F.n } }); } }
    else { F.seen = null; if (F.on && t - F.last > 1.0) { F.on = false; F.offAt = t; artLog({ candyFriends: { on: false, at: Math.round(t * 1000), entries: F.n } }); } }
    const bph = this._sd?.bph || 0, bar = Math.floor(bph / (Math.PI * 4));
    F.move = ['bounce', 'clap', 'armsup', 'wave'][((bar % 4) + 4) % 4];
    return F;
  }

  _drawCandyFriends(ctx, w, h, F, o) {
    const { x, gy, H, side, t } = o;
    const sm = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
    const slots = [
      { dx: 0.34, sc: 0.74, dy: -0.07, i: 24, look: 'rhythm', body: '#7a5cd6', back: true },
      { dx: -0.64, sc: 0.9, dy: -0.02, i: 22, look: 'dancer', body: '#3f9fd0' },
      { dx: 0.64, sc: 0.9, dy: -0.02, i: 23, look: 'dancer', body: '#e09a2e' }
    ];
    let shown = 0;
    for (let k = 0; k < slots.length; k++) {
      const sl = slots[k], order = sl.back ? 2 : k - 1; // flankers first, the back friend last
      let a, rise = 0, move = F.move;
      if (F.on) { const e = sm((t - F.since - order * 0.35) / 0.6); a = e; rise = 1 - e; }
      else { const e = sm((t - F.offAt - order * 0.25) / 0.8); a = 1 - e; rise = e * 0.6; if (e > 0 && e < 1) move = 'wave'; }
      if (a <= 0.01) continue;
      const fx = x + sl.dx * H * (sl.back ? 1 : 1) * (side > 0 ? 1 : -1) * (sl.back ? 1 : 1);
      if (fx < w * 0.07 || fx > w * 0.93) continue;
      const hop = F.on ? Math.max(0, Math.sin(Math.min(1, (t - F.since - order * 0.35) / 0.6) * Math.PI)) * H * 0.05 : 0;
      try {
        drawPerformer(ctx, { x: fx, baseY: gy + sl.dy * H + rise * H * 0.1 - hop, heightPx: H * sl.sc * (1 - 0.12 * rise), t, i: sl.i, opacity: 0.94 * a * (o.alpha ?? 1),
          energy: o.energy * 0.8, hard: false, look: sl.look, rim: o.rim, lightSide: side, beatPh: o.bph, move, facing: 1,
          react: { gx: (x - fx) / (w * 0.5), gy: 0.15, hunch: 0, swayMul: 1, body: sl.body } });
        shown++;
      } catch (_) { /* soft */ }
    }
    if (shown !== this._friendsShown) { this._friendsShown = shown; artLog({ candyFriendsShown: shown }); }
  }

  /** polish6: true while Scene's stylePending holds the look open (living neutral scene). Latches styleShownAt once per track. */
  _neutralGate(directive, now, ctx, w, h) {
    if (this._styleShownAt != null) return false;
    if (this._prerollStart == null) this._prerollStart = now;
    const S = this._style, pend = !!(directive?.neutralHold || directive?.stylePending || S?.pending);
    const waited = now - this._prerollStart;
    if (S && (!pend || waited > 25000)) { // latched (or Scene never settles: reveal after 25s rather than hang)
      const wasNeutral = !!this._neutralSeen;
      this._styleShownAt = now; this._styleShownId = S.id;
      if (wasNeutral) { // snapshot the last neutral frame for the single crossfade
        try { const c = this._xfadeCanvas || (this._xfadeCanvas = document.createElement('canvas')); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(ctx.canvas, 0, 0); this._xfade = c; } catch (_) { this._xfade = null; }
      }
      this._applyStyleCfg(S);
      try { this.kitPainter.reset(); } catch (_) { /* soft */ }
      const D = this._sd; if (D) { if (D.lastX != null && D.lastGy != null) { D.blendFrom = [D.lastX, D.lastGy]; D.blendP = 0; } D.au = null; D.forceFocal = true; }
      artLog({ styleShownAt: Math.round(now), styleShown: S.id, neutralMs: Math.round(waited), neutralTimedOut: pend, neutral: false, revealXfadeMs: wasNeutral ? XFADE_MS : 0 });
      return false;
    }
    if (!S && !pend && waited > 2500) return false; // legacy path with no style at all
    if (!this._neutralSeen) { this._neutralSeen = true; artLog({ neutral: true, neutralStartedAt: Math.round(now) }); }
    if (this.art) { this.art.allow = { accent: new Set(), birds: false }; this.art.liftColor = '#e6e6e8'; this.art.panSpan = 90; }
    return true;
  }

  /** style-specific ArtPlates / typography / lighting config for the locked look (also re-applied at the neutral → style reveal). */
  _applyStyleCfg(S) {
    if (!S) return;
    const id = S.id, grade = S.grade;
    if (this.typography) this.typography.styleTypo = S.VS.typo;
    if (this.lighting) this.lighting.styleColors = S.VS.light;
    if (this.art) {
      const ACC = { horror: ['lightning', 'lamp'], sad: ['lamp'], cinematic: ['lightning', 'rays'], candy_pop: [], ember_wasteland: ['lightning', 'flare'] };
      this.art.allow = { accent: new Set(ACC[id] || []), birds: false };
      this.art.never = (n) => neverHas(S.kit, n); // fixmood2: plate fx / accents obey the style's never-list
      this.art.liftColor = `rgb(${grade.key})`;
      this.art.panSpan = { sad: 160, horror: 140, cozy: 120, cinematic: 90, candy_pop: 40, ember_wasteland: 36 }[id] || null;
    }
  }

  /** polish6: every style id that ever reached the screen this track (must stay length 1). */
  _noteDrawn(id) {
    const L = this._drawnStyles || (this._drawnStyles = []);
    if (L.includes(id)) return;
    L.push(id);
    artLog({ stylesDrawn: L.slice(), styleDrawnNonFinal: L.length > 1 });
  }

  /** Photosensitivity: ≤3 full-frame flashes per second, none when the user mutes white-outs. */
  _flashGate(now) {
    const c = getMotionComfort();
    if (c.muteWhiteOut || c.reduceMotion) return false;
    const F = this._flashTimes || (this._flashTimes = []);
    while (F.length && now - F[0] > 1000) F.shift();
    if (F.length >= (c.lessFlash ? 1 : 3)) return false;
    F.push(now); return true;
  }

  _pushCastLog(e) {
    try {
      const A = globalThis.__LS_ART__ || (globalThis.__LS_ART__ = {});
      const L = Array.isArray(A.castLog) ? A.castLog : (A.castLog = []);
      L.push(e); if (L.length > 200) L.splice(0, L.length - 200);
    } catch (_) { /* soft */ }
  }

  /**
   * art6 (QA-0313): a dreamer INSIDE the painting, not a band in front of it.
   * - 0–1 small figure (scaled to the world: WORLD_GEO.fh of the plate height), seen from behind
   *   or side-on, on the painting's ground line, off-centre and never over a focal point.
   * - While the camera pans the dreamer walks side-on (a tracking shot); at rest they stand and
   *   look into the world, and dance when the song earns it (chorus / sustained energy).
   * - Vocals → the dreamer's motion + glow. Other roles live in ArtPlates.drawAgents.
   * - At peaks, 2–3 small distant figures appear for ~7s at different depths, then fade.
   * No props, no band roles, no facing lineup. Debug: globalThis.__LS_CAST__ (cover, row).
   */
  _drawArtDreamer(ctx, w, h, directive, state) {
    const t = Number(state?.t ?? 0) || 0;
    const audio = state?.audio || {};
    const id = this.art.active();
    const G = id ? this.art.geo(id) : null;
    const D = this._dream || (this._dream = { id: null, x: null, tx: null, a: 0, lastT: t, wph: 0, bph: 0, bpm: 110, eSlow: 0, move: 'idle', from: 'idle', mix: 1, nextAt: 0, facing: 1, sec: null, peakAt: -99, extras: [], visit: 0 });
    const dt = Math.max(0, Math.min(0.1, t - D.lastT)); D.lastT = t;
    const figs = [];
    const energy = Math.max(0, Math.min(1, Number(audio.energy) || 0));
    D.eSlow += (energy - D.eSlow) * (1 - Math.exp(-dt / 6));
    const hard = !!this._artHard;
    const vocLv = this.art.ag?.lv?.vocals || 0;
    const rim = id ? this.art.rim(id) : null, lightSide = id ? this.art.light(id) : 1;
    // beat phase (dance) — soft: a sway per bar, hard: per 2 beats
    const bpm = Math.max(60, Math.min(180, Number(audio.bpm) || D.bpm)); D.bpm += (bpm - D.bpm) * Math.min(1, dt * 0.5);
    let tempo = D.bpm; while (tempo > 135) tempo /= 2;
    const qd = Math.PI * (hard ? 1 : 0.5);
    D.bph += dt * (tempo / 60) * qd;
    if (audio.beat) D.bph += (Math.round(D.bph / qd) * qd - D.bph) * 0.3;
    const lab = (x) => (x && typeof x === 'object') ? (x.label || x.type || '') : (x || '');
    const secKey = String(lab(directive?.section) || directive?.sectionLabel || directive?.sectionType || lab(state?.section) || state?.sectionType || '');
    const secChanged = D.sec != null && secKey !== D.sec; D.sec = secKey;
    const chorus = /chorus|drop/.test(secKey);
    D.secKey = secKey;
    if (!G || !this.art.toScreen(id, 0, 0)) { D.a = Math.max(0, D.a - dt * 2); this._dreamFeet = null; globalThis.__LS_CAST__ = { n: 0, cover: 0, row: 0, figs: [] }; return; }
    if (D.id !== id) { D.id = id; D.visit++; D.tx = null; D.x = null; D.a = 0; D.extras = []; D.mode = 'track'; }
    const dh = this.art.plateH(id);
    const H = Math.max(h * 0.06, G.fh * dh);
    const halfW = H * 0.22;
    // candidate screen spots: off-centre, on walkable ground, clear of every focal point
    const valid = (sx) => {
      if (sx < w * 0.1 || sx > w * 0.9) return false;
      const u = this.art.plateU(id, sx); if (u == null || u < G.walk[0] || u > G.walk[1]) return false;
      const gv = this.art.groundV(id, u), top = gv - (H * 1.15) / dh;
      for (const f of G.focal) {
        const fx = this.art.toScreen(id, f[0], f[1])[0], fr = f[2] * this.art.map[id].dw;
        const vOverlap = (f[1] + f[2] * 0.6) > top && (f[1] - f[2] * 0.6) < gv;
        if (vOverlap && Math.abs(sx - fx) < fr + halfW) return false;
      }
      return true;
    };
    const cands = (D.visit % 2 ? [0.3, 0.7, 0.22, 0.78, 0.38, 0.62, 0.14, 0.86] : [0.7, 0.3, 0.78, 0.22, 0.62, 0.38, 0.86, 0.14]).map(f => f * w);
    // two modes: 'anchor' = standing/dancing at a fixed spot IN the painting (moves with the pan);
    // 'track' = walking through the world while the camera tracks them (screen-fixed, side-on).
    const vx = this.art.panVx(id);
    const noLoco = directive?.reaction?.locomotion === false || directive?.cast?.locomotion === false; // style1
    if (noLoco && D.mode !== 'anchor') { if (D.tx == null || !valid(D.tx)) D.tx = cands.find(valid) ?? null; if (D.tx != null) { D.x = D.tx; D.mode = 'anchor'; D.au = this.art.plateU(id, D.x); } }
    const earnedNow = !hard && (chorus || D.eSlow > 0.42) && energy > 0.25;
    // hard: alternate ~12s walking through the destruction with ~12s standing defiant in it
    const wantAnchor = noLoco || earnedNow || Math.abs(vx) < w * 0.012 || (hard && (Math.floor((t + D.visit * 5) / 12) % 2 === 0 || D.eSlow > 0.62));
    if (D.mode === 'anchor') {
      const ax = this.art.toScreen(id, D.au, 0)[0];
      if (!valid(ax) || !wantAnchor) { D.mode = 'track'; D.x = ax; D.tx = valid(ax) ? ax : (cands.find(valid) ?? null); }
      else { D.x = ax; D.tx = ax; }
    }
    if (D.mode !== 'anchor') {
      if (D.tx == null || !valid(D.tx)) D.tx = cands.find(valid) ?? null;
      if (D.tx != null) D.x = D.x == null ? D.tx : D.x + (D.tx - D.x) * (1 - Math.exp(-dt / 1.6));
      if (wantAnchor && D.x != null && D.tx != null && Math.abs(D.tx - D.x) < w * 0.02 && valid(D.x)) { D.mode = 'anchor'; D.au = this.art.plateU(id, D.x); }
    }
    const visible = D.tx != null;
    D.a += ((visible ? 1 : 0) - D.a) * (1 - Math.exp(-dt / (visible ? 0.9 : 0.4)));
    const respot = D.mode !== 'anchor' && D.x != null && D.tx != null ? D.tx - D.x : 0;
    const walking = !noLoco && visible && D.mode !== 'anchor' && (Math.abs(vx) > w * 0.012 || Math.abs(respot) > w * 0.03);
    if (walking) D.facing = Math.abs(respot) > w * 0.03 ? Math.sign(respot) : -Math.sign(vx);
    const u = 0.84 * H / 100 / 0.84; // px per pose unit
    const walkSpeed = Math.min(60, Math.abs(vx) + Math.abs(respot) * 0.6);
    D.wph += dt * Math.max(2.2, (walkSpeed / Math.max(1, 34 * H / 100)) * Math.PI * 2);
    // moves: walk / stand-and-look / dance when the song earns it
    const earned = earnedNow;
    const pool = walking ? ['walk']
      : hard ? (D.eSlow > 0.5 ? ['open', 'idle', 'armsup', 'fist'] : ['idle', 'open', 'gaze'])
      : earned ? ['flow', 'wave', 'armsup', 'hips', 'open'] : ['idle', 'gaze', 'idle', 'open'];
    if (!pool.includes(D.move) || (t >= D.nextAt && (audio.beat || walking)) || (secChanged && !walking)) {
      const opts = pool.length > 1 ? pool.filter(x => x !== D.move) : pool;
      const nm = opts[Math.floor(t * 7.31) % opts.length];
      if (nm !== D.move) { D.from = D.move; D.move = nm; D.mix = 0; }
      D.nextAt = t + (60 / Math.max(60, tempo)) * 4 * (2 + (Math.floor(t) % 3));
    }
    D.mix = Math.min(1, D.mix + dt / 0.8);
    // draw the dreamer (feet on the painting's ground under them)
    if (D.a > 0.02 && D.x != null) {
      const uu = this.art.plateU(id, D.x);
      const by = this.art.toScreen(id, 0, this.art.groundV(id, Math.max(G.walk[0], Math.min(G.walk[1], uu))))[1];
      const isWalk = D.move === 'walk';
      const dr = drawPerformer(ctx, {
        x: D.x, baseY: by, heightPx: H, t, i: 20, opacity: 0.96 * D.a, energy: hard ? energy : energy * 0.7, hard,
        look: 'wanderer', rim, lightSide, beatPh: isWalk ? D.wph : D.bph, move: D.move, moveFrom: D.from, moveMix: D.mix,
        facing: D.facing, glow: vocLv
      });
      this._figureAnchor = { x: dr.fx, y: (dr.headY + dr.chestY) * 0.5 };
      this._dreamFeet = [D.x, by];
      figs.push({ x: D.x, by, H, a: D.a });
    } else this._dreamFeet = null;
    // peaks → 2–3 small distant figures for ~7s at staggered depths (never a lineup)
    const peak = (chorus && secChanged) || (D.eSlow > 0.5 && energy > 0.78);
    if (peak && t - D.peakAt > 25 && D.a > 0.5) {
      D.peakAt = t;
      const n = hard ? 3 : 2, depths = [0.035, 0.06, 0.018], scales = [0.62, 0.48, 0.74];
      const spots = [];
      for (const f of [0.18, 0.84, 0.5, 0.36, 0.64]) {
        const sx = f * w;
        if (Math.abs(sx - (D.x ?? -1e9)) < w * 0.16 || spots.some(p => Math.abs(p - sx) < w * 0.16) || !valid(sx)) continue;
        spots.push(sx); if (spots.length >= n) break;
      }
      D.extras = spots.map((sx, j) => ({ u: this.art.plateU(id, sx), dv: depths[j], k: scales[j], t0: t, look: j % 2 ? 'dancer' : 'wanderer', seed: 30 + j }));
    }
    for (const X of D.extras) {
      const age = t - X.t0, life = 7;
      const al = age < 1.2 ? age / 1.2 : age > life - 1.5 ? Math.max(0, (life - age) / 1.5) : 1;
      if (age > life) continue;
      const gv = this.art.groundV(id, X.u) - X.dv;
      const [sx, sy] = this.art.toScreen(id, X.u, gv);
      if (sx < -20 || sx > w + 20) continue;
      const HX = H * X.k;
      drawPerformer(ctx, { x: sx, baseY: sy, heightPx: HX, t, i: X.seed, opacity: 0.85 * al, energy: energy * 0.6, hard, look: X.look, rim, lightSide,
        beatPh: D.bph + X.seed, move: hard ? 'open' : (earned ? 'flow' : 'idle'), facing: 1, glow: 0 });
      figs.push({ x: sx, by: sy, H: HX, a: al });
    }
    D.extras = D.extras.filter(X => t - X.t0 <= 7);
    // metric: bbox coverage (upper bound) + any row of ≥3 similar-size figures on one line
    const vis = figs.filter(f => f.a > 0.3);
    const cover = vis.reduce((acc, f) => acc + (f.H * 0.5) * (f.H * 1.12), 0) / (w * h);
    let row = 0;
    for (const f of vis) {
      const c = vis.filter(g => Math.abs(g.by - f.by) < h * 0.025 && g.H / f.H > 0.85 && g.H / f.H < 1.18).length;
      row = Math.max(row, c);
    }
    globalThis.__LS_CAST__ = { n: vis.length, cover: +cover.toFixed(4), row, move: D.move, walking, extras: D.extras.length, sec: D.secKey, H: Math.round(H), band: '', moves: [D.move] };
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
