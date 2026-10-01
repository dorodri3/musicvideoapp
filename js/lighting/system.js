import { getMotionComfort } from '../a11y/motionPrefs.js';
/**
 * Lighting: washes, shafts, bloom, white-out, silhouette, pulse.
 * Soft-clipped LED bloom + A11y getMotionComfort (HOLD-2142 comfort).
 * Coherence-hard: forbidPastoral / aggressionLock / ladder=aggressive → storm contrast,
 * NEVER soft green pastoral bloom. Soft-clip whiteOut path UNCHANGED.
 */
export class LightingSystem {
  constructor() {
    this.whiteOut = 0;
    this.blackout = 0;
    this.bloom = 0.35;
    this.pulse = 0;
    this.modes = ['wash'];
    this._ledPhase = 0;
    // Duty: whiteOut>0.3 ≤~15% of any rolling 1s
    this._hiWhiteMs = 0;
    this._dutyWindowMs = 0;
    this._lastUpdateTs = 0;
    this._hardLock = false;
  }

  setModes(modes) {
    this.modes = modes || ['wash'];
  }

  trigger(event) {
    const c = getMotionComfort();
    const peakCap = c.muteWhiteOut ? 0 : (c.whiteOutPeakCap != null ? c.whiteOutPeakCap : 1);
    const bump = (v) => {
      if (peakCap <= 0) return;
      // Duty gate: if already >15% of last 1s above 0.3, soft further peaks
      const duty = this._dutyWindowMs > 0 ? this._hiWhiteMs / this._dutyWindowMs : 0;
      const maxV = duty > 0.15 ? Math.min(peakCap, 0.28) : peakCap;
      this.whiteOut = Math.max(this.whiteOut, Math.min(maxV, v));
    };
    if (event === 'white_flash') bump(1);
    if (event === 'white_out') bump(1);
    if (event === 'blackout') this.blackout = 1;
    if (event === 'sky_tear') bump(0.75);
    if (event === 'kick_punch') {
      this.pulse = Math.max(this.pulse, c.muteKickStrobe ? 0.35 : 1);
      bump(0.55);
    }
    if (event === 'snare_flash') {
      bump(0.45);
      this.pulse = Math.max(this.pulse, c.muteKickStrobe ? 0.3 : 0.75);
    }
    if (event === 'harsh_glitch') {
      this.pulse = Math.max(this.pulse, 0.55);
      this.blackout = Math.max(this.blackout, 0.28);
    }
    if (event === 'collapse') {
      this.pulse = 1;
      this.blackout = Math.max(this.blackout, 0.85);
    }
  }

