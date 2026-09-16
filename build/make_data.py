"""Build the Houston donut-shop dataset and basemap used by every widget in the deck.

Run once:  python build/make_data.py
Writes:    data/houston_donut_shops.csv, data/houston_basemap.geojson
"""
from __future__ import annotations

import csv
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)

# name, neighborhood, lon, lat, rating, weekday wait (min), weekend wait (min), price level 1-3
RAW = [
    ("Montrose Glaze Co",       "Montrose",        -95.3905, 29.7430, 4.7, 18, 27, 2),
    ("Westheimer Crullers",     "Montrose",        -95.4012, 29.7428, 4.4, 11, 19, 2),
    ("Taft Street Sinkers",     "Montrose",        -95.3948, 29.7508, 4.2,  9, 14, 1),
    ("Heights Hole Co",         "The Heights",     -95.3980, 29.7902, 4.8, 24, 38, 2),
    ("Yale Street Dough",       "The Heights",     -95.3980, 29.7995, 4.5, 16, 26, 2),
    ("White Oak Fritters",      "The Heights",     -95.4055, 29.7828, 4.3, 13, 21, 1),
    ("Bayou Bear Claw",         "Downtown",        -95.3677, 29.7589, 4.6, 21, 31, 3),
    ("Main Street Sinkers",     "Downtown",        -95.3660, 29.7520, 4.1, 12, 17, 2),
    ("Buffalo Bayou Beignet",   "Downtown",        -95.3770, 29.7620, 4.9, 29, 44, 3),
    ("Midtown Powder",          "Midtown",         -95.3760, 29.7405, 4.5, 17, 25, 2),
    ("Bagby Rings",             "Midtown",         -95.3790, 29.7460, 4.0,  8, 13, 1),
    ("Rice Village Raised",     "Rice Village",    -95.4160, 29.7160, 4.6, 20, 30, 2),
    ("Kirby Kruller",           "Upper Kirby",     -95.4180, 29.7350, 4.4, 14, 22, 2),
    ("EaDo Old Fashioned",      "EaDo",            -95.3480, 29.7490, 4.7, 22, 33, 2),
    ("Navigation Glaze",        "Second Ward",     -95.3300, 29.7530, 4.8, 26, 39, 1),
    ("Museum District Donuts",  "Museum District", -95.3900, 29.7250, 4.3, 15, 23, 2),
    ("Hermann Park Fritters",   "Museum District", -95.3890, 29.7180, 4.1, 10, 16, 1),
    ("Third Ward Twist",        "Third Ward",      -95.3600, 29.7280, 4.5, 19, 28, 1),
    ("Almeda Apple Fritter",    "Third Ward",      -95.3660, 29.7135, 4.2, 12, 18, 1),
    ("Garden Oaks Glazery",     "Garden Oaks",     -95.4130, 29.8180, 4.4, 13, 20, 2),
    ("Shepherd Sprinkle",       "Washington Ave",  -95.4105, 29.7715, 4.6, 23, 34, 2),
    ("Washington Dough Club",   "Washington Ave",  -95.3985, 29.7688, 4.3, 11, 18, 2),
    ("Spring Branch Sugar",     "Spring Branch",   -95.4900, 29.8000, 4.0,  7, 11, 1),
    ("Galleria Gold Ring",      "Galleria",        -95.4650, 29.7400, 4.5, 25, 36, 3),
    ("Bellaire Buttermilk",     "Bellaire",        -95.4590, 29.7050, 4.4, 15, 23, 2),
    ("Meyerland Maple Bar",     "Meyerland",       -95.4600, 29.6900, 4.2, 10, 15, 1),
    ("Gulfton Glazed",          "Gulfton",         -95.4900, 29.7150, 4.7, 18, 27, 1),
    ("Sharpstown Sinker Shop",  "Sharpstown",      -95.5200, 29.7000, 4.1,  6, 10, 1),
    ("Near Northside Nibble",   "Near Northside",  -95.3560, 29.7920, 4.6, 20, 29, 1),
    ("Denver Harbor Dozen",     "Denver Harbor",   -95.3050, 29.7750, 4.3,  9, 14, 1),
    ("Sunnyside Sugar Ring",    "Sunnyside",       -95.3700, 29.6650, 4.5, 12, 19, 1),
    ("Alief Apple Ring",        "Alief",           -95.5750, 29.7100, 4.2,  8, 12, 1),
]

SIGNATURES = [
    "pumpkin spice cake", "maple bacon bar", "brown butter old-fashioned", "blueberry cake",
    "cinnamon twist", "kolache-style sausage roll", "lemon poppyseed", "tres leches glazed",
    "cafe con leche cruller", "strawberry sprinkle", "apple fritter", "chocolate long john",
    "pumpkin spice cruller", "honey glazed", "coconut cake", "pecan praline",
]

