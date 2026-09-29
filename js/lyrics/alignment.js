/**
 * Line + optional word timing; sync to vocal-ish activity when possible.
 * Highlight active word WITHIN intact phrase.
 * timingSource: 'lrc' | 'estimated' | 'none'
 *
 * Sticky holds last-good briefly between phrases / after last line,
 * but EXPIRES on section TYPE change and after max hold past phrase.end
 * so verse lines never glue into chorus.
 */
export class LyricsAlignment {
  constructor() {
    this.phrases = [];
    this.activeIndex = -1;
    this.activeWordIndex = -1;
    this.duration = 0;
    /** @type {'lrc'|'estimated'|'none'} */
    this.timingSource = 'none';
    /** @type {object|null} last non-null phrase fed downstream */
    this._lastGood = null;
    this._lastGoodIndex = -1;
    /** Section type when last-good was captured */
    this._stickySectionType = null;
    /** Label when last-good was captured (chorus vs chorus 2) */
    this._stickySectionLabel = null;
    /** Absolute time when sticky was captured (phrase.end reference) */
    this._stickyCapturedAtEnd = null;
    /** Last seen sectionChangeId from director/main */
    this._lastSectionChangeId = null;
  }

  /**
   * @param {Array} phrases from parser
   * @param {number} duration song duration seconds
   */
  setPhrases(phrases, duration = 0) {
    this.phrases = (phrases || []).map(p => ({ ...p }));
    this.duration = duration;
    const hadLrc = this.phrases.some(p => p.start != null);
    this._ensureTiming();
    this._ensureWords();
    this.timingSource = !this.phrases.length
      ? 'none'
      : hadLrc
        ? 'lrc'
        : 'estimated';
    this.activeIndex = -1;
    this.activeWordIndex = -1;
    this.clearSticky();
  }

  /** Whether phrase times came from LRC timestamps or even distribution. */
  getTimingSource() {
    return this.timingSource;
  }

  isTimedFromLrc() {
    return this.timingSource === 'lrc';
  }

  /** Wipe sticky state — section change / director force-expire. */
  clearSticky() {
    this._lastGood = null;
    this._lastGoodIndex = -1;
    this._stickySectionType = null;
    this._stickySectionLabel = null;
    this._stickyCapturedAtEnd = null;
  }

  /** Alias for clearSticky — director may call expireSticky(). */
  expireSticky() {
    this.clearSticky();
  }

  _ensureTiming() {
    const hasAny = this.phrases.some(p => p.start != null);
    if (hasAny) {
      for (let i = 0; i < this.phrases.length; i++) {
        const p = this.phrases[i];
        if (p.start == null) {
          p.start = i > 0 ? (this.phrases[i - 1].end || this.phrases[i - 1].start + 3) : 0;
        }
        if (p.end == null) {
          p.end = i + 1 < this.phrases.length && this.phrases[i + 1].start != null
            ? this.phrases[i + 1].start
            : p.start + Math.max(2.5, p.text.split(/\s+/).length * 0.4);
        }
      }
      // Gap policy: abut short gaps (karaoke continuity); leave long gaps
      // so sticky can engage then expire rather than gluing text across silence.
      const ABUT_GAP = 1.8;
      for (let i = 0; i < this.phrases.length - 1; i++) {
        const cur = this.phrases[i];
        const nextStart = this.phrases[i + 1].start;
        if (nextStart == null) continue;
        const gap = nextStart - cur.end;
        if (gap <= 0) continue;
        if (gap <= ABUT_GAP) {
          cur.end = nextStart;
        } else {
          // Readable hold, but do not extend all the way across long silence
          const words = (cur.text || '').split(/\s+/).filter(Boolean).length;
          const readable = cur.start + Math.max(2.8, words * 0.45);
          cur.end = Math.min(nextStart, Math.max(cur.end, readable));
          // If still abutting somehow, leave at least a small sticky gap
          if (cur.end >= nextStart - 0.05) {
            cur.end = Math.min(nextStart - 0.15, readable);
          }
        }
      }
      return;
    }
    const n = this.phrases.length;
    if (!n) return;
    const dur = this.duration > 0 ? this.duration : Math.max(30, n * 4);
    // Shorter intro so phone testers see lyrics sooner
    const introPad = Math.min(4, dur * 0.05);
    const outroPad = Math.min(4, dur * 0.04);
    const usable = Math.max(10, dur - introPad - outroPad);
    const slot = usable / n;
    // Use ~0.92 of slot as hold — small gaps sticky covers then expires
    const holdFrac = 0.92;
    for (let i = 0; i < n; i++) {
      const start = introPad + i * slot;
      const slotEnd = i + 1 < n ? introPad + (i + 1) * slot : start + slot;
      const end = start + (slotEnd - start) * holdFrac;
      this.phrases[i].start = start;
      this.phrases[i].end = end;
    }
  }