  update(audio, emotion, intensity = 0.5, vibeMatch = null) {
    const c = getMotionComfort();
    // Decay *0.82 → ~300ms visible (>0.02); duty track whiteOut>0.3 ≤~15%/1s
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const dt = this._lastUpdateTs ? Math.min(50, now - this._lastUpdateTs) : 16;
    this._lastUpdateTs = now;
    this._dutyWindowMs = Math.min(1000, this._dutyWindowMs + dt);
    if (this.whiteOut > 0.3) this._hiWhiteMs = Math.min(1000, this._hiWhiteMs + dt);
    // leak window
    if (this._dutyWindowMs >= 1000) {
      this._hiWhiteMs = Math.max(0, this._hiWhiteMs - dt);
      this._dutyWindowMs = 1000;
    }

    // Soft-clip whiteOut path UNCHANGED (peakCap + duty gate + muteWhiteOut)
    this.whiteOut *= 0.82;
    if (c.muteWhiteOut) this.whiteOut = 0;
    else if (c.whiteOutPeakCap != null) this.whiteOut = Math.min(this.whiteOut, c.whiteOutPeakCap);

    this.blackout *= 0.9;
    this.pulse *= 0.9;
    this._ledPhase = (this._ledPhase + 0.016) % 1000;

    // Live vibe + Worlds/Audio hard locks (directive OR audio.vibe OR moment.*)
    const vibe = audio?.vibe || {};
    const vm = vibeMatch || {};
    const moment = audio?.moment || vibe?.moment || {};
    let agg = Number(vm.aggression ?? vibe.aggression ?? vibe.aggressive ?? moment.aggression ?? 0);
    const ladder = (vm.ladder || moment.ladder || vibe.ladder || '').toString().toLowerCase();
    const hard = !!(
      vm.hardLock || vm.hardHoldActive || vm.forbidPastoral || vm.aggressionLock ||
      vm.hardOnly || vibe.forbidPastoral || vibe.aggressionLock || vibe.hardOnly ||
      moment.forbidPastoral || moment.aggressionLock || moment.hardOnly ||
      ladder === 'aggressive' || ladder === 'chaos' ||
      agg >= 0.55 || (vm.stickyAgg || 0) >= 0.55 || Number(vibe.chaos || 0) > 0.55
    );
    let mode = (vm.mode || vibe.dominant || '').toString().toLowerCase();
    if (hard) {
      mode = 'chaos';
      agg = Math.max(agg, 0.72);
    }
    this._hardLock = hard;

    // LIVE fast-attack: kick/snare/vocalish punch NOW (not delayed mood wash)
    const roles = audio?.roles || audio?.instruments || {};
    const kick = Number(roles.kick || 0);
    const snare = Number(roles.snare || 0);
    const vocalish = Math.max(Number(roles.vocalish || 0), Number(roles.lead || 0));
    if (kick > 0.45) {
      this.pulse = Math.max(this.pulse, Math.min(1, kick * (hard ? 1.15 : 0.85)));
    }
    if (snare > 0.5) {
      this.pulse = Math.max(this.pulse, Math.min(1, snare * (hard ? 1.05 : 0.75)));
    }

    // Bloom: comfort ceiling 0.55. HARD → NEVER silk/pastoral/peace bloom; storm-tight contrast.
    // Soft-clip whiteOut path UNCHANGED (decay/peakCap/duty/mute below).
    let rawBloom = 0.26 + intensity * 0.38 + (emotion?.hope || 0) * 0.18 + (audio?.treble || 0) * 0.14;
    if (hard || mode === 'chaos' || agg >= 0.55) {
      // Refuse peace bloom under hardLock — clamp storm-tight, ignore hope silk
      rawBloom = Math.min(rawBloom * 0.45, 0.24 + (1 - agg) * 0.05);
    } else if (mode === 'peace' || mode === 'spoken') {
      rawBloom = Math.max(rawBloom, 0.4 + Math.max(vm.peace || 0, vm.spoken || 0, 0.3) * 0.12);
    } else if (mode === 'scary') {
      rawBloom *= 0.72;
    } else if (mode === 'tense') {
      rawBloom = rawBloom * 0.9 + 0.04;
    }
    // Vocalish live: slight bloom lift on lead (still soft-clipped) — NEVER under hardLock
    if (vocalish > 0.4 && !hard) {
      rawBloom = Math.min(0.55, rawBloom + vocalish * 0.06);
    }
    const bloomCap = c.bloomCap != null ? c.bloomCap : 0.55;
    this.bloom = Math.min(bloomCap, rawBloom);

    // Pulse / flash duty by mood (whiteOut still soft-clipped via trigger + peakCap)
    let beatPulse = c.muteKickStrobe ? 0.35 : 0.65;
    let dropMul = c.muteKickStrobe ? 0.35 : 0.7;
    if (hard || mode === 'chaos' || agg >= 0.55) {
      beatPulse *= 1 + agg * 0.4;
      dropMul *= 1 + agg * 0.3;
    } else if (mode === 'spoken' || mode === 'peace') {
      beatPulse *= 0.35;
      dropMul *= 0.3;
    } else if (mode === 'scary') {
      beatPulse *= 0.4;
      dropMul *= 0.35;
    } else if (mode === 'tense') {
      beatPulse *= 0.85;
      dropMul *= 0.8;
    }
    if (audio?.beat) this.pulse = Math.max(this.pulse, beatPulse);
    if (audio?.drop > 0.5) this.pulse = Math.max(this.pulse, audio.drop * dropMul);

    // Chaos: brief blackout flicker on harsh wall (contrast, not white bleach)
    const harshWall = Number(audio?.texture?.harshWall || 0);
    if ((hard || mode === 'chaos' || agg >= 0.6) && harshWall > 0.55 && (roles.harsh || 0) > 0.5) {
      this.blackout = Math.max(this.blackout, Math.min(0.22, (agg - 0.5) * 0.35));
    }

    return {
      whiteOut: this.whiteOut,
      blackout: this.blackout,
      bloom: this.bloom,
      pulse: this.pulse,
      modes: this.modes,
      ledPhase: this._ledPhase,
      vibeMode: mode || null,
      aggression: agg,
      hardLock: hard
    };
  }

