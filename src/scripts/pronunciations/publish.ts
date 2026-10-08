import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { pronunciationAssets, wordPronunciationAudio } from "@/db/schema/pronunciation_assets";
import { words } from "@/db/schema/words";
import { pronunciationKey } from "@/src/lib/pronunciation-identity";
import { inspectPronunciationWav } from "@/src/lib/pronunciation-wav";
import type { GeneratedAsset } from "./workflow-store";

export function pronunciationStorage() {
  for (const name of ["S3_API_URL", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "NEXT_PUBLIC_R2_CUSTOM_URL"]) {
    if (!process.env[name]) throw new Error(`Missing ${name}`);
  }
  const base = new URL(process.env.NEXT_PUBLIC_R2_CUSTOM_URL!);
  if (base.protocol !== "https:") throw new Error("R2 public media URL must use HTTPS");
  const bucket = process.env.R2_BUCKET_NAME!;
  const endpoint = new URL(process.env.S3_API_URL!);
  // Some existing environment files include the bucket in the API endpoint.
  // The SDK supplies Bucket itself; retaining that path writes an extra key prefix.
  const endpointPath = endpoint.pathname.replace(/\/+$/, "");
  if (endpointPath === `/${bucket}` || endpointPath === `/${encodeURIComponent(bucket)}`) endpoint.pathname = "/";
  else if (endpointPath) throw new Error("S3_API_URL must be the R2 account endpoint, optionally followed by R2_BUCKET_NAME");
  return { base: base.href.replace(/\/$/, ""), bucket, s3: new S3Client({ region: "auto", endpoint: endpoint.href, forcePathStyle: true, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } }) };
}

export async function publishPronunciation(db: typeof import("@/db").db, storage: ReturnType<typeof pronunciationStorage>, asset: GeneratedAsset, path: string, entries: { id: number; name: string }[], assertApproved: () => void) {
  if (pronunciationKey(asset) !== asset.key) throw new Error("Manifest identity/key mismatch");
  const bytes = await readFile(path);
  const signal = inspectPronunciationWav(bytes);
  if (signal.sha256 !== asset.sha256) throw new Error(`Recording changed since review: ${asset.spokenText}`);
  assertApproved();
  const objectKey = `pronunciations/ema/${asset.key}/${asset.sha256}.wav`;
  const audioUrl = `${storage.base}/${objectKey}`;
  let stored = false;
  try {
    const head = await storage.s3.send(new HeadObjectCommand({ Bucket: storage.bucket, Key: objectKey }));
    stored = head.Metadata?.sha256 === asset.sha256 && head.ContentLength === bytes.length;
  } catch (error) { if ((error as { $metadata?: { httpStatusCode: number } }).$metadata?.httpStatusCode !== 404) throw error; }
  if (!stored) await storage.s3.send(new PutObjectCommand({ Bucket: storage.bucket, Key: objectKey, Body: bytes, ContentType: "audio/wav", CacheControl: "public, max-age=31536000, immutable", Metadata: { sha256: asset.sha256 } }));
  assertApproved();
  await db.transaction(async tx => {
    await tx.insert(pronunciationAssets).values({ key: asset.key, spokenText: asset.spokenText, model: asset.model, modelRevision: asset.modelRevision, packageVersion: asset.packageVersion, settings: asset.settings, objectKey, audioUrl, sha256: asset.sha256, duration: signal.duration, rms: signal.rms })
      .onConflictDoUpdate({ target: pronunciationAssets.key, set: { audioUrl, objectKey, sha256: asset.sha256, duration: signal.duration, rms: signal.rms } });
    for (const word of entries) {
      const current = await tx.query.words.findFirst({ where: eq(words.id, word.id), columns: { name: true } });
      if (current?.name !== word.name || word.name !== asset.spokenText) throw new Error(`Entry ${word.id} changed since the snapshot; association aborted`);
      await tx.insert(wordPronunciationAudio).values({ wordId: word.id, assetKey: asset.key, headword: word.name })
        .onConflictDoUpdate({ target: wordPronunciationAudio.wordId, set: { assetKey: asset.key, headword: word.name, updatedAt: new Date() } });
    }
  });
}
