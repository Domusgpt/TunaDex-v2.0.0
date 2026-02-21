# TunaDex v2.0.0 — Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAILY TRIGGER LAYER                          │
│                                                                 │
│  ┌─────────────────────┐    ┌────────────────────────────────┐  │
│  │ PRIMARY: Claude Code │    │ BACKUP: GitHub Actions +       │  │
│  │ Scheduled Task       │    │ Gemini 2.5 Flash               │  │
│  │ (Your always-on PC)  │    │ (Cloud fallback)               │  │
│  │                      │    │                                │  │
│  │ cron / Task Scheduler│    │ Checks if Claude ran today;    │  │
│  │ runs `claude -p`     │    │ if not, runs Gemini pipeline   │  │
│  └──────────┬───────────┘    └──────────────┬─────────────────┘  │
│             │                               │                    │
│             └───────────┬───────────────────┘                    │
│                         ▼                                        │
│              ┌──────────────────┐                                │
│              │  tunedex CLI     │                                │
│              │  (Python scripts)│                                │
│              └────────┬─────────┘                                │
└───────────────────────┼──────────────────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────────────────┐
│                DATA PIPELINE                                     │
│                       ▼                                          │
│  ┌────────────────────────────┐                                  │
│  │ 1. EMAIL TRAWLER           │                                  │
│  │    Gmail API (OAuth2)      │                                  │
│  │    Search: Victor, Norman  │                                  │
│  │    Download attachments    │                                  │
│  └────────────┬───────────────┘                                  │
│               ▼                                                  │
│  ┌────────────────────────────┐                                  │
│  │ 2. DATA EXTRACTOR          │                                  │
│  │    AI-powered (Claude or   │                                  │
│  │    Gemini) parses emails   │                                  │
│  │    + attachments into      │                                  │
│  │    structured JSON         │                                  │
│  └────────────┬───────────────┘                                  │
│               ▼                                                  │
│  ┌────────────────────────────┐                                  │
│  │ 3. ANOMALY DETECTOR        │                                  │
│  │    Double-count check      │                                  │
│  │    Missing paperwork flag  │                                  │
│  │    AWB validation          │                                  │
│  └────────────┬───────────────┘                                  │
│               ▼                                                  │
│  ┌────────────────────────────┐                                  │
│  │ 4. STORAGE WRITER          │                                  │
│  │    → Google Drive (raw     │                                  │
│  │      attachments, dated)   │                                  │
│  │    → Google Sheets (live   │                                  │
│  │      structured data)      │                                  │
│  │    → Local JSON (backup)   │                                  │
│  └────────────────────────────┘                                  │
└──────────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────────────────┐
│              DASHBOARD LAYER                                     │
│               ▼                                                  │
│  ┌──────────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │ Google Sheets    │ │ Streamlit    │ │ Static HTML Reports │  │
│  │ (live tabs,      │ │ (interactive │ │ (archived, dated,   │  │
│  │  formatted,      │ │  charts,     │ │  Plotly charts,     │  │
│  │  shareable)      │ │  filters)    │ │  Jinja2 templates)  │  │
│  └──────────────────┘ └──────────────┘ └─────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Critical Authentication Decision

**Gmail API on personal @gmail.com accounts requires OAuth2** (not service account).

- **One-time setup**: You run `tunedex auth` in a browser, consent once, and a refresh token is saved locally
- **All subsequent runs**: Fully automated using the saved refresh token
- **GitHub Actions backup**: The refresh token is stored as a GitHub Secret
- **Scopes needed**:
  - `gmail.readonly` — read emails and attachments
  - `drive.file` — create/manage files in Drive
  - `spreadsheets` — write to Google Sheets

---

## Project Structure

