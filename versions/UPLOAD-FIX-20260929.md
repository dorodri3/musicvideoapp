# UPLOAD-FIX — 2026-09-29 (~1:40 PM PT)

## Lane split
- **Phone Polish** owns Samsung file-picker UI (`index.html` label/input/CSS, `accept=*/*`, reharden ckpt `v2-polish-upload-reharden-20260930-053932`).
- **This fix** owns post-pick decode/load/play + identity file snapshot in `js/main.js` only.

## Root cause (decode/load path)
After the picker emits a `File`, `controls.js` clears `input.value` so the same file can be re-picked. `_onSource` is async and first awaited `_ensureAudio()`, so on Samsung Chrome the `File` / blob backing store can already be dead by the time `URL.createObjectURL(file)` / ID3 read runs → silent fail or “Audio load failed”.

Secondary issues in the same path:
1. `audio.crossOrigin = 'anonymous'` on `blob:` URLs — can block `loadedmetadata` / `MediaElementSource` on Android WebView/Chrome.
2. Waited only on `loadedmetadata` with **no timeout** — hang forever on stubborn mobile decoders.
3. No explicit `audio.load()` after setting `src`.

Module graph: all `js/**/*.js` pass `node --check`. hold1317 `crowd_sea` trailing comma is present; no syntax kill.

## Fix (`js/main.js`)
- Kick off `file.arrayBuffer()` **synchronously** in the `source` listener before the change-handler clears the input; rebuild a stable `File`/`Blob` from those bytes.
- Drop `crossOrigin` for blob URLs; set `preload=auto`; call `audio.load()`; accept `loadedmetadata` / `loadeddata` / `canplay`; 20s timeout.
- Revoke object URLs on disconnect; guard `createMediaElementSource`.

## Cache
- Bumped to `?v=upload-fix2` on `css/style.css` + `js/main.js` (supersedes `upload-reharden` cache string so the new `main.js` loads; **picker markup not reverted**).

## Tunnel / local
- Local: `http://127.0.0.1:8765/` → 200
- Live SoT: `https://lid-goat-continuous-future.trycloudflare.com` → 200  
  (prior `ecommerce-removable-partnerships-journey` DNS-dead; noted in `CURRENT_TUNNEL.txt`)

## Residual risks
- DRM / HE-AAC oddballs may still fail native `<audio>` decode — no `decodeAudioData` BufferSource fallback yet.
- If Phone Polish re-bumps cache without `upload-fix2`, hard-refresh may miss this `main.js` until cache string includes the fix.
- Picker empty-list UX remains Phone Polish lane.
