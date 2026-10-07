import { NextRequest } from "next/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor, profileSchema, requireActiveMenuProjectForApi } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function GET() {
  try {
    const actor = await requireTenantAdmin();
    const project = await requireActiveMenuProjectForApi(actor.tenantId);
    return successResponse(await menuEditor.getProfile(actor.tenantId, project.id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const project = await requireActiveMenuProjectForApi(actor.tenantId);
    return successResponse(await menuEditor.updateProfile(actor.tenantId, project.id, profileSchema.parse(await request.json())));
  } catch (error) {
    return handleApiError(error);
  }
}
