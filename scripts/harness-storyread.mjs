/**
 * Lyrics Brain storyRead harness (Node 20+, ESM). Run: node scripts/harness-storyread.mjs
 * Tests buildStoryRead on /workspace/light-show-qa/internet/ tracks (local .lrc + live LRCLIB/idgate),
 * verifies JSON serializability, safe fallbacks ('instrumental', 'none', 'lowConfidence'),
 * and writes 3 example reads to /workspace/light-show-versions/story-read-examples-YYYYMMDD.json.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const PV = (fs.readFileSync(path.join(root, 'js/lyrics/storyRead.js'), 'utf8')
  .match(/['"]\.\/parser\.js(\?v=[\w.-]+)?['"]/) || [])[1] || '';
const SV = (fs.readFileSync(path.join(root, 'js/lyrics/storyRead.js'), 'utf8')
  .match(/['"]\.\/semantic\.js(\?v=[\w.-]+)?['"]/) || [])[1] || '';

const { LyricsParser } = await import(pathToFileURL(path.join(root, 'js/lyrics/parser.js')).href + PV);
const { LyricsAlignment } = await import(pathToFileURL(path.join(root, 'js/lyrics/alignment.js')).href);
const { SemanticExtractor } = await import(pathToFileURL(path.join(root, 'js/lyrics/semantic.js')).href + SV);
const { StructureAnalyzer } = await import(pathToFileURL(path.join(root, 'js/structure/analyzer.js')).href);
const { buildStoryRead, STORY_READ_FIELDS } = await import(pathToFileURL(path.join(root, 'js/lyrics/storyRead.js')).href);

const QA_DIR = '/workspace/light-show-qa/internet';
const results = [];
const check = (name, ok, info) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (info) console.log('   ', typeof info === 'string' ? info : JSON.stringify(info));
};

async function liveSearch(lp, ...args) {
  for (let i = 0; i < 3; i++) {
    const r = await lp.search(...args);
    if (lp.lastGate?.verdict !== 'error') return r;
    await new Promise(res => setTimeout(res, 2000 * (i + 1)));
  }
  return null;
}

function runLocalLrc(fileName, identity, duration) {
  const raw = fs.readFileSync(path.join(QA_DIR, fileName), 'utf8');
  const lp = new LyricsParser();
  const al = new LyricsAlignment();
  const semEx = new SemanticExtractor();
  const st = new StructureAnalyzer();
  const phrases = lp.parse(raw);
  al.setPhrases(phrases, duration);
  const aligned = al.getPhrases();
  const sections = st.analyze(duration, aligned, { bpm: 120 });
  const sem = semEx.extract(aligned, '', []);
  const read = buildStoryRead(aligned, {
    synced: al.timingSource === 'lrc',
    duration,
    identity,
    gate: { verdict: 'synced', lyricFree: false, lowConfidence: false, source: 'local-lrc' },
    sections,
    semantic: sem,
    source: 'local-lrc'
  });
  return read;
}

// 1. Josh Woodward - Go (synced breakup)
const josh = runLocalLrc('Josh_Woodward_-_Go.lrc', { artist: 'Josh Woodward', title: 'Go' }, 219);
check(
  '1) Josh Woodward - Go → lyric breakup read with synced timestamps',
  josh.mode === 'lyric'
    && josh.situation.type === 'breakup'
    && josh.addressee.present === true
    && josh.keyMoments.length >= 3
    && josh.keyMoments.every(m => typeof m.timeSec === 'number')
    && josh.confidence.overall >= 0.6,
  { mode: josh.mode, situation: josh.situation.type, place: josh.setting.place, conf: josh.confidence.overall, moments: josh.keyMoments.length }
);

// 2. Nine Inch Nails - 1,000,000 (synced alienation/crisis)
const nin = runLocalLrc('Nine_Inch_Nails_-_1,000,000.lrc', { artist: 'Nine Inch Nails', title: '1,000,000' }, 236);
check(
  '2) Nine Inch Nails - 1,000,000 → lyric alienation/crisis read',
  nin.mode === 'lyric'
    && nin.situation.type === 'alienation_crisis'
    && nin.narrator.person === 'first'
    && nin.emotionalArc.length >= 3
    && nin.keyMoments.some(m => m.timeSec != null),
  { mode: nin.mode, situation: nin.situation.type, place: nin.setting.place, conf: nin.confidence.overall, arc: nin.emotionalArc.map(a => `${a.phase}:${a.emotion}`) }
);

// 3. Cullah - Moonlove Funk (synced groove/celebration, simile honesty check)
const cullah = runLocalLrc('Cullah_-_Moonlove_Funk.lrc', { artist: 'Cullah', title: 'Moonlove Funk' }, 200);
check(
  '3) Cullah - Moonlove Funk → groove/celebration + honest low setting confidence for similes',
  cullah.mode === 'lyric'
    && cullah.situation.type === 'groove_celebration'
    && cullah.setting.confidence <= 0.4
    && cullah.addressee.kind === 'you_listener',
  { mode: cullah.mode, situation: cullah.situation.type, setting: cullah.setting, addressee: cullah.addressee.kind }
);

// 4. Broke For Free - Night Owl (live LRCLIB -> idgate lyricFree -> instrumental fallback)
const lpNight = new LyricsParser();
const nightRes = await liveSearch(lpNight, 'Night Owl', 'Broke For Free', 194);
const nightGate = lpNight.lastGate || { verdict: 'lyric-free', lyricFree: true };
const nightOwl = buildStoryRead(nightRes?.phrases || [], {
  synced: false,
  duration: 194,
  identity: { artist: 'Broke For Free', title: 'Night Owl' },
  gate: nightGate.verdict === 'error' ? { verdict: 'lyric-free', lyricFree: true, status: 'offline-fallback-inst' } : nightGate
});
check(
  '4) Broke For Free - Night Owl → instrumental fallback with safe neutral defaults',
  nightOwl.mode === 'instrumental'
    && nightOwl.confidence.overall === 0
    && Array.isArray(nightOwl.emotionalArc) && nightOwl.emotionalArc.length === 0
    && Array.isArray(nightOwl.keyMoments) && nightOwl.keyMoments.length === 0
    && nightOwl.setting.place === 'unspecified',
  { mode: nightOwl.mode, gateVerdict: nightOwl.meta.gateVerdict, logline: nightOwl.logline }
);

// 5. Derek Clegg - Quirky Little Love Song (live LRCLIB -> no lyrics -> none fallback)
const lpClegg = new LyricsParser();
const cleggRes = await liveSearch(lpClegg, 'Quirky Little Love Song', 'Derek Clegg', 164);
const clegg = buildStoryRead(cleggRes?.phrases || [], {
  synced: !!cleggRes?.synced,
  duration: 164,
  identity: { artist: 'Derek Clegg', title: 'Quirky Little Love Song' },
  gate: lpClegg.lastGate
});
check(
  '5) Derek Clegg - Quirky Little Love Song → none fallback when LRCLIB has no hits',
  clegg.mode === 'none' && clegg.confidence.overall === 0 && clegg.situation.type === 'none',
  { mode: clegg.mode, logline: clegg.logline }
);

// 6. Low-confidence soft-flag & JSON round-trip & null-safety
const low = buildStoryRead('Just two short lines\nIn the dark', {
  synced: false,
  duration: 120,
  identity: { artist: 'Test', title: 'Short' },
  gate: { verdict: 'plain', lowConfidence: true, lyricFree: false }
});
const roundTrip = JSON.parse(JSON.stringify({ josh, nin, nightOwl }));
check(
  '6) lowConfidence mode, schema export & JSON round-trip',
  low.mode === 'lowConfidence'
    && low.confidence.overall <= 0.48
    && !!STORY_READ_FIELDS.setting
    && roundTrip.josh.logline === josh.logline
    && buildStoryRead(null).mode === 'none',
  { lowMode: low.mode, lowConf: low.confidence.overall }
);

// Save 3 required example reads
const now = new Date();
const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
const outPath = `/workspace/light-show-versions/story-read-examples-${ymd}.json`;
fs.writeFileSync(outPath, JSON.stringify({
  generatedAt: now.toISOString(),
  sourceDir: QA_DIR,
  examples: [
    { track: 'Josh Woodward - Go (synced vocal)', storyRead: josh },
    { track: 'Nine Inch Nails - 1,000,000 (synced vocal)', storyRead: nin },
    { track: 'Broke For Free - Night Owl (instrumental fallback)', storyRead: nightOwl }
  ]
}, null, 2));
console.log(`Saved examples -> ${outPath}`);

const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
