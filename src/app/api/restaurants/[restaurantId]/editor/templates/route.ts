import { NextRequest } from "next/server";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { menuTemplates, createTemplateSchema } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  try {
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
    return successResponse(await menuTemplates.list(restaurantId));
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
    const body = await request.json();
    const input = createTemplateSchema.parse(body);
    const template = await menuTemplates.create(restaurantId, body.document, input);
    return successResponse(template, 201);
  } catch (error) { return handleApiError(error); }
}
