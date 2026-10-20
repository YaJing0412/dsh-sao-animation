"""Shared paths + external-tool discovery for the dsh-sao-animation toolchain.

Every script in this folder is meant to run from a fresh clone on Windows,
macOS or Linux, so nothing here hard-codes a machine-specific absolute path.
External programs are found in this order:

    1. explicit environment variable (CHROME / CHROME_PATH, FFMPEG)
    2. PATH (shutil.which)
    3. a short list of well-known install locations per OS

Console output is ASCII on purpose: Windows consoles disagree about code pages
(GBK vs UTF-8) and non-ASCII tool output turns into mojibake. Override the frame
working directory with DSH_FRAMES.
"""

from __future__ import annotations

import os
import pathlib
import shutil
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
SRC = REPO / "animation"        # editable animation sources (boot.html/css/js ...)
ASSETS = REPO / "assets"        # built runtime asset served by the DSH plugin
DIST = REPO / "dist"            # rendered showcase MP4

BROWSER_CANDIDATES = {
    "win32": [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ],
    "darwin": [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ],
    "linux": [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/microsoft-edge",
    ],
}

FFMPEG_CANDIDATES = {
    "win32": [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\ProgramData\chocolatey\bin\ffmpeg.exe",
    ],
    "darwin": ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"],
    "linux": ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/snap/bin/ffmpeg"],
}


def _first_existing(paths):
    for p in paths:
        if p and pathlib.Path(p).exists():
            return str(pathlib.Path(p))
    return None


def find_browser() -> str:
    """Return the path to a Chromium-based browser usable in --headless mode."""
    key = "win32" if sys.platform.startswith("win") else sys.platform
    env = _first_existing(
        [os.environ.get("CHROME"), os.environ.get("CHROME_PATH"),
         os.environ.get("BROWSER")]
    )
    if env:
        return env
    for name in ("chrome", "google-chrome", "google-chrome-stable",
                 "chromium", "chromium-browser", "msedge"):
        found = shutil.which(name)
        if found:
            return found
    found = _first_existing(BROWSER_CANDIDATES.get(key, []))
    if found:
        return found
    sys.exit(
        "ERROR: no Chrome / Chromium / Edge found.\n"
        "Install one of them, or point CHROME at the executable:\n"
        '  PowerShell:  $env:CHROME = "C:\\...\\chrome.exe"\n'
        "  bash:        export CHROME=/usr/bin/google-chrome"
    )


def find_ffmpeg() -> str:
    """Return the path to an ffmpeg executable."""
    key = "win32" if sys.platform.startswith("win") else sys.platform
    env = _first_existing([os.environ.get("FFMPEG")])
    if env:
        return env
    found = shutil.which("ffmpeg")
    if found:
        return found
    found = _first_existing(FFMPEG_CANDIDATES.get(key, []))
    if found:
        return found
    sys.exit(
        "ERROR: no ffmpeg found.\n"
        "Install ffmpeg (https://ffmpeg.org/download.html) and put it on PATH,\n"
        "or point the FFMPEG environment variable at the executable."
    )


def frames_dir() -> pathlib.Path:
    """Where capture.py writes its PNG frames (override with DSH_FRAMES)."""
    override = os.environ.get("DSH_FRAMES")
    if override:
        return pathlib.Path(override)
    base = os.environ.get("TEMP") or os.environ.get("TMPDIR") or "/tmp"
    return pathlib.Path(base) / "dsh-boot-frames"


def rel(path) -> str:
    """Path relative to the repo root when possible, for tidy log output."""
    p = pathlib.Path(path)
    try:
        return str(p.relative_to(REPO)).replace("\\", "/")
    except ValueError:
        return str(p)