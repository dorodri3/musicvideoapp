/**
 * Director casting — emit character INTENTS for Worlds Presets / Visual Engine.
 * Lyrics concepts = WHAT the figure DOES; sections escalate presence.
 * Prefer Lyrics Brain figureFromConcept() when exported (soft import).
 *
 * Placement bands (Worlds): sky | mid | foreground
 * Kinds: silhouette | traveler | duo | crowd_ghosts | beast | figure_lone | congregation | none
 */
/** Soft Lyrics Brain — do not hard-import (lyrics lane may be mid-edit). */
let _semanticMod = null;
async function _loadSemantic() {
  if (_semanticMod) return _semanticMod;
  try { _semanticMod = await import('../lyrics/semantic.js'); }
  catch (_) { _semanticMod = {}; }
  return _semanticMod;
}
function _figureFromConceptSync(concept) {
  // Sync path: only use if already cached; else null (castLibrary still provides WHO)
  try {
    return _semanticMod?.figureFromConcept?.(concept) || null;
  } catch (_) { return null; }
}
const semantic = {
  get figureFromConcept() {
    return _semanticMod?.figureFromConcept;
  }
};
// Fire-and-forget preload
_loadSemantic();

import { dominantVibe, applyVibeToCast, inferSpeechLikeFromRoles, readVibe, readMoment } from './vibeCast.js?v=cohere7';
import { resolveLibraryCast, assignRoleIds, applyWeaponBinding } from './castLibrary.js?v=cohere7';

/** Concept id → base cast seed (kind/action/placement). Overridden by figureFromConcept when present. */
const CONCEPT_CAST = {
  lonely_road:       { kind: 'traveler', action: 'walk', placement: 'mid', count: 1 },
  night_drive:       { kind: 'figure_lone', action: 'stand', placement: 'foreground', count: 1 },
  rain_emotion:      { kind: 'figure_lone', action: 'stand', placement: 'mid', count: 1 },
  city_night:        { kind: 'silhouette', action: 'walk', placement: 'mid', count: 1 },
  sacred_space:      { kind: 'congregation', action: 'kneel', placement: 'mid', count: 3 },
  rising_fire:       { kind: 'beast', action: 'rise', placement: 'mid', count: 1 },
  carrying_weight:   { kind: 'traveler', action: 'walk', placement: 'foreground', count: 1 },
  running_from_self: { kind: 'crowd_ghosts', action: 'flee', placement: 'mid', count: 3 },
  falling_apart:     { kind: 'silhouette', action: 'kneel', placement: 'foreground', count: 1 },
  ocean_depth:       { kind: 'figure_lone', action: 'rise', placement: 'mid', count: 1 },
  storm_chaos:       { kind: 'silhouette', action: 'stand', placement: 'mid', count: 1 },
  forest_lost:       { kind: 'traveler', action: 'walk', placement: 'mid', count: 1 },
  space_void:        { kind: 'figure_lone', action: 'look_up', placement: 'sky', count: 1 },
  heartbreak:        { kind: 'duo', action: 'stand', placement: 'mid', count: 2 },
  love_warmth:       { kind: 'duo', action: 'stand', placement: 'mid', count: 2 },
  loneliness:        { kind: 'figure_lone', action: 'stand', placement: 'foreground', count: 1 },
  nostalgia:         { kind: 'silhouette', action: 'stand', placement: 'mid', count: 1 },
  betrayal:          { kind: 'duo', action: 'flee', placement: 'mid', count: 2 },
  rebirth:           { kind: 'figure_lone', action: 'rise', placement: 'mid', count: 1 },
  time_clocks:       { kind: 'silhouette', action: 'stand', placement: 'mid', count: 1 },
  gold_emptiness:    { kind: 'figure_lone', action: 'kneel', placement: 'foreground', count: 1 },
  death_void:        { kind: 'silhouette', action: 'kneel', placement: 'mid', count: 1 },
  freedom_flight:    { kind: 'figure_lone', action: 'rise', placement: 'sky', count: 1 },
  war_battle:        { kind: 'silhouette', action: 'stand', placement: 'mid', count: 2 },
  dream_surreal:     { kind: 'crowd_ghosts', action: 'walk', placement: 'sky', count: 2 },
  snow_cold:         { kind: 'traveler', action: 'walk', placement: 'mid', count: 1 },
  industrial:        { kind: 'silhouette', action: 'walk', placement: 'mid', count: 1 },
  hope_light:        { kind: 'figure_lone', action: 'look_up', placement: 'mid', count: 1 },
  rage:              { kind: 'beast', action: 'rise', placement: 'foreground', count: 1 },
  home_leaving:      { kind: 'traveler', action: 'walk', placement: 'mid', count: 1 },
  silence_void:      { kind: 'figure_lone', action: 'stand', placement: 'foreground', count: 1 },
  lone_walker:       { kind: 'traveler', action: 'walk', placement: 'mid', count: 1 },
  crowd_sea:         { kind: 'crowd_ghosts', action: 'walk', placement: 'mid', count: 5 }
};

