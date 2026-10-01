# FIX — HOLD-0346 softClear sticky chicken-egg (Night Owl FAIL / Clash PASS)

**Date:** 2026-10-01 ~3:49 AM PT  
**QA in:** `QA-20261001-0346.md` (HOLD on `?v=cohere6`)  
**Build out:** `?v=cohere7`  
**Do not git push.**

---

## Root cause (proved)

`_applyAggressionPin` computed `nightOwlSoft` with `lowAgg = (vibe.aggression||0) < 0.35`.  
When pin locked, code forced `vibe.aggression ≥ 0.78` → **next frame `lowAgg` always false**.  
If `softBed` also false (electronic chillhop) or densFast≥0.4, `nightOwlSoft` stayed false forever → softClear never cleared pin → permanent `metal_hall`.

HUD A2: `pinArmed true`, `martial false`, `orchMart false`, `softClear false`, `energy 0.327`, `kick 0.18`, `metal_hall`.  
Night Owl ID3 genre=Electronic (calmGenre OK). Clash hard sticky still PASS.

Scene belt also gated soft on `aggN < 0.45` / `pinLive`, so floored aggression + sticky pinArmed blocked Scene softClear / softBedGuard / nuclear kill even when martial false.

---

## Fixes

### Audio (`v2-audio-softclear-no-sticky-agg-20261001-194823`) — peer DONE
- softClear when `!martial && !orchMart && energy<0.42 && harsh<0.25 && calmGenre`  
  — **ignores** sticky aggression, densFast, kick
- Storm no longer re-arms from sticky aggression under soft bed
- softClear zeros `_aggressionPinUntil` + drops aggression floor
- Clash soundtrack excluded from softClear; orchMart still arms when hot
- `resetHardState()` on Generate (already wired in `main.js`)

### Scene (`v2-scene-20261001-194941-hold-0346-force-soft`)
- `forceSoftClear` / `softEnergyEarly`: `!martial && !orchMart && energy<0.4 && harsh<0.25 && !soundtrack|classical`  
  — **ignores** pinArmed + floored agg (even one-frame race)
- Clears `_hardLatchUntil` / `_hotSince`; `hardOnly=false` under softClear OR softBedGuard
- martialHeatCore / swell refuse to treat sticky pin as heat under forceSoft
- Publishes `softBedGuard` on directive

### Worlds (`v2-worlds-hold-0346-soft-refuse-20261001-194941`)
- `readVibe` copies softClear + softBedGuard (+ hardHud soft flags); clears pin under soft
- `vibeForbiddenPresets`: softClear OR softBedGuard → peaceful key (**refuse HARD_LOCK / metal_hall force**)
- `applyVibeToCast` / castLibrary: softBedGuard refuses pinHard

### Cache
`index.html` + critical ESM imports already `?v=cohere7`.

---

## Success harness (Works Tester / bot 1 gate)

| Track | Expect |
|-------|--------|
| Night Owl alone | `softClear true`, `hardOnly false`, not `metal_hall` |
| Clash Defiant | still `hardOnly` + HARD_LOCK sticky ≥20s (martial/orchMart path untouched) |
| Clash → Night Owl | softClear true within ~2s, leave `metal_hall` |

---

## Files touched
- `js/audio/analyzer.js` (Audio peer)
- `js/director/scenePlan.js`
- `js/director/vibeCast.js`, `js/director/castLibrary.js`
- `index.html` / imports `?v=cohere7` (cache peer)

## LATEST
| Lane | Checkpoint |
|------|------------|
| Audio | `v2-audio-softclear-no-sticky-agg-20261001-194823` |
| Scene | `v2-scene-20261001-194941-hold-0346-force-soft` |
| Worlds | `v2-worlds-hold-0346-soft-refuse-20261001-194941` |
