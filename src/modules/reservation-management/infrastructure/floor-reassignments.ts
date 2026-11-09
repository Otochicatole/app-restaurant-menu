import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { floorAssignmentSchema, validateFloorPlacement, type FloorAssignmentInput, type FloorInterval } from "@/modules/floor-management/contracts";
import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import { withSqliteTransaction } from "@/platform/database/sqlite-transaction";
import { getFloorAssignmentOptions, persistPreparedReservationAllocation, prepareReservationAllocation, syncReservationAllocation } from "./floor-allocations";

export const floorReassignmentSchema = z.object({
  reservationId: z.string().min(1),
  expectedRevision: z.number().int().nonnegative(),
  expectedAllocationVersion: z.number().int().nonnegative(),
  assignment: floorAssignmentSchema,
});
export type FloorReassignmentCommand = z.infer<typeof floorReassignmentSchema>;
export const floorBatchReassignmentSchema = z.object({
  updates: z.array(floorReassignmentSchema).min(1).max(40),
}).refine(({ updates }) => new Set(updates.map((update) => update.reservationId)).size === updates.length, {
  message: "Cada reserva debe aparecer una sola vez en la selección.", path: ["updates"],
});
export type FloorBatchReassignmentCommand = z.infer<typeof floorBatchReassignmentSchema>;

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
    include: { allocation: { include: { serviceAccounts: { where: { closedAt: null }, select: { id: true }, take: 1 } } } },
  });
  if (!reservation) throw new NotFoundError("Reserva");
  const allocation = reservation.allocation;
  if (reservation.status !== "CONFIRMED" || !allocation || allocation.releasedAt || (allocation.blockedUntil <= now && !allocation.serviceAccounts.length)) {
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
    await syncReservationAllocation(tx, updated, command.assignment, now, interval, true);
  });
}

/** Validate the final selection together, then commit all reservation revisions and poses in one transaction. */
export async function reassignFloorAllocations(database: PrismaClient, restaurantId: string, raw: FloorBatchReassignmentCommand, clock = () => new Date()) {
  const command = floorBatchReassignmentSchema.parse(raw);
  return withSqliteTransaction(database, async (tx) => {
    const now = clock();
    const selectedIds = command.updates.map((update) => update.reservationId);
    const selected: (Awaited<ReturnType<typeof currentAssignment>> & { assignment: FloorAssignmentInput })[] = [];
    for (const update of command.updates) {
      const current = await currentAssignment(tx, restaurantId, update.reservationId, now);
      if (current.reservation.revision !== update.expectedRevision || current.allocation.version !== update.expectedAllocationVersion) {
        throw new ConflictError("El armado cambió en otra pantalla. Actualizá la sala antes de guardar.");
      }
      selected.push({ ...current, assignment: update.assignment });
    }
    const proposals = [];
    for (const current of selected) {
      proposals.push(await prepareReservationAllocation(tx, current.reservation, current.assignment, current.interval, selectedIds, undefined, now));
    }
    if (proposals.reduce((count, proposal) => count + proposal.poses.length, 0) > 200) {
      throw new BadRequestError("La selección puede modificar hasta 200 mesas a la vez.");
    }
  const scheduled = proposals.filter(({ overrun }) => !overrun);
  const leases = scheduled.map(({ proposal }) => proposal);
  for (const { room, proposal } of scheduled) {
      const invalid = validateFloorPlacement(room, proposal, leases);
      if (invalid) throw new ConflictError(invalid);
    }
    const live = proposals.filter(({ proposal }, index) =>
      Date.parse(proposal.blockedFrom) <= now.getTime() &&
      (Date.parse(proposal.blockedUntil) > now.getTime() || selected[index].allocation.serviceAccounts.length));
    const liveEnd = new Date(now.getTime() + 1).toISOString();
    const liveLeases = live.map(({ proposal }) => ({ ...proposal, blockedFrom: now.toISOString(), blockedUntil: liveEnd }));
    for (const [index, lease] of liveLeases.entries()) {
      const invalid = validateFloorPlacement(live[index].room, lease, liveLeases);
      if (invalid) throw new ConflictError(invalid);
    }
    for (const prepared of proposals) {
      await tx.tableReservation.update({ where: { id: prepared.reservationId }, data: { revision: { increment: 1 } } });
      await persistPreparedReservationAllocation(tx, prepared);
    }
  });
}
