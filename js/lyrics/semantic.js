/**
 * Extract VISUAL CONCEPTS (metaphor-aware), NOT noun→object.
 * Hand-authored concept graph maps lyric language → cinematic imagery.
 */

/** @typedef {{
 *   id: string,
 *   imagery: string[],
 *   presets: string[],
 *   mood: object,
 *   scale?: string,
 *   symbols?: string[],
 *   patterns: RegExp[],
 *   figure?: { presence: 'none'|'lone'|'pair'|'crowd'|'self'|'silhouette', role?: string, suggestsCharacter: boolean },
 *   frameOwnership?: 'lyric'|'instrument'|'either',
 *   props?: string[],
 *   worldCue?: { family: string|null, presets: string[] },
 *   glueScore?: number,
 *   motif?: string[]
 * }} VisualConcept */

export const CONCEPT_GRAPH = [
  {
    id: 'carrying_weight',
    patterns: [/carry(ing)?\s+(this\s+)?weight/i, /\bburden/i, /weigh(s|ing|ed)?\s+(me|on|down)/i, /heavy\s+(on\s+me|heart|load)/i, /too\s+heavy/i],
    imagery: ['figure dragging enormous shadow', 'cracked stone on shoulders', 'collapsing city behind a lone walker'],
    presets: ['industrial_tunnel', 'ancient_ruins', 'rainy_city'],
    mood: { darkness: 0.7, tension: 0.6, hope: 0.2 },
    scale: 'cinematic',
    symbols: ['shadow_burden', 'cracked_stone'],
    figure: { presence: 'lone', role: 'burdened_walker', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'running_from_self',
    patterns: [/runn?ing\s+from\s+(my|myself|me)/i, /escape\s+(myself|who\s+i)/i, /mirror\s+(of\s+)?(me|myself|mine)?/i, /\bmirrors?\b/i, /two\s+faces/i, /can'?t\s+face\s+(myself|who)/i, /reflection\s+of\s+(me|myself)/i],
    imagery: ['mirror chase through looping hallway', 'multiple translucent selves', 'face splitting into reflections'],
    presets: ['endless_staircase', 'white_void', 'futuristic_city'],
    mood: { tension: 0.75, darkness: 0.5, arousal: 0.7 },
    scale: 'human',
    symbols: ['mirror', 'doppelganger'],
    figure: { presence: 'self', role: 'doppelganger', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'falling_apart',
    patterns: [/fall(ing)?\s+apart/i, /breaking\s+(down|apart)/i, /\bshatter/i, /\bcrumbling/i, /\bcollapse/i, /coming\s+undone/i],
    imagery: ['architecture crumbling into dust', 'glass shatter freeze-frame', 'ground splitting underfoot'],
    presets: ['ancient_ruins', 'storm', 'red_void'],
    mood: { darkness: 0.65, tension: 0.8, aggression: 0.4 },
    scale: 'epic',
    symbols: ['shatter', 'fissure'],
    figure: { presence: 'silhouette', role: 'witness', suggestsCharacter: true },
    frameOwnership: 'either'
  },
  {
    id: 'rising_fire',
    patterns: [/\bon\s+fire\b/i, /\bburn(ing|ed|s)?\b/i, /\bflames?\b/i, /\bashes?\b/i, /\binferno\b/i, /set\s+(the\s+)?world\s+on\s+fire/i],
    imagery: ['silhouette against wall of flame', 'embers rising into night sky', 'charred horizon glow'],
    presets: ['burning_desert', 'storm', 'red_void'],
    mood: { aggression: 0.7, arousal: 0.8, darkness: 0.4 },
    scale: 'cinematic',
    symbols: ['fire', 'embers'],
    figure: { presence: 'silhouette', role: 'ember_figure', suggestsCharacter: true },
    frameOwnership: 'either'
  },
  {
    id: 'ocean_depth',
    patterns: [/\bocean\b/i, /\bsea\b/i, /\bdrown(ing|ed)?\b/i, /underwater/i, /\btidal\b/i, /\bwaves?\b/i, /deep\s+blue/i, /beneath\s+the\s+(waves?|surface)/i],
    imagery: ['figure suspended in deep water light rays', 'tidal wave freezing mid-crash', 'lighthouse swallowed by swell'],
    presets: ['ocean', 'storm', 'dream_clouds'],
    mood: { darkness: 0.45, valence: -0.2, hope: 0.3 },
    scale: 'epic',
    symbols: ['wave', 'depth'],
    figure: { presence: 'lone', role: 'suspended_body', suggestsCharacter: true },
    frameOwnership: 'either'
  },
  {
    id: 'lonely_road',
    patterns: [/\bhighway\b/i, /\bempty\s+(street|road|highway)\b/i, /driving\s+alone/i, /miles?\s+away/i, /leaving\s+(town|home)/i, /open\s+road/i],
    imagery: ['endless empty highway at dusk', 'taillights vanishing into fog', 'lone figure on center line'],
    presets: ['empty_highway', 'rainy_city', 'burning_desert'],
    mood: { darkness: 0.4, valence: -0.3, hope: 0.35 },
    scale: 'cinematic',
    symbols: ['road', 'taillight'],
    figure: { presence: 'lone', role: 'road_walker', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'night_drive',
    patterns: [/night\s+drive/i, /driving\s+(at\s+)?night/i, /headlights?/i, /dashboard\s+light/i, /late\s+night\s+(drive|ride)/i, /windows?\s+down/i, /cruise\s+(the\s+)?night/i],
    imagery: ['headlight beams cutting rain on asphalt', 'dashboard glow on a quiet face', 'city smear past a wet windshield'],
    presets: ['neon_highway', 'empty_highway', 'rainy_city', 'futuristic_city'],
    mood: { darkness: 0.55, valence: 0.05, arousal: 0.45 },
    scale: 'intimate',
    symbols: ['headlights', 'windshield_rain'],
    figure: { presence: 'lone', role: 'driver', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'city_night',
    patterns: [/\bcity\b/i, /\bneon\b/i, /streetlight/i, /skyscraper/i, /\bdowntown\b/i, /\balley\b/i, /midnight\s+streets?/i],
    imagery: ['rain-slick neon reflections', 'silhouette between towers', 'window lights like constellations'],
    presets: ['rainy_city', 'neon_highway', 'futuristic_city', 'industrial_tunnel'],
    mood: { darkness: 0.5, arousal: 0.5 },
    scale: 'cinematic',
    symbols: ['neon', 'skyline'],
    figure: { presence: 'silhouette', role: 'city_walker', suggestsCharacter: true },
    frameOwnership: 'instrument'
  },
  {
    id: 'rain_emotion',
    patterns: [/\brain(ing|ed)?\b/i, /\btears?\s+(like\s+)?rain/i, /pouring\s+(down|out)/i, /washed\s+away/i, /in\s+the\s+rain/i, /\bdrizzle\b/i],
    imagery: ['figure standing still in heavy rain', 'city lights smeared through wet glass', 'puddle reflecting a broken sky'],
    presets: ['rainy_city', 'storm', 'empty_highway'],
    mood: { darkness: 0.5, valence: -0.25, hope: 0.35 },
    scale: 'cinematic',
    symbols: ['rain', 'puddle_reflection'],
    figure: { presence: 'lone', role: 'rain_stander', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'sacred_space',
    patterns: [/\bpray(ing|ed|er)?\b/i, /\bchurch\b/i, /cathedral/i, /\bangel\b/i, /\bheaven\b/i, /\bholy\b/i, /\bbless(ed|ing)?\b/i, /salvation/i],
    imagery: ['shafts of light through cathedral dust', 'empty pews and stained glass', 'ascending into white light'],
    presets: ['cathedral_space', 'white_void', 'space'],
    mood: { hope: 0.7, darkness: 0.25, valence: 0.4 },
    scale: 'epic',
    symbols: ['light_shaft', 'stained_glass'],
    figure: { presence: 'silhouette', role: 'seeker', suggestsCharacter: true },
    frameOwnership: 'instrument'
  },
  {
    id: 'storm_chaos',
    patterns: [/\bstorm\b/i, /\bthunder\b/i, /lightning/i, /hurricane/i, /\btempest\b/i, /\bchaos\b/i],
    imagery: ['sky tearing open with lightning', 'trees bent horizontal', 'figure standing in gale'],
    presets: ['storm', 'ocean', 'forest'],
    mood: { aggression: 0.65, tension: 0.85, arousal: 0.9 },
    scale: 'epic',
    symbols: ['lightning', 'torn_sky'],
    figure: { presence: 'lone', role: 'gale_stander', suggestsCharacter: true },
    frameOwnership: 'instrument'
  },
  {
    id: 'forest_lost',
    patterns: [/\bforest\b/i, /\bwoods?\b/i, /\btrees?\b/i, /lost\s+in\s+(the\s+)?(woods?|forest|dark)/i, /\bwilderness\b/i],
    imagery: ['mist between ancient trunks', 'path dissolving into dark', 'eyes in the undergrowth'],
    presets: ['forest', 'snow', 'dream_clouds'],
    mood: { darkness: 0.55, tension: 0.4, hope: 0.3 },
    scale: 'human',
    symbols: ['tree_silhouette', 'mist'],
    figure: { presence: 'none', suggestsCharacter: false },
    frameOwnership: 'instrument'
  },
  {
    id: 'space_void',
    patterns: [/\bstars?\b/i, /\bgalaxy\b/i, /\bcosmos\b/i, /universe/i, /\borbit\b/i, /\bspace\b/i, /infinity/i],
    imagery: ['body drifting among galaxies', 'planet rising over horizon', 'starfield tearing into nebula'],
    presets: ['space', 'dream_clouds', 'white_void'],
    mood: { hope: 0.5, valence: 0.2, darkness: 0.6 },
    scale: 'cosmic',
    symbols: ['stars', 'nebula'],
    figure: { presence: 'lone', role: 'drifting_body', suggestsCharacter: true },
    frameOwnership: 'instrument'
  },
  {
    id: 'heartbreak',
    patterns: [/heart\s*break/i, /broken\s+heart/i, /you\s+(left|left\s+me|walked\s+away)/i, /don'?t\s+love\s+me/i, /fell\s+out\s+of\s+love/i, /tore\s+(me|us)\s+apart/i, /said\s+goodbye/i, /over\s+us\b/i],
    imagery: ['cracked glass heart dissolving into rain', 'empty side of a bed in blue light', 'two shadows pulling apart on wet asphalt'],
    presets: ['rainy_city', 'white_void', 'empty_highway', 'red_void'],
    mood: { valence: -0.75, darkness: 0.55, hope: 0.2 },
    scale: 'intimate',
    symbols: ['cracked_heart', 'empty_bed'],
    figure: { presence: 'pair', role: 'parting_pair', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'love_warmth',
    // Narrow: avoid matching every "heart" — require relational warmth language
    patterns: [/\bin\s+love\b/i, /love\s+(you|me|her|him|us)\b/i, /falling\s+in\s+love/i, /hold\s+(me|you)\s+close/i, /\bembrace\b/i, /\bkiss(es|ing|ed)?\b/i, /\bdarling\b/i, /my\s+love\b/i, /heart\s+(of\s+gold|beats?\s+for)/i],
    imagery: ['two silhouettes merging in golden light', 'warm window in cold night', 'hands reaching across void'],
    presets: ['candy_happy', 'dream_clouds', 'rainy_city', 'white_void'],
    mood: { valence: 0.7, hope: 0.75, darkness: 0.15 },
    scale: 'intimate',
    symbols: ['hands', 'warm_glow'],
    figure: { presence: 'pair', role: 'lovers', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'loneliness',
    patterns: [/\blonely\b/i, /\balone\b/i, /by\s+myself/i, /no\s+one\s+(left|here|cares)/i, /empty\s+(room|house|bed)/i, /silence\s+(is|feels)/i, /talking\s+to\s+(myself|the\s+walls)/i],
    imagery: ['single chair in a vast white room', 'phone glowing unanswered in dark', 'figure tiny under endless ceiling'],
    presets: ['white_void', 'empty_highway', 'rainy_city', 'endless_staircase'],
    mood: { valence: -0.55, darkness: 0.5, hope: 0.25 },
    scale: 'intimate',
    symbols: ['empty_chair', 'unanswered_glow'],
    figure: { presence: 'lone', role: 'solitary', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'nostalgia',
    patterns: [/remember\s+when/i, /\bnostalgia/i, /used\s+to\s+(be|know|love)/i, /back\s+then/i, /old\s+(days|times|photograph)/i, /miss\s+(those|the)\s+days/i, /faded\s+(memory|photo)/i, /childhood/i, /looking\s+back/i],
    imagery: ['sun-bleached photograph curling at edges', 'dust motes in a childhood bedroom', 'summer road receding into haze'],
    presets: ['cozy_autumn', 'dream_clouds', 'empty_highway', 'snow', 'forest'],
    mood: { valence: 0.1, hope: 0.4, darkness: 0.3 },
    scale: 'intimate',
    symbols: ['faded_photo', 'dust_motes'],
    figure: { presence: 'none', suggestsCharacter: false },
    frameOwnership: 'lyric'
  },
  {
    id: 'betrayal',
    patterns: [/\bbetray(ed|al)?\b/i, /stabbed\s+(me\s+)?in\s+the\s+back/i, /lied\s+to\s+me/i, /two[- ]faced/i, /trusted\s+you/i, /sold\s+me\s+out/i, /fake\s+(love|friend|smile)/i, /deceiv(e|ed|ing)/i],
    imagery: ['mask slipping in red light', 'knife-shadow across a trusted face', 'doors slamming in a corridor of mirrors'],
    presets: ['red_void', 'industrial_tunnel', 'endless_staircase', 'ancient_ruins'],
    mood: { aggression: 0.6, tension: 0.85, valence: -0.7 },
    scale: 'cinematic',
    symbols: ['mask', 'knife_shadow'],
    figure: { presence: 'lone', role: 'betrayed', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'rebirth',
    patterns: [/\breborn\b/i, /born\s+again/i, /\brebirth\b/i, /from\s+the\s+ashes/i, /start\s+(over|again)/i, /new\s+(beginning|life|dawn)/i, /rising\s+(from|again)/i, /phoenix/i, /come\s+alive\s+again/i],
    imagery: ['figure stepping from ash into first light', 'cracked cocoon opening to sky', 'green shoots through scorched earth'],
    presets: ['burning_desert', 'dream_clouds', 'empty_highway', 'white_void'],
    mood: { hope: 0.85, valence: 0.55, darkness: 0.2 },
    scale: 'epic',
    symbols: ['phoenix', 'first_light'],
    figure: { presence: 'lone', role: 'rising_self', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'time_clocks',
    patterns: [/\bclock(s)?\b/i, /running\s+out\s+of\s+time/i, /time\s+(slips|flies|stands|is\s+up)/i, /tick(ing|s)?\s*(away|tock)?/i, /hours?\s+(pass|away)/i, /wasted\s+(years?|time)/i, /too\s+late\b/i, /hands\s+of\s+(the\s+)?clock/i],
    imagery: ['clocks melting over endless stairs', 'hourglass sand turning to dust mid-air', 'frozen second-hand in a white void'],
    presets: ['endless_staircase', 'white_void', 'dream_clouds', 'ancient_ruins'],
    mood: { tension: 0.65, darkness: 0.4, valence: -0.2 },
    scale: 'surreal',
    symbols: ['melting_clock', 'hourglass'],
    figure: { presence: 'none', suggestsCharacter: false },
    frameOwnership: 'either'
  },
  {
    id: 'gold_emptiness',
    patterns: [/\bgold\b/i, /\briches?\b/i, /\bmoney\b/i, /\bfame\b/i, /all\s+that\s+glitters/i, /hollow\s+(crown|victory|win)/i, /empty\s+(castle|throne|success)/i, /sold\s+(my\s+)?soul/i, /champagne\s+problems/i, /diamond(s)?\s+(cold|eyes|tears)/i],
    imagery: ['empty golden throne in a ruined hall', 'champagne glass reflecting a vacant face', 'vault door open onto nothing'],
    presets: ['ancient_ruins', 'white_void', 'cathedral_space', 'futuristic_city'],
    mood: { valence: -0.35, darkness: 0.45, hope: 0.2 },
    scale: 'cinematic',
    symbols: ['empty_throne', 'hollow_gold'],
    figure: { presence: 'lone', role: 'hollow_victor', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'death_void',
    patterns: [/\bdie\b|\bdying\b|\bdeath\b|\bgrave\b|\bfuneral\b|\bghost\b|\bhaunt/i, /goodbye\s+forever/i, /end\s+of\s+(me|us|all)/i],
    imagery: ['empty white room fading', 'figure dissolving into ash', 'doorway into absolute dark'],
    presets: ['white_void', 'red_void', 'ancient_ruins'],
    mood: { darkness: 0.85, valence: -0.7, hope: 0.1 },
    scale: 'cinematic',
    symbols: ['ash', 'doorway'],
    figure: { presence: 'lone', role: 'dissolving_figure', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'freedom_flight',
    patterns: [/\bfly(ing)?\b|\bflight\b|\bwings?\b|\bsoar\b|\bfree(dom)?\b|break\s+(free|out)/i],
    imagery: ['figure leaping from cliff into open sky', 'broken chains falling away', 'birds exploding from cage'],
    presets: ['dream_clouds', 'space', 'empty_highway'],
    mood: { hope: 0.8, valence: 0.65, arousal: 0.7 },
    scale: 'epic',
    symbols: ['wings', 'chains_break'],
    figure: { presence: 'lone', role: 'leaping_figure', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'war_battle',
    patterns: [/\bwar\b|\bbattle\b|\bfight(ing)?\b|\bsoldier\b|\bblood\b|\benemy\b|\bvictory\b|\bdefeat\b/i],
    imagery: ['battlefield under red sky', 'banner torn in wind', 'lone figure among wreckage'],
    presets: ['apocalyptic_warzone', 'burning_desert', 'ancient_ruins', 'storm', 'red_void'],
    mood: { aggression: 0.85, tension: 0.7, darkness: 0.6 },
    scale: 'epic',
    symbols: ['banner', 'wreckage'],
    figure: { presence: 'lone', role: 'survivor', suggestsCharacter: true },
    frameOwnership: 'either'
  },
  {
    id: 'dream_surreal',
    patterns: [/\bdream(ing|s)?\b|\bsleep\b|\bwake\b|\bnightmare\b|\billusion\b|\bfantasy\b/i],
    imagery: ['floating rooms in cloudscape', 'clocks melting over stairs', 'door opening onto ocean sky'],
    presets: ['dream_clouds', 'endless_staircase', 'white_void'],
    mood: { valence: 0.1, arousal: 0.4, darkness: 0.35 },
    scale: 'surreal',
    symbols: ['floating_room', 'door'],
    figure: { presence: 'none', suggestsCharacter: false },
    frameOwnership: 'instrument'
  },
  {
    id: 'snow_cold',
    patterns: [/\bsnow\b|\bwinter\b|\bice\b|\bfrozen\b|\bcold\b|\bfrost\b/i],
    imagery: ['footprints filling with snow', 'ice crystal cathedral', 'breath fog in blue twilight'],
    presets: ['snow', 'white_void', 'forest'],
    mood: { darkness: 0.35, valence: -0.15, hope: 0.4 },
    scale: 'cinematic',
    symbols: ['snowflake', 'breath'],
    figure: { presence: 'silhouette', role: 'winter_walker', suggestsCharacter: true },
    frameOwnership: 'instrument'
  },
  {
    id: 'industrial',
    patterns: [/\bmachine\b|\bfactory\b|\bmetal\b|\bsteel\b|\bgear\b|\bengine\b|\bwire\b/i],
    imagery: ['endless conveyor under sodium lamps', 'sparks cascading in tunnel', 'silhouette against blast furnace'],
    presets: ['industrial_tunnel', 'futuristic_city', 'red_void'],
    mood: { aggression: 0.5, darkness: 0.55, arousal: 0.6 },
    scale: 'cinematic',
    symbols: ['sparks', 'gears'],
    figure: { presence: 'silhouette', role: 'worker', suggestsCharacter: true },
    frameOwnership: 'instrument'
  },
  {
    id: 'hope_light',
    patterns: [/\bhope\b|\blight\b|\bdawn\b|\bsunrise\b|\bmorning\b|\bbright\b|\bshine\b/i],
    imagery: ['first light over dark landscape', 'single window glowing in void', 'figure walking toward sun'],
    presets: ['candy_happy', 'empty_highway', 'white_void', 'dream_clouds', 'ocean'],
    mood: { hope: 0.9, valence: 0.7, darkness: 0.1 },
    scale: 'cinematic',
    symbols: ['dawn', 'beacon'],
    figure: { presence: 'lone', role: 'dawn_walker', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'candy_joy',
    patterns: [/\bcandy\b/i, /\bsweet(est|ness)?\b/i, /\bhappy\b/i, /\bjoy(ful|ous)?\b/i, /\bpastel\b/i, /sugar\s*(rush|high)/i, /smile\s+(like|so)/i],
    imagery: ['pastel candy path under cotton-candy sky', 'playful silhouette skipping mid-path', 'soft neon sweets glowing'],
    presets: ['candy_happy', 'dream_clouds', 'white_void'],
    mood: { hope: 0.85, valence: 0.8, darkness: 0.05 },
    scale: 'intimate',
    symbols: ['candy', 'smile'],
    figure: { presence: 'lone', role: 'joyful_walker', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'autumn_leaves',
    patterns: [/\bautumn\b/i, /\bfall\s+leaves\b/i, /leaves?\s+(fall|falling|turning)/i, /\bharvest\b/i, /october\s+sky/i, /amber\s+(light|sky)/i, /golden\s+hour/i],
    imagery: ['amber leaf path under warm sky', 'tree silhouettes in foreground', 'walker through falling leaves'],
    presets: ['cozy_autumn', 'forest', 'snow', 'empty_highway'],
    mood: { valence: 0.25, hope: 0.45, darkness: 0.25 },
    scale: 'cinematic',
    symbols: ['leaf', 'amber'],
    figure: { presence: 'lone', role: 'leaf_walker', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'rage',
    patterns: [/\brage\b|\banger\b|\bhate\b|\bfury\b|\bscream\b|\bdestroy\b|\bruin\b/i],
    imagery: ['red void pulse', 'walls cracking outward', 'scream visualized as shockwave'],
    presets: ['apocalyptic_warzone', 'red_void', 'storm', 'industrial_tunnel'],
    mood: { aggression: 0.95, tension: 0.9, darkness: 0.7 },
    scale: 'epic',
    symbols: ['shockwave', 'crack'],
    figure: { presence: 'self', role: 'screamer', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'home_leaving',
    patterns: [/leaving\s+home/i, /never\s+going\s+back/i, /packed\s+(my\s+)?bags/i, /last\s+train/i, /front\s+door\s+(closes|shut)/i, /hometown/i, /out\s+of\s+this\s+town/i],
    imagery: ['suitcase at a closing doorway', 'train window blurring a hometown skyline', 'porch light shrinking in the rearview'],
    presets: ['empty_highway', 'rainy_city', 'industrial_tunnel'],
    mood: { valence: -0.1, hope: 0.45, darkness: 0.35 },
    scale: 'cinematic',
    symbols: ['doorway', 'rearview'],
    figure: { presence: 'silhouette', role: 'leaver', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'silence_void',
    patterns: [/\bsilence\b/i, /can'?t\s+hear\s+(you|a\s+sound)/i, /quiet\s+(too\s+loud|rooms?)/i, /words?\s+(fail|won'?t\s+come)/i, /nothing\s+left\s+to\s+say/i],
    imagery: ['soundless white expanse', 'mouth open with no voice visible', 'muted city behind thick glass'],
    presets: ['white_void', 'endless_staircase', 'snow'],
    mood: { darkness: 0.4, valence: -0.3, tension: 0.5 },
    scale: 'intimate',
    symbols: ['mute', 'thick_glass'],
    figure: { presence: 'self', role: 'muted_speaker', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },

  {
    id: 'lone_walker',
    patterns: [/i\s+walk\s+alone/i, /\bstranger\b/i, /someone\s+(waiting|watching|there)/i, /walk(ing)?\s+(alone|by\s+myself)/i, /lonely\s+(road|path|street)/i, /no\s+one\s+beside\s+me/i, /on\s+my\s+own\b/i],
    imagery: ['lone silhouette walking a vanishing road', 'stranger waiting under a single lamp', 'footsteps echoing in an empty corridor'],
    presets: ['empty_highway', 'rainy_city', 'white_void', 'endless_staircase'],
    mood: { valence: -0.4, darkness: 0.5, hope: 0.3 },
    scale: 'human',
    symbols: ['lone_silhouette', 'single_lamp'],
    figure: { presence: 'lone', role: 'walker', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'crowd_sea',
    patterns: [/\beveryone\b/i, /they\s+all\b/i, /faces?\s+in\s+the\s+crowd/i, /\bcrowd\b/i, /all\s+around\s+me/i, /sea\s+of\s+(faces|people|bodies)/i, /lost\s+in\s+(the\s+)?crowd/i, /people\s+everywhere/i],
    imagery: ['sea of anonymous faces under neon', 'body carried by a crowd current', 'one face sharp among a blurred multitude'],
    presets: ['rainy_city', 'futuristic_city', 'industrial_tunnel', 'red_void'],
    mood: { arousal: 0.55, tension: 0.45, darkness: 0.4 },
    scale: 'cinematic',
    symbols: ['crowd_faces', 'blurred_multitude'],
    figure: { presence: 'crowd', role: 'among_many', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },


  {
    id: 'meadow_fauna',
    patterns: [/\bmeadow\b/i, /\bgarden\b/i, /\broses?\b/i, /\bbloom(ing|ed)?\b/i, /\banimals?\b/i, /\bdeer\b/i, /\bherd\b/i, /\bpasture\b/i],
    imagery: ['soft meadow hills with a distant herd', 'deer crossing a grass path', 'birds over warm green fields'],
    presets: ['meadow_fauna'],
    mood: { hope: 0.65, darkness: 0.12, valence: 0.5 },
    scale: 'cinematic',
    symbols: ['meadow', 'fauna', 'garden'],
    figure: { presence: 'lone', role: 'meadow_walker', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'misty_lake',
    patterns: [/\blake\b/i, /\bmist(y)?\b/i, /\bfog\b/i, /\bshore\b/i, /quiet\s+water/i],
    imagery: ['quiet lake behind a veil of mist', 'shoreline dissolving into pale water', 'soft ripples under a grey sky'],
    presets: ['misty_lake'],
    mood: { hope: 0.35, darkness: 0.3, valence: 0.1 },
    scale: 'intimate',
    symbols: ['lake', 'mist'],
    figure: { presence: 'lone', role: 'shore_stander', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'dark_sparse',
    patterns: [/\bsparse\b/i, /\bhorror\b/i, /\balone\b/i, /isolation/i, /dark\s+(and\s+)?empty/i],
    imagery: ['a lone figure on an empty dark line', 'almost nothing beneath a black sky', 'one distant mark in a silent field'],
    presets: ['dark_sparse'],
    mood: { darkness: 0.85, tension: 0.55, hope: 0.05 },
    scale: 'intimate',
    symbols: ['isolation', 'darkness'],
    figure: { presence: 'lone', role: 'isolated_stander', suggestsCharacter: true },
    frameOwnership: 'lyric'
  },
  {
    id: 'reality_fracture',
    patterns: [/\bfracture\b/i, /\bshatter/i, /\bglitch/i, /\bcrack(ed|ing)?\b/i, /\bsplinter/i],
    imagery: ['reality splitting into offset shards', 'geometric cracks flashing through a scene', 'a figure walking across broken planes'],
    presets: ['reality_fracture'],
    mood: { tension: 0.8, aggression: 0.55, darkness: 0.55 },
    scale: 'cinematic',
    symbols: ['fracture', 'glitch'],
    figure: { presence: 'silhouette', role: 'unstable_walker', suggestsCharacter: true },
    frameOwnership: 'either'
  },
  {
    id: 'spoken_word_bed',
    patterns: [/\bspoken\b/i, /\bpoem?\b/i, /\bpoetry\b/i, /\bnarrat(e|ion|ive)\b/i, /\bmonologue\b/i, /\brecited\b/i],
    imagery: ['warm white space with clear words', 'an intimate figure before a quiet horizon', 'large translucent panels holding a poem'],
    presets: ['spoken_word_bed'],
    mood: { hope: 0.35, darkness: 0.2, tension: 0.15 },
    scale: 'intimate',
    symbols: ['voice', 'horizon'],
    figure: { presence: 'lone', role: 'intimate_stander', suggestsCharacter: true },
    frameOwnership: 'lyric'
  }

];

/**
 * Motif words → scenic prop nominations + world cues (glue INTO the picture).
 * Prop ids match js/director/motifProps.js CONCEPT_PROPS / SYMBOL_PROPS.
 * glueScore: lyric-owned motifs plant hard; instrument-owned stay soft so they
 * do not fight a planted world (Scene Director blends via this weight).
 */
export const SCENIC_HANDOFF = {
  carrying_weight:   { props: ['cracked_stone', 'shadow_burden'], worldCue: { family: 'warzone', presets: ['industrial_tunnel', 'ancient_ruins', 'rainy_city'] }, glueScore: 0.82 },
  running_from_self: { props: ['mirror_shard', 'doppel_trail'], worldCue: { family: 'chaos', presets: ['endless_staircase', 'white_void', 'futuristic_city'] }, glueScore: 0.82 },
  falling_apart:     { props: ['fissure', 'ashes', 'ash_aftermath'], worldCue: { family: 'warzone', presets: ['ancient_ruins', 'storm', 'red_void'] }, glueScore: 0.55 },
  rising_fire:       { props: ['crown_of_fire', 'ashes'], worldCue: { family: 'warzone', presets: ['burning_desert', 'storm', 'red_void'] }, glueScore: 0.55 },
  ocean_depth:       { props: ['lighthouse_beam', 'wave_crest'], worldCue: { family: 'nature', presets: ['ocean', 'storm', 'dream_clouds'] }, glueScore: 0.55 },
  lonely_road:       { props: ['highway_lines', 'lantern'], worldCue: { family: 'neon', presets: ['empty_highway', 'rainy_city', 'burning_desert'] }, glueScore: 0.82 },
  night_drive:       { props: ['highway_lines', 'headlights_glow'], worldCue: { family: 'neon', presets: ['neon_highway', 'empty_highway', 'rainy_city'] }, glueScore: 0.82 },
  city_night:        { props: ['neon_sign', 'umbrella'], worldCue: { family: 'neon', presets: ['rainy_city', 'neon_highway', 'futuristic_city'] }, glueScore: 0.35 },
  rain_emotion:      { props: ['umbrella', 'rain_to_stars'], worldCue: { family: 'neon', presets: ['rainy_city', 'storm', 'empty_highway'] }, glueScore: 0.82 },
  sacred_space:      { props: ['cathedral_window', 'prayer_beads'], worldCue: { family: 'sacred', presets: ['cathedral_space', 'white_void', 'space'] }, glueScore: 0.35 },
  storm_chaos:       { props: ['tear_in_sky', 'lightning_vein', 'scrap_turret'], worldCue: { family: 'chaos', presets: ['storm', 'ocean', 'reality_fracture'] }, glueScore: 0.35 },
  forest_lost:       { props: ['lantern', 'mist_veil'], worldCue: { family: 'nature', presets: ['forest', 'snow', 'dream_clouds'] }, glueScore: 0.35 },
  space_void:        { props: ['tear_in_sky', 'rain_to_stars'], worldCue: { family: 'sacred', presets: ['space', 'dream_clouds', 'white_void'] }, glueScore: 0.35 },
  heartbreak:        { props: ['cracked_heart', 'tear_in_sky'], worldCue: { family: 'neon', presets: ['rainy_city', 'white_void', 'empty_highway'] }, glueScore: 0.82 },
  love_warmth:       { props: ['warm_window', 'lantern'], worldCue: { family: 'candy', presets: ['candy_happy', 'dream_clouds', 'rainy_city'] }, glueScore: 0.82 },
  loneliness:        { props: ['empty_chair', 'lantern'], worldCue: { family: 'spoken', presets: ['white_void', 'empty_highway', 'spoken_word_bed'] }, glueScore: 0.82 },
  nostalgia:         { props: ['faded_photo', 'lantern'], worldCue: { family: 'nature', presets: ['cozy_autumn', 'dream_clouds', 'empty_highway'] }, glueScore: 0.82 },
  betrayal:          { props: ['mask', 'knife_shadow', 'handgun_beat'], worldCue: { family: 'warzone', presets: ['red_void', 'industrial_tunnel', 'endless_staircase'] }, glueScore: 0.82 },
  rebirth:           { props: ['ashes', 'phoenix_feather', 'crown_of_fire'], worldCue: { family: 'warzone', presets: ['burning_desert', 'dream_clouds', 'empty_highway'] }, glueScore: 0.82 },
  time_clocks:       { props: ['melting_clock', 'hourglass'], worldCue: { family: 'chaos', presets: ['endless_staircase', 'white_void', 'dream_clouds'] }, glueScore: 0.55 },
  gold_emptiness:    { props: ['hollow_crown', 'empty_throne'], worldCue: { family: 'sacred', presets: ['ancient_ruins', 'white_void', 'cathedral_space'] }, glueScore: 0.82 },
  death_void:        { props: ['ashes', 'doorway'], worldCue: { family: 'scary', presets: ['dark_sparse', 'white_void', 'red_void'] }, glueScore: 0.82 },
  freedom_flight:    { props: ['broken_chains', 'wings'], worldCue: { family: 'nature', presets: ['dream_clouds', 'space', 'empty_highway'] }, glueScore: 0.82 },
  war_battle:        { props: ['torn_banner', 'ashes', 'rifle_silhouette', 'scrap_turret'], worldCue: { family: 'warzone', presets: ['apocalyptic_warzone', 'burning_desert', 'ancient_ruins'] }, glueScore: 0.55 },
  dream_surreal:     { props: ['floating_door', 'rain_to_stars'], worldCue: { family: 'nature', presets: ['dream_clouds', 'endless_staircase', 'white_void'] }, glueScore: 0.35 },
  snow_cold:         { props: ['breath_fog', 'lantern'], worldCue: { family: 'nature', presets: ['snow', 'white_void', 'forest'] }, glueScore: 0.35 },
  industrial:        { props: ['sparks', 'gear_silhouette'], worldCue: { family: 'warzone', presets: ['industrial_tunnel', 'futuristic_city', 'red_void'] }, glueScore: 0.35 },
  hope_light:        { props: ['beacon', 'lantern'], worldCue: { family: 'nature', presets: ['candy_happy', 'empty_highway', 'meadow_fauna'] }, glueScore: 0.82 },
  candy_joy:         { props: ['warm_window', 'lantern', 'beacon'], worldCue: { family: 'candy', presets: ['candy_happy', 'dream_clouds', 'white_void'] }, glueScore: 0.82 },
  autumn_leaves:     { props: ['faded_photo', 'lantern'], worldCue: { family: 'autumn', presets: ['cozy_autumn', 'forest', 'empty_highway'] }, glueScore: 0.82 },
  rage:              { props: ['shockwave', 'tear_in_sky', 'handgun_beat', 'riot_baton'], worldCue: { family: 'warzone', presets: ['apocalyptic_warzone', 'red_void', 'storm'] }, glueScore: 0.82 },
  home_leaving:      { props: ['doorway', 'rearview_glow'], worldCue: { family: 'autumn', presets: ['empty_highway', 'rainy_city', 'cozy_autumn'] }, glueScore: 0.82 },
  silence_void:      { props: ['thick_glass', 'mute_halo'], worldCue: { family: 'spoken', presets: ['white_void', 'spoken_word_bed', 'snow'] }, glueScore: 0.82 },
  lone_walker:       { props: ['highway_lines', 'lantern'], worldCue: { family: 'neon', presets: ['empty_highway', 'rainy_city', 'white_void'] }, glueScore: 0.82 },
  crowd_sea:         { props: ['neon_sign', 'umbrella'], worldCue: { family: 'neon', presets: ['rainy_city', 'futuristic_city', 'industrial_tunnel'] }, glueScore: 0.82 },
  meadow_fauna:      { props: ['lantern', 'breath_fog'], worldCue: { family: 'nature', presets: ['meadow_fauna', 'forest', 'cozy_autumn'] }, glueScore: 0.82 },
  misty_lake:        { props: ['lighthouse_beam', 'mist_veil'], worldCue: { family: 'nature', presets: ['misty_lake', 'ocean', 'snow'] }, glueScore: 0.82 },
  dark_sparse:       { props: ['empty_chair', 'lantern'], worldCue: { family: 'scary', presets: ['dark_sparse', 'white_void'] }, glueScore: 0.82 },
  reality_fracture:  { props: ['fissure', 'tear_in_sky', 'shockwave'], worldCue: { family: 'chaos', presets: ['reality_fracture', 'red_void', 'endless_staircase'] }, glueScore: 0.55 },
  spoken_word_bed:   { props: ['thick_glass', 'beacon'], worldCue: { family: 'spoken', presets: ['spoken_word_bed', 'white_void', 'dream_clouds'] }, glueScore: 0.82 }
};

/** Default glue from lyric vs instrument ownership (soft = don't fight planted world). */
export function glueScoreForOwnership(ownership) {
  if (ownership === 'lyric') return 0.82;
  if (ownership === 'instrument') return 0.35;
  return 0.55;
}

/**
 * Resolve scenic props / worldCue / glue for a concept (stable Scene Director contract).
 * @param {object|null} concept
 * @returns {{ props: string[], worldCue: { family: string|null, presets: string[] }, glueScore: number, motif: string[] }}
 */
export function scenicForConcept(concept) {
  if (!concept) {
    return { props: [], worldCue: { family: null, presets: [] }, glueScore: 0, motif: [] };
  }
  const hand = SCENIC_HANDOFF[concept.id] || null;
  const ownership = concept.frameOwnership || 'either';
  const props = (hand?.props || concept.props || []).slice(0, 4);
  const worldCue = hand?.worldCue
    ? { family: hand.worldCue.family || null, presets: (hand.worldCue.presets || []).slice(0, 4) }
    : { family: null, presets: (concept.presets || []).slice(0, 3) };
  const glueScore = typeof hand?.glueScore === 'number'
    ? hand.glueScore
    : (typeof concept.glueScore === 'number' ? concept.glueScore : glueScoreForOwnership(ownership));
  const motif = (concept.symbols || concept.motif || []).slice(0, 3);
  return { props, worldCue, glueScore, motif };
}

/** Attach scenic handoff fields onto a concept payload (mutates copy). */
export function attachScenicFields(concept) {
  if (!concept) return null;
  const s = scenicForConcept(concept);
  return {
    ...concept,
    props: s.props,
    worldCue: s.worldCue,
    glueScore: s.glueScore,
    motif: s.motif
  };
}


const STYLE_MODIFIERS = {
  realistic: { abstract: 0.1, mythic: 0.05 },
  cinematic: { abstract: 0.2, mythic: 0.15 },
  surreal: { abstract: 0.7, mythic: 0.3 },
  dreamlike: { abstract: 0.6, mythic: 0.25 },
  mythological: { abstract: 0.3, mythic: 0.85 },
  'sci-fi': { abstract: 0.35, mythic: 0.1 },
  horror: { abstract: 0.4, mythic: 0.2 },
  abstract: { abstract: 0.95, mythic: 0.1 },
  epic: { abstract: 0.25, mythic: 0.5 }
};

/** Snapshot of concept ids + imagery for Scene Director / tooling */
export function getConcepts() {
  return CONCEPT_GRAPH.map(c => {
    const scenic = scenicForConcept(c);
    return {
      id: c.id,
      imagery: c.imagery.slice(),
      presets: c.presets.slice(),
      mood: { ...c.mood },
      scale: c.scale,
      symbols: c.symbols ? c.symbols.slice() : [],
      figure: c.figure ? { ...c.figure } : null,
      frameOwnership: c.frameOwnership || null,
      props: scenic.props,
      worldCue: scenic.worldCue,
      glueScore: scenic.glueScore,
      motif: scenic.motif
    };
  });
}

/** Scene Director helper — character presence suggested by a concept hit. */
export function figureFromConcept(concept) {
  return concept?.figure || null;
}

/**
 * How hard semantic meaning should steer scenery (0–1).
 * High when Audio Pulse vibe.speechLike / spoken — non-music / spoken word.
 */
export function speechSteerWeight(speechLike = 0) {
  const s = Math.max(0, Math.min(1, Number(speechLike) || 0));
  if (s < 0.2) return 0;
  // Ease-in so mild vocalish doesn't dominate groove tracks
  return Math.max(0, Math.min(1, (s - 0.2) / 0.8));
}



export class SemanticExtractor {
  constructor() {
    this.graph = CONCEPT_GRAPH;
  }

  /**
   * Extract visual concepts from phrases + optional user fantasy text.
   * @param {Array<{text:string}>} phrases
   * @param {string} [fantasyText]
   * @param {string[]} [styles]
   */
  extract(phrases, fantasyText = '', styles = ['cinematic', 'dreamlike']) {
    const hits = [];
    const allText = [
      ...(phrases || []).map(p => p.text),
      fantasyText || ''
    ].join('\n');

    for (const concept of this.graph) {
      let score = 0;
      const matched = [];
      for (const pat of concept.patterns) {
        const m = allText.match(pat);
        if (m) {
          score += 1;
          matched.push(m[0]);
        }
      }
      if (score > 0) {
        hits.push(attachScenicFields({
          ...concept,
          score,
          matched,
          imageryPick: concept.imagery[Math.floor(Math.random() * concept.imagery.length)]
        }));
      }
    }

    const fantasyBoosts = this._fantasyBoosts(fantasyText);
    hits.sort((a, b) => b.score - a.score);

    const styleMod = this._mergeStyles(styles);
    return {
      concepts: hits.slice(0, 8),
      primary: hits[0] || null,
      fantasyBoosts,
      styleMod,
      motifCandidates: this._pickMotifs(hits, fantasyBoosts)
    };
  }

  _fantasyBoosts(text) {
    if (!text || !text.trim()) return [];
    const t = text.toLowerCase();
    const boosts = [];
    const map = [
      [/war|battle|ruin(ed)?|wreckage|soldier|battlefield/, 'apocalyptic_warzone'],
      [/meadow|garden|rose|bloom|animal|deer|herd|pasture|wildlife/, 'meadow_fauna'],
      [/lake|mist(y)?|fog|shore|quiet\s+water/, 'misty_lake'],
      [/sparse|horror|alone|isolation|dark\s+and\s+empty/, 'dark_sparse'],
      [/fracture|shatter|glitch|crack(ed|ing)?|splinter/, 'reality_fracture'],
      [/spoken|poem|poetry|narrat(e|ion|ive)|monologue|recited/, 'spoken_word_bed'],
      [/candy|sweet|happy|joy(ful)?|pastel|sugar/, 'candy_happy'],
      [/neon\s*highway|night\s*highway|neon\s*road/, 'neon_highway'],
      [/autumn|fall\s*leaves|harvest|october|amber\s*sky/, 'cozy_autumn'],
      [/rain|city|alley/, 'rainy_city'],
      [/neon(?!\s*highway)|streetlight/, 'rainy_city'],
      [/highway|road|drive|car/, 'empty_highway'],
      [/desert|sand|dune|sun\s*burn/, 'burning_desert'],
      [/temple|ancient|stone/, 'ancient_ruins'],
      [/church|cathedral|chapel|stained/, 'cathedral_space'],
      [/space|star|planet|galaxy|nebula/, 'space'],
      [/storm|thunder|lightning/, 'storm'],
      [/ocean|sea|wave|underwater/, 'ocean'],
      [/forest|tree|woods/, 'forest'],
      [/snow|winter|ice/, 'snow'],
      [/future|cyber|neon tower/, 'futuristic_city'],
      [/cloud|dream|float|sky palace/, 'dream_clouds'],
      [/stair|endless|loop|maze/, 'endless_staircase'],
      [/tunnel|industrial|factory|warehouse/, 'industrial_tunnel'],
      [/white\s*(void|room|space)|blank/, 'white_void'],
      [/red\s*(void|room|rage)/, 'red_void'],
      [/meadow|fauna|deer|herd|pasture|grassland/, 'meadow_fauna'],
      [/misty\s*lake|lake|pond|misty/, 'misty_lake'],
      [/sparse|isolation|alone\s+in\s+the\s+dark|horror\s*void/, 'dark_sparse'],
      [/fracture|shatter|glitch\s*world|reality\s*crack/, 'reality_fracture'],
      [/spoken\s*word|poem|narrat|intimate\s*speech/, 'spoken_word_bed']
    ];
    for (const [re, preset] of map) {
      if (re.test(t)) boosts.push(preset);
    }
    return [...new Set(boosts)];
  }

  _mergeStyles(styles) {
    const out = { abstract: 0.25, mythic: 0.15 };
    if (!styles || !styles.length) return out;
    let n = 0;
    for (const s of styles) {
      const key = String(s).toLowerCase();
      const m = STYLE_MODIFIERS[key];
      if (m) {
        out.abstract += m.abstract;
        out.mythic += m.mythic;
        n++;
      }
    }
    if (n) {
      out.abstract /= n + 1;
      out.mythic /= n + 1;
    }
    return out;
  }

  _pickMotifs(hits, fantasyBoosts) {
    const motifs = [];
    for (const h of hits.slice(0, 4)) {
      if (h.symbols) motifs.push(...h.symbols.slice(0, 2));
    }
    if (fantasyBoosts.length) motifs.push('user_world_' + fantasyBoosts[0]);
    return [...new Set(motifs)].slice(0, 4);
  }

  /**
   * Extract concept for a single active lyric line (live direction).
   * Robust for Scene Director steering — returns ranked best match.
   * When speechLike / spoken-word vibe is high, semantic meaning steers harder:
   * lyric-owned concepts win ties, frameOwnership flips to lyric, speechSteer weight rises.
   * @param {string} lineText
   * @param {object} [opts] { speechLike?: number, spoken?: number }
   * @returns {object|null}
   */
  extractLine(lineText, opts = {}) {
    if (!lineText || !String(lineText).trim()) return null;
    const text = String(lineText);
    const speechLike = Math.max(
      0,
      Number(opts?.speechLike) || 0,
      Number(opts?.spoken) || 0
    );
    const speechHard = speechLike >= 0.45;
    let best = null;
    for (const concept of this.graph) {
      let score = 0;
      const matched = [];
      for (const pat of concept.patterns) {
        try {
          const m = text.match(pat);
          if (m) {
            score += 1;
            matched.push(m[0]);
          }
        } catch { /* bad pattern — skip */ }
      }
      if (score <= 0) continue;

      // Spoken word / non-music: prefer lyric-owned + character metaphors
      if (speechHard) {
        if (concept.frameOwnership === 'lyric') score += 1.35;
        else if (concept.frameOwnership === 'either') score += 0.55;
        else if (concept.frameOwnership === 'instrument') score -= 0.35;
        if (concept.figure?.suggestsCharacter) score += 0.75;
        score += speechLike * 0.9;
      }

      const better = !best || score > best.score
        || (score === best.score && speechHard
          && (concept.frameOwnership === 'lyric')
          && best.frameOwnership !== 'lyric');
      if (better) {
        const ownership = speechHard
          ? (concept.frameOwnership === 'instrument' ? 'either' : 'lyric')
          : (concept.frameOwnership || null);
        const scenic = scenicForConcept({ ...concept, frameOwnership: ownership });
        best = {
          id: concept.id,
          imagery: concept.imagery,
          presets: concept.presets,
          mood: concept.mood,
          scale: concept.scale,
          symbols: concept.symbols,
          figure: concept.figure || null,
          frameOwnership: ownership,
          props: scenic.props,
          worldCue: scenic.worldCue,
          glueScore: scenic.glueScore,
          motif: scenic.motif,
          score,
          matched,
          speechSteer: speechSteerWeight(speechLike),
          speechLike,
          imageryPick: concept.imagery[Math.floor(Math.random() * concept.imagery.length)]
        };
      }
    }
    return best;
  }

  /** Map a concept to preferred preset ids */
  presetsForConcept(concept) {
    return concept?.presets || ['white_void'];
  }
}
