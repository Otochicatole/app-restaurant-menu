import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/platform/http/api-response";
import { productMediaCommandSchema, productMediaMetadataSchema, removeProductMediaCommandSchema, saveProductMediaCommandSchema } from "@/modules/catalog/contracts";
import {
  getProductMediaDescriptor,
  openProductMedia,
  removeProductMedia,
  saveProductMedia,
} from "@/modules/catalog/server";
import { createMediaResponse } from "@/platform/http/media-response";
import { validateOrigin, csrfErrorResponse } from "@/platform/security/csrf";
import { handleCatalogApiError, requireCatalogScope } from "../../../catalog-route-support";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const [actor, { id }] = await Promise.all([requireCatalogScope(), params]);
    const command = productMediaCommandSchema.parse({ tenantId: actor.tenantId, productId: id });
    const descriptor = await getProductMediaDescriptor(command);
    if (!descriptor) return errorResponse("NOT_FOUND", "Media not found", 404);

    const response = await createMediaResponse({
      request,
      descriptor,
      cacheControl: "private, max-age=0, must-revalidate",
      open: (range) => openProductMedia({ ...command, ...(range ? { range } : {}) }),
    });
    return response ?? errorResponse("NOT_FOUND", "Media not found", 404);
  } catch (error) {
    return handleCatalogApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const [actor, { id }, formData] = await Promise.all([requireCatalogScope(), params, request.formData()]);
    const file = formData.get("file");
    if (!(file instanceof File)) return errorResponse("VALIDATION_ERROR", "Archivo no proporcionado", 422);
    productMediaMetadataSchema.parse({ type: file.type, size: file.size });
    const command = saveProductMediaCommandSchema.parse({
      tenantId: actor.tenantId,
      tenantSlug: actor.tenantSlug,
      productId: id,
      file: { type: file.type, size: file.size, content: new Uint8Array(await file.arrayBuffer()) },
    });
    return successResponse(await saveProductMedia(command));
  } catch (error) {
    return handleCatalogApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const [actor, { id }] = await Promise.all([requireCatalogScope(), params]);
    const command = removeProductMediaCommandSchema.parse({
      tenantId: actor.tenantId,
      tenantSlug: actor.tenantSlug,
      productId: id,
    });
    return successResponse(await removeProductMedia(command));
  } catch (error) {
    return handleCatalogApiError(error);
  }
}
