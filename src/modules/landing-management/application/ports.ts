import type {
  CreateCustomModuleCommand,
  CreateLandingTemplateCommand,
  LandingCustomModuleView,
  LandingDocumentV1,
  LandingPageData,
  LandingTemplateView,
  PublishLandingCommand,
  SaveLandingCommand,
  SuperadminLandingTemplateList,
  SuperadminLandingTemplateQuery,
} from "../contracts";
import type { PortableLandingTemplate } from "../domain/landing-template-bundle";

export type RestaurantInfo = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  landingSlug: string;
  status: string;
  organizationStatus: string;
  landingEnabled: boolean;
};

export type LandingTemplateCreateInput = CreateLandingTemplateCommand & {
  restaurantId: string;
  document: LandingDocumentV1;
  htmlContent: string;
  cssContent: string;
  jsContent: string;
};

export interface LandingRepository {
  findByRestaurantId(restaurantId: string): Promise<LandingPageData | null>;
  save(command: SaveLandingCommand): Promise<LandingPageData>;
  publish(
    command: PublishLandingCommand,
    compiledHtml: string,
  ): Promise<LandingPageData>;
  getPublishedHtmlFromStorage(restaurantId: string): Promise<string | null>;
  findRestaurantByLandingSlug(slug: string): Promise<RestaurantInfo | null>;
  findRestaurantById(restaurantId: string): Promise<RestaurantInfo | null>;
  isLandingEnabledForRestaurant(restaurantId: string): Promise<boolean>;

  // Reusable Custom Modules
  listCustomModules(restaurantId: string): Promise<LandingCustomModuleView[]>;
  createCustomModule(
    command: CreateCustomModuleCommand,
  ): Promise<LandingCustomModuleView>;
  deleteCustomModule(restaurantId: string, moduleId: string): Promise<void>;

  // Landing Templates
  listTemplates(restaurantId: string): Promise<LandingTemplateView[]>;
  createPrivateTemplate(
    input: LandingTemplateCreateInput,
  ): Promise<LandingTemplateView>;
  submitPublicTemplate(
    input: LandingTemplateCreateInput,
  ): Promise<LandingTemplateView>;
  deletePrivateTemplate(restaurantId: string, templateId: string): Promise<void>;
  exportPortableTemplate(
    restaurantId: string,
    templateId: string,
  ): Promise<PortableLandingTemplate>;
  importPortableTemplate(
    restaurantId: string,
    portable: PortableLandingTemplate,
  ): Promise<LandingTemplateView>;
  listTemplatesForSuperadmin(
    query: SuperadminLandingTemplateQuery,
  ): Promise<SuperadminLandingTemplateList>;
  moderateTemplate(
    templateId: string,
    action: "publish" | "reject" | "archive" | "restore",
    reason?: string,
  ): Promise<LandingTemplateView>;
  deletePublicTemplate(templateId: string): Promise<void>;
}
