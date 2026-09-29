/**
 * Scene Planner / Director loop — THE MOST IMPORTANT RULE.
 *
 * Conceptually ask each beat of planning:
 * What would someone imagine during THIS part of the song?
 * What's sung? How sung? What's musical? Emotional world?
 * Scene that logically follows? Imagery for meaning? Scale deserved?
 * Literal / symbolic / dreamlike / mythological / abstract / cinematic?
 * THEN create the scene.
 *
 * Lyrics / concepts → WHAT world. Emotion → palette/scale bias.
 * audio.roles → HOW it hits (intents/events; Visual Engine draws).
 *
 * Cast + motifProps: Director emits INTENTS; Worlds Presets / Visual Engine draw.
 * lyricStickExpire / sectionChangeId: when section TYPE or chorus.repeat changes,
 * Visual Engine / Lyrics Brain clear sticky last-good phrase (Quality gap 5).
 */
import { NarrativeState } from './narrativeState.js';
import { VariationController } from './variation.js';
import { ScaleDirector } from './scale.js';
import { castFromConcept, modulateCast, planCastForSection } from './casting.js';
import { resolveLibraryCast, applyRoleBinding, applyWeaponBinding, applyDanceIntent, ensureCastPresence } from './castLibrary.js';
import { resolveGenreFamily, applyGenreDefaults, getGenreFamily } from './genreMap.js';
import {
  dominantVibe, vibePackFamily, vibeLeadPresets, vibeForbiddenPresets, genreLeadPresets,
  genreForbiddenPresets, ladderLeadPresets, resolveLadder, isAggressiveVibe, ladderStepChanged,
  inferSpeechLikeFromRoles, readVibe, STICKY_MS, AGGRESSION_THRESH
} from './vibeCast.js';
import { propsForConcept, buildMotifProps, mergeCallbackProp, attachWeaponToMotifProps } from './motifProps.js';

const SECTION_INTENTS = {
  intro: {
    goal: 'establish universe, slow reveal, build anticipation — do not dump all effects',
    intensity: 0.32,
    preferReveal: true,
    arc: 'establish'
  },
  verse: {
    goal: 'narrative develop, intensity below chorus; plant motifs',
    intensity: 0.48,
    preferReveal: false,
    arc: 'narrative'
  },
  pre: {
    goal: 'tension ramp (speed, brightness, scale, particles)',
    intensity: 0.72,
    preferReveal: false,
    arc: 'tension'
  },
  chorus: {
    goal: 'open/significant; motif establish → bigger on repeat → max on final',
    intensity: 0.88,
    preferReveal: false,
    arc: 'open'
  },
  bridge: {
    goal: 'shift color/world, prepare contrast',
    intensity: 0.55,
    preferReveal: false,
    arc: 'shift'
  },
  breakdown: {
    goal: 'PHYSICAL major events (blackout→white flash→collapse/storm/sky tear)',
    intensity: 1,
    preferReveal: false,
    physical: true,
    arc: 'physical'
  },
  drop: {
    goal: 'impact after quiet; contrast',
    intensity: 1,
    preferReveal: false,
    physical: true,
    arc: 'physical'
  },
  outro: {
    goal: 'resolve, empty, fade, motif alone',
    intensity: 0.28,
    preferReveal: false,
    arc: 'resolve'
  }
};

const DEFAULT_PALETTES = {
  dark: ['#0a0a12', '#1a1030', '#4a2060', '#c0a0ff'],
  hopeful: ['#0a1520', '#1a4060', '#e8c070', '#fff5e0'],
  aggressive: ['#100008', '#400010', '#ff2030', '#ffffff'],
  melancholic: ['#0c1018', '#1a2838', '#6a8098', '#c8d8e8'],
  euphoric: ['#101028', '#3020a0', '#ff60c0', '#ffe0ff'],
  cinematic: ['#080c14', '#142038', '#c8a060', '#f0e8d8'],
  dreamlike: ['#100818', '#302060', '#a090e0', '#e8e0ff']
};

/** Known preset ids (+ desert alias + Worlds CEO packs). Used to filter concept lists. */
const KNOWN_PRESETS = new Set([
  'rainy_city', 'empty_highway', 'burning_desert', 'desert', 'ancient_ruins',
  'cathedral_space', 'space', 'storm', 'ocean', 'forest', 'snow',
  'futuristic_city', 'led_wall', 'dream_clouds', 'endless_staircase', 'industrial_tunnel',
  'white_void', 'red_void',
  // Worlds Presets FINAL pack IDs (do not rename)
  'apocalyptic_warzone', 'candy_happy', 'neon_highway', 'cozy_autumn',
  // Worlds vibe packs (nature/scary/chaos/spoken)
  'meadow_fauna', 'misty_lake', 'dark_sparse', 'reality_fracture', 'spoken_word_bed',
  // Fan-pleasure genre packs (GENRE-MAP + Scene genreFamily)
  'soul_room', 'club_floor', 'metal_hall', 'jazz_club', 'orchestral_hall',
  'latin_night', 'gospel_light', 'hiphop_block', 'country_porch', 'ambient_field', 'stage_pop'
]);

const PRESET_ALIASES = {
  desert: 'burning_desert',
  meadow: 'meadow_fauna',
  fracture: 'reality_fracture',
  warzone: 'apocalyptic_warzone',
  spoken: 'spoken_word_bed',
  spoken_word: 'spoken_word_bed',
  sparse_dark: 'dark_sparse',
  pastoral: 'meadow_fauna',
  folk_pastoral: 'meadow_fauna',
  classical_hall: 'orchestral_hall',
  cipher: 'hiphop_block',
  ambient_void: 'ambient_field',
  rnb_intimate: 'soul_room',
  soul: 'soul_room',
  club_edm: 'club_floor',
  dance_club: 'club_floor',
  jazz: 'jazz_club',
  gospel: 'gospel_light',
  latin: 'latin_night',
  country: 'country_porch',
  metal: 'metal_hall',
  kpop_stage: 'stage_pop'
};

/**
 * Pack families — stay inside family across verse→chorus (MUSIC-BRIEF).
 * Swap family only at drop/outro / physical gates if lyric world changes.
 */
const PACK_FAMILIES = {
  neon: ['neon_highway', 'empty_highway', 'rainy_city', 'futuristic_city'],
  warzone: ['apocalyptic_warzone', 'burning_desert', 'red_void', 'storm', 'ancient_ruins', 'reality_fracture'],
  candy: ['candy_happy', 'stage_pop', 'dream_clouds', 'white_void'],
  autumn: ['cozy_autumn', 'forest', 'snow', 'empty_highway', 'meadow_fauna', 'misty_lake'],
  sacred: ['cathedral_space', 'orchestral_hall', 'gospel_light', 'white_void', 'space', 'dream_clouds'],
  voidish: ['white_void', 'red_void', 'endless_staircase', 'dark_sparse'],
  weather: ['storm', 'ocean', 'rainy_city', 'snow', 'misty_lake'],
  industrial: ['industrial_tunnel', 'metal_hall', 'futuristic_city', 'rainy_city', 'red_void'],
  // VIBE-TAXONOMY families — stay-in-family verse→chorus.
  // Keep these IDs unique: familyOfPreset uses the first matching family.
  nature: ['meadow_fauna', 'misty_lake', 'forest', 'ocean', 'snow', 'dream_clouds', 'cozy_autumn', 'spoken_word_bed', 'country_porch'],
  scary: ['dark_sparse', 'white_void', 'endless_staircase', 'ancient_ruins', 'snow', 'industrial_tunnel'],
  chaos: ['reality_fracture', 'apocalyptic_warzone', 'metal_hall', 'storm', 'red_void', 'industrial_tunnel', 'burning_desert'],
  // Distinct mood families (MUSIC-BRIEF coherence + Worlds vibe-match)
  groove: ['rainy_city', 'hiphop_block', 'latin_night', 'empty_highway', 'soul_room'],
  tense: ['industrial_tunnel', 'endless_staircase', 'ancient_ruins', 'storm', 'dark_sparse', 'burning_desert'],
  spoken: ['spoken_word_bed', 'white_void', 'forest', 'ocean', 'dream_clouds', 'misty_lake'],
  // Scene genreFamily → members (lead pack ID first so familyOfPreset resolves)
  intimate: ['soul_room', 'spoken_word_bed', 'dream_clouds', 'misty_lake', 'ocean'],
  club: ['club_floor', 'led_wall', 'futuristic_city', 'candy_happy', 'space'],
  jazz: ['jazz_club', 'soul_room', 'rainy_city', 'cathedral_space', 'dream_clouds'],
  sacred_hall: ['orchestral_hall', 'cathedral_space', 'space', 'white_void', 'snow'],
  sacred_bright: ['gospel_light', 'cathedral_space', 'dream_clouds', 'space', 'white_void'],
  void_dream: ['ambient_field', 'white_void', 'spoken_word_bed', 'dream_clouds', 'dark_sparse'],
  warm_night: ['latin_night', 'ocean', 'candy_happy', 'burning_desert', 'rainy_city'],
  street_block: ['hiphop_block', 'rainy_city', 'industrial_tunnel', 'empty_highway'],
  stage_pop: ['stage_pop', 'candy_happy', 'dream_clouds', 'futuristic_city', 'white_void'],
  country_road: ['country_porch', 'empty_highway', 'meadow_fauna', 'forest', 'cozy_autumn'],
  // legacy genre keys (Scene may still set these as packFamily)
  folk_pastoral: ['meadow_fauna', 'country_porch', 'misty_lake', 'forest', 'cozy_autumn', 'ocean'],
  soul_room: ['soul_room', 'spoken_word_bed', 'dream_clouds', 'misty_lake', 'ocean'],
  club_floor: ['club_floor', 'led_wall', 'futuristic_city', 'candy_happy', 'space'],
  metal_hall: ['metal_hall', 'industrial_tunnel', 'storm', 'red_void', 'burning_desert'],
  jazz_club: ['jazz_club', 'soul_room', 'rainy_city', 'cathedral_space'],
  orchestral_hall: ['orchestral_hall', 'cathedral_space', 'space', 'white_void', 'snow'],
  ambient_void: ['ambient_field', 'white_void', 'spoken_word_bed', 'dream_clouds', 'space'],
  latin_night: ['latin_night', 'ocean', 'candy_happy', 'burning_desert', 'rainy_city'],
  gospel_light: ['gospel_light', 'cathedral_space', 'dream_clouds', 'space', 'white_void'],
  hiphop_block: ['hiphop_block', 'rainy_city', 'industrial_tunnel', 'empty_highway']
};

