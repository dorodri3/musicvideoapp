/**
 * Memory of world, scenes, motifs, colors, symbols, callbacks, cast, motif props.
 * Motifs established in verse/pre return as stronger callbacks on chorus/outro.
 * Cast identity sticks across verse→chorus (amplify, don't swap planet of people).
 */
export class NarrativeState {
  constructor() {
    this.reset();
  }

  reset() {
    this.world = {
      theme: '',
      established: false,
      palette: [],
      motifs: [],
      /** @type {Map<string, {strength:number, establishedIn:string, variants:string[]}>} */
      motifBook: new Map(),
      symbolsSeen: [],
      sceneHistory: [],
      lastPreset: null,
      callbacksQueued: [],
      fantasySeed: '',
      /** Sticky cast identity for amplify-on-chorus */
      castIdentity: null,
      /** Planted motif prop ids for callbacks */
      plantedProps: [],
      /** Pack family id for verse→chorus continuity */
      packFamily: null,
      /** Sticky role→agent bindings for section life (ROLE-AGENTS) */
      roleBindings: null,
      /** Sticky weaponId for section life (MOVIE-NOTES war grammar) */
      stickyWeaponId: null,
      /** Soft genre family id (GENRE-MAP pleasure) */
      genreFamily: null,
      pleasureIntent: null
    };
  }

  setTheme(theme, motifs = [], palette = [], fantasySeed = '') {
    this.world.theme = theme;
    this.world.motifs = motifs.slice(0, 4);
    this.world.palette = palette;
    this.world.fantasySeed = fantasySeed;
    for (const m of this.world.motifs) {
      if (!this.world.motifBook.has(m)) {
        this.world.motifBook.set(m, {
          strength: 0.4,
          establishedIn: 'theme',
          variants: [m]
        });
      }
    }
  }

  rememberScene(presetId, sectionType, t) {
    this.world.sceneHistory.push({ presetId, sectionType, t });
    if (this.world.sceneHistory.length > 40) this.world.sceneHistory.shift();
    this.world.lastPreset = presetId;
    this.world.established = true;
  }

  rememberSymbol(sym) {
    if (sym && !this.world.symbolsSeen.includes(sym)) {
      this.world.symbolsSeen.push(sym);
    }
  }

  setPackFamily(familyId) {
    if (familyId) this.world.packFamily = familyId;
  }

  getPackFamily() {
    return this.world.packFamily;
  }

  setGenreFamily(id, pleasureIntent = null) {
    if (id) this.world.genreFamily = id;
    if (pleasureIntent) this.world.pleasureIntent = pleasureIntent;
  }

  getGenreFamily() {
    return this.world.genreFamily;
  }

  getPleasureIntent() {
    return this.world.pleasureIntent;
  }

  /**
   * Lock cast identity in verse/pre so chorus amplifies the same people.
   * @param {object} cast
   */
  establishCast(cast) {
    if (!cast || cast.kind === 'none') return;
    if (!this.world.castIdentity) {
      this.world.castIdentity = {
        kind: cast.kind,
        action: cast.action,
        placement: cast.placement,
        conceptId: cast.conceptId || null,
        count: cast.count || 1,
        characterId: cast.characterId || null,
        archetype: cast.archetype || null,
        outfitId: cast.outfitId || null,
        style: cast.style || null
      };
    } else {
      // Refresh concept/action from live lyric but keep kind family + sticky character
      const id = this.world.castIdentity;
      if (cast.conceptId) id.conceptId = cast.conceptId;
      if (cast.action) id.action = cast.action;
      if (cast.characterId && !id.characterId) id.characterId = cast.characterId;
      if (cast.archetype && !id.archetype) id.archetype = cast.archetype;
      if (cast.outfitId) id.outfitId = cast.outfitId;
      if (cast.style) id.style = cast.style;
      // Allow kind upgrade silhouette→traveler etc. but not total swap mid-arc
      if (cast.kind && cast.kind !== 'none') {
        const soft = ['silhouette', 'figure_lone', 'traveler', 'dancer'];
        if (soft.includes(id.kind) && soft.includes(cast.kind)) {
          id.kind = cast.kind;
        }
      }
    }
  }

  getCastIdentity() {
    return this.world.castIdentity;
  }


  /** Soft pastoral / spoken / fauna sticky WHO (HOLD-0306 clear on pin). */
  isSoftCastIdentity(id = this.world.castIdentity) {
    if (!id) return false;
    const softArch = /^(pastoral_walker|nature_fauna|sacred_solitary|spoken_intimate|meadow_wanderer)$/;
    const softChar = /^(path_walker_dawn|meadow_wanderer|lake_shore_figure|autumn_road_traveler|heal_hands_open|hooded_pilgrim|crane_dusk|herd_silhouette|fish_motes|songbird_pair|stag_fog|butterflies_wash|close_confessor)$/;
    const softOutfit = /^(linen_dawn|moss_trail|aisle_linen|water_gloss|desk_lamp)$/;
    const softStyle = id.style === 'dream';
    return softArch.test(id.archetype || '')
      || softChar.test(id.characterId || '')
      || softOutfit.test(id.outfitId || '')
      || softStyle;
  }

  /** Clear soft sticky WHO immediately when aggression pin asserts. */
  clearSoftCastIdentity() {
    if (this.isSoftCastIdentity()) this.world.castIdentity = null;
  }

  /** Clear sticky WHO — only on earned ladder step change (Scene). */
  clearCastIdentity() {
    this.world.castIdentity = null;
  }

