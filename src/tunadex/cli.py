"""TunaDex CLI — command-line entry point."""

from __future__ import annotations

import logging
import sys
from datetime import date, datetime, timedelta

import click

from tunadex.config import DATA_DIR

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("tunadex")


@click.group()
def cli():
    """TunaDex v2.0 — Automated seafood shipment tracking."""
    pass


@cli.command()
def auth():
    """Run one-time OAuth2 consent flow (opens browser)."""
    from tunadex.auth.oauth import run_oauth_flow

    click.echo("Starting OAuth2 consent flow...")
    click.echo("A browser window will open. Log in and grant access.")
    creds = run_oauth_flow()
    click.echo(f"Authentication successful. Token saved.")
    click.echo("You can now run `tunedex run` to start processing emails.")


@cli.command()
@click.option("--date", "target_date", default=None, help="Date to process (YYYY-MM-DD). Default: today.")
@click.option("--lookback", default=1, help="Days to look back (default: 1).")
@click.option("--engine", default="gemini", type=click.Choice(["gemini"]), help="Extraction engine.")
@click.option("--skip-drive", is_flag=True, help="Skip uploading attachments to Drive.")
@click.option("--skip-sheets", is_flag=True, help="Skip pushing data to Google Sheets.")
def run(target_date: str | None, lookback: int, engine: str, skip_drive: bool, skip_sheets: bool):
    """Run the daily email trawl pipeline."""
    if target_date:
        d = date.fromisoformat(target_date)
    else:
        d = date.today()

    click.echo(f"TunaDex Daily Trawl — {d.isoformat()}")
    click.echo(f"Engine: {engine} | Lookback: {lookback} day(s)")
    click.echo("=" * 50)

    # Step 1: Authenticate
    click.echo("\n[1/6] Authenticating...")
    from tunadex.auth.credentials import get_drive_service, get_gmail_service, get_spreadsheet

    gmail = get_gmail_service()
    click.echo("  Gmail: OK")

    # Step 2: Search emails
    click.echo("\n[2/6] Searching for shipment emails...")
    from tunadex.email.trawler import EmailTrawler

    trawler = EmailTrawler(gmail)
    messages = trawler.search_shipment_emails(d, lookback_days=lookback)
    click.echo(f"  Found {len(messages)} email(s)")

    if not messages:
        click.echo("\nNo shipment emails found. Nothing to process.")
        return

    for msg in messages:
        click.echo(f"  - {msg.subject} (from: {msg.sender})")

    # Step 3: Fetch full details and attachments
    click.echo("\n[3/6] Fetching email details and attachments...")
    from tunadex.email.attachments import extract_text_from_attachment
    from tunadex.extraction.schema import AttachmentType

    email_details = []
    attachment_texts: dict[str, str] = {}
    raw_attachments: dict[str, list[tuple[str, bytes, str]]] = {}  # msg_id -> [(filename, bytes, mime)]

    for msg in messages:
        detail = trawler.get_message_detail(msg.message_id)
        email_details.append(detail)

        att_parts: list[str] = []
        raw_atts: list[tuple[str, bytes, str]] = []

        for att in detail.attachments:
            click.echo(f"  Downloading: {att.filename} ({att.attachment_type.value})")
            file_bytes = trawler.get_attachment(msg.message_id, att.attachment_id)
            raw_atts.append((att.filename, file_bytes, att.mime_type))

            if att.attachment_type == AttachmentType.IMAGE:
                # Will be handled by Gemini multimodal later
                att_parts.append(f"[Image: {att.filename} — see multimodal extraction]")
            else:
                text = extract_text_from_attachment(file_bytes, att.attachment_type)
                if text:
                    att_parts.append(f"--- {att.filename} ---\n{text}")

        attachment_texts[msg.message_id] = "\n\n".join(att_parts) if att_parts else "No attachments"
        raw_attachments[msg.message_id] = raw_atts

    # Step 4: AI extraction
    click.echo("\n[4/6] Extracting shipment data with Gemini...")
    from tunadex.extraction.gemini_extractor import GeminiExtractor

    extractor = GeminiExtractor()
    shipments, ai_anomalies = extractor.extract_shipments(
        email_details, attachment_texts, d
    )
    click.echo(f"  Extracted {len(shipments)} shipment(s)")
    for s in shipments:
        click.echo(f"  - AWB {s.awb}: {len(s.lines)} line(s), {s.supplier}")

    # Step 5: Anomaly detection
    click.echo("\n[5/6] Running anomaly checks...")
    from tunadex.anomaly.detector import AnomalyDetector

    detector = AnomalyDetector()
    detected_anomalies = detector.run_all_checks(email_details, shipments)
    all_anomalies = ai_anomalies + detected_anomalies

    if all_anomalies:
        click.echo(f"  Found {len(all_anomalies)} anomaly(ies):")
        for a in all_anomalies:
            icon = "!!!" if a.severity.value == "ERROR" else " ! "
            click.echo(f"  [{icon}] {a.anomaly_type.value}: {a.description}")
    else:
        click.echo("  No anomalies detected.")

    # Build payload
    from tunadex.extraction.schema import DailyPayload

    payload = DailyPayload(
        date=d,
        run_timestamp=datetime.now(),
        emails_processed=len(email_details),
        shipments=shipments,
        anomalies=all_anomalies,
    )
    payload.compute_totals()

    # Step 6: Store results
    click.echo("\n[6/6] Storing results...")
    from tunadex.storage.local import LocalStorage

    local = LocalStorage()
    path = local.save_daily_payload(payload)
    click.echo(f"  Local JSON: {path}")

    # Save raw emails
    for detail in email_details:
        local.save_raw_email(
            detail.message_id,
            f"Subject: {detail.subject}\nFrom: {detail.sender}\n\n{detail.body_text}",
            d,
        )

    drive_links: dict[str, list[str]] = {}

    if not skip_drive:
        try:
            drive = get_drive_service()
            from tunadex.storage.drive import DriveStorage

            drive_storage = DriveStorage(drive)
            date_folder_id = drive_storage.ensure_date_folder(d)

            for msg_id, atts in raw_attachments.items():
                for filename, file_bytes, mime_type in atts:
                    url = drive_storage.upload_attachment(file_bytes, filename, mime_type, date_folder_id)
                    click.echo(f"  Drive: uploaded {filename}")
                    # Link attachments to their AWB
                    for s in shipments:
                        if msg_id in s.source_email_ids:
                            drive_links.setdefault(s.awb, []).append(url)
        except Exception as e:
            click.echo(f"  Drive upload failed: {e}")
            logger.exception("Drive upload error")

    if not skip_sheets:
        try:
            spreadsheet = get_spreadsheet()
            from tunadex.storage.sheets import SheetsStorage

            sheets = SheetsStorage(spreadsheet)
            sheets.push_full_payload(payload, drive_links)
            click.echo("  Google Sheets: updated")
        except Exception as e:
            click.echo(f"  Sheets update failed: {e}")
            logger.exception("Sheets update error")

    # Summary
    click.echo("\n" + "=" * 50)
    click.echo("DAILY TRAWL COMPLETE")
    click.echo(f"  Date: {d}")
    click.echo(f"  Emails: {payload.emails_processed}")
    click.echo(f"  Shipments: {len(payload.shipments)}")
    click.echo(f"  Total boxes: {payload.totals.total_boxes}")
    click.echo(f"  Total weight: {payload.totals.total_weight_lbs:,.1f} lbs")
    click.echo(f"  Anomalies: {len(payload.anomalies)}")
    click.echo("=" * 50)


