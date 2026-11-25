#!/usr/bin/env python3
"""Generate warm, painterly country_porch/bg.jpg (1280x720) — rich warm clustered porch/interior detail, center clear for figure."""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter

W, H = 1280, 720
rng = random.Random(42)

def lerp(a, b, t): return a + (b - a) * t
def lerp_col(c1, c2, t):
    return tuple(int(max(0, min(255, lerp(c1[i], c2[i], t)))) for i in range(3))

# 1. Base warm twilight timber/plaster cottage wall + radial hearth glow
img = Image.new('RGB', (W, H), (36, 21, 14))
px = img.load()
for y in range(H):
    if y < int(H * 0.22):
        t = y / (H * 0.22)
        base = lerp_col((20, 12, 9), (48, 28, 18), t)
    elif y < int(H * 0.79):
        t = (y - H * 0.22) / (H * 0.57)
        base = lerp_col((78, 46, 28), (114, 68, 39), t)
    else:
        t = (y - H * 0.79) / (H * 0.21)
        base = lerp_col((72, 42, 23), (38, 22, 13), t)
    for x in range(W):
        dx = abs(x - W * 0.50) / (W * 0.36)
        dy = abs(y - H * 0.54) / (H * 0.42)
        glow = max(0.0, 1.0 - (dx * dx * 0.8 + dy * dy))
        grain = math.sin(y * 0.38 + math.sin(x * 0.04) * 2.2) * 5 + math.sin(x * 0.13 + y * 0.05) * 3
        r = int(max(0, min(255, base[0] + glow * 46 + grain)))
        g = int(max(0, min(255, base[1] + glow * 28 + grain * 0.65)))
        b = int(max(0, min(255, base[2] + glow * 12 + grain * 0.35)))
        px[x, y] = (r, g, b)

draw = ImageDraw.Draw(img, 'RGBA')

# 2. Horizontal clapboard planks + rich wood grain strokes + subtle vertical beadboard accents
for py in range(int(H * 0.22), int(H * 0.79), 22):
    draw.line([(0, py), (W, py)], fill=(36, 20, 12, 165), width=2)
    draw.line([(0, py + 2), (W, py + 2)], fill=(154, 102, 60, 68), width=1)
    # painterly wood grain strokes per plank
    for _ in range(18):
        gx = rng.randint(0, W - 90)
        gl = rng.randint(35, 110)
        gy = py + rng.randint(5, 17)
        col = (60, 34, 19, 85) if rng.random() < 0.6 else (150, 96, 56, 55)
        draw.line([(gx, gy), (gx + gl, gy + rng.randint(-2, 2))], fill=col, width=rng.randint(1, 2))

# Wainscoting lower timber trim (y = 0.62..0.79)
draw.rectangle([0, int(H * 0.62), W, int(H * 0.64)], fill=(54, 30, 18, 220))
for vx in range(16, W, 28):
    draw.line([(vx, int(H * 0.64)), (vx, int(H * 0.79))], fill=(46, 26, 15, 115), width=2)

# 3. Dark porch ceiling eaves + rafters (top 22% dark for crisp lyrics)
draw.rectangle([0, 0, W, int(H * 0.21)], fill=(20, 11, 8, 238))
for rx in range(50, W, 140):
    draw.polygon([(rx, 0), (rx + 28, 0), (rx + 18, int(H * 0.22)), (rx - 10, int(H * 0.22))], fill=(32, 18, 11, 240))
draw.rectangle([0, int(H * 0.205), W, int(H * 0.235)], fill=(44, 25, 15, 250))

# 4. Porch floorboards + textured oval braided rug centered in front of figure
fy0 = int(H * 0.79)
draw.line([(0, fy0), (W, fy0)], fill=(26, 15, 9, 230), width=3)
for i in range(-14, 15):
    x_top = W * 0.50 + i * 48
    x_bot = W * 0.50 + i * 108
    draw.line([(x_top, fy0), (x_bot, H)], fill=(30, 17, 10, 185), width=2)
for _ in range(90):
    bx = rng.randint(int(W * 0.25), int(W * 0.75))
    by = rng.randint(fy0 + 4, H - 4)
    draw.line([(bx, by), (bx + rng.randint(25, 65), by + rng.randint(-3, 3))], fill=(120, 72, 40, 65), width=2)

