import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { menuEditor, publishDocumentSchema, requireActiveMenuProjectForApi } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function POST(request: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
    const active = await requireActiveMenuProjectForApi(restaurantId);
    const project = await menuEditor.publish(restaurantId, active.id, publishDocumentSchema.parse(await request.json()));
    revalidatePath(`/m/${project.slug}`);
    return successResponse(project);
  } catch (error) {
    return handleApiError(error);
  }
}
