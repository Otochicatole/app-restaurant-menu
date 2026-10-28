import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { assertLocalSqliteUrl } from "../src/platform/config/sqlite-url";

/** Run during database preparation, before reopening application traffic. */
export async function configureSqliteWal(databaseUrl: string): Promise<void> {
  assertLocalSqliteUrl(databaseUrl);
  const file = await stat(path.resolve(databaseUrl.trim().slice("file:".length)));
  if (!file.isFile()) throw new Error("SQLite debe existir antes de configurar WAL.");
  const database = createClient({ url: databaseUrl.trim(), timeout: 5_000 });
  try {
    const result = await database.execute("PRAGMA journal_mode=WAL");
    if (String(result.rows[0]?.journal_mode).toLowerCase() !== "wal") {
      throw new Error("SQLite no pudo activar WAL. Verificá el volumen local y los permisos de escritura.");
    }
  } finally {
    database.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria.");
  await configureSqliteWal(databaseUrl);
}
