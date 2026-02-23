"""Gemini 2.5 Flash extraction engine via Vertex AI."""

from __future__ import annotations

import json
import logging
import os
from datetime import date

import vertexai
from vertexai.generative_models import GenerativeModel, Part

from tunadex.auth.credentials import get_gcp_credentials, get_gcp_sa_key_path
from tunadex.config import GCP_LOCATION, GEMINI_MODEL
from tunadex.extraction.prompts import (
    EMAIL_BLOCK_TEMPLATE,
    EXTRACTION_SYSTEM_PROMPT,
    EXTRACTION_USER_PROMPT,
    IMAGE_PROMPT,
)
from tunadex.extraction.schema import (
    Anomaly,
    AnomalyType,
    EmailDetail,
    Severity,
    Shipment,
    ShipmentLine,
)

logger = logging.getLogger(__name__)


class GeminiExtractor:
    """Extract structured shipment data from emails using Gemini 2.5 Flash."""

    def __init__(self):
        creds, project_id = get_gcp_credentials()
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = get_gcp_sa_key_path()
        vertexai.init(project=project_id, location=GCP_LOCATION, credentials=creds)
        self.model = GenerativeModel(
            GEMINI_MODEL,
            system_instruction=EXTRACTION_SYSTEM_PROMPT,
        )

    def extract_shipments(
        self,
        emails: list[EmailDetail],
        attachment_texts: dict[str, str],
        target_date: date,
        existing_shipments: list[Shipment] | None = None,
    ) -> tuple[list[Shipment], list[Anomaly]]:
        """Extract shipment data from a batch of emails.

        Args:
            emails: List of full email details.
            attachment_texts: Map of message_id to concatenated attachment text.
            target_date: The date being processed.
            existing_shipments: Already-extracted shipments for dedup.

        Returns:
            Tuple of (new shipments, anomalies).
        """
        email_blocks = []
        for i, em in enumerate(emails, 1):
            att_text = attachment_texts.get(em.message_id, "No attachments")
            block = EMAIL_BLOCK_TEMPLATE.format(
                n=i,
                sender=em.sender,
                subject=em.subject,
                email_date=em.date.isoformat() if em.date else "unknown",
                body=em.body_text or "(no plain text body — see HTML)",
                attachment_text=att_text[:10000],  # Limit attachment text size
            )
            email_blocks.append(block)

        existing_json = "None"
        if existing_shipments:
            existing_json = json.dumps(
                [s.model_dump(mode="json") for s in existing_shipments],
                indent=2,
            )

        prompt = EXTRACTION_USER_PROMPT.format(
            date=target_date.isoformat(),
            email_blocks="\n\n".join(email_blocks),
            existing_json=existing_json,
        )

        response = self.model.generate_content(
            prompt,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.1,
                "max_output_tokens": 8192,
            },
        )

        return self._parse_response(response.text, emails)

    def extract_from_image(self, image_bytes: bytes, mime_type: str) -> str:
        """Use Gemini multimodal to OCR an image attachment."""
        image_part = Part.from_data(data=image_bytes, mime_type=mime_type)
        response = self.model.generate_content(
            [IMAGE_PROMPT, image_part],
            generation_config={"temperature": 0.1, "max_output_tokens": 4096},
        )
        return response.text

    def _parse_response(
        self, response_text: str, emails: list[EmailDetail]
    ) -> tuple[list[Shipment], list[Anomaly]]:
        """Parse Gemini JSON response into typed models."""
        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            logger.error("Failed to parse Gemini response as JSON: %s", response_text[:500])
            return [], [
                Anomaly(
                    anomaly_type=AnomalyType.MISSING_DATA,
                    severity=Severity.ERROR,
                    description="AI extraction returned invalid JSON",
                    related_emails=[e.message_id for e in emails],
                )
            ]

        shipments: list[Shipment] = []
        anomalies: list[Anomaly] = []

        for s in data.get("shipments", []):
            try:
                shipment = Shipment(
                    awb=s.get("awb", "MISSING"),
                    date=s.get("date", ""),
                    supplier=s.get("supplier", "Unknown"),
                    freight_forwarder=s.get("freight_forwarder"),
                    lines=[],
                    source_email_ids=[e.message_id for e in emails],
                )
                for line in s.get("lines", []):
                    shipment.lines.append(ShipmentLine(**line))
                shipments.append(shipment)
            except Exception as e:
                logger.warning("Failed to parse shipment: %s — %s", s, e)
                anomalies.append(
                    Anomaly(
                        anomaly_type=AnomalyType.MISSING_DATA,
                        severity=Severity.WARNING,
                        description=f"Failed to parse shipment data: {e}",
                    )
                )

        for a in data.get("anomalies", []):
            try:
                anomalies.append(Anomaly(**a))
            except Exception as e:
                logger.warning("Failed to parse anomaly: %s — %s", a, e)

        return shipments, anomalies
