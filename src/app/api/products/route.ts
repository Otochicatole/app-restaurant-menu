import { NextRequest } from "next/server";
import { successResponse } from "@/platform/http/api-response";
import { createProductCommandSchema, listProductsCommandSchema } from "@/modules/catalog/contracts";
import { createProduct, listProducts } from "@/modules/catalog/server";
import { validateOrigin, csrfErrorResponse } from "@/platform/security/csrf";
import { handleCatalogApiError, requireCatalogScope } from "../catalog-route-support";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireCatalogScope();
    const command = listProductsCommandSchema.parse({
      tenantId: actor.tenantId,
      tenantSlug: actor.tenantSlug,
      groupId: new URL(request.url).searchParams.get("groupId") ?? undefined,
    });
    return successResponse(await listProducts(command));
  } catch (error) {
    return handleCatalogApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireCatalogScope();
    const command = createProductCommandSchema.parse({
      tenantId: actor.tenantId,
      tenantSlug: actor.tenantSlug,
      input: await request.json(),
    });
    return successResponse(await createProduct(command), 201);
  } catch (error) {
    return handleCatalogApiError(error);
  }
}
