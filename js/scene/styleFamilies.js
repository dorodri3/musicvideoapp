/**
 * STYLE FAMILIES (CEO rule 1, Nov 24 2026): ONE visual style per video.
 * Scene locks one family per track at show start (a chip tap replaces it for the
 * rest of the track). Worlds may change only INSIDE the locked family, so every
 * plate in a family shares a render mode, palette and grade.
 *
 * render: 'painted' = members with an art plate (assets/worlds/<id>/bg.jpg) lead;
 *         procedural members only fill in when the family has no plate for a moment.
 * grade:  one look for Visual for the whole track (key/shadow/rim/mist rgb + vignette).
 * peak:   in-family members to use at drops / hard peaks INSTEAD of leaving the style.
 * calm:   in-family members for intros, breakdowns, outros.
 */
export const STYLE_FAMILIES = Object.freeze({
  horror: {
    label: 'Horror', render: 'painted',
    members: ['dark_sparse', 'storm', 'misty_lake', 'endless_staircase', 'ancient_ruins', 'industrial_tunnel'],
    peak: ['storm', 'dark_sparse'], calm: ['dark_sparse', 'misty_lake'],
    grade: { key: '170,190,225', shadow: '4,6,12', rim: '190,210,255', mist: '150,165,195', vignette: 0.55 }
  },
  sad: {
    label: 'Sad', render: 'mixed',
    // Darrell Nov 24: misty_lake/forest read peaceful+cozy -> out. Sad = hollow, something missing.
    members: ['rainy_city', 'dark_sparse', 'snow', 'ocean'],
    peak: ['rainy_city', 'dark_sparse'], calm: ['dark_sparse', 'snow', 'ocean'],
    // world-pin (bot 1 mood2 P1): ONE location per song = rainy city; vary camera/light only.
    // dark_sparse plate is a dead-tree forest (breaks the sad never-list: forest).
    pin: ['rainy_city'],
    grade: { key: '178,186,198', shadow: '22,25,32', rim: '196,204,216', mist: '192,198,206', vignette: 0.3, desat: 0.62 }
  },
  cinematic: {
    label: 'Cinematic', render: 'painted',
    members: ['cathedral_space', 'space', 'storm', 'misty_lake', 'dream_clouds'],
    peak: ['storm', 'space', 'cathedral_space'], calm: ['misty_lake', 'dream_clouds'],
    grade: { key: '255,190,120', shadow: '10,40,50', rim: '255,200,140', mist: '170,200,210', vignette: 0.35 }
  },
  cozy: {
    label: 'Cozy', render: 'mixed', // Darrell Nov 24 mood table: warm, safe, intimate
    // QA-20261125-0335 #2: forest/deer/lake read "lonely wilderness" -> cozy is porch/interior ONLY.
    // GAP: no painted porch/interior plate yet (Visual) — country_porch is procedural.
    members: ['country_porch', 'cozy_autumn'],
    pin: ['country_porch'],
    peak: ['country_porch'], calm: ['country_porch', 'cozy_autumn'],
    grade: { key: '255,200,140', shadow: '40,28,20', rim: '255,180,110', mist: '255,225,190', vignette: 0.32 }
  },
  golden_pastoral: {
    label: 'Golden pastoral', render: 'painted',
    members: ['meadow_fauna', 'forest', 'misty_lake', 'cozy_autumn', 'country_porch', 'snow', 'ocean'],
    peak: ['forest', 'ocean', 'snow'], calm: ['misty_lake', 'meadow_fauna', 'cozy_autumn'],
    grade: { key: '255,214,150', shadow: '34,40,28', rim: '255,200,120', mist: '255,236,200', vignette: 0.28 }
  },
  ethereal_sky: {
    label: 'Ethereal sky', render: 'painted',
    members: ['dream_clouds', 'space', 'cathedral_space', 'white_void', 'gospel_light', 'orchestral_hall', 'ambient_field', 'spoken_word_bed'],
    peak: ['cathedral_space', 'space', 'gospel_light'], calm: ['dream_clouds', 'ambient_field', 'spoken_word_bed'],
    grade: { key: '255,232,246', shadow: '40,44,72', rim: '255,215,240', mist: '235,225,255', vignette: 0.2 }
  },
  city_night: {
    label: 'City night', render: 'mixed', // GAP: only rainy_city is painted; Visual grade must unify procedural members
    members: ['rainy_city', 'neon_highway', 'empty_highway', 'futuristic_city', 'club_floor', 'led_wall', 'hiphop_block', 'soul_room', 'jazz_club', 'latin_night'],
    peak: ['club_floor', 'led_wall', 'futuristic_city', 'neon_highway'], calm: ['rainy_city', 'empty_highway', 'soul_room'],
    grade: { key: '255,110,200', shadow: '8,10,24', rim: '120,220,255', mist: '255,170,230', vignette: 0.38 }
  },
  ember_wasteland: {
    label: 'Heavy / evil', render: 'painted',
    // Contains the full HARD_LOCK allowlist — hardOnly never has to leave this style.
    members: ['apocalyptic_warzone', 'metal_hall', 'red_void', 'storm', 'reality_fracture', 'burning_desert', 'industrial_tunnel'],
    peak: ['apocalyptic_warzone', 'reality_fracture', 'metal_hall', 'red_void'], calm: ['storm', 'industrial_tunnel', 'burning_desert'],
    grade: { key: '255,140,60', shadow: '18,10,10', rim: '255,80,50', mist: '120,80,70', vignette: 0.42 }
  },
  cold_dread: {
    label: 'Cold dread', render: 'painted',
    members: ['dark_sparse', 'storm', 'endless_staircase', 'ancient_ruins', 'industrial_tunnel', 'misty_lake', 'snow'],
    peak: ['storm', 'industrial_tunnel', 'ancient_ruins'], calm: ['dark_sparse', 'misty_lake', 'endless_staircase'],
    grade: { key: '190,205,235', shadow: '8,10,16', rim: '200,215,255', mist: '180,190,215', vignette: 0.45 }
  },
  candy_pop: {
    label: 'Happy pop', render: 'mixed', // Visual family grade unifies procedural + dream_clouds plate
    members: ['candy_happy', 'stage_pop', 'dream_clouds', 'futuristic_city', 'ocean'],
    peak: ['stage_pop', 'candy_happy'], calm: ['dream_clouds', 'ocean'],
    // world-pin (bot 1 mood2 P0): clouds / floating islands for the WHOLE song, loud parts too.
    // ocean fell back to the stormy-sea storm plate on loud sections; never again.
    pin: ['dream_clouds'],
    grade: { key: '255,170,220', shadow: '60,30,80', rim: '255,240,120', mist: '255,215,240', vignette: 0.16 }
  }
});

