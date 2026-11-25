# STYLE BIBLE — Horror · Cinematic · Sad (develop before implement)

**Author:** Music Researcher  
**When:** 2026-11-24 21:38 PT  
**CEO (Darrell, Nov 24):** one style at a time; style chips must be single-select; fully develop a style before it ships  
**Maps onto:** Worlds `js/scene/styleFamilies.js` (v2-worlds-20261124-213658-style-families)  
**No code.** Scene / Worlds / Visual / Camera implement; Works Tester gates against the "Ship test" lines.

---

## Rules for every style
1. **Single-select.** A style chip is a radio button, not a checkbox. Tapping a new one replaces the old one for the rest of the track. No blended styles.
2. **Complete before shipping.** A style ships only when all eight parts below are defined and drawn: palette, light, plates, figure, motion, camera, type, peaks. Missing parts fall back to another style's look, and that fallback is what makes the show feel awkward.
3. **Intensity changes, style doesn't.** Loud and quiet moments change brightness, speed and density inside the style. They never swap the palette or the plate family.

---

## 1) HORROR
**Feeling:** dread that builds, something just out of sight, rare startle. Built on slow-burn horror and dread-heavy music videos: hide more than you show.
- **What fans love:** the slow tightening, the fear of what's in the dark, and the jolt of a single well-timed scare. Release comes from surviving the tension, not from spectacle.
- **Palette:** desaturated cold blue-green and bone white, near-black shadows (about 70% of the frame dark). One sick accent, either dim red or sodium yellow. No neon, no candy, no warm gold.
- **Light:** one weak source (a doorway, a bare bulb, moonlight, a flicker). Flicker is irregular and rare. White flashes only on a startle, at most one or two per song.
- **Plates (family `cold_dread`):** dark_sparse, endless_staircase, ancient_ruins at night, misty_lake, snow fog, sparse industrial_tunnel. Storm only as distant cold lightning.
- **Figure:** still and isolated, often seen from behind or half in shadow. Reacts with stillness: freezes, slowly turns its head toward a sound, steps back from the dark. Never dances and never waves its arms. A second silhouette may appear far away, then be gone on the next shot.
- **Motion:** slow drift, fog crawl, dust. Between phrases, motion stops almost completely. Silence reads as the threat.
- **Camera:** slow push toward an empty doorway or the figure's back. Slight dutch tilt in tense parts. One whip on a startle, then back to a held frame.
- **Type:** small, low contrast, as if scratched or breathed onto the scene. Words fade slowly. Never big shiny hook text.
- **Peaks:** a peak is a startle (a flash, a cut to something closer, a shape in the fog), then back to dread. No fireworks and no festival bloom.
- **Never:** bright chorus formation, cute animals, rainbow palette, weapons as cool props, constant strobe.
- **Ship test:** on a 30-second calm stretch the screen is mostly dark, the figure barely moves, and at most one startle happens.

## 2) CINEMATIC (epic film score)
**Feeling:** a big-budget film. Wide, golden or teal-and-orange, with a hero facing something huge. Built on epic score and trailer grammar: hush, swell, one huge hit, aftermath.
- **What fans love:** goosebumps on the swell, feeling small next to something vast, the hero's moment, and the hush after the hit.
- **Palette:** teal shadows and warm amber highlights, filmic contrast, slight grain, letterbox optional. One palette for the whole track.
- **Light:** low sun, god rays, backlit dust, rim light on the figure. Brightness rises with the swell, and the biggest light is saved for the main peak.
- **Plates:** pick ONE home family at the start and stay in it, either `ember_wasteland` (burning_desert, storm, warzone only if earned) or `ethereal_sky` / `golden_pastoral` (cathedral_space, orchestral_hall, ocean, snow, misty_lake), all under the cinematic grade. Wide vistas, not close-up clutter.
- **Figure:** a lone hero, small against a huge world in wide shots and larger in pushes. Reacts to the world: looks up at the sky, braces against wind, raises an arm toward the light on the swell, steps back from fire. No dancing.
- **Motion:** slow, heavy movement (cloth, dust, ash, birds crossing far off). Speed builds through the swell and one big release lands on the hit.
- **Camera:** slow crane or dolly, wide establishing shots. Push in during the build, and on the hit pull back wide to show scale.
- **Type:** title-card style, wide-spaced, centered, appearing on lifts like a film title. Few words, held long.
- **Peaks:** one main hit per song, with a full-frame light bloom and scale reveal, then a long aftermath shot (ash drifting, light settling).
- **Never:** club lasers, candy colors, chaotic cuts every beat, karaoke text, multiple equal-sized peaks.
- **Ship test:** a screenshot from any moment looks like a still from the same film, and the biggest moment happens once.

