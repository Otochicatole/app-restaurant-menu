import { BadRequestError, NotFoundError } from "../../../platform/application/errors";
import type {
  CatalogSnapshot,
  CatalogSnapshotCommand,
  CreateGroupCommand,
  CreateProductCommand,
  DeleteGroupCommand,
  DeleteProductCommand,
  GetGroupCommand,
  GetProductCommand,
  GroupView,
  ListGroupsCommand,
  ListProductsCommand,
  ProductMediaCommand,
  ProductView,
  RemoveProductMediaCommand,
  ReorderProductsCommand,
  SaveProductMediaCommand,
  UpdateGroupCommand,
  UpdateProductCommand,
} from "../contracts";
import { CatalogRuleViolation } from "../domain/catalog-rules";
import { validateProductMedia } from "../domain/media-policy";
import type { CatalogRepository, GroupRecord, ProductMediaStorage, ProductMediaUrlFactory, ProductRecord } from "./ports";

export interface ProductMediaDescriptor {
  contentType: string;
  etag: string;
  lastModified: Date;
  mediaType: "image" | "video" | null;
  size: number;
}

export interface CatalogService {
  listGroups(command: ListGroupsCommand): Promise<GroupView[]>;
  getGroup(command: GetGroupCommand): Promise<GroupView>;
  createGroup(command: CreateGroupCommand): Promise<GroupView>;
  updateGroup(command: UpdateGroupCommand): Promise<GroupView>;
  deleteGroup(command: DeleteGroupCommand): Promise<void>;
  countGroups(command: ListGroupsCommand): Promise<number>;
  listProducts(command: ListProductsCommand): Promise<ProductView[]>;
  getProduct(command: GetProductCommand): Promise<ProductView>;
  createProduct(command: CreateProductCommand): Promise<ProductView>;
  updateProduct(command: UpdateProductCommand): Promise<ProductView>;
  deleteProduct(command: DeleteProductCommand): Promise<void>;
  reorderProducts(command: ReorderProductsCommand): Promise<void>;
  countProducts(command: ListGroupsCommand): Promise<number>;
  getSnapshot(command: CatalogSnapshotCommand): Promise<CatalogSnapshot>;
  saveProductMedia(command: SaveProductMediaCommand): Promise<ProductView>;
  removeProductMedia(command: RemoveProductMediaCommand): Promise<ProductView>;
  getProductMediaDescriptor(command: ProductMediaCommand): Promise<ProductMediaDescriptor | null>;
  openProductMedia(command: ProductMediaCommand & { range?: { start: number; endInclusive: number } }): Promise<ReadableStream<Uint8Array> | null>;
}

export function createCatalogService(dependencies: {
  repository: CatalogRepository;
  mediaStorage: ProductMediaStorage;
  productMediaUrl: ProductMediaUrlFactory;
}): CatalogService {
  const { repository, mediaStorage, productMediaUrl } = dependencies;

  const toProductView = (record: ProductRecord, tenantSlug: string): ProductView => ({
    id: record.id,
    name: record.name,
    description: record.description,
    price: record.price,
    groupId: record.groupId,
    sortOrder: record.sortOrder,
    groupName: record.groupName,
    mediaUrl: record.mediaKey
      ? productMediaUrl({ tenantSlug, productId: record.id, version: record.updatedAt.getTime() })
      : null,
    mediaType: record.mediaType,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });

  return {
    async listGroups(command) {
      return (await repository.listGroups(command)).map(toGroupView);
    },

    async getGroup(command) {
      const group = await repository.findGroup(command);
      if (!group) throw new NotFoundError("Group");
      return toGroupView(group);
    },

    async createGroup(command) {
      return toGroupView(await repository.createGroup(command));
    },

    async updateGroup(command) {
      const group = await repository.updateGroup(command);
      if (!group) throw new NotFoundError("Group");
      return toGroupView(group);
    },

    async deleteGroup(command) {
      if (!(await repository.deleteGroup(command))) throw new NotFoundError("Group");
    },

    countGroups(command) {
      return repository.countGroups(command);
    },

    async listProducts(command) {
      const products = await repository.listProducts(command);
      return products.map((product) => toProductView(product, command.tenantSlug));
    },

    async getProduct(command) {
      const product = await repository.findProduct(command);
      if (!product) throw new NotFoundError("Product");
      return toProductView(product, command.tenantSlug);
    },

    async createProduct(command) {
      const product = await repository.createProduct(command);
      return toProductView(product, command.tenantSlug);
    },

    async updateProduct(command) {
      const product = await repository.updateProduct(command);
      if (!product) throw new NotFoundError("Product");
      return toProductView(product, command.tenantSlug);
    },

    async deleteProduct(command) {
      if (!(await repository.deleteProduct(command))) throw new NotFoundError("Product");
    },

    async reorderProducts(command) {
      try {
        await repository.replaceProductOrder(command);
      } catch (error) {
        if (error instanceof CatalogRuleViolation) throw new BadRequestError(error.message);
        throw error;
      }
    },

    countProducts(command) {
      return repository.countProducts(command);
    },

    async getSnapshot(command) {
      const [groups, products] = await Promise.all([
        repository.listGroups(command),
        repository.listProducts({ tenantId: command.tenantId, groupId: command.groupId }),
      ]);
      return {
        groups: groups.map(toGroupView),
        products: products.map((product) => toProductView(product, command.tenantSlug)),
      };
    },

    async saveProductMedia(command) {
      let definition;
      try {
        definition = validateProductMedia(command.file);
      } catch (error) {
        if (error instanceof CatalogRuleViolation) throw new BadRequestError(error.message);
        throw error;
      }

      const existing = await repository.findProduct({ tenantId: command.tenantId, productId: command.productId });
      if (!existing) throw new NotFoundError("Product");

      const storageKey = await mediaStorage.putProductMedia({
        tenantId: command.tenantId,
        productId: command.productId,
        definition,
        content: command.file.content,
      });

      // The new blob is written before the reference changes. The repository atomically
      // commits the new reference and enqueues cleanup for the previous blob.
      const product = await repository.replaceProductMedia({
        tenantId: command.tenantId,
        productId: command.productId,
        storageKey,
        mediaType: definition.mediaType,
      });
      if (!product) throw new NotFoundError("Product");
      return toProductView(product, command.tenantSlug);
    },

    async removeProductMedia(command) {
      const product = await repository.removeProductMedia(command);
      if (!product) throw new NotFoundError("Product");
      return toProductView(product, command.tenantSlug);
    },

    async getProductMediaDescriptor(command) {
      const media = await repository.findProductMedia(command);
      if (!media) return null;
      const metadata = await mediaStorage.stat(media.storageKey);
      if (!metadata) return null;
      return {
        contentType: metadata.contentType,
        etag: `\"${metadata.size.toString(16)}-${metadata.updatedAt.getTime().toString(16)}\"`,
        lastModified: metadata.updatedAt,
        mediaType: media.mediaType,
        size: metadata.size,
      };
    },

    async openProductMedia(command) {
      const media = await repository.findProductMedia(command);
      if (!media) return null;
      return mediaStorage.open(media.storageKey, command.range);
    },
  };
}

function toGroupView(record: GroupRecord): GroupView {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    productCount: record.productCount,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
