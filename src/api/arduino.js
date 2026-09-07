// =============================================================
//  src/api/arduino.js
//  ALL communication with the Flask backend lives here.
//  To change the backend URL (e.g. for hosting), edit BASE_URL.
// =============================================================

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

// ── Helper ────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  return data;
}

// ── GET /api/ports ────────────────────────────────────────────
/**
 * Fetch list of available serial ports.
 * @returns {Promise<string[]>} e.g. ["COM3", "/dev/ttyUSB0"]
 */
export async function fetchPorts() {
  try {
    const data = await apiFetch("/api/ports");
    return data.ports || [];
  } catch (err) {
    console.error("[api] fetchPorts failed:", err);
    return [];
  }
}

// ── GET /api/boards ───────────────────────────────────────────
/**
 * Fetch list of supported boards.
 * @returns {Promise<Array<{name: string, fqbn: string, group: string}>>}
 */
export async function fetchBoards() {
  try {
    const data = await apiFetch("/api/boards");
    return data.boards || [];
  } catch (err) {
    console.error("[api] fetchBoards failed:", err);
    return [];
  }
}

// ── GET /api/cli-status ───────────────────────────────────────
/**
 * Check if arduino-cli is installed and working.
 * @returns {Promise<{available: boolean, version?: string, error?: string}>}
 */
export async function fetchCliStatus() {
  try {
    return await apiFetch("/api/cli-status");
  } catch (err) {
    return { available: false, error: "Backend unreachable" };
  }
}

// ── POST /api/upload ──────────────────────────────────────────
/**
 * Compile and upload a sketch to the Arduino.
 * @param {string} code    - Full .ino source code
 * @param {string} fqbn    - Board FQBN e.g. "arduino:avr:nano:cpu=atmega328"
 * @param {string} port    - Serial port e.g. "COM3"
 * @returns {Promise<{success: boolean, log: string}>}
 */
export async function uploadSketch(code, fqbn, port) {
  try {
    const data = await apiFetch("/api/upload", {
      method: "POST",
      body: JSON.stringify({ code, fqbn, port }),
    });
    return data;
  } catch (err) {
    return {
      success: false,
      log: `Connection error: Could not reach backend.\n${err.message}`,
    };
  }
}

// ── POST /api/compile ─────────────────────────────────────────
export async function compileSketch(code, fqbn) {
  try {
    return await apiFetch("/api/compile", {
      method: "POST",
      body: JSON.stringify({ code, fqbn }),
    });
  } catch (err) {
    return { success: false, log: `Connection error.\n${err.message}` };
  }
}

// ── POST /api/flash ───────────────────────────────────────────
export async function flashSketch(fqbn, port) {
  try {
    return await apiFetch("/api/flash", {
      method: "POST",
      body: JSON.stringify({ fqbn, port }),
    });
  } catch (err) {
    return { success: false, log: `Connection error.\n${err.message}` };
  }
}