const ACTIONS = new Set(['walk', 'stand', 'kneel', 'rise', 'flee', 'look_up', 'run', 'freestyle', 'formation', 'ritual_gesture', 'still', 'dance', 'step', 'spin', 'sway', 'groove']);
const PLACEMENTS = new Set(['sky', 'mid', 'foreground']);
const KINDS = new Set([
  'silhouette', 'traveler', 'duo', 'crowd_ghosts', 'beast',
  'figure_lone', 'congregation', 'none'
]);

function _clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Map Lyrics Brain figure hint → director cast fields.
 * @param {object|null} figure from figureFromConcept
 */
function _fromFigure(figure) {
  if (!figure || figure.suggestsCharacter === false) {
    return null;
  }
  const role = (figure.role || '').toLowerCase();
  const presence = (figure.presence || '').toLowerCase();
  const blob = `${role} ${presence}`;
  let kind = 'figure_lone';
  // presence crowd = sea of people (crowd_ghosts), not sacred congregation
  if (presence === 'crowd' || /among_many|crowd_sea|sea of/.test(blob)) kind = 'crowd_ghosts';
  else if (/congregation|choir|pew/.test(blob)) kind = 'congregation';
  else if (/beast|monster|phoenix|creature|ember_figure|screamer/.test(blob)) kind = 'beast';
  else if (presence === 'pair' || /duo|pair|lovers|parting/.test(blob)) kind = 'duo';
  else if (/ghost|mirror|doppel|selves/.test(blob)) kind = 'crowd_ghosts';
  else if (/travel|walker|road|runner|driver|leaver|burdened|road_walker/.test(blob)) kind = 'traveler';
  else if (presence === 'silhouette' || /silhouette|witness|city_walker|worker/.test(blob)) kind = 'silhouette';
  else if (presence === 'lone' || presence === 'self') kind = 'figure_lone';

  let action = 'stand';
  if (typeof figure.action === 'string' && ACTIONS.has(figure.action)) action = figure.action;
  else if (/kneel|pray/.test(blob)) action = 'kneel';
  else if (/flee|escape/.test(blob)) action = 'flee';
  else if (/\brun\b|runner/.test(blob)) action = 'run';
  else if (/rise|ascend|soar|leaping|rising_self|dawn/.test(blob)) action = 'rise';
  else if (/walk|travel|driver|leaver|walker/.test(blob)) action = 'walk';
  else if (/look|gaze|sky|tear|drifting/.test(blob)) action = 'look_up';

  let placement = 'mid';
  if (/sky|orbit|float|drifting/.test(blob)) placement = 'sky';
  else if (/fg|foreground|close|intimate|solitary|muted/.test(blob)) placement = 'foreground';

  let count = 1;
  if (kind === 'duo') count = 2;
  if (kind === 'congregation') count = Math.max(3, figure.count || 3);
  if (kind === 'crowd_ghosts') count = Math.max(5, figure.count || 5);
  if (typeof figure.count === 'number') count = Math.max(1, Math.round(figure.count));

  return { kind, action, placement, count };
}

/**
 * Resolve base cast from concept (+ optional Lyrics Brain figure).
 * @param {object|null} concept
 * @returns {{ kind:string, action:string, placement:string, count:number, conceptId:string|null }}
 */
export function castFromConcept(concept) {
  const id = concept?.id || null;
  let seed = id && CONCEPT_CAST[id] ? { ...CONCEPT_CAST[id] } : {
    kind: 'silhouette',
    action: 'stand',
    placement: 'mid',
    count: 1
  };

  if (typeof semantic.figureFromConcept === 'function' && concept) {
    try {
      const fig = semantic.figureFromConcept(concept);
      const mapped = _fromFigure(fig);
      if (mapped) seed = { ...seed, ...mapped };
      else if (fig && fig.suggestsCharacter === false) {
        // HOLD-2149: empty world still needs a readable silhouette (ensureCastPresence floors size)
        seed = {
          kind: 'silhouette',
          action: 'stand',
          placement: 'foreground',
          count: 1
        };
      }
    } catch (_) {
      /* Lyrics Brain figure API optional */
    }
  }

  if (!KINDS.has(seed.kind)) seed.kind = 'silhouette';
  if (!ACTIONS.has(seed.action)) seed.action = 'stand';
  if (!PLACEMENTS.has(seed.placement)) seed.placement = 'mid';

  return {
    kind: seed.kind,
    action: seed.action,
    placement: seed.placement,
    count: seed.count || 1,
    conceptId: id
  };
}

