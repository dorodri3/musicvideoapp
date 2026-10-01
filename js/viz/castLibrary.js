/**
 * Visual Engine CAST + OUTFITS draw library.
 * Scene Director owns intent (js/director/*); this module resolves look + draws.
 * Phone-friendly Canvas2D — simple paths, max ~6 figures, no heavy per-pixel.
 */

export const ARCHETYPE_IDS = [
  'nature_fauna',
  'pastoral_walker',
  'sacred_solitary',
  'neon_runner',
  'pop_candy',
  'formation_crew',
  'tableau_figure',
  'fg_performer',
  'chaos_fracture',
  'ash_survivor',
  'dread_sparse',
  'void_presence',
  'spoken_intimate',
  'cosmic_dissolve'
];

export const OUTFIT_IDS = [
  'linen_dawn',
  'moss_trail',
  'water_gloss',
  'after_hours_red',
  'neon_trim',
  'highway_dust',
  'chrome_candy',
  'stage_gloss',
  'color_block_crew',
  'fracture_rag',
  'industrial_hazard',
  'ember_coat',
  'dread_coat',
  'pale_void',
  'threshold',
  'room_clothes',
  'desk_lamp',
  'empty_chair',
  'aisle_linen',
  'star_dust'
];

export const STYLES = ['silhouette', 'neon', 'dream'];

/** @type {Record<string, object>} */
export const OUTFITS = {
  linen_dawn: {
    palette: { fill: 'rgba(28,24,20,0.9)', rim: 'rgba(255,230,200,0.55)', accent: 'rgba(255,214,170,0.4)', shadow: 'rgba(20,16,12,0.5)' },
    accessories: ['coat'],
    shape: { bodyW: 16.2, bodyH: 48.6, headR: 9.45, lean: 0, torn: 0, cloak: 0, longCoat: true },
    rimRoughness: 0.15,
    keyLight: 'warm_soft'
  },
  moss_trail: {
    palette: { fill: 'rgba(18,28,18,0.92)', rim: 'rgba(120,160,90,0.5)', accent: 'rgba(90,130,70,0.35)', shadow: 'rgba(10,18,10,0.55)' },
    accessories: ['hood', 'cloak'],
    shape: { bodyW: 17.55, bodyH: 48.6, headR: 9.45, lean: 0, torn: 0, cloak: 0.7 },
    rimRoughness: 0.25
  },
  water_gloss: {
    palette: { fill: 'rgba(14,20,28,0.9)', rim: 'rgba(160,200,230,0.6)', accent: 'rgba(120,180,220,0.45)', shadow: 'rgba(8,12,20,0.5)' },
    accessories: ['trim'],
    shape: { bodyW: 14.85, bodyH: 48.6, headR: 8.78, lean: 0, torn: 0, cloak: 0 },
    rimRoughness: 0.1
  },
  after_hours_red: {
    palette: { fill: 'rgba(10,8,12,0.94)', rim: 'rgba(220,40,50,0.7)', accent: 'rgba(180,30,40,0.5)', shadow: 'rgba(6,4,8,0.6)' },
    accessories: ['coat'],
    shape: { bodyW: 17.55, bodyH: 51.3, headR: 9.45, lean: 0.08, torn: 0, cloak: 0, longCoat: true },
    rimRoughness: 0.2
  },
  neon_trim: {
    palette: { fill: 'rgba(6,8,12,0.95)', rim: 'rgba(80,255,230,0.95)', accent: 'rgba(255,60,180,0.7)', shadow: 'rgba(4,6,10,0.55)' },
    accessories: ['trim', 'coat'],
    shape: { bodyW: 14.85, bodyH: 48.6, headR: 8.78, lean: 0.12, torn: 0, cloak: 0 },
    rimRoughness: 0.05
  },
  highway_dust: {
    palette: { fill: 'rgba(22,18,14,0.92)', rim: 'rgba(200,170,120,0.45)', accent: 'rgba(160,130,90,0.35)', shadow: 'rgba(14,10,8,0.55)' },
    accessories: ['coat'],
    shape: { bodyW: 17.55, bodyH: 48.6, headR: 9.45, lean: 0.15, torn: 0.1, cloak: 0 },
    rimRoughness: 0.35
  },
  chrome_candy: {
    palette: { fill: 'rgba(30,16,40,0.9)', rim: 'rgba(255,140,220,0.95)', accent: 'rgba(120,255,220,0.7)', shadow: 'rgba(20,8,28,0.5)' },
    accessories: ['coat', 'trim'],
    shape: { bodyW: 16.2, bodyH: 45.9, headR: 10.12, lean: 0.05, torn: 0, cloak: 0 },
    rimRoughness: 0.08
  },
  stage_gloss: {
    palette: { fill: 'rgba(16,12,20,0.92)', rim: 'rgba(255,230,180,0.75)', accent: 'rgba(255,200,120,0.55)', shadow: 'rgba(10,8,14,0.55)' },
    accessories: ['coat', 'trim'],
    shape: { bodyW: 17.0, bodyH: 49.5, headR: 9.45, lean: 0.08, torn: 0, cloak: 0 },
    rimRoughness: 0.12
  },
  color_block_crew: {
    palette: { fill: 'rgba(12,14,22,0.92)', rim: 'rgba(80,160,255,0.7)', accent: 'rgba(255,90,120,0.6)', shadow: 'rgba(8,8,14,0.55)' },
    accessories: ['trim'],
    shape: { bodyW: 16.2, bodyH: 48.6, headR: 9.45, lean: 0.04, torn: 0, cloak: 0 },
    rimRoughness: 0.1
  },
  fracture_rag: {
    palette: { fill: 'rgba(24,18,14,0.9)', rim: 'rgba(180,140,100,0.45)', accent: 'rgba(140,100,70,0.35)', shadow: 'rgba(16,12,10,0.55)' },
    accessories: ['torn'],
    shape: { bodyW: 18.9, bodyH: 45.9, headR: 8.78, lean: 0.2, torn: 0.85, cloak: 0 },
    rimRoughness: 0.7
  },
  industrial_hazard: {
    palette: { fill: 'rgba(18,20,18,0.94)', rim: 'rgba(180,200,80,0.55)', accent: 'rgba(100,120,60,0.4)', shadow: 'rgba(10,12,10,0.6)' },
    accessories: ['coat', 'trim'],
    shape: { bodyW: 18.9, bodyH: 48.6, headR: 9.45, lean: 0, torn: 0.15, cloak: 0 },
    rimRoughness: 0.4
  },
  ember_coat: {
    palette: { fill: 'rgba(16,12,10,0.94)', rim: 'rgba(255,100,40,0.75)', accent: 'rgba(255,160,60,0.55)', shadow: 'rgba(10,6,4,0.6)' },
    accessories: ['coat', 'ember'],
    shape: { bodyW: 17.55, bodyH: 51.3, headR: 9.45, lean: 0.06, torn: 0.2, cloak: 0, longCoat: true },
    rimRoughness: 0.45
  },
  dread_coat: {
    palette: { fill: 'rgba(6,6,10,0.96)', rim: 'rgba(80,70,90,0.4)', accent: 'rgba(40,36,50,0.3)', shadow: 'rgba(2,2,6,0.7)' },
    accessories: ['coat', 'obscure'],
    shape: { bodyW: 16.2, bodyH: 54.0, headR: 8.78, lean: 0, torn: 0, cloak: 0.3, longCoat: true, obscureFace: true },
    rimRoughness: 0.3
  },
  pale_void: {
    palette: { fill: 'rgba(220,220,230,0.6)', rim: 'rgba(255,255,255,0.5)', accent: 'rgba(200,200,210,0.35)', shadow: 'rgba(40,40,50,0.3)' },
    accessories: [],
    shape: { bodyW: 13.5, bodyH: 45.9, headR: 8.1, lean: 0, torn: 0, cloak: 0 },
    rimRoughness: 0.05
  },
  threshold: {
    palette: { fill: 'rgba(10,10,14,0.94)', rim: 'rgba(120,110,100,0.35)', accent: 'rgba(60,50,45,0.3)', shadow: 'rgba(4,4,8,0.7)' },
    accessories: [],
    shape: { bodyW: 14.85, bodyH: 48.6, headR: 8.78, lean: 0.02, torn: 0, cloak: 0 },
    rimRoughness: 0.25
  },
  room_clothes: {
    palette: { fill: 'rgba(30,28,32,0.88)', rim: 'rgba(180,170,160,0.35)', accent: 'rgba(140,130,120,0.25)', shadow: 'rgba(16,14,16,0.5)' },
    accessories: [],
    shape: { bodyW: 17.55, bodyH: 45.9, headR: 10.12, lean: 0, torn: 0, cloak: 0 },
    rimRoughness: 0.2
  },
  desk_lamp: {
    palette: { fill: 'rgba(28,24,20,0.9)', rim: 'rgba(255,200,120,0.65)', accent: 'rgba(255,180,90,0.45)', shadow: 'rgba(8,6,4,0.7)' },
    accessories: ['desk_lamp'],
    shape: { bodyW: 16.2, bodyH: 45.9, headR: 9.45, lean: 0, torn: 0, cloak: 0 },
    rimRoughness: 0.15,
    keyLight: 'desk_warm'
  },
  empty_chair: {
    palette: { fill: 'rgba(40,36,32,0.7)', rim: 'rgba(160,140,120,0.35)', accent: 'rgba(120,100,80,0.25)', shadow: 'rgba(20,16,14,0.5)' },
    accessories: ['chair'],
    shape: { bodyW: 18.9, bodyH: 37.8, headR: 0.0, lean: 0, torn: 0, cloak: 0 },
    rimRoughness: 0.2
  },
  aisle_linen: {
    palette: { fill: 'rgba(36,34,40,0.88)', rim: 'rgba(240,230,220,0.55)', accent: 'rgba(220,210,200,0.4)', shadow: 'rgba(18,16,22,0.55)' },
    accessories: ['cloak'],
    shape: { bodyW: 18.9, bodyH: 54.0, headR: 9.45, lean: 0, torn: 0, cloak: 0.85, longCoat: true },
    rimRoughness: 0.12
  },
  star_dust: {
    palette: { fill: 'rgba(8,10,24,0.9)', rim: 'rgba(180,200,255,0.7)', accent: 'rgba(255,240,200,0.5)', shadow: 'rgba(4,6,16,0.55)' },
    accessories: ['particles'],
    shape: { bodyW: 14.85, bodyH: 48.6, headR: 8.78, lean: 0, torn: 0, cloak: 0 },
    rimRoughness: 0.4
  }
};