/** Each preset's HOME family (the one style it best embodies). */
const HOME = {
  meadow_fauna: 'golden_pastoral', forest: 'golden_pastoral', cozy_autumn: 'golden_pastoral',
  country_porch: 'golden_pastoral', ocean: 'golden_pastoral', snow: 'golden_pastoral',
  misty_lake: 'golden_pastoral',
  dream_clouds: 'ethereal_sky', space: 'ethereal_sky', cathedral_space: 'ethereal_sky',
  white_void: 'ethereal_sky', gospel_light: 'ethereal_sky', orchestral_hall: 'ethereal_sky',
  ambient_field: 'ethereal_sky', spoken_word_bed: 'ethereal_sky',
  rainy_city: 'city_night', neon_highway: 'city_night', empty_highway: 'city_night',
  futuristic_city: 'city_night', club_floor: 'city_night', led_wall: 'city_night',
  hiphop_block: 'city_night', soul_room: 'city_night', jazz_club: 'city_night', latin_night: 'city_night',
  apocalyptic_warzone: 'ember_wasteland', metal_hall: 'ember_wasteland', red_void: 'ember_wasteland',
  storm: 'ember_wasteland', reality_fracture: 'ember_wasteland', burning_desert: 'ember_wasteland',
  industrial_tunnel: 'cold_dread', dark_sparse: 'cold_dread', endless_staircase: 'cold_dread',
  ancient_ruins: 'cold_dread',
  candy_happy: 'candy_pop', stage_pop: 'candy_pop'
};

