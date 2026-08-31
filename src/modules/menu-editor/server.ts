import "server-only";

import { menuEditorService } from "./infrastructure/composition";

export * from "./contracts";
export { createTemplateDocument } from "./domain/template";
export { documentAssetIds, validateCanvasDocument } from "./domain/document-policy";
export { checksum } from "./infrastructure/prisma-menu-editor-repository";
export const menuEditor = menuEditorService;
