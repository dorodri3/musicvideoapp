/**
 * Lyrics parser: paste / upload / LRCLIB fetch.
 * Phrase grouping into full meaningful phrases (not chopped karaoke).
 * Candidates scored by duration + name similarity; prefers synced lyrics.
 */
import { cleanTitle, cleanArtist } from '../song/identity.js';

const TIMESTAMP_RE = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
const LRC_LINE_RE = /^((?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+)\s*(.*)$/;
const LRCLIB_SEARCH = 'https://lrclib.net/api/search';
const LRCLIB_GET = 'https://lrclib.net/api/get';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * @typedef {{ text: string, start: number|null, end: number|null, words?: {text:string,start:number,end:number}[] }} LyricPhrase
 */

async function fetchWithTimeout(url, ms = DEFAULT_TIMEOUT_MS) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl?.signal,
      mode: 'cors',
      credentials: 'omit',
      headers: { Accept: 'application/json' }
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Normalize for fuzzy compare */
export function normalizeName(s = '') {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Token Jaccard + substring boost. Returns 0..1.
 */
export function nameSimilarity(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
    return 0.75 + 0.25 * ratio;
  }
  const ta = new Set(na.split(' ').filter(Boolean));
  const tb = new Set(nb.split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

/**
 * Score an LRCLIB hit against query. Higher = better.
 * @param {object} candidate
 * @param {{ title?: string, artist?: string, duration?: number }} query
 */
export function scoreCandidate(candidate, query = {}) {
  if (!candidate) return -Infinity;
  const qTitle = query.title || '';
  const qArtist = query.artist || '';
  const qDur = query.duration > 0 ? query.duration : 0;

  const cTitle = candidate.trackName || candidate.name || '';
  const cArtist = candidate.artistName || '';
  const cDur = typeof candidate.duration === 'number' ? candidate.duration : 0;

  const hasSynced = !!(candidate.syncedLyrics && String(candidate.syncedLyrics).trim());
  const hasPlain = !!(candidate.plainLyrics && String(candidate.plainLyrics).trim());
  if (!hasSynced && !hasPlain) return -1000;

  let score = 0;

  if (qDur > 0 && cDur > 0) {
    const diff = Math.abs(cDur - qDur);
    if (diff <= 2) score += 45;
    else if (diff <= 5) score += 35;
    else if (diff <= 10) score += 20;
    else if (diff <= 15) score += 8;
    else if (diff <= 25) score -= 5;
    else score -= Math.min(40, Math.floor(diff / 2));
  }

  score += nameSimilarity(qTitle, cTitle) * 40;
  score += nameSimilarity(qArtist, cArtist) * 35;

  if (hasSynced) score += 22;
  else if (hasPlain) score += 6;

  if (cTitle && cArtist) score += 2;

  return score;
}

/**
 * Pick best scored result from LRCLIB search array.
 */
export function pickBestResult(data, query = {}) {
  if (!Array.isArray(data) || !data.length) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const d of data) {
    const s = scoreCandidate(d, query);
    if (s > bestScore) {
      bestScore = s;
      best = d;
    }
  }
  if (!best || bestScore < -100) return null;
  return { candidate: best, score: bestScore };
}

export class LyricsParser {
  /**
   * Parse raw lyrics text (plain or LRC).
   * @param {string} raw
   * @returns {LyricPhrase[]}
   */
  parse(raw) {
    if (!raw || !raw.trim()) return [];
    const text = raw.replace(/\r\n/g, '\n').trim();
    const lines = text.split('\n');
    const hasTimestamps = lines.some(l => {
      TIMESTAMP_RE.lastIndex = 0;
      return TIMESTAMP_RE.test(l);
    });
    TIMESTAMP_RE.lastIndex = 0;

    if (hasTimestamps) return this._parseLRC(lines);
    return this._parsePlain(lines);
  }

  _parseLRC(lines) {
    const timed = [];
    for (const line of lines) {
      const m = line.match(LRC_LINE_RE);
      if (!m) continue;
      TIMESTAMP_RE.lastIndex = 0;
      const stamps = [...m[1].matchAll(TIMESTAMP_RE)];
      const content = m[2].trim();
      if (!content) continue;
      for (const s of stamps) {
        const min = parseInt(s[1], 10);
        const sec = parseInt(s[2], 10);
        const frac = s[3] ? parseInt(s[3].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0;
        timed.push({ text: content, start: min * 60 + sec + frac, end: null });
      }
    }
    timed.sort((a, b) => a.start - b.start);
    for (let i = 0; i < timed.length; i++) {
      timed[i].end = i + 1 < timed.length
        ? timed[i + 1].start
        : timed[i].start + Math.max(3, timed[i].text.split(/\s+/).length * 0.45);
    }
    return this._groupPhrases(timed);
  }

  _parsePlain(lines) {
    const cleaned = lines.map(l => l.trim()).filter(Boolean);
    const phrases = [];
    let buf = [];
    const flush = () => {
      if (!buf.length) return;
      const text = buf.join(' ').replace(/\s+/g, ' ').trim();
      if (text) phrases.push({ text, start: null, end: null });
      buf = [];
    };
    for (const line of cleaned) {
      buf.push(line);
      const endsSentence = /[.!?…]$/.test(line) || line.length > 55 || buf.join(' ').length > 90;
      if (endsSentence || buf.length >= 2) flush();
    }
    flush();
    return phrases.length ? phrases : cleaned.map(t => ({ text: t, start: null, end: null }));
  }

  _groupPhrases(timed) {
    const out = [];
    let i = 0;
    while (i < timed.length) {
      let cur = { ...timed[i], words: undefined };
      while (
        i + 1 < timed.length &&
        cur.text.split(/\s+/).length < 4 &&
        timed[i + 1].start - (cur.end || cur.start) < 1.2
      ) {
        i++;
        cur.text = (cur.text + ' ' + timed[i].text).replace(/\s+/g, ' ').trim();
        cur.end = timed[i].end;
      }
      out.push(cur);
      i++;
    }
    return out;
  }

  _wrapResult(best, score = 0) {
    if (!best) return null;
    const raw = (best.syncedLyrics && String(best.syncedLyrics).trim())
      || (best.plainLyrics && String(best.plainLyrics).trim())
      || '';
    if (!raw) return null;
    const phrases = this.parse(raw);
    const lineCount = raw.split(/\n/).map(l => l.replace(TIMESTAMP_RE, '').trim()).filter(Boolean).length;
    TIMESTAMP_RE.lastIndex = 0;
    return {
      phrases,
      raw,
      synced: !!(best.syncedLyrics && String(best.syncedLyrics).trim()),
      lineCount: lineCount || phrases.length,
      score,
      meta: {
        id: best.id,
        trackName: best.trackName || best.name,
        artistName: best.artistName,
        albumName: best.albumName,
        duration: best.duration
      }
    };
  }

  /**
   * Search LRCLIB and return best scored match.
   * @param {string} title
   * @param {string} artist
   * @param {number} [duration]
   */
  async search(title, artist = '', duration = 0) {
    const t = cleanTitle(title);
    const a = cleanArtist(artist);
    if (!t && !a) return null;

    const query = { title: t, artist: a, duration: duration > 0 ? duration : 0 };

    try {
      const params = new URLSearchParams();
      if (t) params.set('track_name', t);
      if (a) params.set('artist_name', a);
      if (duration > 0) params.set('duration', String(Math.round(duration)));

      const res = await fetchWithTimeout(`${LRCLIB_SEARCH}?${params}`);
      if (!res.ok) return null;
      let data = await res.json();

      if (!Array.isArray(data) || !data.length) {
        if (a && t) {
          const p2 = new URLSearchParams({ track_name: t });
          const res2 = await fetchWithTimeout(`${LRCLIB_SEARCH}?${p2}`);
          if (res2.ok) {
            const d2 = await res2.json();
            if (Array.isArray(d2) && d2.length) data = d2;
          }
        }
      }

      if (!Array.isArray(data) || !data.length) return null;

      const picked = pickBestResult(data, query);
      if (!picked) return null;
      return this._wrapResult(picked.candidate, picked.score);
    } catch (err) {
      console.warn('LRCLIB search failed', err);
      return null;
    }
  }

  /**
   * Optional: fetch a single LRCLIB record by id (CORS-safe).
   * @param {number|string} id
   */
  async getById(id) {
    if (id == null || id === '') return null;
    try {
      const res = await fetchWithTimeout(`${LRCLIB_GET}/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data) return null;
      return this._wrapResult(data, 100);
    } catch {
      return null;
    }
  }

  /** @deprecated internal — use pickBestResult */
  _pickResult(data, query = {}) {
    const picked = pickBestResult(data, query);
    return picked ? this._wrapResult(picked.candidate, picked.score) : null;
  }

  async fetchLRCLIB(title, artist = '', duration = 0) {
    const result = await this.search(title, artist, duration);
    return result ? result.phrases : null;
  }
}
