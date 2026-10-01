/**
 * Vibe → cast / pack-family helpers (VIBE-TAXONOMY + WAVE vibe-match).
 * Soft-consume audio.vibe when present; safe no-ops if Audio mid-wave.
 *
 * audio.vibe = {
 *   peaceful, calm, chaotic/chaos, scary, tense, warm,
 *   speechLike, nonGroove, aggression/aggressive, ladder, dominant
 * } 0..1 (+ ladder string)
 *
 * Mood ladder (MUSIC-BRIEF): peaceful → warm → tense → aggressive (+ scary|spoken)
 * Worlds pack identity per mood (distinct sets, not neon recolor).
 */

const VIBE_THRESH = 0.42;
const SPEECH_THRESH = 0.45;
/** Ladder step 3 — force aggressive/chaos packs+cast (align Audio _ladderFromVibe) */
const AGGRESSION_THRESH = 0.55;
/** Soft sticky morph / packFamily hold (Worlds repair ≥15s) */
const STICKY_MS = 20000; // HOLD-0306: congruent pack hold ≥20s (pin uses PIN_HOLD_MS)
/** While aggression pin: hard packs latch ≥20s — must not expire into soft (HOLD-0306) */
const PIN_HOLD_MS = 20000;
/** Escape incongruent (soft on harsh) fast — sticky must not trap pastoral */
const ESCAPE_MS = 1200;
/** ONLY these while forbidPastoral / aggressionLock / ladder=aggressive */
const HARD_LOCK_PRESETS = Object.freeze([
  'metal_hall', 'reality_fracture', 'apocalyptic_warzone', 'red_void', 'storm'
]);
/** Soft IDs NEVER emit under hardOnly / martialHeat / latch (HOLD-0321) */
const SOFT_FORBIDDEN_UNDER_HARD = Object.freeze([
  'forest', 'meadow_fauna', 'misty_lake', 'ocean', 'spoken_word_bed',
  'country_porch', 'candy_happy', 'cozy_autumn', 'dream_clouds', 'white_void'
]);

/**
 * Read realtime hit timing from the frame-level alias first, then vibe.
 * Audio may expose the same moment object at either location.
 */
export function readMoment(audio) {
  const moment = audio?.moment || audio?.vibe?.moment;
  return moment && typeof moment === 'object' ? moment : {};
}

/**
 * Soft-read vibe object from audio frame or director opts.
 * @param {object|null} audio
 * @param {object} [opts]
 * @returns {object} vibe axes (zeros if missing)
 */
