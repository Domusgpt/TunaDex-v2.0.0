#!/bin/bash
# TunaDex Daily Trawl — Invoked by cron or Task Scheduler
# Runs Claude Code CLI with the daily trawl prompt
#
# Cron entry (Linux/Mac):
#   0 18 * * 1-6  /path/to/TunaDex-v2.0.0/claude_task/run_daily.sh
#
# This script:
# 1. Changes to the project directory
# 2. Activates the virtual environment (if present)
# 3. Runs Claude Code with the trawl prompt
# 4. Logs the output

set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/data/logs"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$LOG_DIR/trawl_${DATE}.log"

# --- Setup ---
mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"

# Activate venv if it exists
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Load environment variables
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

echo "=== TunaDex Daily Trawl ===" | tee -a "$LOG_FILE"
echo "Date: $DATE" | tee -a "$LOG_FILE"
echo "Time: $(date +%H:%M:%S)" | tee -a "$LOG_FILE"
echo "=========================" | tee -a "$LOG_FILE"

# --- Run Claude Code ---
claude -p "Run the daily TunaDex email trawl. Execute: python -m tunadex run --date today. Review the output for anomalies. Summarize the results: emails processed, shipments found, total weight, any anomalies. Confirm data was saved." \
    --allowedTools "Bash(python*)" "Bash(pip*)" "Read" \
    2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

echo "" | tee -a "$LOG_FILE"
echo "Exit code: $EXIT_CODE" | tee -a "$LOG_FILE"
echo "Log saved to: $LOG_FILE"
