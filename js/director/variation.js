/**
 * Cooldowns; avoid effect spam; track recent scenes/transitions/cameras.
 * Lyric-driven changes get a shorter gap when the concept world actually shifts.
 */
export class VariationController {
  constructor() {
    this.recentScenes = [];
    this.recentTransitions = [];
    this.recentCameras = [];
    this.effectCooldowns = new Map();
    this.lastSceneChange = 0;
    this.lastConceptId = null;
  }

  canChangeScene(now, minGapMs = 8000) {
    return now - this.lastSceneChange >= minGapMs;
  }

  /**
   * Lyric steering: allow a change sooner when the concept id actually changes
   * (meaningful world shift), but still block thrash of the same concept.
   * @param {number} now
   * @param {string|null} conceptId
   * @param {object} [opts]
   * @returns {boolean}
   */
  canChangeForConcept(now, conceptId, opts = {}) {
    const {
      sameConceptGap = 12000,
      newConceptGap = 2800,
      forceGap = 0
    } = opts;
    if (forceGap > 0) {
      return now - this.lastSceneChange >= forceGap;
    }
    const same = conceptId && conceptId === this.lastConceptId;
    const gap = same ? sameConceptGap : newConceptGap;
    return now - this.lastSceneChange >= gap;
  }

  recordScene(id, now, conceptId = null) {
    this.recentScenes.push({ id, now });
    if (this.recentScenes.length > 12) this.recentScenes.shift();
    this.lastSceneChange = now;
    if (conceptId) this.lastConceptId = conceptId;
  }

  recordTransition(name, now) {
    this.recentTransitions.push({ name, now });
    if (this.recentTransitions.length > 10) this.recentTransitions.shift();
  }

  recordCamera(mode, now) {
    this.recentCameras.push({ mode, now });
    if (this.recentCameras.length > 10) this.recentCameras.shift();
  }

  /** Avoid repeating same scene too soon */
  avoidRecent(candidates, windowMs = 45000, now = performance.now()) {
    const recent = new Set(
      this.recentScenes.filter(s => now - s.now < windowMs).map(s => s.id)
    );
    const fresh = candidates.filter(c => !recent.has(c));
    return fresh.length ? fresh : candidates;
  }

  canEffect(name, now, cooldownMs = 5000) {
    const last = this.effectCooldowns.get(name) || 0;
    if (now - last < cooldownMs) return false;
    this.effectCooldowns.set(name, now);
    return true;
  }

  pickCamera(candidates, now) {
    const list = candidates?.length ? candidates : ['drift'];
    const recent = new Set(
      this.recentCameras.filter(c => now - c.now < 20000).map(c => c.mode)
    );
    const fresh = list.filter(c => !recent.has(c));
    const pool = fresh.length ? fresh : list;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.recordCamera(pick, now);
    return pick;
  }
}