/** Concept id → preferred pack family + lead presets */
const CONCEPT_PACK = {
  war_battle: { family: 'warzone', presets: ['apocalyptic_warzone', 'burning_desert', 'ancient_ruins'] },
  rage: { family: 'warzone', presets: ['apocalyptic_warzone', 'red_void', 'storm'] },
  betrayal: { family: 'warzone', presets: ['apocalyptic_warzone', 'red_void', 'industrial_tunnel'] },
  falling_apart: { family: 'warzone', presets: ['apocalyptic_warzone', 'ancient_ruins', 'storm'] },
  love_warmth: { family: 'candy', presets: ['candy_happy', 'dream_clouds', 'white_void'] },
  hope_light: { family: 'nature', presets: ['meadow_fauna', 'candy_happy', 'dream_clouds', 'misty_lake'] },
  night_drive: { family: 'neon', presets: ['neon_highway', 'empty_highway', 'rainy_city'] },
  lonely_road: { family: 'neon', presets: ['neon_highway', 'empty_highway', 'burning_desert'] },
  city_night: { family: 'neon', presets: ['neon_highway', 'rainy_city', 'futuristic_city'] },
  rain_emotion: { family: 'neon', presets: ['neon_highway', 'rainy_city', 'storm'] },
  nostalgia: { family: 'nature', presets: ['cozy_autumn', 'forest', 'meadow_fauna', 'dream_clouds'] },
  home_leaving: { family: 'autumn', presets: ['cozy_autumn', 'empty_highway', 'rainy_city'] },
  sacred_space: { family: 'sacred', presets: ['cathedral_space', 'white_void', 'space'] },
  rebirth: { family: 'warzone', presets: ['burning_desert', 'apocalyptic_warzone', 'dream_clouds'] },
  forest_lost: { family: 'nature', presets: ['forest', 'meadow_fauna', 'misty_lake', 'cozy_autumn'] },
  ocean_depth: { family: 'nature', presets: ['ocean', 'misty_lake', 'dream_clouds'] },
  snow_cold: { family: 'nature', presets: ['snow', 'misty_lake', 'forest'] },
  silence_void: { family: 'spoken', presets: ['spoken_word_bed', 'white_void', 'dream_clouds'] },
  loneliness: { family: 'spoken', presets: ['spoken_word_bed', 'empty_highway', 'misty_lake'] },
  death_void: { family: 'scary', presets: ['dark_sparse', 'white_void', 'endless_staircase'] },
  storm_chaos: { family: 'chaos', presets: ['reality_fracture', 'storm', 'apocalyptic_warzone'] },
  dream_surreal: { family: 'nature', presets: ['dream_clouds', 'misty_lake', 'meadow_fauna'] }
};

function familyOfPreset(presetId) {
  if (!presetId) return null;
  for (const [fid, members] of Object.entries(PACK_FAMILIES)) {
    if (members.includes(presetId)) return fid;
  }
  return null;
}

export class ScenePlanner {
  constructor() {
    this.narrative = new NarrativeState();
    this.variation = new VariationController();
    this.scale = new ScaleDirector();
    this.plan = null;
    this.activeIntent = null;
    this.currentPreset = 'white_void';
    this.transition = null;
    this.events = [];
    this._liveConcept = null;
    this._liveConceptAt = 0;
    this._liveTint = null;
    this._lastPhraseKey = '';
    /** Live lyric steer lock — section plan must not immediately undo morph */
    this._liveSteerUntil = 0;
    this._liveSteerPreset = null;
    this._lastSectionType = null;
    this._lastSectionRepeat = null;
    this._motifFiredForSection = null;
    this._sectionChangeId = 0;
    this._lastCast = null;
    this._lastVibeDom = null;
    this._speechSteer = 0;
    this._lastGenreMeta = null;
  }

  /**
   * Pre-plan when duration + lyrics known.
   * TDZ-safe: accumulate sectionPlans with a for-loop (never .map over this.plan).
   * @param {object} opts
   */
  prePlan(opts) {
    const {
      duration,
      sections,
      semantic,
      fantasyText = '',
      styles = ['cinematic', 'dreamlike'],
      intensity = 'moderate',
      mood = 'auto',
      genreHint = 'unknown'
    } = opts;

    const concepts = semantic?.concepts || [];
    const primary = semantic?.primary;
    const motifs = semantic?.motifCandidates || ['light', 'shadow'];
    const fantasyBoosts = semantic?.fantasyBoosts || [];

    const theme = this._deriveTheme(primary, fantasyText, styles);
    const palette = this._derivePalette(mood, primary, styles);
    this.narrative.reset();
    this.narrative.setTheme(theme, motifs, palette, fantasyText);
    this._liveConcept = null;
    this._liveSteerUntil = 0;
    this._liveSteerPreset = null;
    this._lastPhraseKey = '';
    this._lastSectionType = null;
    this._lastSectionRepeat = null;
    this._motifFiredForSection = null;
    this._sectionChangeId = 0;
    this._lastCast = null;
    this._lastVibeDom = null;
    this._speechSteer = 0;

    // Peaceful/calm or nature language must seed the nature world before roulette.
    const moodKey = String(mood || '').toLowerCase();
    const styleText = (Array.isArray(styles) ? styles : []).join(' ').toLowerCase();
    const fantasyNature = /\b(nature|natural|forest|woodland|woods|meadow|lake|ocean|river|mountain|garden|tree|trees|wildflower|pastoral|fauna)\b/i.test(fantasyText || '');
    const styleNature = /\b(nature|natural|pastoral|forest|woodland|woods|meadow|lake|ocean|river|mountain|garden|fauna|outdoors)\b/i.test(styleText);
    const peacefulPlan = moodKey === 'peaceful' || moodKey === 'calm';
    const naturePlan = peacefulPlan || styleNature || fantasyNature;
    const planVibeDom = naturePlan ? { family: 'peaceful', speechLike: false } : null;

    // Seed pack family from primary concept, with peaceful/nature taking priority.
    const primaryPack = primary?.id && CONCEPT_PACK[primary.id];
    if (primaryPack) this.narrative.setPackFamily(primaryPack.family);
    if (naturePlan) this.narrative.setPackFamily('nature');

    const intensityMul = intensity === 'low' ? 0.65 : intensity === 'high' ? 1.25 : intensity === 'extreme' ? 1.5 : 1;

    const sectionList = sections || [];
    // Ensure chorus repeats numbered even if structure forgot
    let chorusCount = 0;
    for (let i = 0; i < sectionList.length; i++) {
      if (sectionList[i].type === 'chorus') {
        chorusCount++;
        if (!sectionList[i].repeat) sectionList[i].repeat = chorusCount;
      }
    }

    const sectionPlans = [];
    for (let i = 0; i < sectionList.length; i++) {
      const sec = sectionList[i];
      const intent = SECTION_INTENTS[sec.type] || SECTION_INTENTS.verse;
      const concept = this._conceptForSection(concepts, sec, i);
      let presets = this._presetsFor(concept, fantasyBoosts, sec, styles, planVibeDom, genreHint);
      if (i > 0) {
        const prev = sectionPlans[i - 1]?.preset;
        presets = this._orderByContinuity(presets, prev, sec.type);
      }
      const preset = this._normalizePreset(presets[0] || 'dream_clouds');
      const fam = familyOfPreset(preset);
      if (fam && (sec.type === 'verse' || sec.type === 'intro' || !this.narrative.getPackFamily())) {
        this.narrative.setPackFamily(fam);
      }
      const imagery = concept?.imageryPick || this._fantasyImagery(fantasyText) || intent.goal;

      let scaleHint = concept?.scale || null;
      let motifAction = null;
      const rep = sec.repeat || 1;

      // Section arcs + motif lifecycle
      if (sec.type === 'intro') {
        motifAction = 'seed';
        scaleHint = scaleHint || 'intimate';
      } else if (sec.type === 'verse') {
        motifAction = 'establish';
        for (const m of motifs.slice(0, 2)) {
          this.narrative.establishMotif(m, 'verse', 0.45 + i * 0.05);
          this.narrative.queueCallback(m, 'chorus', 0.5);
        }
        if (concept?.symbols?.[0]) {
          this.narrative.establishMotif(concept.symbols[0], 'verse', 0.55);
          this.narrative.queueCallback(concept.symbols[0], 'chorus', 0.6);
        }
      } else if (sec.type === 'pre') {
        motifAction = 'tension';
        scaleHint = scaleHint || 'cinematic';
        for (const m of motifs.slice(0, 1)) {
          this.narrative.establishMotif(m, 'pre', 0.65);
          this.narrative.queueCallback(m, 'chorus', 0.7);
        }
      } else if (sec.type === 'chorus') {
        motifAction = rep === 1 ? 'establish' : rep === 2 ? 'amplify' : 'maximize';
        if (rep >= 3) scaleHint = 'cosmic';
        else if (rep >= 2) scaleHint = 'epic';
        else scaleHint = scaleHint || 'cinematic';
        if (rep === 1 && motifs[0]) {
          this.narrative.queueCallback(motifs[0], 'chorus', 0.65);
        }
      } else if (sec.type === 'bridge') {
        motifAction = 'shift';
        scaleHint = scaleHint || 'human';
      } else if (sec.type === 'breakdown' || sec.type === 'drop') {
        motifAction = 'rupture';
        scaleHint = 'epic';
      } else if (sec.type === 'outro') {
        motifAction = 'alone';
        scaleHint = 'intimate';
        const cb = motifs[0];
        if (cb) this.narrative.queueCallback(cb, 'outro', 0.9);
      }

      // Cast + motif props attached at prePlan
      const cast = planCastForSection(concept, sec, scaleHint);
      if (sec.type === 'verse' || sec.type === 'pre' || sec.type === 'intro') {
        this.narrative.establishCast(cast);
      }
      // Sticky identity: chorus amplifies planted cast kind
      if ((sec.type === 'chorus' || sec.type === 'outro') && this.narrative.getCastIdentity()) {
        const id = this.narrative.getCastIdentity();
        cast.kind = id.kind;
        cast.conceptId = cast.conceptId || id.conceptId;
        if (id.action && sec.type === 'chorus') {
          // keep lyric action if set; else identity action
          cast.action = cast.action || id.action;
        }
      }

      const propIds = propsForConcept(concept, concept?.symbols || []);
      if (sec.type === 'verse' || sec.type === 'pre') {
        this.narrative.plantProps(propIds, sec.type);
      }
      const planted = this.narrative.plantedPropIds();
      const propSource = (sec.type === 'chorus' || sec.type === 'outro')
        ? (planted.length ? planted : propIds)
        : propIds;
      const motifProps = buildMotifProps(propSource, {
        stage: sec.type,
        chorusRepeat: rep,
        planted: propSource.length > 0
      });

      const physicalEvents = [];
      if (intent.physical) {
        const mid = (sec.start + sec.end) / 2;
        physicalEvents.push(
          { t: sec.start + 0.2, type: 'blackout' },
          { t: sec.start + Math.min(2.5, (sec.end - sec.start) * 0.25), type: 'white_flash' },
          { t: mid, type: 'collapse' },
          { t: mid + 1.5, type: 'sky_tear' }
        );
      }

      let arcIntensity = intent.intensity;
      if (sec.type === 'chorus' && rep >= 2) arcIntensity = Math.min(1.2, arcIntensity + 0.08 * (rep - 1));
      if (sec.type === 'chorus' && rep >= 3) arcIntensity = Math.min(1.35, arcIntensity + 0.12);

      sectionPlans.push({
        section: sec,
        intent: intent.goal,
        arc: intent.arc,
        intensity: Math.min(1.5, arcIntensity * intensityMul),
        preset,
        alternatePresets: presets.slice(1, 4).map(p => this._normalizePreset(p)),
        conceptId: concept?.id || null,
        imagery,
        scaleHint,
        motifAction,
        symbols: concept?.symbols || [],
        physicalEvents,
        cameraMood: this._cameraFor(sec, mood),
        lightingMood: this._lightingFor(sec, mood, primary),
        cast,
        motifProps,
        packFamily: fam || this.narrative.getPackFamily()
      });
    }

    this.plan = {
      theme,
      motifs,
      palette,
      styles,
      fantasyText,
      intensityMul,
      sectionPlans,
      createdAt: Date.now()
    };

    if (sectionPlans.length) {
      this.currentPreset = sectionPlans[0].preset;
    }
    return this.plan;
  }

