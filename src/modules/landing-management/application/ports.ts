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

export type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  status: string;
  landingEnabled: boolean;
};

export type LandingTemplateCreateInput = CreateLandingTemplateCommand & {
  tenantId: string;
  document: LandingDocumentV1;
  htmlContent: string;
  cssContent: string;
  jsContent: string;
};

export interface LandingRepository {
  findByTenantId(tenantId: string): Promise<LandingPageData | null>;
  save(command: SaveLandingCommand): Promise<LandingPageData>;
  publish(
    command: PublishLandingCommand,
    compiledHtml: string,
  ): Promise<LandingPageData>;
  getPublishedHtmlFromStorage(tenantId: string): Promise<string | null>;
  findTenantBySlug(slug: string): Promise<TenantInfo | null>;
  findTenantById(tenantId: string): Promise<TenantInfo | null>;
  isLandingEnabledForTenant(tenantId: string): Promise<boolean>;

  // Reusable Custom Modules
  listCustomModules(tenantId: string): Promise<LandingCustomModuleView[]>;
  createCustomModule(
    command: CreateCustomModuleCommand,
  ): Promise<LandingCustomModuleView>;
  deleteCustomModule(tenantId: string, moduleId: string): Promise<void>;

  // Landing Templates
  listTemplates(tenantId: string): Promise<LandingTemplateView[]>;
  createPrivateTemplate(
    input: LandingTemplateCreateInput,
  ): Promise<LandingTemplateView>;
  submitPublicTemplate(
    input: LandingTemplateCreateInput,
  ): Promise<LandingTemplateView>;
  deletePrivateTemplate(tenantId: string, templateId: string): Promise<void>;
  exportPortableTemplate(
    tenantId: string,
    templateId: string,
  ): Promise<PortableLandingTemplate>;
  importPortableTemplate(
    tenantId: string,
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
