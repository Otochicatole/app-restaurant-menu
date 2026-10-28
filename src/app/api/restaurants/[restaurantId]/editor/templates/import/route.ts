import { NextRequest } from "next/server";
import { BadRequestError } from "@/platform/application/errors";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { MAX_TEMPLATE_BUNDLE_BYTES, menuEditor, menuTemplates } from "@/modules/menu-editor/server";
import { errorResponse, handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function POST(request: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return errorResponse("VALIDATION_ERROR", "Archivo de plantilla no proporcionado", 422);
    if (file.size <= 0 || file.size > MAX_TEMPLATE_BUNDLE_BYTES) throw new BadRequestError("El archivo de plantilla excede el tamaño máximo permitido.");
    const template = await menuTemplates.import(restaurantId, new Uint8Array(await file.arrayBuffer()));
    const assets = await menuEditor.listAssets(restaurantId);
    return successResponse({ template, assets }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
