"""Generate every demo widget in this deck with vibe-widget.

    export OPENROUTER_API_KEY=...
    python build/make_widgets.py            # all six widgets
    python build/make_widgets.py wait spice # just some

Each widget is one vw.create() call over data/houston_donut_shops.csv (plus a
GeoJSON basemap input). The generated code is written to build/out/<name>.jsx,
the portable bundle to widgets/src/<name>.vw (reload it with vw.load()), and
build/export.cjs then turns the code into the self-contained iframe page the
slides embed.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import base64

import pandas as pd
import vibe_widget as vw
from vibe_widget.llm.agentic_agents import AgentSdkOrchestrator
from vibe_widget.utils.serialization import clean_for_json

# Headless: skip the notebook-side esbuild step (this deck bundles the code itself,
# see export.cjs) and give the model room for a full widget in one response.
os.environ.setdefault("VIBE_DISABLE_BUNDLING", "1")
AgentSdkOrchestrator._run_agent_loop.__kwdefaults__["max_tokens"] = 49152

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "build" / "out"
VW_DIR = ROOT / "widgets" / "src"
OUT.mkdir(parents=True, exist_ok=True)
VW_DIR.mkdir(parents=True, exist_ok=True)

MODEL = os.environ.get("VW_MODEL", "google/gemini-3.1-pro-preview")
TIMEOUT_S = 15 * 60

SMALL = (352, 400)   # slide 6: three widgets across
WIDE = (814, 548)    # slides 11-13: one widget beside the loop rail

def _basemap_data_url() -> str:
    """The real Houston basemap (styled OSM tiles) as a data: URL for the model."""
    jpg = (Path(__file__).resolve().parents[1] / "data" / "houston_basemap.jpg").read_bytes()
    return "data:image/jpeg;base64," + base64.b64encode(jpg).decode("ascii")


BASEMAP_BOUNDS = "NW corner [lon -95.615, lat 29.880], SE corner [lon -95.255, lat 29.600]"

# Widgets that are NOT maps: no basemap_image input, no map-drawing rules.
NO_MAP: set[str] = {"orthogonal", "sel_filter", "sel_highlight", "sel_count"}

DATA_SECTION = "DATA: the `data` input is a list of shops, one row per shop, with columns: shop_id, name, neighborhood, latitude, longitude, rating (1-5), review_count, price_level (1-3), weekday_wait_min, weekend_wait_min, pumpkin_spice (boolean), open_late (boolean), signature_donut."

MAP_SECTION = """
BASEMAP: the `basemap_image` input is a data: URL (JPEG) of a real, already-styled street map of Houston -- roads, water, and neighborhood names are all baked into the image. Its corners are """ + BASEMAP_BOUNDS + """.

MAP RULES: render the map as one inline SVG with d3 (import * as d3 from "https://esm.sh/d3@7"). Build the projection with d3.geoMercator().fitExtent(extent, {{type: "MultiPoint", coordinates: [[-95.615, 29.600], [-95.255, 29.880]]}}) so the whole bbox is visible inside the map area; never build a Polygon from the bbox for fitting (its ring winding can make d3-geo fit the whole sphere and collapse every mark to one point). Draw the basemap image FIRST as a single SVG <image href={{basemapImage}}>: project the two bbox corners above with that same projection to get its on-screen rectangle (x, y, width, height from the two projected points), and set preserveAspectRatio="none" so it exactly fills that rectangle -- this is what keeps the image aligned with the shop marks. Do not draw your own roads, water, bayous, the 610 loop, neighborhood-name labels, a grid, or any bounding circle or frame around the map -- the image already shows all of that; drawing your own on top of it would duplicate and clash with it. Draw only the shop marks, the interaction's own overlays (a target, a search region, a brush, connecting lines) and tooltips on top of the image. Distances are great-circle miles from the haversine formula. Position the tooltip inside the map bounds."""

