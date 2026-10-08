import { createHash } from "node:crypto";

/** Validate batch PCM output again before uploading, without requiring Python. */
export function inspectPronunciationWav(bytes: Buffer) {
  if (bytes.length < 44 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") throw new Error("Invalid WAV header");
  let format: { encoding: number; channels: number; rate: number; bits: number } | undefined;
  let data: Buffer | undefined;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > bytes.length) throw new Error("Truncated WAV chunk");
    const name = bytes.toString("ascii", offset, offset + 4);
    if (name === "fmt " && size >= 16) format = { encoding: bytes.readUInt16LE(start), channels: bytes.readUInt16LE(start + 2), rate: bytes.readUInt32LE(start + 4), bits: bytes.readUInt16LE(start + 14) };
    if (name === "data") data = bytes.subarray(start, start + size);
    offset = start + size + (size % 2);
  }
  if (!format || format.encoding !== 1 || format.channels !== 1 || format.rate !== 48000 || format.bits !== 16 || !data || data.length % 2) throw new Error("Expected mono PCM16 48kHz WAV");
  const count = data.length / 2;
  const duration = count / format.rate;
  let squares = 0, peak = 0;
  for (let index = 0; index < count; index++) {
    const sample = data.readInt16LE(index * 2) / 32768;
    squares += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  const rms = Math.sqrt(squares / count);
  if (duration < 0.05 || duration > 60 || !Number.isFinite(rms) || rms < 0.0001 || peak < 0.001) throw new Error("Invalid duration or silent pronunciation audio");
  return { duration, rms, peak, sha256: createHash("sha256").update(bytes).digest("hex") };
}
