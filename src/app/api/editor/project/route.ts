import { NextRequest } from "next/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor, saveDocumentSchema } from "@/modules/menu-editor/server";
import { createTemplateDocument } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function GET() {
  try {
    const actor = await requireTenantAdmin();
    const project = await menuEditor.getProject(actor.tenantId, createTemplateDocument(actor.tenantSlug));
    return successResponse(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const input = saveDocumentSchema.parse(await request.json());
    return successResponse(await menuEditor.saveDraft(actor.tenantId, input));
  } catch (error) {
    return handleApiError(error);
  }
}