```
TunaDex-v2.0.0/
├── PLAN.md                          # This file
├── README.md                        # Project overview
├── pyproject.toml                   # Python project config (dependencies, scripts)
├── .env.example                     # Template for local env vars
├── .gitignore                       # Secrets, venv, __pycache__, etc.
│
├── src/
│   └── tunadex/
│       ├── __init__.py
│       ├── cli.py                   # CLI entry point: `tunedex run`, `tunedex auth`, `tunedex report`
│       ├── config.py                # Load .env, constants, known customers, species list
│       │
│       ├── auth/
│       │   ├── __init__.py
│       │   ├── oauth.py             # OAuth2 flow: initial consent + token refresh
│       │   └── credentials.py       # Load/save/refresh credentials, build Google services
│       │
│       ├── email/
│       │   ├── __init__.py
│       │   ├── trawler.py           # Gmail API: search, list, read messages
│       │   ├── parser.py            # Parse email body (text/html) for shipment data
│       │   └── attachments.py       # Download and classify attachments (PDF, Excel, image)
│       │
│       ├── extraction/
│       │   ├── __init__.py
│       │   ├── ai_extractor.py      # AI-powered extraction (abstract interface)
│       │   ├── gemini_extractor.py   # Gemini 2.5 Flash implementation
│       │   ├── prompts.py           # Extraction prompts (shared between Claude/Gemini)
│       │   └── schema.py            # Pydantic models for structured output
│       │
│       ├── anomaly/
│       │   ├── __init__.py
│       │   └── detector.py          # Double-count, missing paperwork, AWB validation
│       │
│       ├── storage/
│       │   ├── __init__.py
│       │   ├── drive.py             # Google Drive: create dated folders, upload attachments
│       │   ├── sheets.py            # Google Sheets: push structured data, format tabs
│       │   └── local.py             # Local JSON file storage (backup/archive)
│       │
│       ├── reports/
│       │   ├── __init__.py
│       │   ├── daily.py             # Daily shipment summary
│       │   ├── weekly.py            # Weekly trends + avg swordfish size
│       │   ├── monthly.py           # Monthly deep analysis
│       │   └── html_generator.py    # Jinja2 + Plotly static HTML reports
│       │
│       └── dashboard/
│           ├── __init__.py
│           └── app.py               # Streamlit multi-page dashboard
│
├── templates/
│   ├── daily_report.html            # Jinja2 template for daily HTML report
│   ├── weekly_report.html           # Jinja2 template for weekly HTML report
│   └── monthly_report.html          # Jinja2 template for monthly HTML report
│
├── claude_task/
│   ├── CLAUDE.md                    # Instructions for Claude Code scheduled task
│   └── run_daily.sh                 # Shell script that invokes `claude -p` with the prompt
│
├── .github/
│   └── workflows/
│       └── daily_trawl.yml          # GitHub Actions: Gemini backup cron job
│
├── data/                            # Local data storage (gitignored)
│   ├── raw/                         # Raw email exports by date
│   │   └── 2026-02-21/
│   ├── processed/                   # Structured JSON by date
│   │   └── 2026-02-21.json
│   └── reports/                     # Generated HTML reports
│       ├── daily/
│       ├── weekly/
│       └── monthly/
│
└── tests/
    ├── __init__.py
    ├── test_parser.py
    ├── test_extractor.py
    ├── test_anomaly.py
    └── fixtures/
        ├── sample_email.txt         # Sample email from Victor for testing
        └── sample_attachment.pdf    # Sample attachment for testing
```

---

## Module-by-Module Design

### 1. Authentication (`src/tunadex/auth/`)

#### `oauth.py` — One-time OAuth2 consent + token management

```python
# Key functions:
def run_oauth_flow() -> Credentials:
    """One-time browser-based OAuth2 consent. Saves refresh token to token.json."""

def load_credentials() -> Credentials:
    """Load saved credentials, auto-refresh if expired."""

def get_gmail_service() -> Resource:
    """Build authenticated Gmail API service."""

def get_drive_service() -> Resource:
    """Build authenticated Drive API service."""

def get_sheets_service() -> Resource:
    """Build authenticated Sheets API service (via gspread)."""
```

**Flow**:
1. First run: `tunedex auth` → opens browser → user consents → saves `token.json`
2. All subsequent runs: loads `token.json` → auto-refreshes if expired → returns service objects

**Files created**: `token.json` (gitignored), `credentials.json` (OAuth client ID, gitignored)

