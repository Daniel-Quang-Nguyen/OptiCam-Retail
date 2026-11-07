"""Sinh 3 layout mẫu (schema camelCase) từ LAYOUT_PRESETS của bản Pygame cũ."""
import ast, json, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "legacy_pygame" / "Source.py").read_text(encoding="utf-8-sig")
presets = ast.literal_eval(re.search(r"LAYOUT_PRESETS = (\{.*?\n\})\s*\n\s*current_preset_id", src, re.S).group(1))
VI = [("Quay", "Quầy"), ("Cua Ra Vao", "Cửa ra vào"), ("Cua Chinh", "Cửa chính"), ("Ke ", "Kệ "), ("Nuoc", "Nước"),
      ("My Pham", "Mỹ phẩm"), ("Tong Hop", "Tổng hợp"), ("Banh", "Bánh"), ("Thuc Pham", "Thực phẩm")]
def vi(s):
    for a, b in VI: s = s.replace(a, b)
    return s
names = {1: "store_60m2", 2: "circle_k_75m2", 3: "ministop_50m2"}
for k, p in presets.items():
    out = {"version": "1.0", "name": p["name"], "widthM": p["width"], "heightM": p["height"], "gridM": p["grid_size"],
           "pixelsPerMeter": 68, "obstacles": [{"id": o["id"], "type": o["type"], "label": vi(o["name"]), "x": o["x"], "y": o["y"],
           "w": o["width"], "h": o["height"], "elev": o["elevation"], "angle": o["angle"]} for o in p["obstacles"]],
           "risk": {}, "cameras": []}
    text = json.dumps(out, ensure_ascii=False, indent=2)
    sample_dir = root / "data_samples"
    sample_dir.mkdir(parents=True, exist_ok=True)
    (sample_dir / f"{names[k]}.json").write_text(text, encoding="utf-8")
    print("ok")
