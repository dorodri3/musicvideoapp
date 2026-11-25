/**
 * Camera suite: cozy_dolly lock, intensity chaos, sad edge framing,
 * whip-to-focal, motionMul, no-composition fallback, no-flap lock.
 */
import { CameraSystem } from '../js/camera/system.js?v=cozy1';
import {
  CAMERA_STYLE_PROFILES,
  FALLBACK_PROFILE_ID,
  isKnownStyleLock,
  profileForStyleLock,
  readStyleLock,
} from '../js/camera/styleProfile.js?v=cozy1';
import {
  DEFAULT_CHAOS_CEILING,
  chaosAmount,
  compositionRestOffset,
  intensityDrive,
  readComposition,
} from '../js/camera/composition.js?v=cozy1';

let passed = 0;
let failed = 0;
const failures = [];

function ok(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push({ name, detail });
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function close(a, b, eps = 0.08) {
  return Math.abs(a - b) <= eps;
}

function almostZero(n, eps = 0.08) {
  return Math.abs(n) <= eps;
}

function dir(styleLock, extras = {}) {
  return {
    styleLock,
    stylePending: false,
    ...extras,
  };
}

function audio(over = {}) {
  return {
    energy: 0.2,
    build: 0.1,
    drop: 0,
    silence: false,
    roles: { kick: 0 },
    ...over,
  };
}

function step(cam, n, dt, a, emotion, directive, cast = null) {
  let last = null;
  for (let i = 0; i < n; i++) {
    last = cam.update(dt, a, emotion || {}, 1, null, cast, directive);
  }
  return last;
}

function settle(styleLock, composition, n = 45, a = audio(), mode = 'slow_dolly', cast = null) {
  const cam = new CameraSystem();
  cam.setMode(mode);
  const directive = dir(styleLock, composition != null ? { composition } : {});
  // first frames: clear pending, commit lock
  const t = step(cam, n, 0.016, a, {}, directive, cast);
  return { cam, t, directive };
}

function hitDrop(cam, directive, intensityAudio, cast = null) {
  // Prime prevDrop low, then fire a drop pulse
  step(cam, 8, 0.016, audio({ energy: 0.3, drop: 0.1, roles: { kick: 0 } }), {}, directive, cast);
  return cam.update(
    0.016,
    audio({ energy: 0.9, drop: 0.85, roles: { kick: 0.8 }, beat: true }),
    { aggression: 0.4 },
    1,
    { shake: 0.7 },
    cast,
    directive
  );
}

function sadComp(over = {}) {
  return {
    look: 'sad',
    variant: null,
    mode: 'quiet',
    intensity: 0.2,
    focal: 'edge',
    focalU: 0.15,
    focalV: 0.6,
    negativeSpace: 0.7,
    motionMul: 0.2,
    horizonTilt: 0,
    ...over,
  };
}

// ---------------------------------------------------------------------------
console.log('\n== cozy mapping + calm baseline ==');

ok(
  "styleLock 'cozy' is known and maps to cozy_dolly",
  isKnownStyleLock('cozy') && profileForStyleLock('cozy').id === 'cozy_dolly'
);
ok(
  "alias golden_pastoral maps to cozy_dolly",
  profileForStyleLock('golden_pastoral').id === 'cozy_dolly'
);
ok(
  "aliases soul_room / warm / country_road map to cozy_dolly",
  ['soul_room', 'warm', 'country_road', 'intimate', 'country'].every(
    (k) => profileForStyleLock(k).id === 'cozy_dolly'
  )
);
ok(
  'existing mappings still hold (candy, ember, sad, horror, cinematic)',
  profileForStyleLock('candy_pop').id === 'kinetic_tight' &&
    profileForStyleLock('ember_wasteland').id === 'kinetic_tight_heavy' &&
    profileForStyleLock('sad').id === 'intimate_portrait' &&
    profileForStyleLock('horror').id === 'dread_still' &&
    profileForStyleLock('cinematic').id === 'cinematic_dolly'
);
ok(
  'unknown lock still falls back to ethereal_float',
  profileForStyleLock('no_such_style').id === FALLBACK_PROFILE_ID
);

const cozyProf = CAMERA_STYLE_PROFILES.cozy_dolly;
ok(
  'cozy_dolly baseline shake 0 and dutch 0',
  cozyProf.shake.kickScale === 0 &&
    cozyProf.shake.dropScale === 0 &&
    cozyProf.shake.dutchMax === 0 &&
    cozyProf.shake.dutchOnHits === false
);
ok(
  'cozy_dolly is a slow intimate dolly with soft chorus push',
  cozyProf.motion.moveSpeed <= 0.4 &&
    cozyProf.motion.easeRate <= 4 &&
    (cozyProf.lens.chorusPushScale || 0) > 0 &&
    (cozyProf.lens.chorusPullScale || 0) === 0
);

{
  const { cam, t } = settle('cozy', { intensity: 0.15, motionMul: 0.2, mode: 'quiet' }, 50, audio({ energy: 0.15 }));
  ok(
    'cozy commits to cozy_dolly (not pending fallback)',
    cam.isStyleCommitted() &&
      cam.getStyleProfile().id === 'cozy_dolly' &&
      cam.getCommittedStyleLock() === 'cozy',
    `profile=${cam.getStyleProfile().id} lock=${cam.getCommittedStyleLock()}`
  );
  ok(
    'cozy calm baseline: near-zero shake and dutch (low intensity, no kick/drop)',
    almostZero(cam.shakeAmp, 0.4) && almostZero(t.rotation, 0.004),
    `shakeAmp=${cam.shakeAmp.toFixed(4)} rot=${t.rotation.toFixed(5)}`
  );
  const st = cam.getCompositionState();
  ok(
    'cozy low intensity → chaos / kickScale near zero',
    st.chaos < 0.02 && st.kickScale < 0.02,
    `chaos=${st.chaos} kick=${st.kickScale}`
  );
}

{
  // stylePending holds fallback and does not commit
  const cam = new CameraSystem();
  step(cam, 20, 0.016, audio(), {}, { styleLock: 'cozy', stylePending: true });
  ok(
    'stylePending holds fallback and does not commit cozy yet',
    !cam.isStyleCommitted() && cam.getStyleProfile().id === FALLBACK_PROFILE_ID,
    `committed=${cam.isStyleCommitted()} id=${cam.getStyleProfile().id}`
  );
  step(cam, 8, 0.016, audio(), {}, { styleLock: 'cozy', stylePending: false });
  ok(
    'pending clear commits cozy once (not counted as a switch)',
    cam.isStyleCommitted() &&
      cam.getStyleProfile().id === 'cozy_dolly' &&
      cam.getStyleSwitchCount() === 0,
    `switches=${cam.getStyleSwitchCount()} id=${cam.getStyleProfile().id}`
  );
}

console.log('\n== intensity ramp (shake / whip) across cozy, heavy, dread ==');

function measure(styleLock, intensity) {
  const composition = {
    look: styleLock === 'sad' ? 'sad' : styleLock,
    intensity,
    motionMul: 1,
    mode: intensity >= 0.6 ? 'loud' : 'quiet',
    focalU: 0.5,
    focalV: 0.5,
  };
  const { cam, directive } = settle(styleLock, composition, 30, audio({ energy: 0.25 }));
  const after = hitDrop(cam, directive, intensity);
  return {
    shakeAmp: cam.shakeAmp,
    whipX: cam._whipX,
    kickScale: cam.getCompositionState().kickScale,
    dropScale: cam.getCompositionState().dropScale,
    chaos: cam.getCompositionState().chaos,
    drive: cam.getCompositionState().drive,
    rot: after.rotation,
    zoom: after.zoom,
    cam,
  };
}

const profiles = [
  { lock: 'cozy', id: 'cozy_dolly' },
  { lock: 'ember_wasteland', id: 'kinetic_tight_heavy' },
  { lock: 'horror', id: 'dread_still' },
];

const lows = {};
const highs = {};
for (const p of profiles) {
  lows[p.id] = measure(p.lock, 0.18);
  highs[p.id] = measure(p.lock, 0.95);
  ok(
    `${p.id} low intensity (0.18): near-zero shake and whip`,
    lows[p.id].shakeAmp < 0.5 &&
      almostZero(lows[p.id].whipX, 0.4) &&
      lows[p.id].kickScale < 0.05 &&
      lows[p.id].chaos < 0.02,
    `shake=${lows[p.id].shakeAmp.toFixed(3)} whip=${lows[p.id].whipX.toFixed(3)} kick=${lows[p.id].kickScale.toFixed(3)} chaos=${lows[p.id].chaos.toFixed(3)}`
  );
  ok(
    `${p.id} high intensity (0.95): strong shake and whip vs its low`,
    highs[p.id].shakeAmp > 1.2 &&
      Math.abs(highs[p.id].whipX) > 1.5 &&
      highs[p.id].shakeAmp > lows[p.id].shakeAmp * 3 &&
      Math.abs(highs[p.id].whipX) > Math.abs(lows[p.id].whipX) + 1.2,
    `hi shake=${highs[p.id].shakeAmp.toFixed(3)} whip=${highs[p.id].whipX.toFixed(3)} lo shake=${lows[p.id].shakeAmp.toFixed(3)}`
  );
}

ok(
  'dread_still is the most restrained at high intensity (shake + kick + whip < heavy)',
  highs.dread_still.shakeAmp < highs.kinetic_tight_heavy.shakeAmp &&
    highs.dread_still.kickScale < highs.kinetic_tight_heavy.kickScale &&
    Math.abs(highs.dread_still.whipX) < Math.abs(highs.kinetic_tight_heavy.whipX),
  `dread shake=${highs.dread_still.shakeAmp.toFixed(2)} kick=${highs.dread_still.kickScale.toFixed(2)} whip=${highs.dread_still.whipX.toFixed(2)} / heavy shake=${highs.kinetic_tight_heavy.shakeAmp.toFixed(2)} kick=${highs.kinetic_tight_heavy.kickScale.toFixed(2)} whip=${highs.kinetic_tight_heavy.whipX.toFixed(2)}`
);
ok(
  'cozy high intensity is chaotic but below heavy ceiling',
  highs.cozy_dolly.shakeAmp > 1.2 &&
    highs.cozy_dolly.shakeAmp < highs.kinetic_tight_heavy.shakeAmp &&
    highs.cozy_dolly.kickScale < highs.kinetic_tight_heavy.kickScale,
  `cozy hi shake=${highs.cozy_dolly.shakeAmp.toFixed(2)} kick=${highs.cozy_dolly.kickScale.toFixed(2)}`
);
ok(
  'ceilings: dread < cozy < heavy',
  DEFAULT_CHAOS_CEILING.dread_still < DEFAULT_CHAOS_CEILING.cozy_dolly &&
    DEFAULT_CHAOS_CEILING.cozy_dolly < DEFAULT_CHAOS_CEILING.kinetic_tight_heavy
);

// Fast push-in: high intensity zoom advances faster/farther than low on a peak
{
  function peakZoom(lock, intensity, frames) {
    const composition = { intensity, motionMul: 1, mode: 'loud', focalU: 0.5, focalV: 0.5 };
    const cam = new CameraSystem();
    cam.setMode('push');
    const directive = dir(lock, { composition });
    // settle quietly
    step(cam, 20, 0.016, audio({ energy: 0.2, drop: 0, build: 0.1 }), {}, directive);
    const z0 = cam.zoom;
    step(
      cam,
      frames,
      0.016,
      audio({ energy: 0.9, drop: 0.7, build: 0.8 }),
      {},
      directive
    );
    return cam.zoom - z0;
  }
  const lo = peakZoom('ember_wasteland', 0.18, 18);
  const hi = peakZoom('ember_wasteland', 0.95, 18);
  ok(
    'fast push-ins scale with intensity (high peak zoom delta > low)',
    hi > lo * 1.4 && hi > 0.015,
    `loΔz=${lo.toFixed(4)} hiΔz=${hi.toFixed(4)}`
  );
}

console.log('\n== whip-pans return to one readable focal ==');

{
  // Center-ish composition: whip then settle back to ~rest (0)
  const composition = {
    intensity: 0.95,
    motionMul: 1,
    mode: 'loud',
    focalU: 0.5,
    focalV: 0.5,
  };
  const { cam, directive } = settle('ember_wasteland', composition, 25);
  hitDrop(cam, directive, 0.95);
  const peakWhip = cam._whipX;
  ok('high-intensity heavy whip actually fires', Math.abs(peakWhip) > 2, `whipX=${peakWhip}`);
  // Settle through the recrosshair window (~0.55s) plus decay
  step(
    cam,
    90,
    0.016,
    audio({ energy: 0.55, drop: 0.2, roles: { kick: 0.2 } }),
    {},
    directive
  );
  const rest = cam.getCompositionState();
  ok(
    'whip returns to the (center) composition rest, not a leftover excursion',
    almostZero(cam._whipX, 0.35) && close(cam.x, rest.restX, 2.5),
    `whipX=${cam._whipX.toFixed(3)} x=${cam.x.toFixed(3)} restX=${rest.restX.toFixed(3)}`
  );
}

{
  // Edge composition on cinematic (not sad, so we can still test return-to-focal
  // without the sad "don't whip toward empty" only-more-left rule hiding the return)
  const composition = {
    look: 'cinematic',
    intensity: 0.95,
    motionMul: 0.8,
    mode: 'loud',
    focal: 'thirds',
    focalU: 0.64,
    focalV: 0.6,
  };
  const expected = compositionRestOffset(readComposition({ composition }), 1);
  const { cam, directive } = settle('cinematic', composition, 40, audio(), 'slow_dolly');
  hitDrop(cam, directive, 0.95);
  const midX = cam.x;
  step(cam, 100, 0.016, audio({ energy: 0.4, drop: 0.15 }), {}, directive);
  ok(
    'whip returns to composition focalU/focalV rest (thirds), not empty / not forced center',
    close(cam.x, expected.x, 3.2) &&
      Math.abs(cam.x) > 1.2 &&
      almostZero(cam._whipX, 0.4),
    `x=${cam.x.toFixed(3)} rest=${expected.x.toFixed(3)} midX=${midX.toFixed(3)} whip=${cam._whipX.toFixed(3)}`
  );
  // Should not have flown into the empty (left) side past center
  ok(
    'whip never settled into the empty-space side (left of center for thirds)',
    cam.x > 0,
    `x=${cam.x.toFixed(3)}`
  );
}

console.log('\n== sad edge framing holds off-center, including high intensity ==');

{
  const composition = sadComp({ intensity: 0.2, mode: 'quiet', horizonTilt: 0 });
  const expected = compositionRestOffset(readComposition({ composition }), 1);
  const { cam, t } = settle('sad', composition, 55, audio({ energy: 0.2 }), 'drift', {
    kind: 'figure_lone',
    action: 'idle',
    placement: 'mid',
    count: 1,
  });
  const xs = [];
  for (let i = 0; i < 40; i++) {
    const tr = cam.update(
      0.016,
      audio({ energy: 0.2 }),
      { sadness: 0.7 },
      1,
      null,
      { kind: 'figure_lone', placement: 'mid', count: 1 },
      dir('sad', { composition })
    );
    xs.push(tr.x);
  }
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  ok(
    'sad+composition frames the figure off-center at the edge (left, focalU 0.15)',
    mean < -5 && close(mean, expected.x, 4),
    `meanX=${mean.toFixed(3)} restX=${expected.x.toFixed(3)}`
  );
  ok(
    'quiet sad has no tilt',
    almostZero(cam.rotation, 0.004),
    `rot=${cam.rotation.toFixed(5)}`
  );
}

{
  const composition = sadComp({
    intensity: 0.95,
    mode: 'loud',
    horizonTilt: 4,
    motionMul: 0.7,
  });
  const expected = compositionRestOffset(readComposition({ composition }), 1);
  const { cam, directive } = settle(
    'sad',
    composition,
    40,
    audio({ energy: 0.85 }),
    'drift',
    { kind: 'figure_lone', placement: 'mid', count: 1 }
  );
  // Fire chaos (whip + shake) and sample x over many frames — must stay off-center
  hitDrop(cam, directive, 0.95);
  const xs = [];
  const rots = [];
  for (let i = 0; i < 80; i++) {
    const tr = cam.update(
      0.016,
      audio({ energy: 0.85, drop: i < 3 ? 0.8 : 0.3, roles: { kick: 0.7 } }),
      { sadness: 0.6 },
      1,
      { shake: 0.6 },
      { kind: 'figure_lone', placement: 'mid', count: 1 },
      dir('sad', { composition })
    );
    xs.push(tr.x);
    rots.push(tr.rotation);
  }
  const maxX = Math.max(...xs);
  const minX = Math.min(...xs);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  ok(
    'sad stays off-center under high intensity (no recenter, empty space preserved)',
    mean < -5 && maxX < -2.5 && minX < expected.x + 2,
    `mean=${mean.toFixed(3)} maxX=${maxX.toFixed(3)} minX=${minX.toFixed(3)} rest=${expected.x.toFixed(3)}`
  );
  const maxAbsRot = Math.max(...rots.map((r) => Math.abs(r)));
  ok(
    'loud sad applies composition tilt as roll',
    maxAbsRot > 0.02,
    `max|rot|=${maxAbsRot.toFixed(5)} (want ~4deg=0.07)`
  );
}

{
  // Reaction must not recenter sad figure
  const composition = sadComp({ intensity: 0.9, mode: 'loud', horizonTilt: 4 });
  const expected = compositionRestOffset(readComposition({ composition }), 1);
  const cam = new CameraSystem();
  cam.setMode('drift');
  const reaction = {
    verb: 'look',
    target: 'empty_bench',
    gazeU: 0.7,
    gazeV: 0.55,
    strength: 0.9,
    since: 1.2,
    until: 4,
    why: 'world',
    locomotion: 'still',
  };
  const directive = dir('sad', { composition, reaction });
  const xs = [];
  for (let i = 0; i < 70; i++) {
    const tr = cam.update(
      0.016,
      audio({ energy: 0.7 }),
      {},
      1,
      null,
      { kind: 'figure_lone', placement: 'mid', count: 1 },
      directive
    );
    xs.push(tr.x);
  }
  const maxX = Math.max(...xs);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  ok(
    'sad reaction beat does not recenter the figure (stays at edge)',
    mean < -5 && maxX < -2,
    `mean=${mean.toFixed(3)} maxX=${maxX.toFixed(3)} rest=${expected.x.toFixed(3)} phase=${cam.getReactionState().phase}`
  );
}

console.log('\n== motionMul + no-composition fallback ==');

{
  function travelAmp(motionMul) {
    const composition = {
      intensity: 0.5,
      motionMul,
      mode: 'quiet',
      focalU: 0.5,
      focalV: 0.5,
    };
    const cam = new CameraSystem();
    cam.setMode('dolly');
    const directive = dir('cinematic', { composition });
    const ys = [];
    for (let i = 0; i < 180; i++) {
      const tr = cam.update(0.016, audio({ energy: 0.35 }), {}, 1, null, null, directive);
      ys.push(tr.y);
    }
    return Math.max(...ys.map(Math.abs));
  }
  const small = travelAmp(0.2);
  const large = travelAmp(1.4);
  ok(
    'motionMul scales travel amplitude (0.2 << 1.4)',
    large > small * 2 && large > 0.4,
    `amp@0.2=${small.toFixed(3)} amp@1.4=${large.toFixed(3)}`
  );
}

{
  // No composition: heavy still has full kick shake on a drop (unchanged fallback)
  const cam = new CameraSystem();
  const directive = dir('ember_wasteland'); // no composition
  step(cam, 25, 0.016, audio({ energy: 0.3, drop: 0.1 }), {}, directive);
  hitDrop(cam, directive, null);
  ok(
    'no-composition fallback: heavy still delivers full kick/drop shake',
    cam.shakeAmp > 5 && cam.getStyleProfile().id === 'kinetic_tight_heavy' && !cam.getCompositionState().hasComp,
    `shakeAmp=${cam.shakeAmp.toFixed(3)} hasComp=${cam.getCompositionState().hasComp}`
  );
  // cozy without composition stays shake-free even on a drop (baseline 0)
  const cozy = new CameraSystem();
  const dCozy = dir('cozy');
  step(cozy, 25, 0.016, audio({ energy: 0.3, drop: 0.1 }), {}, dCozy);
  hitDrop(cozy, dCozy, null);
  ok(
    'no-composition cozy stays shake-free on a drop (baseline kick/drop 0)',
    cozy.shakeAmp < 0.5 && almostZero(cozy._whipX, 0.2),
    `shakeAmp=${cozy.shakeAmp.toFixed(3)} whip=${cozy._whipX.toFixed(3)}`
  );
}

{
  // composition.variant === 'cozy' is inert: lock sad stays intimate_portrait,
  // and a candy lock does not become cozy_dolly just because variant is cozy
  const cam = new CameraSystem();
  step(
    cam,
    20,
    0.016,
    audio(),
    {},
    dir('candy_pop', { composition: { variant: 'cozy', intensity: 0.2, motionMul: 1 } })
  );
  ok(
    "composition.variant==='cozy' is inert (candy_pop still kinetic_tight)",
    cam.getStyleProfile().id === 'kinetic_tight',
    `id=${cam.getStyleProfile().id}`
  );
}

console.log('\n== style lock: pending hold + no flap (chips removed) ==');

{
  const cam = new CameraSystem();
  // Commit candy
  step(cam, 12, 0.016, audio(), {}, dir('candy_pop'));
  const committed = cam.getCommittedStyleLock();
  const switches0 = cam.getStyleSwitchCount();
  // Rapid oscillation of lock values — shorter than debounce, should not flap
  const locks = ['cozy', 'sad', 'horror', 'cinematic', 'cozy', 'sad', 'candy_pop'];
  for (let i = 0; i < 40; i++) {
    cam.update(0.016, audio(), {}, 1, null, null, dir(locks[i % locks.length]));
  }
  ok(
    'rapid lock oscillation does not flap (switch count stays 0, first lock holds)',
    cam.getStyleSwitchCount() === switches0 &&
      cam.getCommittedStyleLock() === committed &&
      cam.getStyleProfile().id === 'kinetic_tight',
    `switches=${cam.getStyleSwitchCount()} lock=${cam.getCommittedStyleLock()} id=${cam.getStyleProfile().id}`
  );
}

{
  // Drive helper sanity for the report
  ok('intensityDrive(0.18) is ~0 (deadzone)', intensityDrive(0.18) < 0.001);
  ok('intensityDrive(0.95) is ~1', intensityDrive(0.95) > 0.97);
  ok(
    'chaosAmount high: dread < cozy < heavy',
    chaosAmount(0.95, CAMERA_STYLE_PROFILES.dread_still) <
      chaosAmount(0.95, CAMERA_STYLE_PROFILES.cozy_dolly) &&
      chaosAmount(0.95, CAMERA_STYLE_PROFILES.cozy_dolly) <
        chaosAmount(0.95, CAMERA_STYLE_PROFILES.kinetic_tight_heavy)
  );
}

console.log('\n----------------------------------------');
console.log(`Passed: ${passed}   Failed: ${failed}`);
if (failures.length) {
  console.log('Failures:');
  for (const f of failures) console.log(' -', f.name, f.detail || '');
}
process.exit(failed ? 1 : 0);
