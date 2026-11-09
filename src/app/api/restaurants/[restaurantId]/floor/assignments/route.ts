import { NextRequest } from "next/server";
import { floorManagement, requireFloorReadAccess } from "@/modules/floor-management/server";
import { floorBatchReassignmentSchema, floorReassignments } from "@/modules/reservation-management/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";
import { BadRequestError } from "@/platform/application/errors";

type Context = { params: Promise<{ restaurantId: string }> };
function noStore(response: Response) { response.headers.set("Cache-Control", "private, no-store"); return response; }

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    if (!validateOrigin(request)) return noStore(csrfErrorResponse());
    const { restaurantId } = await params;
    await requireFloorReadAccess(restaurantId);
    const at = request.nextUrl.searchParams.get("at");
    if (at !== null && !Number.isFinite(new Date(at).getTime())) throw new BadRequestError("La fecha del plano no es válida.");
    const command = floorBatchReassignmentSchema.parse(await request.json());
    await floorReassignments.reassignMany(restaurantId, command);
    const board = at !== null && request.nextUrl.searchParams.get("live") === "1"
      ? await floorManagement.getBoard(restaurantId, undefined, true)
      : at === null ? await floorManagement.getBoard(restaurantId) : await floorManagement.getBoard(restaurantId, at);
    return noStore(successResponse(board));
  } catch (error) { return noStore(handleApiError(error)); }
}
