import type { Prisma } from "@/generated/prisma/client";
import { BadRequestError, NotFoundError } from "@/platform/application/errors";

export async function assertAssetQuota(
  transaction: Prisma.TransactionClient,
  restaurantId: string,
  additionalBytes: number,
): Promise<void> {
  const restaurant = await transaction.restaurant.findUnique({
    where: { id: restaurantId },
    select: { assetQuotaBytes: true },
  });
  if (!restaurant) throw new NotFoundError("Restaurante");
  if (additionalBytes === 0) return;
  const usage = await transaction.menuAsset.aggregate({
    where: { restaurantId },
    _sum: { byteSize: true },
  });
  if ((usage._sum.byteSize ?? 0) + additionalBytes > restaurant.assetQuotaBytes) {
    throw new BadRequestError("Se alcanzó la cuota de archivos del restaurante.");
  }
}

export function assetContentKey(asset: { kind: string; mimeType: string; checksum: string }): string {
  return `${asset.kind}:${asset.mimeType}:${asset.checksum}`;
}
