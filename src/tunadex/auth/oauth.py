"""OAuth2 flow — one-time browser consent + automatic token refresh."""

import json
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

from tunadex.config import (
    CREDENTIALS_PATH,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    OAUTH_SCOPES,
    TOKEN_PATH,
)


def _build_client_config() -> dict:
    """Build OAuth2 client config from env vars or credentials.json file."""
    if CREDENTIALS_PATH.exists():
        with open(CREDENTIALS_PATH) as f:
            return json.load(f)

    if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
        return {
            "installed": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost"],
            }
        }

    raise FileNotFoundError(
        "No OAuth2 credentials found. Either place credentials.json in the "
        "project root or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env. "
        "See .env.example for details."
    )


def run_oauth_flow(token_path: Path | None = None) -> Credentials:
    """Run interactive OAuth2 consent flow. Opens browser, saves refresh token.

    This only needs to be run ONCE. After that, load_credentials() handles
    automatic token refresh.
    """
    token_path = token_path or TOKEN_PATH
    client_config = _build_client_config()
    flow = InstalledAppFlow.from_client_config(client_config, OAUTH_SCOPES)
    creds = flow.run_local_server(port=0)

    token_path.parent.mkdir(parents=True, exist_ok=True)
    with open(token_path, "w") as f:
        f.write(creds.to_json())

    return creds


def load_credentials(token_path: Path | None = None) -> Credentials:
    """Load saved credentials, auto-refresh if expired.

    Raises FileNotFoundError if token.json doesn't exist (run `tunedex auth` first).
    """
    token_path = token_path or TOKEN_PATH

    if not token_path.exists():
        raise FileNotFoundError(
            f"No token found at {token_path}. Run `tunedex auth` first to "
            "complete the one-time OAuth2 setup."
        )

    creds = Credentials.from_authorized_user_file(str(token_path), OAUTH_SCOPES)

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(token_path, "w") as f:
            f.write(creds.to_json())

    return creds
