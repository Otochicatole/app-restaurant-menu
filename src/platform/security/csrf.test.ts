import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerEnvCacheForTests } from "@/platform/config/server-env";
import { validateOrigin } from "./csrf";

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "file:./test-results/csrf-test.db");
  vi.stubEnv("JWT_SECRET", "x".repeat(32));
  resetServerEnvCacheForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvCacheForTests();
});

describe("validateOrigin", () => {
  it("accepts the configured exact origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://menu.example.com");
    resetAfterProductionStubs();
    const request = new Request("https://menu.example.com/api", {
      headers: { Origin: "https://menu.example.com", Host: "menu.example.com" },
    });
    expect(validateOrigin(request)).toBe(true);
  });

  it("rejects cross-site and sibling-domain requests", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://menu.example.com");
    resetAfterProductionStubs();
    expect(validateOrigin(new Request("https://menu.example.com/api", {
      headers: { Origin: "https://evil.example.com", Host: "menu.example.com" },
    }))).toBe(false);
    expect(validateOrigin(new Request("https://menu.example.com/api", {
      headers: { Origin: "https://menu.example.com", Host: "menu.example.com", "Sec-Fetch-Site": "cross-site" },
    }))).toBe(false);
  });

  it("requires either an Origin or same-origin fetch metadata", () => {
    vi.stubEnv("NODE_ENV", "production");
    resetAfterProductionStubs();
    const hostOnly = new Request("https://menu.example.com/api", { headers: { Host: "menu.example.com" } });
    const browserSameOrigin = new Request("https://menu.example.com/api", {
      headers: { Host: "menu.example.com", "Sec-Fetch-Site": "same-origin" },
    });
    expect(validateOrigin(hostOnly)).toBe(false);
    expect(validateOrigin(browserSameOrigin)).toBe(true);
  });
});

function resetAfterProductionStubs(): void {
  vi.stubEnv("NODE_ENV", "test");
  resetServerEnvCacheForTests();
  vi.stubEnv("NODE_ENV", "production");
}
