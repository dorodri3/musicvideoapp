/**
 * style1 (CEO P0, Nov 24 2026): ONE STYLE PER VIDEO + a recurring element KIT + a held wardrobe.
 * Source of truth for WHAT is drawn: Worlds `styleKit(styleLock)` (js/scene/styleFamilies.js).
 * This module owns HOW it looks: the per-style grade pass, the kit painters (midground + foreground,
 * screen space, laid out relative to the figure so every world in the style shows the same props),
 * the wardrobe/pose vocabulary and the lyric type treatment.
 *
 * Exports used by Scene / QA:
 *   VISUAL_STYLES  — per style id: grade fallback, typo, light, cast (outfit, rim, verb→move table)
 *   STYLE_GRADES   — grade objects keyed by style id (candy_pop, ember_wasteland, sad, horror, cinematic)
 *   DEFAULT_KITS   — Visual fallback kits (Addendum 3) used only when Worlds styleKit() returns null
 *   resolveKit(id) — Worlds kit → { elements:Set<visualId>, never:Set, figure, drive, peakMax }
 *   applyStyleGrade(ctx,w,h,grade,opts) · KitPainter
 */
import { styleKit as worldsStyleKit, styleComposition as worldsComposition } from '../scene/styleFamilies.js?v=mood4';
import { drawBeast, drawChaosFar, drawChaosNear, drawHardShadow, drawHeavyFront, loudAmount } from './loudLayer.js?v=mood4';

export const STYLE_ALIAS = { happy_pop: 'candy_pop', happy: 'candy_pop', heavy_evil: 'ember_wasteland', heavy: 'ember_wasteland', cold_dread: 'horror', melancholy: 'sad' };
export const normStyle = (id) => { const s = String(id || '').toLowerCase(); return STYLE_ALIAS[s] || s || null; };

/** Grade fallbacks (Scene's directive.styleGrade wins when present). rgb strings 'r,g,b'. */
export const STYLE_GRADES = Object.freeze({
  horror:          { key: '170,190,225', shadow: '4,6,12',    rim: '190,210,255', mist: '150,165,195', accent: '255,196,110', vignette: 0.58, desat: 0.55, tint: 0.14, crush: 0.32 },
  sad:             { key: '170,185,205', shadow: '16,20,30',  rim: '200,215,235', mist: '185,195,210', accent: '255,200,140', vignette: 0.42, desat: 0.45, tint: 0.12, crush: 0.16 },
  cinematic:       { key: '255,190,120', shadow: '10,40,50',  rim: '255,200,140', mist: '170,200,210', accent: '255,214,160', vignette: 0.36, desat: 0.1,  tint: 0.12, crush: 0.14, teal: 0.16 },
  candy_pop:       { key: '255,170,220', shadow: '60,30,80',  rim: '255,240,150', mist: '255,215,240', accent: '120,220,255', vignette: 0.12, desat: 0,    tint: 0.14, crush: 0 },
  ember_wasteland: { key: '255,90,50',   shadow: '10,6,8',    rim: '255,168,76',  mist: '120,40,36',   accent: '255,120,40',  vignette: 0.5,  desat: 0.15, tint: 0.14, crush: 0.3 },
  cozy:            { key: '255,190,130', shadow: '40,24,16',  rim: '255,210,150', mist: '255,225,190', accent: '255,180,100', vignette: 0.3,  desat: 0.05, tint: 0.16, crush: 0.05 }
});

/**
 * Per-style visual rules. cast.moves maps Scene reaction verbs → performer moves.
 * castMove log names stay in the tester vocabulary (idle|sway|gaze|turn|brace|raise_arms|step_back|walk).
 */
export const VISUAL_STYLES = Object.freeze({
  cozy: {
    label: 'Cozy', typo: { fill: '255,244,228', active: '255,250,240', glow: '255,190,120', stroke: '40,20,10', weight: 500, sizeMul: 0.96, track: 0.01, upper: false, alpha: 0.88 },
    light: { bloom: '255,200,140', shaft: '255,220,170', edgeL: '255,170,100', edgeR: '200,120,80' },
    cast: { outfit: 'soft_knit_sweater_relaxed', hood: false, coat: 'jacket', prop: null, swayMul: 0.45, hunch: 0.2,
      moves: { idle_sway: 'mug', look_toward: 'mug', look_up: 'mug_look', turn: 'mug', brace: 'mug', step_back: 'mug', raise_arms: 'mug_look', walk: 'walk', watch_vista: 'mug', gaze: 'mug', head_low: 'mug', bounce: 'mug', wave: 'mug', point_up: 'mug_look', dance: 'mug', still_breath: 'mug' }, blanket: true, mug: true } // polish6: blanket + steaming mug, always
  },
  horror: {
    label: 'Horror', typo: { fill: '226,230,236', active: '240,242,246', glow: null, stroke: '0,0,0', weight: 500, sizeMul: 0.82, track: 0.04, upper: false, alpha: 0.78 },
    light: { bloom: '150,175,215', shaft: '150,170,205', edgeL: '30,45,70', edgeR: '20,30,50' },
    cast: { outfit: 'searcher_long_dark_coat_lantern', hood: true, coat: 'long', prop: 'lantern', swayMul: 0.25, hunch: 0.6,
      moves: { idle_sway: 'lantern', still_breath: 'lantern', slow_head_turn: 'lantern', look_toward: 'lantern', look_up: 'lift_lantern', lift_lantern: 'lift_lantern', turn: 'turn_lantern', brace: 'freeze', freeze: 'freeze', startle: 'freeze', step_back: 'step_back', raise_arms: 'lift_lantern', walk: 'walk' } }
  },
  sad: {
    label: 'Sad', typo: { fill: '222,228,242', active: '238,240,250', glow: '200,190,235', stroke: '10,12,24', weight: 400, sizeMul: 0.92, track: 0.02, upper: false, alpha: 0.82 },
    light: { bloom: '200,205,230', shaft: '210,215,235', edgeL: '120,135,170', edgeR: '170,150,200' },
    cast: { outfit: 'plain_coat_hood_hands_in_pockets', hood: true, coat: 'long', prop: null, swayMul: 0.3, hunch: 0.9,
      moves: { idle_sway: 'pockets', head_low: 'pockets', gaze: 'pockets', look_down: 'pockets', look_toward_light: 'pockets', look_toward: 'pockets', lift_head: 'look_up_soft', look_up: 'look_up_soft', hold_memory: 'lantern', turn: 'pockets', brace: 'pockets', step_back: 'pockets', raise_arms: 'look_up_soft', walk: 'walk' } }
  },
  cinematic: {
    label: 'Cinematic', typo: { fill: '255,240,220', active: '255,248,236', glow: '255,200,140', stroke: '6,20,26', weight: 300, sizeMul: 0.86, track: 0.22, upper: true, alpha: 0.86 },
    light: { bloom: '255,205,150', shaft: '255,220,170', edgeL: '30,90,100', edgeR: '255,160,90' },
    cast: { outfit: 'lone_hero_cloak_lowered_staff', hood: false, coat: 'cloak', prop: 'staff', swayMul: 0.45, hunch: 0,
      moves: { idle_sway: 'stand', watch_vista: 'stand', look_toward: 'stand', look_up: 'look_up', turn: 'turn', brace: 'brace', shield_eyes: 'gaze', step_back: 'step_back', raise_arms: 'reach_light', walk: 'walk' } }
  },
  candy_pop: {
    label: 'Happy', typo: { fill: '255,250,255', active: '255,255,255', glow: '255,120,200', stroke: '120,40,140', weight: 800, sizeMul: 1.08, track: 0.01, upper: false, alpha: 0.92 },
    light: { bloom: '255,200,235', shaft: '255,240,200', edgeL: '120,220,255', edgeR: '255,140,220' },
    cast: { outfit: 'bright_color_jacket', hood: false, coat: 'jacket', prop: null, swayMul: 1, hunch: 0, bright: true,
      moves: { idle_sway: 'bounce', bounce: 'bounce', wave: 'wave', point_up: 'point_up', dance: 'armsup', look_toward: 'bounce', look_up: 'point_up', turn: 'wave', brace: 'armsup', step_back: 'bounce', raise_arms: 'armsup', walk: 'walk' } }
  },
  ember_wasteland: {
    label: 'Heavy', typo: { fill: '255,236,226', active: '255,246,240', glow: '255,60,30', stroke: '60,0,0', weight: 800, sizeMul: 1.0, track: 0.06, upper: true, alpha: 0.9 },
    light: { bloom: '255,90,50', shaft: '230,235,255', edgeL: '170,30,20', edgeR: '60,30,40' },
    cast: { outfit: 'frontman_torn_black_coat', hood: false, coat: 'torn', prop: null, swayMul: 0.15, hunch: 0, wide: true,
      moves: { idle_sway: 'roar', defiant: 'roar', scan: 'roar', headbang: 'roar', look_toward: 'roar', look_up: 'roar', turn: 'brace_up', brace: 'brace_up', step_back: 'brace_up', raise_arms: 'raise_fists', raise_fists: 'raise_fists', startle: 'brace_up', walk: 'walk' } } // polish6: roars / braces up at the beast, never hands-on-hips
  }
});