---

### 2. Email Trawler (`src/tunadex/email/`)

#### `trawler.py` — Gmail API search and retrieval

```python
class EmailTrawler:
    def __init__(self, gmail_service):
        self.service = gmail_service

    def search_shipment_emails(self, date: date, lookback_days: int = 1) -> list[EmailMessage]:
        """
        Search Gmail for emails from Victor and Norman within date range.
        Gmail query: 'from:(victor OR norman) after:YYYY/MM/DD before:YYYY/MM/DD'
        Also searches subject lines for AWB, shipment, invoice keywords.
        Returns list of EmailMessage objects with metadata.
        """

    def get_message_detail(self, message_id: str) -> EmailDetail:
        """Fetch full message content (body + headers + attachment metadata)."""

    def get_attachment(self, message_id: str, attachment_id: str) -> bytes:
        """Download raw attachment bytes."""
```

#### `parser.py` — Email body parsing

```python
def parse_email_body(body_text: str, body_html: str) -> RawShipmentData:
    """
    First-pass extraction using regex/pattern matching.
    Catches obvious patterns like:
    - AWB numbers (typically 11-digit or alphanumeric)
    - Customer names (matched against known customer list)
    - Species names (matched against known species list)
    - Weight patterns (e.g., "450 lbs", "450#")
    - Box counts (e.g., "12 boxes", "12 bxs")
    Returns partially-filled RawShipmentData for AI to complete.
    """
```

#### `attachments.py` — Attachment classification and handling

```python
def classify_attachment(filename: str, mime_type: str) -> AttachmentType:
    """Classify as PDF, EXCEL, CSV, IMAGE, or OTHER."""

def extract_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF using pdfplumber."""

def extract_from_excel(excel_bytes: bytes) -> list[dict]:
    """Extract rows from Excel using openpyxl."""

def extract_from_image(image_bytes: bytes) -> str:
    """OCR extraction using AI vision (Gemini multimodal)."""
```

---

### 3. AI Data Extraction (`src/tunadex/extraction/`)

#### `schema.py` — Pydantic data models (source of truth for all data structures)

```python
from pydantic import BaseModel
from datetime import date

class ShipmentLine(BaseModel):
    customer_name: str
    company: str | None = None
    species: str
    boxes: int | None = None
    weight_lbs: float | None = None
    size_category: str | None = None    # e.g., "3/4-1 lbs" for yellowtail
    count_per_box: int | None = None    # e.g., 4 count markers
    notes: str | None = None

class Shipment(BaseModel):
    awb: str                            # Air Way Bill — PRIMARY KEY
    date: date
    supplier: str                       # "Victor" or "Norman"
    freight_forwarder: str | None = None
    shipment_lines: list[ShipmentLine]

class DailyPayload(BaseModel):
    date: date
    emails_processed: int
    shipments: list[Shipment]
    anomalies: list[Anomaly]
    totals: ShipmentTotals

class Anomaly(BaseModel):
    type: str                           # "DOUBLE_COUNT", "MISSING_PAPERWORK", "AWB_MISMATCH"
    severity: str                       # "WARNING", "ERROR"
    description: str
    related_awb: str | None = None
    related_emails: list[str] = []

class ShipmentTotals(BaseModel):
    total_boxes: int
    total_weight_lbs: float
    species_breakdown: dict[str, SpeciesTotal]
    customer_breakdown: dict[str, CustomerTotal]
```

#### `prompts.py` — Extraction prompts (used by both Claude Code task and Gemini backup)

