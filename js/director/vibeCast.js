/**
 * Vibe → cast / pack-family helpers (VIBE-TAXONOMY-20260924-2125).
 * Soft-consume audio.vibe when present; safe no-ops if Audio mid-wave.
 *
 * audio.vibe = { peaceful, calm, chaotic, scary, tense, speechLike, nonGroove } 0..1
 */

const VIBE_THRESH = 0.42;
const SPEECH_THRESH = 0.45;

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
    speechLike: 0, nonGroove: 0
  };
  if (!src || typeof src !== 'object') return z;
  for (const k of Object.keys(z)) {
    const v = src[k];
    if (typeof v === 'number' && Number.isFinite(v)) {
      z[k] = Math.max(0, Math.min(1, v));
    }
  }
  // calm aliases peaceful
  if (z.calm > z.peaceful) z.peaceful = z.calm;
  else z.calm = z.peaceful;
  return z;
}

/**
 * Dominant vibe family for routing.
 * speechLike|nonGroove override → 'spoken'
 * else argmax of peaceful/chaotic/scary; tense is anticipation bias (not a family alone).
 * @returns {{ family: string, vibe: object, speechLike: boolean, tenseBias: number }}
 */
export function dominantVibe(audio, opts = {}) {
  const vibe = readVibe(audio, opts);
  const speechLike = (opts.speechLike === true)
    || vibe.speechLike >= SPEECH_THRESH
    || vibe.nonGroove >= SPEECH_THRESH;

  if (speechLike) {
    return { family: 'spoken', vibe, speechLike: true, tenseBias: vibe.tense };
  }

  const scores = {
    peaceful: Math.max(vibe.peaceful, vibe.calm),
    chaotic: vibe.chaotic,
    scary: vibe.scary
  };
  let family = 'neutral';
  let best = VIBE_THRESH;
  for (const [k, v] of Object.entries(scores)) {
    if (v > best) {
      best = v;
      family = k;
    }
  }
  // tense alone → anticipation bias without swapping family
  return {
    family,
    vibe,
    speechLike: false,
    tenseBias: vibe.tense
  };
}

/** Pack family id for ScenePlanner PACK_FAMILIES */
export function vibePackFamily(dom) {
  switch (dom?.family) {
    case 'peaceful': return 'nature';
    case 'chaotic': return 'chaos';
    case 'scary': return 'scary';
    case 'spoken': return 'spoken';
    default: return null;
  }
}

/**
 * Lead presets for vibe family (Worlds IDs in flight).
 * Soft-alias meadow/fracture resolved by scenePlan._normalizePreset.
 */
export function vibeLeadPresets(dom) {
  switch (dom?.family) {
    case 'peaceful':
      return ['meadow_fauna', 'misty_lake', 'forest', 'spoken_word_bed', 'ocean', 'snow', 'dream_clouds', 'cozy_autumn'];
    case 'chaotic':
      return ['reality_fracture', 'apocalyptic_warzone', 'storm', 'red_void', 'industrial_tunnel', 'burning_desert'];
    case 'scary':
      return ['dark_sparse', 'white_void', 'endless_staircase', 'ancient_ruins', 'snow', 'industrial_tunnel'];
    case 'spoken':
      return ['spoken_word_bed', 'white_void', 'forest', 'ocean', 'dream_clouds', 'misty_lake'];
    default:
      return [];
  }
}

/** Soft genre-family bias; vibe congruence always filters the result. */
export function genreLeadPresets(hint) {
  switch (String(hint || 'unknown').toLowerCase()) {
    case 'classical': return ['orchestral_hall', 'cathedral_space', 'space', 'dream_clouds'];
    case 'jazz': return ['jazz_club', 'soul_room', 'rainy_city', 'cathedral_space'];
    case 'metal': return ['metal_hall', 'industrial_tunnel', 'storm', 'red_void'];
    case 'ambient': return ['ambient_field', 'white_void', 'dream_clouds', 'spoken_word_bed'];
    case 'hiphop': return ['hiphop_block', 'rainy_city', 'industrial_tunnel'];
    case 'folk': return ['country_porch', 'meadow_fauna', 'forest', 'empty_highway', 'misty_lake'];
    case 'edm': return ['club_floor', 'led_wall', 'futuristic_city'];
    case 'spoken': return ['spoken_word_bed', 'white_void', 'soul_room'];
    default: return [];
  }
}

