/**
 * Soft genreFamily mapping (GENRE-MAP-20260924-2139).
 * Prefer explicit ID3 / user / fantasy tags; else role+texture lean.
 * Explicit gospel/pop/etc. must not flip to metal on harsh spikes.
 */

/** @typedef {'pop'|'hiphop'|'rnb'|'rock'|'folk'|'jazz'|'classical'|'electronic'|'latin'|'afro'|'kpop'|'gospel'|'indie'|'soundtrack'|'spoken'|'noise'|'unknown'} GenreFamily */

const FAMILY_ALIASES = [
  [/gospel|worship|christian|choir|hymn/i, 'gospel'],
  [/k-?pop|j-?pop|c-?pop/i, 'kpop'],
  [/hip-?hop|rap|trap|drill|grime/i, 'hiphop'],
  [/r&b|rnb|soul|neo-?soul|quiet storm/i, 'rnb'],
  [/reggaeton|latin|salsa|samba|bachata|cumbia|bossa/i, 'latin'],
  [/afro|afrobeats|dancehall|reggae|dance-?hall/i, 'afro'],
  [/metal|punk|hardcore|rock|grunge|emo|alt.?rock/i, 'rock'],
  [/country|folk|americana|bluegrass|acoustic/i, 'folk'],
  [/jazz|blues|swing|bebop/i, 'jazz'],
  [/classical|orchestr|symphony|score|opera|piano|chamber|baroque/i, 'classical'],
  [/edm|electronic|electro|house|techno|trance|dubstep|drum.?and.?bass|dnb|ambient|idm|synth/i, 'electronic'],
  [/indie|alternative|alt\b|shoegaze|dream.?pop/i, 'indie'],
  [/soundtrack|trailer|film.?score|ost\b|cinematic/i, 'soundtrack'],
  [/spoken|speech|podcast|audiobook|poetry|non-?music/i, 'spoken'],
  [/noise|experimental|industrial|glitch/i, 'noise'],
  [/pop|dance.?pop|teen.?pop|synth.?pop/i, 'pop']
];

/** Families protected from harsh→metal false flips */
export const HARSH_PROTECTED = new Set(['gospel', 'pop', 'kpop', 'rnb', 'folk', 'classical', 'soundtrack', 'latin', 'afro']);

/**
 * Map free-text (ID3 genre, fantasy, styles) → genreFamily or null.
 * @param {string} text
 * @returns {GenreFamily|null}
 */
export function mapGenreText(text = '') {
  const s = String(text || '').trim();
  if (!s) return null;
  for (const [re, fam] of FAMILY_ALIASES) {
    if (re.test(s)) return fam;
  }
  return null;
}

/**
 * Combine ID3 genre + fantasy + style list → explicit family if any match.
 * @param {{ genre?: string, fantasy?: string, styles?: string[] }} src
 * @returns {{ family: GenreFamily|null, source: 'id3'|'fantasy'|'styles'|'none' }}
 */
export function resolveExplicitGenre(src = {}) {
  const fromId3 = mapGenreText(src.genre || '');
  if (fromId3) return { family: fromId3, source: 'id3' };
  const styles = Array.isArray(src.styles) ? src.styles.join(' ') : (src.styles || '');
  const fromStyles = mapGenreText(styles);
  if (fromStyles) return { family: fromStyles, source: 'styles' };
  const fromFantasy = mapGenreText(src.fantasy || '');
  if (fromFantasy) return { family: fromFantasy, source: 'fantasy' };
  return { family: null, source: 'none' };
}

/**
 * Soft lean from texture/vibe when no explicit tag (GENRE-MAP soft detect).
 * @returns {GenreFamily}
 */
export function leanGenreFromAudio(texture = {}, vibe = {}) {
  if ((vibe.spoken || vibe.speechLike || 0) > 0.48) return 'spoken';
  const ranked = [
    ['electronic', Math.max(texture.fourOnFloor || 0, (texture.ambient || 0) * 0.85)],
    ['rock', texture.harshWall || 0],
    ['hiphop', texture.pocketKick || 0],
    ['classical', texture.swell || 0],
    ['jazz', texture.swing || 0],
    ['folk', texture.sparseAcoustic || 0],
    ['noise', (texture.harshWall || 0) * 0.7 + (vibe.chaos || 0) * 0.3]
  ];
  // Ambient-only electronic: high ambient, low fourOnFloor
  if ((texture.ambient || 0) > 0.4 && (texture.fourOnFloor || 0) < 0.28) {
    ranked.push(['electronic', (texture.ambient || 0) * 0.95]);
  }
  ranked.sort((a, b) => b[1] - a[1]);
  const [name, score] = ranked[0];
  if (score < 0.32) return 'unknown';
  return /** @type {GenreFamily} */ (name);
}