export function readVibe(audio, opts = {}) {
  const src = opts.vibe || audio?.vibe || null;
  const z = {
    peaceful: 0, calm: 0, chaotic: 0, scary: 0, tense: 0,
    speechLike: 0, nonGroove: 0,
    aggression: 0, warm: 0
  };
  if (!src || typeof src !== 'object') {
    z.aggressive = false;
    z.dominant = null;
    z.ladder = null;
    z.chaos = 0;
    z.aggressionLock = false;
    z.forbidPastoral = false;
    z.martial = false;
    z.orchestralMartial = false;
    z.pinArmed = false;
    z.softClear = false;
    z.hardOnly = false;
    return z;
  }
  for (const k of Object.keys(z)) {
    const v = src[k];
    if (typeof v === 'number' && Number.isFinite(v)) {
      z[k] = Math.max(0, Math.min(1, v));
    }
  }
  // calm aliases peaceful
  if (z.calm > z.peaceful) z.peaceful = z.calm;
  else z.calm = z.peaceful;
  // aggression / chaos aliases
  const agg = typeof src.aggression === 'number' && Number.isFinite(src.aggression)
    ? Math.max(0, Math.min(1, src.aggression))
    : z.aggression;
  z.aggression = agg;
  const chaosAlias = typeof src.chaos === 'number' && Number.isFinite(src.chaos)
    ? Math.max(0, Math.min(1, src.chaos))
    : 0;
  z.chaotic = Math.max(z.chaotic, chaosAlias);
  z.chaos = z.chaotic;
  // Audio pin contract (WAVE aggression-pin): sticky aggressive window
  z.aggressionLock = src.aggressionLock === true || opts.aggressionLock === true;
  z.forbidPastoral = src.forbidPastoral === true || opts.forbidPastoral === true
    || z.aggressionLock;
  // HOLD-0314: consume Audio proof fields (orchestralMartial arms forbidPastoral)
  z.martial = src.martial === true || opts.martial === true;
  z.orchestralMartial = src.orchestralMartial === true || opts.orchestralMartial === true;
  z.pinArmed = src.pinArmed === true || opts.pinArmed === true || z.aggressionLock;
  // HOLD-0338/0346: softClear / softBedGuard from Audio|Scene — clear pin so Worlds never HARD_LOCK
  const hudSoft = !!(src.hardHud?.softClear || src.hardHud?.softBedGuard
    || opts.hardHud?.softClear || opts.hardHud?.softBedGuard);
  z.softBedGuard = src.softBedGuard === true || opts.softBedGuard === true
    || !!src.hardHud?.softBedGuard || !!opts.hardHud?.softBedGuard || hudSoft;
  z.softClear = src.softClear === true || opts.softClear === true
    || (typeof src.softClear === 'number' && src.softClear > 0.5)
    || z.softBedGuard || hudSoft;
  z.hardOnly = src.hardOnly === true || opts.hardOnly === true;
  if (z.softClear || z.softBedGuard) {
    z.aggressionLock = false;
    z.forbidPastoral = false;
    z.pinArmed = false;
    z.martial = false;
    z.orchestralMartial = false;
    z.hardOnly = false;
    z.aggressive = false;
  } else if (z.martial || z.orchestralMartial || z.pinArmed) {
    z.forbidPastoral = true;
  }
  // aggressive boolean only at ladder-3 threshold (do not collapse warm/tense)
  if (!z.softClear) {
    z.aggressive = src.aggressive === true
      || (typeof src.aggressive === 'number' && src.aggressive >= AGGRESSION_THRESH)
      || agg >= AGGRESSION_THRESH
      || z.aggressionLock
      || z.forbidPastoral;
  }
  z.dominant = typeof src.dominant === 'string' ? src.dominant : null;
  z.ladder = typeof src.ladder === 'string' ? src.ladder : null;
  // Pin forces ladder aggressive so Scene/Worlds share one SoT (never under softClear)
  if (!z.softClear && (z.aggressionLock || z.forbidPastoral) && z.ladder !== 'spoken') {
    z.ladder = 'aggressive';
  }
  if (z.softClear && (!z.ladder || z.ladder === 'aggressive' || z.ladder === 'chaotic')) {
    z.ladder = 'peaceful';
  }
  return z;
}

/**
 * Resolve MUSIC-BRIEF ladder rung from live vibe (+ soft fallbacks).
 * @returns {'spoken'|'aggressive'|'scary'|'tense'|'warm'|'peaceful'|'neutral'}
 */
export function resolveLadder(audio, opts = {}) {
  const vibe = readVibe(audio, opts);
  // HOLD-0338: softClear → peaceful (no latch bleed as aggressive)
  if (vibe.softClear) return 'peaceful';
  // Audio aggression pin wins (except spoken which Audio clears before pin)
  if (vibe.aggressionLock || vibe.forbidPastoral) return 'aggressive';
  if (vibe.ladder && typeof vibe.ladder === 'string') {
    const L = String(vibe.ladder).toLowerCase();
    if (L === 'chaos' || L === 'chaotic') return 'aggressive';
    if (L === 'peace' || L === 'calm') return 'peaceful';
    if (['spoken', 'aggressive', 'scary', 'tense', 'warm', 'peaceful'].includes(L)) {
      return L;
    }
  }
  // Derive (mirrors Audio _ladderFromVibe)
  if ((opts.speechLike === true) || vibe.speechLike >= SPEECH_THRESH || vibe.nonGroove >= SPEECH_THRESH) {
    if (vibe.aggression < 0.5) return 'spoken';
  }
  if (vibe.aggression >= AGGRESSION_THRESH
    || (vibe.chaotic >= AGGRESSION_THRESH && vibe.aggression >= 0.4)) {
    return 'aggressive';
  }
  if (vibe.scary >= 0.48 && vibe.scary >= vibe.aggression && vibe.aggression < 0.5) {
    return 'scary';
  }
  if (vibe.tense >= 0.48 && vibe.aggression < 0.5) return 'tense';
  if (vibe.warm >= 0.38 && vibe.aggression < 0.42) return 'warm';
  if (Math.max(vibe.peaceful, vibe.calm) >= VIBE_THRESH && vibe.aggression < 0.4) {
    return 'peaceful';
  }
  // Genre soft nudge
  const g = String(opts.genreFamily || audio?.genreFamily || audio?.genreHint || '').toLowerCase();
  if (/rock_metal|metal|punk|hardcore|noise/.test(g) && vibe.aggression >= 0.35) {
    return 'aggressive';
  }
  if (/folk|ambient|classical/.test(g) && vibe.aggression < 0.35) return 'peaceful';
  if (/hiphop|latin|afro|rnb|pop/.test(g) && vibe.aggression < 0.45) return 'warm';
  return 'neutral';
}