/** Scene genreFamily / vibe family / packFamily → default style for the track. */
const PICK = {
  nature: 'golden_pastoral', folk_pastoral: 'golden_pastoral', country_road: 'golden_pastoral', autumn: 'golden_pastoral', peaceful: 'golden_pastoral',
  sacred: 'ethereal_sky', sacred_hall: 'ethereal_sky', sacred_bright: 'ethereal_sky', orchestral_hall: 'ethereal_sky', gospel_light: 'ethereal_sky',
  void_dream: 'ethereal_sky', ambient_void: 'ethereal_sky', spoken: 'ethereal_sky', dream_clouds: 'ethereal_sky',
  club: 'city_night', club_floor: 'city_night', neon: 'city_night', groove: 'city_night', street_block: 'city_night',
  hiphop_block: 'city_night', jazz: 'city_night', jazz_club: 'city_night', intimate: 'city_night', soul_room: 'city_night',
  warm_night: 'city_night', latin_night: 'city_night',
  chaos: 'ember_wasteland', chaotic: 'ember_wasteland', warzone: 'ember_wasteland', metal_hall: 'ember_wasteland',
  industrial: 'ember_wasteland', aggressive: 'ember_wasteland',
  scary: 'cold_dread', tense: 'cold_dread', voidish: 'cold_dread', weather: 'cold_dread',
  candy: 'candy_pop', stage_pop: 'candy_pop', pop: 'candy_pop', kpop: 'candy_pop', dance_pop: 'candy_pop', happy: 'candy_pop',
  rock_metal: 'ember_wasteland', metal: 'ember_wasteland', metal_industrial: 'ember_wasteland', hard_rock: 'ember_wasteland',
  punk: 'ember_wasteland', heavy: 'ember_wasteland', experimental: 'ember_wasteland', ballad: 'sad', melancholic: 'sad', sorrow: 'sad',
  soundtrack: 'cinematic', classical: 'cinematic', epic_score: 'cinematic', indie: 'cinematic',
  edm: 'city_night', hiphop: 'city_night', rnb: 'city_night', latin: 'city_night', afro: 'city_night',
  folk: 'golden_pastoral', ambient: 'ethereal_sky', gospel: 'ethereal_sky',
  // UI chips (single-select) → style family
  horror: 'horror', sad: 'sad', melancholy: 'sad', cinematic: 'cinematic', epic: 'ember_wasteland',
  dreamlike: 'ethereal_sky', 'sci-fi': 'city_night', mythological: 'ethereal_sky', realistic: 'golden_pastoral'
};

/** Chips that have a fully built family; hide any other chip until it is built. */
/** Painted art plates (assets/worlds/<id>/bg.jpg). Painted families draw ONLY these, so a
 *  track never cuts between a painting and a procedural canvas (that cut is a style change). */
export const PAINTED = Object.freeze(['meadow_fauna', 'misty_lake', 'forest', 'dream_clouds', 'space', 'rainy_city',
  'apocalyptic_warzone', 'metal_hall', 'storm', 'red_void', 'dark_sparse', 'cathedral_space']);
export function paintedInStyle(id) { return presetsInStyle(id).filter(p => PAINTED.includes(p)); }
/** Usable worlds for a locked style: painted-only when the family has >=3 plates. */
/** World-pin wins: a pinned family shows exactly that location for the whole song. */
export function lockedWorlds(id) { const pin = STYLE_FAMILIES[id]?.pin; if (pin && pin.length) return pin.slice(); const p = paintedInStyle(id); return p.length >= 3 ? p : presetsInStyle(id); }
export function pinnedWorld(id) { return STYLE_FAMILIES[id]?.pin?.[0] || null; }
/** Chips with a fully built family (>=3 painted plates, one grade). Sad + Sci-Fi wait on new plates. */
/** bot 1 live picker (Nov 24): Auto + Cinematic + Horror + Sad, single-select. Auto = no chip. */
export const READY_CHIPS = Object.freeze(['auto', 'cinematic', 'horror', 'sad']);
export const PENDING_CHIPS = Object.freeze({ dreamlike: 'needs kit sign-off', epic: 'needs kit sign-off', realistic: 'needs kit sign-off', 'sci-fi': 'needs 2+ painted city plates', surreal: 'no family', mythological: 'no family', abstract: 'no family' });
export function styleForChip(chip) { return PICK[chip] && STYLE_FAMILIES[PICK[chip]] ? PICK[chip] : null; }

