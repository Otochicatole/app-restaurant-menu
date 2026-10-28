import { stat } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { assertLocalSqliteUrl } from "../src/platform/config/sqlite-url";

try {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria para iniciar la aplicación.");
  assertLocalSqliteUrl(databaseUrl);
  const file = await stat(path.resolve(databaseUrl.slice("file:".length))).catch(() => null);
  if (!file?.isFile()) throw new Error("La base SQLite no existe. Ejecutá el despliegue o las migraciones antes de iniciar la aplicación.");
  const database = createClient({ url: databaseUrl });
  try {
    await database.execute("PRAGMA query_only=ON");
    const tables = await database.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name='AppSchemaState'");
    if (!tables.rows.length) throw new Error("La base usa el esquema anterior. Con el servidor detenido, ejecutá bun run db:cutover y después bun run dev.");
    const state = await database.execute("SELECT generation,state FROM AppSchemaState WHERE id='singleton'");
    if (Number(state.rows[0]?.generation) !== 2 || state.rows[0]?.state !== "READY") throw new Error("El cutover de organizaciones está incompleto o la base es incompatible. El servidor permanecerá detenido.");
    const journal = await database.execute("PRAGMA journal_mode");
    if (journal.rows[0]?.journal_mode !== "wal") throw new Error("SQLite debe usar WAL para las escrituras concurrentes. Con el servidor detenido, ejecutá bun run db:cutover antes de iniciar la aplicación.");
  } finally {
    database.close();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "No se pudo comprobar el esquema SQLite.");
  process.exitCode = 1;
}
