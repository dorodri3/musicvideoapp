/**
 * Motif props tied to lyric concepts — plant/reinforce on line advance (RT),
 * amplify on chorus callback. Emit motifProps: [{ id, variant, strength, stage }].
 * Prefer concept.props / worldCue / glueScore from Lyrics Brain scenic handoff.
 * Line→props latency: current-line props lead emission; world family stays sticky.
 * Worlds / Visual Engine draw; Director only emits intents.
 */

/** Concept id → distinct prop ids that belong to the metaphor */
const CONCEPT_PROPS = {
  rain_emotion:      ['umbrella', 'rain_to_stars'],
  lonely_road:       ['highway_lines', 'lantern'],
  night_drive:       ['highway_lines', 'headlights_glow'],
  city_night:        ['neon_sign', 'umbrella'],
  sacred_space:      ['cathedral_window', 'prayer_beads'],
  rising_fire:       ['crown_of_fire', 'ashes'],
  carrying_weight:   ['cracked_stone', 'shadow_burden'],
  running_from_self: ['mirror_shard', 'doppel_trail'],
  falling_apart:     ['fissure', 'ashes', 'ash_aftermath'],
  ocean_depth:       ['lighthouse_beam', 'wave_crest'],
  storm_chaos:       ['tear_in_sky', 'lightning_vein', 'scrap_turret'],
  forest_lost:       ['lantern', 'mist_veil'],
  space_void:        ['tear_in_sky', 'rain_to_stars'],
  heartbreak:        ['cracked_heart', 'tear_in_sky'],
  love_warmth:       ['warm_window', 'lantern'],
  loneliness:        ['empty_chair', 'lantern'],
  nostalgia:         ['faded_photo', 'lantern'],
  betrayal:          ['mask', 'knife_shadow', 'handgun_beat'],
  rebirth:           ['ashes', 'phoenix_feather', 'crown_of_fire'],
  time_clocks:       ['melting_clock', 'hourglass'],
  gold_emptiness:    ['hollow_crown', 'empty_throne'],
  death_void:        ['ashes', 'doorway'],
  freedom_flight:    ['broken_chains', 'wings'],
  war_battle:        ['torn_banner', 'ashes', 'rifle_silhouette', 'scrap_turret'],
  dream_surreal:     ['floating_door', 'rain_to_stars'],
  snow_cold:         ['breath_fog', 'lantern'],
  industrial:        ['sparks', 'gear_silhouette'],
  hope_light:        ['beacon', 'lantern'],
  rage:              ['shockwave', 'tear_in_sky', 'handgun_beat', 'riot_baton'],
  home_leaving:      ['doorway', 'rearview_glow'],
  silence_void:      ['thick_glass', 'mute_halo'],
  candy_joy:         ['warm_window', 'lantern', 'beacon'],
  autumn_leaves:     ['faded_photo', 'lantern'],
  lone_walker:       ['highway_lines', 'lantern'],
  crowd_sea:         ['neon_sign', 'umbrella'],
  meadow_fauna:      ['lantern', 'breath_fog'],
  misty_lake:        ['lighthouse_beam', 'mist_veil'],
  dark_sparse:       ['empty_chair', 'lantern'],
  reality_fracture:  ['fissure', 'tear_in_sky', 'shockwave'],
  spoken_word_bed:   ['thick_glass', 'beacon']
};

