"""Lift the paint-blade insert (timeline 5.45-6.45s) out of a source clip.

Pipeline, all paths relative to the repo:

    1. ffmpeg pulls `--t` seconds starting at `--ss`, re-sampled to `--fps`
    2. every frame is centre-cropped to 16:9 and scaled to the 1280x720 stage,
       so 2160x1080 / 1920x1080 / 3840x2160 sources all work untouched
    3. optionally the corner badge (e.g. a bilibili watermark) is erased:
       bright-text mask from (V - local median) > 9, strong Sobel edges excluded,
       then cv2.inpaint(..., INPAINT_NS)
    4. `--frames` of them are picked evenly across the take
    5. they are written as WebP data URIs into animation/blades.json (build.py inlines
       them into the single-file HTML) and, unless --slot -1, as PNGs into the
       capture frame folder where they replace the procedural frames of that
       segment (slot 132 = t 4400ms at 30fps)

    python tools/extract_blades.py --clip "D:\\clip.mp4" --ss 18.85 --t 1.0
    python tools/extract_blades.py --clip clip.mp4 --delogo none --frames 16 --quality 70
"""

from __future__ import annotations

import argparse
import base64
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _common import SRC, find_ffmpeg, frames_dir, rel  # noqa: E402


def parse_box(spec: str, w: int, h: int):
    """'auto' | 'none' | 'x0,y0,x1,y1' (fractions if <= 1, else pixels) -> box."""
    if spec == "none":
        return None
    if spec == "auto":                       # bottom-right corner badge
        return int(w * 0.70), int(h * 0.85), w, h
    try:
        x0, y0, x1, y1 = (float(v) for v in spec.split(","))
    except ValueError:
        sys.exit("ERROR: --delogo wants auto | none | x0,y0,x1,y1")
    if max(x0, y0, x1, y1) <= 1.0:
        x0, x1 = x0 * w, x1 * w
        y0, y1 = y0 * h, y1 * h
    return int(x0), int(y0), int(x1), int(y1)


def delogo(img, box, thresh: int = 9, edge: int = 60, dilate: int = 3):
    """Erase bright overlay text inside `box`; returns (patched_image, mask|None)."""
    import cv2
    import numpy as np

    if box is None:
        return img, None
    h, w = img.shape[:2]
    x0, y0 = max(0, box[0]), max(0, box[1])
    x1, y1 = min(w, box[2]), min(h, box[3])
    if x1 - x0 < 4 or y1 - y0 < 4:
        return img, None
    roi = img[y0:y1, x0:x1]

    v = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)[:, :, 2]
    bright = (v.astype(np.int16) - cv2.medianBlur(v, 15).astype(np.int16)) > thresh

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    strong = cv2.magnitude(gx, gy) > edge

    mask = (bright & ~strong).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((dilate, dilate), np.uint8), iterations=1)
    if not mask.any():
        return img, mask

    out = img.copy()
    out[y0:y1, x0:x1] = cv2.inpaint(roi, mask, 3, cv2.INPAINT_NS)
    return out, mask


