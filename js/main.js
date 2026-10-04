/**
 * Light Show — imagined-movie orchestrator.
 * North star: "THIS LOOKS LIKE THE MOVIE I SEE IN MY HEAD WHEN I LISTEN TO THIS SONG."
 *
 * Flow: identify song → fetch lyrics → plan from lyrics → live lyric concepts direct scenery;
 * instruments animate how the world moves.
 */
import { AudioAnalyzer } from './audio/analyzer.js?v=novideo2';
import { VocalEstimate } from './audio/vocalEstimate.js';
import { LyricsParser } from './lyrics/parser.js';
import { SemanticExtractor } from './lyrics/semantic.js';
import { LyricsAlignment } from './lyrics/alignment.js';
import { StructureAnalyzer } from './structure/analyzer.js';
import { EmotionEngine } from './emotion/engine.js';
import { ScenePlanner } from './director/scenePlan.js?v=overlaychips1';
import { Renderer } from './viz/renderer.js?v=novideo2';
import { Controls } from './ui/controls.js?v=overlaychips1';
import { SongIdentity } from './song/identity.js';

class LightShowApp {
  constructor() {
    this.controls = new Controls(document);
    this.canvas = document.getElementById('viz-canvas');
    this.renderer = new Renderer(this.canvas);
    this.audioCtx = null;
    this.analyzer = null;
    this.vocal = new VocalEstimate();
    this.lyricsParser = new LyricsParser();
    this.semantic = new SemanticExtractor();
    this.alignment = new LyricsAlignment();
    this.structure = new StructureAnalyzer();
    this.emotion = new EmotionEngine();
    this.director = new ScenePlanner();
    this.identity = new SongIdentity();

    this.mediaElement = null;
    this._objectUrl = null;
    this.sourceNode = null;
    this.micStream = null;
    this.playing = false;
    this.settings = null;
    this.duration = 0;
    this._clockStart = 0;
    this._lastLyricKey = '';
    this._lyricsResolved = false;
    this._fetching = false;
    this._generating = false;
    this._awaitingGesture = false;

    this._wire();
  }

  _wire() {
    // Snapshot File bytes synchronously on emit (before change-handler clears input).
    // Samsung Chrome can invalidate input.files after value='' while async load runs.
    this.controls.on('source', (s) => {
      if (s?.type === 'file' && s.file) {
        const f = s.file;
        s._stableBytes = f.arrayBuffer()
          .then((ab) => ({ ab, name: f.name || 'audio', mime: f.type || '', lastModified: f.lastModified || Date.now() }))
          .catch(() => null);
      }
      this._onSource(s);
    });
    this.controls.on('generate', (settings) => this._generate(settings));
    // HOLD-stylechips: chip clicks update the running plan, not only the Generate snapshot.
    document.querySelectorAll('[data-style]').forEach((el) => {
      el.addEventListener('click', () => {
        // Setup + show-overlay chips share data-style; dedupe so twins don't double-count.
        const styles = [...new Set(
          [...document.querySelectorAll('[data-style].active')].map(n => n.dataset.style)
        )];
        if (this.settings) this.settings.styles = styles;
        this.director.setStyles(styles);
      });
    });
    this.controls.on('exit', () => this._exitShow());
    this.controls.on('fullscreen', () => this._toggleFullscreen());
    this.controls.on('gesture', () => this._onUserGesture());
    this.controls.on('fetch-lyrics', (ids) => this._fetchLyrics(ids));
    this.controls.on('identity-manual', ({ artist, title }) => {
      this.identity.setManual(artist, title);
      const id = this.identity.get();
      this.controls.setSongIdentity({
        ...id,
        status: id.artist && id.title ? 'Enter artist+title — tap Fetch lyrics' : 'Enter artist+title'
      });
    });
  }

