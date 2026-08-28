"use server";

import { revalidatePath } from "next/cache";
import { actionErrorResult, actionSuccess, type ActionResult } from "@/platform/application/action-result";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { selectFontSchema, updateMenuHeaderSchema, type FontTarget } from "../contracts";
import { menuCustomizationService } from "../infrastructure/composition";

export type MenuCustomizationActionResult<T = void> = ActionResult<T>;

export async function updateMenuHeaderAction(input: {
  title: string;
  description: string;
}): Promise<MenuCustomizationActionResult> {
  return run(async () => {
    const actor = await requireTenantAdmin();
    await menuCustomizationService.updateHeader(actor.tenantId, updateMenuHeaderSchema.parse(input));
    revalidate(actor.tenantSlug);
    return actionSuccess();
  }, "No se pudo actualizar el encabezado");
}

export async function selectMenuFontAction(
  target: FontTarget,
  fontId: string | null,
): Promise<MenuCustomizationActionResult> {
  return run(async () => {
    const actor = await requireTenantAdmin();
    await menuCustomizationService.selectFont(actor.tenantId, selectFontSchema.parse({ target, fontId }));
    revalidate(actor.tenantSlug);
    return actionSuccess();
  }, "No se pudo aplicar la fuente");
}

export async function deleteMenuFontAction(fontId: string): Promise<MenuCustomizationActionResult> {
  return run(async () => {
    const actor = await requireTenantAdmin();
    await menuCustomizationService.deleteCustomFont(actor.tenantId, fontId);
    revalidate(actor.tenantSlug);
    return actionSuccess();
  }, "No se pudo eliminar la fuente");
}

function revalidate(tenantSlug: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/home-page");
  revalidatePath("/admin/settings/fonts");
  revalidatePath(`/m/${tenantSlug}`);
}

async function run<T>(
  operation: () => Promise<MenuCustomizationActionResult<T>>,
  fallback: string,
): Promise<MenuCustomizationActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return actionErrorResult(error, fallback);
  }
}
