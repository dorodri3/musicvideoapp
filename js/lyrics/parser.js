/**
 * Lyrics parser: paste / upload / LRCLIB fetch.
 * Phrase grouping into full meaningful phrases (not chopped karaoke).
 * Candidates scored by duration + name similarity; prefers synced lyrics.
 * Lyrics Brain idgate (20261019): song-ID sanity gate (rules 1-4) + offline .lrc fallback.
 */
import { cleanTitle, cleanArtist } from '../song/identity.js?v=art8';

const TIMESTAMP_RE = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
const LRC_LINE_RE = /^((?:\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+)\s*(.*)$/;
const LRCLIB_SEARCH = 'https://lrclib.net/api/search';
const LRCLIB_GET = 'https://lrclib.net/api/get';
const DEFAULT_TIMEOUT_MS = 10000;
// Lyrics Brain idgate: song-ID sanity gate + offline .lrc fallback (see gate helpers below)
const GATE_SEARCH_TIMEOUT_MS = 5000;
const OFFLINE_TIMEOUT_MS = 3000;
/** Offline .lrc folders, relative to the page (served app root). */
export const OFFLINE_LRC_DIRS = ['lyrics/'];
export const SCENIC_STATUS = 'Instrumental / no matching lyrics: scenic mode';

/**
 * @typedef {{ text: string, start: number|null, end: number|null, words?: {text:string,start:number,end:number}[] }} LyricPhrase
 */

async function fetchWithTimeout(url, ms = DEFAULT_TIMEOUT_MS, accept = 'application/json') {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl?.signal,
      mode: 'cors',
      credentials: 'omit',
      headers: { Accept: accept }
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

// ─────────────────────────────────────────────────────────────────────────────
// Lyrics Brain idgate: pure gate helpers (exported for harness tests)
// Rules: 1 instrumental · 2 artist/duration identity · 3 sync plausibility ·
//        4 cross-artist borrowed text · 5 live vocal check (alignment.js)
// ─────────────────────────────────────────────────────────────────────────────

/** Non-empty lyric text lines (timestamps stripped). */
export function lyricTextLines(raw = '') {
  return String(raw || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.replace(/\[[^\]]*\]/g, '').trim())
    .filter(Boolean);
}

/** Lyric lines of an LRCLIB record (plain preferred, else synced stripped). */
export function candidateLines(c) {
  if (!c) return [];
  const plain = lyricTextLines(c.plainLyrics || '');
  return plain.length ? plain : lyricTextLines(c.syncedLyrics || '');
}

/** Start times (s) of non-empty synced lines, sorted. */
export function syncedLineTimes(synced = '') {
  const out = [];
  for (const line of String(synced || '').replace(/\r\n/g, '\n').split('\n')) {
    const m = line.match(LRC_LINE_RE);
    if (!m || !m[2].trim()) continue;
    for (const s of m[1].matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)) {
      const frac = s[3] ? parseInt(s[3].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0;
      out.push(parseInt(s[1], 10) * 60 + parseInt(s[2], 10) + frac);
    }
  }
  return out.sort((a, b) => a - b);
}

/** Character-bigram Dice similarity of normalized text, 0..1. */
export function textSimilarity(a, b) {
  const na = normalizeName(a).replace(/\s+/g, ' ');
  const nb = normalizeName(b).replace(/\s+/g, ' ');
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  const grams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  };
  const ga = grams(na);
  const gb = grams(nb);
  let inter = 0;
  for (const [g, n] of ga) inter += Math.min(n, gb.get(g) || 0);
  return (2 * inter) / (na.length - 1 + nb.length - 1);
}

/** Fingerprint: first n non-empty normalized lines joined. */
export function firstLinesKey(lines, n = 3) {
  return normalizeName((lines || []).slice(0, n).join(' '));
}

/**
 * Rule 2: identity check of one candidate vs the user/ID3 query.
 * Artist similarity >= 0.8 (after cleanArtist) when artist known.
 * Duration ≤5s pass · 5–10s soft · >10s reject (when track duration known).
 */
