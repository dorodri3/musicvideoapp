# Light Show — Imagined Movie

> **North star:** “THIS LOOKS LIKE THE MOVIE I SEE IN MY HEAD WHEN I LISTEN TO THIS SONG.”

Not primarily an audio visualizer, lyric video, or music-video generator.  
A **hybrid**: immersive, continuously evolving visual fantasy — directed, coherent, emotional, narrative.  
Feel = concert LED wall + cinematic music video + dream/fantasy + emotional visualization + digital art installation.

## Architecture

```
js/
  song/identity.js        ID3 (jsmediatags CDN) + filename "Artist - Title" parse
  audio/analyzer.js       Bands + tempo + instrument-role proxies (kick/bass/snare/hats/pads/lead/harsh)
  audio/vocalEstimate.js  Heuristic VAD from mid-band + flux (no ML stems)
  lyrics/parser.js        Paste / upload / LRC + LRCLIB internet search (synced preferred)
  lyrics/semantic.js      Metaphor-aware concept graph; extractLine for live direction
  lyrics/alignment.js     Line + word timing; vocal-ish sync
  structure/analyzer.js   Intro/verse/pre/chorus/bridge/breakdown/outro heuristics
  emotion/engine.js       Valence/arousal/tension/darkness/hope/aggression
  director/scenePlan.js   Pre-plan + live Director + reactToLyricConcept()
  director/narrativeState.js  World memory, motifs, callbacks
  director/variation.js   Cooldowns, avoid spam
  director/scale.js       Intimate→human→cinematic→epic→cosmic
  scene/presets.js        Rainy City, Highway, Desert, Ruins, Cathedral, Space, Storm, …
  scene/continuity.js     Morph/crossfade continuity
  camera/system.js        Dolly/pan/orbit/shake/drift/push/dutch
  lighting/system.js      Washes, shafts, bloom, white-out, blackout, pulse
  typography/system.js    LARGE high-contrast phrases (glow + dark scrim); chorus = huge
  viz/renderer.js         Instrument→layer coupling (kick ground, pads sky, hats sparks…)
  ui/controls.js          Song card, artist/title, fetch lyrics, setup + HUD
```

## Song ID + lyrics flow

1. **Upload song** → parse ID3 tags (jsmediatags from CDN); fallback `Artist - Title` from filename.
2. Song card shows **Artist — Title** + status (`Identifying…` / `Lyrics found (N lines)` / `No lyrics` / `Enter artist+title`).
3. Auto **LRCLIB** search (`https://lrclib.net/api/search`) — prefer `syncedLyrics`, else `plainLyrics`.
4. Lyrics fill the textarea; on **Generate**, always use fetched/pasted text (one more fetch if empty).
5. **Mic mode**: Artist/Title fields + Fetch lyrics (no fingerprint API).

## Direction (not aimless)

- Pre-plan runs **after** lyrics are resolved.
- Status: `Identifying song…` → `Fetching lyrics…` → `Planning scenes from lyrics…`
- **Live lyric→scene**: each active phrase re-extracts concepts (`extractLine`) and calls `director.reactToLyricConcept` — rain line → rainy world, fire → fire, etc., with continuity morphs.
- Lyrics = **WHAT** world; instruments = **HOW** it moves.
- No lyrics: still runs with warn `No lyrics — scenery from fantasy + audio only`.

## Instrument → scenery mapping

| Proxy | Visual response |
|-------|-----------------|
| Kick | Horizon punch, ground flash, camera shake |
| Bass | World scale, vignette weight |
| Snare/clap | Mid punch flash |
| Hats/treble | Sparks / rain needles |
| Pads/sustain | Sky fog wash |
| Lead/vocal-ish | Center beams + lyric emphasis |
| Harsh noise | Glitch bars / ash |

## Approximations & honest limits

| Claimed ideal | What v1 actually does |
|---|---|
| Fingerprint song ID | ID3 tags + filename parse only |
| ML stem separation | Heuristic mid-band + flux VAD; instrument **proxies** from bands/onsets |
| Forced lyric alignment | LRC if synced from LRCLIB; else even distribution + vocal nudge |
| Photoreal film | Stylized Canvas2D presets — directed, not random particles |

## Run

Served at `http://127.0.0.1:8765` (python http.server).  
Phone tunnel: hard-refresh your Cloudflare quick tunnel URL after changes.

```bash
cd /workspace/light-show
python3 -m http.server 8765 --bind 127.0.0.1
```

## Phone reload

1. Ensure tunnel still points at `127.0.0.1:8765`.
2. Open `https://illustration-ensures-studies-chris.trycloudflare.com`
3. **Hard refresh** (iOS Safari: hold reload → Request Desktop Website off/on, or close tab and reopen; Android: clear cache / hard reload).
4. Upload a known song → confirm Artist — Title + Lyrics found → optional fantasy → Generate.
5. You should see large lyric phrases on screen; scenery shifts with lyric meaning and hits with drums/pads.

## UX defaults

Mood **Auto**, Fantasy style **Cinematic + Dreamlike**, Intensity **Moderate**, Lyrics/Characters on.
