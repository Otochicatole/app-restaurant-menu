import { NextRequest } from "next/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuTemplates } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    return successResponse(await menuTemplates.update(actor.tenantId, (await params).id, await request.json()));
  } catch (error) { return handleApiError(error); }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireTenantAdmin();
    const id = (await params).id;
    const template = (await menuTemplates.list(actor.tenantId)).find((item) => item.id === id);
    if (!template) return new Response(JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Plantilla no encontrada" } }), { status: 404, headers: { "Content-Type": "application/json" } });
    return successResponse(template);
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    await menuTemplates.delete(actor.tenantId, (await params).id);
    return successResponse({ deleted: true });
  } catch (error) { return handleApiError(error); }
}
