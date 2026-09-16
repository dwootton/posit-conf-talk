"""Drive the basemap-image + pointer-safety revision for one widget.

    python build/run_basemap_pass.py <name>

Combines BASEMAP_AND_POINTER_RULES with a per-widget extra note and calls
revise_widgets.main(). Run from a per-widget cwd to avoid the widget-store
filename collision when several of these run in parallel.
"""
import sys

import revise_widgets as rv

EXTRA = {
    "wait": (
        "The hover tooltip position is computed with d3.pointer(e, svg.node()) -- replace it with "
        "the getBoundingClientRect() + clientX/clientY approach described above as well; it has the "
        "exact same embedding bug even though it's placing a tooltip rather than a map coordinate."
    ),
    "close": "",
    "spice": (
        "Also fix the visual encoding, independent of the basemap swap: right now pumpkin-spice shops "
        "are drawn one way and every other shop is drawn as a small muted hollow circle -- change this so "
        "that by default (toggle off) EVERY shop is drawn identically, in whatever single style is "
        "currently used for pumpkin-spice shops (same fill color, size and outline; do not introduce or "
        "keep any separate muted/hollow style). Do not let the marks reveal which shops have "
        "pumpkin_spice while the toggle is off. Only when the 'pumpkin spice only' toggle is switched ON "
        "should shops without pumpkin_spice be hidden entirely (removed from the map and from any label), "
        "leaving only the pumpkin-spice shops, still in that same one style. Keep the toggle control's "
        "position and the tooltip exactly as they are."
    ),
    "parameterize": "",
    "structure": "",
    "augment": "",
}


def main(name: str) -> int:
    request = rv.BASEMAP_AND_POINTER_RULES
    extra = EXTRA.get(name, "")
    if extra:
        request = request + "\n\n" + extra
    return rv.main(name, request)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
