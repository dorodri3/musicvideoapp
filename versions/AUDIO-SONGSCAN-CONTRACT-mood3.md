# Audio → Scene contract: song pre-scan + live listening + relative loudness (mood3)

Owner: Audio Pulse · Module: `js/audio/songScan.js` (+ `js/audio/analyzer.js`) · Imports on `?v=mood3`

Supersedes `AUDIO-SONGSCAN-CONTRACT-mood1.md` (listening/confidence unchanged; this adds per-song relative loudness). Scene owns `compMode`. Audio owns the loudness signal.

## 1. Song pre-scan — available at 0 s, before prePlan

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
| `energyMean` | 0..1 | mean perceived energy (loudness + spectral activity) over audible seconds — **song character, not a relative level** |
| `energyPeak` | 0..1 | 95th-percentile 1 s perceived energy (same flux-blended scale as `energyMean`) |
| `energyP10`, `energyP50`, `energyP90` | 0..1 | **canonical relative-loudness anchors.** Percentiles of audible 1 s RMS loudness. Scale: −30 dBFS → 0, −8 dBFS → 1 (`perceivedLoudness`). Full mode uses analysis 1 s RMS; sampled30 uses the whole-song coarse 1 s RMS pass. **Not the same number as energyMean** (that one also blends spectral flux). |
| `dynamics` | 0..1 | loud vs quiet spread (0 = flat/brickwalled, 1 = wide) |
| `aggression` | 0..1 | distortion/noisiness + brightness + loudness + compression + flux; orchestral-martial floor 0.58+ |
| `danceability` | 0..1 | pulse clarity (full + low band), onset rate, tempo fit |
| `tempo` | BPM | autocorrelation tempo, folded to 70–180 |
| `genre` | GenreFamily | `explicit ID3/styles/fantasy` family if any, else audio lean (`rock`,`noise`,`soundtrack`,`electronic`,`folk`,`hiphop`,`pop`,`indie`) |
| `genreConf` | 0..1 | 0.9 ID3, 0.75 styles/fantasy, ~0.38–0.6 audio-only |
| `genreSource` | `'id3'`\|`'styles'`\|`'fantasy'`\|`'scan'` | |
| `genreAudio` | GenreFamily | audio-only lean (cross-check) |
| `vibe` | `'aggressive'`\|`'upbeat'`\|`'peaceful'`\|`'tense'`\|`'warm'` | **song character — lock style from this** |
| `vibeConf` | 0..1 | margin between top two vibe scores |
| `vibeScores` | `{aggressive, upbeat, peaceful, tense}` 0..1 | raw scores |
| `ladder` | live ladder name | `aggressive→aggressive`, `upbeat→warm`, `warm→warm`, `peaceful→peaceful`, `tense→tense` |
| `orchestralMartial` | bool | Clash-class: heavy low end, dense mids, no regular kick grid |
| `calm`, `pulse`, `pulseLow`, `brightness`, `noisiness`, `onsetRate`, `martialScore` | 0..1 / per s | diagnostics |
| `firstStrongAt` | s \| null | start of first `strong` section |
| `sections[]` | `{start, end, energy, label, strong, loudness}` | start/end in s; `label` ∈ `intro`\|`mid`\|`peak`\|`quiet`\|`outro`; `strong` = energy ≥ max(0.42, 0.82×peak) (0.9× in sampled mode); **`loudness`** = that section's mean RMS loudness mapped through `energyP10..energyP90` → 0..1 |
| `elapsedMs`, `decodeMs`, `analyzedSeconds`, `version` | | timing / provenance (`songscan-mood3-1`) |

There is no `scan.loudness` object — use `energyP10` / `energyP50` / `energyP90`.

Suggested Scene use: `vibe` + `storyRead` pick the style at 0 s. `sections[].loudness` and live `sectionLoudness` drive quiet vs loud `compMode` (0 ≈ this song's quiet floor, 1 ≈ this song's loud ceiling). `genre` feeds the genre packs.

## 2. Live frame — listening + confidence + section loudness

Frame root (also mirrored on `frame.moment` / `vibe.moment` as `listening`, `listenProgress`, `genreConfidence`, `vibeConfidence`, `genreFamily`, **`sectionLoudness`**, **`sectionLoudnessSource`**):

| Field | Type | Meaning |
|---|---|---|
| `listening` | bool | **true = don't commit a style from live genre/vibe yet.** Always `false` when a song scan is loaded (`scanReady`). |
| `liveListening` | bool | live analyzer's own state, regardless of scan |
| `listenProgress` | 0..1 | live listening progress (1 when done) |
| `listenReason` | `null`\|`'time'`\|`'strong-section'` | why live listening ended: 18 s of non-silent audio, or ≥1.5 s sustained strong section |
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
| **`sectionLoudness`** | 0..1 | **per-song relative loudness.** 1.5 s mean-square-smoothed RMS, dB-mapped (−30→0, −8→1), then `clamp01((E − p10) / max(0.06, p90 − p10))`. With a scan, p10/p90 are `scan.energyP10` / `scan.energyP90`. |
| **`sectionLoudnessSource`** | `'scan'`\|`'live'` | `'scan'` when energyP10/P90 are present; otherwise a rolling 60 s of 1 s live energies (mic / scan-failed). Prefer `'scan'` for `compMode`. |

Rules:
- **Spoken gate:** `spoken` needs speech-like > 0.48 held ≥ 5 s (≥ 8 s if the scan says the song isn't spoken). Until then `vibe.speechLike/spoken` are capped at 0.40.
- **Scan prior while live listening:** the ladder can't drop below `scan.ladder`; `vibe.dominant` is lifted to the scan's character. Escalation is free. `softClear` and the pin still win.
- Unchanged: `pinArmed / martial / orchestralMartial / softClear / hardOnly` (frame root + vibe + moment), `frame.spectrum === null`. Relative loudness does not feed the pin.
- `resetHardState()` (called on Generate) resets listening and the loudness smoothers (not the scan), and seeds the ladder from `scan.ladder` when a scan is loaded.

Mapping helper (shared): `relativeLoudness(energy, p10, p90)` in `js/audio/songScan.js`.
