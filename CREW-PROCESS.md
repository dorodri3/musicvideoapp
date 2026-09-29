# LIGHT SHOW — Crew process (bot 1 manager)

**Owner:** bot 1 (manager) · **CEO:** Darrell (direction only here)  
**App:** `/workspace/light-show/` · **Checkpoints:** `/workspace/light-show-versions/`  
**Gate:** Works Tester · **North star:** dream visualizer / head-movie (not spectrum, karaoke slab, random FX)

---

## Org

| Role | Job | Does not |
|------|-----|----------|
| **Darrell (CEO)** | Creative direction after each SIGN-OFF | Micromanage specialists |
| **bot 1** | Assign lanes, sequence waves, surface SIGN-OFF/HOLD/blockers, keep process | Implement app code |
| **Works Tester** | Functional + dream-bar **build gate** (SIGN-OFF / HOLD) | Creative taste score |
| **Quality Critic** | Taste / quality notes | Ship or unblock gate |
| **Music Researcher** | MV/film/psych briefs + movie grammar (incl. war/weapons) | App code; no second research bot |
| **Lyrics Brain** | Song ID, LRCLIB, lyric semantics / sticky | Own typography draw |
| **Scene Director** | Casting, packs, role-agents, weaponId gates, narrative | Renderer internals |
| **Worlds Presets** | World packs + vibe→pack routing | Cast library draw |
| **Camera** | Framing language | Scene casting |
| **Visual Engine** | Canvas/WebGL, cast draw, scenic typography, props | `main.js` UX flow |
| **Audio Pulse** | FFT, roles, vibe signals | Scenery |
| **Phone Polish** | Mobile UX / `main.js` integrator | Deep viz algorithms |
| **Perf Guard / A11y** | Perf + a11y passes | Block creative waves unless P0 |
| **Tunnel Ops** | :8765 + Cloudflare tunnel | Feature work |
| **Release Notes** | Plain-English notes after checkpoints | Code |

**Rules:** No new bots unless Darrell asks. Assign to the most relevant existing specialist. Movie Research bot is cancelled — delete in UI; Music Researcher owns that lane.

---

## Wave flow (every creative wave)

```
1. BRIEF     Music Researcher (+ Lyrics if lyric-system) → notes + MUSIC-BRIEF
2. PLAN      Scene + Worlds + Camera align on packs/cast/framing (checkpoint before edits)
3. BUILD     Visual / Audio / Lyrics in parallel on owned files only
4. INTEGRATE Phone Polish wires UX if main.js touched
5. SOFT QA   Optional Perf/A11y note (non-blocking unless crash/illegible)
6. GATE      Works Tester hard-refresh + legal CC track → SIGN-OFF or HOLD
7. TASTE     Quality Critic (parallel OK; never replaces gate)
8. SNAPSHOT  Release Notes + integrated version folder when SIGN-OFF
9. IDLE      Specialists park until Darrell’s next direction via bot 1
             (Tunnel Ops / docs may continue)
```

### HOLD loop
HOLD → bot 1 names **P0 owners + acceptance** → only those lanes edit → owners report DONE with checkpoint id → Works Tester **re-gates same blockers** → notify Darrell on SIGN-OFF or new HOLD.

### Parallelism (safe)
- **OK together:** Music briefs ‖ Scene plan ‖ Worlds packs ‖ Camera ‖ Audio ‖ Visual *if file lanes don’t collide*
- **Serialize:** two writers on `renderer.js` / `castLibrary.js` / `main.js` / same `presets.js` chunk
- **Always:** version checkpoint *before* a big edit; refine, don’t wipe

### File lane ownership (default)
- Visual: `js/viz/*`, `js/typography/*`, `js/lighting/*`
- Scene: `js/scene/*`, `js/director/*` (if present)
- Audio: `js/audio/*`
- Lyrics: `js/lyrics/*`, `js/song/*`
- Camera: `js/camera/*`
- Worlds: scene presets / worlds packs only
- Phone Polish: `js/ui/*`, `js/main.js`, `index.html`, `css/*`
Cross-lane PR needs bot 1 ack or single owner named.

---

## What “done” means
- **Specialist DONE:** checkpoint id under `/workspace/light-show-versions/`, `LATEST_*.txt` updated, short report to bot 1 (what / files / residual risk)
- **BUILD SIGN-OFF:** Works Tester only — functional path green **and** CEO-wave dream bar clear
- **bot 1:** notify Darrell **immediately** on SIGN-OFF (and on HOLD with blockers)

## Standing priorities (long project)
1. Lyrics as part of the picture (not karaoke slab)
2. Real characters / cast + outfits readable
3. Vibe match (peace→nature/fauna; chaos→chaos; scary→scary; spoken→intimate lyric-world)
4. Instrument→meaning (ROLE-AGENTS), not random FX
5. Weapons only when lyric/vibe earn them (Music Researcher grammar)
6. Soft heals / hard hits; full cinematic potential over time
7. Dancing allowed — Scene decides when; Visual draws motion; Music Researcher supplies MV dance grammar
8. All genres — Music Researcher GENRE-MAP; Scene/Worlds/Audio route every family (never neon-default)
9. Flashy/chaotic OK; never hard to look at (soft-clip bloom, flash duty limits) — Visual + A11y

---

## Cadence while CEO away
bot 1 keeps assigning next safe work from HOLD leftovers and non-blocking debt (vibe routing, weapon draw, psych budgets). Do **not** invent a new creative theme — wait for Darrell after SIGN-OFF. Surface only SIGN-OFF, HOLD, or true blockers.

## Usage cliff / handoff
If the crew must stop (usage dry, quota, long pause): bot 1 **always** sends Darrell a phone-test handoff — current tunnel URL, local `:8765`, hard-refresh, what’s in the build, gate status, known limits. Template: `BUILD-HANDOFF-TEMPLATE.md`. Never silent-stop.

## Crew sync meetings
Standing channel **LIGHT SHOW sync** (max 6): bot 1, Works Tester, Visual Engine, Scene Director, Music Researcher, Worlds Presets.
bot 1 posts short syncs ~4×/day (10:43 / 14:43 / 18:43 / 22:43 JST): gate, P0 owners, landed ckpts, next steps.
Other specialists get lane FYIs only when named. Darrell is not in the room — bot 1 surfaces SIGN-OFF/HOLD/blockers to him.