/** True when ladder / aggression / chaos / Audio pin earns aggressive imagery. */
export function isAggressiveVibe(audio, opts = {}) {
  const vibe = readVibe(audio, opts);
  if (vibe.softClear) return false;
  if (vibe.aggressionLock || vibe.forbidPastoral || vibe.martial || vibe.orchestralMartial || vibe.pinArmed) return true;
  const ladder = resolveLadder(audio, opts);
  if (ladder === 'spoken' || ladder === 'peaceful') return false;
  if (ladder === 'aggressive') return true;
  return vibe.aggression >= AGGRESSION_THRESH || vibe.aggressive === true;
}

/**
 * Dominant vibe family for routing (backward-compat families + warm/tense).
 * Prefer vibe.ladder + aggression + chaos/dominant over proxies alone.
 * @returns {{ family, vibe, speechLike, tenseBias, ladder, aggressive, aggression }}
 */
export function dominantVibe(audio, opts = {}) {
  const vibe = readVibe(audio, opts);
  const ladder = resolveLadder(audio, opts);
  const speechLike = ladder === 'spoken'
    || (opts.speechLike === true)
    || vibe.speechLike >= SPEECH_THRESH
    || vibe.nonGroove >= SPEECH_THRESH;

  if (vibe.aggressionLock || vibe.forbidPastoral) {
    /* fall through — pin overrides spoken soft path */
  } else if (speechLike && vibe.aggression < 0.55) {
    return {
      family: 'spoken', vibe, speechLike: true, tenseBias: vibe.tense,
      ladder: 'spoken', aggressive: false, aggression: vibe.aggression,
      aggressionLock: false, forbidPastoral: false
    };
  }

  // Map ladder → family (distinct moods; aggressive uses 'chaotic' for existing cast paths)
  let family;
  switch (ladder) {
    case 'aggressive': family = 'chaotic'; break;
    case 'scary': family = 'scary'; break;
    case 'tense': family = 'tense'; break;
    case 'warm': family = 'warm'; break;
    case 'peaceful': family = 'peaceful'; break;
    case 'spoken': family = 'spoken'; break;
    default: {
      // Soft argmax fallback
      const scores = {
        peaceful: Math.max(vibe.peaceful, vibe.calm),
        chaotic: Math.max(vibe.chaotic, vibe.aggression),
        scary: vibe.scary,
        warm: vibe.warm,
        tense: vibe.tense
      };
      family = 'neutral';
      let best = VIBE_THRESH;
      for (const [k, v] of Object.entries(scores)) {
        if (v > best) { best = v; family = k; }
      }
      if (family === 'chaotic') {
        /* keep */
      }
      break;
    }
  }

  // Audio dominant label can confirm chaos when earned
  const domLabel = vibe.dominant || audio?.vibe?.dominant || null;
  if ((domLabel === 'chaos' || domLabel === 'chaotic') && vibe.aggression >= 0.4) {
    family = 'chaotic';
  }

  // HOLD-0338: softClear (Night Owl) MUST win — never force chaotic/pin from leftover lock
  const softClear = !!vibe.softClear;
  const pin = !softClear && !!(vibe.aggressionLock || vibe.forbidPastoral
    || vibe.martial || vibe.orchestralMartial || vibe.pinArmed);
  if (pin) family = 'chaotic';
  if (softClear && (family === 'chaotic' || family === 'scary')) {
    family = ladder === 'spoken' ? 'spoken' : 'peaceful';
  }
  const aggressive = !softClear && (family === 'chaotic' || ladder === 'aggressive' || pin);
  return {
    family,
    vibe,
    speechLike: softClear ? (ladder === 'spoken' || speechLike) : false,
    tenseBias: vibe.tense,
    ladder: softClear
      ? (ladder === 'aggressive' || ladder === 'neutral' ? (family === 'spoken' ? 'spoken' : 'peaceful') : ladder)
      : (pin ? 'aggressive' : (ladder === 'neutral' ? (family === 'chaotic' ? 'aggressive' : family) : ladder)),
    aggressive,
    aggression: softClear ? Math.min(vibe.aggression || 0, 0.35) : vibe.aggression,
    aggressionLock: softClear ? false : (!!vibe.aggressionLock || !!vibe.pinArmed),
    forbidPastoral: softClear ? false : (!!vibe.forbidPastoral || pin),
    martial: softClear ? false : !!vibe.martial,
    orchestralMartial: softClear ? false : !!vibe.orchestralMartial,
    pinArmed: softClear ? false : (!!vibe.pinArmed || !!vibe.aggressionLock),
    softClear: !!softClear
  };
}