/** Visual fallback kits — Addendum 3 — only when Worlds styleKit() returns null. */
export const DEFAULT_KITS = Object.freeze({
  horror: { elements: ['lantern', 'crows', 'ground fog', 'dark doorway', 'handprints', 'distant silhouette'], fx: ['ground fog', 'dust'], never: ['fireflies', 'confetti'], peakMax: 2 },
  sad: { elements: ['rain', 'puddle reflections', 'streetlamp', 'umbrella', 'empty bench', 'letter'], fx: ['rain', 'mist'], never: ['fire', 'lightning strike', 'strobe'], peakMax: 0 },
  cinematic: { elements: ['cloak in wind', 'backlit dust', 'far birds', 'horizon landmark', 'light beams'], fx: ['motes', 'embers'], never: ['neon', 'confetti'], peakMax: 2 },
  candy_pop: { elements: ['confetti', 'balloons', 'sparkles', 'flowers', 'sun', 'light-dot fauna'], fx: ['confetti', 'sparkles'], never: ['dark fog', 'fire', 'crows', 'storm', 'stormy sky', 'rain', 'sea', 'ocean', 'waves', 'lightning'], peakMax: 3 },
  cozy: { elements: ['porch lantern', 'lit window', 'string lights', 'falling leaves', 'blanket', 'mug'], fx: ['falling leaves'], never: ['forest', 'deer', 'lake', 'misty_lake', 'meadow_fauna', 'wilderness', 'pine', 'fauna', 'dark_sparse', 'storm', 'streetlamp', 'crows', 'strobe'], peakMax: 0 },
  ember_wasteland: { elements: ['fire + embers', 'chains', 'horned shapes / skulls', 'lightning', 'cracked ground', 'broken pillars', 'demon eyes in smoke', 'shadow beast behind figure'], fx: ['embers', 'ash'], never: ['fireflies', 'pastel', 'confetti'], peakMax: 99 }
});

/** Free-text kit element → Visual painter id. */
const ELEMENT_MAP = [
  [/lantern/, 'lantern'], [/crow/, 'crows'], [/ground fog|fog bank|^fog|mist/, 'fog'], [/doorway/, 'doorway'], [/handprint|scratch/, 'handprints'],
  [/distant silhouette|second silhouette/, 'far_figure'], [/cloak|banner/, 'cloak'], [/dust|motes/, 'dust'], [/ember|fire(?!fl)/, 'embers'],
  [/bird/, 'birds'], [/landmark|horizon/, 'landmark'], [/beam|shaft/, 'beams'], [/rain/, 'rain'], [/puddle|reflection/, 'puddles'],
  [/window/, 'window'], [/streetlamp|lamp/, 'streetlamp'], [/umbrella/, 'umbrella'], [/bench|seat/, 'bench'], [/letter/, 'letter'],
  [/confetti/, 'confetti'], [/balloon/, 'balloons'], [/sparkle|glitter/, 'sparkles'], [/flower/, 'flowers'], [/sun|rainbow/, 'sun'],
  [/light-dot|light dot/, 'lightdots'], [/chain/, 'chains'], [/horn|skull/, 'horns'], [/lightning/, 'lightning'], [/crack/, 'cracks'],
  [/string light|fairy light/, 'stringlights'], [/leaves|leaf/, 'leaves'], [/pillar|ruin/, 'pillars'], [/eyes/, 'eyes'], [/beast/, 'beast'], [/ash/, 'ash']
];
function mapEl(s) { const t = String(s || '').toLowerCase(); const out = []; for (const [re, id] of ELEMENT_MAP) if (re.test(t)) out.push(id); return out; }

/** Kit draw priority per style — the per-frame cap (composition.maxElements) keeps the first N. */
export const KIT_PRIORITY = Object.freeze({
  sad: ['rain', 'bench', 'puddles', 'streetlamp', 'fog', 'umbrella'],
  horror: ['fog', 'doorway', 'crows', 'far_figure', 'dust', 'handprints'],
  cinematic: ['beams', 'landmark', 'dust', 'birds', 'embers', 'rain'],
  candy_pop: ['confetti', 'sparkles', 'balloons', 'sun', 'flowers', 'lightdots'],
  ember_wasteland: ['beast', 'embers', 'cracks', 'eyes', 'pillars', 'chains', 'ash', 'horns', 'lightning'],
  cozy: ['porchlamp', 'window', 'stringlights', 'leaves', 'dust']
});
const FIGURE_PROPS = new Set(['lantern', 'letter', 'cloak']);

/** Visual fallback composition (only when neither Scene's directive.composition nor Worlds' styleComposition exists). */
export const MOOD_COMPOSITION = Object.freeze({
  sad:             { mood: 'hollow', focalU: 0.15, focalV: 0.62, emptySpace: 0.7, maxElements: 2, saturation: 0.3, warmth: -0.35, contrast: 0.45, texture: 'grain_streak', fauna: false, scale: 0.8 },
  horror:          { mood: 'anxious', focalU: 0.64, focalV: 0.62, emptySpace: 0.55, maxElements: 3, saturation: 0.4, warmth: -0.15, contrast: 0.85, texture: 'grit', fauna: false, scale: 0.85 },
  cinematic:       { mood: 'calm', focalU: 0.5, focalV: 0.62, emptySpace: 0.45, maxElements: 3, saturation: 0.6, warmth: 0.2, contrast: 0.5, texture: 'clean', fauna: true, scale: 1 },
  candy_pop:       { mood: 'energized_round', focalU: 0.5, focalV: 0.62, emptySpace: 0.25, maxElements: 5, saturation: 0.95, warmth: 0.3, contrast: 0.75, texture: 'clean', fauna: true, scale: 1.15 },
  ember_wasteland: { mood: 'energized_sharp', focalU: 0.5, focalV: 0.62, emptySpace: 0.2, maxElements: 4, saturation: 0.7, warmth: 0.4, contrast: 0.9, texture: 'ash', fauna: true, scale: 1.2 },
  cozy:            { mood: 'cozy', focalU: 0.5, focalV: 0.62, emptySpace: 0.3, maxElements: 4, saturation: 0.65, warmth: 0.75, contrast: 0.4, texture: 'soft', fauna: true, scale: 1.05 }
});
const FOCAL_U = { edge: 0.15, thirds: 0.64, center: 0.5, scattered: 0.5 };
const COLOR_FB = { sad: [0.3, -0.35, 0.45], horror: [0.4, -0.15, 0.85], cinematic: [0.6, 0.2, 0.5], candy_pop: [0.95, 0.3, 0.75], cozy: [0.65, 0.75, 0.4], ember_wasteland: [0.7, 0.4, 0.9] };
const num = (v, d) => (v !== null && v !== '' && v !== undefined && Number.isFinite(+v) ? +v : d);

/**
 * ONE composition source per frame: (1) directive.composition (Scene) → (2) Worlds styleComposition → (3) MOOD_COMPOSITION.
 * `chaos` 0..1 comes from mode / intensity / motionMul (never raw energy).
 */
export function resolveComposition(directive, styleId) {
  const id = normStyle(styleId);
  const d = directive?.composition && typeof directive.composition === 'object' ? directive.composition : null;
  let src = 'scene', c = d;
  const eFb = Number.isFinite(+directive?.intensity) ? +directive.intensity : 0.3;
  if (!c) { try { c = worldsComposition(id, { energy: eFb }); src = c ? 'worlds' : null; if (c && c.intensity == null) c = { ...c, intensity: eFb, motionMul: c.expression?.motion }; } catch (_) { c = null; } }
  if (!c) { c = MOOD_COMPOSITION[id] || MOOD_COMPOSITION.cinematic; src = 'visual'; }
  const variant = c.variant || (id === 'cozy' ? 'cozy' : null);
  const cozy = variant === 'cozy' || id === 'cozy';
  const fbC = cozy ? MOOD_COMPOSITION.cozy : (MOOD_COMPOSITION[id] || MOOD_COMPOSITION.cinematic);
  const col = COLOR_FB[cozy ? 'cozy' : id] || COLOR_FB.cinematic;
  const mode = String(c.mode || 'quiet');
  const loud = /loud|strained|chaos/.test(mode);
  const intensity = num(c.intensity, loud ? 0.7 : 0.3);
  const motionMul = num(c.motionMul, num(c.expression?.motion, 0.4));
  const chaos = Number.isFinite(+c.chaos) ? clamp01(+c.chaos) : Math.max(0, Math.min(1, (loud ? 0.45 : 0) + Math.max(0, intensity - 0.45) * 0.9 + Math.max(0, motionMul - 0.5) * 0.5));
  return {
    source: src, look: id, mood: c.mood || fbC.mood, variant, mode, loud, intensity, motionMul, chaos,
    focalU: num(c.focalU, FOCAL_U[c.focal] ?? fbC.focalU), focalV: num(c.focalV, fbC.focalV),
    emptySpace: num(c.emptySpace, num(c.negativeSpace, fbC.emptySpace)), maxElements: Math.max(1, Math.round(num(c.maxElements, fbC.maxElements))),
    saturation: num(c.saturation, col[0]), warmth: num(c.warmth, col[1]), contrast: num(c.contrast, col[2]),
    texture: c.texture || fbC.texture, textureAmt: num(c.textureAmt, id === 'sad' ? 0.5 : id === 'horror' ? 0.6 : 0.25),
    tilt: num(c.horizonTilt ?? c.tilt, 0), crack: num(c.crack, 0), edges: c.edges || null, spacing: c.spacing || null,
    fauna: c.fauna == null ? fbC.fauna : !!c.fauna, warmLight: c.warmLight == null ? (cozy || id === 'cinematic' || id === 'candy_pop') : !!c.warmLight,
    scale: fbC.scale || 1, cozy
  };
}

