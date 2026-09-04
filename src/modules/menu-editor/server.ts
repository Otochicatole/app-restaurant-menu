import "server-only";

import { menuEditorService, menuTemplateService } from "./infrastructure/composition";

export * from "./contracts";
export { createTemplateDocument } from "./domain/template";
export { documentAssetIds, documentBackgroundImageAssetIds, documentModalAssetIds, normalizeLegacyCanvasDocument, validateCanvasDocument } from "./domain/document-policy";
export { MAX_TEMPLATE_BUNDLE_BYTES, TEMPLATE_BUNDLE_EXTENSION, TEMPLATE_BUNDLE_MIME_TYPE } from "./domain/template-bundle";
export { checksum } from "./infrastructure/prisma-menu-editor-repository";
export { TEMPLATE_PRESETS } from "./domain/template-presets";
export const menuEditor = menuEditorService;
export const menuTemplates = menuTemplateService;