rug_cx, rug_cy = int(W * 0.50), int(H * 0.895)
for rad_x, rad_y, col in [
    (176, 54, (118, 56, 30, 225)),
    (152, 46, (172, 104, 54, 225)),
    (124, 38, (104, 46, 30, 225)),
    (96, 29, (194, 138, 78, 225)),
    (66, 20, (132, 66, 38, 230)),
    (36, 11, (186, 126, 68, 230)),
]:
    draw.ellipse([rug_cx - rad_x, rug_cy - rad_y, rug_cx + rad_x, rug_cy + rad_y], fill=col)

# 5. Warm lit 6-pane cottage window (left-center u=0.335..0.455)
win_l, win_t, win_r, win_b = int(W * 0.335), int(H * 0.32), int(W * 0.455), int(H * 0.60)
win_cx, win_cy = (win_l + win_r) // 2, (win_t + win_b) // 2

glow_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow_layer)
for rad, a in [(225, 34), (155, 52), (95, 76)]:
    gd.ellipse([win_cx - rad, win_cy - rad, win_cx + rad, win_cy + rad], fill=(255, 168, 72, a))
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(34))
img = Image.alpha_composite(img.convert('RGBA'), glow_layer).convert('RGB')
draw = ImageDraw.Draw(img, 'RGBA')

draw.rectangle([win_l - 12, win_t - 12, win_r + 12, win_b + 14], fill=(44, 24, 15, 255))
draw.rectangle([win_l - 18, win_b + 4, win_r + 18, win_b + 20], fill=(60, 34, 20, 255))

for py in range(win_t, win_b):
    ty = (py - win_t) / max(1, win_b - win_t)
    c = lerp_col((252, 202, 110), (226, 138, 56), ty * 0.88)
    draw.line([(win_l, py), (win_r, py)], fill=c + (255,))