/**
 * Presets that are incongruent as a lead/bed for a vibe family.
 * Keep this list in the vibe layer so pre-plan and live repair share one rule.
 */
export function vibeForbiddenPresets(dom) {
  switch (dom?.family) {
    case 'peaceful':
      return [
        'neon_highway', 'empty_highway', 'futuristic_city', 'led_wall', 'rainy_city',
        'apocalyptic_warzone', 'reality_fracture', 'red_void', 'industrial_tunnel'
      ];
    case 'spoken':
      return [
        'neon_highway', 'futuristic_city', 'led_wall', 'apocalyptic_warzone',
        'reality_fracture', 'red_void', 'industrial_tunnel'
      ];
    case 'scary':
      return ['meadow_fauna', 'candy_happy', 'neon_highway'];
    case 'chaotic':
      // Keep earned non-neon worlds valid, but escape city/LED beds when chaos
      // arrives live so the chaos leads can actually take over.
      return ['neon_highway', 'led_wall', 'rainy_city', 'futuristic_city'];
    default:
      return [];
  }
}

/**
 * Apply vibe HOW-modulation onto a post-section cast (WHO already from figureFromConcept).
 * Mutates fields on `cast` and returns it.
 */
export function applyVibeToCast(cast, dom, opts = {}) {
  if (!cast) return cast;
  const family = dom?.family || 'neutral';
  const speechLike = !!dom?.speechLike;
  const sectionType = opts.sectionType || 'verse';
  const out = { ...cast };

  out.vibeBias = family;
  out.speechLike = speechLike;

  if (speechLike || family === 'spoken') {
    // Intimate single or none; lyric world owns frame; holdSilent more
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

  if (family === 'peaceful') {
    // Calm kinds; soft actions; lower count; nature mid; avoid beast/flee
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

  if (family === 'chaotic') {
    // Fracture — crowd_ghosts / silhouettes, flee/rise, higher count, mid+fg; allow beast
    if (out.kind === 'none') out.kind = 'silhouette';
    if (out.kind === 'figure_lone' || out.kind === 'traveler') {
      // keep WHO but allow fracture widen
      if ((opts.intensify || 0) > 0.3 || sectionType === 'drop' || sectionType === 'breakdown' || sectionType === 'chorus') {
        out.kind = opts.allowBeast && out.kind === 'beast' ? 'beast' : 'crowd_ghosts';
        out.count = Math.max(out.count || 1, 3);
      }
    }
    if (out.kind === 'silhouette') out.count = Math.max(out.count || 1, 2);
    if (out.kind === 'crowd_ghosts') out.count = Math.max(3, Math.min(7, out.count || 4));
    if (out.action === 'stand' || out.action === 'kneel') {
      out.action = sectionType === 'drop' || sectionType === 'breakdown' ? 'flee' : 'rise';
    }
    if (out.placement === 'sky') out.placement = 'mid';
    else if (out.placement !== 'foreground') out.placement = 'mid';
    out.opacity = Math.min(1, Math.max(out.opacity ?? 0.7, 0.75));
    return out;
  }

  if (family === 'scary') {
    // Sparse dread — count 1 or none; silhouette; kneel/stand; low opacity; no chorus widen
    if (out.kind === 'beast' || out.kind === 'crowd_ghosts' || out.kind === 'congregation' || out.kind === 'duo') {
      out.kind = 'silhouette';
    }
    if (out.kind !== 'none') out.kind = out.kind === 'traveler' ? 'traveler' : 'silhouette';
    out.count = out.kind === 'none' ? 0 : 1;
    out.action = (out.action === 'flee' || out.action === 'run' || out.action === 'rise')
      ? 'kneel'
      : (out.action === 'walk' ? 'stand' : (out.action || 'stand'));
    if (!['kneel', 'stand'].includes(out.action)) out.action = 'stand';
    // foreground intimate dread, or distant mid — never sky party
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

export { VIBE_THRESH, SPEECH_THRESH };
