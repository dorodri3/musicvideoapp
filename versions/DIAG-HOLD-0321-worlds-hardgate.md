# DIAG — HOLD-0321 Worlds hardgate (forest/deer on Clash Defiant)

**QA:** QA-20261001-0321.md (build was ?v=cohere3; fix ships ?v=cohere4)
**Ckpt:** v2-worlds-hold-0321-20261001-192443 (pre: v2-worlds-pre-hold-0321-20261001-192221)

## Root cause (Worlds)

1. **Soft `transition.from` under hard escape** — Continuity always paints `from` first. Escape set `from: forest|ocean` while `to: metal_hall`, so forest+deer / water+fish stayed visible during morph (and QA sampled those frames). `previousPreset` also leaked soft IDs.
2. **martialHeat too harsh-gated** — orchestral Clash can miss `harsh>0.2`; hardOnly waited on Audio pin. Widened to orchestralMartial/pinArmed + energy/bass/kick heat; softBedGuard never blocks martial.
3. **HARD packs themselves OK** — metal_hall/storm/red_void/fracture/warzone do not draw deer/trees/fish. Soft presets do. Emit clamp + fauna strip are belt-and-suspenders.

## Fix summary

- Emit clamp: under hardOnly, `preset` + `previousPreset` + `transition.from/to` ∈ HARD_LOCK only.
- Soft refuse list: forest|meadow_fauna|misty_lake|ocean|spoken_word_bed|country_porch|candy_happy|cozy_autumn|dream_clouds|white_void.
- presets: `_forbidPastoralFauna` → fauna no-op; soft pastoral IDs redirect to metal_hall/storm when hard.
- Proof HUD: directive fields + on-screen `#hud-info.hud-proof` when `?v=cohere4` or `?debug=hardlock`; console `__LS_HARD__`.

HARD_LOCK = metal_hall | reality_fracture | apocalyptic_warzone | red_void | storm · PIN_HOLD_MS=20000
Night Owl soft path when !hardOnly unchanged.
