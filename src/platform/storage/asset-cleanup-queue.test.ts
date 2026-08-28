import { describe, expect, it, vi } from "vitest";

vi.mock("@/platform/database/prisma", () => ({ prisma: { assetCleanupJob: {} } }));
vi.mock("@/platform/storage", () => ({ blobStore: {} }));

import {
  drainAssetCleanupQueue,
  type AssetCleanupWorker,
  type AssetCleanupWorkItem,
} from "./asset-cleanup-queue";

const now = new Date("2026-08-27T12:00:00.000Z");

describe("asset cleanup queue", () => {
  it("claims jobs once, completes successes and defers failures with backoff", async () => {
    const successful = job("success", false, 0);
    const prefixFailure = job("prefix", true, 1);
    const skipped = job("already-claimed", false, 0);
    const worker: AssetCleanupWorker = {
      findDue: vi.fn(async () => [successful, prefixFailure, skipped]),
      claim: vi.fn(async (id) => id !== skipped.id),
      removeAsset: vi.fn(async (item) => {
        if (item.id === prefixFailure.id) throw new Error("storage offline");
      }),
      complete: vi.fn(async () => undefined),
      defer: vi.fn(async () => undefined),
    };

    await expect(drainAssetCleanupQueue(1_000, worker, () => now)).resolves.toEqual({
      processed: 1,
      failed: 1,
    });
    expect(worker.findDue).toHaveBeenCalledWith(now, 500);
    expect(worker.complete).toHaveBeenCalledWith(successful.id);
    expect(worker.removeAsset).not.toHaveBeenCalledWith(skipped);
    expect(worker.defer).toHaveBeenCalledWith({
      id: prefixFailure.id,
      attempts: 2,
      availableAt: new Date(now.getTime() + 4 * 60_000),
      lastError: "storage offline",
    });
  });
});

function job(id: string, deletePrefix: boolean, attempts: number): AssetCleanupWorkItem {
  return { id, storageKey: `tenants/${id}`, deletePrefix, attempts };
}
