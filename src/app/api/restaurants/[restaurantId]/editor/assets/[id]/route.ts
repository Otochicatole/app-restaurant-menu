import { NextRequest } from "next/server";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { menuEditor } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ restaurantId: string; id: string }> }) {
  try {
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId, { allowSuperAdmin: true });
    const asset = await menuEditor.getAsset(restaurantId, (await params).id, "private");
    return asset ? successResponse(asset) : new Response(null, { status: 404 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ restaurantId: string; id: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId, { allowSuperAdmin: true });
    await menuEditor.deleteAsset(restaurantId, (await params).id);
    return successResponse(null);
  } catch (error) {
    return handleApiError(error);
  }
}
