import { prisma } from "@/shared/backend/database/prisma";
import type { HomePageUpdateInput } from "../schemas/home-page.schema";
import type { HomePageDTO } from "../types";

function toDTO(row: { id: string; title: string; description: string; createdAt: Date; updatedAt: Date }): HomePageDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrCreateHomePage(tenantId: string, defaults?: { title?: string; description?: string }): Promise<HomePageDTO> {
  let homePage = await prisma.homePage.findUnique({ where: { tenantId } });
  if (!homePage) {
    homePage = await prisma.homePage.create({
      data: { tenantId, title: defaults?.title ?? "Fuzion", description: defaults?.description ?? "Desayunos y meriendas" },
    });
  }
  return toDTO(homePage);
}

export async function updateHomePage(input: HomePageUpdateInput, tenantId: string): Promise<HomePageDTO> {
  let homePage = await prisma.homePage.findUnique({ where: { tenantId } });
  if (!homePage) {
    homePage = await prisma.homePage.create({
      data: {
        tenantId,
        title: input.title ?? "Fuzion",
        description: input.description ?? "Desayunos y meriendas",
      },
    });
  } else {
    homePage = await prisma.homePage.update({
      where: { id: homePage.id },
      data: input,
    });
  }
  return toDTO(homePage);
}
