import { prisma } from "@/shared/backend/database/prisma";
import type { GroupInput, GroupUpdateInput } from "../schemas/group.schema";
import type { GroupDTO } from "../types";
import { NotFoundError } from "@/shared/backend/errors/app-error";
import { deleteFile } from "@/shared/backend/storage";

export async function getGroups(): Promise<GroupDTO[]> {
  const groups = await prisma.group.findMany({
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

export async function getGroupById(id: string): Promise<GroupDTO> {
  const group = await prisma.group.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!group) throw new NotFoundError("Group");
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    productCount: group._count.products,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

export async function createGroup(input: GroupInput): Promise<GroupDTO> {
  const group = await prisma.group.create({ data: input });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    productCount: 0,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

export async function updateGroup(id: string, input: GroupUpdateInput): Promise<GroupDTO> {
  const existing = await prisma.group.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Group");

  const group = await prisma.group.update({ where: { id }, data: input });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

export async function deleteGroup(id: string): Promise<void> {
  const existing = await prisma.group.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Group");

  const products = await prisma.product.findMany({
    where: { groupId: id },
    select: { mediaPath: true },
  });
  for (const product of products) {
    if (product.mediaPath) {
      await deleteFile(product.mediaPath);
    }
  }

  await prisma.group.delete({ where: { id } });
}

export async function getGroupCount(): Promise<number> {
  return prisma.group.count();
}
