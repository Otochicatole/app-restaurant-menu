import { prisma } from "@/shared/backend/database/prisma";
import type { ProductInput, ProductUpdateInput } from "../schemas/product.schema";
import type { ProductDTO } from "../types";
import { NotFoundError } from "@/shared/backend/errors/app-error";
import type { Prisma } from "@/generated/prisma/client";

function toDTO(product: Prisma.ProductGetPayload<{ include: { group: true } }>): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    groupId: product.groupId,
    groupName: product.group.name,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function getProducts(groupId?: string): Promise<ProductDTO[]> {
  const where = groupId ? { groupId } : {};
  const products = await prisma.product.findMany({
    where,
    include: { group: true },
    orderBy: { name: "asc" },
  });
  return products.map(toDTO);
}

export async function getProductById(id: string): Promise<ProductDTO> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { group: true },
  });
  if (!product) throw new NotFoundError("Product");
  return toDTO(product);
}

export async function createProduct(input: ProductInput): Promise<ProductDTO> {
  const product = await prisma.product.create({
    data: input,
    include: { group: true },
  });
  return toDTO(product);
}

export async function updateProduct(id: string, input: ProductUpdateInput): Promise<ProductDTO> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Product");

  const product = await prisma.product.update({
    where: { id },
    data: input,
    include: { group: true },
  });
  return toDTO(product);
}

export async function deleteProduct(id: string): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Product");

  await prisma.product.delete({ where: { id } });
}

export async function getProductCount(): Promise<number> {
  return prisma.product.count();
}