export const DEFAULT_STYLE = 'ethereal_sky';
export function styleFamilyIds() { return Object.keys(STYLE_FAMILIES); }
export function getStyleFamily(id) { return STYLE_FAMILIES[id] || null; }
export function styleFamilyOf(preset) { return HOME[preset] || null; }
export function presetsInStyle(id) { return (STYLE_FAMILIES[id]?.members || []).slice(); }
export function isPresetInStyle(preset, id) { return !!STYLE_FAMILIES[id]?.members.includes(preset); }
export function styleGrade(id) { return STYLE_FAMILIES[id]?.grade || STYLE_FAMILIES[DEFAULT_STYLE].grade; }
export function peakPresetsInStyle(id) { return (STYLE_FAMILIES[id]?.peak || []).slice(); }
export function calmPresetsInStyle(id) { return (STYLE_FAMILIES[id]?.calm || []).slice(); }

/** The ONLY five finished styles Auto may land in (bot 1 / Works Tester, Nov 24). */
export const FIVE_STYLES = Object.freeze(['candy_pop', 'ember_wasteland', 'sad', 'horror', 'cinematic']);
/** bot 1 FINAL 10:01 PM: Cozy IS a locked 6th Auto style (single picker owns it); off chips until sign-off. */
export const AUTO_STYLES = Object.freeze([...FIVE_STYLES, 'cozy']);
export const STYLE_VARIANTS = Object.freeze(['cozy']);
export const STYLE_NAMES = Object.freeze({ candy_pop: 'happy_pop', ember_wasteland: 'heavy_evil', sad: 'sad', horror: 'horror', cinematic: 'cinematic', cozy: 'cozy' });
/** Leftover families collapse into one of the five (never emitted as a lock). */
const COLLAPSE = { golden_pastoral: 'cozy', ethereal_sky: 'cinematic', city_night: 'sad', cold_dread: 'horror' };
/** Genre/vibe overrides that beat the family collapse (rooms with no kit of their own). */
const AUTO5 = {
  edm: 'candy_pop', club: 'candy_pop', club_floor: 'candy_pop', latin: 'candy_pop', afro: 'candy_pop', warm_night: 'candy_pop', latin_night: 'candy_pop',
  hardcore: 'ember_wasteland', hard_rock: 'ember_wasteland', metal_industrial: 'ember_wasteland', chaotic: 'ember_wasteland', aggressive: 'ember_wasteland',
  jazz: 'sad', soul_room: 'cozy', intimate: 'cozy', warm: 'cozy', cozy: 'cozy', country: 'cozy', country_road: 'cozy', lofi: 'sad', chillhop: 'sad', ballad: 'sad', spoken: 'sad',
  scary: 'horror', tense: 'horror'
};
function toFive(id, key) {
  if (key && AUTO5[key]) return AUTO5[key];
  if (AUTO_STYLES.includes(id)) return id;
  return COLLAPSE[id] || 'cinematic';
}

/** Pick the ONE style for a track. Always returns one of FIVE_STYLES.
 *  chip > hardOnly > genreFamily > vibeFamily > packFamily > first preset's home. */
const SPLIT_GENRES = /^(hiphop|hiphop_block|street_block|rap|trap|drill|rnb|r&b|latin|latin_night|afro|jazz|jazz_club|soul_room|funk)$/;
const BRIGHT_OK = /^(|unknown|indie|folk|folk_pastoral|pop|rock|country|singer_songwriter)$/;
const EDM_GENRES = /^(edm|club|club_floor|house|techno|dubstep|dnb)$/;
/** Pick the ONE style for a track. Always returns one of FIVE_STYLES.
 *  chip > hardOnly > lyric mood (breakup/grief -> sad, dread -> horror) > energy split for
 *  hip-hop/R&B/EDM > genreFamily > vibeFamily > packFamily > first preset's home. */
