#!/usr/bin/env python3
"""TunaDex One-Shot Setup — Run this on your machine to configure everything.

This script:
1. Checks that required GCP APIs are enabled (tells you if not)
2. Verifies service account can access the Google Sheet
3. Creates all required tabs (Shipments, Daily Summary, etc.)
4. Creates the "Raw Emails" and "Raw Attachments" tabs for the Apps Script relay
5. Verifies Drive folder access
6. Runs a connectivity test for Vertex AI (Gemini)
7. Prints a summary of what's ready and what still needs manual action

Usage:
    python scripts/setup.py
"""

import json
import os
import sys
from pathlib import Path

# Ensure project root is on the path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))
os.chdir(PROJECT_ROOT)

from dotenv import load_dotenv

load_dotenv()

# ── Formatting helpers ──────────────────────────────────────────────────────

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def ok(msg):
    print(f"  {GREEN}[OK]{RESET} {msg}")


def fail(msg):
    print(f"  {RED}[FAIL]{RESET} {msg}")


def warn(msg):
    print(f"  {YELLOW}[WARN]{RESET} {msg}")


def header(msg):
    print(f"\n{BOLD}{CYAN}{'─' * 50}{RESET}")
    print(f"{BOLD}{CYAN}{msg}{RESET}")
    print(f"{BOLD}{CYAN}{'─' * 50}{RESET}")


# ── Check environment variables ─────────────────────────────────────────────

def check_env():
    header("1. Checking environment variables")
    issues = []

    sa_key_file = os.getenv("GCP_SA_KEY_FILE", "")
    sa_key = os.getenv("GCP_SA_KEY", "")
    sheets_id = os.getenv("GOOGLE_SHEETS_ID", "")
    drive_folder = os.getenv("DRIVE_ROOT_FOLDER_ID", "")

    if sa_key_file and Path(sa_key_file).exists():
        with open(sa_key_file) as f:
            info = json.load(f)
        ok(f"Service account key: {sa_key_file}")
        ok(f"  Project: {info.get('project_id')}")
        ok(f"  Email: {info.get('client_email')}")
        return info.get("client_email", ""), info.get("project_id", "")
    elif sa_key:
        info = json.loads(sa_key)
        ok(f"Service account key: from GCP_SA_KEY env var")
        ok(f"  Project: {info.get('project_id')}")
        ok(f"  Email: {info.get('client_email')}")
        return info.get("client_email", ""), info.get("project_id", "")
    else:
        fail("No service account key found. Set GCP_SA_KEY_FILE or GCP_SA_KEY.")
        sys.exit(1)


# ── Check & enable APIs ────────────────────────────────────────────────────

