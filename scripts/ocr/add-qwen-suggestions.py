#!/usr/bin/env python3
"""Read marked OCR regions with local Qwen and retain the readings as suggestions."""

import argparse
import base64
import io
import json
import re
import unicodedata
from hashlib import sha256
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, Request, build_opener

from PIL import Image, ImageOps


SERVER = "http://127.0.0.1:11434"
PROMPT = (
    "Transcribe the printed text visible in this image verbatim. "
    "Preserve the original language, scripts, Greek breathing marks and accents, "
    "Turkish letters, punctuation, abbreviations and hyphenation. "
    "Do not translate, modernize spelling, correct, or complete cut-off text. "
    "Use [?] for an unreadable character. Output only the transcription."
)
OPTIONS = {"temperature": 0, "num_ctx": 4096, "num_predict": 256, "seed": 42}
GREEK = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]+")
CLIENT = build_opener(ProxyHandler({}))


def local_api(path, payload=None, timeout=10):
    request = Request(
        SERVER + path,
        data=None if payload is None else json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with CLIENT.open(request, timeout=timeout) as response:
        return json.load(response)


def write_atomic(path, data):
    with NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
        temporary_path = Path(temporary.name)
        try:
            temporary.write(data)
            temporary.close()
            temporary_path.replace(path)
        finally:
            temporary_path.unlink(missing_ok=True)


def write_json(path, value):
    write_atomic(path, (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode())


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def marked_forms(text):
    words = GREEK.findall(unicodedata.normalize("NFC", text))
    return [
        ("".join(ch for ch in unicodedata.normalize("NFD", word) if not unicodedata.combining(ch)), word)
        for word in words
    ]


def review_reasons(text, script, earlier_text):
    reasons = []
    if "[?]" in text or "\ufffd" in text:
        reasons.append("unreadable_characters")
    if script == "Greek":
        reasons.append("check_greek_marks")
        if any(
            base == old_base and word != old_word
            for base, word in marked_forms(text)
            for old_base, old_word in marked_forms(earlier_text)
        ):
            reasons.append("greek_marks_disagree")
    return reasons


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--combined", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument(
        "--model",
        choices=("qwen3-vl:8b-instruct", "qwen3-vl:4b-instruct"),
        default="qwen3-vl:8b-instruct",
    )
    args = parser.parse_args()
    page_dir = args.combined.parent
    combined, manifest = read_json(args.combined), read_json(args.manifest)
    for field in ("documentSha256", "pdfPage", "printedPage"):
        if combined[field] != manifest[field]:
            raise ValueError(f"The manifest and OCR refer to different pages ({field})")
    if combined["reviewState"] != "unverified_ocr" or args.combined.name == "combined-qwen.json":
        raise ValueError("Supply the original combined OCR result")
    page_bytes = (page_dir / combined["pageImage"]).read_bytes()
    if sha256(page_bytes).hexdigest() != manifest["imageSha256"]:
        raise ValueError("Page image hash differs from the manifest")
    image = Image.open(io.BytesIO(page_bytes)).convert("RGB")
    regions = {}
    for region in manifest["regions"]:
        regions.setdefault(region["baseLineIndex"], []).append(region)

    models = {item["name"]: item for item in local_api("/api/tags")["models"]}
    if args.model not in models or models[args.model]["size"] <= 0:
        raise ValueError(f"Local model missing. Install it with: ollama pull {args.model}")
    model_digest = models[args.model]["digest"]
    runtime = local_api("/api/version")["version"]

    cache_dir, crops_dir = page_dir / "qwen-cache", page_dir / "qwen-crops"
    cache_dir.mkdir(exist_ok=True)
    crops_dir.mkdir(exist_ok=True)
    hits = misses = 0
    report = [
        f"# Qwen OCR suggestions for PDF page {combined['pdfPage']}",
        "",
        f"Model: {args.model}. All suggestions require comparison with the scan.",
        "",
    ]
    for line in combined["bodyLines"]:
        if line["reviewStatus"] != "needs_review":
            continue
        line["qwenSuggestions"] = []
        alternatives = {item["regionId"]: item for item in line["alternatives"]}
        for region in regions.get(line["baseLineIndex"], []):
            alternative = alternatives.get(region["id"])
            box = region.get("qwenCrop", region["crop"])
            x1, y1, x2, y2 = box
            rx1, ry1, rx2, ry2 = region["crop"]
            if not (
                rx1 <= x1 < x2 <= rx2 <= image.width
                and ry1 <= y1 < y2 <= ry2 <= image.height
                and x1 >= 0 and y1 >= 0
                and (alternative is None or region["crop"] == alternative["crop"])
            ):
                raise ValueError(f"Invalid Qwen crop for {region['id']}")

            word = image.crop(box).resize(((x2 - x1) * 2, (y2 - y1) * 2), Image.Resampling.BICUBIC)
            buffer = io.BytesIO()
            ImageOps.expand(word, border=42, fill="white").save(buffer, format="PNG")
            png = buffer.getvalue()
            image_digest = sha256(png).hexdigest()
            crop_path = crops_dir / f"{image_digest}.png"
            if not crop_path.exists():
                write_atomic(crop_path, png)

            identity = {
                "imageSha256": image_digest, "model": args.model, "modelDigest": model_digest,
                "runtime": runtime, "prompt": PROMPT, "options": OPTIONS,
            }
            cache_key = sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
            raw_path = cache_dir / f"{cache_key}.json"
            if raw_path.exists():
                cached = read_json(raw_path)
                if cached["input"] != identity:
                    raise ValueError(f"Cache key mismatch: {raw_path}")
                response = cached["response"]
                hits += 1
            else:
                response = local_api("/api/chat", {
                    "model": args.model,
                    "stream": False,
                    "options": OPTIONS,
                    "messages": [{
                        "role": "user", "content": PROMPT,
                        "images": [base64.b64encode(png).decode("ascii")],
                    }],
                }, timeout=180)
                misses += 1

            text = response["message"]["content"].strip()
            if not text or response.get("done_reason") != "stop":
                raise ValueError(f"Ollama returned an incomplete reading for {region['id']}")
            if not raw_path.exists():
                write_json(raw_path, {"input": identity, "response": response})
            previous = [candidate["text"] for candidate in alternative["candidates"]] if alternative else []
            reasons = review_reasons(text, region["script"], " ".join([line["baseText"], *previous]))
            line["qwenSuggestions"].append({
                "regionId": region["id"],
                "model": args.model,
                "modelDigest": model_digest,
                "crop": box,
                "cropImage": crop_path.relative_to(page_dir).as_posix(),
                "imageSha256": image_digest,
                "rawResult": raw_path.relative_to(page_dir).as_posix(),
                "text": text,
                "reviewStatus": "needs_review",
                "reviewReasons": reasons,
            })
            report.extend([
                f"## {region['id']}",
                "",
                f"[Crop]({crop_path.relative_to(page_dir)}) · [Raw result]({raw_path.relative_to(page_dir)})",
                "",
                f"- Base OCR: {line['baseText']}",
                f"- PaddleOCR alternative: {' · '.join(previous)}",
                f"- Qwen: {text}",
                f"- Review: {', '.join(reasons) or 'compare with scan'}",
                "",
            ])

    if not hits and not misses:
        raise ValueError("No marked OCR regions were found")
    write_json(page_dir / "combined-qwen.json", combined)
    write_atomic(page_dir / "qwen-review.md", ("\n".join(report) + "\n").encode())
    print(f"Saved {hits + misses} Qwen suggestions ({hits} cached, {misses} new) to {page_dir / 'combined-qwen.json'}")


if __name__ == "__main__":
    try:
        main()
    except HTTPError as error:
        raise SystemExit(f"Local Ollama returned HTTP {error.code}: {error.read().decode(errors='replace')}") from error
    except (URLError, ValueError) as error:
        raise SystemExit(str(error)) from error
