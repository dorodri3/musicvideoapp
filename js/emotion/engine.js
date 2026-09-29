/**
 * Evolving valence / arousal / tension / darkness / hope / aggression
 * + user mood override.
 * Feeds Scene Director palette/scale bias — does NOT own scenery.
 */
export class EmotionEngine {
  constructor() {
    this.state = {
      valence: 0,
      arousal: 0.4,
      tension: 0.3,
      darkness: 0.4,
      hope: 0.4,
      aggression: 0.2
    };
    this.userMood = 'auto';
    this.target = { ...this.state };
  }

  setMood(mood) {
    this.userMood = mood || 'auto';
  }

  /**
   * Update from audio + structure + semantic concepts.
   * Prefer audio.roles when present (same as instruments).
   */
  update(audioFrame, section, concepts = [], dt = 0.016) {
    const a = audioFrame;
    const roles = a.roles || a.instruments || {};
    let valence = (a.treble - a.bass) * 0.45 + (roles.pads || 0) * 0.15 - (roles.harsh || 0) * 0.25;
    let arousal = Math.min(1, a.energy * 1.1 + a.onset * 0.25 + (roles.kick || 0) * 0.2 + (roles.hats || 0) * 0.15);
    let tension = Math.min(1, (a.build || 0) * 0.85 + (1 - Math.min(1, a.rms * 2)) * 0.08 + (roles.snare || 0) * 0.1);
    let darkness = Math.min(1, 0.28 + a.bass * 0.35 + (roles.bass || 0) * 0.2 - a.treble * 0.18 - (roles.hats || 0) * 0.1);
    let hope = Math.min(1, 0.32 + a.treble * 0.35 + (roles.pads || 0) * 0.25 + (roles.lead || roles.vocalish || 0) * 0.15 - (a.drop || 0) * 0.2);
    let aggression = Math.min(1, a.bass * 0.35 + a.flux * 0.25 + a.peak * 0.25 + (roles.kick || 0) * 0.25 + (a.drop || 0) * 0.35 + (roles.harsh || 0) * 0.2);

    if (section) {
      switch (section.type) {
        case 'intro':
          arousal *= 0.6; tension = Math.max(tension, 0.35); hope += 0.1;
          break;
        case 'verse':
          arousal *= 0.75; tension *= 0.85;
          break;
        case 'pre':
          tension = Math.min(1, tension + 0.35); arousal += 0.15;
          break;
        case 'chorus':
          valence += 0.15; arousal = Math.min(1, arousal + 0.25); hope += 0.2;
          darkness *= 0.85;
          break;
        case 'bridge':
          valence -= 0.1; tension += 0.15;
          break;
        case 'breakdown':
        case 'drop':
          aggression = Math.min(1, aggression + 0.45);
          darkness = Math.min(1, darkness + 0.25);
          tension = 0.9;
          break;
        case 'outro':
          arousal *= 0.5; tension *= 0.4; hope += 0.15; darkness *= 0.9;
          break;
      }
    }

    const primary = concepts[0];
    if (primary?.mood) {
      const m = primary.mood;
      if (m.valence != null) valence = valence * 0.6 + m.valence * 0.4;
      if (m.darkness != null) darkness = darkness * 0.55 + m.darkness * 0.45;
      if (m.hope != null) hope = hope * 0.55 + m.hope * 0.45;
      if (m.aggression != null) aggression = aggression * 0.55 + m.aggression * 0.45;
      if (m.tension != null) tension = tension * 0.55 + m.tension * 0.45;
      if (m.arousal != null) arousal = arousal * 0.6 + m.arousal * 0.4;
    }

    this._applyUserMood();
    if (this.userMood === 'auto') {
      this.target = {
        valence: this._clamp(valence),
        arousal: this._clamp(arousal),
        tension: this._clamp(tension),
        darkness: this._clamp(darkness),
        hope: this._clamp(hope),
        aggression: this._clamp(aggression)
      };
    } else {
      const override = this._moodOverride();
      this.target = {
        valence: this._clamp(valence * 0.5 + override.valence * 0.5),
        arousal: this._clamp(arousal * 0.55 + override.arousal * 0.45),
        tension: this._clamp(tension * 0.55 + override.tension * 0.45),
        darkness: this._clamp(darkness * 0.5 + override.darkness * 0.5),
        hope: this._clamp(hope * 0.5 + override.hope * 0.5),
        aggression: this._clamp(aggression * 0.55 + override.aggression * 0.45)
      };
    }

    const lerp = Math.min(1, dt * 3);
    for (const k of Object.keys(this.state)) {
      this.state[k] += (this.target[k] - this.state[k]) * lerp;
    }
    return this.state;
  }

  /**
   * Director-facing bias: suggested palette key + scale nudge.
   * Scenery stays with concepts/presets.
   */
  directorBias() {
    const e = this.state;
    let paletteKey = 'cinematic';
    if (e.aggression > 0.7 && e.arousal > 0.6) paletteKey = 'aggressive';
    else if (e.darkness > 0.7 && e.valence < -0.2) paletteKey = 'dark';
    else if (e.hope > 0.7 && e.valence > 0.3) paletteKey = 'hopeful';
    else if (e.valence < -0.35 && e.arousal < 0.45) paletteKey = 'melancholic';
    else if (e.valence > 0.5 && e.arousal > 0.7) paletteKey = 'euphoric';
    else if (e.hope > 0.5 && e.darkness < 0.35) paletteKey = 'dreamlike';

    let scaleNudge = 0;
    if (e.arousal > 0.75) scaleNudge += 0.4;
    if (e.arousal < 0.3) scaleNudge -= 0.4;
    if (e.hope > 0.7 && e.valence > 0.3) scaleNudge += 0.2;
    if (e.darkness > 0.75) scaleNudge -= 0.15;

    return { paletteKey, scaleNudge, valence: e.valence, arousal: e.arousal };
  }

  _applyUserMood() {}

  _moodOverride() {
    const base = { valence: 0, arousal: 0.4, tension: 0.3, darkness: 0.4, hope: 0.4, aggression: 0.2 };
    switch (this.userMood) {
      case 'dark':
        return { valence: -0.5, arousal: 0.45, tension: 0.6, darkness: 0.85, hope: 0.15, aggression: 0.35 };
      case 'hopeful':
        return { valence: 0.6, arousal: 0.5, tension: 0.25, darkness: 0.15, hope: 0.9, aggression: 0.1 };
      case 'aggressive':
        return { valence: -0.2, arousal: 0.85, tension: 0.7, darkness: 0.55, hope: 0.2, aggression: 0.9 };
      case 'melancholic':
        return { valence: -0.45, arousal: 0.3, tension: 0.35, darkness: 0.6, hope: 0.3, aggression: 0.1 };
      case 'euphoric':
        return { valence: 0.85, arousal: 0.9, tension: 0.2, darkness: 0.05, hope: 0.85, aggression: 0.2 };
      case 'tense':
        return { valence: -0.1, arousal: 0.65, tension: 0.9, darkness: 0.5, hope: 0.25, aggression: 0.4 };
      default:
        return base;
    }
  }

  _clamp(v) {
    return Math.max(-1, Math.min(1, v));
  }

  get() {
    return this.state;
  }
}
