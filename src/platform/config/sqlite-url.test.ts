import { describe, expect, it } from "vitest";
import { assertLocalSqliteUrl } from "./sqlite-url";

describe("SQLite database URL", () => {
  it.each([
    "file:./storage/app.db",
    "file:/srv/app/shared/database/app.db",
    "file:D:/apps/restaurant/app.db",
  ])("accepts a persistent local file URL: %s", (databaseUrl) => {
    expect(() => assertLocalSqliteUrl(databaseUrl)).not.toThrow();
  });

  it.each([
    "postgresql://localhost/app",
    "libsql://remote.example/app",
    "file:",
    "file::memory:",
    "file:./app.db?mode=memory",
    "file:./app.db#fragment",
  ])("rejects a non-persistent SQLite URL: %s", (databaseUrl) => {
    expect(() => assertLocalSqliteUrl(databaseUrl)).toThrow();
  });
});