/** @type {Record<string, object>} */
export const ARCHETYPES = {
  nature_fauna: { shapeTweaks: { bodyW: 0.7, bodyH: 0.55, headR: 0.8 }, defaultStyle: 'silhouette', defaultOutfit: 'moss_trail', fauna: true },
  pastoral_walker: { shapeTweaks: { lean: 0.06 }, defaultStyle: 'silhouette', defaultOutfit: 'linen_dawn' },
  sacred_solitary: { shapeTweaks: { bodyH: 1.1, cloak: 0.5 }, defaultStyle: 'silhouette', defaultOutfit: 'aisle_linen' },
  neon_runner: { shapeTweaks: { lean: 0.18, bodyH: 1.0 }, defaultStyle: 'neon', defaultOutfit: 'neon_trim' },
  pop_candy: { shapeTweaks: { headR: 1.1, bodyW: 1.05 }, defaultStyle: 'neon', defaultOutfit: 'chrome_candy' },
  formation_crew: { shapeTweaks: { lean: 0.05 }, defaultStyle: 'silhouette', defaultOutfit: 'color_block_crew', formation: true },
  tableau_figure: { shapeTweaks: {}, defaultStyle: 'silhouette', defaultOutfit: 'linen_dawn' },
  fg_performer: { shapeTweaks: { bodyH: 1.12, bodyW: 1.18, lean: 0.14 }, defaultStyle: 'silhouette', defaultOutfit: 'stage_gloss' },
  chaos_fracture: { shapeTweaks: { lean: 0.25, torn: 0.6, bodyW: 1.15 }, defaultStyle: 'silhouette', defaultOutfit: 'fracture_rag' },
  ash_survivor: { shapeTweaks: { bodyH: 0.9, lean: 0.04 }, defaultStyle: 'silhouette', defaultOutfit: 'ember_coat' },
  dread_sparse: { shapeTweaks: { bodyH: 0.85, headR: 0.9 }, defaultStyle: 'silhouette', defaultOutfit: 'dread_coat', sparseScale: 0.72 },
  void_presence: { shapeTweaks: { bodyW: 0.85, bodyH: 0.95 }, defaultStyle: 'dream', defaultOutfit: 'pale_void' },
  spoken_intimate: { shapeTweaks: {}, defaultStyle: 'silhouette', defaultOutfit: 'room_clothes' },
  cosmic_dissolve: { shapeTweaks: { bodyH: 1.05 }, defaultStyle: 'dream', defaultOutfit: 'star_dust' }
};

const LEGACY_KIND_MAP = {
  silhouette: { archetype: 'tableau_figure' },
  traveler: { archetype: 'pastoral_walker' },
  duo: { archetype: 'formation_crew', countHint: 2 },
  crowd_ghosts: { archetype: 'formation_crew' },
  beast: { archetype: 'chaos_fracture' },
  figure_lone: { archetype: 'tableau_figure' },
  congregation: { archetype: 'sacred_solitary' },
  neon: { archetype: 'neon_runner', style: 'neon' },
  dream: { archetype: 'cosmic_dissolve', style: 'dream' },
  fauna: { archetype: 'nature_fauna' },
  dancer: { archetype: 'pop_candy' },
  none: { archetype: null }
};

const VIBE_OUTFIT_FALLBACK = {
  peace: 'linen_dawn',
  calm: 'linen_dawn',
  soft: 'moss_trail',
  groove: 'neon_trim',
  neon: 'neon_trim',
  hope: 'highway_dust',
  euphoric: 'chrome_candy',
  pop: 'chrome_candy',
  chorus: 'color_block_crew',
  chaos: 'fracture_rag',
  scary: 'dread_coat',
  dread: 'dread_coat',
  spoken: 'room_clothes',
  intimate: 'desk_lamp',
  awe: 'aisle_linen',
  sacred: 'aisle_linen',
  cosmic: 'star_dust',
  outro: 'star_dust',
  melancholy: 'ember_coat'
};

function _pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  }
  return null;
}

function _normId(v) {
  if (v == null) return null;
  return String(v).trim().toLowerCase().replace(/-/g, '_');
}

/**
 * Map legacy director kinds → archetype (+ optional style/count hint).
 * traveler without neon vibe → pastoral_walker; neon vibe handled by caller style.
 */
export function mapLegacyKind(kind, vibe) {
  const k = _normId(kind);
  if (!k || k === 'none') return { archetype: null };
  if (k === 'traveler') {
    const v = (vibe || '').toString().toLowerCase();
    if (/neon|groove|city|night|hope/.test(v)) return { archetype: 'neon_runner', style: 'neon' };
    return { archetype: 'pastoral_walker' };
  }
  if (k === 'dancer') {
    const v = (vibe || '').toString().toLowerCase();
    if (/neon|groove|night/.test(v)) return { archetype: 'neon_runner', style: 'neon' };
    return { archetype: 'pop_candy' };
  }
  return LEGACY_KIND_MAP[k] || { archetype: null };
}

function _mergeShape(base, tweaks) {
  const s = { ...base };
  if (!tweaks) return s;
  // shapeTweaks bodyW/H/headR are multipliers when in (0, 3)
  for (const key of ['bodyW', 'bodyH', 'headR']) {
    if (tweaks[key] != null && tweaks[key] > 0 && tweaks[key] < 3) {
      s[key] = (base[key] || 1) * tweaks[key];
    }
  }
  for (const key of ['lean', 'torn', 'cloak']) {
    if (tweaks[key] != null) s[key] = Math.max(s[key] || 0, tweaks[key]);
  }
  if (tweaks.longCoat) s.longCoat = true;
  if (tweaks.obscureFace) s.obscureFace = true;
  if (tweaks.fauna) s.fauna = true;
  return s;
}

function _vibeOutfit(vibe) {
  if (!vibe) return null;
  const v = String(vibe).toLowerCase();
  for (const [key, outfit] of Object.entries(VIBE_OUTFIT_FALLBACK)) {
    if (v.includes(key)) return outfit;
  }
  return null;
}

/**
 * Resolve cast look from directive cast item / member / concept figure.
 * @param {object} spec
 * @param {string} [vibe]
 * @returns {{ archetype: string|null, outfitId: string, style: string, palette: object, shape: object, accessories: string[], opacityMul: number, fauna: boolean, formation: boolean, sparseScale: number, emptyChair: boolean }}
 */
export function resolveCastLook(spec, vibe) {
  const s = spec || {};
  const vibeStr = vibe || s.vibe || '';

  let archetype = _normId(_pick(s, ['archetype']));
  const characterId = _normId(_pick(s, ['characterId', 'character_id']));
  if (!archetype && characterId) {
    if (ARCHETYPES[characterId]) archetype = characterId;
    else {
      // expanded snake_case library id — try prefix match against ARCHETYPE_IDS
      for (const id of ARCHETYPE_IDS) {
        if (characterId === id || characterId.startsWith(id + '_') || characterId.endsWith('_' + id)) {
          archetype = id;
          break;
        }
      }
    }
  }

  let styleFromKind = null;
  if (!archetype) {
    const mapped = mapLegacyKind(s.kind, vibeStr);
    archetype = mapped.archetype;
    styleFromKind = mapped.style || null;
  }
  if (!archetype) archetype = 'tableau_figure';

  const arch = ARCHETYPES[archetype] || ARCHETYPES.tableau_figure;

  let outfitId = _normId(_pick(s, ['outfitId', 'outfit', 'outfitTheme', 'outfit_id', 'outfit_theme']));
  if (outfitId === 'desk_lamp_key') outfitId = 'desk_lamp';
  if (!outfitId || !OUTFITS[outfitId]) {
    outfitId = arch.defaultOutfit || _vibeOutfit(vibeStr) || 'linen_dawn';
  }
  if (!OUTFITS[outfitId]) outfitId = 'linen_dawn';

  let style = _normId(_pick(s, ['style', 'look', 'renderStyle', 'render_style'])) || styleFromKind || arch.defaultStyle || 'silhouette';
  if (!STYLES.includes(style)) style = 'silhouette';

  // Outfit/archetype neon/dream defaults when style not explicitly set
  if (!_pick(s, ['style', 'look', 'renderStyle', 'render_style']) && !styleFromKind) {
    if (outfitId === 'neon_trim' || outfitId === 'chrome_candy' || archetype === 'neon_runner') style = arch.defaultStyle || 'neon';
    if (archetype === 'void_presence' || archetype === 'cosmic_dissolve') style = arch.defaultStyle || 'dream';
  }

  const outfit = OUTFITS[outfitId];
  const shape = _mergeShape({ ...outfit.shape }, arch.shapeTweaks);
  if (arch.fauna) shape.fauna = true;
  if (arch.sparseScale) shape.sparseScale = arch.sparseScale;

  const accessories = [...(outfit.accessories || [])];
  if (shape.cloak > 0.4 && !accessories.includes('cloak')) accessories.push('cloak');
  if (shape.torn > 0.4 && !accessories.includes('torn')) accessories.push('torn');
  if (shape.obscureFace && !accessories.includes('obscure')) accessories.push('obscure');
  if (arch.fauna && !accessories.includes('fauna')) accessories.push('fauna');
  // Phone silhouette: longCoat reads as coat wedge; neon/candy/crew get one trim accent
  if ((shape.longCoat || outfitId === 'after_hours_red' || outfitId === 'ember_coat' || outfitId === 'dread_coat' ||
       outfitId === 'highway_dust' || outfitId === 'aisle_linen') && !accessories.includes('coat')) {
    accessories.push('coat');
  }
  if ((outfitId === 'neon_trim' || outfitId === 'chrome_candy' || outfitId === 'stage_gloss' ||
       outfitId === 'color_block_crew' || outfitId === 'water_gloss') && !accessories.includes('trim')) {
    accessories.push('trim');
  }

  const holdSilent = !!s.holdSilent;
  const emptyChair =
    outfitId === 'empty_chair' ||
    accessories.includes('chair') ||
    (holdSilent && (archetype === 'spoken_intimate' || outfitId === 'room_clothes'));

  let opacityMul = 1;
  if (holdSilent) opacityMul *= 0.45;
  if (archetype === 'void_presence') opacityMul *= 0.55;
  if (archetype === 'dread_sparse') opacityMul *= 0.7;
  if (style === 'dream') opacityMul *= 0.85;

  return {
    archetype,
    outfitId,
    style,
    palette: { ...outfit.palette },
    shape,
    accessories,
    opacityMul,
    fauna: !!arch.fauna,
    formation: !!arch.formation,
    sparseScale: arch.sparseScale || 1,
    emptyChair,
    keyLight: outfit.keyLight || null,
    rimRoughness: outfit.rimRoughness || 0.2
  };
}

function _drawFauna(ctx, x, baseY, scale, look, t, i) {
  const pal = look.palette;
  const kind = i % 3;
  ctx.fillStyle = pal.fill;
  ctx.strokeStyle = pal.rim;
  if (kind === 0) {
    // deer-ish
    const bh = 14 * scale;
    ctx.beginPath();
    ctx.ellipse(x, baseY - bh * 0.45, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 8 * scale, baseY - bh * 0.7, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + 8 * scale, baseY - bh * 0.9);
    ctx.lineTo(x + 10 * scale, baseY - bh * 1.25);
    ctx.moveTo(x + 7 * scale, baseY - bh * 0.9);
    ctx.lineTo(x + 6 * scale, baseY - bh * 1.2);
    ctx.stroke();
  } else if (kind === 1) {
    // bird mote
    const yy = baseY - 28 * scale - Math.sin(t * 0.9 + i) * 4;
    ctx.beginPath();
    ctx.ellipse(x, yy, 5 * scale, 2.2 * scale, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 5 * scale, yy);
    ctx.quadraticCurveTo(x, yy - 6 * scale, x + 5 * scale, yy);
    ctx.stroke();
  } else {
    // fish
    const yy = baseY - 10 * scale;
    ctx.beginPath();
    ctx.ellipse(x, yy, 8 * scale, 3.2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 8 * scale, yy);
    ctx.lineTo(x - 13 * scale, yy - 4 * scale);
    ctx.lineTo(x - 13 * scale, yy + 4 * scale);
    ctx.closePath();
    ctx.fill();
  }
}