  _normalizePreset(id) {
    if (!id) return 'dream_clouds';
    const aliased = PRESET_ALIASES[id] || id;
    return KNOWN_PRESETS.has(aliased) ? aliased : 'dream_clouds';
  }

  _deriveTheme(primary, fantasy, styles) {
    if (fantasy && fantasy.trim().length > 12) {
      const short = fantasy.trim().split(/[.!?]/)[0].slice(0, 80);
      return short;
    }
    if (primary) return primary.imageryPick || primary.id;
    if (styles.includes('horror')) return 'A slow dread unfolding in shadow';
    if (styles.includes('mythological')) return 'A myth retold in light and storm';
    return 'A cinematic dream traveling through emotion';
  }

  _derivePalette(mood, primary, styles) {
    if (mood && mood !== 'auto' && DEFAULT_PALETTES[mood]) return DEFAULT_PALETTES[mood];
    if (primary?.mood?.darkness > 0.65) return DEFAULT_PALETTES.dark;
    if (primary?.mood?.hope > 0.65) return DEFAULT_PALETTES.hopeful;
    if (primary?.mood?.aggression > 0.6) return DEFAULT_PALETTES.aggressive;
    if (styles.includes('dreamlike') || styles.includes('surreal')) return DEFAULT_PALETTES.dreamlike;
    return DEFAULT_PALETTES.cinematic;
  }

  /**
   * Emotion valence/arousal → palette hint (does not own scenery).
   */
  _paletteFromEmotion(emotion, basePalette) {
    if (!emotion) return basePalette;
    const { valence = 0, arousal = 0.4, darkness = 0.4, hope = 0.4, aggression = 0.2 } = emotion;
    if (aggression > 0.7 && arousal > 0.6) return DEFAULT_PALETTES.aggressive;
    if (darkness > 0.7 && valence < -0.2) return DEFAULT_PALETTES.dark;
    if (hope > 0.7 && valence > 0.3) return DEFAULT_PALETTES.hopeful;
    if (valence < -0.35 && arousal < 0.45) return DEFAULT_PALETTES.melancholic;
    if (valence > 0.5 && arousal > 0.7) return DEFAULT_PALETTES.euphoric;
    return basePalette;
  }

  _conceptForSection(concepts, sec, index) {
    if (!concepts.length) return null;
    if (sec.type === 'chorus') return concepts[0];
    if (sec.type === 'breakdown' || sec.type === 'drop') {
      return concepts.find(c => c.mood?.aggression > 0.5 || c.id.includes('fall') || c.id.includes('storm') || c.id.includes('rage')) || concepts[0];
    }
    if (sec.type === 'outro') return concepts[0];
    if (sec.type === 'bridge') return concepts[Math.min(1, concepts.length - 1)];
    if (sec.type === 'pre') return concepts[0];
    return concepts[index % concepts.length];
  }

  _presetsFor(concept, fantasyBoosts, sec, styles, vibeDom = null, genreHint = 'unknown') {
    const dom = vibeDom || this._lastVibeDom;
    const fam = dom?.family;
    const ladder = dom?.ladder || fam || 'neutral';
    const leads = vibeLeadPresets(dom);
    const list = [];

    // Vibe/ladder leads first: concept roulette must not put neon ahead of mood world.
    if (leads.length) list.push(...leads);
    const ladderLeads = ladderLeadPresets(dom?.ladder || resolveLadder(null, { vibe: dom?.vibe }));
    if (ladderLeads.length) list.unshift(...ladderLeads);
    const genreLeads = genreLeadPresets(genreHint);
    if (genreLeads.length) list.push(...genreLeads);
    if (fantasyBoosts.length) list.push(...fantasyBoosts);

    const pack = concept?.id && CONCEPT_PACK[concept.id];
    if (pack?.presets) list.push(...pack.presets);
    if (concept?.presets) list.push(...concept.presets);

    // Distinct section defaults per ladder (MUSIC-BRIEF coherence) — not neon hub.
    const byLadder = {
      peaceful: {
        intro: ['misty_lake', 'forest', 'spoken_word_bed', 'dream_clouds'],
        verse: ['meadow_fauna', 'misty_lake', 'forest', 'country_porch', 'cozy_autumn'],
        chorus: ['meadow_fauna', 'misty_lake', 'forest', 'ocean', 'dream_clouds'],
        outro: ['spoken_word_bed', 'white_void', 'meadow_fauna', 'cozy_autumn']
      },
      warm: {
        intro: ['rainy_city', 'empty_highway', 'soul_room'],
        verse: ['rainy_city', 'hiphop_block', 'latin_night', 'empty_highway'],
        chorus: ['rainy_city', 'hiphop_block', 'latin_night', 'stage_pop'],
        outro: ['soul_room', 'rainy_city', 'empty_highway']
      },
      tense: {
        intro: ['endless_staircase', 'industrial_tunnel', 'ancient_ruins'],
        verse: ['industrial_tunnel', 'endless_staircase', 'ancient_ruins', 'storm'],
        chorus: ['storm', 'industrial_tunnel', 'ancient_ruins', 'dark_sparse'],
        outro: ['dark_sparse', 'ancient_ruins', 'snow']
      },
      aggressive: {
        intro: ['industrial_tunnel', 'metal_hall', 'storm'],
        verse: ['metal_hall', 'reality_fracture', 'industrial_tunnel', 'storm'],
        chorus: ['apocalyptic_warzone', 'reality_fracture', 'metal_hall', 'red_void', 'storm'],
        breakdown: ['reality_fracture', 'apocalyptic_warzone', 'storm', 'red_void'],
        drop: ['reality_fracture', 'apocalyptic_warzone', 'red_void', 'storm'],
        outro: ['burning_desert', 'dark_sparse', 'industrial_tunnel']
      },
      chaotic: null, // alias → aggressive
      scary: {
        intro: ['dark_sparse', 'white_void', 'endless_staircase'],
        verse: ['dark_sparse', 'white_void', 'endless_staircase', 'ancient_ruins'],
        chorus: ['dark_sparse', 'endless_staircase', 'white_void', 'industrial_tunnel'],
        outro: ['white_void', 'dark_sparse', 'snow']
      },
      spoken: {
        intro: ['spoken_word_bed', 'white_void', 'soul_room'],
        verse: ['spoken_word_bed', 'soul_room', 'white_void', 'forest'],
        chorus: ['spoken_word_bed', 'white_void', 'misty_lake'],
        outro: ['spoken_word_bed', 'white_void', 'soul_room']
      }
    };
    const ladderKey = ladder === 'chaotic' ? 'aggressive' : ladder;
    const ladderDefaults = byLadder[ladderKey];
    const sectionDefaults = {
      intro: ['spoken_word_bed', 'white_void', 'dream_clouds', 'misty_lake', 'rainy_city'],
      verse: ['rainy_city', 'forest', 'misty_lake', 'empty_highway', 'industrial_tunnel'],
      pre: ['endless_staircase', 'storm', 'industrial_tunnel', 'rainy_city'],
      chorus: ['rainy_city', 'misty_lake', 'forest', 'storm', 'cathedral_space'],
      bridge: ['misty_lake', 'ancient_ruins', 'cozy_autumn', 'snow'],
      breakdown: ['reality_fracture', 'dark_sparse', 'apocalyptic_warzone', 'storm'],
      drop: ['reality_fracture', 'apocalyptic_warzone', 'storm', 'red_void'],
      outro: ['spoken_word_bed', 'white_void', 'cozy_autumn', 'dream_clouds']
    };
    let defaults = sectionDefaults[sec.type] || sectionDefaults.verse;
    if (ladderDefaults) {
      defaults = ladderDefaults[sec.type]
        || ladderDefaults.verse
        || defaults;
    }
    list.push(...defaults);

    const styleList = Array.isArray(styles) ? styles : [];
    if (styleList.includes('horror')) list.unshift('dark_sparse', 'red_void', 'apocalyptic_warzone');
    if (styleList.includes('sci-fi') && ladderKey !== 'aggressive' && ladderKey !== 'peaceful') {
      list.unshift('futuristic_city', 'space');
    }
    if (styleList.includes('mythological')) list.unshift('ancient_ruins', 'cathedral_space');

    const forbidden = new Set([
      ...vibeForbiddenPresets(dom),
      ...genreForbiddenPresets(genreHint)
    ]);
    const seen = new Set();
    return list
      .map(p => this._normalizePreset(p))
      .filter(p => {
        if (seen.has(p) || forbidden.has(p)) return false;
        seen.add(p);
        return true;
      });
  }

