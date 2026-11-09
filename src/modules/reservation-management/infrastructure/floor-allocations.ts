import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import {
  buildFloorOptions, calculateFloorInterval, floorAssignmentSchema, floorPoseOverlaps, floorTableSeparationGap, getJoinedTableGroups, toFloorRoom, transformPoses, usableTableCapacity,
  validateFloorPlacement, findFloorPlacement, validateTableArrangement, restaurantLocalDateTime,
  type FloorAllocationView, type FloorAssignmentInput, type FloorAssignmentOption, type FloorInterval,
  type FloorLease, type FloorOptionsQuery, type FloorOptionsView, type FloorPose, type FloorRoom, type FloorRotation,
} from "@/modules/floor-management/contracts";

type Database = PrismaClient | Prisma.TransactionClient;
const roomInclude = { locations: true, tables: true, combinations: { include: { members: true } } } satisfies Prisma.DiningRoomInclude;
const allocationInclude = { tables: true, reservation: { select: { customerName: true, partySize: true, date: true, time: true, notes: true, code: true, source: true, status: true, revision: true } } } satisfies Prisma.ReservationAllocationInclude;
type Allocation = Prisma.ReservationAllocationGetPayload<{ include: typeof allocationInclude }>;
type Event = Prisma.RestaurantEventGetPayload<{ include: { rooms: true } }>;

export function allocationToView(allocation: Allocation): FloorAllocationView {
  return {
    id: allocation.id, reservationId: allocation.reservationId, roomId: allocation.roomId, combinationId: allocation.combinationId,
    capacity: allocation.capacity, timeZone: allocation.timeZone, serviceStartAt: allocation.serviceStartAt.toISOString(),
    serviceEndAt: allocation.serviceEndAt.toISOString(), blockedFrom: allocation.blockedFrom.toISOString(),
    blockedUntil: allocation.blockedUntil.toISOString(), releasedAt: allocation.releasedAt?.toISOString() ?? null,
    version: allocation.version, locationId: allocation.locationId, ...allocation.reservation, reservationRevision: allocation.reservation.revision,
    poses: allocation.tables.map((table) => ({ tableId: table.tableId, label: table.labelSnapshot, shape: table.shapeSnapshot,
      capacity: table.capacitySnapshot, width: table.width, height: table.height, x: table.x, y: table.y, rotation: table.rotation as FloorRotation,
      ...(table.releasedAt ? { releasedAt: table.releasedAt.toISOString() } : {}) })),
  };
}

/** Actual occupancy is used for live seating only, never for the future reservation calendar. */
async function openServiceLeases(database: Database, restaurantId: string, from: string, until: string): Promise<FloorAllocationView[]> {
  const allocations = await database.reservationAllocation.findMany({
    where: { restaurantId, serviceAccounts: { some: { closedAt: null } } },
    include: { ...allocationInclude, serviceAccounts: {
      where: { closedAt: null }, select: { tables: { where: { releasedAt: null }, select: { tableId: true } } },
    } },
  });
  return allocations.map((allocation) => {
    const openTables = new Set(allocation.serviceAccounts.flatMap((account) => account.tables.map((table) => table.tableId)));
    const view = allocationToView(allocation);
    return { ...view, blockedFrom: from, blockedUntil: until, poses: view.poses.filter((pose) => openTables.has(pose.tableId) && !pose.releasedAt) };
  });
}

export async function loadFloorState(database: Database, restaurantId: string, from: Date, until: Date) {
  const restaurant = await database.restaurant.findUnique({ where: { id: restaurantId }, select: { floorManagementEnabled: true, timeZone: true, reservationPreparationMinutes: true, reservationDurationMinutes: true } });
  if (!restaurant) throw new NotFoundError("Restaurante");
  const [rooms, allocations, events] = await Promise.all([
    database.diningRoom.findMany({ where: { restaurantId, active: true }, include: roomInclude, orderBy: { name: "asc" } }),
    database.reservationAllocation.findMany({ where: { restaurantId, blockedFrom: { lt: until }, blockedUntil: { gt: from } }, include: allocationInclude }),
    database.restaurantEvent.findMany({ where: { restaurantId, status: "PUBLISHED", date: {
      gte: restaurantLocalDateTime(restaurant.timeZone, new Date(from.getTime() - 86_400_000)).date,
      lte: restaurantLocalDateTime(restaurant.timeZone, new Date(until.getTime() + 2 * 60 * 60_000)).date,
    } }, include: { rooms: true } }),
  ]);
  return { restaurant, rooms: rooms.map(toFloorRoom), allocations: allocations.map(allocationToView), events };
}

