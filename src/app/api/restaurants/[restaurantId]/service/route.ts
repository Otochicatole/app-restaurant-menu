import { NextRequest } from "next/server";
import { z } from "zod";
import { requireFloorReadAccess } from "@/modules/floor-management/server";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";
import { serviceCommandSchema } from "@/modules/reservation-management/contracts";
import { tableService } from "@/modules/reservation-management/server";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

type Context = { params: Promise<{ restaurantId: string }> };
const adminActions = new Set(["save-product", "archive-product", "save-staff", "set-staff-active", "close-day", "reopen-day"]);
const modeSchema = z.enum(["board", "cash", "products", "staff"]);

function privateResponse(response: Response) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { restaurantId } = await params;
    const query = request.nextUrl.searchParams;
    const mode = modeSchema.parse(query.get("mode") ?? "board");
    if (mode === "board") {
      await requireFloorReadAccess(restaurantId);
      const at = query.get("at");
      const instant = at ? new Date(z.iso.datetime({ offset: true }).parse(at)) : undefined;
      if (instant && (await requireAuthenticatedAccount()).kind === "waiter") {
        return privateResponse(successResponse({ accounts: [], products: [], waiters: [], unserved: [], cashClosed: false }));
      }
      return privateResponse(successResponse(await tableService.snapshot(restaurantId, undefined, instant)));
    }
    await requireRestaurantContext(restaurantId, { allowSuperAdmin: true });
    const result = mode === "products"
      ? await tableService.products(restaurantId)
      : mode === "staff"
        ? await tableService.staff(restaurantId)
        : await tableService.report(restaurantId, query.get("from") ?? undefined, query.get("to") ?? undefined);
    return privateResponse(successResponse(result));
  } catch (error) {
    return privateResponse(handleApiError(error));
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    if (!validateOrigin(request)) return privateResponse(csrfErrorResponse());
    const { restaurantId } = await params;
    const actor = await requireAuthenticatedAccount();
    const command = serviceCommandSchema.parse(await request.json());
    if (adminActions.has(command.action)) await requireRestaurantContext(restaurantId, { allowSuperAdmin: true });
    else await requireFloorReadAccess(restaurantId);
    return privateResponse(successResponse(await tableService.execute(restaurantId, actor.adminId, command)));
  } catch (error) {
    return privateResponse(handleApiError(error));
  }
}
