import { NextRequest } from "next/server";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { menuTemplates } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ restaurantId: string; id: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
    return successResponse(await menuTemplates.update(restaurantId, (await params).id, await request.json()));
  } catch (error) { return handleApiError(error); }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ restaurantId: string; id: string }> }) {
  try {
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
    const id = (await params).id;
    const template = (await menuTemplates.list(restaurantId)).find((item) => item.id === id);
    if (!template) return new Response(JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Plantilla no encontrada" } }), { status: 404, headers: { "Content-Type": "application/json" } });
    return successResponse(template);
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ restaurantId: string; id: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
    await menuTemplates.delete(restaurantId, (await params).id);
    return successResponse({ deleted: true });
  } catch (error) { return handleApiError(error); }
}
