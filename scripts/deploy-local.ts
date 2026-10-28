import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { assertLocalSqliteUrl } from "../src/platform/config/sqlite-url";
import { backupSqliteDatabase } from "./sqlite-backup";
import { assertSchemaHardeningPreflight } from "./schema-hardening-preflight";
import { configureSqliteWal } from "./configure-sqlite-wal";

const projectRoot = process.cwd();
const storageRoot = path.resolve(process.env.STORAGE_ROOT?.trim() || path.join(projectRoot, "storage"));
const configuredDatabase = process.env.DATABASE_URL?.trim();
if (configuredDatabase && !configuredDatabase.startsWith("file:")) {
  throw new Error(
    "DATABASE_URL no es SQLite. Corrige .env antes de continuar para evitar crear una base local distinta por accidente.",
  );
}
const databaseUrl = configuredDatabase || `file:${path.join(storageRoot, "app.db").replaceAll("\\", "/")}`;

assertLocalSqliteUrl(databaseUrl);
process.env.DATABASE_URL = databaseUrl;
process.env.STORAGE_ROOT = storageRoot;

await mkdir(storageRoot, { recursive: true });
const databasePath = databaseUrl.slice("file:".length);
const absoluteDatabasePath = path.isAbsolute(databasePath) ? databasePath : path.resolve(projectRoot, databasePath);
await mkdir(path.dirname(absoluteDatabasePath), { recursive: true });
await assertSchemaHardeningPreflight(databaseUrl);
await run("run", "scripts/cutover-organizations.ts", "--preflight");
const backupPath = await backupSqliteDatabase(databaseUrl);
if (backupPath) console.log(`Backup SQLite consistente creado: ${backupPath}`);
await run("x", "prisma", "generate");
await run("run", "build");
await run("run", "scripts/cutover-menu-editor.ts");
await run("run", "scripts/cutover-organizations.ts", "--preflight");
await run("x", "prisma", "migrate", "deploy");
await run("run", "scripts/cutover-organizations.ts");
await configureSqliteWal(databaseUrl);

if (process.argv.includes("--serve")) await run("run", "start");
else console.log(`Deploy local listo. SQLite: ${databaseUrl}. Servidor: bun run start (puerto 8201).`);

function run(...args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: projectRoot, env: process.env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Falló bun ${args.join(" ")} (${code ?? "signal"})`)));
  });
}
