#!/usr/bin/env python3
"""Audit the local Hasan Eren reader against all printed dictionary pages."""

import argparse
import hashlib
import json
from pathlib import Path

DOCUMENT_SHA = "39b636341602c2572035a93366957c078d154f6787d5e60c153caeefb80a2f8e"
PAGE_COUNT = 472
ROOT = Path(__file__).resolve().parents[2] / "data" / "etymology"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--pilot", type=Path, required=True)
    parser.add_argument("--book", type=Path, required=True)
    args = parser.parse_args()
    if sha256(args.pdf) != DOCUMENT_SHA:
        parser.error("The local PDF is not the pinned source")

    catalog = load(args.book / "reader-catalog.json")
    if catalog["documentSha256"] != DOCUMENT_SHA or catalog["pageCount"] != PAGE_COUNT:
        parser.error("The reader catalog refers to a different source")
    issues, missing, missing_greek = [], [], []
    source, positions = [], {}
    wide_rows = []
    blank_pages = []
    greek_count = 0
    for page in range(1, PAGE_COUNT + 1):
        folder = args.pilot if page <= 10 else args.book
        target = folder / f"page-{page + 30}"
        variants = ("combined-layout.json", "combined-qwen.json", "combined-scripts.json", "combined.json")
        result = next((target / variant for variant in variants if (target / variant).is_file()), None)
        if result is None:
            missing.append(page)
            continue
        record = load(result)
        if (record["documentSha256"], record["printedPage"], record["pdfPage"]) != (DOCUMENT_SHA, page, page + 30):
            issues.append(f"Wrong document metadata on page {page}")
        manifest = load(ROOT / "hasan-eren-page-31-ocr-regions.json" if page == 1 else target / "manifest.json")
        image = target / "page-image.png"
        if not image.is_file() or sha256(image) != manifest["imageSha256"]:
            issues.append(f"Page image differs from its recorded hash on page {page}")

        if page > 10:
            verified_variant = target / "combined-scripts.json"
            if not verified_variant.is_file():
                missing_greek.append(page)
            else:
                multi = load(verified_variant)["bodyLines"]
                base = load(target / "combined.json")["bodyLines"]
                source_rows = lambda rows: [(row["baseLineIndex"], row["box"], row["baseText"]) for row in rows]
                if source_rows(multi) != source_rows(base):
                    issues.append(f"Greek pass altered a base OCR row on page {page}")
                expected = {region["baseLineIndex"] for region in manifest["regions"] if region["script"] == "Greek"}
                actual = {row["baseLineIndex"] for row in multi if any(
                    alternative["lang"] == "el" and alternative["candidates"]
                    for alternative in row["alternatives"]
                )}
                if expected != actual:
                    issues.append(f"Greek pass coverage differs on page {page}")
                greek_count += len(actual)

        if not record["bodyLines"]:
            blank_pages.append(page)
        for row in record["bodyLines"]:
            id = f"p{page}-l{row['baseLineIndex']}"
            x1, y1, x2, y2 = row["box"]
            if not (0 <= x1 < x2 <= record["imageWidth"] and 0 <= y1 < y2 <= record["imageHeight"]):
                issues.append(f"OCR box falls outside page at {id}")
            if len(row["baseText"]) == 1 and row["baseText"].isupper() and y2 - y1 > 70:
                continue
            if (x2 - x1) > record["imageWidth"] * .52:
                wide_rows.append(id)
            if id in positions:
                issues.append(f"Duplicated OCR row at {id}")
            positions[id] = len(source)
            source.append((id, row["baseText"]))

    first = load(ROOT / "hasan-eren-page-31-entry-boundaries.json")["entries"]
    pilot = load(ROOT / "hasan-eren-pages-02-10-entry-boundaries.json")["entries"]
    start_ids = [f"p1-l{entry['firstLineIndex']}" for entry in first] + [
        f"p{entry['page']}-l{entry['line']}" for entry in pilot
    ]
    claimed = set()
    spans = []
    for start_id, next_id in zip(start_ids, start_ids[1:]):
        if start_id not in positions or next_id not in positions:
            issues.append(f"Missing reviewed pilot start {start_id} or {next_id}")
            continue
        spans.append((positions[start_id], positions[next_id] - 1, start_id))

    for entry in catalog["entries"]:
        id, end_id = entry["id"], entry["lastLineId"]
        if id in claimed:
            issues.append(f"Duplicate catalog entry {id}")
            continue
        claimed.add(id)
        if id not in positions or end_id not in positions:
            issues.append(f"Unable to locate both source rows for {id}")
            continue
        start, end = positions[id], positions[end_id]
        if start > end or not source[start][1].startswith(entry["ocrHeadword"]):
            issues.append(f"Source range or title does not match {id}")
            continue
        if not entry["origin"].strip() or not entry["evidence"] or any(
            not start <= positions.get(row, -1) <= end for row in entry["evidence"]
        ):
            issues.append(f"Summary or its evidence is incomplete at {id}")
        spans.append((start, end, id))

    spans.sort()
    cursor, unassigned = 0, 0
    for start, end, id in spans:
        if start < cursor:
            issues.append(f"Overlapping source spans at {id}")
        unassigned += max(0, start - cursor)
        cursor = max(cursor, end + 1)
    unassigned += len(source) - cursor

    print(json.dumps({
        "scannedPages": PAGE_COUNT - len(missing),
        "expectedPages": PAGE_COUNT,
        "missingPages": missing,
        "blankPages": blank_pages,
        "greekSuggestions": greek_count,
        "missingGreekPass": missing_greek,
        "sourceRows": len(source),
        "unassignedSourceRows": unassigned,
        "readerEntries": len(spans),
        "pendingSummaries": catalog["pending"],
        "wideRows": wide_rows,
        "issues": issues,
    }, ensure_ascii=False, indent=2))
    return int(bool(missing or missing_greek or unassigned or catalog["pending"] or wide_rows or issues))


if __name__ == "__main__":
    raise SystemExit(main())
