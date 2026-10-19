#!/usr/bin/env bash
# Repeatable push of the LIGHT SHOW app + version notes to dorodri3/musicvideoapp.
# Safe to re-run. Does not print credentials. Skips audio and screenshot binaries.
#
# Usage:
#   /workspace/light-show/scripts/push-to-github.sh
#   /workspace/light-show/scripts/push-to-github.sh "commit message"
set -euo pipefail

APP="${APP:-/workspace/light-show}"
NOTES="${NOTES:-/workspace/light-show-versions}"
DEST="${DEST:-/workspace/musicvideoapp-push}"
REMOTE_URL="https://github.com/dorodri3/musicvideoapp"
MSG="${1:-LIGHT SHOW: phone upload decode + lyrics autofetch (lyrics-fix1)}"

if [[ ! -d "$DEST/.git" ]]; then
  echo "missing git repo at $DEST" >&2
  exit 1
fi
if [[ ! -d "$APP" || ! -d "$NOTES" ]]; then
  echo "missing app or notes dir" >&2
  exit 1
fi

python3 - "$APP" "$DEST" "$NOTES" << 'PY'
import os, shutil, sys
app, dest, notes = sys.argv[1], sys.argv[2], sys.argv[3]
skip_ext = {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".aac"}
note_ok = lambda n: n.endswith(".md") or n.endswith(".txt") or n == "CHANGELOG"

app_rel = set()
for root, dirs, files in os.walk(app, followlinks=False):
    dirs[:] = [d for d in dirs if d != ".git"]
    for name in files:
        src = os.path.join(root, name)
        if os.path.islink(src) and os.path.basename(src) == "CREW-PROCESS.md":
            continue
        ext = os.path.splitext(name)[1].lower()
        if ext in skip_ext:
            continue
        rel = os.path.relpath(src, app)
        app_rel.add(rel)
        target = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copy2(src, target)

crew_src = os.path.join(notes, "CREW-PROCESS.md")
if os.path.isfile(crew_src):
    shutil.copy2(crew_src, os.path.join(dest, "CREW-PROCESS.md"))
    app_rel.add("CREW-PROCESS.md")

for root, dirs, files in os.walk(dest, topdown=False):
    rel_root = os.path.relpath(root, dest)
    top = "" if rel_root == "." else rel_root.split(os.sep)[0]
    if top in (".git", "versions"):
        continue
    for name in files:
        rel = os.path.relpath(os.path.join(root, name), dest)
        if rel in (".gitignore",):
            continue
        if rel not in app_rel:
            os.remove(os.path.join(root, name))
    if root != dest and top not in (".git", "versions") and not os.listdir(root):
        os.rmdir(root)

ver = os.path.join(dest, "versions")
os.makedirs(ver, exist_ok=True)
for name in os.listdir(ver):
    path = os.path.join(ver, name)
    if os.path.isdir(path):
        shutil.rmtree(path)
    else:
        os.remove(path)
for name in os.listdir(notes):
    src = os.path.join(notes, name)
    if not os.path.isfile(src) or os.path.islink(src):
        continue
    if note_ok(name):
        shutil.copy2(src, os.path.join(ver, name))
print("synced", len(app_rel), "app files")
PY

if [[ ! -f "$DEST/.gitignore" ]]; then
  printf '%s\n' node_modules/ .DS_Store '*.log' .env .env.* '*.pem' secrets/ __pycache__/ .cache/ .cloudflared/ tmp/ '*.wav' '*.mp3' '*.flac' '*.m4a' > "$DEST/.gitignore"
fi

# GH_TOKEN / GITHUB_TOKEN (a fine-grained PAT without write access here) override gh's stored
# login, which has repo scope -> 403. Push with those unset and gh's stored login as the helper.
GH_BIN="$(command -v gh || true)"
[[ -x /usr/local/bin/gh ]] && GH_BIN=/usr/local/bin/gh
if [[ -z "$GH_BIN" ]]; then
  echo "gh not found; cannot authenticate push" >&2
  exit 1
fi
git_push() {
  env -u GH_TOKEN -u GITHUB_TOKEN git -c credential.helper= -c "credential.helper=!$GH_BIN auth git-credential" push origin main
}

cd "$DEST"
git add -A
if git diff --cached --quiet; then
  echo "nothing to commit"
else
  git commit -m "$MSG"
fi

git_push

SHA=$(git rev-parse HEAD)
STAMP=$(TZ=America/Los_Angeles date '+%Y-%m-%dT%H:%M:%S%z' | sed -E 's/([+-][0-9]{2})([0-9]{2})$/\1:\2/')
printf 'repo=%s\ncommit=%s\npushed=%s\n' "$REMOTE_URL" "$SHA" "$STAMP" > "$NOTES/GITHUB-REMOTE.txt"
cp -a "$NOTES/GITHUB-REMOTE.txt" "$DEST/versions/GITHUB-REMOTE.txt"
git add versions/GITHUB-REMOTE.txt
if ! git diff --cached --quiet; then
  git commit -m "Record pushed SHA in GITHUB-REMOTE.txt"
  git_push
  SHA=$(git rev-parse HEAD)
  STAMP=$(TZ=America/Los_Angeles date '+%Y-%m-%dT%H:%M:%S%z' | sed -E 's/([+-][0-9]{2})([0-9]{2})$/\1:\2/')
  printf 'repo=%s\ncommit=%s\npushed=%s\n' "$REMOTE_URL" "$SHA" "$STAMP" > "$NOTES/GITHUB-REMOTE.txt"
  cp -a "$NOTES/GITHUB-REMOTE.txt" "$DEST/versions/GITHUB-REMOTE.txt"
  git add versions/GITHUB-REMOTE.txt
  git commit -m "Record pushed SHA in GITHUB-REMOTE.txt"
  git_push
fi

echo "pushed $REMOTE_URL"
echo "HEAD $(git rev-parse HEAD)"
echo "GITHUB-REMOTE:"
cat "$NOTES/GITHUB-REMOTE.txt"
