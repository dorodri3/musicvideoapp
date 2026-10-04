/**
 * Morph / match continuity between scenes —
 * forest→silhouette trees→skyscrapers→stars — not random jumps.
 * Prefer morph overlays; hard cuts are director's job for breakdown/drop.
 *
 * Path F (DIAG HOLD-0306): under hardLock / refuseSoftWin, soft destination
 * must NOT paint at full opacity mid-morph (pale B3). Keep hard from + dense
 * storm veil α≥0.45; soft Night Owl morph untouched when unlocked.
 */
import { drawPreset } from './presets.js?v=novideo2';

/** Congruent with Worlds HARD_LOCK_PRESETS — Visual morph allowlist under pin */
const HARD_LOCK_IDS = new Set([
  'metal_hall', 'reality_fracture', 'apocalyptic_warzone', 'red_void', 'storm'
]);

function isHardLockPreset(id) {
  return HARD_LOCK_IDS.has(String(id || '').toLowerCase());
}

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

    // Hard cut: skip morph bridge — BUT refuse unearned cuts when forceMorph stamped (Visual coherence)
    if (transition.forceMorph) {
      /* fall through to morph path below */
    } else if (transition.mode === 'cut') {
      const p = transition.progress;
      if (p < 0.15) {
        drawPreset(transition.from, ctx, w, h, { ...state, preset: transition.from });
        ctx.fillStyle = `rgba(0,0,0,${p / 0.15})`;
        ctx.fillRect(0, 0, w, h);
      } else if (p < 0.35) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
      } else {
        // Under hardLock, never reveal soft cut destination mid-window
        const hardGate = !!(transition.hardLock || transition.refuseSoftWin);
        const toId = (hardGate && !isHardLockPreset(transition.to))
          ? (isHardLockPreset(transition.from) ? transition.from : 'metal_hall')
          : transition.to;
        drawPreset(toId, ctx, w, h, { ...state, preset: toId });
        const fade = 1 - (p - 0.35) / 0.65;
        if (fade > 0) {
          ctx.fillStyle = `rgba(0,0,0,${fade * 0.85})`;
          ctx.fillRect(0, 0, w, h);
        }
        if (hardGate) this._stormVeil(ctx, w, h, Math.max(0.45, fade * 0.5 + 0.35));
      }
      return;
    }

    const p = this._ease(transition.progress);
    this._ensureBuffer(w, h);

    const hardGate = !!(transition.hardLock || transition.refuseSoftWin);
    const softDest = hardGate && !isHardLockPreset(transition.to);

    // Always paint hard `from` first
    this.bufCtx.clearRect(0, 0, w, h);
    drawPreset(transition.from, this.bufCtx, w, h, { ...state, preset: transition.from });

    if (softDest) {
      // Path F strongest: skip soft `to` entirely mid-morph.
      // Keep hard `from` full + dense storm veil α≥0.45 (no pale/green B3).
      // Late window (p>0.85): optional hard-fallback bleed ≤0.15 — never soft preset.
      ctx.globalAlpha = 1;
      ctx.drawImage(this.buffer, 0, 0);

      if (p > 0.85) {
        const fallback = isHardLockPreset(transition.from)
          ? transition.from
          : 'metal_hall';
        this.bufCtx.clearRect(0, 0, w, h);
        drawPreset(fallback, this.bufCtx, w, h, { ...state, preset: fallback });
        const lateA = Math.min(0.15, ((p - 0.85) / 0.15) * 0.15);
        ctx.save();
        ctx.globalAlpha = lateA;
        ctx.drawImage(this.buffer, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (p > 0.25 && p < 0.75) {
        this._bridgeOverlay(ctx, w, h, transition.from, 'metal_hall', p, state);
      }
      // Dense storm veil — floor 0.45 under hardLock (was ~0.18)
      this._stormVeil(ctx, w, h, Math.max(0.45, (1 - Math.abs(p - 0.5) * 1.0) * 0.62));
      return;
    }

    // Unlocked soft morph OR hard→hard: normal crossfade
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

    if (p > 0.25 && p < 0.75) {
      this._bridgeOverlay(ctx, w, h, transition.from, transition.to, p, state);
    }
    // Mid-aggression hard→hard: still densify storm veil (was ~0.18)
    if (hardGate) {
      this._stormVeil(ctx, w, h, Math.max(0.45, (1 - Math.abs(p - 0.5) * 1.0) * 0.62));
    }
  }

  /** Ash-ember storm veil — α floored for hardLock soft-win refuse */
  _stormVeil(ctx, w, h, alpha) {
    const a = Math.min(0.72, Math.max(0, alpha));
    if (a < 0.02) return;
    ctx.fillStyle = `rgba(40,8,10,${a})`;
    ctx.fillRect(0, 0, w, h);
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