function overlapping(a: { blockedFrom: string; blockedUntil: string }, b: { blockedFrom: string; blockedUntil: string; releasedAt?: string | null }) {
  const start = Date.parse(b.blockedFrom);
  const end = Math.min(Date.parse(b.blockedUntil), b.releasedAt ? Date.parse(b.releasedAt) : Infinity);
  return end > start && Date.parse(a.blockedFrom) < end && Date.parse(a.blockedUntil) > start;
}

function evaluateOptions(rooms: FloorRoom[], allocations: FloorAllocationView[], events: Event[], interval: FloorInterval,
  partySize: number, eventId?: string | null, excludeReservationId?: string): FloorAssignmentOption[] {
  const event = eventId ? events.find((item) => item.id === eventId) : null;
  const permitted = event ? new Set(event.rooms.map((room) => room.roomId)) : null;
  // Inventory identities differ while their shapes often repeat. Reuse only geometry within this interval.
  const fitCache = new Map<string, { locationId: string; x: number; y: number; rotation: FloorRotation } | null>();
  return rooms.flatMap((room) => buildFloorOptions(room).map((option) => {
    let conflict: string | undefined;
    if (eventId && (!event || !permitted?.has(room.id))) conflict = "El salón no está habilitado para este evento.";
    const exclusive = events.find((item) => item.id !== eventId && item.blocksRegularReservations && item.rooms.some((selected) => selected.roomId === room.id)
      && overlapping(interval, calculateFloorInterval({ date: item.date, time: item.startTime, timeZone: interval.timeZone, event: item })));
    if (exclusive) conflict = `El salón está reservado para el evento ${exclusive.title}.`;
    const ids = new Set(option.poses.map((pose) => pose.tableId));
    const occupied = allocations.find((allocation) => allocation.reservationId !== excludeReservationId
      && allocation.poses.some((pose) => ids.has(pose.tableId)
        && floorPoseOverlaps(allocation, pose, Date.parse(interval.blockedFrom), Date.parse(interval.blockedUntil))));
    if (occupied) conflict = `La mesa está asignada a ${occupied.customerName} (${occupied.code}).`;
    const resourceAvailable = !conflict;
    if (!conflict && option.capacity < partySize) conflict = "La capacidad útil no alcanza para este grupo.";
    let placement: ReturnType<typeof findFloorPlacement> = null;
    if (resourceAvailable && option.capacity >= partySize) {
      const relative = option.poses.map((pose) => ({ ...pose, x: pose.x - option.x, y: pose.y - option.y }));
      const key = JSON.stringify([room.id, option.rotation, relative.map((pose) => [pose.shape, pose.width, pose.height, pose.x, pose.y, pose.rotation])]);
      if (!fitCache.has(key)) {
        const found = findFloorPlacement(room, option, interval, allocations, excludeReservationId);
        fitCache.set(key, found ? { locationId: found.locationId, x: found.x, y: found.y, rotation: found.rotation } : null);
      }
      const found = fitCache.get(key);
      if (found) placement = { ...found, poses: transformPoses(relative, found.x, found.y, ((found.rotation - option.rotation + 360) % 360) as FloorRotation) };
    }
    if (!conflict && !placement) conflict = "No hay espacio libre en los sectores para este armado.";
    return { ...option, ...(placement ?? {}), resourceAvailable, available: !conflict, ...(conflict ? { conflict } : {}) };
  }));
}