```python
EXTRACTION_SYSTEM_PROMPT = """
You are a seafood shipment data extraction agent for a wholesale fish distributor.

Your job is to extract structured shipment data from emails and attachments.

KEY DATA POINTS TO EXTRACT:
- AWB (Air Way Bill): This is the PRIMARY identifier. Usually an 11-digit number.
- Customer name and company
- Species of fish (common: Swordfish, Yellowtail, Tuna, Grouper, Salmon, Snapper, Tilefish, Opah)
- Box count
- Weight in pounds (lbs)
- Size category (for species like Yellowtail: "3/4-1 lbs", "1-2 lbs", "2-4 lbs")
- Count per box (number of fish per box)

KNOWN CUSTOMERS (match loosely — these are the contact names, not always formal):
Mark → Mark's Seafood
Chade → Lockwood-Winant
Bryan → Gosman's Fish Market
Richie, Amos → Congressional
Joseph → Samuels Seafood
Robby → Great Eastern
Mike, Bob → BST Seafood
Manny → Stavis
Tom, James, John → Emerald Seafood
Vinny → BA Seafood
(Any new name with volume details = new customer, include them)

CRITICAL RULES:
1. NEVER fabricate data. If information is missing, mark the field as null and note it.
2. AWB is required — if you can't find an AWB, flag it as an anomaly.
3. Watch for DOUBLE COUNTING: Same AWB appearing in multiple emails = same shipment, not two.
4. Watch for MISSING PAPERWORK: If an email references a shipment but no attachment/details exist.
5. Do NOT track pricing/cost information — skip any dollar amounts.
6. Weights should be in pounds (lbs). Convert if given in kg (1 kg = 2.205 lbs).

OUTPUT FORMAT: Return valid JSON matching the DailyPayload schema.
"""

EXTRACTION_USER_PROMPT_TEMPLATE = """
Process the following email(s) from today ({date}).

EMAIL {n}:
From: {sender}
Subject: {subject}
Date: {email_date}
Body:
{body}

Attachments extracted text:
{attachment_text}

---
Previously extracted shipments today (for dedup):
{existing_shipments_json}

Extract all shipment data and return as structured JSON.
Flag any anomalies (double counts, missing data, mismatched AWBs).
"""
```

#### `gemini_extractor.py` — Gemini 2.5 Flash extraction engine

```python
from google import genai

class GeminiExtractor:
    def __init__(self, api_key: str = None):
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.5-flash"

    def extract_shipments(self, emails: list[EmailDetail],
                          existing: list[Shipment] = None) -> DailyPayload:
        """
        Send emails + attachment text to Gemini for structured extraction.
        Uses response_schema for guaranteed JSON output.
        """

    def extract_from_attachment(self, attachment_bytes: bytes,
                                 attachment_type: str) -> str:
        """Use Gemini multimodal for image OCR or PDF parsing."""
```

---

### 4. Anomaly Detection (`src/tunadex/anomaly/`)

#### `detector.py`

```python
class AnomalyDetector:
    def check_double_counts(self, shipments: list[Shipment]) -> list[Anomaly]:
        """
        Check if the same AWB appears multiple times.
        Same AWB + same customer + same species = likely duplicate.
        Same AWB + different customer = legitimate (split shipment).
        """

    def check_missing_paperwork(self, emails: list[EmailDetail],
                                 shipments: list[Shipment]) -> list[Anomaly]:
        """
        Check if emails reference shipments that have no extracted data.
        e.g., "See attached invoice for AWB 12345" but no attachment found.
        """

    def check_awb_consistency(self, shipments: list[Shipment]) -> list[Anomaly]:
        """
        Validate AWB format (should be ~11 digits).
        Flag unusual AWB patterns.
        Cross-reference AWBs between Victor and Norman emails.
        """

    def check_weight_outliers(self, shipments: list[Shipment]) -> list[Anomaly]:
        """
        Flag shipments with unusually high or low weights
        compared to historical averages for that species.
        """

    def run_all_checks(self, emails, shipments) -> list[Anomaly]:
        """Run all anomaly checks and return consolidated list."""
```

---

### 5. Storage (`src/tunadex/storage/`)

#### `drive.py` — Google Drive attachment storage

```python
class DriveStorage:
    def __init__(self, drive_service, root_folder_id: str):
        self.service = drive_service
        self.root_folder_id = root_folder_id

    def ensure_date_folder(self, d: date) -> str:
        """Create folder structure: TunaDex/2026/02/2026-02-21/ → return folder_id"""

    def upload_attachment(self, file_bytes: bytes, filename: str,
                          mime_type: str, date_folder_id: str) -> str:
        """Upload raw attachment to dated folder. Returns file URL."""

    def list_date_folder(self, d: date) -> list[dict]:
        """List all files in a date folder."""
```