POINTER_SECTION = """
POINTER RULES (do this exactly -- the widget renders inside an iframe inside a scaled presentation slide, which breaks the usual shortcuts): whenever you convert a mouse/pointer position into a screen coordinate (dragging a marker, brushing a selection, positioning a tooltip), NEVER use d3.drag's `event.x`/`event.y`, and NEVER use `d3.pointer(event, node)`. Both rely on SVGElement.getScreenCTM(), which does not account for an ancestor iframe living inside a CSS-transformed (scaled) page and silently returns the wrong offset there. Instead, always compute the position by hand: get the svg element's own `getBoundingClientRect()` once (cache it in a ref, refresh on resize) and subtract its `left`/`top` from the raw event's `clientX`/`clientY` (for a d3.drag handler, read them off `event.sourceEvent.clientX`/`event.sourceEvent.clientY`). If a rectangular brush/marquee-select interaction is needed, implement it by hand with plain pointerdown/pointermove/pointerup listeners and an SVG <rect> you draw yourself (computing corners the same getBoundingClientRect way) -- do not use d3.brush(), which has the identical getScreenCTM problem internally."""

LAYOUT_COPY_SECTION = """
LAYOUT RULES: the widget is exactly {w}x{h} pixels, background #f2f0e9, no scrollbars, no responsiveness to window size. Fonts: 'Space Grotesk', sans-serif for text and 'JetBrains Mono', monospace for numbers, labels and small caps; both are provided by the host, do not load fonts.

COPY RULES (strict): no title or heading, no explanatory paragraphs, no instructions longer than one short line, no code or SQL readouts, no placeholder text, no emoji, no decorative badges, no record counts unless they are the result of the interaction. Every number shown is computed from the data.

"""


def build_preamble(name: str) -> str:
    """Assemble the shared instruction preamble for a given widget name."""
    parts = ["Houston donut shops.\n", DATA_SECTION]
    if name not in NO_MAP:
        parts.append(MAP_SECTION)
    parts.append(POINTER_SECTION)
    parts.append(LAYOUT_COPY_SECTION)
    return "\n".join(parts)

