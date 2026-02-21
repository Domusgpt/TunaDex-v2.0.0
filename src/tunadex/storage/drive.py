"""Google Drive storage — upload attachments to dated folders."""

from __future__ import annotations

import io
from datetime import date

from googleapiclient.http import MediaIoBaseUpload

from tunadex.config import DRIVE_ROOT_FOLDER_ID


class DriveStorage:
    """Manage attachment storage in Google Drive with dated folder hierarchy."""

    def __init__(self, drive_service):
        self.service = drive_service
        self.root_folder_id = DRIVE_ROOT_FOLDER_ID

    def _find_or_create_folder(self, name: str, parent_id: str) -> str:
        """Find an existing folder or create a new one."""
        query = (
            f"name='{name}' and mimeType='application/vnd.google-apps.folder' "
            f"and '{parent_id}' in parents and trashed=false"
        )
        results = (
            self.service.files()
            .list(q=query, spaces="drive", fields="files(id)")
            .execute()
        )
        files = results.get("files", [])

        if files:
            return files[0]["id"]

        metadata = {
            "name": name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [parent_id],
        }
        folder = self.service.files().create(body=metadata, fields="id").execute()
        return folder["id"]

    def ensure_date_folder(self, d: date) -> str:
        """Create folder hierarchy: root / YYYY / MM / YYYY-MM-DD.

        Returns the folder ID for the date folder.
        """
        year_folder = self._find_or_create_folder(str(d.year), self.root_folder_id)
        month_folder = self._find_or_create_folder(f"{d.month:02d}", year_folder)
        date_folder = self._find_or_create_folder(d.isoformat(), month_folder)
        return date_folder

    def upload_attachment(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str,
        date_folder_id: str,
    ) -> str:
        """Upload a raw attachment to the dated folder.

        Returns the web view link for the uploaded file.
        """
        metadata = {
            "name": filename,
            "parents": [date_folder_id],
        }
        media = MediaIoBaseUpload(
            io.BytesIO(file_bytes),
            mimetype=mime_type,
            resumable=True,
        )
        uploaded = (
            self.service.files()
            .create(body=metadata, media_body=media, fields="id,webViewLink")
            .execute()
        )
        return uploaded.get("webViewLink", f"https://drive.google.com/file/d/{uploaded['id']}")

    def list_date_folder(self, d: date) -> list[dict]:
        """List all files in a date folder."""
        try:
            date_folder_id = self.ensure_date_folder(d)
        except Exception:
            return []

        query = f"'{date_folder_id}' in parents and trashed=false"
        results = (
            self.service.files()
            .list(q=query, spaces="drive", fields="files(id,name,webViewLink,mimeType,size)")
            .execute()
        )
        return results.get("files", [])