  /**
   * Continuity neighbors + pack-family bias.
   * Verse→chorus: prefer same family (open same world). Physical gates may leave family.
   */
  _orderByContinuity(presets, prevPreset, nextSectionType = null) {
    const affinity = {
      forest: ['meadow_fauna', 'misty_lake', 'cozy_autumn', 'snow', 'spoken_word_bed', 'dream_clouds'],
      rainy_city: ['neon_highway', 'futuristic_city', 'industrial_tunnel', 'empty_highway', 'forest'],
      empty_highway: ['neon_highway', 'burning_desert', 'rainy_city', 'cozy_autumn', 'space', 'snow'],
      neon_highway: ['empty_highway', 'rainy_city', 'futuristic_city', 'cozy_autumn'],
      space: ['dream_clouds', 'white_void', 'cathedral_space', 'futuristic_city'],
      storm: ['reality_fracture', 'apocalyptic_warzone', 'ocean', 'red_void', 'burning_desert'],
      ocean: ['misty_lake', 'storm', 'dream_clouds', 'spoken_word_bed', 'snow'],
      white_void: ['spoken_word_bed', 'dark_sparse', 'dream_clouds', 'snow', 'cathedral_space'],
      red_void: ['reality_fracture', 'apocalyptic_warzone', 'storm', 'industrial_tunnel'],
      dream_clouds: ['meadow_fauna', 'spoken_word_bed', 'candy_happy', 'white_void', 'forest'],
      candy_happy: ['dream_clouds', 'meadow_fauna', 'white_void', 'cozy_autumn'],
      cozy_autumn: ['meadow_fauna', 'forest', 'misty_lake', 'snow', 'dream_clouds'],
      apocalyptic_warzone: ['reality_fracture', 'burning_desert', 'red_void', 'storm', 'ancient_ruins'],
      endless_staircase: ['dark_sparse', 'dream_clouds', 'white_void', 'ancient_ruins'],
      ancient_ruins: ['dark_sparse', 'apocalyptic_warzone', 'forest', 'burning_desert', 'snow'],
      cathedral_space: ['white_void', 'space', 'ancient_ruins', 'spoken_word_bed'],
      industrial_tunnel: ['reality_fracture', 'futuristic_city', 'rainy_city', 'dark_sparse', 'red_void'],
      futuristic_city: ['neon_highway', 'rainy_city', 'space', 'industrial_tunnel'],
      burning_desert: ['apocalyptic_warzone', 'reality_fracture', 'empty_highway', 'storm', 'red_void'],
      snow: ['dark_sparse', 'cozy_autumn', 'forest', 'misty_lake', 'white_void'],
      meadow_fauna: ['misty_lake', 'forest', 'cozy_autumn', 'dream_clouds', 'spoken_word_bed', 'ocean'],
      soul_room: ['spoken_word_bed', 'jazz_club', 'misty_lake', 'dream_clouds', 'gospel_light'],
      club_floor: ['led_wall', 'futuristic_city', 'stage_pop', 'candy_happy', 'space'],
      metal_hall: ['industrial_tunnel', 'storm', 'red_void', 'reality_fracture', 'burning_desert'],
      jazz_club: ['soul_room', 'rainy_city', 'cathedral_space', 'dream_clouds'],
      orchestral_hall: ['cathedral_space', 'gospel_light', 'space', 'white_void', 'snow'],
      latin_night: ['ocean', 'candy_happy', 'stage_pop', 'burning_desert', 'rainy_city'],
      gospel_light: ['orchestral_hall', 'cathedral_space', 'dream_clouds', 'white_void'],
      hiphop_block: ['rainy_city', 'industrial_tunnel', 'empty_highway', 'futuristic_city'],
      country_porch: ['empty_highway', 'meadow_fauna', 'forest', 'cozy_autumn', 'misty_lake'],
      ambient_field: ['white_void', 'spoken_word_bed', 'dream_clouds', 'dark_sparse', 'space'],
      stage_pop: ['candy_happy', 'club_floor', 'dream_clouds', 'futuristic_city', 'latin_night'],
      misty_lake: ['meadow_fauna', 'forest', 'ocean', 'spoken_word_bed', 'snow', 'dream_clouds'],
      dark_sparse: ['white_void', 'endless_staircase', 'ancient_ruins', 'snow', 'industrial_tunnel'],
      reality_fracture: ['apocalyptic_warzone', 'storm', 'red_void', 'industrial_tunnel', 'burning_desert'],
      spoken_word_bed: ['white_void', 'forest', 'misty_lake', 'ocean', 'dream_clouds', 'meadow_fauna']
    };
    if (!prevPreset) return presets;

    const prefer = affinity[prevPreset] || [];
    const prevFam = familyOfPreset(prevPreset) || this.narrative.getPackFamily();
    const familyMembers = prevFam ? (PACK_FAMILIES[prevFam] || []) : [];
    const stayFamily = nextSectionType === 'chorus' || nextSectionType === 'pre' || nextSectionType === 'verse';
    const allowLeave = nextSectionType === 'breakdown' || nextSectionType === 'drop' || nextSectionType === 'outro';

    return [...presets].sort((a, b) => {
      const famA = familyMembers.includes(a) ? 0 : 1;
      const famB = familyMembers.includes(b) ? 0 : 1;
      if (stayFamily && !allowLeave && famA !== famB) return famA - famB;
      const ai = prefer.indexOf(a); const bi = prefer.indexOf(b);
      const as = ai === -1 ? 50 : ai;
      const bs = bi === -1 ? 50 : bi;
      return as - bs;
    });
  }

  _fantasyImagery(text) {
    if (!text || text.trim().length < 8) return null;
    return text.trim().slice(0, 120);
  }

  _cameraFor(sec, mood) {
    if (sec.type === 'intro') return ['drift', 'slow_dolly'];
    if (sec.type === 'pre') return ['push', 'dutch'];
    if (sec.type === 'chorus') return ['orbit', 'push', 'crane'];
    if (sec.type === 'breakdown' || sec.type === 'drop') return ['shake', 'dutch', 'push'];
    if (sec.type === 'bridge') return ['pan', 'dutch', 'drift'];
    if (sec.type === 'outro') return ['drift', 'pull'];
    if (mood === 'tense') return ['dutch', 'push'];
    return ['pan', 'drift', 'dolly'];
  }

  _lightingFor(sec, mood, primary) {
    if (sec.type === 'breakdown' || sec.type === 'drop') return ['blackout', 'white_flash', 'pulse'];
    if (sec.type === 'chorus') return ['wash', 'bloom', 'shafts'];
    if (sec.type === 'intro') return ['silhouette', 'slow_wash'];
    if (sec.type === 'pre') return ['pulse', 'shafts'];
    if (sec.type === 'outro') return ['fade', 'shafts'];
    if (primary?.mood?.darkness > 0.7) return ['silhouette', 'shafts'];
    return ['wash', 'bloom'];
  }

  /**
   * Map audio.roles → director intents (Visual Engine draws; we emit intent numbers).
   * Lyrics own WHAT; roles own HOW it hits.
   */
  _rolesIntents(audio, vocal) {
    const r = audio?.roles || audio?.instruments || {};
    const vocalBlend = Math.max(
      r.lead || 0,
      r.vocalish || 0,
      (vocal?.intensity || 0) * 0.85,
      (vocal?.likelyVocal ? vocal.activity || 0 : 0) * 0.7
    );
    return {
      kickPunch: r.kick || 0,
      bassWeight: r.bass || 0,
      snareFlash: r.snare || 0,
      hatsSparks: r.hats || 0,
      padsWash: r.pads || 0,
      leadBeam: vocalBlend,
      harshGlitch: r.harsh || 0
    };
  }

