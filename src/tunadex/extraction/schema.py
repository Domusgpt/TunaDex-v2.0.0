"""Pydantic data models — single source of truth for all data structures."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field


class AttachmentType(str, Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    IMAGE = "image"
    OTHER = "other"


class AnomalyType(str, Enum):
    DOUBLE_COUNT = "DOUBLE_COUNT"
    MISSING_PAPERWORK = "MISSING_PAPERWORK"
    AWB_MISMATCH = "AWB_MISMATCH"
    WEIGHT_OUTLIER = "WEIGHT_OUTLIER"
    MISSING_AWB = "MISSING_AWB"
    MISSING_DATA = "MISSING_DATA"


class Severity(str, Enum):
    WARNING = "WARNING"
    ERROR = "ERROR"


# --- Email models ---


class AttachmentMeta(BaseModel):
    attachment_id: str
    filename: str
    mime_type: str
    size_bytes: int = 0
    attachment_type: AttachmentType = AttachmentType.OTHER
    drive_url: str | None = None


class EmailMessage(BaseModel):
    """Lightweight email reference from Gmail search results."""
    message_id: str
    thread_id: str
    subject: str = ""
    sender: str = ""
    date: datetime | None = None
    snippet: str = ""


class EmailDetail(BaseModel):
    """Full email content after fetching message detail."""
    message_id: str
    thread_id: str
    subject: str = ""
    sender: str = ""
    date: datetime | None = None
    body_text: str = ""
    body_html: str = ""
    attachments: list[AttachmentMeta] = Field(default_factory=list)


# --- Shipment models ---


class ShipmentLine(BaseModel):
    """Single line item within a shipment (one species to one customer)."""
    customer_name: str
    company: str | None = None
    species: str
    boxes: int | None = None
    weight_lbs: float | None = None
    size_category: str | None = None
    count_per_box: int | None = None
    notes: str | None = None


class Shipment(BaseModel):
    """A shipment identified by its AWB."""
    awb: str
    date: date
    supplier: str  # "Victor" or "Norman"
    freight_forwarder: str | None = None
    lines: list[ShipmentLine] = Field(default_factory=list)
    source_email_ids: list[str] = Field(default_factory=list)


# --- Anomaly models ---


class Anomaly(BaseModel):
    anomaly_type: AnomalyType
    severity: Severity
    description: str
    related_awb: str | None = None
    related_emails: list[str] = Field(default_factory=list)


# --- Totals / aggregation ---


class SpeciesTotal(BaseModel):
    boxes: int = 0
    weight_lbs: float = 0.0


class CustomerTotal(BaseModel):
    boxes: int = 0
    weight_lbs: float = 0.0
    order_count: int = 0


class ShipmentTotals(BaseModel):
    total_boxes: int = 0
    total_weight_lbs: float = 0.0
    species_breakdown: dict[str, SpeciesTotal] = Field(default_factory=dict)
    customer_breakdown: dict[str, CustomerTotal] = Field(default_factory=dict)


# --- Daily payload (the "drop" from the trawl) ---


class DailyPayload(BaseModel):
    """Complete output of a daily trawl run."""
    date: date
    run_timestamp: datetime
    emails_processed: int = 0
    shipments: list[Shipment] = Field(default_factory=list)
    anomalies: list[Anomaly] = Field(default_factory=list)
    totals: ShipmentTotals = Field(default_factory=ShipmentTotals)

    def compute_totals(self) -> None:
        """Recalculate totals from shipment lines."""
        total_boxes = 0
        total_weight = 0.0
        species: dict[str, SpeciesTotal] = {}
        customers: dict[str, CustomerTotal] = {}

        for shipment in self.shipments:
            for line in shipment.lines:
                boxes = line.boxes or 0
                weight = line.weight_lbs or 0.0
                total_boxes += boxes
                total_weight += weight

                sp = species.setdefault(line.species, SpeciesTotal())
                sp.boxes += boxes
                sp.weight_lbs += weight

                name = line.company or line.customer_name
                ct = customers.setdefault(name, CustomerTotal())
                ct.boxes += boxes
                ct.weight_lbs += weight
                ct.order_count += 1

        self.totals = ShipmentTotals(
            total_boxes=total_boxes,
            total_weight_lbs=total_weight,
            species_breakdown=species,
            customer_breakdown=customers,
        )
