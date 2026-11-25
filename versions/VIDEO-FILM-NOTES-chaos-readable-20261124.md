# VIDEO-FILM-NOTES: How chaotic music videos and films stay readable (bot 1 order, Nov 24 10:15 PM PT)
For: Visual Engine (chaos layer), Camera (cuts and shake), Scene Director (chaos placement). No code. Sources are public writeups and video essays only; title and year are cited for each.

## Seven rules
1. **One focal point, always in the same place.** *Mad Max: Fury Road* (2015). George Miller had the camera operators keep the subject of interest in the center of the frame, so fast cuts never make the eye search. This is widely documented, including in editor Vashi Nedomansky's "Mad Max: Center Framed" analysis and in Miller's interviews about "eye-trace".
   → The figure (or the kit's hero element) owns a fixed focal spot per song (`focalU`/`focalV`). Chaos happens around it and never covers it.
2. **Chaos in the background, a clear subject in front.** *This Is America*, Childish Gambino (2018, dir. Hiro Murai). Riots, running crowds and violence fill the background while Glover stays the foreground subject, and the camera follows him.
   → Use three depth layers. The **far** layer is dense chaos (fires, collapse, swarms). The **mid** layer is clear space for the figure and the lyrics. The **near** layer has occasional fast debris crossing the frame, blurred and brief.
3. **Layer the density, don't scatter it.** Tony Zhou's essay "Michael Bay – What is Bayhem?" (Every Frame a Painting, 2014) shows that even maximal frames have one hero subject, with movement in foreground and background layered in depth around it.
   → Chaos elements spawn in layers and in directional streams (wind, blast direction, the beast's charge), not as random confetti noise. One dominant direction of motion per burst.
4. **Show the hit completely, then cut.** Tony Zhou's essay "Jackie Chan – How to Do Action Comedy" (Every Frame a Painting, 2014): let the action complete in a shot wide enough to read it, and cut on rhythm. The video essay "Chaos Cinema" by Matthias Stork (2011) critiques the opposite, where fragmented cuts and shaky close-ups lose space and cause and effect.
   → Each big hit plays out in full: the impact, the reaction, then debris. Camera cuts and whips land on the downbeat **after** the impact is visible. Never cut mid-impact.
5. **Contrast fast with held.** *Children of Men* (2006). In the Bexhill battle, one long take follows a single character through the chaos, so we always know where we are and who we're following. *Sia "Chandelier"* (2014) is one continuous take of one dancer, frantic motion that never loses its subject.
   → Chaos sections alternate fast cut bursts (2–4 beats) with 1–2 bar held frames. Never more than about 4 seconds of continuous fast cuts.
6. **Make chaos read through texture and motion, not light strobes.** *Saving Private Ryan* (1998). The Omaha Beach sequence's crispness came from a narrow shutter angle, desaturation and handheld camera, widely covered in American Cinematographer and interviews with cinematographer Janusz Kamiński. The chaos reads through staccato motion and grit, not light flashes.
   → Use sharp, staccato particles (embers, glass, rain) with shake and grain for chaos. Brightness flashes stay capped at 3 per second (the WCAG and Harding photosensitivity limit), and full-screen white flashes are rare.
7. **Establish the place before you wreck it, and show the aftermath.** In the action essays above, a wide establishing shot sets the geography before the chaos. The aftermath beat (smoke, quiet, wreckage) is what makes the chaos feel like an event instead of noise.
   → Each song's first chaos burst comes after the world was shown calm. Every burst ends with a 1–2 bar aftermath: smoke, settling debris, the figure standing. The world keeps the damage (cracks, wet ground, ash) for the rest of the song.

## Numbers to start with (tune by eye)
| Parameter | Calm | Intense | Full chaos (biggest moments only) |
|---|---|---|---|
| Active elements on screen | ≤ composition `maxElements` | ×2 | ×4, far and near layers only |
| Mid-layer clear zone around the figure and lyrics | 100% | ≥ 70% clear | ≥ 50% clear, lyrics always on a solid or dimmed backing |
| Cut / whip rate | 0–1 per 4 bars | 1 per bar | 1 per 2 beats, max about 4 s, then hold |
| Camera shake | 0 | small, on the kick | big on impacts, recovers within 0.5 s |
| Brightness flashes | 0 | ≤ 1/s | ≤ 3/s, never full-frame white twice in a row |
| Palette | style grade | style grade | style grade + 1 hot accent (fire, sparks); never new hues |

## Per-style chaos (from MUSIC-BRIEF-song-understanding-20261124)
Heavy: the ground splits, ruins fall, the beast lunges. Happy: confetti storms, multiplying dancers. Horror: flicker, crowded frame edges, one startle. Cinematic: a distant battle set piece, torn banners. Loud Sad: shattered glass, storm rain, a fractured frame. Cozy: none.

## Gate questions (for Works Tester)
- During the loudest 10 seconds, can you point to the figure within half a second at any moment?
- Is each lyric line readable?
- Does every burst end in an aftermath?
- Does the screen stay within the 3-flashes-per-second limit?
