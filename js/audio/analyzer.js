import {
  resolveExplicitGenre,
  leanGenreFromAudio,
  HARSH_PROTECTED
} from './genreFamily.js';

/**
 * Audio analyzer: RMS, peak, centroid, flux, bass/mid/treble,
 * tempo/beat/onsets, energy envelope, build/drop heuristics, silence,
 * plus instrument-role proxies on every frame as `roles` (and `instruments` alias).
 *
 * See ./ROLES.md for Visual Engine / Scene Director mapping contract.
 * `spectrum` is analysis-only (null on live frames unless setDebugSpectrum(true)).
 * Never feed a visualizer / EQ bar layer — scenic verbs via roles only.
 * Live frame also exposes `vibe` + soft `texture` / `genreHint` (all-genre, not rock/EDM-only).
 */
export class AudioAnalyzer {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.65;
    this.freqBins = this.analyser.frequencyBinCount;
    this.freqData = new Uint8Array(this.freqBins);
    this.timeData = new Uint8Array(this.analyser.fftSize);
    this.prevSpectrum = new Float32Array(this.freqBins);
    this.energyHistory = [];
    this.fluxHistory = [];
    this.beatTimes = [];
    this.lastBeat = 0;
    this.bpm = 120;
    this.onsetStrength = 0;
    // Quality gap 4: spectrum stays analysis-only unless debug opted in
    this.debugSpectrum = false;
    this.frame = this._emptyFrame();
    this._buildState = { rising: 0, dropping: 0 };
    this._dropImpulse = 0; // short gate pulse (psych: spend once)
    this._arousalSmooth = 0.4;
    this._onsetTimes = []; // for onset-density vibe
    this._rmsVarHist = [];
    this._vibeSmooth = {
      peaceful: 0.3, chaotic: 0, scary: 0, tense: 0.2, speechLike: 0, nonGroove: 0,
      aggression: 0.15, arousal: 0.4, warm: 0.2
    };
    this._harshSustain = 0; // bleach guard — brief spikes OK, sustained harsh soft-caps
    this._textureSmooth = {
      swell: 0, swing: 0, harshWall: 0, ambient: 0,
      pocketKick: 0, sparseAcoustic: 0, fourOnFloor: 0
    };
    this._genreHint = 'unknown';
    this._explicitFamily = null; // from ID3/user/fantasy — sticky
    this._explicitSource = 'none';
    this._genreFamily = 'unknown';
    // Instrument envelope smoothers
    this._inst = {
      kick: 0, bass: 0, snare: 0, hats: 0, pads: 0, lead: 0, harsh: 0
    };
    this._prevLow = 0;
    this._prevMidHi = 0;
  }

  connect(source) {
    source.connect(this.analyser);
    return this.analyser;
  }

  _emptyRoles() {
    return {
      kick: 0,
      bass: 0,
      snare: 0,
      hats: 0,
      pads: 0,
      lead: 0,
      vocalish: 0,
      harsh: 0
    };
  }

  _emptyFrame() {
    const roles = this._emptyRoles();
    return {
      rms: 0, peak: 0, centroid: 0, flux: 0,
      bass: 0, mid: 0, treble: 0,
      energy: 0, beat: false, onset: 0, bpm: 120,
      build: 0, drop: 0, silence: true,
      spectrum: null, // never a live EQ draw feed
      time: 0,
      // Canonical instrument-role proxies (0..1) — prefer this
      roles,
      // Alias kept for existing Visual Engine / renderer consumers
      instruments: roles,
      vibe: {
        peaceful: 0.3, calm: 0.3, peace: 0.3,
        chaotic: 0, chaos: 0,
        scary: 0, tense: 0.2,
        speechLike: 0, spoken: 0, intimateSpeech: 0, nonGroove: 0,
        aggression: 0.15, arousal: 0.4, warm: 0.2,
        ladder: 'peaceful',
        dominant: 'peace'
      },
      texture: {
        swell: 0, swing: 0, harshWall: 0, ambient: 0,
        pocketKick: 0, sparseAcoustic: 0, fourOnFloor: 0
      },
      genreHint: 'unknown',
      genreFamily: 'unknown',
      genreSource: 'none'
    };
  }

  update(now = performance.now()) {
    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    const n = this.freqBins;
    const sr = this.ctx.sampleRate;
    const nyquist = sr / 2;

    let sumSq = 0, peak = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const v = (this.timeData[i] - 128) / 128;
      sumSq += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    const rms = Math.sqrt(sumSq / this.timeData.length);

    let weightedSum = 0, magSum = 0, flux = 0;
    let bass = 0, mid = 0, treble = 0;
    // Sub-band proxies for instruments
    let sub = 0, low = 0, lowMid = 0, midHi = 0, hi = 0, air = 0;
    const hz = (f) => Math.floor((f / nyquist) * n);
    const iSub = hz(60);
    const iLow = hz(120);
    const iBass = hz(250);
    const iLowMid = hz(500);
    const iMid = hz(2000);
    const iMidHi = hz(4000);
    const iHi = hz(8000);
    const bassEnd = Math.floor((250 / nyquist) * n);
    const midEnd = Math.floor((4000 / nyquist) * n);

    for (let i = 0; i < n; i++) {
      const mag = this.freqData[i] / 255;
      const freq = (i / n) * nyquist;
      weightedSum += freq * mag;
      magSum += mag;
      const prev = this.prevSpectrum[i];
      const d = mag - prev;
      if (d > 0) flux += d;
      this.prevSpectrum[i] = mag;
      if (i < bassEnd) bass += mag;
      else if (i < midEnd) mid += mag;
      else treble += mag;

      if (i < iSub) sub += mag;
      else if (i < iLow) low += mag;
      else if (i < iBass) low += mag;
      else if (i < iLowMid) lowMid += mag;
      else if (i < iMid) midHi += mag;
      else if (i < iMidHi) midHi += mag;
      else if (i < iHi) hi += mag;
      else air += mag;
    }

    const norm = (sum, count) => sum / Math.max(1, count);
    bass /= Math.max(1, bassEnd);
    mid /= Math.max(1, midEnd - bassEnd);
    treble /= Math.max(1, n - midEnd);
    sub = norm(sub, iSub);
    low = norm(low, Math.max(1, iBass - iSub));
    lowMid = norm(lowMid, Math.max(1, iLowMid - iBass));
    midHi = norm(midHi, Math.max(1, iMidHi - iLowMid));
    hi = norm(hi, Math.max(1, iHi - iMidHi));
    air = norm(air, Math.max(1, n - iHi));

    const centroid = magSum > 0.001 ? weightedSum / magSum : 0;
    const energy = rms * 0.6 + bass * 0.4;

    this.energyHistory.push(energy);
    if (this.energyHistory.length > 180) this.energyHistory.shift();
    this.fluxHistory.push(flux);
    if (this.fluxHistory.length > 90) this.fluxHistory.shift();

    const avgFlux = this.fluxHistory.reduce((a, b) => a + b, 0) / this.fluxHistory.length;
    const onset = flux > avgFlux * 1.8 && flux > 0.15 ? Math.min(1, flux / (avgFlux * 3 + 0.01)) : 0;
    this.onsetStrength = onset;

    // Low-arousal / verse-like: raise beat+onset hysteresis (no false shake)
    this._arousalSmooth = this._arousalSmooth * 0.92 + energy * 0.08;
    const lowArousal = this._arousalSmooth < 0.28;
    const onsetGate = lowArousal ? 0.52 : 0.35;
    const beatMinGap = lowArousal ? 60_000 / (this.bpm * 1.35) : 60_000 / (this.bpm * 1.8);

    let beat = false;
    if (onset > onsetGate && now - this.lastBeat > beatMinGap) {
      beat = true;
      this.beatTimes.push(now);
      if (this.beatTimes.length > 12) this.beatTimes.shift();
      this.lastBeat = now;
      if (this.beatTimes.length >= 4) {
        const intervals = [];
        for (let i = 1; i < this.beatTimes.length; i++) {
          intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
        }
        intervals.sort((a, b) => a - b);
        const median = intervals[Math.floor(intervals.length / 2)];
        if (median > 200 && median < 1500) {
          const estimated = 60000 / median;
          this.bpm = this.bpm * 0.85 + estimated * 0.15;
        }
      }
    }

    // Build ramps cleanly (anticipation); drop = short impulse not sticky high
    const hist = this.energyHistory;
    let build = 0, drop = 0;
    if (hist.length > 40) {
      const recent = hist.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const earlier = hist.slice(-40, -20).reduce((a, b) => a + b, 0) / 20;
      const delta = recent - earlier;
      if (delta > 0.035) {
        // Steady ramp into pre→chorus (caudate anticipation window)
        this._buildState.rising = Math.min(1, this._buildState.rising + 0.055);
        this._buildState.dropping = Math.max(0, this._buildState.dropping - 0.14);
      } else if (delta < -0.07) {
        // Gate event — fire short impulse, don't hold dropping high
        const gate = Math.min(1, this._buildState.dropping + 0.55);
        this._dropImpulse = Math.max(this._dropImpulse, gate);
        this._buildState.dropping = Math.min(1, this._buildState.dropping + 0.08);
        this._buildState.rising = Math.max(0, this._buildState.rising - 0.18);
      } else {
        this._buildState.rising *= 0.97; // linger build a touch for clean ramp
        this._buildState.dropping *= 0.82; // drop envelope decays fast
      }
      build = this._buildState.rising;
      if (earlier > 0.35 && recent < earlier * 0.45) {
        this._dropImpulse = Math.max(this._dropImpulse, 0.85);
      }
    }
    // Short drop pulse (~few frames of scenic gate), then soothe
    this._dropImpulse *= 0.78;
    drop = Math.max(this._dropImpulse, this._buildState.dropping * 0.35);

    const silence = rms < 0.02 && energy < 0.03;

    // ——— Instrument-role proxies (heuristic; not stem separation) ———
    const lowDelta = Math.max(0, (sub + low) - this._prevLow);
    this._prevLow = sub + low;
    const midHiDelta = Math.max(0, midHi - this._prevMidHi);
    this._prevMidHi = midHi;

    // Kick: higher threshold in low-arousal (storytelling pocket)
    const kickOnsetNeed = lowArousal ? 0.55 : 0.4;
    const kickDeltaGain = lowArousal ? 5.2 : 8;
    const kickRaw = Math.min(1, lowDelta * kickDeltaGain + (onset > kickOnsetNeed && bass > 0.35 ? onset * 0.8 : 0));
    // Bass: sustained low weight
    const bassRole = Math.min(1, (sub * 0.5 + low * 0.5 + bass * 0.4));
    // Snare: rare anticipation when build is high (pre→chorus)
    const snareAnticipation = build > 0.55 && midHiDelta > 0.02 ? midHiDelta * 4 : 0;
    const snareRaw = Math.min(1, midHiDelta * 6 + snareAnticipation + (onset > 0.3 && midHi > 0.25 && sub < 0.4 ? onset * 0.7 : 0));
    // Hats: medium groove density (not max spam)
    const hatsRaw = Math.min(0.85, hi * 1.05 + air * 1.15);
    // Pads/sustain
    const padsRaw = Math.min(1, (lowMid + mid) * 0.9 * (1 - Math.min(1, onset * 1.5)));
    // Lead / vocal-ish
    const leadRaw = Math.min(1, midHi * 0.85 + mid * 0.4 + Math.min(0.5, flux * 0.15));
    // Harsh: peak at drop gate only — not sticky bed
    const harshBed = (air + hi) * (0.25 + Math.min(0.5, flux * 0.12)) * (centroid > 4000 ? 1.0 : 0.45);
    const harshGate = this._dropImpulse > 0.35 ? this._dropImpulse * 1.1 : 0;
    const harshRaw = Math.min(1, Math.max(harshBed * 0.35, harshGate));

    const smooth = (key, raw, attack, release) => {
      const cur = this._inst[key];
      this._inst[key] = raw > cur
        ? cur + (raw - cur) * attack
        : cur + (raw - cur) * release;
      return this._inst[key];
    };

    // ROLE-AGENTS: clear transients (kick/snare/hats) vs smooth aura/shadow (pads/bass)
    const roles = {
      kick: smooth('kick', kickRaw, 0.92, lowArousal ? 0.42 : 0.38),   // footfalls — sharp
      bass: smooth('bass', bassRole, 0.16, 0.055),                     // shadow/weight — slow
      snare: smooth('snare', snareRaw, 0.92, 0.48),                     // clap/gesture — sharp
      hats: smooth('hats', hatsRaw, 0.72, 0.38),                        // sparks/fauna ticks
      pads: smooth('pads', padsRaw, 0.11, 0.045),                       // sky/aura spirit — silk
      lead: smooth('lead', leadRaw, 0.38, 0.14),                        // lyric figure hub
      // Fast release so harsh is a gate etch, not a sticky overlay
      harsh: smooth('harsh', harshRaw, 0.9, 0.45)
    };
    // vocalish mirrors lead so consumer bumps (e.g. VocalEstimate blend) stay in sync
    Object.defineProperty(roles, 'vocalish', {
      enumerable: true,
      configurable: true,
      get() { return this.lead; },
      set(v) { this.lead = v; }
    });

    // Silence / noise floors → soft ambient (never invent a chorus/party)
    if (silence) {
      roles.hats *= 0.12;
      roles.harsh *= 0.05;
      roles.kick *= 0.15;
      roles.snare *= 0.12;
      roles.pads = Math.max(roles.pads, 0.28); // soft ambient bed
      roles.lead *= 0.55;
    }

    // Onset density window (~2s) for vibe chaos vs peaceful
    if (onset > 0.4) this._onsetTimes.push(now);
    while (this._onsetTimes.length && now - this._onsetTimes[0] > 2000) {
      this._onsetTimes.shift();
    }
    const onsetDensity = Math.min(1, this._onsetTimes.length / 10);

    this._rmsVarHist.push(rms);
    if (this._rmsVarHist.length > 45) this._rmsVarHist.shift();
    let rmsMean = 0;
    for (const v of this._rmsVarHist) rmsMean += v;
    rmsMean /= Math.max(1, this._rmsVarHist.length);
    let rmsVar = 0;
    for (const v of this._rmsVarHist) rmsVar += (v - rmsMean) ** 2;
    rmsVar = Math.sqrt(rmsVar / Math.max(1, this._rmsVarHist.length));
    const rmsSteady = rmsMean > 0.04 ? Math.max(0, 1 - rmsVar / (rmsMean + 0.02)) : 0;

    // Beat regularity: four-on-floor (low CV) vs swing/jazz (higher CV)
    let beatRegularity = 0.5;
    let beatIntervalCv = 0.4;
    if (this.beatTimes.length >= 4) {
      const iv = [];
      for (let i = 1; i < this.beatTimes.length; i++) {
        iv.push(this.beatTimes[i] - this.beatTimes[i - 1]);
      }
      const mean = iv.reduce((a, b) => a + b, 0) / iv.length;
      let v = 0;
      for (const x of iv) v += (x - mean) ** 2;
      beatIntervalCv = mean > 1 ? Math.sqrt(v / iv.length) / mean : 1;
      beatRegularity = Math.max(0, Math.min(1, 1 - beatIntervalCv));
    }

    const textureCtx = {
      flux, onset, onsetDensity, energy, rms, rmsSteady, silence, build, drop,
      beatRegularity, beatIntervalCv, bpm: this.bpm, centroid
    };
    const texture = this._computeTexture(roles, textureCtx);
    // Genre-aware soft-clip (ambient/classical keep swell; don't rock/EDM-crush)
    this._softClipRoles(roles, texture);

    // Noise/experimental: harsh OK without inventing kick groove
    if ((texture.harshWall || 0) > 0.45 && (roles.kick || 0) < 0.28 && (texture.fourOnFloor || 0) < 0.3) {
      roles.kick *= 0.35;
      roles.snare *= 0.5;
    }

    // Ambient family / texture: silence already pads; keep kick sparse
    if ((texture.ambient || 0) > 0.4) {
      roles.pads = Math.max(roles.pads, 0.32);
      if (silence) roles.kick *= 0.5;
    }

    // EDM: keep drop as short impulse (extra decay)
    let dropOut = drop;
    if ((texture.fourOnFloor || 0) > 0.4) {
      this._dropImpulse *= 0.72;
      dropOut = Math.max(this._dropImpulse, this._buildState.dropping * 0.25);
    }

    const vibe = this._computeVibe(roles, {
      flux, onset, onsetDensity, energy, rms, rmsSteady, silence, build, drop: dropOut, texture
    });

    const genreHint = this._genreHintFrom(texture, vibe);
    const { family: genreFamily, source: genreSource } = this._resolveGenreFamily(texture, vibe, genreHint);

    // Pleasure lean by genreFamily (GENRE-MAP-PLEASURE) — before spoken clamps
    dropOut = this._applyPleasureLean(roles, {
      family: genreFamily, texture, vibe, silence, drop: dropOut
    });

    // Spoken / non-groove LAST: never invent pocket that kills immersion
    if (vibe.spoken > 0.45 || vibe.speechLike > 0.5 || genreFamily === 'spoken') {
      const floor = 1 - Math.max(vibe.spoken, vibe.speechLike, genreFamily === 'spoken' ? 0.7 : 0) * 0.85;
      roles.kick *= Math.min(0.22, floor);
      roles.snare *= Math.min(0.18, floor);
      roles.harsh *= Math.min(0.2, floor * 0.8);
      dropOut *= Math.min(0.15, floor * 0.5);
      roles.pads = Math.max(roles.pads, 0.28);
      roles.lead = Math.max(roles.lead, 0.2);
      vibe.aggression *= 0.25;
      vibe.aggressive = vibe.aggression;
      vibe.chaotic *= 0.35;
      vibe.chaos = vibe.chaotic;
      vibe.warm *= 0.5;
      vibe.dominant = 'spoken';
      vibe.ladder = 'spoken';
    }

    // Genre-family aggression deepen (rock/noise up; ambient/spoken soft)
    this._finalizeAggression(vibe, roles, genreFamily, texture);

    this.frame = {
      rms, peak, centroid, flux,
      bass, mid, treble,
      energy, beat, onset, bpm: this.bpm,
      build, drop: dropOut, silence,
      // Analysis-only: do NOT hand freq bins to the renderer (no EQ bar layer)
      spectrum: this.debugSpectrum ? this.freqData : null,
      time: now,
      roles,
      instruments: roles,
      vibe,
      texture,
      genreHint,
      genreFamily,
      genreSource
    };
    return this.frame;
  }

  /**
   * Shape roles toward fan pleasure by genreFamily.
   * Mutates roles; returns adjusted drop. Spoken clamps applied by caller after.
   */
  _applyPleasureLean(roles, { family, texture, vibe, silence, drop }) {
    let dropOut = drop;
    const fam = family || 'unknown';
    const clamp01 = (v) => Math.max(0, Math.min(1, v));

    switch (fam) {
      case 'hiphop':
        // 808 / kick weight in the chest — boost kick+bass pocket, don't force four-on-floor
        roles.kick = clamp01(roles.kick * 1.25 + 0.06);
        roles.bass = clamp01(roles.bass * 1.2 + 0.05);
        roles.hats = clamp01(roles.hats * 0.9);
        roles.pads *= 0.85;
        if ((texture.fourOnFloor || 0) > 0.55 && (texture.pocketKick || 0) < 0.35) {
          // Boom-bap/swing: demote false EDM regularity feed
          roles.kick = clamp01(roles.kick * 0.92);
        }
        break;

      case 'electronic':
        if ((texture.ambient || 0) > 0.4 && (texture.fourOnFloor || 0) < 0.35) {
          // Ambient sibling — immersion, no forced drop
          roles.pads = clamp01(Math.max(roles.pads, 0.4) * 1.15);
          roles.kick *= 0.45;
          roles.snare *= 0.5;
          roles.harsh *= 0.4;
          dropOut *= 0.25;
          if (silence) roles.pads = clamp01(roles.pads + 0.12);
        } else {
          // EDM: four-on-floor hypnosis + one short drop
          roles.kick = clamp01(roles.kick * 1.15 + 0.04);
          roles.bass = clamp01(roles.bass * 1.1);
          this._dropImpulse *= 0.68;
          dropOut = Math.min(dropOut, Math.max(this._dropImpulse, 0));
          dropOut = Math.min(dropOut, 0.85); // never sticky high
        }
        break;

      case 'classical':
      case 'gospel':
        roles.pads = clamp01(Math.max(roles.pads, 0.35) * 1.2);
        roles.kick *= 0.55;
        roles.harsh *= 0.25;
        dropOut *= 0.35;
        if (silence) roles.pads = clamp01(roles.pads + 0.1);
        break;

      case 'spoken':
        roles.pads = clamp01(Math.max(roles.pads, 0.3));
        roles.kick *= 0.2;
        roles.snare *= 0.15;
        roles.harsh *= 0.15;
        dropOut *= 0.1;
        break;

      case 'rock':
      case 'noise':
        // Harsh budget OK — power / catharsis
        roles.harsh = clamp01(roles.harsh * 1.15);
        roles.kick = clamp01(roles.kick * 1.1);
        roles.pads *= 0.75;
        break;

      case 'latin':
      case 'afro':
        // Dembow / afro pocket — kick+hats groove, warm not metal
        roles.kick = clamp01(roles.kick * 1.18 + 0.04);
        roles.hats = clamp01(roles.hats * 1.15 + 0.03);
        roles.bass = clamp01(roles.bass * 1.08);
        roles.harsh *= 0.35;
        dropOut *= 0.7;
        break;

      case 'jazz':
      case 'rnb':
        roles.pads = clamp01(roles.pads * 1.1 + 0.04);
        roles.snare = clamp01(roles.snare * 1.05);
        roles.kick *= 0.85;
        roles.harsh *= 0.3;
        dropOut *= 0.4;
        break;

      case 'folk':
      case 'indie':
        roles.lead = clamp01(roles.lead * 1.08);
        roles.kick *= 0.7;
        roles.harsh *= 0.25;
        dropOut *= 0.45;
        break;

      case 'pop':
      case 'kpop':
        roles.hats = clamp01(roles.hats * 1.08);
        roles.lead = clamp01(roles.lead * 1.05);
        roles.harsh *= 0.3;
        break;

      default:
        break;
    }

    // Never invent a kick pocket that kills ambient immersion (even if mis-tagged)
    if ((texture.ambient || 0) > 0.5 && fam !== 'rock' && fam !== 'noise') {
      roles.kick = Math.min(roles.kick, 0.28);
      dropOut = Math.min(dropOut, 0.2);
    }
    return dropOut;
  }

  /**
   * Set explicit genre from ID3 / user fantasy / styles (GENRE-MAP).
   * Sticky — harsh spikes will not flip protected families (gospel/pop/…).
   */
  setGenreContext({ genre = '', fantasy = '', styles = [] } = {}) {
    const { family, source } = resolveExplicitGenre({ genre, fantasy, styles });
    this._explicitFamily = family;
    this._explicitSource = source;
    if (family) this._genreFamily = family;
    return { family, source };
  }

  _resolveGenreFamily(texture, vibe, genreHint) {
    // Explicit tag wins (and resists harsh→metal flip)
    if (this._explicitFamily) {
      if (HARSH_PROTECTED.has(this._explicitFamily) && genreHint === 'metal') {
        this._genreFamily = this._explicitFamily;
        return { family: this._explicitFamily, source: this._explicitSource };
      }
      this._genreFamily = this._explicitFamily;
      return { family: this._explicitFamily, source: this._explicitSource };
    }
    // Spoken vibe
    if ((vibe.spoken || 0) > 0.48) {
      this._genreFamily = 'spoken';
      return { family: 'spoken', source: 'audio' };
    }
    // Map genreHint → family
    const hintMap = {
      edm: 'electronic', metal: 'rock', hiphop: 'hiphop', classical: 'classical',
      jazz: 'jazz', ambient: 'electronic', folk: 'folk', spoken: 'spoken', unknown: 'unknown'
    };
    let fam = hintMap[genreHint] || leanGenreFromAudio(texture, vibe);
    // Noise lean: harsh without kick groove
    if ((texture.harshWall || 0) > 0.5 && (texture.fourOnFloor || 0) < 0.25 && (texture.pocketKick || 0) < 0.3) {
      fam = 'noise';
    }
    this._genreFamily = fam;
    return { family: fam, source: fam === 'unknown' ? 'none' : 'audio' };
  }

  /**
   * Vibe / speech-like axes (0..1) from roles + flux/onset density + vocalish vs groove.
   * Aligns with Music Researcher VIBE-TAXONOMY when present; heuristics here are the live contract.
   */
  _computeVibe(roles, ctx) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const vocalish = roles.vocalish ?? roles.lead ?? 0;
    const groove = (roles.kick || 0) * 0.55 + (roles.bass || 0) * 0.45;
    const fluxN = Math.min(1, (ctx.flux || 0) * 0.35);

    const tex = ctx.texture || {};
    // Peaceful / calm: soft pads, low harsh, low onset rate (+ ambient/classical swell)
    let peaceful = (roles.pads || 0) * 0.55
      + (1 - (roles.harsh || 0)) * 0.2
      + (1 - ctx.onsetDensity) * 0.25
      + (1 - Math.min(1, groove * 1.2)) * 0.1
      + (tex.ambient || 0) * 0.15
      + (tex.swell || 0) * 0.1
      - fluxN * 0.2
      - (roles.kick || 0) * 0.15;
    if (ctx.silence) peaceful = Math.max(peaceful, 0.55);
    peaceful = clamp(peaceful);

    // Chaotic / aggression: energy + harsh + onsetDensity + kick (WAVE vibe-match)
    const energyN = Math.min(1, ctx.energy || 0);
    const dens = ctx.onsetDensity || 0;
    const kickN = roles.kick || 0;
    let chaotic = (roles.harsh || 0) * 0.38
      + fluxN * 0.22
      + dens * 0.32
      + kickN * 0.18
      + energyN * 0.22
      + (roles.hats || 0) * 0.08
      + (tex.harshWall || 0) * 0.22
      - (roles.pads || 0) * 0.18
      - (tex.ambient || 0) * 0.25
      - (tex.swing || 0) * 0.12;
    chaotic = clamp(chaotic);

    // Explicit aggression ladder (0..1) for Director / Visual
    let aggression = (roles.harsh || 0) * 0.32
      + energyN * 0.28
      + dens * 0.24
      + kickN * 0.22
      + fluxN * 0.12
      + (tex.harshWall || 0) * 0.18
      + (ctx.drop || 0) * 0.1
      - (tex.ambient || 0) * 0.45
      - (roles.pads || 0) * 0.12;
    aggression = clamp(aggression);

    // Arousal: energy with kick/onset punch (separate from peace/chaos label)
    let arousal = energyN * 0.55 + dens * 0.2 + kickN * 0.15 + (roles.bass || 0) * 0.1
      + aggression * 0.15;
    arousal = clamp(arousal);

    // Scary: low energy + sparse harsh / tense (not full chaos party)
    let scary = (1 - Math.min(1, ctx.energy * 1.6)) * 0.4
      + (roles.harsh || 0) * 0.35 * (1 - ctx.onsetDensity * 0.5)
      + (ctx.build || 0) * 0.15
      + (1 - groove) * 0.1
      - peaceful * 0.25;
    scary = clamp(scary);

    // Tense: build / anticipation without peaceful bed
    let tense = (ctx.build || 0) * 0.55
      + (roles.snare || 0) * 0.15
      + (1 - peaceful) * 0.15
      + Math.min(0.3, groove * 0.2)
      - chaotic * 0.1;
    tense = clamp(tense);

    // Speech-like / nonGroove: high vocalish, weak kick/bass groove, steady RMS
    let speechLike = vocalish * 0.5
      + (1 - Math.min(1, groove * 1.8)) * 0.35
      + ctx.rmsSteady * 0.25
      - (roles.kick || 0) * 0.25
      - ctx.onsetDensity * 0.15
      - chaotic * 0.1;
    if (ctx.silence) speechLike *= 0.4;
    speechLike = clamp(speechLike);
    const nonGroove = clamp(speechLike * 0.85 + (1 - Math.min(1, groove * 1.5)) * 0.2);

    // Soft/spoken/ambient stay low aggression (never invent chaos pocket)
    if (speechLike > 0.4) {
      aggression *= 1 - speechLike * 0.75;
      chaotic *= 1 - speechLike * 0.55;
      arousal *= 1 - speechLike * 0.35;
    }
    if ((tex.ambient || 0) > 0.4) {
      aggression *= 1 - (tex.ambient || 0) * 0.7;
      chaotic *= 1 - (tex.ambient || 0) * 0.45;
    }
    if (ctx.silence) {
      aggression *= 0.35;
      chaotic *= 0.4;
      arousal *= 0.5;
    }
    // Mutual: high aggression lifts chaos so dominant routes to chaos packs
    if (aggression > 0.45) {
      chaotic = clamp(chaotic + (aggression - 0.45) * 0.55);
      peaceful = clamp(peaceful * (1 - (aggression - 0.45) * 0.8));
    }
    aggression = clamp(aggression);
    chaotic = clamp(chaotic);
    arousal = clamp(arousal);

    // Warm / groove (ladder rung 1): steady pocket, mid kick, low harsh — not aggression
    let warm = groove * 0.45
      + Math.min(kickN, 0.55) * 0.25
      + (1 - (roles.harsh || 0)) * 0.2
      + (1 - Math.abs((arousal || 0) - 0.45)) * 0.1
      - aggression * 0.55
      - chaotic * 0.35
      - peaceful * 0.25
      - speechLike * 0.3
      - (tex.ambient || 0) * 0.2;
    warm = clamp(warm);

    // Smooth for director/visual stability (aggression a bit snappier for rock hits)
    const s = this._vibeSmooth;
    const lerp = (key, target, a = 0.22) => {
      s[key] = (s[key] ?? target) * (1 - a) + target * a;
      return s[key];
    };
    const out = {
      peaceful: lerp('peaceful', peaceful),
      chaotic: lerp('chaotic', chaotic, 0.28),
      scary: lerp('scary', scary),
      tense: lerp('tense', tense),
      speechLike: lerp('speechLike', speechLike),
      nonGroove: lerp('nonGroove', nonGroove),
      aggression: lerp('aggression', aggression, 0.3),
      arousal: lerp('arousal', arousal, 0.25),
      warm: lerp('warm', warm, 0.22)
    };
    // VIBE-TAXONOMY-20260924-2125 aliases
    out.calm = out.peaceful;
    out.peace = out.peaceful;
    out.chaos = out.chaotic;
    out.spoken = out.speechLike;
    out.intimateSpeech = out.speechLike;
    out.aggressive = out.aggression;

    // Dominant for Director / Visual routing (congruence first)
    const ranked = [
      ['spoken', out.spoken],
      ['chaos', Math.max(out.chaos, out.aggression * 0.95)],
      ['scary', out.scary],
      ['peace', out.peace],
      ['tense', out.tense],
      ['warm', out.warm]
    ];
    // Spoken wins when clearly speech-like (never fake a chorus vibe)
    ranked.sort((a, b) => b[1] - a[1]);
    let dominant = ranked[0][0];
    if (out.spoken > 0.48 && out.spoken >= out.chaos - 0.05 && out.aggression < 0.55) {
      dominant = 'spoken';
    } else if (out.aggression > 0.58 && out.aggression >= out.peace) {
      dominant = 'chaos';
    } else if (out.scary > 0.5 && out.scary >= out.aggression && out.aggression < 0.5) {
      dominant = 'scary'; // sibling — not “more aggressive party”
    } else if (out.peace > 0.42 && out.chaos < 0.35 && out.scary < 0.4 && out.aggression < 0.4) {
      dominant = 'peace';
    } else if (out.warm > 0.4 && out.aggression < 0.42 && out.chaos < 0.4) {
      dominant = 'warm';
    }
    out.dominant = dominant;
    out.ladder = this._ladderFromVibe(out);
    return out;
  }

  /**
   * MUSIC-BRIEF vibe-match ladder:
   * peaceful → warm → tense → aggressive/chaos (+ scary sibling) | spoken
   */
  _ladderFromVibe(v) {
    if ((v.spoken || 0) > 0.48 && (v.aggression || 0) < 0.5) return 'spoken';
    if ((v.aggression || 0) > 0.55 || ((v.chaos || 0) > 0.55 && (v.aggression || 0) > 0.4)) {
      return 'aggressive';
    }
    if ((v.scary || 0) > 0.48 && (v.scary || 0) >= (v.aggression || 0) && (v.aggression || 0) < 0.5) {
      return 'scary';
    }
    if ((v.tense || 0) > 0.48 && (v.aggression || 0) < 0.5) return 'tense';
    if ((v.warm || 0) > 0.38 && (v.aggression || 0) < 0.42) return 'warm';
    if ((v.peace || v.peaceful || 0) > 0.4) return 'peaceful';
    // fallback by dominant
    const d = v.dominant;
    if (d === 'chaos') return 'aggressive';
    if (d === 'peace') return 'peaceful';
    return d || 'peaceful';
  }

  /**
   * Post genreFamily: deepen aggression envelopes (WAVE vibe-match).
   * Mutates vibe in place. Spoken / ambient stay soft.
   */
  _finalizeAggression(vibe, roles, family, texture) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const fam = family || 'unknown';
    const tex = texture || {};
    let agg = vibe.aggression || 0;
    let chaos = vibe.chaotic || vibe.chaos || 0;
    let arousal = vibe.arousal || 0;

    if (fam === 'rock' || fam === 'noise') {
      agg = clamp(agg * 1.25 + 0.08);
      chaos = clamp(chaos * 1.2 + 0.06);
      arousal = clamp(arousal * 1.1 + 0.04);
    } else if (fam === 'electronic' && (tex.fourOnFloor || 0) > 0.4) {
      // EDM energy ≠ metal aggression — modest lift on drop only
      agg = clamp(agg * 1.05 + (vibe.tense || 0) * 0.05);
      arousal = clamp(arousal * 1.12);
    } else if (fam === 'hiphop') {
      agg = clamp(agg * 1.08 + (roles.kick || 0) * 0.06);
      arousal = clamp(arousal * 1.08);
    } else if (fam === 'classical' || fam === 'gospel' || fam === 'spoken' || fam === 'jazz') {
      agg *= 0.45;
      chaos *= 0.55;
    } else if (fam === 'folk' || fam === 'rnb' || fam === 'indie') {
      agg *= 0.65;
    }

    if ((tex.ambient || 0) > 0.45 || (vibe.spoken || 0) > 0.48) {
      agg *= 0.35;
      chaos *= 0.4;
    }

    // Soft folk / ambient anti: never leave aggression high enough to invite warzone
    if (fam === 'folk' || (tex.sparseAcoustic || 0) > 0.45) {
      agg = Math.min(agg, 0.35);
      chaos = Math.min(chaos, 0.3);
    }

    vibe.aggression = clamp(agg);
    vibe.aggressive = vibe.aggression;
    vibe.chaotic = clamp(chaos);
    vibe.chaos = vibe.chaotic;
    vibe.arousal = clamp(arousal);

    // Re-pick dominant when aggression clearly owns the frame
    if ((vibe.spoken || 0) > 0.48 && vibe.aggression < 0.5) {
      vibe.dominant = 'spoken';
    } else if (vibe.aggression > 0.58) {
      vibe.dominant = 'chaos';
    } else if ((vibe.scary || 0) > 0.5 && vibe.aggression < 0.5) {
      vibe.dominant = 'scary';
    } else if ((vibe.warm || 0) > 0.4 && vibe.aggression < 0.42) {
      vibe.dominant = 'warm';
    }
    vibe.ladder = this._ladderFromVibe(vibe);
  }

  /**
   * Soft all-genre texture tags (0..1) — Scene/Worlds hints, not hard genre lock.
   * classical swell · jazz swing · metal harsh · ambient pads · hip-hop kick · folk sparse · EDM 4/4
   */
  _computeTexture(roles, ctx) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const kick = roles.kick || 0;
    const bass = roles.bass || 0;
    const snare = roles.snare || 0;
    const hats = roles.hats || 0;
    const pads = roles.pads || 0;
    const lead = roles.lead || 0;
    const harsh = roles.harsh || 0;
    const dens = ctx.onsetDensity || 0;
    const reg = ctx.beatRegularity || 0.5;
    const cv = ctx.beatIntervalCv || 0.4;
    const fluxN = Math.min(1, (ctx.flux || 0) * 0.35);
    const build = ctx.build || 0;
    const energy = ctx.energy || 0;

    // Classical swell: pads + build, low kick density, rising without four-on-floor
    let swell = pads * 0.45 + build * 0.4 + (1 - dens) * 0.15 + lead * 0.1
      - kick * 0.35 - harsh * 0.4 - reg * 0.1;
    // Jazz swing: irregular beats, snare/hats chatter, not harsh wall
    let swing = (1 - reg) * 0.45 + snare * 0.25 + hats * 0.2 + lead * 0.1
      - harsh * 0.35 - Math.max(0, dens - 0.55) * 0.2;
    // Metal: harsh wall + kick energy
    let harshWall = harsh * 0.5 + kick * 0.25 + energy * 0.2 + fluxN * 0.15 - pads * 0.25;
    // Ambient: pads bed, very low onset/kick
    let ambient = pads * 0.55 + (1 - dens) * 0.3 + (1 - kick) * 0.15
      - harsh * 0.4 - snare * 0.2 - energy * 0.1;
    if (ctx.silence) ambient = Math.max(ambient, 0.5);
    // Hip-hop pocket: kick+bass focus, spaced onsets, hats not wall
    let pocketKick = kick * 0.45 + bass * 0.3 + (dens > 0.15 && dens < 0.55 ? 0.25 : 0)
      - hats * 0.15 - pads * 0.1 - harsh * 0.2;
    // Folk / acoustic sparsity: low energy roles, mid lead, sparse rhythm
    let sparseAcoustic = (1 - energy) * 0.3 + lead * 0.25 + (1 - dens) * 0.25
      + (1 - harsh) * 0.1 - kick * 0.2 - bass * 0.15;
    // EDM four-on-floor: regular beats + steady kick + energy
    let fourOnFloor = reg * 0.45 + kick * 0.3 + energy * 0.2 + bass * 0.1
      - (1 - reg) * 0.25 - harsh * 0.1;

    const s = this._textureSmooth;
    const lerp = (key, target, a = 0.18) => {
      s[key] = s[key] * (1 - a) + clamp(target) * a;
      return s[key];
    };
    return {
      swell: lerp('swell', swell),
      swing: lerp('swing', swing),
      harshWall: lerp('harshWall', harshWall),
      ambient: lerp('ambient', ambient),
      pocketKick: lerp('pocketKick', pocketKick),
      sparseAcoustic: lerp('sparseAcoustic', sparseAcoustic),
      fourOnFloor: lerp('fourOnFloor', fourOnFloor)
    };
  }

  /** Soft genreHint string for Scene/Worlds — conservative, spoken wins. */
  _genreHintFrom(texture, vibe) {
    if ((vibe.spoken || 0) > 0.48) {
      this._genreHint = 'spoken';
      return this._genreHint;
    }
    // Explicit protected families: don't let harsh falsely pick metal
    if (this._explicitFamily && HARSH_PROTECTED.has(this._explicitFamily)) {
      const protectedHint = {
        gospel: 'ambient', pop: 'edm', kpop: 'edm', rnb: 'ambient',
        folk: 'folk', classical: 'classical', latin: 'edm', afro: 'edm'
      }[this._explicitFamily] || this._genreHint;
      // Soft lean still allowed within family, not metal
      let harsh = texture.harshWall || 0;
      if (harsh > 0.55) harsh *= 0.25; // demote harsh influence
      texture = { ...texture, harshWall: harsh };
      this._genreHint = protectedHint;
      // fall through with demoted harsh
    }
    const map = [
      ['edm', texture.fourOnFloor],
      ['metal', texture.harshWall],
      ['hiphop', texture.pocketKick],
      ['classical', texture.swell],
      ['jazz', texture.swing],
      ['ambient', texture.ambient],
      ['folk', texture.sparseAcoustic]
    ];
    map.sort((a, b) => b[1] - a[1]);
    const [name, score] = map[0];
    // Require clear winner — else keep previous / unknown
    if (score < 0.34) {
      this._genreHint = this._genreHint === 'spoken' ? 'unknown' : (this._genreHint || 'unknown');
      if (score < 0.22) this._genreHint = 'unknown';
      return this._genreHint;
    }
    // Stickiness: don't flicker genre every frame
    if (this._genreHint && this._genreHint !== 'unknown' && this._genreHint !== 'spoken') {
      const cur = map.find((m) => m[0] === this._genreHint);
      if (cur && cur[1] > score - 0.08) {
        return this._genreHint;
      }
    }
    this._genreHint = name;
    return name;
  }

  /**
   * Soft-clip simultaneous punch roles so the show spends one hit, not a bar graph.
   * Mutates roles in place (vocalish getter still tracks lead).
   */
  _softClipRoles(roles, texture = null) {
    const tex = texture || {};
    // Ambient/classical swell: allow denser pads; EDM/metal: keep medium punch budget
    const ambientBias = Math.max(tex.ambient || 0, tex.swell || 0);
    const metalEdm = Math.max(tex.harshWall || 0, tex.fourOnFloor || 0);
    const punch = roles.kick + roles.snare + roles.harsh + roles.hats * 0.55;
    const budget = 1.25 + ambientBias * 0.35 - metalEdm * 0.1; // ~1.15–1.6
    if (punch > budget) {
      const s = budget / punch;
      roles.kick *= s;
      roles.snare *= s;
      roles.harsh *= s;
      roles.hats *= 0.45 + 0.55 * s;
    }
    // Open stack: classical swell may run pads+lead high without fake punch
    const openCap = 2.1 + ambientBias * 0.5;
    const open = roles.lead + roles.pads + roles.bass * 0.5;
    if (open > openCap) {
      const s = openCap / open;
      roles.lead = Math.min(1, roles.lead * (0.55 + 0.45 * s));
      // Preserve pads more for ambient/swell
      const padKeep = 0.55 + 0.35 * ambientBias;
      roles.pads = Math.min(1, roles.pads * (padKeep + (1 - padKeep) * s));
      roles.bass = Math.min(1, roles.bass * (0.7 + 0.3 * s));
    }
    // Micro-variation: never hold exactly 1.0 (plateau reads frozen)
    for (const k of ['kick', 'bass', 'snare', 'hats', 'pads', 'lead', 'harsh']) {
      if (roles[k] > 0.97) roles[k] = 0.97 - (roles[k] - 0.97) * 0.5;
    }
    // Bleach guard (CEO FYI): brief harsh/chaos spikes OK; sustained peaks soft-cap
    // so Visual isn't forced into white-out that competes with cast/lyrics.
    this._harshSustain = this._harshSustain * 0.9 + (roles.harsh || 0) * 0.1;
    if (this._harshSustain > 0.52) {
      const over = Math.min(1, (this._harshSustain - 0.52) / 0.4);
      roles.harsh *= 1 - over * 0.38;
    }
  }

  /** Opt-in only — phone show must never draw this. */
  setDebugSpectrum(on) {
    this.debugSpectrum = !!on;
  }

  getFrame() {
    return this.frame;
  }
}
