import { NextRequest } from "next/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireTenantAdmin();
    const asset = await menuEditor.getAsset(actor.tenantId, (await params).id, "private");
    return asset ? successResponse(asset) : new Response(null, { status: 404 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    await menuEditor.deleteAsset(actor.tenantId, (await params).id);
    return successResponse(null);
  } catch (error) {
    return handleApiError(error);
  }
}
