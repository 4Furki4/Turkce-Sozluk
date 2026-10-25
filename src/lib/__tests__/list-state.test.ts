import { parseListState } from "../list-state";
const defaults = {
  page: 1,
  size: 20,
  filters: {
    types: [] as string[],
    searchTerm: "",
    startDate: null as string | null,
  },
};
it("keeps valid nested list context without accepting extra properties", () => {
  expect(
    parseListState(
      JSON.stringify({
        page: 2,
        filters: { types: ["bug"], searchTerm: "öneri" },
        extra: "ignored",
      }),
      defaults,
    ),
  ).toEqual({
    ...defaults,
    page: 2,
    filters: { ...defaults.filters, types: ["bug"], searchTerm: "öneri" },
  });
});
it.each([
  "broken",
  "null",
  "[]",
  '{"page":0,"size":"10","filters":null}',
  '{"page":-1,"filters":{"types":[null],"searchTerm":{},"startDate":"invalid"}}',
])("recovers malformed list state %s", (raw) => {
  expect(parseListState(raw, defaults)).toEqual(defaults);
});
