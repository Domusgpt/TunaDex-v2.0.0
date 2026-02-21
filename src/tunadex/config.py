"""Configuration — env vars, constants, known customers/species."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# --- Paths ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
TOKEN_PATH = Path(os.getenv("TOKEN_PATH", PROJECT_ROOT / "token.json"))
CREDENTIALS_PATH = Path(os.getenv("CREDENTIALS_PATH", PROJECT_ROOT / "credentials.json"))
DATA_DIR = Path(os.getenv("DATA_DIR", PROJECT_ROOT / "data"))

# --- Google OAuth2 ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
OAUTH_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
]

# --- Google Sheets ---
GOOGLE_SHEETS_ID = os.getenv("GOOGLE_SHEETS_ID", "")

# --- Google Drive ---
DRIVE_ROOT_FOLDER_ID = os.getenv("DRIVE_ROOT_FOLDER_ID", "")

# --- GCP / Vertex AI (Gemini) ---
GCP_SA_KEY = os.getenv("GCP_SA_KEY", "")
GCP_SA_KEY_FILE = os.getenv("GCP_SA_KEY_FILE", "")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")
GEMINI_MODEL = "gemini-2.5-flash"

# --- Email search ---
SENDER_QUERIES = [
    "from:victor",
    "from:norman",
]

# --- Known customers (contact name → company) ---
KNOWN_CUSTOMERS: dict[str, str] = {
    "mark": "Mark's Seafood",
    "chade": "Lockwood-Winant",
    "bryan": "Gosman's Fish Market",
    "richie": "Congressional",
    "amos": "Congressional",
    "joseph": "Samuels Seafood",
    "robby": "Great Eastern",
    "mike": "BST Seafood",
    "bob": "BST Seafood",
    "manny": "Stavis",
    "tom": "Emerald Seafood",
    "james": "Emerald Seafood",
    "john": "Emerald Seafood",
    "vinny": "BA Seafood",
}

# --- Known species ---
KNOWN_SPECIES: list[str] = [
    "swordfish",
    "yellowtail",
    "black grouper",
    "yellowfin tuna",
    "bigeye tuna",
    "albacore tuna",
    "salmon",
    "snapper",
    "red snapper",
    "yellowtail snapper",
    "mutton snapper",
    "tilefish",
    "opah",
    "mahi mahi",
    "wahoo",
    "cobia",
    "striped bass",
]

# --- AWB pattern (typically 11 digits, sometimes with prefix) ---
AWB_PATTERN = r"\b(\d{3}[-\s]?\d{4}[-\s]?\d{4})\b"
