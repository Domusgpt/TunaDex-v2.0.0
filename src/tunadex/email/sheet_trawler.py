"""Sheet-based email trawler — reads emails relayed by the Apps Script.

This is an alternative to the Gmail API trawler. It reads from the
"Raw Emails" and "Raw Attachments" tabs populated by the Apps Script
relay (EmailRelay.gs). No OAuth2 browser consent required — uses the
service account that already has access to the Sheet and Drive.
"""

from __future__ import annotations

import io
from datetime import date, datetime, timedelta

from tunadex.extraction.schema import AttachmentMeta, AttachmentType, EmailDetail, EmailMessage

TAB_RAW_EMAILS = "Raw Emails"
TAB_RAW_ATTACHMENTS = "Raw Attachments"


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


class SheetTrawler:
    """Read shipment emails from the Google Sheet relay tabs."""

    def __init__(self, spreadsheet, drive_service):
        self.spreadsheet = spreadsheet
        self.drive_service = drive_service

    def search_shipment_emails(
        self, target_date: date, lookback_days: int = 1
    ) -> list[EmailMessage]:
        """Read emails from the Raw Emails tab within date range."""
        try:
            ws = self.spreadsheet.worksheet(TAB_RAW_EMAILS)
        except Exception:
            return []

        rows = ws.get_all_records()
        after_date = target_date - timedelta(days=lookback_days)
        before_date = target_date + timedelta(days=1)

        messages: list[EmailMessage] = []
        for row in rows:
            email_date_str = row.get("Date", "")
            if not email_date_str:
                continue
            try:
                email_dt = datetime.fromisoformat(email_date_str.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                continue

            if email_dt.date() < after_date or email_dt.date() >= before_date:
                continue

            messages.append(
                EmailMessage(
                    message_id=str(row.get("Message ID", "")),
                    thread_id=str(row.get("Thread ID", "")),
                    subject=str(row.get("Subject", "")),
                    sender=str(row.get("Sender", "")),
                    date=email_dt,
                    snippet=str(row.get("Body Text", ""))[:200],
                )
            )

        return messages

    def get_message_detail(self, message_id: str) -> EmailDetail:
        """Get full email detail from the Raw Emails tab."""
        ws = self.spreadsheet.worksheet(TAB_RAW_EMAILS)
        rows = ws.get_all_records()

        body_text = ""
        subject = ""
        sender = ""
        email_date = None
        thread_id = ""

        for row in rows:
            if str(row.get("Message ID", "")) == message_id:
                body_text = str(row.get("Body Text", ""))
                subject = str(row.get("Subject", ""))
                sender = str(row.get("Sender", ""))
                thread_id = str(row.get("Thread ID", ""))
                date_str = row.get("Date", "")
                if date_str:
                    try:
                        email_date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    except (ValueError, TypeError):
                        pass
                break

        # Get attachment metadata from the Raw Attachments tab
        attachments = self._get_attachments_meta(message_id)

        return EmailDetail(
            message_id=message_id,
            thread_id=thread_id,
            subject=subject,
            sender=sender,
            date=email_date,
            body_text=body_text,
            body_html="",
            attachments=attachments,
        )

    def _get_attachments_meta(self, message_id: str) -> list[AttachmentMeta]:
        """Read attachment metadata for a message from Raw Attachments tab."""
        try:
            ws = self.spreadsheet.worksheet(TAB_RAW_ATTACHMENTS)
        except Exception:
            return []

        rows = ws.get_all_records()
        attachments = []

        for row in rows:
            if str(row.get("Message ID", "")) != message_id:
                continue

            filename = str(row.get("Filename", ""))
            mime_type = str(row.get("MIME Type", "application/octet-stream"))
            drive_file_id = str(row.get("Drive File ID", ""))
            drive_url = str(row.get("Drive URL", ""))

            attachments.append(
                AttachmentMeta(
                    attachment_id=drive_file_id,  # Use Drive file ID as the attachment ID
                    filename=filename,
                    mime_type=mime_type,
                    size_bytes=int(row.get("Size Bytes", 0) or 0),
                    attachment_type=_classify_attachment(filename, mime_type),
                    drive_url=drive_url,
                )
            )

        return attachments

    def get_attachment(self, message_id: str, attachment_id: str) -> bytes:
        """Download attachment bytes from Google Drive using the file ID.

        The attachment_id here is actually the Drive file ID (set during relay).
        """
        request = self.drive_service.files().get_media(fileId=attachment_id)
        content = io.BytesIO()

        from googleapiclient.http import MediaIoBaseDownload

        downloader = MediaIoBaseDownload(content, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

        return content.getvalue()
