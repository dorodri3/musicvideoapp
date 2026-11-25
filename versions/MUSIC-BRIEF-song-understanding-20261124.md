# MUSIC-BRIEF: Song understanding, with no mood selector (Darrell, Nov 24 10:02 PM PT)
**CEO:** "take ur time make it good. make it chaotic too n get rid of mood selector i want the ai to analyze song n understand whats likely going on in it"
**No code.** Owners: Lyrics Brain (meaning), Audio Pulse (sound), Scene Director (story plan), Worlds (style pick), Visual Engine (draw), Works Tester (gate).

## 1. Remove the selector
- Delete the mood/style chips from the UI. Auto is the only mode. The style still locks once per song (one fantasy per song), but the app chooses it, not the user.
- Keep the optional "What do you imagine?" text box as the only user steer.

## 2. What the app must work out before Generate (the "song read")
A one-line logline plus these fields, built from the lyrics and the audio:
| Field | Question | Source |
|---|---|---|
| **who** | who is singing, and to whom (I/you/we/they) | pronouns and address in the lyrics |
| **situation** | what is happening: a breakup, a party, a war, a chase, falling in love, grief, revenge, a road trip, partying, self-hype... | lyric keywords + hook line |
| **place** | where it likely happens (city at night, car, bedroom, battlefield, ocean, club, nowhere/dream) | explicit nouns; otherwise inferred from genre + mood |
| **conflict / stakes** | what is wrong or wanted | verbs of loss, fighting, desire |
| **arc** | how it changes: verse setup, chorus release, bridge turn, ending (resolved / unresolved / explodes / fades) | section map + lyric change |
| **energy shape** | where it is calm, where it builds, where it is chaotic | audio sections, drops, aggression |
| **style** | one of the five, decided from all of the above | `pickStyleFamily` |

Example: Josh Go reads as "someone left behind after a breakup, replaying it alone in the rain; it never resolves" → Sad, rainy city, empty bench, ending unresolved.
Instrumental with no lyrics: the read comes from sound only (tempo, key, aggression, instruments) plus the genre, and says so honestly (for example, "a night drive, restless").

Show the logline briefly on the setup screen ("Reading this as: a breakup, alone in the rain"), so Darrell can see the AI understood the song.

## 3. Chaos, done in a way that stays coherent
Darrell wants it chaotic too. Chaos is allowed and wanted, but only where the song is chaotic, and always inside the locked style:
- **Where chaos happens:** drops, choruses, screams, crashes, distorted sections, bridges that explode. Quiet parts stay calm, so the chaos hits harder.
- **What chaos looks like in each style:**
  - Heavy: the ground splits, ruins fall, fire, shaking, the beast lunges.
  - Happy: confetti storms, the crowd of dancers multiplies, light bursts, fast cuts.
  - Horror: flicker, the frame crowded with shapes, the startle, glitch.
  - Cinematic: a battle-scale set piece with debris, banners torn, explosions in the distance.
  - Sad (loud): shattering glass, storm rain, the frame fractures, the figure is buffeted.
  - Cozy: no chaos. If a song turns chaotic, it was not Cozy.
- **Rules:** the chaos comes from the story (the "situation" field), not random particles. The figure reacts to it (bracing, ducking, headbanging, being thrown) instead of ignoring it. Lyrics stay readable. Every chaotic burst ends, and the next calm section shows the aftermath (smoke, debris, wet ground) so the world remembers.
- **Chaos scale:** calm 0 → building 1 → intense 2 → full chaos 3. Full chaos only on the song's biggest moments, at most a few times per song.

## 4. Gate (Works Tester)
1. No mood chips anywhere.
2. The logline for each gate song is plausible (Josh Go breakup, Cullah party, NIN aggression, Clegg love song).
3. The style matches the read.
4. The biggest drop or chorus reaches chaos level 2–3 in the right style, and quiet parts stay calm.
5. The figure reacts during chaos.
6. The grayscale no-label mood test still passes.