  /**
   * Live cast for tick — plant/amplify from section plan + live concept; respect identity.
   */
  _liveCast(sp, secType, chorusRepeat, scaleName, vocal, activePhrase, audio = null, speechSteer = 0, roles = null, sectionChangeId = 0) {
    const concept = this._liveConcept || (sp?.conceptId ? { id: sp.conceptId, symbols: sp.symbols } : null);
    let base = castFromConcept(concept);
    const identity = this.narrative.getCastIdentity();
    const dom = this._lastVibeDom || dominantVibe(audio);
    const speechLike = !!dom.speechLike || speechSteer >= 0.45;

    // Verse/pre establish identity; chorus keeps same people
    if (secType === 'verse' || secType === 'pre' || secType === 'intro') {
      this.narrative.establishCast(base);
    } else if (identity) {
      base = {
        kind: identity.kind,
        action: base.action || identity.action,
        placement: base.placement || identity.placement,
        count: identity.count || base.count,
        conceptId: base.conceptId || identity.conceptId,
        characterId: identity.characterId || null,
        outfitId: identity.outfitId || null,
        archetype: identity.archetype || null
      };
    } else if (sp?.cast) {
      base = {
        kind: sp.cast.kind,
        action: sp.cast.action,
        placement: sp.cast.placement,
        count: sp.cast.count,
        conceptId: sp.cast.conceptId
      };
    }

    const vocalLow = (vocal?.intensity ?? 1) < 0.12 && !(activePhrase?.text);
    let holdSilent = vocalLow && (secType === 'intro' || secType === 'breakdown' || secType === 'drop' || secType === 'outro');
    if (speechLike || speechSteer >= 0.55) holdSilent = true;

    if (holdSilent && this._lastCast && this._lastCast.kind !== 'none') {
      base = {
        kind: this._lastCast.kind,
        action: this._lastCast.action,
        placement: this._lastCast.placement,
        count: this._lastCast.count,
        conceptId: this._lastCast.conceptId,
        characterId: this._lastCast.characterId || null,
        outfitId: this._lastCast.outfitId || null,
        archetype: this._lastCast.archetype || null
      };
    }

    const effectiveRepeat = (speechLike || secType !== 'chorus') ? 1 : chorusRepeat;
    const packFamily = (typeof this.narrative.getPackFamily === 'function')
      ? this.narrative.getPackFamily()
      : (this.narrative.world?.packFamily || null);

    let cast = modulateCast(base, {
      sectionType: secType,
      chorusRepeat: effectiveRepeat,
      scaleName,
      holdSilent,
      intensify: (!speechLike && secType === 'chorus') ? Math.min(1, (chorusRepeat - 1) * 0.35) : 0,
      audio,
      vibe: audio?.vibe || dom.vibe,
      speechLike,
      speechSteer,
      expireAggression: secType === 'breakdown' || dom.family === 'peaceful',
      stickyCharacterId: identity?.characterId || this._lastCast?.characterId || null,
      packFamily,
      conceptId: base.conceptId || concept?.id || null
    });

    // CRITICAL: resolve library WHO — Visual draws members[] (characterId/outfitId/archetype)
    // HOLD-2149: treat missing/none as drawable silhouette before resolve
    if (!cast.kind || cast.kind === 'none') {
      cast.kind = 'silhouette';
      cast.count = Math.max(1, cast.count || 1);
      cast.placement = 'foreground';
      cast.opacity = Math.max(0.8, cast.opacity ?? 0.85);
      cast.holdSilent = false;
    }
    if (cast.kind !== 'none') {
      try {
        const lib = resolveLibraryCast({
          dom,
          sectionType: secType,
          conceptId: base.conceptId || concept?.id || null,
          action: cast.action || 'stand',
          placement: cast.placement,
          stickyCharacterId: identity?.characterId || cast.characterId || this._lastCast?.characterId || null,
          packFamily,
          afterGate: secType === 'breakdown' || secType === 'drop',
          holdSilent: !!cast.holdSilent,
          count: cast.count,
          opacity: cast.opacity,
          scale: cast.scale
        });
        const _L = dom?.ladder || dom?.family || 'neutral';
        const _agg = _L === 'aggressive' || dom?.family === 'chaotic' || !!dom?.aggressive;
        const _soft = _L === 'peaceful' || !!dom?.speechLike;
        const _fbArch = _agg ? 'chaos_fracture' : _L === 'scary' ? 'dread_sparse' : _soft ? 'pastoral_walker'
          : _L === 'warm' ? 'fg_performer' : _L === 'tense' ? 'tableau_figure' : 'fg_performer';
        const _fbOutfit = _agg ? 'fracture_rag' : _L === 'scary' ? 'dread_coat' : _soft ? 'linen_dawn'
          : _L === 'warm' ? 'after_hours_red' : 'highway_dust';
        cast.archetype = lib.archetype || cast.archetype || _fbArch;
        cast.characterId = lib.characterId || cast.characterId;
        cast.outfitId = lib.outfitId || cast.outfitId || _fbOutfit;
        cast.style = lib.style || cast.style || (_agg || _L === 'tense' || _L === 'scary' ? 'silhouette' : (_soft ? 'dream' : 'neon'));
        cast.label = lib.label || cast.label;
        cast.members = (Array.isArray(lib.members) && lib.members.length)
          ? lib.members
          : null;
      } catch (_) {
        const _agg2 = (dom?.ladder === 'aggressive' || dom?.family === 'chaotic');
        cast.archetype = cast.archetype || (_agg2 ? 'chaos_fracture' : 'fg_performer');
        cast.characterId = cast.characterId || null;
        cast.outfitId = cast.outfitId || (_agg2 ? 'fracture_rag' : 'highway_dust');
        cast.style = cast.style || 'silhouette';
        cast.members = null;
      }

      // Guarantee ≥1 drawable member when kind≠none
      if (!Array.isArray(cast.members) || cast.members.length === 0) {
        const kind = cast.kind === 'none' ? 'traveler' : cast.kind;
        const _agg3 = (dom?.ladder === 'aggressive' || dom?.family === 'chaotic');
        const _soft3 = (dom?.ladder === 'peaceful' || !!dom?.speechLike);
        cast.characterId = cast.characterId || (_agg3 ? 'scatter_runners' : _soft3 ? 'path_walker_dawn' : 'mic_stand_lead');
        cast.outfitId = cast.outfitId || (_agg3 ? 'fracture_rag' : _soft3 ? 'linen_dawn' : 'after_hours_red');
        cast.archetype = cast.archetype || (_agg3 ? 'chaos_fracture' : _soft3 ? 'pastoral_walker' : 'fg_performer');
        cast.members = [{
          characterId: cast.characterId,
          outfitId: cast.outfitId,
          kind,
          placement: cast.placement || 'foreground',
          scale: typeof cast.scale === 'number' ? cast.scale : 0.9,
          opacity: Math.max(0.75, cast.opacity ?? 0.85),
          action: cast.action || 'walk',
          holdSilent: !!cast.holdSilent
        }];
      }

      // Visibility: always FG hub path; sparse moods slightly softer but still readable (QA-2142)
      cast.placement = 'foreground';
      cast.opacity = Math.max(0.8, cast.opacity ?? 0.85);
      cast.members = cast.members.map((m) => ({
        ...m,
        placement: (m.roleId === 'pads' || m.roleId === 'hats')
          ? (m.placement || 'mid')
          : 'foreground',
        opacity: Math.max(0.8, m.opacity ?? cast.opacity),
        holdSilent: false
      }));
    } else {
      cast.members = [];
      cast.characterId = null;
      cast.outfitId = null;
    }

    // ROLE AGENTS — sticky bind at sectionChangeId; spike only mutates intensity
    if (cast.kind !== 'none' && Array.isArray(cast.members) && cast.members.length) {
      const sticky = this.narrative.getRoleBindings?.() || null;
      const sameSection = sticky
        && sticky.sectionChangeId === sectionChangeId
        && Array.isArray(sticky.roleIds)
        && sticky.roleIds.length > 0;
      if (!sameSection && typeof this.narrative.clearRoleBindings === 'function') {
        /* new section gate — rebind roles once */
      }
      const liveRoles = roles || this._rolesIntents(audio, vocal);
      cast.members = applyRoleBinding(cast.members, liveRoles, {
        sectionType: secType,
        speechLike,
        vibeFamily: dom.family || 'neutral',
        archetype: cast.archetype,
        stickyRoleIds: sameSection ? sticky.roleIds : null,
        expand: !sameSection || cast.members.length < (sticky?.roleIds?.length || 1),
        holdOthers: true
      });
      // Weapons scaffold (gated) — additive weaponId Visual may ignore
      if (typeof applyWeaponBinding === 'function') {
        const stickyW = (typeof this.narrative.getStickyWeapon === 'function')
          ? this.narrative.getStickyWeapon()
          : null;
        cast.members = applyWeaponBinding(cast.members, {
          archetype: cast.archetype,
          vibeFamily: dom.family || 'neutral',
          packFamily: packFamily,
          conceptId: base.conceptId || concept?.id || null,
          sectionType: secType,
          afterGate: secType === 'breakdown' || secType === 'drop',
          speechLike,
          stickyWeaponId: sameSection ? stickyW : null,
          ladder: dom?.ladder || null,
          aggression: dom?.aggression ?? dom?.vibe?.aggression ?? audio?.vibe?.aggression ?? 0,
          genreFamily: this.narrative.getGenreFamily?.() || null,
          genreWeaponsAllowed: getGenreFamily(this.narrative.getGenreFamily?.() || '')?.weaponsAllowed,
          preset: this.currentPreset || null
        });
        const hubW = cast.members.find(m => m.weaponId && m.weaponId !== 'none')?.weaponId
          || cast.members[0]?.weaponId
          || 'none';
        if (typeof this.narrative.setStickyWeapon === 'function') {
          this.narrative.setStickyWeapon(hubW === 'none' ? null : hubW);
        }
        cast.weaponId = hubW;
      }
      cast.roleBound = true;
      if (typeof this.narrative.setRoleBindings === 'function') {
        this.narrative.setRoleBindings({
          sectionChangeId,
          roleIds: cast.members.map(m => m.roleId || 'vocalish'),
          memberKeys: cast.members.map(m => m.characterId || '')
        });
      }
      // Genre weaponsAllowed=false → strip weapons unless already none
      const gFam = getGenreFamily(this.narrative.getGenreFamily?.() || '') || null;
      if (gFam && gFam.weaponsAllowed === false && Array.isArray(cast.members)) {
        for (const m of cast.members) m.weaponId = 'none';
        cast.weaponId = 'none';
      }
    } else if (cast.kind !== 'none') {
      cast.roleBound = false;
    }

    // Sticky WHO for chorus.repeat
    if (cast.kind !== 'none' && cast.characterId) {
      this.narrative.establishCast(cast);
    }

    // P0 QA-2142/2149/1345 — ≥1 large FG hub EVERY frame (resurrects kind none)
    const liveRolesEns = roles || this._rolesIntents(audio, vocal);
    const vocalFocus = !!(
      (liveRolesEns?.vocalish ?? liveRolesEns?.lead ?? 0) >= 0.42
      || (audio?.roles?.vocalish ?? audio?.roles?.lead ?? 0) >= 0.42
      || vocal?.focus
    );
    const ladderNow = dom?.ladder || (this._lastVibeDom || {}).ladder || 'neutral';
    const aggNow = (dom?.aggression ?? dom?.vibe?.aggression ?? audio?.vibe?.aggression ?? 0);
    ensureCastPresence(cast, {
      speechLike,
      vibeFamily: dom.family || (this._lastVibeDom || {}).family || 'neutral',
      sectionType: secType,
      ladder: ladderNow,
      aggression: aggNow,
      vocalFocus
    });

    // DANCE after presence floors — stamp danceIntent/dance on final hub+members
    // ladder aggressive → spin/travel; warm → freestyle; peaceful/spoken/scary → no spin
    if (cast.kind !== 'none' && Array.isArray(cast.members) && cast.members.length) {
      const gFamDance = getGenreFamily(this.narrative.getGenreFamily?.() || '') || null;
      const danceBias = gFamDance?.danceBias || (speechLike ? 'low' : 'mid');
      const liveRoles = liveRolesEns;
      cast.members = applyDanceIntent(cast.members, cast, {
        sectionType: secType,
        speechLike,
        vibeFamily: dom.family || 'neutral',
        danceBias,
        intensity: Math.max(scaleName === 'intimate' ? 0.35 : 0.5, (audio?.energy || 0.4)),
        chorusRepeat,
        afterGate: secType === 'breakdown' || secType === 'drop',
        roles: liveRoles,
        archetype: cast.archetype,
        ladder: ladderNow,
        aggression: aggNow,
        energy: audio?.energy || 0
      });
    }

    this._lastCast = cast;
    return cast;
  }