@cli.command()
@click.argument("report_type", type=click.Choice(["daily", "weekly", "monthly"]))
@click.option("--date", "target_date", default=None, help="Report date (YYYY-MM-DD). Default: today.")
def report(report_type: str, target_date: str | None):
    """Generate a report (daily, weekly, or monthly)."""
    d = date.fromisoformat(target_date) if target_date else date.today()
    from tunadex.storage.local import LocalStorage

    storage = LocalStorage()

    if report_type == "daily":
        payload = storage.load_daily_payload(d)
        if not payload:
            click.echo(f"No data for {d}.")
            return
        from tunadex.reports.daily import generate_daily_summary

        text = generate_daily_summary(payload)
        payloads = [payload]

    elif report_type == "weekly":
        start = d - timedelta(days=d.weekday())
        end = start + timedelta(days=6)
        payloads = storage.load_date_range(start, end)
        if not payloads:
            click.echo(f"No data for week of {start}.")
            return
        from tunadex.reports.weekly import generate_weekly_summary

        text = generate_weekly_summary(payloads)

    else:  # monthly
        start = d.replace(day=1)
        next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        end = next_month - timedelta(days=1)
        payloads = storage.load_date_range(start, end)
        if not payloads:
            click.echo(f"No data for {start.strftime('%B %Y')}.")
            return
        from tunadex.reports.monthly import generate_monthly_summary

        text = generate_monthly_summary(payloads)

    click.echo(text)

    # Also generate HTML
    from tunadex.reports.html_generator import render_report_html, save_report_html

    html = render_report_html(payloads, report_type, text)
    path = save_report_html(html, report_type, d)
    click.echo(f"\nHTML report saved to: {path}")


@cli.command()
def dashboard():
    """Launch the Streamlit dashboard."""
    import subprocess

    app_path = str(
        __import__("pathlib").Path(__file__).resolve().parent / "dashboard" / "app.py"
    )
    click.echo(f"Launching Streamlit dashboard...")
    subprocess.run([sys.executable, "-m", "streamlit", "run", app_path])


if __name__ == "__main__":
    cli()
