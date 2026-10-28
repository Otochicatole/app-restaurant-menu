import { spawn } from "node:child_process";
import { createClient } from "@libsql/client";
import { assertLocalSqliteUrl } from "../src/platform/config/sqlite-url";
import { canvasDocumentSchema } from "../src/modules/menu-editor/contracts";
import { validateCanvasDocument } from "../src/modules/menu-editor/domain/document-policy";
import { backupSqliteDatabase } from "./sqlite-backup";
import { assertSchemaHardeningPreflight } from "./schema-hardening-preflight";
import { configureSqliteWal } from "./configure-sqlite-wal";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria.");
assertLocalSqliteUrl(databaseUrl);

await assertSchemaHardeningPreflight(databaseUrl);
await run(process.execPath, ["run", "scripts/cutover-organizations.ts", "--preflight"]);
const backupPath = await backupSqliteDatabase(databaseUrl);
if (backupPath) console.log(`Backup SQLite consistente creado: ${backupPath}`);

await run(process.execPath, ["run", "scripts/cutover-menu-editor.ts"]);
await run(process.execPath, ["run", "scripts/cutover-organizations.ts", "--preflight"]);
await run(process.execPath, ["x", "prisma", "migrate", "deploy"]);
await run(process.execPath, ["run", "scripts/cutover-organizations.ts"]);
await configureSqliteWal(databaseUrl);
await run(process.execPath, ["x", "prisma", "generate"]);

const client = createClient({ url: databaseUrl.trim() });
try {
  const legacy = await client.execute(`SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('Group', 'Product', 'FeaturedProduct', 'HomePage', 'Font', 'Setting')`);
  if (legacy.rows.length) throw new Error(`La migración no eliminó todas las tablas legacy: ${legacy.rows.map((row) => String(row.name)).join(", ")}`);
  const required = await client.execute(`SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('Admin', 'Organization', 'Restaurant', 'Session', 'LoginThrottle', 'AssetCleanupJob', 'MenuProject', 'MenuAsset', 'MenuAssetReference', 'MenuTemplate', 'MenuTemplateAsset', 'MenuTemplateAssetReference')`);
  if (required.rows.length !== 12) throw new Error("Faltan tablas del modelo Canvas o plantillas después de la migración.");
  const projects = await client.execute(`SELECT restaurantId, publishedJson FROM MenuProject`);
  for (const row of projects.rows) {
    const project = await client.execute({ sql: "SELECT draftJson FROM MenuProject WHERE restaurantId = ?", args: [row.restaurantId] });
    const draftJson = project.rows[0]?.draftJson;
    if (!draftJson) throw new Error(`El restaurante ${String(row.restaurantId)} no tiene un borrador Canvas.`);
    validateCanvasDocument(canvasDocumentSchema.parse(JSON.parse(String(draftJson))));
    if (row.publishedJson) validateCanvasDocument(canvasDocumentSchema.parse(JSON.parse(String(row.publishedJson))));
  }
  const missing = await client.execute(`SELECT r.projectId, r.assetId FROM MenuAssetReference r LEFT JOIN MenuAsset a ON a.id = r.assetId AND a.restaurantId = r.restaurantId WHERE a.id IS NULL`);
  if (missing.rows.length) throw new Error("Hay referencias Canvas a assets inexistentes.");
  const templates = await client.execute(`SELECT id, documentJson FROM MenuTemplate`);
  for (const row of templates.rows) validateCanvasDocument(canvasDocumentSchema.parse(JSON.parse(String(row.documentJson))));
  const missingTemplateAssets = await client.execute(`SELECT r.templateId, r.assetId FROM MenuTemplateAssetReference r LEFT JOIN MenuAsset a ON a.id = r.assetId AND a.restaurantId = r.restaurantId WHERE a.id IS NULL`);
  if (missingTemplateAssets.rows.length) throw new Error("Hay referencias de plantillas a assets inexistentes.");
} finally {
  client.close();
}

console.log("Cutover finalizado: esquema Canvas activo y tablas legacy eliminadas.");

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env: process.env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Falló ${command} ${args.join(" ")} (${code ?? "signal"})`)));
  });
}
