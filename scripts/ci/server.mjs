import { spawn } from "node:child_process";
import { cpSync, createWriteStream, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { ciEnvironment } from "./env.mjs";

// Mirror the image's standalone runtime, including its static files.
for (const [source, target] of [
  ["public", ".next/standalone/public"],
  ["messages", ".next/standalone/messages"],
  ["src/assets", ".next/standalone/src/assets"],
  ["src/app/icon.svg", ".next/standalone/src/app/icon.svg"],
  [".next/static", ".next/standalone/.next/static"],
]) cpSync(source, target, { recursive: true });

// Upstash is an external boundary, not the subject of these browser smoke tests.
// Accept only the sliding-window EVAL/EVALSHA protocol; unexpected commands fail.
const redisFixture = createServer(async (request, response) => {
  if (request.method !== "POST" || request.headers.authorization !== "Bearer ci-upstash-token") {
    response.writeHead(401).end();
    return;
  }
  let body = "";
  for await (const chunk of request) body += chunk;
  try {
    const input = JSON.parse(body);
    const pipeline = request.url === "/pipeline";
    const commands = pipeline ? input : [input];
    if (!commands.every(command => ["eval", "evalsha"].includes(String(command[0]).toLowerCase()))) {
      throw new Error("Unexpected Upstash fixture command");
    }
    const results = commands.map(() => ({ result: 1 }));
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(pipeline ? results : results[0]));
  } catch {
    response.writeHead(400, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Unsupported CI Upstash request" }));
  }
});
redisFixture.listen(8179, "127.0.0.1");
mkdirSync("test-results", { recursive: true });
const log = createWriteStream("test-results/server.log");
const app = spawn("node", ["server.js"], {
  cwd: ".next/standalone",
  env: { ...ciEnvironment(), HOSTNAME: "127.0.0.1", PORT: "3100" },
  stdio: ["ignore", "pipe", "pipe"],
});
app.stdout.pipe(log, { end: false });
app.stderr.pipe(log, { end: false });
app.stdout.pipe(process.stdout);
app.stderr.pipe(process.stderr);
const stop = () => { app.kill("SIGTERM"); redisFixture.close(); };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
app.on("error", error => { console.error(error); stop(); process.exitCode = 1; });
app.on("exit", code => { redisFixture.close(); log.end(); process.exitCode = code ?? 1; });
