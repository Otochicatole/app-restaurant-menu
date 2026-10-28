import { NextRequest } from "next/server";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { menuEditor, menuTemplates, requireActiveMenuProjectForApi, saveDocumentSchema } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function POST(request: NextRequest, { params }: { params: Promise<{ restaurantId: string; id: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
    const project = await requireActiveMenuProjectForApi(restaurantId);
    const body = await request.json();
    const document = await menuTemplates.apply(restaurantId, (await params).id);
    const saved = await menuEditor.saveDraft(restaurantId, project.id, saveDocumentSchema.parse({ baseRevision: body.baseRevision, document }));
    return successResponse(saved);
  } catch (error) { return handleApiError(error); }
}
