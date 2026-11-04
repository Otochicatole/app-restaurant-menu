import { NextRequest } from "next/server";
import { floorTableInventorySchema } from "@/modules/floor-management/contracts";
import { floorManagement, requireFloorReadAccess } from "@/modules/floor-management/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

type Context = { params: Promise<{ restaurantId: string }> };
function noStore(response: Response) { response.headers.set("Cache-Control", "private, no-store"); return response; }

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    if (!validateOrigin(request)) return noStore(csrfErrorResponse());
    const { restaurantId } = await params;
    await requireFloorReadAccess(restaurantId);
    const input = floorTableInventorySchema.parse(await request.json());
    return noStore(successResponse({ room: await floorManagement.saveTables(restaurantId, input) }));
  } catch (error) { return noStore(handleApiError(error)); }
}
