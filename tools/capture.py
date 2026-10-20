"""Screenshot every frame of the animation with headless Chrome -> PNG frames.

The page is deterministic -- every frame is a pure function of t (see
animation/boot.js) -- so frame i is simply the page loaded as `?t=<ms>&pause=1`.

    python tools/capture.py                      # 408 frames @ 30fps, ~70s
    python tools/capture.py --workers 6 --size 1280,816
    python tools/capture.py --at 4800,6000       # just spot-check two frames

Frames land in %TEMP%\\dsh-boot-frames (override with DSH_FRAMES).
"""

from __future__ import annotations

import argparse
import pathlib
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _common import ASSETS, find_browser, frames_dir  # noqa: E402


def grab(chrome: str, out: pathlib.Path, base: str, i: int, fps: int,
         size: str, budget: int, slots: int = 6) -> bool:
    """Screenshot frame i. Returns True when the PNG was written."""
    t = int(round(i * 1000 / fps))
    dst = out / f"f{i:04d}.png"
    cmd = [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
           "--force-device-scale-factor=1", f"--window-size={size}",
           f"--user-data-dir={out / f'_profile_{i % slots}'}",
           f"--virtual-time-budget={budget}", f"--screenshot={dst}",
           f"{base}?t={t}&pause=1"]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return dst.exists()


def spot(chrome: str, out: pathlib.Path, base: str, times, size: str,
         budget: int) -> int:
    """Capture only the listed timestamps (ms) as t<ms>.png. Returns failures."""
    bad = 0
    for ms in times:
        dst = out / f"t{ms}.png"
        cmd = [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
               "--force-device-scale-factor=1", f"--window-size={size}",
               f"--user-data-dir={out / '_profile_0'}",
               f"--virtual-time-budget={budget}", f"--screenshot={dst}",
               f"{base}?t={ms}&pause=1"]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ok = dst.exists()
        bad += not ok
        print(f"  t={ms}ms -> {dst}  [{'ok' if ok else 'FAILED'}]")
    for p in out.glob("_profile_*"):
        shutil.rmtree(p, ignore_errors=True)
    return bad


def main() -> int:
    ap = argparse.ArgumentParser(description="capture the animation frame by frame")
    ap.add_argument("--html", default=str(ASSETS / "animation.html"),
                    help="the built single-file asset (what the plugin serves)")
    ap.add_argument("--out", default=str(frames_dir()))
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--dur", type=int, default=13600, help="length in ms")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--slots", type=int, default=6, help="browser profiles to reuse")
    ap.add_argument("--size", default="1280,816",
                    help="window size; 816 = 720-high 16:9 stage + letterbox")
    ap.add_argument("--budget", type=int, default=600, help="virtual-time-budget ms")
    ap.add_argument("--keep", action="store_true",
                    help="keep existing frames instead of clearing the folder")
    ap.add_argument("--at", default=None,
                    help="only capture these timestamps in ms, e.g. --at 4800,6000")
    args = ap.parse_args()

    html = pathlib.Path(args.html).resolve()
    if not html.exists():
        sys.exit(f"ERROR: {html} not found -- run python tools/build.py first")
    out = pathlib.Path(args.out)
    if out.exists() and not args.keep:
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)

    chrome = find_browser()
    base = html.as_uri()

    if args.at:
        print(f"browser: {chrome}")
        bad = spot(chrome, out, base, (int(v) for v in args.at.split(",")),
                   args.size, args.budget)
        return 1 if bad else 0

    n = int(args.dur / 1000 * args.fps)
    print(f"browser: {chrome}")
    print(f"page   : {html}")
    print(f"frames : {n} @ {args.fps}fps -> {out}")

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        results = list(ex.map(
            lambda i: grab(chrome, out, base, i, args.fps, args.size,
                           args.budget, args.slots), range(n)))

    for p in out.glob("_profile_*"):
        shutil.rmtree(p, ignore_errors=True)

    ok = sum(results)
    print(f"captured {ok}/{n}")
    if ok != n:
        print("frames dropped -- run python tools/refill.py until it reports 0",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())