  /**
   * Apply lighting overlays AFTER scene draw.
   */
  apply(ctx, w, h, light, palette = [], quality = 1) {
    const hardApply = !!(light.hardLock || light.vibeMode === 'chaos' || (light.aggression || 0) >= 0.55);

    // Blackout
    if (light.blackout > 0.02) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, light.blackout)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Pulse vignette / flash ring — stronger concert punch (live kick/snare)
    if (light.pulse > 0.05) {
      const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.75);
      const core = hardApply ? Math.min(0.22, light.pulse * 0.22) : Math.min(0.18, light.pulse * 0.18);
      g.addColorStop(0, `rgba(255,255,255,${core})`);
      g.addColorStop(0.55, hardApply
        ? `rgba(160,200,230,${Math.min(0.1, light.pulse * 0.1)})`
        : `rgba(255,240,220,${Math.min(0.08, light.pulse * 0.08)})`);
      g.addColorStop(1, `rgba(0,0,0,${Math.min(0.36, light.pulse * (hardApply ? 0.38 : 0.32))})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Bloom / wash — soft-clipped. HARD → storm contrast, NEVER green pastoral silk.
    const wantBloom =
      light.bloom > 0.1 ||
      light.modes.includes('bloom') ||
      light.modes.includes('wash');
    if (wantBloom && hardApply) {
      const b = Math.min(0.35, light.bloom);
      const g1 = ctx.createRadialGradient(w / 2, h * 0.4, 8, w / 2, h * 0.4, w * 0.55);
      // HOLD-0330: cold steel / ash-red — NEVER warm pastoral peach bloom
      g1.addColorStop(0, `rgba(180,210,240,${Math.min(0.06, b * 0.1)})`);
      g1.addColorStop(0.45, `rgba(100,20,28,${Math.min(0.1, b * 0.16)})`);
      g1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      if ((light.pulse || 0) > 0.2) {
        const pr = ctx.createRadialGradient(w / 2, h / 2, w * 0.05, w / 2, h / 2, w * 0.7);
        pr.addColorStop(0, `rgba(255,255,255,${Math.min(0.1, light.pulse * 0.12)})`);
        pr.addColorStop(0.6, 'rgba(0,0,0,0)');
        pr.addColorStop(1, `rgba(0,0,0,${Math.min(0.28, light.pulse * 0.28)})`);
        ctx.fillStyle = pr;
        ctx.fillRect(0, 0, w, h);
      }
    } else if (wantBloom) {
      const col = palette[2] || '#ffffff';
      const b = Math.min(0.55, light.bloom);
      const g1 = ctx.createRadialGradient(w / 2, h * 0.38, 10, w / 2, h * 0.38, w * 0.55);
      g1.addColorStop(0, this._alpha(col, Math.min(0.10, b * 0.14)));
      g1.addColorStop(0.5, this._alpha(col, Math.min(0.06, b * 0.07)));
      g1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(w / 2, h * 0.55, 20, w / 2, h * 0.55, w * 0.7);
      g2.addColorStop(0, `rgba(255,255,255,${Math.min(0.05, b * 0.05)})`);
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
    }

    // Shafts — fewer, softer (not EQ wedges); hard → ash/red shafts
    if (
      light.modes.includes('shafts') ||
      light.modes.includes('slow_wash') ||
      (light.modes.includes('bloom') && light.bloom > 0.35)
    ) {
      const shaftA = Math.min(0.07, 0.03 + light.bloom * 0.05 + light.pulse * 0.025);
      ctx.fillStyle = hardApply
        ? `rgba(160,190,220,${shaftA + 0.02})`
        : `rgba(255,245,220,${shaftA})`;
      for (let i = 0; i < 3; i++) {
        const x = w * (0.28 + i * 0.22);
        ctx.beginPath();
        ctx.moveTo(x - 14, 0);
        ctx.lineTo(x + 22, 0);
        ctx.lineTo(x + 60, h);
        ctx.lineTo(x - 45, h);
        ctx.fill();
      }
    }

    // LED-wall aesthetic: soft-clipped panel grid + edge wash
    this._ledWallOverlay(ctx, w, h, light, quality);

    // Silhouette lift — soft edge vignette only (NO mid-frame dark card/band)
    if (light.modes.includes('silhouette')) {
      const sg = ctx.createRadialGradient(w / 2, h * 0.55, w * 0.15, w / 2, h * 0.55, w * 0.7);
      sg.addColorStop(0, 'rgba(0,0,0,0)');
      sg.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
    }

    // Full-frame white — soft-clipped peak (comfort); artistic still punches via trigger caps
    if (light.whiteOut > 0.02) {
      const c = getMotionComfort();
      const a = Math.min(c.muteWhiteOut ? 0 : (c.whiteOutPeakCap ?? 1), light.whiteOut);
      if (a > 0.02) {
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // Fade mode
    if (light.modes.includes('fade')) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  _ledWallOverlay(ctx, w, h, light, quality = 1) {
    const q = Math.max(0.5, Math.min(1, quality));
    const hardLed = !!(light.hardLock || light.vibeMode === 'chaos' || (light.aggression || 0) >= 0.55);
    // Soft-clip bloomBoost so panel bands never read as EQ bars / blow out
    const bloomBoost = Math.min(0.45, (light.bloom || 0) * 0.38 + (light.pulse || 0) * 0.22);
    if (bloomBoost < 0.05 && !light.modes.includes('wash') && !light.modes.includes('bloom')) {
      const eg = ctx.createLinearGradient(0, 0, w, 0);
      if (hardLed) {
        eg.addColorStop(0, 'rgba(160,30,24,0.08)');
        eg.addColorStop(0.5, 'rgba(0,0,0,0)');
        eg.addColorStop(1, 'rgba(40,20,70,0.08)');
      } else {
        eg.addColorStop(0, 'rgba(120,160,255,0.045)');
        eg.addColorStop(0.5, 'rgba(0,0,0,0)');
        eg.addColorStop(1, 'rgba(255,120,200,0.045)');
      }
      ctx.fillStyle = eg;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    ctx.save();
    // Edge wash — hard → storm red/ash, never pastel pastoral
    const edgeA = Math.min(0.12, 0.05 + bloomBoost * 0.1);
    const left = ctx.createLinearGradient(0, 0, w * 0.12, 0);
    left.addColorStop(0, hardLed ? `rgba(160,40,30,${edgeA + 0.04})` : `rgba(100,180,255,${edgeA})`);
    left.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, w * 0.12, h);
    const right = ctx.createLinearGradient(w, 0, w * 0.88, 0);
    right.addColorStop(0, hardLed ? `rgba(60,30,80,${edgeA + 0.04})` : `rgba(255,100,180,${edgeA})`);
    right.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = right;
    ctx.fillRect(w * 0.88, 0, w * 0.12, h);

    // Soft panel grid — sparser, lower alpha (not EQ strip look)
    const cols = Math.max(4, Math.floor(8 * q));
    const rows = Math.max(3, Math.floor(5 * q));
    const cellW = w / cols;
    const cellH = h / rows;
    const phase = light.ledPhase || 0;
    const gridA = Math.min(0.055, 0.025 + bloomBoost * 0.04);
    ctx.strokeStyle = hardLed
      ? `rgba(140,180,210,${gridA + 0.015})` // cold steel grid
      : `rgba(200,220,255,${gridA})`;
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      const x = c * cellW;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * cellH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Soft glow band — clamped so it never looks like a spectrum meter
    const bandRow = Math.floor((phase * 3) % rows);
    const bandA = Math.min(0.045, 0.02 + bloomBoost * 0.035);
    ctx.fillStyle = hardLed
      ? `rgba(160,40,36,${bandA + 0.02})` // ember crimson band, not warm orange
      : `rgba(255,255,255,${bandA})`;
    ctx.fillRect(0, bandRow * cellH, w, cellH * 0.28);

    ctx.restore();
  }

  _alpha(hex, a) {
    const h = hex.replace('#', '');
    if (h.length < 6) return `rgba(255,255,255,${a})`;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${Math.min(1, a)})`;
  }
}
