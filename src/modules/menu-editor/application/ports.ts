import type {
  CanvasDocumentV1,
  MenuAssetKind,
  MenuAssetView,
  MenuProjectSummary,
  MenuProjectView,
  RestaurantProfile,
} from "../contracts";

export interface MenuEditorRepository {
  listProjects(restaurantId: string): Promise<MenuProjectSummary[]>;
  getProject(restaurantId: string, projectId: string): Promise<MenuProjectView | null>;
  getPrimaryProject(restaurantId: string): Promise<MenuProjectView | null>;
  saveDraft(restaurantId: string, projectId: string, baseRevision: number, document: CanvasDocumentV1): Promise<MenuProjectView>;
  publish(restaurantId: string, projectId: string, baseRevision: number, document: CanvasDocumentV1): Promise<MenuProjectView>;
  listAssets(restaurantId: string, kind?: MenuAssetKind): Promise<MenuAssetView[]>;
  createAsset(input: {
    restaurantId: string;
    kind: MenuAssetKind;
    name: string;
    mimeType: string;
    byteSize: number;
    checksum: string;
    storageKey: string;
    width?: number;
    height?: number;
  }): Promise<MenuAssetView>;
  deleteAsset(restaurantId: string, assetId: string): Promise<void>;
  getAsset(restaurantId: string, assetId: string, scope: "private" | "published", projectId?: string): Promise<{ storageKey: string; mimeType: string; name: string } | null>;
  getProfile(restaurantId: string, projectId: string): Promise<RestaurantProfile>;
  updateProfile(restaurantId: string, projectId: string, profile: RestaurantProfile): Promise<RestaurantProfile>;
  isSlugTaken(slug: string, excludeProjectId?: string, excludeRestaurantId?: string): Promise<boolean>;
}
