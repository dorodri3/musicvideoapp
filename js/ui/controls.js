/**
 * Setup UI / show controls — audio, song identity, lyrics fetch, fantasy, generate.
 */
export class Controls {
  constructor(root = document) {
    this.root = root;
    this.listeners = {};
    this._busy = false;
    this._bind();
  }

  on(event, fn) {
    (this.listeners[event] ||= []).push(fn);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach(fn => fn(data));
  }

  _bind() {
    const $ = (id) => this.root.getElementById(id);

    const micBtn = $('btn-mic');
    const fileInput = $('file-audio');
    if (micBtn) micBtn.addEventListener('click', () => this.emit('source', { type: 'mic' }));
    // Prefer native <label for="file-audio"> on phones (iOS blocks hidden-input .click()).
    // Keep a click fallback if upload control is still a button.
    const uploadBtn = $('btn-upload');
    if (uploadBtn && uploadBtn.tagName === 'BUTTON') {
      uploadBtn.addEventListener('click', () => fileInput?.click());
    }
    if (fileInput) {
      // Samsung/Android may fire `input` or `change` inconsistently — listen to both, debounce.
      let _pickLock = false;
      const onAudioPicked = () => {
        if (_pickLock) return;
        const f = fileInput.files?.[0];
        if (!f) return;
        _pickLock = true;
        setTimeout(() => { _pickLock = false; }, 400);

        const rawName = f.name || 'audio';
        const name = rawName.toLowerCase();
        const ext = name.includes('.') ? name.split('.').pop() : '';
        const audioExts = new Set([
          'mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus',
          'mp4', 'm4v', 'mov', 'webm', '3gp', 'amr', 'wma', 'aiff', 'aif', 'caf'
        ]);
        const mime = (f.type || '').toLowerCase();
        const extOk = audioExts.has(ext);
        // Accept: audio-like ext OR audio/* OR video/mp4 (etc) OR empty mime (Samsung quirk)
        const mimeOk = !mime || mime.startsWith('audio/') || mime.startsWith('video/')
          || mime === 'application/octet-stream';
        // Reject ONLY when mime is clearly image/pdf/doc AND ext is not audio
        const clearlyBad = /^(image\/|application\/(pdf|msword|vnd)|text\/(html|css|javascript))/.test(mime);
        if (clearlyBad && !extOk) {
          this.setStatus('That file does not look like audio. Try mp3, m4a, wav, or similar.', 'error');
          fileInput.value = '';
          return;
        }
        if (!extOk && !mimeOk && mime) {
          // Non-empty unknown mime without audio ext — soft reject
          this.setStatus('That file does not look like audio. Try mp3, m4a, wav, or similar.', 'error');
          fileInput.value = '';
          return;
        }
        // Immediate phone feedback before decode/ID
        this.setStatus('Got "' + rawName + '" — identifying…');
        this.emit('source', { type: 'file', file: f });
        // allow re-picking the same file later
        fileInput.value = '';
      };
      fileInput.addEventListener('change', onAudioPicked);
      fileInput.addEventListener('input', onAudioPicked);
    }

    const lyricsArea = $('lyrics-input');
    const lyricsFile = $('file-lyrics');
    const lyricsBtn = $('btn-lyrics-file');
    if (lyricsBtn && lyricsBtn.tagName === 'BUTTON') {
      lyricsBtn.addEventListener('click', () => lyricsFile?.click());
    }
    if (lyricsFile) {
      lyricsFile.addEventListener('change', async () => {
        const f = lyricsFile.files?.[0];
        if (!f) return;
        const text = await f.text();
        if (lyricsArea) lyricsArea.value = text;
        this.setSongStatus('Lyrics from file');
        lyricsFile.value = '';
      });
    }

    const artistIn = $('artist-input');
    const titleIn = $('title-input');
    const onManual = () => {
      this.emit('identity-manual', {
        artist: artistIn?.value || '',
        title: titleIn?.value || ''
      });
    };
    if (artistIn) artistIn.addEventListener('change', onManual);
    if (titleIn) titleIn.addEventListener('change', onManual);

    if ($('btn-fetch-lyrics')) {
      $('btn-fetch-lyrics').addEventListener('click', () => {
        this.emit('fetch-lyrics', {
          artist: artistIn?.value || '',
          title: titleIn?.value || ''
        });
      });
    }

    this.root.querySelectorAll('[data-style]').forEach(el => {
      el.addEventListener('click', () => {
        const style = el.dataset.style;
        const next = !el.classList.contains('active');
        // Keep setup-screen and show-overlay chips with the same value in sync.
        this.root.querySelectorAll('[data-style]').forEach((n) => {
          if (n.dataset.style === style) n.classList.toggle('active', next);
        });
      });
    });

    const gen = $('btn-generate');
    if (gen) {
      gen.addEventListener('click', () => {
        if (this._busy) return;
        this.emit('generate', this.getSettings());
      });
    }

    const overlay = $('show-overlay');
    const canvasHost = $('show-stage');
    const showScreen = $('show-screen');
    let hideTimer = null;
    let revealCount = 0;
    const reveal = () => {
      if (overlay) overlay.classList.add('visible');
      clearTimeout(hideTimer);
      revealCount += 1;
      // Longer hide (8s); first reveals especially need time on phones
      hideTimer = setTimeout(() => overlay?.classList.remove('visible'), 8000);
    };
    const onStageGesture = () => {
      this.emit('gesture');
      reveal();
    };
    if (canvasHost) {
      canvasHost.addEventListener('click', onStageGesture);
      canvasHost.addEventListener('touchstart', onStageGesture, { passive: true });
    }
    // Also catch taps on the prompt area / show screen chrome (prompt is pointer-events:none)
    if (showScreen) {
      showScreen.addEventListener('click', (e) => {
        if (e.target?.closest?.('.overlay-btns, .overlay-styles')) return;
        this.emit('gesture');
      });
    }
    if ($('btn-exit')) {
      $('btn-exit').addEventListener('click', () => this.emit('exit'));
    }
    if ($('btn-fullscreen')) {
      $('btn-fullscreen').addEventListener('click', () => this.emit('fullscreen'));
    }
  }