def main() -> int:
    ap = argparse.ArgumentParser(description="extract the blade insert from a clip")
    ap.add_argument("--clip", required=True, help="source video to lift frames from")
    ap.add_argument("--ss", type=float, default=18.85, help="start offset, seconds")
    ap.add_argument("--t", type=float, default=1.0, help="how many seconds to take")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--frames", type=int, default=30,
                    help="frames kept for blades.json (30 = 1 s of a 30 fps window)")
    ap.add_argument("--size", default="1280x720", help="stage size WxH")
    ap.add_argument("--delogo", default="auto",
                    help="auto | none | x0,y0,x1,y1")
    ap.add_argument("--quality", type=int, default=82, help="WebP quality")
    ap.add_argument("--out", default=str(SRC / "blades.json"))
    ap.add_argument("--slot", type=int, default=164,
                    help="first capture-frame index to overwrite (164 = t 5467ms, the "
                         "first frame inside the 5.45-6.45s insert); "
                         "-1 = leave the PNG sequence alone")
    ap.add_argument("--png-dir", default=str(frames_dir()),
                    help="capture frame folder, or 'none'")
    ap.add_argument("--mask-dump", default=None,
                    help="write the de-logo mask of the first frame here")
    args = ap.parse_args()

    try:
        import cv2
    except ImportError:
        sys.exit("ERROR: OpenCV required -- python -m pip install opencv-python numpy")

    clip = pathlib.Path(args.clip).expanduser().resolve()
    if not clip.exists():
        sys.exit(f"ERROR: clip not found: {clip}")
    cw, ch = (int(v) for v in args.size.lower().split("x"))

    ffmpeg = find_ffmpeg()
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="blades-"))
    try:
        cmd = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
               "-ss", str(args.ss), "-i", str(clip), "-t", str(args.t),
               "-vf", f"fps={args.fps}", "-q:v", "2", str(tmp / "%04d.png")]
        print("ffmpeg:", " ".join(cmd))
        if subprocess.run(cmd).returncode != 0:
            sys.exit("ERROR: ffmpeg frame extraction failed")
        raw = sorted(tmp.glob("*.png"))
        if not raw:
            sys.exit("ERROR: ffmpeg produced no frames -- check --ss/--t")
        print(f"extracted {len(raw)} frames @ {args.fps}fps")

        box = parse_box(args.delogo, cw, ch)
        processed = []
        for i, p in enumerate(raw):
            im = cv2.imread(str(p))
            if im is None:
                continue
            h, w = im.shape[:2]
            target = cw / ch
            if w / h > target:                       # too wide -> trim sides
                nw = int(round(h * target))
                x = (w - nw) // 2
                im = im[:, x:x + nw]
            else:                                    # too tall -> trim top/bottom
                nh = int(round(w / target))
                y = (h - nh) // 2
                im = im[y:y + nh, :]
            im = cv2.resize(im, (cw, ch), interpolation=cv2.INTER_AREA)
            im, mask = delogo(im, box)
            if args.mask_dump and mask is not None and i == 0:
                cv2.imwrite(args.mask_dump, mask)
                print(f"  mask -> {args.mask_dump} "
                      f"({int((mask > 0).sum())} px, {(mask > 0).mean() * 100:.2f}% "
                      f"of the region)")
            processed.append(im)

        n = min(args.frames, len(processed))
        if n < args.frames:
            print(f"WARN: only {n} frames available (< --frames {args.frames}); "
                  f"blades.json will be short", file=sys.stderr)
        if n == 0:
            sys.exit("ERROR: no usable frames")
        idx = ([round(i * (len(processed) - 1) / (n - 1)) for i in range(n)]
               if n > 1 else [0])
        picked = [processed[i] for i in idx]
        print(f"picked {n} of {len(processed)} frames at {idx}")

        uris = []
        for im in picked:
            ok, buf = cv2.imencode(".webp", im,
                                   [cv2.IMWRITE_WEBP_QUALITY, args.quality])
            if not ok:
                sys.exit("ERROR: WebP encoding failed")
            uris.append("data:image/webp;base64," +
                        base64.b64encode(buf.tobytes()).decode("ascii"))

        out = pathlib.Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(uris), encoding="utf-8")
        print(f"wrote {rel(out)}  {n} frames  {out.stat().st_size / 1e6:.2f} MB  "
              f"(avg {out.stat().st_size / n / 1024:.0f} KB/frame)")

        if args.slot >= 0 and args.png_dir.lower() != "none":
            png_dir = pathlib.Path(args.png_dir)
            existing = len(list(png_dir.glob("f*.png"))) if png_dir.exists() else 0
            if not existing:
                print("skipped the PNG step: the frame folder is empty. "
                      "Run tools/capture.py first, then re-run this script "
                      "(only the --slot step needs redoing).")
            else:
                for i, im in enumerate(picked):
                    cv2.imwrite(str(png_dir / f"f{args.slot + i:04d}.png"), im)
                print(f"overwrote frames f{args.slot:04d}.."
                      f"f{args.slot + n - 1:04d} in {png_dir}")
                if args.slot + n > existing:
                    print(f"WARN: only {existing} frames were captured, so the tail "
                          f"of the insert was not written", file=sys.stderr)
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())