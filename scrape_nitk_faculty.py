#!/usr/bin/env python3
"""
NITK Faculty Directory Scraper
================================
Targets: https://www.nitk.ac.in/department (each department faculty page)
Output:  professors.json  (drop into lib/ as your seed data)

Requirements:
    pip install requests beautifulsoup4 lxml

Usage:
    python scrape_nitk_faculty.py
    python scrape_nitk_faculty.py --delay 1.5   # be polite, slow down requests
    python scrape_nitk_faculty.py --dept "Computer Science & Engineering"  # single dept
"""

import argparse
import json
import re
import time
from dataclasses import asdict, dataclass, field
from typing import Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

# ─── Configuration ────────────────────────────────────────────────────────────

BASE_URL = "https://www.nitk.ac.in"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; NITKRateProf-Scraper/1.0; "
        "+https://github.com/your-repo)"
    )
}
REQUEST_TIMEOUT = 15

# All NITK department slugs → human-readable name
# Source: https://www.nitk.ac.in/department
DEPARTMENTS: dict[str, str] = {
    "chemical-engineering":                   "Chemical Engineering",
    "chemistry":                              "Chemistry",
    "civil-engineering":                      "Civil Engineering",
    "computer-science-engineering":           "Computer Science & Engineering",
    "electrical-electronics-engineering":     "Electrical & Electronics Engineering",
    "electronics-communication-engineering":  "Electronics & Communication Engineering",
    "humanities-social-sciences":             "Humanities & Social Sciences",
    "information-technology":                 "Information Technology",
    "mathematical-computational-sciences":    "Mathematical & Computational Sciences",
    "mechanical-engineering":                 "Mechanical Engineering",
    "metallurgical-materials-engineering":    "Metallurgical & Materials Engineering",
    "mining-engineering":                     "Mining Engineering",
    "physics":                                "Physics",
    "applied-mechanics-hydraulics":           "Applied Mechanics & Hydraulics",
    "water-resources-ocean-engineering":      "Water Resources & Ocean Engineering",
}

DESIGNATION_PRIORITY = [
    "Director",
    "Professor",
    "Associate Professor",
    "Assistant Professor",
    "Lecturer",
    "Visiting Faculty",
    "Adjunct Faculty",
]

# ─── Data Model ───────────────────────────────────────────────────────────────

@dataclass
class Professor:
    id: int
    name: str
    department: str
    designation: str
    overallRating: float = 0.0
    difficulty: float = 0.0
    tags: list[str] = field(default_factory=list)
    status: str = "active"

# ─── Helpers ─────────────────────────────────────────────────────────────────

