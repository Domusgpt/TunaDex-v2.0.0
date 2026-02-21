"""Google Sheets storage — push structured data to formatted tabs."""

from __future__ import annotations

import logging
from datetime import date, datetime

import gspread

from tunadex.extraction.schema import Anomaly, DailyPayload, Shipment

logger = logging.getLogger(__name__)

# Tab names
TAB_SHIPMENTS = "Shipments"
TAB_DAILY_SUMMARY = "Daily Summary"
TAB_CUSTOMERS = "Customers"
TAB_SPECIES = "Species"
TAB_AWB_LOG = "AWB Log"
TAB_ANOMALIES = "Anomalies"

SHIPMENTS_HEADERS = [
    "Date", "AWB", "Supplier", "Customer", "Company", "Species",
    "Boxes", "Weight (lbs)", "Size Category", "Count/Box", "Notes",
]
DAILY_SUMMARY_HEADERS = [
    "Date", "Emails Processed", "Shipments", "Total Boxes",
    "Total Weight (lbs)", "Anomalies", "Timestamp",
]
AWB_LOG_HEADERS = [
    "Date", "AWB", "Supplier", "Customer Count", "Total Weight (lbs)",
    "Species List", "Drive Links",
]
ANOMALY_HEADERS = [
    "Date", "Type", "Severity", "Description", "Related AWB", "Timestamp",
]


class SheetsStorage:
    """Manage the TunaDex dashboard spreadsheet."""

    def __init__(self, spreadsheet: gspread.Spreadsheet):
        self.spreadsheet = spreadsheet

    def _ensure_tab(self, title: str, headers: list[str]) -> gspread.Worksheet:
        """Get or create a worksheet tab with headers."""
        try:
            ws = self.spreadsheet.worksheet(title)
        except gspread.WorksheetNotFound:
            ws = self.spreadsheet.add_worksheet(title=title, rows=1000, cols=len(headers))
            ws.update(range_name="A1", values=[headers])
            ws.format("A1:Z1", {"textFormat": {"bold": True}})
        return ws

    def append_shipment_rows(self, payload: DailyPayload) -> int:
        """Append shipment line items to the Shipments tab.

        Returns the number of rows appended.
        """
        ws = self._ensure_tab(TAB_SHIPMENTS, SHIPMENTS_HEADERS)
        rows: list[list] = []

        for shipment in payload.shipments:
            for line in shipment.lines:
                rows.append([
                    payload.date.isoformat(),
                    shipment.awb,
                    shipment.supplier,
                    line.customer_name,
                    line.company or "",
                    line.species,
                    line.boxes if line.boxes is not None else "",
                    line.weight_lbs if line.weight_lbs is not None else "",
                    line.size_category or "",
                    line.count_per_box if line.count_per_box is not None else "",
                    line.notes or "",
                ])

        if rows:
            ws.append_rows(rows, value_input_option="USER_ENTERED")
        return len(rows)

    def update_daily_summary(self, payload: DailyPayload) -> None:
        """Append a row to the Daily Summary tab."""
        ws = self._ensure_tab(TAB_DAILY_SUMMARY, DAILY_SUMMARY_HEADERS)
        row = [
            payload.date.isoformat(),
            payload.emails_processed,
            len(payload.shipments),
            payload.totals.total_boxes,
            payload.totals.total_weight_lbs,
            len(payload.anomalies),
            payload.run_timestamp.isoformat(),
        ]
        ws.append_row(row, value_input_option="USER_ENTERED")

    def update_awb_log(
        self, payload: DailyPayload, drive_links: dict[str, list[str]] | None = None
    ) -> None:
        """Append AWB entries to the AWB Log tab."""
        ws = self._ensure_tab(TAB_AWB_LOG, AWB_LOG_HEADERS)
        rows: list[list] = []
        drive_links = drive_links or {}

        for shipment in payload.shipments:
            customers = set()
            species = set()
            total_weight = 0.0

            for line in shipment.lines:
                customers.add(line.company or line.customer_name)
                species.add(line.species)
                total_weight += line.weight_lbs or 0.0

            links = drive_links.get(shipment.awb, [])
            rows.append([
                payload.date.isoformat(),
                shipment.awb,
                shipment.supplier,
                len(customers),
                total_weight,
                ", ".join(sorted(species)),
                ", ".join(links) if links else "",
            ])

        if rows:
            ws.append_rows(rows, value_input_option="USER_ENTERED")

    def log_anomalies(self, payload: DailyPayload) -> None:
        """Append anomalies to the Anomalies tab."""
        if not payload.anomalies:
            return

        ws = self._ensure_tab(TAB_ANOMALIES, ANOMALY_HEADERS)
        rows: list[list] = []

        for a in payload.anomalies:
            rows.append([
                payload.date.isoformat(),
                a.anomaly_type.value,
                a.severity.value,
                a.description,
                a.related_awb or "",
                payload.run_timestamp.isoformat(),
            ])

        ws.append_rows(rows, value_input_option="USER_ENTERED")

    def push_full_payload(
        self, payload: DailyPayload, drive_links: dict[str, list[str]] | None = None
    ) -> None:
        """Push all payload data to all relevant tabs."""
        rows_added = self.append_shipment_rows(payload)
        logger.info("Added %d shipment rows to Sheets", rows_added)

        self.update_daily_summary(payload)
        self.update_awb_log(payload, drive_links)
        self.log_anomalies(payload)
        logger.info("Daily summary, AWB log, and anomalies updated")

    def get_last_update_timestamp(self) -> datetime | None:
        """Check when data was last written (for backup trigger logic)."""
        try:
            ws = self.spreadsheet.worksheet(TAB_DAILY_SUMMARY)
            values = ws.get_all_values()
            if len(values) < 2:
                return None
            last_row = values[-1]
            timestamp_col = DAILY_SUMMARY_HEADERS.index("Timestamp")
            return datetime.fromisoformat(last_row[timestamp_col])
        except Exception:
            return None
