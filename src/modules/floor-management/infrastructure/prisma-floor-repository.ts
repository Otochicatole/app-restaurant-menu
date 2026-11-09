import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/platform/database/prisma";
import { withSqliteTransaction } from "@/platform/database/sqlite-transaction";
import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import {
  calculateFloorInterval, floorRoomInputSchema, floorTableInventorySchema, restaurantToday, toFloorRoom, validateFloorPlacement, validateRoomLayout, validateTableArrangement, validateTimeZone,
  type FloorAllocationView, type FloorBoardView, type FloorConfigView, type FloorLease, type FloorRoom, type FloorRoomInput, type FloorRotation, type FloorTableInventoryInput,
} from "../contracts";

const roomInclude = { locations: { orderBy: { name: "asc" as const } }, tables: { orderBy: { label: "asc" as const } }, combinations: { include: { members: true }, orderBy: { name: "asc" as const } } } satisfies Prisma.DiningRoomInclude;
const allocationInclude = { tables: true, reservation: { select: { customerName: true, partySize: true, date: true, time: true, notes: true, code: true, source: true, revision: true } } } satisfies Prisma.ReservationAllocationInclude;
type Allocation = Prisma.ReservationAllocationGetPayload<{ include: typeof allocationInclude }>;
const toAllocation = (row: Allocation): FloorAllocationView => ({
  id: row.id, reservationId: row.reservationId, reservationRevision: row.reservation.revision, roomId: row.roomId, combinationId: row.combinationId, locationId: row.locationId, capacity: row.capacity, timeZone: row.timeZone,
  serviceStartAt: row.serviceStartAt.toISOString(), serviceEndAt: row.serviceEndAt.toISOString(), blockedFrom: row.blockedFrom.toISOString(),
  blockedUntil: row.blockedUntil.toISOString(), releasedAt: row.releasedAt?.toISOString() ?? null, version: row.version,
  ...row.reservation, poses: row.tables.map((table) => ({ tableId: table.tableId, label: table.labelSnapshot, shape: table.shapeSnapshot,
    capacity: table.capacitySnapshot, width: table.width, height: table.height, x: table.x, y: table.y, rotation: table.rotation as FloorRotation,
    ...(table.releasedAt ? { releasedAt: table.releasedAt.toISOString() } : {}) })),
});

function uniqueError(error: unknown): never {
  if (error instanceof Error && "code" in error && error.code === "P2002") throw new ConflictError("Ya existe un salón, mesa, combinación o cuenta con esos datos.");
  throw error;
}