export function checkIdentity(candidate, query = {}) {
  const qa = cleanArtist(query.artist || '');
  const ca = cleanArtist(candidate?.artistName || '');
  const artistKnown = !!qa;
  const artistSim = artistKnown ? nameSimilarity(qa, ca) : 1;
  const artistReject = artistKnown && artistSim < 0.8;
  const qd = query.duration > 0 ? query.duration : 0;
  const cd = typeof candidate?.duration === 'number' && candidate.duration > 0 ? candidate.duration : 0;
  const durDiff = qd && cd ? Math.abs(qd - cd) : null;
  const durationReject = durDiff != null && durDiff > 10;
  const durationSoft = durDiff != null && durDiff > 5 && durDiff <= 10;
  return { artistSim, artistReject, durDiff, durationSoft, durationReject };
}

/**
 * Rule 3: synced-lyric plausibility.
 * Flag when synced span < 25% of track duration OR density > 1 line / 1.2s across the span.
 */
export function checkSyncPlausibility(synced, trackDuration = 0) {
  const times = syncedLineTimes(synced);
  const n = times.length;
  if (n < 4) return { flag: false, lines: n, span: 0, spanFrac: null, density: 0, reason: n ? 'too few lines to judge' : 'no sync' };
  const span = times[n - 1] - times[0];
  const dur = trackDuration > 0 ? trackDuration : 0;
  const spanFrac = dur ? span / dur : null;
  const density = span > 0 ? n / span : Infinity;
  const shortSpan = spanFrac != null && spanFrac < 0.25;
  const dense = density > 1 / 1.2;
  const reasons = [];
  if (shortSpan) reasons.push(`span ${span.toFixed(1)}s = ${(spanFrac * 100).toFixed(1)}% of ${dur.toFixed(0)}s (<25%)`);
  if (dense) reasons.push(`density ${density.toFixed(2)} lines/s (>0.83)`);
  return { flag: shortSpan || dense, lines: n, first: times[0], last: times[n - 1], span, spanFrac, density, reason: reasons.join('; ') };
}

/**
 * Rule 4: cross-artist borrowed text. Candidate's first ~3 lines vs title-only search results.
 * Flag when a record by a DIFFERENT artist matches (sim >= 0.85) and such records are at least as
 * common as matching records by the candidate's own artist (keeps originals that have covers clean).
 */
export function checkBorrowedText(candidate, titleResults, { minSim = 0.85, lines = 3 } = {}) {
  const key = firstLinesKey(candidateLines(candidate), lines);
  if (!key || !Array.isArray(titleResults)) return { flag: false, matches: [], ownCount: 0, otherCount: 0, checked: Array.isArray(titleResults) };
  const ca = cleanArtist(candidate.artistName || '');
  const matches = [];
  let ownCount = 1; // the candidate itself
  for (const r of titleResults) {
    if (!r || r.id === candidate.id) continue;
    const rk = firstLinesKey(candidateLines(r), lines);
    if (!rk) continue;
    const sim = textSimilarity(key, rk);
    if (sim < minSim) continue;
    const same = nameSimilarity(ca, cleanArtist(r.artistName || '')) >= 0.8;
    if (same) ownCount++;
    else matches.push({ id: r.id, artist: r.artistName, duration: r.duration, sim: +sim.toFixed(3) });
  }
  const otherCount = matches.length;
  return { flag: otherCount > 0 && otherCount >= ownCount, matches, ownCount, otherCount, checked: true };
}

/**
 * Gate decision. Lyric-free when: rule 1, rule-2 reject, rules 3 AND 4, or rule 5.
 * One soft flag (rule-2 soft, or 3 alone, or 4 alone) → plain text, no sync, lowConfidence.
 */
export function gateDecision(f = {}) {
  const rules = [];
  if (f.instrumental) rules.push('R1 instrumental');
  if (f.artistReject) rules.push('R2 artist reject');
  if (f.durationReject) rules.push('R2 duration reject');
  if (f.durationSoft) rules.push('R2 duration soft');
  if (f.syncFlag) rules.push('R3 broken sync');
  if (f.borrowedFlag) rules.push('R4 borrowed text');
  if (f.vocalDrop) rules.push('R5 no live vocal');
  const lyricFree = !!(f.instrumental || f.artistReject || f.durationReject ||
    (f.syncFlag && f.borrowedFlag) || f.vocalDrop);
  const soft = !lyricFree && !!(f.durationSoft || f.syncFlag || f.borrowedFlag);
  return {
    verdict: lyricFree ? 'lyric-free' : soft ? 'plain' : 'synced',
    lyricFree,
    useSync: !lyricFree && !soft,
    lowConfidence: soft,
    rules,
    status: lyricFree ? SCENIC_STATUS : soft ? 'Lyrics (low confidence — plain text, no sync)' : ''
  };
}