function _drawChair(ctx, x, baseY, scale, look) {
  const pal = look.palette;
  const s = scale;
  ctx.strokeStyle = pal.rim;
  ctx.fillStyle = pal.fill;
  ctx.lineWidth = 1.8 * s;
  // seat
  ctx.fillRect(x - 10 * s, baseY - 14 * s, 20 * s, 4 * s);
  // back
  ctx.strokeRect(x - 10 * s, baseY - 28 * s, 20 * s, 14 * s);
  // legs
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, baseY - 10 * s);
  ctx.lineTo(x - 8 * s, baseY);
  ctx.moveTo(x + 8 * s, baseY - 10 * s);
  ctx.lineTo(x + 8 * s, baseY);
  ctx.stroke();
  // garment drape proxy
  ctx.globalAlpha *= 0.7;
  ctx.fillStyle = pal.accent;
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, baseY - 14 * s);
  ctx.quadraticCurveTo(x, baseY - 6 * s, x + 7 * s, baseY - 12 * s);
  ctx.lineTo(x + 5 * s, baseY - 14 * s);
  ctx.closePath();
  ctx.fill();
}

function _drawBodyPath(ctx, x, bodyTop, bodyH, bodyW, lean, torn, cloak, longCoat, scale) {
  const hw = (bodyW * scale) / 2;
  const leanPx = lean * 10 * scale;
  const top = bodyTop;
  const bot = bodyTop + bodyH * scale;
  // Bold hem flare — coat/cloak must read at phone distance (not near-equal blob)
  const flare = longCoat || cloak > 0.25 ? hw * (1.42 + cloak * 0.55) : hw;

  ctx.beginPath();
  ctx.moveTo(x - hw + leanPx * 0.3, top);
  ctx.lineTo(x + hw + leanPx * 0.3, top);
  ctx.lineTo(x + flare + leanPx, bot);
  if (torn > 0.3) {
    const jags = 3 + Math.floor(torn * 3);
    for (let j = 0; j < jags; j++) {
      const tx = x + flare + leanPx - ((2 * flare) * (j + 0.5)) / jags;
      const dip = (j % 2 === 0 ? 1 : -1) * torn * 4 * scale;
      ctx.lineTo(tx, bot + dip);
    }
  }
  ctx.lineTo(x - flare + leanPx, bot);
  ctx.closePath();
}

function _drawEmberParticles(ctx, x, bodyTop, bodyH, scale, t, pal) {
  ctx.fillStyle = pal.accent || pal.rim;
  for (let p = 0; p < 6; p++) {
    const px = x + Math.sin(t * 1.2 + p * 1.7) * 14 * scale;
    const py = bodyTop + bodyH * scale * (0.15 + (p * 0.16) % 0.75) - ((t * 10 + p * 6) % (bodyH * scale));
    ctx.globalAlpha = 0.35 + (p % 3) * 0.15;
    ctx.beginPath();
    ctx.arc(px, py, (2.2 + (p % 3) * 0.9) * Math.max(1, scale * 0.22), 0, Math.PI * 2);
    ctx.fill();
  }
}