export class PrismaFloorRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async getConfig(restaurantId: string): Promise<Omit<FloorConfigView, "compatibility">> {
    const restaurant = await this.database.restaurant.findUnique({ where: { id: restaurantId }, select: {
      id: true, name: true, timeZone: true, floorManagementEnabled: true, waiterAccount: { select: { email: true } },
      diningRooms: { include: roomInclude, orderBy: { name: "asc" } },
    } });
    if (!restaurant) throw new NotFoundError("Restaurante");
    return { restaurantId: restaurant.id, restaurantName: restaurant.name, timeZone: restaurant.timeZone,
      enabled: restaurant.floorManagementEnabled, rooms: restaurant.diningRooms.map(toFloorRoom), staffAccount: restaurant.waiterAccount };
  }

  async getBoard(restaurantId: string, at?: string, live = at === undefined): Promise<FloorBoardView> {
    const instant = live || at === undefined ? new Date() : new Date(at);
    if (!Number.isFinite(instant.getTime())) throw new BadRequestError("La fecha del plano no es válida.");
    const restaurant = await this.getConfig(restaurantId);
    const scheduled = { blockedFrom: { lte: instant }, blockedUntil: { gt: instant },
      OR: [{ releasedAt: null }, { releasedAt: { gt: instant } }] };
    const rows = await this.database.reservationAllocation.findMany({
      where: { restaurantId, OR: live ? [scheduled, { serviceAccounts: { some: { closedAt: null } } }] : [scheduled] },
      include: { ...allocationInclude, serviceAccounts: {
        where: { closedAt: null }, select: { tables: { where: { releasedAt: null }, select: { tableId: true } } },
      } },
    });
    const liveOwners = new Map(live ? rows.flatMap((row) => row.serviceAccounts.flatMap((account) =>
      account.tables.map(({ tableId }) => [tableId, row.id] as const))) : []);
    const views = rows.map(toAllocation);
    const occupied = views.flatMap((view) => view.poses.flatMap((pose) =>
      liveOwners.get(pose.tableId) === view.id ? [{ id: view.id, roomId: view.roomId, pose }] : []));
    const allocations = rows.map((row, index): FloorAllocationView => {
      const view = views[index];
      const overrun = live && row.blockedUntil <= instant && row.serviceAccounts.length > 0;
      const active = view.poses.filter((pose) => !pose.releasedAt || Date.parse(pose.releasedAt) > instant.getTime());
      let serviceConflict = false;
      const poses = active.filter((pose) => {
        const owner = liveOwners.get(pose.tableId);
        if (owner === row.id) return true;
        if (overrun) return false;
        const blocked = Boolean(owner) || occupied.some((table) => table.id !== row.id && table.roomId === row.roomId &&
          validateTableArrangement([table.pose, pose]) !== null);
        if (blocked) serviceConflict = true;
        return !blocked;
      });
      return { ...view, poses, ...(overrun ? { serviceOverrun: true } : {}),
        ...(serviceConflict ? { serviceConflict: true } : {}),
        ...(active.length < view.poses.length ? { servicePartiallyReleased: true } : {}) };
    });
    return { restaurantId, restaurantName: restaurant.restaurantName, timeZone: restaurant.timeZone,
      enabled: restaurant.enabled, at: instant.toISOString(), rooms: restaurant.rooms.filter((room) => room.active),
      allocations, updatedAt: new Date().toISOString() };
  }

  async saveRoom(restaurantId: string, raw: FloorRoomInput, expectedRevision: number): Promise<FloorRoom> {
    const input = floorRoomInputSchema.parse(raw);
    const invalid = validateRoomLayout(input);
    if (invalid) throw new BadRequestError(invalid);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new BadRequestError("La revisión del salón no es válida.");
    try {
      return await withSqliteTransaction(this.database, (tx) => this.saveRoomInTransaction(tx, restaurantId, input, expectedRevision));
    } catch (error) { return uniqueError(error); }
  }

  async saveTables(restaurantId: string, raw: FloorTableInventoryInput): Promise<FloorRoom> {
    const command = floorTableInventorySchema.parse(raw);
    try {
      return await withSqliteTransaction(this.database, async (tx) => {
        const existing = await tx.diningRoom.findFirst({ where: { id: command.roomId, restaurantId }, include: roomInclude });
        if (!existing) throw new NotFoundError("Salón");
        // The caller can send only table inventory. Plan geometry is read under the same transaction.
        const input = floorRoomInputSchema.parse({ ...toFloorRoom(existing), tables: command.tables, combinations: command.combinations });
        const invalid = validateRoomLayout(input);
        if (invalid) throw new BadRequestError(invalid);
        return this.saveRoomInTransaction(tx, restaurantId, input, command.expectedRevision, true);
      });
    } catch (error) { return uniqueError(error); }
  }

  private async saveRoomInTransaction(tx: Prisma.TransactionClient, restaurantId: string, input: FloorRoomInput, expectedRevision: number, tablesOnly = false): Promise<FloorRoom> {
    const id = input.id || randomUUID();
    const existing = await tx.diningRoom.findUnique({ where: { id }, include: roomInclude });
    if (existing && existing.restaurantId !== restaurantId) throw new NotFoundError("Salón");
    if ((existing?.revision ?? 0) !== expectedRevision) throw new ConflictError("El salón cambió en otra pestaña. Actualizalo antes de guardar.");
    const now = new Date();
    const future = existing ? (await tx.reservationAllocation.findMany({ where: {
      restaurantId, roomId: id, releasedAt: null,
      OR: [{ blockedUntil: { gt: now } }, { serviceAccounts: { some: { closedAt: null } } }],
    }, include: allocationInclude })).map((row) => {
      const view = toAllocation(row);
      return { ...view, poses: view.poses.filter((pose) => !pose.releasedAt) };
    }) : [];
    if (!input.active && future.length) throw new ConflictError("El salón tiene reservas futuras asignadas. Reasignalas antes de archivarlo.");
    for (const old of existing?.tables ?? []) {
      const next = input.tables.find((table) => table.id === old.id);
      const committed = future.some((allocation) => allocation.poses.some((pose) => pose.tableId === old.id));
      if (committed && (!next || !next.active || next.capacity !== old.capacity || next.shape !== old.shape || next.width !== old.width || next.height !== old.height)) {
        throw new ConflictError(`La mesa ${old.label} tiene reservas futuras. Reasignala antes de cambiar su capacidad, forma o tamaño.`);
      }
    }
    const candidate: FloorRoom = { ...input, id, restaurantId, revision: (existing?.revision ?? -1) + 1 };
    const conflict = validateFloorPlacement(candidate, null, future);
    if (conflict) throw new ConflictError(conflict);
    // Client-generated IDs are accepted only if they do not belong to another room.
    const [foreignTables, foreignCombinations, foreignLocations] = await Promise.all([
      tx.diningTable.count({ where: { id: { in: input.tables.map((table) => table.id) }, NOT: { restaurantId, roomId: id } } }),
      tx.diningTableCombination.count({ where: { id: { in: input.combinations.map((item) => item.id) }, NOT: { restaurantId, roomId: id } } }),
      tx.diningRoomLocation.count({ where: { id: { in: input.locations.map((item) => item.id) }, NOT: { restaurantId, roomId: id } } }),
    ]);
    if (foreignTables || foreignCombinations || foreignLocations) throw new NotFoundError("Mesa, combinación o ubicación");
    if (tablesOnly) await tx.diningRoom.update({ where: { id }, data: { revision: { increment: 1 } } });
    else await tx.diningRoom.upsert({ where: { id }, create: { id, restaurantId, name: input.name, width: input.width, height: input.height,
      fixturesJson: JSON.stringify(input.fixtures), active: input.active, revision: 0 },
    update: { name: input.name, width: input.width, height: input.height, fixturesJson: JSON.stringify(input.fixtures), active: input.active, revision: { increment: 1 } } });
    // Archive omitted records instead of deleting IDs referenced by historical bookings.
    if (!tablesOnly) {
      await tx.diningRoomLocation.updateMany({ where: { restaurantId, roomId: id, id: { notIn: input.locations.map((location) => location.id) } }, data: { active: false } });
      for (const location of input.locations) {
        const { id: locationId, ...data } = location;
        await tx.diningRoomLocation.upsert({ where: { id: locationId }, create: { id: locationId, restaurantId, roomId: id, ...data }, update: data });
      }
    }
    await tx.diningTable.updateMany({ where: { restaurantId, roomId: id, id: { notIn: input.tables.map((table) => table.id) } }, data: { active: false } });
    for (const table of input.tables) {
      const { id: tableId, ...data } = table;
      await tx.diningTable.upsert({ where: { id: tableId }, create: { id: tableId, restaurantId, roomId: id, ...data }, update: data });
    }
    await tx.diningTableCombination.updateMany({ where: { restaurantId, roomId: id, id: { notIn: input.combinations.map((item) => item.id) } }, data: { active: false } });
    for (const combination of input.combinations) {
      const { id: combinationId, members, ...data } = combination;
      await tx.diningTableCombination.upsert({ where: { id: combinationId }, create: { id: combinationId, restaurantId, roomId: id, ...data }, update: data });
      await tx.diningTableCombinationMember.deleteMany({ where: { combinationId, restaurantId } });
      await tx.diningTableCombinationMember.createMany({ data: members.map((member) => ({ ...member, combinationId, restaurantId, roomId: id })) });
    }
    return toFloorRoom(await tx.diningRoom.findUniqueOrThrow({ where: { id }, include: roomInclude }));
  }

  async archiveRoom(restaurantId: string, roomId: string, expectedRevision: number) {
    const config = await this.getConfig(restaurantId);
    const room = config.rooms.find((item) => item.id === roomId);
    if (!room) throw new NotFoundError("Salón");
    return this.saveRoom(restaurantId, { ...room, active: false }, expectedRevision);
  }

  async updateTimeZone(restaurantId: string, timeZone: string) {
    const zone = validateTimeZone(timeZone);
    await withSqliteTransaction(this.database, async (tx) => {
      const restaurant = await tx.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
      if (restaurant.timeZone === zone) return;
      const future = await tx.reservationAllocation.count({ where: {
        restaurantId, releasedAt: null,
        OR: [{ blockedUntil: { gt: new Date() } }, { serviceAccounts: { some: { closedAt: null } } }],
      } });
      if (future) throw new ConflictError("Resolvé las asignaciones futuras antes de cambiar la zona horaria.");
      await tx.restaurant.update({ where: { id: restaurantId }, data: { timeZone: zone } });
    });
  }

  async activate(restaurantId: string): Promise<void> {
    await withSqliteTransaction(this.database, async (tx) => {
      const restaurant = await tx.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
      const rooms = await tx.diningRoom.findMany({ where: { restaurantId, active: true }, include: roomInclude });
      if (!rooms.some((room) => room.tables.some((table) => table.active) && room.locations.some((location) => location.active))) throw new BadRequestError("Configurá al menos un salón con inventario de mesas y ubicaciones activas antes de activar las asignaciones.");
      for (const room of rooms) {
        const invalid = validateRoomLayout(toFloorRoom(room));
        if (invalid) throw new ConflictError(invalid);
      }
      const today = restaurantToday(restaurant.timeZone);
      const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
      const future = await tx.tableReservation.findMany({ where: { restaurantId, status: "CONFIRMED", date: { gte: yesterday } }, include: { allocation: true, event: true } });
      for (const reservation of future) {
        const interval = calculateFloorInterval({ date: reservation.date, time: reservation.time, timeZone: restaurant.timeZone, event: reservation.event });
        if (Date.parse(interval.serviceEndAt) > Date.now() && (!reservation.allocation || reservation.allocation.releasedAt)) throw new ConflictError(`Asigná mesas a la reserva ${reservation.code} antes de activar los salones.`);
      }
      const events = await tx.restaurantEvent.findMany({ where: { restaurantId, status: "PUBLISHED", date: { gte: yesterday } }, include: { rooms: true } });
      if (events.some((event) => Date.parse(calculateFloorInterval({ date: event.date, time: event.startTime, timeZone: restaurant.timeZone, event }).serviceEndAt) > Date.now()
        && (!event.rooms.length || event.rooms.some((selected) => !rooms.some((room) => room.id === selected.roomId))))) throw new ConflictError("Elegí los salones de los próximos eventos antes de activar las asignaciones.");
      await tx.restaurant.update({ where: { id: restaurantId }, data: { floorManagementEnabled: true } });
    });
  }

  async setStaffAccount(restaurantId: string, email: string, password: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || password.length < 8 || password.length > 128) throw new BadRequestError("Ingresá un email válido y una contraseña de entre 8 y 128 caracteres.");
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      await withSqliteTransaction(this.database, async (tx) => {
        const account = await tx.admin.findUnique({ where: { restaurantId } });
        if (account) {
          await tx.admin.update({ where: { id: account.id }, data: { email: normalized, passwordHash, mustChangePassword: false } });
          await tx.session.deleteMany({ where: { adminId: account.id } });
        } else await tx.admin.create({ data: { restaurantId, email: normalized, passwordHash, role: "WAITER", mustChangePassword: false } });
      });
    } catch (error) { uniqueError(error); }
  }

  async disableStaffAccount(restaurantId: string) {
    await this.database.admin.deleteMany({ where: { restaurantId, role: "WAITER" } });
  }
}

export function allocationLeases(rows: FloorAllocationView[]): FloorLease[] { return rows; }