draw.ellipse([win_cx - 32, win_t + 36, win_cx + 32, win_b - 22], fill=(255, 224, 150, 118))
draw.polygon([(win_l, win_t), (win_l + 30, win_t), (win_l + 16, win_b), (win_l, win_b)], fill=(138, 64, 34, 215))
draw.polygon([(win_r, win_t), (win_r - 30, win_t), (win_r - 16, win_b), (win_r, win_b)], fill=(138, 64, 34, 215))
mx = (win_l + win_r) // 2
draw.rectangle([mx - 4, win_t, mx + 4, win_b], fill=(44, 24, 15, 255))
for my in [win_t + (win_b - win_t) // 3, win_t + 2 * (win_b - win_t) // 3]:
    draw.rectangle([win_l, my - 4, win_r, my + 4], fill=(44, 24, 15, 255))

# 6. Clustered warm cottage props on BOTH sides (keeps u=0.46..0.55 clear for figure!):
# 6a. Left wall: floating timber shelf with books, warm ceramics, framed cozy art (u=0.25..0.32)
sh_l, sh_r, sh_y = int(W * 0.245), int(W * 0.322), int(H * 0.49)
draw.rectangle([sh_l, sh_y, sh_r, sh_y + 8], fill=(56, 31, 18, 255))
for bx, bw, bh, bc in [(sh_l + 8, 11, 28, (148, 68, 42)), (sh_l + 20, 10, 32, (176, 122, 58)), (sh_l + 32, 12, 26, (98, 62, 46))]:
    draw.rectangle([bx, sh_y - bh, bx + bw, sh_y], fill=bc + (255,))
# Terracotta pot with trailing indoor pothos leaves on shelf
draw.polygon([(sh_r - 28, sh_y - 20), (sh_r - 8, sh_y - 20), (sh_r - 11, sh_y), (sh_r - 25, sh_y)], fill=(168, 86, 48, 255))
for lx, ly in [(-24, -24), (-16, -28), (-10, -22), (-20, -18), (-6, -12), (-4, 2), (-10, 12)]:
    draw.ellipse([sh_r + lx - 6, sh_y + ly - 4, sh_r + lx + 6, sh_y + ly + 4], fill=(82, 118, 62, 235))

# Small side bench + woven basket under window (u=0.35..0.44)
draw.rectangle([win_l + 8, fy0 - 38, win_r - 8, fy0 - 30], fill=(64, 35, 20, 255))
draw.rectangle([win_l + 14, fy0 - 30, win_l + 22, fy0 + 2], fill=(48, 26, 15, 255))
draw.rectangle([win_r - 22, fy0 - 30, win_r - 14, fy0 + 2], fill=(48, 26, 15, 255))
# Woven knit pillow on bench
draw.rounded_rectangle([win_l + 18, fy0 - 54, win_l + 54, fy0 - 36], radius=6, fill=(182, 102, 54, 240))

# 6b. Right wall: framed warm prints + rustic bookshelf/cupboard (u=0.55..0.74)
# Framed warm botanical prints above side table (u=0.54..0.66)
for fx0, fy_top, fw, fh in [(int(W * 0.545), int(H * 0.34), 48, 60), (int(W * 0.592), int(H * 0.32), 54, 68)]:
    draw.rectangle([fx0, fy_top, fx0 + fw, fy_top + fh], fill=(48, 26, 16, 255))
    draw.rectangle([fx0 + 6, fy_top + 6, fx0 + fw - 6, fy_top + fh - 6], fill=(214, 168, 112, 240))
    draw.ellipse([fx0 + 13, fy_top + 14, fx0 + fw - 13, fy_top + fh - 14], fill=(158, 92, 48, 200))

# Side table + steaming mug + glowing table lamp (u=0.555..0.592)
tbl_cx, tbl_y = int(W * 0.568), int(H * 0.65)
draw.rectangle([tbl_cx - 34, tbl_y, tbl_cx + 34, tbl_y + 9], fill=(64, 36, 20, 255))
draw.rectangle([tbl_cx - 6, tbl_y + 9, tbl_cx + 6, fy0 + 2], fill=(46, 25, 14, 255))
draw.polygon([(tbl_cx - 20, fy0 + 2), (tbl_cx + 20, fy0 + 2), (tbl_cx + 10, fy0 - 8), (tbl_cx - 10, fy0 - 8)], fill=(46, 25, 14, 255))
mug_x, mug_y = tbl_cx - 14, tbl_y - 16
draw.rounded_rectangle([mug_x - 8, mug_y, mug_x + 8, tbl_y], radius=3, fill=(196, 114, 68, 255))
draw.arc([mug_x + 5, mug_y + 3, mug_x + 14, mug_y + 13], -90, 90, fill=(196, 114, 68, 255), width=2)
for sx in (-3, 1, 5):
    draw.arc([mug_x + sx - 4, mug_y - 24, mug_x + sx + 4, mug_y - 2], 40, 220, fill=(248, 226, 195, 130), width=2)
lmp_x = tbl_cx + 15
draw.rectangle([lmp_x - 3, tbl_y - 18, lmp_x + 3, tbl_y], fill=(76, 52, 34, 255))
draw.polygon([(lmp_x - 16, tbl_y - 17), (lmp_x + 16, tbl_y - 17), (lmp_x + 10, tbl_y - 36), (lmp_x - 10, tbl_y - 36)], fill=(238, 178, 96, 245))

# Cozy deep-terracotta armchair with warm amber knit throw & sleeping cat (u=0.598..0.678)
ch_l, ch_r, ch_t, ch_b = int(W * 0.598), int(W * 0.678), int(H * 0.555), int(H * 0.79)
draw.rounded_rectangle([ch_l + 8, ch_t, ch_r - 8, ch_b - 18], radius=16, fill=(108, 44, 28, 255))
draw.rounded_rectangle([ch_l + 18, ch_t + 12, ch_r - 18, ch_b - 34], radius=12, fill=(128, 56, 36, 255))
draw.rounded_rectangle([ch_l, ch_t + 44, ch_l + 22, ch_b - 10], radius=9, fill=(92, 36, 22, 255))
draw.rounded_rectangle([ch_r - 22, ch_t + 44, ch_r, ch_b - 10], radius=9, fill=(92, 36, 22, 255))
draw.rounded_rectangle([ch_l + 14, ch_b - 48, ch_r - 14, ch_b - 16], radius=8, fill=(138, 64, 38, 255))
draw.rectangle([ch_l + 16, ch_b - 16, ch_l + 24, ch_b + 2], fill=(42, 22, 14, 255))
draw.rectangle([ch_r - 24, ch_b - 16, ch_r - 16, ch_b + 2], fill=(42, 22, 14, 255))
draw.rounded_rectangle([ch_l + 22, ch_t + 8, ch_l + 56, ch_b - 42], radius=8, fill=(198, 132, 74, 235))
for stripe in range(ch_t + 18, ch_b - 48, 12):
    draw.line([(ch_l + 24, stripe), (ch_l + 54, stripe)], fill=(156, 78, 42, 185), width=2)
cat_x, cat_y = (ch_l + ch_r) // 2 + 8, ch_b - 46
draw.ellipse([cat_x - 16, cat_y - 10, cat_x + 16, cat_y + 10], fill=(192, 102, 46, 255))
draw.ellipse([cat_x - 20, cat_y - 8, cat_x - 4, cat_y + 7], fill=(208, 116, 56, 255))
draw.polygon([(cat_x - 18, cat_y - 6), (cat_x - 15, cat_y - 14), (cat_x - 11, cat_y - 7)], fill=(192, 102, 46, 255))
draw.polygon([(cat_x - 10, cat_y - 7), (cat_x - 7, cat_y - 14), (cat_x - 5, cat_y - 6)], fill=(192, 102, 46, 255))

# Tall warm wooden bookcase on far right of viewport (u=0.682..0.755)
bk_l, bk_r, bk_t, bk_b = int(W * 0.684), int(W * 0.752), int(H * 0.35), int(H * 0.79)
draw.rectangle([bk_l, bk_t, bk_r, bk_b], fill=(46, 25, 15, 255))
draw.rectangle([bk_l + 6, bk_t + 8, bk_r - 6, bk_b - 8], fill=(66, 36, 21, 255))
for sy in [bk_t + 68, bk_t + 138, bk_t + 208, bk_t + 278]:
    draw.rectangle([bk_l + 4, sy, bk_r - 4, sy + 7], fill=(46, 25, 15, 255))
    # Row of warm-spined books & bowls
    bx = bk_l + 10
    while bx < bk_r - 18:
        bw = rng.randint(8, 13)
        bh = rng.randint(24, 42)
        bc = rng.choice([(158, 72, 42), (186, 128, 62), (118, 66, 48), (198, 152, 94), (132, 54, 42)])
        draw.rectangle([bx, sy - bh, bx + bw, sy], fill=bc + (255,))
        bx += bw + 2

# 7. Hanging warm porch lantern on left-center (u=0.292)
lan_x, lan_y = int(W * 0.292), int(H * 0.35)
draw.line([(lan_x, int(H * 0.22)), (lan_x, lan_y - 14)], fill=(28, 16, 10, 240), width=3)
draw.rounded_rectangle([lan_x - 12, lan_y - 12, lan_x + 12, lan_y + 18], radius=4, fill=(38, 22, 14, 255))
draw.rounded_rectangle([lan_x - 8, lan_y - 6, lan_x + 8, lan_y + 12], radius=3, fill=(255, 206, 118, 245))

# 8. Warm festoon string lights along porch eave (y ~ 0.23..0.28)
bulb_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(bulb_layer)
for i in range(18):
    t = (i + 0.5) / 18.0
    bx = int(W * (0.20 + 0.60 * t))
    by = int(H * (0.235 + 0.042 * math.sin(t * math.pi)))
    bd.ellipse([bx - 22, by - 22, bx + 22, by + 22], fill=(255, 192, 100, 52))
    bd.ellipse([bx - 5, by - 5, bx + 5, by + 5], fill=(255, 232, 175, 235))
bulb_layer = bulb_layer.filter(ImageFilter.GaussianBlur(6))
img = Image.alpha_composite(img.convert('RGBA'), bulb_layer).convert('RGB')

# 9. Painterly impasto speckles & soft canvas brush warmth
px = img.load()
for _ in range(36000):
    gx, gy = rng.randint(0, W - 2), rng.randint(0, H - 1)
    d = rng.randint(-14, 14)
    for ox in (0, 1):
        r, g, b = px[gx + ox, gy]
        px[gx + ox, gy] = (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d)))

img = img.filter(ImageFilter.GaussianBlur(0.8))
out_dir = '/workspace/light-show/assets/worlds/country_porch'
os.makedirs(out_dir, exist_ok=True)
img.save(os.path.join(out_dir, 'bg.jpg'), 'JPEG', quality=92)
print('Saved:', os.path.join(out_dir, 'bg.jpg'), img.size)