const GENTLE_LM = /tender|love|home|gentle|warm|devotion|lullaby/;
const COZY_GENRE = /^(folk|folk_pastoral|country|country_road|acoustic|singer_songwriter)$/;
const COZY_SOUL = /^(rnb|r&b|soul|soul_room|neo_soul|intimate)$/;
/** Host look for the Cozy variant, or null. Breakup/grief lyrics never reach here (Sad wins first). */
function cozyHost({ g = '', v = '', lm = '', energy = 0, aggression = 0 }) {
  if (energy >= 0.45 || aggression >= 0.4) return null;
  if (GENTLE_LM.test(lm) || COZY_SOUL.test(g) && (GENTLE_LM.test(lm) || /^(warm|warm_night|intimate|peaceful)$/.test(v))) return 'cozy';
  if (/^(peaceful|warm|warm_night|intimate|cozy|nature)$/.test(v) || COZY_GENRE.test(g)) return 'cozy';
  return null;
}
/** One call for Auto: { look (one of FIVE_STYLES), variant ('cozy' | null) }. */
export function pickStyle(o = {}) {
  const look = pickStyleFamily(o);
  if (o.chip && o.chip !== 'auto') return { look, variant: null };
  const lm = String(o.lyricMood || '').toLowerCase();
  if (o.hardOnly || /breakup|heartbreak|grief|loss|lonely|longing|dread|haunt|fear|horror/.test(lm)) return { look, variant: null };
  const host = cozyHost({ g: String(o.genreFamily || '').toLowerCase(), v: String(o.vibeFamily || '').toLowerCase(), lm,
    energy: +o.energy || 0, aggression: +o.aggression || 0 });
  return { look, variant: null }; // cozy is a lock now; variant kept for API compat
}
export function pickStyleFamily({ chip, genreFamily, vibeFamily, packFamily, preset, hardOnly,
  lyricMood, energy = 0, aggression = 0 } = {}) {
  if (chip && chip !== 'auto') {
    const c = STYLE_FAMILIES[chip] ? chip : styleForChip(chip);
    if (c) return toFive(c);
  }
  if (hardOnly) return 'ember_wasteland';
  const lm = String(lyricMood || '').toLowerCase();
  if (/breakup|heartbreak|grief|loss|lonely|longing/.test(lm)) return 'sad';
  if (/dread|haunt|fear|horror/.test(lm)) return 'horror';
  const g = String(genreFamily || '').toLowerCase();
  const v = String(vibeFamily || '').toLowerCase();
  // scary vibe beats any genre default (lyric sad already won above)
  if (/^(scary|tense|dread|eerie)$/.test(v) && aggression < 0.6) return 'horror';
  // aggressive + tense/chaotic beats genre (martial pin that missed hardOnly)
  if (aggression >= 0.6 && /^(scary|tense|chaotic|aggressive|chaos)$/.test(v) && !EDM_GENRES.test(g)) return 'ember_wasteland';
  // quiet + warm/gentle, no sad lyric -> Cozy VARIANT (Night Owl rule: peaceful is never Sad)
  const cz = cozyHost({ g, v, lm, energy, aggression });
  if (cz) return cz;
  if (SPLIT_GENRES.test(g)) {
    if (aggression >= 0.6 || lm === 'violent') return 'ember_wasteland';
    if (energy >= 0.45) return 'candy_pop';
    return 'sad';
  }
  if (EDM_GENRES.test(g)) return aggression >= 0.88 ? 'ember_wasteland' : 'candy_pop';
  // bright, non-aggressive, no lyric mood on an ambiguous genre -> Happy (Quirky read as indie)
  if (BRIGHT_OK.test(g) && !lm && energy >= 0.45 && aggression < 0.4) return 'candy_pop';
  for (const k of [genreFamily, vibeFamily, packFamily]) {
    if (!k) continue;
    if (AUTO5[k]) return AUTO5[k];
    if (PICK[k]) return toFive(PICK[k]);
  }
  return toFive(HOME[preset] || DEFAULT_STYLE);
}

/**
 * Keep a wanted preset inside the locked style. If it is outside, return the closest
 * in-family stand-in (peak for intense moments, calm otherwise, else first member).
 */
export function clampToStyle(preset, id, { intense = false, avoid = [] } = {}) {
  const fam = STYLE_FAMILIES[id];
  if (!fam) return preset;
  const ok = lockedWorlds(id);
  if (ok.includes(preset)) return preset;
  const pool = (intense ? fam.peak : fam.calm).concat(ok).filter(p => ok.includes(p) && !avoid.includes(p));
  return pool[0] || ok[0];
}


