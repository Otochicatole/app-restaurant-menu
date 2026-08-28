import { handleApiError } from "@/platform/http/api-response";
import { requireTenantAdmin } from "@/modules/identity-access/server";

export async function requireCatalogScope(): Promise<{ tenantId: string; tenantSlug: string }> {
  const actor = await requireTenantAdmin();
  return { tenantId: actor.tenantId, tenantSlug: actor.tenantSlug };
}

export function handleCatalogApiError(error: unknown) {
  return handleApiError(error);
}
