import { createHash } from "node:crypto";

export type PronunciationIdentity = {
  spokenText: string;
  model: string;
  modelRevision: string;
  packageVersion: string;
  settings: { seed: number; speed: number; device: string; sampleRate: number; pipeline: number };
};

export function pronunciationKey(identity: PronunciationIdentity) {
  // Never lowercase, strip accents, or apply search normalization here.
  return createHash("sha256").update(JSON.stringify([
    identity.spokenText, identity.model, identity.modelRevision, identity.packageVersion,
    identity.settings.seed, identity.settings.speed, identity.settings.device,
    identity.settings.sampleRate, identity.settings.pipeline,
  ]), "utf8").digest("hex");
}
