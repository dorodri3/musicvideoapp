/**
 * Song identity: ID3 tags via jsmediatags CDN + filename "Artist - Title" fallback.
 * Cleans YouTube/streaming junk from titles before lyrics search.
 */
const JSMEDIATAGS_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js';

let _tagsScriptPromise = null;

/** Junk suffixes / parentheticals common on downloads & YT rips */
const TITLE_JUNK_RE = /\s*[\(\[\{]\s*(?:official\s*(?:music\s*)?(?:audio|video|mv|lyric\s*video|lyrics?|visuali[sz]er|audio\s*video)?|lyrics?|lyric\s*video|audio|video|mv|hd|hq|4k|8k|remaster(?:ed)?|explicit|clean\s*version|radio\s*edit|live(?:\s*\d{4})?|visuali[sz]er|with\s*lyrics?|karaoke|instrumental|slowed(?:\s*&\s*reverb)?|sped\s*up|nightcore|topic|full\s*(?:song|version)|original\s*(?:mix|version))\s*[\)\]\}]\s*/gi;

const TITLE_JUNK_DASH_RE = /\s*[-–—|]\s*(?:official\s*(?:music\s*)?(?:audio|video|mv|lyric\s*video|lyrics?)|lyrics?|lyric\s*video|audio\s*only|visuali[sz]er|hd|hq|4k|remaster(?:ed)?)\s*$/gi;

const FEAT_RE = /\s*[\(\[\{]?\s*(?:feat\.?|ft\.?|featuring)\s+([^\)\]\}]+)\s*[\)\]\}]?\s*/gi;

/**
 * Strip streaming/YouTube junk from a track title.
 * Keeps meaningful feat. artists when present.
 * @param {string} title
 * @returns {string}
 */
export function cleanTitle(title = '') {
  let t = String(title || '').trim();
  if (!t) return '';
  t = t.replace(TITLE_JUNK_RE, ' ');
  t = t.replace(TITLE_JUNK_DASH_RE, '');
  // Normalize feat. — drop the parenthetical for search (LRCLIB often omits it)
  t = t.replace(FEAT_RE, ' ');
  t = t
    .replace(/[_\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, '')
    .trim();
  return t;
}

/**
 * Clean artist name: collapse feat. chains, strip junk.
 * @param {string} artist
 * @returns {string}
 */
export function cleanArtist(artist = '') {
  let a = String(artist || '').trim();
  if (!a) return '';
  a = a.replace(TITLE_JUNK_RE, ' ');
  // Keep primary artist before feat./ft./&
  const featSplit = a.split(/\s+(?:feat\.?|ft\.?|featuring)\s+/i);
  a = featSplit[0] || a;
  // "Artist1, Artist2" → keep first for search (still searchable)
  if (/,/.test(a) && a.split(',').length > 2) {
    a = a.split(',')[0];
  }
  a = a
    .replace(/[_\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, '')
    .trim();
  return a;
}

function loadJsMediaTags() {
  if (typeof window !== 'undefined' && window.jsmediatags) {
    return Promise.resolve(window.jsmediatags);
  }
  if (_tagsScriptPromise) return _tagsScriptPromise;
  _tagsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-jsmediatags]');
    if (existing && window.jsmediatags) {
      resolve(window.jsmediatags);
      return;
    }
    const s = document.createElement('script');
    s.src = JSMEDIATAGS_CDN;
    s.async = true;
    s.dataset.jsmediatags = '1';
    s.onload = () => {
      if (window.jsmediatags) resolve(window.jsmediatags);
      else reject(new Error('jsmediatags failed to load'));
    };
    s.onerror = () => reject(new Error('jsmediatags CDN blocked'));
    document.head.appendChild(s);
  });
  return _tagsScriptPromise;
}

/**
 * Parse "Artist - Title" / "Artist – Title" / "Artist — Title" from a filename.
 */
export function parseFilename(name = '') {
  const base = String(name)
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/^\d{1,3}[\s._-]+/, '')
    .replace(/[_\.]+/g, ' ')
    .trim();
  const parts = base.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    return {
      artist: cleanArtist(parts[0]),
      title: cleanTitle(parts.slice(1).join(' - '))
    };
  }
  return { artist: '', title: cleanTitle(base) };
}

function readId3(file) {
  return loadJsMediaTags()
    .then(
      (jsmediatags) =>
        new Promise((resolve) => {
          const timer = setTimeout(() => resolve(null), 6000);
          try {
            jsmediatags.read(file, {
              onSuccess(tag) {
                clearTimeout(timer);
                const t = tag?.tags || {};
                resolve({
                  artist: (t.artist || t.albumartist || '').trim(),
                  title: (t.title || '').trim(),
                  album: (t.album || '').trim(),
                  genre: (t.genre || '').trim()
                });
              },
              onError() {
                clearTimeout(timer);
                resolve(null);
              }
            });
          } catch {
            clearTimeout(timer);
            resolve(null);
          }
        })
    )
    .catch(() => null);
}

export class SongIdentity {
  constructor() {
    this.artist = '';
    this.title = '';
    this.album = '';
    this.genre = '';
    this.source = 'none'; // id3 | filename | manual | none
    this.status = 'idle'; // idle | identifying | ready | needs_manual
    this.fileName = '';
  }

  reset() {
    this.artist = '';
    this.title = '';
    this.album = '';
    this.genre = '';
    this.source = 'none';
    this.status = 'idle';
    this.fileName = '';
  }

  setManual(artist, title) {
    this.artist = cleanArtist(artist);
    this.title = cleanTitle(title);
    this.source = 'manual';
    this.status = this.artist || this.title ? 'ready' : 'needs_manual';
    return this.get();
  }

  /**
   * Identify from uploaded File. Prefers ID3; falls back to filename.
   * @param {File} file
   */
  async identifyFromFile(file) {
    this.reset();
    if (!file) return this.get();
    this.fileName = file.name || '';
    this.status = 'identifying';

    const fromName = parseFilename(file.name || '');
    let fromTags = null;
    try {
      fromTags = await readId3(file);
    } catch {
      fromTags = null;
    }

    if (fromTags?.title || fromTags?.artist) {
      this.artist = cleanArtist(fromTags.artist || fromName.artist || '');
      this.title = cleanTitle(fromTags.title || fromName.title || '');
      this.album = (fromTags.album || '').trim();
      this.genre = (fromTags.genre || '').trim();
      this.source = 'id3';
    } else {
      this.artist = fromName.artist || '';
      this.title = fromName.title || '';
      this.genre = '';
      this.source = fromName.artist || fromName.title ? 'filename' : 'none';
    }

    if (!this.artist || !this.title) {
      this.status = 'needs_manual';
    } else {
      this.status = 'ready';
    }
    return this.get();
  }

  get() {
    return {
      artist: this.artist,
      title: this.title,
      album: this.album,
      genre: this.genre,
      source: this.source,
      status: this.status,
      fileName: this.fileName,
      label: this.artist && this.title
        ? `${this.artist} — ${this.title}`
        : this.title || this.artist || this.fileName || ''
    };
  }
}
