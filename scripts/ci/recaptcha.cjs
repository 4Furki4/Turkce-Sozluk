// Disposable local QA boundary: never load this in a deployed app.
if (
  process.env.BETTER_AUTH_URL !== "http://localhost:3100" ||
  process.env.DATABASE_URL !==
    "postgresql://postgres:ci-only-password@127.0.0.1:54329/turkish_dictionary_ci?sslmode=disable"
) {
  throw new Error(
    "Captcha QA fixture only supports the disposable loopback CI app",
  );
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const target =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (target === "https://www.google.com/recaptcha/api/siteverify") {
    const body = new URLSearchParams(
      typeof init?.body === "string" ? init.body : "",
    );
    const accepted = body.get("response")?.startsWith("ci-modal-qa-") === true;
    return new Response(
      JSON.stringify({ success: accepted, score: accepted ? 0.99 : 0 }),
      {
        headers: { "content-type": "application/json" },
      },
    );
  }
  return originalFetch(input, init);
};
