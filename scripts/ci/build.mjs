import { spawnSync } from "node:child_process";
import { ciEnvironment } from "./env.mjs";

const result = spawnSync("bun", ["run", "build"], {
  stdio: "inherit",
  env: ciEnvironment(),
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
