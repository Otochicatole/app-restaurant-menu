import { z } from "zod";
import { BadRequestError } from "@/platform/application/errors";
import { createTemplateSchema, superadminTemplateQuerySchema, templateIdSchema, type CreateTemplateCommand } from "../contracts";
import { validateCanvasDocument } from "../domain/document-policy";
import { decodeTemplateBundle, encodeTemplateBundle, templateBundleFilename } from "../domain/template-bundle";
import type { TemplateRepository } from "./template-ports";

export function createTemplateUseCases(repository: TemplateRepository) {
  return {
    list(tenantId: string) { return repository.list(z.string().min(1).parse(tenantId)); },
    create(tenantId: string, document: unknown, input: CreateTemplateCommand) {
      const id = z.string().min(1).parse(tenantId);
      const command = createTemplateSchema.parse(input);
      const validDocument = validateCanvasDocument(document);
      if (command.submitPublic) return repository.submitPublic({ ...command, tenantId: id, document: validDocument });
      return repository.createPrivate({ ...command, tenantId: id, document: validDocument });
    },
    async export(tenantId: string, templateId: string) {
      const template = await repository.exportPortable(z.string().min(1).parse(tenantId), templateIdSchema.parse(templateId));
      return { bytes: encodeTemplateBundle(template), filename: templateBundleFilename(template.name) };
    },
    import(tenantId: string, bytes: Uint8Array) {
      return repository.importPortable(z.string().min(1).parse(tenantId), decodeTemplateBundle(bytes));
    },
    apply(tenantId: string, templateId: string) {
      return repository.apply(z.string().min(1).parse(tenantId), templateIdSchema.parse(templateId));
    },
    update(tenantId: string, templateId: string, input: { name?: string; description?: string }) {
      return repository.updatePrivate(z.string().min(1).parse(tenantId), templateIdSchema.parse(templateId), {
        name: input.name === undefined ? undefined : z.string().trim().min(1).max(120).parse(input.name),
        description: input.description === undefined ? undefined : z.string().trim().max(500).parse(input.description),
      });
    },
    delete(tenantId: string, templateId: string) { return repository.deletePrivate(z.string().min(1).parse(tenantId), templateIdSchema.parse(templateId)); },
    listPending() { return repository.listPending(); },
    listForSuperadmin(input: unknown) { return repository.listForSuperadmin(superadminTemplateQuerySchema.parse(input)); },
    deletePublic(templateId: string) { return repository.deletePublic(templateIdSchema.parse(templateId)); },
    moderate(templateId: string, action: "publish" | "reject" | "archive" | "restore", reason?: string) {
      if (action === "reject" && !reason?.trim()) throw new BadRequestError("Indica un motivo de rechazo.");
      return repository.moderate(templateIdSchema.parse(templateId), action, reason?.trim());
    },
  };
}
