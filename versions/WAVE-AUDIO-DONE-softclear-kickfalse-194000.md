# Audio DONE — softClear vs false-high kick (QA-0338)

**Checkpoint:** `v2-audio-softclear-kickfalse-20261001-194000`  
**Target cache:** `?v=cohere6`

## HOLD
Clash hard **PASS**; Night Owl soft **FAIL** — HUD: kick=1, softClear=false, pinArmed=true, nuclear, metal_hall.

## Root cause
`nightOwlSoft` required `kick < 0.28`. Chillhop bass saturates `kickRaw→1`, so softClear never fired and storm/pin stuck. Ambient kick cap was skipped when swell looked like orchestralBed without hot energy.

## Fix
1. **softClear / nightOwlSoft** — peaceful/ambient/sparse/ladder soft bed + low energy/harsh/dens; **kick gate removed**; exclude hot soundtrack/rock/noise.
2. **cinematicBed** — ambient/swell paths need **energy > ~0.4** (Night Owl never qualifies).
3. **Cap ambient kick when !cinematicBed** — soft energy cap ~0.16; electronic ambient crush stronger.
4. Storm no longer pins on kick-alone under soft energy.

## Sim
| Case | softClear | wouldPin |
|------|-----------|----------|
| Night Owl kick=1 | true | false |
| Night Owl low ambient + peaceful | true | false |
| Clash soundtrack hot | false | true |
| Soft classical | true | false |
