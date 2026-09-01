import { NextRequest } from "next/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor, menuTemplates, saveDocumentSchema } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const body = await request.json();
    const document = await menuTemplates.apply(actor.tenantId, (await params).id);
    const saved = await menuEditor.saveDraft(actor.tenantId, saveDocumentSchema.parse({ baseRevision: body.baseRevision, document }));
    return successResponse(saved);
  } catch (error) { return handleApiError(error); }
}
