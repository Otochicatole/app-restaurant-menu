import type {
  CanvasDocumentV1,
  CreateMenuProjectCommand,
  MenuAssetKind,
  MenuAssetView,
  MenuProjectSummary,
  MenuProjectView,
  RestaurantProfile,
} from "../contracts";

export interface MenuEditorRepository {
  listProjects(tenantId: string): Promise<MenuProjectSummary[]>;
  getProject(tenantId: string, projectId: string): Promise<MenuProjectView | null>;
  getPrimaryProject(tenantId: string): Promise<MenuProjectView | null>;
  ensurePrimaryProject(tenantId: string, document: CanvasDocumentV1): Promise<MenuProjectView>;
  createProject(tenantId: string, input: CreateMenuProjectCommand, document: CanvasDocumentV1): Promise<MenuProjectView>;
  deleteProjects(tenantId: string, projectIds: string[]): Promise<{ deletedIds: string[]; remainingCount: number }>;
  saveDraft(tenantId: string, projectId: string, baseRevision: number, document: CanvasDocumentV1): Promise<MenuProjectView>;
  publish(tenantId: string, projectId: string, baseRevision: number, document: CanvasDocumentV1): Promise<MenuProjectView>;
  listAssets(tenantId: string, kind?: MenuAssetKind): Promise<MenuAssetView[]>;
  createAsset(input: {
    tenantId: string;
    kind: MenuAssetKind;
    name: string;
    mimeType: string;
    byteSize: number;
    checksum: string;
    storageKey: string;
    width?: number;
    height?: number;
  }): Promise<MenuAssetView>;
  deleteAsset(tenantId: string, assetId: string): Promise<void>;
  getAsset(tenantId: string, assetId: string, scope: "private" | "published", projectId?: string): Promise<{ storageKey: string; mimeType: string; name: string } | null>;
  getProfile(tenantId: string, projectId: string): Promise<RestaurantProfile>;
  updateProfile(tenantId: string, projectId: string, profile: RestaurantProfile): Promise<RestaurantProfile>;
  isSlugTaken(slug: string, excludeProjectId?: string, excludeTenantId?: string): Promise<boolean>;
  getTenantMultiMenuEnabled(tenantId: string): Promise<boolean>;
  getTenantMenuQuota(tenantId: string): Promise<{ multiMenuEnabled: boolean; maxMenus: number; currentMenus: number }>;
}
