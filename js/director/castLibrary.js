/**
 * Cast Library — archetype roster + character/outfit variants.
 * Source of truth: CAST-ROSTER-20260924-2127 + MUSIC-BRIEF-20260924-2127.
 *
 * Rules:
 * - vibe picks FAMILY before presets (see vibeCast.js)
 * - Verse: tableau_figure | pastoral_walker | spoken_intimate | dread_sparse
 * - Chorus: formation_crew OR heroic neon_runner/pop_candy/fg_performer (SAME family widen)
 * - Peace→nature_fauna+pastoral; scary→dread_sparse/void_presence;
 *   chaos→chaos_fracture then ash_survivor; spoken→LOCK spoken_intimate (NO formation)
 * - cast.action = lyric WHAT; archetype = WHO; outfitId = Visual theme
 *
 * kinds: silhouette|traveler|duo|crowd_ghosts|beast|figure_lone|congregation|fauna|dancer|none
 * style: silhouette|neon|dream
 */

/** @typedef {'silhouette'|'traveler'|'duo'|'crowd_ghosts'|'beast'|'figure_lone'|'congregation'|'fauna'|'dancer'|'none'} CastKind */
/** @typedef {'silhouette'|'neon'|'dream'} CastStyle */

/** Roster archetypes (14) — do not rename */
export const ARCHETYPES = {
  nature_fauna: {
    id: 'nature_fauna', vibeHome: 'peaceful', kind: 'fauna',
    scale: 'intimate', staging: 'distant fauna as living nature'
  },
  pastoral_walker: {
    id: 'pastoral_walker', vibeHome: 'peaceful', kind: 'traveler',
    scale: 'human', staging: 'calm walker soft light'
  },
  sacred_solitary: {
    id: 'sacred_solitary', vibeHome: 'peaceful', kind: 'figure_lone',
    scale: 'human', staging: 'aisle/shaft solitary'
  },
  neon_runner: {
    id: 'neon_runner', vibeHome: 'groove', kind: 'traveler',
    scale: 'cinematic', staging: 'path runner chase body'
  },
  pop_candy: {
    id: 'pop_candy', vibeHome: 'euphoric', kind: 'dancer',
    scale: 'cinematic', staging: 'bright formation-ready lead'
  },
  formation_crew: {
    id: 'formation_crew', vibeHome: 'chorus', kind: 'crowd_ghosts',
    scale: 'epic', staging: 'formation geometry multiply'
  },
  tableau_figure: {
    id: 'tableau_figure', vibeHome: 'narrative', kind: 'figure_lone',
    scale: 'human', staging: 'single-figure tableau'
  },
  fg_performer: {
    id: 'fg_performer', vibeHome: 'groove', kind: 'figure_lone',
    scale: 'cinematic', staging: 'FG body holds while BG escalates'
  },
  chaos_fracture: {
    id: 'chaos_fracture', vibeHome: 'chaotic', kind: 'crowd_ghosts',
    scale: 'cinematic', staging: 'unstable run/fall one crosshair'
  },
  ash_survivor: {
    id: 'ash_survivor', vibeHome: 'chaotic', kind: 'silhouette',
    scale: 'intimate', staging: 'kneel/stand post-gate soothe'
  },
  dread_sparse: {
    id: 'dread_sparse', vibeHome: 'scary', kind: 'silhouette',
    scale: 'intimate', staging: 'distant doorway / hide>reveal'
  },
  void_presence: {
    id: 'void_presence', vibeHome: 'scary', kind: 'silhouette',
    scale: 'intimate', staging: 'barely-there void figure'
  },
  spoken_intimate: {
    id: 'spoken_intimate', vibeHome: 'spoken', kind: 'figure_lone',
    scale: 'intimate', staging: 'close contemplative or empty seat'
  },
  cosmic_dissolve: {
    id: 'cosmic_dissolve', vibeHome: 'awe', kind: 'figure_lone',
    scale: 'cosmic', staging: 'figure dissolving into stars'
  }
};

/** Outfit theme ids (Visual rim/palette language) */
export const OUTFITS = {
  linen_dawn:        { id: 'linen_dawn', vibeTags: ['peaceful'], style: 'dream', label: 'Linen dawn' },
  moss_trail:        { id: 'moss_trail', vibeTags: ['peaceful'], style: 'silhouette', label: 'Moss trail' },
  water_gloss:       { id: 'water_gloss', vibeTags: ['peaceful'], style: 'dream', label: 'Water gloss' },
  after_hours_red:   { id: 'after_hours_red', vibeTags: ['groove', 'tense'], style: 'neon', label: 'After Hours red' },
  neon_trim:         { id: 'neon_trim', vibeTags: ['groove', 'euphoric'], style: 'neon', label: 'Neon trim' },
  highway_dust:      { id: 'highway_dust', vibeTags: ['groove', 'peaceful'], style: 'silhouette', label: 'Highway dust' },
  chrome_candy:      { id: 'chrome_candy', vibeTags: ['euphoric'], style: 'neon', label: 'Chrome candy' },
  stage_gloss:       { id: 'stage_gloss', vibeTags: ['euphoric', 'chorus'], style: 'neon', label: 'Stage gloss' },
  color_block_crew:  { id: 'color_block_crew', vibeTags: ['chorus', 'euphoric'], style: 'neon', label: 'Color-block crew' },
  fracture_rag:      { id: 'fracture_rag', vibeTags: ['chaotic'], style: 'silhouette', label: 'Fracture rag' },
  industrial_hazard: { id: 'industrial_hazard', vibeTags: ['chaotic'], style: 'silhouette', label: 'Industrial hazard' },
  ember_coat:        { id: 'ember_coat', vibeTags: ['chaotic', 'tense'], style: 'neon', label: 'Ember coat' },
  dread_coat:        { id: 'dread_coat', vibeTags: ['scary'], style: 'silhouette', label: 'Dread coat' },
  pale_void:         { id: 'pale_void', vibeTags: ['scary', 'spoken'], style: 'dream', label: 'Pale void' },
  threshold:         { id: 'threshold', vibeTags: ['scary', 'tense'], style: 'silhouette', label: 'Threshold' },
  room_clothes:      { id: 'room_clothes', vibeTags: ['spoken'], style: 'silhouette', label: 'Room clothes' },
  desk_lamp:         { id: 'desk_lamp', vibeTags: ['spoken'], style: 'dream', label: 'Desk lamp key' },
  empty_chair:       { id: 'empty_chair', vibeTags: ['spoken'], style: 'silhouette', label: 'Empty chair proxy' },
  aisle_linen:       { id: 'aisle_linen', vibeTags: ['peaceful', 'awe'], style: 'dream', label: 'Aisle linen' },
  star_dust:         { id: 'star_dust', vibeTags: ['awe', 'peaceful'], style: 'dream', label: 'Star dust' }
};

/**
 * Character variants UNDER archetypes (stylized dream figures, not photoreal).
 * Each: { id, archetype, kind, label, defaultScale, placements, vibeTags, outfitSlots, defaultOutfit, style }
 */
