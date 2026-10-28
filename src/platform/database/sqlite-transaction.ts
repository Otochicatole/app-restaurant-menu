import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/** Retry the whole transaction so quota/capacity checks read a fresh snapshot. */
export async function withSqliteTransaction<T>(
  client: PrismaClient,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await client.$transaction(operation, { maxWait: 5_000, timeout: 10_000 });
    } catch (error) {
      if (attempt >= 2 || !isSqliteContention(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt));
    }
  }
}

function isSqliteContention(error: unknown, visited = new Set<object>()): boolean {
  if (!error || typeof error !== "object" || visited.has(error)) return false;
  visited.add(error);
  const value = error as Record<string, unknown>;
  if (value.code === "P2034") return true;
  for (const code of [value.code, value.rawCode, value.originalCode, value.extendedCode]) {
    if (typeof code === "string" && /^SQLITE_(BUSY|LOCKED)(?:_|$)/.test(code)) return true;
    if ((typeof code === "number" || (typeof code === "string" && /^\d+$/.test(code))) &&
      [5, 6].includes(Number(code) & 255)) return true;
  }
  return [value.cause, value.meta, value.driverAdapterError, value.error]
    .some((cause) => isSqliteContention(cause, visited));
}
