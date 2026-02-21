"""Gmail API trawler — search for shipment emails, read messages, download attachments."""

from __future__ import annotations

import base64
import email.utils
from datetime import date, datetime, timedelta

from tunadex.extraction.schema import AttachmentMeta, AttachmentType, EmailDetail, EmailMessage


def _classify_attachment(filename: str, mime_type: str) -> AttachmentType:
    fname = filename.lower()
    mime = mime_type.lower()
    if fname.endswith(".pdf") or "pdf" in mime:
        return AttachmentType.PDF
    if fname.endswith((".xlsx", ".xls")) or "spreadsheet" in mime or "excel" in mime:
        return AttachmentType.EXCEL
    if fname.endswith(".csv") or "csv" in mime:
        return AttachmentType.CSV
    if fname.endswith((".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff")) or mime.startswith("image/"):
        return AttachmentType.IMAGE
    return AttachmentType.OTHER


def _parse_date(headers: list[dict]) -> datetime | None:
    for h in headers:
        if h["name"].lower() == "date":
            parsed = email.utils.parsedate_to_datetime(h["value"])
            return parsed
    return None


def _get_header(headers: list[dict], name: str) -> str:
    for h in headers:
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def _decode_body(data: str) -> str:
    if not data:
        return ""
    padded = data + "=" * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace")


def _extract_body_parts(payload: dict) -> tuple[str, str]:
    """Recursively extract text and HTML body from MIME parts."""
    text_body = ""
    html_body = ""

    mime_type = payload.get("mimeType", "")
    body_data = payload.get("body", {}).get("data", "")

    if mime_type == "text/plain" and body_data:
        text_body = _decode_body(body_data)
    elif mime_type == "text/html" and body_data:
        html_body = _decode_body(body_data)

    for part in payload.get("parts", []):
        t, h = _extract_body_parts(part)
        if t:
            text_body = text_body or t
        if h:
            html_body = html_body or h

    return text_body, html_body


class EmailTrawler:
    """Search Gmail for shipment emails and retrieve their content."""

    def __init__(self, gmail_service):
        self.service = gmail_service

    def search_shipment_emails(
        self, target_date: date, lookback_days: int = 1
    ) -> list[EmailMessage]:
        """Search Gmail for emails from Victor/Norman within date range.

        Args:
            target_date: The date to search for.
            lookback_days: How many days back to also include (default 1 = today + yesterday).

        Returns:
            List of EmailMessage objects with metadata.
        """
        after_date = target_date - timedelta(days=lookback_days)
        before_date = target_date + timedelta(days=1)

        query = (
            f"(from:victor OR from:norman) "
            f"after:{after_date.strftime('%Y/%m/%d')} "
            f"before:{before_date.strftime('%Y/%m/%d')}"
        )

        messages: list[EmailMessage] = []
        page_token = None

        while True:
            kwargs: dict = {"userId": "me", "q": query, "maxResults": 100}
            if page_token:
                kwargs["pageToken"] = page_token

            result = self.service.users().messages().list(**kwargs).execute()

            for msg in result.get("messages", []):
                # Fetch minimal headers for the listing
                meta = (
                    self.service.users()
                    .messages()
                    .get(userId="me", id=msg["id"], format="metadata",
                         metadataHeaders=["Subject", "From", "Date"])
                    .execute()
                )
                headers = meta.get("payload", {}).get("headers", [])
                messages.append(
                    EmailMessage(
                        message_id=msg["id"],
                        thread_id=msg.get("threadId", ""),
                        subject=_get_header(headers, "Subject"),
                        sender=_get_header(headers, "From"),
                        date=_parse_date(headers),
                        snippet=meta.get("snippet", ""),
                    )
                )

            page_token = result.get("nextPageToken")
            if not page_token:
                break

        return messages

    def get_message_detail(self, message_id: str) -> EmailDetail:
        """Fetch full message content including body and attachment metadata."""
        msg = (
            self.service.users()
            .messages()
            .get(userId="me", id=message_id, format="full")
            .execute()
        )

        payload = msg.get("payload", {})
        headers = payload.get("headers", [])

        text_body, html_body = _extract_body_parts(payload)

        attachments: list[AttachmentMeta] = []
        self._collect_attachments(payload, attachments)

        return EmailDetail(
            message_id=message_id,
            thread_id=msg.get("threadId", ""),
            subject=_get_header(headers, "Subject"),
            sender=_get_header(headers, "From"),
            date=_parse_date(headers),
            body_text=text_body,
            body_html=html_body,
            attachments=attachments,
        )

    def _collect_attachments(
        self, payload: dict, result: list[AttachmentMeta]
    ) -> None:
        """Recursively collect attachment metadata from MIME parts."""
        filename = payload.get("filename", "")
        body = payload.get("body", {})
        attachment_id = body.get("attachmentId", "")

        if filename and attachment_id:
            mime_type = payload.get("mimeType", "application/octet-stream")
            result.append(
                AttachmentMeta(
                    attachment_id=attachment_id,
                    filename=filename,
                    mime_type=mime_type,
                    size_bytes=body.get("size", 0),
                    attachment_type=_classify_attachment(filename, mime_type),
                )
            )

        for part in payload.get("parts", []):
            self._collect_attachments(part, result)

    def get_attachment(self, message_id: str, attachment_id: str) -> bytes:
        """Download raw attachment bytes."""
        att = (
            self.service.users()
            .messages()
            .attachments()
            .get(userId="me", messageId=message_id, id=attachment_id)
            .execute()
        )
        data = att.get("data", "")
        padded = data + "=" * (4 - len(data) % 4)
        return base64.urlsafe_b64decode(padded)
