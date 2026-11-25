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

## Vibe match / aggression (WAVE-20260929-vibe-match)

Live `audio.vibe` now exposes clear aggression so aggressive songs steer chaos imagery:

| Field | Meaning |
|-------|---------|
| `aggression` / `aggressive` | 0..1 from energy + harsh + onsetDensity + kick (+ genre deepen) |
| `arousal` | Energy/punch (separate from peace/chaos label) |
| `chaos` / `chaotic` | Amplified when aggression rises |
| `dominant` | Prefers `chaos` when aggression > ~0.58; spoken/peace still win when soft |

Soft bias: spoken / ambient / silence keep aggression low. Rock/noise families deepen envelopes after `genreFamily`. Soft-clip bleach guard: brief harsh spikes OK; sustained harsh soft-caps so Visual isn’t forced into white-out.

## Aggression ladder (MUSIC-BRIEF-vibe-match-20260929)

`audio.vibe.ladder` ∈ `peaceful` → `warm` → `tense` → `aggressive` (+ `scary` sibling) | `spoken`

| Rung | Ear cues (Audio) |
|------|------------------|
| peaceful | soft pads, sparse kick, low harsh/arousal |
| warm | steady pocket, mid kick, low harsh (groove ≠ aggression) |
| tense | build / snare chatter, mid arousal |
| aggressive | high harsh+kick+energy → high `aggression`/`chaos` |
| scary | cold sparse + rare spikes (≠ festival chaos) |
| spoken | speechLike clamps win |

Anti (Audio side): soft folk/ambient never leave aggression high enough to invite warzone; metal/rock deepen aggression so neon meadow is not the signal.

## Ladder hysteresis (CEO: barely coherent)

`vibe.ladder` is **sticky** for Scene:
- Min dwell ~1.8s on current rung
- Candidate must win ~0.9–1.2s with score margin before switch
- Harder to drop aggression than to escalate into it
- Axis envelopes (aggression/chaos/warm/…) use longer lerp windows (~0.7–1.2s)

Prefer `vibe.ladder` over frame-to-frame `dominant` for pack/cast routing.

## Aggression pin (HOLD QA-20261001-0255 · QA-0306)

When martial / harsh+energy storm is earned:

| Field | Contract for Scene / Worlds |
|-------|------------------------------|
| `vibe.ladder` | Sticky `aggressive` ≥ **20s** once pinned |
| `vibe.aggressionLock` | `true` while pin active |
| `vibe.forbidPastoral` | `true` for whole pin — **ban** pastoral/soft packs |
| `vibe.aggression` | **Never drops** while locked (held floor ≥ ~0.78) |
| `vibe.warm` | **0** while locked — no pale/copper soft afterglow |

Soft/spoken/ambient clear the pin (Night Owl must stay soft).

## Realtime NOW (CEO: understand the song *now*)

| Signal | Use |
|--------|-----|
| `frame.moment` / `vibe.moment` | Live kick/snare/vocalish/drop/build/onsetFast + lock — **prefer for hit timing** |
| `roles.kick/snare/vocalish` | Already fast attack envelopes |
| Aggression escalate | Fast attack (≈0.65/frame up); slow release; ladder escalates to `aggressive` with **0 dwell** |
| Sticky hold | Once aggressive / `aggressionLock`, pin ≥15s; warm crushed |

Don’t wait on slow vibe axes for a drop — use `moment.drop` / `moment.onsetFast` + `aggressionLock`.

## softBed / classical (DIAG-HOLD-0306 Path A)

`classical` / `gospel` / `jazz` **genre labels do NOT clear** `aggressionLock`.
Clash Defiant is orchestral-martial often tagged classical — pin stays.

Only **softImmersion** clears the pin: spoken, ambient texture, or sparse+quiet acoustic (Night Owl).
Martial/storm still fires under classical labels.

## Orchestral-martial pin (QA-20261001-0314)

Clash Defiant is classical-tagged + high energy — pin must arm without metal harsh.

| Signal | Behavior |
|--------|----------|
| `vibe.orchestralMartial` | classical/gospel/jazz/swell + energy + kick/onset/bass |
| `vibe.martial` / `storm` | arms pin (≥20s) — **not** gated by ambient pads |
| `vibe.softClear` | **Night Owl only**: low energy + low harsh + calm bed |
| `vibe.pinArmed` / `aggressionLock` / `hardOnly` | proof fields for QA (also on `moment` + frame root) |
| `vibe.martial` / `orchestralMartial` / `softClear` | martial heat; Soundtrack ID3 counts as orchestral bed |
| softClear (QA-0338) | peaceful/ambient/low-energy wins even if kick meter false-high; Night Owl must not pin |
| `globalThis.__LS_AUDIO_PIN__` | live console proof object when analyzer runs |

Ambient pads alone never softClear and never block martial.

## Song pre-scan + live listening (mood1)

Full contract (verbatim copy kept in /workspace/light-show-versions/AUDIO-SONGSCAN-CONTRACT-mood1.md):

### Audio → Scene contract: song pre-scan + live listening (mood1)

Owner: Audio Pulse · Module: `js/audio/songScan.js` (+ `js/audio/analyzer.js`) · Imports on `?v=mood1`

#### 1. Song pre-scan — available at 0 s, before prePlan

Where to read it (same object everywhere, `null` for mic or if decode failed):
- `app.getSongScan()` (`window.__lightShow.getSongScan()`)
- `director.prePlan(opts)` → `opts.songScan`; also `director.songScan`
- `globalThis.__LS_SONGSCAN__` (debug/HUD)

`scan.ok === false` (file < 3 s) → treat as `null`.

