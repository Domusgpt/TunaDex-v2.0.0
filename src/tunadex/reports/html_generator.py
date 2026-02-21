"""HTML report generator — Jinja2 templates + Plotly charts."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from tunadex.config import DATA_DIR
from tunadex.extraction.schema import DailyPayload

TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "templates"


def _build_chart_data(payloads: list[DailyPayload]) -> dict:
    """Build chart data structures for Plotly rendering in HTML."""
    # Daily volume trend
    daily_dates = [p.date.isoformat() for p in sorted(payloads, key=lambda x: x.date)]
    daily_weights = [p.totals.total_weight_lbs for p in sorted(payloads, key=lambda x: x.date)]
    daily_boxes = [p.totals.total_boxes for p in sorted(payloads, key=lambda x: x.date)]

    # Species pie chart
    species_agg: dict[str, float] = {}
    for p in payloads:
        for species, total in p.totals.species_breakdown.items():
            species_agg[species] = species_agg.get(species, 0) + total.weight_lbs

    # Customer bar chart
    customer_agg: dict[str, float] = {}
    for p in payloads:
        for customer, total in p.totals.customer_breakdown.items():
            customer_agg[customer] = customer_agg.get(customer, 0) + total.weight_lbs

    sorted_customers = sorted(customer_agg.items(), key=lambda x: x[1], reverse=True)

    return {
        "daily_trend": {
            "dates": daily_dates,
            "weights": daily_weights,
            "boxes": daily_boxes,
        },
        "species_pie": {
            "labels": list(species_agg.keys()),
            "values": list(species_agg.values()),
        },
        "customer_bar": {
            "names": [c[0] for c in sorted_customers[:15]],
            "weights": [c[1] for c in sorted_customers[:15]],
        },
    }


def render_report_html(
    payloads: list[DailyPayload],
    report_type: str,
    report_markdown: str,
) -> str:
    """Render a report to HTML with embedded Plotly charts.

    Args:
        payloads: The daily payload data.
        report_type: "daily", "weekly", or "monthly".
        report_markdown: The markdown report text.

    Returns:
        HTML string.
    """
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

    template_name = f"{report_type}_report.html"
    try:
        template = env.get_template(template_name)
    except Exception:
        # Fallback to a generic template
        template = env.from_string(FALLBACK_TEMPLATE)

    chart_data = _build_chart_data(payloads)

    html = template.render(
        report_type=report_type,
        report_markdown=report_markdown,
        chart_data_json=json.dumps(chart_data),
        payloads=payloads,
    )
    return html


def save_report_html(
    html: str,
    report_type: str,
    report_date: date,
    data_dir: Path | None = None,
) -> Path:
    """Save rendered HTML report to data/reports/{type}/YYYY-MM-DD.html."""
    base = (data_dir or DATA_DIR) / "reports" / report_type
    base.mkdir(parents=True, exist_ok=True)
    path = base / f"{report_date.isoformat()}.html"
    with open(path, "w") as f:
        f.write(html)
    return path


FALLBACK_TEMPLATE = """\
<!DOCTYPE html>
<html>
<head>
    <title>TunaDex {{ report_type | title }} Report</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .card { background: white; border-radius: 8px; padding: 20px;
                margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h1 { color: #1a365d; }
        h2 { color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #edf2f7; font-weight: 600; }
        .chart-container { height: 400px; margin: 16px 0; }
        pre { background: #f7fafc; padding: 16px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="card">
        <pre>{{ report_markdown }}</pre>
    </div>

    <div class="card">
        <h2>Volume Trend</h2>
        <div id="trend-chart" class="chart-container"></div>
    </div>

    <div class="card">
        <h2>Species Distribution</h2>
        <div id="species-chart" class="chart-container"></div>
    </div>

    <div class="card">
        <h2>Top Customers</h2>
        <div id="customer-chart" class="chart-container"></div>
    </div>

    <script>
        var chartData = {{ chart_data_json }};

        // Volume trend
        Plotly.newPlot('trend-chart', [
            { x: chartData.daily_trend.dates, y: chartData.daily_trend.weights,
              type: 'scatter', mode: 'lines+markers', name: 'Weight (lbs)',
              line: { color: '#3182ce' } },
            { x: chartData.daily_trend.dates, y: chartData.daily_trend.boxes,
              type: 'bar', name: 'Boxes', yaxis: 'y2',
              marker: { color: '#63b3ed', opacity: 0.5 } }
        ], {
            yaxis: { title: 'Weight (lbs)' },
            yaxis2: { title: 'Boxes', overlaying: 'y', side: 'right' },
            margin: { t: 20 }
        });

        // Species pie
        Plotly.newPlot('species-chart', [{
            labels: chartData.species_pie.labels,
            values: chartData.species_pie.values,
            type: 'pie', hole: 0.4,
            marker: { colors: ['#3182ce','#e53e3e','#38a169','#d69e2e',
                               '#805ad5','#dd6b20','#319795','#d53f8c'] }
        }], { margin: { t: 20 } });

        // Customer bar
        Plotly.newPlot('customer-chart', [{
            x: chartData.customer_bar.names,
            y: chartData.customer_bar.weights,
            type: 'bar',
            marker: { color: '#3182ce' }
        }], {
            yaxis: { title: 'Weight (lbs)' },
            margin: { t: 20 }
        });
    </script>
</body>
</html>
"""
