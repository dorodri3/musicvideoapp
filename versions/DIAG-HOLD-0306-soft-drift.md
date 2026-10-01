# DIAG — HOLD-0306 soft-drift on aggressive (Clash Defiant)

**Date:** 2026-10-01 ~3:07 AM PT (diag after QA `QA-20261001-0306.md`)  
**Tree:** `/workspace/light-show` (post-gate Audio/Scene/vibeCast bumps at ~19:07–19:08 JST; Casting still older)  
**Symptom:** B2 wireframe+green → B3 pale soft ~8s → B4 copper ~15s. Soft Night Owl PASS.  
**CEO P0:** aggressive family must stick ≥15s while lock earned.

---

## Executive summary

Aggressive soft-drift is **not one bug**. Three layers fight the pin:

1. **Audio** can drop `aggressionLock` mid-martial when `softBed` flips true (classical/jazz/gospel/spoken/ambient) — Clash Defiant is orchestral-martial and easily tagged `classical`.
2. **Scene/Casting** re-assert `speechLike` from `speechSteer` / `inferSpeechLikeFromRoles` **after** `dominantVibe` cleared it under pin → spoken pack + pastoral cast (`moss_trail` green cloak = B2/B3 rim).
3. **Worlds routing** unions `genreForbiddenPresets` into the refuse set; when `genreHint` is classical/folk/ambient it **bans hard packs** (`metal_hall`, warzone…) → `packLatched` breaks because `vibeForbidden.has(currentHardPreset)`.

HOLD-0306 patches (HARD_LOCK allowlist, PIN_HOLD_MS=20s, expanded pastoral ban) reduce bed selection under pin, but **do not close** softBed clear, speechLike override, or genreForbidden latch kill. Visual still paints soft destination through morph (veil α≈0.18).

---

## (1) Exact code paths that still select soft/pale/pastoral while “lock is on”

### Path A — Audio clears the pin (`softBed`)

`js/audio/analyzer.js` `_applyAggressionPin`:

```
856–860  softBed = spoken | ambient>0.5 | fam∈{classical,gospel,jazz} | sparseAcoustic…
908       locked = (now < _aggressionPinUntil) && !softBed
942–947   else if (softBed) → pinUntil=0, aggressionLock=false, forbidPastoral=false
```

Any frame where genreFamily becomes `classical` (or speechLike>0.5) **zeros the pin**, even if storm was earned seconds earlier. Martial heat is also gated by `!softBed`, so the track cannot re-earn until softBed drops.

**Clash Defiant relevance:** orchestral swell → `texture.swell` → `leanGenreFromAudio` classical / `genreHint` classical (`genreFamily.js:71`, `analyzer.js:613–616`).

### Path B — Scene re-enables `speechLike` after pin

`js/director/scenePlan.js` `tick`:

```
1103–1107  vibeDom = dominantVibe(…)  // pin → speechLike:false, family:chaotic
           speechLike = vibeDom.speechLike || speechSteer >= 0.45   // ← re-open soft
1138–1141  if (speechLike) setPackFamily(spoken…)
1150–1160  if (!speechLike) { /* only then prefer chaos under pin */ }
```

Pin is ignored for pack preference whenever lyrics `speechSteer≥0.45` or Scene’s local OR reopens speechLike.

### Path C — Casting forces spoken family over pin

`js/director/casting.js` `modulateCast`:

```
201–205  speechLike = dom.speechLike || speechSteer >= 0.45
         if (speechLike && !dom.speechLike) {
           dom.family = 'spoken'; dom.speechLike = true;  // ← overrides pin
         }
```

Then `applyVibeToCast` (`vibeCast.js` ~446+): **speechLike / spoken returns early** (intimate / holdSilent / no chaos crowd) **before** the `family==='chaotic' || ladder==='aggressive'` branch.

Scene soft cast fallbacks (`scenePlan.js` 835–866) still use `_soft = speechLike` → `pastoral_walker` / `linen_dawn` / `path_walker_dawn` when ladder flickers off aggressive.

**Visual match:** `moss_trail` outfit (`viz/castLibrary.js:58–62`) = green rim `rgba(120,160,90,…)` + cloak — matches QA B2/B3 green wireframe cloak. `pastoral_walker` defaults soft outfits (`director/castLibrary.js:118–119`).

### Path D — `genreForbidden` kills hard latch

`scenePlan.js` 1179–1182, 1285:

```
vibeForbidden = vibeForbiddenPresets ∪ genreForbiddenPresets(genreHint)
packLatched   = (now < _packHoldUntil) && !vibeForbidden.has(currentPreset)
```