/** Per-frame kit allow-list: priority order, capped by composition (chaos raises the cap), fauna-gated. */
export function capKit(styleId, kit, comp) {
  const id = normStyle(styleId);
  const pri = KIT_PRIORITY[comp?.cozy ? 'cozy' : id] || KIT_PRIORITY[id] || [];
  const els = new Set(kit?.elements || []);
  if (comp?.cozy && id !== 'cozy') for (const e of ['stringlights', 'leaves']) els.add(e); // cozy variant of happy/cinematic
  if (id === 'candy_pop') els.delete('rain'); // polish6: Candy never rains
  for (const e of [...els]) if (neverHas(kit, e)) els.delete(e); // fixmood2: never-list wins over every kit/FX element
  if (id === 'cozy' || comp?.cozy) { els.delete('lantern'); els.delete('rain'); els.add('porchlamp'); els.delete('streetlamp'); } // cozy: mug in hand, a hanging porch lantern
  if (id === 'ember_wasteland' && comp && (comp.mode === 'quiet' || (!comp.loud && (comp.chaos ?? 0) < 0.25))) { els.delete('lightning'); els.delete('rain'); els.add('embers'); }
  const out = new Set([...els].filter(e => FIGURE_PROPS.has(e)));
  const cap = (comp?.maxElements || 3) + Math.round((comp?.chaos || 0) * 3);
  const order = [...pri.filter(e => els.has(e)), ...[...els].filter(e => !pri.includes(e) && !FIGURE_PROPS.has(e))];
  let n = 0;
  for (const e of order) {
    if (!comp?.fauna && (e === 'crows' || e === 'birds')) continue;
    if (comp?.cozy && /confetti|beast|cracks|eyes/.test(e)) continue;
    if (n >= cap) break;
    out.add(e); n++;
  }
  return out;
}

/**
 * Composition layer (Darrell: moods must read in grayscale): negative-space wash, edge pressure, texture,
 * saturation / warmth / contrast, and the loud-mode fracture (tearing bands). Screen space, after the grade.
 */