export async function getFloorAssignmentOptions(database: Database, restaurantId: string, query: FloorOptionsQuery, intervalOverride?: FloorInterval, excludedReservationIds: readonly string[] = [], operational = false): Promise<FloorOptionsView> {
  const settings = await database.restaurant.findUnique({ where: { id: restaurantId }, select: { timeZone: true, reservationPreparationMinutes: true, reservationDurationMinutes: true } });
  if (!settings) throw new NotFoundError("Restaurante");
  const event = query.eventId ? await database.restaurantEvent.findFirst({ where: { id: query.eventId, restaurantId }, include: { rooms: true } }) : null;
  if (query.eventId && !event) throw new NotFoundError("Evento");
  const interval = intervalOverride ?? calculateFloorInterval({
    ...query,
    timeZone: settings.timeZone,
    event,
    preparationMinutes: settings.reservationPreparationMinutes,
    durationMinutes: settings.reservationDurationMinutes,
  });
  const state = await loadFloorState(database, restaurantId, new Date(interval.blockedFrom), new Date(interval.blockedUntil));
  const live = operational ? await openServiceLeases(database, restaurantId, interval.blockedFrom, interval.blockedUntil) : [];
  const allocations = [...state.allocations, ...live].filter((allocation) => !excludedReservationIds.includes(allocation.reservationId));
  const current = query.excludeReservationId ? await database.reservationAllocation.findUnique({ where: { reservationId: query.excludeReservationId }, include: allocationInclude }) : null;
  const currentAllocation = current?.restaurantId === restaurantId ? allocationToView(current) : null;
  if (currentAllocation) {
    currentAllocation.poses = currentAllocation.poses.filter((pose) => !pose.releasedAt);
    currentAllocation.capacity = Math.min(currentAllocation.capacity, usableTableCapacity(currentAllocation.poses));
  }
  // Administrators may organize a draft event before publication.
  const events = event && !state.events.some((item) => item.id === event.id) ? [...state.events, event] : state.events;
  const options = evaluateOptions(state.rooms, allocations, events, interval, query.partySize, query.eventId, query.excludeReservationId);
  const hasAvailability = options.some((option) => option.available) || state.rooms.some((room) => hasCustomCapacity(room, options, query.partySize, interval, allocations.filter((lease) => lease.reservationId !== query.excludeReservationId)));
  return { rooms: state.rooms, options, interval, currentAllocation, hasAvailability };
}

export async function getPhysicalAvailability(database: Database, restaurantId: string, query: { dates: string[]; times: string[]; partySize: number }): Promise<Record<string, string[]>> {
  if (!query.dates.length) return {};
  const state = await loadFloorState(database, restaurantId,
    new Date(Date.parse(`${query.dates[0]}T00:00:00Z`) - 86_400_000),
    new Date(Date.parse(`${query.dates[query.dates.length - 1]}T00:00:00Z`) + 3 * 86_400_000));
  const result: Record<string, string[]> = {};
  for (const date of query.dates) {
    result[date] = query.times.filter((time) => {
      try {
        const interval = calculateFloorInterval({
          date,
          time,
          timeZone: state.restaurant.timeZone,
          preparationMinutes: state.restaurant.reservationPreparationMinutes,
          durationMinutes: state.restaurant.reservationDurationMinutes,
        });
        if (Date.parse(interval.serviceStartAt) <= Date.now()) return false;
        const options = evaluateOptions(state.rooms, state.allocations, state.events, interval, query.partySize);
        return options.some((option) => option.available) || state.rooms.some((room) => hasCustomCapacity(room, options, query.partySize, interval, state.allocations));
      } catch { return false; }
    });
  }
  return result;
}

