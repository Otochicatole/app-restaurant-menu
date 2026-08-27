import { prisma } from "@/shared/backend/database/prisma";
import type { FeaturedProductDTO } from "../types";
import { NotFoundError } from "@/shared/backend/errors/app-error";

function toDTO(row: {
  id: string;
  position: number;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
  product: { id: string; name: string; price: number; group: { name: string } };
}): FeaturedProductDTO {
  return {
    id: row.id,
    position: row.position,
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

export async function getFeaturedProducts(tenantId: string): Promise<(FeaturedProductDTO | null)[]> {
  const featured = await prisma.featuredProduct.findMany({
    where: { tenantId },
    include: { product: { include: { group: true } } },
    orderBy: { position: "asc" },
  });

  const result: (FeaturedProductDTO | null)[] = [null, null, null];
  for (const f of featured) {
    result[f.position - 1] = toDTO(f);
  }
  return result;
}

export async function setFeaturedProduct(tenantId: string, position: number, productId: string): Promise<void> {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw new NotFoundError("Product");
  const existing = await prisma.featuredProduct.findFirst({ where: { tenantId, position } });
  if (existing) {
    await prisma.featuredProduct.update({ where: { id: existing.id }, data: { productId } });
  } else {
    await prisma.featuredProduct.create({ data: { tenantId, position, productId } });
  }
}

export async function removeFeaturedProduct(tenantId: string, position: number): Promise<void> {
  await prisma.featuredProduct.deleteMany({ where: { tenantId, position } });
}
