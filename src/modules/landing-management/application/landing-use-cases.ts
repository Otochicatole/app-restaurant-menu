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
import type { LandingRepository, RestaurantInfo } from "./ports";
import {
  getLandingRouteContext,
  recontextualizeLandingDocument,
  recontextualizeLandingSource,
  rewriteLandingRoutes,
} from "../domain/landing-route-context";

function normalizeLandingCommandRoutes<T extends SaveLandingCommand>(command: T, restaurant: RestaurantInfo): T {
  const current = { menuSlug: restaurant.slug, landingSlug: restaurant.landingSlug };
  const previous = getLandingRouteContext(command.htmlContent) ?? current;
  return {
    ...command,
    htmlContent: recontextualizeLandingSource(command.htmlContent, current, previous),
    cssContent: rewriteLandingRoutes(command.cssContent, previous, current),
    jsContent: rewriteLandingRoutes(command.jsContent, previous, current),
    ...(command.document ? { document: recontextualizeLandingDocument(command.document, previous, current) } : {}),
  };
}

export type LandingEditorView = {
  landingPage: LandingPageData;
  customModules: LandingCustomModuleView[];
  templates: LandingTemplateView[];
  restaurant: {
    id: string;
    name: string;
    slug: string;
    landingSlug: string;
    landingEnabled: boolean;
  };
  hasPublishedStorage: boolean;
};

