# Audio DONE — orchestral-martial pin (QA-0314)

**LATEST:** see LATEST_AUDIO.txt

## Root cause
texture.ambient from orchestral pads gated softImmersion → martial/storm never armed on Clash Defiant.
classical finalize also crushed aggression ×0.45.

## Fix
- nightOwlSoft softClear only (low energy/harsh/kick)
- orchestralMartial: classical/swell + energy + kick/onset/bass (no metal harsh required)
- martial/storm not gated by ambient pads
- finalize classical boosts when hot
- vibe.pinArmed / martial / orchestralMartial / softClear for proof

Sim: Clash-like wouldArm=true; Night Owl softClear=true wouldArm=false.
