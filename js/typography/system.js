/**
 * Scenic phrase display — words IN the world, not karaoke billboard.
 * Modest phone-readable sizes; edge light_band / horizon — NO filled plate.
 * Never invisible while phrase active; stroke+fill glyphs only (HOLD-2149).
 * TYPO_BUILD=hold2149 — ZERO plate / dark rounded card / dark fillRect behind glyphs.
 */
export const TYPO_BUILD = 'hold2149';

export class TypographySystem {
  constructor() {
    this.enabled = true;
    this.opacity = 0;
    this.currentText = '';
    this.wordIndex = -1;
    this.words = [];
    this.layout = 'cinematic'; // cinematic | integrated | title
    this.placement = 'light_band'; // horizon | light_band | panel | motif
    this.holdUntil = 0;
    this.leadBoost = 0;
    this._phraseActive = false;
    this._lastSection = null;
    this._panelSide = 1; // -1 left / +1 right for panel mode
    this._harshEtch = 0;
  }

  setEnabled(on) {
    this.enabled = !!on;
  }

  /** Clear sticky / held lyric (section change or lyricStickExpire). */
  clearSticky() {
    this.currentText = '';
    this.words = [];
    this.wordIndex = -1;
    this.opacity = 0;
    this.holdUntil = 0;
    this._phraseActive = false;
  }

  /**
   * @param {object|null} phrase
   * @param {number} wordIndex
   * @param {object} directive director output
   * @param {number} now
   * @param {object} [audio]
   * @param {number} [emphasisBoost]
   */
  update(phrase, wordIndex, directive, now, audio = null, emphasisBoost = 0) {
    if (!this.enabled) {
      this.opacity *= 0.85;
      this._phraseActive = false;
      return;
    }

    // Section change or stick-expire → drop glued phrase
    const sec = directive?.sectionType || null;
    const stickExpire = !!(
      directive?.lyricStickExpire ||
      directive?.sectionChange ||
      directive?.events?.includes?.('lyricStickExpire') ||
      directive?.events?.includes?.('sectionChange')
    );
    if (stickExpire || (sec && this._lastSection && sec !== this._lastSection)) {
      this.clearSticky();
    }
    if (sec) this._lastSection = sec;

    // Harsh etch pulse at drop / harsh gates, then restore
    if (directive?.events?.includes?.('harsh_glitch') || directive?.events?.includes?.('collapse')) {
      this._harshEtch = Math.max(this._harshEtch, 0.9);
    }
    this._harshEtch *= 0.88;

    if (!phrase || !phrase.text) {
      this._phraseActive = false;
      if (now < this.holdUntil && this.currentText) {
        this.opacity = Math.max(this.opacity, 0.72);
        this.opacity = Math.min(0.9, this.opacity + 0.04);
      } else {
        this.opacity *= 0.94;
        if (this.opacity < 0.04) {
          this.currentText = '';
          this.words = [];
          this.wordIndex = -1;
        }
      }
      return;
    }

    this._phraseActive = true;

    if (phrase.text !== this.currentText) {
      this.currentText = phrase.text;
      this.words = phrase.words?.map(w => w.text) || phrase.text.split(/\s+/).filter(Boolean);
      this.holdUntil = now + Math.max(2800, this.words.length * 420);
      this.opacity = Math.max(this.opacity, 0.7);
      // Flip panel side occasionally so signage feels in-world
      this._panelSide = Math.random() > 0.5 ? 1 : -1;
    }
    this.wordIndex = wordIndex;
    this.opacity = Math.min(0.92, this.opacity + 0.22);

    // Readable floors while phrase active — translucent so scenery shows through
    if (now < this.holdUntil || this._phraseActive) {
      this.opacity = Math.max(this.opacity, 0.78);
    } else {
      this.opacity *= 0.96;
      if (this.opacity < 0.5 && this.currentText) {
        this.opacity = Math.max(this.opacity, 0.5);
      }
    }

    const roles = audio?.roles || audio?.instruments || {};
    const vocalBoost = audio?.vocal
      ? Math.max(audio.vocal.intensity || 0, audio.vocal.likelyVocal ? 0.35 : 0)
      : 0;
    const ri = directive?.rolesIntent || {};
    const directorEmphasis = Math.max(
      emphasisBoost || 0,
      ri.lyricEmphasis || 0,
      ri.leadBeam || 0
    );
    this.leadBoost = Math.max(
      roles.lead || 0,
      roles.vocalish || 0,
      vocalBoost,
      audio?.mid || 0,
      directorEmphasis
    );

    // Layout + placement as scenery (not karaoke billboard)
    const st = directive?.sectionType;
    if (st === 'chorus') {
      this.layout = 'title';
      this.placement = 'light_band';
    } else if (st === 'intro' || st === 'outro') {
      this.layout = 'integrated';
      this.placement = Math.random() > 0.45 ? 'horizon' : 'integrated';
      if (this.placement === 'integrated') this.placement = 'horizon';
    } else if (st === 'bridge' || st === 'breakdown') {
      this.layout = 'cinematic';
      this.placement = 'horizon'; // was motif mid-frame — edge only
    } else {
      // verse / default — light_band / horizon only (no panel plate)
      this.layout = 'cinematic';
      this.placement = 'light_band';
    }

    // Allow directive override, then FORCE edge-only (no mid-frame karaoke card)
    if (directive?.lyricPlacement) this.placement = directive.lyricPlacement;
    if (directive?.lyricLayout) this.layout = directive.lyricLayout;
    // HOLD-2149: remap panel/motif/center/integrated → light_band or horizon
    const midPlacements = new Set(['panel', 'motif', 'center', 'integrated', 'mid', 'middle']);
    if (midPlacements.has(this.placement)) {
      this.placement = (this.layout === 'title' || this.layout === 'cinematic') ? 'light_band' : 'horizon';
    }
    if (this.placement !== 'horizon' && this.placement !== 'light_band') {
      this.placement = 'light_band';
    }
  }

