import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import { withSqliteTransaction } from "@/platform/database/sqlite-transaction";
import { restaurantLocalDateTime, type FloorInterval } from "@/modules/floor-management/contracts";
import { createWalkInSchema, walkInDurationSchema, type CreateWalkInCommand } from "../contracts";
import { getFloorAssignmentOptions, syncReservationAllocation } from "./floor-allocations";

async function operationalSettings(database: PrismaClient | Prisma.TransactionClient, restaurantId: string) {
  const restaurant = await database.restaurant.findUnique({ where: { id: restaurantId }, select: {
    timeZone: true, status: true, floorManagementEnabled: true, organization: { select: { status: true } },
  } });
  if (!restaurant) throw new NotFoundError("Restaurante");
  if (!restaurant.floorManagementEnabled || restaurant.status !== "ACTIVE" || restaurant.organization.status !== "ACTIVE") {
    throw new BadRequestError("La sala no está habilitada para recibir comensales.");
  }
  return restaurant;
}

function walkInInterval(timeZone: string, durationMinutes: number, now: Date): FloorInterval {
  const start = now.toISOString();
  const end = new Date(now.getTime() + durationMinutes * 60_000).toISOString();
  return { timeZone, serviceStartAt: start, blockedFrom: start, serviceEndAt: end, blockedUntil: end };
}

export async function getWalkInOptions(database: PrismaClient, restaurantId: string, partySize: number, duration = 120, now = new Date()) {
  const size = z.number().int().min(1).max(40).parse(partySize);
  const durationMinutes = walkInDurationSchema.parse(duration);
  const settings = await operationalSettings(database, restaurantId);
  const local = restaurantLocalDateTime(settings.timeZone, now);
  return getFloorAssignmentOptions(database, restaurantId, { ...local, partySize: size }, walkInInterval(settings.timeZone, durationMinutes, now), [], true);
}

/** The staff operation exposes no generic reservation writes or customer contacts. */
export async function createWalkIn(database: PrismaClient, restaurantId: string, raw: CreateWalkInCommand, clock = () => new Date()) {
  const command = createWalkInSchema.parse(raw);
  return withSqliteTransaction(database, async (tx) => {
    const settings = await operationalSettings(tx, restaurantId);
    const now = clock();
    const local = restaurantLocalDateTime(settings.timeZone, now);
    const reservation = await tx.tableReservation.create({ data: {
      restaurantId, code: `SALA-${randomUUID()}`, customerName: command.customerName,
      customerPhone: "", customerEmail: "", notes: command.notes, partySize: command.partySize,
      ...local, source: "WALK_IN", status: "CONFIRMED",
    } });
    await syncReservationAllocation(tx, reservation, command.assignment, now, walkInInterval(settings.timeZone, command.durationMinutes, now), true);
    return { reservationId: reservation.id };
  });
}

export async function releaseWalkIn(database: PrismaClient, restaurantId: string, reservationId: string, expectedRevision: number, now = new Date()) {
  z.number().int().nonnegative().parse(expectedRevision);
  return withSqliteTransaction(database, async (tx) => {
    await operationalSettings(tx, restaurantId);
    const reservation = await tx.tableReservation.findFirst({ where: { id: reservationId, restaurantId, source: "WALK_IN" } });
    if (!reservation) throw new NotFoundError("Visita sin reserva");
    if (await tx.serviceAccount.count({ where: { restaurantId, reservationId } })) {
      throw new ConflictError("Cerrá los armados de esta visita desde Servicio para liberar sus mesas.");
    }
    if (reservation.revision !== expectedRevision || reservation.status !== "CONFIRMED") {
      throw new ConflictError("La visita cambió. Actualizá la sala antes de liberar las mesas.");
    }
    const completed = await tx.tableReservation.update({ where: { id: reservation.id }, data: { status: "COMPLETED", revision: { increment: 1 } } });
    await syncReservationAllocation(tx, completed, undefined, now);
  });
}