  /**
   * Sticky role→agent map for a sectionChangeId (do not reshuffle every tick).
   * @param {{ sectionChangeId:number, roleIds:string[], memberKeys?:string[] }} bindings
   */
  setRoleBindings(bindings) {
    if (!bindings) return;
    this.world.roleBindings = {
      sectionChangeId: bindings.sectionChangeId ?? null,
      roleIds: Array.isArray(bindings.roleIds) ? bindings.roleIds.slice() : [],
      memberKeys: Array.isArray(bindings.memberKeys) ? bindings.memberKeys.slice() : [],
      boundAt: Date.now()
    };
  }

  getRoleBindings() {
    return this.world.roleBindings;
  }

  clearRoleBindings() {
    this.world.roleBindings = null;
    this.world.stickyWeaponId = null;
  }

  setStickyWeapon(weaponId) {
    this.world.stickyWeaponId = weaponId || null;
  }

  getStickyWeapon() {
    return this.world.stickyWeaponId;
  }

  /**
   * Plant motif props in verse; chorus callbacks read these.
   * @param {string[]} propIds
   * @param {string} [sectionType]
   */
  plantProps(propIds, sectionType = 'verse') {
    if (!propIds?.length) return;
    for (const id of propIds) {
      if (!id) continue;
      if (!this.world.plantedProps.includes(id)) {
        this.world.plantedProps.push(id);
      }
      this.establishMotif(id, sectionType, 0.5);
      if (sectionType === 'verse' || sectionType === 'pre') {
        this.queueCallback(id, 'chorus', 0.55);
      }
    }
    if (this.world.plantedProps.length > 8) {
      this.world.plantedProps = this.world.plantedProps.slice(-8);
    }
  }

  plantedPropIds() {
    return this.world.plantedProps.slice();
  }

  /**
   * Establish a motif during verse/pre so later choruses can callback bigger.
   * @param {string} motifId
   * @param {string} sectionType
   * @param {number} [strength]
   */
  establishMotif(motifId, sectionType = 'verse', strength = 0.5) {
    if (!motifId) return;
    const book = this.world.motifBook;
    const prev = book.get(motifId);
    if (prev) {
      prev.strength = Math.max(prev.strength, strength);
      if (!prev.variants.includes(motifId)) prev.variants.push(motifId);
    } else {
      book.set(motifId, {
        strength,
        establishedIn: sectionType,
        variants: [motifId]
      });
    }
    if (!this.world.motifs.includes(motifId)) {
      this.world.motifs.push(motifId);
      if (this.world.motifs.length > 6) this.world.motifs.shift();
    }
  }

  /**
   * Queue a motif callback for later chorus/outro.
   * @param {string} motifId
   * @param {string} preferSection
   * @param {number} [strength] 0..1 — chorus repeat escalates this
   */
  queueCallback(motifId, preferSection = 'chorus', strength = 0.55) {
    if (!motifId) return;
    this.establishMotif(motifId, preferSection === 'chorus' ? 'verse' : preferSection, strength * 0.8);
    this.world.callbacksQueued.push({
      motifId,
      preferSection,
      strength,
      used: false,
      uses: 0
    });
  }

  /**
   * Take a motif callback for this section. Chorus can re-fire with rising strength
   * so repeats escalate rather than going silent after first use.
   * @param {string} sectionType
   * @param {number} [chorusRepeat]
   * @returns {{ motifId: string, strength: number, variant: string }|null}
   */
  takeCallback(sectionType, chorusRepeat = 1) {
    const pool = this.world.callbacksQueued.filter(
      c => !c.used || (sectionType === 'chorus' && c.preferSection === 'chorus')
    );
    let cb = pool.find(c => !c.used && (c.preferSection === sectionType || sectionType === 'outro'));
    if (!cb && sectionType === 'chorus') {
      cb = this.world.callbacksQueued.find(c => c.preferSection === 'chorus') || null;
    }
    if (!cb && sectionType === 'chorus' && this.world.motifs.length) {
      const mid = this.world.motifs[0];
      return this._packMotif(mid, chorusRepeat);
    }
    if (!cb) return null;

    if (sectionType === 'outro') {
      cb.used = true;
    } else if (sectionType === 'chorus') {
      cb.uses = (cb.uses || 0) + 1;
      if (chorusRepeat >= 3) cb.used = true;
    } else {
      cb.used = true;
    }

    return this._packMotif(cb.motifId, chorusRepeat, cb.strength);
  }

  _packMotif(motifId, chorusRepeat = 1, baseStrength = 0.55) {
    const book = this.world.motifBook.get(motifId);
    const est = book?.strength ?? 0.5;
    let strength = Math.min(1, baseStrength * 0.5 + est * 0.3 + chorusRepeat * 0.18);
    let variant = motifId;
    if (chorusRepeat >= 3) {
      variant = `${motifId}__peak`;
      strength = 1;
    } else if (chorusRepeat >= 2) {
      variant = `${motifId}__amplified`;
      strength = Math.min(1, strength + 0.15);
    }
    return { motifId, strength, variant, repeat: chorusRepeat };
  }

  /** Peek established motifs for director (no consume) */
  establishedMotifs() {
    return [...this.world.motifBook.entries()].map(([id, meta]) => ({ id, ...meta }));
  }

  recentPresets(n = 5) {
    return this.world.sceneHistory.slice(-n).map(s => s.presetId);
  }

  get() {
    return this.world;
  }
}
