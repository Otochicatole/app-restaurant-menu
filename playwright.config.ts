import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { requireDisposableTestDatabase } from "./scripts/require-test-database";

const testDatabase = requireDisposableTestDatabase();
const storageRoot = path.resolve(process.env.PLAYWRIGHT_STORAGE_ROOT ?? path.join("test-results", "e2e-storage"));
const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "bun run scripts/require-test-database.ts --prepare && bun run build:e2e && bun run start:e2e",
    env: {
      ...process.env,
      APP_URL: baseURL,
      DATABASE_URL: testDatabase.connectionString,
      TEST_DATABASE_URL: testDatabase.connectionString,
      JWT_SECRET: process.env.JWT_SECRET ?? "playwright-only-secret-with-more-than-thirty-two-characters",
      STORAGE_ROOT: storageRoot,
    },
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