function hasCustomCapacity(room: FloorRoom, options: FloorAssignmentOption[], partySize: number, interval: FloorInterval, allocations: FloorLease[]): boolean {
  const inventory = options.filter((option) => option.roomId === room.id && option.id.startsWith("table:") && option.resourceAvailable);
  // Try bounded rows of tables, with and without the gap used to separate tables on the floor.
  for (const direction of [1, -1]) {
    const ordered = [...inventory].sort((a, b) => direction * (a.capacity - b.capacity)).slice(0, 40);
    for (const gap of [0, floorTableSeparationGap]) {
      const members: FloorPose[] = [];
      let width = 0;
      for (const option of ordered) {
        const table = option.poses[0];
        const left = width + (members.length ? gap : 0);
        members.push({ ...table, x: left + table.width / 2, y: 0, rotation: 0 });
        width = left + table.width;
        if (members.length < 2) continue;
        const capacity = usableTableCapacity(members);
        if (capacity < partySize) continue;
        const candidate: FloorAssignmentOption = { id: "custom", roomId: room.id, label: "Armado a medida", capacity, x: width / 2, y: 0, rotation: 0, poses: members, available: true };
        if (findFloorPlacement(room, candidate, interval, allocations)) return true;
      }
    }
  }
  return false;
}

function poseRows(poses: FloorPose[]) {
  return poses.map((pose) => ({ tableId: pose.tableId, labelSnapshot: pose.label,
    shapeSnapshot: pose.shape, capacitySnapshot: pose.capacity, width: pose.width, height: pose.height,
    x: pose.x, y: pose.y, rotation: pose.rotation }));
}

export async function syncReservationAllocation(tx: Prisma.TransactionClient, reservation: Prisma.TableReservationGetPayload<object>, assignment?: FloorAssignmentInput, now = new Date(), intervalOverride?: FloorInterval, live = false): Promise<void> {
  const settings = await tx.restaurant.findUniqueOrThrow({ where: { id: reservation.restaurantId }, select: { floorManagementEnabled: true } });
  const existing = await tx.reservationAllocation.findUnique({ where: { reservationId: reservation.id }, include: allocationInclude });
  if (reservation.status !== "CONFIRMED") {
    if (existing && !existing.releasedAt) await tx.reservationAllocation.update({ where: { id: existing.id }, data: { releasedAt: now, version: { increment: 1 } } });
    return;
  }
  if (!settings.floorManagementEnabled && !assignment && !existing) return;
  const prepared = await prepareReservationAllocation(tx, reservation, assignment, intervalOverride, [], existing, live ? now : undefined);
  await persistPreparedReservationAllocation(tx, prepared);
}

