import "server-only";

import { menuEditorService, menuTemplateService } from "./infrastructure/composition";

export * from "./contracts";
export { createTemplateDocument } from "./domain/template";
export { documentAssetIds, documentModalAssetIds, normalizeLegacyCanvasDocument, validateCanvasDocument } from "./domain/document-policy";
export { checksum } from "./infrastructure/prisma-menu-editor-repository";
export { TEMPLATE_PRESETS } from "./domain/template-presets";
export const menuEditor = menuEditorService;
export const menuTemplates = menuTemplateService;
