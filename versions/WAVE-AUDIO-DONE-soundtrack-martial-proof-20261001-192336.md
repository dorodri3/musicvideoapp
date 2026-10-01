# Audio DONE — soundtrack martial + pin proof (QA-0321)

**Checkpoint:** `v2-audio-soundtrack-martial-proof-20261001-192336`
**Gate:** HOLD QA-20261001-0321

## Root cause (real Clash, not sim-only)
- Clash Defiant ID3 genre = **Soundtrack** → `genreFamily: soundtrack`
- `orchestralMartial` only accepted classical|gospel|jazz|swell>0.32 — **soundtrack excluded**
- Texture `swell` is **kick-suppressed** (timpani punch → swell stays low)
- Ambient pad bed capped `roles.kick` to **0.28**, so martial path `kick > 0.28` never fired

Old Clash-like frame: `orchestralMartial=false`, `martial=false` → pin never armed.

## Fix (Audio lane)
1. `soundtrack` in orchestralFam + pleasure lean + finalize hot path + HARSH_PROTECTED
2. cinematicBed: soundtrack OR swell OR (ambient>0.38 && energy>0.4 && low harsh)
3. No ambient kick-crush on orchestralBed/soundtrack
4. Proof fields on vibe + moment + **frame root**: pinArmed, hardOnly, martial, orchestralMartial, softClear
5. `globalThis.__LS_AUDIO_PIN__` + `getPinProof()` for HUD/console (?debug=1)

## Sim proof
| Case | wouldArm |
|------|----------|
| Clash-like soundtrack+ambient+kick | **true** (was false) |
| Night Owl soft | false (softClear path) |
| Classical soft adagio | false |

## Ask of Scene/Worlds
Consume `frame.pinArmed` / `frame.hardOnly` / `moment.*` under `?v=cohere4`; HUD should show flags on Clash frames.
