#!/usr/bin/env python3
"""Keep the first OCR pass and targeted script passes together for page review."""

import argparse
import hashlib
import json
import shutil
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_hash(path: Path, expected: str) -> None:
    actual = sha256(path)
    if actual != expected:
        raise ValueError(f"Hash mismatch for {path}: expected {expected}, got {actual}")


def has_greek(text: str) -> bool:
    return any("\u0370" <= char <= "\u03ff" or "\u1f00" <= char <= "\u1fff" for char in text)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--base-json", type=Path, required=True)
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    require_hash(args.pdf, manifest["documentSha256"])
    require_hash(args.image, manifest["imageSha256"])
    require_hash(args.base_json, manifest["baseJsonSha256"])

    # Import the OCR dependencies after input validation. The user's isolated
    # PaddleOCR environment supplies both packages; the app needs neither.
    from PIL import Image
    from paddleocr import PaddleOCR

    base = json.loads(args.base_json.read_text(encoding="utf-8"))
    texts, boxes, scores = base["rec_texts"], base["rec_boxes"], base["rec_scores"]
    if not (len(texts) == len(boxes) == len(scores)):
        raise ValueError("The base OCR arrays have different lengths")

    output = args.output
    raw = output / "raw"
    crops = output / "crops"
    raw.mkdir(parents=True, exist_ok=True)
    crops.mkdir(parents=True, exist_ok=True)
    shutil.copy2(args.image, output / "page-image.png")
    shutil.copy2(args.base_json, raw / "turkish-pass.json")

    lines = []
    by_index = {}
    for index, (text, box, score) in enumerate(zip(texts, boxes, scores)):
        x1, y1, x2, y2 = map(int, box)
        column = "left" if (x1 + x2) / 2 < manifest["columnSplitX"] else "right"
        line = {
            "baseLineIndex": index,
            "column": column,
            "box": [x1, y1, x2, y2],
            "baseText": text,
            "baseScore": float(score),
            "alternatives": [],
            "reviewStatus": "needs_review" if has_greek(text) else "unreviewed",
        }
        lines.append(line)
        by_index[index] = line

    models = {}
    image = Image.open(args.image)
    for region in manifest["regions"]:
        index = region["baseLineIndex"]
        if index not in by_index:
            raise ValueError(f"Missing base line {index} for {region['id']}")
        crop_box = region["crop"]
        if len(crop_box) != 4 or not (0 <= crop_box[0] < crop_box[2] <= image.width and 0 <= crop_box[1] < crop_box[3] <= image.height):
            raise ValueError(f"Invalid crop for {region['id']}")
        line_box = by_index[index]["box"]
        if crop_box[2] < line_box[0] or crop_box[0] > line_box[2] or crop_box[3] < line_box[1] or crop_box[1] > line_box[3]:
            raise ValueError(f"Crop misses base line {index}")
        key = (region["ocrVersion"], region["lang"])
        if key not in models:
            models[key] = PaddleOCR(
                ocr_version=key[0], lang=key[1], device="cpu", engine="paddle",
                use_doc_orientation_classify=False, use_doc_unwarping=False,
                use_textline_orientation=False,
            )
        crop_path = crops / f"{region['id']}.png"
        cropped = image.crop(tuple(crop_box))
        cropped.resize((cropped.width * 2, cropped.height * 2)).save(crop_path)
        results = list(models[key].predict(str(crop_path)))
        if len(results) != 1:
            raise ValueError(f"Expected one crop result for {region['id']}")
        raw_path = raw / f"{region['id']}.json"
        results[0].save_to_json(str(raw_path))
        alternate = json.loads(raw_path.read_text(encoding="utf-8"))
        candidates = [
            {"text": text, "score": float(score), "cropBox": box}
            for text, score, box in zip(
                alternate["rec_texts"], alternate["rec_scores"], alternate["rec_boxes"]
            )
        ]
        by_index[index]["alternatives"].append({
            "regionId": region["id"],
            "script": region["script"],
            "lang": region["lang"],
            "ocrVersion": region["ocrVersion"],
            "crop": crop_box,
            "cropScale": 2,
            "candidates": candidates,
            "rawResult": str(raw_path.relative_to(output)),
        })
        by_index[index]["reviewStatus"] = "needs_review"

    body = [line for line in lines if line["baseLineIndex"] not in (0, len(lines) - 1)]
    body.sort(key=lambda line: (0 if line["column"] == "left" else 1, line["box"][1], line["box"][0]))
    combined = {
        "source": manifest["source"],
        "documentSha256": manifest["documentSha256"],
        "pdfPage": manifest["pdfPage"],
        "printedPage": manifest["printedPage"],
        "pageImage": "page-image.png",
        "passes": [
            {"lang": "tr", "ocrVersion": "unspecified in supplied OCR result", "rawResult": "raw/turkish-pass.json"},
            *({"lang": lang, "ocrVersion": version} for version, lang in models),
        ],
        "reviewState": "unverified_ocr",
        "bodyLines": body,
    }
    (output / "combined.json").write_text(json.dumps(combined, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    report = [
        f"# {manifest['source']} — printed page {manifest['printedPage']} / PDF page {manifest['pdfPage']}",
        "",
        "This is unverified OCR. The text below follows left column, then right column.",
        "Greek-pass alternatives are suggestions attached to their Turkish-pass lines; none silently replaces the page reading.",
        "Line breaks and hyphenation still follow the scan. Compare against [the page image](page-image.png).",
        "",
    ]
    for column in ("left", "right"):
        report.extend([f"## {column.title()} column", "", "```text"])
        report.extend(line["baseText"] for line in body if line["column"] == column)
        report.extend(["```", ""])
    report.extend(["## Script-pass review", ""])
    for line in body:
        for alternative in line["alternatives"]:
            report.extend([
                f"### {alternative['regionId']} — {line['column']} line {line['baseLineIndex']}",
                "",
                f"- Turkish pass: {line['baseText']}",
                *(
                    f"- Greek pass: {candidate['text']} (model score {candidate['score']:.3f})"
                    for candidate in alternative["candidates"]
                ),
                f"- [Crop](crops/{alternative['regionId']}.png) · [raw Greek result]({alternative['rawResult']}) · status: needs review",
                "",
            ])
    (output / "review.md").write_text("\n".join(report), encoding="utf-8")
    print(f"Wrote {len(body)} ordered body lines and {len(manifest['regions'])} script-pass regions to {output}")


if __name__ == "__main__":
    main()
