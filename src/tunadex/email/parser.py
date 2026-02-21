"""Regex-based first-pass parser — extract AWBs, customers, species from email text."""

from __future__ import annotations

import re

from tunadex.config import AWB_PATTERN, KNOWN_CUSTOMERS, KNOWN_SPECIES


def extract_awbs(text: str) -> list[str]:
    """Extract Air Way Bill numbers from text.

    AWBs are typically 11-digit numbers, sometimes formatted as XXX-XXXX-XXXX.
    """
    raw = re.findall(AWB_PATTERN, text)
    return [re.sub(r"[-\s]", "", awb) for awb in raw]


def extract_customer_mentions(text: str) -> list[tuple[str, str]]:
    """Find known customer name mentions in text.

    Returns list of (contact_name, company_name) tuples.
    """
    text_lower = text.lower()
    found: list[tuple[str, str]] = []
    seen_companies: set[str] = set()

    for contact, company in KNOWN_CUSTOMERS.items():
        if contact in text_lower and company not in seen_companies:
            found.append((contact, company))
            seen_companies.add(company)

    return found


def extract_species_mentions(text: str) -> list[str]:
    """Find known species mentions in text."""
    text_lower = text.lower()
    found: list[str] = []

    for species in KNOWN_SPECIES:
        if species in text_lower:
            found.append(species)

    return found


def extract_weights(text: str) -> list[float]:
    """Extract weight values in pounds from text.

    Handles formats like: "450 lbs", "450#", "450 pounds", "200.5 lbs"
    """
    patterns = [
        r"([\d,]+\.?\d*)\s*(?:lbs?|pounds?|#)",
        r"([\d,]+\.?\d*)\s*(?:kg|kilos?|kilograms?)",
    ]

    weights: list[float] = []
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            val = float(match.group(1).replace(",", ""))
            if "kg" in pattern:
                val *= 2.205  # Convert kg to lbs
            weights.append(val)

    return weights


def extract_box_counts(text: str) -> list[int]:
    """Extract box count values from text.

    Handles: "12 boxes", "12 bxs", "12 box", "boxes: 12"
    """
    patterns = [
        r"(\d+)\s*(?:boxes|bxs|box)\b",
        r"(?:boxes|bxs|box)\s*[:=]\s*(\d+)",
    ]

    counts: list[int] = []
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            counts.append(int(match.group(1)))

    return counts


def first_pass_extract(text: str) -> dict:
    """Run all regex extractors on text, return a summary dict.

    This is a pre-processing step before AI extraction. It gives the AI model
    hints about what's in the text.
    """
    return {
        "awbs": extract_awbs(text),
        "customers": extract_customer_mentions(text),
        "species": extract_species_mentions(text),
        "weights": extract_weights(text),
        "box_counts": extract_box_counts(text),
    }