## 3) SAD (melancholy)
**Feeling:** grief, loneliness and memory. Quiet, rainy and slow, with moments of soft warmth. Built on melancholy music video grammar: rain, long holds, empty places that used to hold someone.
- **What fans love:** feeling understood. A safe place to feel the ache, lyrics that land, and a small light of comfort by the end.
- **Palette:** muted blue-grey and soft lavender, one faded warm accent (a window light, a streetlamp, a memory glow). Low saturation all track.
- **Light:** overcast, diffuse, wet reflections. A soft warm glow may appear on hopeful lines and then fade.
- **Plates:** pick ONE family at the start and stay in it: `city_night` in its rain moods (rainy_city, empty_highway, soul_room) or `golden_pastoral` in its grey moods (misty_lake, snow, cozy_autumn without bright sun), under the sad grade.
- **Figure:** alone, still or barely moving. Sits, looks down, looks out a window, watches rain, slowly turns toward the warm light, holds itself. Calm stretches are idle and gazing. Walking happens only on a lyric about leaving or going home, and it is slow.
- **Motion:** rain, drifting leaves or snow, slow fog, ripples on water. Gentle sway with the music, never bounce.
- **Camera:** long held frames, slow drift, gentle push toward the figure on emotional lines. Rare cuts.
- **Type:** soft, mid-size, held long (sad listeners read the words), fading like breath on glass.
- **Peaks:** a peak is emotional, not explosive: rain gets heavier, the warm light swells, the figure looks up. No white-out storms and no fracture.
- **Never:** strobe, fire, weapons, party formation, neon candy, fast cuts.
- **Ship test:** the whole song feels like one rainy evening, and the loudest moment is a light swell, not an explosion.

---

## Owner slices
- **Scene Director:** style chip = single select, once per track (tap replaces). Each style above gets its own reaction table (horror: freeze and turn; cinematic: look up, brace, raise arm; sad: gaze, sit, look toward the light). Don't offer a style chip until all eight parts are wired.
- **Worlds Presets:** horror maps to `cold_dread`; sad and cinematic need a style grade that can sit over their chosen home family (or their own families) so every plate in the track matches.
- **Visual Engine:** one grade per style from this palette and light spec, held all track. Peaks raise intensity inside the grade only.
- **Camera:** horror slow push and rare whip; cinematic crane, wide reveal; sad long hold, slow drift.

---

## Addendum (Darrell, 9:39 PM PT): not just backgrounds — shared elements + a character who makes sense

Every style needs a **kit of recurring elements** that shows up in every world of that style, and a **character who belongs there** with a reason to be in the scene. Worlds can change; the kit and the character stay, so the song feels like one story.

### Rule
- **Layers, not wallpaper:** each frame has foreground elements (near the figure), the figure, midground props, and the plate. The plate is only the back layer.
- **Same kit all song:** the style's elements recur in every world it uses (a lantern in the ruins is also in the tunnel).
- **The character fits:** costume, prop and posture match the style and the lyrics. They are someone with a reason to be here (searching, waiting, mourning, facing something), not a generic silhouette dropped onto a picture.
- **Elements and character interact:** the figure looks at, reacts to, or holds the elements (shields a lantern from wind, watches rain hit a puddle, turns toward a crow).

### Horror kit
- **Elements:** one flickering lantern or bare bulb, crows, fog at ground level, a doorway or window that is always dark, scratches or handprints, a distant second silhouette that appears and vanishes.
- **Character:** a searcher in a long dark coat, carrying the lantern. The lantern is their light source in every world. Arc: searches (verses), hears something (pre), confronts or flees the dark (peak), is left alone again (outro).
- **Interactions:** lifts the lantern toward sounds, freezes when crows scatter, steps back from the doorway, the lantern flickers on startles.

### Cinematic kit
- **Elements:** a long cloak or banner moving in the wind, dust and embers in backlight, birds crossing far off, one landmark on the horizon (a tower, a peak, a ship) that stays in every world, light beams.
- **Character:** a lone hero in a cloak or traveling coat, maybe holding a staff or sword lowered (not used unless the lyric earns it). They face the landmark. Arc: stands small against the world (intro), walks toward the landmark only on a lyric about going (verse), braces against wind (pre), raises an arm into the light (peak), stands in the aftermath (outro).
- **Interactions:** the cloak follows the wind, turns toward birds, shields eyes from the light, embers rise around them on the hit.

### Sad kit
- **Elements:** rain, puddles with reflections, one warm window or streetlamp, an umbrella (held or left on the ground), falling leaves or snow, a bench or empty seat beside the figure, an object of memory (a letter, a photo, a flower).
- **Character (settled with Worlds kit, 9:41 PM PT):** someone left behind, standing head low, hands in pockets, in a plain coat or hoodie, beside the empty bench. Standing works in every Sad world (street, lake, shore, highway). Optional: a letter or photo in one hand on lyric lines about the person. Arc: stands alone head low (verse), glances at the empty bench (pre), lifts the head into the soft light on the chorus (peak), stays or turns away slowly (outro).
- **Interactions:** rain on the shoulders, glances at the empty bench, the streetlamp or warm light grows when they look up, breath fog in snow worlds.

### Owner slice
- **Scene Director:** a per-style `kit` (element list) and `character` (costume, prop, arc beats) stamped once per track with the style lock; reactions target kit elements, not only plate events.
- **Visual Engine:** draw the kit as foreground and midground layers over every plate in the style, plus the character's costume and prop, consistent all song.
- **Worlds Presets:** each world in the family lists where its kit elements sit (lantern spot, bench spot, landmark position).
- **Works Tester ship test:** screenshots from three different worlds in one song share the same kit and the same character.

