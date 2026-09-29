# Audio frame roles — contract for Visual Engine & Scene Director

Every `AudioAnalyzer.update()` frame exposes **instrument-role proxies** (heuristic band/onset estimates, not ML stems). Prefer `audio.roles`. `audio.instruments` is the same object (back-compat).


## Role → persistent agents (ROLE-AGENTS)

`audio.roles.*` intensity drives **named persistent agents** in the world (not anonymous particles). Full map + persistence rules:

→ [`/workspace/light-show-versions/ROLE-AGENTS-20260924-2133.md`](/workspace/light-show-versions/ROLE-AGENTS-20260924-2133.md)

| Role | Agent (summary) | Envelope bias |
|------|-----------------|---------------|
| `lead` / `vocalish` | Lyric figure (hub) | Phrase-smooth |
| `kick` | Ground / footfalls (or drum-warden) | Sharp transient |
| `snare` | Companion clap / mid gesture | Sharp transient |
| `hats` | Spark accents / fauna mites | Clear ticks |
| `bass` | Weight / shadow (or low beast) | Slow smooth |
| `pads` | Sky / fog / aura spirit | Silk smooth |
| `harsh` | Glitch/ash on chaos figures only | Gate etch |

Spoken clamps keep kick/snare/harsh near floor so muted agents don’t false-act.

## Frame shape (audio-relevant)

| Field | Range | Meaning |
|-------|-------|---------|
| `rms`, `peak` | 0..1 | Waveform level |
| `centroid` | Hz | Spectral center |
| `flux` | ≥0 | Spectral change (onset fuel) |
| `bass`, `mid`, `treble` | 0..1 | Band averages (scenic modulation only — **not** bar heights) |
| `energy` | 0..1 | RMS + bass blend |
| `beat` | bool | Quantized beat tick |
| `onset` | 0..1 | Onset strength |
| `bpm` | ~60–180 | Running tempo estimate |
| `build` | 0..1 | Rising energy envelope |
| `drop` | 0..1 | Falling / impact envelope |
| `silence` | bool | Near-zero energy |
| **`roles`** | object | Instrument proxies below |
| `spectrum` | `null` | **Analysis-only.** Live frames expose `null` so nothing can draw an EQ/visualizer bar layer. Opt-in via `analyzer.setDebugSpectrum(true)` for HUD debug only. |

## Ban: spectrum / EQ bar layer (Quality gap 4)

- Do **not** draw `spectrum`, frequency bins, or band values as bars/columns/equalizer texture on the phone show.
- Do **not** pump skyline / LED column **height** from `audio.bass` or bin energy (that reads as an EQ).
- Instrument energy → **scenic verbs** only:

| Role | Scenic verb (stable) |
|------|----------------------|
| `kick` | Ground / horizon settle + short punch (not strobe) |
| `bass` | World weight / scale / vignette |
| `snare` | Mid-frame punctuation flash |
| `hats` | Densify *existing* rain / sparks (texture, not a new bar row) |
| `pads` | Sky grade / fog wash |
| `lead` / `vocalish` | Center beams + lyric emphasis |
| `harsh` | Short glitch / ash at gates — decay fast |

Roles are soft-clipped when many punch roles peak together (concert stack), and sparkle/harsh are floored on `silence`.

## `roles` (and `instruments`) — 0..1 each

| Key | Visual mapping (stable, readable) |
|-----|-----------------------------------|
| `kick` | Ground / horizon punch, camera shake |
| `bass` | World weight / scale, vignette |
| `snare` | Mid punch flash |
| `hats` | Sparks / rain needles |
| `pads` | Sky / fog wash |
| `lead` | Center beams + lyric emphasis |
| `vocalish` | Same as `lead` (band proxy); refine with `VocalEstimate` |
| `harsh` | Glitch / ash (short) |

## VocalEstimate (separate, stays useful)

`VocalEstimate.update(audioFrame)` → `{ activity, intensity, likelyVocal }`.

Use for lyric alignment nudges and extra lead/lyric emphasis. Do **not** replace `roles.lead` / `roles.vocalish` with it alone — blend.

## Ownership

- **Lyrics / concepts** → WHAT world (Scene Director / Lyrics Brain)
- **`roles` + beat/build/drop** → HOW it hits (Audio Pulse → Visual Engine)
- **Worlds Presets** → no bass→building-height EQ look

## Psych budgets (MUSIC-BRIEF psych addendum)

