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
    // Ladder hysteresis — Scene needs stable rung (CEO: barely coherent)
    this._ladderSticky = 'peaceful';
    this._ladderCandidate = null;
    this._ladderCandidateSince = 0;
    this._ladderChangedAt = 0;
    this._aggressionPinUntil = 0; // ms — pin aggressive ≥20s once earned (QA-0306)
    this._aggressionPeak = 0;
    this._aggressionHeldFloor = 0; // frozen floor while lock — never drops
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
        forbidPastoral: false,
        aggressionLock: false,
        martial: false,
        orchestralMartial: false,
        pinArmed: false,
        softClear: false,
        hardOnly: false,
        dominant: 'peace'
      },
      moment: {
        kick: 0, snare: 0, vocalish: 0, hats: 0, harsh: 0,
        drop: 0, build: 0, beat: false, onset: 0, onsetFast: 0, energy: 0,
        aggression: 0, aggressionLock: false, forbidPastoral: false,
        martial: false, orchestralMartial: false, pinArmed: false,
        softClear: false, hardOnly: false, ladder: 'peaceful'
      },
      pinArmed: false,
      hardOnly: false,
      martial: false,
      orchestralMartial: false,
      softClear: false,
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

    // Onset density: long (~2s) for peace/chaos bed; fast (~0.8s) for martial NOW
    if (onset > 0.4) this._onsetTimes.push(now);
    while (this._onsetTimes.length && now - this._onsetTimes[0] > 2000) {
      this._onsetTimes.shift();
    }
    const onsetDensity = Math.min(1, this._onsetTimes.length / 10);
    // Fast window — don't wait seconds to hear a drop/chorus hit
    let onsetFast = 0;
    {
      let n = 0;
      for (const t0 of this._onsetTimes) {
        if (now - t0 <= 800) n++;
      }
      onsetFast = Math.min(1, n / 5);
    }

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
      family: genreFamily, texture, vibe, silence, drop: dropOut, energy
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
      // ladder via hysteresis below — don't thrash to spoken every frame
    }

    // Genre-family aggression deepen (rock/noise up; ambient/spoken soft)
    this._finalizeAggression(vibe, roles, genreFamily, texture);

    // HOLD QA-20261001-0255: pin aggressive on harsh+energy storms (≥12–15s)
    // so Scene/Worlds cannot fall back to pastoral/warm mid-show.
    this._applyAggressionPin(vibe, roles, {
      energy, silence, genreFamily, texture, now, onsetDensity, onsetFast, flux,
      drop: dropOut, build
    });

    // Stable ladder for Scene (hysteresis / longer windows)
    const instantLadder = this._ladderFromVibe(vibe);
    vibe.ladder = this._smoothLadder(instantLadder, vibe, now);

    // Live NOW snapshot — Scene drives off this without vibe lag
    const hardOnly = !!(vibe.hardOnly || vibe.aggressionLock || vibe.forbidPastoral
      || vibe.martial || vibe.orchestralMartial);
    vibe.hardOnly = hardOnly;
    const moment = {
      kick: roles.kick || 0,
      snare: roles.snare || 0,
      vocalish: roles.vocalish || roles.lead || 0,
      hats: roles.hats || 0,
      harsh: roles.harsh || 0,
      drop: dropOut || 0,
      build: build || 0,
      beat: !!beat,
      onset: onset || 0,
      onsetFast,
      energy,
      aggression: vibe.aggression || 0,
      aggressionLock: !!vibe.aggressionLock,
      forbidPastoral: !!vibe.forbidPastoral,
      martial: !!vibe.martial,
      orchestralMartial: !!vibe.orchestralMartial,
      pinArmed: !!vibe.pinArmed,
      softClear: !!vibe.softClear,
      hardOnly,
      ladder: vibe.ladder,
      genreFamily
    };
    vibe.moment = moment;

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
      moment, // alias at frame root for Scene
      // QA-0321 proof — also at frame root so HUD cannot miss vibe→moment drop
      pinArmed: !!vibe.pinArmed,
      hardOnly,
      martial: !!vibe.martial,
      orchestralMartial: !!vibe.orchestralMartial,
      softClear: !!vibe.softClear,
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
  _applyPleasureLean(roles, { family, texture, vibe, silence, drop, energy = 0 }) {
    let dropOut = drop;
    const fam = family || 'unknown';
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const energyN = energy || 0;

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
        if ((texture.ambient || 0) > 0.35 && (texture.fourOnFloor || 0) < 0.4) {
          // Ambient / chillhop sibling (Night Owl) — immersion, crush false kick meter
          roles.pads = clamp01(Math.max(roles.pads, 0.4) * 1.15);
          roles.kick *= energyN < 0.36 ? 0.22 : 0.4;
          roles.kick = Math.min(roles.kick, energyN < 0.36 ? 0.16 : 0.26);
          roles.snare *= 0.5;
          roles.harsh *= 0.4;
          dropOut *= 0.25;
          if (silence) roles.pads = clamp01(roles.pads + 0.12);
        } else if (energyN < 0.34 && (texture.fourOnFloor || 0) < 0.45) {
          // Soft electronic without strong ambient tag yet — still don't invent martial kick
          roles.kick = Math.min(roles.kick * 0.55, 0.22);
          roles.pads = clamp01(Math.max(roles.pads, 0.28));
          dropOut *= 0.4;
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
      case 'soundtrack':
        // Orchestral / cinematic — pads bed, but keep timpani/brass punch when hot
        roles.pads = clamp01(Math.max(roles.pads, 0.35) * 1.2);
        roles.harsh *= 0.25;
        {
          const hotPunch = (roles.kick || 0) > 0.22 || (roles.bass || 0) > 0.32
            || (texture.swell || 0) > 0.3;
          if (hotPunch) {
            roles.kick = clamp01(roles.kick * 1.05);
            dropOut = clamp01(Math.max(dropOut, roles.kick * 0.55));
          } else {
            roles.kick *= 0.55;
            dropOut *= 0.35;
          }
        }
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

    // Cap ambient kick when NOT cinematicBed (HOLD QA-0338 Night Owl).
    // Clash keeps punch: soundtrack/classical/gospel/jazz OR hot swell/ambient+energy.
    const cinematicBed = fam === 'classical' || fam === 'gospel' || fam === 'jazz'
      || fam === 'soundtrack'
      || ((texture.swell || 0) > 0.32 && energyN > 0.4)
      || ((texture.ambient || 0) > 0.38 && energyN > 0.42 && (roles.harsh || 0) < 0.28);
    if (!cinematicBed && fam !== 'rock' && fam !== 'noise') {
      // HOLD-0338: crush false kick on ambient/soft energy (Night Owl kickRaw→1)
      if ((texture.ambient || 0) > 0.35 || energyN < 0.42 || (roles.harsh || 0) < 0.18) {
        const cap = energyN < 0.42 ? 0.18 : 0.26;
        roles.kick = Math.min(roles.kick, cap);
        dropOut = Math.min(dropOut, energyN < 0.42 ? 0.15 : 0.22);
      }
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

    // CEO realtime: fast escalate into aggression / slow release once hot
    const s = this._vibeSmooth;
    const lerpAR = (key, target, attack, release) => {
      const cur = s[key] ?? target;
      const a = target > cur ? attack : release;
      s[key] = cur * (1 - a) + target * a;
      return s[key];
    };
    const out = {
      peaceful: lerpAR('peaceful', peaceful, 0.1, 0.18),
      chaotic: lerpAR('chaotic', chaotic, 0.55, 0.1),      // fast up
      scary: lerpAR('scary', scary, 0.2, 0.1),
      tense: lerpAR('tense', tense, 0.4, 0.12),             // catch pre-chorus NOW
      speechLike: lerpAR('speechLike', speechLike, 0.15, 0.12),
      nonGroove: lerpAR('nonGroove', nonGroove, 0.15, 0.12),
      aggression: lerpAR('aggression', aggression, 0.65, 0.08), // snap martial
      arousal: lerpAR('arousal', arousal, 0.45, 0.1),
      warm: lerpAR('warm', warm, 0.12, 0.2)                 // slow into warm — no false warm spike
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
    // ladder set once via _smoothLadder at end of update (hysteresis)
    out.ladder = this._ladderSticky || 'peaceful';
    return out;
  }

  /**
   * Instant ladder guess from vibe (no stickiness).
   * MUSIC-BRIEF: peaceful → warm → tense → aggressive (+ scary) | spoken
   */
  _ladderFromVibe(v) {
    const scores = this._ladderScores(v);
    let best = 'peaceful';
    let bestScore = -1;
    for (const [k, s] of Object.entries(scores)) {
      if (s > bestScore) { bestScore = s; best = k; }
    }
    return best;
  }

  _ladderScores(v) {
    const spoken = v.spoken || v.speechLike || 0;
    const agg = v.aggression || 0;
    const chaos = v.chaos || v.chaotic || 0;
    const scary = v.scary || 0;
    const tense = v.tense || 0;
    const warm = v.warm || 0;
    const peace = v.peace || v.peaceful || 0;
    return {
      spoken: spoken > 0.42 && agg < 0.52 ? spoken : spoken * 0.35,
      aggressive: Math.max(agg, chaos * 0.9) * (agg > 0.35 ? 1 : 0.55),
      scary: scary >= agg && agg < 0.52 ? scary : scary * 0.4,
      tense: tense > 0.4 && agg < 0.52 ? tense : tense * 0.45,
      warm: warm > 0.32 && agg < 0.45 ? warm : warm * 0.4,
      peaceful: peace * (1 - Math.max(agg, chaos) * 0.7)
    };
  }

  /**
   * Hysteresis / dwell so Scene gets a stable rung (CEO: barely coherent).
   * Hold current rung ≥1.8s min; switch only if candidate wins for ≥1.2s
   * with score margin, or a clear storm (aggressive) with stronger margin.
   */
  /**
   * Pin aggressive ladder when martial/harsh+energy storm earned.
   * HOLD QA-0306: ≥20s pin; while lock/forbidPastoral aggression NEVER drops;
   * warm forced to 0 — no soft afterglow Scene can read as pale/copper pastoral.
   */
  _applyAggressionPin(vibe, roles, ctx) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const now = ctx.now || performance.now();
    const harsh = roles.harsh || 0;
    const kick = roles.kick || 0;
    const energy = ctx.energy || 0;
    const dens = ctx.onsetDensity || 0;
    const densFast = ctx.onsetFast != null ? ctx.onsetFast : dens;
    const fluxN = Math.min(1, (ctx.flux || 0) * 0.35);
    const dropN = ctx.drop || 0;
    const buildN = ctx.build || 0;
    const silence = !!ctx.silence;
    const fam = ctx.genreFamily || 'unknown';
    const tex = ctx.texture || {};
    const spoken = (vibe.spoken || vibe.speechLike || 0) > 0.5 || fam === 'spoken';
    const bassN = roles.bass || 0;
    const swellN = tex.swell || 0;

    // HOLD-0346: softClear MUST ignore sticky aggression (≥0.78 under pin) and densFast/kick.
    // Chicken-egg was: lock → aggression floor → lowAgg false → softClear never → pin never clears.
    const calmGenre = fam === 'electronic' || fam === 'spoken' || fam === 'folk' || fam === 'indie'
      || fam === 'ambient' || fam === 'pop' || fam === 'rnb' || fam === 'unknown';
    const softEnergy = energy < 0.42; // Night Owl HUD ~0.327–0.372
    const softHarsh = harsh < 0.25;
    const orchestralFam = fam === 'classical' || fam === 'gospel' || fam === 'jazz'
      || fam === 'soundtrack';

    const pinActive = now < (this._aggressionPinUntil || 0);

    // Orchestral-martial (Clash Defiant) — computed BEFORE softClear (no soft gate)
    const cinematicBed = orchestralFam
      || (swellN > 0.32 && energy > 0.4)
      || ((tex.ambient || 0) > 0.38 && energy > 0.42 && harsh < 0.28);
    const orchestralMartial = !silence && cinematicBed && energy > 0.36 && (
      kick > 0.2 || densFast > 0.22 || dens > 0.25 || fluxN > 0.22 || bassN > 0.28
      || dropN > 0.35 || buildN > 0.55
    );

    // Martial heat — harsh path OR orchestral-martial (Clash stays armed)
    const martial = !silence && (
      orchestralMartial
      || (harsh > 0.18 && densFast > 0.28 && energy > 0.25)
      || (harsh > 0.2 && dens > 0.28 && energy > 0.28)
      || (harsh > 0.22 && densFast > 0.22)
      || (harsh > 0.18 && fluxN > 0.28 && energy > 0.26)
      || (dropN > 0.4 && (harsh > 0.15 || kick > 0.25 || energy > 0.4))
      || (buildN > 0.6 && densFast > 0.28 && energy > 0.35)
      || (energy > 0.48 && densFast > 0.32 && kick > 0.28)
    );

    // softClear: !martial && !orchMart && soft energy/harsh + calmGenre
    // IGNORE sticky vibe.aggression, densFast, kick (QA-0346)
    const softClear = !silence
      && !martial
      && !orchestralMartial
      && softEnergy
      && softHarsh
      && (calmGenre || spoken || fam === 'jazz')
      && fam !== 'rock'
      && fam !== 'noise'
      && fam !== 'soundtrack'; // Clash ID3 never soft-clears via genre alone

    const nightOwlSoft = softClear; // alias for storm gate / proof continuity

    // Storm: never re-arm from sticky aggression under softClear conditions
    const storm = !softClear && !silence && (
      martial
      || orchestralMartial
      || (harsh > 0.2 && energy > 0.3)
      || (harsh > 0.16 && kick > 0.28 && energy > 0.36)
      || ((tex.harshWall || 0) > 0.28 && energy > 0.3)
      || ((fam === 'rock' || fam === 'noise') && energy > 0.3)
      || (dropN > 0.5 && energy > 0.35)
      || (energy > 0.5 && densFast > 0.35 && harsh > 0.12)
      // sticky aggression only extends pin when NOT a calm soft bed
      || ((vibe.aggression || 0) > 0.55 && energy > 0.42)
    );

    const PIN_MS = 20000; // QA-0306: ≥20s martial pin
    if (storm) {
      const wasLocked = pinActive;
      this._aggressionPinUntil = Math.max(this._aggressionPinUntil, now + PIN_MS);
      const peakNow = Math.max(
        vibe.aggression || 0,
        harsh,
        densFast * 0.75 + harsh * 0.55,
        dens * 0.65 + harsh * 0.5
      );
      this._aggressionPeak = Math.max(this._aggressionPeak, peakNow);
      this._aggressionHeldFloor = Math.max(
        this._aggressionHeldFloor,
        0.78,
        peakNow * 0.95,
        vibe.aggression || 0
      );
      if (!wasLocked || this._ladderSticky !== 'aggressive') {
        this._ladderSticky = 'aggressive';
        this._ladderChangedAt = now;
        this._ladderCandidate = null;
      }
    }

    // softClear already decided above (HOLD-0346) — clear pin when calm soft bed
    const locked = (now < this._aggressionPinUntil) && !softClear;
    vibe.aggressionLock = locked;
    vibe.forbidPastoral = locked || martial || orchestralMartial;
    // QA proof fields — Scene/DIAG can see pin actually armed
    vibe.martial = !!martial;
    vibe.orchestralMartial = !!orchestralMartial;
    vibe.softClear = !!softClear;
    vibe.pinArmed = !!locked;

    if (locked) {
      const floor = Math.max(0.78, this._aggressionHeldFloor, this._aggressionPeak * 0.95);
      vibe.aggression = clamp(Math.max(vibe.aggression || 0, floor));
      this._aggressionHeldFloor = Math.max(this._aggressionHeldFloor, vibe.aggression);
      vibe.aggressive = vibe.aggression;
      vibe.chaos = clamp(Math.max(vibe.chaos || vibe.chaotic || 0, 0.68));
      vibe.chaotic = vibe.chaos;
      vibe.warm = 0;
      vibe.peaceful = Math.min(vibe.peaceful || 0, 0.08);
      vibe.peace = vibe.peaceful;
      vibe.calm = vibe.peaceful;
      vibe.dominant = 'chaos';
      vibe.ladder = 'aggressive';
      this._ladderSticky = 'aggressive';
    } else if (martial) {
      vibe.aggression = clamp(Math.max(vibe.aggression || 0, 0.72));
      vibe.aggressive = vibe.aggression;
      vibe.chaos = clamp(Math.max(vibe.chaos || 0, 0.6));
      vibe.chaotic = vibe.chaos;
      vibe.warm = 0;
      vibe.peaceful = Math.min(vibe.peaceful || 0, 0.1);
      vibe.peace = vibe.peaceful;
      vibe.calm = vibe.peaceful;
      vibe.dominant = 'chaos';
      this._ladderSticky = 'aggressive';
      vibe.forbidPastoral = true;
    } else if (softClear) {
      // HOLD-0346: clear pin + drop sticky aggression floor (break chicken-egg)
      this._aggressionPinUntil = 0;
      this._aggressionPeak = Math.min(this._aggressionPeak, 0.15);
      this._aggressionHeldFloor = 0;
      vibe.aggressionLock = false;
      vibe.forbidPastoral = false;
      vibe.hardOnly = false;
      vibe.aggression = Math.min(vibe.aggression || 0, 0.28);
      vibe.aggressive = vibe.aggression;
      vibe.chaos = Math.min(vibe.chaos || vibe.chaotic || 0, 0.25);
      vibe.chaotic = vibe.chaos;
      this._ladderSticky = (vibe.ladder === 'warm' || vibe.ladder === 'spoken') ? vibe.ladder : 'peaceful';
    } else if (now >= this._aggressionPinUntil) {
      this._aggressionHeldFloor = 0;
      vibe.aggressionLock = false;
      vibe.forbidPastoral = false;
    }

    // Re-sync proof after branch clears (no vibe→moment field drop)
    vibe.pinArmed = !!vibe.aggressionLock;
    vibe.martial = !!martial;
    vibe.orchestralMartial = !!orchestralMartial;
    vibe.softClear = !!softClear;
    vibe.hardOnly = !!(vibe.aggressionLock || vibe.forbidPastoral || martial || orchestralMartial);
    this._publishPinProof(vibe, ctx);
  }

  /** HUD / console proof for ?debug=1 (QA-0321) — never drop pin flags. */
  _publishPinProof(vibe, ctx) {
    const proof = {
      pinArmed: !!vibe.pinArmed,
      hardOnly: !!vibe.hardOnly,
      martial: !!vibe.martial,
      orchestralMartial: !!vibe.orchestralMartial,
      softClear: !!vibe.softClear,
      aggressionLock: !!vibe.aggressionLock,
      forbidPastoral: !!vibe.forbidPastoral,
      ladder: vibe.ladder || null,
      genreFamily: ctx?.genreFamily || this._genreFamily || null,
      energy: ctx?.energy ?? null,
      t: ctx?.now ?? null
    };
    this._pinProof = proof;
    try {
      if (typeof globalThis !== 'undefined') {
        globalThis.__LS_AUDIO_PIN__ = proof;
      }
    } catch (_) { /* ignore */ }
  }

  getPinProof() {
    return this._pinProof || null;
  }

  /** HOLD-0338: zero aggression pin / soft state on song/track change (Generate). */
  resetHardState() {
    this._aggressionPinUntil = 0;
    this._aggressionPeak = 0;
    this._aggressionHeldFloor = 0;
    this._ladderSticky = 'peaceful';
    this._ladderCandidate = null;
    this._ladderCandidateSince = 0;
    this._ladderChangedAt = 0;
    this._hotSince = 0;
    this._pinProof = null;
    try {
      if (typeof globalThis !== 'undefined') globalThis.__LS_AUDIO_PIN__ = null;
    } catch (_) { /* ignore */ }
  }

  _smoothLadder(instant, vibe, now) {
    // While lock/forbidPastoral: ladder stays aggressive; never warm/peaceful
    if (vibe.aggressionLock || vibe.forbidPastoral || now < this._aggressionPinUntil) {
      this._ladderSticky = 'aggressive';
      this._ladderCandidate = null;
      return 'aggressive';
    }

    const sticky = this._ladderSticky || 'peaceful';
    const scores = this._ladderScores(vibe);
    const stickyScore = scores[sticky] ?? 0;
    const instScore = scores[instant] ?? 0;

    // Same as sticky — reset candidate
    if (instant === sticky) {
      this._ladderCandidate = null;
      this._ladderCandidateSince = 0;
      return sticky;
    }

    // Min dwell — aggressive holds much longer (QA: pin ≥12–15s)
    const sinceChange = now - (this._ladderChangedAt || 0);
    const minDwell = sticky === 'aggressive' ? 20000 : 2200;
    if (sinceChange < minDwell && this._ladderChangedAt > 0) {
      // Allow escalate into aggressive early; block de-escalate / pastoral hop
      const escalate = this._ladderRank(instant) > this._ladderRank(sticky);
      if (!(escalate && instant === 'aggressive')) {
        return sticky;
      }
    }

    // Block warm/peaceful while sticky aggressive even after pin if peak still hot
    if (sticky === 'aggressive' && (instant === 'warm' || instant === 'peaceful')) {
      if ((vibe.aggression || 0) > 0.35 || this._aggressionPeak > 0.4) {
        this._ladderCandidate = null;
        return sticky;
      }
    }

    // Need margin over sticky (asymmetric: easier to escalate to aggressive, harder to drop)
    const escalate = this._ladderRank(instant) > this._ladderRank(sticky);
    const marginNeed = escalate
      ? (instant === 'aggressive' ? 0.06 : 0.12)
      : (sticky === 'aggressive' ? 0.28 : 0.18);
    if (instScore < stickyScore + marginNeed && stickyScore > 0.2) {
      this._ladderCandidate = null;
      return sticky;
    }

    // Escalate into aggressive NOW — no candidate wait
    if (escalate && instant === 'aggressive') {
      this._ladderSticky = 'aggressive';
      this._ladderChangedAt = now;
      this._ladderCandidate = null;
      this._ladderCandidateSince = 0;
      return 'aggressive';
    }

    // Candidate dwell — leaving aggressive takes longer
    if (this._ladderCandidate !== instant) {
      this._ladderCandidate = instant;
      this._ladderCandidateSince = now;
      return sticky;
    }
    const holdMs = sticky === 'aggressive' ? 3500 : 1400;
    if (now - this._ladderCandidateSince < holdMs) {
      return sticky;
    }

    // Commit
    this._ladderSticky = instant;
    this._ladderChangedAt = now;
    this._ladderCandidate = null;
    this._ladderCandidateSince = 0;
    return instant;
  }

  _ladderRank(name) {
    const order = { spoken: 0, peaceful: 1, warm: 2, tense: 3, scary: 3, aggressive: 4 };
    return order[name] ?? 1;
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
      agg = clamp(agg * 1.35 + 0.12);
      chaos = clamp(chaos * 1.28 + 0.1);
      arousal = clamp(arousal * 1.15 + 0.06);
    } else if (fam === 'electronic' && (tex.fourOnFloor || 0) > 0.4) {
      // EDM energy ≠ metal aggression — modest lift on drop only
      agg = clamp(agg * 1.05 + (vibe.tense || 0) * 0.05);
      arousal = clamp(arousal * 1.12);
    } else if (fam === 'hiphop') {
      agg = clamp(agg * 1.08 + (roles.kick || 0) * 0.06);
      arousal = clamp(arousal * 1.08);
    } else if (fam === 'spoken') {
      agg *= 0.45;
      chaos *= 0.55;
    } else if (fam === 'classical' || fam === 'gospel' || fam === 'jazz' || fam === 'soundtrack') {
      // Soft adagio vs orchestral-martial (Clash Defiant / Soundtrack) — keep teeth when hot
      const hot = (roles.kick || 0) > 0.22 || (roles.harsh || 0) > 0.18
        || (roles.bass || 0) > 0.32
        || ((tex.swell || 0) > 0.3 && (roles.kick || 0) > 0.16)
        || ((tex.ambient || 0) > 0.38 && (roles.kick || 0) > 0.22);
      if (hot) {
        agg = clamp(agg * 1.25 + 0.12);
        chaos = clamp(chaos * 1.18 + 0.1);
        arousal = clamp(arousal * 1.12 + 0.06);
      } else {
        agg *= 0.5;
        chaos *= 0.55;
      }
    } else if (fam === 'folk' || fam === 'rnb' || fam === 'indie') {
      agg *= 0.65;
    }

    // Ambient crush only when truly soft (low kick/harsh) — not orchestral pads+punch
    if (((tex.ambient || 0) > 0.45 || (vibe.spoken || 0) > 0.48)
      && (roles.kick || 0) < 0.28 && (roles.harsh || 0) < 0.22) {
      agg *= 0.35;
      chaos *= 0.4;
    }

    // Soft folk / quiet sparse only
    if ((fam === 'folk' || (tex.sparseAcoustic || 0) > 0.45)
      && (roles.kick || 0) < 0.28 && (roles.harsh || 0) < 0.2) {
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
    // ladder applied by _smoothLadder in update()
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
        folk: 'folk', classical: 'classical', soundtrack: 'classical', latin: 'edm', afro: 'edm'
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
