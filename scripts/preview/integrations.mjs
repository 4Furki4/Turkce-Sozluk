import { createServer } from "node:http";

// Preview-only Upstash boundary, matching the existing CI fixture. It never
// contacts real Redis, delivers mail, or accepts arbitrary Redis commands.
const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.headers.authorization !== "Bearer " + process.env.PREVIEW_UPSTASH_TOKEN) {
    response.writeHead(401).end();
    return;
  }
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 64_000) { response.writeHead(413).end(); return; }
  }
  try {
    const input = JSON.parse(body);
    const pipeline = request.url === "/pipeline";
    const commands = pipeline ? input : [input];
    if (!Array.isArray(commands) || !commands.every(command => Array.isArray(command) && ["eval", "evalsha"].includes(String(command[0]).toLowerCase()))) {
      throw new Error("Unsupported fixture command");
    }
    const results = commands.map(() => ({ result: 1 }));
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(pipeline ? results : results[0]));
  } catch {
    response.writeHead(400, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Unsupported preview Upstash request" }));
  }
});
server.requestTimeout = 10_000;
server.listen(8179, "0.0.0.0");
process.on("SIGTERM", () => server.close());
