/** @jest-environment node */
import { gunzipSync } from "node:zlib";
import { getAutocompletePayload } from "../autocomplete-payload";

test("coalesces bulk encoding and preserves Turkish names through compression", async () => {
  const words = ["kitap", "I", "İ", "ı", "i", "ağaç", "göz"];
  const fills = Array.from({ length: 1_000 }, () => getAutocompletePayload(words));
  expect(new Set(fills).size).toBe(1);
  const payload = await fills[0];
  expect(JSON.parse(gunzipSync(payload.gzip).toString())).toEqual(words);
  expect(JSON.parse(payload.json)).toEqual(words);
  expect(await getAutocompletePayload(["başka"])).not.toBe(payload);
});
