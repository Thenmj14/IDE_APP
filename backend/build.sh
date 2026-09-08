#!/usr/bin/env bash
set -e

pip install -r requirements.txt

curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

mkdir -p /opt/render/project/bin
mv bin/arduino-cli /opt/render/project/bin/

CLI=/opt/render/project/bin/arduino-cli
CONFIG_FILE=/opt/render/project/bin/arduino-cli.yaml

# Create ONE explicit config file that both build and runtime will use
$CLI config init --dest-file $CONFIG_FILE --overwrite
$CLI --config-file $CONFIG_FILE config set network.connection_timeout 600s

$CLI --config-file $CONFIG_FILE core update-index

for i in 1 2 3; do
  $CLI --config-file $CONFIG_FILE core install arduino:avr && break
  echo "AVR install attempt $i failed, retrying..."
  sleep 5
done

$CLI --config-file $CONFIG_FILE core update-index --additional-urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
for i in 1 2 3; do
  $CLI --config-file $CONFIG_FILE core install esp32:esp32 --additional-urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json && break
  echo "ESP32 install attempt $i failed, retrying..."
  sleep 10
done || echo "⚠️ ESP32 core install failed after retries"

echo "✅ Installed cores:"
$CLI --config-file $CONFIG_FILE core list

echo "✅ Build script finished"