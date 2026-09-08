# =============================================================
#  app.py — Flask backend for Mark1 Blocks IDE
#  Routes:
#    GET  /api/ports         → list available COM ports
#    GET  /api/boards        → list supported boards
#    GET  /api/cli-status    → check arduino-cli availability
#    POST /api/upload        → compile + upload sketch
#    GET  /                  → serve React frontend (production)
# =============================================================

import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from config import HOST, PORT, DEBUG, CORS_ORIGINS, FRONTEND_BUILD_DIR
from boards import get_boards
from uploader import ArduinoUploader

# ── App setup ─────────────────────────────────────────────────
app = Flask(
    __name__,
    static_folder=FRONTEND_BUILD_DIR if os.path.exists(FRONTEND_BUILD_DIR) else None
)
CORS(app, origins=CORS_ORIGINS)

uploader = ArduinoUploader()


# ── Health check ──────────────────────────────────────────────
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "message": "Mark1 Blocks backend running"})


# ── GET /api/ports ────────────────────────────────────────────
@app.route("/api/ports")
def get_ports():
    """
    Returns a list of available serial port strings.
    Example: ["COM3", "COM7", "/dev/ttyUSB0"]
    """
    try:
        ports = uploader.list_ports()
        return jsonify({"success": True, "ports": ports})
    except Exception as e:
        return jsonify({"success": False, "ports": [], "error": str(e)}), 500


# ── GET /api/boards ───────────────────────────────────────────
@app.route("/api/boards")
def get_boards_route():
    """
    Returns a list of supported boards with name + fqbn.
    Example: [{"name": "Arduino Nano", "fqbn": "arduino:avr:nano", "group": "AVR"}]
    """
    return jsonify({"success": True, "boards": get_boards()})


# ── GET /api/cli-status ───────────────────────────────────────
@app.route("/api/cli-status")
def cli_status():
    """
    Check if arduino-cli is installed and accessible.
    Frontend shows a warning banner if not available.
    """
    result = uploader.verify_cli()
    return jsonify(result)


# ── POST /api/upload (DEPRECATED — compile-only on this server) ──
@app.route("/api/upload", methods=["POST"])
def upload():
    """
    NOTE: This server cannot upload to USB (it's not connected to
    any board). This route now just compiles and returns the binary,
    same as /api/compile. Actual USB upload happens in the browser.
    """
    data = request.get_json()

    if not data:
        return jsonify({"success": False, "log": "No data received."}), 400

    code = data.get("code", "").strip()
    fqbn = data.get("fqbn", "").strip()

    if not code:
        return jsonify({"success": False, "log": "No code provided."}), 400
    if not fqbn:
        return jsonify({"success": False, "log": "No board selected."}), 400

    result = uploader.compile_only(code=code, fqbn=fqbn)
    return jsonify(result), 200 if result["success"] else 500

# ── POST /api/compile ─────────────────────────────────────────
@app.route("/api/compile", methods=["POST"])
def compile_sketch():
    data = request.get_json()
    if not data: return jsonify({"success": False, "log": "No data received."}), 400
    code = data.get("code", "").strip()
    fqbn = data.get("fqbn", "").strip()
    if not code: return jsonify({"success": False, "log": "No code provided."}), 400
    if not fqbn: return jsonify({"success": False, "log": "No board selected."}), 400
    
    result = uploader.compile_only(code=code, fqbn=fqbn)
    return jsonify(result), 200 if result["success"] else 500

# ── POST /api/flash (DISABLED on cloud server) ───────────────────
@app.route("/api/flash", methods=["POST"])
def flash_sketch():
    """
    Direct USB flashing isn't possible from a cloud server.
    This will be handled by the browser (Web Serial) in a later phase.
    """
    return jsonify({
        "success": False,
        "log": "Direct flashing isn't available on this server. "
               "Uploading to your board will happen through your browser."
    }), 501

# ── Serve React frontend (production mode) ────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """
    In production (after `npm run build`), Flask serves the
    built React app. In development, Vite handles this instead.
    """
    if not os.path.exists(FRONTEND_BUILD_DIR):
        return jsonify({
            "error": "Frontend not built. Run: cd frontend && npm run build"
        }), 404

    # Serve static assets
    target = os.path.join(FRONTEND_BUILD_DIR, path)
    if path and os.path.exists(target):
        return send_from_directory(FRONTEND_BUILD_DIR, path)

    # All other routes → index.html (React Router handles it)
    return send_from_directory(FRONTEND_BUILD_DIR, "index.html")


# ── Entry point ───────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  Mark1 Blocks — Backend Server")
    print(f"  Running at: http://{HOST}:{PORT}")
    print("=" * 50)
    app.run(host=HOST, port=PORT, debug=DEBUG)
