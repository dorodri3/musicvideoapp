# WAVE — Cast costume detail + dance energy (post SIGN-OFF 1350)

**CEO:** Darrell said "continue" after BUILD SIGN-OFF QA-20260929-1350  
**North star:** coherent music-video / head-movie from the song — cast must read as characters, not flat blobs  
**Prior limit (QA):** bold geometric silhouette — not detailed costume yet  
**Cache bump target:** `?v=cast-detail1` (Phone Polish / whoever touches index+main last)

## Goal
Make FG cast read as **music-video characters**: outfit silhouette details (coat/cloak/trim/accessories already in `OUTFITS`) visibly different by vibe, plus **dance energy** when the song earns it (kick/snare/energy), without inventing a new world theme.

## Owners
| Role | Job | Files |
|------|-----|-------|
| **Music Researcher** | BRIEF only: MV costume silhouette + dance grammar cues (2–4 bullets) → `MUSIC-BRIEF-cast-detail-20260929.md` | versions only |
| **Scene Director** | PLAN+BUILD: every Characters-on show emits real `outfitId` + `danceIntent`/`dance` on figure/members from vibe+archetype; keep human-scale (≥2.4 / FG bodyH floors from HOLD-1345); no neon-only default | `js/director/*`, `js/scene/*` |
| **Visual Engine** | BUILD: draw outfit accessories/shape diffs so coats/cloaks/trim/neon read at phone distance; strengthen dance motion (step/sway/spin/bob) when `danceIntent` set; keep soft-clip / no eye-bleach; preserve figureStage bodyH≥0.55h | `js/viz/*` |
| **Works Tester** | GATE after both DONE + cache bump | — (wait for bot 1) |

Do **not** change upload/lyrics/karaoke plate behavior. No new bots. Worlds/Camera idle unless Scene needs a pack tag.

## Acceptance (for re-gate)
1. Hard-refresh `?v=cast-detail1` on local `:8765` + tunnel  
2. Josh Woodward — Go, Characters ON, Lyrics ON: cast still human-scale FG  
3. Outfit reads as **more than a featureless blob** (coat flare / cloak / trim / accessory visible in QA screenshot)  
4. On higher-energy sections, cast shows clear dance/sway motion (not frozen stick)  
5. Scenic lyrics still no dark karaoke card; dream-visualizer bar still clear  

## Checkpoints
- Scene → `v2-scene-…-cast-detail` + `LATEST_SCENE.txt`  
- Visual → `v2-visual-…-cast-detail` + `LATEST_VISUAL.txt`  
- Report DONE to bot 1 with residual risk  

## Out of scope
New genre packs, weapon draw wave, lyric retouch theme, UI redesign.
