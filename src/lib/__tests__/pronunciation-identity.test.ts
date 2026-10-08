/** @jest-environment node */
import { pronunciationKey, type PronunciationIdentity } from "../pronunciation-identity";

const identity: PronunciationIdentity = {
  spokenText: "kâr", model: "canberkkkkkk/ema-lightning", modelRevision: "revision-a", packageVersion: "1.0.1",
  settings: { seed: 0, speed: 1, device: "cpu", sampleRate: 48000, pipeline: 1 },
};
test("identical speech/settings reuse a filesystem-safe key", () => {
  expect(pronunciationKey(identity)).toMatch(/^[a-f0-9]{64}$/);
  expect(pronunciationKey({ ...identity })).toBe(pronunciationKey(identity));
});
test("Turkish case, diacritics, phrases and model settings remain distinct", () => {
  const texts = ["I", "İ", "ı", "i", "kar", "kâr", "hâl", "hal", "göz", "goz", "a b", "ab"];
  expect(new Set(texts.map(spokenText => pronunciationKey({ ...identity, spokenText }))).size).toBe(texts.length);
  expect(pronunciationKey({ ...identity, modelRevision: "revision-b" })).not.toBe(pronunciationKey(identity));
  expect(pronunciationKey({ ...identity, settings: { ...identity.settings, seed: 1 } })).not.toBe(pronunciationKey(identity));
  expect(pronunciationKey({ ...identity, settings: { ...identity.settings, speed: 1.1 } })).not.toBe(pronunciationKey(identity));
});