export function applyComposition(ctx, w, h, comp, o = {}) {
  if (!comp) return;
  const figX = Number.isFinite(o.figX) ? o.figX : w * comp.focalU;
  const t = o.t || 0, rm = !!o.reduceMotion, chaos = rm ? Math.min(0.4, comp.chaos) : comp.chaos;
  const look = comp.cozy ? 'cozy' : comp.look;
  ctx.save();
  try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (_) { /* soft */ }
  // saturation (0 = grey, 1 = as painted)
  const desat = clamp01(1 - comp.saturation) * 0.9;
  if (desat > 0.02) { ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = desat; ctx.fillStyle = 'rgb(128,128,128)'; ctx.fillRect(0, 0, w, h); }
  // warmth (−1 cold … +1 warm)
  if (Math.abs(comp.warmth) > 0.05) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = Math.min(0.35, Math.abs(comp.warmth) * 0.3); ctx.fillStyle = comp.warmth > 0 ? 'rgb(255,170,90)' : 'rgb(90,120,170)'; ctx.fillRect(0, 0, w, h); }
  // contrast + loud punch merged into a single overlay pass
  const LA = rm ? Math.min(0.5, loudAmount(chaos)) : loudAmount(chaos);
  const ovDark = (comp.contrast > 0.6 ? (comp.contrast - 0.6) * 0.8 : 0) + (LA > 0.02 && look !== 'cozy' && look !== 'candy_pop' ? 0.35 * LA : 0);
  if (ovDark > 0.01) { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = Math.min(0.7, ovDark); ctx.fillStyle = 'rgb(48,48,48)'; ctx.fillRect(0, 0, w, h); }
  else if (comp.contrast < 0.5) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = (0.5 - comp.contrast) * 0.5; ctx.fillStyle = 'rgb(150,155,165)'; ctx.fillRect(0, 0, w, h); }
  if (LA > 0.02 && look !== 'cozy' && look !== 'candy_pop') {
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.5 * LA;
    ctx.drawImage(_vigSpr('0,0,0'), 0, 0, w, h);
  } else if (LA > 0.02 && look === 'candy_pop') { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.25 * LA; ctx.fillStyle = 'rgb(200,200,200)'; ctx.fillRect(0, 0, w, h); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const side = figX < w / 2 ? 1 : -1; // empty side = away from the figure
  if (look === 'sad') {
    // HOLLOW: the other side of the frame drains to a pale, flat wash (negative space) — kills cozy pools/animals there
    const es = clamp01(comp.emptySpace);
    const x0 = figX + side * w * 0.12, x1 = side > 0 ? w : 0;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    const a = Math.min(0.8, 0.25 + 0.7 * es) * (1 - 0.65 * LA); // loud: the pale hollow sinks into the dark (no flicker)
    g.addColorStop(0, 'rgba(112,120,132,0)'); g.addColorStop(0.3, `rgba(112,120,132,${a * 0.75})`); g.addColorStop(1, `rgba(124,130,140,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // sky drained too: a flat overcast band at the top
    const sk = ctx.createLinearGradient(0, 0, 0, h * 0.45); sk.addColorStop(0, `rgba(165,170,180,${0.35 * es})`); sk.addColorStop(1, 'rgba(165,170,180,0)');
    ctx.fillStyle = sk; ctx.fillRect(0, 0, w, h * 0.45);
    if (LA > 0.02) { // loud sad = strained: a bruised storm sky pressing down on the empty side (still isolated, no warmth)
      const sg = ctx.createLinearGradient(0, 0, 0, h * 0.7); sg.addColorStop(0, `rgba(14,18,28,${0.7 * LA})`); sg.addColorStop(1, 'rgba(14,18,28,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h * 0.7);
      const eg = ctx.createLinearGradient(x0, 0, x1, 0); eg.addColorStop(0, 'rgba(10,12,20,0)'); eg.addColorStop(1, `rgba(10,12,20,${0.45 * LA})`); ctx.fillStyle = eg; ctx.fillRect(0, 0, w, h);
      // fixmood2: loud sad = colour drains out of the world + a heavier, darker vignette closing in (cached sprite)
      ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.75 * LA; ctx.fillStyle = 'rgb(128,128,128)'; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.82 * LA;
      ctx.drawImage(_vigSpr('2,3,6'), 0, 0, w, h); ctx.globalAlpha = 1;
    }
  } else if (look === 'horror') {
    // ANXIOUS: crowded, uneven dark edges pressing in; the figure boxed
    ctx.fillStyle = 'rgba(2,3,6,0.85)';
    const press = 0.06 + 0.05 * chaos;
    for (const sd of [0, 1]) {
      ctx.beginPath(); const xe = sd ? w : 0, dir = sd ? -1 : 1;
      ctx.moveTo(xe, 0);
      for (let i = 0; i <= 10; i++) { const y = (i / 10) * h; const jag = (0.5 + 0.5 * Math.sin(i * 2.7 + sd * 3)) * w * press * (1 + (i % 3 === 0 ? 0.8 : 0)); ctx.lineTo(xe + dir * (w * press * 0.6 + jag), y); }
      ctx.lineTo(xe, h); ctx.closePath(); ctx.globalAlpha = 0.75; ctx.fill();
    }
    ctx.globalAlpha = 0.6; ctx.fillRect(0, 0, w, h * 0.05); // low ceiling
  } else if (look === 'cozy') {
    // COZY: soft warm close vignette, everything gathered in the middle
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.10; ctx.drawImage(_glowSpr('255,190,120', 0.4), 0, h * 0.1, w, h * 0.9);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.55; ctx.drawImage(_vigSpr('30,15,8'), 0, 0, w, h); ctx.globalAlpha = 1;
  } else if (look === 'cinematic') {
    // CALM: letterbox bars + balanced, smooth light (bars thin out in loud/storm scale)
    const bar = h * (0.07 - 0.03 * chaos);
    ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgb(0,0,0)'; ctx.fillRect(0, 0, w, bar); ctx.fillRect(0, h - bar, w, bar);
  } else if (look === 'ember_wasteland') {
    // ENERGIZED SHARP: diagonal slash of hard shadow + red underlight
    const ug = ctx.createLinearGradient(0, h, 0, h * 0.55); ug.addColorStop(0, `rgba(200,30,10,${0.25 + 0.25 * chaos})`); ug.addColorStop(1, 'rgba(200,30,10,0)');
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 1; ctx.fillStyle = ug; ctx.fillRect(0, h * 0.55, w, h * 0.45);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.35; ctx.fillStyle = 'rgb(0,0,0)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.35, 0); ctx.lineTo(0, h * 0.45); ctx.closePath(); ctx.fill();
    // fixmood2: the thin re-cut crack lines are gone — loudLayer draws wide glowing fissures that open on peaks
  } else if (look === 'candy_pop') {
    // ENERGIZED ROUND: bright, airy lift, round soft bloom rhythm on the beat
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.12 + 0.1 * (o.beat || 0); ctx.fillStyle = 'rgb(255,220,240)'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
  // perf: pre-rendered 128x128 grain sprite tiled across screen (replaces 220 fillRect(1,1) calls/frame)
  const ta = clamp01(comp.textureAmt) * (o.quality || 1);
  if (ta > 0.05) {
    const tile = _grainTile(), pat = ctx.createPattern(tile, 'repeat');
    if (pat) {
      ctx.globalAlpha = 0.09 + 0.11 * ta;
      const ox = -Math.floor(hash(Math.floor(t * 16)) * 64), oy = -Math.floor(hash(Math.floor(t * 16) + 7) * 64);
      ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = pat; ctx.fillRect(-ox, -oy, w, h); ctx.restore();
    }
    if (look === 'sad') { ctx.globalAlpha = 0.05 + 0.06 * ta; ctx.fillStyle = 'rgb(220,225,235)'; for (let i = 0; i < 6; i++) { const x = hash(i * 7.7 + Math.floor(t * 2)) * w; ctx.fillRect(x, 0, 1, h); } }
  }
  // perf: fast horizontal fracture slashes (eliminates ctx.drawImage(ctx.canvas) pipeline flush/readback!)
  const crack = (look === 'sad' || look === 'candy_pop' || look === 'cozy') ? 0 : Math.max(comp.crack || 0, look === 'ember_wasteland' ? chaos : look === 'horror' ? chaos * 0.4 : 0);
  if (crack > 0.08 && !rm) {
    const bands = 1 + Math.floor(crack * 3);
    for (let i = 0; i < bands; i++) {
      const r = hash(Math.floor(t * 8) * 13.1 + i * 5.3);
      const y = Math.floor(r * h * 0.7 + h * 0.05), bh = Math.max(2, Math.floor(h * (0.005 + 0.012 * hash(r + i))));
      const x0 = Math.floor(hash(r * 7) * w * 0.4), bw = Math.floor(w * (0.25 + 0.4 * hash(r + 3)));
      ctx.globalAlpha = 0.35 * crack; ctx.fillStyle = 'rgb(4,2,3)'; ctx.fillRect(x0, y, bw, bh);
      if (look === 'ember_wasteland') { ctx.globalAlpha = 0.28 * crack; ctx.fillStyle = 'rgb(255,110,40)'; ctx.fillRect(x0 + 6, y, bw * 0.7, 1.5); }
    }
  }
  ctx.restore();
}

const _kitCache = new Map();
/** Resolve the locked style's kit into painter ids. Never-list terms knock painters out. */
export function resolveKit(styleId, kitObj = null) {
  const id = normStyle(styleId);
  if (!id) return null;
  if (!kitObj && _kitCache.has(id)) return _kitCache.get(id);
  let wk = kitObj || null; // directive.styleKit (Scene stamps Worlds' kit) wins, else Worlds module
  if (!wk) { try { wk = worldsStyleKit(id); } catch (_) { wk = null; } }
  const src = wk || DEFAULT_KITS[id] || null;
  if (!src) { _kitCache.set(id, null); return null; }
  const els = new Set();
  for (const e of [...(src.elements || []), ...(src.fx || []), ...(src.motifs || []), ...((src.fauna) || [])]) for (const m of mapEl(e)) els.add(m);
  // horror: the lantern is the searcher's only warm light in every world (bot 1 order) — always on.
  if (id === 'horror') els.add('lantern');
  // cinematic: the hero's 'embers' only ride the hit (fx list) — keep; 'fire' painter not used.
  const never = new Set();
  for (const n of (src.never || [])) for (const m of mapEl(n)) never.add(m);
  for (const n of never) els.delete(n);
  for (const e of [...els]) if (neverHasText((src.never || []).map(n => String(n || '').toLowerCase()), e)) els.delete(e);
  if (id === 'horror') els.add('lantern');
  if (id === 'cozy') { if (els.has('streetlamp') || els.has('lantern')) els.add('porchlamp'); els.delete('streetlamp'); els.delete('lantern'); }
  const fig = wk?.figure || wk?.character || null;
  const neverText = (src.never || []).map(n => String(n || '').toLowerCase()).filter(Boolean);
  const out = { id, source: wk ? 'worlds' : 'visual-default', elements: els, never, neverText, figure: fig, drive: src.drive || {}, peakMax: Number.isFinite(src.peakMax) ? src.peakMax : (Number.isFinite(src.peakLimit) ? src.peakLimit : 2), arc: fig?.arc || null };
  if (!kitObj) _kitCache.set(id, out);
  return out;
}
export function clearKitCache() { _kitCache.clear(); }

/**
 * fixmood2: generic never-list gate. `name` = an FX / kit element / plate id (e.g. 'rain', 'storm', 'lightning', 'stormy_sea').
 * True when any word of the name equals any word of a never-list entry (rain ↔ 'rain', lightning ↔ 'lightning strike',
 * storm ↔ 'stormy sky'/'storm'). Word equality only, so 'fire' never blocks 'fireflies'.
 */
const NEVER_ALIAS = { rainy: 'rain', stormy: 'storm', storms: 'storm', waves: 'wave', seas: 'sea', bolt: 'lightning', bolts: 'lightning', thunder: 'lightning', downpour: 'rain', drizzle: 'rain' };
const words = (s) => String(s || '').toLowerCase().split(/[^a-z]+/).filter(Boolean).map(x => NEVER_ALIAS[x] || x);
function neverHasText(list, name) {
  const nw = words(name); if (!nw.length || !list?.length) return false;
  for (const n of list) { const ew = words(n); for (const a of nw) if (ew.includes(a)) return true; }
  return false;
}
export function neverHas(kit, name) { return !!kit && neverHasText(kit.neverText || [], name); }

const rgba = (rgb, a) => `rgba(${rgb},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
const _SK_SPR = new Map();
function _vigSpr(rgb) {
  const k = 'v:' + rgb;
  let c = _SK_SPR.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = 192; c.height = 192;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(96, 94, 48, 96, 96, 136);
  rg.addColorStop(0, `rgba(${rgb},0)`); rg.addColorStop(1, `rgba(${rgb},1)`);
  g.fillStyle = rg; g.fillRect(0, 0, 192, 192);
  _SK_SPR.set(k, c); return c;
}
function _glowSpr(rgb, midA = 0.32) {
  const k = `g:${rgb}:${midA}`;
  let c = _SK_SPR.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, `rgba(${rgb},1)`); rg.addColorStop(0.35, `rgba(${rgb},${midA})`); rg.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  _SK_SPR.set(k, c); return c;
}
function _grainTile() {
  let c = _SK_SPR.get('grain'); if (c) return c;
  c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 420; i++) {
    const r = hash(i * 1.37 + 0.17);
    g.fillStyle = r > 0.5 ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)';
    g.fillRect(Math.floor(hash(i * 9.1 + r) * 128), Math.floor(hash(i * 3.3 + r * 2) * 128), 1, 1);
  }
  _SK_SPR.set('grain', c); return c;
}

/**
 * Full-frame grade — ONE look for the whole track. Intensity only changes strength/brightness,
 * never the hue family. `painted:false` (procedural world) uses a stronger colour pass so
 * procedural members of a family match the painted ones.
 */
export function applyStyleGrade(ctx, w, h, grade, opts = {}) {
  if (!grade) return;
  const painted = opts.painted !== false;
  const inten = clamp01(opts.intensity ?? 0.5);
  ctx.save();
  try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (_) { /* soft */ }
  const desat = clamp01(grade.desat ?? 0);
  if (desat > 0.01) { ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = desat * (painted ? 0.85 : 1); ctx.fillStyle = 'rgb(128,128,128)'; ctx.fillRect(0, 0, w, h); }
  if (!painted) {
    ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = 0.42;
    ctx.fillStyle = `rgb(${grade.key})`; ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = ((grade.tint ?? 0.12) + (painted ? 0.04 : 0)) * (0.85 + 0.3 * inten);
  ctx.fillStyle = `rgb(${grade.key})`; ctx.fillRect(0, 0, w, h);
  const crush = clamp01(grade.crush ?? 0);
  if (crush > 0.01) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = crush * (1 - 0.35 * inten); ctx.fillStyle = `rgb(${grade.shadow})`; ctx.fillRect(0, 0, w, h); }
  ctx.globalCompositeOperation = 'source-over';
  const v = clamp01((grade.vignette ?? 0.3) * (0.9 + 0.25 * inten));
  ctx.globalAlpha = v; ctx.drawImage(_vigSpr(grade.shadow), 0, 0, w, h); ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * KitPainter: draws the locked kit in screen space. Layout is anchored to the figure
 * (fx, gy, H, side) so the same props sit in the same relation to the character in every world.
 * Positions of gaze-able elements are returned in `this.targets` for the renderer's gaze.
 */
export class KitPainter {
  constructor() { this.reset(); }
  reset() {
    this.st = { crows: null, crowPerch: true, crowFlyAt: -99, birds: null, birdsAt: -99, flick: 1, flickUntil: 0, ripples: [], lastKick: 0, farAt: -99, farX: 0, startle: 0, confetti: [], cracks: [], lastT: 0, lv: { v: 0, k: 0, s: 0, hh: 0, b: 0, p: 0, x: 0 } };
    this.targets = {};
    this.active = [];
  }
  /** audio → smoothed stem levels (vocals, kick, snare, hats, bass, pads, harsh). */
  _levels(audio, dt) {
    const R = audio?.roles || audio?.instruments || {};
    const n = (x) => clamp01(x);
    const raw = { v: Math.max(n(R.vocalish), n(R.vocal), n(audio?.vocal?.intensity), n(R.lead) * 0.6), k: Math.max(n(R.kick), audio?.beat ? 0.6 : 0), s: n(R.snare), hh: n(R.hats ?? R.hihat), b: Math.max(n(R.bass), n(audio?.bass)), p: Math.max(n(R.pads), n(audio?.mid) * 0.5), x: n(R.harsh) };
    const L = this.st.lv;
    for (const k of Object.keys(raw)) { const tau = (k === 'k' || k === 's') ? 0.08 : 0.5; L[k] += (raw[k] - L[k]) * (1 - Math.exp(-dt / tau)); }
    return { raw, L };
  }
  /** Spawn a flock/crow lift at a gaze target (renderer calls when a reaction targets birds). */
  spawnAt(kind, x, y, t) {
    if (kind === 'birds') this.st.birds = { t0: t, x, y, dir: x > (this._w || 0) / 2 ? -1 : 1 };
    if (kind === 'crows') { this.st.crowPerch = false; this.st.crowFlyAt = t; this.st.crowFrom = [x, y]; }
  }
  layout(L) { this._L = L; this._w = L.w; this._h = L.h; }

  /** midground: behind the figure */
  drawMid(ctx, info) {
    const { style, kit, t, audio, L } = info;
    const dt = Math.max(0, Math.min(0.1, t - (this.st.lastT || t))); this.st.lastT = t;
    const { raw, L: lv } = this._levels(audio, dt);
    this.lv = lv; this.raw = raw;
    const E0 = info.allowed || kit.elements, E = new Set([...E0].filter(e => !neverHas(kit, e))), blocked = (n) => neverHas(kit, n), g = info.grade, w = L.w, h = L.h, H = L.H, fx = L.fx, gy = L.gy, s = L.side;
    const CH = clamp01(info.chaos || 0);
    const act = [];
    const T = this.targets = {};
    ctx.save();
    try { if (info.xf) ctx.setTransform(info.xf); else ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (_) { /* soft */ } // polish6: world tilt
    const ox = (k) => Math.max(w * 0.06, Math.min(w * 0.94, fx + s * k));
    const SG = info.stormGain ?? 1;
    const LA = loudAmount(CH) * SG;
    // polish6: loud FAR layer (dense chaos behind everything, figure zone kept clear)
    try { const fa = drawChaosFar(ctx, { style, L, lv, raw, t, st: this.st, CH, stormGain: SG, q: info.quality || 1, grade: g, blocked }); if (fa) act.push(...fa); } catch (_) { /* soft */ }
    if (E.has('porchlamp')) { // cozy: a hanging porch lantern hung cleanly from the upper porch eave on the light side
      const lx = Math.max(w * 0.1, Math.min(w * 0.9, fx + s * H * 0.78)), ly = gy - H * 1.32;
      const topY = Math.min(h * 0.22, ly - H * 0.35);
      ctx.globalAlpha = 0.85; ctx.strokeStyle = 'rgb(28,18,12)'; ctx.lineWidth = Math.max(1.4, H * 0.011);
      ctx.beginPath(); ctx.moveTo(lx, topY); ctx.lineTo(lx, ly - H * 0.08); ctx.stroke();
      ctx.fillStyle = 'rgb(30,20,14)'; ctx.fillRect(lx - H * 0.045, ly - H * 0.08, H * 0.09, H * 0.02); ctx.fillRect(lx - H * 0.04, ly + H * 0.07, H * 0.08, H * 0.018);
      const warm = 0.55 + 0.3 * lv.v + 0.08 * Math.sin(t * 1.3);
      ctx.fillStyle = rgba('255,214,150', 0.95); ctx.fillRect(lx - H * 0.032, ly - H * 0.06, H * 0.064, H * 0.13);
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = warm * 0.8;
      ctx.drawImage(_glowSpr('255,186,112', 0.32), lx - H * 1.3, ly - H * 1.3, H * 2.6, H * 2.6);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      T.lantern = [lx, ly]; T.streetlamp = [lx, ly]; act.push('porchlamp');
    }
    if (E.has('window')) { // cozy: soft warm window bounce onto figure & floor (cached sprite)
      const wx = fx - s * H * 0.9, wy = gy - H * 0.95, wr = H * 1.45;
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.24 + 0.14 * lv.b + 0.06 * lv.v;
      ctx.drawImage(_glowSpr('255,182,92', 0.35), wx - wr, wy - wr, wr * 2, wr * 2);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      act.push('window');
    }
    // ---- horror ----
    if (E.has('doorway')) { // dark doorway: always dark, faint cold edge only
      const dS = 1 + 0.6 * (style === 'horror' ? LA : 0); // polish6: loud horror — the doorway looms larger
      const dx = ox(w * (0.3 + 0.04 * LA)), dw = H * 0.42 * dS, dh = H * 1.25 * dS, top = gy - dh - H * 0.04;
      const door = () => { ctx.beginPath(); ctx.moveTo(dx - dw / 2, top + dh); ctx.lineTo(dx - dw / 2, top + dw / 2); ctx.arc(dx, top + dw / 2, dw / 2, Math.PI, 0); ctx.lineTo(dx + dw / 2, top + dh); ctx.closePath(); };
      const dg = ctx.createLinearGradient(0, top, 0, top + dh); dg.addColorStop(0, 'rgb(2,3,5)'); dg.addColorStop(0.75, 'rgb(4,5,8)'); dg.addColorStop(1, rgba(g.shadow || '20,24,32', 1));
      ctx.globalAlpha = 0.9; ctx.fillStyle = dg; door(); ctx.fill();
      ctx.globalAlpha = 0.25 + 0.15 * lv.p; ctx.strokeStyle = rgba(g.rim, 0.5); ctx.lineWidth = Math.max(1, H * 0.01); door(); ctx.stroke();
      // thin cold spill on the ground in front of the door
      ctx.globalAlpha = 0.12 + 0.1 * lv.p; ctx.fillStyle = rgba(g.rim, 1); ctx.beginPath(); ctx.moveTo(dx - dw / 2, top + dh); ctx.lineTo(dx + dw / 2, top + dh); ctx.lineTo(dx + dw * 0.9, top + dh + H * 0.08); ctx.lineTo(dx - dw * 0.9, top + dh + H * 0.08); ctx.closePath(); ctx.fill();
      T.doorway = [dx, top + dh * 0.45]; act.push('doorway');
      if (E.has('handprints')) { ctx.globalAlpha = 0.28; ctx.fillStyle = rgba(g.mist, 1); for (let i = 0; i < 3; i++) { const hx = dx + dw * (0.62 + 0.12 * i), hy = top + dh * (0.35 + 0.1 * i); ctx.beginPath(); ctx.ellipse(hx, hy, H * 0.018, H * 0.024, 0.2, 0, 6.283); ctx.fill(); } act.push('handprints'); }
    }
    if (E.has('far_figure')) { // distant second silhouette — appears, then gone (bass swells)
      if (lv.b > 0.55 && t - this.st.farAt > 22) { this.st.farAt = t; this.st.farX = ox(-w * 0.32); }
      const age = t - this.st.farAt;
      if (age < 4) { const a = Math.sin(Math.min(1, age / 4) * Math.PI) * 0.55; const fh = H * 0.45, xx = this.st.farX, yy = gy - H * 0.22; ctx.globalAlpha = a; ctx.fillStyle = 'rgb(6,7,10)'; ctx.fillRect(xx - fh * 0.09, yy - fh, fh * 0.18, fh); ctx.beginPath(); ctx.arc(xx, yy - fh - fh * 0.07, fh * 0.07, 0, 6.283); ctx.fill(); T.far_figure = [xx, yy - fh * 0.8]; }
      act.push('far_figure');
    }
    // ---- cinematic ----
    if (E.has('landmark')) { // same horizon tower in every world; bass = glow
      const lx = w * 0.5 + s * w * 0.27, base = gy - H * 0.55, th = H * 1.7;
      ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(8,16,20,0.9)';
      ctx.beginPath(); ctx.moveTo(lx - th * 0.07, base); ctx.lineTo(lx - th * 0.035, base - th * 0.8); ctx.lineTo(lx, base - th); ctx.lineTo(lx + th * 0.035, base - th * 0.8); ctx.lineTo(lx + th * 0.07, base); ctx.closePath(); ctx.fill();
      const gl = ctx.createRadialGradient(lx, base - th, 0, lx, base - th, th * 0.35);
      gl.addColorStop(0, rgba(g.accent || g.key, 0.35 + 0.5 * lv.b)); gl.addColorStop(1, rgba(g.accent || g.key, 0));
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 1; ctx.fillStyle = gl; ctx.fillRect(lx - th, base - th * 1.4, th * 2, th * 0.8); ctx.globalCompositeOperation = 'source-over';
      T.landmark = [lx, base - th * 0.85]; act.push('landmark');
    }
    if (E.has('beams')) { // light shafts from the high corner opposite the figure (pads)
      const sx = s > 0 ? w * 0.92 : w * 0.08, sy = -h * 0.05;
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 3; i++) {
        const tx = fx + s * (w * 0.05 + i * w * 0.07), a = (0.06 + 0.1 * lv.p) * (1 - i * 0.25);
        const gr = ctx.createLinearGradient(sx, sy, tx, gy); gr.addColorStop(0, rgba(g.key, a)); gr.addColorStop(1, rgba(g.key, 0));
        ctx.fillStyle = gr; ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(sx - w * 0.02, sy); ctx.lineTo(sx + w * 0.02, sy); ctx.lineTo(tx + w * 0.06, gy); ctx.lineTo(tx - w * 0.06, gy); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      T.beams = [sx * 0.7 + fx * 0.3, h * 0.12]; act.push('beams');
    }
    // ---- sad ----
    if (E.has('streetlamp')) { // the one warm light: vocals brighten, bass slow pulse
      const lx = ox(w * 0.24), top = gy - H * 2.2;
      ctx.globalAlpha = 0.95; ctx.strokeStyle = 'rgb(10,12,18)'; ctx.lineWidth = Math.max(2, H * 0.03);
      ctx.beginPath(); ctx.moveTo(lx, gy); ctx.lineTo(lx, top); ctx.lineTo(lx - s * H * 0.18, top); ctx.stroke();
      const hx = lx - s * H * 0.18, hy = top + H * 0.05;
      const lampCol = info.warmLight === false ? g.rim : (g.accent || '255,200,140');
      const warm = 0.35 + 0.45 * lv.v + 0.15 * Math.sin(t * 0.8) * lv.b + (info.swell || 0) * 0.4;
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, H * 1.1);
      hg.addColorStop(0, rgba(lampCol, Math.min(0.9, warm))); hg.addColorStop(0.25, rgba(lampCol, warm * 0.25)); hg.addColorStop(1, rgba(lampCol, 0));
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = hg; ctx.globalAlpha = 1; ctx.fillRect(hx - H * 1.2, hy - H * 1.2, H * 2.4, H * 2.4); ctx.globalCompositeOperation = 'source-over';
      T.streetlamp = [hx, hy]; act.push('streetlamp');
    }
    if (E.has('bench')) { // empty bench beside the figure (back part; seat drawn in fg)
      const bx = fx + s * H * 0.55, bw = H * 0.6, sy = gy - H * 0.24;
      ctx.globalAlpha = 0.95; ctx.fillStyle = 'rgb(12,13,18)';
      ctx.fillRect(bx - bw / 2, sy - H * 0.22, bw, H * 0.05); ctx.fillRect(bx - bw / 2, sy - H * 0.12, bw, H * 0.04);
      ctx.fillRect(bx - bw / 2, sy, bw, H * 0.05); ctx.fillRect(bx - bw * 0.45, sy, H * 0.03, H * 0.24); ctx.fillRect(bx + bw * 0.42, sy, H * 0.03, H * 0.24);
      T.bench = [bx, sy]; act.push('bench');
      if (E.has('umbrella')) { // closed umbrella left leaning on the bench (hands stay in pockets)
        ctx.strokeStyle = 'rgb(16,18,26)'; ctx.lineWidth = Math.max(1.5, H * 0.02); const ux = bx + s * bw * 0.52;
        ctx.beginPath(); ctx.moveTo(ux, gy); ctx.lineTo(ux - s * H * 0.12, gy - H * 0.5); ctx.stroke();
        ctx.fillStyle = 'rgb(16,18,26)'; ctx.beginPath(); ctx.moveTo(ux - s * H * 0.12, gy - H * 0.5); ctx.lineTo(ux - s * H * 0.06, gy - H * 0.18); ctx.lineTo(ux - s * H * 0.01, gy - H * 0.2); ctx.closePath(); ctx.fill();
        act.push('umbrella');
      }
    }
    // ---- heavy ----
    if (E.has('beast')) { // polish6: towering smoke beast (Chernabog / Balrog) — see loudLayer.drawBeast
      // fixmood2: short screen jolt on loud peaks (beast + ground shake together; never under reduce-motion)
      const fa0 = t - (this.st.fissAt ?? -9), shk = (!info.reduceMotion && LA > 0.02 && fa0 < 0.35) ? H * 0.035 * LA * (1 - fa0 / 0.35) : 0;
      ctx.save(); if (shk > 0.3) ctx.translate((hash(t * 61.7) - 0.5) * 2 * shk, (hash(t * 47.3 + 5) - 0.5) * 1.4 * shk);
      const r = drawBeast(ctx, { L, lv, raw, t, st: this.st, CH, q: info.quality || 1, grade: g, blocked, reduceMotion: !!info.reduceMotion });
      T.beast = r.eye; this.beastState = r.kind; act.push('beast'); if (E.has('horns')) act.push('horns'); if (E.has('eyes')) act.push('eyes');
      try { const hf = drawHeavyFront(ctx, { L, lv, raw, t, st: this.st, CH, stormGain: SG, eye: r.eye, q: info.quality || 1, blocked, reduceMotion: !!info.reduceMotion }); if (hf?.act?.length) act.push(...hf.act); if (shk > 0.3) act.push('shake'); } catch (_) { /* soft */ }
      ctx.restore();
    }
    if (E.has('pillars')) { ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgb(7,4,4)'; for (const k of [-0.44, 0.44]) { const px = Math.max(w * 0.03, Math.min(w * 0.97, fx + k * w)), ph = H * 0.95; ctx.beginPath(); ctx.moveTo(px - H * 0.1, gy); ctx.lineTo(px - H * 0.08, gy - ph); ctx.lineTo(px, gy - ph * 0.84); ctx.lineTo(px + H * 0.05, gy - ph * 0.92); ctx.lineTo(px + H * 0.1, gy); ctx.closePath(); ctx.fill(); } act.push('pillars'); }
    if (E.has('chains')) { const cx = ox(w * 0.38); ctx.strokeStyle = rgba(g.rim, 0.32); ctx.lineWidth = Math.max(1, H * 0.01); const sw = Math.sin(t * 3) * H * 0.04 * (0.3 + lv.s); for (let i = 0; i < 12; i++) { const yy = i * H * 0.075; ctx.beginPath(); ctx.ellipse(cx + sw * (i / 12), yy, H * 0.018, H * 0.03, 0, 0, 6.283); ctx.stroke(); } act.push('chains'); }
    if (E.has('cracks') && (style !== 'ember_wasteland' || SG > 0.03)) {
      const cG = style === 'ember_wasteland' ? SG : 1;
      if (cG > 0.3 && raw.k > 0.6 - 0.2 * CH && t - this.st.lastKick > 0.35 - 0.15 * CH) { this.st.lastKick = t; this.st.cracks.push({ t0: t, x: fx + (hash(t) - 0.5) * w * (0.5 + 0.5 * CH), seed: t }); if (this.st.cracks.length > 6 + 10 * CH) this.st.cracks.shift(); }
      for (const c of this.st.cracks) { const age = t - c.t0, a = Math.max(0, 1 - age / 3) * cG; if (a <= 0.02) continue; ctx.globalAlpha = a; ctx.strokeStyle = 'rgb(255,110,40)'; ctx.lineWidth = Math.max(1, H * 0.012); ctx.beginPath(); let x = c.x, y = gy + 2; ctx.moveTo(x, y); for (let i = 0; i < 6; i++) { x += (hash(c.seed + i) - 0.5) * H * 0.4; y += H * 0.02; ctx.lineTo(x, y); } ctx.stroke(); }
      act.push('cracks');
    }
    // ---- happy ----
    if (E.has('sun')) { const sx = s > 0 ? w * 0.84 : w * 0.16, sy = h * 0.16, r = H * 0.45 * (1 + 0.15 * lv.b); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.92; ctx.drawImage(_glowSpr('255,236,150', 0.4), sx - r * 2.2, sy - r * 2.2, r * 4.4, r * 4.4); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; T.sun = [sx, sy]; act.push('sun'); }
    if (E.has('balloons')) { const cols = ['255,90,170', '90,200,255', '255,220,80', '160,120,255']; for (let i = 0; i < 4; i++) { const bx = ox(w * (0.22 + 0.07 * i)), by = gy - H * (1.4 + 0.2 * (i % 2)) + Math.sin(t * 1.4 + i) * H * 0.04 * (1 + lv.s * 2); ctx.globalAlpha = 0.9; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by + H * 0.12); ctx.lineTo(bx + Math.sin(t + i) * 4, by + H * 0.6); ctx.stroke(); ctx.fillStyle = `rgb(${cols[i]})`; ctx.beginPath(); ctx.ellipse(bx, by, H * 0.09, H * 0.12, 0, 0, 6.283); ctx.fill(); } T.balloons = [ox(w * 0.3), gy - H * 1.5]; act.push('balloons'); }
    if (E.has('flowers')) { const cols = ['255,120,180', '255,230,90', '140,200,255']; for (let i = 0; i < 9; i++) { const x = fx + (i - 4) * H * 0.22 + s * H * 0.1, y = gy + H * 0.02 + (i % 2) * H * 0.03; ctx.globalAlpha = 0.95; ctx.fillStyle = `rgb(${cols[i % 3]})`; ctx.beginPath(); ctx.arc(x, y - H * 0.05, H * 0.03, 0, 6.283); ctx.fill(); } act.push('flowers'); }
    if (E.has('stringlights')) { // cozy: warm bulbs strung across the top, grouped close (vocals glow)
      ctx.strokeStyle = 'rgba(30,20,14,0.8)'; ctx.lineWidth = 1; ctx.beginPath();
      const y0 = h * 0.2, sag = h * 0.05; for (let i = 0; i <= 20; i++) { const x = (i / 20) * w, y = y0 + Math.sin((i / 20) * Math.PI) * sag; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.globalAlpha = 0.8; ctx.stroke();
      ctx.globalCompositeOperation = 'screen';
      const slSpr = _glowSpr('255,200,120', 0.35);
      for (let i = 1; i < 20; i++) { const x = (i / 20) * w, y = y0 + Math.sin((i / 20) * Math.PI) * sag + 3; ctx.globalAlpha = 0.4 + 0.4 * lv.v + 0.15 * Math.sin(t * 2 + i); ctx.drawImage(slSpr, x - H * 0.12, y - H * 0.12, H * 0.24, H * 0.24); }
      ctx.globalCompositeOperation = 'source-over'; T.stringlights = [w / 2, y0 + sag]; act.push('stringlights');
    }
    // ---- shared fauna ----
    if (E.has('crows')) {
      // crows perch on the doorway/lamp line; snare/kick (drums) → take off (the renderer gazes at them)
      const perch = T.doorway ? [T.doorway[0], T.doorway[1] - H * 0.7] : [ox(w * 0.3), gy - H * 1.4];
      if (this.st.crowPerch && (raw.s > 0.7 - 0.25 * CH || raw.x > 0.7) && t - this.st.crowFlyAt > 14 - 10 * CH) { this.st.crowPerch = false; this.st.crowFlyAt = t; this.st.crowFrom = perch; this.st.crowEvent = t; }
      const age = t - this.st.crowFlyAt;
      if (!this.st.crowPerch && age > 9) this.st.crowPerch = true;
      ctx.fillStyle = 'rgb(6,6,8)'; ctx.strokeStyle = 'rgb(6,6,8)'; ctx.lineWidth = Math.max(1, H * 0.014);
      const nCrow = 4 + Math.round(CH * 8);
      for (let i = 0; i < nCrow; i++) {
        let x, y;
        if (this.st.crowPerch && i >= 4) continue;
        if (this.st.crowPerch) { x = perch[0] + (i - 1.5) * H * 0.1; y = perch[1]; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.ellipse(x, y, H * 0.03, H * 0.022, 0, 0, 6.283); ctx.fill(); }
        else { const k = age / 9, f = this.st.crowFrom || perch; x = f[0] + (i - 1.5) * H * 0.12 + (s > 0 ? 1 : -1) * k * w * 0.6; y = f[1] - k * h * 0.4 - Math.sin(i + t) * H * 0.04; const fl = Math.sin(t * 12 + i) * H * 0.04; ctx.globalAlpha = Math.max(0, 1 - k); ctx.beginPath(); ctx.moveTo(x - H * 0.05, y - fl); ctx.lineTo(x, y); ctx.lineTo(x + H * 0.05, y - fl); ctx.stroke(); }
        if (i === 1) T.crows = [x, y];
      }
      act.push('crows');
    }
    if (E.has('birds')) { // far flock crossing (cinematic)
      if (!this.st.birds && t - this.st.birdsAt > 26) this.st.birds = { t0: t, x: s > 0 ? -w * 0.05 : w * 1.05, y: h * (0.12 + hash(t) * 0.12), dir: s > 0 ? 1 : -1 };
      const B = this.st.birds;
      if (B) { const k = (t - B.t0) / 10; if (k > 1) { this.st.birds = null; this.st.birdsAt = t; } else { ctx.strokeStyle = 'rgba(14,20,24,0.8)'; ctx.lineWidth = 1.2; ctx.globalAlpha = Math.sin(k * Math.PI); for (let i = 0; i < 7; i++) { const x = B.x + B.dir * k * w * 0.9 - B.dir * Math.ceil(i / 2) * 10, y = B.y + Math.ceil(i / 2) * 5 * (i % 2 ? 1 : -1); const fl = Math.sin(t * 8 + i) * 2.4; ctx.beginPath(); ctx.moveTo(x - 3.4, y - fl); ctx.lineTo(x, y); ctx.lineTo(x + 3.4, y - fl); ctx.stroke(); } T.birds = [B.x + B.dir * k * w * 0.9, B.y]; } }
      act.push('birds');
    }
    ctx.restore();
    this.active = act;
  }

  /** foreground: in front of the figure (particles, fog, reflections, lantern glow etc.) */
  drawFg(ctx, info) {
    const { kit, t, L, hands, quality = 1 } = info;
    const E0 = info.allowed || kit.elements, E = new Set([...E0].filter(e => !neverHas(kit, e))), blocked = (n) => neverHas(kit, n), g = info.grade, w = L.w, h = L.h, H = L.H, fx = L.fx, gy = L.gy, s = L.side;
    const CH = clamp01(info.chaos || 0), flash = typeof info.flash === 'function' ? info.flash : () => false;
    const lv = this.lv || { v: 0, k: 0, s: 0, hh: 0, b: 0, p: 0, x: 0 }, raw = this.raw || lv;
    const q = Math.max(0.5, Math.min(1, quality));
    const act = this.active.slice();
    const T = this.targets;
    ctx.save();
    try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (_) { /* soft */ }
    if (info.style === 'horror' && hands) { const la = loudAmount(CH); if (la > 0.02) drawHardShadow(ctx, { L, lantern: hands.lantern || hands.R, a: la, stutter: t < this.st.flickUntil }); }
    if (E.has('lantern') && hands && info.style !== 'cozy') { // the searcher's only warm light; vocals brighten, hats flicker, startle gutters
      const hp = hands.lantern || hands.R; const lx = hp[0], ly = hp[1] + H * 0.08;
      if ((raw.hh > 0.6 && Math.random() < 0.25) || (CH > 0.4 && Math.random() < 0.08 * CH)) this.st.flickUntil = t + 0.08;
      const LAh = info.style === 'horror' ? loudAmount(CH) : 0;
      if (LAh > 0.1 && Math.random() < 0.06 * LAh) this.st.flickUntil = t + 0.12; // loud: the flame stutters
      const fl = t < this.st.flickUntil ? (LAh > 0.1 ? 0.12 : 0.35) : 1;
      const a = (0.35 + 0.55 * lv.v) * fl * (info.startle ? 0.4 : 1) * (1 + 0.5 * LAh);
      ctx.strokeStyle = 'rgb(10,10,12)'; ctx.lineWidth = Math.max(1, H * 0.01); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(hp[0], hp[1]); ctx.lineTo(lx, ly - H * 0.03); ctx.stroke();
      ctx.fillStyle = 'rgb(20,16,12)'; ctx.fillRect(lx - H * 0.025, ly - H * 0.03, H * 0.05, H * 0.07);
      const gr = ctx.createRadialGradient(lx, ly, 0, lx, ly, H * 0.9);
      gr.addColorStop(0, rgba(g.accent || '255,196,110', Math.min(1, a + 0.2))); gr.addColorStop(0.15, rgba(g.accent || '255,196,110', a * 0.45)); if (LAh > 0.1) { gr.addColorStop(0.42, rgba(g.accent || '255,196,110', a * 0.3)); gr.addColorStop(0.47, rgba(g.accent || '255,196,110', 0)); } gr.addColorStop(1, rgba(g.accent || '255,196,110', 0));
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = gr; ctx.fillRect(lx - H, ly - H, H * 2, H * 2); ctx.globalCompositeOperation = 'source-over';
      T.lantern = [lx, ly]; act.push('lantern');
    }
    if (E.has('letter') && hands && info.letter) { const hp = hands.L; ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgb(230,226,214)'; ctx.save(); ctx.translate(hp[0], hp[1]); ctx.rotate(-0.3); ctx.fillRect(-H * 0.03, -H * 0.02, H * 0.06, H * 0.045); ctx.restore(); act.push('letter'); }
    if (E.has('puddles')) { // wet reflections + kick ripples
      ctx.globalAlpha = 0.28; const rg = ctx.createLinearGradient(0, gy, 0, gy + H * 0.5); rg.addColorStop(0, rgba(g.mist, 0.35)); rg.addColorStop(1, rgba(g.mist, 0));
      ctx.fillStyle = rg; ctx.fillRect(fx - H * 0.8, gy, H * 1.6 + Math.abs(s) * 0, H * 0.5);
      if (T.streetlamp) { ctx.globalAlpha = 0.3 + 0.3 * lv.v; ctx.fillStyle = rgba(g.accent || '255,200,140', 0.6); ctx.fillRect(T.streetlamp[0] - H * 0.03, gy + H * 0.02, H * 0.06, H * 0.45); }
      if (raw.k > 0.55 && t - this.st.lastKick > 0.4) { this.st.lastKick = t; this.st.ripples.push({ t0: t, x: fx + (hash(t) - 0.5) * H * 1.6 }); if (this.st.ripples.length > 8) this.st.ripples.shift(); }
      ctx.strokeStyle = rgba(g.rim, 0.7); ctx.lineWidth = 1;
      for (const r of this.st.ripples) { const k = (t - r.t0) / 1.8; if (k > 1) continue; ctx.globalAlpha = (1 - k) * 0.6; ctx.beginPath(); ctx.ellipse(r.x, gy + H * 0.06, H * 0.05 + k * H * 0.35, (H * 0.05 + k * H * 0.35) * 0.22, 0, 0, 6.283); ctx.stroke(); }
      T.puddles = [fx + s * H * 0.3, gy + H * 0.08]; act.push('puddles');
    }
    if (E.has('bench') && T.bench) { /* bench already behind; nothing in front */ }
    const SG = info.stormGain ?? 1;
    if (E.has('rain') && (info.style !== 'ember_wasteland' || SG > 0.03)) { // hats density, snare gusts; stripped in heavy quiet
      // fixmood2: loud SAD rain = heavier + SLOWER + longer (weight, not speed); no wind-whipped slant
      const sadL = info.style === 'sad' ? loudAmount(CH) : 0;
      const n = Math.floor((50 + 90 * lv.hh + 60 * (info.swell || 0)) * q * (1 + 2.2 * CH) * (info.motion ?? 1)), gust = sadL > 0 ? 0.12 + 0.2 * lv.s : 0.15 + 0.5 * lv.s + 0.8 * CH;
      const rSpd = 1 - 0.45 * sadL, rLen = 14 + 18 * sadL;
      const rSG = info.style === 'ember_wasteland' ? SG : 1;
      ctx.strokeStyle = rgba(g.mist, 0.55 + 0.15 * sadL); ctx.lineWidth = 1 + 0.7 * sadL; ctx.globalAlpha = 0.55 * rSG;
      ctx.beginPath();
      const hollow = info.style === 'sad' && CH < 0.3; // quiet sad: rain falls around the figure, the empty side stays empty
      for (let i = 0; i < n; i++) { if (hollow && Math.abs(((hash(i) * 1.2 * w) % w) - fx) > w * 0.3) continue; const x = ((hash(i) * 1.2 * w) + t * 80 * gust) % (w * 1.1) - w * 0.05, y = ((hash(i + 99) * h) + t * (700 + (i % 5) * 60) * rSpd) % (h + 30) - 15; ctx.moveTo(x, y); ctx.lineTo(x - gust * 6, y + rLen); }
      ctx.stroke();
      // rain on the figure's shoulders
      ctx.fillStyle = rgba(g.rim, 0.6); for (let i = 0; i < 6; i++) { const k = (t * 2 + i / 6) % 1; ctx.globalAlpha = 0.5 * (1 - k); ctx.fillRect(fx + (hash(i) - 0.5) * H * 0.3, gy - H * 0.85 + k * H * 0.25, 1, 2); }
      act.push('rain');
    }
    if (E.has('fog')) {
      const dens = 0.12 + 0.25 * lv.p + 0.2 * lv.b + 0.15 * raw.k, fSpr = _glowSpr(g.mist, 0.35);
      for (let i = 0; i < 3; i++) { const yy = gy - H * 0.15 + i * H * 0.12, xx = ((t * (8 + i * 5) + i * w * 0.4) % (w * 1.6)) - w * 0.3; const R = w * 0.6, ry = Math.min(R * 0.5, H * 0.5); ctx.globalAlpha = dens * (1 - i * 0.2); ctx.drawImage(fSpr, xx - R, yy - ry, R * 2, ry * 2); }
      act.push('fog');
    }
    if (E.has('dust')) { const n = Math.min(40, Math.floor((18 + 18 * lv.b) * q * (1 + CH))); ctx.fillStyle = rgba(g.key, 0.8); ctx.globalAlpha = 0.24; for (let i = 0; i < n; i++) { const r0 = hash(i * 3.1), x = (r0 * w + Math.sin(t * 0.2 + i) * 20 + t * 5) % w, y = h * (0.1 + hash(i * 7.7) * 0.8) + Math.cos(t * 0.3 + i) * 10; ctx.fillRect(x, y, 1.4, 1.4); } act.push('dust'); }
    if (E.has('embers') || E.has('ash')) {
      const heavyQ = info.style === 'ember_wasteland' ? (0.35 + 0.65 * SG) : 1;
      const n = Math.min(56, Math.floor((14 + 24 * lv.hh + 26 * raw.k * (E.has('cracks') ? 1 : 0.3)) * q * (0.6 + 1.1 * CH) * heavyQ));
      const hasAsh = E.has('ash') && SG > 0.15, acc = g.accent || '255,120,40';
      const riseSpan = info.style === 'ember_wasteland' ? (0.36 + 0.59 * SG) : 0.95; // light ember floor in heavy quiet
      for (let buck = 0; buck < (hasAsh ? 2 : 1); buck++) {
        ctx.fillStyle = buck ? 'rgb(150,140,140)' : `rgb(${acc})`; ctx.globalAlpha = 0.42 + 0.24 * heavyQ;
        for (let i = 0; i < n; i++) { if (hasAsh && ((i % 3 === 0) ? 1 : 0) !== buck) continue; const r0 = hash(i * 1.7), life = (t * (0.06 + r0 * 0.08) + r0) % 1, x = (r0 * w + Math.sin(t + i) * 16) % w, y = h * (1.01 - life * riseSpan); ctx.fillRect(x, y, 1.7, 1.7); }
      }
      act.push(E.has('embers') ? 'embers' : 'ash');
    }
    if (info.style === 'ember_wasteland' && CH > 0.3) {
      const n = Math.min(18, Math.floor(18 * CH * q)); ctx.fillStyle = 'rgb(14,8,8)'; ctx.globalAlpha = 0.78;
      for (let i = 0; i < n; i++) { const r0 = hash(i * 4.1), life = (t * (0.4 + r0 * 0.6) + r0) % 1, x = fx + (r0 - 0.5) * w * 1.2 + life * w * 0.5 * (i % 2 ? 1 : -1), y = gy - life * h * 0.7 + life * life * h * 0.4, sz = H * (0.03 + 0.05 * hash(i)), cs = Math.cos(t * 6 + i), sn = Math.sin(t * 6 + i); ctx.beginPath(); ctx.moveTo(x - sz * cs, y - sz * sn); ctx.lineTo(x + sz * 0.3 * cs + sz * 0.7 * sn, y + sz * 0.3 * sn - sz * 0.7 * cs); ctx.lineTo(x + sz * cs - sz * 0.4 * sn, y + sz * sn + sz * 0.4 * cs); ctx.closePath(); ctx.fill(); }
      act.push('debris');
    }
    if (E.has('leaves')) { const n = Math.min(18, Math.floor((8 + 10 * lv.p) * q * (1 + CH))); ctx.globalAlpha = 0.75; for (let b = 0; b < 2; b++) { ctx.fillStyle = b ? 'rgb(200,110,50)' : 'rgb(230,160,70)'; for (let i = b; i < n; i += 2) { const r0 = hash(i * 2.3), life = (t * (0.05 + r0 * 0.05) + r0) % 1, x = (r0 * w + Math.sin(t * 0.8 + i) * 30 + life * w * 0.2) % w, y = h * (life * 1.05 - 0.02); ctx.fillRect(x - 2, y - 1, 4, 2); } } act.push('leaves'); }
    if (E.has('confetti')) { const cap = Math.floor(140 * q); if (raw.k > 0.6 - 0.25 * CH && this.st.confetti.length < cap) { if (CH > 0.5 && info.flashCtx) info.flashCtx(['rgba(255,90,170,', 'rgba(90,200,255,', 'rgba(255,220,80,'][Math.floor(t * 3) % 3], 0.16 * CH); for (let i = 0; i < 10 + Math.round(16 * CH); i++) { if (this.st.confetti.length >= cap) break; this.st.confetti.push({ x: Math.random() * w, y: -10, vy: 60 + Math.random() * 80, vx: (Math.random() - 0.5) * 40, c: i % 4, r: Math.random() * 6 }); } } const cols = ['255,90,170', '90,200,255', '255,220,80', '160,255,150']; const dt = 0.016, arr = this.st.confetti; ctx.globalAlpha = 0.9; for (let b = 0; b < 4; b++) { ctx.fillStyle = `rgb(${cols[b]})`; for (let i = arr.length - 1; i >= 0; i--) { const p = arr[i]; if (b === 0) { p.y += p.vy * dt; p.x += p.vx * dt + Math.sin(t * 3 + p.r) * 0.6; if (p.y >= h + 10) { arr[i] = arr[arr.length - 1]; arr.pop(); continue; } } if (p.c !== b) continue; ctx.fillRect(p.x - 2.5, p.y - 1.5, 5, 3); } } act.push('confetti'); }
    if (E.has('sparkles') || E.has('lightdots')) { const n = Math.floor((14 + 30 * Math.max(lv.v, lv.s)) * q); ctx.fillStyle = 'rgb(255,250,220)'; for (let i = 0; i < n; i++) { const x = fx + (hash(i) - 0.5) * w * 0.6, y = gy - H * (0.2 + hash(i + 5) * 1.6); const tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 2.1); ctx.globalAlpha = tw * 0.8; ctx.beginPath(); ctx.arc(x, y, 1.4 + tw, 0, 6.283); ctx.fill(); } act.push('sparkles'); }
    // polish6: loud NEAR layer + outer-frame damage (on top, sparse, figure zone clear)
    try { const na = drawChaosNear(ctx, { style: info.style, L, raw, t, st: this.st, CH, stormGain: SG, q, reduceMotion: !!info.reduceMotion, blocked }); if (na) act.push(...na); } catch (_) { /* soft */ }
    ctx.restore();
    this.active = [...new Set(act)];
  }
}