rng = random.Random(2026)
rows = []
for i, (name, hood, lon, lat, rating, wk, we, price) in enumerate(RAW, start=1):
    reviews = int(rng.triangular(80, 2400, 500))
    # roughly a third of shops carry pumpkin spice in the fall; a few signatures say so outright
    sig = SIGNATURES[(i * 7) % len(SIGNATURES)]
    pumpkin = ("pumpkin" in sig) or (rng.random() < 0.28)
    rows.append({
        "shop_id": f"H{i:03d}",
        "name": name,
        "neighborhood": hood,
        "latitude": lat,
        "longitude": lon,
        "rating": rating,
        "review_count": reviews,
        "price_level": price,
        "weekday_wait_min": wk,
        "weekend_wait_min": we,
        "pumpkin_spice": pumpkin,
        "open_late": rng.random() < 0.35,
        "signature_donut": sig,
    })

# One deliberate outlier, appended after the generated rows so the other 32 stay
# byte-identical: a tourist-flagship shop with several times everyone else's
# review count. It is what slide 16's "remove elements" widget removes -- with
# it in frame the review axis is squashed and the rest of the shops pile up in
# the left third; drop it and they spread across the full width. Its wait time
# is deliberately only a tie with the existing maximum, so the wait-encoded map
# widgets are unaffected.
rows.append({
    "shop_id": f"H{len(rows) + 1:03d}",
    "name": "Bayou City Original",
    "neighborhood": "Downtown",
    "latitude": 29.7565,
    "longitude": -95.3620,
    "rating": 4.6,
    "review_count": 5600,
    "price_level": 2,
    "weekday_wait_min": 29,
    "weekend_wait_min": 44,
    "pumpkin_spice": False,
    "open_late": True,
    "signature_donut": "honey glazed",
})

with open(DATA / "houston_donut_shops.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

# ---- basemap: bayous, the 610 loop, neighborhood label points -------------
WATER = {
    "Buffalo Bayou": [[-95.615,29.7660],[-95.52,29.7600],[-95.46,29.7648],[-95.4255,29.7622],[-95.3995,29.7635],[-95.3770,29.7608],[-95.3600,29.7545],[-95.3430,29.7505],[-95.3200,29.7480],[-95.255,29.7455]],
    "White Oak Bayou": [[-95.4720,29.8760],[-95.4340,29.8035],[-95.4150,29.7880],[-95.3990,29.7760],[-95.3830,29.7660]],
    "Brays Bayou": [[-95.615,29.6760],[-95.5000,29.6900],[-95.4520,29.6980],[-95.4050,29.7060],[-95.3620,29.7080],[-95.3200,29.7160],[-95.255,29.7240]],
}
LOOP610 = [
    [-95.4640,29.7330],[-95.4630,29.7720],[-95.4560,29.7960],[-95.4340,29.8110],[-95.3980,29.8155],
    [-95.3560,29.8150],[-95.3180,29.8060],[-95.2980,29.7830],[-95.2940,29.7480],[-95.2990,29.7130],
    [-95.3180,29.6870],[-95.3560,29.6740],[-95.3980,29.6720],[-95.4330,29.6790],[-95.4560,29.6970],
    [-95.4640,29.7180],[-95.4640,29.7330],
]
HOODS = [
    ("Downtown", -95.3660, 29.7610), ("The Heights", -95.4110, 29.7955), ("Montrose", -95.3985, 29.7385),
    ("Midtown", -95.3740, 29.7395), ("EaDo", -95.3420, 29.7460), ("Rice Village", -95.4290, 29.7140),
    ("Museum District", -95.3960, 29.7215), ("Third Ward", -95.3530, 29.7235), ("Galleria", -95.4740, 29.7440),
    ("Spring Branch", -95.5030, 29.8040), ("Bellaire", -95.4680, 29.7000), ("Sharpstown", -95.5320, 29.6960),
    ("Garden Oaks", -95.4230, 29.8220), ("Sunnyside", -95.3720, 29.6700), ("Denver Harbor", -95.3080, 29.7810),
]

features = []
for name, pts in WATER.items():
    features.append({"type": "Feature", "properties": {"kind": "bayou", "name": name},
                     "geometry": {"type": "LineString", "coordinates": pts}})
features.append({"type": "Feature", "properties": {"kind": "loop", "name": "610 Loop"},
                 "geometry": {"type": "LineString", "coordinates": LOOP610}})
for name, lon, lat in HOODS:
    features.append({"type": "Feature", "properties": {"kind": "neighborhood", "name": name},
                     "geometry": {"type": "Point", "coordinates": [lon, lat]}})

basemap = {
    "type": "FeatureCollection",
    "bbox": [-95.615, 29.600, -95.255, 29.880],
    "features": features,
}
with open(DATA / "houston_basemap.geojson", "w") as fh:
    json.dump(basemap, fh)

print(f"wrote {len(rows)} shops, {len(features)} basemap features")
