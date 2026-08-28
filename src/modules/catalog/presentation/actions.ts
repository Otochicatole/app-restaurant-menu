"use server";

import { revalidatePath } from "next/cache";
import { actionErrorResult, actionSuccess } from "@/platform/application/action-result";
import type { CatalogActionResult, GroupInput, GroupView, ProductInput, ProductView } from "../contracts";
import {
  deleteGroupCommandSchema,
  deleteProductCommandSchema,
  groupInputSchema,
  productInputSchema,
  reorderProductsCommandSchema,
  updateGroupCommandSchema,
  updateProductCommandSchema,
} from "../contracts";
import { catalogService } from "../infrastructure/composition";
import { requireTenantAdmin } from "@/modules/identity-access/server";

export async function createCatalogGroup(input: GroupInput): Promise<CatalogActionResult<GroupView>> {
  try {
    const actor = await requireCatalogActor();
    const group = await catalogService.createGroup({ tenantId: actor.tenantId, input: groupInputSchema.parse(input) });
    revalidateCatalog(actor.tenantSlug);
    return actionSuccess(group);
  } catch (error) {
    return actionErrorResult(error, "No se pudo crear el grupo");
  }
}

export async function updateCatalogGroup(command: {
  groupId: string;
  input: GroupInput;
}): Promise<CatalogActionResult<GroupView>> {
  try {
    const actor = await requireCatalogActor();
    const parsed = updateGroupCommandSchema.omit({ tenantId: true }).parse(command);
    const group = await catalogService.updateGroup({ ...parsed, tenantId: actor.tenantId });
    revalidateCatalog(actor.tenantSlug);
    return actionSuccess(group);
  } catch (error) {
    return actionErrorResult(error, "No se pudo actualizar el grupo");
  }
}

export async function removeCatalogGroup(command: { groupId: string }): Promise<CatalogActionResult> {
  try {
    const actor = await requireCatalogActor();
    const parsed = deleteGroupCommandSchema.omit({ tenantId: true }).parse(command);
    await catalogService.deleteGroup({ ...parsed, tenantId: actor.tenantId });
    revalidateCatalog(actor.tenantSlug);
    return actionSuccess();
  } catch (error) {
    return actionErrorResult(error, "No se pudo eliminar el grupo");
  }
}

export async function createCatalogProduct(input: ProductInput): Promise<CatalogActionResult<ProductView>> {
  try {
    const actor = await requireCatalogActor();
    const product = await catalogService.createProduct({
      tenantId: actor.tenantId,
      tenantSlug: actor.tenantSlug,
      input: productInputSchema.parse(input),
    });
    revalidateCatalog(actor.tenantSlug);
    return actionSuccess(product);
  } catch (error) {
    return actionErrorResult(error, "No se pudo crear el producto");
  }
}

export async function updateCatalogProduct(command: {
  productId: string;
  input: ProductInput;
}): Promise<CatalogActionResult<ProductView>> {
  try {
    const actor = await requireCatalogActor();
    const parsed = updateProductCommandSchema.omit({ tenantId: true, tenantSlug: true }).parse(command);
    const product = await catalogService.updateProduct({ ...parsed, tenantId: actor.tenantId, tenantSlug: actor.tenantSlug });
    revalidateCatalog(actor.tenantSlug);
    return actionSuccess(product);
  } catch (error) {
    return actionErrorResult(error, "No se pudo actualizar el producto");
  }
}

export async function removeCatalogProduct(command: { productId: string }): Promise<CatalogActionResult> {
  try {
    const actor = await requireCatalogActor();
    const parsed = deleteProductCommandSchema.omit({ tenantId: true }).parse(command);
    await catalogService.deleteProduct({ ...parsed, tenantId: actor.tenantId });
    revalidateCatalog(actor.tenantSlug);
    return actionSuccess();
  } catch (error) {
    return actionErrorResult(error, "No se pudo eliminar el producto");
  }
}

export async function reorderCatalogProducts(command: {
  groupId: string;
  productIds: string[];
}): Promise<CatalogActionResult> {
  try {
    const actor = await requireCatalogActor();
    const parsed = reorderProductsCommandSchema.omit({ tenantId: true }).parse(command);
    await catalogService.reorderProducts({ ...parsed, tenantId: actor.tenantId });
    revalidateCatalog(actor.tenantSlug);
    return actionSuccess();
  } catch (error) {
    return actionErrorResult(error, "No se pudo guardar el orden");
  }
}

async function requireCatalogActor(): Promise<{ tenantId: string; tenantSlug: string }> {
  const actor = await requireTenantAdmin();
  return { tenantId: actor.tenantId, tenantSlug: actor.tenantSlug };
}

function revalidateCatalog(tenantSlug: string): void {
  revalidatePath("/admin/catalog");
  revalidatePath(`/m/${tenantSlug}`);
}
