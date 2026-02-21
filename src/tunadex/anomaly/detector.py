"""Anomaly detection — double-counts, missing paperwork, AWB validation, weight outliers."""

from __future__ import annotations

import re
from collections import Counter

from tunadex.config import AWB_PATTERN
from tunadex.extraction.schema import (
    Anomaly,
    AnomalyType,
    EmailDetail,
    Severity,
    Shipment,
)

# Rough weight ranges per species (lbs per box) for outlier detection
SPECIES_WEIGHT_RANGES: dict[str, tuple[float, float]] = {
    "swordfish": (40.0, 500.0),
    "yellowtail": (5.0, 200.0),
    "yellowfin tuna": (20.0, 400.0),
    "bigeye tuna": (20.0, 500.0),
    "albacore tuna": (10.0, 200.0),
    "black grouper": (5.0, 150.0),
    "salmon": (5.0, 150.0),
    "snapper": (5.0, 100.0),
    "red snapper": (5.0, 100.0),
    "tilefish": (5.0, 100.0),
    "opah": (20.0, 300.0),
    "mahi mahi": (5.0, 150.0),
}


class AnomalyDetector:
    """Detect data quality issues in extracted shipment data."""

    def check_double_counts(self, shipments: list[Shipment]) -> list[Anomaly]:
        """Check if the same AWB appears multiple times (potential double-count).

        Same AWB + same customer + same species = likely duplicate.
        Same AWB + different customers = legitimate split shipment (no anomaly).
        """
        anomalies: list[Anomaly] = []
        awb_counts = Counter(s.awb for s in shipments if s.awb != "MISSING")

        for awb, count in awb_counts.items():
            if count <= 1:
                continue

            dupes = [s for s in shipments if s.awb == awb]
            # Check if it's truly duplicate data vs. split shipment
            all_lines = []
            for s in dupes:
                for line in s.lines:
                    key = (line.customer_name.lower(), line.species.lower())
                    all_lines.append(key)

            line_counts = Counter(all_lines)
            duplicate_lines = {k: v for k, v in line_counts.items() if v > 1}

            if duplicate_lines:
                desc_parts = [f"{k[0]}/{k[1]} (x{v})" for k, v in duplicate_lines.items()]
                anomalies.append(
                    Anomaly(
                        anomaly_type=AnomalyType.DOUBLE_COUNT,
                        severity=Severity.ERROR,
                        description=(
                            f"AWB {awb} appears {count} times with duplicate line items: "
                            + ", ".join(desc_parts)
                            + ". This is likely double-counted."
                        ),
                        related_awb=awb,
                        related_emails=[
                            eid for s in dupes for eid in s.source_email_ids
                        ],
                    )
                )
            else:
                anomalies.append(
                    Anomaly(
                        anomaly_type=AnomalyType.DOUBLE_COUNT,
                        severity=Severity.WARNING,
                        description=(
                            f"AWB {awb} appears in {count} emails but with different "
                            "line items — may be a split shipment (review manually)."
                        ),
                        related_awb=awb,
                        related_emails=[
                            eid for s in dupes for eid in s.source_email_ids
                        ],
                    )
                )

        return anomalies

    def check_missing_paperwork(
        self,
        emails: list[EmailDetail],
        shipments: list[Shipment],
    ) -> list[Anomaly]:
        """Check if emails reference shipments that have no extracted data.

        Looks for AWB mentions in email text that don't appear in extracted shipments.
        """
        anomalies: list[Anomaly] = []
        extracted_awbs = {s.awb for s in shipments if s.awb != "MISSING"}

        for email in emails:
            text = email.body_text + " " + email.subject
            mentioned_awbs = re.findall(AWB_PATTERN, text)
            mentioned_awbs = [re.sub(r"[-\s]", "", a) for a in mentioned_awbs]

            for awb in mentioned_awbs:
                if awb not in extracted_awbs:
                    anomalies.append(
                        Anomaly(
                            anomaly_type=AnomalyType.MISSING_PAPERWORK,
                            severity=Severity.WARNING,
                            description=(
                                f"Email '{email.subject}' mentions AWB {awb} but no "
                                "shipment data was extracted for it. Missing paperwork?"
                            ),
                            related_awb=awb,
                            related_emails=[email.message_id],
                        )
                    )

        return anomalies

    def check_awb_consistency(self, shipments: list[Shipment]) -> list[Anomaly]:
        """Validate AWB format and flag missing AWBs."""
        anomalies: list[Anomaly] = []
        clean_pattern = re.compile(r"^\d{11}$")

        for shipment in shipments:
            if shipment.awb == "MISSING":
                anomalies.append(
                    Anomaly(
                        anomaly_type=AnomalyType.MISSING_AWB,
                        severity=Severity.ERROR,
                        description=(
                            f"Shipment from {shipment.supplier} on {shipment.date} "
                            "has no AWB. This needs manual review."
                        ),
                        related_emails=shipment.source_email_ids,
                    )
                )
            elif not clean_pattern.match(shipment.awb):
                anomalies.append(
                    Anomaly(
                        anomaly_type=AnomalyType.AWB_MISMATCH,
                        severity=Severity.WARNING,
                        description=(
                            f"AWB '{shipment.awb}' has non-standard format "
                            "(expected 11 digits). Verify correctness."
                        ),
                        related_awb=shipment.awb,
                        related_emails=shipment.source_email_ids,
                    )
                )

        return anomalies

    def check_weight_outliers(self, shipments: list[Shipment]) -> list[Anomaly]:
        """Flag shipments with unusually high or low total weight per species."""
        anomalies: list[Anomaly] = []

        for shipment in shipments:
            for line in shipment.lines:
                if line.weight_lbs is None:
                    continue

                species_key = line.species.lower()
                weight_range = SPECIES_WEIGHT_RANGES.get(species_key)
                if not weight_range:
                    continue

                min_w, max_w = weight_range
                if line.weight_lbs < min_w or line.weight_lbs > max_w:
                    anomalies.append(
                        Anomaly(
                            anomaly_type=AnomalyType.WEIGHT_OUTLIER,
                            severity=Severity.WARNING,
                            description=(
                                f"AWB {shipment.awb}: {line.species} to "
                                f"{line.customer_name} weighs {line.weight_lbs} lbs, "
                                f"outside typical range ({min_w}-{max_w} lbs). "
                                "Verify weight."
                            ),
                            related_awb=shipment.awb,
                            related_emails=shipment.source_email_ids,
                        )
                    )

        return anomalies

    def run_all_checks(
        self,
        emails: list[EmailDetail],
        shipments: list[Shipment],
    ) -> list[Anomaly]:
        """Run all anomaly checks and return consolidated list."""
        anomalies: list[Anomaly] = []
        anomalies.extend(self.check_double_counts(shipments))
        anomalies.extend(self.check_missing_paperwork(emails, shipments))
        anomalies.extend(self.check_awb_consistency(shipments))
        anomalies.extend(self.check_weight_outliers(shipments))
        return anomalies
