import { NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import type { HighlightSlots, HighlightedProduct, ReplaceHighlightsCommand } from "../contracts";
import type { HighlightsRepository } from "../application/ports";

type FeaturedRow = {
  id: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  product: { id: string; name: string; price: number; group: { name: string } };
};

function toHighlightedProduct(row: FeaturedRow): HighlightedProduct {
  return {
    id: row.id,
    position: row.position as 1 | 2 | 3,
    product: {
      id: row.product.id,
      name: row.product.name,
      price: row.product.price,
      groupName: row.product.group.name,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaHighlightsRepository implements HighlightsRepository {
  async get(tenantId: string): Promise<HighlightSlots> {
    const rows = await prisma.featuredProduct.findMany({
      where: { tenantId },
      include: { product: { include: { group: true } } },
      orderBy: { position: "asc" },
    });
    const slots: HighlightSlots = [null, null, null];
    for (const row of rows) {
      if (row.position >= 1 && row.position <= 3) slots[row.position - 1] = toHighlightedProduct(row);
    }
    return slots;
  }

  async replace(tenantId: string, command: ReplaceHighlightsCommand): Promise<void> {
    const selectedIds = command.productIds.filter((id): id is string => id !== null);
    const products = selectedIds.length
      ? await prisma.product.findMany({
          where: { tenantId, id: { in: selectedIds } },
          select: { id: true },
        })
      : [];
    if (products.length !== selectedIds.length) throw new NotFoundError("Product");

    await prisma.$transaction(async (transaction) => {
      await transaction.featuredProduct.deleteMany({ where: { tenantId } });
      const data = command.productIds.flatMap((productId, index) =>
        productId ? [{ tenantId, productId, position: index + 1 }] : [],
      );
      if (data.length) await transaction.featuredProduct.createMany({ data });
    });
  }
}
