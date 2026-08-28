import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/platform/database/prisma";
import { storageRoot } from "@/platform/storage";

export type ReadinessCheck = "ok" | "failed";

export interface ReadinessResult {
  status: "ok" | "degraded";
  checks: {
    database: ReadinessCheck;
    storage: ReadinessCheck;
  };
}

const CHECK_TIMEOUT_MS = 3_000;

export async function checkReadiness(): Promise<ReadinessResult> {
  const [database, storage] = await Promise.allSettled([
    withTimeout(checkDatabase(), CHECK_TIMEOUT_MS),
    withTimeout(checkWritableStorage(), CHECK_TIMEOUT_MS),
  ]);

  const checks = {
    database: database.status === "fulfilled" ? "ok" : "failed",
    storage: storage.status === "fulfilled" ? "ok" : "failed",
  } satisfies ReadinessResult["checks"];

  return {
    status: checks.database === "ok" && checks.storage === "ok" ? "ok" : "degraded",
    checks,
  };
}

async function checkDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT name
    FROM sqlite_schema
    WHERE type = 'table' AND name IN ('Tenant', '_prisma_migrations')
  `;
  const names = new Set(tables.map(({ name }) => name));
  if (!names.has("Tenant") || !names.has("_prisma_migrations")) {
    throw new Error("SQLite schema is incomplete");
  }
}

async function checkWritableStorage(): Promise<void> {
  await fs.mkdir(storageRoot, { recursive: true });
  const probePath = path.join(storageRoot, `.__healthcheck-${randomUUID()}`);
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;

  try {
    handle = await fs.open(probePath, "wx", 0o600);
    await handle.writeFile("ok");
    await handle.sync();
  } finally {
    try {
      await handle?.close();
    } finally {
      await fs.rm(probePath, { force: true });
    }
  }
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Readiness check timed out")), timeoutMs);
  });

  try {
    return await Promise.race([operation, expired]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
