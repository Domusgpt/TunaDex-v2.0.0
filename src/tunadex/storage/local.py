"""Local JSON storage — save/load daily payloads as backup."""

from __future__ import annotations

import json
import logging
from datetime import date
from pathlib import Path

from tunadex.config import DATA_DIR
from tunadex.extraction.schema import DailyPayload

logger = logging.getLogger(__name__)


class LocalStorage:
    """Manage local JSON file storage for daily payloads."""

    def __init__(self, data_dir: Path | None = None):
        self.data_dir = data_dir or DATA_DIR
        self.processed_dir = self.data_dir / "processed"
        self.raw_dir = self.data_dir / "raw"
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        self.raw_dir.mkdir(parents=True, exist_ok=True)

    def _payload_path(self, d: date) -> Path:
        return self.processed_dir / f"{d.isoformat()}.json"

    def save_daily_payload(self, payload: DailyPayload) -> Path:
        """Save daily payload to data/processed/YYYY-MM-DD.json."""
        path = self._payload_path(payload.date)
        with open(path, "w") as f:
            json.dump(payload.model_dump(mode="json"), f, indent=2, default=str)
        logger.info("Saved daily payload to %s", path)
        return path

    def load_daily_payload(self, d: date) -> DailyPayload | None:
        """Load a specific date's payload. Returns None if not found."""
        path = self._payload_path(d)
        if not path.exists():
            return None
        with open(path) as f:
            data = json.load(f)
        return DailyPayload(**data)

    def load_date_range(self, start: date, end: date) -> list[DailyPayload]:
        """Load all payloads in a date range (inclusive)."""
        payloads: list[DailyPayload] = []
        current = start
        while current <= end:
            payload = self.load_daily_payload(current)
            if payload:
                payloads.append(payload)
            current = date.fromordinal(current.toordinal() + 1)
        return payloads

    def save_raw_email(self, message_id: str, content: str, d: date) -> Path:
        """Save raw email content to data/raw/YYYY-MM-DD/message_id.txt."""
        date_dir = self.raw_dir / d.isoformat()
        date_dir.mkdir(parents=True, exist_ok=True)
        path = date_dir / f"{message_id}.txt"
        with open(path, "w") as f:
            f.write(content)
        return path

    def list_processed_dates(self) -> list[date]:
        """List all dates that have processed data."""
        dates: list[date] = []
        for path in sorted(self.processed_dir.glob("*.json")):
            try:
                d = date.fromisoformat(path.stem)
                dates.append(d)
            except ValueError:
                continue
        return dates
