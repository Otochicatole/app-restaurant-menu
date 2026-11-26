import { NextRequest } from "next/server";
import { inventoryCommandSchema } from "@/modules/inventory-management/contracts";
import { inventoryService } from "@/modules/inventory-management/server";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";
import { requireRestaurantFeature } from "@/modules/restaurant-management/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

type Context = { params: Promise<{ restaurantId: string }> };

function privateResponse(response: Response) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { restaurantId } = await params;
    await requireRestaurantFeature(restaurantId, "inventory", { allowSuperAdmin: true });
    return privateResponse(successResponse(await inventoryService.snapshot(restaurantId)));
  } catch (error) {
    return privateResponse(handleApiError(error));
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    if (!validateOrigin(request)) return privateResponse(csrfErrorResponse());
    const { restaurantId } = await params;
    const actor = await requireAuthenticatedAccount();
    await requireRestaurantFeature(restaurantId, "inventory", { allowSuperAdmin: true });
    const command = inventoryCommandSchema.parse(await request.json());
    return privateResponse(successResponse(await inventoryService.execute(restaurantId, actor.adminId, command)));
  } catch (error) {
    return privateResponse(handleApiError(error));
  }
}