`genreForbiddenPresets('classical'|'folk'|'ambient'|'spoken'|'jazz')` returns **warChaos** including `metal_hall`, `reality_fracture`, `apocalyptic_warzone`, `red_void`, `industrial_tunnel`, `burning_desert` (`vibeCast.js` 406–420).

So while Audio pin may still be true:
- hard current preset is treated as “forbidden”
- `packLatched` is false
- section roulette / lyric morph can leave the hard family
- escape pool filters hard IDs out until fallback `hardLockPresets()[0]` (only if escape path runs)

Same union is built in `reactToLyricConcept` (`scenePlan.js` ~1648–1653).

### Path E — Pale / copper beds that were still legal at QA (and soft morph)

At gate `QA-0306` (pre HARD_LOCK expand), aggressive refuse omitted `white_void`, `snow`, `empty_highway`, `industrial_tunnel` — pale soft (B3) and copper industrial (B4) could win while “aggressive.”

Post-gate `vibeForbiddenPresets` aggressive case (`vibeCast.js` 380–390) + `HARD_LOCK_PRESETS` (`metal_hall|reality_fracture|apocalyptic_warzone|red_void|storm`) close most of that **if** pinLive stays true. If Path A/B/D drop pin or latch, pale/copper/pastoral return.

### Path F — Morph soft-win (Visual / Continuity)

`js/scene/continuity.js` 83–89: `refuseSoftWin` / `hardLock` only adds storm veil **α≈0.18**. Soft destination still paints at full opacity during morph progress → mid-window pale read (B3).

`renderer.js` hardLook outfit rewrite (1328+) helps FG cast when `_vibeMatch.hardLock` is set; if Audio lock is false (Path A), hardLook may be false and `moss_trail` green rim draws.

---

## (2) Does Audio lock actually stay true for ≥15s on martial audio?

**Intended contract (current):** `PIN_MS = 20000`; while `locked`, aggression floored ≥0.78, warm=0, ladder sticky aggressive, no peak decay (`analyzer.js` 882–928).

**Logic bugs that break the 15s guarantee:**

| Bug | Lines | Effect |
|-----|-------|--------|
| `locked = pinUntil && !softBed` | 908 | softBed false → lock false **without waiting for pin expiry** |
| softBed clears pinUntil/peak/floor | 942–947 | one classical/spoken frame wipes the 20s latch |
| softBed includes `fam === 'classical'\|gospel\|jazz'` unconditionally | 857–859 | martial orchestra never keeps lock if tagged classical |
| spoken/speechLike>0.5 softBed | 856–857 | orchestral high-lead / low-kick inflates speechLike (`_computeVibe` 697–711) → softBed |
| spoken clamp *before* pin | 400–415 | crushes aggression axes before pin; storm then relies only on harsh/energy |
| Pin extend only on `storm`, and storm requires `!softBed` | 872–885 | once softBed, cannot refresh pin |

**Answer:** Lock does **not** reliably stay true for 15s on Clash Defiant-class tracks. It stays true only while softBed stays false for the whole window. Classical/spoken mis-tags mid-phrase drop lock in one frame → Scene sees `aggressionLock=false` / `forbidPastoral=false` → soft routing.

Night Owl PASS is consistent: softBed correctly clears / never earns storm.

---

## (3) Concrete file:line fixes by owner

### Audio Pulse — `js/audio/analyzer.js`

1. **`_applyAggressionPin` ~857–860, 908, 942–947**  
   - Do **not** treat `classical`/`jazz`/`gospel` as softBed when `martial`/`storm` heat is live OR `now < _aggressionPinUntil`.  
   - Soft clear only when softBed **and** no recent martial (e.g. peak floor < 0.35) **and** not inside pin.  
   - Suggested: `const softClear = softBed && !(now < this._aggressionPinUntil) && !martial;` then clear only on `softClear`.  
   - Keep `locked = now < pinUntil` (drop `&& !softBed`) once storm earned; soft tracks never set pinUntil.

2. **`_computeVibe` speechLike ~697–711**  
   - Cap speechLike when harsh/energy/storm high: e.g. if `harsh>0.22 && energy>0.3`, `speechLike *= 0.25`. Prevents orchestral martial → spoken softBed.

3. **Order:** if spoken clamp (400–415) runs, skip it when pin active or martial candidate (harsh+energy).

### Scene Director — `js/director/scenePlan.js` + `casting.js` + `vibeCast.js`

1. **`scenePlan.js` 1107** — pin wins speechLike:
   ```js
   const pin = !!(vibeDom.forbidPastoral || vibeDom.aggressionLock || audio?.vibe?.forbidPastoral || audio?.vibe?.aggressionLock);
   const speechLike = pin ? false : (!!vibeDom.speechLike || speechSteer >= 0.45);
   ```
