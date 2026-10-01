# Audio DONE — softClear chicken-egg (HOLD-0346)

**Checkpoint:** `v2-audio-softclear-no-sticky-agg-20261001-194823`  
**Target:** `?v=cohere7`

## Bug
Pin lock held aggression ≥0.78 → `lowAgg` always false → softClear never armed → pin never cleared.
Night Owl: Electronic, martial/orchMart false, energy 0.327.

## Fix
softClear when `!martial && !orchMart && softEnergy && softHarsh && calmGenre` —
**ignores** sticky `vibe.aggression`, densFast, kick.
Storm no longer re-arms from sticky aggression under soft bed.
On softClear: zero pin timer + drop aggression floor.
Clash soundtrack martial path unchanged (fam soundtrack excluded from softClear; orchMart still arms when hot).

## Sim
| Case | softClear | storm |
|------|-----------|-------|
| Owl energy 0.327 agg 0.8 densFast 0.5 kick 1 | true | false |
| Clash soundtrack hot | false | true |
