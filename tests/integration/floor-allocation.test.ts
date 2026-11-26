import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../src/generated/prisma/client";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { withSqliteTransaction } from "../../src/platform/database/sqlite-transaction";
import { getFloorAssignmentOptions, syncReservationAllocation } from "../../src/modules/reservation-management/infrastructure/floor-allocations";
import type { FloorAssignmentInput } from "../../src/modules/floor-management/contracts";

const date = "2099-12-01";
const timeZone = "America/Argentina/Buenos_Aires";
const directory = path.resolve("test-results", `floor-allocation-test-${randomUUID()}`);
const url = `file:${path.join(directory, "floor-test.db").replaceAll("\\", "/")}`;

describe("SQLite physical reservation allocations", () => {
  let first: PrismaClient;
  let second: PrismaClient;
  let FloorRepository: typeof import("../../src/modules/floor-management/infrastructure/prisma-floor-repository").PrismaFloorRepository;
  const organizations: string[] = [];

  beforeAll(async () => {
    await mkdir(directory, { recursive: true });
    const database = createClient({ url });
    try {
      const migrationRoot = path.resolve("prisma/migrations");
      for (const name of (await readdir(migrationRoot)).filter((item) => /^\d/.test(item)).sort()) {
        await database.executeMultiple(await readFile(path.join(migrationRoot, name, "migration.sql"), "utf8"));
      }
      expect((await database.execute("PRAGMA journal_mode=WAL")).rows[0]?.journal_mode).toBe("wal");
    } finally { database.close(); }
    first = createSqlitePrismaClient(url);
    second = createSqlitePrismaClient(url);
    vi.stubEnv("DATABASE_URL", url);
    vi.stubEnv("JWT_SECRET", "floor-allocation-test-secret-at-least-32-characters");
    ({ PrismaFloorRepository: FloorRepository } = await import("../../src/modules/floor-management/infrastructure/prisma-floor-repository"));
  }, 30_000);
  afterEach(async () => {
    await first.organization.deleteMany({ where: { id: { in: organizations.splice(0) } } });
  });
  afterAll(async () => {
    await Promise.all([first?.$disconnect(), second?.$disconnect()]);
    vi.unstubAllEnvs();
    // Native SQLite can retain Windows handles until process exit; keep these isolated, ignored test artifacts.
  });

  async function fixture() {
    const slug = `floor-${randomUUID()}`;
    const organization = await first.organization.create({ data: { name: slug, slug } });
    organizations.push(organization.id);
    const restaurant = await first.restaurant.create({ data: { organizationId: organization.id, name: slug, slug, landingSlug: slug, floorManagementEnabled: true, timeZone } });
    const room = await first.diningRoom.create({ data: { restaurantId: restaurant.id, name: "Main", width: 1000, height: 800 } });
    const terrace = await first.diningRoom.create({ data: { restaurantId: restaurant.id, name: "Terrace", width: 1000, height: 800 } });
    const location = await first.diningRoomLocation.create({ data: { restaurantId: restaurant.id, roomId: room.id, name: "Ventana", x: 500, y: 400, width: 1000, height: 800 } });
    const terraceLocation = await first.diningRoomLocation.create({ data: { restaurantId: restaurant.id, roomId: terrace.id, name: "Terraza", x: 500, y: 400, width: 1000, height: 800 } });
    const a = await first.diningTable.create({ data: { restaurantId: restaurant.id, roomId: room.id, label: "1", shape: "SQUARE", capacity: 4, x: 150, y: 150, width: 80, height: 80 } });
    const b = await first.diningTable.create({ data: { restaurantId: restaurant.id, roomId: room.id, label: "2", shape: "SQUARE", capacity: 4, x: 400, y: 150, width: 80, height: 80 } });
    const terraceTable = await first.diningTable.create({ data: { restaurantId: restaurant.id, roomId: terrace.id, label: "T1", shape: "CIRCLE", capacity: 4, x: 150, y: 150, width: 80, height: 80 } });
    const combination = await first.diningTableCombination.create({ data: { restaurantId: restaurant.id, roomId: room.id, name: "1+2", capacity: 6, members: { create: [
      { tableId: a.id, x: -40, y: 0, rotation: 0 },
      { tableId: b.id, x: 40, y: 0, rotation: 0 },
    ] } } });
    return { restaurant, room, terrace, location, terraceLocation, a, b, terraceTable, combination };
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  async function booking(owner: Fixture, overrides: { partySize?: number; time?: string; eventId?: string } = {}) {
    return first.tableReservation.create({ data: { restaurantId: owner.restaurant.id, code: randomUUID(), customerName: "Customer", customerPhone: "12345678", partySize: 2, date, time: "20:00", ...overrides } });
  }
  function assignment(owner: Fixture, table = owner.a): FloorAssignmentInput {
    return { roomId: table.roomId, locationId: table.roomId === owner.room.id ? owner.location.id : owner.terraceLocation.id, optionId: `table:${table.id}`, expectedRoomRevision: 0, x: table.x, y: table.y, rotation: 0 };
  }
  async function confirm(client: PrismaClient, id: string, selected: FloorAssignmentInput) {
    return withSqliteTransaction(client, async (tx) => {
      const current = await tx.tableReservation.findUniqueOrThrow({ where: { id } });
      await syncReservationAllocation(tx, { ...current, status: "CONFIRMED" }, selected);
      return tx.tableReservation.update({ where: { id }, data: { status: "CONFIRMED", revision: { increment: 1 } } });
    });
  }

  it("allows only one of two clients to confirm the same physical table", async () => {
    const owner = await fixture(); const a = await booking(owner); const b = await booking(owner);
    const results = await Promise.allSettled([confirm(first, a.id, assignment(owner)), confirm(second, b.id, assignment(owner))]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } });
    expect(await first.reservationAllocation.count({ where: { restaurantId: owner.restaurant.id } })).toBe(1);
    expect(await first.tableReservation.count({ where: { restaurantId: owner.restaurant.id, status: "CONFIRMED" } })).toBe(1);
    expect(await first.tableReservation.count({ where: { restaurantId: owner.restaurant.id, status: "PENDING", revision: 0 } })).toBe(1);
  }, 30_000);

  it("limits a legacy eight-seat preset to six when two four-seat tables touch", async () => {
    const owner = await fixture();
    await first.diningTableCombination.update({ where: { id: owner.combination.id }, data: { capacity: 8 } });
    const repository = new FloorRepository(first);
    const room = (await repository.getConfig(owner.restaurant.id)).rooms.find((item) => item.id === owner.room.id)!;
    const saved = await repository.saveRoom(owner.restaurant.id, { ...room, name: "Updated room" }, room.revision);
    const six = await booking(owner, { partySize: 6 }); const seven = await booking(owner, { partySize: 7 });
    const selected = { roomId: owner.room.id, locationId: owner.location.id, optionId: `combination:${owner.combination.id}`, expectedRoomRevision: saved.revision, x: 275, y: 150, rotation: 0 as const };
    const options = await getFloorAssignmentOptions(first, owner.restaurant.id, { date, time: "20:00", partySize: 7 });
    expect(options.options.find((option) => option.id === selected.optionId)).toMatchObject({ capacity: 6, available: false });
    await expect(confirm(first, seven.id, selected)).rejects.toMatchObject({ code: "CONFLICT" });
    await confirm(first, six.id, selected);
    const allocation = await first.reservationAllocation.findUniqueOrThrow({ where: { reservationId: six.id }, include: { tables: true } });
    expect(allocation.capacity).toBe(6); expect(allocation.tables.map((table) => table.capacitySnapshot)).toEqual([4, 4]);
  });

  it("rejects inflated custom capacity and accepts a lower manual limit once tables are separated", async () => {
    const owner = await fixture();
    const reservation = await booking(owner, { partySize: 7 });
    const selected = {
      ...assignment(owner), optionId: "custom", capacity: 8,
      customTables: [{ tableId: owner.a.id, x: 150, y: 150, rotation: 0 }, { tableId: owner.b.id, x: 230, y: 150, rotation: 0 }],
    } satisfies FloorAssignmentInput;
    await expect(confirm(first, reservation.id, selected)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(confirm(first, reservation.id, { ...selected, capacity: 6 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await first.reservationAllocation.findUnique({ where: { reservationId: reservation.id } })).toBeNull();
    await confirm(first, reservation.id, {
      ...selected, capacity: 7,
      customTables: [selected.customTables[0], { ...selected.customTables[1], x: 254 }],
    });
    expect(await first.reservationAllocation.findUnique({ where: { reservationId: reservation.id } })).toMatchObject({ capacity: 7 });
  });

  it("validates retention against the geometry in a legacy allocation's snapshots", async () => {
    const owner = await fixture();
    const reservation = await booking(owner, { partySize: 6 });
    await confirm(first, reservation.id, { ...assignment(owner), optionId: `combination:${owner.combination.id}` });
    await first.reservationAllocation.update({ where: { reservationId: reservation.id }, data: { capacity: 8 } });
    const options = await getFloorAssignmentOptions(first, owner.restaurant.id, { date, time: "20:00", partySize: 7, excludeReservationId: reservation.id });
    expect(options.currentAllocation).toMatchObject({ capacity: 6 });
    await withSqliteTransaction(first, async (tx) => {
      const current = await tx.tableReservation.findUniqueOrThrow({ where: { id: reservation.id } });
      await expect(syncReservationAllocation(tx, { ...current, partySize: 7 })).rejects.toMatchObject({ code: "CONFLICT" });
      await syncReservationAllocation(tx, current);
    });
    expect(await first.reservationAllocation.findUnique({ where: { reservationId: reservation.id } })).toMatchObject({ capacity: 6 });
  });

  it("retains a single-table assignment when another member of a configured combination is occupied", async () => {
    const owner = await fixture(); const a = await booking(owner); const b = await booking(owner);
    await confirm(first, a.id, assignment(owner)); await confirm(first, b.id, assignment(owner, owner.b));
    await withSqliteTransaction(first, async (tx) => {
      const current = await tx.tableReservation.findUniqueOrThrow({ where: { id: a.id } });
      await syncReservationAllocation(tx, current);
      await tx.tableReservation.update({ where: { id: a.id }, data: { notes: "Updated notes" } });
    });
    expect(await first.reservationAllocation.count({ where: { restaurantId: owner.restaurant.id } })).toBe(2);
  });

  it("retains a frozen combination after catalog capacity and members change while unrelated combinations are busy", async () => {
    const owner = await fixture();
    const c = await first.diningTable.create({ data: { restaurantId: owner.restaurant.id, roomId: owner.room.id,
      label: "3", shape: "SQUARE", capacity: 4, x: 650, y: 150, width: 80, height: 80 } });
    const a = await booking(owner, { partySize: 6 }); const busy = await booking(owner);
    await confirm(first, a.id, { roomId: owner.room.id, locationId: owner.location.id, optionId: `combination:${owner.combination.id}`,
      expectedRoomRevision: 0, x: 275, y: 150, rotation: 0 });
    await confirm(first, busy.id, assignment(owner, c));
    const before = await first.reservationAllocation.findUniqueOrThrow({ where: { reservationId: a.id }, include: { tables: true } });
    const repository = new FloorRepository(first);
    const current = (await repository.getConfig(owner.restaurant.id)).rooms.find((room) => room.id === owner.room.id)!;
    const saved = await repository.saveRoom(owner.restaurant.id, { ...current, combinations: [
      { ...current.combinations[0], capacity: 4, members: [
        { tableId: owner.a.id, x: -40, y: 0, rotation: 0 }, { tableId: c.id, x: 40, y: 0, rotation: 0 },
      ] },
      { id: randomUUID(), name: "2+3", capacity: 6, active: true, members: [
        { tableId: owner.b.id, x: -40, y: 0, rotation: 0 }, { tableId: c.id, x: 40, y: 0, rotation: 0 },
      ] },
    ] }, current.revision);
    await withSqliteTransaction(first, async (tx) => {
      const reservation = await tx.tableReservation.findUniqueOrThrow({ where: { id: a.id } });
      await syncReservationAllocation(tx, reservation, { roomId: owner.room.id, locationId: owner.location.id, optionId: `combination:${owner.combination.id}`,
        expectedRoomRevision: saved.revision, x: 400, y: 150, rotation: 0, retainExisting: true });
      await tx.tableReservation.update({ where: { id: a.id }, data: { notes: "Keep the original physical arrangement" } });
    });
    const after = await first.reservationAllocation.findUniqueOrThrow({ where: { reservationId: a.id }, include: { tables: true } });
    expect(after.capacity).toBe(6);
    expect(after.combinationId).toBe(before.combinationId);
    expect(after.tables.toSorted((left, right) => left.tableId.localeCompare(right.tableId))).toEqual(before.tables.toSorted((left, right) => left.tableId.localeCompare(right.tableId)));
    expect(after.version).toBe(before.version + 1);
  });

  it("reuses a table exactly at the half-open blocked interval boundary", async () => {
    const owner = await fixture(); const early = await booking(owner, { time: "20:00" });
    const boundary = await booking(owner, { time: "22:15" });
    await confirm(first, early.id, assignment(owner));
    await confirm(first, boundary.id, assignment(owner));
    expect(await first.reservationAllocation.count({ where: { restaurantId: owner.restaurant.id } })).toBe(2);
    const rows = await first.reservationAllocation.findMany({ where: { restaurantId: owner.restaurant.id }, orderBy: { serviceStartAt: "asc" } });
    expect(rows[0].blockedUntil.toISOString()).toBe(rows[1].blockedFrom.toISOString());
  });

  it("frees a completed table early and preserves planned interval and historical snapshots", async () => {
    const owner = await fixture(); const a = await booking(owner);
    await first.tableReservation.update({ where: { id: a.id }, data: {
      customerEmail: "private@example.test", customerPhone: "private-phone-555", adminNotes: "private-admin-note",
    } });
    await confirm(first, a.id, assignment(owner));
    const board = await new FloorRepository(first).getBoard(owner.restaurant.id, "2099-12-01T23:10:00Z");
    expect(board.allocations[0]).toMatchObject({ customerName: "Customer", reservationId: a.id });
    for (const secret of ["private@example.test", "private-phone-555", "private-admin-note"]) expect(JSON.stringify(board)).not.toContain(secret);
    for (const field of ["customerEmail", "customerPhone", "adminNotes"]) expect(board.allocations[0]).not.toHaveProperty(field);
    const before = await first.reservationAllocation.findUniqueOrThrow({ where: { reservationId: a.id }, include: { tables: true } });
    const releasedAt = new Date("2099-12-01T23:30:00Z");
    await withSqliteTransaction(first, async (tx) => {
      const current = await tx.tableReservation.findUniqueOrThrow({ where: { id: a.id } });
      await syncReservationAllocation(tx, { ...current, status: "COMPLETED" }, undefined, releasedAt);
      await tx.tableReservation.update({ where: { id: a.id }, data: { status: "COMPLETED" } });
    });
    await first.diningTable.update({ where: { id: owner.a.id }, data: { label: "Renamed", x: 700, width: 100, height: 100 } });
    const after = await first.reservationAllocation.findUniqueOrThrow({ where: { reservationId: a.id }, include: { tables: true } });
    expect(after.blockedUntil).toEqual(before.blockedUntil); expect(after.releasedAt).toEqual(releasedAt); expect(after.tables).toEqual(before.tables);
    const options = await getFloorAssignmentOptions(first, owner.restaurant.id, { date, time: "22:30", partySize: 2 });
    expect(options.options.find((option) => option.id === `table:${owner.a.id}`)?.available).toBe(true);
  });

  it("does not reserve any interval for a future booking cancelled before preparation starts", async () => {
    const owner = await fixture(); const a = await booking(owner); await confirm(first, a.id, assignment(owner));
    await withSqliteTransaction(first, async (tx) => {
      const current = await tx.tableReservation.findUniqueOrThrow({ where: { id: a.id } });
      await syncReservationAllocation(tx, { ...current, status: "CANCELLED" }, undefined, new Date("2099-12-01T20:00:00Z"));
      await tx.tableReservation.update({ where: { id: a.id }, data: { status: "CANCELLED" } });
    });
    const options = await getFloorAssignmentOptions(first, owner.restaurant.id, { date, time: "18:00", partySize: 2 });
    expect(options.options.find((option) => option.id === `table:${owner.a.id}`)?.available).toBe(true);
  });

  it("checks actual proposed geometry and keeps the booking pending on failure", async () => {
    const owner = await fixture(); const a = await booking(owner);
    const occupied = await booking(owner);
    await confirm(first, occupied.id, assignment(owner, owner.b));
    await expect(confirm(first, a.id, { ...assignment(owner), x: 0, y: 0 })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(confirm(first, a.id, { ...assignment(owner), x: owner.b.x, y: owner.b.y })).rejects.toMatchObject({ code: "CONFLICT" });
    await first.diningRoom.update({ where: { id: owner.room.id }, data: { fixturesJson: JSON.stringify([{ id: "bar", type: "BAR", x: 600, y: 150, width: 100, height: 100, rotation: 0, label: "Bar" }]) } });
    await expect(confirm(first, a.id, { ...assignment(owner), x: 600, y: 150 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await first.reservationAllocation.count({ where: { reservationId: a.id } })).toBe(0);
    expect((await first.tableReservation.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("PENDING");
  });

  it("rejects stale room revisions and cross-restaurant options without side effects", async () => {
    const owner = await fixture(); const other = await fixture(); const a = await booking(owner);
    await expect(confirm(first, a.id, assignment(other))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(confirm(first, a.id, { ...assignment(owner), expectedRoomRevision: 1 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await first.reservationAllocation.count({ where: { reservationId: a.id } })).toBe(0);
  });

  it("limits an event to its selected rooms and keeps an exclusive event local to those rooms", async () => {
    const owner = await fixture();
    const event = await first.restaurantEvent.create({ data: { restaurantId: owner.restaurant.id, title: "Private event", date, startTime: "20:00", endTime: "22:00", blocksRegularReservations: true,
      rooms: { create: { roomId: owner.room.id } } } });
    const eventBooking = await booking(owner, { eventId: event.id });
    await expect(confirm(first, eventBooking.id, assignment(owner, owner.terraceTable))).rejects.toMatchObject({ code: "CONFLICT" });
    const regular = await getFloorAssignmentOptions(first, owner.restaurant.id, { date, time: "20:00", partySize: 2 });
    expect(regular.options.filter((option) => option.roomId === owner.room.id).every((option) => !option.available)).toBe(true);
    expect(regular.options.find((option) => option.id === `table:${owner.terraceTable.id}`)?.available).toBe(true);
    await confirm(first, eventBooking.id, assignment(owner));
  });

  it("blocks structural changes and archiving for a table with future bookings", async () => {
    const owner = await fixture(); const a = await booking(owner); await confirm(first, a.id, assignment(owner));
    const repository = new FloorRepository(first);
    const config = await repository.getConfig(owner.restaurant.id);
    const current = config.rooms.find((room) => room.id === owner.room.id)!;
    await expect(repository.saveRoom(owner.restaurant.id, { ...current, tables: current.tables.map((table) => table.id === owner.a.id ? { ...table, capacity: 3 } : table) }, current.revision)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(repository.saveRoom(owner.restaurant.id, { ...current, tables: current.tables.filter((table) => table.id !== owner.a.id), combinations: [] }, current.revision)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(repository.archiveRoom(owner.restaurant.id, current.id, current.revision)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await repository.getConfig(owner.restaurant.id)).rooms.find((room) => room.id === current.id)?.revision).toBe(current.revision);
  });

  it("validates a new base layout against frozen future poses and preserves optimistic revision", async () => {
    const owner = await fixture(); const a = await booking(owner); await confirm(first, a.id, assignment(owner));
    const repository = new FloorRepository(first);
    const current = (await repository.getConfig(owner.restaurant.id)).rooms.find((room) => room.id === owner.room.id)!;
    const collision = { ...current, fixtures: [{ id: "wall", type: "WALL" as const, label: "Pared", x: 150, y: 150, width: 10, height: 200, rotation: 0 as const }] };
    await expect(repository.saveRoom(owner.restaurant.id, collision, current.revision)).rejects.toMatchObject({ code: "CONFLICT" });
    const safe = { ...current, tables: current.tables.map((table) => table.id === owner.a.id ? { ...table, x: 700 } : table) };
    const saved = await repository.saveRoom(owner.restaurant.id, safe, current.revision);
    expect(saved.revision).toBe(current.revision + 1);
    await expect(repository.saveRoom(owner.restaurant.id, safe, current.revision)).rejects.toMatchObject({ code: "CONFLICT" });
    const snapshot = await first.reservationAllocationTable.findFirstOrThrow({ where: { tableId: owner.a.id } });
    expect(snapshot.x).toBe(150);
  });

  it("protects the sector of future assemblies while leaving idle inventory unpositioned", async () => {
    const owner = await fixture(); const a = await booking(owner); await confirm(first, a.id, assignment(owner));
    const repository = new FloorRepository(first);
    const current = (await repository.getConfig(owner.restaurant.id)).rooms.find((room) => room.id === owner.room.id)!;
    await expect(repository.saveRoom(owner.restaurant.id, { ...current, locations: [] }, current.revision)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(repository.saveRoom(owner.restaurant.id, { ...current, locations: current.locations.map((location) => ({ ...location, x: 800, width: 400 })) }, current.revision)).rejects.toMatchObject({ code: "CONFLICT" });
    await first.reservationAllocation.update({ where: { reservationId: a.id }, data: { releasedAt: new Date() } });
    const saved = await repository.saveRoom(owner.restaurant.id, { ...current, locations: [], tables: current.tables.map((table) => ({ ...table, x: 0, y: 0 })) }, current.revision);
    expect(saved.tables.every((table) => table.active)).toBe(true);
    expect(saved.locations.every((location) => !location.active)).toBe(true);
  });

  it("requires future confirmed bookings to receive tables before activating physical availability", async () => {
    const owner = await fixture();
    await first.restaurant.update({ where: { id: owner.restaurant.id }, data: { floorManagementEnabled: false } });
    const a = await booking(owner);
    await first.tableReservation.update({ where: { id: a.id }, data: { status: "CONFIRMED" } });
    const repository = new FloorRepository(first);
    await expect(repository.activate(owner.restaurant.id)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await first.restaurant.findUniqueOrThrow({ where: { id: owner.restaurant.id } })).floorManagementEnabled).toBe(false);
    await confirm(first, a.id, assignment(owner));
    await repository.activate(owner.restaurant.id);
    expect((await first.restaurant.findUniqueOrThrow({ where: { id: owner.restaurant.id } })).floorManagementEnabled).toBe(true);
  });

  it("cannot activate over an unassigned overnight booking from the preceding local date", async () => {
    const owner = await fixture();
    await first.restaurant.update({ where: { id: owner.restaurant.id }, data: { floorManagementEnabled: false } });
    const a = await booking(owner, { time: "23:30" });
    await first.tableReservation.update({ where: { id: a.id }, data: { date: "2026-12-01", status: "CONFIRMED" } });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-02T03:30:00Z"));
    try {
      await expect(new FloorRepository(first).activate(owner.restaurant.id)).rejects.toMatchObject({ code: "CONFLICT" });
      expect((await first.restaurant.findUniqueOrThrow({ where: { id: owner.restaurant.id } })).floorManagementEnabled).toBe(false);
    } finally { vi.useRealTimers(); }
  });

  it("cannot activate over a published overnight event without room selection", async () => {
    const owner = await fixture();
    await first.restaurant.update({ where: { id: owner.restaurant.id }, data: { floorManagementEnabled: false } });
    await first.restaurantEvent.create({ data: { restaurantId: owner.restaurant.id, title: "Overnight event", date: "2026-12-01", startTime: "23:30", endTime: "01:30" } });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-02T03:30:00Z"));
    try {
      await expect(new FloorRepository(first).activate(owner.restaurant.id)).rejects.toMatchObject({ code: "CONFLICT" });
      expect((await first.restaurant.findUniqueOrThrow({ where: { id: owner.restaurant.id } })).floorManagementEnabled).toBe(false);
    } finally { vi.useRealTimers(); }
  });

  it("locks the restaurant time zone while future allocations remain and unlocks it after release", async () => {
    const owner = await fixture(); const a = await booking(owner); await confirm(first, a.id, assignment(owner));
    const repository = new FloorRepository(first);
    await expect(repository.updateTimeZone(owner.restaurant.id, "UTC")).rejects.toMatchObject({ code: "CONFLICT" });
    await withSqliteTransaction(first, async (tx) => {
      const current = await tx.tableReservation.findUniqueOrThrow({ where: { id: a.id } });
      await syncReservationAllocation(tx, { ...current, status: "CANCELLED" }, undefined, new Date(Date.now() - 1000));
      await tx.tableReservation.update({ where: { id: a.id }, data: { status: "CANCELLED" } });
    });
    await repository.updateTimeZone(owner.restaurant.id, "UTC");
    expect((await first.restaurant.findUniqueOrThrow({ where: { id: owner.restaurant.id } })).timeZone).toBe("UTC");
    expect((await first.reservationAllocation.findUniqueOrThrow({ where: { reservationId: a.id } })).timeZone).toBe(timeZone);
  });

  it("resets or disables the shared staff account without touching reservation history", async () => {
    const owner = await fixture(); const a = await booking(owner); await confirm(first, a.id, assignment(owner));
    const repository = new FloorRepository(first);
    await repository.setStaffAccount(owner.restaurant.id, " Shared@Example.test ", "shared-password-1");
    const staff = await first.admin.findUniqueOrThrow({ where: { restaurantId: owner.restaurant.id } });
    expect(staff.email).toBe("shared@example.test"); expect(staff.role).toBe("WAITER"); expect(staff.organizationId).toBeNull();
    await first.session.create({ data: { adminId: staff.id, jti: randomUUID(), expiresAt: new Date("2099-12-31T00:00:00Z") } });
    await repository.setStaffAccount(owner.restaurant.id, "shared@example.test", "shared-password-2");
    expect((await first.admin.findUniqueOrThrow({ where: { restaurantId: owner.restaurant.id } })).passwordHash).not.toBe(staff.passwordHash);
    expect(await first.session.count({ where: { adminId: staff.id } })).toBe(0);
    await repository.disableStaffAccount(owner.restaurant.id);
    expect(await first.admin.count({ where: { restaurantId: owner.restaurant.id } })).toBe(0);
    expect(await first.reservationAllocation.count({ where: { reservationId: a.id } })).toBe(1);
  });
});
