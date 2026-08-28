import "server-only";

import {
  catalogSnapshotCommandSchema,
  createGroupCommandSchema,
  createProductCommandSchema,
  deleteGroupCommandSchema,
  deleteProductCommandSchema,
  getGroupCommandSchema,
  getProductCommandSchema,
  listGroupsCommandSchema,
  listProductsCommandSchema,
  productMediaCommandSchema,
  removeProductMediaCommandSchema,
  reorderProductsCommandSchema,
  saveProductMediaCommandSchema,
  updateGroupCommandSchema,
  updateProductCommandSchema,
  type CatalogSnapshotCommand,
  type CreateGroupCommand,
  type CreateProductCommand,
  type DeleteGroupCommand,
  type DeleteProductCommand,
  type GetGroupCommand,
  type GetProductCommand,
  type ListGroupsCommand,
  type ListProductsCommand,
  type ProductMediaCommand,
  type RemoveProductMediaCommand,
  type ReorderProductsCommand,
  type SaveProductMediaCommand,
  type UpdateGroupCommand,
  type UpdateProductCommand,
} from "./contracts";
import { catalogService } from "./infrastructure/composition";

export {
  createCatalogGroup,
  createCatalogProduct,
  removeCatalogGroup,
  removeCatalogProduct,
  reorderCatalogProducts,
  updateCatalogGroup,
  updateCatalogProduct,
} from "./presentation/actions";

export function listGroups(command: ListGroupsCommand) {
  return catalogService.listGroups(listGroupsCommandSchema.parse(command));
}

export function getGroup(command: GetGroupCommand) {
  return catalogService.getGroup(getGroupCommandSchema.parse(command));
}

export function createGroup(command: CreateGroupCommand) {
  return catalogService.createGroup(createGroupCommandSchema.parse(command));
}

export function updateGroup(command: UpdateGroupCommand) {
  return catalogService.updateGroup(updateGroupCommandSchema.parse(command));
}

export function deleteGroup(command: DeleteGroupCommand) {
  return catalogService.deleteGroup(deleteGroupCommandSchema.parse(command));
}

export function countGroups(command: ListGroupsCommand) {
  return catalogService.countGroups(listGroupsCommandSchema.parse(command));
}

export function listProducts(command: ListProductsCommand) {
  return catalogService.listProducts(listProductsCommandSchema.parse(command));
}

export function getProduct(command: GetProductCommand) {
  return catalogService.getProduct(getProductCommandSchema.parse(command));
}

export function createProduct(command: CreateProductCommand) {
  return catalogService.createProduct(createProductCommandSchema.parse(command));
}

export function updateProduct(command: UpdateProductCommand) {
  return catalogService.updateProduct(updateProductCommandSchema.parse(command));
}

export function deleteProduct(command: DeleteProductCommand) {
  return catalogService.deleteProduct(deleteProductCommandSchema.parse(command));
}

export function reorderProducts(command: ReorderProductsCommand) {
  return catalogService.reorderProducts(reorderProductsCommandSchema.parse(command));
}

export function countProducts(command: ListGroupsCommand) {
  return catalogService.countProducts(listGroupsCommandSchema.parse(command));
}

export function getCatalogSnapshot(command: CatalogSnapshotCommand) {
  return catalogService.getSnapshot(catalogSnapshotCommandSchema.parse(command));
}

export function saveProductMedia(command: SaveProductMediaCommand) {
  return catalogService.saveProductMedia(saveProductMediaCommandSchema.parse(command));
}

export function removeProductMedia(command: RemoveProductMediaCommand) {
  return catalogService.removeProductMedia(removeProductMediaCommandSchema.parse(command));
}

export function getProductMediaDescriptor(command: ProductMediaCommand) {
  return catalogService.getProductMediaDescriptor(productMediaCommandSchema.parse(command));
}

export function openProductMedia(command: ProductMediaCommand & { range?: { start: number; endInclusive: number } }) {
  const scope = productMediaCommandSchema.parse(command);
  return catalogService.openProductMedia({ ...scope, range: command.range });
}
