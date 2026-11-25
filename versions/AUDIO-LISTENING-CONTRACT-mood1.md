> **mood3 update:** relative loudness (`energyP10`/`energyP50`/`energyP90`, `sections[].loudness`, live `sectionLoudness`) lives in [`AUDIO-SONGSCAN-CONTRACT-mood3.md`](./AUDIO-SONGSCAN-CONTRACT-mood3.md). This mood1 file is the listening/confidence contract only and is unchanged.

# Audio → Scene contract: song pre-scan + live listening (mood1)

Owner: Audio Pulse · Module: `js/audio/songScan.js` (+ `js/audio/analyzer.js`) · Imports on `?v=mood1`

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

## 2. Live frame — listening + confidence (every `analyzer.update()` frame)

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