  _liveMotifProps(sp, secType, chorusRepeat, motifMeta) {
    const planted = this.narrative.plantedPropIds();
    const fromPlan = (sp?.motifProps || []).map(p => p.id);
    const concept = this._liveConcept;
    const liveIds = concept ? propsForConcept(concept, concept.symbols || []) : [];
    let ids = planted.length ? planted : (fromPlan.length ? fromPlan : liveIds);

    if ((secType === 'verse' || secType === 'pre') && liveIds.length) {
      this.narrative.plantProps(liveIds, secType);
      ids = this.narrative.plantedPropIds();
    }

    let props = buildMotifProps(ids, {
      stage: secType,
      chorusRepeat,
      planted: ids.length > 0
    });
    if (motifMeta) {
      props = mergeCallbackProp(props, motifMeta, secType);
    }
    // Weapons scaffold on motifProps when chaos/war earned
    try {
      const hubWeapon = this._lastCast?.members?.find(m => m.weaponId)?.weaponId || null;
      props = attachWeaponToMotifProps(props, {
        vibeFamily: this._lastVibeDom?.family || 'neutral',
        packFamily: this.narrative.getPackFamily?.() || null,
        conceptId: this._liveConcept?.id || sp?.conceptId || null,
        archetype: this._lastCast?.archetype || null,
        speechLike: !!this._lastVibeDom?.speechLike,
        weaponId: hubWeapon,
        stage: secType
      });
    } catch (_) { /* optional */ }
    return props;
  }

