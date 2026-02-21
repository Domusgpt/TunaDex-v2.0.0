"""Daily report generation."""

from __future__ import annotations

from tunadex.extraction.schema import DailyPayload


def generate_daily_summary(payload: DailyPayload) -> str:
    """Generate a human-readable daily shipment summary."""
    lines: list[str] = []
    lines.append(f"# TunaDex Daily Report — {payload.date.isoformat()}")
    lines.append(f"Run at: {payload.run_timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")

    # Overview
    lines.append("## Overview")
    lines.append(f"- Emails processed: {payload.emails_processed}")
    lines.append(f"- Shipments (unique AWBs): {len(payload.shipments)}")
    lines.append(f"- Total boxes: {payload.totals.total_boxes}")
    lines.append(f"- Total weight: {payload.totals.total_weight_lbs:,.1f} lbs")
    lines.append("")

    # AWB breakdown
    lines.append("## Shipments by AWB")
    for shipment in payload.shipments:
        total_w = sum(l.weight_lbs or 0 for l in shipment.lines)
        total_b = sum(l.boxes or 0 for l in shipment.lines)
        lines.append(f"### AWB: {shipment.awb} ({shipment.supplier})")
        lines.append(f"  Customers: {len(set(l.customer_name for l in shipment.lines))}")
        lines.append(f"  Total: {total_b} boxes / {total_w:,.1f} lbs")
        for line in shipment.lines:
            w = f"{line.weight_lbs:,.1f} lbs" if line.weight_lbs else "N/A"
            b = f"{line.boxes} boxes" if line.boxes else "N/A"
            size = f" ({line.size_category})" if line.size_category else ""
            lines.append(f"  - {line.customer_name}: {line.species}{size} — {b} / {w}")
        lines.append("")

    # Species breakdown
    lines.append("## Species Breakdown")
    for species, total in sorted(
        payload.totals.species_breakdown.items(), key=lambda x: x[1].weight_lbs, reverse=True
    ):
        lines.append(f"- {species}: {total.boxes} boxes / {total.weight_lbs:,.1f} lbs")
    lines.append("")

    # Customer breakdown
    lines.append("## Customer Breakdown")
    for customer, total in sorted(
        payload.totals.customer_breakdown.items(), key=lambda x: x[1].weight_lbs, reverse=True
    ):
        lines.append(f"- {customer}: {total.boxes} boxes / {total.weight_lbs:,.1f} lbs")
    lines.append("")

    # Anomalies
    if payload.anomalies:
        lines.append("## Anomalies")
        for a in payload.anomalies:
            icon = "!!!" if a.severity.value == "ERROR" else "!"
            lines.append(f"- [{icon}] {a.anomaly_type.value}: {a.description}")
        lines.append("")
    else:
        lines.append("## Anomalies\nNone detected.\n")

    return "\n".join(lines)