export const CHARACTERS = [
  // —— nature_fauna (peace) ——
  { id: 'crane_dusk', archetype: 'nature_fauna', kind: 'fauna', label: 'Dusk crane', defaultScale: 0.55, placements: ['sky', 'mid'], vibeTags: ['peaceful'], outfitSlots: ['linen_dawn', 'water_gloss', 'moss_trail'], defaultOutfit: 'linen_dawn', style: 'dream' },
  { id: 'herd_silhouette', archetype: 'nature_fauna', kind: 'fauna', label: 'Distant herd', defaultScale: 0.4, placements: ['mid'], vibeTags: ['peaceful'], outfitSlots: ['moss_trail', 'linen_dawn'], defaultOutfit: 'moss_trail', style: 'silhouette' },
  { id: 'fish_motes', archetype: 'nature_fauna', kind: 'fauna', label: 'Fish light-motes', defaultScale: 0.35, placements: ['mid', 'sky'], vibeTags: ['peaceful'], outfitSlots: ['water_gloss'], defaultOutfit: 'water_gloss', style: 'dream' },
  { id: 'songbird_pair', archetype: 'nature_fauna', kind: 'fauna', label: 'Songbird pair', defaultScale: 0.3, placements: ['sky'], vibeTags: ['peaceful'], outfitSlots: ['linen_dawn', 'moss_trail'], defaultOutfit: 'linen_dawn', style: 'dream' },
  { id: 'stag_fog', archetype: 'nature_fauna', kind: 'fauna', label: 'Fog stag', defaultScale: 0.7, placements: ['mid'], vibeTags: ['peaceful', 'scary'], outfitSlots: ['moss_trail', 'pale_void'], defaultOutfit: 'moss_trail', style: 'silhouette' },
  { id: 'butterflies_wash', archetype: 'nature_fauna', kind: 'fauna', label: 'Butterfly wash', defaultScale: 0.25, placements: ['sky', 'mid'], vibeTags: ['peaceful', 'euphoric'], outfitSlots: ['linen_dawn', 'star_dust'], defaultOutfit: 'linen_dawn', style: 'dream' },

  // —— pastoral_walker ——
  { id: 'path_walker_dawn', archetype: 'pastoral_walker', kind: 'traveler', label: 'Dawn path walker', defaultScale: 0.85, placements: ['mid', 'foreground'], vibeTags: ['peaceful'], outfitSlots: ['linen_dawn', 'moss_trail', 'highway_dust'], defaultOutfit: 'linen_dawn', style: 'silhouette' },
  { id: 'meadow_wanderer', archetype: 'pastoral_walker', kind: 'traveler', label: 'Meadow wanderer', defaultScale: 0.8, placements: ['mid'], vibeTags: ['peaceful'], outfitSlots: ['moss_trail', 'linen_dawn'], defaultOutfit: 'moss_trail', style: 'dream' },
  { id: 'lake_shore_figure', archetype: 'pastoral_walker', kind: 'figure_lone', label: 'Lake-shore figure', defaultScale: 0.75, placements: ['mid', 'foreground'], vibeTags: ['peaceful', 'spoken'], outfitSlots: ['water_gloss', 'linen_dawn'], defaultOutfit: 'water_gloss', style: 'dream' },
  { id: 'autumn_road_traveler', archetype: 'pastoral_walker', kind: 'traveler', label: 'Autumn road traveler', defaultScale: 0.85, placements: ['mid'], vibeTags: ['peaceful'], outfitSlots: ['highway_dust', 'moss_trail'], defaultOutfit: 'highway_dust', style: 'silhouette' },
  { id: 'heal_hands_open', archetype: 'pastoral_walker', kind: 'figure_lone', label: 'Heal-hands open', defaultScale: 0.9, placements: ['foreground', 'mid'], vibeTags: ['peaceful'], outfitSlots: ['linen_dawn', 'aisle_linen'], defaultOutfit: 'linen_dawn', style: 'dream' },

  // —— sacred_solitary ——
  { id: 'aisle_kneeler', archetype: 'sacred_solitary', kind: 'figure_lone', label: 'Aisle kneeler', defaultScale: 0.9, placements: ['mid', 'foreground'], vibeTags: ['peaceful', 'awe'], outfitSlots: ['aisle_linen', 'linen_dawn'], defaultOutfit: 'aisle_linen', style: 'dream' },
  { id: 'shaft_light_witness', archetype: 'sacred_solitary', kind: 'silhouette', label: 'Shaft-light witness', defaultScale: 0.85, placements: ['mid'], vibeTags: ['peaceful', 'awe'], outfitSlots: ['aisle_linen', 'pale_void'], defaultOutfit: 'aisle_linen', style: 'silhouette' },
  { id: 'choir_ghost_one', archetype: 'sacred_solitary', kind: 'silhouette', label: 'Single choir ghost', defaultScale: 0.7, placements: ['mid'], vibeTags: ['peaceful'], outfitSlots: ['aisle_linen', 'star_dust'], defaultOutfit: 'aisle_linen', style: 'dream' },

  // —— neon_runner ——
  { id: 'blinding_runner', archetype: 'neon_runner', kind: 'traveler', label: 'Blinding-hours runner', defaultScale: 1.0, placements: ['foreground', 'mid'], vibeTags: ['groove', 'euphoric'], outfitSlots: ['after_hours_red', 'neon_trim', 'highway_dust'], defaultOutfit: 'after_hours_red', style: 'neon' },
  { id: 'cyan_edge_sprinter', archetype: 'neon_runner', kind: 'traveler', label: 'Cyan-edge sprinter', defaultScale: 0.95, placements: ['mid', 'foreground'], vibeTags: ['groove'], outfitSlots: ['neon_trim', 'highway_dust'], defaultOutfit: 'neon_trim', style: 'neon' },
  { id: 'rain_highway_runner', archetype: 'neon_runner', kind: 'traveler', label: 'Rain highway runner', defaultScale: 0.95, placements: ['mid'], vibeTags: ['groove', 'tense'], outfitSlots: ['highway_dust', 'after_hours_red', 'water_gloss'], defaultOutfit: 'highway_dust', style: 'neon' },
  { id: 'night_bus_chaser', archetype: 'neon_runner', kind: 'traveler', label: 'Night-bus chaser', defaultScale: 0.9, placements: ['foreground'], vibeTags: ['groove'], outfitSlots: ['neon_trim', 'after_hours_red'], defaultOutfit: 'neon_trim', style: 'neon' },

  // —— pop_candy ——
  { id: 'candy_lead', archetype: 'pop_candy', kind: 'dancer', label: 'Candy lead', defaultScale: 1.05, placements: ['foreground', 'mid'], vibeTags: ['euphoric'], outfitSlots: ['chrome_candy', 'stage_gloss', 'color_block_crew'], defaultOutfit: 'chrome_candy', style: 'neon' },
  { id: 'sequin_hook', archetype: 'pop_candy', kind: 'dancer', label: 'Sequin hook figure', defaultScale: 1.0, placements: ['foreground'], vibeTags: ['euphoric', 'chorus'], outfitSlots: ['stage_gloss', 'chrome_candy'], defaultOutfit: 'stage_gloss', style: 'neon' },
  { id: 'pastel_pose', archetype: 'pop_candy', kind: 'figure_lone', label: 'Pastel pose', defaultScale: 0.95, placements: ['mid', 'foreground'], vibeTags: ['euphoric', 'peaceful'], outfitSlots: ['chrome_candy', 'linen_dawn'], defaultOutfit: 'chrome_candy', style: 'dream' },

  // —— formation_crew ——
  { id: 'formation_five', archetype: 'formation_crew', kind: 'crowd_ghosts', label: 'Formation five', defaultScale: 1.1, placements: ['mid', 'foreground'], vibeTags: ['chorus', 'euphoric'], outfitSlots: ['color_block_crew', 'stage_gloss', 'neon_trim'], defaultOutfit: 'color_block_crew', style: 'neon' },
  { id: 'mirror_line', archetype: 'formation_crew', kind: 'crowd_ghosts', label: 'Mirror line', defaultScale: 1.0, placements: ['mid'], vibeTags: ['chorus'], outfitSlots: ['color_block_crew', 'chrome_candy'], defaultOutfit: 'color_block_crew', style: 'silhouette' },
  { id: 'crew_halo', archetype: 'formation_crew', kind: 'congregation', label: 'Crew halo', defaultScale: 1.15, placements: ['mid'], vibeTags: ['chorus', 'awe'], outfitSlots: ['stage_gloss', 'star_dust'], defaultOutfit: 'stage_gloss', style: 'neon' },
  { id: 'block_accent_six', archetype: 'formation_crew', kind: 'crowd_ghosts', label: 'Block-accent six', defaultScale: 1.1, placements: ['mid', 'foreground'], vibeTags: ['chorus', 'euphoric'], outfitSlots: ['color_block_crew'], defaultOutfit: 'color_block_crew', style: 'neon' },

  // —— tableau_figure ——
  { id: 'kneel_look_up', archetype: 'tableau_figure', kind: 'figure_lone', label: 'Kneel look-up', defaultScale: 0.85, placements: ['foreground', 'mid'], vibeTags: ['narrative', 'peaceful', 'spoken'], outfitSlots: ['room_clothes', 'linen_dawn', 'highway_dust'], defaultOutfit: 'room_clothes', style: 'silhouette' },
  { id: 'window_stander', archetype: 'tableau_figure', kind: 'figure_lone', label: 'Window stander', defaultScale: 0.8, placements: ['mid', 'foreground'], vibeTags: ['narrative', 'spoken'], outfitSlots: ['room_clothes', 'desk_lamp'], defaultOutfit: 'desk_lamp', style: 'dream' },
  { id: 'bench_sitter', archetype: 'tableau_figure', kind: 'figure_lone', label: 'Bench sitter', defaultScale: 0.75, placements: ['foreground'], vibeTags: ['narrative', 'spoken', 'peaceful'], outfitSlots: ['room_clothes', 'empty_chair'], defaultOutfit: 'room_clothes', style: 'silhouette' },
  { id: 'doorway_pause', archetype: 'tableau_figure', kind: 'silhouette', label: 'Doorway pause', defaultScale: 0.8, placements: ['mid'], vibeTags: ['narrative', 'scary', 'tense'], outfitSlots: ['threshold', 'room_clothes'], defaultOutfit: 'threshold', style: 'silhouette' },
  { id: 'roof_watcher', archetype: 'tableau_figure', kind: 'figure_lone', label: 'Roof watcher', defaultScale: 0.7, placements: ['sky', 'mid'], vibeTags: ['narrative'], outfitSlots: ['highway_dust', 'neon_trim'], defaultOutfit: 'highway_dust', style: 'silhouette' },

  // —— fg_performer ——
  { id: 'america_fg', archetype: 'fg_performer', kind: 'figure_lone', label: 'FG crosshair body', defaultScale: 1.15, placements: ['foreground'], vibeTags: ['groove', 'chaotic', 'tense'], outfitSlots: ['after_hours_red', 'industrial_hazard', 'neon_trim'], defaultOutfit: 'after_hours_red', style: 'neon' },
  { id: 'mic_stand_lead', archetype: 'fg_performer', kind: 'figure_lone', label: 'Mic-stand lead', defaultScale: 1.1, placements: ['foreground'], vibeTags: ['groove', 'euphoric'], outfitSlots: ['stage_gloss', 'neon_trim'], defaultOutfit: 'stage_gloss', style: 'neon' },
  { id: 'still_center_storm', archetype: 'fg_performer', kind: 'figure_lone', label: 'Still-center storm', defaultScale: 1.2, placements: ['foreground'], vibeTags: ['chaotic', 'tense'], outfitSlots: ['ember_coat', 'fracture_rag'], defaultOutfit: 'ember_coat', style: 'silhouette' },

  // —— chaos_fracture ——
  { id: 'scatter_runners', archetype: 'chaos_fracture', kind: 'crowd_ghosts', label: 'Scatter runners', defaultScale: 1.0, placements: ['mid', 'foreground'], vibeTags: ['chaotic'], outfitSlots: ['fracture_rag', 'industrial_hazard'], defaultOutfit: 'fracture_rag', style: 'silhouette' },
  { id: 'ash_beast', archetype: 'chaos_fracture', kind: 'beast', label: 'Ash beast', defaultScale: 1.3, placements: ['mid', 'foreground'], vibeTags: ['chaotic'], outfitSlots: ['ember_coat', 'fracture_rag'], defaultOutfit: 'ember_coat', style: 'silhouette' },
  { id: 'fracture_duo_flee', archetype: 'chaos_fracture', kind: 'duo', label: 'Fracture duo flee', defaultScale: 0.95, placements: ['mid'], vibeTags: ['chaotic', 'tense'], outfitSlots: ['fracture_rag', 'industrial_hazard'], defaultOutfit: 'fracture_rag', style: 'silhouette' },
  { id: 'glitch_swarm', archetype: 'chaos_fracture', kind: 'crowd_ghosts', label: 'Glitch swarm', defaultScale: 1.05, placements: ['mid', 'sky'], vibeTags: ['chaotic'], outfitSlots: ['industrial_hazard', 'fracture_rag'], defaultOutfit: 'industrial_hazard', style: 'neon' },
  { id: 'war_silhouette_line', archetype: 'chaos_fracture', kind: 'crowd_ghosts', label: 'War silhouette line', defaultScale: 1.1, placements: ['mid'], vibeTags: ['chaotic'], outfitSlots: ['industrial_hazard', 'ember_coat'], defaultOutfit: 'industrial_hazard', style: 'silhouette' },

  // —— ash_survivor ——
  { id: 'ruins_kneeler', archetype: 'ash_survivor', kind: 'silhouette', label: 'Ruins kneeler', defaultScale: 0.7, placements: ['mid', 'foreground'], vibeTags: ['chaotic', 'peaceful'], outfitSlots: ['ember_coat', 'fracture_rag', 'pale_void'], defaultOutfit: 'ember_coat', style: 'silhouette' },
  { id: 'smoke_stander', archetype: 'ash_survivor', kind: 'figure_lone', label: 'Smoke stander', defaultScale: 0.75, placements: ['mid'], vibeTags: ['chaotic'], outfitSlots: ['fracture_rag', 'highway_dust'], defaultOutfit: 'fracture_rag', style: 'silhouette' },
  { id: 'ember_rim_survivor', archetype: 'ash_survivor', kind: 'silhouette', label: 'Ember-rim survivor', defaultScale: 0.8, placements: ['foreground', 'mid'], vibeTags: ['chaotic', 'tense'], outfitSlots: ['ember_coat'], defaultOutfit: 'ember_coat', style: 'neon' },

  // —— dread_sparse ——
  { id: 'doorway_dread', archetype: 'dread_sparse', kind: 'silhouette', label: 'Doorway dread', defaultScale: 0.55, placements: ['mid'], vibeTags: ['scary'], outfitSlots: ['dread_coat', 'threshold', 'pale_void'], defaultOutfit: 'dread_coat', style: 'silhouette' },
  { id: 'far_path_walker', archetype: 'dread_sparse', kind: 'traveler', label: 'Far path walker', defaultScale: 0.45, placements: ['mid'], vibeTags: ['scary'], outfitSlots: ['dread_coat', 'pale_void'], defaultOutfit: 'dread_coat', style: 'silhouette' },
  { id: 'hidden_corner', archetype: 'dread_sparse', kind: 'silhouette', label: 'Hidden corner figure', defaultScale: 0.4, placements: ['foreground', 'mid'], vibeTags: ['scary'], outfitSlots: ['threshold', 'pale_void'], defaultOutfit: 'threshold', style: 'silhouette' },
  { id: 'fog_absence', archetype: 'dread_sparse', kind: 'none', label: 'Fog absence (empty)', defaultScale: 0.2, placements: ['mid'], vibeTags: ['scary', 'spoken'], outfitSlots: ['pale_void', 'empty_chair'], defaultOutfit: 'pale_void', style: 'dream' },
  { id: 'staircase_ascender', archetype: 'dread_sparse', kind: 'silhouette', label: 'Staircase ascender', defaultScale: 0.5, placements: ['mid', 'sky'], vibeTags: ['scary', 'tense'], outfitSlots: ['threshold', 'dread_coat'], defaultOutfit: 'threshold', style: 'silhouette' },

  // —— void_presence ——
  { id: 'white_void_whisper', archetype: 'void_presence', kind: 'silhouette', label: 'White-void whisper', defaultScale: 0.5, placements: ['mid'], vibeTags: ['scary', 'awe'], outfitSlots: ['pale_void', 'aisle_linen'], defaultOutfit: 'pale_void', style: 'dream' },
  { id: 'red_void_stain', archetype: 'void_presence', kind: 'silhouette', label: 'Red-void stain figure', defaultScale: 0.55, placements: ['mid'], vibeTags: ['scary', 'chaotic'], outfitSlots: ['pale_void', 'ember_coat'], defaultOutfit: 'pale_void', style: 'silhouette' },
  { id: 'barely_there', archetype: 'void_presence', kind: 'silhouette', label: 'Barely-there', defaultScale: 0.35, placements: ['mid', 'sky'], vibeTags: ['scary'], outfitSlots: ['pale_void'], defaultOutfit: 'pale_void', style: 'dream' },

  // —— spoken_intimate ——
  { id: 'close_confessor', archetype: 'spoken_intimate', kind: 'figure_lone', label: 'Close confessor', defaultScale: 0.95, placements: ['foreground'], vibeTags: ['spoken'], outfitSlots: ['room_clothes', 'desk_lamp'], defaultOutfit: 'room_clothes', style: 'silhouette' },
  { id: 'desk_lamp_thinker', archetype: 'spoken_intimate', kind: 'figure_lone', label: 'Desk-lamp thinker', defaultScale: 0.9, placements: ['foreground'], vibeTags: ['spoken'], outfitSlots: ['desk_lamp', 'room_clothes'], defaultOutfit: 'desk_lamp', style: 'dream' },
  { id: 'empty_chair_proxy', archetype: 'spoken_intimate', kind: 'none', label: 'Empty chair (lyric owns)', defaultScale: 0.5, placements: ['foreground', 'mid'], vibeTags: ['spoken'], outfitSlots: ['empty_chair', 'room_clothes'], defaultOutfit: 'empty_chair', style: 'silhouette' },
  { id: 'hoodie_listener', archetype: 'spoken_intimate', kind: 'figure_lone', label: 'Hoodie listener', defaultScale: 0.9, placements: ['foreground'], vibeTags: ['spoken', 'peaceful'], outfitSlots: ['room_clothes'], defaultOutfit: 'room_clothes', style: 'silhouette' },
  { id: 'window_rain_speaker', archetype: 'spoken_intimate', kind: 'figure_lone', label: 'Window-rain speaker', defaultScale: 0.85, placements: ['foreground', 'mid'], vibeTags: ['spoken'], outfitSlots: ['room_clothes', 'water_gloss', 'desk_lamp'], defaultOutfit: 'desk_lamp', style: 'dream' },
  { id: 'bed_edge_voice', archetype: 'spoken_intimate', kind: 'figure_lone', label: 'Bed-edge voice', defaultScale: 0.8, placements: ['foreground'], vibeTags: ['spoken'], outfitSlots: ['room_clothes', 'empty_chair'], defaultOutfit: 'room_clothes', style: 'silhouette' },

  // —— cosmic_dissolve ——
  { id: 'star_dissolve', archetype: 'cosmic_dissolve', kind: 'figure_lone', label: 'Star dissolve', defaultScale: 1.0, placements: ['sky', 'mid'], vibeTags: ['awe', 'peaceful'], outfitSlots: ['star_dust', 'pale_void'], defaultOutfit: 'star_dust', style: 'dream' },
  { id: 'orbit_fade', archetype: 'cosmic_dissolve', kind: 'silhouette', label: 'Orbit fade', defaultScale: 0.85, placements: ['sky'], vibeTags: ['awe'], outfitSlots: ['star_dust', 'aisle_linen'], defaultOutfit: 'star_dust', style: 'dream' },
  { id: 'nebula_outline', archetype: 'cosmic_dissolve', kind: 'silhouette', label: 'Nebula outline', defaultScale: 1.1, placements: ['sky', 'mid'], vibeTags: ['awe', 'euphoric'], outfitSlots: ['star_dust', 'chrome_candy'], defaultOutfit: 'star_dust', style: 'neon' },

  // —— extras / cross-family dream variants ——
  { id: 'kid_guardian_pair', archetype: 'tableau_figure', kind: 'duo', label: 'Kid + guardian', defaultScale: 0.85, placements: ['mid', 'foreground'], vibeTags: ['peaceful', 'narrative', 'spoken'], outfitSlots: ['linen_dawn', 'room_clothes', 'highway_dust'], defaultOutfit: 'linen_dawn', style: 'dream' },
  { id: 'hooded_pilgrim', archetype: 'pastoral_walker', kind: 'traveler', label: 'Hooded pilgrim', defaultScale: 0.85, placements: ['mid'], vibeTags: ['peaceful', 'awe'], outfitSlots: ['moss_trail', 'aisle_linen', 'highway_dust'], defaultOutfit: 'moss_trail', style: 'silhouette' },
  { id: 'royal_light_crown', archetype: 'sacred_solitary', kind: 'figure_lone', label: 'Royal light-crown', defaultScale: 1.0, placements: ['mid', 'foreground'], vibeTags: ['awe', 'euphoric'], outfitSlots: ['aisle_linen', 'star_dust', 'stage_gloss'], defaultOutfit: 'star_dust', style: 'dream' },
  { id: 'robot_neon_avatar', archetype: 'neon_runner', kind: 'figure_lone', label: 'Robot neon avatar', defaultScale: 1.0, placements: ['mid', 'foreground'], vibeTags: ['groove', 'euphoric'], outfitSlots: ['neon_trim', 'chrome_candy', 'industrial_hazard'], defaultOutfit: 'neon_trim', style: 'neon' },
  { id: 'rain_walker_red', archetype: 'neon_runner', kind: 'traveler', label: 'Rain walker red', defaultScale: 0.95, placements: ['mid', 'foreground'], vibeTags: ['groove', 'tense'], outfitSlots: ['after_hours_red', 'water_gloss', 'highway_dust'], defaultOutfit: 'after_hours_red', style: 'neon' },
  { id: 'ash_warrior', archetype: 'chaos_fracture', kind: 'beast', label: 'Ash warrior', defaultScale: 1.25, placements: ['foreground', 'mid'], vibeTags: ['chaotic'], outfitSlots: ['ember_coat', 'industrial_hazard', 'fracture_rag'], defaultOutfit: 'ember_coat', style: 'silhouette' },
  { id: 'ghost_congregation', archetype: 'formation_crew', kind: 'congregation', label: 'Ghost congregation', defaultScale: 1.0, placements: ['mid'], vibeTags: ['chorus', 'scary', 'awe'], outfitSlots: ['pale_void', 'aisle_linen', 'color_block_crew'], defaultOutfit: 'pale_void', style: 'dream' },
  { id: 'duo_parting', archetype: 'tableau_figure', kind: 'duo', label: 'Duo parting', defaultScale: 0.9, placements: ['mid', 'foreground'], vibeTags: ['narrative', 'spoken'], outfitSlots: ['room_clothes', 'highway_dust', 'linen_dawn'], defaultOutfit: 'room_clothes', style: 'silhouette' },
  { id: 'dancer_solo_hook', archetype: 'pop_candy', kind: 'dancer', label: 'Dancer solo hook', defaultScale: 1.1, placements: ['foreground'], vibeTags: ['euphoric', 'chorus'], outfitSlots: ['stage_gloss', 'chrome_candy', 'neon_trim'], defaultOutfit: 'stage_gloss', style: 'neon' },
  { id: 'void_throne_empty', archetype: 'void_presence', kind: 'none', label: 'Void throne empty', defaultScale: 0.4, placements: ['mid'], vibeTags: ['scary', 'spoken', 'awe'], outfitSlots: ['pale_void', 'empty_chair'], defaultOutfit: 'pale_void', style: 'dream' }
];

