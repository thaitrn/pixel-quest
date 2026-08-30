from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "source/core-pack/An_original_bright_16-bit_side-scrolling_platformer_asset_sheet_one_small_red_comet_explorer_hero_facing_right_2f29a205/sprite_00.png"
OUT = ROOT / "selected"
OUT.mkdir(parents=True, exist_ok=True)
source = Image.open(SRC).convert("RGBA")

# Bố cục sheet được Meowa xuất theo thứ tự prompt. Mỗi bbox lấy thêm padding
# trong suốt, không resample để giữ nguyên pixel nguồn.
regions = {
    "hero-red": (4, 20, 89, 155),
    "hero-blue": (133, 20, 214, 155),
    "hero-green": (246, 20, 328, 155),
    "hero-yellow": (358, 20, 441, 155),
    "hazard-slime": (0, 278, 81, 350),
    "hazard-bat": (101, 260, 201, 334),
    "hazard-spike": (221, 281, 282, 350),
    "collectible-coin": (310, 287, 372, 350),
    "collectible-heart": (394, 217, 459, 274),
    "collectible-star": (473, 214, 536, 274),
    "collectible-speed": (394, 295, 461, 356),
    "collectible-double-jump": (473, 291, 536, 358),
    "ui-controls": (462, 0, 540, 138),
}

assets = {}
for name, box in regions.items():
    crop = source.crop(box)
    path = OUT / f"{name}.png"
    crop.save(path, optimize=True)
    assets[name] = crop

palette = {
    "navy": "#0b0e1a",
    "panel": "#1e2a4a",
    "mint": "#06d6a0",
    "coral": "#ef476f",
    "gold": "#ffd166",
    "text": "#e0e0ff",
    "sky": "#17295b",
}

