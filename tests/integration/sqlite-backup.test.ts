import { mkdir, mkdtemp, stat } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { describe, expect, it } from "vitest";
import { backupSqliteDatabase } from "../../scripts/sqlite-backup";
import { configureSqliteWal } from "../../scripts/configure-sqlite-wal";

describe("consistent SQLite cutover backup", () => {
  it("persists WAL during local preparation without changing existing rows", async () => {
    const artifacts = path.resolve("test-results");
    await mkdir(artifacts, { recursive: true });
    const directory = await mkdtemp(path.join(artifacts, "sqlite-wal-test-"));
    const sourcePath = path.join(directory, "prepared.db");
    const url = `file:${sourcePath.replaceAll("\\", "/")}`;
    const writer = createClient({ url });
    try {
      await writer.executeMultiple("CREATE TABLE Fixture(id INTEGER PRIMARY KEY); INSERT INTO Fixture VALUES(1);");
      writer.close();
      await configureSqliteWal(url);
      const reader = createClient({ url });
      try {
        expect((await reader.execute("PRAGMA journal_mode")).rows[0].journal_mode).toBe("wal");
        expect((await reader.execute("SELECT COUNT(*) AS count FROM Fixture")).rows[0].count).toBe(1);
        expect((await reader.execute("PRAGMA foreign_keys")).rows[0].foreign_keys).toBe(1);
      } finally { reader.close(); }
    } finally {
      writer.close();
    }
  }, 15_000);

  it("includes committed WAL writes with the writer connected and preserves the live source", async () => {
    const artifacts = path.resolve("test-results");
    await mkdir(artifacts, { recursive: true });
    const directory = await mkdtemp(path.join(artifacts, "sqlite-backup-test-"));
    const sourcePath = path.join(directory, "source with 'quote.db");
    const url = `file:${sourcePath.replaceAll("\\", "/")}`;
    const writer = createClient({ url });
    try {
      await writer.executeMultiple("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE Fixture(id INTEGER PRIMARY KEY,value TEXT); INSERT INTO Fixture VALUES(1,'committed');");
      const destination = await backupSqliteDatabase(url);
      expect(destination).not.toBeNull();
      await writer.execute("INSERT INTO Fixture VALUES(2,'written after snapshot')");
      const backup = createClient({ url: `file:${destination!.replaceAll("\\", "/")}` });
      try {
        expect((await backup.execute("SELECT * FROM Fixture")).rows.map((row) => row.value)).toEqual(["committed"]);
        expect((await backup.execute("PRAGMA integrity_check")).rows[0].integrity_check).toBe("ok");
      } finally { backup.close(); }
      expect((await writer.execute("SELECT COUNT(*) AS count FROM Fixture")).rows[0].count).toBe(2);
      expect((await stat(sourcePath)).isFile()).toBe(true);
      const second = await backupSqliteDatabase(url);
      expect(second).not.toBe(destination);
    } finally {
      writer.close();
      // Retain the disposable artifacts: native Windows handles may outlive close().
    }
  }, 15_000);
});
