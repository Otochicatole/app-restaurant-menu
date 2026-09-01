import { drainAssetCleanupQueue } from "../src/platform/storage/asset-cleanup-queue";
import { prisma } from "../src/platform/database/prisma";

const rawLimit = Number(process.argv[2] ?? 100);
const limit = Number.isSafeInteger(rawLimit) && rawLimit > 0 ? rawLimit : 100;

drainAssetCleanupQueue(limit)
  .then((result) => {
    console.log(`Asset cleanup completed: ${result.processed} processed, ${result.failed} deferred.`);
    if (result.failed > 0) process.exitCode = 1;
  })
  .catch((error) => {
    console.error("Asset cleanup failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