| Field | Type | Meaning |
|---|---|---|
| `ok` | bool | true when the scan is usable |
| `mode` | `'full'` \| `'sampled30'` | whole song, or 6×5 s evenly spread slices when the phone budget (2.8 s incl. decode) would be blown |
| `duration` | s | track length |
| `energyMean` | 0..1 | mean perceived energy (loudness + spectral activity) over audible seconds |
| `energyPeak` | 0..1 | 95th-percentile 1 s energy |
| `dynamics` | 0..1 | loud vs quiet spread (0 = flat/brickwalled, 1 = wide) |
| `aggression` | 0..1 | distortion/noisiness + brightness + loudness + compression + flux; orchestral-martial floor 0.58+ |
| `danceability` | 0..1 | pulse clarity (full + low band), onset rate, tempo fit |
| `tempo` | BPM | autocorrelation tempo, folded to 70–180 |
| `genre` | GenreFamily | `explicit ID3/styles/fantasy` family if any, else audio lean (`rock`,`noise`,`soundtrack`,`electronic`,`folk`,`hiphop`,`pop`,`indie`) |
| `genreConf` | 0..1 | 0.9 ID3, 0.75 styles/fantasy, ~0.38–0.6 audio-only |
| `genreSource` | `'id3'`\|`'styles'`\|`'fantasy'`\|`'scan'` | |
| `genreAudio` | GenreFamily | audio-only lean (cross-check; agreed with ID3 on all 5 tagged test songs) |
| `vibe` | `'aggressive'`\|`'upbeat'`\|`'peaceful'`\|`'tense'`\|`'warm'` | **song character — lock style from this** |
| `vibeConf` | 0..1 | margin between top two vibe scores |
| `vibeScores` | `{aggressive, upbeat, peaceful, tense}` 0..1 | raw scores |
| `ladder` | live ladder name | `aggressive→aggressive`, `upbeat→warm`, `warm→warm`, `peaceful→peaceful`, `tense→tense` |
| `orchestralMartial` | bool | Clash-class: heavy low end, dense mids, no regular kick grid |
| `calm`, `pulse`, `pulseLow`, `brightness`, `noisiness`, `onsetRate`, `martialScore` | 0..1 / per s | diagnostics |
| `firstStrongAt` | s \| null | start of first `strong` section |
| `sections[]` | `{start, end, energy, label, strong}` | start/end in s; `label` ∈ `intro`\|`mid`\|`peak`\|`quiet`\|`outro`; `strong` = energy ≥ max(0.42, 0.82×peak) (0.9× in sampled mode) |
| `elapsedMs`, `decodeMs`, `analyzedSeconds`, `version` | | timing / provenance (`songscan-mood1-1`) |

Suggested Scene use: `vibe` + `storyRead` pick the style at 0 s. `sections[]` / `firstStrongAt` time the reveals. `genre` feeds the genre packs.

#### 2. Live frame — listening + confidence (every `analyzer.update()` frame)

Frame root (also mirrored on `frame.moment` / `vibe.moment` as `listening`, `listenProgress`, `genreConfidence`, `vibeConfidence`, `genreFamily`):

| Field | Type | Meaning |
|---|---|---|
| `listening` | bool | **true = don't commit a style from live genre/vibe yet.** Always `false` when a song scan is loaded (`scanReady`). |
| `liveListening` | bool | live analyzer's own state, regardless of scan |
| `listenProgress` | 0..1 | live listening progress (1 when done) |
| `listenReason` | `null`\|`'time'`\|`'strong-section'` | why live listening ended: 18 s of non-silent audio, or ≥1.5 s sustained strong section (energy > 0.42 + onset/kick/build/drop) |
| `scanReady` | bool | a song scan seeded this analyzer |
| `scanVibe` | string\|null | `scan.vibe` |
| `genreConfidence` | 0..1 | max(scan.genreConf, explicit 0.9/0.75, live 0.15→1 ramp) |
| `vibeConfidence` = `vibe.confidence` | 0..1 | max(scan.vibeConf, live ramp) |
| `genreFamily` | GenreFamily | explicit > sustained spoken > scan.genre > live lean. **`'unknown'` while `listening` with no explicit tag** |
| `genreFamilyProvisional` | GenreFamily | the internal live family (what drives roles/pin), even while listening |
| `genreHint` / `genreHintProvisional` | hint | `'unknown'` while `listening`; scan-derived while live is listening but scan present |
| `genreSource` | `'id3'`\|`'styles'`\|`'fantasy'`\|`'scan'`\|`'audio'`\|`'listening'`\|`'none'` | |
| `vibe.listening`, `vibe.provisional` | bool | = `listening` |
| `vibe.speechLikeRaw` | 0..1 | speech-likeness before the spoken gate (HUD) |

Rules:
- **Spoken gate:** `spoken` (genreFamily / vibe.dominant / ladder / speech clamps) needs speech-like > 0.48 held ≥ 5 s (≥ 8 s if the scan says the song isn't spoken). It uses a leaky accumulator with hysteresis. Until then `vibe.speechLike/spoken` are capped at 0.40.
- **Scan prior while live listening:** the ladder can't drop below `scan.ladder`, and `vibe.dominant` is lifted to the scan's character (`chaos/warm/tense/peace`). Escalation is free. `softClear` and the pin still win.
- Unchanged: `pinArmed / martial / orchestralMartial / softClear / hardOnly` (frame root + vibe + moment), `frame.spectrum === null`.
- `resetHardState()` (called on Generate) resets listening, and seeds the ladder from `scan.ladder` when a scan is loaded.

Harnesses: /workspace/light-show-qa/harness/{songscan-harness.mjs, live-analyzer-harness.mjs, scan-browser-run.mjs}.