/**
 * ELEMENT KITS (Darrell Nov 24 + STYLE-BIBLE-horror-cinematic-sad-20261124 Addenda 1-3).
 * A style is NOT just a background: every world in a family uses the same kit and the same
 * character for the whole track. Plate = back layer only; kit = foreground + midground.
 *   elements  recurring props/weather/creatures/light sources (same in every world)
 *   character costume, prop, posture, arc beats; reactions aim at kit elements
 *   drive     which kit element each song part moves (bible Addendum 2)
 *   never     anything that breaks the style in any world
 */
export const STYLE_KITS = Object.freeze({
  horror: {
    elements: ['lantern', 'crows', 'ground fog', 'dark doorway', 'handprints', 'distant silhouette'],
    character: { role: 'searcher', costume: 'long dark coat', prop: 'lantern', posture: 'still, isolated, often from behind',
      arc: { verse: 'search', pre: 'hear something', peak: 'confront or flee the dark', outro: 'alone again' },
      reacts: ['lift lantern toward sound', 'freeze when crows scatter', 'step back from doorway'] },
    drive: { vocals: 'lantern glow', kick: 'fog pulse + lamp jolt', snare: 'crow flap / door creak', hats: 'bulb flicker',
      bass: 'shape in the fog', pads: 'fog bank', harsh: 'one startle per song' },
    fx: ['ground fog', 'dust'], peakLimit: 1, peakScope: 'song', peakMax: 2, never: ['dancing', 'cute animals', 'rainbow', 'confetti', 'fireflies', 'constant strobe']
  },
  cinematic: {
    elements: ['cloak/banner in wind', 'backlit dust + embers', 'far birds', 'horizon landmark', 'light beams'],
    character: { role: 'lone hero', costume: 'cloak or traveling coat', prop: 'lowered staff (sword only if lyric earns it)', posture: 'upright, small vs world, faces landmark',
      arc: { intro: 'small against world', verse: 'walk toward landmark only on a going lyric', pre: 'brace against wind', peak: 'raise arm into light', outro: 'stand in aftermath' },
      reacts: ['turn toward birds', 'shield eyes from light', 'cloak follows wind'] },
    drive: { vocals: 'cloak lifts on held notes', kick: 'dust shock on ground', snare: 'banner snap', hats: 'drifting embers',
      bass: 'landmark glow / rolling clouds', pads: 'sky + light shafts', harsh: 'the single hit' },
    fx: ['motes', 'embers'], peakLimit: 2, never: ['dancing', 'neon', 'candy colors', 'confetti']
  },
  sad: {
    elements: ['rain', 'puddle reflections', 'cold flickering streetlamp', 'umbrella', 'empty bench beside figure', 'letter (optional, lyric-gated)'],
    character: { role: 'someone waiting or remembering', costume: 'plain coat or hoodie, hands in pockets', prop: 'umbrella in rain; letter in one hand only on lyrics about the person', posture: 'STANDING, head low, beside the empty bench',
      arc: { verse: 'stand alone by the bench', pre: 'look down (letter if the lyric is about the person)', peak: 'look up at the flickering streetlamp', outro: 'stay still, head lowers' },
      reacts: ['watch rain hit puddle', 'tilt umbrella into gust', 'flinch as the streetlamp flickers out'] },
    drive: { vocals: 'breath fog / streetlamp steadies', kick: 'puddle ripple', snare: 'rain gust on umbrella', hats: 'rain streak density',
      bass: 'streetlamp buzz + flicker', pads: 'mist + overcast', harsh: 'loud sad only: strain (tilted horizon, hairline crack texture), never explosion' },
    fx: ['rain', 'mist'], peakLimit: 0, never: ['explosion', 'lightning strike', 'fire', 'strobe', 'confetti', 'forest', 'deer', 'fauna', 'fireflies', 'campfire', 'cozy cabin', 'warm grouped shapes', 'centered balanced composition', 'warm window', 'golden light', 'cozy_autumn', 'golden_pastoral', 'dead-tree forest', 'dark_sparse', 'location change']
  },
  candy_pop: {
    elements: ['confetti', 'balloons', 'sparkles', 'flowers', 'sun or rainbow', 'light-dot fauna'],
    character: { role: 'lead performer + friends on chorus', costume: 'bright colorful jacket', prop: null, posture: 'bouncy, open',
      arc: { verse: 'bounce solo', pre: 'point to the sky', peak: 'friends join, dance in formation', outro: 'wave, settle' },
      reacts: ['bounce on kick', 'point at sky on hook', 'catch confetti'] },
    drive: { vocals: 'sparkle trail on hooks', kick: 'confetti pop + step', snare: 'handclap sparkles, balloons bob', hats: 'glitter / light dots',
      bass: 'sunbeam warmth', pads: 'pastel sky', harsh: 'none' },
    fx: ['confetti', 'sparkles'], peakLimit: 3, never: ['dark fog', 'fire', 'weapons', 'crows', 'slow dread', 'storm', 'stormy sky', 'rain', 'sea', 'ocean', 'waves', 'lightning', 'location change']
  },
  ember_wasteland: {
    elements: ['fire + embers', 'chains', 'horned shapes / skulls', 'lightning', 'cracked ground', 'broken pillars', 'demon eyes in smoke', 'shadow beast behind figure'],
    character: { role: 'frontman', costume: 'torn black coat or armor', prop: null, posture: 'wide defiant stance, never soft sway',
      arc: { verse: 'headbang, stalk', pre: 'face the beast', peak: 'raise fists, ground cracks', outro: 'stand in fire' },
      reacts: ['headbang on kick', 'brace against fire', 'eyes glow on screams', 'face the beast'] },
    drive: { vocals: 'eye/rim glow on screams', kick: 'ground slam, embers burst', snare: 'chain rattle, sparks', hats: 'ash + sparks rain',
      bass: 'shadow beast', pads: 'smoke + red haze', harsh: 'fire, fracture, lightning on breakdowns' },
    fx: ['embers', 'ash'], peakLimit: 99, never: ['fireflies', 'pastel', 'confetti', 'cute animals', 'soft sway']
  },
  cozy: {
    elements: ['porch lantern (hanging warm lantern, never a streetlamp)', 'blanket', 'steaming mug', 'falling leaves', 'string lights', 'lit window (warm, close)', 'sleeping cat on the blanket'],
    character: { role: 'someone at home and safe', costume: 'sweater, blanket over shoulders', prop: 'mug held in both hands', posture: 'seated or leaning, relaxed, shoulders soft',
      arc: { verse: 'settled in the warm light', pre: 'look out at the leaves', peak: 'smile, lift the mug / lights brighten', outro: 'eyes close, lamp dims' },
      reacts: ['watch leaves drift past', 'warm hands on mug', 'turn toward the lamp as it glows'] },
    drive: { vocals: 'lamp glow swells', kick: 'soft leaf fall', snare: 'string lights twinkle', hats: 'steam curls',
      bass: 'warm light breathe', pads: 'golden haze', harsh: 'none (cozy never startles)' },
    fx: ['falling leaves', 'warm motes'], peakLimit: 0, never: ['forest', 'deer', 'lake', 'misty_lake', 'meadow_fauna', 'wilderness', 'pine', 'fauna', 'dark_sparse', 'storm', 'streetlamp', 'modern street light', 'explosion', 'fire', 'strobe', 'crows', 'empty bench', 'rain-soaked isolation', 'sharp angles']
  },
  golden_pastoral: {
    elements: ['tall grass', 'wildflowers', 'wooden fence', 'birds', 'deer', 'sun break'],
    character: { role: 'traveler at rest', costume: 'light shirt, boots', prop: null, posture: 'relaxed',
      arc: { verse: 'rest, watch', peak: 'raise arms into sunlight' }, reacts: ['look up at birds', 'watch deer', 'sway with grass'] },
    drive: { kick: 'grass ripple', bass: 'sun warmth', pads: 'haze' }, fx: ['fireflies', 'motes'], peakLimit: 2, never: ['embers', 'neon', 'crows']
  },
  ethereal_sky: {
    elements: ['floating light', 'cloud banks', 'distant stars', 'birds'],
    character: { role: 'dreamer', costume: 'pale flowing clothes', prop: null, posture: 'light, open',
      arc: { verse: 'drift, gaze up', peak: 'open arms to the light' }, reacts: ['gaze at light bloom', 'follow birds'] },
    drive: { vocals: 'light bloom', pads: 'cloud drift' }, fx: ['motes'], peakLimit: 2, never: ['embers', 'crows', 'strobe']
  }
});
/** Returns the kit with `figure` (Visual's field) aliased to `character`. Horror cap is PER SONG. */
/**
 * COMPOSITION per style (Darrell Nov 24 mood table). The difference between styles must read
 * WITHOUT color or a label: each has its own framing, spacing, light and texture.
 * Style = emotional direction; song tempo/energy picks quiet vs loud expression.
 *   focal         where the one focal shape sits ('edge' | 'center' | 'thirds' | 'scattered')
 *   negativeSpace 0..1 share of frame left empty
 *   spacing       'isolated' | 'grouped' | 'uneven' | 'balanced' | 'rhythmic'
 *   edges         'soft' | 'sharp' | 'smooth' | 'bold'
 *   light, texture, maxElements (busy scene -> simplify to one focal element)
 *   test          what it must communicate with the label hidden
 */
