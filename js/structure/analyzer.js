/**
 * Song structure heuristics: intro/verse/pre/chorus/bridge/breakdown/drop/outro.
 * Uses energy envelope + repetition + lyric section cues.
 * Section types feed Scene Director intents cleanly (with chorus.repeat numbered).
 */
export class StructureAnalyzer {
  constructor() {
    this.sections = [];
    this.duration = 0;
  }

  /**
   * Pre-plan sections when duration known (optionally refine live).
   * @param {number} duration
   * @param {Array} phrases
   * @param {object} [hints] {bpm}
   */
  analyze(duration, phrases = [], hints = {}) {
    this.duration = duration || 180;
    const d = this.duration;
    const bpm = hints.bpm || 120;

    const lyricSections = this._lyricSections(phrases, d);

    if (lyricSections.length >= 3) {
      this.sections = this._mergeWithEnergyScaffold(lyricSections, d, bpm);
    } else {
      this.sections = this._energyScaffold(d, bpm);
    }
    this._numberChorusRepeats(this.sections);
    return this.sections;
  }

  /** Always tag chorus.repeat 1..N for director motif escalation */
  _numberChorusRepeats(sections) {
    let cNum = 0;
    for (const s of sections) {
      if (s.type === 'chorus') {
        cNum++;
        s.repeat = cNum;
        s.label = cNum === 1 ? 'chorus' : cNum >= 3 ? 'final chorus' : `chorus ${cNum}`;
      }
    }
  }

  _lyricSections(phrases, duration) {
    if (!phrases.length || phrases.every(p => p.start == null)) return [];
    const counts = new Map();
    for (const p of phrases) {
      const key = p.text.toLowerCase().replace(/[^\w\s]/g, '').trim();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const chorusKeys = new Set([...counts.entries()].filter(([, c]) => c >= 2).map(([k]) => k));

    const sections = [];
    let cur = null;
    for (const p of phrases) {
      const key = p.text.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const type = chorusKeys.has(key) ? 'chorus' : 'verse';
      if (!cur || cur.type !== type || p.start - cur.end > 8) {
        if (cur) sections.push(cur);
        cur = { type, start: p.start, end: p.end || p.start + 4, label: type };
      } else {
        cur.end = Math.max(cur.end, p.end || p.start + 4);
      }
    }
    if (cur) sections.push(cur);

    if (sections.length && sections[0].start > 2) {
      sections.unshift({ type: 'intro', start: 0, end: sections[0].start, label: 'intro' });
    } else if (!sections.length) {
      return [];
    }
    const last = sections[sections.length - 1];
    if (last.end < duration - 3) {
      sections.push({ type: 'outro', start: last.end, end: duration, label: 'outro' });
    }

    for (let i = 0; i < sections.length - 1; i++) {
      if (sections[i].type === 'verse' && sections[i + 1].type === 'chorus') {
        const len = sections[i].end - sections[i].start;
        if (len < 20) {
          sections[i].type = 'pre';
          sections[i].label = 'pre-chorus';
        } else {
          const split = sections[i].end - Math.min(12, len * 0.35);
          sections.splice(i + 1, 0, {
            type: 'pre',
            start: split,
            end: sections[i].end,
            label: 'pre-chorus'
          });
          sections[i].end = split;
          i++;
        }
      }
    }
    return sections;
  }

  _energyScaffold(d, bpm) {
    const sections = [];
    const push = (type, start, end) => {
      if (end > start + 0.5 && start < d) {
        sections.push({ type, start: Math.max(0, start), end: Math.min(d, end), label: type });
      }
    };
    if (d < 60) {
      push('intro', 0, d * 0.12);
      push('verse', d * 0.12, d * 0.4);
      push('chorus', d * 0.4, d * 0.7);
      push('outro', d * 0.7, d);
    } else if (d < 150) {
      push('intro', 0, d * 0.1);
      push('verse', d * 0.1, d * 0.28);
      push('pre', d * 0.28, d * 0.35);
      push('chorus', d * 0.35, d * 0.48);
      push('verse', d * 0.48, d * 0.62);
      push('chorus', d * 0.62, d * 0.78);
      push('bridge', d * 0.78, d * 0.88);
      push('chorus', d * 0.88, d * 0.95);
      push('outro', d * 0.95, d);
    } else {
      push('intro', 0, d * 0.08);
      push('verse', d * 0.08, d * 0.2);
      push('pre', d * 0.2, d * 0.26);
      push('chorus', d * 0.26, d * 0.36);
      push('verse', d * 0.36, d * 0.48);
      push('pre', d * 0.48, d * 0.54);
      push('chorus', d * 0.54, d * 0.64);
      push('bridge', d * 0.64, d * 0.72);
      push('breakdown', d * 0.72, d * 0.8);
      push('chorus', d * 0.8, d * 0.92);
      push('outro', d * 0.92, d);
    }

    if (bpm > 140 && !sections.some(s => s.type === 'breakdown')) {
      const mid = sections.find(s => s.type === 'bridge');
      if (mid) {
        mid.type = 'breakdown';
        mid.label = 'breakdown';
      }
    }
    return sections;
  }

  _mergeWithEnergyScaffold(lyricSections, d, bpm) {
    const out = [...lyricSections];
    if (bpm > 135 && !out.some(s => s.type === 'breakdown' || s.type === 'drop')) {
      const choruses = out.filter(s => s.type === 'chorus');
      if (choruses.length >= 2) {
        const lastC = choruses[choruses.length - 1];
        const prev = out.find(s => s.end <= lastC.start && (s.type === 'bridge' || s.type === 'verse'));
        if (prev && lastC.start - prev.end > 4) {
          out.push({ type: 'breakdown', start: prev.end, end: lastC.start, label: 'breakdown' });
          out.sort((a, b) => a.start - b.start);
        } else if (prev) {
          prev.type = 'breakdown';
          prev.label = 'breakdown';
        }
      }
    }
    return out;
  }

  /**
   * Live refine: detect drop when energy crashes then explodes.
   */
  liveHint(currentTime, audioFrame) {
    const sec = this.sectionAt(currentTime);
    if (!sec) return { section: null, event: null };
    let event = null;
    if (audioFrame.drop > 0.65 && audioFrame.energy < 0.2) event = 'blackout';
    if (audioFrame.build > 0.7) event = 'build';
    if (sec.type === 'breakdown' || sec.type === 'drop') {
      if (audioFrame.onset > 0.6 && (audioFrame.bass > 0.5 || audioFrame.roles?.kick > 0.55)) {
        event = 'impact';
      }
    }
    return { section: sec, event };
  }

  sectionAt(t) {
    for (const s of this.sections) {
      if (t >= s.start && t < s.end) return s;
    }
    return this.sections[this.sections.length - 1] || null;
  }

  getSections() {
    return this.sections;
  }
}
