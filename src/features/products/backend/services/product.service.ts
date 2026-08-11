import { prisma } from "@/shared/backend/database/prisma";
import type { ProductInput, ProductUpdateInput } from "../schemas/product.schema";
import type { ProductDTO } from "../types";
import { BadRequestError, NotFoundError } from "@/shared/backend/errors/app-error";
import type { Prisma } from "@/generated/prisma/client";

function toDTO(product: Prisma.ProductGetPayload<{ include: { group: true } }>): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    groupId: product.groupId,
    sortOrder: product.sortOrder,
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
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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
  const lastProduct = await prisma.product.findFirst({
    where: { groupId: input.groupId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const product = await prisma.product.create({
    data: { ...input, sortOrder: (lastProduct?.sortOrder ?? -1) + 1 },
    include: { group: true },
  });
  return toDTO(product);
}

export async function updateProduct(id: string, input: ProductUpdateInput): Promise<ProductDTO> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Product");

  const groupChanged = input.groupId !== undefined && input.groupId !== existing.groupId;
  const lastProduct = groupChanged
    ? await prisma.product.findFirst({
        where: { groupId: input.groupId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      })
    : null;

  const product = await prisma.product.update({
    where: { id },
    data: groupChanged
      ? { ...input, sortOrder: (lastProduct?.sortOrder ?? -1) + 1 }
      : input,
    include: { group: true },
  });
  return toDTO(product);
}

export async function updateProductOrder(groupId: string, productIds: string[]): Promise<void> {
  const products = await prisma.product.findMany({
    where: { groupId, id: { in: productIds } },
    select: { id: true },
  });

  if (products.length !== productIds.length || new Set(productIds).size !== productIds.length) {
    throw new BadRequestError("La lista de productos no coincide con el grupo seleccionado");
  }

  await prisma.$transaction(
    productIds.map((id, index) =>
      prisma.product.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
}

export async function deleteProduct(id: string): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Product");

  await prisma.product.delete({ where: { id } });
}

export async function getProductCount(): Promise<number> {
  return prisma.product.count();
}
