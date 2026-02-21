"""Weekly report generation with trend analysis."""

from __future__ import annotations

from collections import defaultdict

from tunadex.extraction.schema import DailyPayload


def generate_weekly_summary(payloads: list[DailyPayload]) -> str:
    """Generate a weekly analysis report from daily payloads."""
    if not payloads:
        return "# Weekly Report\n\nNo data available for this period.\n"

    lines: list[str] = []
    start = min(p.date for p in payloads)
    end = max(p.date for p in payloads)
    lines.append(f"# TunaDex Weekly Report — {start} to {end}")
    lines.append("")

    # Aggregate totals
    total_weight = sum(p.totals.total_weight_lbs for p in payloads)
    total_boxes = sum(p.totals.total_boxes for p in payloads)
    total_shipments = sum(len(p.shipments) for p in payloads)
    total_anomalies = sum(len(p.anomalies) for p in payloads)

    lines.append("## Week Overview")
    lines.append(f"- Days with data: {len(payloads)}")
    lines.append(f"- Total shipments: {total_shipments}")
    lines.append(f"- Total boxes: {total_boxes}")
    lines.append(f"- Total weight: {total_weight:,.1f} lbs")
    lines.append(f"- Avg daily weight: {total_weight / len(payloads):,.1f} lbs")
    lines.append(f"- Total anomalies: {total_anomalies}")
    lines.append("")

    # Daily volume trend
    lines.append("## Daily Volume Trend")
    lines.append("| Date | Boxes | Weight (lbs) | Shipments |")
    lines.append("|------|-------|-------------|-----------|")
    for p in sorted(payloads, key=lambda x: x.date):
        lines.append(
            f"| {p.date} | {p.totals.total_boxes} | "
            f"{p.totals.total_weight_lbs:,.1f} | {len(p.shipments)} |"
        )
    lines.append("")

    # Species aggregation
    species_totals: dict[str, dict] = defaultdict(lambda: {"boxes": 0, "weight": 0.0})
    for p in payloads:
        for species, total in p.totals.species_breakdown.items():
            species_totals[species]["boxes"] += total.boxes
            species_totals[species]["weight"] += total.weight_lbs

    lines.append("## Species Distribution")
    lines.append("| Species | Boxes | Weight (lbs) | % of Total |")
    lines.append("|---------|-------|-------------|------------|")
    for species, totals in sorted(species_totals.items(), key=lambda x: x[1]["weight"], reverse=True):
        pct = (totals["weight"] / total_weight * 100) if total_weight > 0 else 0
        lines.append(f"| {species} | {totals['boxes']} | {totals['weight']:,.1f} | {pct:.1f}% |")
    lines.append("")

    # Customer aggregation
    customer_totals: dict[str, dict] = defaultdict(
        lambda: {"boxes": 0, "weight": 0.0, "days": set()}
    )
    for p in payloads:
        for customer, total in p.totals.customer_breakdown.items():
            customer_totals[customer]["boxes"] += total.boxes
            customer_totals[customer]["weight"] += total.weight_lbs
            customer_totals[customer]["days"].add(p.date)

    lines.append("## Customer Activity")
    lines.append("| Customer | Boxes | Weight (lbs) | Days Active |")
    lines.append("|----------|-------|-------------|-------------|")
    for customer, totals in sorted(customer_totals.items(), key=lambda x: x[1]["weight"], reverse=True):
        lines.append(
            f"| {customer} | {totals['boxes']} | {totals['weight']:,.1f} | "
            f"{len(totals['days'])} |"
        )
    lines.append("")

    # Average swordfish size per customer
    lines.append("## Average Swordfish Size by Customer")
    sword_data: dict[str, list[float]] = defaultdict(list)
    for p in payloads:
        for shipment in p.shipments:
            for line in shipment.lines:
                if "sword" in line.species.lower() and line.weight_lbs and line.boxes:
                    avg_size = line.weight_lbs / line.boxes
                    name = line.company or line.customer_name
                    sword_data[name].append(avg_size)

    if sword_data:
        lines.append("| Customer | Avg Size (lbs/box) | Shipments |")
        lines.append("|----------|-------------------|-----------|")
        for customer, sizes in sorted(sword_data.items()):
            avg = sum(sizes) / len(sizes)
            lines.append(f"| {customer} | {avg:,.1f} | {len(sizes)} |")
    else:
        lines.append("No swordfish data available this week.")
    lines.append("")

    return "\n".join(lines)
