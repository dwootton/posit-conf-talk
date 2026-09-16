"""Regenerate the slide-13 "augmentation" widget around a real external join.

The original augment.jsx computed distance/walk-time from a draggable marker
-- that's a client-side calculation, not really "an external source," which
is what query augmentation is supposed to illustrate. This version clicks a
shop and pulls in review text that donut_shops.csv never had, joined in from
a separate reviews source (data/houston_donut_reviews.csv) keyed by shop_id.

    python build/make_augment_v2.py
"""
from __future__ import annotations

import json
import time

import pandas as pd
import vibe_widget as vw

import make_widgets as mw  # noqa: E402  (sets the headless env + token budget)

WIDTH, HEIGHT = mw.WIDE

PROMPT = mw.build_preamble("augment").format(w=WIDTH, h=HEIGHT) + """Query augmentation: the interaction pulls in a field the base table does not have -- review text -- from a separate external source, joined in only when you ask for it.
REVIEWS: the `reviews` input is a list of review records from an external review source (not part of `data`), one row per review, columns: shop_id, review_id, reviewer, stars (1-5), date (YYYY-MM-DD), text. Several reviews exist per shop_id.
Two-column layout: the map fills the left 58% of the width at full height; a panel fills the right side; a 2px #1a1a1a vertical rule separates them.
Every shop is a plain circle on the map, filled #6b7280 with a thin #1a1a1a outline, radius 5; clicking one selects it, filling it #ea580c and enlarging it to radius 8; only one shop is selected at a time. Hovering any shop (selected or not) shows a card tooltip with just its name and neighborhood.
Panel when nothing is selected: a single centered line of text inviting you to click a shop on the map to pull its reviews -- nothing else.
Panel when a shop is selected: the shop's name large at the top, then one monospace line with its neighborhood and its own rating (from `data`, e.g. "Montrose &middot; 4.7"); below that a clearly separate section -- visually distinguished as coming from elsewhere (its own small uppercase monospace label such as "REVIEWS", set apart by a rule or a different background tint) -- listing every review for that shop_id from the `reviews` input, most recent first, each showing the reviewer name, that review's own star rating (as filled/outline star glyphs or a compact "4/5" style readout, not the shop's aggregate rating), its date, and its text. If a shop has no reviews, that section reads "No reviews yet" in muted text. Selecting a different shop swaps the whole reviews section instantly; nothing is fetched over the network, `reviews` is already provided, but the visual and structural separation should make clear this content lives outside `data` and only appears once you ask for a specific shop."""


def main() -> None:
    df = pd.read_csv(mw.ROOT / "data" / "houston_donut_shops.csv")
    reviews = pd.read_csv(mw.ROOT / "data" / "houston_donut_reviews.csv").to_dict(orient="records")
    basemap_image = mw._basemap_data_url()

    vw.config(model=mw.MODEL, theme="vibe-widgets", execution="auto")
    print(f"== augment (v2, reviews join) ({WIDTH}x{HEIGHT}) via {mw.MODEL}", flush=True)
    t0 = time.time()
    widget = vw.create(
        PROMPT,
        df,
        inputs={"basemap_image": basemap_image, "reviews": reviews},
        theme="vibe-widgets",
        display=False,
        cache=False,
    )
    status = mw.wait_for(widget, "augment")
    dt = time.time() - t0
    code = widget.code or ""
    if not code:
        raise SystemExit(f"!! augment {status} after {dt:.0f}s: {widget.error_message}")
    if status != "ready":
        print(f"?? augment finished with status {status}; keeping generated code ({widget.error_message[:160]})", flush=True)
    mw.write_outputs("augment", code, PROMPT, mw.WIDE, dt, extra_inputs={"reviews": "<input>"})
    print(f"ok augment: {len(code)} chars in {dt:.0f}s", flush=True)


if __name__ == "__main__":
    main()