const CHAR_BY_ID = new Map(CHARACTERS.map(c => [c.id, c]));

/** Verse-locked archetypes (MUSIC-BRIEF) */
const VERSE_ARCHETYPES = ['tableau_figure', 'pastoral_walker', 'spoken_intimate', 'dread_sparse'];
/** Chorus widen / heroic (same family) — never for spoken */
const CHORUS_ARCHETYPES = ['formation_crew', 'neon_runner', 'pop_candy', 'fg_performer'];

/**
 * Pick archetype from vibe family + section (roster rules).
 * @param {object} dom dominantVibe result
 * @param {object} opts { sectionType, afterGate }
 */
export function pickArchetype(dom, opts = {}) {
  const family = dom?.family || 'neutral';
  const ladder = dom?.ladder || family;
  const speechLike = !!dom?.speechLike || ladder === 'spoken';
  const sec = opts.sectionType || 'verse';
  const afterGate = !!opts.afterGate;
  const aggressive = ladder === 'aggressive' || family === 'chaotic' || !!dom?.aggressive;

  if (speechLike || family === 'spoken' || ladder === 'spoken') return 'spoken_intimate';

  // Aggressive ladder ALWAYS fractures — never pastoral/neon meadow cast
  // Vocalist hub: fg_performer lead silhouette (not fauna/crowd) when vocal focus —
  // still chaos_fracture on full aggressive swarm sections, but verse/pre prefer fg lead.
  const vocalFocus = !!opts.vocalFocus;
  if (aggressive) {
    if (afterGate || sec === 'breakdown' || sec === 'outro') return 'ash_survivor';
    if (vocalFocus && (sec === 'verse' || sec === 'pre' || sec === 'intro')) return 'fg_performer';
    return 'chaos_fracture';
  }
  if (vocalFocus && !speechLike && family !== 'peaceful' && ladder !== 'peaceful' && family !== 'scary') {
    // Lead silhouette over fauna/crowd when vocalish owns the frame
    if (sec === 'chorus' && family === 'warm') return 'fg_performer';
    if (sec !== 'breakdown' && sec !== 'drop') return 'fg_performer';
  }

  if (family === 'peaceful' || ladder === 'peaceful') {
    if (sec === 'chorus') return 'pastoral_walker'; // no formation spam on peace
    if (sec === 'outro') return 'cosmic_dissolve';
    return opts.preferFauna ? 'nature_fauna' : 'pastoral_walker';
  }
  if (family === 'scary' || ladder === 'scary') {
    return sec === 'chorus' ? 'void_presence' : 'dread_sparse';
  }
  if (family === 'warm' || ladder === 'warm') {
    // Groove traveler / performer — chorus may widen to formation
    if (sec === 'chorus') return opts.heroic === 'pop' ? 'pop_candy' : 'fg_performer';
    if (sec === 'outro') return 'neon_runner';
    return 'neon_runner';
  }
  if (family === 'tense' || ladder === 'tense') {
    // Braced tableau — not pastoral, not chaos swarm
    if (sec === 'chorus' || sec === 'drop') return 'fg_performer';
    return 'tableau_figure';
  }
  if (family === 'chaotic') {
    if (afterGate || sec === 'breakdown' || sec === 'outro') return 'ash_survivor';
    return 'chaos_fracture';
  }

  // Neutral / groove / narrative by section
  if (sec === 'verse' || sec === 'intro' || sec === 'pre') {
    return 'tableau_figure';
  }
  if (sec === 'chorus') {
    // widen SAME narrative family → formation OR heroic
    if (opts.heroic === 'neon') return 'neon_runner';
    if (opts.heroic === 'pop') return 'pop_candy';
    if (opts.heroic === 'fg') return 'fg_performer';
    return 'formation_crew';
  }
  if (sec === 'outro') return 'cosmic_dissolve';
  if (sec === 'breakdown' || sec === 'drop') return afterGate ? 'ash_survivor' : 'chaos_fracture';
  return 'tableau_figure';
}

/**
 * Stable character pick under archetype; sticky id across chorus.repeat.
 */
export function pickCharacter(archetypeId, opts = {}) {
  const pool = CHARACTERS.filter(c => c.archetype === archetypeId);
  if (!pool.length) return null;
  // Sticky: prefer previous characterId if still in pool
  if (opts.stickyId && CHAR_BY_ID.has(opts.stickyId)) {
    const prev = CHAR_BY_ID.get(opts.stickyId);
    if (prev.archetype === archetypeId) return prev;
    // same family widen — keep if chorus upgrade path
    if (opts.allowFamilyWiden && prev.vibeTags?.some(t => pool[0].vibeTags?.includes(t))) {
      /* fall through to new archetype char but caller may keep sticky */
    }
  }
  // vibeTags filter
  const tags = opts.vibeTags || [];
  let candidates = pool;
  if (tags.length) {
    const tagged = pool.filter(c => tags.some(t => c.vibeTags.includes(t)));
    if (tagged.length) candidates = tagged;
  }
  // packFamily soft filter via vibeTags
  if (opts.packFamily === 'nature') {
    const n = candidates.filter(c => c.vibeTags.includes('peaceful'));
    if (n.length) candidates = n;
  } else if (opts.packFamily === 'scary') {
    const n = candidates.filter(c => c.vibeTags.includes('scary'));
    if (n.length) candidates = n;
  } else if (opts.packFamily === 'chaos') {
    const n = candidates.filter(c => c.vibeTags.includes('chaotic'));
    if (n.length) candidates = n;
  } else if (opts.packFamily === 'spoken') {
    const n = candidates.filter(c => c.vibeTags.includes('spoken'));
    if (n.length) candidates = n;
  }
  // Deterministic hash from conceptId / seed
  const seed = String(opts.seed || opts.conceptId || archetypeId || '');
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return candidates[h % candidates.length];
}

