import { prisma } from "@/platform/database/prisma";
import { blobStore } from "@/platform/storage";

type CleanupJobWriter = Pick<typeof prisma, "assetCleanupJob">;

export type AssetCleanupWorkItem = {
  id: string;
  storageKey: string;
  deletePrefix: boolean;
  attempts: number;
};

export interface AssetCleanupWorker {
  findDue(now: Date, limit: number): Promise<AssetCleanupWorkItem[]>;
  claim(id: string, dueAt: Date, leaseUntil: Date): Promise<boolean>;
  removeAsset(job: AssetCleanupWorkItem): Promise<void>;
  complete(id: string): Promise<void>;
  defer(input: { id: string; attempts: number; availableAt: Date; lastError: string }): Promise<void>;
}

export async function enqueueAssetCleanup(
  storageKey: string,
  database: CleanupJobWriter = prisma,
  options: { deletePrefix?: boolean } = {},
): Promise<void> {
  await database.assetCleanupJob.upsert({
    where: { storageKey },
    create: { storageKey, deletePrefix: options.deletePrefix ?? false },
    update: {
      availableAt: new Date(),
      lastError: null,
      ...(options.deletePrefix ? { deletePrefix: true } : {}),
    },
  });
}

export async function drainAssetCleanupQueue(
  limit = 100,
  worker: AssetCleanupWorker = persistentCleanupWorker,
  clock: () => Date = () => new Date(),
): Promise<{
  processed: number;
  failed: number;
}> {
  const now = clock();
  const jobs = await worker.findDue(now, Math.max(1, Math.min(limit, 500)));

  let processed = 0;
  let failed = 0;
  for (const job of jobs) {
    const claimed = await worker.claim(job.id, now, new Date(clock().getTime() + 5 * 60_000));
    if (!claimed) continue;

    try {
      await worker.removeAsset(job);
      await worker.complete(job.id);
      processed += 1;
    } catch (error) {
      const attempts = job.attempts + 1;
      const backoffMinutes = Math.min(2 ** Math.min(attempts, 10), 24 * 60);
      await worker.defer({
        id: job.id,
        attempts,
        availableAt: new Date(clock().getTime() + backoffMinutes * 60_000),
        lastError: error instanceof Error ? error.message.slice(0, 1_000) : "Unknown storage error",
      });
      failed += 1;
    }
  }

  return { processed, failed };
}

const persistentCleanupWorker: AssetCleanupWorker = {
  async findDue(now, limit) {
    return prisma.assetCleanupJob.findMany({
      where: { availableAt: { lte: now } },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true, storageKey: true, deletePrefix: true, attempts: true },
    });
  },
  async claim(id, dueAt, leaseUntil) {
    const lease = await prisma.assetCleanupJob.updateMany({
      where: { id, availableAt: { lte: dueAt } },
      data: { availableAt: leaseUntil },
    });
    return lease.count === 1;
  },
  async removeAsset(job) {
    if (job.deletePrefix) await blobStore.deletePrefix(job.storageKey);
    else await blobStore.delete(job.storageKey);
  },
  async complete(id) {
    await prisma.assetCleanupJob.deleteMany({ where: { id } });
  },
  async defer(input) {
    await prisma.assetCleanupJob.updateMany({
      where: { id: input.id },
      data: {
        attempts: input.attempts,
        availableAt: input.availableAt,
        lastError: input.lastError,
      },
    });
  },
};