// Rejected-text registry: a gate-rejected record must not come back via profile restore / paste
// path in the same session (alignment.setPhrases consults isRejectedLyrics). Cleared per new search.
const _rejectedKeys = [];
export function markRejectedLyrics(rawOrLines) {
  const lines = Array.isArray(rawOrLines) ? rawOrLines : lyricTextLines(rawOrLines);
  const k = firstLinesKey(lines, 3);
  if (k && !_rejectedKeys.includes(k)) _rejectedKeys.push(k);
}
export function clearRejectedLyrics() { _rejectedKeys.length = 0; }
/** @param {string|Array<{text:string}>} rawOrPhrases */
export function isRejectedLyrics(rawOrPhrases) {
  if (!_rejectedKeys.length || !rawOrPhrases) return false;
  const joined = Array.isArray(rawOrPhrases)
    ? normalizeName(rawOrPhrases.map(p => (typeof p === 'string' ? p : p?.text) || '').join(' '))
    : normalizeName(lyricTextLines(rawOrPhrases).join(' '));
  if (!joined) return false;
  return _rejectedKeys.some(k => textSimilarity(k, joined.slice(0, k.length)) >= 0.85);
}

/**
 * Pick best scored result from LRCLIB search array, after the idgate hard filters
 * (rule-2 artist/duration rejects). Instrumental records compete on title/artist/duration.
 * @returns {{candidate:object, score:number, instrumental?:boolean, identity:object, rejected:Array}|null}
 */
