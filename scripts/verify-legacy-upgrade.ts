import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@libsql/client";

const root = path.resolve(".");
const migrationsRoot = path.join(root, "prisma", "migrations");
const migrationNames = (await readdir(migrationsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const cutoverName = migrationNames.find((name) => name.includes("canvas_cutover"));
if (!cutoverName) throw new Error("No se encontró la migración canvas_cutover.");
const baseMigrations = migrationNames.filter((name) => name !== cutoverName);
const workspace = await mkdtemp(path.join(tmpdir(), "canvas-cutover-test-"));
const upgradeUrl = `file:${path.join(workspace, "upgrade.db").replaceAll(path.sep, "/")}`;
const freshUrl = `file:${path.join(workspace, "fresh.db").replaceAll(path.sep, "/")}`;
const storageRoot = path.join(workspace, "storage");

try {
  await applyMigrations(upgradeUrl, baseMigrations);
  await seedLegacy(upgradeUrl);
  await runCutover(upgradeUrl, storageRoot);
  await applyMigrations(upgradeUrl, [cutoverName]);
  await verifyUpgrade(upgradeUrl);
  await runCutover(upgradeUrl, storageRoot);
  await verifyUpgrade(upgradeUrl);

  await applyMigrations(freshUrl, migrationNames);
  await verifyFresh(freshUrl);
  console.log("Migración Canvas verificada: upgrade, publicación automática, limpieza legacy y replay idempotente.");
} finally {
  if (!process.env.KEEP_CUTOVER_TEST_WORKSPACE) {
    try { await rm(workspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
    catch { /* SQLite puede mantener el archivo bloqueado unos milisegundos en Windows. */ }
  }
}

async function applyMigrations(database: string, names: string[]): Promise<void> {
  const client = createClient({ url: database });
  try {
    for (const name of names) {
      const sql = await readFile(path.join(migrationsRoot, name, "migration.sql"), "utf8");
      await client.executeMultiple(sql);
    }
  } finally { client.close(); }
}

async function runCutover(database: string, storage: string): Promise<void> {
  await run(process.execPath, ["run", "scripts/cutover-menu-editor.ts"], { DATABASE_URL: database, STORAGE_ROOT: storage });
}

async function seedLegacy(database: string): Promise<void> {
  const client = createClient({ url: database });
  try {
    await client.executeMultiple(`
      INSERT INTO Tenant (id, name, slug, status, createdAt, updatedAt) VALUES ('legacy-tenant', 'Café Legacy', 'cafe-legacy', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      INSERT INTO HomePage (id, tenantId, title, description, createdAt, updatedAt) VALUES ('legacy-home', 'legacy-tenant', 'Café Legacy', 'Menú heredado', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      INSERT INTO "Group" (id, tenantId, name, description, createdAt, updatedAt) VALUES ('legacy-group', 'legacy-tenant', 'Bebidas', 'Calientes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      INSERT INTO Product (id, tenantId, name, description, price, groupId, sortOrder, createdAt, updatedAt) VALUES ('legacy-product', 'legacy-tenant', 'Café', 'Tostado', 4.5, 'legacy-group', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `);
  } finally { client.close(); }
}

async function verifyUpgrade(database: string): Promise<void> {
  const client = createClient({ url: database });
  try {
    const legacy = await client.execute(`SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('Group', 'Product', 'FeaturedProduct', 'HomePage', 'Font', 'Setting')`);
    if (legacy.rows.length) throw new Error(`Persisten tablas legacy: ${legacy.rows.map((row) => String(row.name)).join(", ")}`);
    const project = await client.execute(`SELECT publishedJson FROM MenuProject WHERE tenantId = 'legacy-tenant'`);
    if (!project.rows[0]?.publishedJson) throw new Error("El tenant legacy no quedó publicado.");
    const document = JSON.parse(String(project.rows[0].publishedJson)) as { nodes?: Array<{ text?: string }> };
    if (!document.nodes?.some((node) => node.text === "Café")) throw new Error("No se migró el producto legacy.");
  } finally { client.close(); }
}

async function verifyFresh(database: string): Promise<void> {
  const client = createClient({ url: database });
  try {
    const tables = await client.execute(`SELECT name FROM sqlite_schema WHERE type = 'table'`);
    const names = new Set(tables.rows.map((row) => String(row.name)));
    for (const table of ["Admin", "Tenant", "Session", "LoginThrottle", "AssetCleanupJob", "MenuProject", "MenuAsset", "MenuAssetReference"]) if (!names.has(table)) throw new Error(`Falta la tabla ${table} en instalación limpia.`);
    for (const table of ["Group", "Product", "FeaturedProduct", "HomePage", "Font", "Setting"]) if (names.has(table)) throw new Error(`La instalación limpia contiene ${table}.`);
  } finally { client.close(); }
}

function run(command: string, args: string[], extraEnv: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: { ...process.env, ...extraEnv }, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Falló ${command} ${args.join(" ")} (${code ?? "signal"})`)));
  });
}
