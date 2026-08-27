import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:3100", ...devices["Desktop Chrome"] },
  webServer: { command: "bun run dev -- -p 3100", url: "http://127.0.0.1:3100", reuseExistingServer: true, timeout: 120_000 },
});