SPECS: dict[str, dict] = {
    # ---- slide 6: the data, three ways (one hypothesis each) --------------
    "wait": dict(size=SMALL, prompt="""Hypothesis: what about wait times?
Show every shop as a filled circle whose area encodes weekend_wait_min (radius 3 to 11 px), color #0f766e with a thin #1a1a1a outline and fill opacity 0.85 so overlaps read. Label the five longest waits with the shop name in small text placed to avoid the marks. Hovering any shop shows a card tooltip with name, neighborhood, weekend wait in minutes, rating. One small size legend (circles for 10, 25 and 40 minutes) in the bottom-left corner. Nothing else on the canvas."""),

    "close": dict(size=SMALL, prompt="""Hypothesis: where is close?
Place a "you are here" marker at longitude -95.3848, latitude 29.7468, drawn as a white circle with a #1a1a1a outline and a dark center dot. Draw 1 and 2 mile rings as thin dashed circles around it. Draw every shop as a circle: the five nearest shops by haversine distance are filled #6b3fa0 with a white outline, connected to the marker by a thin #6b3fa0 line and labeled with shop name and distance in miles (two decimals); every other shop is a small muted hollow circle. The marker is draggable anywhere on the map (pointer events, live recompute while dragging). Hover on a shop shows a card tooltip with name, neighborhood, distance in miles."""),

    "spice": dict(size=SMALL, prompt="""Hypothesis: but do they have pumpkin spice?
Shops where pumpkin_spice is true are filled #9f2d1f with a thin #1a1a1a outline and labeled with the shop name in small text; the others are small muted hollow circles. One compact toggle switch in the top-right corner labeled "pumpkin spice only" hides the shops without it while on. Hover on a shop shows a card tooltip with name, neighborhood, signature_donut, rating."""),

    # ---- slide 3: a genuinely interactive chart that does NOT answer any of
    # the three hypotheses above (no location, no wait time, no pumpkin spice) --
    "orthogonal": dict(size=SMALL, prompt="""This widget is a counterexample, not an answer to any hypothesis. It must not use latitude, longitude, weekend_wait_min, weekday_wait_min, or pumpkin_spice anywhere -- not in the marks, not in the tooltip, not in a label. It has no map and no basemap image.
A scatter plot: x axis is review_count (log scale), y axis is rating (linear, domain 3.8 to 5.0). One circle per shop, radius 5, fill #6b7280 with a thin #1a1a1a outline and fill-opacity 0.8. Draw plain axes with a handful of ticks and small monospace tick labels, and short axis titles ("REVIEWS" / "RATING") in small uppercase monospace. Hovering a circle raises it, recolors it #f97316, and shows a card tooltip with the shop name and its exact rating and review count. Clicking a price_level swatch in a small legend (1, 2, or 3 "$" chips in the top-right) filters the scatter to that price level only; clicking the same swatch again clears the filter. Nothing else -- no title, no explanatory text, no controls beyond the legend chips."""),

    # ---- slides 11-13: the three stages of the loop -----------------------
    "parameterize": dict(size=WIDE, prompt="""Query parameterization: the interaction sets the parameters of a fixed query (a center and a radius).
Two-column layout: the map fills the left 58% of the width at full height; a control panel fills the right side; a 2px #1a1a1a vertical rule separates them.
The search region is a circle around a target. The target is a crosshair marker; dragging anywhere on the map moves it (pointer drag with live updates) and arrow keys nudge it. The radius comes from a slider in the panel (0.25 to 4 miles, step 0.05, default 0.8) whose current value is shown beside it as e.g. "0.80 mi". Draw the region as a circle filled #3f8bdb at low opacity with a dashed #3f8bdb outline. Shops inside the region are filled #3f8bdb with a white outline; shops outside are small muted hollow circles.
Panel, top to bottom: the radius slider row; four stat tiles in a 2x2 grid computed from the shops inside the region: shops in range (count), mean rating (two decimals), mean weekend wait (rounded minutes), most common price level shown as $ signs; then a ranked list of up to five shops inside the region sorted by distance, each with name, neighborhood, and distance in miles (two decimals). If no shop is inside, the list is one short line: "No shops in range". Hover on a shop shows a card tooltip with name, neighborhood, distance to the target."""),

    "structure": dict(size=WIDE, prompt="""Query structuring: the interaction constructs new groups of shops that the table never had, and compares them.
Two-column layout: the map fills the left 58% of the width at full height; a panel fills the right side; a 2px #1a1a1a vertical rule separates them.
Preset on load: shops in The Heights, Garden Oaks, Washington Ave, Near Northside and Spring Branch are Group A; shops in Montrose, Midtown, Museum District, Rice Village and Upper Kirby are Group B; the rest are unassigned. Group A marks are filled #478d4b, Group B marks are filled #9f2d1f (both with a white outline); unassigned shops are small muted hollow circles.
Panel top row: buttons "Group A", "Group B", "Clear" pick the active assignment (the active button is filled with its group color; Clear removes the assignment), plus "Undo" and "Reset" (back to the preset). Assign by clicking a shop, or by dragging a rectangular brush on the map (draw the brush as a dashed rectangle while dragging); every shop inside the brush gets the active assignment on release.
Panel below the buttons: one card per group with the group name in its color, shop count, mean weekend wait (one decimal), median weekend wait, mean rating; under the two cards a single horizontal bar chart with two bars comparing the two mean weekend waits (bars in the group colors, values labeled); then one line of text such as "Group A waits 9.4 min longer" naming whichever group is longer, or "Assign shops to both groups" if either group is empty. Hover on a shop shows a card tooltip with name, neighborhood, weekend wait, and its group."""),

    "augment": dict(size=WIDE, prompt="""Query augmentation: the interaction computes values the dataset does not contain (distance and walking time from wherever the user stands).
Two-column layout: the map fills the left 58% of the width at full height; a panel fills the right side; a 2px #1a1a1a vertical rule separates them.
A "you are here" marker (white circle, #1a1a1a outline, dark center dot) starts at longitude -95.3848, latitude 29.7468. Dragging anywhere on the map moves it (pointer drag with live updates) and arrow keys nudge it. For every shop compute the haversine distance in miles and the walking time in minutes at 3 mph. Draw 1, 2 and 3 mile rings as thin dashed circles around the marker. The nearest shop is filled #ea580c with a white outline and joined to the marker by a dashed #ea580c line; all other shops are small muted circles.
Panel: a card for the nearest shop with its name large, then one monospace line with neighborhood, distance (two decimals) and walking minutes; below it a ranked list of the five closest shops with name, neighborhood, distance in miles and walk time in minutes; one "Reset" button returns the marker to its start. Hover on a shop shows a card tooltip with name, distance and walk time. Updates are instant; no scripted animation."""),
}


# ===========================================================================
# Chapter 2 (Visuals) and Chapter 3 (Input).
#
# Two families of widgets where the *point* is the comparison between them, so
# they deliberately share one base: the same map, the same shops, the same
# readout. Only the thing under discussion differs -- what the selection does
# to the visuals (sel_*), how the selection is entered (in_*), and how much of
# the selection is left on screen as an adjustable object (re_*).
# ===========================================================================

