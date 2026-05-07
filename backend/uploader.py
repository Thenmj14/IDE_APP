# =============================================================
#  uploader.py — Wraps arduino-cli for compile + upload.
#  All subprocess calls are isolated here. App.py never
#  calls arduino-cli directly.
# =============================================================

import os
import subprocess
import shutil
import tempfile
from config import ARDUINO_CLI_PATH, SKETCH_DIR, SKETCH_NAME, UPLOAD_TIMEOUT_SECONDS


class ArduinoUploader:
    """
    Handles writing a sketch to disk, compiling it, and uploading
    to the target board via arduino-cli.
    """

    def __init__(self):
        self.cli = ARDUINO_CLI_PATH

    # ── Public API ────────────────────────────────────────────

    def upload(self, code: str, fqbn: str, port: str) -> dict:
        """
        Full pipeline: write sketch → compile → upload.
        """
        compile_result = self.compile_only(code, fqbn)
        if not compile_result["success"]:
            return compile_result

        return self.flash_only(fqbn, port)

    def compile_only(self, code: str, fqbn: str) -> dict:
        """Writes sketch and compiles it."""
        sketch_path = self._write_sketch(code)
        if not sketch_path:
            return {"success": False, "log": "ERROR: Could not write sketch to disk."}
        return self._compile(sketch_path, fqbn)

    def flash_only(self, fqbn: str, port: str) -> dict:
        """Uploads the previously compiled sketch."""
        sketch_path = os.path.join(SKETCH_DIR, SKETCH_NAME)
        return self._upload(sketch_path, fqbn, port)

    def list_ports(self) -> list[str]:
        """
        Ask arduino-cli for connected boards/ports.
        Falls back to pyserial if arduino-cli fails.
        """
        ports = self._ports_via_cli()
        if not ports:
            ports = self._ports_via_pyserial()
        return ports

    def verify_cli(self) -> dict:
        """Check arduino-cli is reachable and return its version."""
        try:
            result = subprocess.run(
                [self.cli, "version"],
                capture_output=True, text=True, timeout=10
            )
            return {"available": True, "version": result.stdout.strip()}
        except Exception as e:
            return {"available": False, "error": str(e)}

    # ── Private helpers ───────────────────────────────────────

    def _write_sketch(self, code: str) -> str | None:
        """
        Write code to <SKETCH_DIR>/sketch/sketch.ino.
        arduino-cli requires folder name == sketch name.
        Returns the sketch folder path, or None on failure.
        """
        try:
            sketch_folder = os.path.join(SKETCH_DIR, SKETCH_NAME)
            os.makedirs(sketch_folder, exist_ok=True)
            ino_path = os.path.join(sketch_folder, f"{SKETCH_NAME}.ino")
            with open(ino_path, "w", encoding="utf-8") as f:
                f.write(code)
            return sketch_folder
        except Exception as e:
            print(f"[uploader] Write error: {e}")
            return None

    def _compile(self, sketch_path: str, fqbn: str) -> dict:
        """Run arduino-cli compile."""
        cmd = [
            self.cli, "compile",
            "--fqbn", fqbn,
            "--warnings", "default",
            sketch_path
        ]
        return self._run(cmd, step="COMPILE")

    def _upload(self, sketch_path: str, fqbn: str, port: str) -> dict:
        """Run arduino-cli upload."""
        cmd = [
            self.cli, "upload",
            "--fqbn", fqbn,
            "--port", port,
            sketch_path
        ]
        return self._run(cmd, step="UPLOAD")

    def _run(self, cmd: list, step: str) -> dict:
        """
        Execute a subprocess command, capture output.
        Returns {"success": bool, "log": str}
        """
        log_lines = [f"[{step}] Running: {' '.join(cmd)}\n"]
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=UPLOAD_TIMEOUT_SECONDS
            )
            stdout = result.stdout.strip()
            stderr = result.stderr.strip()

            if stdout:
                log_lines.append(stdout)
            if stderr:
                log_lines.append(stderr)

            success = result.returncode == 0
            if success:
                log_lines.append(f"\n✔ {step} succeeded.")
            else:
                log_lines.append(f"\n✘ {step} failed (exit code {result.returncode}).")

            return {"success": success, "log": "\n".join(log_lines)}

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "log": f"✘ {step} timed out after {UPLOAD_TIMEOUT_SECONDS}s."
            }
        except FileNotFoundError:
            return {
                "success": False,
                "log": (
                    f"✘ arduino-cli not found at: {self.cli}\n"
                    "Install it from https://arduino.github.io/arduino-cli/ "
                    "and make sure it's on your PATH."
                )
            }
        except Exception as e:
            return {"success": False, "log": f"✘ Unexpected error during {step}: {e}"}

    def _ports_via_cli(self) -> list[str]:
        """Use arduino-cli board list to get connected ports."""
        try:
            result = subprocess.run(
                [self.cli, "board", "list"],
                capture_output=True, text=True, timeout=10
            )
            ports = []
            for line in result.stdout.splitlines()[1:]:  # skip header
                parts = line.split()
                if parts:
                    ports.append(parts[0])
            return [p for p in ports if p and p != "Unknown"]
        except Exception:
            return []

    def _ports_via_pyserial(self) -> list[str]:
        """Fallback: use pyserial to list COM ports."""
        try:
            import serial.tools.list_ports
            return [p.device for p in serial.tools.list_ports.comports()]
        except Exception:
            return []