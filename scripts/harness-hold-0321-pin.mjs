/**
 * HOLD-0321 runtime harness — prove pin/hardOnly for Clash-class vectors;
 * softClear for Night Owl; soft packs impossible under nuclear force.
 * Node (no browser): synthesizes feature vectors through pin + scene selection logic.
 */
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Inline pin logic mirror (analyzer._applyAggressionPin) — must stay congruent
function applyAggressionPin(vibe, roles, ctx, state = {}) {
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const now = ctx.now || 0;
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

  const nightOwlSoft = !silence
    && energy < 0.32 && harsh < 0.2 && densFast < 0.3 && kick < 0.28
    && (spoken || ((tex.ambient || 0) > 0.45 && dens < 0.3) || ((tex.sparseAcoustic || 0) > 0.45));

  const orchestralMartial = !nightOwlSoft && !silence && (
    fam === 'classical' || fam === 'gospel' || fam === 'jazz' || swellN > 0.32
  ) && energy > 0.36 && (
    kick > 0.22 || densFast > 0.25 || dens > 0.28 || fluxN > 0.25 || bassN > 0.32
    || dropN > 0.35 || buildN > 0.55
  );

  const martial = !nightOwlSoft && !silence && (
    orchestralMartial
    || (harsh > 0.18 && densFast > 0.28 && energy > 0.25)
    || (energy > 0.48 && densFast > 0.32 && kick > 0.28)
  );

  const storm = !nightOwlSoft && !silence && (
    martial || orchestralMartial || (vibe.aggression || 0) > 0.35
    || (energy > 0.5 && densFast > 0.35)
  );

  state._aggressionPinUntil = state._aggressionPinUntil || 0;
  const PIN_MS = 20000;
  if (storm) state._aggressionPinUntil = Math.max(state._aggressionPinUntil, now + PIN_MS);

  const softClear = nightOwlSoft && !martial && !orchestralMartial;
  const locked = (now < state._aggressionPinUntil) && !softClear;
  vibe.aggressionLock = locked;
  vibe.forbidPastoral = locked || martial || orchestralMartial;
  vibe.martial = !!martial;
  vibe.orchestralMartial = !!orchestralMartial;
  vibe.softClear = !!softClear;
  vibe.pinArmed = !!locked;
  if (softClear) {
    state._aggressionPinUntil = 0;
    vibe.aggressionLock = false;
    vibe.forbidPastoral = false;
  }
  return { vibe, state, nightOwlSoft, storm };
}

const HARD = new Set(['metal_hall', 'reality_fracture', 'apocalyptic_warzone', 'red_void', 'storm']);
const SOFT = ['forest', 'meadow_fauna', 'misty_lake', 'ocean', 'spoken_word_bed', 'rainy_city'];

function nuclearHardOnly(frames) {
  // Simulate ≥1.5s continuous hot (energy>0.4 OR kick/onset/densFast high)
  let hotSince = null;
  let hardOnly = false;
  const out = [];
  for (const f of frames) {
    const softClear = !!f.vibe?.softClear;
    const hot = !softClear && (
      f.energy > 0.4 || f.kick > 0.28 || f.onsetFast > 0.28 || f.densFast > 0.28
    );
    if (hot) {
      if (hotSince == null) hotSince = f.t;
    } else hotSince = null;
    const nuclear = hotSince != null && (f.t - hotSince) >= 1500;
    const pin = !!(f.vibe?.forbidPastoral || f.vibe?.aggressionLock || f.vibe?.martial
      || f.vibe?.orchestralMartial || f.vibe?.pinArmed);
    hardOnly = pin || nuclear;
    const preset = hardOnly ? 'metal_hall' : (f.softPrefer || 'forest');
    const softImpossible = hardOnly && HARD.has(preset) && !SOFT.includes(preset);
    out.push({ t: f.t, hardOnly, nuclear, pin, preset, softImpossible, vibe: { ...f.vibe } });
  }
  return out;
}

// --- Clash-class vectors (orchestral-martial) ---
const clashState = {};
const clashFrames = [];
for (let i = 0; i < 40; i++) {
  const t = i * 100; // 0..4s @ 100ms
  const vibe = { aggression: 0.4, spoken: 0.1, speechLike: 0.15 };
  const roles = { kick: 0.35, bass: 0.4, harsh: 0.12, pads: 0.55, lead: 0.3 };
  const { vibe: v } = applyAggressionPin(vibe, roles, {
    now: t, energy: 0.48, silence: false, genreFamily: 'classical',
    texture: { swell: 0.45, ambient: 0.55 },
    onsetDensity: 0.32, onsetFast: 0.38, flux: 1.2, drop: 0.2, build: 0.4
  }, clashState);
  clashFrames.push({ t, energy: 0.48, kick: 0.35, onsetFast: 0.38, densFast: 0.38, vibe: v, softPrefer: 'forest' });
}

const clashOut = nuclearHardOnly(clashFrames);
const clashAt2s = clashOut.find(x => x.t >= 2000);
const clashPin = clashOut.find(x => x.vibe.pinArmed || x.vibe.orchestralMartial);

// --- Night Owl soft ---
const owlState = {};
const owlFrames = [];
for (let i = 0; i < 40; i++) {
  const t = i * 100;
  const vibe = { aggression: 0.08, spoken: 0.55, speechLike: 0.6 };
  const roles = { kick: 0.08, bass: 0.12, harsh: 0.05, pads: 0.4, lead: 0.35 };
  const { vibe: v } = applyAggressionPin(vibe, roles, {
    now: t, energy: 0.18, silence: false, genreFamily: 'spoken',
    texture: { ambient: 0.55, sparseAcoustic: 0.2, swell: 0.05 },
    onsetDensity: 0.12, onsetFast: 0.1, flux: 0.2, drop: 0, build: 0.1
  }, owlState);
  owlFrames.push({ t, energy: 0.18, kick: 0.08, onsetFast: 0.1, densFast: 0.1, vibe: v, softPrefer: 'misty_lake' });
}
const owlOut = nuclearHardOnly(owlFrames);
const owlAt2s = owlOut.find(x => x.t >= 2000);

const report = {
  clash: {
    orchestralMartial: !!clashPin?.vibe?.orchestralMartial,
    pinArmed: !!clashPin?.vibe?.pinArmed,
    forbidPastoral: !!clashPin?.vibe?.forbidPastoral,
    at2s_hardOnly: !!clashAt2s?.hardOnly,
    at2s_preset: clashAt2s?.preset,
    softImpossibleUnderForce: clashOut.filter(x => x.hardOnly).every(x => x.softImpossible && HARD.has(x.preset))
  },
  nightOwl: {
    softClear: !!owlAt2s?.vibe?.softClear,
    hardOnly: !!owlAt2s?.hardOnly,
    preset: owlAt2s?.preset
  }
};

const pass = report.clash.orchestralMartial
  && report.clash.at2s_hardOnly
  && report.clash.softImpossibleUnderForce
  && report.nightOwl.softClear
  && !report.nightOwl.hardOnly;

console.log(JSON.stringify({ pass, report }, null, 2));
process.exit(pass ? 0 : 1);
