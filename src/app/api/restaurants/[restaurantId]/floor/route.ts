import { NextRequest } from "next/server";
import { z } from "zod";
import { floorManagement, requireFloorReadAccess } from "@/modules/floor-management/server";
import { floorRoomInputSchema } from "@/modules/floor-management/contracts";
import { createWalkInSchema, floorReassignmentSchema, floorReassignments, floorWalkIns, getFloorAssignmentOptions, publicAvailabilityQuerySchema, walkInDurationSchema } from "@/modules/reservation-management/server";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { successResponse, handleApiError } from "@/platform/http/api-response";
import { validateOrigin, csrfErrorResponse } from "@/platform/security/csrf";
import { BadRequestError } from "@/platform/application/errors";

type Context = { params: Promise<{ restaurantId: string }> };
function noStore(response: Response) { response.headers.set("Cache-Control", "private, no-store"); return response; }
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { restaurantId } = await params;
    const mode = request.nextUrl.searchParams.get("mode") ?? "config";
    if (mode === "board") {
      await requireFloorReadAccess(restaurantId);
      const at = request.nextUrl.searchParams.get("at") ?? undefined;
      return noStore(successResponse(await floorManagement.getBoard(restaurantId, at, at === undefined || request.nextUrl.searchParams.get("live") === "1")));
    }
    if (mode === "walk-in-options") {
      await requireFloorReadAccess(restaurantId);
      const partySize = z.coerce.number().int().min(1).max(40).parse(request.nextUrl.searchParams.get("partySize") ?? 2);
      const durationMinutes = walkInDurationSchema.parse(request.nextUrl.searchParams.get("durationMinutes") ?? 120);
      return noStore(successResponse(await floorWalkIns.options(restaurantId, partySize, durationMinutes)));
    }
    if (mode === "reassign-options") {
      await requireFloorReadAccess(restaurantId);
      const reservationId = z.string().min(1).parse(request.nextUrl.searchParams.get("reservationId"));
      return noStore(successResponse(await floorReassignments.options(restaurantId, reservationId)));
    }
    await requireRestaurantContext(restaurantId, { allowSuperAdmin: true });
    if (mode === "config") return noStore(successResponse(await floorManagement.getConfig(restaurantId)));
    if (mode === "options") {
      const values = Object.fromEntries(request.nextUrl.searchParams);
      const query = publicAvailabilityQuerySchema.parse(values);
      const date = z.string().min(1).parse(query.date);
      const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).parse(values.time);
      return noStore(successResponse(await getFloorAssignmentOptions(restaurantId, { date, time,
        partySize: query.partySize ?? 2, eventId: values.eventId || null, excludeReservationId: values.excludeReservationId || undefined })));
    }
    throw new BadRequestError("Modo de consulta inválido.");
  } catch (error) { return noStore(handleApiError(error)); }
}

const revision = z.number().int().nonnegative();
const writeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save-room"), room: floorRoomInputSchema, expectedRevision: revision }),
  z.object({ action: z.literal("archive-room"), roomId: z.string().min(1), expectedRevision: revision }),
  z.object({ action: z.literal("settings"), timeZone: z.string().min(1) }),
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("staff"), email: z.string().email(), password: z.string().min(8).max(128) }),
  z.object({ action: z.literal("disable-staff") }),
  createWalkInSchema.extend({ action: z.literal("walk-in") }),
  z.object({ action: z.enum(["release-walk-in", "release-reservation"]), reservationId: z.string().min(1), expectedRevision: revision, reason: z.enum(["COMPLETED", "NO_SHOW"]).optional() }),
  floorReassignmentSchema.extend({ action: z.literal("reassign") }),
]);
export async function POST(request: NextRequest, { params }: Context) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const { restaurantId } = await params;
    const command = writeSchema.parse(await request.json());
    if (command.action === "reassign") {
      await requireFloorReadAccess(restaurantId);
      await floorReassignments.reassign(restaurantId, command);
      return noStore(successResponse(await floorManagement.getBoard(restaurantId)));
    }
    if (command.action === "walk-in" || command.action === "release-walk-in" || command.action === "release-reservation") {
      await requireFloorReadAccess(restaurantId);
      if (command.action === "walk-in") await floorWalkIns.create(restaurantId, command);
      else if (command.action === "release-reservation" && command.reason) await floorWalkIns.release(restaurantId, command.reservationId, command.expectedRevision, command.reason);
      else await floorWalkIns.release(restaurantId, command.reservationId, command.expectedRevision);
      return noStore(successResponse(await floorManagement.getBoard(restaurantId)));
    }
    await requireRestaurantContext(restaurantId, { allowSuperAdmin: true });
    switch (command.action) {
      case "save-room": await floorManagement.saveRoom(restaurantId, command.room, command.expectedRevision); break;
      case "archive-room": await floorManagement.archiveRoom(restaurantId, command.roomId, command.expectedRevision); break;
      case "settings": await floorManagement.updateTimeZone(restaurantId, command.timeZone); break;
      case "activate": await floorManagement.activate(restaurantId); break;
      case "staff": await floorManagement.setStaffAccount(restaurantId, command.email, command.password); break;
      case "disable-staff": await floorManagement.disableStaffAccount(restaurantId); break;
    }
    return noStore(successResponse(await floorManagement.getConfig(restaurantId)));
  } catch (error) { return noStore(handleApiError(error)); }
}
