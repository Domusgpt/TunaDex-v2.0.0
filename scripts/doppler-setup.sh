#!/usr/bin/env bash
# One-shot Doppler setup for TunaDex
# Run: ./scripts/doppler-setup.sh
set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   TunaDex — Doppler Secrets Setup    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo

# Step 1: Check if Doppler is installed
if ! command -v doppler &> /dev/null; then
  echo -e "${YELLOW}Installing Doppler CLI...${NC}"
  curl -sLf --retry 3 https://cli.doppler.com/install.sh | sh
fi

# Step 2: Login
echo -e "${BLUE}[1/4]${NC} Logging into Doppler (opens browser)..."
doppler login --overwrite

# Step 3: Create project
echo -e "${BLUE}[2/4]${NC} Creating 'tunadex' project..."
if doppler projects get tunadex --json &>/dev/null 2>&1; then
  echo -e "${GREEN}  Project 'tunadex' already exists.${NC}"
else
  doppler projects create tunadex
  echo -e "${GREEN}  Created project 'tunadex'.${NC}"
fi

# Step 4: Import .env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -f "$ENV_FILE" ]; then
  echo -e "${BLUE}[3/4]${NC} Importing .env into Doppler (tunadex/dev)..."
  doppler secrets upload "$ENV_FILE" --project tunadex --config dev
  echo -e "${GREEN}  Imported $(grep -c '=' "$ENV_FILE") secrets.${NC}"
else
  echo -e "${YELLOW}[3/4] No .env found — skipping import. Add secrets manually in dashboard.${NC}"
fi

# Step 5: Link this directory
echo -e "${BLUE}[4/4]${NC} Linking this directory to tunadex/dev..."
cd "$SCRIPT_DIR/.."
doppler setup --project tunadex --config dev --no-interactive

echo
echo -e "${GREEN}✓ Done! Your secrets are now managed by Doppler.${NC}"
echo
echo -e "  ${BLUE}npm run dev:doppler${NC}    — run with secrets injected"
echo -e "  ${BLUE}npm run secrets:list${NC}   — view all secrets"
echo -e "  ${BLUE}doppler open${NC}           — open dashboard in browser"
echo
echo -e "${YELLOW}You can now delete your .env file if you want — Doppler has your secrets.${NC}"
