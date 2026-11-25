/**
 * CEO P0 (Nov24): CHARACTER REACTS TO THE WORLD — no aimless walking.
 * Scene owns behavior + triggers; Visual owns pose/animation.
 * directive.reaction = { locomotion, verb, target (a KIT element on screen), gazeU, gazeV,
 *   strength, sway, since, until, why, castTrigger, castTriggerAt, style }
 * Per-style allowed verbs + limits follow STYLE-BIBLE Addendum 4.
 */
const FOCAL = {
  storm: { u: 0.62, v: 0.12 }, rainy_city: { u: 0.7, v: 0.35 }, meadow_fauna: { u: 0.72, v: 0.18 }, forest: { u: 0.3, v: 0.16 },
  misty_lake: { u: 0.5, v: 0.66 }, ocean: { u: 0.5, v: 0.42 }, snow: { u: 0.45, v: 0.2 }, space: { u: 0.55, v: 0.12 },
  dream_clouds: { u: 0.5, v: 0.18 }, apocalyptic_warzone: { u: 0.58, v: 0.55 }, burning_desert: { u: 0.5, v: 0.58 },
  metal_hall: { u: 0.5, v: 0.4 }, reality_fracture: { u: 0.5, v: 0.22 }, red_void: { u: 0.5, v: 0.4 },
  cathedral_space: { u: 0.5, v: 0.3 }, orchestral_hall: { u: 0.5, v: 0.32 }, ancient_ruins: { u: 0.6, v: 0.35 },
  endless_staircase: { u: 0.55, v: 0.1 }, futuristic_city: { u: 0.6, v: 0.3 }, neon_highway: { u: 0.5, v: 0.45 },
  empty_highway: { u: 0.5, v: 0.48 }, dark_sparse: { u: 0.35, v: 0.4 }, industrial_tunnel: { u: 0.5, v: 0.45 },
  candy_happy: { u: 0.5, v: 0.25 }, stage_pop: { u: 0.5, v: 0.3 }, white_void: { u: 0.5, v: 0.4 }
};
// where kit targets live on the plate (gaze point), by element name
const TARGET_POS = {
  lantern: { u: 0.42, v: 0.5 }, crows: { u: 0.74, v: 0.2 }, doorway: { u: 0.2, v: 0.42 }, silhouette: { u: 0.82, v: 0.44 }, fog: { u: 0.5, v: 0.7 },
  puddle: { u: 0.5, v: 0.82 }, 'warm window': { u: 0.78, v: 0.36 }, streetlamp: { u: 0.28, v: 0.3 }, umbrella: { u: 0.5, v: 0.3 }, bench: { u: 0.36, v: 0.62 },
  'far birds': { u: 0.7, v: 0.16 }, horizon: { u: 0.5, v: 0.44 }, 'light beams': { u: 0.4, v: 0.15 }, cloak: { u: 0.5, v: 0.5 },
  'fire + embers': { u: 0.55, v: 0.6 }, 'cracked ground': { u: 0.5, v: 0.85 }, beast: { u: 0.5, v: 0.32 }, 'demon eyes': { u: 0.62, v: 0.3 }, 'broken pillars': { u: 0.25, v: 0.4 },
  sparkles: { u: 0.5, v: 0.2 }, sun: { u: 0.7, v: 0.12 }, flowers: { u: 0.5, v: 0.8 },
  lightning: { u: 0.62, v: 0.1 }, 'lamp flicker': { u: 0.28, v: 0.38 }, 'crow takeoff': { u: 0.74, v: 0.2 },
  'sound behind': { u: 0.08, v: 0.45 }, 'rain swell': { u: 0.5, v: 0.12 }, 'passing light': { u: 0.8, v: 0.42 },
  'far horizon': { u: 0.5, v: 0.44 }, 'light shaft': { u: 0.4, v: 0.15 }, birds: { u: 0.7, v: 0.16 },
  explosion: { u: 0.6, v: 0.5 }, fire: { u: 0.55, v: 0.58 }, 'warm window': { u: 0.78, v: 0.36 },
  confetti: { u: 0.5, v: 0.1 }, balloons: { u: 0.6, v: 0.14 }, 'beat drop': { u: 0.5, v: 0.3 }
};
const STYLE = {
  horror: { idle: 'still_breath', calm: 'slow_head_turn', world: 'slow_head_turn', flash: 'startle', hit: 'step_back', peak: 'lift_lantern', fire: 'step_back', fauna: 'slow_head_turn',
    allowed: ['still_breath', 'slow_head_turn', 'freeze', 'step_back', 'lift_lantern', 'startle'], startleMax: 2, swayMul: 0.2 },
  cinematic: { idle: 'watch_vista', calm: 'look_up', world: 'look_toward', flash: 'turn', hit: 'brace', peak: 'raise_arms', fire: 'shield_eyes', fauna: 'look_up',
    allowed: ['watch_vista', 'look_up', 'look_toward', 'turn', 'brace', 'shield_eyes', 'raise_arms'], mainHitMax: 1, swayMul: 0.6 },
  // Darrell Nov24: Sad is hollow/uneasy, not cozy — gaze goes to what's MISSING (empty bench, empty side of frame), not a warm light
  sad: { idle: 'head_low', calm: 'gaze_empty', world: 'gaze_empty', flash: 'look_away', hit: 'look_down', peak: 'lift_head', fire: 'look_down', fauna: 'gaze_empty',
    allowed: ['head_low', 'gaze_empty', 'look_down', 'look_away', 'lift_head', 'hold_memory'], swayMul: 0.2, targets: [/bench/, /puddle/, /rain/] },
  cozy: { idle: 'settle', calm: 'look_toward_light', world: 'look_toward_light', flash: 'look_toward_light', hit: 'settle', peak: 'lift_head', fire: 'settle', fauna: 'gaze',
    allowed: ['settle', 'look_toward_light', 'lift_head', 'gaze', 'hold_mug'], swayMul: 0.45 },
  candy_pop: { idle: 'bounce', calm: 'wave', world: 'point_up', flash: 'point_up', hit: 'bounce', peak: 'dance', fire: 'point_up', fauna: 'wave',
    allowed: ['bounce', 'wave', 'point_up', 'dance'], danceNeedsSteadyKick: true, swayMul: 1 },
  ember_wasteland: { idle: 'defiant', calm: 'scan', world: 'scan', flash: 'turn', hit: 'brace', peak: 'raise_fists', fire: 'step_back', beatHard: 'headbang', fauna: 'scan',
    allowed: ['defiant', 'scan', 'turn', 'brace', 'raise_fists', 'step_back', 'headbang'], swayMul: 0 }
};
const DEFAULT = { idle: 'idle_sway', calm: 'look_toward', world: 'look_toward', flash: 'turn', hit: 'brace', peak: 'raise_arms', fire: 'step_back', fauna: 'look_up', allowed: null, swayMul: 0.6 };
const HOLD = { startle: 1200, turn: 1800, brace: 1600, raise_arms: 2600, raise_fists: 2000, step_back: 2000, look_up: 2400, look_toward: 3000,
  slow_head_turn: 3000, lift_lantern: 2600, shield_eyes: 1800, lift_head: 3500, look_toward_light: 3000, gaze_empty: 4000, look_away: 2200, look_down: 2500,
  point_up: 1400, dance: 3000, wave: 1600, bounce: 600, headbang: 500, scan: 2500 };
