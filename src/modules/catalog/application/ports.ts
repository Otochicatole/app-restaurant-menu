import type { GroupInput, GroupUpdateInput, ProductInput, ProductUpdateInput } from "../contracts";
import type { SupportedMediaType, ValidatedMedia } from "../domain/media-policy";

export interface GroupRecord {
  id: string;
  name: string;
  description: string;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductRecord {
  id: string;
  name: string;
  description: string;
  price: number;
  groupId: string;
  groupName: string;
  sortOrder: number;
  mediaKey: string | null;
  mediaType: SupportedMediaType | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductMediaReference {
  storageKey: string;
  mediaType: SupportedMediaType | null;
}

export interface CatalogRepository {
  listGroups(scope: { tenantId: string }): Promise<GroupRecord[]>;
  findGroup(scope: { tenantId: string; groupId: string }): Promise<GroupRecord | null>;
  createGroup(command: { tenantId: string; input: GroupInput }): Promise<GroupRecord>;
  updateGroup(command: { tenantId: string; groupId: string; input: GroupUpdateInput }): Promise<GroupRecord | null>;
  deleteGroup(command: { tenantId: string; groupId: string }): Promise<boolean>;
  countGroups(scope: { tenantId: string }): Promise<number>;

  listProducts(query: { tenantId: string; groupId?: string }): Promise<ProductRecord[]>;
  findProduct(query: { tenantId: string; productId: string }): Promise<ProductRecord | null>;
  createProduct(command: { tenantId: string; input: ProductInput }): Promise<ProductRecord>;
  updateProduct(command: { tenantId: string; productId: string; input: ProductUpdateInput }): Promise<ProductRecord | null>;
  deleteProduct(command: { tenantId: string; productId: string }): Promise<boolean>;
  replaceProductOrder(command: { tenantId: string; groupId: string; productIds: string[] }): Promise<void>;
  replaceProductMedia(command: {
    tenantId: string;
    productId: string;
    storageKey: string;
    mediaType: SupportedMediaType;
  }): Promise<ProductRecord | null>;
  removeProductMedia(command: { tenantId: string; productId: string }): Promise<ProductRecord | null>;
  findProductMedia(query: { tenantId: string; productId: string }): Promise<ProductMediaReference | null>;
  countProducts(scope: { tenantId: string }): Promise<number>;
}

export interface MediaMetadata {
  size: number;
  updatedAt: Date;
  contentType: string;
}

export interface ProductMediaStorage {
  putProductMedia(command: {
    tenantId: string;
    productId: string;
    definition: ValidatedMedia;
    content: Uint8Array;
  }): Promise<string>;
  open(storageKey: string, range?: { start: number; endInclusive: number }): ReadableStream<Uint8Array>;
  stat(storageKey: string): Promise<MediaMetadata | null>;
}

export type ProductMediaUrlFactory = (input: {
  tenantSlug: string;
  productId: string;
  version: number;
}) => string;
