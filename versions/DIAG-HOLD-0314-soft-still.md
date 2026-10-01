# DIAG — HOLD-0314 soft-still (Clash Defiant after softclear/pinWins)

**Date:** 2026-10-01 ~3:14–3:20 AM PT  
**QA:** `QA-20261001-0314.md` (build `?v=cohere2b`)  
**Symptom:** Clash Defiant @ 2/8/15/20s still pale rain / water+fish / forest+deer / green-rim soft figure. Night Owl soft PASS.

---

## Root cause (ranked)

### R1 — PROVED: pin never armed on Clash-class (Audio) — FIXED
**Hypothesis 1 + 4.** Prior `_applyAggressionPin` gated martial/storm on `softImmersion`, which included `spoken` OR `(tex.ambient > 0.5)`. Clash Defiant is orchestral-martial: pads push `texture.ambient` high and/or lead inflates `speechLike` → `softImmersion=true` → `martial`/`storm` never fire → `aggressionLock`/`forbidPastoral` stay false → Scene `hardOnly` never true → forest/ocean/meadow win.

**Evidence (pre-fix):** `analyzer.js` softImmersion + `martial = !softImmersion && …` (cohere2b / softclear-pin). Classical label alone was already excluded from softBed, but **ambient pads still blocked martial**.

**Fix (Audio DONE):** `v2-audio-orchestral-martial-20261001-191530`
- `nightOwlSoft` = low energy+harsh+kick + spoken/ambient/sparse (Night Owl only)
- `orchestralMartial` = classical/gospel/jazz/swell + energy + kick/dens/flux/bass (no metal harsh required)
- `forbidPastoral = locked || martial || orchestralMartial`; proof fields `martial` / `orchestralMartial` / `pinArmed` / `softClear` on vibe+moment

### R2 — PROVED: Scene hardOnly depended only on lock flags — HARDENED
Even after Audio sets `forbidPastoral`, Scene/Casting pin ORs did not read `martial`/`orchestralMartial`/`pinArmed`. Belt-and-suspenders: all pin sites now OR those fields from vibeDom / audio.vibe / readMoment.

**Evidence:** `scenePlan.js` pinEarly / pin / pinLive / _pinLive / lyric pinOn; `casting.js` modulateCast pin; `vibeCast.js` readVibe / dominantVibe / isAggressiveVibe / applyVibeToCast pinHard.

### R3 — PARTIAL: soft preset IDs that paint QA frames
| Frame | Look | Preset paint |
|-------|------|----------------|
| B2 | pale rain | rainy_city / soft atmos rain |
| B3 | water+fish | ocean / misty_lake (+ fish_motes) |
| B4 | forest+deer | `presets.js` forest → faunaSilhouette deer |
| B5 | green-rim figure | moss_trail cast on dark bed |

`vibeForbiddenPresets(aggressive)` already refuses forest/ocean/meadow_fauna/misty_lake/rainy_city/… and HARD_LOCK allowlist is metal_hall|reality_fracture|apocalyptic_warzone|red_void|storm. Under `hardOnly`, Scene force-escapes non-hard currentPreset (HOLD-0314 canEscape + absolute refuse).

### R4 — DISPROVED as primary: Dom/vibe unwired
`readMoment` + moment.forbidPastoral/aggressionLock were already on frame; Audio now also writes martial proof fields. Wiring gap was ambient-gated pin, not missing moment alias.

### R5 — DISPROVED as primary: softClear too aggressive on Clash
After fix, softClear = nightOwlSoft && !martial && !orchestralMartial. High-energy Clash cannot softClear. Night Owl (low energy/harsh) still softClears.

---

## End-to-end trace (file:line contract)

1. **Audio** `_applyAggressionPin` → `vibe.forbidPastoral` / `aggressionLock` / `orchestralMartial` / `pinArmed` → `moment.*` (`analyzer.js` ~842–960, moment ~433–450)
2. **vibeCast** `readVibe` / `dominantVibe` → pin if forbidPastoral|martial|orchestralMartial|pinArmed → family chaotic, ladder aggressive (`vibeCast.js`)
3. **scenePlan** tick → `pinLive` / `hardOnly` / `_hardLatchUntil` ≥20s → `vibeForbidden` = aggressive refuse, **no** genreForbidden union → escape to `hardLockPresets()` (`scenePlan.js` pinLive/hardOnly block)
4. **Casting** pin wins over speechSteer→spoken; applyVibeToCast pinHard skips soft early return
5. **Worlds** HARD_LOCK allowlist + softPastoral refuse (forest/deer/ocean/meadow/misty_lake/…)

---

## Surgical fix plan (applied)

| Lane | Change |
|------|--------|
| Audio | DONE orchestral-martial + nightOwlSoft softClear |
| Scene | Consume martial/orchestralMartial/pinArmed at every pin OR; hard latch 20s; force escape soft current |
| Worlds/vibeCast | readVibe/dominantVibe/isAggressive/applyVibeToCast consume martial; softPastoral refuse list includes pale/water beds |
| Cache | `?v=cohere3` style + main |

Night Owl: softClear when truly soft (low energy/harsh/kick) — pastoral still allowed when !hardOnly.

---

## Hypotheses scorecard

| # | Claim | Result |
|---|--------|--------|
| 1 | pin never arms (energy/harsh/genre) | **PROVED** via ambient softImmersion gate; fixed with orchestralMartial |
| 2 | pin arms but soft via other path | Secondary once pin dead; lyric worldCue/nature seed hardened under pin |
| 3 | HARD_LOCK missing / forest not forbidden | **DISPROVED** as primary — IDs already refused under aggressive; never reached because hardOnly false |
| 4 | softClear / softImmersion false on Clash | **PROVED** ambient→softImmersion; fixed nightOwlSoft |
| 5 | Dom/vibe not wired | **DISPROVED** as primary; martial fields now also OR'd |

---

## Residual risk

- First ~0.5–1s before orchestralMartial energy>0.36 may still flash soft until hardOnly latch; escape is now forced (280ms morph).
- Classical adagio (true soft orchestra) may pin if swell+energy falsely high — monitor Night Owl / quiet classical.
- Visual morph Path F still needs hard destination paint if transition.from is soft (Visual lane prior morph-hard).

**Do not git push.** Re-GATE Clash Defiant ≥20s HARD_LOCK family; Night Owl soft PASS.
