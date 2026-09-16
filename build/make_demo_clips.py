"""Turn the vibe-widget demo recordings into wall clips.

    python build/make_demo_clips.py

Reads the GIFs in ~/Downloads/vw_demo, encodes each to an mp4 plus a jpg
poster in media/, and leaves them named the way make_wall.py expects.

Two of the recordings are taller than they are wide, and every slot in the
wall's layout is landscape, so those two are cropped to the part of the
recording that carries the interaction -- the phase portrait rather than the
pendulum hanging below it, the spike raster rather than the histogram under
it. Cropping beats letting a portrait card overlap its neighbours.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path.home() / "Downloads" / "vw_demo"
OUT = ROOT / "media"

MAX_W = 1440          # the wall never renders a card wider than this
FPS = 14
CRF = "30"            # these sit blurred behind a title; size matters more

# slug -> (source gif, crop as a fraction of full height, or None)
CLIPS: dict[str, tuple[str, float | None]] = {
    "vw-tablelens":     ("tablelens.gif", None),
    "vw-genome":        ("Genome browser.gif", None),
    "vw-llm":           ("llm_consistency.gif", None),
    "vw-seaice":        ("ice_fraction_cutoff.gif", None),
    "vw-grip":          ("robotic_grip.gif", None),
    "vw-pendulum":      ("Pendulum.gif", 0.61),
    "vw-spike":         ("spike.gif", 0.58),
}


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode:
        sys.exit(f"ffmpeg failed:\n{' '.join(cmd)}\n{proc.stderr[-1500:]}")


def main() -> int:
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found")
    OUT.mkdir(exist_ok=True)

    for slug, (name, keep) in CLIPS.items():
        src = SRC / name
        if not src.exists():
            sys.exit(f"missing source recording: {src}")

        # crop to the top `keep` of the frame, then fit the width cap, keeping
        # both dimensions even (h264 requires it)
        vf = []
        if keep:
            vf.append(f"crop=iw:floor(ih*{keep}/2)*2:0:0")
        vf.append(f"scale='min({MAX_W},iw)':-2:flags=lanczos")
        vf.append(f"fps={FPS}")
        chain = ",".join(vf)

        mp4 = OUT / f"{slug}.mp4"
        run(["ffmpeg", "-y", "-i", str(src), "-vf", chain,
             "-c:v", "libx264", "-preset", "slow", "-crf", CRF,
             "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(mp4)])

        run(["ffmpeg", "-y", "-i", str(mp4), "-frames:v", "1",
             "-q:v", "4", str(OUT / f"{slug}.jpg")])

        dims = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height", "-of", "csv=p=0", str(mp4)],
            capture_output=True, text=True).stdout.strip()
        kb = mp4.stat().st_size // 1024
        print(f"  {slug:16} {dims:>10}  {kb:>5} KB")

    print(f"wrote {len(CLIPS)} clips to media/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
