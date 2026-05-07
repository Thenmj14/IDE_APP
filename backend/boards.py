# =============================================================
#  boards.py — All supported Arduino boards in one place.
#  To add a new board: append one dict to BOARDS list.
# =============================================================

BOARDS = [
    # ── AVR ───────────────────────────────────────────────────
    {
        "name": "Arduino Nano (ATmega328P)",
        "fqbn": "arduino:avr:nano:cpu=atmega328",
        "group": "Arduino AVR",
    },
    {
        "name": "Arduino Nano (ATmega328P Old Bootloader)",
        "fqbn": "arduino:avr:nano:cpu=atmega328old",
        "group": "Arduino AVR",
    },
    {
        "name": "Arduino Uno",
        "fqbn": "arduino:avr:uno",
        "group": "Arduino AVR",
    },
    {
        "name": "Arduino Mega 2560",
        "fqbn": "arduino:avr:mega:cpu=atmega2560",
        "group": "Arduino AVR",
    },
    {
        "name": "Arduino Leonardo",
        "fqbn": "arduino:avr:leonardo",
        "group": "Arduino AVR",
    },
    {
        "name": "Arduino Pro Mini (3.3V, 8MHz)",
        "fqbn": "arduino:avr:pro:cpu=8MHzatmega328",
        "group": "Arduino AVR",
    },
    {
        "name": "Arduino Pro Mini (5V, 16MHz)",
        "fqbn": "arduino:avr:pro:cpu=16MHzatmega328",
        "group": "Arduino AVR",
    },

    # ── ESP32 ─────────────────────────────────────────────────
    {
        "name": "ESP32 Dev Module",
        "fqbn": "esp32:esp32:esp32",
        "group": "ESP32",
    },
    {
        "name": "ESP32-C3 Dev Module",
        "fqbn": "esp32:esp32:esp32c3",
        "group": "ESP32",
    },
    {
        "name": "ESP32-S3 Dev Module",
        "fqbn": "esp32:esp32:esp32s3",
        "group": "ESP32",
    },

    # ── ESP8266 ───────────────────────────────────────────────
    {
        "name": "NodeMCU 1.0 (ESP-12E)",
        "fqbn": "esp8266:esp8266:nodemcuv2",
        "group": "ESP8266",
    },
]


def get_boards():
    """Return the full boards list as a list of dicts."""
    return BOARDS


def get_fqbn(board_name: str) -> str | None:
    """Look up fqbn by board display name. Returns None if not found."""
    for board in BOARDS:
        if board["name"] == board_name:
            return board["fqbn"]
    return None