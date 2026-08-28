import { NextRequest } from "next/server";
import { successResponse } from "@/platform/http/api-response";
import { deleteGroupCommandSchema, getGroupCommandSchema, updateGroupCommandSchema } from "@/modules/catalog/contracts";
import { deleteGroup, getGroup, updateGroup } from "@/modules/catalog/server";
import { validateOrigin, csrfErrorResponse } from "@/platform/security/csrf";
import { handleCatalogApiError, requireCatalogScope } from "../../catalog-route-support";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const [actor, { id }] = await Promise.all([requireCatalogScope(), params]);
    const command = getGroupCommandSchema.parse({ tenantId: actor.tenantId, groupId: id });
    return successResponse(await getGroup(command));
  } catch (error) {
    return handleCatalogApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const [actor, { id }, input] = await Promise.all([requireCatalogScope(), params, request.json()]);
    const command = updateGroupCommandSchema.parse({ tenantId: actor.tenantId, groupId: id, input });
    return successResponse(await updateGroup(command));
  } catch (error) {
    return handleCatalogApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const [actor, { id }] = await Promise.all([requireCatalogScope(), params]);
    const command = deleteGroupCommandSchema.parse({ tenantId: actor.tenantId, groupId: id });
    await deleteGroup(command);
    return successResponse(null);
  } catch (error) {
    return handleCatalogApiError(error);
  }
}