export function pickOutfit(character, dom, opts = {}) {
  if (!character) return 'room_clothes';
  const family = dom?.family || 'neutral';
  // Skip empty_chair — Characters-on needs a drawable coat/cloak wedge (MUSIC-BRIEF cast-detail)
  const slots = (character.outfitSlots || [character.defaultOutfit]).filter(id => id && id !== 'empty_chair');
  const prefer = {
    peaceful: ['linen_dawn', 'moss_trail', 'water_gloss', 'aisle_linen'],
    chaotic: ['fracture_rag', 'industrial_hazard', 'ember_coat'],
    scary: ['dread_coat', 'pale_void', 'threshold'],
    spoken: ['room_clothes', 'desk_lamp'],
    euphoric: ['chrome_candy', 'stage_gloss', 'color_block_crew'],
    groove: ['after_hours_red', 'neon_trim', 'highway_dust'],
    awe: ['star_dust', 'aisle_linen', 'pale_void']
  };
  // Archetype wedge bias (MUSIC-BRIEF cast-detail) before vibe prefer list
  const archPrefer = {
    sacred_solitary: ['aisle_linen', 'star_dust', 'pale_void'],
    pastoral_walker: ['moss_trail', 'linen_dawn', 'highway_dust', 'water_gloss'],
    nature_fauna: ['moss_trail', 'linen_dawn', 'water_gloss'],
    fg_performer: ['after_hours_red', 'stage_gloss', 'industrial_hazard', 'neon_trim'],
    pop_candy: ['chrome_candy', 'stage_gloss', 'color_block_crew'],
    neon_runner: ['after_hours_red', 'neon_trim', 'highway_dust'],
    formation_crew: ['color_block_crew', 'stage_gloss', 'neon_trim'],
    chaos_fracture: ['fracture_rag', 'industrial_hazard', 'ember_coat'],
    ash_survivor: ['ember_coat', 'fracture_rag'],
    dread_sparse: ['dread_coat', 'threshold', 'pale_void'],
    void_presence: ['pale_void', 'aisle_linen'],
    spoken_intimate: ['room_clothes', 'desk_lamp'],
    tableau_figure: ['room_clothes', 'desk_lamp', 'highway_dust'],
    cosmic_dissolve: ['star_dust', 'pale_void', 'aisle_linen']
  };
  const archList = archPrefer[character.archetype] || [];
  for (const id of archList) {
    if (slots.includes(id)) {
      // Chorus: allow brighter rim within slots further down archList / chorus prefs
      if (opts.sectionType === 'chorus') break;
      return id;
    }
  }
  const list = prefer[family] || prefer[opts.vibeTag] || [];
  for (const id of list) {
    if (slots.includes(id)) return id;
  }
  // If chorus and we deferred arch hit, take first arch slot then chorus brighten
  if (opts.sectionType === 'chorus') {
    for (const id of archList) {
      if (slots.includes(id)) {
        // fall through to chorus amplify below for brighter rim when available
        break;
      }
    }
  }
  // Chorus amplify: brighter rim / trim within SAME silhouette family (no full wardrobe swap)
  if (opts.sectionType === 'chorus') {
    for (const id of ['stage_gloss', 'color_block_crew', 'ember_coat', 'neon_trim', 'star_dust', 'linen_dawn']) {
      if (slots.includes(id)) return id;
    }
  }
  const def = character.defaultOutfit !== 'empty_chair' ? character.defaultOutfit : null;
  return def || slots[0] || 'room_clothes';
}

/**
 * Build directive cast fields from library + lyric action.
 * Keeps backward-compat singleton kind/action/placement/count/opacity.
 */
export function resolveLibraryCast(opts = {}) {
  const {
    dom = null,
    sectionType = 'verse',
    conceptId = null,
    action = 'stand',
    placement = null,
    stickyCharacterId = null,
    packFamily = null,
    afterGate = false,
    holdSilent = false,
    count = null,
    opacity = null,
    scale = null
  } = opts;

  // Pack-family heroic bias (neon highway / candy / perform)
  const pf = String(packFamily || '').toLowerCase();
  let heroic;
  if (/neon|highway/.test(pf)) heroic = 'neon';
  else if (/candy|pop|happy/.test(pf)) heroic = 'pop';
  else if (/stage|perform|club/.test(pf)) heroic = 'fg';

  const archetypeId = pickArchetype(dom, {
    sectionType, afterGate, heroic,
    vocalFocus: !!opts.vocalFocus
  });
  // Spoken LOCK — never formation upgrade
  let lockedArchetype = (dom?.speechLike || dom?.family === 'spoken')
    ? 'spoken_intimate'
    : archetypeId;
  // HOLD: neon/highway packs → neon_runner — BUT never override aggressive ladder cast
  const ladderAgg = dom?.ladder === 'aggressive' || dom?.family === 'chaotic' || !!dom?.aggressive;
  if (heroic === 'neon' && lockedArchetype !== 'spoken_intimate' && !ladderAgg) {
    lockedArchetype = 'neon_runner';
  }
  if (ladderAgg && lockedArchetype !== 'ash_survivor') {
    lockedArchetype = (opts.afterGate || sectionType === 'breakdown' || sectionType === 'outro')
      ? 'ash_survivor'
      : 'chaos_fracture';
  }

  const character = pickCharacter(lockedArchetype, {
    stickyId: stickyCharacterId,
    conceptId,
    seed: conceptId || lockedArchetype,
    packFamily,
    vibeTags: dom?.family ? [dom.family === 'peaceful' ? 'peaceful' : dom.family === 'chaotic' ? 'chaotic' : dom.family === 'scary' ? 'scary' : dom.family === 'spoken' ? 'spoken' : 'narrative'] : []
  });

  const outfitId = pickOutfit(character, dom, { sectionType });
  const arch = ARCHETYPES[lockedArchetype];
  const kind = character?.kind || arch?.kind || 'figure_lone';
  const style = character?.style || OUTFITS[outfitId]?.style || 'silhouette';
  const place = placement || character?.placements?.[0] || 'mid';

  let members = [];
  if (character && kind !== 'none') {
    members = [{
      characterId: character.id,
      outfitId,
      kind,
      placement: place,
      scale: scale || character.defaultScale || 0.85,
      opacity: opacity ?? (holdSilent ? 0.4 : 0.7),
      action: action || 'stand',
      holdSilent: !!holdSilent,
      roleId: 'vocalish'
    }];
    // Formation widen: duplicate members with same character family
    if (lockedArchetype === 'formation_crew' && (count || 0) > 1) {
      const n = Math.min(6, count || 4);
      const roleSeq = roleSequenceForSection({
        sectionType,
        speechLike: !!(dom?.speechLike || dom?.family === 'spoken'),
        vibeFamily: dom?.family || 'neutral',
        archetype: lockedArchetype,
        count: n,
        allowHarsh: lockedArchetype === 'chaos_fracture'
      });
      members = [];
      for (let i = 0; i < n; i++) {
        const rid = roleSeq[i] || (i === 0 ? 'vocalish' : 'snare');
        const bind = ROLE_BINDINGS[rid] || ROLE_BINDINGS.vocalish;
        members.push({
          characterId: character.id,
          outfitId: outfitId === 'color_block_crew' ? outfitId : (character.outfitSlots[i % character.outfitSlots.length]),
          kind: 'crowd_ghosts',
          placement: bind.placement || (i % 2 === 0 ? 'mid' : 'foreground'),
          scale: (character.defaultScale || 1) * (0.9 + i * 0.03),
          opacity: opacity ?? 0.75,
          action: action || 'stand',
          holdSilent: false,
          roleId: rid
        });
      }
    } else {
      // Stamp roleIds on whatever members we built (verse hub = vocalish)
      assignRoleIds(members, {
        sectionType,
        speechLike: !!(dom?.speechLike || dom?.family === 'spoken'),
        vibeFamily: dom?.family || 'neutral',
        archetype: lockedArchetype
      });
    }
  }

  return {
    // backward-compat singleton
    kind: kind === 'fauna' ? 'silhouette' : kind,
    action: action || 'stand',
    placement: place,
    count: members.length || (kind === 'none' ? 0 : 1),
    opacity: opacity ?? (holdSilent ? 0.4 : 0.7),
    scale: scale || arch?.scale || 'human',
    holdSilent: !!holdSilent,
    // library directive fields
    archetype: lockedArchetype,
    characterId: character?.id || null,
    outfitId,
    style,
    members,
    label: character?.label || arch?.staging || null
  };
}

export function getCharacter(id) {
  return CHAR_BY_ID.get(id) || null;
}

export function listArchetypes() {
  return Object.keys(ARCHETYPES);
}

export function rosterStats() {
  return {
    archetypes: Object.keys(ARCHETYPES).length,
    characters: CHARACTERS.length,
    outfits: Object.keys(OUTFITS).length
  };
}

export { VERSE_ARCHETYPES, CHORUS_ARCHETYPES };

/* ─── ROLE AGENTS (ROLE-AGENTS-20260924-2133) ───────────────────────────
 * roles.* → persistent body agents. Lyrics = WHAT; role-agents = HOW band
 * appears in body. Bind once per section; spike only mutates intensity.
 */
export const ROLE_IDS = Object.freeze([
  'vocalish', 'kick', 'snare', 'hats', 'bass', 'pads', 'lead', 'harsh'
]);

/** roleId → placement / bias / spike action / kind hint */
export const ROLE_BINDINGS = Object.freeze({
  vocalish: {
    placement: 'foreground',
    scaleBias: 1.06,
    opacityBias: 1.1,
    actionOnSpike: 'pulse',
    defaultKind: 'figure_lone',
    hub: true
  },
  lead: {
    placement: 'foreground',
    scaleBias: 1.08,
    opacityBias: 1.12,
    actionOnSpike: 'pulse',
    defaultKind: 'figure_lone',
    hub: true
  },
  kick: {
    placement: 'mid',
    scaleBias: 1.04,
    opacityBias: 1.06,
    actionOnSpike: 'pulse',
    defaultKind: 'silhouette',
    ground: true
  },
  snare: {
    placement: 'mid',
    scaleBias: 1.03,
    opacityBias: 1.08,
    actionOnSpike: 'pulse',
    defaultKind: 'silhouette',
    companion: true
  },
  hats: {
    placement: 'sky',
    scaleBias: 0.88,
    opacityBias: 1.12,
    actionOnSpike: 'pulse',
    defaultKind: 'fauna',
    sparks: true
  },
  bass: {
    placement: 'mid',
    scaleBias: 1.18,
    opacityBias: 0.95,
    actionOnSpike: 'stand',
    defaultKind: 'silhouette',
    weight: true
  },
  pads: {
    placement: 'sky',
    scaleBias: 0.82,
    opacityBias: 0.9,
    actionOnSpike: 'pulse',
    defaultKind: 'silhouette',
    atmosphere: true
  },
  harsh: {
    placement: 'mid',
    scaleBias: 1.12,
    opacityBias: 1.15,
    actionOnSpike: 'flee',
    defaultKind: 'crowd_ghosts',
    chaosOnly: true
  }
});

/** rolesIntent / roles.* key → spike value for each roleId */
export const ROLE_SPIKE_MAP = Object.freeze({
  vocalish: 'leadBeam',
  lead: 'leadBeam',
  kick: 'kickPunch',
  snare: 'snareFlash',
  hats: 'hatsSparks',
  bass: 'bassWeight',
  pads: 'padsWash',
  harsh: 'harshGlitch'
});

