import { readRequestListParams, updateRequestListParams } from "../request-list-params";
import { parseRequestPayload, requestDate, requestErrorKey } from "../request-presentation";
import { UserRequestListInputSchema } from "@/src/server/api/schemas/requests";

describe("request list URL state", () => {
  it.each(["-1", "0", "1.5", "Infinity", "2147483648", "oops"])("normalizes invalid page %s before querying", page => {
    expect(readRequestListParams(new URLSearchParams({ page, per_page: "999", status: "unknown" }))).toEqual({ page: 1, limit: 10, entityType: "all", action: "all", status: "all" });
  });
  it("keeps valid filters and resets page atomically when a filter changes", () => {
    const query = updateRequestListParams("page=8&per_page=20&status=approved&data=worst", { status: "pending" });
    const params = new URLSearchParams(query);
    expect(readRequestListParams(params)).toMatchObject({ page: 1, limit: 20, status: "pending" });
    expect(params.get("data")).toBe("worst");
  });
  it("restores the earlier state when browser Back supplies the earlier URL", () => {
    const earlier = "page=3&per_page=5&entityType=authors&status=approved";
    const next = updateRequestListParams(earlier, { entityType: "words", status: "all" });
    expect(readRequestListParams(new URLSearchParams(next))).toMatchObject({ page: 1, entityType: "words", status: "all" });
    expect(readRequestListParams(new URLSearchParams(earlier))).toMatchObject({ page: 3, limit: 5, entityType: "authors", status: "approved" });
  });
  it("bounds API pagination independently of the browser", () => {
    expect(UserRequestListInputSchema.parse({})).toEqual({ page: 1, limit: 10 });
    for (const input of [{ page: -1 }, { page: 1.5 }, { page: 2147483648 }, { limit: 0 }, { limit: 51 }, { limit: 2.5 }]) {
      expect(UserRequestListInputSchema.safeParse(input).success).toBe(false);
    }
  });
});

describe("saved request data and dates", () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date("2026-10-10T12:00:00Z")); });
  afterEach(() => jest.useRealTimers());
  it("formats Turkish and English relative dates, including future timestamps", () => {
    expect(requestDate("2026-10-08T12:00:00Z", "tr")?.relative).toBe("2 gün önce");
    expect(requestDate("2026-10-08T12:00:00Z", "en")?.relative).toBe("2 days ago");
    expect(requestDate("2026-10-12T12:00:00Z", "tr")?.relative).toBe("2 gün sonra");
    expect(requestDate("not a date", "tr")).toBeNull();
    expect(requestDate(null, "en")).toBeNull();
  });
  it("reads object payloads and legacy serialized JSON without swallowing malformed data", () => {
    const data = { name: "Jo", phonetic: null };
    expect(parseRequestPayload(data)).toBe(data);
    expect(parseRequestPayload(JSON.stringify(data))).toEqual(data);
    for (const value of [null, [], "{historical incomplete JSON", "false", "null", "[]", 123]) expect(parseRequestPayload(value)).toBeNull();
  });
  it("separates session, permission, rate-limit, and network recovery messages", () => {
    expect(requestErrorKey("UNAUTHORIZED", "errorLoading")).toBe("messages.sessionExpired");
    expect(requestErrorKey("FORBIDDEN", "errorLoadingDetail")).toBe("messages.permissionDenied");
    expect(requestErrorKey("TOO_MANY_REQUESTS", "messages.cancelFailed")).toBe("messages.rateLimited");
    expect(requestErrorKey("INTERNAL_SERVER_ERROR", "errorLoadingDetail")).toBe("errorLoadingDetail");
  });
});
