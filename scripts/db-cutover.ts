import { copyFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@libsql/client";
import { assertLocalSqliteUrl } from "../src/platform/config/sqlite-url";
import { canvasDocumentSchema } from "../src/modules/menu-editor/contracts";
import { validateCanvasDocument } from "../src/modules/menu-editor/domain/document-policy";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria.");
assertLocalSqliteUrl(databaseUrl);

const databasePath = sqlitePath(databaseUrl);
const backupPath = `${databasePath}.pre-canvas-cutover-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.bak`;
if (await exists(databasePath)) {
  const checkpoint = createClient({ url: databaseUrl.trim() });
  try { await checkpoint.execute("PRAGMA wal_checkpoint(TRUNCATE)"); }
  finally { checkpoint.close(); }
  await copyFile(databasePath, backupPath);
  console.log(`Backup creado: ${backupPath}`);
}

await run(process.execPath, ["run", "scripts/cutover-menu-editor.ts"]);
await run(process.execPath, ["x", "prisma", "migrate", "deploy"]);
await run(process.execPath, ["x", "prisma", "generate"]);

const client = createClient({ url: databaseUrl.trim() });
try {
  const legacy = await client.execute(`SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('Group', 'Product', 'FeaturedProduct', 'HomePage', 'Font', 'Setting')`);
  if (legacy.rows.length) throw new Error(`La migración no eliminó todas las tablas legacy: ${legacy.rows.map((row) => String(row.name)).join(", ")}`);
  const required = await client.execute(`SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('Admin', 'Tenant', 'Session', 'LoginThrottle', 'AssetCleanupJob', 'MenuProject', 'MenuAsset', 'MenuAssetReference')`);
  if (required.rows.length !== 8) throw new Error("Faltan tablas del modelo Canvas después de la migración.");
  const projects = await client.execute(`SELECT tenantId, publishedJson FROM MenuProject`);
  for (const row of projects.rows) {
    const project = await client.execute({ sql: "SELECT draftJson FROM MenuProject WHERE tenantId = ?", args: [row.tenantId] });
    const draftJson = project.rows[0]?.draftJson;
    if (!draftJson) throw new Error(`El tenant ${String(row.tenantId)} no tiene un borrador Canvas.`);
    validateCanvasDocument(canvasDocumentSchema.parse(JSON.parse(String(draftJson))));
    if (row.publishedJson) validateCanvasDocument(canvasDocumentSchema.parse(JSON.parse(String(row.publishedJson))));
  }
  const missing = await client.execute(`SELECT r.projectId, r.assetId FROM MenuAssetReference r LEFT JOIN MenuAsset a ON a.id = r.assetId AND a.tenantId = r.tenantId WHERE a.id IS NULL`);
  if (missing.rows.length) throw new Error("Hay referencias Canvas a assets inexistentes.");
} finally {
  client.close();
}

console.log("Cutover finalizado: esquema Canvas activo y tablas legacy eliminadas.");

function sqlitePath(value: string): string {
  const raw = value.trim().replace(/^file:/, "").split("?")[0];
  return path.resolve(raw);
}

async function exists(file: string): Promise<boolean> {
  try { await stat(file); return true; } catch { return false; }
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env: process.env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Falló ${command} ${args.join(" ")} (${code ?? "signal"})`)));
  });
}