const LEAVING = /\b(leav(e|ing)|walk(ing)? away|go(ing)? home|on my way|hit the road|run(ning)? away|goodbye|drive away)\b/i;

// kind → element keywords to aim at (first match in the kit's on-screen element list wins)
const KIND_KEYS = {
  flash: [/lightning/, /lamp|lantern|window|streetlamp/, /light beam|beams/, /sun|rainbow/],
  fire: [/fire|ember/, /lightning/, /beast|demon/],
  fauna: [/crow/, /bird/, /deer|fauna/],
  hit: [/cracked ground|ground/, /beast|demon|silhouette/, /doorway/, /puddle|rain/, /confetti|balloon/, /horizon|landmark/],
  peak: [/light beam|beams|sun|rainbow/, /warm window|streetlamp|lantern/, /beast|horned|skull/, /confetti|sparkle/, /horizon|landmark/],
  world: [/horizon|landmark/, /warm window|streetlamp/, /doorway|silhouette/, /broken pillar|chains/, /flowers|balloon/],
  idle: [/rain|puddle/, /cloak|banner/, /fog/, /fire|ember/, /balloon|sparkle/, /horizon/]
};
function pickTarget(kit, kind, preset, styleKeys = null) {
  const T = (kit && (kit.elements || kit.targets)) || [];
  let name = null;
  for (const re of (styleKeys || KIND_KEYS[kind] || KIND_KEYS.world)) { name = T.find(x => re.test(x)); if (name) break; }
  if (!name && kind !== 'fauna') name = T[0] || null;
  const key = name && Object.keys(TARGET_POS).find(k => name.includes(k));
  const pos = (key && TARGET_POS[key]) || FOCAL[preset] || { u: 0.5, v: 0.42 };
  return { target: name || 'plate focal point', u: pos.u, v: pos.v };
}

