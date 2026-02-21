#!/usr/bin/env bash
# Import existing .env secrets into Doppler
# Usage: ./scripts/doppler-import.sh [config]
#   config defaults to "dev"
set -euo pipefail

CONFIG="${1:-dev}"
ENV_FILE="${2:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

echo "Importing $ENV_FILE into Doppler project 'tunadex' config '$CONFIG'..."
doppler secrets upload "$ENV_FILE" --project tunadex --config "$CONFIG"
echo "Done! Run 'doppler secrets' to verify."
