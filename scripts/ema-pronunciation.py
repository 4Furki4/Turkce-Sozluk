#!/usr/bin/env python3
"""Offline EMA worker. One model per batch; checkpoint every completed WAV."""
import argparse
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import sys
import time
import wave


def inspect_wav(path):
    import numpy as np
    with wave.open(str(path), "rb") as wav:
        if wav.getsampwidth() != 2 or wav.getnchannels() != 1 or wav.getcomptype() != "NONE":
            raise ValueError("Expected mono PCM16 WAV")
        rate, frames = wav.getframerate(), wav.getnframes()
        samples = np.frombuffer(wav.readframes(frames), dtype="<i2").astype(np.float64) / 32768
    duration = frames / rate
    rms = float(np.sqrt(np.mean(samples ** 2))) if len(samples) else 0
    peak = float(np.max(np.abs(samples))) if len(samples) else 0
    if rate != 48000 or not 0.05 <= duration <= 60 or not math.isfinite(rms) or rms < 0.0001 or peak < 0.001:
        raise ValueError(f"Invalid/silent audio: duration={duration}, rms={rms}, peak={peak}, rate={rate}")
    return {"duration": duration, "rms": rms, "peak": peak, "sampleRate": rate,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def save_json(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", required=True, type=Path)
    parser.add_argument("--revision", help="Cached Hugging Face commit SHA; defaults to cached refs/main")
    parser.add_argument("--describe", action="store_true")
    parser.add_argument("--jobs", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--audio-dir", type=Path, help="Shared WAV directory; checkpoints remain in --output")
    args = parser.parse_args()
    os.environ.update(HF_HOME=str(args.cache.resolve()), HF_HUB_OFFLINE="1", HF_HUB_DISABLE_TELEMETRY="1")
    from huggingface_hub import hf_hub_download
    repo = "canberkkkkkk/ema-lightning"
    revision = args.revision or (args.cache / "hub" / "models--canberkkkkkk--ema-lightning" / "refs" / "main").read_text().strip()
    # Pin both model files. EMA 1.0.1's constructor does not expose a revision argument.
    files = {name: hf_hub_download(repo, name, revision=revision, local_files_only=True) for name in ("ema.pt", "decoder.pt", "config.json")}
    metadata = {"model": repo, "modelRevision": revision, "packageVersion": importlib.metadata.version("ema-lightning")}
    if args.describe:
        print(json.dumps(metadata))
        return
    if not args.jobs or not args.output:
        parser.error("--jobs and --output are required for generation")
    args.output.mkdir(parents=True, exist_ok=True)
    audio_dir = args.audio_dir or args.output
    audio_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    jobs = json.loads(args.jobs.read_text())
    tts = None
    failed = False
    for job in jobs:
        key = job["key"]
        path = audio_dir / f"{key}.wav"
        try:
            if any(job[name] != metadata[name] for name in metadata):
                raise ValueError("Worker model metadata differs from job identity")
            existing = manifest.get(key)
            if existing and path.exists() and inspect_wav(path)["sha256"] == existing["sha256"]:
                print(f"Skipped {job['spokenText']}", flush=True)
                continue
            if tts is None:
                import ema_lightning.api as api
                api.hf_hub_download = lambda repo_id, filename, **kwargs: files[filename]
                from ema_lightning import EMA
                print("Loading one EMA instance on CPU…", flush=True)
                tts = EMA(device="cpu")
            partial = audio_dir / f"{key}.partial.wav"
            started = time.perf_counter()
            tts.say(job["spokenText"], path=str(partial), seed=job["settings"]["seed"], speed=job["settings"]["speed"])
            metrics = inspect_wav(partial)
            partial.replace(path)
            manifest[key] = {**job, **metrics, "file": path.name, "frontendText": tts._frontend(job["spokenText"]), "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
            save_json(manifest_path, manifest)
            print(f"Generated {job['spokenText']}: {metrics['duration']:.2f}s, RMS {metrics['rms']:.4f}, {time.perf_counter()-started:.2f}s", flush=True)
        except Exception as error:
            failed = True
            with (args.output / "failures.jsonl").open("a", encoding="utf-8") as log:
                log.write(json.dumps({"key": key, "spokenText": job["spokenText"], "error": str(error), "time": time.time()}, ensure_ascii=False) + "\n")
            print(f"Failed {job['spokenText']}: {error}", file=sys.stderr, flush=True)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