---

## Addendum 2: each kit element stands for a part of the song

Audio roles from `js/audio/ROLES.md`. Same mapping for the whole track.

| Song part | Horror | Cinematic | Sad | Happy Pop | Metal |
|-----------|--------|-----------|-----|-----------|-------|
| **Vocals (lead / vocalish)** | the searcher + lantern glow (brightens on sung lines) | the hero; cloak lifts on held notes | the standing figure; breath fog / streetlamp brightens on lines | the lead dancer; sparkle trail on hooks | the frontman silhouette; eyes/rim glow on screams |
| **Kick** | heartbeat thud: fog pulses, lamp jolts | distant war-drum: dust shock on ground | slow footstep-like ripple in puddles | bounce: confetti pops, figure steps | ground slam: embers burst, ground cracks |
| **Snare** | crow flaps / door creak | banner snap in wind | rain gust on the umbrella | handclap sparkles, balloons bob | chain rattle / sparks off metal |
| **Hats** | flicker ticks on the bulb | embers drifting | rain streak density | glitter / light-dot fauna | ash and sparks rain |
| **Bass** | the shape in the fog (grows on bass swells) | the landmark's glow / clouds rolling | the warm light's slow pulse | sunbeam warmth pulsing | the beast or shadow behind the frontman |
| **Pads** | the fog bank itself | the sky and light shafts | mist and overcast | the pastel sky | smoke and red haze |
| **Harsh** | startle only (one flash per song) | the single hit | none (sad never fractures) | none | fire, fracture, lightning on breakdowns |

---

## Addendum 3: Darrell, 9:39 PM PT — genre drives mood (pop happier, metal evil and intense)

**Auto rule:** the director picks the style from the genre and the song's live energy (GENRE-MAP-PLEASURE-20260924-2140, vibe-match ladder). Pop → **Happy Pop**. Metal, hard rock and heavy tracks → **Metal**. Dark ambient and horror-score tracks → **Horror**. Ballads and slow sad lyrics → **Sad**. Epic score and orchestral → **Cinematic**. A chip tap overrides Auto. Happy Pop and Metal stay hidden from the picker until fully built, but Auto can't send a pop song to Horror or a metal song to Sad.

### HAPPY POP
- **What fans love:** the hook you can sing, the chorus lift, sparkle, and feeling good.
- **Palette:** bright pastels plus one hot accent (pink, sky blue, sunshine yellow). High key, few shadows.
- **Worlds (candy_pop + sunny city):** candy_happy, sunlit futuristic_city, dream_clouds daytime, beach ocean.
- **Kit:** confetti, balloons, sparkles, flowers, a sun or rainbow, light-dot fauna.
- **Character:** a lead performer in a bright jacket or colorful outfit with friends who join on the chorus. Bounces with the kick, points at the sky on the hook, dances in formation on the chorus.
- **Camera:** bouncy push-ins, wide group shot on the chorus.
- **Type:** big, bold, colorful hook words.
- **Peaks:** a confetti and light burst, everyone dancing, then back to the bounce.
- **Never:** dark fog, fire, weapons, crows, slow dread.

### METAL (evil and intense)
- **What fans love:** power, aggression, a dark epic, catharsis on the breakdown.
- **Palette:** black and blood red, fire orange, hard white rim light. Deep shadows.
- **Worlds (ember_wasteland):** metal_hall, red_void, burning_desert, storm, industrial_tunnel, apocalyptic_warzone.
- **Kit:** fire and embers, chains, skulls or horned shapes, lightning, cracked ground, broken ruins and pillars, glowing demon eyes in the smoke, a giant shadow beast behind the figure.
- **Character:** a frontman in a torn black coat or armor, wide stance, glowing eyes on screams. Headbangs with the kick, stands defiant facing the beast, raises fists on the breakdown, braces against fire, never sways softly. Riffs and hits are the destruction: each big hit cracks the ground or breaks a ruin.
- **Camera:** shake on the kick, low angle looking up at the figure, whip cuts on breakdowns.
- **Type:** jagged, etched or burning letters.
- **Peaks:** the ground cracks, fire erupts, the beast rises, then back to the grind.
- **Never:** pastel colors, flowers, cute animals, soft meadows, gentle sway.

---

## Addendum 4: reaction limits per style (for Scene's reaction table)

| Style | Allowed reactions | Limits |
|-------|-------------------|--------|
| Horror | freeze, slow head turn, step back, lift lantern | one startle (flash plus flinch) per song, at most two; no raised arms, no dance |
| Cinematic | look up, brace, shield eyes, raise arm into the light, slow walk only on lyrics about going | one main hit reaction per song; no dance |
| Sad | gaze, look down, glance at bench, look toward the warm light, hold the memory object | no brace or flinch from explosions (there are none); walking only on leaving or going-home lyrics |
| Happy Pop | bounce, point up, dance, formation on chorus, wave | dance only when the kick is steady; never freeze or flinch |
| Metal | headbang, brace, defiant stance, raise fists, step back from fire | never sway softly, never dance in formation |
