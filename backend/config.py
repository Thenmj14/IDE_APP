# =============================================================
#  config.py — All backend configuration in one place.
#  Change paths, ports, and settings here only.
# =============================================================

import os
import sys
import platform

# ── Server ────────────────────────────────────────────────────
HOST = "127.0.0.1"
PORT = 5000
DEBUG = False                      # Set True during development
OPEN_BROWSER = True                # Auto-open browser on start

# ── CORS ──────────────────────────────────────────────────────
# Allowed origins for the React dev server and production build
CORS_ORIGINS = [
    "http://localhost:5173",       # Vite dev server
    "http://localhost:5000",       # Flask serving built React
    "http://127.0.0.1:5000",
]

# ── arduino-cli ───────────────────────────────────────────────
# Path to arduino-cli binary.
# On Windows: arduino-cli.exe must be on PATH or full path given.
# On Mac/Linux: usually just "arduino-cli" if installed globally.

def _default_cli_path():
    """Return the most likely arduino-cli path for the current OS."""
    system = platform.system()
    if system == "Windows":
        # Common install location via arduino-cli installer
        candidates = [
            r"C:\Program Files\Arduino CLI\arduino-cli.exe",
            r"C:\Users\{}\AppData\Local\Arduino15\arduino-cli.exe".format(
                os.environ.get("USERNAME", "user")
            ),
            "arduino-cli.exe",     # fallback: hope it's on PATH
        ]
    elif system == "Darwin":       # macOS
        candidates = [
            "/usr/local/bin/arduino-cli",
            "/opt/homebrew/bin/arduino-cli",
            "arduino-cli",
        ]
    else:                          # Linux
        candidates = [
            "/usr/local/bin/arduino-cli",
            os.path.expanduser("~/.local/bin/arduino-cli"),
            "arduino-cli",
        ]

    for path in candidates:
        if os.path.isfile(path):
            return path
    return "arduino-cli"           # last resort — must be on PATH

ARDUINO_CLI_PATH = "/opt/render/project/bin/arduino-cli"

# ── Sketch temp directory ─────────────────────────────────────
# Where the .ino is written before compile/upload.
SKETCH_DIR = os.path.join(os.path.dirname(__file__), "..", "tmp", "sketch")
SKETCH_NAME = "sketch"             # sketch/sketch.ino

# ── Upload timeout ────────────────────────────────────────────
UPLOAD_TIMEOUT_SECONDS = 300        # Max time to wait for compile + upload

# ── Static frontend build path ────────────────────────────────
# Flask serves the built React app from here in production mode.
FRONTEND_BUILD_DIR = os.path.join(
    os.path.dirname(__file__), "..", "frontend", "dist"
)
