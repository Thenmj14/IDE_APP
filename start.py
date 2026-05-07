#!/usr/bin/env python3
# =============================================================
#  start.py — Single entry point for Mark1 Blocks IDE
#
#  Usage:
#    python start.py          → starts backend, opens browser
#    python start.py --no-browser  → starts backend only
#
#  In development:
#    Terminal 1: python start.py
#    Terminal 2: cd frontend && npm run dev
#
#  In production (after npm run build):
#    python start.py          → serves built React from Flask
# =============================================================

import os
import sys
import time
import threading
import webbrowser
import subprocess
import argparse

# ── Parse arguments ──────────────────────────────────────────
parser = argparse.ArgumentParser(description="Mark1 Blocks IDE")
parser.add_argument("--no-browser", action="store_true", help="Don't open browser automatically")
parser.add_argument("--port",       type=int, default=5000,  help="Backend port (default: 5000)")
parser.add_argument("--dev",        action="store_true", help="Also start Vite dev server")
args = parser.parse_args()

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "backend")
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")
PORT = args.port
URL  = f"http://127.0.0.1:{PORT}"

def open_browser():
    """Wait for Flask to start, then open the browser."""
    time.sleep(1.5)
    if not args.no_browser:
        webbrowser.open(URL)

def start_vite():
    """Optionally start Vite dev server for hot-reload development."""
    subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=FRONTEND_DIR,
        shell=(sys.platform == "win32"),
    )
    print("  Vite dev server starting at http://localhost:5173")

def check_requirements():
    """Check Python dependencies are installed."""
    try:
        import flask
        import flask_cors
        import serial
    except ImportError as e:
        print(f"\n⚠️  Missing dependency: {e}")
        print("Run: pip install -r backend/requirements.txt\n")
        sys.exit(1)

def main():
    check_requirements()

    print()
    print("╔══════════════════════════════════════════╗")
    print("║        Mark1 Blocks IDE  v1.0            ║")
    print("╠══════════════════════════════════════════╣")
    print(f"║  Backend:  {URL:<31}║")
    if args.dev:
        print("║  Frontend: http://localhost:5173          ║")
    print("╚══════════════════════════════════════════╝")
    print()

    # Start Vite if requested
    if args.dev:
        start_vite()
        time.sleep(1)

    # Open browser in background thread
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()

    # Start Flask (blocking)
    os.chdir(BACKEND_DIR)
    sys.path.insert(0, BACKEND_DIR)

    # Override port from args
    import config
    config.PORT = PORT

    from app import app
    app.run(host="127.0.0.1", port=PORT, debug=False)

if __name__ == "__main__":
    main()
