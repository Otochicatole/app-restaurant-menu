import { createMenuCustomizationUseCases } from "../application/menu-customization-use-cases";
import { PrismaMenuCustomizationRepository } from "./prisma-menu-customization-repository";

export const menuCustomizationService = createMenuCustomizationUseCases(
  new PrismaMenuCustomizationRepository(),
);
