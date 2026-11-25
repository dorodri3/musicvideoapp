/**
 * Lyrics Brain — per-song "story read" (no paid API, browser + Node ESM).
 *
 * Reuses:
 * - js/lyrics/parser.js   (LyricsParser, lyricTextLines, idgate lastGate verdicts)
 * - js/lyrics/semantic.js (SemanticExtractor, metaphor-aware CONCEPT_GRAPH, worldCue, props, glueScore)
 *
 * Produces a small, plain, JSON-serializable narrative object for Scene Director:
 *   setting, narrator, mainCharacter, addressee, situation, emotionalArc, keyMoments,
 *   motifs, themes, confidence, mode, logline, meta.
 *
 * Safe defaults in fallback modes ('instrumental' | 'none' | 'lowConfidence') so Scene Director
 * never crashes on null/missing fields.
 */
import { LyricsParser, lyricTextLines } from './parser.js?v=mood4';
import { SemanticExtractor } from './semantic.js?v=mood4';

export const STORY_READ_VERSION = '1.0';

/**
 * Exact contract exported for Scene Director & tooling.
 */
export const STORY_READ_FIELDS = Object.freeze({
  version: 'string — schema version ("1.0")',
  mode: '"lyric" | "lowConfidence" | "instrumental" | "none"',
  logline: 'string — one-line summary of what is likely going on in the song',
  setting: {
    place: 'string — inferred literal setting/place, or "unspecified"',
    worldFamily: 'string|null — semantic world family (neon|nature|warzone|chaos|scary|candy|sacred|spoken|autumn|null)',
    presets: 'string[] — candidate visual world preset ids',
    timeOfDay: '"night" | "dawn" | "day" | "dusk" | null',
    atmosphere: 'string|null — lighting/weather/air quality cue or null',
    evidence: 'string[] — matched setting phrases (max 6)',
    isMetaphorical: 'boolean — true when primary place cues are similes/metaphors rather than literal venue',
    confidence: 'number (0..1)'
  },
  narrator: {
    person: '"first" | "first_plural" | "second" | "third" | "unknown"',
    perspective: 'string — human-readable POV',
    role: 'string — narrator persona/role (e.g. parting_partner, numb_survivor, groove_guide, observer)',
    confidence: 'number (0..1)'
  },
  mainCharacter: {
    kind: '"self" | "lone" | "pair" | "crowd" | "abstract" | "none"',
    role: 'string — protagonist role from semantic figure + story cues',
    state: 'string — emotional/physical state (e.g. weary / detaching, numb / in crisis)',
    agency: '"active" | "conflicted" | "passive" | "neutral"',
    confidence: 'number (0..1)'
  },
  addressee: {
    present: 'boolean',
    kind: '"you_intimate" | "you_listener" | "you_adversary" | "third_party" | "self" | "none"',
    label: 'string — who the narrator is addressing',
    pronouns: 'string[] — detected addressee pronouns',
    confidence: 'number (0..1)'
  },
  situation: {
    type: 'string — breakup | alienation_crisis | groove_celebration | love_devotion | betrayal_anger | struggle_resilience | longing_nostalgia | war_conflict | reflection | instrumental | none',
    summary: 'string — short summary of core situation or conflict',
    conflict: 'string — core tension/problem or "none"',
    stakes: 'string — what is at stake or wanted, or "none"',
    resolution: '"resolved" | "unresolved" | "escalating" | "cyclic" | "neutral"',
    cues: 'string[] — matched conflict/situation phrases (max 8)',
    confidence: 'number (0..1)'
  },
  emotionalArc: 'Array<{ phase:string, label:string, startSec:number|null, endSec:number|null, startFrac:number, endFrac:number, emotion:string, valence:number, intensity:number, tension:number, shift:string|null, lineCount:number }>',
  keyMoments: 'Array<{ index:number, timeSec:number|null, endSec:number|null, text:string, conceptId:string|null, imagery:string|null, props:string[], worldCue:{family:string|null, presets:string[]}|null, glueScore:number, motif:string[], emotion:string, reason:string }>',
  motifs: 'string[] — top recurring semantic motif/prop ids (max 6)',
  themes: 'string[] — top semantic concept ids (max 5)',
  confidence: {
    overall: 'number (0..1)',
    setting: 'number (0..1)',
    narrator: 'number (0..1)',
    mainCharacter: 'number (0..1)',
    addressee: 'number (0..1)',
    situation: 'number (0..1)',
    emotionalArc: 'number (0..1)',
    keyMoments: 'number (0..1)'
  },
  meta: {
    synced: 'boolean',
    lineCount: 'number',
    duration: 'number|null',
    artist: 'string',
    title: 'string',
    gateVerdict: 'string|null',
    source: 'string|null'
  }
});

const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const clamp11 = (v) => Math.max(-1, Math.min(1, Number.isFinite(v) ? v : 0));
const r2 = (v) => Math.round(clamp01(v) * 100) / 100;
const r2s = (v) => Math.round(clamp11(v) * 100) / 100;

const SECTION_TAG_RE = /^[\[(]?(intro|verse|chorus|pre-?chorus|bridge|outro|instrumental|solo|refrain|hook|interlude)(\s*\d*)?[\])]?$/i;
const SIMILE_PREFIX_RE = /(?:\blike\s+(?:a|an|the)?\b|\bas\s+(?:a|an)\b|\bfeels?\s+like\b|\bseems?\s+like\b)/i;
const FIGURATIVE_DISTANCE_RE = /\b(?:million|thousand|hundred)\s+miles\s+away\b|\bworlds?\s+apart\b/i;
const HAND_WAVE_RE = /\bwith\s+a\s+wave\b|\bwave\s+(?:goodbye|good-?bye|away)\b/i;

