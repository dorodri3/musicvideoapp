/**
 * GENRE-MAP + GENRE-MAP-PLEASURE — family defaults before preset roulette.
 * Soft bias from audio.genreHint / texture; lyrics + live vibe override.
 * Unknown ≠ neon_highway — fallback vibe/lyric then dream_clouds.
 * Worlds packs: v2-worlds-genre-packs-20260924-214353
 */
export const GENRE_FAMILIES = {
  pop: {
    id: 'pop', packFamily: 'stage_pop',
    leadPresets: ['stage_pop', 'candy_happy', 'dream_clouds', 'futuristic_city'],
    preferredArchetypes: ['pop_candy', 'formation_crew', 'fg_performer'],
    danceBias: 'high', weaponsAllowed: false,
    pleasureIntent: 'hook_sparkle',
    fantasyHint: 'Chorus earworm sky opening; freestyle→formation on hook'
  },
  hiphop: {
    id: 'hiphop', packFamily: 'street_block',
    leadPresets: ['hiphop_block', 'rainy_city', 'industrial_tunnel', 'empty_highway'],
    preferredArchetypes: ['fg_performer', 'tableau_figure'],
    danceBias: 'mid', weaponsAllowed: true,
    pleasureIntent: 'flow_cipher',
    fantasyHint: '808 chest thud; cipher/block presence; bars are the world'
  },
  rnb: {
    id: 'rnb', packFamily: 'intimate',
    leadPresets: ['soul_room', 'spoken_word_bed', 'dream_clouds', 'misty_lake'],
    preferredArchetypes: ['tableau_figure', 'spoken_intimate'],
    danceBias: 'low', weaponsAllowed: false,
    pleasureIntent: 'intimate_sway',
    fantasyHint: 'Velvet closeness; slow sway; pads aura'
  },
  rock_metal: {
    id: 'rock_metal', packFamily: 'metal_hall',
    leadPresets: ['metal_hall', 'industrial_tunnel', 'storm', 'red_void'],
    preferredArchetypes: ['chaos_fracture', 'fg_performer', 'ash_survivor'],
    danceBias: 'mid', weaponsAllowed: true,
    pleasureIntent: 'power',
    fantasyHint: 'Amp in the ribs; kick ground punch; freestyle pulse'
  },
  folk: {
    id: 'folk', packFamily: 'country_road',
    leadPresets: ['country_porch', 'meadow_fauna', 'empty_highway', 'forest', 'cozy_autumn'],
    preferredArchetypes: ['pastoral_walker', 'tableau_figure'],
    danceBias: 'low', weaponsAllowed: false,
    pleasureIntent: 'story_place',
    fantasyHint: 'Road/porch/landscape; walk ≫ club dance'
  },
  jazz: {
    id: 'jazz', packFamily: 'jazz',
    leadPresets: ['jazz_club', 'soul_room', 'rainy_city', 'dream_clouds'],
    preferredArchetypes: ['tableau_figure', 'spoken_intimate'],
    danceBias: 'low', weaponsAllowed: false,
    pleasureIntent: 'cool_space',
    fantasyHint: 'Breath between notes; sway not bounce'
  },
  classical: {
    id: 'classical', packFamily: 'sacred_hall',
    leadPresets: ['orchestral_hall', 'cathedral_space', 'space', 'white_void'],
    preferredArchetypes: ['sacred_solitary', 'cosmic_dissolve'],
    danceBias: 'low', weaponsAllowed: false,
    pleasureIntent: 'swell_architecture',
    fantasyHint: 'Stillness→spine lift; ritual_gesture; motif return'
  },
  edm: {
    id: 'edm', packFamily: 'club',
    leadPresets: ['club_floor', 'futuristic_city', 'led_wall', 'space', 'storm'],
    preferredArchetypes: ['neon_runner', 'pop_candy', 'formation_crew'],
    danceBias: 'high', weaponsAllowed: false,
    pleasureIntent: 'build_drop',
    fantasyHint: 'Tension→drop catharsis; formation on bloom — not neon_highway default'
  },
  ambient: {
    id: 'ambient', packFamily: 'void_dream',
    leadPresets: ['ambient_field', 'white_void', 'dream_clouds', 'spoken_word_bed'],
    preferredArchetypes: ['void_presence', 'nature_fauna', 'cosmic_dissolve'],
    danceBias: 'low', weaponsAllowed: false,
    pleasureIntent: 'immerse',
    fantasyHint: 'Dissolve into pads; still / anti-dance'
  },
  latin: {
    id: 'latin', packFamily: 'warm_night',
    leadPresets: ['latin_night', 'ocean', 'candy_happy', 'rainy_city'],
    preferredArchetypes: ['fg_performer', 'pop_candy', 'formation_crew'],
    danceBias: 'high', weaponsAllowed: false,
    pleasureIntent: 'dance_color',
    fantasyHint: 'Hip-led groove; freestyle + formation on hooks'
  },
  afro: {
    id: 'afro', packFamily: 'warm_night',
    leadPresets: ['latin_night', 'ocean', 'forest', 'dream_clouds', 'rainy_city'],
    preferredArchetypes: ['fg_performer', 'formation_crew', 'pop_candy'],
    danceBias: 'high', weaponsAllowed: false,
    pleasureIntent: 'pocket_body',
    fantasyHint: 'Pocket-first body; sway/freestyle; hats as spark fauna'
  },
  kpop: {
    id: 'kpop', packFamily: 'stage_pop',
    leadPresets: ['stage_pop', 'candy_happy', 'dream_clouds', 'futuristic_city'],
    preferredArchetypes: ['formation_crew', 'pop_candy', 'fg_performer'],
    danceBias: 'high', weaponsAllowed: false,
    pleasureIntent: 'formation_spectacle',
    fantasyHint: 'Precision formation geometry; chorus sparkle'
  },
  gospel: {
    id: 'gospel', packFamily: 'sacred_bright',
    leadPresets: ['gospel_light', 'cathedral_space', 'dream_clouds', 'space'],
    preferredArchetypes: ['sacred_solitary', 'formation_crew'],
    danceBias: 'mid', weaponsAllowed: false,
    pleasureIntent: 'sacred_lift',
    fantasyHint: 'Shaft light; ritual→choir geometry; heal not destroy'
  },
  indie: {
    id: 'indie', packFamily: 'weather',
    leadPresets: ['rainy_city', 'empty_highway', 'forest', 'dream_clouds', 'country_porch'],
    preferredArchetypes: ['tableau_figure', 'pastoral_walker'],
    danceBias: 'low', weaponsAllowed: false,
    pleasureIntent: 'bittersweet_space',
    fantasyHint: 'Negative space; still/walk > formation'
  },
  soundtrack: {
    id: 'soundtrack', packFamily: 'sacred_hall',
    leadPresets: ['orchestral_hall', 'cathedral_space', 'space', 'storm', 'dream_clouds'],
    preferredArchetypes: ['tableau_figure', 'cosmic_dissolve'],
    danceBias: 'low', weaponsAllowed: true,
    pleasureIntent: 'cinematic_arc',
    fantasyHint: 'Build→hit; dance rare unless diegetic'
  },
  spoken: {
    id: 'spoken', packFamily: 'spoken',
    leadPresets: ['spoken_word_bed', 'soul_room', 'white_void', 'forest', 'dream_clouds'],
    preferredArchetypes: ['spoken_intimate'],
    danceBias: 'low', weaponsAllowed: false,
    pleasureIntent: 'lyric_world',
    fantasyHint: 'Stillness; micro-gesture only; lead+pads'
  },
  experimental: {
    id: 'experimental', packFamily: 'chaos',
    leadPresets: ['reality_fracture', 'ambient_field', 'red_void', 'industrial_tunnel'],
    preferredArchetypes: ['void_presence', 'chaos_fracture'],
    danceBias: 'low', weaponsAllowed: false,
    pleasureIntent: 'glitch_tension',
    fantasyHint: 'Anti-dance / glitch body; harsh ash over guns'
  }
};

