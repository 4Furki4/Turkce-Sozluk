import { defineConfig, devices } from "@playwright/test";
import { ciEnvironment } from "./scripts/ci/env.mjs";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  failOnFlakyTests: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  repeatEach: process.env.CI ? 3 : 1,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: "test-results/artifacts",
  reporter: [["list"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/browser.xml" }]],
  use: {
    baseURL: "http://localhost:3100",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "bun scripts/ci/server.mjs",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 60_000,
    env: ciEnvironment(),
    stdout: "pipe",
    stderr: "pipe",
  },
});
