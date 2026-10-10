import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import postgres from "postgres";

const root = fileURLToPath(new URL("../", import.meta.url));
const host = process.env.PI_SSH_HOST || "furkipie";
const port = process.env.PI_DB_LOCAL_PORT || "15432";
const container = "turkish-dictionary-db-development";
const sshOptions = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10"];
let tunnel;
let app;
let stopping = false;

async function stopChild(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  // Next.js can spawn build workers; stop the entire group as well as SSH.
  const kill = signal => {
    try { process.kill(-child.pid, signal); } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  kill("SIGTERM");
  const timeout = setTimeout(() => kill("SIGKILL"), 5000);
  try { await exited; } finally { clearTimeout(timeout); }
}

async function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  await Promise.all([stopChild(app), stopChild(tunnel)]);
}

process.on("SIGINT", () => void stop(130));
process.on("SIGTERM", () => void stop(143));

async function requireFreePort() {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", () => reject(new Error(
      `Local port ${port} is in use. Close its tunnel or set PI_DB_LOCAL_PORT to another port.`,
    )));
    listener.listen(Number(port), "127.0.0.1", resolve);
  });
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
}

function developmentDatabase() {
  let output;
  try {
    // Capture metadata privately: the container's environment includes its password.
    output = execFileSync("ssh", [...sshOptions, "--", host,
      `sudo -n docker inspect --format '{{json .NetworkSettings.Networks}}\n{{json .Config.Env}}' ${container}`,
    ], { encoding: "utf8", timeout: 20000, stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    throw new Error(`Cannot inspect ${container} on ${host}. Check SSH access and sudo -n docker permissions.`);
  }
  try {
    const [networks, variables] = output.trim().split("\n").map(line => JSON.parse(line));
    const ip = Object.values(networks).map(network => network.IPAddress).find(Boolean);
    const values = Object.fromEntries(variables.map(variable => {
      const equals = variable.indexOf("=");
      return [variable.slice(0, equals), variable.slice(equals + 1)];
    }));
    const user = values.POSTGRES_USER || "postgres";
    const database = values.POSTGRES_DB || user;
    const password = values.POSTGRES_PASSWORD;
    if (!ip || !password) throw new Error();
    return { ip, user, database, password };
  } catch {
    throw new Error("The Pi development container has no usable network address or PostgreSQL credentials.");
  }
}

async function waitForDatabase(url, database) {
  // A listening SSH port alone does not prove PostgreSQL is reachable.
  for (let attempt = 0; attempt < 30 && !stopping; attempt++) {
    const client = postgres(url, { max: 1, connect_timeout: 1, onnotice: () => {} });
    try {
      const rows = await client`SELECT current_database() AS name`;
      if (rows[0].name === database && !stopping) return;
    } catch {
      // Retry while SSH establishes the forward. Never log connection credentials.
    } finally {
      await client.end({ timeout: 1 });
    }
    await delay(250);
  }
  if (!stopping) throw new Error("Cannot connect to the Pi development database through the SSH tunnel.");
}

function runScript(name, args, environment) {
  return new Promise((resolve, reject) => {
    app = spawn("bun", ["run", name, ...args], {
      cwd: root, env: environment, stdio: "inherit", detached: true,
    });
    app.once("error", () => reject(new Error(`Could not run bun ${name}. Check Bun and dependencies are installed.`)));
    app.once("exit", (code, signal) => resolve(code ?? (signal === "SIGINT" ? 130 : 1)));
  });
}

async function main() {
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error("PI_DB_LOCAL_PORT must be a port between 1 and 65535.");
  }
  await requireFreePort();
  const { ip, user, database, password } = developmentDatabase();
  if (stopping) return;
  const url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}?sslmode=disable`;
  const environment = {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: url,
    DATABASE_HOST: "127.0.0.1",
    DATABASE_PORT: port,
    DATABASE_USERNAME: user,
    DATABASE_PASSWORD: password,
    DATABASE_DATABASE: database,
    DATABASE_SSLMODE: "disable",
    DATABASE_SSL_CA: "",
  };
  tunnel = spawn("ssh", [...sshOptions,
    "-o", "ExitOnForwardFailure=yes",
    "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3",
    "-N", "-L", `127.0.0.1:${port}:${ip}:5432`, "--", host,
  ], { stdio: ["ignore", "ignore", "inherit"], detached: true });
  tunnel.once("error", () => {
    console.error("Could not start the SSH tunnel. Check that ssh is installed.");
    void stop(1);
  });
  tunnel.once("exit", () => {
    if (!stopping) {
      console.error("The Pi development SSH tunnel closed; stopping the app.");
      void stop(1);
    }
  });
  await waitForDatabase(url, database);
  if (stopping) return;
  console.log(`Pi development database connected through ${host} at 127.0.0.1:${port}.`);
  if (process.argv.includes("--check")) return stop(0);
  const buildCode = await runScript("build", [], environment);
  if (stopping) return;
  if (buildCode !== 0) return stop(buildCode);
  const startCode = await runScript("start", process.argv.slice(2), environment);
  await stop(startCode);
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  await stop(1);
}