const PLACE_LEXICON = [
  {
    id: 'neon_city',
    place: 'neon city at night',
    worldFamily: 'neon',
    presets: ['rainy_city', 'neon_highway', 'futuristic_city'],
    timeOfDay: 'night',
    weight: 1.25,
    patterns: [/\bneon\s+city\b/i, /\bcity\s+lights?\b/i, /\bneon\s+lights?\b/i, /\bdowntown\b/i, /\bskyscraper\b/i, /\bsubway\b/i, /\bstreetlights?\b/i, /\bdollar\s+store\b/i, /\bexit\s+door\b/i]
  },
  {
    id: 'rooftop_edge',
    place: 'rooftop / high ledge',
    worldFamily: 'chaos',
    presets: ['dark_sparse', 'rainy_city', 'storm'],
    timeOfDay: null,
    weight: 1.35,
    patterns: [/\brooftops?\b/i, /\bledge\b/i, /\bbalcony\b/i, /\bcliff\b/i]
  },
  {
    id: 'night_drive',
    place: 'open road / car at night',
    worldFamily: 'neon',
    presets: ['neon_highway', 'empty_highway'],
    timeOfDay: 'night',
    weight: 1.15,
    patterns: [/\bheadlights?\b/i, /\bdashboard\b/i, /\bwindshield\b/i, /\brearview\b/i, /\bhighway\b/i, /\bfreeway\b/i, /\bopen\s+road\b/i, /\bdriving\s+alone\b/i]
  },
  {
    id: 'club_dancefloor',
    place: 'club / dancefloor',
    worldFamily: 'candy',
    presets: ['candy_happy', 'futuristic_city'],
    timeOfDay: 'night',
    weight: 1.1,
    patterns: [/\bdance\s*floor\b/i, /\bnight\s*club\b/i, /\bclub\b/i, /\bdisco\b/i, /\bspotlight\b/i]
  },
  {
    id: 'city_street',
    place: 'city street',
    worldFamily: 'neon',
    presets: ['rainy_city', 'empty_highway'],
    timeOfDay: null,
    weight: 0.95,
    patterns: [/\bcity\b/i, /\bstreets?\b/i, /\balley\b/i, /\bsidewalk\b/i, /\btraffic\b/i, /\btaxi\b/i, /\btown\b/i]
  },
  {
    id: 'interior_room',
    place: 'bare room / interior floor',
    worldFamily: 'spoken',
    presets: ['dark_sparse', 'white_void', 'rainy_city'],
    timeOfDay: null,
    weight: 0.85,
    patterns: [/\bbedroom\b/i, /\bon\s+the\s+floor\b/i, /\bfloor\b/i, /\bwall\b/i, /\bwalls\b/i, /\bceiling\b/i, /\bempty\s+(?:room|house|bed)\b/i, /\bchair\b/i, /\bkitchen\b/i, /\bhallway\b/i]
  },
  {
    id: 'shore_ocean',
    place: 'shoreline / open water',
    worldFamily: 'nature',
    presets: ['misty_lake', 'ocean'],
    timeOfDay: null,
    weight: 1.0,
    patterns: [/\bocean\b/i, /\bsea\b/i, /\bshore\b/i, /\bbeach\b/i, /\blake\b/i, /\briver\b/i, /\bharbou?r\b/i, /\btide\b/i, /\bwaves?\b/i]
  },
  {
    id: 'woodland_meadow',
    place: 'woodland / open field',
    worldFamily: 'nature',
    presets: ['forest', 'meadow_fauna'],
    timeOfDay: null,
    weight: 1.0,
    patterns: [/\bforest\b/i, /\bwoods?\b/i, /\btrees?\b/i, /\bmeadow\b/i, /\bgarden\b/i, /\bmountain\b/i]
  },
  {
    id: 'sacred_hall',
    place: 'cathedral / sacred hall',
    worldFamily: 'sacred',
    presets: ['cathedral_space'],
    timeOfDay: null,
    weight: 1.05,
    patterns: [/\bchurch\b/i, /\bcathedral\b/i, /\bchapel\b/i, /\baltar\b/i, /\bpews?\b/i]
  },
  {
    id: 'battleground',
    place: 'ruined battleground',
    worldFamily: 'warzone',
    presets: ['apocalyptic_warzone', 'ancient_ruins'],
    timeOfDay: null,
    weight: 1.15,
    patterns: [/\bbattlefield\b/i, /\btrenches?\b/i, /\bwarzone\b/i, /\bwreckage\b/i, /\bruins?\b/i]
  },
  {
    id: 'cosmos_sky',
    place: 'night sky / open cosmos',
    worldFamily: 'sacred',
    presets: ['space', 'dream_clouds'],
    timeOfDay: 'night',
    weight: 0.7,
    patterns: [/\bstars?\b/i, /\bgalaxy\b/i, /\bcosmos\b/i, /\buniverse\b/i, /\bon\s+the\s+moon\b/i, /\bmoonlight\b/i]
  }
];

const TIME_PATTERNS = [
  ['night', /\b(night|midnight|sleepless\s+night|in\s+the\s+dark|3\s*am|2\s*am|late\s+night|tonight)\b/i],
  ['dawn', /\b(dawn|sunrise|early\s+morning|first\s+light|morning\s+light|light\s+of\s+the\s+day)\b/i],
  ['dusk', /\b(dusk|sunset|twilight|evening|golden\s+hour)\b/i],
  ['day', /\b(noon|afternoon|daylight|sunshine|broad\s+daylight)\b/i]
];

const ATMOSPHERE_PATTERNS = [
  ['rain / wet night', /\b(rain|raining|pouring|drizzle|puddles?|wet)\b/i],
  ['storm / thunder', /\b(storm|thunder|lightning|tempest|hurricane)\b/i],
  ['cold / frost', /\b(cold|snow|ice|frozen|frost|winter)\b/i],
  ['smoke / fire', /\b(fire|flames?|smoke|ashes|burn(ing)?|embers?)\b/i],
  ['dark / shadow', /\b(in\s+the\s+dark|darkness|shadows?|dim|glow)\b/i],
  ['warm / electric', /\b(glow|shine|warm|vibrations?|groove|elation)\b/i]
];

