"""Streamlit multi-page dashboard for TunaDex."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from tunadex.config import DATA_DIR
from tunadex.storage.local import LocalStorage

st.set_page_config(page_title="TunaDex Dashboard", page_icon="🐟", layout="wide")


@st.cache_resource
def get_storage() -> LocalStorage:
    return LocalStorage(Path(DATA_DIR))


def load_payloads(start: date, end: date):
    storage = get_storage()
    return storage.load_date_range(start, end)


# --- Sidebar ---
st.sidebar.title("TunaDex v2.0")
page = st.sidebar.radio(
    "Navigate",
    ["Overview", "Customers", "Species", "AWB Tracker", "Anomalies", "Reports"],
)

# Date range selector
st.sidebar.markdown("---")
st.sidebar.subheader("Date Range")
end_date = st.sidebar.date_input("End date", value=date.today())
range_option = st.sidebar.selectbox("Range", ["7 days", "14 days", "30 days", "Custom"])
if range_option == "Custom":
    start_date = st.sidebar.date_input("Start date", value=end_date - timedelta(days=7))
else:
    days = int(range_option.split()[0])
    start_date = end_date - timedelta(days=days)

payloads = load_payloads(start_date, end_date)

# --- Pages ---

if page == "Overview":
    st.title("Dashboard Overview")

    if not payloads:
        st.warning("No data found for the selected date range.")
        st.stop()

    # Summary metrics
    total_weight = sum(p.totals.total_weight_lbs for p in payloads)
    total_boxes = sum(p.totals.total_boxes for p in payloads)
    total_shipments = sum(len(p.shipments) for p in payloads)
    total_anomalies = sum(len(p.anomalies) for p in payloads)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Days with Data", len(payloads))
    col2.metric("Total Shipments", total_shipments)
    col3.metric("Total Weight", f"{total_weight:,.0f} lbs")
    col4.metric("Anomalies", total_anomalies)

    # Volume trend
    dates = [p.date for p in sorted(payloads, key=lambda x: x.date)]
    weights = [p.totals.total_weight_lbs for p in sorted(payloads, key=lambda x: x.date)]

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=dates, y=weights, mode="lines+markers", name="Weight (lbs)",
                             line=dict(color="#3182ce", width=3)))
    fig.update_layout(title="Daily Volume", yaxis_title="Weight (lbs)", height=350)
    st.plotly_chart(fig, use_container_width=True)

    # Today's shipments (most recent day)
    latest = sorted(payloads, key=lambda x: x.date)[-1]
    st.subheader(f"Latest: {latest.date}")
    for shipment in latest.shipments:
        with st.expander(f"AWB: {shipment.awb} ({shipment.supplier})"):
            for line in shipment.lines:
                w = f"{line.weight_lbs:,.1f} lbs" if line.weight_lbs else "N/A"
                b = f"{line.boxes} boxes" if line.boxes else "N/A"
                st.write(f"- **{line.customer_name}**: {line.species} — {b} / {w}")


elif page == "Customers":
    st.title("Customer Analysis")

    if not payloads:
        st.warning("No data found.")
        st.stop()

    # Aggregate customer data
    customer_data: dict[str, dict] = defaultdict(
        lambda: {"weight": 0.0, "boxes": 0, "orders": 0, "days": set(), "species": defaultdict(float)}
    )
    for p in payloads:
        for shipment in p.shipments:
            for line in shipment.lines:
                name = line.company or line.customer_name
                customer_data[name]["weight"] += line.weight_lbs or 0
                customer_data[name]["boxes"] += line.boxes or 0
                customer_data[name]["orders"] += 1
                customer_data[name]["days"].add(p.date)
                customer_data[name]["species"][line.species] += line.weight_lbs or 0

    # Customer filter
    all_customers = sorted(customer_data.keys())
    selected = st.multiselect("Filter customers", all_customers, default=all_customers[:10])

    # Bar chart
    filtered = {k: v for k, v in customer_data.items() if k in selected}
    fig = px.bar(
        x=list(filtered.keys()),
        y=[v["weight"] for v in filtered.values()],
        labels={"x": "Customer", "y": "Weight (lbs)"},
        title="Customer Volume",
    )
    st.plotly_chart(fig, use_container_width=True)

    # Table
    rows = []
    for name, data in sorted(filtered.items(), key=lambda x: x[1]["weight"], reverse=True):
        top_sp = max(data["species"].items(), key=lambda x: x[1])[0] if data["species"] else "N/A"
        rows.append({
            "Customer": name,
            "Weight (lbs)": f"{data['weight']:,.1f}",
            "Boxes": data["boxes"],
            "Orders": data["orders"],
            "Days Active": len(data["days"]),
            "Top Species": top_sp,
        })
    st.dataframe(rows, use_container_width=True)


elif page == "Species":
    st.title("Species Analysis")

    if not payloads:
        st.warning("No data found.")
        st.stop()

    species_data: dict[str, dict] = defaultdict(lambda: {"weight": 0.0, "boxes": 0})
    for p in payloads:
        for species, total in p.totals.species_breakdown.items():
            species_data[species]["weight"] += total.weight_lbs
            species_data[species]["boxes"] += total.boxes

    col1, col2 = st.columns(2)

    with col1:
        fig = px.pie(
            names=list(species_data.keys()),
            values=[v["weight"] for v in species_data.values()],
            title="Species by Weight",
            hole=0.4,
        )
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        fig = px.bar(
            x=list(species_data.keys()),
            y=[v["boxes"] for v in species_data.values()],
            labels={"x": "Species", "y": "Boxes"},
            title="Species by Box Count",
        )
        st.plotly_chart(fig, use_container_width=True)


elif page == "AWB Tracker":
    st.title("AWB Tracker")

    if not payloads:
        st.warning("No data found.")
        st.stop()

    all_awbs = {}
    for p in payloads:
        for s in p.shipments:
            all_awbs[s.awb] = {"date": p.date, "supplier": s.supplier, "shipment": s}

    search = st.text_input("Search AWB")
    if search:
        matches = {k: v for k, v in all_awbs.items() if search in k}
    else:
        matches = all_awbs

    for awb, info in sorted(matches.items(), key=lambda x: x[1]["date"], reverse=True):
        shipment = info["shipment"]
        total_w = sum(l.weight_lbs or 0 for l in shipment.lines)
        with st.expander(f"{awb} — {info['date']} ({info['supplier']}) — {total_w:,.1f} lbs"):
            for line in shipment.lines:
                w = f"{line.weight_lbs:,.1f} lbs" if line.weight_lbs else "N/A"
                st.write(f"- **{line.customer_name}** ({line.company or 'N/A'}): "
                         f"{line.species} — {line.boxes or '?'} boxes / {w}")


elif page == "Anomalies":
    st.title("Anomalies")

    if not payloads:
        st.warning("No data found.")
        st.stop()

    all_anomalies = []
    for p in payloads:
        for a in p.anomalies:
            all_anomalies.append({
                "Date": p.date.isoformat(),
                "Type": a.anomaly_type.value,
                "Severity": a.severity.value,
                "Description": a.description,
                "AWB": a.related_awb or "",
            })

    if all_anomalies:
        severity_filter = st.multiselect("Severity", ["ERROR", "WARNING"], default=["ERROR", "WARNING"])
        filtered = [a for a in all_anomalies if a["Severity"] in severity_filter]
        st.dataframe(filtered, use_container_width=True)

        error_count = sum(1 for a in all_anomalies if a["Severity"] == "ERROR")
        warning_count = len(all_anomalies) - error_count
        col1, col2 = st.columns(2)
        col1.metric("Errors", error_count)
        col2.metric("Warnings", warning_count)
    else:
        st.success("No anomalies detected in this period.")


elif page == "Reports":
    st.title("Generate Reports")

    report_type = st.selectbox("Report Type", ["daily", "weekly", "monthly"])
    report_date = st.date_input("Report date", value=date.today())

    if st.button("Generate Report"):
        from tunadex.reports.daily import generate_daily_summary
        from tunadex.reports.weekly import generate_weekly_summary
        from tunadex.reports.monthly import generate_monthly_summary
        from tunadex.reports.html_generator import render_report_html, save_report_html

        if report_type == "daily":
            day_payloads = load_payloads(report_date, report_date)
            if day_payloads:
                md = generate_daily_summary(day_payloads[0])
                html = render_report_html(day_payloads, "daily", md)
            else:
                st.error("No data for this date.")
                st.stop()
        elif report_type == "weekly":
            week_start = report_date - timedelta(days=report_date.weekday())
            week_payloads = load_payloads(week_start, week_start + timedelta(days=6))
            md = generate_weekly_summary(week_payloads)
            html = render_report_html(week_payloads, "weekly", md)
        else:
            month_start = report_date.replace(day=1)
            next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
            month_payloads = load_payloads(month_start, next_month - timedelta(days=1))
            md = generate_monthly_summary(month_payloads)
            html = render_report_html(month_payloads, "monthly", md)

        st.markdown(md)

        path = save_report_html(html, report_type, report_date)
        st.success(f"HTML report saved to: {path}")
        st.download_button("Download HTML Report", html, f"{report_type}_{report_date}.html", "text/html")
