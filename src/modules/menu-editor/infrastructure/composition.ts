import { createMenuEditorUseCases } from "../application/menu-editor-use-cases";
import { PrismaMenuEditorRepository } from "./prisma-menu-editor-repository";

export const menuEditorService = createMenuEditorUseCases(new PrismaMenuEditorRepository());
