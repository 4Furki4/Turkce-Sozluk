/** @jest-environment node */
jest.mock("@/src/server/api/root", () => ({ createCaller: () => ({ word: { getAutocompleteSnapshot: async () => ({ version: "snapshot-version", words: ["kitap", "İ", "ı"] }) } }) }));
jest.mock("@/src/server/api/trpc", () => ({ createTRPCContext: async () => ({}) }));
import { gunzipSync } from "node:zlib";
import { GET } from "../api/autocomplete-words/route";

test("the compressed download carries the version belonging to its encoded word list", async () => {
  const response = await GET(new Request("http://localhost/api/autocomplete-words", { headers: { "Accept-Encoding": "gzip" } }));
  expect(response.status).toBe(200);
  expect(response.headers.get("X-Autocomplete-Version")).toBe("snapshot-version");
  expect(JSON.parse(gunzipSync(Buffer.from(await response.arrayBuffer())).toString())).toEqual(["kitap", "İ", "ı"]);
});
