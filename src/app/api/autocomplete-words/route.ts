import { TRPCError } from "@trpc/server";
import { createCaller } from "@/src/server/api/root";
import { createTRPCContext } from "@/src/server/api/trpc";
import { getAutocompletePayload } from "@/src/server/autocomplete-payload";

export const runtime = "nodejs";

/** Bulk PWA dictionary delivery; the canonical tRPC read still enforces its middleware. */
export async function GET(request: Request) {
  try {
    const caller = createCaller(await createTRPCContext({ headers: request.headers }));
    const snapshot = await caller.word.getAutocompleteSnapshot();
    const payload = await getAutocompletePayload(snapshot.words);
    const acceptsGzip = (request.headers.get("accept-encoding") ?? "").split(",").some((entry) => {
      const [encoding, quality] = entry.trim().split(";");
      return encoding === "gzip" && (!quality || Number(quality.trim().replace(/^q=/, "")) > 0);
    });
    return new Response(acceptsGzip ? new Uint8Array(payload.gzip) : payload.json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Vary": "Accept-Encoding",
        "X-Autocomplete-Version": snapshot.version,
        ...(acceptsGzip ? { "Content-Encoding": "gzip" } : {}),
      },
    });
  } catch (error) {
    const status = error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS" ? 429 : 503;
    return Response.json({ error: "Autocomplete unavailable" }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
