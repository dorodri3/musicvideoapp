/**
 * CEO Nov24 / bot 1 decision: ONE Auto picker — Worlds' pickStyleFamily decides.
 * This module only COLLECTS the inputs (lyricMood, genre, energy, aggression, vibe, hardOnly)
 * and returns whatever pickStyleFamily returns. No scoring here, so the two can't disagree.
 */
import { pickStyle } from '../scene/styleFamilies.js?v=mood4';

export const AUTO_LOOKS = ['candy_pop', 'ember_wasteland', 'sad', 'horror', 'cinematic', 'cozy'];

// The intro-time genre/vibe analyzer calls most quiet intros spoken/ambient/peaceful: never a real genre.
const NOT_A_GENRE = /^(|unknown|spoken|ambient|ambient_void|void_dream|peaceful|spoken_word_bed|none)$/;
const AMBIG_GENRE = /^(|indie|folk|folk_pastoral|rock|singer_songwriter|country|acoustic)$/;

/** Lyrics Brain storyRead -> picker hints. Only a confident lyric read steers (mode lyric, overall >= 0.6). */
export function storyHints(story, { energy = 0, aggression = 0 } = {}) {
  if (!story || story.mode !== 'lyric') return null;
  const conf = +(story.confidence?.overall ?? 0);
  if (conf < 0.6) return null;
  const type = story.situation?.type || 'none';
  const arcNeg = (story.emotionalArc || []).some(a => /anguish|crisis|rage|anger|fury/.test(a.emotion || '') && (a.intensity ?? 0.6) >= 0.5);
  const loud = energy >= 0.4 || aggression >= 0.6;
  switch (type) {
    case 'breakup': return { lyricMood: 'breakup', why: 'story:breakup' };
    case 'longing_nostalgia': return { lyricMood: 'longing', why: 'story:longing' };
    case 'betrayal_anger': case 'war_conflict': return { lyricMood: 'violent', vibe: loud ? 'aggressive' : null, why: 'story:' + type };
    case 'alienation_crisis': // NIN: crisis on a loud track is Heavy, on a quiet one it is Sad
      return loud || arcNeg ? { lyricMood: '', vibe: aggression >= 0.6 ? 'chaotic' : null, pack: 'chaos', why: 'story:crisis_loud' } : { lyricMood: 'lonely', why: 'story:crisis_quiet' };
    case 'groove_celebration': return { lyricMood: '', vibe: 'groove', genre: 'pop', why: 'story:celebration' };
    case 'love_devotion': return energy >= 0.38 ? { lyricMood: '', genre: 'pop', vibe: 'groove', why: 'story:love_upbeat' } : { lyricMood: 'love', why: 'story:love_quiet' };
    default: return { lyricMood: '', why: 'story:' + type };
  }
}

export function collectAutoInputs(s = {}) {
  const scary = Math.max(+s.scary || 0, (+s.tense || 0) * 0.7);
  let vibeFamily = s.vibeFamily || null;
  if (scary >= 0.5 && !/chaotic|aggressive/.test(String(vibeFamily))) vibeFamily = 'scary';
  let genre = String(s.genre || '').toLowerCase();
  if (NOT_A_GENRE.test(genre)) genre = '';
  let pack = s.packFamily || null;
  if (pack && NOT_A_GENRE.test(String(pack))) pack = null;
  let lyricMood = String(s.lyricMood || '');
  if (lyricMood === 'neutral') lyricMood = '';
  let energy = +s.energy || 0;
  let aggression = Math.max(+s.aggression || 0, +s.harsh || 0);
  let hardOnly = !!s.hardOnly && !s.softClear;
  // Audio Pulse whole-song scan (0s): song character beats the live ladder (which over-arms on groove songs).
  const sc = s.songScan && s.songScan.ok !== false ? s.songScan : null;
  if (sc) {
    energy = +sc.energyMean || 0;
    aggression = +sc.aggression || 0;
    const sg = String(sc.genre || '').toLowerCase();
    genre = (+sc.genreConf || 0) >= 0.6 && !NOT_A_GENRE.test(sg) ? sg : (AMBIG_GENRE.test(genre) || !genre ? '' : genre);
    vibeFamily = { aggressive: 'aggressive', tense: 'tense', peaceful: 'peaceful', warm: 'warm', upbeat: 'groove' }[sc.vibe] || vibeFamily;
    if (sc.vibe === 'upbeat' && AMBIG_GENRE.test(genre)) genre = 'pop';
    if (sc.vibe === 'aggressive') aggression = Math.max(aggression, 0.6);
    hardOnly = hardOnly && sc.vibe === 'aggressive';
  }
  const h = storyHints(s.storyRead, { energy, aggression });
  if (h) {
    lyricMood = h.lyricMood ?? lyricMood;
    if (h.vibe && vibeFamily !== 'scary') vibeFamily = h.vibe;
    if (h.genre && AMBIG_GENRE.test(genre)) genre = h.genre;
    if (h.pack && !pack) pack = h.pack;
  }
  // Darrell: loud sad = strained/fractured SAD, not Heavy. A sad lyric outranks the live hard pin.
  if (/breakup|heartbreak|grief|loss|lonely|longing/.test(lyricMood)) hardOnly = false;
  return {
    genreFamily: genre || null, vibeFamily, packFamily: pack, preset: s.preset || null,
    lyricMood: lyricMood || null, energy, aggression,
    hardOnly, story: h ? h.why : null, scan: sc ? { vibe: sc.vibe, vibeConf: sc.vibeConf, genre: sc.genre, genreConf: sc.genreConf, energyMean: sc.energyMean, aggression: sc.aggression } : null
  };
}

export function autoLook(s = {}) {
  const inputs = collectAutoInputs(s);
  const r = pickStyle(inputs) || {};
  const look = r.look;
  // cozy may arrive as a variant on a host style, or (older Worlds) as look 'cozy' — normalise both
  const variant = r.variant || (look === 'cozy' ? 'cozy' : null);
  return { look, variant, inputs };
}
