/**
 * art7 — lyrics-first direction (QA-0350, Darrell's rule: the vibe must match the song).
 *
 * analyzeLyricMood(phrases) classifies a CONFIDENT synced sheet (LRC timing, ≥8 lines) as
 * tender / longing / breakup vs violent. A lyric-led song (tender, not violent) blocks the
 * warzone / weapons imagery even when the audio is loud: the director swaps the HARD_LOCK pool for
 * intense-but-emotional painted worlds (rainy neon city, misty lake, space, dream clouds …), with
 * storm reserved for anguish lines and the forge (fire) only for fire imagery.
 * lineWorld(text) maps concrete imagery in one line (city lights, ocean, stars, rain, fire …)
 * to the matching painted world.
 */

const TENDER = /\b(lov(e|es|ed|er|ing)|heart|arms|hold(ing)?|kiss(es|ed)?|touch|miss(ing)?|alone|lonely|remember(ing)?|goodbye|leav(e|ing)|gone|go|into you|safe(r)?|comfort|charms|baby|darling|together|apart|tears?|cry(ing)?|sad|tired|care|walk away|idealized|deep|eyes|forever|lost|hurt|broken|heartbreak|sorry|wish|close)\b/i;
const VIOLENT = /\b(war|wars|fight(ing)?|kill(ing|ed)?|guns?|blood(y)?|bullets?|rage|enemy|enemies|battle|destroy|hate|bombs?|army|weapons?|soldiers?|tanks?|riot|attack|revenge|smash|crush|murder|slaughter|warrior|march|siege|burn it down)\b/i;
const ANGUISH = /\b(wreck|too deep|in too deep|drown(ing)?|over my head|scream(ing)?|cry(ing)?|tears|break(ing)?|broken|shatter(ed)?|fled|lost|pain|hurt|bleed(ing)?|can'?t|tired|sick of|tangled|vanish|don'?t care|leave me|walk away|goodbye|alone again|chapter to close)\b/i;

// priority order: first match wins
const IMAGERY = [
  [/\b(fire|flames?|burn(ing|s)?|embers?|blaze|ashes|smoke)\b/i, 'metal_hall'],
  [/\b(neon|city|cities|streets?|downtown|store|traffic|taxi|subway|skyline|city lights|headlights|club|bar|exit door|highway|sleepless night|night)\b/i, 'rainy_city'],
  [/\b(rain(ing|y|s)?|umbrella|puddles?|drizzle)\b/i, 'rainy_city'],
  [/\b(storm(s|y)?|thunder|lightning|hurricane|tempest)\b/i, 'storm'],
  [/\b(ocean|sea|waves?|tide|shore|beach|lake|river|water|drown(ing)?|swim(ming)?|harbou?r)\b/i, 'misty_lake'],
  [/\b(stars?|moon(light)?|galax(y|ies)|universe|space|planets?|orbit|cosmos|comets?|satellites?)\b/i, 'space'],
  [/\b(alone|lonely|loneliness)\b/i, 'misty_lake'],
  [/\b(sky|skies|clouds?|air|fly(ing)?|float(ing)?|heaven|dream(s|ing)?|awake|rise|sun(rise|light)?|dawn|light of the day|evaporate)\b/i, 'dream_clouds'],
  [/\b(church|cathedral|pray(er|ing)?|holy|choir|altar|god)\b/i, 'cathedral_space'],
  [/\b(forest|trees?|woods|leaves)\b/i, 'forest'],
  [/\b(fields?|meadow|flowers?|grass|garden|deer)\b/i, 'meadow_fauna'],
  [/\b(dark(ness)?|shadows?|empty|nowhere|cold)\b/i, 'dark_sparse']
];

/** Worlds a lyric-led song may use. Never: apocalyptic_warzone (tank/weapons), red_void. */
export const LYRIC_LED_WORLDS = ['rainy_city', 'misty_lake', 'space', 'dream_clouds', 'cathedral_space', 'dark_sparse', 'forest', 'meadow_fauna', 'storm', 'metal_hall'];
export const LYRIC_LED_BLOCKED = ['apocalyptic_warzone', 'red_void', 'reality_fracture'];
/** rotation between imagery lines: loud song → intense emotional; quiet → tender */
export const LYRIC_POOL_INTENSE = ['rainy_city', 'space', 'misty_lake', 'cathedral_space', 'rainy_city', 'dream_clouds'];
export const LYRIC_POOL_TENDER = ['rainy_city', 'misty_lake', 'dream_clouds', 'space', 'forest', 'meadow_fauna'];

export function lineWorld(text) {
  const s = String(text || '');
  for (const [re, id] of IMAGERY) if (re.test(s)) return id;
  return null;
}
export function lineAnguish(text) { return ANGUISH.test(String(text || '')); }

/**
 * @param {Array<{text:string,start?:number,end?:number}>} phrases aligned phrases
 * @param {{timing?:string, repaired?:boolean}} opts
 */
export function analyzeLyricMood(phrases, opts = {}) {
  const lines = (phrases || []).filter(p => p && p.text && /[a-z]/i.test(p.text) && !/^\(?(chorus|verse|bridge|instrumental)\)?$/i.test(p.text.trim()));
  const n = lines.length;
  const synced = opts.timing === 'lrc' && !opts.repaired;
  let tender = 0, violent = 0, anguish = 0, imagery = 0;
  for (const p of lines) {
    if (TENDER.test(p.text)) tender++;
    if (VIOLENT.test(p.text)) violent++;
    if (ANGUISH.test(p.text)) anguish++;
    if (lineWorld(p.text)) imagery++;
  }
  const tf = n ? tender / n : 0, vf = n ? violent / n : 0;
  const led = synced && n >= 8 && tf >= 0.2 && vf < 0.12 && tender >= 2 * Math.max(1, violent);
  const timed = lines.filter(p => Number.isFinite(p.start)).map(p => ({ t: p.start, end: Number.isFinite(p.end) ? p.end : null, text: p.text, world: lineWorld(p.text), anguish: lineAnguish(p.text) }));
  timed.sort((a, b) => a.t - b.t);
  return { led, synced, lines: n, tender: +tf.toFixed(3), violent: +vf.toFixed(3), anguish: n ? +(anguish / n).toFixed(3) : 0, imagery, timed,
    mood: led ? (anguish / Math.max(1, n) > 0.3 ? 'breakup' : 'tender') : (vf >= 0.12 ? 'violent' : 'neutral') };
}

/** line active (or about to start within `lead` s) at time t */
export function lineAt(LM, t, lead = 1.0) {
  const L = LM?.timed; if (!L?.length || !Number.isFinite(t)) return null;
  let i = -1;
  for (let k = 0; k < L.length; k++) { if (L[k].t <= t + lead) i = k; else break; }
  if (i < 0) return null;
  const ln = L[i];
  const end = ln.end != null ? ln.end + 1.5 : (L[i + 1] ? Math.min(L[i + 1].t, ln.t + 9) : ln.t + 8);
  if (t > end) return null;
  return { idx: i, ...ln };
}
