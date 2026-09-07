#!/usr/bin/env bash
set -e

# Install Python dependencies
pip install -r requirements.txt

# Install arduino-cli
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# Move arduino-cli to a place the app can find it
mkdir -p /opt/render/project/bin
mv bin/arduino-cli /opt/render/project/bin/

CLI=/opt/render/project/bin/arduino-cli

# Increase network timeout to handle slow/large downloads
$CLI config init --overwrite
$CLI config set network.connection_timeout 600s

$CLI core update-index

# Install AVR (needed for Mark1 / Mark2) — retry up to 3 times
for i in 1 2 3; do
  $CLI core install arduino:avr && break
  echo "AVR install attempt $i failed, retrying..."
  sleep 5
done

# Install ESP32 (needed for IoT LED Cube) — retry up to 3 times
# Don't let this fail the whole build if it still doesn't work
$CLI core update-index --additional-urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
for i in 1 2 3; do
  $CLI core install esp32:esp32 --additional-urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json && break
  echo "ESP32 install attempt $i failed, retrying..."
  sleep 10
done || echo "⚠️ ESP32 core install failed after retries — AVR still works, will retry ESP32 later"

echo "✅ Build script finished"