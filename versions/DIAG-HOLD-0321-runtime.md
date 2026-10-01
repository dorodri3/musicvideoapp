# DIAG — HOLD-0321 runtime (Clash Defiant soft-still after cohere3)

**Date:** 2026-10-01 ~3:21–3:25 AM PT  
**QA:** `QA-20261001-0321.md` (build `?v=cohere3` HOLD)  
**Build out:** `?v=cohere4`  
**Symptom:** Clash Defiant @ 2/8/15/20s still soft packs (green-rim / water+fish / forest+deer) after Audio orchestral-martial + Scene martial-consume claimed DONE. Night Owl soft PASS. Josh lyrics PASS.

---

## Root cause (ranked)

### R1 — PROVED: Scene hardOnly never latched on Clash at cohere3 gate (thresholds + field drop)
Prior martial/orchestralMartial path required classical+swell+energy>0.36 *and* Scene `martialHeat` read **`audio.harsh`** which does not exist on the frame (`harsh` lives on `roles` / `moment`). First martialHeat clause was always false → aggressiveLive often false unless Audio pin actually armed.

**Cite:** `scenePlan.js` martialHeat (was `audio?.harsh`); frame contract `analyzer.js:456–471` exposes `roles` / `moment.harsh`, not top-level `harsh`.

**Fix:** Scene nuclear-hot (`v2-scene-20261001-192254-hold-0321-nuclear-hot`): energy/kick (/bass/onset) hot sustained ≥1.5s → `nuclearHard` → `hardOnly` + 20s latch + `__LS_HARD__` / `directive.hardHud`. Harsh field-drop patched to `roles/moment`.

### R2 — PROVED: Visual did not consume Scene `hardOnly` (paint path)
Renderer hardLock used vibe/moment forbidPastoral|aggressionLock only — **not** `directive.hardOnly`. Nuclear could select HARD_LOCK preset in Scene while Visual still treated frame as soft pastoral bloom / soft morph win.

**Cite:** `renderer.js` hardLock (~178) pre-fix; `_resolveCoherentTransition` hard gate (~573).

**Fix:** OR `directive.hardOnly|hardLock|hardHud.nuclearHard` into Visual hardLock + coherent transition refuseSoftWin.

### R3 — PARTIAL: Worlds soft refuse under nuclear
`vibeForbiddenPresets` already refused forest/ocean/meadow under aggressive, but hardOnly/nuclearHard were not always on the `dom` key. Emit scrub for soft IDs under hardOnly existed in Scene but needed hardOnly passthrough + pinHard on vibeCast/castLibrary.

**Fix:** Worlds `v2-worlds-…-hold-0321-nuclear-forbid` — vibeForbidden key ORs hardOnly/nuclearHard; applyVibeToCast/castLibrary pinHard; softPastoral + `SOFT_FORBIDDEN_UNDER_HARD` emit scrub.

### R4 — DISPROVED as sole cause: module field-drop clone without martial
Audio moment/vibe **do** copy martial|orchestralMartial|pinArmed|softClear (`analyzer.js:446–451`). vibeCast `readVibe` / `dominantVibe` consume them (`vibeCast.js:87–91, 219–234`). Primary loss was pin never sustained + Visual ignore hardOnly — not a silent clone drop of martial alone.

### R5 — CONTRIBUTING: cache without module query bust
`index` had `?v=cohere3` on main/css only; nested ESM imports often unbust. cohere4 appends `?v=cohere4` on analyzer, scenePlan, casting, vibeCast, castLibrary, continuity→presets, renderer.

### R6 — Night Owl soft path intact
`softClear = nightOwlSoft && !martial && !orchestralMartial`. Nuclear softBed / softClear exempts low energy+kick spoken/ambient bed. Harness: Night Owl softClear=true, hardOnly=false @ 2s.

---

## End-to-end contract (file:line)

1. **Audio** `_applyAggressionPin` → vibe.forbidPastoral / aggressionLock / martial / orchestralMartial / pinArmed / softClear → moment.* (`analyzer.js` ~846–984, moment ~433–452)
2. **Scene** tick → pinLive OR nuclearHard (≥1.5s hot) → hardOnly + `_hardLatchUntil` ≥20s → hardHud / `__LS_HARD__` (`scenePlan.js` nuclear block ~1289–1341)
3. **Worlds** vibeForbidden(hardOnly) + softForbiddenUnderHard emit scrub + cast pinHard (`vibeCast.js`, `castLibrary.js`)
4. **Visual** directive.hardOnly → hardLock + refuseSoftWin; canvas DEBUG HUD (`renderer.js` hardLock + `_drawDebugHud`)

---

## Runtime proof

### Harness (`scripts/harness-hold-0321-pin.mjs`) — PASS
```
clash: orchestralMartial=true pinArmed=true forbidPastoral=true
       at2s_hardOnly=true preset=metal_hall softImpossibleUnderForce=true
nightOwl: softClear=true hardOnly=false preset=misty_lake
```

Clash-class feature vectors (classical + swell + energy 0.48 + kick/densFast) arm orchestralMartial → pin → nuclear/hardOnly → HARD_LOCK only. Soft IDs impossible while force active. Night Owl stays softClear.

### On-canvas HUD (cohere4)
Top-left monospace (default ON; `?debug=0` off; `?debug=1` on):
`pinArmed martial orchMart softClear forbidPast aggLock hardOnly nuclear latch hotMs energy kick preset pack ladder`

Works Tester: screenshot Clash ≥2s — expect `hardOnly true` / `nuclear true` or `pinArmed true`, preset in `{metal_hall,reality_fracture,apocalyptic_warzone,red_void,storm}`, pack `chaos`.

---

## SoT / cache

| Lane | Checkpoint |
|------|------------|
| Audio | `v2-audio-pin-proof-fields-20261001-192208` (LATEST) |
| Scene | `v2-scene-20261001-192254-hold-0321-nuclear-hot` (LATEST; + harsh field-drop patch in live) |
| Worlds | `v2-worlds-20261001-192506-hold-0321-nuclear-forbid` (LATEST) |
| Visual | `v2-visual-20261001-192506-hold-0321-debug-hud` (LATEST) |
| Cache | `index.html` + critical ESM `?v=cohere4` |

**Do not git push.** Bot 1 re-GATE Clash Defiant ≥20s HARD_LOCK family + HUD proof; Night Owl soft PASS.

---

## Residual

- First ~1.5s before nuclear hotMs may still flash soft if Audio pin slow to arm — escape morph 280ms once hardOnly.
- Classical true soft adagio with brief energy spike could nuclear-latch — softClear/nightOwlSoft must clear; monitor quiet classical.
- `martialHeat` still has legacy energy+bass OR that is broader than metal-harsh — intentional for Clash; watch false positives on loud ambient.