/** Pack family id for ScenePlanner PACK_FAMILIES — distinct per mood */
export function vibePackFamily(dom) {
  if (dom?.softClear) return 'nature';
  const ladder = dom?.ladder || null;
  const fam = dom?.family;
  // Prefer ladder when present
  switch (ladder || fam) {
    case 'peaceful': return 'nature';
    case 'warm': return 'groove';
    case 'tense': return 'tense';
    case 'aggressive':
    case 'chaotic': return 'chaos';
    case 'scary': return 'scary';
    case 'spoken': return 'spoken';
    default:
      switch (fam) {
        case 'peaceful': return 'nature';
        case 'warm': return 'groove';
        case 'tense': return 'tense';
        case 'chaotic': return 'chaos';
        case 'scary': return 'scary';
        case 'spoken': return 'spoken';
        default: return null;
      }
  }
}



/** Hard-lock allowlist (HOLD QA-0306). warzone → apocalyptic_warzone. */
export function hardLockPresets() {
  return HARD_LOCK_PRESETS.slice();
}

export function isHardLockPreset(id) {
  return HARD_LOCK_PRESETS.includes(id);
}

/** Pack leads from Audio vibe.ladder (distinct LOOK per mood). Pair IDs with Scene. */
export function ladderLeadPresets(ladder) {
  switch (String(ladder || '').toLowerCase()) {
    case 'peaceful':
      return ['meadow_fauna', 'misty_lake', 'forest', 'country_porch', 'dream_clouds'];
    case 'warm':
      // Groove — NOT warzone
      return ['rainy_city', 'hiphop_block', 'latin_night', 'empty_highway', 'cozy_autumn'];
    case 'tense':
      return ['industrial_tunnel', 'endless_staircase', 'ancient_ruins', 'storm'];
    case 'aggressive':
      return hardLockPresets(); // HOLD-0306: no desert/tunnel copper drift
    case 'scary':
      return ['dark_sparse', 'white_void', 'endless_staircase', 'ancient_ruins'];
    case 'spoken':
      return ['spoken_word_bed', 'soul_room', 'white_void', 'misty_lake'];
    default:
      return [];
  }
}

/**
 * Lead presets — Worlds mood pack IDs (distinct sets).
 * peace / warm-groove / tense / aggressive / scary / spoken
 */
export function vibeLeadPresets(dom) {
  const fromLadder = ladderLeadPresets(dom?.ladder);
  if (fromLadder.length) return fromLadder;
  const key = dom?.ladder || dom?.family || 'neutral';
  switch (key) {
    case 'peaceful':
      return ['meadow_fauna', 'misty_lake', 'forest', 'country_porch', 'dream_clouds'];
    case 'warm':
    case 'groove':
      // Night street / warm rain — body pocket, NOT warzone
      return ['rainy_city', 'hiphop_block', 'latin_night', 'empty_highway', 'cozy_autumn'];
    case 'tense':
      // Storm edge / cold ruins / industrial — braced, not full warzone spam
      return ['industrial_tunnel', 'endless_staircase', 'ancient_ruins', 'storm'];
    case 'aggressive':
    case 'chaotic':
      return hardLockPresets();
    case 'scary':
      return ['dark_sparse', 'white_void', 'endless_staircase', 'ancient_ruins'];
    case 'spoken':
      return ['spoken_word_bed', 'soul_room', 'white_void', 'misty_lake'];
    default:
      return [];
  }
}

