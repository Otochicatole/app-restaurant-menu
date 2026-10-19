import { z } from "zod";
import { BadRequestError } from "@/platform/application/errors";
import {
  createCustomModuleCommandSchema,
  createLandingTemplateSchema,
  landingDocumentSchema,
  publishLandingCommandSchema,
  saveLandingCommandSchema,
  superadminLandingTemplateQuerySchema,
  type CreateCustomModuleCommand,
  type CreateLandingTemplateCommand,
  type LandingCustomModuleView,
  type LandingDocumentV1,
  type LandingPageData,
  type LandingTemplateView,
  type PublicLandingResult,
  type PublishLandingCommand,
  type SaveLandingCommand,
} from "../contracts";
import {
  compileLandingDocument,
  compileLandingFromDocument,
  createDefaultLandingTemplate,
  syncFieldsWithHtmlTemplate,
} from "../domain/landing-compiler";
import {
  decodeLandingTemplateBundle,
  encodeLandingTemplateBundle,
  landingTemplateBundleFilename,
} from "../domain/landing-template-bundle";
import type { LandingRepository, TenantInfo } from "./ports";

export type LandingEditorView = {
  landingPage: LandingPageData;
  customModules: LandingCustomModuleView[];
  templates: LandingTemplateView[];
  tenant: {
    id: string;
    name: string;
    slug: string;
    landingEnabled: boolean;
  };
  hasPublishedStorage: boolean;
};

