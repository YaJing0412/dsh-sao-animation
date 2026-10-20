"""Put a soundtrack on the silent MP4 produced by encode.py.

Default: use the bundled animation/boot-audio.mp3 (13.6s, lifted from the reference
clip at 13.4s -- see THIRD_PARTY_NOTICES.md). To rebuild it from your own clip:

    python tools/mux_audio.py                                    # bundled mp3
    python tools/mux_audio.py --clip ref.mp4 --ss 13.4 --t 13.6   # your own clip

Under the hood:

    ffmpeg -i dist/dsh-sao-animation-silent.mp4 -i animation/boot-audio.mp3 \\
      -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 160k -shortest \\
      -movflags +faststart dist/dsh-sao-animation.mp4
"""

from __future__ import annotations

import argparse
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _common import DIST, SRC, find_ffmpeg, rel  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description="mux a soundtrack onto the silent MP4")
    ap.add_argument("--video", default=str(DIST / "dsh-sao-animation-silent.mp4"))
    ap.add_argument("--clip", default=None,
                    help="clip to take the audio from "
                         "(default: the bundled animation/boot-audio.mp3)")
    ap.add_argument("--ss", type=float, default=13.4,
                    help="audio start offset inside --clip, seconds")
    ap.add_argument("--t", type=float, default=13.6, help="audio length, seconds")
    ap.add_argument("--out", default=str(DIST / "dsh-sao-animation.mp4"))
    ap.add_argument("--bitrate", default="160k")
    args = ap.parse_args()

    video = pathlib.Path(args.video)
    if not video.exists():
        sys.exit(f"ERROR: {video} not found -- run python tools/encode.py first")

    audio = pathlib.Path(args.clip).expanduser() if args.clip else SRC / "boot-audio.mp3"
    if not audio.exists():
        sys.exit(f"ERROR: audio source not found: {audio}")

    ffmpeg = find_ffmpeg()
    cmd = [ffmpeg, "-y", "-hide_banner", "-loglevel", "warning", "-i", str(video)]
    if args.clip:
        cmd += ["-ss", str(args.ss)]
    cmd += ["-i", str(audio), "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "copy", "-c:a", "aac", "-b:a", args.bitrate,
            "-shortest", "-movflags", "+faststart", str(args.out)]
    print("ffmpeg:", " ".join(cmd))
    if subprocess.run(cmd).returncode != 0:
        sys.exit("ERROR: ffmpeg mux failed")

    out = pathlib.Path(args.out)
    where = f" @{args.ss}s+{args.t}s" if args.clip else ""
    print(f"wrote {rel(out)}  {out.stat().st_size / 1e6:.2f} MB  "
          f"(audio: {rel(audio)}{where})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())