"""Monthly report generation with deep analysis."""

from __future__ import annotations

from collections import defaultdict

from tunadex.extraction.schema import DailyPayload


def generate_monthly_summary(payloads: list[DailyPayload]) -> str:
    """Generate a comprehensive monthly analysis report."""
    if not payloads:
        return "# Monthly Report\n\nNo data available for this period.\n"

    lines: list[str] = []
    start = min(p.date for p in payloads)
    end = max(p.date for p in payloads)
    lines.append(f"# TunaDex Monthly Report — {start.strftime('%B %Y')}")
    lines.append(f"Period: {start} to {end}")
    lines.append("")

    # Aggregate
    total_weight = sum(p.totals.total_weight_lbs for p in payloads)
    total_boxes = sum(p.totals.total_boxes for p in payloads)
    total_shipments = sum(len(p.shipments) for p in payloads)
    active_days = len(payloads)

    lines.append("## Executive Summary")
    lines.append(f"- Active shipping days: {active_days}")
    lines.append(f"- Total shipments: {total_shipments}")
    lines.append(f"- Total volume: {total_boxes} boxes / {total_weight:,.1f} lbs")
    lines.append(f"- Average daily volume: {total_weight / active_days:,.1f} lbs")
    lines.append(f"- Average daily shipments: {total_shipments / active_days:.1f}")
    lines.append("")

    # Weekly breakdown within the month
    lines.append("## Weekly Breakdown")
    week_data: dict[int, dict] = defaultdict(lambda: {"weight": 0.0, "boxes": 0, "days": 0})
    for p in sorted(payloads, key=lambda x: x.date):
        week_num = p.date.isocalendar()[1]
        week_data[week_num]["weight"] += p.totals.total_weight_lbs
        week_data[week_num]["boxes"] += p.totals.total_boxes
        week_data[week_num]["days"] += 1

    lines.append("| Week | Days | Boxes | Weight (lbs) | Avg Daily (lbs) |")
    lines.append("|------|------|-------|-------------|-----------------|")
    for week, data in sorted(week_data.items()):
        avg = data["weight"] / data["days"] if data["days"] else 0
        lines.append(
            f"| W{week} | {data['days']} | {data['boxes']} | "
            f"{data['weight']:,.1f} | {avg:,.1f} |"
        )
    lines.append("")

    # Top customers ranked by weight
    customer_agg: dict[str, dict] = defaultdict(
        lambda: {"weight": 0.0, "boxes": 0, "orders": 0, "days": set(), "species": set()}
    )
    for p in payloads:
        for shipment in p.shipments:
            for line in shipment.lines:
                name = line.company or line.customer_name
                customer_agg[name]["weight"] += line.weight_lbs or 0
                customer_agg[name]["boxes"] += line.boxes or 0
                customer_agg[name]["orders"] += 1
                customer_agg[name]["days"].add(p.date)
                customer_agg[name]["species"].add(line.species)

    lines.append("## Top Customers (by Weight)")
    lines.append("| Rank | Customer | Weight (lbs) | Boxes | Orders | Days Active | Top Species |")
    lines.append("|------|----------|-------------|-------|--------|-------------|-------------|")
    for rank, (customer, data) in enumerate(
        sorted(customer_agg.items(), key=lambda x: x[1]["weight"], reverse=True), 1
    ):
        top_species = ", ".join(list(data["species"])[:3])
        lines.append(
            f"| {rank} | {customer} | {data['weight']:,.1f} | {data['boxes']} | "
            f"{data['orders']} | {len(data['days'])} | {top_species} |"
        )
    lines.append("")

    # Species distribution
    species_agg: dict[str, dict] = defaultdict(lambda: {"weight": 0.0, "boxes": 0})
    for p in payloads:
        for species, total in p.totals.species_breakdown.items():
            species_agg[species]["weight"] += total.weight_lbs
            species_agg[species]["boxes"] += total.boxes

    lines.append("## Species Distribution")
    lines.append("| Species | Weight (lbs) | % of Total | Boxes |")
    lines.append("|---------|-------------|------------|-------|")
    for species, data in sorted(species_agg.items(), key=lambda x: x[1]["weight"], reverse=True):
        pct = (data["weight"] / total_weight * 100) if total_weight > 0 else 0
        lines.append(f"| {species} | {data['weight']:,.1f} | {pct:.1f}% | {data['boxes']} |")
    lines.append("")

    # Customer loyalty metrics
    lines.append("## Customer Loyalty")
    lines.append("| Customer | Days Active | Frequency (%) | Avg Order (lbs) |")
    lines.append("|----------|-------------|---------------|-----------------|")
    for customer, data in sorted(customer_agg.items(), key=lambda x: len(x[1]["days"]), reverse=True):
        freq = len(data["days"]) / active_days * 100
        avg_order = data["weight"] / data["orders"] if data["orders"] else 0
        lines.append(
            f"| {customer} | {len(data['days'])} | {freq:.0f}% | {avg_order:,.1f} |"
        )
    lines.append("")

    # Box-to-weight efficiency
    lines.append("## Box-to-Weight Ratios (Avg lbs/box by Species)")
    lines.append("| Species | Total Boxes | Total Weight | Avg lbs/box |")
    lines.append("|---------|------------|-------------|-------------|")
    for species, data in sorted(species_agg.items(), key=lambda x: x[1]["weight"], reverse=True):
        avg = data["weight"] / data["boxes"] if data["boxes"] else 0
        lines.append(f"| {species} | {data['boxes']} | {data['weight']:,.1f} | {avg:,.1f} |")
    lines.append("")

    # Anomaly summary
    total_anomalies = sum(len(p.anomalies) for p in payloads)
    error_count = sum(
        1 for p in payloads for a in p.anomalies if a.severity.value == "ERROR"
    )
    warning_count = total_anomalies - error_count

    lines.append("## Data Quality")
    lines.append(f"- Total anomalies: {total_anomalies}")
    lines.append(f"- Errors: {error_count}")
    lines.append(f"- Warnings: {warning_count}")
    lines.append("")

    return "\n".join(lines)
