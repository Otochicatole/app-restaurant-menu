import { NextRequest } from "next/server";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { menuEditor, requireActiveMenuProjectForApi, saveDocumentSchema } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  try {
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
    const project = await requireActiveMenuProjectForApi(restaurantId);
    return successResponse(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
    const project = await requireActiveMenuProjectForApi(restaurantId);
    const input = saveDocumentSchema.parse(await request.json());
    return successResponse(await menuEditor.saveDraft(restaurantId, project.id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