/** Soft genre-family bias; vibe congruence always filters the result. */
export function genreLeadPresets(hint) {
  switch (String(hint || 'unknown').toLowerCase()) {
    case 'classical': return ['orchestral_hall', 'cathedral_space', 'space', 'dream_clouds'];
    case 'jazz': return ['jazz_club', 'soul_room', 'rainy_city', 'cathedral_space'];
    case 'metal':
    case 'rock':
    case 'rock_metal':
    case 'punk':
    case 'noise':
      return ['metal_hall', 'apocalyptic_warzone', 'reality_fracture', 'storm', 'industrial_tunnel', 'red_void', 'burning_desert'];
    case 'ambient': return ['ambient_field', 'white_void', 'dream_clouds', 'spoken_word_bed'];
    case 'hiphop': return ['hiphop_block', 'rainy_city', 'industrial_tunnel'];
    case 'folk': return ['country_porch', 'meadow_fauna', 'forest', 'empty_highway', 'misty_lake'];
    case 'edm': return ['club_floor', 'led_wall', 'futuristic_city'];
    case 'spoken': return ['spoken_word_bed', 'white_void', 'soul_room'];
    case 'latin':
    case 'afro': return ['latin_night', 'ocean', 'rainy_city', 'hiphop_block'];
    case 'experimental': return ['reality_fracture', 'red_void', 'industrial_tunnel', 'ambient_field'];
    default: return [];
  }
}

/**
 * Presets incongruent as lead/bed for a vibe family / ladder.
 * Keep in vibe layer so pre-plan and live repair share one rule.
 */
export function vibeForbiddenPresets(dom) {
  const softPastoral = [
    'meadow_fauna', 'candy_happy', 'cozy_autumn', 'country_porch',
    'misty_lake', 'gospel_light', 'ambient_field', 'spoken_word_bed',
    'dream_clouds', 'forest', 'ocean', 'soul_room',
    // HOLD-0314 pale/water beds that still read soft on Clash
    'white_void', 'snow', 'rainy_city', 'empty_highway',
    // HOLD-0321 nuclear absolutes — impossible under hardOnly
    'moss_trail', 'meadow'
  ];
  const warChaos = [
    'apocalyptic_warzone', 'reality_fracture', 'red_void', 'metal_hall',
    'burning_desert'
  ];
  const neonHub = ['neon_highway', 'led_wall', 'futuristic_city', 'stage_pop', 'club_floor'];
  // Audio pin / forbidPastoral / martial → same refuse list as aggressive (HOLD-0255/0321)
  let key = dom?.ladder || dom?.family || 'neutral';
  // HOLD-0338/0346: softClear OR softBedGuard NEVER takes aggressive forbid (refuse HARD_LOCK)
  if (dom?.softClear || dom?.softBedGuard || dom?.hardHud?.softClear || dom?.hardHud?.softBedGuard) {
    key = 'peaceful';
  } else if (dom?.forbidPastoral || dom?.aggressionLock || dom?.aggressive
    || dom?.martial || dom?.orchestralMartial || dom?.pinArmed
    || dom?.hardOnly || dom?.hardLock || dom?.nuclearHard) {
    key = 'aggressive';
  }
  switch (key) {
    case 'peaceful':
      return [
        'neon_highway', 'empty_highway', 'futuristic_city', 'led_wall',
        ...warChaos, 'industrial_tunnel', 'club_floor', 'stage_pop', 'hiphop_block'
      ];
    case 'warm':
      // Warm groove: rainy city OK; ban warzone + soft meadow default
      return [
        ...warChaos, 'meadow_fauna', 'gospel_light', 'country_porch',
        'neon_highway', 'led_wall', 'candy_happy'
      ];
    case 'tense':
      // Industrial/ruins — not meadow, not candy, not neon hub party
      return [
        'meadow_fauna', 'candy_happy', 'cozy_autumn', 'country_porch',
        'gospel_light', 'neon_highway', 'led_wall', 'stage_pop', 'club_floor',
        'soul_room', 'spoken_word_bed', 'dream_clouds'
      ];
    case 'spoken':
      return [
        'neon_highway', 'futuristic_city', 'led_wall', ...warChaos,
        'industrial_tunnel', 'club_floor', 'stage_pop', 'candy_happy'
      ];
    case 'scary':
      return ['meadow_fauna', 'candy_happy', 'neon_highway', 'stage_pop', 'club_floor', 'gospel_light', 'latin_night'];
    case 'aggressive':
    case 'chaotic':
      // HOLD-0306: soft/copper/pastoral-adjacent ALL refuse — only HARD_LOCK_PRESETS allowed.
      return [
        ...neonHub, 'rainy_city',
        ...softPastoral, 'stage_pop', 'hiphop_block', 'latin_night', 'country_porch',
        'industrial_tunnel', 'burning_desert', 'ancient_ruins', 'white_void', 'dark_sparse',
        'endless_staircase', 'empty_highway', 'jazz_club', 'orchestral_hall', 'cathedral_space',
        'space', 'snow', 'cozy_autumn', 'soul_room', 'ambient_field', 'club_floor',
        'futuristic_city', 'led_wall', 'gospel_light', 'ocean', 'forest', 'meadow_fauna'
      ];
    default:
      return [];
  }
}