# Every brush widget on slides 16-18 answers the same question ("how many shops
# are in this area?") with the same marks and the same readout.
BRUSH_BASE = """The task is always the same: select a rectangular area of the map and see how many shops are inside it.
Shops inside the current selection are filled #ea580c with a white outline; every other shop is a small muted hollow circle. In the top-left corner of the map, one readout in monospace: the number of selected shops on its own line in large type, and under it the mean weekend wait of the selected shops in minutes (one decimal). When nothing is selected the readout reads 0 and a dash.
One short line of instruction text, at most six words, sits in the bottom-left corner. There is no other text, no panel, no buttons except where the spec below asks for one."""


# Slide 16: three visual responses to one selection. They share a chart so the
# row reads as one experiment -- only the response differs, never the substrate.
SCATTER_BASE = """All three widgets on this slide draw the same chart and must match each other exactly: a scatter plot of the shops, x axis review_count on a LINEAR scale (not log) starting at 0, y axis weekend_wait_min on a linear scale. One circle per shop, radius 5, with a thin #1a1a1a outline. Plain axes with a handful of ticks and small monospace tick labels, short axis titles "REVIEWS" and "WEEKEND WAIT / MIN" in small uppercase monospace, and enough room at the left and bottom for them. No gridlines, no trend line, no legend, no annotation layer.
One shop has several times everyone else's review count, so by default the other shops crowd into the left third of the plot. That is intentional -- do not clip it, drop it, or switch the axis to a log scale to hide it.
"""

