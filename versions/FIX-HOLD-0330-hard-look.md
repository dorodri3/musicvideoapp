# FIX — HOLD-0330 hard look + HUD bulletproof (Visual)

**Date:** 2026-10-01 ~3:32 AM PT  
**QA in:** `QA-20261001-0330.md` (HOLD on `?v=cohere4`)  
**Build out:** `?v=cohere5`  
**Checkpoint:** `v2-visual-20261001-193208-hold-0330-hard-look` (LATEST_VISUAL)  
**Scene (peer):** `v2-scene-20261001-193154-hold-0330-hard-id-sticky` — under hardOnly emit ONLY five HARD_LOCK ids + HUD `presetOk` / `hardLockIds` / `holdMsLeft`  
**Do not git push.**

---

## P0 fixed

### 1. HUD TypeError (`this._drawDebugHud is not a function`) — bulletproof
- Module-level `drawDebugHudImpl` (no prototype lookup required).
- Render path: prefer `this._drawDebugHud` if function, else call `drawDebugHudImpl`; catch → retry impl. **TypeError impossible.**
- Class method delegates to impl.
- Belt-and-suspenders: `Renderer.prototype._drawDebugHud = drawDebugHudImpl` after class.
- Default **ON**; `?debug=0` off; `?debug=1` forces on.
- Shows: `hardOnly`, `nuclear`, `latch`, `pinArmed`, `martial`, `orchMart`, `preset`, `ok` (presetOk), `holdMs`, `pack`, `ladder`, `ids` (hardLockIds). Banner `LS DEBUG cohere5`.

### 2. HARD_LOCK presets LOOK HARD (vs soft warm Night Owl stage)
| Preset | Soft warm stage was… | Hard look now |
|--------|----------------------|---------------|
| `metal_hall` | warm red/brown arena | **cold steel blues/grays**, vertical panels, harsh cool spots |
| `apocalyptic_warzone` | terracotta sky + wood ash | **cool ash/smoke**, rubble silhouettes, **ember red** pocket |
| `reality_fracture` | soft magenta panels | **high-contrast shards**, cyan/magenta glitch scans |
| `red_void` | brown-leaning pulse | **deep crimson void** (cool-biased red, horizon slit) |
| `storm` | mild slate | **cold lightning / slate**, cyan bolts, rain |

Soft Night Owl path (`misty_lake` / meadow / spoken / calm stage) **unchanged** — stays warm/calm and distinct.

### 3. hardOnly paint force (even if preset name wrong)
In `drawPreset`: under `hardOnly|hardLock|forbidPastoral|aggressionLock|hardHud.nuclear`:
- Remap any non-HARD_LOCK id → `metal_hall` (refuse pastoral/soft stage paint).
- Apply `applyHardContrastVeil` (cold steel / ash-red / crimson) — refuse warm pastoral peach bloom.
- Fauna still stripped (`_forbidPastoralFauna`).

### 4. Lighting + vibe hooks
- Hard bloom/shafts: **cold steel / ash-red** (was warm peach `255,180,140` / orange shafts).
- `_applyVibeHooks` hard OR includes `directive.hardOnly|hardLock|hardHud.nuclear` so warm groove wash cannot win under Scene hardOnly.

### 5. Cache `?v=cohere5`
`index.html` (css+main), `main` → analyzer/scenePlan/renderer, `continuity` → presets, `renderer` → continuity/typography/castLibrary, `scenePlan` + `casting` → vibeCast/castLibrary/…, controls comment/proof.

---

## Soft vs hard (how they differ now)

| | Soft Night Owl | Clash hardOnly |
|--|----------------|----------------|
| Preset family | misty_lake / meadow / spoken / calm | ONLY metal_hall \| reality_fracture \| apocalyptic_warzone \| red_void \| storm |
| Palette | warm amber / brown / soft stage bloom | cold steel, ash gray, crimson, slate lightning |
| Lighting | warm peach bloom OK | cold bloom; refuse pastoral peach |
| HUD | hardOnly false | hardOnly/nuclear/pin + presetOk + holdMs |
| Veil | none | hard contrast veil after paint |

---

## Files touched
- `js/viz/renderer.js` — HUD impl + prototype assign + hardOnly vibe
- `js/scene/presets.js` — five HARD_LOCK paints + hard paint gate/veil
- `js/lighting/system.js` — cold hard bloom/shafts
- `js/scene/continuity.js` — cache bust
- `js/main.js`, `index.html`, `js/director/scenePlan.js`, `js/director/casting.js`, `js/ui/controls.js` — `?v=cohere5`
- `LATEST_VISUAL.txt` → this checkpoint

**Worlds:** not touched this pass (Scene sticky ids + Visual paint).  
**Next:** Works Tester re-GATE Clash ≥20s with readable HUD + hard family look; Night Owl soft still distinct.
