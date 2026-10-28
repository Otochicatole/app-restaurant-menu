import { randomUUID } from "node:crypto";
import { chmod, stat } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { assertLocalSqliteUrl } from "../src/platform/config/sqlite-url";

/** VACUUM INTO includes committed WAL data and leaves the source database unchanged. */
export async function backupSqliteDatabase(databaseUrl: string): Promise<string | null> {
  assertLocalSqliteUrl(databaseUrl);
  const databasePath = path.resolve(databaseUrl.trim().slice("file:".length));
  const existing = await stat(databasePath).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  });
  if (!existing) return null;
  if (!existing.isFile()) throw new Error(`La base SQLite no es un archivo: ${databasePath}`);
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const destination = `${databasePath}.pre-organization-cutover-${timestamp}-${randomUUID()}.db`;
  const source = createClient({ url: databaseUrl.trim() });
  try {
    await source.execute("PRAGMA busy_timeout=5000");
    await source.execute("PRAGMA synchronous=FULL");
    await source.execute({ sql: "VACUUM main INTO ?", args: [destination] });
  } catch (error) {
    throw new Error(`No se pudo crear el backup SQLite consistente en ${destination}. No se inició la migración.`, { cause: error });
  } finally {
    source.close();
  }
  await chmod(destination, 0o600);
  const backup = createClient({ url: `file:${destination.replaceAll("\\", "/")}` });
  try {
    await backup.execute("PRAGMA query_only=ON");
    const integrity = await backup.execute("PRAGMA integrity_check");
    const references = await backup.execute("PRAGMA foreign_key_check");
    if (integrity.rows.length !== 1 || Object.values(integrity.rows[0])[0] !== "ok" || references.rows.length) {
      throw new Error(`El backup ${destination} no superó la validación SQLite. No se inició la migración.`);
    }
  } finally {
    backup.close();
  }
  return destination;
}