SPECS.update({
    # ---- chapter 2, selection: three different consequences of one select --
    "sel_filter": dict(size=SMALL, prompt=SCATTER_BASE + """Selection drives removal: what you select is taken off the chart, and the chart re-fits itself around what is left.
Drag a rectangular region anywhere over the plot using plain pointer events (pointerdown, pointermove, pointerup) and an SVG rect you draw yourself. While the pointer is down, draw the region filled #ea580c at low opacity with a 2px dashed #ea580c outline, and fill the circles inside it #ea580c so it is clear what is about to go.
On release, every circle inside the region is REMOVED from the chart -- gone, not greyed and not shrunk in place -- and BOTH AXES IMMEDIATELY RESCALE to fit only the shops that remain, animating over about 400 ms so the surviving points visibly spread out into the space the removed ones were taking up. The removed circles fade out as they go, and the region itself disappears on release. Dragging again removes more shops on top of that.
A small square-cornered "reset" button in the top-right corner brings every removed shop back and rescales the axes back; show it only once something has been removed.
Circles are filled #6b7280 at fill-opacity 0.8. Hovering a circle shows a card tooltip with name, neighborhood, reviews, weekend wait."""),

    "sel_highlight": dict(size=SMALL, prompt=SCATTER_BASE + """Selection drives highlighting: the selected shops change colour, and nothing else about the chart changes at all.
Down the left side, a compact list of the five neighborhoods with the most shops, one row each, in small monospace, in a column about 90px wide with the plot filling the rest. Clicking a row selects it (that row gets a 2px #1a1a1a left bar and bold text); clicking it again deselects it; exactly one can be selected at a time.
With nothing selected every circle is filled #6b7280 at fill-opacity 0.75. With a neighborhood selected, its shops become filled #0f766e and every other circle becomes filled #cbd5e1; the fill colour transitions over about 200 ms.
NOTHING ELSE CHANGES. The axes never move or rescale. No circle changes radius, position or outline. No circle is ever removed. And at no point is any rule, reference line, mean marker, average line, summary number, difference readout, count, callout, label or annotation of any kind drawn anywhere in the widget. Fill colour is the only thing the selection is allowed to change.
Hovering a circle shows a card tooltip with name, neighborhood, reviews, weekend wait."""),

    "sel_count": dict(size=SMALL, prompt=SCATTER_BASE + """Selection constructs a new element: the selection becomes a mark on the chart, and that mark carries numbers the chart never showed.
Drag a rectangular region anywhere over the plot using plain pointer events (pointerdown, pointermove, pointerup) and an SVG rect you draw yourself. While dragging and after release the region stays drawn, filled #ea580c at low opacity with a 2px dashed #ea580c outline. Dragging again starts a new region; a click without movement clears it. The axes never rescale.
Pinned to the region's top-left corner and moving with it -- part of the region, never a side panel -- draw a square-cornered summary card about 132px wide (bone fill, 2px #1a1a1a border, hard 3px offset shadow) containing, top to bottom: the number of shops inside the region in large monospace type, with "shops" (or "shop" when the count is exactly 1) in small uppercase monospace under it; a thin divider; then two compact comparison rows, one for mean weekend wait in minutes to one decimal and one for mean review count rounded to a whole number, each row labelled in small uppercase monospace and giving the value inside the region, the value for every shop outside it, and the signed difference between them. If nothing is inside the region the comparison rows read a dash. The card keeps itself inside the plot area.
Circles inside the region are filled #ea580c with a white outline; the rest are filled #cbd5e1 at fill-opacity 0.7. With no region at all, every circle is filled #6b7280 at fill-opacity 0.8.
One short line in the bottom-left corner: "drag a region". Nothing else."""),

    # ---- chapter 3, input: one selection, three ways to enter it ------------
    "in_drag": dict(size=SMALL, prompt=BRUSH_BASE + """
INPUT METHOD: press down anywhere on the map, drag, and release -- the rectangle spans from the pointerdown point to the pointerup point. While the pointer is down the rectangle updates continuously. Releasing keeps the rectangle on screen. Starting a new drag replaces it.
Draw the rectangle filled #ea580c at low opacity with a 2px dashed #ea580c outline.
The instruction line reads "drag to select"."""),

    "in_corner": dict(size=SMALL, prompt=BRUSH_BASE + """
INPUT METHOD: two separate clicks, no dragging at all. The first click sets one corner of the rectangle; the second click sets the opposite corner and completes it. A third click starts over from a new first corner.
After the first click, draw a small #ea580c cross at that corner and, while the pointer moves, a preview rectangle from that corner to the current pointer position, outlined with a 2px dashed #ea580c line and no fill. After the second click the rectangle is complete: filled #ea580c at low opacity with a 2px dashed #ea580c outline.
The instruction line reads "click two corners" before the first click and "click the opposite corner" between the two clicks."""),

    "in_center": dict(size=SMALL, prompt=BRUSH_BASE + """
INPUT METHOD: one click sets the CENTRE of the rectangle, which always keeps a fixed size (about 30% of the map's width and 30% of its height). Clicking somewhere else moves the whole rectangle to centre on the new point. There is no dragging.
Draw the rectangle filled #ea580c at low opacity with a 2px dashed #ea580c outline, plus a small #ea580c cross at its centre point. The rectangle animates to its new position over about 180 ms when the centre moves, and is clamped so it never leaves the map area.
The instruction line reads "click to place"."""),

    # ---- chapter 3, reification: how much of the selection stays as an object
    "re_none": dict(size=SMALL, prompt=BRUSH_BASE + """
REIFICATION LEVEL: none. The rectangle is drawn ONLY while the pointer is held down. Press, drag, and the rectangle follows the pointer; the moment the pointer is released the rectangle disappears completely. The selection it made still holds -- the shops it covered stay filled #ea580c and the readout keeps their count -- but there is nothing on screen showing where the selection was or any way to adjust it without starting over. Drawing again replaces the selection.
While visible, draw the rectangle filled #ea580c at low opacity with a 2px dashed #ea580c outline.
The instruction line reads "drag to select"."""),

    "re_move": dict(size=SMALL, prompt=BRUSH_BASE + """
REIFICATION LEVEL: the selection persists as a movable object. Press, drag and release on empty map to draw the rectangle; on release it STAYS on screen, filled #ea580c at low opacity with a 2px solid #ea580c outline.
Pressing inside the existing rectangle and dragging TRANSLATES the whole rectangle (its size does not change) and the selection and readout update live as it moves; the cursor over the rectangle is "move". Pressing outside it and dragging draws a new rectangle instead. The rectangle is clamped inside the map area while being moved.
The instruction line reads "drag to select, drag it to move"."""),

    "re_handles": dict(size=SMALL, prompt=BRUSH_BASE + """
REIFICATION LEVEL: the selection persists as a fully manipulable object. Press, drag and release on empty map to draw the rectangle; on release it STAYS on screen, filled #ea580c at low opacity with a 2px solid #ea580c outline.
The rectangle carries four corner handles, drawn as 9px bone squares with a 2px #1a1a1a border, one at each corner. Dragging a handle resizes the rectangle from that corner, with the opposite corner pinned; the rectangle stays valid if dragged past the opposite corner. Dragging the rectangle's interior translates the whole rectangle without changing its size. Dragging on empty map draws a new rectangle. The selection and the readout update live during every one of these gestures, and the rectangle is clamped inside the map area.
Cursors: "nwse-resize"/"nesw-resize" over the matching handles, "move" over the interior.
The instruction line reads "drag the box or its corners"."""),
})


