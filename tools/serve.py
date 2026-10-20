"""Serve the editable animation sources over http:// so the *unbuilt*
animation/boot.html is fully usable -- browsers refuse to fetch blades.json from
a file:// page, so the paint blade insert (5.45-6.45s) would be missing there.

    python tools/serve.py            # animation/ -> http://127.0.0.1:8765/boot.html
    python tools/serve.py --built    # assets/    -> the built single-file animation

Nothing here is needed for the shipped asset: double-click assets/animation.html,
or let the DSH plugin serve it at /dsh-boot/animation.html.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import pathlib
import socketserver
import sys
import webbrowser

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _common import ASSETS, SRC  # noqa: E402


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *a):        # keep the console readable
        sys.stderr.write("  %s\n" % (fmt % a))


def main() -> int:
    ap = argparse.ArgumentParser(description="static server for local preview")
    ap.add_argument("--built", action="store_true",
                    help="serve the built assets/animation.html instead of animation/")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-open", action="store_true", help="do not open a browser")
    args = ap.parse_args()

    root = ASSETS if args.built else SRC
    page = "animation.html" if args.built else "boot.html"
    if not root.exists():
        sys.exit(f"ERROR: {root} not found")
    url = f"http://127.0.0.1:{args.port}/{page}"

    handler = functools.partial(Handler, directory=str(root))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as httpd:
        print(f"serving {root}\n  {url}\n(Ctrl+C to stop)")
        if not args.no_open:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nbye")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())