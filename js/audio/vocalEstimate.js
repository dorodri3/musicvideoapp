/**
 * Best-effort vocal activity / intensity from mid-band + flux.
 * Heuristic VAD — no ML stem separation.
 * Pairs with audio.roles.vocalish / roles.lead (band proxies in analyzer.js).
 * See ./ROLES.md.
 */
export class VocalEstimate {
  constructor() {
    this.history = [];
    this.activity = 0;
    this.intensity = 0;
    this.smooth = 0;
  }

  /**
   * @param {object} audioFrame from AudioAnalyzer
   * @returns {{ activity: number, intensity: number, likelyVocal: boolean }}
   */
  update(audioFrame) {
    const { mid, treble, bass, flux, rms, silence, onset } = audioFrame;
    if (silence) {
      this.activity *= 0.85;
      this.intensity *= 0.9;
      this.smooth *= 0.9;
      return { activity: this.activity, intensity: this.intensity, likelyVocal: false };
    }

    // Vocals often concentrate mid + some treble, moderate flux, not bass-dominated
    const midBias = mid / (bass + mid + treble + 0.001);
    const spectralShape = mid * 0.55 + treble * 0.25 - bass * 0.15;
    const fluxFactor = Math.min(1, flux * 2.2);
    const raw = Math.max(0, spectralShape * 1.4 + midBias * 0.5 + fluxFactor * 0.25 + rms * 0.3);
    const clamped = Math.min(1, raw);

    this.history.push(clamped);
    if (this.history.length > 30) this.history.shift();
    const avg = this.history.reduce((a, b) => a + b, 0) / this.history.length;

    this.activity = this.activity * 0.7 + avg * 0.3;
    this.intensity = this.intensity * 0.6 + clamped * 0.4;
    // Onsets during mid-energy often = syllable starts
    if (onset > 0.4 && midBias > 0.28) {
      this.intensity = Math.min(1, this.intensity + 0.2);
    }
    this.smooth = this.smooth * 0.82 + this.activity * 0.18;

    return {
      activity: this.activity,
      intensity: this.intensity,
      likelyVocal: this.smooth > 0.22 && midBias > 0.25
    };
  }
}
