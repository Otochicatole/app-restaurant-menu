import { NextRequest } from "next/server";
import { z } from "zod";
import { requireFloorReadAccess } from "@/modules/floor-management/server";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";
import { tableService } from "@/modules/reservation-management/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

type Context = { params: Promise<{ restaurantId: string }> };

function privateResponse(response: Response) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { restaurantId } = await params;
    await requireFloorReadAccess(restaurantId);
    const snapshot = await tableService.kitchen(restaurantId);
    return privateResponse(successResponse(snapshot));
  } catch (error) {
    return privateResponse(handleApiError(error));
  }
}

const kitchenCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update-kitchen-status"),
    lineId: z.string().min(1),
    status: z.enum(["PENDING", "IN_PREP", "READY", "SERVED", "CANCELLED"]),
  }),
  z.object({
    action: z.literal("deliver-all"),
    accountId: z.string().min(1),
    expectedVersion: z.number().int().nonnegative(),
  }),
]);

export async function POST(request: NextRequest, { params }: Context) {
  try {
    if (!validateOrigin(request)) return privateResponse(csrfErrorResponse());
    const { restaurantId } = await params;
    const [actor] = await Promise.all([
      requireAuthenticatedAccount(),
      requireFloorReadAccess(restaurantId),
    ]);
    const body = kitchenCommandSchema.parse(await request.json());
    await tableService.execute(restaurantId, actor.adminId, body);
    const snapshot = await tableService.kitchen(restaurantId);
    return privateResponse(successResponse(snapshot));
  } catch (error) {
    return privateResponse(handleApiError(error));
  }
}