def write_outputs(name: str, code: str, description: str, size: tuple[int, int],
                  seconds: float, model: str = MODEL, extra_inputs: dict | None = None) -> None:
    w, h = size
    (OUT / f"{name}.jsx").write_text(code)
    (OUT / f"{name}.meta.json").write_text(json.dumps({
        "name": name, "width": w, "height": h, "model": model,
        "prompt": description, "seconds": round(seconds, 1), "code_chars": len(code),
    }, indent=2))
    inputs_signature = {"data": "<input>"}
    if name not in NO_MAP:
        inputs_signature["basemap_image"] = "<input>"
    inputs_signature.update(extra_inputs or {})
    # same schema VibeWidget.save() writes, so vw.load("widgets/src/<name>.vw") works
    bundle = {
        "version": "1.0", "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "description": description, "code": code, "outputs": {},
        "inputs_signature": inputs_signature,
        "theme": {"name": "vibe-widgets", "description": vw.themes.get("vibe-widgets").description
                  if hasattr(vw.themes, "get") else None},
        "components": [], "model": model, "audit": None,
        "save_inputs": {"embedded": False, "values": {}},
        "prompt_history": [{"prompt": description, "source": "create"}],
    }
    (VW_DIR / f"{name}.vw").write_text(json.dumps(bundle, indent=2, ensure_ascii=True))


def wait_for(widget, name: str) -> str:
    t0 = time.time()
    last_log = 0
    while time.time() - t0 < TIMEOUT_S:
        status = widget.status
        logs = list(widget.logs or [])
        if len(logs) > last_log:
            for line in logs[last_log:]:
                print(f"  [{name}] {line}", flush=True)
            last_log = len(logs)
        if status in ("ready", "error", "blocked"):
            return status
        time.sleep(1.0)
    return "timeout"


def main(names: list[str]) -> int:
    df = pd.read_csv(ROOT / "data" / "houston_donut_shops.csv")
    basemap_image = _basemap_data_url()

    # the exact payload the widget sees, for the standalone export
    reviews_path = ROOT / "data" / "houston_donut_reviews.csv"
    reviews = pd.read_csv(reviews_path).to_dict(orient="records") if reviews_path.exists() else []
    # atomic: several of these runs go in parallel (one cwd each) and would
    # otherwise interleave their writes into the same two shared files.
    for fname, payload in (("data.json", clean_for_json(df.to_dict(orient="records"))),
                           ("inputs.json", {"basemap_image": basemap_image, "reviews": reviews})):
        tmp = OUT / f"{fname}.{os.getpid()}.tmp"
        tmp.write_text(json.dumps(payload))
        os.replace(tmp, OUT / fname)

    vw.config(model=MODEL, theme="vibe-widgets", execution="auto")
    failures = 0
    for name in names:
        spec = SPECS[name]
        w, h = spec["size"]
        description = build_preamble(name).format(w=w, h=h) + spec["prompt"]
        widget_inputs = {} if name in NO_MAP else {"basemap_image": basemap_image}
        print(f"== {name} ({w}x{h}) via {MODEL}", flush=True)
        t0 = time.time()
        widget = vw.create(
            description,
            df,
            inputs=widget_inputs,
            theme="vibe-widgets",
            display=False,
            cache=False,
        )
        status = wait_for(widget, name)
        dt = time.time() - t0
        code = widget.code or ""
        if not code:
            failures += 1
            print(f"!! {name} {status} after {dt:.0f}s: {widget.error_message}", flush=True)
            continue
        if status != "ready":
            print(f"?? {name} finished with status {status}; keeping generated code ({widget.error_message[:120]})", flush=True)
        write_outputs(name, code, description, (w, h), dt)
        print(f"ok {name}: {len(code)} chars in {dt:.0f}s -> build/out/{name}.jsx, widgets/src/{name}.vw", flush=True)
    return failures


if __name__ == "__main__":
    targets = sys.argv[1:] or list(SPECS)
    unknown = [t for t in targets if t not in SPECS]
    if unknown:
        sys.exit(f"unknown widget(s): {unknown}; choose from {list(SPECS)}")
    sys.exit(main(targets))