#### `sheets.py` — Google Sheets live dashboard

```python
class SheetsStorage:
    def __init__(self, spreadsheet_id: str):
        self.gc = gspread.service_account_from_dict(...)  # or OAuth
        self.spreadsheet = self.gc.open_by_key(spreadsheet_id)

    def append_daily_data(self, payload: DailyPayload):
        """
        Append shipment rows to the 'Shipments' sheet.
        Columns: Date | AWB | Customer | Company | Species | Boxes | Weight | Size | Notes
        """

    def update_summary_tab(self, payload: DailyPayload):
        """Update the 'Daily Summary' tab with today's totals."""

    def update_customer_tab(self, payload: DailyPayload):
        """Update the 'Customers' tab with running customer totals."""

    def update_anomalies_tab(self, anomalies: list[Anomaly]):
        """Log anomalies to the 'Anomalies' tab."""

    def get_last_update_timestamp(self) -> datetime | None:
        """Check when data was last written (for backup trigger)."""
```

**Google Sheets Tab Structure**:
| Tab Name | Purpose |
|---|---|
| `Shipments` | Raw shipment line data (one row per species per customer per AWB) |
| `Daily Summary` | One row per day: total boxes, weight, email count |
| `Customers` | Running totals per customer: total weight, frequency, top species |
| `Species` | Running totals per species: total weight, box count, customer count |
| `AWB Log` | One row per AWB: date, customer list, total weight, attachment links |
| `Anomalies` | Logged anomalies with severity and resolution status |

#### `local.py` — Local JSON backup

```python
class LocalStorage:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir

    def save_daily_payload(self, payload: DailyPayload):
        """Save to data/processed/YYYY-MM-DD.json"""

    def load_daily_payload(self, d: date) -> DailyPayload | None:
        """Load a specific date's data."""

    def load_date_range(self, start: date, end: date) -> list[DailyPayload]:
        """Load all payloads in a date range for reporting."""

    def save_raw_email(self, email: EmailDetail, d: date):
        """Save raw email content to data/raw/YYYY-MM-DD/"""
```

---

### 6. Reports (`src/tunadex/reports/`)

#### `daily.py`

```python
def generate_daily_report(payload: DailyPayload) -> DailyReport:
    """
    Generate daily summary:
    - Total shipments, boxes, weight
    - Per-customer breakdown
    - Per-species breakdown
    - Anomalies flagged
    - List of AWBs processed
    """
```

#### `weekly.py`

```python
def generate_weekly_report(payloads: list[DailyPayload]) -> WeeklyReport:
    """
    Generate weekly analysis:
    - Day-over-day volume trends
    - Species distribution pie chart data
    - Customer ordering frequency
    - Average swordfish size per customer (REQUIRED)
    - Week-over-week comparison (if previous week data exists)
    """
```

#### `monthly.py`

```python
def generate_monthly_report(payloads: list[DailyPayload]) -> MonthlyReport:
    """
    Generate monthly deep analysis:
    - Volume trend line (daily weights over month)
    - Species distribution changes
    - Top customers ranked by weight
    - Customer loyalty metrics (order frequency)
    - Box-to-weight efficiency ratios
    - Seasonal pattern identification
    - Business recommendations
    """
```

#### `html_generator.py`

```python
def render_report_html(report: DailyReport | WeeklyReport | MonthlyReport,
                        template_name: str) -> str:
    """
    Render report to HTML using Jinja2 template + Plotly charts.
    Charts are embedded as Plotly JSON (interactive in browser).
    Saved to data/reports/{type}/YYYY-MM-DD.html
    """
```

---

### 7. Claude Code Scheduled Task (`claude_task/`)

This is the heart of the primary system. Claude Code runs this daily.

#### `CLAUDE.md` — Claude Code project instructions

