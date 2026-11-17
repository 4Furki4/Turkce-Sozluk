#!/usr/bin/env python3
"""Render Hasan Eren pages, run local OCR, and prepare the scan review artifacts."""

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from statistics import median

from PIL import Image


DOCUMENT_SHA = "39b636341602c2572035a93366957c078d154f6787d5e60c153caeefb80a2f8e"
SOURCE = "Hasan Eren, Türk Dilinin Etimolojik Sözlüğü (2nd edition, 1999)"
FIRST_DICTIONARY_PAGE = 31
LAST_DICTIONARY_PAGE = 502
GREEK = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]|^\s*(?:[<>:]+\s*)?R\s|^\s*Rumca\s", re.I)


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def write_json(path, data):
    pending = path.with_suffix(".tmp")
    pending.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    pending.replace(path)


def prepare_page(number, target, raw, scan):
    with Image.open(scan) as image:
        width, height = image.size
    page = json.loads(raw.read_text(encoding="utf-8"))
    ordered = list(zip(page["rec_texts"], page["rec_scores"], page["rec_boxes"], strict=True))
    long = [box for _, _, box in ordered if width * 0.25 <= box[2] - box[0] < width * 0.48]
    left = [box[2] for box in long if box[0] < width * 0.38]
    right = [box[0] for box in long if box[0] >= width * 0.38]
    split = (median(left) + median(right)) / 2 if left and right else width / 2

    lines, regions = [], []
    for index, (text, score, coords) in enumerate(ordered):
        x1, y1, x2, y2 = map(int, coords)
        if y2 > height * .75 and text.strip() == str(number - 30):
            continue
        if not text.strip():
            continue
        reasons = []
        if GREEK.search(text):
            reasons.append("greek")
        if "\ufffd" in text or re.search(r"&[\w\u0370-\u03ff]", text):
            reasons.append("damaged_glyph")
        if score < .92:
            reasons.append("low_confidence")
        lines.append({
            "baseLineIndex": index,
            "column": "left" if (x1 + x2) / 2 < split else "right",
            "box": [x1, y1, x2, y2],
            "baseText": text,
            "baseScore": score,
            "alternatives": [],
            "reviewStatus": "needs_review" if reasons else "unreviewed",
            "reviewReasons": reasons,
        })
        if reasons:
            regions.append({
                "id": f"line-{index}",
                "baseLineIndex": index,
                "crop": [max(0, x1 - 5), max(0, y1 - 5), min(width, x2 + 5), min(height, y2 + 5)],
                "script": "Greek" if "greek" in reasons else "Mixed",
            })

    lines.sort(key=lambda line: (line["column"], line["box"][1], line["box"][0]))
    combined = {
        "source": SOURCE, "documentSha256": DOCUMENT_SHA,
        "pdfPage": number, "printedPage": number - 30,
        "pageImage": scan.name, "imageWidth": width, "imageHeight": height,
        "reviewState": "unverified_ocr", "bodyLines": lines,
    }
    manifest = {field: combined[field] for field in ("documentSha256", "pdfPage", "printedPage")}
    manifest.update({"imageSha256": digest(scan), "regions": regions})
    write_json(target / "combined.json", combined)
    write_json(target / "manifest.json", manifest)
    return len(lines), len(regions)


