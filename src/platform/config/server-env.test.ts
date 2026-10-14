import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./server-env";

describe("server environment", () => {
  it("validates required secrets and applies local defaults", () => {
    const env = parseServerEnv({
      DATABASE_URL: "file:./storage/app.db",
      JWT_SECRET: "x".repeat(32),
    });
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.STORAGE_ROOT).toBe("./storage");
    expect(env.TRUST_PROXY).toBe(false);
  });

  it("rejects short signing secrets", () => {
    expect(() =>
      parseServerEnv({ DATABASE_URL: "file:./storage/app.db", JWT_SECRET: "short" }),
    ).toThrow();
  });

  it("rejects non-SQLite database URLs", () => {
    expect(() =>
      parseServerEnv({ DATABASE_URL: "postgresql://localhost/app", JWT_SECRET: "x".repeat(32) }),
    ).toThrow(/SQLite/);
  });

  it("validates SUPER_ADMIN_PASSWORD minimum length of 8 characters", () => {
    const valid = parseServerEnv({
      DATABASE_URL: "file:./storage/app.db",
      JWT_SECRET: "x".repeat(32),
      SUPER_ADMIN_PASSWORD: "12345678",
    });
    expect(valid.SUPER_ADMIN_PASSWORD).toBe("12345678");

    expect(() =>
      parseServerEnv({
        DATABASE_URL: "file:./storage/app.db",
        JWT_SECRET: "x".repeat(32),
        SUPER_ADMIN_PASSWORD: "1234567",
      }),
    ).toThrow();
  });
});
