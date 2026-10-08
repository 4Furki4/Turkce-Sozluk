import { gzip } from "node:zlib";
import { promisify } from "node:util";

const compress = promisify(gzip);
const payloads = new WeakMap<string[], Promise<{ json: string; gzip: Buffer }>>();

/** Encode once per dictionary-cache fill, without keeping expired word lists alive. */
export function getAutocompletePayload(words: string[]) {
  let payload = payloads.get(words);
  if (!payload) {
    payload = Promise.resolve().then(async () => {
      const json = JSON.stringify(words);
      return { json, gzip: await compress(json) };
    });
    payloads.set(words, payload);
    void payload.catch(() => payloads.delete(words));
  }
  return payload;
}
