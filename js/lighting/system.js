import { getMotionComfort } from '../a11y/motionPrefs.js';
/**
 * Lighting: washes, shafts, bloom, white-out, silhouette, pulse.
 * Soft-clipped LED bloom + A11y getMotionComfort (HOLD-2142 comfort).
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

  update(audio, emotion, intensity = 0.5) {
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

    this.whiteOut *= 0.82;
    if (c.muteWhiteOut) this.whiteOut = 0;
    else if (c.whiteOutPeakCap != null) this.whiteOut = Math.min(this.whiteOut, c.whiteOutPeakCap);

    this.blackout *= 0.9;
    this.pulse *= 0.9;
    this._ledPhase = (this._ledPhase + 0.016) % 1000;

    // Bloom: comfort ceiling 0.55; lessFlash 0.40; PRM 0.35; artistic 0.72 when comfort off
    const rawBloom = 0.26 + intensity * 0.38 + (emotion?.hope || 0) * 0.18 + (audio?.treble || 0) * 0.14;
    const bloomCap = c.bloomCap != null ? c.bloomCap : 0.55;
    this.bloom = Math.min(bloomCap, rawBloom);

    if (audio?.beat) this.pulse = Math.max(this.pulse, c.muteKickStrobe ? 0.35 : 0.65);
    if (audio?.drop > 0.5) this.pulse = Math.max(this.pulse, audio.drop * (c.muteKickStrobe ? 0.35 : 0.7));

    return {
      whiteOut: this.whiteOut,
      blackout: this.blackout,
      bloom: this.bloom,
      pulse: this.pulse,
      modes: this.modes,
      ledPhase: this._ledPhase
    };
  }

  /**
   * Apply lighting overlays AFTER scene draw.
   */
  apply(ctx, w, h, light, palette = [], quality = 1) {
    // Blackout
    if (light.blackout > 0.02) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, light.blackout)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Pulse vignette / flash ring — stronger concert punch
    if (light.pulse > 0.05) {
      const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.75);
      g.addColorStop(0, `rgba(255,255,255,${Math.min(0.18, light.pulse * 0.18)})`);
      g.addColorStop(0.55, `rgba(255,240,220,${Math.min(0.08, light.pulse * 0.08)})`);
      g.addColorStop(1, `rgba(0,0,0,${Math.min(0.32, light.pulse * 0.32)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Bloom / wash — soft-clipped alphas
    const wantBloom =
      light.bloom > 0.1 ||
      light.modes.includes('bloom') ||
      light.modes.includes('wash');
    if (wantBloom) {
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

    // Shafts — fewer, softer (not EQ wedges)
    if (
      light.modes.includes('shafts') ||
      light.modes.includes('slow_wash') ||
      (light.modes.includes('bloom') && light.bloom > 0.35)
    ) {
      const shaftA = Math.min(0.07, 0.03 + light.bloom * 0.05 + light.pulse * 0.025);
      ctx.fillStyle = `rgba(255,245,220,${shaftA})`;
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
    // Soft-clip bloomBoost so panel bands never read as EQ bars / blow out
    const bloomBoost = Math.min(0.45, (light.bloom || 0) * 0.38 + (light.pulse || 0) * 0.22);
    if (bloomBoost < 0.05 && !light.modes.includes('wash') && !light.modes.includes('bloom')) {
      const eg = ctx.createLinearGradient(0, 0, w, 0);
      eg.addColorStop(0, 'rgba(120,160,255,0.045)');
      eg.addColorStop(0.5, 'rgba(0,0,0,0)');
      eg.addColorStop(1, 'rgba(255,120,200,0.045)');
      ctx.fillStyle = eg;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    ctx.save();
    // Edge wash (side LED bars) — clamped alphas
    const edgeA = Math.min(0.12, 0.05 + bloomBoost * 0.1);
    const left = ctx.createLinearGradient(0, 0, w * 0.12, 0);
    left.addColorStop(0, `rgba(100,180,255,${edgeA})`);
    left.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, w * 0.12, h);
    const right = ctx.createLinearGradient(w, 0, w * 0.88, 0);
    right.addColorStop(0, `rgba(255,100,180,${edgeA})`);
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
    ctx.strokeStyle = `rgba(200,220,255,${gridA})`;
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
    ctx.fillStyle = `rgba(255,255,255,${bandA})`;
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
