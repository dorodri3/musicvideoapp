# LIGHT SHOW versions

Do **not** start from scratch. Always refine from `/workspace/light-show/`.

## Baseline (restore point)
- **v1-baseline-20260924-210336** — saved before multi-bot parallel refinement
- Marker file: `LATEST_BASELINE.txt`

## How to restore baseline
```bash
rm -rf /workspace/light-show
cp -a /workspace/light-show-versions/$(cat /workspace/light-show-versions/LATEST_BASELINE.txt) /workspace/light-show
cd /workspace/light-show && python3 -m http.server 8765 --bind 127.0.0.1
```

## How to save a new checkpoint
```bash
NAME=vN-description-$(date +%Y%m%d-%H%M%S)
cp -a /workspace/light-show /workspace/light-show-versions/$NAME
echo $NAME >> /workspace/light-show-versions/CHANGELOG.txt
```

Active app stays at `/workspace/light-show/` (served on :8765 for phone tunnel).
