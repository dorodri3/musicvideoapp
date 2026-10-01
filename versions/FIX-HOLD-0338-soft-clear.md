# FIX — HOLD-0338 softClear vs hardOnly (Night Owl FAIL / Clash PASS)

**Date:** 2026-10-01 ~3:40 AM PT  
**QA in:** `QA-20261001-0338.md` (HOLD on `?v=cohere5`)  
**Build out:** `?v=cohere6`  
**Do not git push.**

---

## Root cause

1. **Audio `nightOwlSoft` gated on `kick < 0.28` + `energy < 0.32/0.34`.**  
   Night Owl HUD: `kick=1`, `energy=0.372` → softClear never fired → pin/storm latch stuck → Scene saw hardOnly.
2. **Scene nuclear** (prior pass already fixed in `v2-scene-…-softclear-latch`): `nuclearHard = hotMs≥1500` from energy/kick alone refreshed `_hardLatchUntil` every frame when softClear false.
3. **Track-change bleed:** Audio `_aggressionPinUntil` not zeroed on Generate → Josh/Night Owl inherited Clash pin (`pinArmed true`).
4. **Worlds:** without softClear passthrough, `forbidPastoral`/`pinArmed` still forced HARD_LOCK refuse / chaos cast.

Clash hard look was already PASS (steel/ash + sticky metal_hall) — keep that; only reopen soft path.

---

## Fixes

### Audio (`v2-audio-hold-0338-softclear-20261001-194140`)
- softClear for peaceful/ambient/Night-Owl-class: **low harsh, low densFast, modest energy `<0.42`, calm genre OR low aggression OR softBed** — **kick ignored**.
- Ambient kick crush when `!cinematicBed` (soundtrack/classical hot punch preserved).
- Storm no longer pins on kick-alone under soft energy.
- `resetHardState()` — Generate zeros aggression pin / ladder sticky.

### Scene (peer DONE `v2-scene-20261001-193938-hold-0338-softclear-latch`)
- softClear clears `_hardLatchUntil` / `_hotSince`; `hardOnly=false`; nuclear never arms on softClear.
- Track-key change clears latch.

### Worlds (`v2-worlds-hold-0338-soft-refuse-20261001-194140`)
- `readVibe` copies softClear; clears pin/forbid under softClear.
- `vibeForbiddenPresets`: softClear → peaceful key (refuse metal_hall/warChaos force).
- `applyVibeToCast` / castLibrary: softClear refuses pinHard.

### Visual (`v2-visual-hold-0338-hud-cohere6-20261001-194140`)
- HUD calls **only** `drawDebugHudImpl` (silence `_drawDebugHud is not a function`).
- Banner `LS DEBUG cohere6`.

### Cache
`index.html` + critical ESM imports `?v=cohere6`.

---

## Success harness (Works Tester)

| Track | Expect |
|-------|--------|
| Night Owl | `softClear true`, `hardOnly false`, pastoral/calm preset (**NOT** metal_hall), pack not chaos |
| Clash Defiant | still `hardOnly true` + HARD_LOCK look sticky ≥20s |

---

## Files touched
- `js/audio/analyzer.js`
- `js/director/vibeCast.js`, `js/director/castLibrary.js`
- `js/viz/renderer.js` (HUD only)
- `js/main.js` (resetHardState on Generate)
- `index.html`, critical `?v=cohere6` imports
- Scene peer already: `js/director/scenePlan.js`

## LATEST
| Lane | Checkpoint |
|------|------------|
| Audio | `v2-audio-hold-0338-softclear-20261001-194140` |
| Scene | `v2-scene-20261001-193938-hold-0338-softclear-latch` |
| Worlds | `v2-worlds-hold-0338-soft-refuse-20261001-194140` |
| Visual | `v2-visual-hold-0338-hud-cohere6-20261001-194140` |