/** Resolve and validate an assignment without changing reservation or allocation rows. */
export async function prepareReservationAllocation(tx: Prisma.TransactionClient, reservation: Prisma.TableReservationGetPayload<object>, assignment?: FloorAssignmentInput, intervalOverride?: FloorInterval, excludedReservationIds: readonly string[] = [], current?: Allocation | null, liveAt?: Date) {
  const existing = current === undefined ? await tx.reservationAllocation.findUnique({ where: { reservationId: reservation.id }, include: allocationInclude }) : current;
  const serviceAccounts = existing ? await tx.serviceAccount.findMany({
    where: { allocationId: existing.id, restaurantId: reservation.restaurantId },
    select: { closedAt: true, tables: { select: { tableId: true } } },
  }) : [];
  const partiallyReleased = existing?.tables.some((table) => table.releasedAt !== null);
  const openAccounts = serviceAccounts.filter((account) => !account.closedAt);
  const overrun = Boolean(existing && liveAt && existing.blockedUntil <= liveAt && openAccounts.length);
  const openTableIds = new Set(openAccounts.flatMap((account) => account.tables.map((table) => table.tableId)));
  if (!assignment && (!existing || existing.releasedAt)) throw new BadRequestError("Elegí un salón y sus mesas antes de confirmar la reserva.");
  if (assignment) assignment = floorAssignmentSchema.parse(assignment);
  const retainedWalkInInterval = reservation.source === "WALK_IN" && existing ? allocationToView(existing) : undefined;
  const options = await getFloorAssignmentOptions(tx, reservation.restaurantId, {
    date: reservation.date, time: reservation.time, partySize: reservation.partySize,
    eventId: reservation.eventId, excludeReservationId: reservation.id,
  }, intervalOverride ?? retainedWalkInInterval, excludedReservationIds, Boolean(liveAt && !existing));
  let room: FloorRoom | undefined;
  let poses: FloorPose[];
  let capacity: number;
  let combinationId: string | null;
  let locationId: string | null;
  if (assignment && !assignment.retainExisting) {
    room = options.rooms.find((item) => item.id === assignment!.roomId);
    if (!room) throw new NotFoundError("Salón");
    if (room.revision !== assignment.expectedRoomRevision) throw new ConflictError("El plano cambió. Actualizalo antes de asignar mesas.");
    locationId = assignment.locationId ?? null;
    if (!locationId || !room.locations.some((location) => location.id === locationId && location.active)) throw new BadRequestError("Elegí un sector del salón para armar las mesas.");
    if (assignment.optionId === "custom") {
      if (!assignment.customTables?.length || !assignment.capacity) throw new BadRequestError("Elegí las mesas y la capacidad útil del armado.");
      poses = assignment.customTables.map((selected) => {
        const table = room!.tables.find((item) => item.id === selected.tableId && item.active);
        if (!table) throw new BadRequestError("El armado usa una mesa inexistente o inactiva.");
        return { tableId: table.id, label: table.label, shape: table.shape, capacity: table.capacity, width: table.width, height: table.height, x: selected.x, y: selected.y, rotation: selected.rotation };
      });
      const invalid = validateTableArrangement(poses); if (invalid) throw new BadRequestError(invalid);
      capacity = assignment.capacity;
      if (capacity > usableTableCapacity(poses)) throw new BadRequestError("La capacidad útil supera los lugares disponibles con esa disposición de mesas.");
      combinationId = null;
    } else {
      const option = options.options.find((item) => item.id === assignment!.optionId && item.roomId === room!.id);
      if (!option || !option.resourceAvailable) throw new ConflictError(option?.conflict ?? "La opción de mesas ya no está disponible.");
      const relative = option.poses.map((pose) => ({ ...pose, x: pose.x - option.x, y: pose.y - option.y }));
      const delta = ((assignment.rotation - option.rotation + 360) % 360) as FloorRotation;
      poses = transformPoses(relative, assignment.x, assignment.y, delta);
      capacity = Math.min(option.capacity, usableTableCapacity(poses));
      combinationId = option.id.startsWith("combination:") ? option.id.slice("combination:".length) : null;
    }
    if (!partiallyReleased && !overrun && capacity < reservation.partySize) throw new ConflictError("La capacidad útil no alcanza para este grupo.");
  } else {
    if (!existing || existing.releasedAt) throw new ConflictError("La reserva ya no tiene una asignación vigente. Elegí sus mesas nuevamente.");
    room = options.rooms.find((item) => item.id === existing!.roomId);
    if (!room) throw new ConflictError("El salón asignado ya no está disponible.");
    if (assignment && (assignment.roomId !== room.id || assignment.expectedRoomRevision !== room.revision)) throw new ConflictError("El plano cambió. Actualizalo antes de conservar la asignación.");
    combinationId = existing.combinationId;
    locationId = existing.locationId;
    poses = allocationToView(existing).poses.filter((pose) => !pose.releasedAt);
    capacity = Math.min(existing.capacity, usableTableCapacity(poses));
    if (!partiallyReleased && capacity < reservation.partySize) throw new ConflictError("El grupo supera la capacidad de las mesas asignadas.");
    if (reservation.eventId) {
      const eventRoom = await tx.restaurantEventRoom.findFirst({ where: { eventId: reservation.eventId, restaurantId: reservation.restaurantId, roomId: room.id } });
      if (!eventRoom) throw new ConflictError("Las mesas asignadas no pertenecen a los salones del evento.");
    }
    const currentOptions = options.options.filter((option) => option.id.startsWith("table:") && option.roomId === room!.id && option.poses.some((pose) => poses.some((selected) => selected.tableId === pose.tableId)));
    const resourceConflict = currentOptions.find((option) => !option.resourceAvailable && option.conflict);
    if (resourceConflict) throw new ConflictError(resourceConflict.conflict!);
  }
  const previousPoses = existing ? allocationToView(existing).poses.filter((pose) => !pose.releasedAt) : [];
  if (existing && serviceAccounts.length) {
    const previousIds = new Set(previousPoses.filter((pose) => !overrun || openTableIds.has(pose.tableId)).map((pose) => pose.tableId));
    if (room.id !== existing.roomId || poses.length !== previousIds.size || poses.some((pose) => !previousIds.has(pose.tableId))) {
      throw new ConflictError("La reserva ya tiene servicio registrado. Conservá las mesas restantes en el mismo salón.");
    }
    const groups = getJoinedTableGroups(poses);
    for (const account of openAccounts) {
      const memberIds = new Set(account.tables.map((table) => table.tableId));
      if (!groups.some((group) => group.length === memberIds.size && group.every((pose) => memberIds.has(pose.tableId)))) {
        throw new ConflictError("Un armado con cuenta abierta se puede mover o girar, pero debe conservar sus mesas juntas.");
      }
    }
  }
  const proposal: FloorLease = { ...options.interval, id: existing?.id ?? "new", reservationId: reservation.id, roomId: room.id, locationId, releasedAt: null, poses };
  if (!overrun) {
    const state = await loadFloorState(tx, reservation.restaurantId, new Date(options.interval.blockedFrom), new Date(options.interval.blockedUntil));
    const unavailable = options.options.find((option) => option.id.startsWith("table:") && option.roomId === room!.id && !option.resourceAvailable && poses.some((pose) => option.poses.some((member) => member.tableId === pose.tableId)));
    if (unavailable) throw new ConflictError(unavailable.conflict ?? "Una mesa del armado ya no está disponible.");
    const invalid = validateFloorPlacement(room, proposal, state.allocations.filter((allocation) => !excludedReservationIds.includes(allocation.reservationId)));
    if (invalid) throw new ConflictError(invalid);
  }
  if (liveAt && Date.parse(proposal.blockedFrom) <= liveAt.getTime()) {
    const liveFrom = liveAt.toISOString();
    const liveUntil = new Date(Math.max(liveAt.getTime() + 1, Date.parse(proposal.blockedUntil))).toISOString();
    const serviceLeases = await openServiceLeases(tx, reservation.restaurantId, liveFrom, liveUntil);
    const liveConflict = validateFloorPlacement(room, { ...proposal, blockedFrom: liveFrom, blockedUntil: liveUntil },
      serviceLeases.filter((allocation) => !excludedReservationIds.includes(allocation.reservationId)));
    if (liveConflict) throw new ConflictError("Hay una cuenta abierta que ocupa estas mesas o su ubicación. " + liveConflict);
  }
  // Expired groups without a check keep their stored geometry for the no-consumption closeout.
  if (overrun && existing) {
    poses = [...poses, ...previousPoses.filter((pose) => !openTableIds.has(pose.tableId))];
    capacity = existing.capacity;
  }
  const fields = { restaurantId: reservation.restaurantId, roomId: room.id, locationId, combinationId, capacity,
    timeZone: options.interval.timeZone, serviceStartAt: new Date(options.interval.serviceStartAt), serviceEndAt: new Date(options.interval.serviceEndAt),
    blockedFrom: new Date(options.interval.blockedFrom), blockedUntil: new Date(options.interval.blockedUntil), releasedAt: null, roomRevision: room.revision };
  return { reservationId: reservation.id, existingId: existing?.id, fields, poses, room, proposal, overrun };
}

export async function persistPreparedReservationAllocation(tx: Prisma.TransactionClient, prepared: Awaited<ReturnType<typeof prepareReservationAllocation>>) {
  const { reservationId, existingId, fields, poses } = prepared;
  if (existingId) {
    await tx.reservationAllocationTable.deleteMany({ where: { allocationId: existingId, releasedAt: null } });
    await tx.reservationAllocation.update({ where: { id: existingId }, data: { ...fields, version: { increment: 1 }, tables: { create: poseRows(poses) } } });
  } else await tx.reservationAllocation.create({ data: { id: randomUUID(), reservationId, ...fields, tables: { create: poseRows(poses) } } });
}
