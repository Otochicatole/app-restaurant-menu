import { spawn } from "node:child_process";
import { backupSqliteDatabase } from "./sqlite-backup";
import { assertSchemaHardeningPreflight } from "./schema-hardening-preflight";
import { configureSqliteWal } from "./configure-sqlite-wal";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria.");
await assertSchemaHardeningPreflight(databaseUrl);
await run(["run", "scripts/cutover-organizations.ts", "--preflight"]);
const backup = await backupSqliteDatabase(databaseUrl);
if (backup) console.log(`Backup SQLite consistente creado: ${backup}`);
await run(["x", "prisma", "migrate", "dev", ...process.argv.slice(2)]);
await run(["run", "scripts/cutover-organizations.ts"]);
await configureSqliteWal(databaseUrl);

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env: process.env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Falló bun ${args.join(" ")} (${code ?? "signal"})`)));
  });
}
