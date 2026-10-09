// Local test adapter: runs the real Upstash SDK Lua commands against disposable Valkey.
// Run with bun; bind loopback only. Never point this adapter at a production backend.
const redis = new Bun.RedisClient('redis://127.0.0.1:6391');
await redis.connect();
const latencyMs = Number(process.env.PERF_LIMITER_LATENCY_MS ?? 50);
const token = 'query-performance-local-only';
const encode = (value) => Array.isArray(value) ? value.map(encode) : typeof value === 'string' ? Buffer.from(value).toString('base64') : value;
async function execute(command, base64) {
  try {
    const result = await redis.send(String(command[0]), command.slice(1).map(String));
    return { result: base64 ? encode(result) : result };
  } catch (error) {
    return { error: error.message };
  }
}
const server = Bun.serve({
  hostname: '127.0.0.1', port: 8788,
  async fetch(request) {
    if (request.headers.get('authorization') !== `Bearer ${token}`) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const commands = await request.json();
    const base64 = request.headers.get('upstash-encoding') === 'base64';
    const result = Array.isArray(commands[0]) ? await Promise.all(commands.map((command) => execute(command, base64))) : await execute(commands, base64);
    if (latencyMs > 0) await Bun.sleep(latencyMs);
    return Response.json(result);
  },
});
console.log(`Local Upstash/Valkey adapter: ${server.url}; simulated HTTP latency ${latencyMs}ms`);
