import type { CanvasDocumentV1, MenuAssetKind, MenuAssetView, MenuProjectView, RestaurantProfile } from "../contracts";

export interface MenuEditorRepository {
  getProject(tenantId: string): Promise<MenuProjectView | null>;
  ensureProject(tenantId: string, document: CanvasDocumentV1): Promise<MenuProjectView>;
  saveDraft(tenantId: string, baseRevision: number, document: CanvasDocumentV1): Promise<MenuProjectView>;
  publish(tenantId: string, baseRevision: number): Promise<MenuProjectView>;
  listAssets(tenantId: string, kind?: MenuAssetKind): Promise<MenuAssetView[]>;
  createAsset(input: { tenantId: string; kind: MenuAssetKind; name: string; mimeType: string; byteSize: number; checksum: string; storageKey: string; width?: number; height?: number }): Promise<MenuAssetView>;
  deleteAsset(tenantId: string, assetId: string): Promise<void>;
  getAsset(tenantId: string, assetId: string, scope: "private" | "published"): Promise<{ storageKey: string; mimeType: string; name: string } | null>;
  getProfile(tenantId: string): Promise<RestaurantProfile>;
  updateProfile(tenantId: string, profile: RestaurantProfile): Promise<RestaurantProfile>;
}
