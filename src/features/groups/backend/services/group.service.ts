import { prisma } from "@/shared/backend/database/prisma";
import type { GroupInput, GroupUpdateInput } from "../schemas/group.schema";
import type { GroupDTO } from "../types";
import { NotFoundError } from "@/shared/backend/errors/app-error";
import { deleteFile } from "@/shared/backend/storage";

export async function getGroups(tenantId: string): Promise<GroupDTO[]> {
  const groups = await prisma.group.findMany({
    where: { tenantId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    productCount: g._count.products,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }));
}

export async function getGroupById(id: string, tenantId: string): Promise<GroupDTO> {
  const group = await prisma.group.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!group || group.tenantId !== tenantId) throw new NotFoundError("Group");
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    productCount: group._count.products,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

export async function createGroup(input: GroupInput, tenantId: string): Promise<GroupDTO> {
  const group = await prisma.group.create({ data: { ...input, tenantId } });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    productCount: 0,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

export async function updateGroup(id: string, input: GroupUpdateInput, tenantId: string): Promise<GroupDTO> {
  const existing = await prisma.group.findUnique({ where: { id } });
  if (!existing || existing.tenantId !== tenantId) throw new NotFoundError("Group");

  const group = await prisma.group.update({ where: { id }, data: input });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

export async function deleteGroup(id: string, tenantId: string): Promise<void> {
  const existing = await prisma.group.findUnique({ where: { id } });
  if (!existing || existing.tenantId !== tenantId) throw new NotFoundError("Group");

  const products = await prisma.product.findMany({
    where: { groupId: id, tenantId },
    select: { mediaPath: true },
  });
  for (const product of products) {
    if (product.mediaPath) {
      await deleteFile(product.mediaPath);
    }
  }

  await prisma.group.delete({ where: { id } });
}

export async function getGroupCount(tenantId: string): Promise<number> {
  return prisma.group.count({ where: { tenantId } });
}
