"""Re-shoot only the frames capture.py failed to write (headless Chrome is flaky
under concurrency). Safe to run repeatedly until it reports nothing missing.

    python tools/refill.py
"""

from __future__ import annotations

import argparse
import pathlib
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _common import ASSETS, find_browser, frames_dir  # noqa: E402
from capture import grab  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description="re-capture missing frames")
    ap.add_argument("--html", default=str(ASSETS / "animation.html"))
    ap.add_argument("--out", default=str(frames_dir()))
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--dur", type=int, default=13600)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--size", default="1280,816")
    ap.add_argument("--budget", type=int, default=900)
    args = ap.parse_args()

    out = pathlib.Path(args.out)
    n = int(args.dur / 1000 * args.fps)
    missing = [i for i in range(n) if not (out / f"f{i:04d}.png").exists()]
    head = missing[:20]
    print(f"missing: {len(missing)}/{n} {head}{' ...' if len(missing) > 20 else ''}")
    if not missing:
        print("nothing to do")
        return 0

    chrome = find_browser()
    base = pathlib.Path(args.html).resolve().as_uri()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        results = list(ex.map(
            lambda i: grab(chrome, out, base, i, args.fps, args.size,
                           args.budget, args.workers), missing))

    still = [i for i in missing if not (out / f"f{i:04d}.png").exists()]
    print(f"refilled {sum(results)}/{len(missing)}")
    if still:
        print(f"still missing: {still}", file=sys.stderr)
        print("hint: lower --workers (headless Chrome drops frames under load)",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())