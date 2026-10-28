import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@libsql/client";

const root = await mkdtemp(path.join(os.tmpdir(), "schema-guard-test-"));
const oldRelease = path.join(root, "release-1");
const newRelease = path.join(root, "release-2");
const binaries = path.join(root, "bin");
const databasePath = path.join(root, "test.db");
const database = createClient({ url: `file:${databasePath.replaceAll("\\", "/")}` });
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
const guard = path.resolve("scripts/deploy/assert-schema-compatibility.sh");
try {
  await Promise.all([mkdir(oldRelease), mkdir(newRelease), mkdir(binaries)]);
  await writeFile(path.join(newRelease, "app-schema-generation"), "2\n");
  // Exercise the actual shell guard and SQL with a portable sqlite3 CLI adapter.
  await writeFile(path.join(binaries, "sqlite3"), `#!/usr/bin/env bun
import { Database } from "bun:sqlite";
const args=process.argv.slice(2);
const db=new Database(args[1],{readonly:true});
try { for(const row of db.query(args[2]).all()) console.log(Object.values(row).join("|")); }
finally { db.close(); }
`, { mode: 0o755 });
  await database.execute("CREATE TABLE Legacy(id TEXT PRIMARY KEY)");
  await expectGuard(oldRelease, true, "release anterior con base anterior");
  await expectGuard(newRelease, false, "release nuevo con base anterior");
  await expectPortableGuard(false);
  await database.executeMultiple("CREATE TABLE AppSchemaState(id TEXT PRIMARY KEY,generation INTEGER,state TEXT); INSERT INTO AppSchemaState VALUES('singleton',2,'MIGRATING');");
  await expectGuard(oldRelease, false, "release anterior durante cutover");
  await expectGuard(newRelease, false, "release nuevo durante cutover");
  await expectPortableGuard(false);
  await database.execute("UPDATE AppSchemaState SET state='READY'");
  await expectGuard(oldRelease, false, "rollback incompatible");
  await expectGuard(newRelease, true, "release nuevo listo");
  await expectPortableGuard(false);
  await database.execute("PRAGMA journal_mode=WAL");
  await expectPortableGuard(true);
  console.log("Guard de esquema verificado: generaciones anteriores/nuevas y cutover incompleto.");
} finally {
  database.close();
  try { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
  catch (error) {
    if (!(error instanceof Error && "code" in error && ["EBUSY", "EPERM"].includes(String(error.code)))) throw error;
  }
}

async function expectPortableGuard(allowed: boolean) {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["run", "scripts/assert-schema-ready.ts"], { env: { ...process.env, DATABASE_URL: `file:${databasePath.replaceAll("\\", "/")}` }, stdio: "pipe" });
    let output = "";
    child.stdout.on("data", (data) => { output += String(data); });
    child.stderr.on("data", (data) => { output += String(data); });
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code, output }));
  });
  if ((result.code === 0) !== allowed) throw new Error(`Guard portable incorrecto: ${result.output}`);
}

async function expectGuard(release: string, allowed: boolean, label: string) {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(bash, [guard, release, databasePath], { env: { ...process.env, PATH: `${binaries}${path.delimiter}${process.env.PATH}` }, stdio: "pipe" });
    let output = "";
    child.stdout.on("data", (data) => { output += String(data); });
    child.stderr.on("data", (data) => { output += String(data); });
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code, output }));
  });
  if ((result.code === 0) !== allowed) throw new Error(`Guard incorrecto: ${label}. ${result.output}`);
  if (!allowed && !result.output.includes("incompatible")) throw new Error(`El guard falló por una causa ajena al esquema: ${result.output}`);
}
