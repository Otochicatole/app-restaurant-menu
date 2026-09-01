import { createMenuEditorUseCases } from "../application/menu-editor-use-cases";
import { createTemplateUseCases } from "../application/template-use-cases";
import { PrismaMenuEditorRepository } from "./prisma-menu-editor-repository";
import { PrismaTemplateRepository } from "./prisma-template-repository";

const menuEditorRepository = new PrismaMenuEditorRepository();
const templateRepository = new PrismaTemplateRepository();
export const menuEditorService = createMenuEditorUseCases(menuEditorRepository);
export const menuTemplateService = createTemplateUseCases(templateRepository);