- **Low-arousal / verse-like energy:** higher kick & onset hysteresis — protect storytelling (no false shake).
- **`build`:** ramps steadily for pre→chorus anticipation; do not spend climax early.
- **`drop`:** short impulse (`_dropImpulse` decay); `harsh` peaks at that gate only.
- **Silence floors:** soothe / appraisal space (hats/harsh/kick/snare collapse).
- **VocalEstimate → lead:** blend for attention windows; never replace `roles.lead`.
- **Concert stack soft-clip:** medium groove density (spend climax once).

## `vibe` (live frame — CEO + VIBE-TAXONOMY-20260924-2125)

0..1 axes from roles + flux/onset density + vocalish vs kick/bass. **No spectrum.**

| Key | Taxonomy alias | Heuristic |
|-----|----------------|-----------|
| `peaceful` | `peace`, `calm` | Soft pads, low harsh, low onset rate |
| `chaotic` | `chaos` | High harsh + flux + onset density (earned peaks) |
| `scary` | — | Low energy + sparse harsh / tension |
| `tense` | — | Build anticipation without peaceful bed |
| `speechLike` | `spoken`, `intimateSpeech` | High vocalish, weak kick/bass groove, steady RMS |
| `nonGroove` | — | Sibling of speechLike |
| `dominant` | string | `peace` \| `chaos` \| `scary` \| `spoken` \| `tense` |

### Spoken / non-groove mode (Audio Pulse clamps)

When `vibe.spoken` / `speechLike` is high:
- **Clamp** `roles.kick`, `roles.snare`, `roles.harsh`, and frame `drop` near floor — no sticky chorus / fake drop.
- Keep pads/lead for intimate lyric-world.
- Silence/noise → soft ambient pads floor, harsh≈0 (never invent party).

Prefer `audio.vibe.dominant` for mood routing; `audio.roles` for HOW it hits.

## `texture` / `genreHint` (all-genre — CEO)

Soft tags so Scene/Worlds aren’t stuck in a rock/EDM profile. **Heuristics, not classifiers.** Spoken clamps still win over any texture.

| `texture.*` (0..1) | Feels like | Typical look hook |
|--------------------|------------|-------------------|
| `swell` | Classical / orchestral rise | Pads + build, sparse kick |
| `swing` | Jazz irregular pocket | Snare/hats chatter, uneven beats |
| `harshWall` | Metal aggression | Harsh + kick energy |
| `ambient` | Drone / soft bed | Pads, low onset, silence-friendly |
| `pocketKick` | Hip-hop | Kick+bass focus, spaced hits |
| `sparseAcoustic` | Folk / singer-songwriter | Mid lead, sparse rhythm |
| `fourOnFloor` | EDM | Regular beats + steady kick |

`genreHint` sticky string: `classical` | `jazz` | `metal` | `ambient` | `hiphop` | `folk` | `edm` | `spoken` | `unknown`

Prefer `vibe.dominant` for emotion congruence; use `texture` / `genreHint` only as a soft world-family bias.

## `genreFamily` (GENRE-MAP-20260924-2139)

| Field | Meaning |
|-------|---------|
| `genreFamily` | Soft family: pop, hiphop, rnb, rock, folk, jazz, classical, electronic, latin, afro, kpop, gospel, indie, soundtrack, spoken, noise, unknown |
| `genreSource` | `id3` \| `fantasy` \| `styles` \| `audio` \| `none` |
| `genreHint` | Finer texture lean (edm/metal/hiphop/…) |

**Rules:** Explicit ID3/user/fantasy tag wins. Protected families (gospel, pop, kpop, rnb, folk, classical, latin, afro) **cannot** be flipped to metal by a harsh spike. Spoken clamps still floor kick/snare/drop. EDM keeps short drop impulse; ambient keeps silence→pads; noise may run harsh **without** inventing a kick groove.

Call `analyzer.setGenreContext({ genre, fantasy, styles })` after identity/generate.

## Pleasure lean (GENRE-MAP-PLEASURE-20260924-2140)

After `genreFamily` resolves, roles are softly shaped toward fan pleasure, then **spoken clamps always apply last**:

| Family | Pleasure bias on roles |
|--------|------------------------|
| hiphop | 808/kick+bass weight |
| electronic (EDM) | four-on-floor kick; short drop only |
| electronic (ambient texture) | pads/silence; no forced drop |
| classical / gospel | pads swell; sparse kick |
| spoken | pads + kick/snare/harsh floor |
| rock / noise | harsh budget allowed |
| latin / afro | dembow/afro kick+hats pocket |
| jazz / rnb | pads + soft snare; low harsh |
| folk / indie | lead story; sparse kick |
| pop / kpop | hats/lead sparkle; harsh demoted |

Never invent a kick pocket that kills ambient/spoken immersion.