def clean_text(text: Optional[str]) -> str:
    """Strip whitespace and normalise unicode spaces."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()


def guess_designation(raw: str) -> str:
    """
    Map raw designation strings to one of our canonical values.
    Falls back to the raw string if nothing matches.
    """
    raw_lower = raw.lower()
    for canon in DESIGNATION_PRIORITY:
        if canon.lower() in raw_lower:
            return canon
    return raw.title()


def get_soup(url: str, session: requests.Session) -> Optional[BeautifulSoup]:
    try:
        resp = session.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")
    except requests.RequestException as exc:
        print(f"  [WARN] Failed to fetch {url}: {exc}")
        return None

# ─── Scraping Logic ───────────────────────────────────────────────────────────

def scrape_department(
    slug: str,
    dept_name: str,
    session: requests.Session,
) -> list[dict]:
    """
    Scrape one department's faculty page and return a list of raw dicts.

    NITK faculty pages follow two common layouts:
      Layout A: /department/<slug>/faculty  — table with Name / Designation columns
      Layout B: /department/<slug>/people   — card grid with h3 + p tags

    We try both and merge results, deduplicating by name.
    """
    urls_to_try = [
        f"{BASE_URL}/department/{slug}/faculty",
        f"{BASE_URL}/department/{slug}/people",
        f"{BASE_URL}/department/{slug}",
    ]

    found: dict[str, dict] = {}   # keyed by lowercased name to deduplicate

    for url in urls_to_try:
        soup = get_soup(url, session)
        if not soup:
            continue

        # ── Strategy 1: <table> rows ──────────────────────────────────────────
        for table in soup.find_all("table"):
            headers = [clean_text(th.get_text()) for th in table.find_all("th")]
            name_col = next(
                (i for i, h in enumerate(headers) if "name" in h.lower()), None
            )
            desig_col = next(
                (i for i, h in enumerate(headers) if "designation" in h.lower()), None
            )
            if name_col is None:
                continue

            for row in table.find_all("tr")[1:]:   # skip header row
                cells = row.find_all("td")
                if not cells or len(cells) <= name_col:
                    continue
                name = clean_text(cells[name_col].get_text())
                if not name or len(name) < 4:
                    continue
                designation = (
                    clean_text(cells[desig_col].get_text())
                    if desig_col is not None and len(cells) > desig_col
                    else "Faculty"
                )
                key = name.lower()
                if key not in found:
                    found[key] = {
                        "name": name,
                        "department": dept_name,
                        "designation": guess_designation(designation),
                    }

        # ── Strategy 2: Card / list markup ───────────────────────────────────
        # Common selectors NITK uses for card grids
        card_selectors = [
            ".faculty-card", ".faculty-item", ".faculty-member",
            ".people-card", ".staff-card", ".team-member",
            "article.member", "div.faculty",
        ]
        for selector in card_selectors:
            for card in soup.select(selector):
                name_el = card.find(["h3", "h4", "h2", "strong"])
                desig_el = card.find(["p", "span"], class_=re.compile(r"desig|role|title", re.I))
                if not name_el:
                    continue
                name = clean_text(name_el.get_text())
                designation = clean_text(desig_el.get_text()) if desig_el else "Faculty"
                if not name or len(name) < 4:
                    continue
                key = name.lower()
                if key not in found:
                    found[key] = {
                        "name": name,
                        "department": dept_name,
                        "designation": guess_designation(designation),
                    }

        if found:
            break   # found results from this URL; don't try the next

    return list(found.values())


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape NITK faculty directory")
    parser.add_argument(
        "--delay", type=float, default=1.0,
        help="Seconds to wait between department requests (default: 1.0)"
    )
    parser.add_argument(
        "--dept", type=str, default=None,
        help="Only scrape one department by its human-readable name"
    )
    parser.add_argument(
        "--output", type=str, default="professors.json",
        help="Output JSON filename (default: professors.json)"
    )
    args = parser.parse_args()

    session = requests.Session()
    all_professors: list[dict] = []
    current_id = 1

    target_depts = {
        slug: name
        for slug, name in DEPARTMENTS.items()
        if args.dept is None or name.lower() == args.dept.lower()
    }

    if not target_depts:
        print(f"[ERROR] Department '{args.dept}' not found. Available departments:")
        for name in DEPARTMENTS.values():
            print(f"  - {name}")
        return

    for slug, dept_name in target_depts.items():
        print(f"  Scraping: {dept_name}...")
        faculty = scrape_department(slug, dept_name, session)

        if not faculty:
            print(f"  [WARN] No faculty found for {dept_name}. "
                  "NITK may have changed their HTML structure. "
                  "Inspect the page manually and update the selectors above.")
        else:
            print(f"    ✓ Found {len(faculty)} faculty members")

        for member in faculty:
            all_professors.append({
                "id": current_id,
                "name": member["name"],
                "department": member["department"],
                "designation": member["designation"],
                "overallRating": 0.0,
                "difficulty": 0.0,
                "tags": [],
                "status": "active",
            })
            current_id += 1

        if args.delay > 0:
            time.sleep(args.delay)

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(all_professors, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Done. {len(all_professors)} professors written to {args.output}")
    print(f"   Copy {args.output} into your lib/ folder as professors.json,")
    print("   then import it in lib/professors.ts:\n")
    print("     import rawData from './professors.json'")
    print("     export const professors = rawData as Professor[]")


if __name__ == "__main__":
    main()