  /**
   * Live director tick — ask the north-star questions, then emit scene directive.
   */
  tick(ctx) {
    const {
      time,
      audio,
      vocal,
      section,
      emotion,
      activePhrase,
      now = performance.now()
    } = ctx;

    if (!this.plan) {
      return this._fallbackDirective(emotion, section, audio, vocal);
    }

    const sp = this.plan.sectionPlans.find(
      p => time >= p.section.start && time < p.section.end
    ) || this.plan.sectionPlans[this.plan.sectionPlans.length - 1];

    this.activeIntent = sp;
    const secType = section?.type || sp?.section?.type || 'verse';
    const chorusRepeat = section?.repeat || sp?.section?.repeat || 1;
    const roles = this._rolesIntents(audio, vocal);
    const physicalSection = secType === 'breakdown' || secType === 'drop';

    // Vibe family (soft-consume audio.vibe; speechSteer from Lyrics)
    const speechSteer = Math.max(
      this._speechSteer || 0,
      typeof activePhrase?.speechSteer === 'number' ? activePhrase.speechSteer : 0,
      typeof this._liveConcept?.speechSteer === 'number' ? this._liveConcept.speechSteer : 0
    );
    this._speechSteer = speechSteer;
    const vibeDom = dominantVibe(audio, {
      speechLike: speechSteer >= 0.45 || inferSpeechLikeFromRoles(audio)
    });
    this._lastVibeDom = vibeDom;
    const speechLike = !!vibeDom.speechLike || speechSteer >= 0.45;

    // GENRE-MAP pleasure — soft bias before roulette; spoken clamps win; unknown ≠ neon
    let genreMeta = null;
    try {
      const fam = resolveGenreFamily({
        genreHint: audio?.genreHint || 'unknown',
        texture: audio?.texture || null,
        speechLike,
        explicitGenre: audio?.genre || this.plan?.genre || null,
        conceptId: this._liveConcept?.id || sp?.conceptId || null
      });
      if (fam) {
        genreMeta = applyGenreDefaults(this.narrative, fam, {
          force: speechLike || !this.narrative.getPackFamily()
        });
        // Prefer Worlds genre pack alias id when unset
        const alias = {
          folk: 'country_road', hiphop: 'street_block', rnb: 'intimate', edm: 'club',
          rock_metal: 'metal_hall', jazz: 'jazz', classical: 'sacred_hall',
          ambient: 'void_dream', latin: 'warm_night', gospel: 'sacred_bright',
          kpop: 'stage_pop', afro: 'warm_night', pop: 'stage_pop'
        }[fam.id];
        if (alias && (!this.narrative.getPackFamily() || speechLike)) {
          // keep packFamily from applyGenreDefaults; alias used for lead preset lookup via PACK_FAMILIES
        }
      }
    } catch (_) { /* soft */ }
    this._lastGenreMeta = genreMeta;

    // Spoken / non-groove: prefer spoken pack family; longer lyric steer lock
    if (speechLike) {
      const fam = vibePackFamily(vibeDom) || 'spoken';
      if (!this.narrative.getPackFamily() || fam === 'spoken') {
        this.narrative.setPackFamily(fam);
      }
    } else if (vibeDom.family && vibeDom.family !== 'neutral') {
      const fam = vibePackFamily(vibeDom);
      if (fam && (secType === 'verse' || secType === 'intro' || !this.narrative.getPackFamily())) {
        this.narrative.setPackFamily(fam);
      }
    }
    // Metal / aggressive ladder → prefer chaos pack (escape neon hub)
    if (!speechLike) {
      const gh = String(audio?.genreHint || '').toLowerCase();
      const gf = String(audio?.genreFamily || '').toLowerCase();
      const ladder = String(audio?.vibe?.ladder || vibeDom?.ladder || '').toLowerCase();
      if (gh === 'metal' || gf === 'rock_metal' || gf === 'metal' || ladder === 'aggressive') {
        const cur = this.narrative.getPackFamily();
        if (!cur || cur === 'nature' || cur === 'stage_pop' || cur === 'street_block' || cur === 'neon' || cur === 'groove') {
          this.narrative.setPackFamily('chaos');
        }
      }
    }
    // Cast identity stickiness: clear only on earned ladder step change (verse→chorus keeps WHO)
    {
      const ladderNow = String(audio?.vibe?.ladder || vibeDom?.ladder || '').toLowerCase();
      if (ladderStepChanged(this._lastLadder, ladderNow)) {
        try {
          if (typeof this.narrative.clearCastIdentity === 'function') this.narrative.clearCastIdentity();
          else if (this.narrative.world) this.narrative.world.castIdentity = null;
        } catch (_) { /* soft */ }
      }
      this._lastLadder = ladderNow || this._lastLadder;
    }

    // Vibe congruence repair is independent of section boundaries. In
    // particular, a peaceful mid-verse must escape a stale neon scene.
    // Sticky morph ≥8–10s — no thrash on aggression blips.
    const genreHintLive = audio?.genreHint || 'unknown';
    const vibeForbidden = new Set([
      ...vibeForbiddenPresets(vibeDom),
      ...genreForbiddenPresets(genreHintLive)
    ]);
    if (vibeForbidden.has(this.currentPreset)) {
      const repairCandidates = this.variation.avoidRecent(
        [
          ...ladderLeadPresets(vibeDom?.ladder || audio?.vibe?.ladder),
          ...vibeLeadPresets(vibeDom),
          ...genreLeadPresets(genreHintLive)
        ], 40000, now
      );
      const repairPreset = repairCandidates.find(p => !vibeForbidden.has(p));
      if (repairPreset && this.variation.canChangeScene(now, 9000)) {
        this.variation.recordScene(repairPreset, now);
        this.narrative.rememberScene(repairPreset, secType, time);
        this.transition = {
          from: this.currentPreset,
          to: repairPreset,
          start: now,
          duration: 1200,
          mode: 'morph'
        };
        this.variation.recordTransition('morph', now);
        this.currentPreset = repairPreset;
        this._liveSteerPreset = null;
        this._liveSteerUntil = 0;
      }
    }

    // Quality gap 5 — sticky-lyric expiry on section TYPE or chorus.repeat change.
    // Visual Engine / Lyrics Brain consume lyricStickExpire + sectionChangeId
    // (Lyrics Brain also clears sticky via clearSticky/expireSticky on same gate).
    let lyricStickExpire = false;
    let sectionChangeId = this._sectionChangeId;
    const typeChanged = secType !== this._lastSectionType;
    const repeatChanged = secType === 'chorus' && chorusRepeat !== this._lastSectionRepeat;
    if (typeChanged || repeatChanged) {
      this._sectionChangeId += 1;
      sectionChangeId = this._sectionChangeId;
      lyricStickExpire = true;
      this._lastSectionType = secType;
      this._lastSectionRepeat = chorusRepeat;
      if (typeof this.narrative.clearRoleBindings === 'function') {
        this.narrative.clearRoleBindings();
      }
      if (physicalSection) {
        this._liveSteerUntil = 0;
      }
    } else if (this._lastSectionRepeat === null) {
      this._lastSectionRepeat = chorusRepeat;
    }

    // Motif callback on section enter (chorus/outro)
    let motifPayload = null;
    const sectionKey = `${secType}:${section?.start ?? sp?.section?.start}:${chorusRepeat}`;
    if (sectionKey !== this._motifFiredForSection) {
      if (secType === 'chorus' || secType === 'outro') {
        motifPayload = this.narrative.takeCallback(secType, chorusRepeat);
        this._motifFiredForSection = sectionKey;
      } else if (secType === 'verse' || secType === 'pre') {
        this._motifFiredForSection = sectionKey;
      }
    }

    const motifStrength = motifPayload?.strength || 0;
    const scaleState = this.scale.update(emotion, section || sp?.section, sp?.scaleHint, {
      motifStrength,
      chorusRepeat
    });

    let preset = this.currentPreset;
    const liveLocked = now < this._liveSteerUntil && this._liveSteerPreset;

    if (liveLocked && !physicalSection) {
      // Lyric world wins until lock expires — cast/prop may still intensify
      preset = this._liveSteerPreset;
      this.currentPreset = preset;
    } else if (sp && sp.preset !== this.currentPreset) {
      const minGap = physicalSection ? 2800 : STICKY_MS; // continuity ≥8–10s (Worlds repair 9s)
      if (this.variation.canChangeScene(now, minGap)) {
        const candidates = this.variation.avoidRecent(
          [sp.preset, ...(sp.alternatePresets || [])],
          physicalSection ? 15000 : 40000,
          now
        );
        const ordered = this._orderByContinuity(candidates, this.currentPreset, secType);
        preset = ordered[0] || sp.preset;
        this.variation.recordScene(preset, now);
        this.narrative.rememberScene(preset, secType, time);
        const hardCut = physicalSection;
        this.transition = {
          from: this.currentPreset,
          to: preset,
          start: now,
          duration: hardCut ? 450 : 1800,
          mode: hardCut ? 'cut' : 'morph'
        };
        this.variation.recordTransition(hardCut ? 'hard_cut' : 'morph', now);
        this.currentPreset = preset;
        this._liveSteerPreset = null;
      }
    }

    // Motif for directive (persist payload briefly after fire)
    let motif = motifPayload?.motifId || null;
    let motifMeta = motifPayload;
    if (!motif && (secType === 'chorus' || secType === 'outro') && sp?.motifAction) {
      motif = this.plan.motifs[0] || null;
      if (motif) {
        motifMeta = this.narrative._packMotif(motif, chorusRepeat, secType === 'outro' ? 0.85 : 0.55);
      }
    }

    // Physical events from plan + role-driven hits
    const fireEvents = [];
    if (sp?.physicalEvents) {
      for (const ev of sp.physicalEvents) {
        if (Math.abs(time - ev.t) < 0.08) {
          if (this.variation.canEffect(ev.type, now, 2000)) fireEvents.push(ev.type);
        }
      }
    }
    if (audio.drop > 0.7 && audio.energy < 0.15 && this.variation.canEffect('blackout', now, 4000)) {
      fireEvents.push('blackout');
    }
    if (!speechLike && audio.onset > 0.7 && audio.bass > 0.55 && physicalSection) {
      if (this.variation.canEffect('white_flash', now, 2500)) fireEvents.push('white_flash');
    }
    // speechLike/nonGroove: suppress role-gated cast thrash + fake drop choreography
    if (!speechLike) {
      if (roles.kickPunch > 0.72 && this.variation.canEffect('kick_punch', now, 320)) {
        fireEvents.push('kick_punch');
      }
      if (roles.snareFlash > 0.7 && this.variation.canEffect('snare_flash', now, 280)) {
        fireEvents.push('snare_flash');
      }
      if (roles.harshGlitch > 0.65 && this.variation.canEffect('harsh_glitch', now, 900)) {
        fireEvents.push('harsh_glitch');
      }
      if (roles.bassWeight > 0.8 && physicalSection && this.variation.canEffect('bass_collapse', now, 1800)) {
        fireEvents.push('collapse');
      }
    }

    let imagery = sp?.imagery || this.plan.theme;
    if (this._liveConcept?.imageryPick) {
      imagery = this._liveConcept.imageryPick;
    }
    if (activePhrase?.text) {
      imagery = `${imagery || ''} — "${activePhrase.text}"`.trim();
    }

    preset = this.currentPreset;

    let palette = this.plan.palette;
    if (this._liveTint && now < this._liveTint.until) {
      if (this._liveTint.aggression > 0.6) palette = DEFAULT_PALETTES.aggressive;
      else if (this._liveTint.darkness > 0.65) palette = DEFAULT_PALETTES.dark;
      else if (this._liveTint.hope > 0.65) palette = DEFAULT_PALETTES.hopeful;
    }
    palette = this._paletteFromEmotion(emotion, palette);

    const roleHit =
      roles.kickPunch * 0.18 +
      roles.bassWeight * 0.16 +
      roles.snareFlash * 0.12 +
      roles.hatsSparks * 0.08 +
      roles.padsWash * 0.06 +
      roles.leadBeam * 0.14 +
      roles.harshGlitch * 0.1 +
      (audio?.energy || 0) * 0.1;
    const baseIntensity = sp?.intensity ?? 0.5;
    const intensity = Math.min(1.5, baseIntensity * (0.72 + roleHit * 0.55) + motifStrength * 0.08);

    if (roles.bassWeight > 0.6) {
      scaleState.particleMul *= 1 + roles.bassWeight * 0.15;
      scaleState.cameraMul *= 1 + roles.bassWeight * 0.1;
      scaleState.bloomMul *= 1 + roles.padsWash * 0.12;
    }

    const camera = this.variation.pickCamera(sp?.cameraMood || ['drift'], now);
    const symbols = [
      ...(sp?.symbols || []),
      ...((this._liveConcept?.symbols) || [])
    ].slice(0, 4);
    for (const s of symbols) this.narrative.rememberSymbol(s);

    const cast = this._liveCast(sp, secType, chorusRepeat, scaleState.name, vocal, activePhrase, audio, speechSteer, roles, sectionChangeId);
    const motifProps = this._liveMotifProps(sp, secType, chorusRepeat, motifMeta);

    return {
      theme: this.plan.theme,
      preset,
      previousPreset: this.transition?.from || preset,
      transition: this.transition && now - this.transition.start < this.transition.duration
        ? {
            progress: (now - this.transition.start) / this.transition.duration,
            from: this.transition.from,
            to: this.transition.to,
            mode: this.transition.mode || 'morph'
          }
        : null,
      imagery,
      intent: sp?.intent,
      arc: sp?.arc,
      intensity,
      scale: scaleState,
      motif,
      motifAction: sp?.motifAction,
      motifStrength: motifMeta?.strength ?? motifStrength,
      motifVariant: motifMeta?.variant || null,
      symbols,
      events: fireEvents,
      camera,
      lighting: sp?.lightingMood || ['wash'],
      palette,
      fantasyText: this.plan.fantasyText,
      vocalEnergy: Math.max(vocal?.intensity || 0, roles.leadBeam),
      sectionType: secType,
      chorusRepeat,
      liveConceptId: this._liveConcept?.id || null,
      // Vibe routing owns the active family; preset overlaps (meadow/autumn,
      // storm/warzone) must not hide a live peaceful/chaotic assignment.
      packFamily: this.narrative.getPackFamily() || familyOfPreset(preset),
      // Character presence (Worlds placement: sky | mid | foreground)
      cast,
      characters: cast,
      vibeFamily: vibeDom.family || 'neutral',
      genreFamily: this.narrative.getGenreFamily?.() || this._lastGenreMeta?.genreFamily || null,
      pleasureIntent: this.narrative.getPleasureIntent?.() || this._lastGenreMeta?.pleasureIntent || null,
      danceIntent: cast?.danceIntent || null,
      danceEnergy: cast?.danceEnergy || 0,
      speechLike,
      speechSteer,
      // Motif props that return (__amplified / __peak on chorus)
      motifProps,
      // Quality gap 5 — sticky last-good phrase expiry gate
      lyricStickExpire,
      sectionChangeId,
      rolesIntent: {
        kickPunch: roles.kickPunch,
        bassWeight: roles.bassWeight,
        snareFlash: roles.snareFlash,
        hatsSparks: roles.hatsSparks,
        padsWash: roles.padsWash,
        leadBeam: roles.leadBeam,
        harshGlitch: roles.harshGlitch,
        shake: roles.kickPunch,
        vignette: roles.bassWeight,
        rainNeedles: roles.hatsSparks,
        skyFog: roles.padsWash,
        lyricEmphasis: roles.leadBeam
      }
    };
  }

