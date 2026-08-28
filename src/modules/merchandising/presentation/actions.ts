"use server";

import { revalidatePath } from "next/cache";
import { actionErrorResult, actionSuccess, type ActionResult } from "@/platform/application/action-result";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { highlightUseCases } from "../infrastructure/composition";

export async function replaceHighlightsAction(productIds: (string | null)[]): Promise<ActionResult> {
  try {
    const actor = await requireTenantAdmin();
    await highlightUseCases.replaceHighlights(actor.tenantId, {
      productIds: productIds as [string | null, string | null, string | null],
    });
    revalidatePath("/admin");
    revalidatePath("/admin/featured-products");
    revalidatePath(`/m/${actor.tenantSlug}`);
    return actionSuccess();
  } catch (error) {
    return actionErrorResult(error, "No se pudieron guardar los productos destacados");
  }
}
