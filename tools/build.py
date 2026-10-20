"""Build the editable animation in animation/ into the runtime asset the DSH plugin serves.

Inlines boot.css, boot.js, brand.svg, blades.json (WebP data URIs) and
boot-audio.mp3 (base64) into one self-contained file:

    animation/*  ->  assets/animation.html

That single file is both
  · what the plugin serves at /dsh-boot/animation.html (the startup splash), and
  · a standalone deliverable you can double-click to watch on its own.

    python tools/build.py
"""

from __future__ import annotations

import base64
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _common import ASSETS, SRC, rel  # noqa: E402

OUT = ASSETS / "animation.html"


def main() -> int:
    html = (SRC / "boot.html").read_text(encoding="utf-8")
    css = (SRC / "boot.css").read_text(encoding="utf-8")
    js = (SRC / "boot.js").read_text(encoding="utf-8")
    svg = (SRC / "brand.svg").read_text(encoding="utf-8").strip()
    svg = re.sub(r"^<\?xml[^>]*\?>\s*", "", svg)

    frames = (SRC / "blades.json").read_text(encoding="utf-8").strip()
    b64 = base64.b64encode((SRC / "boot-audio.mp3").read_bytes()).decode("ascii")

    for needle, hay in (('<link rel="stylesheet" href="boot.css">', html),
                        ("<script src=\"boot.js\"></script>", html),
                        ("<!--BRAND_SVG-->", html),
                        ("/*BLADE_FRAMES*/[]", js),
                        ('src="boot-audio.mp3"', html)):
        if needle not in hay:
            print(f"WARN: placeholder missing from the sources: {needle}",
                  file=sys.stderr)

    html = html.replace('<link rel="stylesheet" href="boot.css">',
                        "<style>\n" + css + "\n</style>")
    html = html.replace('<script src="boot.js"></script>',
                        "<script>\n" + js + "\n</script>")
    html = html.replace("<!--BRAND_SVG-->", svg)
    html = html.replace("/*BLADE_FRAMES*/[]", frames)
    html = html.replace('src="boot-audio.mp3"',
                        'src="data:audio/mpeg;base64,' + b64 + '"')

    ASSETS.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")

    left = len(re.findall(r'src=.(?!data:)', html))
    print(f"wrote {rel(OUT)}  {len(html):,} chars  "
          f"({OUT.stat().st_size / 1e6:.2f} MB)")
    print(f"  brand svg inlined {html.count(svg)}x  |  "
          f"blade frames inlined {frames.count('data:image/webp')}")
    print(f"  external refs left: {left} (expected 0)")
    print("  the plugin serves this file at /dsh-boot/animation.html; "
          "you can also just double-click it")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())