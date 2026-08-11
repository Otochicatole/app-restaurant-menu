import { prisma } from "@/shared/backend/database/prisma";
import type { FeaturedProductDTO } from "../types";

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

export async function getFeaturedProducts(): Promise<(FeaturedProductDTO | null)[]> {
  const featured = await prisma.featuredProduct.findMany({
    include: { product: { include: { group: true } } },
    orderBy: { position: "asc" },
  });

  const result: (FeaturedProductDTO | null)[] = [null, null, null];
  for (const f of featured) {
    result[f.position - 1] = toDTO(f);
  }
  return result;
}

export async function setFeaturedProduct(position: number, productId: string): Promise<void> {
  await prisma.featuredProduct.upsert({
    where: { position },
    create: { position, productId },
    update: { productId },
  });
}

export async function removeFeaturedProduct(position: number): Promise<void> {
  await prisma.featuredProduct.deleteMany({ where: { position } });
}
