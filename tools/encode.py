"""Assemble the captured PNG sequence into a silent 1280x720 H.264 MP4.

capture.py shoots a 1280x816 window; the 16:9 stage is letterboxed inside it, so
the pure-black rows are detected and trimmed here. Frames that arrive already
stage-sized (the ones extract_blades.py drops into the sequence) are written
through untouched.

    python tools/encode.py
    python tools/encode.py --crf 20 --check
"""

from __future__ import annotations

import argparse
import pathlib
import shutil
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _common import DIST, find_ffmpeg, frames_dir, rel  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description="PNG frames -> silent MP4")
    ap.add_argument("--frames", default=str(frames_dir()))
    ap.add_argument("--out", default=str(DIST / "dsh-sao-animation-silent.mp4"))
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--crf", type=int, default=17,
                    help="x264 quality; lower = better/bigger (17-23 is sane)")
    ap.add_argument("--pattern", default="f*.png")
    ap.add_argument("--check", action="store_true",
                    help="write a few sampled frames as check-<n>.png")
    args = ap.parse_args()

    try:
        import cv2
    except ImportError:
        sys.exit("ERROR: OpenCV required -- python -m pip install opencv-python numpy")

    frames = pathlib.Path(args.frames)
    files = sorted(frames.glob(args.pattern))
    if not files:
        sys.exit(f"ERROR: no frames in {frames} -- run python tools/capture.py first")
    print(f"frames: {len(files)} in {frames}")

    first = cv2.imread(str(files[0]))
    if first is None:
        sys.exit(f"ERROR: cannot read {files[0]}")
    h, w = first.shape[:2]
    top = 0
    while top < h and first[top].max() < 8:
        top += 1
    bot = h
    while bot > 0 and first[bot - 1].max() < 8:
        bot -= 1
    y0, y1 = top, bot
    print(f"letterbox: top={top} bottom={h - bot} -> content {w}x{y1 - y0}")

    dst = pathlib.Path(args.out)
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_name(dst.stem + ".mp4v.mp4")

    vw = cv2.VideoWriter(str(tmp), cv2.VideoWriter_fourcc(*"mp4v"),
                         args.fps, (w, y1 - y0))
    if not vw.isOpened():
        sys.exit("ERROR: OpenCV could not open a video writer")
    for f in files:
        im = cv2.imread(str(f))
        if im is None:
            print(f"WARN: unreadable frame skipped: {f.name}", file=sys.stderr)
            continue
        if im.shape[0] == (y1 - y0):
            vw.write(im)               # already stage-sized (imported footage)
        else:
            vw.write(im[y0:y1, :, :])
    vw.release()

    # mp4v is only an intermediate -- re-encode with ffmpeg for a web-safe file
    ffmpeg = find_ffmpeg()
    cmd = [ffmpeg, "-y", "-loglevel", "error", "-i", str(tmp),
           "-c:v", "libx264", "-crf", str(args.crf), "-pix_fmt", "yuv420p",
           "-movflags", "+faststart", str(dst)]
    print("ffmpeg:", " ".join(cmd))
    if subprocess.run(cmd).returncode != 0:
        print("WARN: ffmpeg re-encode failed, keeping the OpenCV mp4v output",
              file=sys.stderr)
        shutil.move(str(tmp), str(dst))
    else:
        tmp.unlink(missing_ok=True)

    cap = cv2.VideoCapture(str(dst))
    print(f"wrote {rel(dst)}  {dst.stat().st_size / 1e6:.2f} MB")
    print(f"verify: opened={cap.isOpened()} "
          f"frames={int(cap.get(cv2.CAP_PROP_FRAME_COUNT))} "
          f"fps={cap.get(cv2.CAP_PROP_FPS):.3f} "
          f"size={int(cap.get(3))}x{int(cap.get(4))}")
    if args.check:
        for idx in (60, 164, 200, 250, 300, 400):
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ok, fr = cap.read()
            if ok:
                p = frames.parent / f"check-{idx}.png"
                cv2.imwrite(str(p), fr)
                print("  check frame ->", p)
    cap.release()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())