import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor, publishDocumentSchema, requireActiveMenuProjectForApi } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const active = await requireActiveMenuProjectForApi(actor.tenantId);
    const project = await menuEditor.publish(actor.tenantId, active.id, publishDocumentSchema.parse(await request.json()));
    revalidatePath(`/m/${project.slug}`);
    return successResponse(project);
  } catch (error) {
    return handleApiError(error);
  }
}
