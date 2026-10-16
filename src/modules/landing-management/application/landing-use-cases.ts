import {
  publishLandingCommandSchema,
  saveLandingCommandSchema,
  type LandingPageData,
  type PublicLandingResult,
  type PublishLandingCommand,
  type SaveLandingCommand,
} from "../contracts";
import {
  compileLandingDocument,
  createDefaultLandingTemplate,
} from "../domain/landing-compiler";
import type { LandingRepository, TenantInfo } from "./ports";

export type LandingEditorView = {
  landingPage: LandingPageData;
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

      const existing = await repository.findByTenantId(tenantId);
      const hasPublishedStorage = Boolean(
        await repository.getPublishedHtmlFromStorage(tenantId),
      );

      if (existing) {
        return {
          landingPage: existing,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            landingEnabled: tenant.landingEnabled,
          },
          hasPublishedStorage,
        };
      }

      // Generate default starter template tailored to this restaurant
      const defaultCode = createDefaultLandingTemplate(tenant.name, tenant.slug);
      const initialLanding: LandingPageData = {
        id: "draft-initial",
        tenantId: tenant.id,
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

    async publishLanding(input: PublishLandingCommand): Promise<LandingPageData> {
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

      const publishedHtml = await repository.getPublishedHtmlFromStorage(tenant.id);
      if (!publishedHtml) {
        // Also check if database has a published record that wasn't synced
        const dbRecord = await repository.findByTenantId(tenant.id);
        if (dbRecord?.published) {
          const compiledHtml = compileLandingDocument({
            htmlContent: dbRecord.htmlContent,
            cssContent: dbRecord.cssContent,
            jsContent: dbRecord.jsContent,
            title: tenant.name,
          });
          // Resync storage
          await repository.publish(
            {
              tenantId: tenant.id,
              htmlContent: dbRecord.htmlContent,
              cssContent: dbRecord.cssContent,
              jsContent: dbRecord.jsContent,
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
  };
}
