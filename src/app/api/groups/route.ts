import { NextRequest } from "next/server";
import { successResponse } from "@/platform/http/api-response";
import { createGroupCommandSchema } from "@/modules/catalog/contracts";
import { createGroup, listGroups } from "@/modules/catalog/server";
import { validateOrigin, csrfErrorResponse } from "@/platform/security/csrf";
import { handleCatalogApiError, requireCatalogScope } from "../catalog-route-support";

export async function GET() {
  try {
    const actor = await requireCatalogScope();
    return successResponse(await listGroups({ tenantId: actor.tenantId }));
  } catch (error) {
    return handleCatalogApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireCatalogScope();
    const command = createGroupCommandSchema.parse({ tenantId: actor.tenantId, input: await request.json() });
    return successResponse(await createGroup(command), 201);
  } catch (error) {
    return handleCatalogApiError(error);
  }
}