  getSettings() {
    const $ = (id) => this.root.getElementById(id);
    const styles = [...new Set([...this.root.querySelectorAll('[data-style].active')].map(el => el.dataset.style))];
    return {
      lyrics: $('lyrics-input')?.value || '',
      fantasy: $('fantasy-input')?.value || '',
      mood: $('mood-select')?.value || 'auto',
      styles: styles.length ? styles : ['cinematic', 'dreamlike'],
      intensity: $('intensity-select')?.value || 'moderate',
      lyricsOn: $('toggle-lyrics')?.checked !== false,
      charactersOn: $('toggle-characters')?.checked !== false,
      artist: $('artist-input')?.value?.trim() || '',
      title: $('title-input')?.value?.trim() || ''
    };
  }

  /**
   * @param {string} msg
   * @param {''|'warn'|'error'} [kind]
   */
  setStatus(msg, kind = '') {
    const el = this.root.getElementById('status-line');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('warn', kind === 'warn');
    el.classList.toggle('error', kind === 'error');
  }

  setBusy(busy, label) {
    this._busy = !!busy;
    const gen = this.root.getElementById('btn-generate');
    if (gen) {
      gen.disabled = !!busy;
      if (busy && label) gen.textContent = label;
      else if (!busy) gen.textContent = 'Generate show';
    }
    const fetchBtn = this.root.getElementById('btn-fetch-lyrics');
    if (fetchBtn) fetchBtn.disabled = !!busy;
    // Never disable #file-audio / .file-pick-input — Samsung needs the overlay input live
  }

  setShowPrompt(msg) {
    const el = this.root.getElementById('show-prompt');
    if (!el) return;
    // HOLD-2149: #show-prompt is rgba(8,8,18,0.82) mid-frame rounded card —
    // NEVER show over canvas during live show (looks like karaoke plate).
    // Gesture/rotate copy goes to setStatus HUD instead (see main.js).
    const body = this.root.body || document.body;
    const stageLive = !!(body && body.classList.contains('show-active'));
    if (stageLive) {
      el.textContent = '';
      el.classList.add('hidden');
      return;
    }
    el.textContent = msg || '';
    el.classList.toggle('hidden', !msg);
  }

  clearShowPrompt() {
    const el = this.root.getElementById('show-prompt');
    if (!el) return;
    el.textContent = '';
    el.classList.add('hidden');
  }