export function pickBestResult(data, query = {}) {
  if (!Array.isArray(data) || !data.length) return null;
  let best = null;
  let bestScore = -Infinity;
  let bestId = null;
  const rejected = [];
  for (const d of data) {
    if (!d) continue;
    const id = checkIdentity(d, query);
    if (id.artistReject || id.durationReject) {
      rejected.push({ id: d.id, artist: d.artistName, duration: d.duration, why: id.artistReject ? `artist sim ${id.artistSim.toFixed(2)}` : `duration diff ${id.durDiff?.toFixed(1)}s` });
      continue;
    }
    let s;
    if (d.instrumental === true) {
      // score as if lyrics were present so a matching instrumental record can win (rule 1)
      s = scoreCandidate({ ...d, plainLyrics: 'x', syncedLyrics: 'x' }, query);
    } else {
      s = scoreCandidate(d, query);
    }
    if (s > bestScore) {
      bestScore = s;
      best = d;
      bestId = id;
    }
  }
  if (!best || bestScore < -100) return rejected.length ? { candidate: null, score: -Infinity, rejected } : null;
  return { candidate: best, score: bestScore, instrumental: best.instrumental === true, identity: bestId, rejected };
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

  /**
   * @param {object} best LRCLIB record (or offline/manual pseudo-record)
   * @param {number} score
   * @param {{ useSync?: boolean }} [opts] Lyrics Brain idgate: useSync=false → plain text only
   */
  _wrapResult(best, score = 0, { useSync = true } = {}) {
    if (!best) return null;
    const syncedRaw = (best.syncedLyrics && String(best.syncedLyrics).trim()) || '';
    const plainRaw = (best.plainLyrics && String(best.plainLyrics).trim()) || '';
    let raw;
    let synced;
    if (useSync) {
      raw = syncedRaw || plainRaw;
      synced = !!syncedRaw;
    } else {
      // idgate soft flag: plain text only — never carry (possibly broken) timestamps downstream
      raw = plainRaw || lyricTextLines(syncedRaw).join('\n');
      synced = false;
    }
    if (!raw) return null;
    const phrases = this.parse(raw);
    const lineCount = raw.split(/\n/).map(l => l.replace(TIMESTAMP_RE, '').trim()).filter(Boolean).length;
    TIMESTAMP_RE.lastIndex = 0;
    return {
      phrases,
      raw,
      synced,
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
   * Search LRCLIB and return best scored match, through the Lyrics Brain idgate.
   * Returns null for lyric-free (see this.lastGate.lyricFree / .status) or no lyrics.
   * On LRCLIB 5xx / network error / timeout / no hits → offline .lrc fallback (loadOfflineLrc).
   * @param {string} title
   * @param {string} artist
   * @param {number} [duration]
   * @param {{ fileName?: string }} [opts]
   */
  async search(title, artist = '', duration = 0, opts = {}) {
    const t = cleanTitle(title);
    const a = cleanArtist(artist);
    if (!t && !a) return null;

    const query = { title: t, artist: a, duration: duration > 0 ? duration : 0 };
    const cacheKey = `${normalizeName(a)}|${normalizeName(t)}|${Math.round(query.duration)}`;
    if (!this._gateCache) this._gateCache = new Map();
    if (this._gateCache.has(cacheKey)) {
      const hit = this._gateCache.get(cacheKey);
      this.lastGate = hit.gate;
      return hit.result;
    }
    clearRejectedLyrics();
    this.lastGate = null;
    const done = (result, gate, cache = true) => {
      this.lastGate = gate;
      if (cache) this._gateCache.set(cacheKey, { result, gate });
      return result;
    };

    let data = null;
    let failure = null;
    let titleOnly = null;
    const getJson = async (url, ms) => {
      const res = await fetchWithTimeout(url, ms);
      if (!res.ok) {
        const e = new Error(`LRCLIB HTTP ${res.status}`);
        e.status = res.status;
        throw e;
      }
      return res.json();
    };
    const failKind = (err) => (err?.status >= 500 ? `HTTP ${err.status}`
      : err?.status ? null // 4xx = no data, not an outage
        : err?.name === 'AbortError' ? 'timeout' : 'network error');

    try {
      const params = new URLSearchParams();
      if (t) params.set('track_name', t);
      if (a) params.set('artist_name', a);
      if (duration > 0) params.set('duration', String(Math.round(duration)));
      try {
        data = await getJson(`${LRCLIB_SEARCH}?${params}`);
      } catch (err) {
        failure = failKind(err);
        if (!failure) data = [];
        else console.warn('LRCLIB search failed', err);
      }

      if (!failure && (!Array.isArray(data) || !data.length) && a && t) {
        try {
          const d2 = await getJson(`${LRCLIB_SEARCH}?${new URLSearchParams({ track_name: t })}`);
          if (Array.isArray(d2)) {
            titleOnly = d2;
            if (d2.length) data = d2;
          }
        } catch (err) {
          failure = failKind(err);
        }
      }

      if (failure || !Array.isArray(data) || !data.length) {
        const offline = await this.loadOfflineLrc({ title: t, artist: a, fileName: opts.fileName });
        if (offline) {
          return done(offline, {
            verdict: 'offline', lyricFree: false, rules: [], source: offline.source,
            status: `Offline lyrics (${offline.source}) — LRCLIB ${failure || 'no match'}`
          }, false);
        }
        if (failure) {
          return done(null, { verdict: 'error', lyricFree: false, rules: [], failure,
            status: `LRCLIB unavailable (${failure}) and no offline .lrc` }, false);
        }
        return done(null, { verdict: 'none', lyricFree: false, rules: [], status: 'No lyrics found' });
      }

      const picked = pickBestResult(data, query);
      if (!picked) return done(null, { verdict: 'none', lyricFree: false, rules: [], status: 'No lyrics found' });
      if (!picked.candidate) {
        // every hit failed rule 2 (wrong artist / duration) → lyric-free
        const g = gateDecision({ artistReject: picked.rejected.some(r => /artist/.test(r.why)),
          durationReject: picked.rejected.every(r => /duration/.test(r.why)) });
        return done(null, { ...g, rejected: picked.rejected });
      }
      const c = picked.candidate;
      if (picked.instrumental) {
        return done(null, { ...gateDecision({ instrumental: true }), candidateId: c.id });
      }

      const idc = picked.identity || checkIdentity(c, query);
      const sync = c.syncedLyrics ? checkSyncPlausibility(c.syncedLyrics, query.duration || c.duration || 0) : { flag: false, reason: 'plain only' };

      // Rule 4: one title-only search (reuse the retry's data if we already have it); fail-open.
      let borrowed = { flag: false, checked: false };
      if (t) {
        try {
          if (!titleOnly) {
            titleOnly = await getJson(`${LRCLIB_SEARCH}?${new URLSearchParams({ track_name: t })}`, GATE_SEARCH_TIMEOUT_MS);
          }
          borrowed = checkBorrowedText(c, titleOnly);
        } catch (err) {
          borrowed = { flag: false, checked: false, error: String(err?.message || err) };
        }
      }

      const g = gateDecision({
        durationSoft: idc.durationSoft,
        syncFlag: sync.flag,
        borrowedFlag: borrowed.flag
      });
      const gate = { ...g, candidateId: c.id, identity: idc, sync, borrowed };
      if (g.lyricFree) {
        markRejectedLyrics(candidateLines(c));
        return done(null, gate);
      }
      const result = this._wrapResult(c, picked.score, { useSync: g.useSync });
      if (result) {
        result.gate = gate;
        result.lowConfidence = g.lowConfidence;
        result.source = 'lrclib';
      }
      return done(result, gate);
    } catch (err) {
      console.warn('LRCLIB search failed', err);
      return done(null, { verdict: 'error', lyricFree: false, rules: [], status: 'Lyrics fetch failed' }, false);
    }
  }

  /**
   * HOLD QA-20261001-0314: offline lyrics when LRCLIB is down.
   * 1) Local .lrc served next to the app (OFFLINE_LRC_DIRS), matched by uploaded filename stem
   *    or cleaned "Artist - Title" / "Artist_-_Title" stems.
   * 2) A manually loaded .lrc/.txt already in the lyrics textarea (Upload .lrc / .txt).
   * Result goes back through _wrapResult → textarea → parse/alignment, same as LRCLIB.
   */
  async loadOfflineLrc({ title = '', artist = '', fileName = '' } = {}) {
    const doc = typeof document !== 'undefined' ? document : null;
    if (!fileName && doc) {
      const label = doc.getElementById?.('audio-label')?.textContent || '';
      const name = label.split(' (')[0].trim();
      if (name && name !== 'Microphone live' && name !== 'No audio selected') fileName = name;
    }
    const stems = [];
    const add = (s) => { s = String(s || '').trim(); if (s && !stems.includes(s)) stems.push(s); };
    if (fileName) add(fileName.replace(/\.[a-z0-9]{2,5}$/i, ''));
    if (artist && title) {
      add(`${artist} - ${title}`);
      add(`${artist}_-_${title}`.replace(/\s+/g, '_'));
      add(normalizeName(`${artist} ${title}`).replace(/\s+/g, '-'));
    } else if (title) {
      add(title);
      add(title.replace(/\s+/g, '_'));
    }
    const base = this.offlineBase
      || (doc?.baseURI)
      || (typeof location !== 'undefined' ? location.href : null);
    if (base) {
      for (const dir of OFFLINE_LRC_DIRS) {
        for (const stem of stems) {
          let url;
          try { url = new URL(dir + encodeURIComponent(stem) + '.lrc?v=art8', base).href; } catch { continue; } // art8: cache-tagged asset fetch
          try {
            const res = await fetchWithTimeout(url, OFFLINE_TIMEOUT_MS, 'text/plain, */*');
            if (!res.ok) continue;
            const text = (await res.text() || '').trim();
            if (!text || /^\s*</.test(text)) continue; // HTML error page, not lyrics
            const r = this._wrapOfflineText(text, { title, artist });
            if (r) { r.source = 'offline'; r.offlineUrl = url; return r; }
          } catch { /* try next */ }
        }
      }
    }
    const manual = (doc?.getElementById?.('lyrics-input')?.value || '').trim();
    if (manual && !isRejectedLyrics(manual)) {
      const r = this._wrapOfflineText(manual, { title, artist });
      if (r) { r.source = 'manual'; return r; }
    }
    return null;
  }

  _wrapOfflineText(text, { title = '', artist = '' } = {}) {
    TIMESTAMP_RE.lastIndex = 0;
    const timed = TIMESTAMP_RE.test(text);
    TIMESTAMP_RE.lastIndex = 0;
    const r = this._wrapResult({
      id: null,
      trackName: title,
      artistName: artist,
      syncedLyrics: timed ? text : '',
      plainLyrics: timed ? '' : text
    }, 0);
    if (r) r.lowConfidence = false;
    return r;
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
    return picked?.candidate ? this._wrapResult(picked.candidate, picked.score) : null;
  }

  async fetchLRCLIB(title, artist = '', duration = 0) {
    const result = await this.search(title, artist, duration);
    return result ? result.phrases : null;
  }
}
