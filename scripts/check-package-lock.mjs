import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const lockRoot = packageLock.packages?.[""];
const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

if (!lockRoot) {
  fail(["package-lock.json is missing the root packages[\"\"] entry."]);
}

const errors = [];

for (const section of dependencySections) {
  const packageDeps = packageJson[section] ?? {};
  const lockDeps = lockRoot[section] ?? {};

  for (const [name, version] of Object.entries(packageDeps)) {
    if (lockDeps[name] !== version) {
      errors.push(
        `${section}.${name} is ${version} in package.json but ${lockDeps[name] ?? "missing"} in package-lock.json`,
      );
    }
  }

  for (const [name, version] of Object.entries(lockDeps)) {
    if (packageDeps[name] !== version) {
      errors.push(
        `${section}.${name} is ${version} in package-lock.json but ${packageDeps[name] ?? "missing"} in package.json`,
      );
    }
  }
}

if (errors.length > 0) {
  fail([
    "package-lock.json is out of sync with package.json.",
    "",
    ...errors.map((error) => `- ${error}`),
    "",
    "Run: npm install --package-lock-only --legacy-peer-deps",
  ]);
}

console.log("package-lock.json root dependencies match package.json.");

function fail(lines) {
  console.error(lines.join("\n"));
  process.exit(1);
}
