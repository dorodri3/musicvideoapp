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

## 3) SAD (melancholy) — REVISED 9:59 PM PT per Darrell: Sad must feel like something is missing, never cozy
**Feeling:** hollow, heavy, uneasy. The viewer should feel an absence, not comfort. Darkness alone is NOT sad (a dark forest with a deer read as peaceful and cozy, so that fails).
- **What fans love:** feeling understood. The image admits the ache instead of soothing it.
- **Composition (the core):** one lone shape pushed to an edge (figure or object in the outer third or bottom corner), with 60 to 80% of the frame empty. Nothing fills the gap. The empty bench sits opposite the figure, so the missing person is the subject.
- **Palette:** pale, drained, washed-out: grey-blue, bone, faded lavender, saturation under about 25%. **No warm glow, no amber window, no golden light.** Warmth belongs to Cozy only.
- **Light:** flat, overcast, sourceless. No rim light and no hero light. A streetlamp is allowed only if it is cold or flickering.
- **Texture:** faint unsettled grain, slight haze, smeared rain on the lens, or a barely visible wobble that makes the image feel off.
- **Plates:** rain city, empty highway, grey lake, bare winter field. **Banned in Sad:** cozy_autumn, golden_pastoral, warm forests, cute animals, cabins and fireplaces.
- **Figure:** standing, head low, hands in pockets, small in frame and never centered. Barely moves. The letter only appears on lyrics about the person.
- **Energy expresses the same mood two ways:**
  - **Quiet or slow sad:** hollow and still. Wide empty frame, almost no motion, long holds.
  - **Loud or fast sad:** strained and fractured. The same lone-shape layout, but with cracked glass or rain streaks across the frame, uneven jitter, a tighter frame that presses on the figure, and harsher grain. Still no fire and no explosions.
- **Camera:** long held frames, slow drift away from the figure (distance grows), rarely toward it.
- **Type:** soft, mid-size, held long, placed in the empty space.
- **Peaks:** the absence gets bigger: the frame widens, the figure gets smaller, the rain gets heavier. No warm swell.
- **Never:** warm light, cozy grouping, centered heroic figure, cute animals, strobe, fire, party, neon.
- **Ship test (no-label test):** cover the mood label and ask what the image communicates. If anyone would call it peaceful, cozy or pretty, it fails. It should read as lonely or uneasy.

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
- **Elements:** rain, puddles with reflections, one cold or flickering streetlamp (no warm window), an umbrella (held or left on the ground), falling leaves or snow, a bench or empty seat beside the figure, an object of memory (a letter, a photo, a flower).
- **Character (settled with Worlds kit, 9:41 PM PT):** someone left behind, standing head low, hands in pockets, in a plain coat or hoodie, beside the empty bench. Standing works in every Sad world (street, lake, shore, highway). Optional: a letter or photo in one hand on lyric lines about the person. Arc: stands alone head low (verse), glances at the empty bench (pre), lifts the head into the soft light on the chorus (peak), stays or turns away slowly (outro).
- **Interactions:** rain on the shoulders, glances at the empty bench, the streetlamp flickers when they look up, breath fog in snow worlds.

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
| **Vocals (lead / vocalish)** | the searcher + lantern glow (brightens on sung lines) | the hero; cloak lifts on held notes | the standing figure; breath fog on lines; cold streetlamp flickers | the lead dancer; sparkle trail on hooks | the frontman silhouette; eyes/rim glow on screams |
| **Kick** | heartbeat thud: fog pulses, lamp jolts | distant war-drum: dust shock on ground | slow footstep-like ripple in puddles | bounce: confetti pops, figure steps | ground slam: embers burst, ground cracks |
| **Snare** | crow flaps / door creak | banner snap in wind | rain gust on the umbrella | handclap sparkles, balloons bob | chain rattle / sparks off metal |
| **Hats** | flicker ticks on the bulb | embers drifting | rain streak density | glitter / light-dot fauna | ash and sparks rain |
| **Bass** | the shape in the fog (grows on bass swells) | the landmark's glow / clouds rolling | the empty space slowly widening (camera drifts back) | sunbeam warmth pulsing | the beast or shadow behind the frontman |
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
| Sad | gaze, look down, glance at bench, look toward the empty bench, hold the memory object | no brace or flinch from explosions (there are none); walking only on leaving or going-home lyrics |
| Happy Pop | bounce, point up, dance, formation on chorus, wave | dance only when the kick is steady; never freeze or flinch |
| Metal | headbang, brace, defiant stance, raise fists, step back from fire | never sway softly, never dance in formation |


---

## Addendum 5: composition grammar per mood (Darrell, Nov 24 9:59 PM PT)
Each mood must be identifiable in greyscale, without the label. It must not be the same image with a different color filter. The mood sets the direction, and the song's tempo, energy and emotional tone decide how strongly it is expressed.

| Mood | Feels | Composition | Light | Texture | Maps to style |
|---|---|---|---|---|---|
| Sad | hollow, heavy, uneasy | lone shape at an edge, large empty space | flat, drained, pale | faint grain, haze, lens rain | Sad |
| Cozy | warm, safe, intimate | shapes grouped close, soft edges, centered | warm, low, glowing | soft bokeh | (warm side of Cinematic / Happy calm sections) |
| Anxious | tense, restless | crowded edges, uneven spacing, sharp angles, dutch tilt | harsh side light, deep shadow | jitter, scratches | Horror |
| Calm | open, steady | balanced, horizon line, smooth forms | gentle contrast | clean | Cinematic quiet sections |
| Energized | bright, alive | bold shapes, clear diagonals, strong rhythm | bright, saturated | clean, sparkle | Happy Pop; Metal is energized plus anxious, with fire |

