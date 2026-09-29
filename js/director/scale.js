/**
 * Scale: intimate → human → cinematic → epic → cosmic
 * Driven by emotion + structure. Emotion nudges; sections own the arc.
 */
const ORDER = ['intimate', 'human', 'cinematic', 'epic', 'cosmic'];

export class ScaleDirector {
  constructor() {
    this.current = 'cinematic';
    this.numeric = 2;
  }

  /**
   * @param {object} emotion
   * @param {object|null} section
   * @param {string} [conceptScale]
   * @param {object} [opts] { motifStrength, chorusRepeat }
   */
  update(emotion, section, conceptScale = null, opts = {}) {
    let target = 2; // cinematic
    const e = emotion || {};
    const valence = e.valence ?? 0;
    const arousal = e.arousal ?? 0.4;
    const darkness = e.darkness ?? 0.4;
    const hope = e.hope ?? 0.4;
    const aggression = e.aggression ?? 0.2;

    // Emotion bias (does not own scenery — only scale)
    if (arousal < 0.28 && darkness < 0.4 && Math.abs(valence) < 0.3) target = 0;
    else if (arousal < 0.42) target = 1;
    else if (arousal > 0.78 && (aggression > 0.5 || hope > 0.7)) target = 3;
    else if (hope > 0.65 && arousal > 0.5 && valence > 0.2) target = 3;
    else if (arousal > 0.85 && aggression > 0.7) target = 4;

    if (section) {
      const rep = section.repeat || 1;
      switch (section.type) {
        case 'intro':
          target = Math.min(target, 1); // establish small
          break;
        case 'verse':
          target = Math.min(target, 2); // narrative human/cinematic
          break;
        case 'pre':
          target = Math.max(target, 2); // tension swell
          break;
        case 'chorus':
          if (rep >= 3) target = 4;
          else if (rep >= 2) target = Math.max(target, 3);
          else target = Math.max(target, 2);
          break;
        case 'bridge':
          target = Math.min(Math.max(target, 1), 3); // shift, not peak
          break;
        case 'breakdown':
        case 'drop':
          target = Math.max(target, 3);
          break;
        case 'outro':
          target = Math.min(target, 1); // resolve intimate/human
          break;
      }
    }

    if (conceptScale) {
      const idx = ORDER.indexOf(conceptScale);
      if (idx >= 0) target = Math.round(target * 0.55 + idx * 0.45);
    }

    const motifStrength = opts.motifStrength || 0;
    if (motifStrength > 0.7) target = Math.max(target, 3);
    if (motifStrength >= 0.95) target = Math.max(target, 4);

    // Smooth
    this.numeric += (target - this.numeric) * 0.1;
    const rounded = Math.max(0, Math.min(4, Math.round(this.numeric)));
    this.current = ORDER[rounded];
    return {
      name: this.current,
      level: this.numeric,
      particleMul: 0.4 + this.numeric * 0.4,
      cameraMul: 0.5 + this.numeric * 0.35,
      bloomMul: 0.5 + this.numeric * 0.4
    };
  }

  get() {
    return this.current;
  }
}
