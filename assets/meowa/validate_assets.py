from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent.parent
manifest = json.loads((ROOT / "manifest.json").read_text())
errors = []
checks = []

selected = manifest.get("selected", [])
if len(selected) != 15:
    errors.append(f"selected count: expected 15, actual {len(selected)}")

for entry in selected:
    path = PROJECT / entry["file"]
    if not path.exists():
        errors.append(f"missing: {entry['file']}")
        continue
    try:
        with Image.open(path) as im:
            im.load()
            actual = {
                "format": im.format,
                "mode": im.mode,
                "dimensions": list(im.size),
                "alpha_extrema": list(im.getchannel("A").getextrema()) if "A" in im.getbands() else None,
            }
    except Exception as exc:
        errors.append(f"cannot open {entry['file']}: {exc}")
        continue
    for field in ("mode", "dimensions", "alpha_extrema"):
        if actual[field] != entry[field]:
            errors.append(f"{entry['file']} {field}: expected {entry[field]}, actual {actual[field]}")
    if actual["format"] != "PNG":
        errors.append(f"{entry['file']} format: expected PNG, actual {actual['format']}")
    opaque_expected = path.name.startswith("gamehub-")
    if opaque_expected and actual["alpha_extrema"] != [255, 255]:
        errors.append(f"{entry['file']} must be opaque")
    if not opaque_expected and actual["alpha_extrema"] != [0, 255]:
        errors.append(f"{entry['file']} must contain transparent and opaque pixels")
    checks.append({"file": entry["file"], **actual, "purpose": entry["purpose"]})

exact = {
    "assets/meowa/selected/gamehub-app-icon-512.png": [512, 512],
    "assets/meowa/selected/gamehub-cover-1200x630.png": [1200, 630],
}
for path, dims in exact.items():
    hit = next((c for c in checks if c["file"] == path), None)
    if not hit or hit["dimensions"] != dims:
        errors.append(f"exact dimensions failed: {path} expected {dims}")

source_manifest_path = PROJECT / "assets/meowa/source/core-pack/An_original_bright_16-bit_side-scrolling_platformer_asset_sheet_one_small_red_comet_explorer_hero_facing_right_2f29a205/final_outputs.json"
try:
    source_manifest = json.loads(source_manifest_path.read_text())
    if source_manifest.get("job_id") != manifest["source"]["job_id"]:
        errors.append("Meowa job id mismatch between source and selection manifest")
except Exception as exc:
    errors.append(f"source final_outputs.json invalid: {exc}")

for rel in ("assets/meowa/contact-sheet.png", "docs/prd-1.3.md", "docs/prd-1.1-hardmode.md"):
    if not (PROJECT / rel).exists():
        errors.append(f"missing required artifact: {rel}")

report = {
    "status": "PASS" if not errors else "FAIL",
    "validated_files": len(checks),
    "expected_selected_files": 15,
    "job_id": manifest["source"]["job_id"],
    "credits": manifest["credits"],
    "checks": checks,
    "errors": errors,
    "limitations": [
        "Validation opens and decodes every PNG and checks format/dimensions/alpha; final aesthetic approval remains CEO's contact-sheet gate.",
        "Directory has no .git metadata, so commit/status/remote evidence cannot be produced without a source-of-truth decision.",
    ],
}
(ROOT / "validation.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"status": report["status"], "validated_files": len(checks), "errors": errors}, ensure_ascii=False))
raise SystemExit(0 if not errors else 1)