export function createLandingUseCases(repository: LandingRepository) {
  return {
    async getLandingEditorData(tenantId: string): Promise<LandingEditorView> {
      const tenant = await repository.findTenantById(tenantId);
      if (!tenant) {
        throw new Error("Negocio no encontrado");
      }

      const [existing, hasStorageHtml, customModules, templates] =
        await Promise.all([
          repository.findByTenantId(tenantId),
          repository.getPublishedHtmlFromStorage(tenantId),
          repository.listCustomModules(tenantId),
          repository.listTemplates(tenantId),
        ]);

      const hasPublishedStorage = Boolean(hasStorageHtml);
      const defaultCode = createDefaultLandingTemplate(
        tenant.name,
        tenant.slug,
      );

      if (existing) {
        return {
          landingPage: {
            ...existing,
            document: existing.document ?? defaultCode.document,
          },
          customModules,
          templates,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            landingEnabled: tenant.landingEnabled,
          },
          hasPublishedStorage,
        };
      }

      const initialLanding: LandingPageData = {
        id: "draft-initial",
        tenantId: tenant.id,
        document: defaultCode.document,
        htmlContent: defaultCode.html,
        cssContent: defaultCode.css,
        jsContent: defaultCode.js,
        published: false,
        publishedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        landingPage: initialLanding,
        customModules,
        templates,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          landingEnabled: tenant.landingEnabled,
        },
        hasPublishedStorage,
      };
    },

    async saveDraft(input: SaveLandingCommand): Promise<LandingPageData> {
      const command = saveLandingCommandSchema.parse(input);
      return repository.save(command);
    },

    async publishLanding(
      input: PublishLandingCommand,
    ): Promise<LandingPageData> {
      const command = publishLandingCommandSchema.parse(input);
      const tenant = await repository.findTenantById(command.tenantId);
      const title = tenant?.name || "Restaurante";

      const compiledHtml = compileLandingDocument({
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        title,
      });

      return repository.publish(command, compiledHtml);
    },

    async getPublicLanding(slug: string): Promise<PublicLandingResult> {
      const tenant = await repository.findTenantBySlug(slug);
      if (!tenant) {
        return { kind: "not_found" };
      }

      if (tenant.status !== "ACTIVE" || !tenant.landingEnabled) {
        return { kind: "disabled" };
      }

      const publishedHtml = await repository.getPublishedHtmlFromStorage(
        tenant.id,
      );
      if (!publishedHtml) {
        const dbRecord = await repository.findByTenantId(tenant.id);
        if (dbRecord?.published) {
          const compiledHtml = compileLandingDocument({
            htmlContent: dbRecord.htmlContent,
            cssContent: dbRecord.cssContent,
            jsContent: dbRecord.jsContent,
            title: tenant.name,
          });
          await repository.publish(
            {
              tenantId: tenant.id,
              htmlContent: dbRecord.htmlContent,
              cssContent: dbRecord.cssContent,
              jsContent: dbRecord.jsContent,
              document: dbRecord.document ?? undefined,
            },
            compiledHtml,
          );
          return {
            kind: "ready",
            restaurantName: tenant.name,
            restaurantSlug: tenant.slug,
            html: compiledHtml,
          };
        }

        return {
          kind: "preparation",
          restaurantName: tenant.name,
          restaurantSlug: tenant.slug,
        };
      }

      return {
        kind: "ready",
        restaurantName: tenant.name,
        restaurantSlug: tenant.slug,
        html: publishedHtml,
      };
    },

    async isLandingEnabled(tenantId: string): Promise<boolean> {
      return repository.isLandingEnabledForTenant(tenantId);
    },

    async getTenant(tenantId: string): Promise<TenantInfo | null> {
      return repository.findTenantById(tenantId);
    },

    async getTenantBySlug(slug: string): Promise<TenantInfo | null> {
      return repository.findTenantBySlug(slug);
    },

    // Reusable Custom Modules
    async listCustomModules(
      tenantId: string,
    ): Promise<LandingCustomModuleView[]> {
      return repository.listCustomModules(z.string().min(1).parse(tenantId));
    },

    async createCustomModule(
      input: CreateCustomModuleCommand,
    ): Promise<LandingCustomModuleView> {
      const command = createCustomModuleCommandSchema.parse(input);
      const { fields } = syncFieldsWithHtmlTemplate(
        command.fields,
        {},
        command.htmlTemplate,
      );
      return repository.createCustomModule({
        ...command,
        fields,
      });
    },

    async deleteCustomModule(
      tenantId: string,
      moduleId: string,
    ): Promise<void> {
      return repository.deleteCustomModule(
        z.string().min(1).parse(tenantId),
        z.string().min(1).parse(moduleId),
      );
    },

    // Landing Templates
    async listTemplates(tenantId: string): Promise<LandingTemplateView[]> {
      return repository.listTemplates(z.string().min(1).parse(tenantId));
    },

    async createTemplate(
      tenantId: string,
      document: LandingDocumentV1,
      input: CreateLandingTemplateCommand,
    ): Promise<LandingTemplateView> {
      const id = z.string().min(1).parse(tenantId);
      const validDocument = landingDocumentSchema.parse(document);
      const command = createLandingTemplateSchema.parse(input);
      const tenant = await repository.findTenantById(id);
      const compiled = compileLandingFromDocument(validDocument, {
        restaurantName: tenant?.name ?? command.name,
        restaurantSlug: tenant?.slug ?? "restaurante",
      });

      const payload = {
        ...command,
        tenantId: id,
        document: validDocument,
        htmlContent: compiled.htmlContent,
        cssContent: compiled.cssContent,
        jsContent: compiled.jsContent,
      };

      if (command.submitPublic) {
        return repository.submitPublicTemplate(payload);
      }
      return repository.createPrivateTemplate(payload);
    },

    async deletePrivateTemplate(
      tenantId: string,
      templateId: string,
    ): Promise<void> {
      return repository.deletePrivateTemplate(
        z.string().min(1).parse(tenantId),
        z.string().min(1).parse(templateId),
      );
    },

    async exportTemplate(
      tenantId: string,
      templateId: string,
    ): Promise<{ bytes: Uint8Array; filename: string }> {
      const portable = await repository.exportPortableTemplate(
        z.string().min(1).parse(tenantId),
        z.string().min(1).parse(templateId),
      );
      return {
        bytes: encodeLandingTemplateBundle(portable),
        filename: landingTemplateBundleFilename(portable.name),
      };
    },

    async importTemplate(
      tenantId: string,
      bytes: Uint8Array,
    ): Promise<LandingTemplateView> {
      const portable = decodeLandingTemplateBundle(bytes);
      return repository.importPortableTemplate(
        z.string().min(1).parse(tenantId),
        portable,
      );
    },

    async listTemplatesForSuperadmin(input: unknown) {
      return repository.listTemplatesForSuperadmin(
        superadminLandingTemplateQuerySchema.parse(input),
      );
    },

    async moderateTemplate(
      templateId: string,
      action: "publish" | "reject" | "archive" | "restore",
      reason?: string,
    ): Promise<LandingTemplateView> {
      if (action === "reject" && !reason?.trim()) {
        throw new BadRequestError("Indicá un motivo de rechazo.");
      }
      return repository.moderateTemplate(
        z.string().min(1).parse(templateId),
        action,
        reason?.trim(),
      );
    },

    async deletePublicTemplate(templateId: string): Promise<void> {
      return repository.deletePublicTemplate(
        z.string().min(1).parse(templateId),
      );
    },
  };
}
