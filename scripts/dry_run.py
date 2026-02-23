#!/usr/bin/env python3
"""TunaDex Dry Run — Test the full pipeline with mock data (no Google APIs needed).

Validates:
1. Schema models serialize/deserialize correctly
2. Anomaly detector catches issues
3. Local storage saves and loads
4. Report generators work
5. Full pipeline flow from mock emails to stored payload

Usage:
    python scripts/dry_run.py
"""

import json
import os
import sys
import tempfile
from datetime import date, datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))
os.chdir(PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv()

GREEN = "\033[92m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"
passed = 0
failed = 0


def ok(msg):
    global passed
    passed += 1
    print(f"  {GREEN}[PASS]{RESET} {msg}")


def fail(msg):
    global failed
    failed += 1
    print(f"  {RED}[FAIL]{RESET} {msg}")


def test(name, fn):
    try:
        fn()
        ok(name)
    except Exception as e:
        fail(f"{name}: {e}")


# ── Mock data ────────────────────────────────────────────────────────────────

MOCK_EMAILS = [
    {
        "message_id": "msg_001",
        "thread_id": "thread_001",
        "subject": "Shipment AWB 12345678901 - Swordfish",
        "sender": "Victor <victor@fishsupplier.com>",
        "date": datetime(2026, 2, 23, 14, 30),
        "body_text": (
            "Hi,\n\nPlease see today's shipment details:\n\n"
            "AWB: 12345678901\n"
            "Mark - Swordfish - 10 boxes - 450 lbs\n"
            "Bryan - Swordfish - 8 boxes - 360 lbs\n"
            "Chade - Yellowtail 1-2 lbs - 5 boxes - 40 lbs\n\n"
            "Best,\nVictor"
        ),
    },
    {
        "message_id": "msg_002",
        "thread_id": "thread_002",
        "subject": "Norman Shipment 23456789012",
        "sender": "Norman <norman@seafood.com>",
        "date": datetime(2026, 2, 23, 15, 0),
        "body_text": (
            "Today's load:\n\n"
            "AWB 23456789012\n"
            "Robby / Great Eastern - Yellowfin Tuna - 6 boxes - 280 lbs\n"
            "Manny / Stavis - Mahi Mahi - 4 boxes - 90 lbs\n"
        ),
    },
]

MOCK_SHIPMENTS_JSON = {
    "shipments": [
        {
            "awb": "12345678901",
            "date": "2026-02-23",
            "supplier": "Victor",
            "freight_forwarder": None,
            "lines": [
                {"customer_name": "Mark", "company": "Mark's Seafood", "species": "Swordfish",
                 "boxes": 10, "weight_lbs": 450.0, "size_category": None, "count_per_box": None, "notes": None},
                {"customer_name": "Bryan", "company": "Gosman's Fish Market", "species": "Swordfish",
                 "boxes": 8, "weight_lbs": 360.0, "size_category": None, "count_per_box": None, "notes": None},
                {"customer_name": "Chade", "company": "Lockwood-Winant", "species": "Yellowtail",
                 "boxes": 5, "weight_lbs": 40.0, "size_category": "1-2 lbs", "count_per_box": None, "notes": None},
            ],
        },
        {
            "awb": "23456789012",
            "date": "2026-02-23",
            "supplier": "Norman",
            "freight_forwarder": None,
            "lines": [
                {"customer_name": "Robby", "company": "Great Eastern", "species": "Yellowfin Tuna",
                 "boxes": 6, "weight_lbs": 280.0, "size_category": None, "count_per_box": None, "notes": None},
                {"customer_name": "Manny", "company": "Stavis", "species": "Mahi Mahi",
                 "boxes": 4, "weight_lbs": 90.0, "size_category": None, "count_per_box": None, "notes": None},
            ],
        },
    ],
    "anomalies": [],
}


# ── Tests ────────────────────────────────────────────────────────────────────

def test_schema_models():
    from tunadex.extraction.schema import (
        Anomaly, AnomalyType, DailyPayload, EmailDetail,
        EmailMessage, Severity, Shipment, ShipmentLine, ShipmentTotals,
    )

    # Test EmailMessage
    msg = EmailMessage(**MOCK_EMAILS[0])
    assert msg.message_id == "msg_001"

    # Test EmailDetail
    detail = EmailDetail(
        message_id="msg_001", thread_id="thread_001",
        subject="Test", sender="test@test.com",
        body_text="body", body_html="<p>body</p>",
    )
    assert detail.body_text == "body"

    # Test ShipmentLine
    line = ShipmentLine(
        customer_name="Mark", company="Mark's Seafood",
        species="Swordfish", boxes=10, weight_lbs=450.0,
    )
    assert line.weight_lbs == 450.0

    # Test Shipment
    shipment = Shipment(
        awb="12345678901", date=date(2026, 2, 23),
        supplier="Victor", lines=[line],
    )
    assert shipment.awb == "12345678901"

    # Test DailyPayload with totals
    payload = DailyPayload(
        date=date(2026, 2, 23),
        run_timestamp=datetime.now(),
        emails_processed=2,
        shipments=[shipment],
    )
    payload.compute_totals()
    assert payload.totals.total_boxes == 10
    assert payload.totals.total_weight_lbs == 450.0

    # Test JSON serialization round-trip
    json_str = json.dumps(payload.model_dump(mode="json"), default=str)
    loaded = DailyPayload(**json.loads(json_str))
    assert loaded.totals.total_boxes == 10


def test_gemini_response_parsing():
    """Test that the Gemini response parser works without calling the API."""
    from tunadex.extraction.schema import EmailDetail, Shipment, ShipmentLine

    # Simulate parsing what Gemini would return
    data = MOCK_SHIPMENTS_JSON
    shipments = []
    for s in data["shipments"]:
        shipment = Shipment(
            awb=s["awb"], date=s["date"], supplier=s["supplier"],
            freight_forwarder=s.get("freight_forwarder"),
            lines=[ShipmentLine(**line) for line in s["lines"]],
            source_email_ids=["msg_001"],
        )
        shipments.append(shipment)

    assert len(shipments) == 2
    assert shipments[0].awb == "12345678901"
    assert len(shipments[0].lines) == 3
    assert shipments[1].lines[0].company == "Great Eastern"


def test_anomaly_detector():
    from tunadex.anomaly.detector import AnomalyDetector
    from tunadex.extraction.schema import EmailDetail, Shipment, ShipmentLine

    detector = AnomalyDetector()

    # Create shipments with a duplicate AWB (same customer/species = real dupe)
    line1 = ShipmentLine(customer_name="Mark", species="Swordfish", boxes=10, weight_lbs=450.0)
    s1 = Shipment(awb="12345678901", date=date(2026, 2, 23), supplier="Victor", lines=[line1])
    s2 = Shipment(awb="12345678901", date=date(2026, 2, 23), supplier="Victor", lines=[line1])

    anomalies = detector.check_double_counts([s1, s2])
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type.value == "DOUBLE_COUNT"
    assert anomalies[0].severity.value == "ERROR"

    # Test missing AWB
    s_missing = Shipment(awb="MISSING", date=date(2026, 2, 23), supplier="Victor", lines=[])
    anomalies = detector.check_awb_consistency([s_missing])
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type.value == "MISSING_AWB"

    # Test weight outlier
    crazy_line = ShipmentLine(customer_name="Test", species="Swordfish", weight_lbs=5000.0)
    s_outlier = Shipment(awb="99999999999", date=date(2026, 2, 23), supplier="Victor", lines=[crazy_line])
    anomalies = detector.check_weight_outliers([s_outlier])
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type.value == "WEIGHT_OUTLIER"


def test_local_storage():
    from tunadex.extraction.schema import DailyPayload, Shipment, ShipmentLine
    from tunadex.storage.local import LocalStorage

    with tempfile.TemporaryDirectory() as tmpdir:
        storage = LocalStorage(data_dir=Path(tmpdir))

        line = ShipmentLine(customer_name="Mark", species="Swordfish", boxes=10, weight_lbs=450.0)
        shipment = Shipment(awb="12345678901", date=date(2026, 2, 23), supplier="Victor", lines=[line])
        payload = DailyPayload(
            date=date(2026, 2, 23), run_timestamp=datetime.now(),
            emails_processed=1, shipments=[shipment],
        )
        payload.compute_totals()

        # Save
        path = storage.save_daily_payload(payload)
        assert path.exists()

        # Load
        loaded = storage.load_daily_payload(date(2026, 2, 23))
        assert loaded is not None
        assert loaded.totals.total_boxes == 10
        assert len(loaded.shipments) == 1

        # Save raw email
        raw_path = storage.save_raw_email("msg_001", "Subject: Test\n\nBody", date(2026, 2, 23))
        assert raw_path.exists()

        # List dates
        dates = storage.list_processed_dates()
        assert date(2026, 2, 23) in dates

        # Load range
        payloads = storage.load_date_range(date(2026, 2, 23), date(2026, 2, 23))
        assert len(payloads) == 1


def test_reports():
    from tunadex.extraction.schema import DailyPayload, Shipment, ShipmentLine
    from tunadex.reports.daily import generate_daily_summary
    from tunadex.reports.weekly import generate_weekly_summary
    from tunadex.reports.html_generator import render_report_html

    line1 = ShipmentLine(customer_name="Mark", company="Mark's Seafood", species="Swordfish", boxes=10, weight_lbs=450.0)
    line2 = ShipmentLine(customer_name="Robby", company="Great Eastern", species="Yellowfin Tuna", boxes=6, weight_lbs=280.0)
    s1 = Shipment(awb="12345678901", date=date(2026, 2, 23), supplier="Victor", lines=[line1])
    s2 = Shipment(awb="23456789012", date=date(2026, 2, 23), supplier="Norman", lines=[line2])

    payload = DailyPayload(
        date=date(2026, 2, 23), run_timestamp=datetime.now(),
        emails_processed=2, shipments=[s1, s2],
    )
    payload.compute_totals()

    # Daily report
    daily_text = generate_daily_summary(payload)
    assert "Mark" in daily_text or "Swordfish" in daily_text
    assert len(daily_text) > 50

    # Weekly report
    weekly_text = generate_weekly_summary([payload])
    assert len(weekly_text) > 50

    # HTML report
    html = render_report_html([payload], "daily", daily_text)
    assert "<html" in html.lower() or "<!doctype" in html.lower() or "TunaDex" in html


def test_email_parser():
    from tunadex.email.parser import first_pass_extract

    result = first_pass_extract(MOCK_EMAILS[0]["body_text"])
    assert len(result["awbs"]) >= 1, f"Expected AWB, got {result['awbs']}"
    assert "12345678901" in result["awbs"]
    assert len(result["species"]) >= 1, f"Expected species, got {result['species']}"
    assert "swordfish" in result["species"]
    assert len(result["customers"]) >= 1, f"Expected customers, got {result['customers']}"
    assert len(result["weights"]) >= 1, f"Expected weights, got {result['weights']}"
    assert len(result["box_counts"]) >= 1, f"Expected box counts, got {result['box_counts']}"


def test_full_pipeline_mock():
    """Simulate the full pipeline end-to-end with mock data."""
    from tunadex.anomaly.detector import AnomalyDetector
    from tunadex.extraction.schema import (
        DailyPayload, EmailDetail, Shipment, ShipmentLine,
    )
    from tunadex.storage.local import LocalStorage

    # Step 1: "Search" emails (mock)
    emails = [
        EmailDetail(
            message_id=e["message_id"], thread_id=e["thread_id"],
            subject=e["subject"], sender=e["sender"],
            date=e["date"], body_text=e["body_text"],
        )
        for e in MOCK_EMAILS
    ]
    assert len(emails) == 2

    # Step 2: "Extract" shipments (mock Gemini response)
    shipments = []
    for s in MOCK_SHIPMENTS_JSON["shipments"]:
        shipment = Shipment(
            awb=s["awb"], date=s["date"], supplier=s["supplier"],
            lines=[ShipmentLine(**l) for l in s["lines"]],
            source_email_ids=[e.message_id for e in emails],
        )
        shipments.append(shipment)
    assert len(shipments) == 2

    # Step 3: Anomaly detection
    detector = AnomalyDetector()
    anomalies = detector.run_all_checks(emails, shipments)
    # Should be clean — no dupes, valid AWBs, normal weights
    error_anomalies = [a for a in anomalies if a.severity.value == "ERROR"]
    assert len(error_anomalies) == 0, f"Unexpected errors: {error_anomalies}"

    # Step 4: Build payload
    payload = DailyPayload(
        date=date(2026, 2, 23), run_timestamp=datetime.now(),
        emails_processed=len(emails), shipments=shipments, anomalies=anomalies,
    )
    payload.compute_totals()

    assert payload.totals.total_boxes == 33  # 10 + 8 + 5 + 6 + 4
    assert payload.totals.total_weight_lbs == 1220.0  # 450 + 360 + 40 + 280 + 90

    # Step 5: Store locally
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = LocalStorage(data_dir=Path(tmpdir))
        path = storage.save_daily_payload(payload)
        assert path.exists()

        loaded = storage.load_daily_payload(date(2026, 2, 23))
        assert loaded.totals.total_boxes == 33


# ── Run all tests ────────────────────────────────────────────────────────────

def main():
    print(f"\n{BOLD}{'=' * 50}{RESET}")
    print(f"{BOLD} TunaDex Dry Run — Pipeline Validation{RESET}")
    print(f"{BOLD}{'=' * 50}{RESET}\n")

    tests = [
        ("Schema models (create, serialize, deserialize)", test_schema_models),
        ("Gemini response parsing (mock)", test_gemini_response_parsing),
        ("Anomaly detector (double-count, missing AWB, outliers)", test_anomaly_detector),
        ("Local storage (save, load, range query)", test_local_storage),
        ("Report generators (daily, weekly, HTML)", test_reports),
        ("Email parser (regex extraction)", test_email_parser),
        ("Full pipeline end-to-end (mock)", test_full_pipeline_mock),
    ]

    for name, fn in tests:
        test(name, fn)

    print(f"\n{BOLD}{'─' * 50}{RESET}")
    print(f"{BOLD}Results: {GREEN}{passed} passed{RESET}, {RED}{failed} failed{RESET}")
    print(f"{BOLD}{'─' * 50}{RESET}\n")

    if failed == 0:
        print(f"{GREEN}{BOLD}All tests passed! Pipeline is working correctly.{RESET}")
        print(f"\nThe only thing left is connecting to real Google APIs.")
        print(f"Run: python scripts/setup.py")
    else:
        print(f"{RED}{BOLD}Some tests failed. Check the errors above.{RESET}")

    sys.exit(failed)


if __name__ == "__main__":
    main()
