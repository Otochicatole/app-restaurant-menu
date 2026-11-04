import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { floorAssignmentSchema, type FloorInterval } from "@/modules/floor-management/contracts";
import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import { withSqliteTransaction } from "@/platform/database/sqlite-transaction";
import { getFloorAssignmentOptions, syncReservationAllocation } from "./floor-allocations";

export const floorReassignmentSchema = z.object({
  reservationId: z.string().min(1),
  expectedRevision: z.number().int().nonnegative(),
  expectedAllocationVersion: z.number().int().nonnegative(),
  assignment: floorAssignmentSchema,
});
export type FloorReassignmentCommand = z.infer<typeof floorReassignmentSchema>;

async function currentAssignment(tx: Prisma.TransactionClient, restaurantId: string, reservationId: string, now: Date) {
  const restaurant = await tx.restaurant.findUnique({ where: { id: restaurantId }, select: {
    status: true, floorManagementEnabled: true, organization: { select: { status: true } },
  } });
  if (!restaurant) throw new NotFoundError("Restaurante");
  if (!restaurant.floorManagementEnabled || restaurant.status !== "ACTIVE" || restaurant.organization.status !== "ACTIVE") {
    throw new BadRequestError("La sala no está habilitada para modificar las mesas.");
  }
  const reservation = await tx.tableReservation.findFirst({
    where: { id: reservationId, restaurantId },
    include: { allocation: true },
  });
  if (!reservation) throw new NotFoundError("Reserva");
  const allocation = reservation.allocation;
  if (reservation.status !== "CONFIRMED" || !allocation || allocation.releasedAt || allocation.blockedUntil <= now) {
    throw new ConflictError("El grupo ya no tiene mesas vigentes. Actualizá la sala.");
  }
  const interval: FloorInterval = {
    timeZone: allocation.timeZone,
    serviceStartAt: allocation.serviceStartAt.toISOString(), serviceEndAt: allocation.serviceEndAt.toISOString(),
    blockedFrom: allocation.blockedFrom.toISOString(), blockedUntil: allocation.blockedUntil.toISOString(),
  };
  return { reservation, allocation, interval };
}

/** Floor staff may rearrange every group; its reservation and interval always come from storage. */
export async function getFloorReassignmentOptions(database: PrismaClient, restaurantId: string, reservationId: string, now = new Date()) {
  z.string().min(1).parse(reservationId);
  return withSqliteTransaction(database, async (tx) => {
    const { reservation, interval } = await currentAssignment(tx, restaurantId, reservationId, now);
    return getFloorAssignmentOptions(tx, restaurantId, {
      date: reservation.date, time: reservation.time, partySize: reservation.partySize,
      eventId: reservation.eventId, excludeReservationId: reservation.id,
    }, interval);
  });
}

export async function reassignFloorAllocation(database: PrismaClient, restaurantId: string, raw: FloorReassignmentCommand, clock = () => new Date()) {
  const command = floorReassignmentSchema.parse(raw);
  return withSqliteTransaction(database, async (tx) => {
    const now = clock();
    const { reservation, allocation, interval } = await currentAssignment(tx, restaurantId, command.reservationId, now);
    if (reservation.revision !== command.expectedRevision || allocation.version !== command.expectedAllocationVersion) {
      throw new ConflictError("El armado cambió en otra pantalla. Actualizá la sala antes de guardar.");
    }
    const updated = await tx.tableReservation.update({ where: { id: reservation.id }, data: { revision: { increment: 1 } } });
    await syncReservationAllocation(tx, updated, command.assignment, now, interval);
  });
}
