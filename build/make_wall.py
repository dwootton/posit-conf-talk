"""Build `_wall.qmd`: the wall of 20 interaction clips used on the opening and
closing slides.

    python build/make_wall.py

Reads the already-laid-out wall block from the Meros talk deck (its layout.py
authored those positions against the same 1280x720 stage this deck uses), drops
the .webm sources (Chrome and Safari both play the mp4, and shipping one file
per clip halves the folder), and writes a Quarto raw-HTML include that both
wall slides pull in with {{< include _wall.qmd >}}.

The bare `autoplay` attribute is stripped and only reveal's `data-autoplay` is
kept: the include appears on two slides, so 40 <video> elements exist in the
document, and letting the browser start all of them at load would run 40
decoders for two slides' worth of picture. reveal plays the clips when their
slide becomes current and pauses them on the way out.

The clips themselves are copied into media/ by hand, once:
    cp <meros>/media/*.mp4 <meros>/media/*.jpg media/
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(
    "/Users/dwootton/Downloads/mx-examples/meros-deck/merosdeck.html"
)
OUT = ROOT / "_wall.qmd"

BLOCK = re.compile(r"<!-- WALL:start -->(.*?)<!-- WALL:end -->", re.S)
WEBM = re.compile(r'<source src="[^"]*\.webm" type="video/webm">')
AUTOPLAY = re.compile(r"(?<= )autoplay(?= )")

# Seven of the twenty slots show vibe-widget's own demos instead of the
# borrowed ones. Each substitution is matched to a slot of nearly the same
# aspect ratio, because the layout fixes a card's WIDTH and lets its height
# follow the clip -- swap in a taller clip and it overlaps its neighbours.
SUBS = {
    # replaced slug           new slug          w     h    label
    "snapped-pointer":       ("vw-tablelens",  1440,  964, "Table lens over 4,000 trial sites"),
    "brush-to-zoom":         ("vw-genome",     1440,  950, "Genome browser: pan and zoom"),
    "trajectory-hover":      ("vw-llm",        1440, 1024, "Comparing generations from a model"),
    "wind-grid-probe":       ("vw-seaice",     1440,  850, "Sea ice residuals against CO2"),
    "grouped-bar-thresholds":("vw-grip",       1372,  930, "Robotic grasp candidates in 3D"),
    "crosshair":             ("vw-pendulum",   1296,  860, "Phase portrait of a damped pendulum"),
    "horizontal-band":       ("vw-spike",      1292,  806, "Spike raster and its PSTH"),
}


def substitute(cards: str) -> tuple[str, int]:
    """Point seven cards at the vibe-widget clips, keeping their slots."""
    done = 0
    for old, (new, w, h, label) in SUBS.items():
        if f"media/{old}.mp4" not in cards:
            sys.exit(f"wall has no card for {old}; the source layout changed")
        cards = cards.replace(f'poster="media/{old}.jpg"', f'poster="media/{new}.jpg"')
        cards = cards.replace(f'src="media/{old}.mp4"', f'src="media/{new}.mp4"')
        # the width/height pair belongs to the <video> that now points at `new`
        i = cards.index(f'poster="media/{new}.jpg"')
        j = cards.index('width="', i)
        k = cards.index(">", j)
        cards = cards[:j] + f'width="{w}" height="{h}"' + cards[k:]
        # and the label sits on the <figure> just above it
        f0 = cards.rindex('data-label="', 0, i)
        f1 = cards.index('"', f0 + len('data-label="'))
        cards = cards[:f0] + f'data-label="{label}"' + cards[f1 + 1:]
        done += 1
    return cards, done


def main() -> int:
    if not SOURCE.exists():
        sys.exit(f"source deck not found: {SOURCE}")
    match = BLOCK.search(SOURCE.read_text())
    if not match:
        sys.exit("no <!-- WALL:start --> block in the source deck")

    cards = AUTOPLAY.sub("", WEBM.sub("", match.group(1))).strip()
    cards, swapped = substitute(cards)
    count = cards.count('class="excard"')

    missing = [
        m for m in re.findall(r'src="(media/[^"]+)"', cards)
        + re.findall(r'poster="(media/[^"]+)"', cards)
        if not (ROOT / m).exists()
    ]
    if missing:
        sys.exit(f"{len(missing)} clip file(s) missing from media/: {missing[:3]}")

    OUT.write_text(
        "```{=html}\n"
        '<div class="exwall" aria-hidden="true">\n'
        f"{cards}\n"
        "</div>\n"
        '<div class="exveil"></div>\n'
        "```\n"
    )
    print(f"wrote {OUT.relative_to(ROOT)}: {count} clips ({swapped} of them vibe-widget's own)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
