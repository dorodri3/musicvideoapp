# Phone upload re-harden (Samsung Chrome)

**Lane:** Phone Polish (file-picker / Samsung UI)  
**Checkpoint:** `v2-polish-upload-reharden-20260930-053932`  
**Cache bust:** `?v=upload-reharden` (css + main.js)

## What changed
- **CSS** `.file-pick*`: `opacity: 0.01` (Samsung often ignores `opacity:0` hit targets), `font-size: 100px` (classic Android enlarge native file-button hitbox), `overflow: hidden` on wrapper, `pointer-events: none` on label so taps reach the overlay input, `touch-action: manipulation`.
- **HTML** `#file-audio`: `accept="*/*"` — Samsung Files often shows an empty list with audio-only accept; filtering stays in JS. Optional hint `#upload-hint` under audio-label.
- **JS** `controls.js`: more permissive MIME/ext filter (accept empty mime, audio/*, video/*, octet-stream, or audio-like ext; reject only clear image/pdf/doc without audio ext). Listen to both `change` and `input` with debounce. Immediate `setStatus('Got "…" — identifying…')` on pick. `setBusy` still does **not** disable `#file-audio`.

## Why
Samsung Chrome / Files picker: opaque-zero inputs miss taps; restrictive `accept` yields empty picker; some devices fire `input` instead of `change`.

## Server / tunnel status observed
- Local http.server on :8765: **already up** at lane start (HTTP 200, python3 pid listening) — did **not** restart.
- Kickoff note from parent: nothing on :8765 and cloudflared gone when task started.
- During verify: cloudflared **was running** (`cloudflared tunnel --url http://127.0.0.1:8765`). This lane does **not** manage the tunnel — Tunnel Ops owns it. Flag for Tunnel Ops if public URL still stale/broken.

## Module graph check
- `node --check` on main/controls/semantic/parser/alignment/analyzer/… : all OK
- `import('./js/lyrics/semantic.js')` and `controls.js`: OK (QA-20260929-1317 missing-comma issue not present in current tree)
- Controls bind path healthy; upload “No audio selected” was not a bind failure in this tree

## Out of scope (other lanes)
- Decode/load + identity: Bot 1
- cloudflared / public tunnel: Tunnel Ops
