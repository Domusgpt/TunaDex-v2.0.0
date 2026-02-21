@echo off
REM TunaDex Daily Trawl — Windows Task Scheduler version
REM
REM Task Scheduler setup:
REM   Trigger: Daily at 6:00 PM
REM   Action: Start a program
REM   Program: cmd.exe
REM   Arguments: /c "C:\path\to\TunaDex-v2.0.0\claude_task\run_daily.bat"

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "LOG_DIR=%PROJECT_DIR%\data\logs"
set "DATE=%date:~10,4%-%date:~4,2%-%date:~7,2%"
set "LOG_FILE=%LOG_DIR%\trawl_%DATE%.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
cd /d "%PROJECT_DIR%"

REM Activate venv if it exists
if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"
if exist "venv\Scripts\activate.bat" call "venv\Scripts\activate.bat"

echo === TunaDex Daily Trawl === >> "%LOG_FILE%"
echo Date: %DATE% >> "%LOG_FILE%"
echo ========================= >> "%LOG_FILE%"

claude -p "Run the daily TunaDex email trawl. Execute: python -m tunadex run --date today. Review the output for anomalies. Summarize the results: emails processed, shipments found, total weight, any anomalies. Confirm data was saved." --allowedTools "Bash(python*)" "Bash(pip*)" "Read" >> "%LOG_FILE%" 2>&1

echo Exit code: %ERRORLEVEL% >> "%LOG_FILE%"
echo Log saved to: %LOG_FILE%