# App icon: compose ở 256x256 rồi phóng đúng 2x bằng nearest-neighbor.
def cover_fit(img, max_w, max_h):
    scale = min(max_w // img.width, max_h // img.height)
    scale = max(1, scale)
    return img.resize((img.width * scale, img.height * scale), Image.Resampling.NEAREST)

icon_small = Image.new("RGBA", (256, 256), palette["navy"])
d = ImageDraw.Draw(icon_small)
d.rectangle((12, 12, 243, 243), fill=palette["panel"], outline=palette["mint"], width=6)
d.polygon([(16, 190), (78, 132), (133, 180), (194, 110), (240, 160), (240, 240), (16, 240)], fill="#203f58")
hero = assets["hero-red"]
hero_icon = cover_fit(hero, 170, 210)
icon_small.alpha_composite(hero_icon, ((256 - hero_icon.width) // 2, 27))
d.ellipse((188, 28, 222, 62), fill=palette["gold"], outline="#fff0a8", width=3)
app_icon = icon_small.resize((512, 512), Image.Resampling.NEAREST)
app_icon.save(OUT / "gamehub-app-icon-512.png", optimize=True)

# GameHub cover: đúng 1200x630. Compose ở 600x315 rồi scale 2x NN.
cover_small = Image.new("RGBA", (600, 315), palette["sky"])
d = ImageDraw.Draw(cover_small)
# parallax motif khớp gameplay 0.3x/0.6x: mây xa, núi gần.
for x, y in [(70, 55), (250, 38), (470, 72)]:
    d.rectangle((x, y, x + 90, y + 18), fill="#284579")
    d.rectangle((x + 18, y - 10, x + 65, y + 18), fill="#284579")
d.polygon([(0, 245), (90, 145), (180, 245), (285, 125), (390, 245), (500, 155), (600, 245)], fill="#203f58")
d.rectangle((0, 245, 599, 314), fill="#153b3b")
for x in range(0, 600, 32):
    d.rectangle((x, 245, min(x + 30, 599), 257), fill=palette["mint"])
    d.rectangle((x, 260, min(x + 30, 599), 314), outline="#285f55", width=2)
# Gameplay cast: giữ source pixels, chỉ integer scale khi đủ chỗ.
cover_hero = cover_fit(assets["hero-red"], 140, 210)
cover_small.alpha_composite(cover_hero, (55, 245 - cover_hero.height))
slime = cover_fit(assets["hazard-slime"], 100, 80)
cover_small.alpha_composite(slime, (450, 245 - slime.height))
coin = cover_fit(assets["collectible-coin"], 65, 65)
for x, y in [(250, 177), (320, 150), (390, 177)]:
    cover_small.alpha_composite(coin, (x, y))
# Title rendered on half-resolution canvas, then pixel-scaled with the cover.
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New Bold.ttf", 46)
    subfont = ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New Bold.ttf", 16)
except OSError:
    font = ImageFont.load_default(size=46)
    subfont = ImageFont.load_default(size=16)
d.text((300, 30), "PIXEL QUEST", font=font, fill=palette["gold"], stroke_width=3, stroke_fill=palette["navy"], anchor="ma")
d.text((300, 82), "RUN • JUMP • CONQUER", font=subfont, fill=palette["text"], anchor="ma")
cover = cover_small.resize((1200, 630), Image.Resampling.NEAREST)
cover.save(OUT / "gamehub-cover-1200x630.png", optimize=True)

# Contact sheet cho CEO review; nền opaque để xem alpha và readability.
contact = Image.new("RGBA", (1600, 1000), "#111522")
d = ImageDraw.Draw(contact)
try:
    title_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New Bold.ttf", 42)
    label_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New.ttf", 22)
except OSError:
    title_font = ImageFont.load_default(size=42)
    label_font = ImageFont.load_default(size=22)
d.text((60, 35), "PIXEL QUEST — MEOWA DESIGN SELECTION", font=title_font, fill=palette["gold"])
items = list(regions)
for i, name in enumerate(items):
    col, row = i % 5, i // 5
    x, y = 60 + col * 300, 120 + row * 220
    d.rectangle((x, y, x + 250, y + 170), fill="#1e2a4a", outline="#3b4c74", width=2)
    im = cover_fit(assets[name], 220, 125)
    contact.alpha_composite(im, (x + (250 - im.width) // 2, y + 8 + (125 - im.height) // 2))
    d.text((x + 8, y + 142), name, font=label_font, fill=palette["text"])
# Add final channel previews.
icon_preview = app_icon.resize((170, 170), Image.Resampling.NEAREST)
contact.alpha_composite(icon_preview, (60, 790))
d.text((245, 820), "GameHub icon\n512×512", font=label_font, fill=palette["text"])
cover_preview = cover.resize((600, 315), Image.Resampling.NEAREST)
contact.alpha_composite(cover_preview, (500, 670))
d.text((1120, 820), "GameHub cover\n1200×630", font=label_font, fill=palette["text"])
contact.save(ROOT / "contact-sheet.png", optimize=True)

purposes = {
    "collectible-coin": "Score coin",
    "collectible-double-jump": "Double-jump power-up",
    "collectible-heart": "Heal power-up",
    "collectible-speed": "Speed power-up",
    "collectible-star": "Star power-up",
    "gamehub-app-icon-512": "GameHub app icon",
    "gamehub-cover-1200x630": "GameHub cover",
    "hazard-bat": "Chaser enemy",
    "hazard-slime": "Patrol enemy",
    "hazard-spike": "Static hazard",
    "hero-blue": "Blue cosmetic hero",
    "hero-green": "Green cosmetic hero; unlock after five levels",
    "hero-red": "Default hero and product identity",
    "hero-yellow": "Yellow cosmetic hero; unlock after five levels",
    "ui-controls": "Text-free control and HUD motif source",
}

manifest = {
    "design_status": "DESIGN-READY-FOR-CEO-REVIEW",
    "credits": {
        "before": 190,
        "after": 118,
        "used": 72,
        "task_cap": 40,
        "cap_overrun": 32,
        "reserve_requirement": 30,
        "reserve_preserved": True,
        "action": "Stopped all paid generation after the first job revealed the overrun.",
    },
    "source": {
        "provider": "Meowa",
        "job_id": "job_54ad3775080a40119d5c2835ca2bf44b",
        "file": str(SRC.relative_to(ROOT.parent.parent)),
        "dimensions": list(source.size),
        "mode": source.mode,
        "capability": "pixel-universal-gen-run",
    },
    "postprocess": "Deterministic crop/pad/composite only; nearest-neighbor for integer scaling; no generative edits.",
    "palette": palette,
    "selected": [],
}
for path in sorted(OUT.glob("*.png")):
    im = Image.open(path)
    alpha = im.getchannel("A").getextrema() if "A" in im.getbands() else None
    manifest["selected"].append({
        "file": str(path.relative_to(ROOT.parent.parent)),
        "dimensions": list(im.size),
        "mode": im.mode,
        "alpha_extrema": list(alpha) if alpha else None,
        "purpose": purposes[path.stem],
    })
manifest["contact_sheet"] = str((ROOT / "contact-sheet.png").relative_to(ROOT.parent.parent))
(ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"selected_count": len(manifest["selected"]), "contact_sheet": manifest["contact_sheet"]}))
