import { spawn } from "node:child_process";
import { lstat, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DISPOSABLE_NAME = /(?:^|[-_.])(test|tests|testing|ci|e2e)(?:[-_.]|$)/i;
const PROTECTED_NAME = /(?:^|[-_.])(prod|production|live|staging)(?:[-_.]|$)/i;
const SQLITE_EXTENSION = /\.(?:db|sqlite)$/i;
const OWNER_MARKER_SUFFIX = ".test-owner";
const OWNER_MARKER_CONTENT = "app-restaurant-menu:sqlite-test-database:v1\n";

export interface DisposableTestDatabase {
  connectionString: string;
  databasePath: string;
  databaseName: string;
}

export function requireDisposableTestDatabase(
  value = process.env.TEST_DATABASE_URL?.trim(),
): DisposableTestDatabase {
  if (!value) {
    throw new Error("TEST_DATABASE_URL is required and must point to a disposable SQLite file.");
  }
  if (!value.startsWith("file:")) {
    throw new Error("TEST_DATABASE_URL must use the file: protocol for SQLite.");
  }
  if (value.includes("?") || value.includes("#")) {
    throw new Error("TEST_DATABASE_URL cannot contain query parameters or fragments.");
  }

  const databasePath = resolveSqlitePath(value);
  const databaseName = path.basename(databasePath);
  const testResultsRoot = path.resolve(process.cwd(), "test-results");
  if (!isInside(testResultsRoot, databasePath)) {
    throw new Error(`Refusing TEST_DATABASE_URL outside the dedicated test-results directory: ${databasePath}`);
  }
  if (!SQLITE_EXTENSION.test(databaseName)) {
    throw new Error("TEST_DATABASE_URL must end in .db or .sqlite.");
  }
  if (!DISPOSABLE_NAME.test(databaseName) || PROTECTED_NAME.test(databaseName)) {
    throw new Error(
      "Refusing TEST_DATABASE_URL: its filename must contain a test, ci, or e2e segment and cannot contain prod, live, or staging.",
    );
  }

  return {
    connectionString: `file:${databasePath.replaceAll(path.sep, "/")}`,
    databasePath,
    databaseName,
  };
}

export async function resetDisposableTestDatabase(
  value = process.env.TEST_DATABASE_URL?.trim(),
): Promise<DisposableTestDatabase> {
  const database = requireDisposableTestDatabase(value);
  const testResultsRoot = path.resolve(process.cwd(), "test-results");
  const parent = path.dirname(database.databasePath);

  await mkdir(testResultsRoot, { recursive: true });
  await mkdir(parent, { recursive: true });
  const [realTestRoot, realParent] = await Promise.all([realpath(testResultsRoot), realpath(parent)]);
  if (realParent !== realTestRoot && !isInside(realTestRoot, realParent)) {
    throw new Error(`Refusing SQLite test database through a directory outside test-results: ${realParent}`);
  }

  const markerPath = ownerMarkerPath(database.databasePath);
  await assertRegularFileOrMissing(markerPath, "ownership marker");
  const marker = await readTextIfPresent(markerPath);
  const databaseStat = await lstatIfPresent(database.databasePath);
  if (databaseStat?.isSymbolicLink()) {
    throw new Error(`Refusing symbolic-link SQLite test database: ${database.databasePath}`);
  }
  if (databaseStat && !databaseStat.isFile()) {
    throw new Error(`Refusing non-file SQLite test database: ${database.databasePath}`);
  }
  if (databaseStat && databaseStat.nlink > 1) {
    throw new Error(`Refusing hard-linked SQLite test database: ${database.databasePath}`);
  }
  if (databaseStat && marker !== OWNER_MARKER_CONTENT) {
    throw new Error(`Refusing to replace an unowned SQLite test database: ${database.databasePath}`);
  }
  if (marker !== null && marker !== OWNER_MARKER_CONTENT) {
    throw new Error(`Invalid SQLite test database ownership marker: ${markerPath}`);
  }
  if (marker === null) {
    await writeFile(markerPath, OWNER_MARKER_CONTENT, { encoding: "utf8", flag: "wx", mode: 0o600 });
  }

  for (const candidate of sqliteDatabaseFiles(database.databasePath)) {
    await rm(candidate, { force: true });
  }
  return database;
}

export async function prepareDisposableTestDatabase(
  value = process.env.TEST_DATABASE_URL?.trim(),
): Promise<DisposableTestDatabase> {
  const database = await resetDisposableTestDatabase(value);
  await createEmptySqliteDatabase(database.connectionString);
  const exitCode = await runPrismaMigration(database);
  if (exitCode !== 0) {
    throw new Error(`Prisma migrate deploy failed for disposable SQLite database (exit ${exitCode ?? "unknown"}).`);
  }
  return database;
}

async function createEmptySqliteDatabase(connectionString: string): Promise<void> {
  const { createSqlitePrismaClient } = await import("../src/platform/database/sqlite-client");
  const client = createSqlitePrismaClient(connectionString);
  try {
    await client.$queryRawUnsafe("SELECT 1");
  } finally {
    await client.$disconnect();
  }
}

if (isDirectExecution()) {
  void runDirectExecution();
}

async function runDirectExecution(): Promise<void> {
  try {
    const mode = process.argv[2];
    const database = mode === "--prepare"
      ? await prepareDisposableTestDatabase()
      : mode === "--reset"
        ? await resetDisposableTestDatabase()
        : requireDisposableTestDatabase();
    if (mode && mode !== "--prepare" && mode !== "--reset") {
      throw new Error(`Unknown argument: ${mode}`);
    }
    console.log(`Disposable SQLite test database configured at ${database.databasePath}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid TEST_DATABASE_URL.");
    process.exitCode = 1;
  }
}

function resolveSqlitePath(value: string): string {
  let encodedPath = value.slice("file:".length);
  if (!encodedPath || encodedPath === ":memory:" || encodedPath.includes("\0")) {
    throw new Error("TEST_DATABASE_URL must reference a persistent SQLite test file.");
  }

  try {
    encodedPath = decodeURIComponent(encodedPath);
  } catch {
    throw new Error("TEST_DATABASE_URL contains an invalid encoded file path.");
  }
  if (!encodedPath || encodedPath === ":memory:" || encodedPath.includes("?") || encodedPath.includes("#")) {
    throw new Error("TEST_DATABASE_URL must reference a plain persistent SQLite test file.");
  }

  if (encodedPath.startsWith("//")) {
    const url = new URL(value);
    if (url.hostname) throw new Error("TEST_DATABASE_URL cannot reference a network file.");
    encodedPath = url.pathname;
    if (process.platform === "win32" && /^\/[A-Za-z]:\//.test(encodedPath)) {
      encodedPath = encodedPath.slice(1);
    }
  }
  return path.resolve(encodedPath);
}

function isInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function ownerMarkerPath(databasePath: string): string {
  return `${databasePath}${OWNER_MARKER_SUFFIX}`;
}

function sqliteDatabaseFiles(databasePath: string): string[] {
  return [databasePath, `${databasePath}-journal`, `${databasePath}-shm`, `${databasePath}-wal`];
}

async function assertRegularFileOrMissing(target: string, label: string): Promise<void> {
  const stat = await lstatIfPresent(target);
  if (!stat) return;
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink > 1) {
    throw new Error(`Refusing invalid SQLite test database ${label}: ${target}`);
  }
}

async function readTextIfPresent(target: string): Promise<string | null> {
  try {
    return await readFile(target, "utf8");
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

async function lstatIfPresent(target: string) {
  try {
    return await lstat(target);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

async function runPrismaMigration(database: DisposableTestDatabase): Promise<number | null> {
  const configPath = `${database.databasePath}.prisma.config.ts`;
  const configSource = [
    'import { defineConfig } from "prisma/config";',
    "",
    "export default defineConfig({",
    `  schema: ${JSON.stringify(path.resolve(process.cwd(), "prisma", "schema.prisma"))},`,
    `  migrations: { path: ${JSON.stringify(path.resolve(process.cwd(), "prisma", "migrations"))} },`,
    `  datasource: { url: ${JSON.stringify(database.connectionString)} },`,
    "});",
    "",
  ].join("\n");

  await rm(configPath, { force: true });
  await writeFile(configPath, configSource, { encoding: "utf8", flag: "wx", mode: 0o600 });
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["x", "prisma", "migrate", "deploy", "--config", configPath],
        {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: database.connectionString },
          stdio: "inherit",
        },
      );
      child.once("error", reject);
      child.once("exit", resolve);
    });
  } finally {
    await rm(configPath, { force: true });
  }
}

function isMissing(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isDirectExecution(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint) && path.resolve(entrypoint) === fileURLToPath(import.meta.url);
}