/**
 * Soft presets incongruent for a genre hint (metal never meadow/neon; folk never warzone).
 */
export function genreForbiddenPresets(hint) {
  const softNeon = [
    'neon_highway', 'led_wall', 'rainy_city', 'futuristic_city',
    'meadow_fauna', 'candy_happy', 'cozy_autumn', 'soul_room', 'country_porch',
    'misty_lake', 'gospel_light', 'stage_pop', 'ambient_field', 'spoken_word_bed',
    'dream_clouds', 'forest', 'ocean', 'latin_night'
  ];
  const warChaos = [
    'apocalyptic_warzone', 'reality_fracture', 'red_void', 'metal_hall',
    'industrial_tunnel', 'burning_desert'
  ];
  switch (String(hint || 'unknown').toLowerCase()) {
    case 'metal':
    case 'rock':
    case 'rock_metal':
    case 'punk':
    case 'noise':
    case 'experimental':
      return softNeon;
    case 'folk':
    case 'ambient':
    case 'spoken':
    case 'classical':
    case 'jazz':
      return warChaos;
    default:
      return [];
  }
}

/**
 * Apply vibe HOW-modulation onto a post-section cast.
 * Distinct actions per mood (peaceful ≠ tense ≠ aggressive ≠ scary).
 */
export function applyVibeToCast(cast, dom, opts = {}) {
  if (!cast) return cast;
  const family = dom?.family || 'neutral';
  const ladder = dom?.ladder || family;
  const speechLike = !!dom?.speechLike;
  const sectionType = opts.sectionType || 'verse';
  const moment = opts.moment && typeof opts.moment === 'object' ? opts.moment : {};
  const out = { ...cast };

  out.vibeBias = family;
  out.ladder = ladder;
  out.speechLike = speechLike;

  // HOLD-0306: pin skips spoken early-return → fall through to chaotic/aggressive
  // HOLD-0338: softClear refuses pinHard (Night Owl never chaotic cast)
  // HOLD-0346: softBedGuard / Scene hardHud soft also refuse pinHard
  const softClearCast = !!(dom?.softClear || opts.softClear || dom?.vibe?.softClear
    || dom?.softBedGuard || opts.softBedGuard || dom?.hardHud?.softClear || dom?.hardHud?.softBedGuard);
  const pinHard = !softClearCast && !!(dom?.forbidPastoral || dom?.aggressionLock
    || opts.forbidPastoral || opts.aggressionLock
    || opts.hardOnly || opts.hardLock || dom?.hardOnly || dom?.hardLock || dom?.nuclearHard
    || dom?.martial || dom?.orchestralMartial || dom?.pinArmed
    || (opts.moment && (opts.moment.forbidPastoral || opts.moment.aggressionLock
      || opts.moment.martial || opts.moment.orchestralMartial || opts.moment.pinArmed))
    || ladder === 'aggressive' || family === 'chaotic');
  if (pinHard) {
    out.speechLike = false;
    out.vibeBias = 'chaotic';
    out.ladder = 'aggressive';
  }

  if (!pinHard && (speechLike || family === 'spoken' || ladder === 'spoken')) {
    if (out.kind === 'crowd_ghosts' || out.kind === 'congregation' || out.kind === 'beast') {
      out.kind = 'figure_lone';
    }
    if (out.kind === 'duo') out.kind = 'figure_lone';
    out.count = out.kind === 'none' ? 0 : 1;
    out.placement = out.placement === 'sky' ? 'mid' : 'foreground';
    out.opacity = Math.min(out.opacity ?? 0.7, 0.55);
    out.scale = 'intimate';
    if (out.action === 'flee' || out.action === 'run' || out.action === 'rise') {
      out.action = 'stand';
    }
    out.holdSilent = true;
    out.suppressDropCast = true;
    out.suppressChorusWiden = true;
    return out;
  }

  if (!pinHard && (family === 'peaceful' || ladder === 'peaceful')) {
    const calmKinds = new Set(['traveler', 'figure_lone', 'silhouette', 'none', 'duo']);
    if (out.kind === 'beast' || out.kind === 'crowd_ghosts') out.kind = 'traveler';
    if (out.kind === 'congregation') {
      out.kind = 'figure_lone';
      out.count = 1;
    }
    if (!calmKinds.has(out.kind)) out.kind = 'figure_lone';
    out.count = Math.min(out.count || 1, 1);
    if (out.action === 'flee' || out.action === 'run') out.action = 'walk';
    if (out.action === 'rise' && sectionType !== 'chorus') out.action = 'look_up';
    if (!['stand', 'walk', 'look_up', 'kneel'].includes(out.action)) out.action = 'stand';
    out.placement = 'mid';
    out.opacity = Math.min(out.opacity ?? 0.7, 0.6);
    if (out.scale === 'epic' || out.scale === 'cosmic') out.scale = 'cinematic';
    out.aggressionExpire = true;
    return out;
  }

  if (family === 'warm' || ladder === 'warm') {
    // Groove body — walker/performer, not fracture swarm, not pastoral fauna
    if (out.kind === 'beast' || out.kind === 'none') out.kind = 'traveler';
    if (out.kind === 'fauna') out.kind = 'traveler';
    out.count = Math.min(Math.max(out.count || 1, 1), sectionType === 'chorus' ? 3 : 1);
    if (out.action === 'flee' || out.action === 'kneel') out.action = 'walk';
    if (out.action === 'stand' && (sectionType === 'chorus' || sectionType === 'drop')) {
      out.action = 'run'; // light travel staging
    }
    out.placement = 'foreground';
    out.opacity = Math.min(1, Math.max(out.opacity ?? 0.7, 0.75));
    out.travelStaging = sectionType === 'chorus' || sectionType === 'drop';
    return out;
  }

  if (family === 'tense' || ladder === 'tense') {
    // Braced single / duo — walk faster, not flee-swarm chaos
    if (out.kind === 'beast' || out.kind === 'crowd_ghosts' || out.kind === 'congregation') {
      out.kind = 'silhouette';
      out.count = 1;
    }
    if (out.kind === 'none') out.kind = 'silhouette';
    out.count = Math.min(out.count || 1, sectionType === 'chorus' ? 2 : 1);
    if (out.action === 'flee') out.action = 'walk';
    if (out.action === 'stand' || out.action === 'kneel') out.action = 'walk';
    out.placement = 'foreground';
    out.opacity = Math.min(1, Math.max(out.opacity ?? 0.7, 0.8));
    return out;
  }

  if (family === 'chaotic' || ladder === 'aggressive') {
    // Realtime moment wins over the slower frame energy for hit timing.
    const energy = typeof moment.energy === 'number' ? moment.energy
      : (typeof opts.energy === 'number' ? opts.energy : 0);
    const pin = !!(dom?.forbidPastoral || dom?.aggressionLock
      || moment.forbidPastoral || moment.aggressionLock);
    const momentHit = pin && (moment.drop >= 0.55 || moment.onsetFast >= 0.55);
    const hiEnergy = energy >= 0.55 || momentHit || (opts.intensify || 0) > 0.35;
    if (out.kind === 'none') out.kind = 'traveler'; // travel staging default
    if (out.kind === 'figure_lone' || out.kind === 'traveler') {
      if (hiEnergy || sectionType === 'drop' || sectionType === 'breakdown' || sectionType === 'chorus') {
        // Chorus/drop widen; verse may keep traveler path-runner
        if (sectionType === 'verse' || sectionType === 'pre') {
          out.kind = 'traveler';
          out.count = Math.max(out.count || 1, 1);
        } else {
          out.kind = opts.allowBeast && out.kind === 'beast' ? 'beast' : 'crowd_ghosts';
          out.count = Math.max(out.count || 1, 3);
        }
      }
    }
    if (out.kind === 'silhouette') out.count = Math.max(out.count || 1, 2);
    if (out.kind === 'crowd_ghosts') out.count = Math.max(3, Math.min(7, out.count || 4));
    // Earned spin / run travel when aggression+energy high — not every bar thrash
    if (out.action === 'stand' || out.action === 'kneel' || out.action === 'walk') {
      if (hiEnergy && (sectionType === 'chorus' || sectionType === 'drop' || sectionType === 'breakdown')) {
        out.action = 'spin';
      } else if (hiEnergy) {
        out.action = 'run';
      } else if (sectionType === 'drop' || sectionType === 'breakdown') {
        out.action = 'flee';
      } else {
        out.action = 'rise';
      }
    }
    if (out.placement === 'sky' && !hiEnergy) out.placement = 'mid';
    else if (out.placement !== 'foreground') out.placement = hiEnergy ? 'foreground' : 'mid';
    out.opacity = Math.min(1, Math.max(out.opacity ?? 0.7, 0.75));
    out.travelStaging = true;
    return out;
  }

  if (family === 'scary' || ladder === 'scary') {
    if (out.kind === 'beast' || out.kind === 'crowd_ghosts' || out.kind === 'congregation' || out.kind === 'duo') {
      out.kind = 'silhouette';
    }
    if (out.kind !== 'none') out.kind = out.kind === 'traveler' ? 'traveler' : 'silhouette';
    out.count = out.kind === 'none' ? 0 : 1;
    out.action = (out.action === 'flee' || out.action === 'run' || out.action === 'rise')
      ? 'kneel'
      : (out.action === 'walk' ? 'stand' : (out.action || 'stand'));
    if (!['kneel', 'stand'].includes(out.action)) out.action = 'stand';
    if (out.placement === 'sky') out.placement = 'mid';
    else if (out.placement !== 'foreground') out.placement = 'mid';
    out.opacity = Math.min(out.opacity ?? 0.7, 0.4);
    out.scale = 'intimate';
    out.suppressChorusWiden = true;
    return out;
  }

  return out;
}