```markdown
# TunaDex Daily Trawl Task

You are the daily email trawler for TunaDex, a seafood shipment tracking system.

## Your Mission
Every time you are invoked, run the daily trawl pipeline:
1. Execute `python -m tunadex run --date today`
2. Review the output for any anomalies
3. If anomalies are found, provide a human-readable summary
4. Confirm the payload was successfully stored

## Available Commands
- `python -m tunadex run --date today` — Full daily pipeline
- `python -m tunadex run --date YYYY-MM-DD` — Run for specific date
- `python -m tunadex report daily` — Generate daily report
- `python -m tunadex report weekly` — Generate weekly report
- `python -m tunadex report monthly` — Generate monthly report
- `python -m tunadex auth` — Re-authenticate (if token expired)

## What To Do If Something Fails
- Auth error: Run `python -m tunadex auth` and report the issue
- No emails found: Report "no shipment emails found for {date}"
- Extraction error: Save raw emails and report what failed
- API quota exceeded: Report and suggest running backup
```

#### `run_daily.sh` — Scheduled task launcher

```bash
#!/bin/bash
# TunaDex Daily Trawl — Invoked by cron/Task Scheduler
# Runs Claude Code with the daily trawl prompt

cd /path/to/TunaDex-v2.0.0

claude -p "Run the daily TunaDex email trawl for today. \
Execute 'python -m tunadex run --date today' and report results. \
If there are anomalies, summarize them. \
Confirm data was saved to Google Sheets and Drive." \
--allowedTools "Bash(python*)" "Bash(git*)" "Read" \
2>&1 | tee -a data/logs/claude_$(date +%Y-%m-%d).log
```

**Cron entry** (Linux/Mac):
```
0 18 * * 1-6  /path/to/TunaDex-v2.0.0/claude_task/run_daily.sh
```

**Task Scheduler** (Windows):
- Trigger: Daily at 6:00 PM (after shipment emails arrive)
- Action: Run `run_daily.bat` (Windows equivalent)

---

### 8. GitHub Actions Backup (`.github/workflows/daily_trawl.yml`)

```yaml
name: TunaDex Daily Trawl (Backup)

on:
  schedule:
    - cron: '0 0 * * 1-6'  # Midnight UTC (7PM ET) — runs AFTER Claude's window
  workflow_dispatch:         # Manual trigger

jobs:
  trawl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install -e .

      - name: Check if Claude already ran today
        env:
          GOOGLE_SHEETS_ID: ${{ secrets.GOOGLE_SHEETS_ID }}
          GOOGLE_CREDENTIALS: ${{ secrets.GOOGLE_CREDENTIALS_JSON }}
          GMAIL_TOKEN: ${{ secrets.GMAIL_TOKEN_JSON }}
        run: |
          python -c "
          from tunadex.storage.sheets import SheetsStorage
          from datetime import date, datetime
          s = SheetsStorage(...)
          last = s.get_last_update_timestamp()
          if last and last.date() == date.today():
              print('Claude already ran today. Skipping.')
              exit(0)
          print('Claude did not run. Proceeding with Gemini backup.')
          "

      - name: Run Gemini backup trawl
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GOOGLE_CREDENTIALS: ${{ secrets.GOOGLE_CREDENTIALS_JSON }}
          GMAIL_TOKEN: ${{ secrets.GMAIL_TOKEN_JSON }}
          GOOGLE_SHEETS_ID: ${{ secrets.GOOGLE_SHEETS_ID }}
          DRIVE_ROOT_FOLDER_ID: ${{ secrets.DRIVE_ROOT_FOLDER_ID }}
        run: python -m tunadex run --date today --engine gemini
```

---

### 9. Streamlit Dashboard (`src/tunadex/dashboard/app.py`)

Multi-page Streamlit app with these pages:

| Page | Content |
|---|---|
| **Overview** | Today's shipments, week trend sparkline, anomaly alerts |
| **Customers** | Customer table with filters, per-customer volume charts |
| **Species** | Species distribution pie chart, weight trends by species |
| **AWB Tracker** | Search by AWB, see full shipment details + linked attachments |
| **Anomalies** | Active anomalies table with severity indicators |
| **Reports** | Generate and download daily/weekly/monthly reports |