def check_apis(sa_email, project_id):
    header("2. Checking Google APIs")

    required_apis = {
        "sheets.googleapis.com": "Google Sheets API",
        "drive.googleapis.com": "Google Drive API",
        "aiplatform.googleapis.com": "Vertex AI API",
    }

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        creds = service_account.Credentials.from_service_account_file(
            os.getenv("GCP_SA_KEY_FILE", "service-account-key.json"),
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        service = build("serviceusage", "v1", credentials=creds)

        all_ok = True
        for api, name in required_apis.items():
            try:
                result = service.services().get(
                    name=f"projects/{project_id}/services/{api}"
                ).execute()
                state = result.get("state", "UNKNOWN")
                if state == "ENABLED":
                    ok(f"{name} ({api}): ENABLED")
                else:
                    warn(f"{name} ({api}): {state} — enabling...")
                    try:
                        service.services().enable(
                            name=f"projects/{project_id}/services/{api}"
                        ).execute()
                        ok(f"  Enabled {name}")
                    except Exception as e:
                        fail(f"  Could not enable: {e}")
                        all_ok = False
            except Exception as e:
                fail(f"{name} ({api}): {e}")
                all_ok = False

        if not all_ok:
            print(f"\n  {YELLOW}Manual step needed:{RESET}")
            print(f"  Go to: https://console.cloud.google.com/apis/library?project={project_id}")
            print(f"  Enable: Google Sheets API, Google Drive API, Vertex AI API")
            return False
        return True

    except Exception as e:
        warn(f"Could not check APIs programmatically: {e}")
        print(f"\n  {YELLOW}Manual step needed:{RESET}")
        print(f"  Go to: https://console.cloud.google.com/apis/library?project={project_id}")
        print(f"  Enable: Google Sheets API, Google Drive API, Vertex AI API")
        return False


# ── Check Sheets access ────────────────────────────────────────────────────

def check_sheets(sa_email):
    header("3. Checking Google Sheets access")

    sheets_id = os.getenv("GOOGLE_SHEETS_ID", "")
    if not sheets_id:
        fail("GOOGLE_SHEETS_ID not set in .env")
        return False

    ok(f"Sheet ID: {sheets_id}")

    try:
        from tunadex.auth.credentials import get_spreadsheet

        ss = get_spreadsheet()
        ok(f"Sheet title: {ss.title}")
        ok(f"Existing tabs: {[w.title for w in ss.worksheets()]}")
        return True

    except PermissionError:
        fail(f"Service account cannot access the sheet.")
        print(f"\n  {YELLOW}Manual step needed:{RESET}")
        print(f"  1. Open: https://docs.google.com/spreadsheets/d/{sheets_id}")
        print(f"  2. Click 'Share' (top right)")
        print(f"  3. Add: {BOLD}{sa_email}{RESET}")
        print(f"  4. Set role to 'Editor'")
        print(f"  5. Click 'Send' (uncheck 'Notify people' if you want)")
        print(f"  6. Re-run this script")
        return False

    except Exception as e:
        fail(f"Sheet access error: {e}")
        return False


# ── Create required tabs ───────────────────────────────────────────────────

def create_tabs():
    header("4. Creating required Sheet tabs")

    from tunadex.auth.credentials import get_spreadsheet
    from tunadex.storage.sheets import (
        ANOMALY_HEADERS,
        AWB_LOG_HEADERS,
        DAILY_SUMMARY_HEADERS,
        SHIPMENTS_HEADERS,
        TAB_ANOMALIES,
        TAB_AWB_LOG,
        TAB_DAILY_SUMMARY,
        TAB_SHIPMENTS,
    )

    ss = get_spreadsheet()

    # All tabs we need (data tabs + relay tabs)
    tabs = {
        TAB_SHIPMENTS: SHIPMENTS_HEADERS,
        TAB_DAILY_SUMMARY: DAILY_SUMMARY_HEADERS,
        "Customers": ["Customer", "Company", "Total Boxes", "Total Weight (lbs)", "Order Count", "Last Order"],
        "Species": ["Species", "Total Boxes", "Total Weight (lbs)", "Customer Count", "Last Seen"],
        TAB_AWB_LOG: AWB_LOG_HEADERS,
        TAB_ANOMALIES: ANOMALY_HEADERS,
        "Raw Emails": [
            "Message ID", "Thread ID", "Subject", "Sender",
            "Date", "Body Text", "Attachment Count", "Relay Timestamp",
        ],
        "Raw Attachments": [
            "Message ID", "Filename", "MIME Type", "Size Bytes",
            "Drive File ID", "Drive URL", "Relay Timestamp",
        ],
    }

    existing = {w.title for w in ss.worksheets()}

    for tab_name, headers in tabs.items():
        if tab_name in existing:
            ok(f"Tab '{tab_name}': already exists")
        else:
            ws = ss.add_worksheet(title=tab_name, rows=1000, cols=len(headers))
            ws.update(range_name="A1", values=[headers])
            ws.format("A1:Z1", {"textFormat": {"bold": True}})
            ok(f"Tab '{tab_name}': CREATED with headers")

    # Remove default "Sheet1" if it exists and we have other tabs
    try:
        sheet1 = ss.worksheet("Sheet1")
        if len(ss.worksheets()) > 1:
            ss.del_worksheet(sheet1)
            ok("Removed default 'Sheet1' tab")
    except Exception:
        pass


# ── Check Drive access ─────────────────────────────────────────────────────

def check_drive(sa_email):
    header("5. Checking Google Drive access")

    folder_id = os.getenv("DRIVE_ROOT_FOLDER_ID", "")
    if not folder_id:
        fail("DRIVE_ROOT_FOLDER_ID not set in .env")
        return False

    ok(f"Drive folder ID: {folder_id}")

    try:
        from tunadex.auth.credentials import get_drive_service

        drive = get_drive_service()
        result = drive.files().get(fileId=folder_id, fields="name,id").execute()
        ok(f"Folder name: {result.get('name')}")
        return True

    except Exception as e:
        error_str = str(e)
        if "404" in error_str or "not found" in error_str.lower():
            fail(f"Folder not found. Check DRIVE_ROOT_FOLDER_ID in .env")
        elif "403" in error_str or "permission" in error_str.lower():
            fail(f"Service account cannot access the Drive folder.")
            print(f"\n  {YELLOW}Manual step needed:{RESET}")
            print(f"  1. Open: https://drive.google.com/drive/folders/{folder_id}")
            print(f"  2. Click the folder name (top) -> 'Share'")
            print(f"  3. Add: {BOLD}{sa_email}{RESET}")
            print(f"  4. Set role to 'Editor'")
        else:
            fail(f"Drive error: {e}")
        return False


# ── Test Vertex AI / Gemini ────────────────────────────────────────────────

def check_gemini():
    header("6. Testing Gemini (Vertex AI)")

    try:
        from tunadex.extraction.gemini_extractor import GeminiExtractor

        extractor = GeminiExtractor()
        ok(f"Vertex AI initialized")

        # Quick test
        response = extractor.model.generate_content(
            "Reply with exactly: TUNADEX_OK",
            generation_config={"temperature": 0.0, "max_output_tokens": 20},
        )
        if "TUNADEX_OK" in response.text:
            ok(f"Gemini responded correctly: {response.text.strip()}")
        else:
            warn(f"Gemini responded but unexpectedly: {response.text.strip()}")
        return True

    except Exception as e:
        fail(f"Gemini error: {e}")
        print(f"\n  {YELLOW}This might mean:{RESET}")
        print(f"  - Vertex AI API not enabled")
        print(f"  - Service account needs 'Vertex AI User' role")
        return False


# ── Create local data directories ──────────────────────────────────────────

def create_data_dirs():
    header("7. Creating local data directories")

    data_dir = Path(os.getenv("DATA_DIR", "data"))
    dirs = [
        data_dir / "raw",
        data_dir / "processed",
        data_dir / "reports" / "daily",
        data_dir / "reports" / "weekly",
        data_dir / "reports" / "monthly",
        data_dir / "logs",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
        ok(f"{d}")


# ── Summary ────────────────────────────────────────────────────────────────

def main():
    print(f"\n{BOLD}{'=' * 50}{RESET}")
    print(f"{BOLD} TunaDex v2.0 — One-Shot Setup{RESET}")
    print(f"{BOLD}{'=' * 50}{RESET}")

    sa_email, project_id = check_env()
    apis_ok = check_apis(sa_email, project_id)

    if not apis_ok:
        print(f"\n{YELLOW}Fix the API issues above, then re-run this script.{RESET}")
        create_data_dirs()
        return

    sheets_ok = check_sheets(sa_email)

    if sheets_ok:
        create_tabs()
    else:
        print(f"\n{YELLOW}Fix sheet sharing above, then re-run this script.{RESET}")

    drive_ok = check_drive(sa_email)

    if not drive_ok and sheets_ok:
        print(f"\n{YELLOW}Fix Drive sharing above, then re-run this script.{RESET}")

    gemini_ok = False
    if apis_ok:
        gemini_ok = check_gemini()

    create_data_dirs()

    # Final summary
    header("SETUP SUMMARY")
    checks = [
        ("Service Account", True),
        ("Google APIs", apis_ok),
        ("Google Sheets", sheets_ok),
        ("Sheet Tabs", sheets_ok),
        ("Google Drive", drive_ok),
        ("Gemini (Vertex AI)", gemini_ok),
        ("Local Directories", True),
    ]

    all_pass = True
    for name, passed in checks:
        if passed:
            print(f"  {GREEN}[PASS]{RESET} {name}")
        else:
            print(f"  {RED}[FAIL]{RESET} {name}")
            all_pass = False

    if all_pass:
        print(f"\n{GREEN}{BOLD}All checks passed! TunaDex is ready.{RESET}")
        print(f"\nNext steps:")
        print(f"  1. Deploy the Apps Script: paste apps_script/EmailRelay.gs into script.google.com")
        print(f"  2. Run setupTrigger() in Apps Script to start auto-relaying emails")
        print(f"  3. Wait for emails to appear in the 'Raw Emails' tab")
        print(f"  4. Run: python -m tunadex run --source sheet")
    else:
        print(f"\n{YELLOW}Some checks failed. Fix the issues above and re-run:{RESET}")
        print(f"  python scripts/setup.py")

    print(f"\n{BOLD}Service account email (for sharing):{RESET}")
    print(f"  {CYAN}{sa_email}{RESET}")


if __name__ == "__main__":
    main()