/**
 * Heuristic non-groove from roles when vibe missing (soft fallback).
 */
export function inferSpeechLikeFromRoles(audio) {
  if (!audio) return false;
  const r = audio.roles || audio.instruments || {};
  const vocalish = r.vocalish ?? r.lead ?? 0;
  const groove = (r.kick || 0) * 0.55 + (r.bass || 0) * 0.45;
  const kickSnare = (r.kick || 0) + (r.snare || 0);
  return vocalish > 0.45 && groove < 0.28 && kickSnare < 0.45;
}

/** Did ladder step change enough to earn a world jump? */
export function ladderStepChanged(prev, next) {
  if (!prev || !next) return !!next;
  if (prev === next) return false;
  // Adjacent warm↔tense is a soft step — still a change but caller may morph not cut
  return true;
}

export function softForbiddenUnderHard() {
  return SOFT_FORBIDDEN_UNDER_HARD.slice();
}

export function isSoftForbiddenUnderHard(id) {
  return SOFT_FORBIDDEN_UNDER_HARD.includes(String(id || '').toLowerCase());
}

export { VIBE_THRESH, SPEECH_THRESH, AGGRESSION_THRESH, STICKY_MS, PIN_HOLD_MS, ESCAPE_MS, HARD_LOCK_PRESETS, SOFT_FORBIDDEN_UNDER_HARD };