Data source: Reads from Google Sheets (live) + local JSON (fallback).

Launch: `streamlit run src/tunadex/dashboard/app.py`

---

### 10. CLI Interface (`src/tunadex/cli.py`)

```
tunedex auth          # One-time OAuth2 setup
tunedex run           # Run daily trawl for today
tunedex run --date 2026-02-20  # Run for specific date
tunedex run --engine gemini    # Force Gemini engine
tunedex report daily  # Generate daily report
tunedex report weekly # Generate weekly report
tunedex report monthly # Generate monthly report
tunedex dashboard     # Launch Streamlit dashboard
```

---

## Dependencies (`pyproject.toml`)

```
google-api-python-client    # Gmail, Drive API
google-auth-oauthlib        # OAuth2 flow
google-auth-httplib2        # Auth transport
gspread                     # Google Sheets (high-level)
google-genai                # Gemini 2.5 Flash API
pydantic                    # Data validation/schemas
pdfplumber                  # PDF text extraction
openpyxl                    # Excel file reading
Pillow                      # Image handling
streamlit                   # Interactive dashboard
plotly                      # Charts (Streamlit + HTML reports)
Jinja2                      # HTML report templates
click                       # CLI framework
python-dotenv               # .env file loading
```

---

## Environment Variables (`.env`)

```
# OAuth2 Client (from Google Cloud Console → Credentials → OAuth 2.0 Client ID)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Google Sheets spreadsheet ID (from the sheet URL)
GOOGLE_SHEETS_ID=...

# Google Drive root folder ID (where attachments are stored)
DRIVE_ROOT_FOLDER_ID=...

# Gemini API key (for backup engine — free tier)
GEMINI_API_KEY=...

# Optional: paths
TOKEN_PATH=./token.json
DATA_DIR=./data
```

---

## Implementation Phases

### Phase 1: Foundation (Auth + Email + Basic Extraction)
1. Project scaffolding (pyproject.toml, directory structure, .gitignore)
2. OAuth2 authentication module (one-time consent + token refresh)
3. Gmail trawler (search + read + download attachments)
4. Basic data models (Pydantic schemas)
5. Gemini extractor (structured extraction from email text)
6. Local JSON storage
7. Basic CLI (`tunedex auth`, `tunedex run`)

### Phase 2: Storage + Anomaly Detection
8. Google Drive storage (dated folder creation + attachment upload)
9. Google Sheets integration (structured data push, formatted tabs)
10. Anomaly detector (double-count, missing paperwork, AWB validation)
11. Attachment processing (PDF, Excel, image OCR via Gemini multimodal)

### Phase 3: Dashboard + Reports
12. Streamlit dashboard (all pages)
13. HTML report generator (Jinja2 + Plotly)
14. Daily/weekly/monthly report logic

### Phase 4: Automation
15. Claude Code scheduled task (CLAUDE.md + run_daily.sh)
16. GitHub Actions backup workflow
17. End-to-end testing with sample data

---

## Key Design Decisions

1. **OAuth2 over Service Account for Gmail**: Personal Gmail requires OAuth2. One-time consent, then automated via refresh token.

2. **Gemini 2.5 Flash as primary extraction engine**: Free tier (1,500 req/day), excellent for structured extraction with `response_schema`. Claude Code acts as the orchestrator but the actual AI extraction within the Python scripts uses Gemini.

3. **Claude Code as orchestrator, not extractor**: Claude Code runs the Python pipeline, reviews results, and reports anomalies. It doesn't parse emails directly — the Python scripts + Gemini do that. This keeps Claude Code's role clean and its Max subscription usage minimal.

4. **AWB as primary key**: All shipments are indexed by AWB. This enables deduplication and cross-referencing.

5. **Google Sheets as live data store**: Accessible from anywhere, shareable, and acts as the single source of truth for the dashboard layer.

6. **Anomaly detection runs BEFORE storage**: Catch issues before they pollute the data store.
