/** @jest-environment node */
import { inspectPronunciationWav } from "../pronunciation-wav";
function wav(silent = false) {
  const bytes = Buffer.alloc(44 + 4800 * 2);
  bytes.write("RIFF"); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(48000, 24); bytes.writeUInt32LE(96000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(9600, 40);
  if (!silent) for (let index = 0; index < 4800; index++) bytes.writeInt16LE(Math.round(2000 * Math.sin(index / 20)), 44 + index * 2);
  return bytes;
}
test("valid PCM audio has measurable duration and energy", () => {
  const signal = inspectPronunciationWav(wav());
  expect(signal.duration).toBe(0.1);
  expect(signal.rms).toBeGreaterThan(0.01);
  expect(signal.sha256).toMatch(/^[0-9a-f]{64}$/);
});
test("silent, malformed, truncated and wrong-format files cannot be published", () => {
  expect(() => inspectPronunciationWav(wav(true))).toThrow(/silent/);
  expect(() => inspectPronunciationWav(Buffer.from("not audio"))).toThrow(/header/);
  expect(() => inspectPronunciationWav(wav().subarray(0, 50))).toThrow(/Truncated/);
  const wrong = wav(); wrong.writeUInt32LE(16000, 24);
  expect(() => inspectPronunciationWav(wrong)).toThrow(/48kHz/);
});