export const STYLE_COMPOSITION = Object.freeze({
  sad: { focal: 'edge', negativeSpace: 0.7, spacing: 'isolated', edges: 'soft', light: 'flat, pale, one cold flickering streetlamp; NO warm glow',
    texture: 'faint grain / drizzle haze, slightly unsettled', maxElements: 2, test: 'hollow, something missing, uneasy - NOT peaceful or cozy',
    quiet: { motion: 0.15, horizonTilt: 0, crack: 0, note: 'hollow and still' },
    loud: { motion: 0.45, horizonTilt: 4, crack: 0.25, note: 'strained, fractured texture, still isolated' } },
  horror: { focal: 'thirds', negativeSpace: 0.55, spacing: 'uneven', edges: 'sharp', light: 'single hard source, deep black falloff',
    texture: 'fog + grit, crowded dark edges', maxElements: 3, test: 'tense, restless, watched (Anxious)',
    quiet: { motion: 0.1, note: 'held breath, nothing moves' }, loud: { motion: 0.6, note: 'crowding edges, the one startle' } },
  cinematic: { focal: 'center', negativeSpace: 0.45, spacing: 'balanced', edges: 'smooth', light: 'golden backlight, gentle contrast, light shafts',
    texture: 'clean air, soft dust', maxElements: 3, test: 'open, steady, epic scale (Calm -> grand)',
    quiet: { motion: 0.2, note: 'open and steady' }, loud: { motion: 0.55, note: 'scale and sweep' } },
  candy_pop: { focal: 'center', negativeSpace: 0.25, spacing: 'rhythmic', edges: 'bold', light: 'bright high-key, saturated',
    texture: 'clean shapes, sparkle', maxElements: 5, test: 'bright, alive, clear direction (Energized)',
    quiet: { motion: 0.35, note: 'warm, close-grouped, soft (Cozy)' }, loud: { motion: 0.85, note: 'bold strong visual rhythm' } },
  cozy: { focal: 'center', negativeSpace: 0.3, spacing: 'grouped', edges: 'soft', light: 'warm low lamp/porch light, gentle falloff',
    texture: 'soft haze, fabric warmth', maxElements: 4, test: 'warm, safe, intimate (Cozy)',
    quiet: { motion: 0.15, note: 'still and safe' }, loud: { motion: 0.4, note: 'warm glow brightening, shapes stay close' } },
  ember_wasteland: { focal: 'center', negativeSpace: 0.2, spacing: 'uneven', edges: 'sharp', light: 'red underlight, hard rim, smoke',
    texture: 'ash, cracks, embers', maxElements: 4, test: 'evil, intense, heavy',
    quiet: { motion: 0.3, note: 'smoldering threat' }, loud: { motion: 1, note: 'destruction on every hit' } }
});
export function styleComposition(id, { energy = 0.5 } = {}) {
  const c = STYLE_COMPOSITION[id] || STYLE_COMPOSITION[toFive(id)] || STYLE_COMPOSITION.cinematic;
  return { ...c, expression: energy >= 0.55 ? c.loud : c.quiet, mode: energy >= 0.55 ? 'loud' : 'quiet' };
}

export function styleKit(id) {
  const k = STYLE_KITS[id] || STYLE_KITS[COLLAPSE[id]];
  if (!k) return null;
  const c = k.character;
  return { ...k, figure: { ...c, outfit: c.costume, wardrobe: c.costume, prop: c.prop },
    composition: STYLE_COMPOSITION[id] || STYLE_COMPOSITION[toFive(id)] || null };
}