const SPIKE_THRESHOLD = 0.5;
const CHAOS_ARCH = new Set(['chaos_fracture', 'ash_survivor']);
const PEACE_ARCH = new Set(['pastoral_walker', 'nature_fauna', 'sacred_solitary', 'spoken_intimate']);

function _clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}

/**
 * Resolve live spike 0..1 for a roleId from rolesIntent-shaped or raw roles object.
 */
export function roleSpikeValue(roleId, roles = {}) {
  if (!roles || typeof roles !== 'object') return 0;
  const key = ROLE_SPIKE_MAP[roleId];
  // Prefer rolesIntent keys (kickPunch…); fall back to raw audio.roles ids
  let v = 0;
  if (key && roles[key] != null) v = roles[key];
  else if (roles[roleId] != null) v = roles[roleId];
  else if (roleId === 'vocalish' || roleId === 'lead') {
    v = Math.max(roles.leadBeam || 0, roles.lead || 0, roles.vocalish || 0);
  } else if (roleId === 'kick') v = roles.kickPunch ?? roles.kick ?? 0;
  else if (roleId === 'snare') v = roles.snareFlash ?? roles.snare ?? 0;
  else if (roleId === 'hats') v = roles.hatsSparks ?? roles.hats ?? 0;
  else if (roleId === 'bass') v = roles.bassWeight ?? roles.bass ?? 0;
  else if (roleId === 'pads') v = roles.padsWash ?? roles.pads ?? 0;
  else if (roleId === 'harsh') v = roles.harshGlitch ?? roles.harsh ?? 0;
  return _clamp01(v);
}

/**
 * Recommended roleId sequence for a section (distinct, sticky-friendly).
 * Spoken → vocalish + pads only. Harsh only when chaos archetype allowed.
 */
export function roleSequenceForSection(opts = {}) {
  const {
    sectionType = 'verse',
    speechLike = false,
    vibeFamily = 'neutral',
    archetype = null,
    count = 1,
    allowHarsh = false
  } = opts;

  const chaosOk = allowHarsh || CHAOS_ARCH.has(archetype) || vibeFamily === 'chaotic';
  const scary = vibeFamily === 'scary';
  const peace = vibeFamily === 'peaceful' || PEACE_ARCH.has(archetype);

  if (speechLike || vibeFamily === 'spoken') {
    return count >= 2 ? ['vocalish', 'pads'] : ['vocalish'];
  }

  const n = Math.max(1, Math.min(6, count | 0));
  /** @type {string[]} */
  let seq = ['vocalish'];

  if (sectionType === 'chorus' || sectionType === 'drop') {
    if (n >= 2) seq.push('kick');
    if (n >= 3) seq.push(peace ? 'pads' : 'snare');
    if (n >= 4) seq.push(peace ? 'hats' : 'pads');
    if (n >= 5) seq.push(scary || chaosOk ? 'bass' : 'hats');
    if (n >= 6 && chaosOk) seq.push('harsh');
  } else if (sectionType === 'breakdown') {
    seq = chaosOk ? ['vocalish', 'harsh'] : ['vocalish', 'pads'];
    if (n >= 3 && chaosOk) seq.push('kick');
  } else {
    // verse / intro / pre / bridge / outro — hub only; optional pads atmosphere
    if (n >= 2) seq.push(peace || sectionType === 'outro' ? 'pads' : 'kick');
    if (n >= 3) seq.push(peace ? 'hats' : 'snare');
  }

  // Strip harsh unless chaos-gated
  if (!chaosOk) seq = seq.filter(r => r !== 'harsh');
  // Peace: no harsh, bass stays as weight (roleId ok) but no competing beast body
  if (peace) seq = seq.filter(r => r !== 'harsh');

  // Ensure unique + length
  const seen = new Set();
  const out = [];
  for (const r of seq) {
    if (seen.has(r)) continue;
    seen.add(r);
    out.push(r);
    if (out.length >= n) break;
  }
  while (out.length < n) {
    // fill remaining with pads/hats before duplicating vocalish
    const fill = ['pads', 'hats', 'snare', 'kick', 'bass'].find(r => !seen.has(r));
    if (!fill) break;
    seen.add(fill);
    out.push(fill);
  }
  if (!out.length) out.push('vocalish');
  return out;
}

/**
 * Assign distinct roleIds onto members (mutates). Uses stickyRoleIds when provided.
 * @returns {object[]} members
 */
export function assignRoleIds(members, opts = {}) {
  if (!Array.isArray(members) || !members.length) return members || [];
  const sticky = Array.isArray(opts.stickyRoleIds) ? opts.stickyRoleIds : null;
  const seq = sticky && sticky.length
    ? sticky
    : roleSequenceForSection({
        sectionType: opts.sectionType,
        speechLike: opts.speechLike,
        vibeFamily: opts.vibeFamily,
        archetype: opts.archetype,
        count: members.length,
        allowHarsh: opts.allowHarsh
      });

  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    if (!m) continue;
    // Sticky wins; else seq; else keep existing; else vocalish on first
    const rid = (sticky && sticky[i]) || seq[i] || m.roleId || (i === 0 ? 'vocalish' : 'pads');
    m.roleId = ROLE_BINDINGS[rid] ? rid : (i === 0 ? 'vocalish' : 'pads');
    const bind = ROLE_BINDINGS[m.roleId];
    if (bind?.placement && (!m.placement || opts.forcePlacement)) {
      // Prefer binding placement for non-hub companions when unset / sky-misplaced
      if (m.roleId !== 'vocalish' && m.roleId !== 'lead') {
        m.placement = bind.placement;
      }
    }
  }
  return members;
}

/**
 * Expand members for chorus / spoken pads so role agents have bodies.
 * Does NOT reshuffle sticky characterIds — clones hub for new slots.
 * @returns {object[]}
 */
export function ensureRoleAgents(members, opts = {}) {
  const list = Array.isArray(members) ? members.map(m => ({ ...m })) : [];
  if (!list.length) return list;

  const {
    sectionType = 'verse',
    speechLike = false,
    vibeFamily = 'neutral',
    archetype = null,
    targetCount = null
  } = opts;

  const hub = list[0];
  let want = targetCount;
  if (want == null) {
    if (speechLike || vibeFamily === 'spoken') want = Math.max(list.length, 2); // vocalish + pads
    else if (sectionType === 'chorus' || sectionType === 'drop') want = Math.max(list.length, 3);
    else want = list.length; // verse: keep as-is (usually 1 vocalish)
  }
  // Spoken: never Fantasia-widen past lead+pads
  if (speechLike || vibeFamily === 'spoken') want = Math.min(want, 2);
  // Peace chorus: allow pads/hats but not harsh swarm
  want = Math.max(1, Math.min(6, want));

  const chaosOk = CHAOS_ARCH.has(archetype) || vibeFamily === 'chaotic';
  const seq = roleSequenceForSection({
    sectionType,
    speechLike,
    vibeFamily,
    archetype,
    count: want,
    allowHarsh: chaosOk
  });

  while (list.length < want && list.length < seq.length) {
    const roleId = seq[list.length];
    const bind = ROLE_BINDINGS[roleId] || ROLE_BINDINGS.pads;
    // harsh: never invent on pastoral/spoken
    if (roleId === 'harsh' && !chaosOk) break;
    const clone = {
      characterId: hub.characterId,
      outfitId: hub.outfitId,
      kind: bind.defaultKind === 'fauna' ? 'silhouette' : (bind.defaultKind || hub.kind),
      placement: bind.placement || 'mid',
      scale: (typeof hub.scale === 'number' ? hub.scale : 0.85) * (bind.scaleBias ? Math.min(1, bind.scaleBias * 0.85) : 0.75),
      opacity: Math.max(0.35, (hub.opacity ?? 0.7) * 0.75),
      action: hub.action || 'stand',
      holdSilent: !!hub.holdSilent,
      roleId,
      // mark as role-agent companion (Visual may ignore)
      roleAgent: true
    };
    // hats peace → fauna hint; bass scary/chaos may look beast-ish via kind
    if (roleId === 'hats' && (vibeFamily === 'peaceful' || archetype === 'nature_fauna')) {
      clone.kind = 'silhouette';
      clone.placement = 'sky';
    }
    if (roleId === 'bass' && (vibeFamily === 'scary' || chaosOk)) {
      clone.kind = 'beast';
      clone.scale = (typeof hub.scale === 'number' ? hub.scale : 0.9) * 1.15;
    }
    if (roleId === 'pads') {
      clone.kind = 'silhouette';
      clone.placement = 'sky';
      clone.opacity = Math.min(clone.opacity, 0.55);
    }
    list.push(clone);
  }

  return list;
}

/**
 * Apply live role spikes onto members (opacity/scale/action/roleSpike/rolePulse).
 * Ensures distinct roleIds; expands companions for chorus when needed.
 * Sticky: pass stickyRoleIds to avoid reshuffle across ticks.
 *
 * Additive fields Visual can ignore: roleId, roleSpike, rolePulse, holdOthers.
 *
 * @param {object[]} members
 * @param {object} roles rolesIntent or audio.roles
 * @param {object} opts
 * @returns {object[]}
 */
export function applyRoleBinding(members, roles = {}, opts = {}) {
  const {
    sectionType = 'verse',
    speechLike = false,
    vibeFamily = 'neutral',
    archetype = null,
    stickyRoleIds = null,
    threshold = SPIKE_THRESHOLD,
    expand = true,
    holdOthers = true
  } = opts;

  let list = Array.isArray(members) ? members.map(m => ({ ...m })) : [];
  if (!list.length) return list;

  if (expand) {
    list = ensureRoleAgents(list, {
      sectionType,
      speechLike,
      vibeFamily,
      archetype,
      targetCount: stickyRoleIds?.length || null
    });
  }

  assignRoleIds(list, {
    sectionType,
    speechLike,
    vibeFamily,
    archetype,
    stickyRoleIds,
    allowHarsh: CHAOS_ARCH.has(archetype) || vibeFamily === 'chaotic'
  });

  // Strip forbidden harsh on peace/spoken pastoral
  const chaosOk = CHAOS_ARCH.has(archetype) || vibeFamily === 'chaotic';
  if (!chaosOk) {
    list = list.filter(m => m.roleId !== 'harsh');
    if (!list.length) return members.map(m => ({ ...m })); // safety
  }
  // Spoken: keep only vocalish/lead + pads
  if (speechLike || vibeFamily === 'spoken') {
    list = list.filter(m => m.roleId === 'vocalish' || m.roleId === 'lead' || m.roleId === 'pads');
    if (!list.length) list = [{ ...members[0], roleId: 'vocalish' }];
  }

  const spikes = {};
  for (const rid of ROLE_IDS) spikes[rid] = roleSpikeValue(rid, roles);

  // Any agent currently spiked?
  let anySpike = false;
  for (const m of list) {
    if (spikes[m.roleId] >= threshold) { anySpike = true; break; }
  }

  // bass weight applies to ground companion (kick) or hub if no kick
  const bassSpike = spikes.bass;
  const groundIdx = list.findIndex(m => m.roleId === 'kick' || m.roleId === 'bass');
  const hubIdx = list.findIndex(m => m.roleId === 'vocalish' || m.roleId === 'lead');

  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const rid = m.roleId || 'vocalish';
    const bind = ROLE_BINDINGS[rid] || ROLE_BINDINGS.vocalish;
    const spike = spikes[rid] || 0;
    const baseOp = m.opacity != null ? m.opacity : 0.7;
    const baseSc = typeof m.scale === 'number' ? m.scale : 0.85;
    const baseAction = m._baseAction || m.action || 'stand';
    // remember lyric WHAT action once
    if (!m._baseAction) m._baseAction = baseAction;

    if (spike >= threshold) {
      m.roleSpike = true;
      m.rolePulse = spike;
      m.opacity = Math.min(1, baseOp * (bind.opacityBias || 1) * (0.92 + spike * 0.12));
      let scMul = bind.scaleBias || 1;
      // bass breathes weight into ground / hub
      if ((rid === 'kick' || rid === 'bass' || i === groundIdx) && bassSpike > 0.35) {
        scMul *= 1 + bassSpike * 0.12;
      }
      m.scale = baseSc * scMul * (0.95 + spike * 0.08);
      // Spike action from binding — amplify walk→run when hub + high vocal
      let act = bind.actionOnSpike || baseAction;
      if ((rid === 'vocalish' || rid === 'lead') && spike >= 0.7) {
        if (baseAction === 'walk') act = 'run';
        else if (baseAction === 'stand') act = 'pulse';
        else act = baseAction; // keep lyric WHAT when expressive
      }
      if (rid === 'harsh') act = 'flee';
      m.action = act === 'pulse' ? (baseAction === 'stand' ? 'stand' : baseAction) : act;
      // store pulse flag even if action stays lyric
      if (act === 'pulse') m.rolePulse = Math.max(m.rolePulse, spike);
      m.holdOthers = false;
    } else {
      m.roleSpike = false;
      m.rolePulse = spike * 0.35;
      // HOLD — keep base opacity, freeze action to prior / hold
      m.opacity = baseOp;
      m.scale = baseSc;
      if (holdOthers && anySpike) {
        m.action = 'hold';
      } else {
        m.action = m._baseAction || baseAction;
      }
      m.holdOthers = !!(holdOthers && anySpike);
    }

    // lead beam accent: if role is vocalish and leadSpike high, nudge scale slightly
    if (rid === 'vocalish' && spikes.lead >= threshold) {
      m.scale = (typeof m.scale === 'number' ? m.scale : baseSc) * 1.04;
      m.rolePulse = Math.max(m.rolePulse || 0, spikes.lead);
    }
  }

  // Ensure hub always has a roleId
  if (hubIdx >= 0 && !list[hubIdx].roleId) list[hubIdx].roleId = 'vocalish';
  for (const m of list) {
    if (!m.roleId) m.roleId = 'pads';
  }

  return list;
}

