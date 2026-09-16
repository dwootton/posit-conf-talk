"""Revise an already generated deck widget with vw.edit().

    python build/revise_widgets.py <name> "<what to change>"
    python build/revise_widgets.py <name> --fix-projection

Loads widgets/src/<name>.vw, asks the model for the change, and rewrites
build/out/<name>.jsx, build/out/<name>.meta.json and widgets/src/<name>.vw
(the previous version is kept as <name>.prev.jsx). Re-export afterwards with
build/export.cjs.
"""
from __future__ import annotations

import json
import shutil
import sys
import time

import pandas as pd
import vibe_widget as vw

sys.argv, _saved = [sys.argv[0]], sys.argv
import make_widgets as mw  # noqa: E402  (sets the headless env + token budget)
sys.argv = _saved

BASEMAP_AND_POINTER_RULES = (
    "Two changes to make everywhere in this file, on top of whatever else this request asks for:\n"
    "\n"
    "1) REAL BASEMAP. A new input `basemap_image` is provided: a data: URL (JPEG) of a real, "
    "already-styled Houston street map -- roads, water, and neighborhood names are baked into the "
    "image itself. Its corners are " + mw.BASEMAP_BOUNDS + ". Read it with model.get(\"basemap_image\"). "
    "Render it FIRST, as a single SVG <image href={basemapImage}>: project the two bbox corners above "
    "with the SAME d3 projection used for the shop marks to get its on-screen rectangle (x, y, width, "
    "height from the two projected points), and set preserveAspectRatio=\"none\" so it exactly fills "
    "that rectangle -- this is what keeps the image aligned with the marks. Then DELETE every bit of code "
    "that draws your own roads, water, bayous, the 610 loop, neighborhood-name text labels, a background "
    "grid, or any bounding/frame circle around the whole map -- the image already shows all of that, and "
    "drawing your own on top would duplicate and clash with it. If the `basemap` GeoJSON input still "
    "exists in the code, remove every use of it along with any now-dead helper code, styles, or legend "
    "entries that only existed to describe those removed line-drawn elements. Keep every shop mark, "
    "overlay (target, search region, brush, connecting lines), tooltip and panel exactly as they are, "
    "just drawn on top of the new image instead of the old lines.\n"
    "\n"
    "2) POINTER MATH SAFETY. This widget renders inside an iframe inside a scaled presentation slide, "
    "which breaks two common shortcuts. Find every place in this file that converts a mouse/pointer "
    "position into a map coordinate and fix it if needed: NEVER use d3.drag's `event.x`/`event.y`, and "
    "NEVER use `d3.pointer(event, node)` -- both rely on SVGElement.getScreenCTM(), which does not "
    "account for an ancestor iframe living inside a CSS-transformed (scaled) page and silently returns "
    "the wrong offset there, producing a drag that visibly lags/jumps away from the cursor. Instead, "
    "always compute the position by hand: read the svg element's own `getBoundingClientRect()` and "
    "subtract its `left`/`top` from the event's `clientX`/`clientY` (inside a d3.drag `.on(\"drag\", ...)` "
    "handler, read those off `event.sourceEvent.clientX`/`event.sourceEvent.clientY`, not off `event.x`/"
    "`event.y`). If there is a rectangular brush/marquee-select interaction implemented with d3.brush(), "
    "replace it with a hand-rolled version using plain pointerdown/pointermove/pointerup listeners and an "
    "SVG <rect> you draw yourself, computing every corner the same getBoundingClientRect way -- d3.brush() "
    "has the identical getScreenCTM problem internally. Keep the resulting interaction pixel-identical to "
    "how it behaves today; this is a coordinate-math fix only, not a redesign."
)

FIX_PROJECTION = (
    "Bug fix only. The map collapses every mark to a single point because the projection is fitted "
    "with fitExtent on a Polygon built from the bbox; d3-geo reads that ring's winding as the whole "
    "sphere. Replace that polygon with a MultiPoint of the two bbox corners: "
    'fitExtent(extent, { type: "MultiPoint", coordinates: [[-95.615, 29.600], [-95.255, 29.880]] }). '
    "Keep every other line, style, label and interaction exactly as it is."
)


def main(name: str, request: str) -> int:
    spec = mw.SPECS[name]
    w, h = spec["size"]
    df = pd.read_csv(mw.ROOT / "data" / "houston_donut_shops.csv")
    # Hand the widget back exactly the inputs it was generated with, or the edit
    # drops whatever it read from the missing one: `augment` joins `reviews`, and
    # the four non-map widgets never had a basemap to begin with.
    inputs: dict = {}
    if name not in mw.NO_MAP:
        inputs["basemap_image"] = mw._basemap_data_url()
    reviews_path = mw.ROOT / "data" / "houston_donut_reviews.csv"
    if name == "augment" and reviews_path.exists():
        inputs["reviews"] = pd.read_csv(reviews_path).to_dict(orient="records")
    vw.config(model=mw.MODEL, theme="vibe-widgets", execution="auto")

    src = mw.VW_DIR / f"{name}.vw"
    base = vw.load(src, approval=False, display=False)
    print(f"== revising {name} from {src.name} ({len(base.code)} chars) via {mw.MODEL}", flush=True)
    t0 = time.time()
    widget = vw.edit(request, base, data=df, inputs=inputs,
                     theme="vibe-widgets", display=False, cache=False)
    status = mw.wait_for(widget, name)
    dt = time.time() - t0
    code = widget.code or ""
    if not code or code == base.code:
        print(f"!! {name} {status} after {dt:.0f}s: {widget.error_message}", flush=True)
        return 1
    if status != "ready":
        print(f"?? {name} finished with status {status}; keeping revised code", flush=True)
    shutil.copy(mw.OUT / f"{name}.jsx", mw.OUT / f"{name}.prev.jsx")
    prompt = json.loads((mw.OUT / f"{name}.meta.json").read_text())["prompt"] + "\n\nREVISION: " + request
    extra = {"reviews": "<input>"} if "reviews" in inputs else None
    mw.write_outputs(name, code, prompt, (w, h), dt, extra_inputs=extra)
    print(f"ok {name}: {len(code)} chars in {dt:.0f}s", flush=True)
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    name, req = sys.argv[1], " ".join(sys.argv[2:])
    if req == "--fix-projection":
        req = FIX_PROJECTION
    sys.exit(main(name, req))