function _drawStarParticles(ctx, x, bodyTop, bodyH, scale, t, pal) {
  ctx.fillStyle = pal.rim;
  for (let p = 0; p < 5; p++) {
    const ang = t * 0.4 + p * 1.3;
    const rad = (8 + p * 4) * scale;
    const px = x + Math.cos(ang) * rad;
    const py = bodyTop + bodyH * scale * 0.3 + Math.sin(ang * 1.3) * rad * 0.6;
    ctx.globalAlpha = 0.2 + (p % 3) * 0.15;
    ctx.beginPath();
    ctx.arc(px, py, 1.1 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}


/**
 * Bold geometric outfit silhouette diffs — phone/LED distance.
 * Coat flare / cloak cape wedge / ONE trim accent rim / hood arc.
 * Never face detail (MUSIC-BRIEF cast-detail).
 */
function _drawOutfitSilhouetteDiffs(ctx, fx, bodyTop, bodyH, bodyW, lean, scale, look, opacity) {
  let pal = look.palette || {};
  // Belt: if rim/accent still greenish (missed hard scrub) → warzone ember
  if (_isGreenishColor(pal.rim) || _isGreenishColor(pal.accent) || _isGreenishColor(pal.fill)) {
    pal = _forceWarzonePalette(pal);
  }
  const shape = look.shape || {};
  const acc = look.accessories || [];
  const outfitId = look.outfitId || '';
  const leanPx = lean * 10 * scale;
  const hw = (bodyW * scale) / 2;
  const bot = bodyTop + bodyH * scale;
  const hasCoat = acc.includes('coat') || !!shape.longCoat;
  const hasCloak = acc.includes('cloak') || (shape.cloak || 0) > 0.35;
  const hasTrim = acc.includes('trim') || /neon_trim|chrome_candy|stage_gloss|color_block|water_gloss/.test(outfitId);
  const hasHood = acc.includes('hood');
  const hasEmber = acc.includes('ember');
  const rim = _brightRim(pal.rim || 'rgba(255,120,60,0.95)', 0.78);
  const accent = (_isGreenishColor(pal.accent) ? WARZONE_PALETTE.accent : (pal.accent || rim));
  const shadow = pal.shadow || pal.fill || 'rgba(6,5,6,0.9)';

  // --- CLOAK / CAPE WEDGE (behind-readable drape) ---
  if (hasCloak) {
    const cloakAmt = Math.max(0.45, shape.cloak || 0.7);
    const wing = hw * (1.65 + cloakAmt * 0.9);
    ctx.save();
    ctx.globalAlpha = opacity * 0.72;
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.moveTo(fx - 3 * scale + leanPx * 0.2, bodyTop + 2 * scale);
    ctx.quadraticCurveTo(fx - wing + leanPx, bodyTop + bodyH * scale * 0.45, fx - wing * 0.85 + leanPx, bot);
    ctx.lineTo(fx + wing * 0.55 + leanPx, bot);
    ctx.quadraticCurveTo(fx + wing * 0.7 + leanPx, bodyTop + bodyH * scale * 0.4, fx + 4 * scale + leanPx * 0.2, bodyTop + 4 * scale);
    ctx.closePath();
    ctx.fill();
    // Thick cape-edge rim (one accent, not texture soup)
    ctx.globalAlpha = opacity * 0.85;
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(2.8, 3.4 * scale * 0.35);
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // --- COAT FLARE / LAPEL / COLLAR (outer silhouette wedge) ---
  if (hasCoat) {
    const coatFlare = hw * (shape.longCoat ? 1.55 : 1.35);
    const shoulderY = bodyTop + bodyH * scale * 0.08;
    const hipY = bodyTop + bodyH * scale * 0.55;
    ctx.save();
    // Open coat panels — left + right wedges wider than body
    ctx.globalAlpha = opacity * 0.55;
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.moveTo(fx - hw * 0.55 + leanPx * 0.3, shoulderY);
    ctx.lineTo(fx - coatFlare + leanPx, bot);
    ctx.lineTo(fx - hw * 0.15 + leanPx, bot);
    ctx.lineTo(fx - hw * 0.2 + leanPx * 0.3, hipY);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx + hw * 0.55 + leanPx * 0.3, shoulderY);
    ctx.lineTo(fx + coatFlare + leanPx, bot);
    ctx.lineTo(fx + hw * 0.15 + leanPx, bot);
    ctx.lineTo(fx + hw * 0.2 + leanPx * 0.3, hipY);
    ctx.closePath();
    ctx.fill();
    // Collar / lapel triangles at shoulders (readable wedge, not face)
    ctx.globalAlpha = opacity * 0.9;
    ctx.fillStyle = rim;
    const colW = 5.5 * scale;
    const colH = 6.5 * scale;
    ctx.beginPath();
    ctx.moveTo(fx - hw * 0.15 + leanPx * 0.25, bodyTop + 1 * scale);
    ctx.lineTo(fx - hw * 0.15 - colW + leanPx * 0.25, bodyTop + colH);
    ctx.lineTo(fx - hw * 0.05 + leanPx * 0.25, bodyTop + colH * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx + hw * 0.15 + leanPx * 0.25, bodyTop + 1 * scale);
    ctx.lineTo(fx + hw * 0.15 + colW + leanPx * 0.25, bodyTop + colH);
    ctx.lineTo(fx + hw * 0.05 + leanPx * 0.25, bodyTop + colH * 0.7);
    ctx.closePath();
    ctx.fill();
    // Thick coat outer rim (hem + sides)
    ctx.globalAlpha = opacity * 0.92;
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(3.0, 3.8 * scale * 0.38);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(fx - hw * 0.5 + leanPx * 0.3, shoulderY);
    ctx.lineTo(fx - coatFlare + leanPx, bot);
    ctx.moveTo(fx + hw * 0.5 + leanPx * 0.3, shoulderY);
    ctx.lineTo(fx + coatFlare + leanPx, bot);
    // Hem bar
    ctx.moveTo(fx - coatFlare + leanPx, bot);
    ctx.lineTo(fx + coatFlare + leanPx, bot);
    ctx.stroke();
    // Front opening slit (one vertical accent)
    ctx.lineWidth = Math.max(2.2, 2.6 * scale * 0.32);
    ctx.beginPath();
    ctx.moveTo(fx + leanPx * 0.2, shoulderY + 2 * scale);
    ctx.lineTo(fx + leanPx * 0.35, bot - 2 * scale);
    ctx.stroke();
    ctx.restore();
  }

  // --- ONE TRIM ACCENT RIM (belt / cuff / edge stripe — not texture soup) ---
  if (hasTrim) {
    ctx.save();
    ctx.globalAlpha = opacity * 0.95;
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(3.2, 4.2 * scale * 0.42);
    ctx.lineCap = 'round';
    // Vertical torso edge stripe (dominant phone read)
    ctx.beginPath();
    ctx.moveTo(fx + hw * 0.72 + leanPx, bodyTop + bodyH * scale * 0.12);
    ctx.lineTo(fx + hw * 0.95 + leanPx, bodyTop + bodyH * scale * 0.88);
    ctx.stroke();
    // Shoulder collar flash bar
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(2.8, 3.6 * scale * 0.38);
    ctx.beginPath();
    ctx.moveTo(fx - hw * 0.85 + leanPx * 0.2, bodyTop + bodyH * scale * 0.1);
    ctx.lineTo(fx + hw * 0.85 + leanPx * 0.2, bodyTop + bodyH * scale * 0.1);
    ctx.stroke();
    // Belt / waist tick (single accent)
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2.6, 3.2 * scale * 0.36);
    ctx.beginPath();
    ctx.moveTo(fx - hw * 0.7 + leanPx, bodyTop + bodyH * scale * 0.48);
    ctx.lineTo(fx + hw * 0.7 + leanPx, bodyTop + bodyH * scale * 0.48);
    ctx.stroke();
    // Cuff ticks at wrist height
    const cuffY = bodyTop + bodyH * scale * 0.72;
    ctx.lineWidth = Math.max(2.4, 3.0 * scale * 0.34);
    ctx.beginPath();
    ctx.moveTo(fx - hw * 1.05 + leanPx, cuffY);
    ctx.lineTo(fx - hw * 0.55 + leanPx, cuffY);
    ctx.moveTo(fx + hw * 0.55 + leanPx, cuffY);
    ctx.lineTo(fx + hw * 1.05 + leanPx, cuffY);
    ctx.stroke();
    ctx.restore();
  }

  // --- HOOD arc (over head silhouette, not face) ---
  if (hasHood) {
    ctx.save();
    ctx.globalAlpha = opacity * 0.88;
    ctx.strokeStyle = rim;
    ctx.fillStyle = shadow;
    ctx.lineWidth = Math.max(2.8, 3.4 * scale * 0.36);
    const hr = Math.max(hw * 0.95, (shape.headR || 9) * scale * 1.35);
    ctx.beginPath();
    ctx.arc(fx + leanPx * 0.2, bodyTop - 1 * scale, hr, Math.PI * 1.05, Math.PI * 1.95, false);
    ctx.stroke();
    ctx.globalAlpha = opacity * 0.4;
    ctx.beginPath();
    ctx.arc(fx + leanPx * 0.2, bodyTop + 2 * scale, hr * 0.95, Math.PI * 1.1, Math.PI * 1.9, false);
    ctx.lineTo(fx + leanPx * 0.2, bodyTop + 8 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- EMBER coat-edge glow (ash_survivor) ---
  if (hasEmber) {
    ctx.save();
    ctx.globalAlpha = opacity * 0.7;
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2.4, 3.0 * scale * 0.32);
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8 + scale * 2;
    const coatFlare = hw * 1.5;
    ctx.beginPath();
    ctx.moveTo(fx - coatFlare + leanPx, bot - 4 * scale);
    ctx.lineTo(fx - hw * 0.4 + leanPx, bodyTop + bodyH * scale * 0.25);
    ctx.moveTo(fx + coatFlare + leanPx, bot - 4 * scale);
    ctx.lineTo(fx + hw * 0.4 + leanPx, bodyTop + bodyH * scale * 0.25);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Boots / stance ticks — readable heel stance at phone distance
  if (hasCoat || hasCloak || hasTrim) {
    ctx.save();
    ctx.globalAlpha = opacity * 0.7;
    ctx.fillStyle = rim;
    const bootW = 4.2 * scale;
    const bootH = 2.4 * scale;
    ctx.beginPath();
    ctx.ellipse(fx - hw * 0.45 + leanPx, bot - bootH * 0.15, bootW, bootH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(fx + hw * 0.45 + leanPx, bot - bootH * 0.15, bootW, bootH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}


/** Warzone/fracture ash-ember-red — kill green / pale soft / pastoral under hardLock. */
const WARZONE_PALETTE = {
  fill: 'rgba(6,5,6,0.97)',
  rim: 'rgba(255,120,60,0.95)',
  accent: 'rgba(220,40,30,0.85)',
  shadow: 'rgba(4,3,4,0.75)'
};

function _isGreenishColor(col) {
  if (typeof col !== 'string') return false;
  const m = col.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return false;
  const r = +m[1], g = +m[2], b = +m[3];
  // Green-dominant OR moss/lime pastoral (G high vs R, or G+lime yellow)
  return (g > r + 15 && g > b + 10) || (g > 100 && g >= r && b < 120 && r < 200);
}

function _forceWarzonePalette(pal) {
  const p = pal && typeof pal === 'object' ? { ...pal } : {};
  // Always force under hard hold — never leave green / pale soft fill
  p.fill = 'rgba(6,5,6,0.97)';
  p.rim = 'rgba(255,120,60,0.95)';
  p.accent = 'rgba(220,40,30,0.85)';
  p.shadow = 'rgba(4,3,4,0.75)';
  return p;
}

function _brightRim(rim, floorA) {
  // Ensure rim alpha ≥ floorA for neon/silhouette readability
  if (typeof rim !== 'string') return `rgba(200,220,255,${floorA})`;
  const m = rim.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\)/i);
  if (m) {
    const a = Math.max(floorA, parseFloat(m[4]));
    return `rgba(${m[1]},${m[2]},${m[3]},${a})`;
  }
  return rim;
}

function _ensureFillAlpha(fill, minA) {
  if (typeof fill !== 'string') return `rgba(220,220,230,${minA})`;
  const m = fill.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\)/i);
  if (m) {
    const a = Math.max(minA, parseFloat(m[4]));
    return `rgba(${m[1]},${m[2]},${m[3]},${a})`;
  }
  return fill;
}


/**
 * Resolve ONE readable dance motion language for a figure.
 * Feet stay on baseY (bob compresses down; spin pivots at feet).
 * holdSilent / scary-without-intent → freeze. speechLike → ≤30% amp.
 * @returns {{ active: boolean, motion: string, amp: number, bob: number, leanAdd: number, rot: number, footL: number, footR: number, hipShift: number }}
 */
export function applyDanceMotion(opts = {}) {
  const idle = { active: false, motion: 'none', amp: 0, bob: 0, leanAdd: 0, rot: 0, footL: 0, footR: 0, hipShift: 0, intentBoost: false };
  if (!opts || opts.holdSilent) return idle;

  const action = (opts.action || 'stand').toString().toLowerCase();
  const look = opts.look || {};
  const arch = (look.archetype || opts.archetype || '').toString().toLowerCase();
  const kind = (opts.kind || look.kind || '').toString().toLowerCase();
  const roles = opts.roles || {};
  const vibe = (opts.vibe || '').toString().toLowerCase();
  const section = (opts.section || '').toString().toLowerCase();
  const speechLike = !!(opts.speechLike || arch === 'spoken_intimate' || /spoken/.test(vibe));
  const scary = /scary|dread|horror|terror/.test(vibe) || arch === 'dread_sparse';

  let kick = Math.max(0, Number(roles.kick) || 0);
  let snare = Math.max(0, Number(roles.snare) || 0);
  let hats = Math.max(0, Number(roles.hats) || 0);
  const roleId = (opts.roleId || '').toString().toLowerCase();
  const rolePulse = opts.rolePulse != null ? Number(opts.rolePulse) : 0;
  if (roleId === 'kick') kick = Math.max(kick, rolePulse);
  if (roleId === 'snare') snare = Math.max(snare, rolePulse);
  if (roleId === 'hats') hats = Math.max(hats, rolePulse);

  let intent = opts.danceIntent;
  if (intent && typeof intent === 'object') {
    intent = intent.mode || intent.type || intent.action || intent.motion || (intent.on ? 'dance' : null);
  }
  if (typeof intent === 'string') intent = intent.toLowerCase();
  const intentOn = !!(intent && intent !== 'still' && intent !== 'none' && intent !== 'off' && intent !== false && intent !== 'walk');

  const danceAction = /^(dance|step|spin|sway|groove|freestyle|formation|ritual_gesture)$/.test(action);
  const dancerArch = /^(pop_candy|neon_runner|formation_crew|fg_performer)$/.test(arch);
  const dancerKind = kind === 'dancer';
  const highSpike = kick > 0.45 || snare > 0.45 || hats > 0.45;
  const stillnessArch = /^(spoken_intimate|dread_sparse|pastoral_walker|nature_fauna|sacred_solitary|void_presence)$/.test(arch);

  // Still / spoken / scary: freeze silhouette — no false kick bounce
  if (scary && !danceAction && !intentOn) return idle;
  if (speechLike && stillnessArch && !danceAction && !intentOn && !dancerKind) return idle;
  if (stillnessArch && !danceAction && !intentOn && !dancerKind && !dancerArch) return idle;

  // Cheap genreFamily hint (GENRE-MAP) — not neon-city-only; Scene still owns intent
  const genre = (opts.genreFamily || opts.genre || look.genreFamily || '').toString().toLowerCase();
  const genreFreeze = /\b(ambient|spoken|classical|new.?age)\b/.test(genre);
  const genreMicro = /\b(jazz|gospel|folk|country|blues)\b/.test(genre);
  const genreHigh = /\b(k-?pop|pop|latin|afrobeats?|dance|edm|disco|funk)\b/.test(genre);
  const genreMetal = /\b(metal|noise|doom|industrial)\b/.test(genre);
  if (genreFreeze && !danceAction && !intentOn) return idle;
  if (genreMetal && !danceAction && !intentOn && !/chaos_fracture|ash_survivor/.test(arch)) return idle;

  const should = danceAction || dancerKind || dancerArch || intentOn || highSpike || genreHigh;
  if (!should) return idle;
  // highSpike alone on calm/pastoral already gated; groove generic OK

  // One clear motion language (not random jitter)
  let motion = 'step';
  const intentMotion = typeof intent === 'string' && /^(step|sway|spin|dance|groove|freestyle)$/.test(intent) ? intent : null;
  if (action === 'spin' || intentMotion === 'spin') motion = 'spin';
  else if (action === 'sway' || intentMotion === 'sway') motion = 'sway';
  else if (action === 'step' || action === 'dance' || action === 'groove' || action === 'freestyle' ||
           intentMotion === 'step' || intentMotion === 'dance' || intentMotion === 'groove' || intentMotion === 'freestyle') {
    motion = 'step';
  } else if (action === 'formation' || arch === 'formation_crew') {
    motion = 'sway';
  } else if ((hats > 0.55 && hats >= snare && hats >= kick) || (section === 'chorus' && hats > 0.4)) {
    motion = 'spin';
  } else if (snare >= kick && snare >= hats && snare > 0.35) {
    motion = 'sway';
  } else {
    motion = 'step';
  }

  // CEO vibe-match: earn SPIN at times when danceIntent/energy peaks (not always).
  // Spoken/sacred/stillness already returned idle above — never invent spin there.
  if (motion !== 'spin' && !speechLike && arch !== 'sacred_solitary') {
    const energy = Math.max(0, Number(opts.energy ?? opts.audioEnergy ?? 0));
    const arousal = Math.max(0, Number(opts.arousal ?? 0));
    const earn = Math.max(kick, snare, hats, energy, arousal);
    const t0 = opts.t || 0;
    const i0 = opts.i || 0;
    // Periodic burst windows (~every 2s, ~0.6s open) so spin reads as earned moments
    const spinGate = Math.sin(t0 * 2.9 + i0 * 1.6) > 0.58 && Math.cos(t0 * 0.95 + i0) > 0.15;
    const intentDance = !!(intentOn || danceAction || dancerArch || dancerKind);
    const chorusEarn = section === 'chorus' && earn > 0.4 && intentDance;
    const peakEarn = intentDance && (earn > 0.62 || (hats > 0.48 && kick > 0.32) || energy > 0.58);
    if (spinGate && (chorusEarn || peakEarn || intentMotion === 'dance' || intentMotion === 'freestyle')) {
      motion = 'spin';
    }
  }

  // Amp: stronger when danceIntent/dance set (phone-readable energy); still soft-clip safe
  let drive = Math.max(kick, snare, hats);
  const intentBoost = !!(danceAction || intentOn || dancerArch || dancerKind);
  if (intentBoost) drive = Math.max(drive, 0.72);
  let amp = (intentBoost ? 0.42 : 0.28) + Math.min(1, drive) * (intentBoost ? 0.55 : 0.5); // ~0.42..0.97 intent
  if (speechLike || arch === 'spoken_intimate') amp *= 0.3; // spoken stay near-still
  if (genreMicro) amp *= 0.28; // jazz/gospel/folk micro-gesture only
  if (genreHigh) amp = Math.min(0.98, amp * 1.18); // pop/K-pop formation ok
  // Energy/section lift on chorus when intent already on
  if (intentBoost && section === 'chorus') amp = Math.min(1.0, amp * 1.12);

  const t = opts.t || 0;
  const i = opts.i || 0;
  const scale = Math.max(0.35, Number(opts.scale) || 1);
  // Kick-phased clock for footfalls (ROLE-AGENTS: kick→footfalls)
  const kickPhase = t * (2.6 + kick * 2.6) + i * 0.9;
  const snarePhase = t * (2.0 + snare * 1.8) + i * 0.6;
  // Motion gain — obvious on phone when danceIntent set; quieter otherwise
  const gain = intentBoost ? 1.85 : 1.0;

  let bob = 0, leanAdd = 0, rot = 0, footL = 0, footR = 0, hipShift = 0;

  if (motion === 'step') {
    // Alternate foot offset + vertical bob phased to kick (compress down — feet stay on baseY)
    const alt = Math.sin(kickPhase) >= 0 ? 1 : -1;
    const stepAmp = amp * 9.5 * scale * gain;
    footL = alt * stepAmp;
    footR = -alt * stepAmp * 0.9;
    bob = Math.max(0, Math.sin(kickPhase)) * amp * 5.8 * scale * gain; // positive = bodyTop down
    leanAdd = Math.sin(kickPhase * 0.5) * amp * 0.14 * gain;
    hipShift = alt * amp * 5.8 * scale * gain;
  } else if (motion === 'sway') {
    // Hip/shoulder lean sin(t) amplified by snare/hats — clear sway when intent
    const swell = 0.55 + snare * 0.55 + hats * 0.35;
    leanAdd = Math.sin(snarePhase) * amp * 0.38 * swell * gain;
    hipShift = Math.sin(snarePhase) * amp * 8.5 * scale * swell * gain;
    bob = Math.max(0, Math.sin(snarePhase * 2)) * amp * 2.8 * scale * gain;
    footL = Math.sin(snarePhase) * amp * 3.2 * scale * gain;
    footR = -footL;
  } else if (motion === 'spin') {
    // Silhouette rotate / mirrored lean sweep — pivot at feet, not full 3D
    const energy = Math.max(0, Number(opts.energy ?? opts.audioEnergy ?? 0));
    const spinDrive = 0.75 + hats * 0.55 + energy * 0.35 + (section === 'chorus' ? 0.35 : 0);
    rot = Math.sin(t * 2.15 + i) * amp * 0.42 * spinDrive * Math.min(1.45, gain); // readable spin
    leanAdd = Math.sin(t * 2.15 + i + Math.PI * 0.5) * amp * 0.22 * spinDrive * gain;
    hipShift = Math.sin(t * 2.15 + i) * amp * 7.2 * scale * gain;
    bob = Math.max(0, Math.sin(t * 4.2 + i)) * amp * 3.5 * scale * gain;
  }

  return { active: true, motion, amp, bob, leanAdd, rot, footL, footR, hipShift, intentBoost };
}

/**
 * Draw ONE figure with feet on baseY (no sticker float).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, baseY: number, scale: number, action?: string, t?: number, i?: number, look: object, opacity?: number }} opts
 * @returns {{ chestY: number, headY: number, fx: number }}
 */

/**
 * Vocalist / FG performer lead — Scene-stamped cues only.
 * Triggers: fg_performer arch, vocalish/lead/vocal role, kind performer,
 * stage_gloss + lead/fg placement, mic_stand accessory, cast role performer/vocal.
 */
function _isVocalistLead(opts, look) {
  const arch = (look?.archetype || opts?.archetype || '').toString().toLowerCase();
  if (arch === 'fg_performer') return true;
  const roleId = (opts?.roleId || look?.roleId || '').toString().toLowerCase();
  if (/^(vocalish|lead|vocal|singer|performer)$/.test(roleId)) return true;
  if (/vocal|singer|performer/.test(roleId)) return true;
  const kind = (opts?.kind || '').toString().toLowerCase();
  if (/performer|vocal|singer/.test(kind)) return true;
  const castRole = (opts?.castRole || opts?.directiveRole || '').toString().toLowerCase();
  if (/(^|_)(performer|vocal|vocalish|singer|lead)(_|$)/.test(castRole) || /^(performer|vocal|vocalish|singer|lead)$/.test(castRole)) return true;
  const outfitId = (look?.outfitId || '').toString().toLowerCase();
  const placement = (opts?.placement || '').toString().toLowerCase();
  const acc = look?.accessories || [];
  if (acc.includes('mic_stand') || acc.includes('mic')) return true;
  // stage_gloss lead / FG placement (This Is America FG grammar)
  if (outfitId === 'stage_gloss' && (/foreground|fg|^lead$/.test(placement) || opts?.isLead)) return true;
  // Characters ON + lead FG cast present → coat/mic wedge must read (QA HOLD B2/B3 blob fix)
  if (opts?.charactersOn && opts?.isLead && (/foreground|fg/.test(placement) || !placement)) return true;
  if (opts?.stickyCharacterId && opts?.isLead) return true;
  if (opts?.hardLock && opts?.isLead) return true;
  return false;
}

/**
 * Bold geometric vocalist silhouette overlays — mic-stand, open chest, raised forearm.
 * Phone-readable; NEVER face detail (MUSIC-BRIEF-vocalist-weapons).
 */
function _drawVocalistSilhouette(ctx, fx, bodyTop, bodyH, bodyW, lean, scale, look, opacity, t, headY, chestY, baseY) {
  const pal = look.palette || {};
  const leanPx = lean * 10 * scale;
  const hw = (bodyW * scale) / 2;
  const bot = bodyTop + bodyH * scale;
  const rim = _brightRim(pal.rim || 'rgba(255,230,180,0.85)', 0.82);
  const accent = pal.accent || rim;
  const fill = 'rgba(5,6,10,0.94)';

  ctx.save();
  ctx.globalAlpha = opacity;

  // --- OPEN CHEST / JACKET SHOULDERS (wider than body wedge) ---
  const shoulderY = bodyTop + bodyH * scale * 0.1;
  const chestFlare = hw * 1.55;
  ctx.globalAlpha = opacity * 0.75;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(fx - hw * 0.35 + leanPx * 0.3, bodyTop + 2 * scale);
  ctx.lineTo(fx - chestFlare + leanPx, shoulderY + 10 * scale);
  ctx.lineTo(fx - hw * 0.15 + leanPx, chestY);
  ctx.lineTo(fx + hw * 0.15 + leanPx, chestY);
  ctx.lineTo(fx + chestFlare + leanPx, shoulderY + 10 * scale);
  ctx.lineTo(fx + hw * 0.35 + leanPx * 0.3, bodyTop + 2 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = opacity * 0.95;
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(3.2, 4.0 * scale * 0.4);
  ctx.lineJoin = 'round';
  ctx.stroke();

  // --- RAISED FOREARM (singing lean — geometric thick bar, one side) ---
  // Right forearm up toward mic / mouth (phone-readable stick arm)
  const shoulderR = fx + hw * 0.85 + leanPx;
  const elbowX = fx + hw * 1.35 + leanPx;
  const elbowY = chestY - 4 * scale;
  const handRaiseX = fx + hw * 0.55 + leanPx;
  const handRaiseY = headY + 4 * scale;
  ctx.globalAlpha = opacity * 0.92;
  ctx.strokeStyle = rim;
  ctx.fillStyle = fill;
  ctx.lineWidth = Math.max(3.4, 4.4 * scale * 0.42);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(shoulderR, shoulderY + 2 * scale);
  ctx.lineTo(elbowX, elbowY);
  ctx.lineTo(handRaiseX, handRaiseY);
  ctx.stroke();
  // Fist / hand blob near mouth (not a face)
  ctx.beginPath();
  ctx.arc(handRaiseX, handRaiseY, 3.2 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // --- MIC STAND GLYPH (pole + boom + mic head near mouth) ---
  const standX = fx + hw * 1.05 + leanPx + 2 * scale;
  const micMouthX = fx + leanPx * 0.35 + 3 * scale;
  const micMouthY = headY + 3.5 * scale;
  ctx.globalAlpha = opacity * 0.95;
  ctx.strokeStyle = accent;
  ctx.fillStyle = fill;
  ctx.lineWidth = Math.max(2.8, 3.6 * scale * 0.38);
  // Base plate
  ctx.beginPath();
  ctx.moveTo(standX - 5 * scale, bot);
  ctx.lineTo(standX + 5 * scale, bot);
  ctx.stroke();
  // Vertical pole
  ctx.beginPath();
  ctx.moveTo(standX, bot);
  ctx.lineTo(standX, micMouthY + 6 * scale);
  ctx.stroke();
  // Boom arm toward mouth
  ctx.beginPath();
  ctx.moveTo(standX, micMouthY + 6 * scale);
  ctx.lineTo(micMouthX + 4 * scale, micMouthY);
  ctx.stroke();
  // Mic head (bold capsule near mouth — silhouette only)
  ctx.lineWidth = Math.max(2.4, 3.0 * scale * 0.34);
  ctx.beginPath();
  ctx.ellipse(micMouthX, micMouthY, 4.2 * scale, 2.6 * scale, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Soft pulse tick on mic (lyric energy hint, soft-clip safe)
  const pulse = 0.55 + 0.35 * Math.sin((t || 0) * 2.4);
  ctx.globalAlpha = opacity * 0.35 * pulse;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(micMouthX, micMouthY, 5.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // --- STANCE BOOTS wider (open chest foot plant) ---
  ctx.globalAlpha = opacity * 0.75;
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.ellipse(fx - hw * 0.55 + leanPx, bot - 1.5 * scale, 5.2 * scale, 2.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(fx + hw * 0.55 + leanPx, bot - 1.5 * scale, 5.2 * scale, 2.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawCastFigure(ctx, opts) {
  let look = opts.look || resolveCastLook({});
  // Hard lock / sticky hold: strip ALL green/pale/pastoral — ash-ember-red warzone only (QA B2/B3)
  const hardDraw = !!(opts.hardLock || (opts.aggression || 0) >= 0.55);
  if (hardDraw) {
    look = {
      ...look,
      style: 'silhouette',
      fauna: false,
      palette: _forceWarzonePalette(look.palette),
      outfitId: /linen_dawn|aisle_linen|moss|pale_void|room_clothes|water_gloss|industrial_hazard/.test(String(look.outfitId || ''))
        ? (opts.isLead ? 'ember_coat' : 'fracture_rag')
        : (look.outfitId || 'ember_coat')
    };
    // Never draw fauna under hard hold (deer/pastoral soft)
    if (look.accessories) {
      look.accessories = look.accessories.filter((a) => a !== 'fauna' && a !== 'hood');
    }
  }
  const scale0 = Math.max(0.8, Math.min(48, Number(opts.scale) || 1));
  const sparse = look.sparseScale || 1;
  let scale = scale0 * Math.max(0.85, sparse); // never crush members to dust via sparse
  if (!Number.isFinite(scale) || scale < 0.8) scale = 4.0;
  const x0 = opts.x;
  const baseY = opts.baseY;
  const action = (opts.action || 'stand').toString().toLowerCase();
  const t = opts.t || 0;
  const i = opts.i || 0;
  const holdSilent = !!opts.holdSilent;
  let opacity = Math.min(1, (opts.opacity != null ? Number(opts.opacity) : 0.95) * (look.opacityMul || 1));
  if (!Number.isFinite(opacity)) opacity = 0.95;
  if (holdSilent) opacity = Math.max(0.05, Math.min(0.35, opacity));
  else opacity = Math.max(0.9, opacity); // Characters-on floor ≥0.9

  // Dance motion (stacks on cast — never replaces / hides). HoldSilent → none.
  const dance = applyDanceMotion({
    action,
    look,
    kind: opts.kind,
    archetype: look.archetype || opts.archetype,
    roles: opts.roles || {},
    roleId: opts.roleId,
    rolePulse: opts.rolePulse,
    danceIntent: opts.danceIntent,
    speechLike: opts.speechLike,
    holdSilent: opts.holdSilent,
    vibe: opts.vibe,
    section: opts.section,
    genreFamily: opts.genreFamily || opts.genre,
    energy: opts.energy ?? opts.audioEnergy,
    arousal: opts.arousal,
    t,
    i,
    scale
  });

  // formation lean variance per index; lead readable when formation
  const leanExtra = look.formation ? (i - 1) * 0.04 : (i % 2 === 0 ? 1 : -1) * 0.02;
  if (look.formation && i === 0) scale *= 1.22; // lead biggest in formation
  const shape = look.shape || {};
  let lean = (shape.lean || 0) + leanExtra + (dance.leanAdd || 0);
  const chaosAsym = look.archetype === 'chaos_fracture' ? 1.15 + (i % 3) * 0.08 : 1;
  const vocalist = _isVocalistLead(opts, look);

  let bodyH = (shape.bodyH || 36);
  let bodyW = (shape.bodyW || 12) * chaosAsym;
  let headR = shape.headR || 7;
  // Vocalist / FG performer: open-chest + singing lean (phone-readable, not face)
  if (vocalist) {
    bodyW *= 1.1;
    lean += 0.1;
    if (look.archetype === 'fg_performer' || /vocal|lead|performer/.test((opts.roleId || '').toString().toLowerCase())) {
      bodyH *= 1.04;
    }
  }
  if (action === 'kneel' || action === 'kneeling') bodyH *= 0.68;

  let bodyTop = baseY - bodyH * scale;
  // Feet stay on baseY — float/dissolve lift body slightly but keep contact read
  if (action === 'float' || action === 'dissolve' || action === 'fly') {
    bodyTop -= Math.min(14, 6 + Math.sin(t * 0.8 + i) * 5);
  }
  if (action === 'run' || action === 'running') {
    bodyTop -= 2;
  }
  // Dance bob compresses DOWN toward baseY (no sticker float)
  if (dance.active && dance.bob) {
    bodyTop += Math.min(bodyH * scale * 0.18, dance.bob);
  }

  // Hip shift must read on phone — was *0.15 (near-frozen); intent gets fuller travel
  const fx = x0 + (dance.hipShift || 0) * (dance.intentBoost ? 0.72 : 0.45);
  const headY = bodyTop;
  const chestY = bodyTop + bodyH * scale * 0.35;
  const leanPx = lean * 10 * scale;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Spin pivots at feet (baseY) — readable sweep, not full 3D
  if (dance.active && dance.rot) {
    ctx.translate(fx, baseY);
    ctx.rotate(dance.rot);
    ctx.translate(-fx, -baseY);
  }

  // Empty chair proxy
  if (look.emptyChair || look.outfitId === 'empty_chair') {
    _drawChair(ctx, fx, baseY, scale, look);
    ctx.restore();
    return { chestY: baseY - 20 * scale, headY: baseY - 28 * scale, fx, baseY, scale, handY: baseY - 14 * scale, bodyH: 20 * scale };
  }

  // Fauna — refused under hardLock (warzone never deer/soft green)
  if (!hardDraw && (look.fauna || (look.accessories && look.accessories.includes('fauna')))) {
    _drawFauna(ctx, fx, baseY, scale, look, t, i);
    ctx.restore();
    return { chestY: baseY - 12 * scale, headY: baseY - 22 * scale, fx, baseY, scale, handY: baseY - 8 * scale, bodyH: 14 * scale };
  }

  const pal = look.palette;
  const style = look.style || 'silhouette';

  // Desk lamp warm oval behind figure
  if (look.keyLight === 'desk_warm' || (look.accessories && look.accessories.includes('desk_lamp'))) {
    const g = ctx.createRadialGradient(fx - 12 * scale, bodyTop + 8 * scale, 2, fx, chestY, 40 * scale);
    g.addColorStop(0, 'rgba(255,200,120,0.35)');
    g.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fx - 4 * scale, chestY, 36 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cloak underlay (bold cape wedge + coat/trim drawn after body via _drawOutfitSilhouetteDiffs)
  if ((shape.cloak || 0) > 0.35 || (look.accessories && look.accessories.includes('cloak'))) {
    ctx.fillStyle = pal.shadow || pal.fill;
    ctx.globalAlpha = opacity * 0.4;
    const wing = (bodyW * scale) * 0.95;
    ctx.beginPath();
    ctx.moveTo(fx - 4 * scale + leanPx * 0.2, bodyTop + 4 * scale);
    ctx.quadraticCurveTo(fx - wing + leanPx, baseY - 4 * scale, fx - wing * 0.55 + leanPx, baseY);
    ctx.lineTo(fx + wing * 0.45 + leanPx, baseY);
    ctx.quadraticCurveTo(fx + wing * 0.75 + leanPx, baseY - 8 * scale, fx + 5 * scale + leanPx * 0.2, bodyTop + 6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = opacity;
  }

  if (style === 'neon') {
    // Brighter neon rim (≥0.9) + thicker stroke
    ctx.strokeStyle = _brightRim(pal.rim, 0.92);
    ctx.lineWidth = 2.8 * scale;
    ctx.shadowColor = pal.accent || pal.rim;
    ctx.shadowBlur = 14 + scale * 8;
    _drawBodyPath(ctx, fx, bodyTop, bodyH, bodyW, lean, shape.torn || 0, shape.cloak || 0, shape.longCoat, 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(fx + leanPx * 0.25, headY, headR * scale, 0, Math.PI * 2);
    ctx.stroke();
    // magenta secondary edge tick
    ctx.shadowBlur = 0;
    ctx.strokeStyle = pal.accent || 'rgba(255,60,180,0.6)';
    ctx.lineWidth = 1.1 * scale;
    ctx.beginPath();
    ctx.moveTo(fx + (bodyW * 0.5) * scale + leanPx, bodyTop + 4 * scale);
    ctx.lineTo(fx + (bodyW * 0.55) * scale + leanPx, bodyTop + bodyH * scale * 0.6);
    ctx.stroke();
  } else if (style === 'dream') {
    // Dream fill alpha ≥0.55
    ctx.fillStyle = _ensureFillAlpha(pal.fill, 0.55);
    ctx.shadowColor = pal.rim;
    ctx.shadowBlur = 16 + scale * 8;
    _drawBodyPath(ctx, fx, bodyTop, bodyH, bodyW, lean, shape.torn || 0, shape.cloak || 0, shape.longCoat, 1);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + leanPx * 0.25, headY, headR * scale * 1.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // soft dissolve rim
    ctx.globalAlpha = opacity * 0.35;
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = 1.5 * scale;
    _drawBodyPath(ctx, fx, bodyTop - 2, bodyH + 2, bodyW * 1.08, lean, 0, 0, false, 1);
    ctx.stroke();
    ctx.globalAlpha = opacity;
    if (look.archetype === 'cosmic_dissolve' || look.outfitId === 'star_dust' || (look.accessories && look.accessories.includes('particles'))) {
      _drawStarParticles(ctx, fx, bodyTop, bodyH, scale, t, pal);
    }
  } else {
    // silhouette — high-contrast near-black fill
    ctx.fillStyle = 'rgba(5,6,10,0.96)';
    if (action === 'kneel' || action === 'kneeling') {
      ctx.fillRect(fx - 10 * scale + leanPx, baseY - 8 * scale, 20 * scale, 8 * scale);
    }
    _drawBodyPath(ctx, fx, bodyTop, bodyH, bodyW, lean, shape.torn || 0, shape.cloak || 0, shape.longCoat, 1);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + leanPx * 0.25, headY, headR * scale, 0, Math.PI * 2);
    ctx.fill();
    // soft rim hint — brighter for phone readability
    if ((look.rimRoughness || 0) < 0.5) {
      ctx.globalAlpha = opacity * 0.4;
      ctx.strokeStyle = _brightRim(pal.rim, 0.75);
      ctx.lineWidth = 1.6 * scale;
      _drawBodyPath(ctx, fx, bodyTop, bodyH, bodyW, lean, shape.torn || 0, shape.cloak || 0, shape.longCoat, 1);
      ctx.stroke();
      ctx.globalAlpha = opacity;
    }
  }

  // Bold outfit silhouette diffs (coat/cloak/trim/hood/ember) — phone-readable wedges, no face detail
  _drawOutfitSilhouetteDiffs(ctx, fx, bodyTop, bodyH, bodyW, lean, scale, look, opacity);

  // Vocalist / FG performer silhouette (mic-stand + raised forearm + open chest)
  if (vocalist && !holdSilent) {
    const vocOp = (opts.hardLock || (opts.aggression || 0) >= 0.55)
      ? Math.max(opacity, 0.96)
      : opacity;
    // Hard lock: thicker phone-readable coat/mic wedge (never soft pastoral blob)
    let vLook = look;
    if (opts.hardLock && look.palette) {
      vLook = {
        ...look,
        palette: _forceWarzonePalette(look.palette)
      };
    }
    _drawVocalistSilhouette(ctx, fx, bodyTop, bodyH, bodyW * (opts.hardLock ? 1.12 : 1), lean, scale * (opts.hardLock ? 1.04 : 1), vLook, vocOp, t, headY, chestY, baseY);
  }

  // Obscure face (dread)
  if (shape.obscureFace || (look.accessories && look.accessories.includes('obscure'))) {
    ctx.fillStyle = pal.shadow || 'rgba(4,4,8,0.75)';
    ctx.globalAlpha = opacity * 0.75;
    ctx.beginPath();
    ctx.ellipse(fx + leanPx * 0.25, headY, headR * scale * 1.35, headR * scale * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = opacity;
  }

  // Torn edge jags already in path; ash dust for fracture
  if ((shape.torn || 0) > 0.5) {
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = opacity * 0.3;
    for (let a = 0; a < 3; a++) {
      ctx.beginPath();
      ctx.arc(fx + (a - 1) * 6 * scale + leanPx, baseY - 2 - a * 3, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = opacity;
  }

  // Ember particles on rim
  if (look.accessories && look.accessories.includes('ember')) {
    const prev = ctx.globalAlpha;
    _drawEmberParticles(ctx, fx, bodyTop, bodyH, scale, t, pal);
    ctx.globalAlpha = prev;
  }

  // Cosmic particle rim even on non-dream if star_dust
  if (style !== 'dream' && (look.outfitId === 'star_dust' || (look.accessories && look.accessories.includes('particles')))) {
    const prev = ctx.globalAlpha;
    _drawStarParticles(ctx, fx, bodyTop, bodyH, scale, t, pal);
    ctx.globalAlpha = prev;
  }

  // Readable dance feet on ground plane (step/sway/spin) — contact, not float
  if (dance.active && (dance.motion === 'step' || dance.motion === 'sway' || dance.motion === 'spin')) {
    const prevA = ctx.globalAlpha;
    const feetGain = dance.intentBoost ? 1.35 : 1.0;
    ctx.globalAlpha = opacity * Math.min(0.95, (0.45 + dance.amp * 0.45) * feetGain);
    ctx.fillStyle = (pal && pal.rim) ? _brightRim(pal.rim, 0.8) : 'rgba(255,240,220,0.75)';
    const fw = 4.8 * scale * feetGain;
    const fh = 2.4 * scale * feetGain;
    ctx.beginPath();
    ctx.ellipse(fx - 6.5 * scale + (dance.footL || 0), baseY - fh * 0.2, fw, fh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(fx + 6.5 * scale + (dance.footR || 0), baseY - fh * 0.2, fw, fh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = prevA;
  }

  ctx.shadowBlur = 0;
  ctx.restore();
  const handY = chestY + (baseY - chestY) * 0.35;
  return { chestY, headY, fx, baseY, scale, handY, bodyH: bodyH * scale, dance: dance.active ? dance.motion : 'none', vocalist: !!vocalist };
}



/** Weapon ids Visual draws (MUSIC-BRIEF-20260924-2135 + classic props). */
export const WEAPON_IDS = [
  'blade', 'spear', 'rifle', 'rifle_sil', 'rifle_silhouette', 'staff', 'shield', 'energy_arc',
  'handgun', 'handgun_beat', 'scope_flash', 'burden_suit', 'ash_aftermath',
  'scrap_turret', 'riot_baton'
];

/**
 * Role-agent pulse FX — stacks ON scenic type + visible cast (never replaces/hides).
 * Pulses from member.rolePulse or live audio.roles[roleId].
 */
export function drawRoleAgentFx(ctx, drawn, opts = {}) {
  if (!drawn || !ctx) return;
  const roleId = (opts.roleId || 'vocalish').toString().toLowerCase();
  const roles = opts.roles || {};
  let pulse = opts.rolePulse != null ? Number(opts.rolePulse) : 0;
  const live = Math.max(
    roles[roleId] || 0,
    roleId === 'vocalish' || roleId === 'lead' ? Math.max(roles.lead || 0, roles.vocalish || 0) : 0
  );
  pulse = Math.max(0, Math.min(1, Math.max(pulse, live)));
  if (pulse < 0.08 && roleId !== 'pads' && roleId !== 'bass') return;

  const fx = drawn.fx;
  const chestY = drawn.chestY;
  const headY = drawn.headY;
  const baseY = drawn.baseY != null ? drawn.baseY : chestY + 40;
  const scale = drawn.scale || 1;
  const look = opts.look || {};
  const arch = look.archetype || opts.archetype || '';
  const t = opts.t || 0;
  const chaosOk = /chaos_fracture|ash_survivor|dread/.test(arch) || opts.chaosOk;

  ctx.save();

  if (roleId === 'vocalish' || roleId === 'lead' || roleId === 'vocal' || roleId === 'performer' || roleId === 'singer') {
    // Chest / mouth glow on lyric figure
    const a = 0.18 + pulse * 0.55;
    ctx.globalAlpha = Math.min(0.85, a);
    const g = ctx.createRadialGradient(fx, chestY, 2, fx, chestY, 22 * scale + pulse * 18);
    g.addColorStop(0, `rgba(255,245,220,${0.55 + pulse * 0.35})`);
    g.addColorStop(0.45, `rgba(255,220,160,${0.25 + pulse * 0.25})`);
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fx, chestY, 24 * scale + pulse * 16, 0, Math.PI * 2);
    ctx.fill();
    // Mouth tip glow
    ctx.globalAlpha = 0.25 + pulse * 0.45;
    ctx.fillStyle = 'rgba(255,250,240,0.9)';
    ctx.beginPath();
    ctx.arc(fx, headY + 2 * scale, 2.2 * scale + pulse * 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Soft mic-head pulse near mouth (stacks with vocalist silhouette; soft-clip safe)
    if (drawn.vocalist || arch === 'fg_performer' || pulse > 0.35) {
      ctx.globalAlpha = 0.2 + pulse * 0.4;
      ctx.strokeStyle = 'rgba(255,230,180,0.85)';
      ctx.lineWidth = Math.max(1.6, 2.2 * scale * 0.3);
      ctx.beginPath();
      ctx.ellipse(fx + 5 * scale, headY + 3 * scale, 3.5 * scale + pulse * 1.5, 2.2 * scale, -0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (roleId === 'kick') {
    // Foot ground punch
    const a = 0.2 + pulse * 0.6;
    ctx.globalAlpha = Math.min(0.8, a);
    const eg = ctx.createRadialGradient(fx, baseY, 2, fx, baseY, 28 * scale + pulse * 22);
    eg.addColorStop(0, `rgba(255,200,100,${0.5 + pulse * 0.4})`);
    eg.addColorStop(0.5, `rgba(255,160,60,${0.25 + pulse * 0.25})`);
    eg.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.ellipse(fx, baseY, 22 * scale + pulse * 16, 6 * scale + pulse * 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dust ticks
    ctx.strokeStyle = `rgba(255,220,160,${0.35 + pulse * 0.4})`;
    ctx.lineWidth = 1.2;
    for (let d = 0; d < 4; d++) {
      const ang = -Math.PI / 2 + (d - 1.5) * 0.35;
      ctx.beginPath();
      ctx.moveTo(fx, baseY);
      ctx.lineTo(fx + Math.cos(ang) * (10 + pulse * 14) * scale, baseY + Math.sin(ang) * 6 * scale);
      ctx.stroke();
    }
  } else if (roleId === 'snare') {
    // Companion mid flash
    ctx.globalAlpha = 0.2 + pulse * 0.55;
    const sg = ctx.createRadialGradient(fx, chestY, 2, fx, chestY, 30 * scale + pulse * 20);
    sg.addColorStop(0, `rgba(255,255,255,${0.45 + pulse * 0.4})`);
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(fx, chestY, 28 * scale + pulse * 18, 0, Math.PI * 2);
    ctx.fill();
  } else if (roleId === 'hats') {
    // Owned sparks / fauna mites on this agent (not ownerless beds)
    const n = Math.floor(3 + pulse * 8);
    ctx.globalAlpha = 0.35 + pulse * 0.5;
    for (let p = 0; p < n; p++) {
      const ang = t * 1.6 + p * 1.1;
      const rad = (10 + p * 3) * scale;
      const px = fx + Math.cos(ang) * rad;
      const py = headY - 6 * scale + Math.sin(ang * 1.3) * rad * 0.55;
      if (opts.faunaHats) {
        ctx.fillStyle = 'rgba(180,220,120,0.75)';
        ctx.beginPath();
        ctx.ellipse(px, py, 2.2 * scale, 1.1 * scale, ang, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = `rgba(220,230,255,${0.5 + pulse * 0.4})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 1.2, py + 5 + pulse * 4);
        ctx.stroke();
      }
    }
  } else if (roleId === 'bass') {
    // Shadow / scale weight under body (beast shadow when scary/chaos)
    ctx.globalAlpha = 0.25 + pulse * 0.45;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const sw = 18 * scale * (1.2 + pulse * 0.5);
    ctx.beginPath();
    ctx.ellipse(fx, baseY + 2, sw, 5 * scale + pulse * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (opts.beastBass || /void_presence|chaos|dread|scary/.test(arch + (opts.vibe || ''))) {
      ctx.globalAlpha = 0.15 + pulse * 0.25;
      ctx.fillStyle = 'rgba(20,10,8,0.7)';
      ctx.beginPath();
      ctx.ellipse(fx - 8 * scale, baseY - 8 * scale, 14 * scale, 6 * scale, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (roleId === 'pads') {
    // Fog / aura spirit halo
    const a = 0.12 + Math.max(pulse, live) * 0.4;
    ctx.globalAlpha = Math.min(0.55, a);
    const ag = ctx.createRadialGradient(fx, chestY, 4, fx, chestY, 50 * scale + pulse * 30);
    ag.addColorStop(0, 'rgba(200,210,255,0.35)');
    ag.addColorStop(0.5, 'rgba(180,200,255,0.12)');
    ag.addColorStop(1, 'rgba(160,180,255,0)');
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(fx, chestY, 48 * scale + pulse * 24, 0, Math.PI * 2);
    ctx.fill();
  } else if (roleId === 'harsh') {
    // Ash / glitch ONLY on chaos bodies
    if (!chaosOk && !/chaos_fracture|ash_survivor/.test(arch)) {
      ctx.restore();
      return;
    }
    ctx.globalAlpha = 0.25 + pulse * 0.5;
    ctx.fillStyle = `rgba(200,180,160,${0.4 + pulse * 0.4})`;
    for (let a = 0; a < 6; a++) {
      const px = fx + (a - 2.5) * 5 * scale + Math.sin(t * 3 + a) * 3;
      const py = headY + (a % 3) * 8 * scale + (t * 20 + a * 7) % (30 * scale);
      ctx.fillRect(px, py, 1.5 + (a % 2), 1.5 + (a % 2));
    }
    // Tear ticks
    ctx.strokeStyle = `rgba(255,255,255,${0.2 + pulse * 0.35})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx - 8 * scale, chestY - 4 * scale);
    ctx.lineTo(fx + 10 * scale, chestY + 6 * scale);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Stylized weapon outline attached to figure hand/back.
 * Simple geometric paths — silhouette / neon / dream, not photoreal.
 */
export function drawWeaponProp(ctx, drawn, opts = {}) {
  if (!drawn || !ctx) return;
  let wid = (opts.weaponId || '').toString().toLowerCase().replace(/-/g, '_');
  if (!wid || wid === 'none') return;

  const look = opts.look || {};
  const arch = (look.archetype || opts.archetype || '').toString().toLowerCase();
  const irony = !!(opts.lyricIrony || opts.irony || look.lyricIrony || look.irony);
  // Never dress pastoral / nature / spoken in war props unless irony flag
  const peaceArch = /pastoral_walker|nature_fauna|spoken_intimate/.test(arch);
  if (peaceArch && !irony) return;

  // Aliases (MUSIC-BRIEF-20260924-2135 + movie grammar)
  if (wid === 'rifle_sil' || wid === 'rifle_silhouette') wid = 'rifle';
  if (wid === 'energyarc') wid = 'energy_arc';
  if (wid === 'handgun_beat' || wid === 'pistol') wid = 'handgun';
  if (wid === 'baton' || wid === 'riot_stick') wid = 'riot_baton';
  if (wid === 'turret' || wid === 'scrap_gun') wid = 'scrap_turret';
  // scope_flash draws as rifle + optional muzzle tick below

  const known = [
    'blade', 'spear', 'rifle', 'staff', 'shield', 'energy_arc',
    'handgun', 'scope_flash', 'burden_suit', 'ash_aftermath',
    'scrap_turret', 'riot_baton'
  ];
  if (!known.includes(wid)) return;

  const fx = drawn.fx;
  const chestY = drawn.chestY;
  const headY = drawn.headY;
  const baseY = drawn.baseY != null ? drawn.baseY : chestY + 40;
  // Phone-readable prop scale — thicker / larger especially guns for warzone packs
  const packStr = (opts.packId || opts.worldPack || look.packId || opts.world || '').toString().toLowerCase();
  const warzone = /warzone|fracture|combat|industrial|chaos|ash/.test(packStr + ' ' + arch) || !!opts.hardLock;
  const phoneMul = warzone ? (opts.hardLock ? 1.65 : 1.35) : 1.2;
  const scale = (drawn.scale || 1) * (opts.scaleMul || 1) * phoneMul;
  const style = (opts.style || look.style || 'silhouette').toString().toLowerCase();
  const handY = drawn.handY != null ? drawn.handY : chestY + 8 * scale;
  // Hand bias: right side of body; back = behind for shield/spear carry — no floating stickers
  const handX = fx + 11 * scale;
  const backX = fx - 9 * scale;

  const events = opts.events || [];
  const evHit = (name) => {
    for (const ev of events) {
      if (ev === name) return true;
      if (ev && typeof ev === 'object' && (ev.type === name || ev.id === name || ev.name === name)) return true;
    }
    return false;
  };
  const muzzleTick = wid === 'scope_flash' || evHit('scope_flash') || evHit('handgun_beat');

  ctx.save();
  ctx.globalAlpha = Math.max(0.65, Math.min(0.98, opts.opacity != null ? Number(opts.opacity) : 0.92));

  if (style === 'neon') {
    ctx.strokeStyle = _brightRim((look.palette && look.palette.rim) || 'rgba(80,255,230,0.95)', 0.92);
    ctx.fillStyle = 'rgba(6,8,12,0.55)';
    ctx.lineWidth = 3.0 * scale;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
  } else if (style === 'dream') {
    ctx.strokeStyle = 'rgba(220,220,255,0.85)';
    ctx.fillStyle = _ensureFillAlpha('rgba(200,200,230,0.5)', 0.5);
    ctx.lineWidth = 2.4 * scale;
    ctx.shadowColor = 'rgba(200,210,255,0.55)';
    ctx.shadowBlur = 12;
  } else {
    // High-contrast silhouette rim — phone distance
    ctx.strokeStyle = 'rgba(245,245,255,0.95)';
    ctx.fillStyle = 'rgba(5,6,10,0.95)';
    ctx.lineWidth = 2.8 * scale;
    ctx.shadowBlur = 0;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (wid === 'burden_suit') {
    // No gun — heavy isolation rim / shadow on figure (Hurt Locker weight)
    ctx.shadowBlur = 0;
    ctx.globalAlpha = Math.min(0.8, 0.4 + (opts.opacity != null ? Number(opts.opacity) : 0.7) * 0.45);
    ctx.strokeStyle = 'rgba(40,36,30,0.9)';
    ctx.lineWidth = 4.0 * scale;
    ctx.beginPath();
    ctx.ellipse(fx, chestY + 2 * scale, 18 * scale, 24 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(fx, baseY + 2, 22 * scale, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(60,50,40,0.75)';
    ctx.lineWidth = 2.6 * scale;
    ctx.beginPath();
    ctx.moveTo(fx - 14 * scale, chestY);
    ctx.lineTo(fx + 14 * scale, chestY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  if (wid === 'ash_aftermath') {
    // Discarded broken glyph near feet (not floating)
    ctx.shadowBlur = 0;
    const gx = fx + 16 * scale;
    const gy = baseY - 3 * scale;
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = 'rgba(200,180,150,0.85)';
    ctx.fillStyle = 'rgba(30,24,18,0.75)';
    ctx.lineWidth = 2.0 * scale;
    ctx.beginPath();
    ctx.moveTo(gx - 8 * scale, gy);
    ctx.lineTo(gx + 5 * scale, gy - 2 * scale);
    ctx.lineTo(gx + 3 * scale, gy - 10 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx - 3 * scale, gy - 1 * scale);
    ctx.lineTo(gx + 10 * scale, gy + 1 * scale);
    ctx.stroke();
    ctx.fillStyle = 'rgba(210,190,160,0.55)';
    for (let a = 0; a < 4; a++) {
      ctx.fillRect(gx + (a - 1.5) * 4.5 * scale, gy - 5 * scale - a * 2, 2, 2);
    }
    ctx.restore();
    return;
  }

  if (wid === 'blade') {
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(handX + 4 * scale, handY - 26 * scale);
    ctx.lineTo(handX + 1.5 * scale, handY - 28 * scale);
    ctx.lineTo(handX - 2.5 * scale, handY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(handX - 5 * scale, handY - 1 * scale);
    ctx.lineTo(handX + 6 * scale, handY - 1 * scale);
    ctx.stroke();
  } else if (wid === 'spear') {
    const sx = handX - 2 * scale;
    ctx.lineWidth = Math.max(ctx.lineWidth, 3.2 * scale);
    ctx.beginPath();
    ctx.moveTo(sx, baseY - 4 * scale);
    ctx.lineTo(sx + 2 * scale, headY - 20 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 2 * scale, headY - 20 * scale);
    ctx.lineTo(sx - 4 * scale, headY - 11 * scale);
    ctx.lineTo(sx + 8 * scale, headY - 11 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (wid === 'rifle' || wid === 'scope_flash') {
    // Phone-bold long gun at hand — thicker stock + barrel (warzone readable)
    const rx = handX - 6 * scale;
    const ry = handY - 3 * scale;
    const bodyLen = 36 * scale;
    const bodyH = 6.5 * scale;
    ctx.fillRect(rx, ry, bodyLen, bodyH);
    ctx.strokeRect(rx, ry, bodyLen, bodyH);
    // Barrel
    ctx.lineWidth = Math.max(2.6, 3.2 * scale);
    ctx.beginPath();
    ctx.moveTo(rx + bodyLen, ry + bodyH * 0.35);
    ctx.lineTo(rx + bodyLen + 12 * scale, ry + bodyH * 0.35);
    ctx.stroke();
    // Mag well
    ctx.fillRect(rx + bodyLen * 0.42, ry + bodyH, 5 * scale, 7 * scale);
    ctx.strokeRect(rx + bodyLen * 0.42, ry + bodyH, 5 * scale, 7 * scale);
    // Stock
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 9 * scale, ry + 8 * scale);
    ctx.lineTo(rx - 7 * scale, ry + bodyH + 4 * scale);
    ctx.lineTo(rx, ry + bodyH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Optic bump
    ctx.fillRect(rx + bodyLen * 0.55, ry - 3.5 * scale, 8 * scale, 3.5 * scale);
    ctx.strokeRect(rx + bodyLen * 0.55, ry - 3.5 * scale, 8 * scale, 3.5 * scale);
    if (wid === 'scope_flash' || muzzleTick) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = 'rgba(255,240,200,0.98)';
      ctx.fillStyle = 'rgba(255,220,140,0.9)';
      ctx.lineWidth = 1.8 * scale;
      const mx = rx + bodyLen + 12 * scale;
      const my = ry + bodyH * 0.4;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + 8 * scale, my - 4 * scale);
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + 9 * scale, my);
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + 8 * scale, my + 4 * scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mx + 1.5 * scale, my, 3.0 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (wid === 'handgun') {
    // Compact pistol — enlarged for phone (This Is America ruthless beat)
    const px = handX;
    const py = handY;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 14 * scale, py - 1.5 * scale);
    ctx.lineTo(px + 16 * scale, py + 2 * scale);
    ctx.lineTo(px + 3 * scale, py + 4.5 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Grip down (thicker)
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - 3 * scale, py + 11 * scale);
    ctx.lineTo(px + 3.5 * scale, py + 11 * scale);
    ctx.lineTo(px + 3 * scale, py + 3 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Trigger guard
    ctx.beginPath();
    ctx.arc(px + 4 * scale, py + 5 * scale, 3.2 * scale, 0.2, Math.PI - 0.1);
    ctx.stroke();
    if (muzzleTick) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = 'rgba(255,230,180,0.95)';
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.moveTo(px + 16 * scale, py);
      ctx.lineTo(px + 22 * scale, py - 3 * scale);
      ctx.moveTo(px + 16 * scale, py);
      ctx.lineTo(px + 22 * scale, py + 3 * scale);
      ctx.stroke();
    }
  } else if (wid === 'riot_baton') {
    // Short thick stick from hand — civil chaos without gun fetish
    const bx = handX;
    const by = handY;
    ctx.lineWidth = Math.max(4.0, 5.2 * scale);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 4 * scale, by - 22 * scale);
    ctx.stroke();
    // Handle bulb
    ctx.beginPath();
    ctx.arc(bx, by + 1 * scale, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Tip cap
    ctx.beginPath();
    ctx.arc(bx + 4 * scale, by - 22 * scale, 2.8 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (wid === 'scrap_turret') {
    // Fury Road world-function — chunky mounted gun at hip/hand (attached, not sticker)
    const tx = handX - 2 * scale;
    const ty = handY + 2 * scale;
    // Mount plate at hip
    ctx.fillRect(fx + 4 * scale, chestY + 6 * scale, 10 * scale, 8 * scale);
    ctx.strokeRect(fx + 4 * scale, chestY + 6 * scale, 10 * scale, 8 * scale);
    // Barrel housing (L-chunk)
    ctx.fillRect(tx, ty - 4 * scale, 22 * scale, 9 * scale);
    ctx.strokeRect(tx, ty - 4 * scale, 22 * scale, 9 * scale);
    ctx.fillRect(tx + 18 * scale, ty - 2 * scale, 14 * scale, 5 * scale);
    ctx.strokeRect(tx + 18 * scale, ty - 2 * scale, 14 * scale, 5 * scale);
    // Support strut to body
    ctx.lineWidth = Math.max(2.4, 3.0 * scale);
    ctx.beginPath();
    ctx.moveTo(fx + 8 * scale, chestY + 10 * scale);
    ctx.lineTo(tx + 4 * scale, ty);
    ctx.stroke();
    // Scrap teeth
    ctx.beginPath();
    ctx.moveTo(tx + 2 * scale, ty - 4 * scale);
    ctx.lineTo(tx + 5 * scale, ty - 8 * scale);
    ctx.lineTo(tx + 8 * scale, ty - 4 * scale);
    ctx.stroke();
  } else if (wid === 'staff') {
    ctx.lineWidth = Math.max(ctx.lineWidth, 3.0 * scale);
    ctx.beginPath();
    ctx.moveTo(handX, baseY - 2 * scale);
    ctx.lineTo(handX + 1 * scale, headY - 16 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(handX + 1 * scale, headY - 18 * scale, 4.2 * scale, 0, Math.PI * 2);
    ctx.stroke();
  } else if (wid === 'shield') {
    ctx.beginPath();
    ctx.ellipse(backX, chestY + 4 * scale, 11 * scale, 16 * scale, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(backX, chestY + 4 * scale, 6 * scale, 10 * scale, -0.15, 0, Math.PI * 2);
    ctx.stroke();
  } else if (wid === 'energy_arc') {
    ctx.lineWidth = Math.max(ctx.lineWidth, 2.8 * scale);
    ctx.beginPath();
    ctx.arc(handX + 4 * scale, handY - 8 * scale, 14 * scale, -1.1, 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(handX + 4 * scale, handY - 8 * scale, 9 * scale, -0.9, 0.4);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}


export default {
  ARCHETYPE_IDS,
  OUTFIT_IDS,
  WEAPON_IDS,
  STYLES,
  OUTFITS,
  ARCHETYPES,
  resolveCastLook,
  applyDanceMotion,
  drawCastFigure,
  drawRoleAgentFx,
  drawWeaponProp,
  mapLegacyKind
};
