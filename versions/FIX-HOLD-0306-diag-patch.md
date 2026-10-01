# FIX — HOLD-0306 diag patch (soft-drift P0)

**Date:** 2026-10-01 ~3:11 AM PT  
**Source:** `DIAG-HOLD-0306-soft-drift.md`  
**Tree:** `/workspace/light-show`  
**No git push.**

## Goal

Clash Defiant pin must stick (classical label must not clear martial pin). Casting/Scene must not force spoken over pin. Night Owl soft path still clears when truly soft (low harsh).

## Files changed

| File | Change |
|------|--------|
| `js/audio/analyzer.js` | `_applyAggressionPin`: `softImmersion` excludes classical/gospel/jazz; `softClear` only when truly soft (low harsh + low densFast + !martial); classical alone never zeros `_aggressionPinUntil` |
| `js/director/casting.js` | `modulateCast`: pin (aggressionLock/forbidPastoral/ladder aggressive/family chaotic) → never set family=spoken from speechSteer; no early soft path |
| `js/director/scenePlan.js` | `pinEarly` / `_pinLive`: under pin do not OR speechSteer into speechLike; under `hardOnly` skip `genreForbiddenPresets` union (Path D latch); lyric `pinForbidden` likewise |
| `index.html` | cache bump `?v=cohere2b` on style + main |

## file:line summary

- `analyzer.js:860` softImmersion (no classical/gospel/jazz)
- `analyzer.js:916–917` softClear + locked
- `analyzer.js:947` softClear clears pin (Night Owl only)
- `casting.js:201–215` pin wins over speechSteer→spoken
- `scenePlan.js:751–757` `_liveCast` pin wins speechLike
- `scenePlan.js:1122–1128` tick `pinEarly` / speechLike
- `scenePlan.js:1235–1244` hardOnly → no genreForbidden union
- `scenePlan.js:1711–1717` lyric pinForbidden no genreForbidden
- `index.html:8,127` `?v=cohere2b`

## Checkpoints

- Audio: see `LATEST_AUDIO.txt`
- Scene: see `LATEST_SCENE.txt`

## QA next

Re-GATE Clash Defiant ≥15s sticky hard family; Night Owl still soft PASS.
