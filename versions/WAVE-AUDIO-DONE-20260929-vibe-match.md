# Audio Pulse DONE — WAVE vibe-match

**Checkpoint:** see `LATEST_AUDIO.txt`  
**When:** 2026-09-29 PT  

## Shipped
- `vibe.aggression` / `vibe.aggressive` (0..1) from energy + harsh + onsetDensity + kick
- `vibe.arousal` exposed on frame
- Stronger `chaos` when aggression high; `dominant` → chaos when aggression > ~0.58
- Soft bias: spoken / ambient / silence stay low
- `_finalizeAggression` after genreFamily (rock/noise deepen; classical/gospel/spoken/jazz soft)
- Soft-clip bleach guard: brief harsh OK; sustained harsh soft-caps (CEO FYI)

## Contract
Prefer `audio.vibe.aggression` + `audio.vibe.chaos` + `dominant` for Scene/Visual routing.