  _ensureWords() {
    for (const p of this.phrases) {
      const tokens = p.text.split(/\s+/).filter(Boolean);
      if (!tokens.length) {
        p.words = [];
        continue;
      }
      if (p.words && p.words.length === tokens.length) continue;
      const span = Math.max(0.5, (p.end ?? p.start + 3) - p.start);
      const wDur = span / tokens.length;
      p.words = tokens.map((t, i) => ({
        text: t,
        start: p.start + i * wDur,
        end: p.start + (i + 1) * wDur
      }));
    }
  }

  /**
   * Max sticky hold past phrase.end (seconds).
   * Estimated timing expires sooner so lines feel part of the video.
   */
  _stickyMaxHold() {
    return this.timingSource === 'estimated' ? 3.2 : 4.5;
  }

  /**
   * Update active phrase/word from playback time + optional vocal estimate.
   * Sticky holds last-good briefly, but clears on section TYPE/label change,
   * max-hold expiry, or forceExpire / lyricStickExpire.
   * @param {number} currentTime
   * @param {object|null} [vocal]
   * @param {object|null} [section] { type, label, lyricStickExpire?, forceExpire?, sectionChangeId? }
   * @param {boolean|object} [forceExpire] truthy 4th arg OR section.lyricStickExpire / section.forceExpire
   * @returns {{ phrase: object|null, wordIndex: number, phraseIndex: number, timingSource: string, sticky: boolean, expired?: boolean, sectionType: string|null }}
   */
  update(currentTime, vocal = null, section = null, forceExpire = false) {
    const sectionType = section?.type ?? null;
    const sectionLabel = section?.label ?? null;
    if (!this.phrases.length) {
      this.activeIndex = -1;
      this.activeWordIndex = -1;
      this.clearSticky();
      return {
        phrase: null,
        wordIndex: -1,
        phraseIndex: -1,
        timingSource: this.timingSource,
        sticky: false,
        expired: false,
        sectionType
      };
    }

    let expired = false;

    // Primary: section TYPE change clears sticky (verse→chorus, chorus→drop, …)
    if (this._lastGood && this._stickySectionType != null && sectionType != null) {
      if (sectionType !== this._stickySectionType) {
        this.clearSticky();
        expired = true;
      } else if (
        sectionLabel != null &&
        this._stickySectionLabel != null &&
        sectionLabel !== this._stickySectionLabel
      ) {
        // Soft label-only change (chorus → chorus 2 / final chorus): clear so hooks refresh
        this.clearSticky();
        expired = true;
      }
    }

    // Director may stamp lyricStickExpire / forceExpire / new sectionChangeId
    const shouldForce =
      !!forceExpire ||
      !!(section && (section.lyricStickExpire || section.forceExpire));
    if (shouldForce && this._lastGood) {
      this.clearSticky();
      expired = true;
    }
    if (section && section.sectionChangeId != null) {
      if (
        this._lastSectionChangeId != null &&
        section.sectionChangeId !== this._lastSectionChangeId &&
        this._lastGood
      ) {
        this.clearSticky();
        expired = true;
      }
      this._lastSectionChangeId = section.sectionChangeId;
    }

    // Max sticky hold past phrase.end
    if (this._lastGood && this._stickyCapturedAtEnd != null) {
      const hold = this._stickyMaxHold();
      if (currentTime > this._stickyCapturedAtEnd + hold) {
        this.clearSticky();
        expired = true;
      }
    }

    let idx = -1;
    let inActiveWindow = false;
    for (let i = 0; i < this.phrases.length; i++) {
      const p = this.phrases[i];
      if (currentTime >= p.start && currentTime < p.end) {
        idx = i;
        inActiveWindow = true;
        break;
      }
      if (currentTime >= p.start) idx = i;
    }

    // If we landed past a phrase.end (gap / post-last), idx may point at last
    // finished phrase — treat as not-in-window so sticky/expiry logic applies.
    if (idx >= 0 && !inActiveWindow) {
      const p = this.phrases[idx];
      if (currentTime >= p.end) {
        idx = -1;
      }
    }

    const estimated = this.timingSource === 'estimated';

    // Lead-in: show first phrase slightly early so intro isn't blank on phone
    if (idx < 0 && this.phrases[0]) {
      const first = this.phrases[0];
      if (currentTime >= Math.max(0, first.start - 0.75) && currentTime < first.end) {
        idx = 0;
        inActiveWindow = true;
      }
    }

    if (vocal && vocal.likelyVocal && vocal.intensity > 0.55 && idx + 1 < this.phrases.length) {
      const next = this.phrases[idx + 1];
      const window = estimated ? 0.65 : 0.45;
      if (next && next.start - currentTime < window && next.start - currentTime > -0.1) {
        idx = idx + 1;
        inActiveWindow = currentTime >= next.start && currentTime < next.end;
      }
    }

    let sticky = false;
    if (idx < 0 && this._lastGood) {
      // Hold last good line — Visual Engine / typography cannot invent text
      idx = this._lastGoodIndex;
      sticky = true;
    }

    // When sticky expired and no active window → null phrase
    if (idx < 0 && !this._lastGood) {
      this.activeIndex = -1;
      this.activeWordIndex = -1;
      return {
        phrase: null,
        wordIndex: -1,
        phraseIndex: -1,
        timingSource: this.timingSource,
        sticky: false,
        expired,
        sectionType
      };
    }

    this.activeIndex = idx;
    let wordIndex = -1;
    let phrase = null;
    if (idx >= 0 && this.phrases[idx]) {
      phrase = this.phrases[idx];
      if (!sticky) {
        this._lastGood = phrase;
        this._lastGoodIndex = idx;
        this._stickySectionType = sectionType;
        this._stickySectionLabel = sectionLabel;
        this._stickyCapturedAtEnd = phrase.end;
      } else {
        phrase = this._lastGood || phrase;
      }
      // Actively inside phrase window: never null that phrase
      if (phrase.words) {
        const words = phrase.words;
        for (let w = 0; w < words.length; w++) {
          if (currentTime >= words[w].start && currentTime < words[w].end) {
            wordIndex = w;
            break;
          }
          if (currentTime >= words[w].start) wordIndex = w;
        }
        // Sticky: keep last word highlighted rather than -1
        if (sticky && wordIndex < 0 && words.length) {
          wordIndex = words.length - 1;
        }
      }
    }
    this.activeWordIndex = wordIndex;
    return {
      phrase,
      wordIndex,
      phraseIndex: sticky ? this._lastGoodIndex : idx,
      timingSource: this.timingSource,
      sticky,
      expired,
      sectionType
    };
  }

  getPhrases() {
    return this.phrases;
  }

  /** Last phrase successfully fed downstream (may be null before first hit). */
  getLastGoodPhrase() {
    return this._lastGood;
  }
}