/* ─── WEAPONS (MOVIE-NOTES-WAR-WEAPONS-20260924-2135 SoT) ───────────────
 * Story glyphs, not arsenal cosplay. Lyric + vibe gated. Never random.
 * Visual draws weaponId on/near bound cast; may ignore until wired.
 */
export const WEAPON_IDS = Object.freeze([
  'none',
  'handgun_beat',
  'rifle_silhouette',
  'burden_suit',
  'scrap_turret',
  'ash_aftermath',
  'riot_baton',
  'scope_flash'
]);

export const WEAPON_META = Object.freeze({
  none:             { grip: 'none',    framing: 'face',   label: 'None', duration: 'hold' },
  handgun_beat:     { grip: 'one_hand', framing: 'weapon', label: 'Handgun beat', duration: '1beat' },
  rifle_silhouette: { grip: 'world',   framing: 'bg',     label: 'Rifle silhouette', duration: 'texture' },
  burden_suit:      { grip: 'suit',    framing: 'body',   label: 'Burden suit', duration: 'hold' },
  scrap_turret:     { grip: 'world',   framing: 'world',  label: 'Scrap turret', duration: 'function' },
  ash_aftermath:    { grip: 'discard', framing: 'face',   label: 'Ash aftermath', duration: 'release' },
  riot_baton:       { grip: 'one_hand', framing: 'weapon', label: 'Riot baton', duration: 'beat' },
  scope_flash:      { grip: 'pov',     framing: 'ecu',    label: 'Scope flash', duration: '1beat' }
});

const WEAPON_ARCH = new Set(['ash_survivor', 'chaos_fracture', 'fg_performer', 'dread_sparse']);
const WAR_PACKS = new Set(['warzone', 'chaos']);
const WAR_PRESETS = new Set(['apocalyptic_warzone', 'reality_fracture', 'red_void', 'burning_desert']);
/** Lyric concepts that earn weapons (war/gun/bomb/soldier/riot/blood…) */
const CONFLICT_CONCEPTS = new Set([
  'war_battle', 'rage', 'betrayal', 'falling_apart', 'storm_chaos',
  'running_from_self', 'death_void', 'rising_fire'
]);
const FORBID_WEAPON_ARCH = new Set([
  'pastoral_walker', 'nature_fauna', 'sacred_solitary', 'spoken_intimate',
  'pop_candy', 'cosmic_dissolve', 'tableau_figure'
]);

