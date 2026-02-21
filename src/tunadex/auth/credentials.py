"""Build authenticated Google API service objects."""

import json
import os
import tempfile

import gspread
from google.oauth2 import service_account as sa_module
from googleapiclient.discovery import build

from tunadex.auth.oauth import load_credentials
from tunadex.config import GCP_LOCATION, GCP_SA_KEY, GCP_SA_KEY_FILE, GOOGLE_SHEETS_ID


def get_gmail_service():
    """Build authenticated Gmail API v1 service."""
    creds = load_credentials()
    return build("gmail", "v1", credentials=creds)


def get_drive_service():
    """Build authenticated Google Drive API v3 service."""
    creds = load_credentials()
    return build("drive", "v3", credentials=creds)


def get_sheets_client() -> gspread.Client:
    """Build authenticated gspread client using OAuth2 credentials."""
    creds = load_credentials()
    return gspread.authorize(creds)


def get_spreadsheet() -> gspread.Spreadsheet:
    """Open the TunaDex dashboard spreadsheet."""
    client = get_sheets_client()
    return client.open_by_key(GOOGLE_SHEETS_ID)


def get_gcp_credentials():
    """Load GCP service account credentials for Vertex AI (Gemini).

    Reads from GCP_SA_KEY env var (JSON string) or GCP_SA_KEY_FILE path.
    """
    if GCP_SA_KEY:
        info = json.loads(GCP_SA_KEY)
        return sa_module.Credentials.from_service_account_info(info), info.get("project_id")

    if GCP_SA_KEY_FILE and os.path.exists(GCP_SA_KEY_FILE):
        creds = sa_module.Credentials.from_service_account_file(GCP_SA_KEY_FILE)
        with open(GCP_SA_KEY_FILE) as f:
            info = json.load(f)
        return creds, info.get("project_id")

    raise EnvironmentError(
        "No GCP service account credentials found. Set GCP_SA_KEY (JSON string) "
        "or GCP_SA_KEY_FILE (path) in your environment."
    )


def get_gcp_sa_key_path() -> str:
    """Get a file path to the SA key (writes temp file if only env var is set).

    Required by Vertex AI SDK which needs GOOGLE_APPLICATION_CREDENTIALS as a path.
    """
    if GCP_SA_KEY_FILE and os.path.exists(GCP_SA_KEY_FILE):
        return GCP_SA_KEY_FILE

    if GCP_SA_KEY:
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
        tmp.write(GCP_SA_KEY)
        tmp.close()
        return tmp.name

    raise EnvironmentError("No GCP SA key available.")
