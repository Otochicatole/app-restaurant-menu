import { NextRequest } from "next/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuCustomization, updateMenuHeaderSchema } from "@/modules/menu-customization/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function GET() {
  try {
    const actor = await requireTenantAdmin();
    return successResponse(await menuCustomization.getHeader(actor.tenantId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const input = updateMenuHeaderSchema.parse(await request.json());
    return successResponse(await menuCustomization.updateHeader(actor.tenantId, input));
  } catch (error) {
    return handleApiError(error);
  }
}