const SITUATION_RULES = {
  breakup: {
    label: 'breakup / pulling away',
    patterns: [
      /\b(goodbye|walk\s+away|if\s+you\s+go|leave\s+me|left\s+me|chapter\s+to\s+close|over\s+us|tangled\s+in|wires\s+of\s+your\s+snare|in\s+too\s+deep|don'?t\s+care\s+if\s+you\s+go|sick\s+of\s+this|evaporate|used\s+to\s+be|let\s+you\s+go|broken\s+heart|heartbreak)\b/i
    ]
  },
  alienation_crisis: {
    label: 'emotional numbness / personal crisis',
    patterns: [
      /\b(don'?t\s+feel\s+any\s*thing|feel\s+nothing|numb|haven'?t\s+found\s+my\s+place|jump\s+from\s+every\s+rooftop|put\s+the\s+gun|blow\s+my\b|wake\s+up\s+on\s+the\s+floor|crawl\s+on\s+your\s+hands|finish\s+you\s+off|million\s+miles\s+away|falling\s+apart|coming\s+undone|can'?t\s+go\s+on|nobody\s+cares)\b/i
    ]
  },
  groove_celebration: {
    label: 'groove / celebration / connection',
    patterns: [
      /\b(ride\s+the\s+groove|ride\s+those\s+vibrations|move\s+your\s+body|elation|enhance\s+love|sounds?\s+of\s+compassion|kisses\s+and\s+some\s+hugs|party|dance|boogie|funk|let'?s\s+go|feel\s+the\s+love|tonight|celebrate)\b/i
    ]
  },
  love_devotion: {
    label: 'romantic devotion / intimacy',
    patterns: [
      /\b(in\s+love\s+with|falling\s+in\s+love|safer\s+in\s+your\s+arms|hold\s+me\s+close|my\s+love|darling|kiss(es|ing)?|embrace|heart\s+beats?\s+for|forever\s+yours)\b/i
    ]
  },
  betrayal_anger: {
    label: 'betrayal / resentment',
    patterns: [
      /\b(betray(ed|al)?|lied\s+to\s+me|stabbed\s+me|two[- ]faced|trusted\s+you|fake\s+smile|revenge|hate\s+you|sold\s+me\s+out)\b/i
    ]
  },
  struggle_resilience: {
    label: 'perseverance / rising above doubt',
    patterns: [
      /\b(ain'?t\s+stopping|won'?t\s+stop|never\s+give\s+up|break\s+free|rise\s+again|dream\s+it|believe\s+it|find\s+a\s+way|keep\s+it\s+moving|power\s+in\s+my\s+hands)\b/i
    ]
  },
  longing_nostalgia: {
    label: 'longing / looking back',
    patterns: [
      /\b(miss\s+you|alone\s+again|remember\s+when|remembering|back\s+then|old\s+days|wish\s+you\s+were|lonely)\b/i
    ]
  },
  war_conflict: {
    label: 'conflict / battle',
    patterns: [
      /\b(war|battle|fight(ing)?|soldier|enemy|bullets?|army|march|siege|defeat|victory)\b/i
    ]
  }
};

const CONFLICT_CUE_RE = /\b(leave|walk\s+away|goodbye|go\b|lost|lose|tired|sick\s+of|wreck|snare|tangled|in\s+too\s+deep|can'?t|won'?t|never|crawl|fall|jump|gun|bleed|hurt|pain|broken|shatter|fight|hate|alone|lonely|weary|stopping|doubt|cry|tears|close|end)\b/i;

const LINE_POSITIVE_RE = /\b(love|compassion|passion|elation|hug|hugs|kisses|groove|vibrations?|dream(ing)?|rise|rising|shine|bright|safe(r)?|comfort|warm|hope|happy|joy|smile|together|free|believe|power|alive)\b/i;
const LINE_NEGATIVE_RE = /\b(sad|wreck|tired|sick|snare|tangled|hurt|pain|cry|tears|alone|lonely|dark|cold|leave|walk\s+away|goodbye|fall|crawl|gun|brains|dead|die|hate|rage|broken|shatter|never|nothing|don'?t\s+feel|weary|bleed|fear|lost)\b/i;
const LINE_HIGH_TENSION_RE = /\b(gun|blow\s+my|brains\s+out|jump|rooftop|snare|in\s+too\s+deep|sick\s+of|rage|scream|crawl|finish\s+you|fall|shatter|fire|burn|fight|war|betray|ride\s+the\s+groove|move\s+your\s+body|ain'?t\s+stopping|elation)\b/i;
const LINE_CRISIS_RE = /\b(put\s+the\s+gun|blow\s+my|brains\s+out|jump\s+from\s+every\s+rooftop|finish\s+you\s+off|crawl\s+on\s+your\s+hands)\b/i;
const LINE_NUMB_RE = /\b(don'?t\s+feel|feel\s+nothing|numb|million\s+miles\s+away|never\s+really\s+mattered|don'?t\s+care|empty|hollow|vanish|evaporate)\b/i;

/**
 * Safe neutral fallback object when lyrics are missing or rejected as instrumental.
 * Scene Director can always read every field without null checks.
 * @param {'instrumental'|'none'|'lowConfidence'} [mode]
 * @param {object} [opts]
 */
export function createFallbackStoryRead(mode = 'none', opts = {}) {
  const safeMode = mode === 'instrumental' || mode === 'lowConfidence' ? mode : 'none';
  const id = opts.identity || {};
  const gate = opts.gate || null;
  const duration = Number.isFinite(opts.duration) && opts.duration > 0 ? Math.round(opts.duration * 10) / 10 : null;
  const isInst = safeMode === 'instrumental';
  const summary = isInst
    ? 'Instrumental or non-matching track — visual story driven by audio.'
    : 'No lyrics available — visual story driven by audio.';

  return {
    version: STORY_READ_VERSION,
    mode: safeMode,
    logline: summary,
    setting: {
      place: 'unspecified',
      worldFamily: null,
      presets: [],
      timeOfDay: null,
      atmosphere: null,
      evidence: [],
      isMetaphorical: false,
      confidence: 0
    },
    narrator: {
      person: 'unknown',
      perspective: 'unspecified',
      role: 'observer',
      confidence: 0
    },
    mainCharacter: {
      kind: 'none',
      role: 'none',
      state: 'neutral',
      agency: 'neutral',
      confidence: 0
    },
    addressee: {
      present: false,
      kind: 'none',
      label: 'none',
      pronouns: [],
      confidence: 0
    },
    situation: {
      type: isInst ? 'instrumental' : 'none',
      summary,
      conflict: 'none',
      stakes: 'none',
      resolution: 'neutral',
      cues: [],
      confidence: 0
    },
    emotionalArc: [],
    keyMoments: [],
    motifs: [],
    themes: [],
    confidence: {
      overall: 0,
      setting: 0,
      narrator: 0,
      mainCharacter: 0,
      addressee: 0,
      situation: 0,
      emotionalArc: 0,
      keyMoments: 0
    },
    meta: {
      synced: false,
      lineCount: 0,
      duration,
      artist: String(id.artist || ''),
      title: String(id.title || ''),
      gateVerdict: gate?.verdict || (isInst ? 'lyric-free' : null),
      source: opts.source || gate?.source || null
    }
  };
}

function normalizePhrases(phrasesOrText) {
  if (!phrasesOrText) return { phrases: [], hasLrcStamps: false };
  if (typeof phrasesOrText === 'string') {
    const raw = phrasesOrText.trim();
    if (!raw) return { phrases: [], hasLrcStamps: false };
    const hasLrcStamps = /\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/.test(raw);
    const parser = new LyricsParser();
    const parsed = parser.parse(raw);
    return { phrases: parsed, hasLrcStamps };
  }
  if (Array.isArray(phrasesOrText)) {
    const clean = phrasesOrText
      .filter(p => p && typeof p.text === 'string' && p.text.trim())
      .map(p => ({
        text: p.text.trim(),
        start: Number.isFinite(p.start) ? p.start : null,
        end: Number.isFinite(p.end) ? p.end : null
      }));
    const hasLrcStamps = clean.some(p => p.start != null);
    return { phrases: clean, hasLrcStamps };
  }
  return { phrases: [], hasLrcStamps: false };
}

function filterLyricPhrases(phrases) {
  return phrases.filter(p => {
    const t = String(p.text || '').trim();
    if (!t || !/[a-z]/i.test(t)) return false;
    if (SECTION_TAG_RE.test(t)) return false;
    return true;
  });
}

function analyzePronouns(lines) {
  const full = lines.map(l => l.text).join('\n');
  const firstSg = (full.match(/\b(i|i'm|i've|i'll|i'd|me|my|mine|myself)\b/gi) || []).length;
  const firstPl = (full.match(/\b(we|we're|we've|we'll|we'd|us|our|ours|ourselves)\b/gi) || []).length;
  const second = (full.match(/\b(you|you're|you've|you'll|you'd|your|yours|yourself)\b/gi) || []).length;
  const third = (full.match(/\b(he|him|his|she|her|hers|they|them|their|theirs)\b/gi) || []).length;
  const total = firstSg + firstPl + second + third;

  const secondTokens = [...new Set((full.match(/\b(you|you're|your|yours|yourself)\b/gi) || []).map(w => w.toLowerCase()))];
  const hasRelationalYou = /\b(in\s+your\s+arms|your\s+charms|love\s+(?:you|from\s+you)|into\s+you|with\s+you|if\s+you\s+go|trusted\s+you|miss\s+you)\b/i.test(full);
  const hasListenerImperative = /\b(ride\s+the\s+groove|move\s+your\s+body|keep\s+it\s+moving|gimme|hear\s+me|close\s+your\s+eyes|listen|hands?\s+up|if\s+you\s+can'?t)\b/i.test(full);
  const hasAdversarialYou = /\b(lied\s+to\s+me|stabbed\s+me|hate\s+you|wires\s+of\s+your\s+snare|enough\s+for\s+you|sick\s+of\s+this|finish\s+you\s+off)\b/i.test(full);

  let person = 'unknown';
  let perspective = 'unspecified';
  if (firstSg >= 2 && firstSg >= firstPl * 1.5 && firstSg >= third) {
    person = 'first';
    perspective = firstPl >= 2 ? 'first-person singular (I) with shared past (we)' : 'first-person singular (I)';
  } else if (firstPl >= 2 && firstPl >= firstSg) {
    person = 'first_plural';
    perspective = 'first-person plural (we)';
  } else if (second >= 3 && firstSg < 2 && firstPl < 2) {
    person = 'second';
    perspective = 'second-person address (you)';
  } else if (third >= 3 && firstSg < 2) {
    person = 'third';
    perspective = 'third-person observer (he/she/they)';
  } else if (firstSg >= 1 || firstPl >= 1) {
    person = firstSg >= firstPl ? 'first' : 'first_plural';
    perspective = firstSg >= firstPl ? 'first-person singular (I)' : 'first-person plural (we)';
  }

  let addresseeKind = 'none';
  let addresseeLabel = 'none';
  let present = false;
  if (second >= 2 || (second >= 1 && (hasRelationalYou || hasListenerImperative))) {
    present = true;
    if (hasRelationalYou && !hasListenerImperative) {
      addresseeKind = 'you_intimate';
      addresseeLabel = hasAdversarialYou ? 'former partner ("you")' : 'partner / loved one ("you")';
    } else if (hasAdversarialYou && !hasRelationalYou && !hasListenerImperative) {
      addresseeKind = 'you_adversary';
      addresseeLabel = 'witness / tense other ("you")';
    } else if (hasListenerImperative && !hasRelationalYou && !hasAdversarialYou) {
      addresseeKind = 'you_listener';
      addresseeLabel = 'listener / dance partner ("you")';
    } else if (hasAdversarialYou && hasListenerImperative && !hasRelationalYou) {
      addresseeKind = 'you_adversary';
      addresseeLabel = 'witness / addressed other ("you")';
    } else if (person === 'first' && /\bwhen\s+you\b/i.test(full)) {
      addresseeKind = 'you_listener';
      addresseeLabel = 'listener / second-person reflection ("you")';
    } else {
      addresseeKind = 'you_listener';
      addresseeLabel = 'addressed other ("you")';
    }
  } else if (third >= 3) {
    present = true;
    addresseeKind = 'third_party';
    addresseeLabel = 'outside others ("they/he/she")';
  } else if (/\bmyself\b/i.test(full)) {
    present = true;
    addresseeKind = 'self';
    addresseeLabel = 'self';
  }

  const narratorConf = total >= 6 ? clamp01(0.55 + Math.min(0.35, (firstSg + firstPl) / 25))
    : total >= 2 ? 0.55 : 0.25;
  const addrConf = present
    ? clamp01(0.45 + Math.min(0.45, (second + (hasRelationalYou ? 2 : 0) + (hasListenerImperative ? 2 : 0)) / 12))
    : (lines.length >= 6 ? 0.45 : 0.2);

  return {
    counts: { firstSg, firstPl, second, third },
    narrator: { person, perspective, confidence: r2(narratorConf) },
    addressee: {
      present,
      kind: addresseeKind,
      label: addresseeLabel,
      pronouns: present ? (secondTokens.length ? secondTokens : ['they']) : [],
      confidence: r2(addrConf)
    }
  };
}

function analyzeSetting(lines, sem) {
  const literalScores = new Map();
  const simileEvidence = [];
  const literalEvidence = [];

  for (const line of lines) {
    const text = line.text;
    for (const rule of PLACE_LEXICON) {
      for (const pat of rule.patterns) {
        const m = text.match(pat);
        if (!m) continue;
        const idx = m.index || 0;
        const prefix = text.slice(Math.max(0, idx - 26), idx);
        const isHandWave = rule.id === 'shore_ocean' && /\bwave/i.test(m[0]) && HAND_WAVE_RE.test(text);
        const isSimile = SIMILE_PREFIX_RE.test(prefix)
          || (rule.id === 'cosmos_sky' && FIGURATIVE_DISTANCE_RE.test(text))
          || isHandWave;
        if (isSimile) {
          simileEvidence.push(`${m[0]} (figurative)`);
        } else {
          literalScores.set(rule.id, (literalScores.get(rule.id) || 0) + rule.weight);
          literalEvidence.push(m[0]);
        }
      }
    }
  }

  const fullText = lines.map(l => l.text).join('\n');
  let timeOfDay = null;
  for (const [tLabel, re] of TIME_PATTERNS) {
    if (re.test(fullText)) { timeOfDay = tLabel; break; }
  }
  const atmoHits = [];
  for (const [aLabel, re] of ATMOSPHERE_PATTERNS) {
    if (re.test(fullText)) atmoHits.push(aLabel);
  }

  let bestRule = null;
  let bestScore = 0;
  for (const rule of PLACE_LEXICON) {
    const s = literalScores.get(rule.id) || 0;
    if (s > bestScore) { bestScore = s; bestRule = rule; }
  }

  const primaryConcept = sem?.primary || null;
  const topWorldCue = primaryConcept?.worldCue || null;

  let place = 'unspecified';
  let worldFamily = topWorldCue?.family || null;
  let presets = topWorldCue?.presets ? topWorldCue.presets.slice(0, 4) : [];
  let isMetaphorical = false;
  let confidence = 0.2;

  if (bestRule && bestScore >= 0.85) {
    // Combine rooftop + interior floor when both appear in crisis tracks
    if ((bestRule.id === 'interior_room' && (literalScores.get('rooftop_edge') || 0) > 0)
        || (bestRule.id === 'rooftop_edge' && (literalScores.get('interior_room') || 0) > 0)) {
      place = 'rooftop / bare floor';
      worldFamily = 'chaos';
      presets = ['dark_sparse', 'red_void', 'rainy_city'];
    } else {
      place = bestRule.place;
      if (!timeOfDay && bestRule.timeOfDay) timeOfDay = bestRule.timeOfDay;
      if (!worldFamily || bestScore >= 1.5) {
        worldFamily = bestRule.worldFamily;
      }
      presets = [...new Set([...bestRule.presets, ...presets])].slice(0, 4);
    }
    confidence = clamp01(0.45 + Math.min(0.42, bestScore * 0.16));
  } else if (simileEvidence.length > 0 && literalEvidence.length === 0) {
    // Only figurative/simile place words (e.g. "like a man on the moon", "like a rising tide") — stay honest!
    place = 'unspecified';
    isMetaphorical = true;
    confidence = 0.25;
  } else if (topWorldCue?.family) {
    place = 'unspecified';
    isMetaphorical = true;
    confidence = 0.3;
  }

  const evidence = [...new Set([...literalEvidence, ...simileEvidence])].slice(0, 6);

  return {
    place,
    worldFamily,
    presets,
    timeOfDay,
    atmosphere: atmoHits.length ? atmoHits.slice(0, 2).join(', ') : null,
    evidence,
    isMetaphorical,
    confidence: r2(confidence)
  };
}

function analyzeSituation(lines, sem, pronouns) {
  const full = lines.map(l => l.text).join('\n');
  const scores = {};
  const matchedCues = [];

  for (const [type, cfg] of Object.entries(SITUATION_RULES)) {
    let s = 0;
    for (const pat of cfg.patterns) {
      const g = new RegExp(pat.source, pat.flags.includes('g') ? pat.flags : pat.flags + 'g');
      const hits = full.match(g);
      if (hits) {
        s += hits.length;
        for (const h of hits) {
          const clean = h.trim();
          if (clean && !matchedCues.includes(clean)) matchedCues.push(clean);
        }
      }
    }
    scores[type] = s;
  }

  const pId = sem?.primary?.id || '';
  if (pId === 'heartbreak' || pId === 'home_leaving') scores.breakup = (scores.breakup || 0) + 1.5;
  if (pId === 'death_void' || pId === 'falling_apart' || pId === 'silence_void') scores.alienation_crisis = (scores.alienation_crisis || 0) + 1.2;
  if (pId === 'candy_joy' || pId === 'love_warmth') scores.groove_celebration = (scores.groove_celebration || 0) + 0.8;
  if (pId === 'war_battle' || pId === 'rage') scores.war_conflict = (scores.war_conflict || 0) + 1.0;

  let bestType = 'reflection';
  let bestScore = 0;
  for (const [type, sc] of Object.entries(scores)) {
    if (sc > bestScore) { bestScore = sc; bestType = type; }
  }

  const tailStart = Math.max(0, Math.floor(lines.length * 0.72));
  const tailText = lines.slice(tailStart).map(l => l.text).join('\n');
  const tailNeg = (tailText.match(LINE_NEGATIVE_RE) || []).length;
  const tailPos = (tailText.match(LINE_POSITIVE_RE) || []).length;
  const tailNumb = (tailText.match(LINE_NUMB_RE) || []).length;
  const tailLeave = /\b(go\b|walk\s+away|close|never|end|stop|don'?t\s+feel)\b/i.test(tailText);

  let resolution = 'neutral';
  if (bestType === 'groove_celebration' || bestType === 'struggle_resilience' || (tailPos >= 2 && tailNeg === 0)) {
    resolution = 'resolved';
  } else if (tailNumb >= 2 || (bestType === 'alienation_crisis' && tailNeg >= 1)) {
    resolution = 'unresolved';
  } else if (bestType === 'breakup' && tailLeave) {
    resolution = 'unresolved';
  } else if (tailNeg > tailPos) {
    resolution = 'escalating';
  } else if (lines.length >= 6) {
    resolution = 'cyclic';
  }

  const lineConflictCues = [];
  for (const l of lines) {
    if (CONFLICT_CUE_RE.test(l.text)) {
      const m = l.text.match(CONFLICT_CUE_RE);
      if (m && !lineConflictCues.includes(m[0].toLowerCase())) {
        lineConflictCues.push(m[0].toLowerCase());
      }
    }
  }
  const cues = [...new Set([...matchedCues, ...lineConflictCues])].slice(0, 8);

  let summary = 'Lyrical reflection';
  let conflict = 'internal tension';
  let stakes = 'emotional clarity';

  if (bestType === 'breakup') {
    summary = pronouns.addressee.present
      ? 'Pulling away from an exhausting relationship and closing the chapter.'
      : 'Enduring a painful breakup and emotional detachment.';
    conflict = 'Entanglement vs. walking away ("in too deep", leaving/closing the chapter).';
    stakes = 'Self-preservation and letting go.';
  } else if (bestType === 'alienation_crisis') {
    summary = 'Severe alienation and emotional numbness escalating into a crisis loop.';
    conflict = 'Disconnection from self and others ("don\'t feel anything", "haven\'t found my place").';
    stakes = 'Survival, feeling real again, breaking out of numbness.';
  } else if (bestType === 'groove_celebration') {
    summary = 'Inviting the listener into rhythm, love, and shared uplift despite weariness.';
    conflict = scores.struggle_resilience > 0
      ? 'Overcoming weariness and doubt through music, love, and dreaming.'
      : 'Breaking isolation by moving together in the groove.';
    stakes = 'Connection, joy, and creative freedom.';
  } else if (bestType === 'love_devotion') {
    summary = 'Intimate affection and devotion toward a loved one.';
    conflict = 'Holding onto closeness and trust.';
    stakes = 'Mutual warmth and belonging.';
  } else if (bestType === 'betrayal_anger') {
    summary = 'Confronting broken trust, deceit, and anger.';
    conflict = 'Betrayal vs. confrontation.';
    stakes = 'Truth and self-respect.';
  } else if (bestType === 'struggle_resilience') {
    summary = 'Pushing past exhaustion and doubt toward a breakthrough.';
    conflict = 'Weariness and obstacles vs. determination.';
    stakes = 'Agency and keeping momentum.';
  } else if (bestType === 'longing_nostalgia') {
    summary = 'Looking back with longing or loneliness.';
    conflict = 'Distance between past closeness and present solitude.';
    stakes = 'Memory vs. moving forward.';
  } else if (bestType === 'war_conflict') {
    summary = 'Confrontation and survival amid conflict.';
    conflict = 'Opposition and struggle.';
    stakes = 'Endurance or victory.';
  } else {
    summary = 'Reflective lyric monologue with open-ended imagery.';
    conflict = cues.length ? `Underlying tension around: ${cues.slice(0, 3).join(', ')}.` : 'subtle emotional tension';
    stakes = 'meaning and perspective';
  }

  const conf = bestScore >= 3 ? clamp01(0.65 + Math.min(0.28, (bestScore - 3) * 0.05))
    : bestScore >= 1 ? 0.55
      : (cues.length >= 2 ? 0.4 : 0.25);

  return {
    type: bestType,
    summary,
    conflict,
    stakes,
    resolution,
    cues,
    confidence: r2(conf)
  };
}

function analyzeCharacter(lines, sem, pronouns, situation) {
  const fig = sem?.primary?.figure || null;
  const counts = pronouns.counts;

  let kind = fig?.presence || 'none';
  if (kind === 'none' || !fig) {
    if (pronouns.addressee.kind === 'you_intimate' && (counts.firstPl >= 1 || counts.firstSg >= 2)) kind = 'pair';
    else if (counts.firstSg >= 2) kind = 'lone';
    else if (counts.firstPl >= 2) kind = 'pair';
    else if (counts.second >= 2) kind = 'self';
    else kind = 'abstract';
  }
  if (situation.type === 'alienation_crisis' && counts.firstSg >= 3) kind = 'self';
  if (situation.type === 'breakup' && pronouns.addressee.present) kind = 'pair';

  const roleMap = {
    breakup: 'parting_partner',
    alienation_crisis: 'numb_survivor',
    groove_celebration: 'groove_guide',
    love_devotion: 'devoted_lover',
    betrayal_anger: 'betrayed_confronter',
    struggle_resilience: 'determined_climber',
    longing_nostalgia: 'solitary_rememberer',
    war_conflict: 'survivor'
  };
  const role = fig?.role && (situation.type === 'reflection' || situation.type === 'longing_nostalgia')
    ? fig.role
    : (roleMap[situation.type] || fig?.role || 'observer');

  const stateMap = {
    breakup: situation.resolution === 'unresolved' ? 'weary / detaching' : 'conflicted / parting',
    alienation_crisis: 'numb / overwhelmed / in crisis',
    groove_celebration: 'energized / uplifting',
    love_devotion: 'warm / attached',
    betrayal_anger: 'guarded / indignant',
    struggle_resilience: 'weary yet determined',
    longing_nostalgia: 'wistful / solitary',
    war_conflict: 'braced / embattled',
    reflection: 'reflective'
  };
  const state = stateMap[situation.type] || 'reflective';

  let agency = 'neutral';
  if (situation.type === 'groove_celebration' || situation.type === 'struggle_resilience') agency = 'active';
  else if (situation.type === 'breakup' || situation.type === 'betrayal_anger' || situation.type === 'alienation_crisis') agency = 'conflicted';
  else if (situation.type === 'longing_nostalgia') agency = 'passive';

  const narratorRole = roleMap[situation.type] || fig?.role || 'narrator';
  const charConf = clamp01(0.35 + (fig?.suggestsCharacter ? 0.2 : 0) + (counts.firstSg + counts.second >= 4 ? 0.3 : 0.1));

  return {
    narratorRole,
    mainCharacter: {
      kind,
      role,
      state,
      agency,
      confidence: r2(charConf)
    }
  };
}

function sanitizeLineConcept(text, lc, situationType) {
  if (!lc) return null;
  if (lc.id === 'ocean_depth' && HAND_WAVE_RE.test(text)) return null;
  if (lc.id === 'dream_surreal' && situationType === 'alienation_crisis' && /\bwake\s+up\s+on\s+the\s+floor\b/i.test(text)) return null;
  if (lc.id === 'lonely_road' && FIGURATIVE_DISTANCE_RE.test(text) && !/\b(highway|road|driving|town|home)\b/i.test(text)) return null;
  return lc;
}

function scoreLineEmotion(text, semExtractor, situationType = 'reflection') {
  const posHits = (text.match(new RegExp(LINE_POSITIVE_RE.source, 'gi')) || []).length;
  const negHits = (text.match(new RegExp(LINE_NEGATIVE_RE.source, 'gi')) || []).length;
  const tensionHits = (text.match(new RegExp(LINE_HIGH_TENSION_RE.source, 'gi')) || []).length;
  const crisisHits = (text.match(new RegExp(LINE_CRISIS_RE.source, 'gi')) || []).length;
  const numbHits = (text.match(new RegExp(LINE_NUMB_RE.source, 'gi')) || []).length;

  const rawLc = semExtractor.extractLine(text);
  const lc = sanitizeLineConcept(text, rawLc, situationType);
  const m = lc?.mood || {};
  let valence = (posHits - negHits - crisisHits * 1.4) * 0.28;
  if (typeof m.valence === 'number') valence = valence * 0.55 + m.valence * 0.45;
  let intensity = Math.min(1, 0.28 + (tensionHits * 0.24) + (crisisHits * 0.3) + (posHits + negHits) * 0.12 + (typeof m.arousal === 'number' ? m.arousal * 0.35 : 0));
  let tension = Math.min(1, 0.2 + tensionHits * 0.26 + crisisHits * 0.35 + negHits * 0.12 + (typeof m.tension === 'number' ? m.tension * 0.4 : 0));
  if (numbHits > 0) {
    valence = Math.min(valence, -0.35);
    tension = Math.max(tension, 0.45);
  }
  return {
    valence: clamp11(valence),
    intensity: clamp01(intensity),
    tension: clamp01(tension),
    numb: numbHits > 0,
    crisis: crisisHits > 0,
    posHits,
    negHits,
    lineConcept: lc
  };
}

function phaseEmotionLabel(avgVal, avgInt, avgTen, numbFrac, crisisFrac, situationType) {
  if (crisisFrac >= 0.12 || (avgVal <= -0.25 && avgTen >= 0.55)) return 'crisis_anguish';
  if (numbFrac >= 0.35) return 'numbness';
  if (avgVal >= 0.25 && avgInt >= 0.55) return situationType === 'groove_celebration' ? 'euphoric_groove' : 'uplifted';
  if (avgVal >= 0.12) return 'warm_playful';
  if (avgVal <= -0.22) return situationType === 'breakup' ? 'detached_heartache' : 'heavy_melancholy';
  if (avgTen >= 0.52) return 'tense_conflicted';
  return 'reflective';
}

function buildEmotionalArc(lines, synced, duration, sections, semExtractor, situationType) {
  if (!lines.length) return [];

  let buckets = [];
  const totalDur = duration > 0 ? duration : (synced && lines[lines.length - 1].end ? lines[lines.length - 1].end : null);

  if (Array.isArray(sections) && sections.length >= 2 && sections.length <= 7 && synced) {
    for (const sec of sections) {
      const slice = lines.filter(l => l.start != null && l.start >= sec.start - 0.5 && l.start < sec.end + 0.5);
      if (slice.length >= 2) {
        buckets.push({
          phase: sec.type || 'section',
          label: sec.label || sec.type || 'section',
          startSec: Math.round(sec.start * 100) / 100,
          endSec: Math.round(sec.end * 100) / 100,
          lines: slice
        });
      }
    }
  }

  if (buckets.length < 2 || buckets.length > 6) {
    buckets = [];
    const nPhases = lines.length >= 12 ? 4 : lines.length >= 6 ? 3 : 2;
    const names = nPhases === 4
      ? ['opening', 'development', 'climax', 'ending']
      : nPhases === 3
        ? ['opening', 'middle', 'ending']
        : ['opening', 'ending'];
    for (let i = 0; i < nPhases; i++) {
      const a = Math.floor((i * lines.length) / nPhases);
      const b = i === nPhases - 1 ? lines.length : Math.floor(((i + 1) * lines.length) / nPhases);
      const slice = lines.slice(a, b);
      if (!slice.length) continue;
      const startSec = synced && slice[0].start != null ? Math.round(slice[0].start * 100) / 100 : null;
      const last = slice[slice.length - 1];
      const endSec = synced && (last.end != null || last.start != null)
        ? Math.round((last.end ?? last.start) * 100) / 100
        : null;
      buckets.push({
        phase: names[i],
        label: names[i],
        startSec,
        endSec,
        lines: slice
      });
    }
  }

  const arc = [];
  let prev = null;
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    let vSum = 0, iSum = 0, tSum = 0, numbCount = 0, crisisCount = 0;
    for (const l of b.lines) {
      const s = scoreLineEmotion(l.text, semExtractor, situationType);
      vSum += s.valence;
      iSum += s.intensity;
      tSum += s.tension;
      if (s.numb) numbCount++;
      if (s.crisis) crisisCount++;
    }
    const k = b.lines.length || 1;
    const valence = r2s(vSum / k);
    const intensity = r2(iSum / k);
    const tension = r2(tSum / k);
    const emotion = phaseEmotionLabel(valence, intensity, tension, numbCount / k, crisisCount / k, situationType);

    let shift = null;
    if (prev) {
      if (emotion === 'numbness' && prev.emotion !== 'numbness') shift = 'numbs';
      else if (valence - prev.valence >= 0.2) shift = 'turns_bright';
      else if (prev.valence - valence >= 0.2) shift = 'turns_dark';
      else if (intensity - prev.intensity >= 0.12 || tension - prev.tension >= 0.12) shift = 'escalates';
      else if (prev.intensity - intensity >= 0.12) shift = 'softens';
      else shift = 'steady';
    }

    const startFrac = b.startSec != null && totalDur
      ? r2(b.startSec / totalDur)
      : r2(i / buckets.length);
    const endFrac = b.endSec != null && totalDur
      ? r2(b.endSec / totalDur)
      : r2((i + 1) / buckets.length);

    const entry = {
      phase: b.phase,
      label: b.label,
      startSec: synced ? b.startSec : null,
      endSec: synced ? b.endSec : null,
      startFrac,
      endFrac,
      emotion,
      valence,
      intensity,
      tension,
      shift,
      lineCount: b.lines.length
    };
    arc.push(entry);
    prev = entry;
  }
  return arc;
}

function selectKeyMoments(lines, synced, semExtractor, situationType) {
  if (!lines.length) return [];
  const scored = [];
  const seenTexts = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const norm = line.text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    if (!norm) continue;
    const info = scoreLineEmotion(line.text, semExtractor, situationType);
    const lc = info.lineConcept;
    const hasConflict = CONFLICT_CUE_RE.test(line.text);
    const isOpeningAnchor = i === 0;
    const isClosingAnchor = i === lines.length - 1 || i === lines.length - 2;

    let score = 0;
    let reason = 'narrative_beat';
    if (lc) {
      score += (lc.glueScore || 0.4) * 1.2 + Math.min(0.4, (lc.matched?.length || 1) * 0.15);
      reason = 'high_glue_imagery';
    }
    if (hasConflict || info.crisis) {
      score += info.crisis ? 0.9 : 0.45;
      if (!lc || info.tension >= 0.55 || info.crisis) reason = 'conflict_peak';
    }
    if (info.numb) {
      score += 0.35;
      if (!lc) reason = 'emotional_turn';
    }
    if (isOpeningAnchor) score += 0.2;
    if (isClosingAnchor) score += 0.25;

    const emotion = info.crisis ? 'crisis'
      : info.numb ? 'numbness'
        : info.valence >= 0.2 ? 'warm_uplift'
          : info.tension >= 0.55 ? 'high_tension'
            : info.valence <= -0.2 ? 'sorrow'
              : 'reflective';

    scored.push({
      index: i,
      norm,
      score,
      timeSec: synced && line.start != null ? Math.round(line.start * 100) / 100 : null,
      endSec: synced && line.end != null ? Math.round(line.end * 100) / 100 : null,
      text: line.text,
      conceptId: lc?.id || null,
      imagery: lc?.imagery?.[0] || null,
      props: Array.isArray(lc?.props) ? lc.props.slice(0, 4) : [],
      worldCue: lc?.worldCue ? { family: lc.worldCue.family || null, presets: (lc.worldCue.presets || []).slice(0, 4) } : null,
      glueScore: lc ? r2(lc.glueScore || 0) : 0,
      motif: Array.isArray(lc?.motif) ? lc.motif.slice(0, 3) : [],
      emotion,
      reason
    });
  }

  const target = Math.min(6, Math.max(2, Math.ceil(lines.length / 5)));
  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const picked = [];
  for (const item of scored) {
    if (picked.length >= target) break;
    if (seenTexts.has(item.norm)) continue;
    const tooClose = picked.some(p => Math.abs(p.index - item.index) <= 1) && picked.length >= 2;
    if (tooClose) continue;
    seenTexts.add(item.norm);
    picked.push(item);
  }
  picked.sort((a, b) => a.index - b.index);
  return picked.map(({ norm, score, ...rest }) => rest);
}

function buildLogline({ setting, addressee, situation, identity }) {
  const titlePart = identity?.title ? `"${identity.title}"` : 'This song';
  const placePart = setting.place !== 'unspecified' ? ` in a ${setting.place}` : '';
  const addrPart = addressee.present && addressee.kind === 'you_intimate'
    ? ' addressed to a partner'
    : addressee.present && addressee.kind === 'you_listener'
      ? ' spoken directly to the listener'
      : '';

  if (situation.type === 'breakup') {
    return `${titlePart}: a first-person breakup${placePart}${addrPart} — exhausted by entanglement, pulling away (${situation.resolution}).`;
  }
  if (situation.type === 'alienation_crisis') {
    return `${titlePart}: an alienated narrator${placePart} spiraling through numbness and crisis (${situation.resolution}).`;
  }
  if (situation.type === 'groove_celebration') {
    return `${titlePart}: an upbeat invitation${addrPart} to ride the groove, shake off weariness, and dream forward.`;
  }
  if (situation.type === 'love_devotion') {
    return `${titlePart}: an intimate expression of devotion${placePart}${addrPart}.`;
  }
  if (situation.type === 'betrayal_anger') {
    return `${titlePart}: confronting broken trust and resentment${addrPart}.`;
  }
  if (situation.type === 'struggle_resilience') {
    return `${titlePart}: pushing through doubt and fatigue toward renewal.`;
  }
  return `${titlePart}: ${situation.summary}`;
}

/**
 * Build a per-song story read from parsed phrases or raw lyrics text.
 * Reuses parser.js, semantic.js, and alignment-style timestamps.
 *
 * @param {Array<{text:string,start?:number|null,end?:number|null}>|string} phrasesOrText
 * @param {{
 *   synced?: boolean,
 *   duration?: number,
 *   identity?: { artist?: string, title?: string },
 *   gate?: object|null,
 *   sections?: Array|null,
 *   semantic?: object|null,
 *   fantasyText?: string,
 *   source?: string|null,
 *   instrumental?: boolean
 * }} [opts]
 */
export function buildStoryRead(phrasesOrText, opts = {}) {
  const gate = opts.gate || null;
  const identity = opts.identity || {};
  const duration = Number.isFinite(opts.duration) && opts.duration > 0 ? Math.round(opts.duration * 10) / 10 : null;

  if (opts.instrumental || gate?.lyricFree || gate?.verdict === 'lyric-free' || gate?.vocalDrop) {
    return createFallbackStoryRead('instrumental', { identity, gate, duration, source: opts.source });
  }

  const { phrases, hasLrcStamps } = normalizePhrases(phrasesOrText);
  const lines = filterLyricPhrases(phrases);
  if (!lines.length) {
    return createFallbackStoryRead('none', { identity, gate, duration, source: opts.source });
  }

  const synced = typeof opts.synced === 'boolean'
    ? opts.synced
    : (hasLrcStamps && !gate?.lowConfidence && gate?.verdict !== 'plain');

  const isLowConfidence = !!(gate?.lowConfidence || gate?.verdict === 'plain' || lines.length < 4);
  const mode = isLowConfidence ? 'lowConfidence' : 'lyric';

  const semExtractor = new SemanticExtractor();
  const sem = opts.semantic || semExtractor.extract(lines, opts.fantasyText || '');

  const pronouns = analyzePronouns(lines);
  const setting = analyzeSetting(lines, sem);
  const situation = analyzeSituation(lines, sem, pronouns);
  const { narratorRole, mainCharacter } = analyzeCharacter(lines, sem, pronouns, situation);
  const emotionalArc = buildEmotionalArc(lines, synced, duration, opts.sections, semExtractor, situation.type);
  const keyMoments = selectKeyMoments(lines, synced, semExtractor, situation.type);

  const motifs = [
    ...(sem?.motifCandidates || []),
    ...keyMoments.flatMap(m => m.props || [])
  ].filter(Boolean);
  const uniqueMotifs = [...new Set(motifs)].slice(0, 6);
  const themes = (sem?.concepts || []).map(c => c.id).slice(0, 5);

  const arcConf = r2(lines.length >= 8 ? (synced ? 0.8 : 0.65) : 0.45);
  const kmConf = r2(keyMoments.length ? Math.min(0.85, 0.4 + keyMoments.filter(m => m.conceptId).length * 0.1) : 0.25);

  const cap = isLowConfidence ? 0.48 : 1;
  const rawOverall = (
    setting.confidence * 0.16 +
    pronouns.narrator.confidence * 0.14 +
    mainCharacter.confidence * 0.16 +
    pronouns.addressee.confidence * 0.12 +
    situation.confidence * 0.24 +
    arcConf * 0.1 +
    kmConf * 0.08
  ) * (synced ? 1 : 0.88);
  const overall = r2(Math.min(cap, rawOverall));

  const narrator = {
    person: pronouns.narrator.person,
    perspective: pronouns.narrator.perspective,
    role: narratorRole,
    confidence: r2(Math.min(cap, pronouns.narrator.confidence))
  };
  const addressee = {
    ...pronouns.addressee,
    confidence: r2(Math.min(cap, pronouns.addressee.confidence))
  };
  const cappedSetting = { ...setting, confidence: r2(Math.min(cap, setting.confidence)) };
  const cappedChar = { ...mainCharacter, confidence: r2(Math.min(cap, mainCharacter.confidence)) };
  const cappedSit = { ...situation, confidence: r2(Math.min(cap, situation.confidence)) };

  const logline = buildLogline({
    setting: cappedSetting,
    addressee,
    situation: cappedSit,
    identity
  });

  return {
    version: STORY_READ_VERSION,
    mode,
    logline,
    setting: cappedSetting,
    narrator,
    mainCharacter: cappedChar,
    addressee,
    situation: cappedSit,
    emotionalArc,
    keyMoments,
    motifs: uniqueMotifs,
    themes,
    confidence: {
      overall,
      setting: cappedSetting.confidence,
      narrator: narrator.confidence,
      mainCharacter: cappedChar.confidence,
      addressee: addressee.confidence,
      situation: cappedSit.confidence,
      emotionalArc: r2(Math.min(cap, arcConf)),
      keyMoments: r2(Math.min(cap, kmConf))
    },
    meta: {
      synced,
      lineCount: lines.length,
      duration,
      artist: String(identity.artist || ''),
      title: String(identity.title || ''),
      gateVerdict: gate?.verdict || null,
      source: opts.source || gate?.source || null
    }
  };
}