/**
 * Section arc modulates cast: plant → tense → amplify → sparse → alone.
 * Chorus.repeat escalates scale/count/opacity; same cast identity (not a new planet).
 *
 * @param {object} base from castFromConcept
 * @param {object} opts
 * @returns {object} full cast payload
 */
export function modulateCast(base, opts = {}) {
  const {
    sectionType = 'verse',
    chorusRepeat = 1,
    scaleName = 'cinematic',
    holdSilent = false,
    intensify = 0,
    vibe = null,
    speechLike: speechLikeOpt = null,
    audio = null,
    speechSteer = 0,
    expireAggression = false
  } = opts;

  // Soft-consume audio.vibe / speechLike when present (Audio may land mid-wave)
  const dom = dominantVibe(audio, {
    vibe: vibe || opts.vibe || null,
    speechLike: speechLikeOpt === true
      || (typeof speechLikeOpt === 'number' && speechLikeOpt >= 0.45)
      || inferSpeechLikeFromRoles(audio)
  });
  // HOLD-0306: pin WINS — never force spoken family over aggression lock
  const pin = !!(dom.aggressionLock || dom.forbidPastoral
    || dom.martial || dom.orchestralMartial || dom.pinArmed
    || dom.ladder === 'aggressive' || dom.family === 'chaotic'
    || audio?.vibe?.aggressionLock || audio?.vibe?.forbidPastoral
    || audio?.vibe?.martial || audio?.vibe?.orchestralMartial || audio?.vibe?.pinArmed
    || readMoment(audio)?.aggressionLock || readMoment(audio)?.forbidPastoral
    || readMoment(audio)?.martial || readMoment(audio)?.orchestralMartial || readMoment(audio)?.pinArmed);
  const speechLike = pin ? false : (!!dom.speechLike || speechSteer >= 0.45);
  if (!pin && speechLike && !dom.speechLike) {
    dom.family = 'spoken';
    dom.speechLike = true;
  }
  if (pin) {
    dom.speechLike = false;
    if (dom.family === 'spoken' || dom.family === 'peaceful') dom.family = 'chaotic';
    if (dom.ladder === 'spoken' || dom.ladder === 'peaceful') dom.ladder = 'aggressive';
  }

  if (!base || base.kind === 'none') {
    // HOLD-2149: never emit dead cast — Characters-on needs a body every frame
    return {
      kind: 'silhouette',
      count: 1,
      scale: scaleName || 'human',
      placement: 'foreground',
      opacity: speechLike ? 0.7 : 0.85,
      action: 'stand',
      holdSilent: false,
      conceptId: base?.conceptId || null,
      vibeBias: dom.family || 'neutral',
      speechLike: !!speechLike,
      speechSteer: Math.max(0, Math.min(1, speechSteer || 0)),
      suppressDropCast: !!speechLike,
      suppressChorusWiden: true,
      aggressionExpire: true,
      archetype: (dom.ladder === 'aggressive' || dom.family === 'chaotic') ? 'chaos_fracture'
        : (dom.ladder === 'warm' || dom.family === 'warm') ? 'fg_performer'
        : (dom.family === 'peaceful' || dom.ladder === 'peaceful') ? 'pastoral_walker'
        : 'tableau_figure',
      characterId: (dom.ladder === 'aggressive' || dom.family === 'chaotic') ? 'scatter_runners'
        : (dom.ladder === 'warm' || dom.family === 'warm') ? 'mic_stand_lead'
        : 'path_walker_dawn',
      outfitId: (dom.ladder === 'aggressive' || dom.family === 'chaotic') ? 'fracture_rag'
        : (dom.ladder === 'warm' || dom.family === 'warm') ? 'after_hours_red'
        : 'linen_dawn'
    };
  }

  let kind = base.kind;
  let count = base.count || 1;
  let placement = base.placement || 'mid';
  let action = base.action || 'stand';
  let opacity = 0.7;
  let scale = scaleName || 'cinematic';

  switch (sectionType) {
    case 'intro':
      kind = kind === 'beast' ? 'silhouette' : (kind === 'congregation' ? 'silhouette' : kind);
      count = 1;
      opacity = 0.35;
      scale = 'intimate';
      placement = placement === 'sky' ? 'mid' : placement;
      break;
    case 'verse':
      // 1 silhouette path (walker/lone) — plant belonging to lyric
      count = Math.min(2, Math.max(1, count));
      if (kind === 'congregation') {
        kind = 'silhouette';
        count = 1;
      }
      if (kind === 'crowd_ghosts') count = Math.min(2, count);
      opacity = 0.65 + intensify * 0.1;
      scale = scale === 'cosmic' || scale === 'epic' ? 'cinematic' : (scale || 'human');
      break;
    case 'pre':
      // tense / closer / more silhouette
      kind = kind === 'duo' || kind === 'congregation' ? 'silhouette' : kind;
      count = Math.min(2, Math.max(1, count));
      placement = 'foreground';
      opacity = 0.8;
      scale = scale === 'intimate' ? 'human' : scale;
      action = action === 'stand' ? 'walk' : action;
      break;
    case 'chorus': {
      // enlarge/amplify SAME cast; widen formation OR heroic single
      // speechLike / scary: no fake chorus.repeat escalate unless structure says chorus
      // (caller passes real section.type; we still suppress formation widen)
      const rep = (speechLike || dom.family === 'scary')
        ? 1
        : Math.max(1, chorusRepeat || 1);
      opacity = Math.min(1, 0.75 + rep * 0.08 + intensify * 0.05);
      if (rep >= 3 && !speechLike && dom.family !== 'scary') {
        scale = 'epic';
        if (kind === 'silhouette' || kind === 'figure_lone' || kind === 'traveler') {
          // heroic single stays; or widen slightly
          count = Math.max(count, 1);
          if (base.kind === 'congregation' || base.kind === 'crowd_ghosts') {
            kind = base.kind;
            count = Math.min(7, 3 + rep);
          }
        } else if (kind === 'duo') {
          count = 2;
        } else if (kind === 'congregation' || kind === 'crowd_ghosts') {
          count = Math.min(8, count + rep);
        }
      } else if (rep >= 2 && !speechLike && dom.family !== 'scary') {
        scale = scale === 'intimate' || scale === 'human' ? 'cinematic' : (scale || 'epic');
        if (kind === 'congregation' || kind === 'crowd_ghosts') count = Math.min(6, count + 1);
        if (kind === 'figure_lone' || kind === 'traveler') {
          // heroic single amplify
          count = 1;
        }
      } else {
        scale = scale || 'cinematic';
        if (kind === 'silhouette' && base.kind === 'congregation') {
          kind = 'congregation';
          count = 3;
        } else if (kind === 'figure_lone' || kind === 'traveler') {
          count = 1; // heroic single option
        }
      }
      break;
    }
    case 'bridge':
      count = Math.min(2, Math.max(1, count));
      opacity = 0.55;
      scale = 'human';
      break;
    case 'breakdown':
    case 'drop':
      // distant / small; breakdown = soothe (expire aggression) — not cast explosion
      // speechLike: never fake drop choreography
      if (speechLike) {
        kind = kind === 'beast' || kind === 'crowd_ghosts' || kind === 'congregation'
          ? 'figure_lone' : kind;
        count = kind === 'none' ? 0 : 1;
        placement = 'foreground';
        opacity = 0.4;
        scale = 'intimate';
        action = action === 'flee' || action === 'run' ? 'stand' : action;
        break;
      }
      kind = kind === 'beast' ? 'silhouette' : (kind === 'none' ? 'silhouette' : kind);
      if (kind === 'congregation') kind = 'crowd_ghosts';
      count = 1;
      placement = 'sky';
      opacity = 0.35;
      scale = 'intimate';
      action = action === 'rise' ? 'kneel' : (action === 'walk' ? 'stand' : action);
      // soothe: force calm action on breakdown (aggression expire)
      if (sectionType === 'breakdown' || expireAggression) {
        if (kind === 'beast') kind = 'silhouette';
        if (action === 'flee' || action === 'run' || action === 'rise') action = 'kneel';
        opacity = Math.min(opacity, 0.32);
      }
      break;
    case 'outro':
      // motif character alone or dissolve
      kind = kind === 'congregation' || kind === 'crowd_ghosts' || kind === 'duo'
        ? 'figure_lone'
        : kind;
      count = 1;
      opacity = 0.4;
      scale = 'intimate';
      placement = placement === 'sky' ? 'mid' : 'foreground';
      action = action === 'flee' ? 'stand' : action;
      break;
    default:
      break;
  }

  // Instrument-owned gaps / spoken: hold silent figure, no new type
  let hold = !!holdSilent || speechLike || speechSteer >= 0.55;
  if (hold) {
    opacity = Math.min(opacity, speechLike || speechSteer >= 0.45 ? 0.4 : 0.45);
  }

  let result = {
    kind,
    count: Math.max(0, Math.round(count)),
    scale,
    placement: PLACEMENTS.has(placement) ? placement : 'mid',
    opacity: _clamp01(opacity),
    action: ACTIONS.has(action) ? action : 'stand',
    holdSilent: hold,
    conceptId: base.conceptId || null,
    vibeBias: dom.family || 'neutral',
    speechLike: !!speechLike,
    speechSteer: Math.max(0, Math.min(1, speechSteer || 0)),
    suppressDropCast: !!speechLike,
    suppressChorusWiden: !!speechLike || dom.family === 'scary',
    aggressionExpire: !!(expireAggression || sectionType === 'breakdown' || dom.family === 'peaceful')
  };

  // Vibe modulates HOW crowded/tense — figureFromConcept already set WHO
  result = applyVibeToCast(result, dom, {
    sectionType,
    intensify,
    allowBeast: dom.family === 'chaotic' || dom.ladder === 'aggressive',
    moment: readMoment(audio),
    energy: audio?.energy || 0
  });
  // Re-clamp after vibe pass
  if (!KINDS.has(result.kind)) result.kind = 'silhouette';
  if (!ACTIONS.has(result.action)) result.action = 'stand';
  if (!PLACEMENTS.has(result.placement)) result.placement = 'mid';
  result.opacity = _clamp01(result.opacity);
  result.count = Math.max(0, Math.round(result.count || 0));
  result.holdSilent = !!(result.holdSilent || hold);

  // Cast library: archetype + character + outfit (WHO); lyric action stays WHAT
  try {
    const vocalFocus = !!opts.vocalFocus
      || ((audio?.roles?.vocalish ?? audio?.roles?.lead ?? 0) >= 0.42);
    const lib = resolveLibraryCast({
      dom,
      sectionType,
      conceptId: base?.conceptId || opts.conceptId || null,
      action: result.action,
      placement: result.placement,
      stickyCharacterId: opts.stickyCharacterId || null,
      packFamily: opts.packFamily || null,
      afterGate: !!opts.afterGate || sectionType === 'breakdown',
      holdSilent: result.holdSilent,
      count: result.count,
      opacity: result.opacity,
      scale: result.scale,
      vocalFocus
    });
    result.archetype = lib.archetype;
    result.characterId = lib.characterId;
    result.outfitId = lib.outfitId;
    result.style = lib.style;
    result.members = lib.members;
    result.label = lib.label;
    if (Array.isArray(result.members) && result.members.length) {
      assignRoleIds(result.members, {
        sectionType,
        speechLike: !!speechLike,
        vibeFamily: dom.family || 'neutral',
        archetype: result.archetype
      });
      // Weapons scaffold — lyric/vibe gated (no random)
      try {
        result.members = applyWeaponBinding(result.members, {
          archetype: result.archetype,
          vibeFamily: dom.family || 'neutral',
          packFamily: opts.packFamily || null,
          conceptId: base?.conceptId || opts.conceptId || null,
          sectionType,
          afterGate: !!opts.afterGate || sectionType === 'breakdown',
          speechLike: !!speechLike,
          stickyWeaponId: opts.stickyWeaponId || null
        });
        result.weaponId = result.members.find(m => m.weaponId && m.weaponId !== 'none')?.weaponId || 'none';
      } catch (_) { /* weapons optional */ }
      result.roleBound = true;
    }
    // Keep KIND from figure/concept priority when set; library may refine fauna/spoken none
    if (lib.kind === 'none' || (dom.speechLike && lib.kind)) {
      /* spoken may prefer empty chair — only if base allowed none */
    }
    if (lib.archetype === 'nature_fauna' && result.kind !== 'none') {
      result.kind = 'silhouette'; // fauna drawn as stylized silhouette by Visual
    }
  } catch (_) {
    /* library optional */
  }
  return result;
}

/**
 * Build cast for a section plan (prePlan time).
 */
export function planCastForSection(concept, sec, scaleHint) {
  const base = castFromConcept(concept);
  return modulateCast(base, {
    sectionType: sec?.type || 'verse',
    chorusRepeat: sec?.repeat || 1,
    scaleName: scaleHint || concept?.scale || 'cinematic',
    holdSilent: false,
    intensify: 0
  });
}

export { CONCEPT_CAST };
