"""Build a synthetic "external reviews" dataset for the augmentation widget.

The point of query augmentation is joining in a field the base table never
had. donut_shops.csv has no review text -- this script invents a small,
plausible review-site style dataset (reviewer, stars, snippet, date) keyed by
shop_id, standing in for a Yelp/TripAdvisor-style source the widget "joins"
against when you click a shop.

Run once:  python build/make_reviews.py
Writes:    data/houston_donut_reviews.csv
"""
from __future__ import annotations

import csv
import random
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

FIRST = ["Maria", "James", "Priya", "Alex", "Devon", "Grace", "Marcus", "Lena",
         "Omar", "Sofia", "Tyler", "Aisha", "Nate", "Carmen", "Jordan", "Wei"]
LAST_INITIAL = list("ABCDEFGHJKLMNPRSTW")

POSITIVE = [
    "Still warm when I got there, worth the drive.",
    "Glaze was perfect, not too sweet. Will be back.",
    "Best {sig} in this part of town, hands down.",
    "Friendly staff, fast line even on a Saturday.",
    "Small shop but the quality is way above average.",
    "Ordered a dozen for the office, gone in ten minutes.",
    "The {sig} sold me. Genuinely great texture.",
    "Consistent every time I've gone. That counts for a lot.",
]
MIXED = [
    "Good donuts, but the wait can run long on weekends.",
    "Solid choice if you're already in {hood}.",
    "A little pricier than I expected, still tasty though.",
    "Hit or miss depending on the day -- get there early.",
    "Fine for a quick stop, nothing that stands out.",
]
NEGATIVE = [
    "Ran out of the {sig} by 9am, kind of a letdown.",
    "Parking near {hood} was rough, donuts were just okay.",
    "Service was slow for how small the menu is.",
]

random.seed(7)

def make_review(shop, i):
    r = shop["rating"] + random.uniform(-0.6, 0.3)
    stars = max(1, min(5, round(r)))
    if stars >= 4:
        template = random.choice(POSITIVE)
    elif stars == 3:
        template = random.choice(MIXED)
    else:
        template = random.choice(NEGATIVE)
    text = template.format(sig=shop["signature_donut"], hood=shop["neighborhood"])
    name = f"{random.choice(FIRST)} {random.choice(LAST_INITIAL)}."
    month = random.randint(1, 9)
    day = random.randint(1, 28)
    return {
        "shop_id": shop["shop_id"],
        "review_id": f"{shop['shop_id']}-{i}",
        "reviewer": name,
        "stars": stars,
        "date": f"2026-{month:02d}-{day:02d}",
        "text": text,
    }


def main() -> None:
    shops = pd.read_csv(DATA / "houston_donut_shops.csv").to_dict(orient="records")
    rows = []
    for shop in shops:
        n = random.choice([2, 2, 3])
        for i in range(1, n + 1):
            rows.append(make_review(shop, i))

    out = DATA / "houston_donut_reviews.csv"
    with open(out, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {len(rows)} reviews across {len(shops)} shops -> {out}")


if __name__ == "__main__":
    main()