export function createLandingUseCases(repository: LandingRepository) {
  return {
    async getLandingEditorData(restaurantId: string): Promise<LandingEditorView> {
      const restaurant = await repository.findRestaurantById(restaurantId);
      if (!restaurant) {
        throw new Error("Negocio no encontrado");
      }

      const [existing, hasStorageHtml, customModules, templates] =
        await Promise.all([
          repository.findByRestaurantId(restaurantId),
          repository.getPublishedHtmlFromStorage(restaurantId),
          repository.listCustomModules(restaurantId),
          repository.listTemplates(restaurantId),
        ]);

      const hasPublishedStorage = Boolean(hasStorageHtml);
      const defaultCode = createDefaultLandingTemplate(
        restaurant.name,
        restaurant.landingSlug,
        restaurant.slug,
      );

      if (existing) {
        const current = { menuSlug: restaurant.slug, landingSlug: restaurant.landingSlug };
        const previous = getLandingRouteContext(existing.htmlContent)
          ?? getLandingRouteContext(hasStorageHtml ?? "") ?? current;
        return {
          landingPage: {
            ...existing,
            document: recontextualizeLandingDocument(existing.document ?? defaultCode.document, previous, current),
            htmlContent: recontextualizeLandingSource(existing.htmlContent, current, previous),
            cssContent: rewriteLandingRoutes(existing.cssContent, previous, current),
            jsContent: rewriteLandingRoutes(existing.jsContent, previous, current),
          },
          customModules,
          templates,
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
            landingSlug: restaurant.landingSlug,
            landingEnabled: restaurant.landingEnabled,
          },
          hasPublishedStorage,
        };
      }

      const initialLanding: LandingPageData = {
        id: "draft-initial",
        restaurantId: restaurant.id,
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
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          landingSlug: restaurant.landingSlug,
          landingEnabled: restaurant.landingEnabled,
        },
        hasPublishedStorage,
      };
    },

    async saveDraft(input: SaveLandingCommand): Promise<LandingPageData> {
      const command = saveLandingCommandSchema.parse(input);
      const restaurant = await repository.findRestaurantById(command.restaurantId);
      return repository.save(restaurant ? normalizeLandingCommandRoutes(command, restaurant) : command);
    },

    async publishLanding(
      input: PublishLandingCommand,
    ): Promise<LandingPageData> {
      const parsed = publishLandingCommandSchema.parse(input);
      const restaurant = await repository.findRestaurantById(parsed.restaurantId);
      const command = restaurant ? normalizeLandingCommandRoutes(parsed, restaurant) : parsed;
      const title = restaurant?.name || "Restaurante";

      const compiledHtml = compileLandingDocument({
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        title,
      });

      return repository.publish(command, restaurant
        ? recontextualizeLandingSource(compiledHtml, { menuSlug: restaurant.slug, landingSlug: restaurant.landingSlug })
        : compiledHtml);
    },

    async getPublicLanding(slug: string): Promise<PublicLandingResult> {
      const restaurant = await repository.findRestaurantByLandingSlug(slug);
      if (!restaurant) {
        return { kind: "not_found" };
      }

      if (
        restaurant.status !== "ACTIVE" ||
        restaurant.organizationStatus !== "ACTIVE" ||
        !restaurant.landingEnabled
      ) {
        return { kind: "disabled" };
      }

      const dbRecord = await repository.findByRestaurantId(restaurant.id);
      if (!dbRecord?.published) {
        return {
          kind: "preparation",
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.landingSlug,
          menuSlug: restaurant.slug,
        };
      }

      const publishedHtml = await repository.getPublishedHtmlFromStorage(
        restaurant.id,
      );
      const current = { menuSlug: restaurant.slug, landingSlug: restaurant.landingSlug };
      if (!publishedHtml) {
        const compiledHtml = recontextualizeLandingSource(compileLandingDocument({
          htmlContent: dbRecord.htmlContent,
          cssContent: dbRecord.cssContent,
          jsContent: dbRecord.jsContent,
          title: restaurant.name,
        }), current);
        await repository.publish(
          {
            restaurantId: restaurant.id,
            htmlContent: dbRecord.htmlContent,
            cssContent: dbRecord.cssContent,
            jsContent: dbRecord.jsContent,
            document: dbRecord.document ?? undefined,
          },
          compiledHtml,
        );
        return {
          kind: "ready",
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.landingSlug,
          menuSlug: restaurant.slug,
          html: compiledHtml,
        };
      }

      return {
        kind: "ready",
        restaurantName: restaurant.name,
        restaurantSlug: restaurant.landingSlug,
        menuSlug: restaurant.slug,
        html: recontextualizeLandingSource(publishedHtml, current),
      };
    },

    async isLandingEnabled(restaurantId: string): Promise<boolean> {
      return repository.isLandingEnabledForRestaurant(restaurantId);
    },

    async isLandingPublished(restaurantId: string): Promise<boolean> {
      return Boolean((await repository.findByRestaurantId(restaurantId))?.published);
    },

    async getRestaurant(restaurantId: string): Promise<RestaurantInfo | null> {
      return repository.findRestaurantById(restaurantId);
    },

    async getRestaurantByLandingSlug(slug: string): Promise<RestaurantInfo | null> {
      return repository.findRestaurantByLandingSlug(slug);
    },

    // Reusable Custom Modules
    async listCustomModules(
      restaurantId: string,
    ): Promise<LandingCustomModuleView[]> {
      return repository.listCustomModules(z.string().min(1).parse(restaurantId));
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
      restaurantId: string,
      moduleId: string,
    ): Promise<void> {
      return repository.deleteCustomModule(
        z.string().min(1).parse(restaurantId),
        z.string().min(1).parse(moduleId),
      );
    },

    // Landing Templates
    async listTemplates(restaurantId: string): Promise<LandingTemplateView[]> {
      return repository.listTemplates(z.string().min(1).parse(restaurantId));
    },

    async createTemplate(
      restaurantId: string,
      document: LandingDocumentV1,
      input: CreateLandingTemplateCommand,
    ): Promise<LandingTemplateView> {
      const id = z.string().min(1).parse(restaurantId);
      const validDocument = landingDocumentSchema.parse(document);
      const command = createLandingTemplateSchema.parse(input);
      const restaurant = await repository.findRestaurantById(id);
      const compiled = compileLandingFromDocument(validDocument, {
        restaurantName: restaurant?.name ?? command.name,
        restaurantSlug: restaurant?.landingSlug ?? "restaurante",
        menuSlug: restaurant?.slug ?? "restaurante",
      });

      const payload = {
        ...command,
        restaurantId: id,
        document: validDocument,
        htmlContent: recontextualizeLandingSource(compiled.htmlContent, {
          menuSlug: restaurant?.slug ?? "restaurante",
          landingSlug: restaurant?.landingSlug ?? "restaurante",
        }),
        cssContent: compiled.cssContent,
        jsContent: compiled.jsContent,
      };

      if (command.submitPublic) {
        return repository.submitPublicTemplate(payload);
      }
      return repository.createPrivateTemplate(payload);
    },

    async deletePrivateTemplate(
      restaurantId: string,
      templateId: string,
    ): Promise<void> {
      return repository.deletePrivateTemplate(
        z.string().min(1).parse(restaurantId),
        z.string().min(1).parse(templateId),
      );
    },

    async exportTemplate(
      restaurantId: string,
      templateId: string,
    ): Promise<{ bytes: Uint8Array; filename: string }> {
      const portable = await repository.exportPortableTemplate(
        z.string().min(1).parse(restaurantId),
        z.string().min(1).parse(templateId),
      );
      return {
        bytes: encodeLandingTemplateBundle(portable),
        filename: landingTemplateBundleFilename(portable.name),
      };
    },

    async importTemplate(
      restaurantId: string,
      bytes: Uint8Array,
    ): Promise<LandingTemplateView> {
      const portable = decodeLandingTemplateBundle(bytes);
      return repository.importPortableTemplate(
        z.string().min(1).parse(restaurantId),
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
