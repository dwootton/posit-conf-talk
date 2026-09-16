"""Build a real, styled Houston basemap image from OpenStreetMap tiles.

Fetches OSM raster tiles once (cached under build/tilecache/), stitches and
crops them to the exact deck bbox, then recolors to a two-tone bone/ink
duotone matching the vibe-widgets palette so it sits quietly behind the
orange/accent-colored data marks. Writes data/houston_basemap.png plus a
data/houston_basemap.json describing the exact geographic corners so widget
code can align an <image> pixel-for-pixel with the d3 projection.

Run once:  python build/make_basemap.py
"""
from __future__ import annotations

import json
import math
import time
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CACHE = ROOT / "build" / "tilecache"
CACHE.mkdir(parents=True, exist_ok=True)

BBOX = dict(lon0=-95.615, lat0=29.600, lon1=-95.255, lat1=29.880)
ZOOM = 12
UA = "vibe-widgets-deck-basemap/1.0 (one-time build script; contact: dwootton)"

# duotone endpoints, matched to the vibe-widgets theme
DARK = (58, 56, 50)      # muted ink, not full black -- keeps marks readable on top
LIGHT = (242, 240, 233)  # #F2F0E9 bone


def deg2num(lat_deg: float, lon_deg: float, zoom: int) -> tuple[float, float]:
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = (lon_deg + 180.0) / 360.0 * n
    ytile = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
    return xtile, ytile


def fetch_tile(z: int, x: int, y: int) -> Image.Image:
    path = CACHE / f"{z}_{x}_{y}.png"
    if not path.exists():
        url = f"https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        req = Request(url, headers={"User-Agent": UA})
        with urlopen(req, timeout=15) as resp:
            path.write_bytes(resp.read())
        time.sleep(0.3)  # be polite to the tile server
    return Image.open(path).convert("RGB")


def main() -> None:
    xf0, yf0 = deg2num(BBOX["lat1"], BBOX["lon0"], ZOOM)  # NW corner
    xf1, yf1 = deg2num(BBOX["lat0"], BBOX["lon1"], ZOOM)  # SE corner

    x0, x1 = int(math.floor(xf0)), int(math.floor(xf1))
    y0, y1 = int(math.floor(yf0)), int(math.floor(yf1))

    n_tiles = (x1 - x0 + 1) * (y1 - y0 + 1)
    print(f"zoom {ZOOM}: tiles x[{x0}-{x1}] y[{y0}-{y1}] = {n_tiles} tiles")

    stitched = Image.new("RGB", ((x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256))
    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            tile = fetch_tile(ZOOM, tx, ty)
            stitched.paste(tile, ((tx - x0) * 256, (ty - y0) * 256))

    # crop to the exact bbox, using fractional tile position
    px0 = (xf0 - x0) * 256
    py0 = (yf0 - y0) * 256
    px1 = (xf1 - x0) * 256
    py1 = (yf1 - y0) * 256
    cropped = stitched.crop((round(px0), round(py0), round(px1), round(py1)))
    print(f"cropped to {cropped.size}")

    # style: grayscale -> duotone (bone/ink), matching the deck's palette
    gray = ImageOps.grayscale(cropped)
    gray = ImageOps.autocontrast(gray, cutoff=1)
    duotone = ImageOps.colorize(gray, black=DARK, white=LIGHT, mid=(190, 184, 168))
    duotone = duotone.convert("RGB")

    # subtle attribution, required by OSM's tile usage policy
    draw = ImageDraw.Draw(duotone)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11)
    except Exception:
        font = ImageFont.load_default()
    label = "© OpenStreetMap contributors"
    tw = draw.textlength(label, font=font)
    pad = 5
    x, y = duotone.width - tw - pad * 2, duotone.height - 16
    draw.rectangle([x, y, duotone.width, duotone.height], fill=(*LIGHT, 255))
    draw.text((x + pad, y + 2), label, fill=(120, 116, 105), font=font)

    out_png = DATA / "houston_basemap.png"
    duotone.save(out_png, optimize=True)
    print(f"wrote {out_png} ({duotone.size[0]}x{duotone.size[1]}, {out_png.stat().st_size // 1024} KB)")

    meta = {
        "bbox": BBOX,
        "width": duotone.width,
        "height": duotone.height,
        "note": "corners: NW=[lon0,lat1], SE=[lon1,lat0]. Project those two points "
                "with the SAME projection used for data marks to place this image "
                "with an <image> element -- do not stretch or refit independently.",
        "attribution": "© OpenStreetMap contributors (baked into the image)",
    }
    (DATA / "houston_basemap.json").write_text(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