function _hashSeed(seed) {
  let h = 0;
  const s = String(seed || 'war');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Gate: lyric conflict AND/OR vibe chaos|scary on chaos_fracture|ash_survivor|warzone.
 * Forbidden: peace/spoken/nature_fauna/pastoral unless explicit lyric irony (1 phrase).
 */
export function weaponsAllowed(opts = {}) {
  const {
    archetype = null,
    vibeFamily = 'neutral',
    packFamily = null,
    conceptId = null,
    preset = null,
    speechLike = false,
    lyricIrony = false,
    ladder = null,
    aggression = 0,
    genreFamily = null,
    genreWeaponsAllowed = null
  } = opts;

  const L = String(ladder || vibeFamily || 'neutral');
  const softGenre = /folk|ambient|gospel|classical|spoken|rnb|jazz/.test(String(genreFamily || ''));
  // Soft/peaceful/spoken / soft ballad — NEVER (Music BRIEF vocalist-weapons)
  if (speechLike || vibeFamily === 'spoken' || L === 'spoken' || L === 'peaceful') return false;
  if (vibeFamily === 'peaceful' || FORBID_WEAPON_ARCH.has(archetype)) {
    return !!(lyricIrony && CONFLICT_CONCEPTS.has(conceptId));
  }
  if (softGenre && (aggression || 0) < 0.55 && L !== 'aggressive') return false;
  if (genreWeaponsAllowed === false && L !== 'aggressive' && (aggression || 0) < 0.6) return false;
  // Never neon-meadow + rifle
  if (/meadow|candy|gospel_light|country_porch|neon_highway/.test(String(preset || ''))) return false;

  const archOk = WEAPON_ARCH.has(archetype) || archetype === 'fg_performer';
  const vibeOk = vibeFamily === 'chaotic' || vibeFamily === 'scary'
    || L === 'aggressive' || L === 'scary' || (aggression || 0) >= 0.55;
  const packOk = WAR_PACKS.has(String(packFamily || '').toLowerCase())
    || WAR_PRESETS.has(String(preset || '').toLowerCase())
    || /war|chaos|apocalypse|fracture|metal/.test(String(packFamily || ''))
    || /apocalyptic_warzone|reality_fracture|metal_hall|red_void/.test(String(preset || ''));
  const lyricOk = CONFLICT_CONCEPTS.has(conceptId);

  // Earned: (aggression/chaos high OR lyric/concept war) on war-capable body/pack
  if (!(archOk || packOk || lyricOk)) return false;
  return !!(vibeOk || packOk || lyricOk);
}

/**
 * Musical release / heal: clear weapon or switch to ash_aftermath.
 */
export function weaponOnRelease(opts = {}) {
  const { sectionType = 'verse', afterGate = false, vibeFamily = 'neutral', priorWeaponId = null } = opts;
  if (vibeFamily === 'peaceful' || vibeFamily === 'spoken') return 'none';
  if (sectionType === 'outro' || afterGate || sectionType === 'breakdown') {
    if (priorWeaponId && priorWeaponId !== 'none') return 'ash_aftermath';
    return 'none';
  }
  return null; // no release override
}

/**
 * Deterministic weapon pick — Movie grammar pools. Never random roulette.
 * Prefer: handgun_beat (ruthless), burden_suit/ash_aftermath (weight),
 * rifle_silhouette (BG), scrap_turret (world-function chaos).
 */
export function pickWeaponId(opts = {}) {
  const release = weaponOnRelease(opts);
  if (release != null) return release === 'none' ? 'none' : release;

  if (!weaponsAllowed(opts)) return 'none';

  // Sticky: reuse prior weapon for section life unless release/force
  if (opts.stickyWeaponId && opts.stickyWeaponId !== 'none' && !opts.forceRepick) {
    return opts.stickyWeaponId;
  }

  const arch = opts.archetype;
  const concept = opts.conceptId;
  const vibe = opts.vibeFamily;
  let pool;

  if (arch === 'ash_survivor') {
    pool = ['burden_suit', 'ash_aftermath', 'handgun_beat'];
  } else if (arch === 'chaos_fracture') {
    pool = ['scrap_turret', 'handgun_beat', 'riot_baton', 'rifle_silhouette'];
  } else if (arch === 'fg_performer') {
    pool = ['handgun_beat', 'riot_baton', 'scope_flash'];
  } else if (arch === 'dread_sparse' || vibe === 'scary') {
    pool = ['rifle_silhouette', 'scope_flash', 'burden_suit'];
  } else {
    pool = ['handgun_beat', 'rifle_silhouette', 'riot_baton', 'scrap_turret'];
  }

  // Concept primary (meaningful, not roulette) — pool is fallback only
  const CONCEPT_PRIMARY = {
    war_battle: 'scrap_turret',
    rage: 'handgun_beat',
    betrayal: 'handgun_beat',
    death_void: 'burden_suit',
    falling_apart: 'ash_aftermath',
    rising_fire: 'scrap_turret',
    storm_chaos: 'riot_baton',
    running_from_self: 'handgun_beat'
  };
  if (concept && CONCEPT_PRIMARY[concept]) {
    // ash_survivor lyric conflict → prefer burden/aftermath weight
    if (arch === 'ash_survivor' && (concept === 'war_battle' || concept === 'death_void')) {
      return concept === 'death_void' ? 'burden_suit' : 'burden_suit';
    }
    if (arch === 'fg_performer' && CONCEPT_PRIMARY[concept] === 'scrap_turret') {
      return 'handgun_beat'; // FG keeps ruthless beat, not world turret
    }
    return CONCEPT_PRIMARY[concept];
  }
  if (concept === 'war_battle') pool = ['scrap_turret', 'handgun_beat', 'rifle_silhouette', 'burden_suit'];
  else if (concept === 'rage') pool = ['handgun_beat', 'riot_baton', 'scrap_turret'];
  else if (concept === 'betrayal') pool = ['handgun_beat', 'riot_baton'];
  else if (concept === 'death_void' || concept === 'falling_apart') pool = ['burden_suit', 'ash_aftermath', 'rifle_silhouette'];
  else if (concept === 'rising_fire' || concept === 'storm_chaos') pool = ['scrap_turret', 'handgun_beat', 'riot_baton'];

  // Scary peak → allow scope_flash in pool head
  if (vibe === 'scary' && !pool.includes('scope_flash')) {
    pool = ['scope_flash', ...pool];
  }

  const h = _hashSeed(opts.conceptId || opts.archetype || opts.characterId || 'war');
  return pool[h % pool.length];
}

/**
 * Attach weaponId onto FG hub (crosshair). BG agents may get rifle_silhouette only.
 * Pads/hats never armed. On release → none | ash_aftermath.
 * Additive — Visual ignores safely. Sticky via stickyWeaponId.
 * @returns {object[]}
 */
export function applyWeaponBinding(members, opts = {}) {
  const list = Array.isArray(members) ? members.map(m => ({ ...m })) : [];
  if (!list.length) return list;

  const allowed = weaponsAllowed(opts);
  const releaseId = weaponOnRelease(opts);

  if (!allowed && releaseId == null) {
    for (const m of list) m.weaponId = 'none';
    return list;
  }

  let weaponId = releaseId != null
    ? releaseId
    : pickWeaponId({
        ...opts,
        characterId: list[0]?.characterId,
        stickyWeaponId: opts.stickyWeaponId || null
      });

  if (!weaponId) weaponId = 'none';

  for (const m of list) {
    const rid = m.roleId || '';
    // Atmosphere agents never hold weapons
    if (rid === 'pads' || rid === 'hats') {
      m.weaponId = 'none';
      continue;
    }
    // FG hub / harsh keep the story weapon (crosshair with face OR weapon)
    if (rid === 'vocalish' || rid === 'lead' || rid === 'harsh' || !rid) {
      m.weaponId = weaponId;
      continue;
    }
    // Ground kick may share burden/baton; snare/bass get BG rifle texture only
    if (rid === 'kick') {
      m.weaponId = (weaponId === 'burden_suit' || weaponId === 'riot_baton' || weaponId === 'ash_aftermath')
        ? weaponId
        : (weaponId === 'none' ? 'none' : 'none');
      continue;
    }
    if (rid === 'snare' || rid === 'bass') {
      // Children of Men: rifles as BG world texture — never steal FG crosshair
      m.weaponId = (weaponId !== 'none' && allowed) ? 'rifle_silhouette' : 'none';
      continue;
    }
    m.weaponId = 'none';
  }
  return list;
}


/** Visual draw vocab: dance|step|spin|sway|groove|freestyle|formation (+ freeze/still mapped) */
export const DANCE_ANIMS = new Set([
  'dance', 'step', 'spin', 'sway', 'groove', 'freestyle', 'formation', 'still', 'walk', 'hold'
]);

/**
 * When genre/vibe body wants motion — emit anim, danceEnergy, danceIntent for Visual.
 * Spoken/scary freeze; pastoral soft sway; groove/chorus freestyle|formation.
 * ROLE-AGENTS: kick|snare|hats spike >0.45 drive footwork on that member.
 * cast.action = lyric WHAT may stay; danceIntent = HOW body moves for Visual.
 */
export function applyDanceIntent(members, cast = {}, opts = {}) {
  const list = Array.isArray(members) ? members.map(m => ({ ...m })) : [];
  const {
    sectionType = 'verse',
    speechLike = false,
    vibeFamily = 'neutral',
    danceBias = 'mid', // high|mid|low from genreMap
    intensity = 0.5,
    chorusRepeat = 1,
    afterGate = false,
    roles = null,
    archetype = null,
    ladder = null,
    aggression = 0,
    energy = null
  } = opts;

  const family = String(vibeFamily || 'neutral');
  const L = String(ladder || family || 'neutral');
  const bias = String(danceBias || 'mid');
  const arch = String(archetype || cast.archetype || '');
  const energyN = typeof energy === 'number' ? energy : intensity;
  const aggN = typeof aggression === 'number' ? aggression : 0;
  const aggressive = L === 'aggressive' || family === 'chaotic' || aggN >= 0.55
    || arch === 'chaos_fracture' || arch === 'ash_survivor';
  const warm = L === 'warm' || family === 'warm';
  const tense = L === 'tense' || family === 'tense';
  // MUSIC-BRIEF cast-detail: never force dance on pastoral / sacred / spoken
  const antiDanceArch = arch === 'pastoral_walker' || arch === 'sacred_solitary'
    || arch === 'nature_fauna' || arch === 'spoken_intimate' || arch === 'cosmic_dissolve';
  const freeze = speechLike || family === 'spoken' || family === 'scary' || L === 'spoken' || L === 'scary';
  const pastoral = (!aggressive && (family === 'peaceful' || L === 'peaceful' || bias === 'low' || antiDanceArch));
  // Mid R&B/soul/jazz pocket → sway (bias mid, not high club)
  const softPocket = !freeze && !pastoral && !aggressive && bias === 'mid'
    && (sectionType === 'verse' || sectionType === 'pre' || sectionType === 'bridge');
  const danceWins = !freeze && !pastoral && (
    aggressive
    || warm
    || bias === 'high'
    || (bias !== 'low' && (sectionType === 'chorus' || family === 'chaotic' || /euphoric|groove|club/.test(family)))
  );

  // Base intent for the cast hub — ladder maps motion (CEO spin/orbit/travel)
  let danceIntent = 'still';
  let danceEnergy = 0.15;
  if (freeze) {
    // spoken / scary — still or micro-sway; NO spin thrash
    danceIntent = speechLike ? 'sway' : 'still';
    danceEnergy = speechLike ? 0.18 : 0.08;
  } else if (pastoral) {
    // pastoral / sacred: walk or soft sway only — never freestyle/spin
    danceIntent = sectionType === 'chorus' ? 'sway' : 'walk';
    danceEnergy = sectionType === 'chorus' ? 0.28 : 0.22;
  } else if (aggressive) {
    // High aggression/energy → spin (orbit camera paired in scenePlan); travel path ok
    const hi = energyN >= 0.55 || aggN >= 0.55 || sectionType === 'drop' || sectionType === 'chorus';
    if (hi) {
      danceIntent = 'spin';
      danceEnergy = Math.min(1, 0.55 + intensity * 0.35 + aggN * 0.2);
    } else {
      danceIntent = 'freestyle';
      danceEnergy = Math.min(1, 0.4 + intensity * 0.25);
    }
  } else if (warm) {
    // Warm groove — freestyle/sway + light travel, not warzone spin
    if (sectionType === 'chorus') {
      danceIntent = bias === 'high' ? 'freestyle' : 'groove';
      danceEnergy = Math.min(1, 0.45 + intensity * 0.3);
    } else {
      danceIntent = 'sway';
      danceEnergy = 0.32;
    }
  } else if (tense) {
    danceIntent = sectionType === 'chorus' ? 'step' : 'walk';
    danceEnergy = sectionType === 'chorus' ? 0.38 : 0.28;
  } else if (softPocket) {
    danceIntent = 'sway';
    danceEnergy = 0.32;
  } else if (sectionType === 'pre') {
    danceIntent = 'sway';
    danceEnergy = 0.28;
  } else if (afterGate || sectionType === 'drop') {
    danceIntent = 'dance'; // 1-beat hit pose energy
    danceEnergy = Math.min(1, 0.55 + intensity * 0.3);
  } else if (danceWins && sectionType === 'chorus' && (bias === 'high' || chorusRepeat >= 1)) {
    danceIntent = (bias === 'high' && chorusRepeat >= 1) ? 'formation' : 'freestyle';
    danceEnergy = Math.min(1, 0.55 + intensity * 0.35 + (chorusRepeat - 1) * 0.1);
  } else if (danceWins) {
    danceIntent = bias === 'high' ? 'groove' : 'freestyle';
    danceEnergy = Math.min(1, 0.4 + intensity * 0.3);
  } else if (family === 'chaotic') {
    danceIntent = 'spin';
    danceEnergy = Math.min(1, 0.45 + intensity * 0.25);
  } else {
    danceIntent = 'step';
    danceEnergy = 0.25;
  }

  // Map Music Researcher body language onto Visual action when cast.action is generic
  const lyricAction = cast.action || 'stand';
  let visualAction = lyricAction;
  if (DANCE_ANIMS.has(lyricAction)) {
    visualAction = lyricAction;
  } else if (danceWins) {
    visualAction = danceIntent === 'formation' ? 'formation'
      : danceIntent === 'still' ? 'sway'
      : danceIntent;
  } else if (freeze) {
    visualAction = danceIntent === 'sway' ? 'sway' : 'still';
  } else if (lyricAction === 'walk' || lyricAction === 'run') {
    visualAction = lyricAction === 'run' ? 'step' : 'walk';
  } else {
    visualAction = danceIntent === 'walk' ? 'walk' : (freeze ? 'still' : 'sway');
  }

  const r = roles || {};
  const kick = Math.max(r.kickPunch || 0, r.kick || 0);
  const snare = Math.max(r.snareFlash || 0, r.snare || 0);
  const hats = Math.max(r.hatsSparks || 0, r.hats || 0);

  for (const m of list) {
    const rid = m.roleId || 'vocalish';
    let anim = danceIntent;
    let energy = danceEnergy;
    // Atmosphere pads: soft sway only
    if (rid === 'pads') {
      anim = freeze ? 'still' : 'sway';
      energy = Math.min(energy, 0.3);
    } else if (rid === 'hats' && hats > 0.45 && !freeze) {
      anim = 'spin';
      energy = Math.min(1, energy + 0.15);
    } else if (rid === 'kick' && kick > 0.45 && !freeze) {
      anim = 'step';
      energy = Math.min(1, energy + 0.2);
    } else if (rid === 'snare' && snare > 0.45 && !freeze) {
      anim = danceIntent === 'formation' ? 'formation' : 'dance';
      energy = Math.min(1, energy + 0.15);
    } else if (rid === 'vocalish' || rid === 'lead') {
      anim = visualAction === 'formation' && sectionType === 'chorus' ? 'formation' : visualAction;
    }
    if (freeze && anim !== 'sway') anim = 'still';
    m.anim = anim;
    m.danceEnergy = energy;
    m.danceIntent = anim;
    // Keep lyric action on member; Visual prefers anim/danceIntent for motion
    if (!m.action || m.action === 'stand' || m.action === 'walk') {
      if (danceWins && !freeze) m.action = anim === 'formation' ? 'formation' : (anim === 'still' ? 'still' : anim);
    }
  }

  cast.dance = danceWins && !freeze;
  cast.danceIntent = danceIntent;
  cast.danceEnergy = danceEnergy;
  // Visual also reads cast.action dance vocab when present
  if (danceWins && !freeze) {
    cast.action = visualAction;
  } else if (freeze) {
    cast.action = danceIntent === 'sway' ? 'sway' : 'still';
  }
  return list;
}


/** Map legacy string scale names → numeric (Visual Number('human') === NaN). */
function _numericScale(v, floor = 1.0) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(floor, v);
  const s = String(v || '').toLowerCase();
  const map = {
    intimate: 2.0, human: 2.2, cinematic: 2.4, epic: 2.8, cosmic: 3.2
  };
  if (map[s] != null) return Math.max(floor, map[s]);
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(floor, n) : floor;
}

/**
 * MUSIC-BRIEF cast-detail: archetype → silhouette wedge (coat/cloak/robe/torn).
 * Continuity: stay in slots; chorus may brighten rim within family — never empty_chair.
 */
function _archetypeOutfitWedge(archetype, vibeFamily, sectionType) {
  const arch = String(archetype || '');
  const fam = String(vibeFamily || 'neutral');
  const chorus = sectionType === 'chorus' || sectionType === 'drop';
  // fg_performer / pop_candy → sharp jacket / candy coat flare
  // Genre lean (MUSIC-BRIEF vocalist-weapons): metal torn / pop jacket / folk cloak
  if (arch === 'fg_performer') {
    if (fam === 'chaotic' || fam === 'aggressive') return chorus ? 'ember_coat' : 'fracture_rag';
    if (fam === 'peaceful') return chorus ? 'linen_dawn' : 'moss_trail';
    if (fam === 'spoken' || fam === 'scary') return 'room_clothes';
    return chorus ? 'stage_gloss' : 'after_hours_red';
  }
  if (arch === 'pop_candy') return chorus ? 'stage_gloss' : 'chrome_candy';
  if (arch === 'neon_runner') return chorus ? 'neon_trim' : 'after_hours_red';
  if (arch === 'formation_crew') return chorus ? 'stage_gloss' : 'color_block_crew';
  // pastoral_walker → soft cloak / long coat
  if (arch === 'pastoral_walker' || arch === 'nature_fauna') {
    return chorus ? 'linen_dawn' : (fam === 'peaceful' ? 'moss_trail' : 'linen_dawn');
  }
  // sacred_solitary → robe / column
  if (arch === 'sacred_solitary' || arch === 'cosmic_dissolve') {
    return chorus ? 'star_dust' : 'aisle_linen';
  }
  // chaos_fracture → torn / asymmetric coat
  if (arch === 'chaos_fracture' || arch === 'ash_survivor') {
    return chorus ? 'ember_coat' : 'fracture_rag';
  }
  if (arch === 'dread_sparse' || arch === 'void_presence') return 'dread_coat';
  if (arch === 'spoken_intimate' || arch === 'tableau_figure') {
    return fam === 'spoken' || fam === 'scary' ? 'desk_lamp' : 'room_clothes';
  }
  // vibe family fallbacks (no neon-only default)
  if (fam === 'peaceful') return 'linen_dawn';
  if (fam === 'scary') return 'dread_coat';
  if (fam === 'spoken') return 'desk_lamp';
  if (fam === 'chaotic') return chorus ? 'ember_coat' : 'fracture_rag';
  return chorus ? 'neon_trim' : 'highway_dust';
}

