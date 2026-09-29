# LYRICS-FIX — 2026-09-29 (~1:43 PM PT)

Cache: `?v=lyrics-fix1` on `css/style.css` and `js/main.js`.
Does **not** revert the upload-fix2 `main.js` path (stable `File` bytes, no blob `crossOrigin`, metadata timeout, `audio.load()`). That code is in the same `main.js`; the cache string moved from `upload-fix2` to `lyrics-fix1` so phones pick up both.

## Root cause
`SongIdentity.identifyFromFile` sets `status: needs_manual` when **either** artist or title is missing (`if (!this.artist || !this.title)`).

`_onSource` treated `needs_manual` as “do not fetch”. A real upload often IDs only one side (filename without `Artist - Title`, ID3 title with empty artist, or the reverse). Autofetch never ran, so the lyrics textarea stayed empty and scenic lyrics had no phrases. LRCLIB search already accepts title-only (it retries without artist). The gate was in the UI wiring, not in `parser.js`.

`parser.js` still returns null on a non-OK LRCLIB response (including 503 `ServerOverloaded`) with no retry. That is a residual, not this fix. Lyrics Brain owned the autofetch wiring; this lane did not rewrite `parser.js` / `identity.js`.

## Fix (`js/main.js` only)
After identify, call `_fetchLyrics({ artist, title })` whenever **artist or title** is non-empty. Partial IDs still show a hint to correct the missing field. Both empty still asks the user to type artist and title, then Fetch.

## Retest on phone
1. Hard-refresh the tunnel URL so the query is `main.js?v=lyrics-fix1` (not `upload-fix2` / `hold1317`).
2. Upload a file named like `Josh Woodward - Go.mp3` (QA copy: `/workspace/light-show-qa/internet/Josh_Woodward_-_Go.mp3`).
3. Expect song card: Identifying → Fetching lyrics → `Lyrics found (N lines, synced|plain)`.
4. Lyrics textarea fills. Generate, then play — lines should hit the scenic canvas, not stay blank.
5. If status stays `No lyrics` / fetch failed, LRCLIB may be 503; paste the `.lrc` or tap Fetch again. Do not treat a single 503 as a regression of this gate.