  setAudioLabel(label) {
    const el = this.root.getElementById('audio-label');
    if (el) el.textContent = label;
  }

  showSongCard(show) {
    const card = this.root.getElementById('song-card');
    if (card) card.classList.toggle('hidden', !show);
  }

  setSongIdentity({ artist = '', title = '', label = '', status = '' } = {}) {
    this.showSongCard(true);
    const titleEl = this.root.getElementById('song-card-title');
    const artistIn = this.root.getElementById('artist-input');
    const titleIn = this.root.getElementById('title-input');
    if (titleEl) {
      titleEl.textContent = label || (artist && title ? `${artist} — ${title}` : title || artist || 'Unknown song');
    }
    if (artistIn && document.activeElement !== artistIn) artistIn.value = artist || '';
    if (titleIn && document.activeElement !== titleIn) titleIn.value = title || '';
    if (status) this.setSongStatus(status);
  }

  /**
   * @param {string} msg
   * @param {''|'warn'|'error'} [kind]
   */
  setSongStatus(msg, kind = '') {
    const el = this.root.getElementById('song-card-status');
    if (!el) return;
    el.textContent = msg || '';
    // Auto-warn for actionable ID failures when kind omitted
    const autoWarn = !kind && /couldn.?t id|enter artist/i.test(msg || '');
    const k = kind || (autoWarn ? 'warn' : '');
    el.classList.toggle('warn', k === 'warn');
    el.classList.toggle('error', k === 'error');
  }

  setLyricsText(text) {
    const area = this.root.getElementById('lyrics-input');
    if (area) area.value = text || '';
  }

  getLyricsText() {
    return this.root.getElementById('lyrics-input')?.value || '';
  }

  showSetup(show) {
    const setup = this.root.getElementById('setup-screen');
    const stage = this.root.getElementById('show-screen');
    if (setup) setup.classList.toggle('hidden', !show);
    if (stage) stage.classList.toggle('hidden', show);
    // Scroll lock on show screen — prevent body scroll/bounce on phones
    const body = this.root.body || document.body;
    if (body) body.classList.toggle('show-active', !show);
    // HOLD-2149: always force #show-prompt.hidden when entering OR leaving show
    this.clearShowPrompt();
    if (show) {
      // Leave immersive fullscreen fallback when returning to setup
      if (stage) stage.classList.remove('immersive');
      if (body) body.classList.remove('immersive');
    }
  }

  updateHud(info) {
    const el = this.root.getElementById('hud-info');
    if (!el || !info) return;
    const base = [
      info.section || '',
      info.preset || '',
      info.concept || '',
      info.scale || '',
      info.event || '',
      info.fps ? `${info.fps}fps` : ''
    ].filter(Boolean).join(' · ');
    // HOLD-0321 proof HUD (?v=cohere6 / ?debug=hardlock / settings)
    if (info.proof) {
      const bits = [
        `hardOnly=${info.hardOnly ? 1 : 0}`,
        `preset=${info.preset || '?'}`,
        `pack=${info.packFamily || '?'}`,
        `latchMs=${info.hardLatchMsLeft ?? 0}`,
        `pin=${info.pinArmed ? 1 : 0}`,
        `martial=${(info.martial || info.martialHeat) ? 1 : 0}`,
        `orchM=${info.orchestralMartial ? 1 : 0}`,
        `forbidP=${info.forbidPastoral ? 1 : 0}`,
        `aggLock=${info.aggressionLock ? 1 : 0}`
      ];
      el.textContent = `${base} | HARD ${bits.join(' ')}`;
      el.classList.add('hud-proof');
      // Keep proof visible even when overlay chrome fades
      el.style.opacity = '1';
      try {
        if (typeof globalThis !== 'undefined') {
          globalThis.__LS_HARD__ = info.hardHud || {
            hardOnly: !!info.hardOnly,
            preset: info.preset,
            packFamily: info.packFamily,
            hardLatchMsLeft: info.hardLatchMsLeft,
            pinArmed: !!info.pinArmed,
            martialHeat: !!info.martialHeat,
            orchestralMartial: !!info.orchestralMartial
          };
        }
      } catch (_) { /* soft */ }
    } else {
      el.textContent = base;
      el.classList.remove('hud-proof');
      el.style.opacity = '';
    }
  }
}
