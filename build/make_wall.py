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


def main() -> int:
    if not SOURCE.exists():
        sys.exit(f"source deck not found: {SOURCE}")
    match = BLOCK.search(SOURCE.read_text())
    if not match:
        sys.exit("no <!-- WALL:start --> block in the source deck")

    cards = AUTOPLAY.sub("", WEBM.sub("", match.group(1))).strip()
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
    print(f"wrote {OUT.relative_to(ROOT)}: {count} clips")
    return 0


if __name__ == "__main__":
    sys.exit(main())
