import { NextRequest } from "next/server";
import { successResponse } from "@/platform/http/api-response";
import { deleteProductCommandSchema, getProductCommandSchema, updateProductCommandSchema } from "@/modules/catalog/contracts";
import { deleteProduct, getProduct, updateProduct } from "@/modules/catalog/server";
import { validateOrigin, csrfErrorResponse } from "@/platform/security/csrf";
import { handleCatalogApiError, requireCatalogScope } from "../../catalog-route-support";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const [actor, { id }] = await Promise.all([requireCatalogScope(), params]);
    const command = getProductCommandSchema.parse({
      tenantId: actor.tenantId,
      tenantSlug: actor.tenantSlug,
      productId: id,
    });
    return successResponse(await getProduct(command));
  } catch (error) {
    return handleCatalogApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const [actor, { id }, input] = await Promise.all([requireCatalogScope(), params, request.json()]);
    const command = updateProductCommandSchema.parse({
      tenantId: actor.tenantId,
      tenantSlug: actor.tenantSlug,
      productId: id,
      input,
    });
    return successResponse(await updateProduct(command));
  } catch (error) {
    return handleCatalogApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const [actor, { id }] = await Promise.all([requireCatalogScope(), params]);
    const command = deleteProductCommandSchema.parse({ tenantId: actor.tenantId, productId: id });
    await deleteProduct(command);
    return successResponse(null);
  } catch (error) {
    return handleCatalogApiError(error);
  }
}
