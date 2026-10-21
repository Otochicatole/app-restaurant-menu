import { NextRequest } from "next/server";
import { resolveEditorAssetTenantId } from "../resolve-tenant";
import { menuEditor } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = await resolveEditorAssetTenantId(request);
    const asset = await menuEditor.getAsset(tenantId, (await params).id, "private");
    return asset ? successResponse(asset) : new Response(null, { status: 404 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const tenantId = await resolveEditorAssetTenantId(request);
    await menuEditor.deleteAsset(tenantId, (await params).id);
    return successResponse(null);
  } catch (error) {
    return handleApiError(error);
  }
}