/** Symbol string → prop id fallback */
const SYMBOL_PROPS = {
  rain: 'umbrella',
  puddle_reflection: 'rain_to_stars',
  road: 'highway_lines',
  taillight: 'highway_lines',
  headlights: 'headlights_glow',
  windshield_rain: 'umbrella',
  neon: 'neon_sign',
  light_shaft: 'cathedral_window',
  stained_glass: 'cathedral_window',
  fire: 'crown_of_fire',
  embers: 'crown_of_fire',
  ash: 'ashes',
  lightning: 'tear_in_sky',
  torn_sky: 'tear_in_sky',
  stars: 'rain_to_stars',
  phoenix: 'phoenix_feather',
  dawn: 'beacon',
  banner: 'torn_banner',
  shadow_burden: 'shadow_burden',
  cracked_stone: 'cracked_stone',
  mirror: 'mirror_shard',
  doppelganger: 'doppel_trail',
  shatter: 'fissure',
  fissure: 'fissure',
  wave: 'wave_crest',
  depth: 'lighthouse_beam',
  skyline: 'neon_sign',
  tree_silhouette: 'lantern',
  mist: 'mist_veil',
  nebula: 'rain_to_stars',
  cracked_heart: 'cracked_heart',
  empty_bed: 'empty_chair',
  hands: 'warm_window',
  warm_glow: 'warm_window',
  empty_chair: 'empty_chair',
  unanswered_glow: 'lantern',
  faded_photo: 'faded_photo',
  dust_motes: 'lantern',
  mask: 'mask',
  knife_shadow: 'knife_shadow',
  first_light: 'beacon',
  melting_clock: 'melting_clock',
  hourglass: 'hourglass',
  empty_throne: 'empty_throne',
  hollow_gold: 'hollow_crown',
  doorway: 'doorway',
  wings: 'wings',
  chains_break: 'broken_chains',
  wreckage: 'ashes',
  floating_room: 'floating_door',
  door: 'floating_door',
  snowflake: 'breath_fog',
  breath: 'breath_fog',
  sparks: 'sparks',
  gears: 'gear_silhouette',
  beacon: 'beacon',
  candy: 'warm_window',
  smile: 'lantern',
  leaf: 'faded_photo',
  amber: 'lantern',
  shockwave: 'shockwave',
  crack: 'fissure',
  rearview: 'rearview_glow',
  mute: 'mute_halo',
  thick_glass: 'thick_glass',
  lone_silhouette: 'highway_lines',
  single_lamp: 'lantern',
  crowd_faces: 'neon_sign',
  blurred_multitude: 'umbrella',
  meadow: 'lantern',
  fauna: 'breath_fog',
  garden: 'lantern',
  lake: 'lighthouse_beam',
  isolation: 'empty_chair',
  darkness: 'lantern',
  fracture: 'fissure',
  glitch: 'tear_in_sky',
  voice: 'thick_glass',
  horizon: 'beacon'
};

/**
 * Props for a concept (+ optional symbols).
 * @param {object|null} concept
 * @param {string[]} [extraSymbols]
 * @returns {string[]} prop ids
 */
export function propsForConcept(concept, extraSymbols = []) {
  const ids = [];
  const seen = new Set();
  const push = (id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };

  // Prefer scenic props exported by Lyrics Brain (semantic.attachScenicFields)
  if (Array.isArray(concept?.props) && concept.props.length) {
    for (const p of concept.props) push(p);
  } else if (concept?.id && CONCEPT_PROPS[concept.id]) {
    for (const p of CONCEPT_PROPS[concept.id]) push(p);
  }
  const syms = [...(concept?.symbols || concept?.motif || []), ...extraSymbols];
  for (const s of syms) {
    push(SYMBOL_PROPS[s] || null);
  }
  return ids.slice(0, 4);
}

/**
 * Build motifProps payload for a section stage.
 * @param {string[]} propIds
 * @param {object} opts { stage, chorusRepeat, planted }
 * @returns {{ id:string, variant:string, strength:number, stage:string }[]}
 */
export function buildMotifProps(propIds, opts = {}) {
  const {
    stage = 'verse',
    chorusRepeat = 1,
    planted = true
  } = opts;

  if (!propIds?.length || !planted) return [];

  const rep = Math.max(1, chorusRepeat || 1);
  let strength = 0.45;
  let variantSuffix = '';

  if (stage === 'pre') {
    strength = 0.6;
  } else if (stage === 'chorus') {
    if (rep >= 3) {
      variantSuffix = '__peak';
      strength = 1;
    } else if (rep >= 2) {
      variantSuffix = '__amplified';
      strength = 0.85;
    } else {
      variantSuffix = '__amplified';
      strength = 0.7;
    }
  } else if (stage === 'breakdown' || stage === 'drop') {
    strength = 0.35;
    variantSuffix = '__ash';
  } else if (stage === 'outro') {
    strength = 0.55;
    variantSuffix = '__alone';
  } else if (stage === 'intro') {
    strength = 0.25;
  }

  const weaponId = opts.weaponId || null;
  return propIds.slice(0, 3).map((id, idx) => {
    const entry = {
      id,
      variant: variantSuffix ? `${id}${variantSuffix}` : id,
      strength,
      stage
    };
    // Pass through weaponId on first entry when caller earned it
    if (weaponId && idx === 0) entry.weaponId = weaponId;
    if (WEAPON_PROP_IDS.includes(id)) entry.weaponId = id;
    return entry;
  });
}