  draw(ctx, w, h, emotion = {}) {
    const minDraw = this._phraseActive ? 0.06 : 0.04;
    if (!this.enabled || !this.currentText || this.opacity < minDraw) return;

    // Glyph alpha only — never pump a large dark fill via globalAlpha
    const drawAlpha = this._phraseActive
      ? Math.max(0.62, Math.min(0.88, this.opacity))
      : Math.min(0.78, this.opacity);

    ctx.save();

    const phone = Math.min(w, h) < 900;
    let fontSize;
    // Smaller scenic sizes — never a mid-frame billboard
    if (this.layout === 'title') {
      // title/chorus ≤30 phone / 34 desktop
      fontSize = Math.min(phone ? 30 : 34, w / (phone ? 14 : 18));
    } else if (this.layout === 'integrated') {
      // integrated ≤18/22
      fontSize = Math.min(phone ? 18 : 22, w / (phone ? 22 : 28));
    } else {
      // cinematic ≤24/28
      fontSize = Math.min(phone ? 24 : 28, w / (phone ? 18 : 22));
    }
    fontSize *= 1 + Math.min(0.1, this.leadBoost * 0.14);

    // Placement → y / x — HOLD-2149: edge only (y≥0.78h lower OR y≤0.18h top). Never mid-frame.
    let y;
    let xBias = 0;
    let place = this.placement;
    if (place !== 'horizon' && place !== 'light_band') place = 'light_band';
    if (place === 'horizon') {
      // top-edge band
      y = h * (0.12 + Math.sin((this.wordIndex || 0) * 0.15) * 0.02);
      y = Math.min(h * 0.18, Math.max(h * 0.08, y));
    } else {
      // light_band — lower edge ≥ 0.78h
      y = h * 0.82;
      y = Math.min(h * 0.90, Math.max(h * 0.78, y));
    }

    ctx.font = `600 ${Math.round(fontSize)}px "Segoe UI", "Helvetica Neue", system-ui, sans-serif`;
    const wrapW = w * 0.72;
    const lines = this._wrap(ctx, this.words, wrapW, fontSize);
    const lineH = fontSize * 1.28;
    const blockH = lines.length * lineH;
    const blockTop = y - blockH / 2;

    // P0 HOLD-2149: ZERO filled lyric plate/scrim/card — strokeText+fillText glyphs ONLY.
    // Plate helper + dark wash fill path removed (was opaque karaoke rounded card).
    // No underline bar / chrome under active word (glow/weight OK).
    ctx.globalAlpha = 1;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const etch = this._harshEtch;
    let wordGlobal = 0;
    for (let li = 0; li < lines.length; li++) {
      const lw = this._measurePhrase(ctx, lines[li].words, fontSize * 0.28);
      let x = (w - lw) / 2 + xBias;
      const ly = blockTop + lineH * li + lineH / 2;
      const gap = fontSize * 0.28;

      for (let i = 0; i < lines[li].words.length; i++) {
        const word = lines[li].words[i];
        const active = wordGlobal === this.wordIndex;
        const weight = active ? '800' : '600';
        ctx.font = `${weight} ${Math.round(fontSize)}px "Segoe UI", "Helvetica Neue", system-ui, sans-serif`;
        ctx.globalAlpha = Math.min(0.88, drawAlpha * (active ? 1 : 0.9));
        ctx.shadowBlur = 0;

        // Dark stroke under white fill for readability (no opaque plate)
        const strokeA = active ? 0.65 : 0.5;
        ctx.lineWidth = Math.max(2.2, fontSize * 0.09);
        ctx.strokeStyle = `rgba(0,0,0,${strokeA})`;
        ctx.strokeText(word, x, ly);

        if (place === 'motif' || etch > 0.25) {
          ctx.lineWidth = Math.max(1.0, fontSize * 0.04);
          ctx.strokeStyle = `rgba(255,255,255,${0.45 + etch * 0.3})`;
          ctx.shadowColor = 'rgba(255,240,220,0.35)';
          ctx.shadowBlur = 6 + this.leadBoost * 6 + etch * 8;
          ctx.strokeText(word, x, ly);
          ctx.fillStyle = active ? 'rgba(255,255,255,0.88)' : 'rgba(240,240,250,0.75)';
          ctx.fillText(word, x, ly);
        } else {
          if (active) {
            ctx.shadowColor = 'rgba(255,250,240,0.7)';
            ctx.shadowBlur = 10 + this.leadBoost * 10;
            ctx.fillStyle = '#ffffff';
          } else {
            ctx.shadowColor = 'rgba(255,255,255,0.3)';
            ctx.shadowBlur = 5 + this.leadBoost * 4;
            ctx.fillStyle = '#f0f0f8';
          }
          ctx.fillText(word, x, ly);
        }
        x += ctx.measureText(word).width + gap;
        wordGlobal++;
      }
    }

    ctx.restore();
  }

  _wrap(ctx, words, maxW, fontSize) {
    const gap = fontSize * 0.28;
    const lines = [];
    let cur = [];
    let curW = 0;
    for (const word of words) {
      const ww = ctx.measureText(word).width;
      const next = cur.length ? curW + gap + ww : ww;
      if (cur.length && next > maxW && lines.length < 2) {
        lines.push({ words: cur });
        cur = [word];
        curW = ww;
      } else {
        cur.push(word);
        curW = next;
      }
    }
    if (cur.length) lines.push({ words: cur });
    return lines.length ? lines : [{ words: words }];
  }


  _measurePhrase(ctx, words, gap) {
    let w = 0;
    for (let i = 0; i < words.length; i++) {
      w += ctx.measureText(words[i]).width;
      if (i < words.length - 1) w += gap;
    }
    return w;
  }
}
