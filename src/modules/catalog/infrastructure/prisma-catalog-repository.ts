import { ConflictError, NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import { enqueueAssetCleanup } from "@/platform/storage/asset-cleanup-queue";
import { Prisma } from "@/generated/prisma/client";
import { assertCompleteProductOrder } from "../domain/catalog-rules";
import type { CatalogRepository, GroupRecord, ProductMediaReference, ProductRecord } from "../application/ports";

const productInclude = { group: { select: { name: true } } } satisfies Prisma.ProductInclude;
type ProductWithGroup = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export class PrismaCatalogRepository implements CatalogRepository {
  async listGroups({ tenantId }: { tenantId: string }): Promise<GroupRecord[]> {
    const groups = await prisma.group.findMany({
      where: { tenantId },
      include: { _count: { select: { products: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      productCount: group._count.products,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));
  }

  async findGroup({ tenantId, groupId }: { tenantId: string; groupId: string }): Promise<GroupRecord | null> {
    const group = await prisma.group.findUnique({
      where: { id_tenantId: { id: groupId, tenantId } },
      include: { _count: { select: { products: true } } },
    });
    return group
      ? {
          id: group.id,
          name: group.name,
          description: group.description,
          productCount: group._count.products,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        }
      : null;
  }

  async createGroup(command: Parameters<CatalogRepository["createGroup"]>[0]): Promise<GroupRecord> {
    try {
      const group = await prisma.group.create({ data: { ...command.input, tenantId: command.tenantId } });
      return { ...group, productCount: 0 };
    } catch (error) {
      translateGroupWriteError(error);
    }
  }

  async updateGroup(command: Parameters<CatalogRepository["updateGroup"]>[0]): Promise<GroupRecord | null> {
    try {
      const group = await prisma.group.update({
        where: { id_tenantId: { id: command.groupId, tenantId: command.tenantId } },
        data: command.input,
        include: { _count: { select: { products: true } } },
      });
      return {
        id: group.id,
        name: group.name,
        description: group.description,
        productCount: group._count.products,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      };
    } catch (error) {
      if (isPrismaError(error, "P2025")) return null;
      translateGroupWriteError(error);
    }
  }

  async deleteGroup({ tenantId, groupId }: { tenantId: string; groupId: string }): Promise<boolean> {
    return prisma.$transaction(async (database) => {
      const group = await database.group.findUnique({ where: { id_tenantId: { id: groupId, tenantId } } });
      if (!group) return false;
      const productMedia = await database.product.findMany({
        where: { tenantId, groupId, mediaPath: { not: null } },
        select: { mediaPath: true },
      });
      await database.group.delete({ where: { id_tenantId: { id: groupId, tenantId } } });
      for (const storageKey of uniqueMediaKeys(productMedia)) {
        await enqueueAssetCleanup(storageKey, database);
      }
      return true;
    });
  }

  countGroups({ tenantId }: { tenantId: string }): Promise<number> {
    return prisma.group.count({ where: { tenantId } });
  }

  async listProducts({ tenantId, groupId }: { tenantId: string; groupId?: string }): Promise<ProductRecord[]> {
    const products = await prisma.product.findMany({
      where: { tenantId, ...(groupId ? { groupId } : {}) },
      include: productInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    });
    return products.map(toProductRecord);
  }

  async findProduct({ tenantId, productId }: { tenantId: string; productId: string }): Promise<ProductRecord | null> {
    const product = await prisma.product.findUnique({
      where: { id_tenantId: { id: productId, tenantId } },
      include: productInclude,
    });
    return product ? toProductRecord(product) : null;
  }

  async createProduct(command: Parameters<CatalogRepository["createProduct"]>[0]): Promise<ProductRecord> {
    try {
      return await prisma.$transaction(
        async (database) => {
          const group = await database.group.findUnique({
            where: { id_tenantId: { id: command.input.groupId, tenantId: command.tenantId } },
            select: { id: true },
          });
          if (!group) throw new NotFoundError("Group");
          const lastProduct = await database.product.aggregate({
            where: { tenantId: command.tenantId, groupId: command.input.groupId },
            _max: { sortOrder: true },
          });
          const product = await database.product.create({
            data: {
              ...command.input,
              tenantId: command.tenantId,
              sortOrder: (lastProduct._max.sortOrder ?? -1) + 1,
            },
            include: productInclude,
          });
          return toProductRecord(product);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isPrismaError(error, "P2034")) throw new ConflictError("El catálogo cambió mientras se creaba el producto. Intentá nuevamente.");
      throw error;
    }
  }

  async updateProduct(command: Parameters<CatalogRepository["updateProduct"]>[0]): Promise<ProductRecord | null> {
    try {
      return await prisma.$transaction(
        async (database) => {
          const existing = await database.product.findUnique({
            where: { id_tenantId: { id: command.productId, tenantId: command.tenantId } },
          });
          if (!existing) return null;

          const destinationGroupId = command.input.groupId ?? existing.groupId;
          const groupChanged = destinationGroupId !== existing.groupId;
          if (command.input.groupId !== undefined) {
            const destinationGroup = await database.group.findUnique({
              where: { id_tenantId: { id: destinationGroupId, tenantId: command.tenantId } },
              select: { id: true },
            });
            if (!destinationGroup) throw new NotFoundError("Group");
          }

          const sortOrder = groupChanged
            ? (await database.product.aggregate({
                where: { tenantId: command.tenantId, groupId: destinationGroupId },
                _max: { sortOrder: true },
              }))._max.sortOrder ?? -1
            : null;

          const product = await database.product.update({
            where: { id_tenantId: { id: command.productId, tenantId: command.tenantId } },
            data: groupChanged ? { ...command.input, sortOrder: (sortOrder ?? -1) + 1 } : command.input,
            include: productInclude,
          });
          return toProductRecord(product);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isPrismaError(error, "P2034")) throw new ConflictError("El catálogo cambió mientras se actualizaba el producto. Intentá nuevamente.");
      throw error;
    }
  }

  async deleteProduct({ tenantId, productId }: { tenantId: string; productId: string }): Promise<boolean> {
    return prisma.$transaction(async (database) => {
      const product = await database.product.findUnique({
        where: { id_tenantId: { id: productId, tenantId } },
        select: { mediaPath: true },
      });
      if (!product) return false;
      await database.product.delete({ where: { id_tenantId: { id: productId, tenantId } } });
      if (product.mediaPath) await enqueueAssetCleanup(product.mediaPath, database);
      return true;
    });
  }

  async replaceProductOrder(command: Parameters<CatalogRepository["replaceProductOrder"]>[0]): Promise<void> {
    try {
      await prisma.$transaction(
        async (database) => {
          const group = await database.group.findUnique({
            where: { id_tenantId: { id: command.groupId, tenantId: command.tenantId } },
            select: { id: true },
          });
          if (!group) throw new NotFoundError("Group");

          const products = await database.product.findMany({
            where: { tenantId: command.tenantId, groupId: command.groupId },
            select: { id: true },
          });
          assertCompleteProductOrder(products.map(({ id }) => id), command.productIds);

          for (const [sortOrder, productId] of command.productIds.entries()) {
            await database.product.update({
              where: { id_tenantId: { id: productId, tenantId: command.tenantId } },
              data: { sortOrder },
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isPrismaError(error, "P2034")) throw new ConflictError("El catálogo cambió mientras se guardaba el orden. Intentá nuevamente.");
      throw error;
    }
  }

  async replaceProductMedia(command: Parameters<CatalogRepository["replaceProductMedia"]>[0]): Promise<ProductRecord | null> {
    return prisma.$transaction(async (database) => {
      const existing = await database.product.findUnique({
        where: { id_tenantId: { id: command.productId, tenantId: command.tenantId } },
        select: { mediaPath: true },
      });
      if (!existing) return null;
      const product = await database.product.update({
        where: { id_tenantId: { id: command.productId, tenantId: command.tenantId } },
        data: { mediaPath: command.storageKey, mediaType: command.mediaType },
        include: productInclude,
      });
      if (existing.mediaPath && existing.mediaPath !== command.storageKey) {
        await enqueueAssetCleanup(existing.mediaPath, database);
      }
      return toProductRecord(product);
    });
  }

  async removeProductMedia(command: Parameters<CatalogRepository["removeProductMedia"]>[0]): Promise<ProductRecord | null> {
    return prisma.$transaction(async (database) => {
      const existing = await database.product.findUnique({
        where: { id_tenantId: { id: command.productId, tenantId: command.tenantId } },
        select: { mediaPath: true },
      });
      if (!existing) return null;
      const product = await database.product.update({
        where: { id_tenantId: { id: command.productId, tenantId: command.tenantId } },
        data: { mediaPath: null, mediaType: null },
        include: productInclude,
      });
      if (existing.mediaPath) await enqueueAssetCleanup(existing.mediaPath, database);
      return toProductRecord(product);
    });
  }

  async findProductMedia({ tenantId, productId }: { tenantId: string; productId: string }): Promise<ProductMediaReference | null> {
    const product = await prisma.product.findUnique({
      where: { id_tenantId: { id: productId, tenantId } },
      select: { mediaPath: true, mediaType: true },
    });
    if (!product?.mediaPath) return null;
    const mediaType: ProductMediaReference["mediaType"] =
      product.mediaType === "image" || product.mediaType === "video" ? product.mediaType : null;
    return {
      storageKey: product.mediaPath,
      mediaType,
    };
  }

  countProducts({ tenantId }: { tenantId: string }): Promise<number> {
    return prisma.product.count({ where: { tenantId } });
  }
}

function toProductRecord(product: ProductWithGroup): ProductRecord {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    groupId: product.groupId,
    groupName: product.group.name,
    sortOrder: product.sortOrder,
    mediaKey: product.mediaPath,
    mediaType: product.mediaType === "image" || product.mediaType === "video" ? product.mediaType : null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function uniqueMediaKeys(products: { mediaPath: string | null }[]): string[] {
  return [...new Set(products.flatMap(({ mediaPath }) => (mediaPath ? [mediaPath] : [])))];
}

function isPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function translateGroupWriteError(error: unknown): never {
  if (isPrismaError(error, "P2002")) throw new ConflictError("Ya existe un grupo con ese nombre");
  throw error;
}