export class ReactionDirector {
  constructor() { this.reset(); }
  reset() { this.cur = null; this.lastFaunaAt = 0; this.lastPeakAt = 0; this.lastSec = null; this.lastPreset = null; this.startles = 0; this.mainHits = 0; this.kickSteady = 0; this.lastStartleSec = -1; this.secIdx = 0; }

  /** ctx { now, preset, events[], energy, kick, drop, onset, beat, hardOnly, sectionType, style, kit, lyric } */
  tick(ctx) {
    const { now, preset } = ctx;
    const st = ctx.style || null;
    const P = STYLE[st] || DEFAULT;
    const kit = ctx.kit || null;
    const ev = new Set(ctx.events || []);
    const energy = +ctx.energy || 0, kick = +ctx.kick || 0, drop = +ctx.drop || 0, onset = +ctx.onset || 0;
    const hard = !!ctx.hardOnly;
    const sectionChanged = ctx.sectionType !== this.lastSec;
    if (sectionChanged) this.secIdx++;
    this.lastSec = ctx.sectionType;
    this.kickSteady = this.kickSteady * 0.97 + (kick >= 0.25 ? 0.03 : 0);
    let pick = null; // [kind, verb, strength, why]

    const isFireWorld = /warzone|desert|metal_hall/.test(preset);
    if (isFireWorld && (ev.has('collapse') || drop >= 0.6 || (hard && kick >= 0.6 && energy >= 0.6))) pick = ['fire', P.fire, 0.9, 'fire_hit'];
    else if (ev.has('white_flash') || ev.has('snare_flash') && hard) pick = ['flash', P.flash, 0.85, ev.has('white_flash') ? 'white_flash' : 'snare_flash'];
    else if (ev.has('collapse') || ev.has('blackout') || (drop >= 0.55)) pick = ['hit', P.hit, 0.9, ev.has('collapse') ? 'collapse' : ev.has('blackout') ? 'blackout' : 'drop'];
    else if (sectionChanged && ctx.sectionType === 'chorus' && energy >= 0.3) pick = ['peak', P.peak, 0.75, 'chorus_entry'];
    else if (ev.has('kick_punch') && hard && now - this.lastPeakAt > 2500) pick = ['hit', P.hit, 0.6, 'kick_punch'];
    else if (energy >= 0.72 && onset >= 0.5 && now - this.lastPeakAt > 6000) pick = ['peak', P.peak, 0.75, 'energy_peak'];
    else if (P.beatHard && hard && ctx.beat && energy >= 0.5) pick = ['beat', P.beatHard, 0.5, 'beat'];
    else if (st === 'candy_pop' && ctx.beat && energy >= 0.35) pick = ['beat', 'bounce', 0.4, 'beat'];
    else if ((kit?.fauna?.length || (kit?.elements || []).some(x => /crow|bird|fauna/.test(x))) && ctx.beat && now - this.lastFaunaAt > 9000) { pick = ['fauna', P.fauna, 0.5, 'fauna']; this.lastFaunaAt = now; }
    else if (preset !== this.lastPreset) pick = ['world', P.world, 0.55, 'world_change'];
    this.lastPreset = preset;

    // per-style limits (STYLE-BIBLE Addendum 4)
    if (pick) {
      let verb = pick[1];
      if (verb === 'startle') {
        // Horror: one startle per SONG (kit.peakScope 'song'); a 2nd (kit.peakMax) only on a climactic hit ≥60s later
        const songCap = Number.isFinite(kit?.peakLimit) ? Math.max(1, kit.peakLimit) : 1;
        const hardCap = Number.isFinite(kit?.peakMax) ? kit.peakMax : 2;
        const climax = pick[2] >= 0.85 && now - (this.lastStartleAt || -1e9) >= 60000;
        const ok = this.startles < songCap || (this.startles < hardCap && climax && (kit?.peakScope === 'song'));
        if (!ok || this.lastStartleSec === this.secIdx) verb = 'freeze';
        else { this.startles++; this.lastStartleSec = this.secIdx; this.lastStartleAt = now; }
      }
      if (st === 'cinematic' && (verb === 'brace' || verb === 'raise_arms') && pick[2] >= 0.85) {
        if (this.mainHits >= (Number.isFinite(kit?.peakLimit) ? kit.peakLimit : (P.mainHitMax || 1))) verb = 'shield_eyes'; else this.mainHits++;
      }
      if (P.danceNeedsSteadyKick && verb === 'dance' && this.kickSteady < 0.45) verb = 'point_up';
      if (P.allowed && !P.allowed.includes(verb)) verb = P.calm;
      pick[1] = verb;
    }

    const busy = this.cur && now < this.cur.until;
    if (pick && (!busy || pick[2] > this.cur.strength + 0.05)) {
      const [kind, verb, strength, why] = pick;
      if (kind === 'peak' || kind === 'hit' || kind === 'fire') this.lastPeakAt = now;
      const tg = pickTarget(kit, kind, preset, P.targets);
      this.cur = { verb, target: tg.target, gazeU: tg.u, gazeV: tg.v, strength, since: now, until: now + (HOLD[verb] || 2000), why, castTrigger: why, castTriggerAt: now };
    } else if (!busy) {
      const tg = pickTarget(kit, 'idle', preset, P.targets);
      const keep = this.cur && this.cur.verb === P.idle;
      this.cur = { verb: P.idle, target: tg.target, gazeU: tg.u, gazeV: tg.v, strength: 0.3, since: keep ? this.cur.since : now, until: now + 500, why: 'idle', castTrigger: keep ? this.cur.castTrigger : 'idle', castTriggerAt: keep ? this.cur.castTriggerAt : now };
    }
    // locomotion only when the lyric leads it (sad / cinematic going/leaving lines)
    // bot 1 P0: never walk. A leaving lyric plays a reaction pose (turn away / look away) in place.
    const leaving = !!(ctx.lyric && LEAVING.test(ctx.lyric));
    if (leaving && !busy && this.cur && !this.cur.verb?.startsWith('turn')) { this.cur.verb = st === 'sad' ? 'look_away' : 'turn'; this.cur.why = 'lyric_leaving'; }
    const locomotion = false;
    const sway = Math.max(0, Math.min(1, ((hard ? 0.35 : 0.2) + energy * 0.5 + (ctx.beat ? 0.15 : 0)) * P.swayMul));
    return { locomotion, walkReason: null, leaving, sway, style: st, ...this.cur };
  }
}

/** Map verb → nearest legacy cast.action so old renderer paths stop walking. */
export function actionForReaction(verb, locomotion = false) {
  if (locomotion) return 'walk';
  switch (verb) {
    case 'look_up': case 'turn': case 'lift_head': case 'point_up': return 'look_up';
    case 'raise_arms': case 'raise_fists': case 'lift_lantern': return 'rise';
    case 'dance': return 'dance';
    case 'bounce': return 'sway';
    case 'headbang': return 'stand';
    case 'brace': case 'step_back': case 'defiant': case 'startle': case 'shield_eyes': return 'stand';
    case 'settle': case 'hold_mug': return 'sway';
    case 'head_low': case 'look_down': case 'gaze_empty': case 'look_away': case 'freeze': case 'still_breath': return 'still';
    default: return 'sway';
  }
}