  _fallbackDirective(emotion, section, audio, vocal) {
    const roles = this._rolesIntents(audio, vocal);
    const scaleState = this.scale.update(emotion, section, null);
    const secType = section?.type || 'verse';
    const fbDom = dominantVibe(audio);
    let cast = resolveLibraryCast({
      dom: fbDom,
      sectionType: secType,
      action: 'walk',
      placement: 'foreground',
      holdSilent: false,
      count: 1,
      opacity: 0.85
    });
    if (Array.isArray(cast.members) && cast.members.length) {
      cast.members = applyRoleBinding(cast.members, roles, {
        sectionType: secType,
        speechLike: !!fbDom.speechLike,
        vibeFamily: fbDom.family || 'neutral',
        archetype: cast.archetype,
        expand: false
      });
      cast.roleBound = true;
    }
    const fbVocal = !!((audio?.roles?.vocalish ?? audio?.roles?.lead ?? 0) >= 0.42);
    ensureCastPresence(cast, {
      speechLike: !!fbDom.speechLike,
      vibeFamily: fbDom.family || 'neutral',
      sectionType: secType,
      ladder: fbDom.ladder || null,
      aggression: fbDom.aggression ?? audio?.vibe?.aggression ?? 0,
      vocalFocus: fbVocal
    });
    if (Array.isArray(cast.members) && cast.members.length) {
      const gFam = getGenreFamily(this.narrative.getGenreFamily?.() || '') || null;
      cast.members = applyDanceIntent(cast.members, cast, {
        sectionType: secType,
        speechLike: !!fbDom.speechLike,
        vibeFamily: fbDom.family || 'neutral',
        danceBias: gFam?.danceBias || (fbDom.speechLike ? 'low' : 'mid'),
        intensity: 0.45 + (audio?.energy || 0.3) * 0.4,
        chorusRepeat: 1,
        afterGate: secType === 'breakdown' || secType === 'drop',
        roles,
        archetype: cast.archetype,
        ladder: fbDom.ladder || null,
        aggression: fbDom.aggression ?? audio?.vibe?.aggression ?? 0,
        energy: audio?.energy || 0
      });
    }
    return {
      theme: 'Emerging vision',
      preset: this.currentPreset || 'dream_clouds',
      previousPreset: null,
      transition: null,
      imagery: 'Forms gathering from sound',
      intent: 'live improvise',
      arc: 'narrative',
      intensity: 0.5 + (audio?.energy || 0) * 0.4 + roles.kickPunch * 0.1,
      scale: scaleState,
      motif: null,
      motifAction: null,
      motifStrength: 0,
      motifVariant: null,
      symbols: [],
      events: [],
      camera: 'drift',
      lighting: ['wash'],
      palette: this._paletteFromEmotion(emotion, DEFAULT_PALETTES.cinematic),
      fantasyText: '',
      vocalEnergy: roles.leadBeam,
      sectionType: secType,
      chorusRepeat: section?.repeat || 1,
      cast,
      characters: cast,
      motifProps: [],
      lyricStickExpire: false,
      sectionChangeId: this._sectionChangeId,
      rolesIntent: {
        kickPunch: roles.kickPunch,
        bassWeight: roles.bassWeight,
        snareFlash: roles.snareFlash,
        hatsSparks: roles.hatsSparks,
        padsWash: roles.padsWash,
        leadBeam: roles.leadBeam,
        harshGlitch: roles.harshGlitch,
        shake: roles.kickPunch,
        vignette: roles.bassWeight,
        rainNeedles: roles.hatsSparks,
        skyFog: roles.padsWash,
        lyricEmphasis: roles.leadBeam
      }
    };
  }

  /**
   * Live lyric→scene direction: when the active phrase's concept changes,
   * push scenery toward that concept with continuity morph (not a hard cut).
   * Cast/prop intensify allowed under live steer lock without swapping world mid-chorus.
   */
  reactToLyricConcept(concept, now = performance.now(), ctx = {}) {
    if (!concept) return null;
    const key = concept.id || concept.imageryPick || '';
    if (!key) return this._liveConcept;

    const conceptChanged = key !== this._lastPhraseKey;
    this._liveConcept = concept;
    this._liveConceptAt = now;

    // Lyrics speechSteer 0..1 → longer lyric-world lock, holdSilent cast
    const steer = typeof concept.speechSteer === 'number' ? concept.speechSteer
      : (typeof concept.frameOwnership === 'number' && String(concept.frameOwnershipHint || concept.frameOwnership || '').includes('lyric')
        ? concept.frameOwnership : 0);
    if (steer > 0) this._speechSteer = Math.max(this._speechSteer || 0, Math.min(1, steer));
    else if (ctx.speechSteer > 0) this._speechSteer = Math.max(this._speechSteer || 0, Math.min(1, ctx.speechSteer));

    if (concept.mood) {
      this._liveTint = {
        darkness: concept.mood.darkness ?? 0.4,
        hope: concept.mood.hope ?? 0.3,
        aggression: concept.mood.aggression ?? 0.2,
        until: now + 9000
      };
    }

    const secType = ctx.section?.type;
    if (concept.symbols?.length && (secType === 'verse' || secType === 'pre' || !secType)) {
      for (const sym of concept.symbols.slice(0, 2)) {
        this.narrative.establishMotif(sym, secType || 'verse', 0.5);
        this.narrative.queueCallback(sym, 'chorus', 0.55);
        this.narrative.rememberSymbol(sym);
      }
      const propIds = propsForConcept(concept, concept.symbols);
      this.narrative.plantProps(propIds, secType || 'verse');
      const cast = castFromConcept(concept);
      this.narrative.establishCast(cast);
    }

    // Pack family hint from concept (don't force mid-chorus world swap)
    const pack = CONCEPT_PACK[concept.id];
    if (pack && (secType === 'verse' || secType === 'intro' || !this.narrative.getPackFamily())) {
      this.narrative.setPackFamily(pack.family);
    }

    if (!conceptChanged) {
      return concept;
    }
    this._lastPhraseKey = key;

    // Mid-chorus: allow cast/prop intensify only — do not swap world under lock
    if (secType === 'chorus' && now < this._liveSteerUntil) {
      return concept;
    }

    let rawPresets = (concept.presets || []).map(p => this._normalizePreset(p));
    if (pack?.presets) {
      rawPresets = [...pack.presets.map(p => this._normalizePreset(p)), ...rawPresets];
    }
    const presets = [...new Set(rawPresets)].filter(Boolean);
    const target = presets[0];
    if (!target || target === this.currentPreset) {
      return concept;
    }

    const physical = secType === 'breakdown' || secType === 'drop';
    const allowed = physical
      ? this.variation.canChangeScene(now, 1800)
      : this.variation.canChangeForConcept(now, concept.id, {
          sameConceptGap: (this._speechSteer || 0) >= 0.45 ? 6000 : 11000,
          newConceptGap: (this._speechSteer || 0) >= 0.45 ? 1400 : 2600
        });

    if (!allowed) return concept;

    const candidates = this.variation.avoidRecent(
      [target, ...presets.slice(1, 3)],
      22000,
      now
    );
    const next = this._orderByContinuity(candidates, this.currentPreset, secType)[0] || target;
    if (next === this.currentPreset) return concept;

    // Stay in pack family unless physical gate
    const curFam = familyOfPreset(this.currentPreset) || this.narrative.getPackFamily();
    const nextFam = familyOfPreset(next);
    if (!physical && secType === 'chorus' && curFam && nextFam && curFam !== nextFam) {
      const familyPick = (PACK_FAMILIES[curFam] || []).find(p => candidates.includes(p) || presets.includes(p));
      if (familyPick && familyPick !== this.currentPreset) {
        // morph within family instead
        this.variation.recordScene(familyPick, now, concept.id);
        this.narrative.rememberScene(familyPick, 'lyric', now / 1000);
        this.transition = {
          from: this.currentPreset,
          to: familyPick,
          start: now,
          duration: 1500,
          mode: 'morph'
        };
        this.variation.recordTransition('lyric_morph_family', now);
        this.currentPreset = familyPick;
        this._liveSteerPreset = familyPick;
        this._liveSteerUntil = now + 5500;
        return concept;
      }
      // Keep current world; cast still updates via tick
      return concept;
    }

    this.variation.recordScene(next, now, concept.id);
    this.narrative.rememberScene(next, 'lyric', now / 1000);
    this.transition = {
      from: this.currentPreset,
      to: next,
      start: now,
      duration: physical ? 500 : 1500,
      mode: physical ? 'cut' : 'morph'
    };
    this.variation.recordTransition(physical ? 'lyric_cut' : 'lyric_morph', now);
    this.currentPreset = next;
    this._liveSteerPreset = next;
    const lyricSteer = this._speechSteer || 0;
    let lockMs = secType === 'pre' ? 4000 : secType === 'chorus' ? 5500 : 7000;
    // Higher speechSteer → longer lyric-steer lock (lyric world owns frame)
    if (lyricSteer >= 0.45) lockMs = Math.round(lockMs * (1.35 + lyricSteer * 0.5));
    this._liveSteerUntil = now + (physical && lyricSteer < 0.45 ? 1200 : lockMs);

    return concept;
  }

  getPlan() {
    return this.plan;
  }

  getNarrative() {
    return this.narrative.get();
  }
}
