# Audio DONE — softBed classical clear fix (DIAG Path A)

**Checkpoint:** v2-audio-softbed-martial-20261001-190934

Root cause: softBed included fam∈{classical,gospel,jazz} → Clash Defiant pin died in one frame.

Fix:
- softImmersion = spoken | ambient | sparse+quiet only
- classical labels never clear pin / never block martial
- locked = pin time && !softImmersion
