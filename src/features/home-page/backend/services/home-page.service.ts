import { prisma } from "@/shared/backend/database/prisma";
import type { HomePageInput, HomePageUpdateInput } from "../schemas/home-page.schema";
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

export async function getOrCreateHomePage(): Promise<HomePageDTO> {
  let homePage = await prisma.homePage.findFirst();
  if (!homePage) {
    homePage = await prisma.homePage.create({
      data: { title: "Fuzion", description: "Desayunos y meriendas" },
    });
  }
  return toDTO(homePage);
}

export async function updateHomePage(input: HomePageUpdateInput): Promise<HomePageDTO> {
  let homePage = await prisma.homePage.findFirst();
  if (!homePage) {
    homePage = await prisma.homePage.create({
      data: {
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
