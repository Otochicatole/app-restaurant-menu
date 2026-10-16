import type {
  LandingPageData,
  PublishLandingCommand,
  SaveLandingCommand,
} from "../contracts";

export type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  status: string;
  landingEnabled: boolean;
};

export interface LandingRepository {
  findByTenantId(tenantId: string): Promise<LandingPageData | null>;
  save(command: SaveLandingCommand): Promise<LandingPageData>;
  publish(command: PublishLandingCommand, compiledHtml: string): Promise<LandingPageData>;
  getPublishedHtmlFromStorage(tenantId: string): Promise<string | null>;
  findTenantBySlug(slug: string): Promise<TenantInfo | null>;
  findTenantById(tenantId: string): Promise<TenantInfo | null>;
  isLandingEnabledForTenant(tenantId: string): Promise<boolean>;
}