def add_greek_suggestions(target, scan, recognizer, threads):
    combined = json.loads((target / "combined.json").read_text(encoding="utf-8"))
    manifest = json.loads((target / "manifest.json").read_text(encoding="utf-8"))
    greek = [region for region in manifest["regions"] if region["script"] == "Greek"]
    if greek:
        if recognizer is None:
            from paddleocr import TextRecognition

            recognizer = TextRecognition(model_name="el_PP-OCRv5_mobile_rec", device="cpu", cpu_threads=threads)
        import numpy as np

        lines = {line["baseLineIndex"]: line for line in combined["bodyLines"]}
        with Image.open(scan) as page:
            crops = [np.asarray(page.crop(region["crop"]).convert("RGB")) for region in greek]
        for region, result in zip(greek, recognizer.predict(crops, batch_size=8), strict=True):
            lines[region["baseLineIndex"]]["alternatives"].append({
                "regionId": region["id"], "script": "Greek", "lang": "el",
                "crop": region["crop"], "candidates": [
                    {"text": result["rec_text"], "score": float(result["rec_score"])},
                ],
            })
    write_json(target / "combined-scripts.json", combined)
    return recognizer, len(greek)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--first", type=int, default=31)
    parser.add_argument("--last", type=int, default=40)
    parser.add_argument("--pilot", type=Path)
    parser.add_argument("--qwen", action="store_true")
    parser.add_argument("--greek", action="store_true", help="Add a local Greek reading for marked lines")
    parser.add_argument("--cpu-threads", type=int, default=4)
    args = parser.parse_args()
    if not FIRST_DICTIONARY_PAGE <= args.first <= args.last <= LAST_DICTIONARY_PAGE or digest(args.pdf) != DOCUMENT_SHA:
        parser.error("Use PDF pages 31–502 of the pinned Hasan Eren scan")
    if args.cpu_threads < 1:
        parser.error("--cpu-threads must be positive")

    ocr = greek_recognizer = None
    for number in range(args.first, args.last + 1):
        target = args.output / f"page-{number}"
        target.mkdir(parents=True, exist_ok=True)
        scan, raw = target / "page-image.png", target / "turkish-pass.json"
        final = target / ("combined-qwen.json" if args.qwen else "combined-scripts.json" if args.greek else "combined.json")
        if final.exists() and scan.exists() and (number == 31 or (target / "manifest.json").exists()):
            continue
        if number == 31 and args.pilot:
            combined = json.loads((args.pilot / "combined-qwen.json").read_text(encoding="utf-8"))
            if combined["documentSha256"] != DOCUMENT_SHA or combined["pdfPage"] != 31:
                raise ValueError("The existing pilot refers to a different source page")
            shutil.copyfile(args.pilot / scan.name, scan)
            for name in ("qwen-crops", "qwen-cache", "crops", "raw"):
                shutil.copytree(args.pilot / name, target / name, dirs_exist_ok=True)
            with Image.open(scan) as image:
                combined["imageWidth"], combined["imageHeight"] = image.size
            write_json(target / "combined-qwen.json", combined)
            print(f"PDF {number}: reused the page 31 pilot", flush=True)
            continue
        if not scan.exists():
            pending_scan = scan.with_name("page-image-pending.png")
            subprocess.run([
                "pdftoppm", "-f", str(number), "-l", str(number), "-r", "300",
                "-gray", "-png", "-singlefile", str(args.pdf), str(pending_scan.with_suffix("")),
            ], check=True)
            pending_scan.replace(scan)
        base = target / "combined.json"
        manifest = target / "manifest.json"
        if not raw.exists() and not base.exists():
            if ocr is None:
                from paddleocr import PaddleOCR

                ocr = PaddleOCR(
                    lang="tr", ocr_version="PP-OCRv6", engine="paddle", device="cpu",
                    cpu_threads=args.cpu_threads,
                    text_recognition_batch_size=12,
                    use_doc_orientation_classify=False, use_doc_unwarping=False,
                    use_textline_orientation=False,
                )
            result, = ocr.predict(str(scan))
            pending_raw = raw.with_name("turkish-pass-pending.json")
            result.save_to_json(str(pending_raw))
            pending_raw.replace(raw)
        if not base.exists() or not manifest.exists():
            line_count, region_count = prepare_page(number, target, raw, scan)
            print(f"PDF {number}: {line_count} lines, {region_count} flagged regions", flush=True)
        else:
            region_count = len(json.loads(manifest.read_text(encoding="utf-8"))["regions"])
        if args.greek:
            greek_recognizer, greek_count = add_greek_suggestions(target, scan, greek_recognizer, args.cpu_threads)
            base = target / "combined-scripts.json"
            if greek_count:
                print(f"PDF {number}: {greek_count} Greek reading suggestions", flush=True)
        if args.qwen and region_count:
            subprocess.run([
                sys.executable, str(Path(__file__).with_name("add-qwen-suggestions.py")),
                "--combined", str(base),
                "--manifest", str(manifest),
            ], check=True)
        elif args.qwen:
            combined = json.loads(base.read_text(encoding="utf-8"))
            write_json(target / "combined-qwen.json", combined)


if __name__ == "__main__":
    main()
