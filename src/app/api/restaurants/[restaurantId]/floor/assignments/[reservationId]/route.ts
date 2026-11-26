import { NextRequest } from "next/server";
import { floorManagement, requireFloorReadAccess } from "@/modules/floor-management/server";
import { floorReassignmentSchema, floorReassignments } from "@/modules/reservation-management/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

type Context = { params: Promise<{ restaurantId: string; reservationId: string }> };
const writeSchema = floorReassignmentSchema.omit({ reservationId: true });
function noStore(response: Response) { response.headers.set("Cache-Control", "private, no-store"); return response; }

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { restaurantId, reservationId } = await params;
    await requireFloorReadAccess(restaurantId);
    return noStore(successResponse(await floorReassignments.options(restaurantId, reservationId)));
  } catch (error) { return noStore(handleApiError(error)); }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    if (!validateOrigin(request)) return noStore(csrfErrorResponse());
    const { restaurantId, reservationId } = await params;
    await requireFloorReadAccess(restaurantId);
    const command = writeSchema.parse(await request.json());
    await floorReassignments.reassign(restaurantId, { ...command, reservationId });
    return noStore(successResponse(await floorManagement.getBoard(restaurantId)));
  } catch (error) { return noStore(handleApiError(error)); }
}
