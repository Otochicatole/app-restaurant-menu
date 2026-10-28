import { describe, expect, it, vi } from "vitest";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { withSqliteTransaction } from "./sqlite-transaction";

describe("SQLite transaction retries", () => {
  it("restarts the entire operation after a wrapped busy snapshot error", async () => {
    const transaction = {} as Prisma.TransactionClient;
    const busy = { meta: { driverAdapterError: { cause: { originalCode: "517" } } } };
    const operation = vi.fn().mockRejectedValueOnce(busy).mockResolvedValueOnce("committed");
    const execute = vi.fn((callback: typeof operation) => callback(transaction));
    const client = { $transaction: execute } as unknown as PrismaClient;
    expect(await withSqliteTransaction(client, operation)).toBe("committed");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("stops after three attempts and preserves the original lock error", async () => {
    const locked = { code: "SQLITE_LOCKED" };
    const execute = vi.fn().mockRejectedValue(locked);
    const client = { $transaction: execute } as unknown as PrismaClient;
    await expect(withSqliteTransaction(client, async () => null)).rejects.toBe(locked);
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it("does not retry uniqueness violations or business conflicts", async () => {
    for (const error of [{ code: "P2002" }, new Error("capacity exceeded")]) {
      const execute = vi.fn().mockRejectedValue(error);
      const client = { $transaction: execute } as unknown as PrismaClient;
      await expect(withSqliteTransaction(client, async () => null)).rejects.toBe(error);
      expect(execute).toHaveBeenCalledTimes(1);
    }
  });
});
