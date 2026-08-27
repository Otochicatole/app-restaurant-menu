import { prisma } from "@/shared/backend/database/prisma";
import type { ProductInput, ProductUpdateInput } from "../schemas/product.schema";
import type { ProductDTO } from "../types";
import { BadRequestError, NotFoundError } from "@/shared/backend/errors/app-error";
import type { Prisma } from "@/generated/prisma/client";
import { deleteFile, saveFile, validateMediaFile } from "@/shared/backend/storage";

function toDTO(product: Prisma.ProductGetPayload<{ include: { group: true } }>, tenantSlug: string): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    groupId: product.groupId,
    sortOrder: product.sortOrder,
    groupName: product.group.name,
    mediaUrl: product.mediaPath ? `/api/public/menus/${tenantSlug}/products/${product.id}/media` : null,
    mediaType: (product.mediaType as ProductDTO["mediaType"]) ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function getProducts(tenantId: string, tenantSlug: string, groupId?: string): Promise<ProductDTO[]> {
  const where = { tenantId, ...(groupId ? { groupId } : {}) };
  const products = await prisma.product.findMany({
    where,
    include: { group: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return products.map((product) => toDTO(product, tenantSlug));
}

export async function getProductById(id: string, tenantId: string, tenantSlug: string): Promise<ProductDTO> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { group: true },
  });
  if (!product || product.tenantId !== tenantId) throw new NotFoundError("Product");
  return toDTO(product, tenantSlug);
}

export async function createProduct(input: ProductInput, tenantId: string, tenantSlug: string): Promise<ProductDTO> {
  const group = await prisma.group.findFirst({ where: { id: input.groupId, tenantId } });
  if (!group) throw new NotFoundError("Group");
  const lastProduct = await prisma.product.findFirst({
    where: { groupId: input.groupId, tenantId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const product = await prisma.product.create({
    data: { ...input, tenantId, sortOrder: (lastProduct?.sortOrder ?? -1) + 1 },
    include: { group: true },
  });
  return toDTO(product, tenantSlug);
}

export async function updateProduct(id: string, input: ProductUpdateInput, tenantId: string, tenantSlug: string): Promise<ProductDTO> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.tenantId !== tenantId) throw new NotFoundError("Product");

  const groupChanged = input.groupId !== undefined && input.groupId !== existing.groupId;
  const lastProduct = groupChanged
    ? await prisma.product.findFirst({
        where: { groupId: input.groupId, tenantId },
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
  return toDTO(product, tenantSlug);
}

export async function updateProductOrder(groupId: string, productIds: string[], tenantId: string): Promise<void> {
  const products = await prisma.product.findMany({
    where: { groupId, tenantId, id: { in: productIds } },
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

export async function deleteProduct(id: string, tenantId: string): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.tenantId !== tenantId) throw new NotFoundError("Product");

  if (existing.mediaPath) {
    await deleteFile(existing.mediaPath);
  }

  await prisma.product.delete({ where: { id } });
}

export async function saveProductMedia(
  id: string,
  tenantId: string,
  tenantSlug: string,
  file: { type: string; size: number; buffer: Buffer },
): Promise<ProductDTO> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.tenantId !== tenantId) throw new NotFoundError("Product");

  const { mediaType, extension } = validateMediaFile(file);
  const relativePath = `tenants/${tenantId}/products/${id}-${Date.now()}.${extension}`;

  await saveFile(relativePath, file.buffer);

  if (existing.mediaPath) {
    await deleteFile(existing.mediaPath);
  }

  const product = await prisma.product.update({
    where: { id },
    data: { mediaPath: relativePath, mediaType },
    include: { group: true },
  });
  return toDTO(product, tenantSlug);
}

export async function removeProductMedia(id: string, tenantId: string, tenantSlug: string): Promise<ProductDTO> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.tenantId !== tenantId) throw new NotFoundError("Product");

  if (existing.mediaPath) {
    await deleteFile(existing.mediaPath);
  }

  const product = await prisma.product.update({
    where: { id },
    data: { mediaPath: null, mediaType: null },
    include: { group: true },
  });
  return toDTO(product, tenantSlug);
}

export async function getProductMediaPath(id: string, tenantId: string): Promise<{ mediaPath: string; mediaType: string | null } | null> {
  const product = await prisma.product.findUnique({
    where: { id, tenantId },
    select: { mediaPath: true, mediaType: true },
  });
  if (!product?.mediaPath) return null;
  return { mediaPath: product.mediaPath, mediaType: product.mediaType };
}

export async function getProductCount(tenantId: string): Promise<number> {
  return prisma.product.count({ where: { tenantId } });
}