/**
 * Merge live callback motif into props list (chorus return).
 */
export function mergeCallbackProp(motifProps, motifMeta, stage = 'chorus') {
  if (!motifMeta?.motifId) return motifProps || [];
  const list = [...(motifProps || [])];
  const id = SYMBOL_PROPS[motifMeta.motifId] || motifMeta.motifId;
  const rep = motifMeta.repeat || 1;
  let suffix = '';
  if (rep >= 3) suffix = '__peak';
  else if (rep >= 2 || stage === 'chorus') suffix = '__amplified';
  else if (stage === 'outro') suffix = '__alone';
  // Prefer mapped prop id as variant base (symbol "road" → highway_lines__amplified)
  const rawVar = motifMeta.variant || '';
  const variant = rawVar.includes('__') && !rawVar.startsWith(motifMeta.motifId + '__')
    ? rawVar
    : `${id}${suffix || (rawVar.includes('__') ? rawVar.slice(rawVar.indexOf('__')) : '')}`;
  const existing = list.findIndex((p) => p.id === id || p.id === motifMeta.motifId);
  const entry = {
    id,
    variant: variant || id,
    strength: motifMeta.strength ?? 0.7,
    stage
  };
  if (existing >= 0) list[existing] = entry;
  else list.unshift(entry);
  return list.slice(0, 4);
}


/** Weapon prop ids (scaffolding for Visual) — same ids as castLibrary WEAPON_IDS */
export const WEAPON_PROP_IDS = Object.freeze([
  'none', 'handgun_beat', 'rifle_silhouette', 'burden_suit',
  'scrap_turret', 'ash_aftermath', 'riot_baton', 'scope_flash'
]);

const CONFLICT_FOR_WEAPONS = new Set([
  'war_battle', 'rage', 'betrayal', 'falling_apart', 'storm_chaos',
  'running_from_self', 'death_void', 'rising_fire'
]);

/**
 * Optionally stamp weaponId onto motifProps when lyric/vibe earns conflict.
 * Additive field — Visual may ignore until Movie Research grammar lands.
 */
export function attachWeaponToMotifProps(motifProps, opts = {}) {
  const list = Array.isArray(motifProps) ? motifProps.map(p => ({ ...p })) : [];
  const {
    vibeFamily = 'neutral',
    packFamily = null,
    conceptId = null,
    archetype = null,
    speechLike = false,
    weaponId = null
  } = opts;
  if (speechLike || vibeFamily === 'peaceful' || vibeFamily === 'spoken') {
    return list.map(p => {
      const q = { ...p };
      if (q.weaponId) q.weaponId = null;
      return q;
    });
  }
  const earned = vibeFamily === 'chaotic'
    || /war|chaos/.test(String(packFamily || ''))
    || CONFLICT_FOR_WEAPONS.has(conceptId)
    || archetype === 'chaos_fracture'
    || archetype === 'ash_survivor';
  if (!earned) return list;

  let wid = weaponId;
  if (!wid) {
    const fromProps = list.find(p => WEAPON_PROP_IDS.includes(p.id));
    wid = fromProps?.id || null;
  }
  if (!wid && CONFLICT_FOR_WEAPONS.has(conceptId)) {
    const seed = String(conceptId || 'war');
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    wid = WEAPON_PROP_IDS[h % WEAPON_PROP_IDS.length];
  }
  if (!wid || wid === 'none') {
    return list.map(p => ({ ...p, weaponId: p.weaponId === 'none' ? null : (p.weaponId || null) }));
  }

  // Stamp weaponId on first prop; ensure a weapon glyph prop exists (not sticker spam)
  if (list.length) {
    list[0] = { ...list[0], weaponId: wid };
  }
  if (!list.some(p => p.id === wid || (WEAPON_PROP_IDS.includes(p.id) && p.id !== 'none'))) {
    list.push({
      id: wid,
      variant: wid,
      strength: wid === 'handgun_beat' || wid === 'scope_flash' ? 0.85 : 0.55,
      stage: opts.stage || 'verse',
      weaponId: wid
    });
  }
  return list.slice(0, 4);
}

export { CONCEPT_PROPS, SYMBOL_PROPS };