2. **`scenePlan.js` 1138–1160** — under `pin`, always `setPackFamily('chaos')`; never spoken branch; remove `if (!speechLike)` gate around chaos prefer.
3. **`scenePlan.js` 1179–1182 / 1285 / lyric pinForbidden** — while `pinLive|hardOnly`, **do not union** `genreForbiddenPresets` (or subtract warChaos from refuse). Latch must not die because classical bans `metal_hall`.
4. **`scenePlan.js` 1285** — `packLatched = now < _packHoldUntil && (hardOnly ? isHardLockPreset(current) : !vibeForbidden.has(current))`.
5. **`scenePlan.js` 835–866** — `_agg` must include `dom.forbidPastoral || dom.aggressionLock || dom.aggressive`; never `_soft` pastoral fallbacks under pin.
6. **`casting.js` 201–205** — **delete** spoken force-over when `dom.aggressionLock || dom.forbidPastoral || dom.ladder==='aggressive'`.
7. **`vibeCast.js` `applyVibeToCast`** — if `dom.forbidPastoral || aggressionLock`, skip speechLike early return; fall through to chaotic/aggressive branch.

### Worlds — packs / presets / forbidden

1. Keep `HARD_LOCK_PRESETS` as sole allowlist under pin (`vibeCast.js` 25–27, 380–390) — already post-gate.  
2. Ensure `familyOfPreset('metal_hall')` resolves to `chaos`/`metal_hall` before industrial/sacred collisions (`scenePlan.js` PACK_FAMILIES order — `metal_hall` key exists; confirm chaos members win for latch family compares).  
3. `metal_hall`/`storm`/`warzone` draw paths: refuse pastoral motif trees / soft copper wash when directive `forbidPastoral` (`presets.js` metal_hall ~1465 — currently OK dark/red; B4 copper+trees likely non-hard preset or morph mid).  
4. Export helper: `isHardLockPreset` already — Worlds SectionPlan defaults under aggressive must only seed HARD_LOCK list (`scenePlan.js` byLadder.aggressive ~552–554 — already hard; spoken defaults must not win when pin).

### Visual — `js/viz/renderer.js` + `js/scene/continuity.js` + lighting

1. **`continuity.js` 84–89** — under hardLock, draw **to** only if hard; or progress-clamp soft destination α≤0.15; raise veil to ≥0.45 or skip soft `to` draw until p>0.85.  
2. **`renderer.js` hardLook** — treat `directive.forbidPastoral || aggressionLock || moment.*` as hard even if vibeMatch lag; force `ember_coat`/`fracture_rag` (already expanded softOutfit regex ~1329 — keep `moss_trail`).  
3. Lighting (`lighting/system.js`) — already hardLock storm; ensure pale white_void bloom cannot apply when hardLock (refuse peace bloom path).

---

## QA frame → path map

| Frame | Look | Likely path |
|-------|------|-------------|
| B2 | dark wireframe + **green rim cloak** | cast `moss_trail` / pastoral silhouette on weak hard bed; Path C |
| B3 ~8s | **pale soft** gray/lavender figure | Path A lock drop and/or Path D latch kill → white_void/spoken-adjacent; morph soft-win Path F |
| B4 ~15s | **copper** industrial (+ tree motifs in shot) | non-HARD copper bed / industrial morph after pin lost; late metal_hall-ish without sticky family |
| A2 Night Owl | pastoral hills/deer | softBed correct — must remain PASS after fixes |

---

## Priority fix order (P0)

1. Audio: softBed must not clear active martial pin (classical/orchestral).  
2. Scene+Casting: speechLike/speechSteer must not override pin; chaos pack always under pin.  
3. Scene: genreForbidden must not ban HARD_LOCK while pinLive (fixes packLatched).  
4. Visual: morph refuseSoftWin strong enough that pale cannot dominate mid-morph.  

Do **not** push git from this diag. Re-GATE Clash Defiant ≥15s sticky hard family after Audio+Scene+Casting land; Night Owl still soft.

---

## Refs

- QA: `QA-20261001-0306.md`, prior `QA-20261001-0255.md`  
- Wave: `WAVE-20261001-coherence-hard.md`, `WAVE-AUDIO-DONE-aggression-pin-20261001.md`  
- Screens: `QA-cohere1-B2|B3|B4-*.png`  
- SoT at diag: Audio `v2-audio-pin-hard-20s-20261001-190732` · Scene `v2-scene-20261001-190216-realtime-moment` · Worlds `v2-worlds-hold-0306-hardlock-20261001-190808` · Visual `v2-visual-cohere-20261001-190041`
