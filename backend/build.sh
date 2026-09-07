#!/usr/bin/env bash
# Install Python dependencies
pip install -r requirements.txt

# Install arduino-cli
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# Move arduino-cli to a place the app can find it
mkdir -p /opt/render/project/bin
mv bin/arduino-cli /opt/render/project/bin/

# Install AVR + ESP32 board cores (so it can compile for your boards)
/opt/render/project/bin/arduino-cli core update-index
/opt/render/project/bin/arduino-cli core install arduino:avr
/opt/render/project/bin/arduino-cli core update-index --additional-urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
/opt/render/project/bin/arduino-cli core install esp32:esp32 --additional-urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json