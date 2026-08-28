import { z } from "zod";
import { BadRequestError } from "@/platform/application/errors";
import {
  createCustomFontSchema,
  selectFontSchema,
  updateMenuHeaderSchema,
  type CustomFontUpload,
  type SelectFontCommand,
  type UpdateMenuHeaderCommand,
} from "../contracts";
import type { MenuCustomizationRepository } from "./ports";
import { FontPolicyViolation, validateFontUpload } from "../domain/font-policy";

export function createMenuCustomizationUseCases(repository: MenuCustomizationRepository) {
  return {
    getHeader: (tenantId: string) => repository.getHeader(z.string().min(1).parse(tenantId)),
    updateHeader: (tenantId: string, input: UpdateMenuHeaderCommand) =>
      repository.updateHeader(z.string().min(1).parse(tenantId), updateMenuHeaderSchema.parse(input)),
    listFonts: (tenantId: string) => repository.listFonts(z.string().min(1).parse(tenantId)),
    getFontSelection: (tenantId: string) => repository.getFontSelection(z.string().min(1).parse(tenantId)),
    selectFont: (tenantId: string, input: SelectFontCommand) =>
      repository.selectFont(z.string().min(1).parse(tenantId), selectFontSchema.parse(input)),
    createCustomFont: (tenantId: string, input: CustomFontUpload) => {
      const metadata = createCustomFontSchema.parse(input);
      try {
        validateFontUpload(input.file);
      } catch (error) {
        if (error instanceof FontPolicyViolation) throw new BadRequestError(error.message);
        throw error;
      }
      return repository.createCustomFont(z.string().min(1).parse(tenantId), { ...input, ...metadata });
    },
    deleteCustomFont: (tenantId: string, fontId: string) =>
      repository.deleteCustomFont(z.string().min(1).parse(tenantId), z.string().min(1).parse(fontId)),
    getCustomFontAsset: (tenantId: string, fontId: string) =>
      repository.getCustomFontAsset(z.string().min(1).parse(tenantId), z.string().min(1).parse(fontId)),
  };
}