const HINT_TO_FAMILY = {
  classical: 'classical', jazz: 'jazz', metal: 'rock_metal', ambient: 'ambient',
  hiphop: 'hiphop', folk: 'folk', edm: 'edm', spoken: 'spoken', unknown: null
};

/**
 * Soft-resolve genre family. Spoken clamps win. Unknown → null (caller uses vibe/lyric).
 */
export function resolveGenreFamily(opts = {}) {
  const {
    genreHint = 'unknown',
    texture = null,
    speechLike = false,
    explicitGenre = null,
    conceptId = null
  } = opts;

  if (speechLike) return GENRE_FAMILIES.spoken;

  const explicit = String(explicitGenre || '').toLowerCase();
  if (explicit) {
    if (/k-?pop|j-?pop/.test(explicit)) return GENRE_FAMILIES.kpop;
    if (/rap|trap|drill|hip-?hop/.test(explicit)) return GENRE_FAMILIES.hiphop;
    if (/r&b|rnb|soul/.test(explicit)) return GENRE_FAMILIES.rnb;
    if (/country|americana|bluegrass|folk/.test(explicit)) return GENRE_FAMILIES.folk;
    if (/reggaeton|salsa|samba|latin|bachata/.test(explicit)) return GENRE_FAMILIES.latin;
    if (/afro|dancehall|reggae|afrobeats/.test(explicit)) return GENRE_FAMILIES.afro;
    if (/gospel|worship/.test(explicit)) return GENRE_FAMILIES.gospel;
    if (/punk|metal|hardcore|rock/.test(explicit)) return GENRE_FAMILIES.rock_metal;
    if (/techno|house|trance|dubstep|edm|electronic/.test(explicit)) return GENRE_FAMILIES.edm;
    if (/ambient|drone|idm/.test(explicit)) return GENRE_FAMILIES.ambient;
    if (/jazz|blues/.test(explicit)) return GENRE_FAMILIES.jazz;
    if (/classical|orchestr|score|soundtrack/.test(explicit)) return GENRE_FAMILIES.classical;
    if (/spoken|podcast|poetry/.test(explicit)) return GENRE_FAMILIES.spoken;
    if (/indie|alt/.test(explicit)) return GENRE_FAMILIES.indie;
    if (/experimental|noise/.test(explicit)) return GENRE_FAMILIES.experimental;
    if (/\bpop\b/.test(explicit)) return GENRE_FAMILIES.pop;
    for (const [id, fam] of Object.entries(GENRE_FAMILIES)) {
      if (id !== 'pop' && (explicit.includes(id) || explicit.includes(fam.id))) return fam;
    }
  }

  const hintFam = HINT_TO_FAMILY[String(genreHint || 'unknown').toLowerCase()];
  if (hintFam && GENRE_FAMILIES[hintFam]) return GENRE_FAMILIES[hintFam];

  const t = texture || {};
  const scores = [
    ['edm', t.fourOnFloor || 0],
    ['rock_metal', t.harshWall || 0],
    ['hiphop', t.pocketKick || 0],
    ['classical', t.swell || 0],
    ['jazz', t.swing || 0],
    ['ambient', t.ambient || 0],
    ['folk', t.sparseAcoustic || 0]
  ].sort((a, b) => b[1] - a[1]);
  if (scores[0][1] >= 0.35) return GENRE_FAMILIES[scores[0][0]];

  const c = String(conceptId || '');
  if (/war_battle|rage|storm_chaos/.test(c)) return GENRE_FAMILIES.rock_metal;
  if (/silence_void|loneliness/.test(c)) return GENRE_FAMILIES.spoken;

  return null;
}

export function getGenreFamily(id) {
  return GENRE_FAMILIES[id] || null;
}

export function applyGenreDefaults(narrative, family, opts = {}) {
  if (!family || !narrative) return null;
  const force = !!opts.force;
  const cur = typeof narrative.getPackFamily === 'function' ? narrative.getPackFamily() : null;
  if (force || !cur) {
    if (typeof narrative.setPackFamily === 'function') {
      narrative.setPackFamily(family.packFamily);
    }
  }
  if (typeof narrative.setGenreFamily === 'function') {
    narrative.setGenreFamily(family.id, family.pleasureIntent);
  }
  return {
    genreFamily: family.id,
    pleasureIntent: family.pleasureIntent,
    fantasyHint: family.fantasyHint,
    danceBias: family.danceBias,
    weaponsAllowed: family.weaponsAllowed,
    leadPresets: family.leadPresets,
    preferredArchetypes: family.preferredArchetypes,
    packFamily: family.packFamily
  };
}
