/**
 * Morph / match continuity between scenes —
 * forest→silhouette trees→skyscrapers→stars — not random jumps.
 * Prefer morph overlays; hard cuts are director's job for breakdown/drop.
 */
import { drawPreset } from './presets.js';

export class ContinuityEngine {
  constructor() {
    this.buffer = null;
    this.bufCtx = null;
  }

  _ensureBuffer(w, h) {
    if (!this.buffer || this.buffer.width !== w || this.buffer.height !== h) {
      this.buffer = document.createElement('canvas');
      this.buffer.width = w;
      this.buffer.height = h;
      this.bufCtx = this.buffer.getContext('2d');
    }
  }

  /**
   * Draw with optional crossfade/morph between from→to presets.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} w
   * @param {number} h
   * @param {object} state render state
   * @param {object|null} transition { from, to, progress, mode? }
   */
  draw(ctx, w, h, state, transition) {
    if (!transition || transition.progress >= 1 || !transition.from) {
      drawPreset(state.preset || 'white_void', ctx, w, h, state);
      return;
    }

    // Hard cut: skip morph bridge
    if (transition.mode === 'cut') {
      const p = transition.progress;
      if (p < 0.15) {
        drawPreset(transition.from, ctx, w, h, { ...state, preset: transition.from });
        ctx.fillStyle = `rgba(0,0,0,${p / 0.15})`;
        ctx.fillRect(0, 0, w, h);
      } else if (p < 0.35) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
      } else {
        drawPreset(transition.to, ctx, w, h, { ...state, preset: transition.to });
        const fade = 1 - (p - 0.35) / 0.65;
        if (fade > 0) {
          ctx.fillStyle = `rgba(0,0,0,${fade * 0.85})`;
          ctx.fillRect(0, 0, w, h);
        }
      }
      return;
    }

    const p = this._ease(transition.progress);
    this._ensureBuffer(w, h);

    this.bufCtx.clearRect(0, 0, w, h);
    drawPreset(transition.from, this.bufCtx, w, h, { ...state, preset: transition.from });
    ctx.globalAlpha = 1 - p;
    ctx.drawImage(this.buffer, 0, 0);

    this.bufCtx.clearRect(0, 0, w, h);
    drawPreset(transition.to, this.bufCtx, w, h, { ...state, preset: transition.to });
    ctx.save();
    ctx.globalAlpha = p;
    const scale = 1 + (1 - p) * 0.04;
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(this.buffer, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;

    if (p > 0.3 && p < 0.7) {
      this._bridgeOverlay(ctx, w, h, transition.from, transition.to, p, state);
    }
  }

  _ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  _bridgeOverlay(ctx, w, h, from, to, p, state) {
    const alpha = (1 - Math.abs(p - 0.5) * 2) * 0.35;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) {
      const y = h * 0.65 + Math.sin(x * 0.02 + state.t) * 15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.fill();

    const urban = /city|futuristic|industrial/.test(to);
    const nature = /forest|snow|ruins/.test(from);
    if (nature && urban) {
      ctx.fillStyle = `rgba(5,8,12,${alpha + 0.2})`;
      for (let i = 0; i < 12; i++) {
        const x = (i / 12) * w;
        const treeH = 80 + (i % 4) * 30;
        const buildingH = 100 + (i % 5) * 40;
        const hh = treeH * (1 - p) + buildingH * p;
        const width = 10 * (1 - p) + 22 * p;
        ctx.fillRect(x, h * 0.65 - hh * 0.5, width, hh * 0.5);
      }
    }

    // highway → desert / ocean → storm horizon glue
    const road = /highway|desert|burning/.test(from) || /highway|desert|burning/.test(to);
    const water = /ocean|storm/.test(from) && /ocean|storm|space/.test(to);
    if (road || water) {
      ctx.strokeStyle = `rgba(200,210,230,${alpha * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      ctx.lineTo(w, h * 0.62);
      ctx.stroke();
    }
  }
}