/** Resolve real outfitId from character slots + vibe; never empty_chair on Characters-on. */
function _resolveOutfitId(cast, opts = {}) {
  const {
    speechLike = false,
    vibeFamily = 'neutral',
    sectionType = 'verse'
  } = opts;
  const sparseMood = speechLike
    || vibeFamily === 'scary'
    || vibeFamily === 'spoken'
    || cast.archetype === 'dread_sparse'
    || cast.archetype === 'void_presence';

  let outfitId = cast.outfitId;
  if (outfitId && outfitId !== 'empty_chair' && OUTFITS[outfitId]) {
    return outfitId;
  }
  const character = (cast.characterId && CHAR_BY_ID.get(cast.characterId)) || null;
  const dom = { family: vibeFamily === 'neutral' ? null : vibeFamily, speechLike };
  // Prefer sticky character slots (verse→chorus continuity within outfit family)
  if (character) {
    const picked = pickOutfit(character, {
      family: vibeFamily === 'neutral' ? (character.vibeTags?.[0] || 'groove') : vibeFamily,
      speechLike
    }, { sectionType });
    if (picked && picked !== 'empty_chair') return picked;
  }
  const wedge = _archetypeOutfitWedge(cast.archetype, vibeFamily, sectionType);
  if (wedge && wedge !== 'empty_chair') return wedge;
  return sparseMood ? 'desk_lamp' : 'highway_dust';
}

/**
 * High-contrast style for dark LED: prefer OUTFIT neon|dream so coats differentiate.
 * Silhouette-tagged outfits bump to dream (peaceful/spoken) or neon (groove) — never
 * force one neon look for every cast (cast-detail wave).
 */
function _readableStyleForOutfit(outfitId, sparseMood, vibeFamily, existingStyle, ladder = null) {
  const L = String(ladder || vibeFamily || '');
  const aggressive = L === 'aggressive' || L === 'chaotic';
  const candy = /stage_gloss|chrome_candy|color_block_crew|neon_trim/.test(String(outfitId || ''));
  const ashOutfit = /fracture_rag|industrial_hazard|ember_coat|dread_coat|pale_void|threshold/.test(String(outfitId || ''));
  const fromOutfit = OUTFITS[outfitId]?.style;
  // Aggressive: ash/void/harsh readable — kill candy neon + soft dream meadow look
  if (aggressive) {
    if (candy) return 'silhouette';
    if (outfitId === 'ember_coat') return 'neon'; // harsh ember rim OK
    if (fromOutfit === 'dream') return 'silhouette';
    if (fromOutfit === 'silhouette' || fromOutfit === 'neon') return fromOutfit;
    return 'silhouette';
  }
  if (fromOutfit === 'neon' || fromOutfit === 'dream') return fromOutfit;
  if (existingStyle === 'neon' || existingStyle === 'dream') return existingStyle;
  if (sparseMood || vibeFamily === 'peaceful' || vibeFamily === 'spoken' || L === 'peaceful' || L === 'spoken') return 'dream';
  if (L === 'tense' || L === 'scary') return 'silhouette';
  return 'neon';
}

/**
 * P0 QA-2142/2149/1345: Characters-on MUST emit ≥1 READABLE human-scale FG hub.
 * Live fail mode: near-black silhouette on dark rain → invisible; only motif dots
 * read as "speck". Force neon/dream rim style + large numeric scale; hub = members[0].
 * Cast-detail: real outfitId from vibe+archetype (coat/cloak wedge); style from OUTFIT.
 */
export function ensureCastPresence(cast, opts = {}) {
  if (!cast) return cast;
  const {
    speechLike = false,
    vibeFamily = 'neutral',
    sectionType = 'verse',
    ladder = null,
    aggression = 0,
    vocalFocus = false
  } = opts;

  const L = String(ladder || vibeFamily || 'neutral');
  const aggressive = L === 'aggressive' || L === 'chaotic' || aggression >= 0.55
    || cast.archetype === 'chaos_fracture' || cast.archetype === 'ash_survivor';

  const sparseMood = speechLike
    || vibeFamily === 'scary'
    || vibeFamily === 'spoken'
    || L === 'scary'
    || L === 'spoken'
    || cast.archetype === 'dread_sparse'
    || cast.archetype === 'void_presence';

  // Phone LED: Visual targetFrac ~0.60h × (dirScale/1.55). Floor high so body
  // cannot collapse to a dot even if Visual clamps mid-pipeline.
  // HOLD-1345: numeric scale ≥2.4 (spoken/scary ≥2.0 ok)
  const hubScale = sparseMood ? 2.0 : 2.4;
  const hubOpacity = 1;
  const hubPresence = 1;

  if (cast.kind === 'none' || !cast.kind || cast.kind === 'fauna') {
    cast.kind = vocalFocus ? 'figure_lone' : 'traveler';
    cast.count = Math.max(1, cast.count || 1);
    cast.action = cast.action && cast.action !== 'dissolve' ? cast.action : 'walk';
  }
  // VOCALIST shape: hub = fg lead silhouette — not fauna/crowd_ghosts
  if (vocalFocus && !aggressive) {
    if (cast.kind === 'fauna' || cast.kind === 'crowd_ghosts' || cast.kind === 'congregation') {
      cast.kind = 'figure_lone';
      cast.count = 1;
    }
    if (cast.archetype === 'nature_fauna' || cast.archetype === 'formation_crew' || cast.archetype === 'chaos_fracture') {
      // Keep chaos_fracture when aggressive already handled above; here soft vocal lead
      if (cast.archetype !== 'chaos_fracture' && cast.archetype !== 'ash_survivor') {
        cast.archetype = 'fg_performer';
      }
    }
    if (!cast.archetype || cast.archetype === 'pastoral_walker') {
      cast.archetype = sparseMood ? cast.archetype || 'spoken_intimate' : 'fg_performer';
    }
  }
  if (vocalFocus && aggressive && (cast.kind === 'fauna')) {
    cast.kind = 'figure_lone';
    cast.archetype = 'fg_performer';
  }

  // Kill pastoral/fauna defaults when aggressive ladder is live
  if (aggressive && (cast.archetype === 'pastoral_walker' || cast.archetype === 'nature_fauna'
      || !cast.archetype || cast.characterId === 'path_walker_dawn')) {
    cast.archetype = cast.archetype === 'ash_survivor' ? 'ash_survivor' : 'chaos_fracture';
    cast.characterId = cast.characterId && cast.characterId !== 'path_walker_dawn'
      ? cast.characterId
      : 'scatter_runners';
    if (!cast.outfitId || cast.outfitId === 'linen_dawn' || cast.outfitId === 'moss_trail' || cast.outfitId === 'stage_gloss') {
      cast.outfitId = 'fracture_rag';
    }
  }

  cast.characterId = cast.characterId || (
    aggressive ? 'scatter_runners'
      : sparseMood ? 'close_confessor'
        : (L === 'warm' ? 'rain_highway_runner' : (L === 'tense' ? 'doorway_pause' : 'path_walker_dawn'))
  );
  cast.archetype = (cast.archetype === 'nature_fauna' || !cast.archetype)
    ? (aggressive ? 'chaos_fracture' : sparseMood ? 'spoken_intimate' : (L === 'warm' ? 'neon_runner' : 'fg_performer'))
    : cast.archetype;
  // Real outfit from vibe+archetype (not neon-only stage_gloss default)
  cast.outfitId = _resolveOutfitId(cast, { speechLike, vibeFamily: aggressive ? 'chaotic' : vibeFamily, sectionType });
  if (aggressive && (/linen_dawn|moss_trail|stage_gloss|chrome_candy|water_gloss/.test(cast.outfitId || ''))) {
    cast.outfitId = 'fracture_rag';
  }
  const readableStyle = _readableStyleForOutfit(
    cast.outfitId, sparseMood, vibeFamily, cast.style, L
  );
  cast.style = readableStyle;
  cast.placement = 'foreground';
  cast.opacity = hubOpacity;
  cast.presence = hubPresence;
  cast.scale = Math.max(hubScale, _numericScale(cast.scale, hubScale));
  cast.holdSilent = false;
  cast.count = Math.max(1, cast.count || 1);
  cast.readableCast = true; // Visual may honor for fill/rim boost

  let members = Array.isArray(cast.members) ? cast.members.map(m => ({ ...m })) : [];
  if (!members.length) {
    members = [{
      characterId: cast.characterId,
      outfitId: cast.outfitId,
      archetype: cast.archetype,
      kind: cast.kind || 'traveler',
      style: readableStyle,
      placement: 'foreground',
      scale: hubScale,
      opacity: hubOpacity,
      presence: hubPresence,
      action: cast.action || 'walk',
      roleId: 'vocalish',
      holdSilent: false,
      readableCast: true,
      // Carry dance fields if already stamped (scenePlan may re-apply after)
      danceIntent: cast.danceIntent || null,
      danceEnergy: cast.danceEnergy || 0,
      anim: cast.danceIntent || null,
      dance: !!cast.dance
    }];
  }

  for (const m of members) {
    if (!m) continue;
    m.scale = _numericScale(m.scale, 1.2);
    if (typeof m.opacity === 'string') m.opacity = Number(m.opacity) || hubOpacity;
    if (m.kind === 'none' || m.kind === 'fauna') m.kind = cast.kind || 'traveler';
    // Always non-empty outfitId on members (Characters-on acceptance)
    if (!m.outfitId || m.outfitId === 'empty_chair') {
      m.outfitId = cast.outfitId;
    }
    m.holdSilent = false;
  }

  let hubIdx = members.findIndex(m => m && (m.roleId === 'vocalish' || m.roleId === 'lead'));
  if (hubIdx < 0) {
    hubIdx = members.findIndex(m => m && m.roleId !== 'pads' && m.roleId !== 'hats' && m.roleId !== 'harsh');
  }
  if (hubIdx < 0) hubIdx = 0;

  const hub = members[hubIdx];
  hub.characterId = hub.characterId || cast.characterId;
  hub.outfitId = (!hub.outfitId || hub.outfitId === 'empty_chair')
    ? cast.outfitId
    : hub.outfitId;
  hub.archetype = (hub.archetype === 'nature_fauna' ? cast.archetype : hub.archetype) || cast.archetype;
  hub.kind = (hub.kind && hub.kind !== 'none' && hub.kind !== 'fauna')
    ? hub.kind
    : (cast.kind || 'traveler');
  hub.style = readableStyle;
  hub.placement = 'foreground';
  hub.scale = Math.max(hubScale, _numericScale(hub.scale, 0));
  hub.opacity = hubOpacity;
  hub.presence = hubPresence;
  hub.holdSilent = false;
  hub.roleId = hub.roleId || 'vocalish';
  hub.action = hub.action || cast.action || 'walk';
  hub.readableCast = true;
  // Kill fauna / empty-chair look on the only body that must read
  if (Array.isArray(hub.accessories)) {
    hub.accessories = hub.accessories.filter(a => a !== 'fauna' && a !== 'empty_chair');
  }

  if (hubIdx !== 0) {
    members.splice(hubIdx, 1);
    members.unshift(hub);
  } else {
    members[0] = hub;
  }

  // Verse / spoken: keep ONE hub only — companions read as extra dots on phone
  if (sectionType === 'verse' || sectionType === 'pre' || sectionType === 'intro'
      || sparseMood || sectionType === 'outro') {
    members = [hub];
  }

  // Final pass: every remaining member has outfitId + readable style
  for (const m of members) {
    if (!m) continue;
    if (!m.outfitId || m.outfitId === 'empty_chair') m.outfitId = cast.outfitId;
    if (m === hub || m.roleId === 'vocalish' || m.roleId === 'lead') {
      m.style = readableStyle;
    } else if (!m.style || m.style === 'silhouette') {
      m.style = _readableStyleForOutfit(m.outfitId, sparseMood, vibeFamily, m.style, L);
    }
  }

  cast.characterId = hub.characterId;
  cast.outfitId = hub.outfitId;
  cast.archetype = hub.archetype;
  cast.kind = hub.kind;
  cast.style = readableStyle;
  cast.members = members;
  cast.presence = hubPresence;
  cast.scale = hub.scale;
  cast.opacity = hubOpacity;
  cast.placement = 'foreground';
  cast.count = members.length;

  return cast;
}
