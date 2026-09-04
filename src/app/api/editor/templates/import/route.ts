import { NextRequest } from "next/server";
import { BadRequestError } from "@/platform/application/errors";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { MAX_TEMPLATE_BUNDLE_BYTES, menuEditor, menuTemplates } from "@/modules/menu-editor/server";
import { errorResponse, handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return errorResponse("VALIDATION_ERROR", "Archivo de plantilla no proporcionado", 422);
    if (file.size <= 0 || file.size > MAX_TEMPLATE_BUNDLE_BYTES) throw new BadRequestError("El archivo de plantilla excede el tamaño máximo permitido.");
    const template = await menuTemplates.import(actor.tenantId, new Uint8Array(await file.arrayBuffer()));
    const assets = await menuEditor.listAssets(actor.tenantId);
    return successResponse({ template, assets }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