  async _ensureAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyzer = new AudioAnalyzer(this.audioCtx);
    }
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
  }

  async _onSource({ type, file, _stableBytes }) {
    // Resolve stable bytes BEFORE any await that yields to the change-handler clear.
    // (_stableBytes was kicked off synchronously in _wire.)
    let stable = null;
    if (type === 'file' && file) {
      const snap = _stableBytes ? await _stableBytes : null;
      if (snap?.ab) {
        const mime = snap.mime || 'audio/mpeg';
        stable = {
          name: snap.name,
          mime,
          file: new File([snap.ab], snap.name, { type: mime, lastModified: snap.lastModified }),
          blob: new Blob([snap.ab], { type: mime })
        };
      } else if (file) {
        // Fallback if snapshot failed — may still work on desktop
        stable = {
          name: file.name || 'audio',
          mime: file.type || 'audio/mpeg',
          file,
          blob: file
        };
      }
    }

    await this._ensureAudio();
    this._disconnectSource();
    this._lyricsResolved = false;

    if (type === 'mic') {
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
        this.sourceNode = this.audioCtx.createMediaStreamSource(this.micStream);
        this.analyzer.connect(this.sourceNode);
        this.mediaElement = null;
        this.duration = 0;
        this.identity.reset();
        this.controls.setAudioLabel('Microphone live');
        this.controls.setSongIdentity({
          artist: '',
          title: '',
          label: 'Live mic',
          status: 'Enter artist+title'
        });
        this.controls.setStatus('Mic ready — enter artist/title, Fetch lyrics, then Generate');
      } catch (err) {
        this.controls.setStatus('Mic permission denied: ' + err.message, 'error');
      }
      return;
    }

    if (type === 'file' && stable) {
      const url = URL.createObjectURL(stable.blob);
      this._objectUrl = url;
      const audio = new Audio();
      // Do NOT set crossOrigin on blob: URLs — Samsung/Android Chrome can fail
      // MediaElementSource / never fire loadedmetadata when anonymous is set.
      audio.preload = 'auto';
      audio.loop = false;
      audio.playsInline = true;
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      try {
        await new Promise((resolve, reject) => {
          let settled = false;
          const to = setTimeout(() => {
            if (!settled) {
              settled = true;
              reject(new Error('Audio metadata timeout'));
            }
          }, 20000);
          const ok = () => {
            if (settled) return;
            settled = true;
            clearTimeout(to);
            resolve();
          };
          const bad = () => {
            if (settled) return;
            settled = true;
            clearTimeout(to);
            reject(new Error('Could not load audio file'));
          };
          audio.addEventListener('loadedmetadata', ok, { once: true });
          audio.addEventListener('loadeddata', ok, { once: true });
          audio.addEventListener('canplay', ok, { once: true });
          audio.addEventListener('error', bad, { once: true });
          audio.src = url;
          try { audio.load(); } catch { /* some WebViews throw */ }
        });
      } catch (err) {
        try { URL.revokeObjectURL(url); } catch { /* */ }
        this._objectUrl = null;
        console.warn('audio load failed', err);
        this.controls.setStatus('Audio load failed — try another file (mp3/m4a/wav)', 'error');
        this.controls.setSongIdentity({
          artist: '', title: '', label: stable.name,
          status: 'Audio failed — try another file'
        });
        return;
      }
      this.mediaElement = audio;
      this.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      try {
        this.sourceNode = this.audioCtx.createMediaElementSource(audio);
        const out = this.analyzer.connect(this.sourceNode);
        out.connect(this.audioCtx.destination);
      } catch (err) {
        console.warn('createMediaElementSource failed', err);
        this.controls.setStatus('Audio graph failed — reload page and try again', 'error');
        return;
      }
      this.controls.setAudioLabel(`${stable.name} (${this._fmt(this.duration)})`);

      // Identify song from ID3 / filename (use stable File copy)
      this.controls.setSongIdentity({
        artist: '',
        title: '',
        label: stable.name,
        status: 'Identifying…'
      });
      this.controls.setStatus('Identifying…');

      let id;
      try {
        id = await this.identity.identifyFromFile(stable.file);
      } catch (err) {
        console.warn('identifyFromFile failed', err);
        this.identity.reset();
        id = {
          artist: '',
          title: '',
          label: stable.name,
          status: 'needs_manual',
          source: 'none',
          fileName: stable.name
        };
      }

      // Autofetch whenever we have artist OR title (LRCLIB title-only retry works).
      // needs_manual used to block fetch when only one field was filled — that was the P0.
      if (id.artist || id.title) {
        const partial = !(id.artist && id.title);
        this.controls.setSongIdentity({
          ...id,
          label: id.label || stable.name,
          status: partial
            ? 'Fetching lyrics… (add missing artist/title if wrong)'
            : 'Fetching lyrics…'
        });
        await this._fetchLyrics({ artist: id.artist, title: id.title });
      } else {
        this.controls.setSongIdentity({
          ...id,
          label: id.label || stable.name,
          status: "Couldn't ID — enter artist & title, then Fetch"
        });
        this.controls.setStatus(
          "Couldn't identify song — type artist & title below, then Fetch lyrics",
          'warn'
        );
      }

      try {
        const key = 'lightshow_profile_' + stable.name;
        const prev = localStorage.getItem(key);
        if (prev) {
          const p = JSON.parse(prev);
          if (p.lyrics && !this.controls.getLyricsText()) {
            this.controls.setLyricsText(p.lyrics);
            this._lyricsResolved = true;
          }
          if (p.fantasy && !document.getElementById('fantasy-input').value) {
            document.getElementById('fantasy-input').value = p.fantasy;
          }
        }
      } catch { /* ignore */ }
    }
  }

  /**
   * Fetch lyrics from LRCLIB and fill the textarea.
   */
  async _fetchLyrics({ artist, title } = {}) {
    if (this._fetching) return null;
    const a = (artist ?? this.identity.artist ?? '').trim();
    const t = (title ?? this.identity.title ?? '').trim();
    if (!a && !t) {
      this.controls.setSongStatus('Enter artist+title');
      this.controls.setStatus('Need artist and/or title to fetch lyrics', 'warn');
      return null;
    }

    this.identity.setManual(a, t);
    this._fetching = true;
    this.controls.setSongStatus('Fetching lyrics…');
    this.controls.setStatus('Fetching lyrics…');

    try {
      const result = await this.lyricsParser.search(t, a, this.duration || 0);
      if (result && result.raw) {
        this.controls.setLyricsText(result.raw);
        this._lyricsResolved = true;
        // Prefer LRCLIB meta names when better
        if (result.meta?.artistName) this.identity.artist = result.meta.artistName;
        if (result.meta?.trackName) this.identity.title = result.meta.trackName;
        const id = this.identity.get();
        const syncNote = result.synced ? 'synced' : 'plain';
        this.controls.setSongIdentity({
          ...id,
          status: `Lyrics found (${result.lineCount} lines, ${syncNote})`
        });
        this.controls.setStatus(`Lyrics found (${result.lineCount}) — add fantasy, then Generate`);
        return result;
      }
      this._lyricsResolved = false;
      this.controls.setSongStatus('No lyrics');
      this.controls.setStatus('No lyrics found — paste lyrics or check artist/title', 'warn');
      return null;
    } catch (err) {
      this.controls.setSongStatus('No lyrics');
      this.controls.setStatus('Lyrics fetch failed: ' + (err?.message || err), 'error');
      return null;
    } finally {
      this._fetching = false;
    }
  }

  _disconnectSource() {
    try { this.sourceNode?.disconnect(); } catch { /* */ }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.mediaElement) {
      try { this.mediaElement.pause(); } catch { /* */ }
      try { this.mediaElement.removeAttribute('src'); this.mediaElement.load(); } catch { /* */ }
      this.mediaElement = null;
    }
    if (this._objectUrl) {
      try { URL.revokeObjectURL(this._objectUrl); } catch { /* */ }
      this._objectUrl = null;
    }
    this.sourceNode = null;
  }

  async _generate(settings) {
    if (this._generating) return;
    this._generating = true;
    this.settings = settings;
    this.controls.setBusy(true, 'Planning…');
    this.controls.setStatus('Planning…');
    try {
      await this._ensureAudio();

      if (!this.sourceNode && !this.mediaElement) {
        this.controls.setStatus('Select microphone or upload a song first', 'error');
        return;
      }

      // Sync identity from fields
      if (settings.artist || settings.title) {
        this.identity.setManual(settings.artist, settings.title);
      }

      let lyricsText = (settings.lyrics || '').trim();

      // Always prefer fetched/pasted lyrics; if empty try one more LRCLIB fetch
      if (!lyricsText) {
        this.controls.setBusy(true, 'Fetching…');
        this.controls.setStatus('Fetching lyrics…');
        const id = this.identity.get();
        const result = await this._fetchLyrics({
          artist: settings.artist || id.artist,
          title: settings.title || id.title
        });
        lyricsText = (result?.raw || this.controls.getLyricsText() || '').trim();
        settings.lyrics = lyricsText;
      }

      if (!lyricsText) {
        this.controls.setStatus('No lyrics — scenery from fantasy + audio only (paste or fetch for direction)', 'warn');
        this.controls.setSongStatus('No lyrics');
        this.controls.setBusy(true, 'Planning…');
      } else {
        const n = lyricsText.split(/\n/).map(l => l.trim()).filter(Boolean).length;
        this.controls.setSongStatus(`Lyrics found (${n})`);
        this.controls.setBusy(true, 'Planning…');
        this.controls.setStatus('Planning…');
      }

      // Parse lyrics AFTER resolve
      const phrases = this.lyricsParser.parse(lyricsText);
      this.alignment.setPhrases(phrases, this.duration);
      this._lastLyricKey = '';

      const sem = this.semantic.extract(phrases, settings.fantasy || '', settings.styles);

      const bpmGuess = this.analyzer?.bpm || 120;
      const sections = this.structure.analyze(this.duration || 180, this.alignment.getPhrases(), { bpm: bpmGuess });

      this.emotion.setMood(settings.mood);
      if (this.analyzer?.setGenreContext) {
        const id = this.identity.get();
        this.analyzer.setGenreContext({
          genre: id.genre || '',
          fantasy: settings.fantasy || '',
          styles: settings.styles || []
        });
      }

      // HOLD-0338: clear Audio aggression pin + Scene latch on Generate (no Clash→Night Owl bleed)
      try { this.analyzer?.resetHardState?.(); } catch (_) { /* soft */ }
      try { this.director._hardLatchUntil = 0; this.director._hotSince = 0; this.director._packHoldUntil = 0; this.director._lastTrackKey = null; } catch (_) { /* soft */ }

      // Pre-plan only after lyrics resolved
      this.director.prePlan({
        duration: this.duration || 180,
        sections,
        semantic: sem,
        fantasyText: settings.fantasy || '',
        styles: settings.styles,
        intensity: settings.intensity,
        mood: settings.mood
      });

      this.renderer.setLyrics(settings.lyricsOn);
      this.renderer.setCharacters(settings.charactersOn);

      try {
        const label = document.getElementById('audio-label')?.textContent || 'session';
        const name = label.split(' (')[0];
        if (name && name !== 'Microphone live' && name !== 'No audio selected') {
          localStorage.setItem('lightshow_profile_' + name, JSON.stringify({
            lyrics: settings.lyrics,
            fantasy: settings.fantasy,
            mood: settings.mood,
            styles: settings.styles,
            intensity: settings.intensity,
            artist: this.identity.artist,
            title: this.identity.title
          }));
        }
      } catch { /* */ }

      this.controls.showSetup(false);
      this.playing = true;
      this._clockStart = performance.now();
      this._awaitingGesture = false;
      this.controls.clearShowPrompt();

      if (this.mediaElement) {
        try {
          await this.mediaElement.play();
        } catch (e) {
          this._awaitingGesture = true;
          // HOLD-2149: do NOT use #show-prompt (opaque mid-frame card ≈ karaoke plate)
          this.controls.clearShowPrompt();
          this.controls.setStatus('Tap the screen to start playback', 'warn');
        }
      }

      // Avoid stacking rAF loops if somehow re-entered
      this.renderer.stop();
      this.renderer.start((dt, now) => this._frame(dt, now));
      if (!this._awaitingGesture) {
        this.controls.setStatus('');
      }
    } catch (err) {
      console.error('Generate failed', err);
      this.controls.setStatus('Generate failed: ' + (err?.message || err) + ' — try again', 'error');
      this.controls.showSetup(true);
      this.playing = false;
      this._awaitingGesture = false;
      this.controls.clearShowPrompt();
    } finally {
      this._generating = false;
      this.controls.setBusy(false);
    }
  }

  _currentTime() {
    if (this.mediaElement && !this.mediaElement.paused) {
      return this.mediaElement.currentTime;
    }
    return (performance.now() - this._clockStart) / 1000;
  }

  _frame(dt, now) {
    if (!this.playing) return;
    // HOLD-2149: #show-prompt must stay .hidden for entire playback (lyrics on canvas)
    if (!this._awaitingGesture) this.controls.clearShowPrompt();

    const audio = this.analyzer.update(now);
    const vocal = this.vocal.update(audio);
    // Prefer audio.roles (Audio Pulse); instruments is same object / back-compat alias
    const roles = audio.roles || audio.instruments;
    if (roles) {
      const vBoost = Math.max(vocal.intensity || 0, vocal.likelyVocal ? vocal.activity : 0);
      const boosted = Math.min(1, Math.max(roles.lead || 0, vBoost * 0.95));
      roles.lead = boosted;
      // vocalish mirrors lead when defined as accessor; else keep in sync
      if (!Object.getOwnPropertyDescriptor(roles, 'vocalish')?.get) {
        roles.vocalish = boosted;
      }
    }
    audio.vocal = vocal;
    const t = this._currentTime();
    const liveHint = this.structure.liveHint?.(t, audio) || null;

    if (this.mediaElement && this.mediaElement.ended) {
      this._exitShow();
      return;
    }

    const section = this.structure.sectionAt(t);
    const lyricState = this.alignment.update(t, vocal, section);

    // LIVE lyric→scene: on phrase/line advance, extractLine + reactToLyricConcept (props RT)
    if (this.settings?.lyricsOn && lyricState.phrase?.text) {
      const key = lyricState.phraseIndex + '|' + lyricState.phrase.text;
      if (key !== this._lastLyricKey) {
        this._lastLyricKey = key;
        const speechLike = Math.max(
          audio?.vibe?.speechLike || 0,
          audio?.vibe?.spoken || 0
        );
        const lineConcept = this.semantic.extractLine(lyricState.phrase.text, { speechLike });
        if (lineConcept) {
          this.director.reactToLyricConcept(lineConcept, now, {
            section,
            audio,
            speechLike,
            speechSteer: lineConcept.speechSteer || 0,
            glueScore: lineConcept.glueScore,
            worldCue: lineConcept.worldCue || null,
            props: lineConcept.props || null,
            // Explicit line advance id → props/motif refresh (not verse-gated)
            lineChangeId: key,
            phraseIndex: lyricState.phraseIndex
          });
        }
      }
    }

    const planConcepts = this.director.getPlan()?.sectionPlans
      ? this.semantic.extract(
          this.alignment.getPhrases(),
          this.settings?.fantasy || '',
          this.settings?.styles || []
        ).concepts
      : [];

    const emotion = this.emotion.update(audio, section, planConcepts, dt);

    const directive = this.director.tick({
      time: t,
      audio,
      vocal,
      section,
      emotion,
      activePhrase: lyricState.phrase,
      now
    });

    this.renderer.render({
      directive,
      audio,
      emotion,
      phrase: this.settings?.lyricsOn ? lyricState.phrase : null,
      wordIndex: lyricState.wordIndex,
      now
    });

    if (now % 500 < 20) {
      const proofQ = (typeof location !== 'undefined' && location.search) || '';
      const wantProof = /[?&]v=cohere6\b/.test(proofQ)
        || /[?&]debug=hardlock\b/.test(proofQ)
        || /[?&]debug=1\b/.test(proofQ)
        || !!(this.settings?.debugHardlock);
      this.controls.updateHud({
        section: section?.label || section?.type,
        preset: directive.preset,
        concept: directive.liveConceptId,
        scale: directive.scale?.name,
        event: liveHint?.event || '',
        fps: this.renderer.fps,
        // HOLD-0321 proof for GATE / Works Tester
        proof: wantProof,
        hardOnly: !!directive.hardOnly,
        hardLatchMsLeft: directive.hardLatchMsLeft,
        packFamily: directive.packFamily,
        pinArmed: !!directive.pinArmed,
        martialHeat: !!directive.martialHeat,
        martial: !!directive.martial,
        orchestralMartial: !!directive.orchestralMartial,
        forbidPastoral: !!directive.forbidPastoral,
        aggressionLock: !!directive.aggressionLock,
        hardHud: directive.hardHud || null
      });
    }
  }

  async _onUserGesture() {
    if (!this._awaitingGesture) return;
    try {
      if (this.audioCtx?.state === 'suspended') await this.audioCtx.resume();
      if (this.mediaElement) await this.mediaElement.play();
      this._awaitingGesture = false;
      this.controls.clearShowPrompt();
      this.controls.setStatus('');
    } catch (err) {
      this.controls.clearShowPrompt();
      this.controls.setStatus('Playback still blocked — tap again', 'warn');
    }
  }

  _exitShow() {
    this.playing = false;
    this._awaitingGesture = false;
    this._generating = false;
    this.renderer.stop();
    if (this.mediaElement) {
      this.mediaElement.pause();
      this.mediaElement.currentTime = 0;
    }
    this.controls.clearShowPrompt();
    this.controls.setBusy(false);
    this.controls.showSetup(true);
    this.controls.setStatus('Show ended');
  }

  _toggleFullscreen() {
    const el = document.getElementById('show-screen');
    if (!el) return;

    const active = document.fullscreenElement || document.webkitFullscreenElement;
    if (active || el.classList.contains('immersive')) {
      if (active) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (typeof exit === 'function') {
          try { exit.call(document); } catch { /* */ }
        }
      }
      el.classList.remove('immersive');
      document.body.classList.remove('immersive');
      return;
    }

    const tryRequest = (node) => {
      if (!node) return null;
      const req = node.requestFullscreen || node.webkitRequestFullscreen;
      if (typeof req !== 'function') return null;
      try {
        const ret = req.call(node);
        if (ret && typeof ret.then === 'function') return ret;
        return Promise.resolve();
      } catch {
        return Promise.reject(new Error('fullscreen rejected'));
      }
    };

    const immersiveFallback = () => {
      el.classList.add('immersive');
      document.body.classList.add('immersive');
      // HOLD-2149: HUD status only — never #show-prompt dark card over canvas
      this.controls.clearShowPrompt();
      this.controls.setStatus("Rotate for LED feel — fullscreen isn’t available on this phone", 'warn');
      setTimeout(() => {
        if (!this._awaitingGesture) this.controls.setStatus('');
      }, 3000);
    };

    const onOk = () => {
      el.classList.remove('immersive');
      document.body.classList.remove('immersive');
    };

    const p1 = tryRequest(el);
    if (p1) {
      p1.then(onOk).catch(() => {
        const p2 = tryRequest(document.documentElement);
        if (p2) p2.then(onOk).catch(immersiveFallback);
        else immersiveFallback();
      });
      return;
    }

    const p2 = tryRequest(document.documentElement);
    if (p2) p2.then(onOk).catch(immersiveFallback);
    else immersiveFallback();
  }

  _fmt(sec) {
    if (!sec || !isFinite(sec)) return '?:??';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__lightShow = new LightShowApp();
});
