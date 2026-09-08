# =============================================================
#  uploader.py — Wraps arduino-cli for compile + upload.
#  All subprocess calls are isolated here. App.py never
#  calls arduino-cli directly.
# =============================================================

import os
import subprocess
import shutil
import tempfile
import base64
import glob
from config import ARDUINO_CLI_PATH, SKETCH_DIR, SKETCH_NAME, UPLOAD_TIMEOUT_SECONDS


class ArduinoUploader:
    """
    Handles writing a sketch to disk, compiling it, and uploading
    to the target board via arduino-cli.
    """

    def __init__(self):
            "ARDUINO_CLI_CONFIG",
            "/opt/render/project/bin/arduino-cli.yaml"
        )

    # ── Public API ────────────────────────────────────────────

        self.cli = ARDUINO_CLI_PATH
        self.config_file = os.environ.get(
    def upload(self, code: str, fqbn: str, port: str) -> dict:
        """
        Direct USB upload is not available on a cloud server —
        this backend only compiles. Uploading happens in the browser.
        """
        return {
            "success": False,
            "log": "Direct upload is not available on this server. "
                "This backend only compiles code — uploading to your "
                "board happens through your browser instead."
        }

    def compile_only(self, code: str, fqbn: str) -> dict:
        """Writes sketch, compiles it, and returns the compiled file."""
        sketch_path = self._write_sketch(code)
        if not sketch_path:
            return {"success": False, "log": "ERROR: Could not write sketch to disk."}

        result = self._compile(sketch_path, fqbn)

        if result["success"]:
            binary_info = self._read_compiled_binary(result["build_dir"])
            result["binary"] = binary_info
        else:
            result["binary"] = {"found": False}

        return result

    def flash_only(self, fqbn: str, port: str) -> dict:
        return {
            "success": False,
            "log": "Direct upload is not available on this server."
        }

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
                [self.cli, "--config-file", self.config_file, "version"],
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
        """Run arduino-cli compile, output to a known build folder."""
        build_dir = os.path.join(sketch_path, "build_output")
        cmd = [
            self.cli, "--config-file", self.config_file, "compile",
            "--fqbn", fqbn,
            "--warnings", "default",
            "--output-dir", build_dir,
            sketch_path
        ]
        result = self._run(cmd, step="COMPILE")
        result["build_dir"] = build_dir
        return result
    
    def _read_compiled_binary(self, build_dir: str) -> dict:
        """
        Find the compiled .hex or .bin file in build_dir and
        return it as base64 text (so it can travel over JSON/HTTP).
        """
        if not os.path.isdir(build_dir):
            return {"found": False, "error": "Build folder not found."}

        # Look for .hex first (AVR boards like Mark1/Mark2), then .bin (ESP32)
        candidates = glob.glob(os.path.join(build_dir, "*.hex")) or \
                    glob.glob(os.path.join(build_dir, "*.bin"))

        if not candidates:
            return {"found": False, "error": "No compiled .hex or .bin file found."}

        file_path = candidates[0]
        file_name = os.path.basename(file_path)

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        return {
            "found": True,
            "filename": file_name,
            "data_base64": base64.b64encode(file_bytes).decode("utf-8"),
        }

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
                [self.cli, "--config-file", self.config_file, "board", "list"],
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