**Generated or painted backgrounds:** they must match the app's own shapes, textures and visual language. If a scene is busy, cut it to one focal element or an abstract composition. Lyrics and controls must stay readable, so keep the text zone in the empty space.

**Gate check for Works Tester:** grayscale screenshots of all five styles side by side must each be identifiable by composition alone.

---

## Addendum 6: composition rule per style + COZY as the sixth style (bot 1 order, Nov 24 10:00 PM PT)
Composition is what sets the mood. The grade only adds to it. Every style below must survive the grayscale no-label test.

| Style | Focal shape position | Empty space | Spacing | Edges | Texture | Quiet / low energy | Loud / high energy |
|---|---|---|---|---|---|---|---|
| **Sad** | one small figure at the outer edge (left or right fifth, low), never centered | 60–80% | one isolated shape, with the empty bench far from it | soft but cold | faint grain, haze, rain on the lens | hollow and still: widest frame, almost no motion | strained and fractured: tighter frame pressing on the figure, cracked glass or rain streaks, uneven jitter, slight tilt. No fire |
| **Cozy** | a cluster in the center-low, figure plus close companions or objects | 20–35% | shapes grouped close and overlapping | rounded, soft | soft bokeh, light film grain | still and glowing: candle or window flicker | gentle sway, warm light breathing on the beat, never strobe |
| **Horror** (anxious) | off-center, partly hidden or cropped by the frame edge | little; shadow fills it | crowded edges, uneven gaps | sharp angles, jagged silhouettes | scratches, flicker, deep noise | frozen dread: almost nothing moves, the frame slowly closes in | restless: dutch tilt, the edges press inward, the one allowed startle |
| **Cinematic** (calm/epic) | a small hero on a thirds line facing a landmark | 40–50% sky or horizon | balanced, with a clear horizon line | smooth, long forms | light filmic grain | open and steady: wide, symmetrical calm | the same layout scaled up: crane reveal, beams, banners, but still balanced |
| **Happy Pop** (energized) | a bold lead near center, with a group on the chorus | 15–25% | rhythmic and repeating, like dance-formation rows | bold, round, clean | clean with sparkle | bright, open daylight bounce | strong diagonals, confetti bursts in rhythm |
| **Heavy/Metal** (energized + anxious) | a central low-angle frontman with the beast looming behind | about 10%; the frame is full | dense, heavy mass at the bottom | jagged, cracked | embers, smoke, cracks | brooding: smoldering, slow | destruction on hits: ground cracks, ruins break |

### 6) COZY (warm, safe, intimate)
**Decision (Worlds `cozy-variant`, 10:01 PM PT):** Cozy is a variant layered on Happy (quiet songs with tender, loving or homey lyrics, including gentle R&B, soul and acoustic love songs) or on Cinematic (quiet, peaceful folk, acoustic, country or nature songs). It is never a sixth lock or a chip, and never used for breakup, grief, dread, hardOnly songs or chip taps. The rules below still define how it should look.
- **What fans love:** being held. The song feels like a blanket, a slow evening with someone close.
- **When Auto picks it:** a warm or tender lyric mood (love, home, together, comfort) plus low-to-mid energy, aggression under 0.3 and a major or soft tone. Typical genres are acoustic, folk, soft R&B, lofi-love and holiday songs. Never pick it for breakup or grief lyrics; those go to Sad.
- **Palette:** amber, honey, soft orange, cream and deep brown shadows, with medium saturation.
- **Light:** warm, low and close: a lamp, candles, a fireplace, golden hour through a window. Light is the hug.
- **Plates:** porch at dusk, autumn cabin, golden_pastoral, a snowy window from inside, a lamplit room.
- **Kit:** two figures close together, or one figure wrapped in a blanket with a mug. Also falling leaves or snow outside the glass, string lights, a fireplace glow, and a cat or dog curled up (animals belong here, not in Sad).
- **Character:** sits close with someone, leans in, shares a blanket, looks at the other person on love lines.
- **Song-part drive:** vocals brighten the lamp glow; drums gently flicker the candles; bass is the fireplace's slow pulse; pads are snowfall or leaf drift; the lead is string-light twinkles.
- **Camera:** slow, gentle push-ins, close and intimate, with soft focus falloff.
- **Type:** handwritten-soft, warm cream, near the cluster.
- **Peaks:** the glow swells, more lights come on, and the figures lean together. No explosions.
- **Never:** empty frames, lone figures at the edge (that's Sad), cold blue, strobe, fire as destruction, weapons, sharp angles.
- **Ship test:** in grayscale with no label, it reads as warm and safe; the shapes are grouped, and the light source is inside the frame.

**Auto mapping update:** quiet, peaceful songs with no sad lyrics go to Cozy (warm or tender tone) or Cinematic (open or epic tone), not Sad. Sad requires a sad lyric mood or a sad tone (minor, slow, lyrics about loss).
