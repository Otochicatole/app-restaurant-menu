import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { createWalkIn, releaseWalkIn } from "../../src/modules/reservation-management/infrastructure/floor-walk-ins";
import { getFloorReassignmentOptions, reassignFloorAllocation, reassignFloorAllocations } from "../../src/modules/reservation-management/infrastructure/floor-reassignments";
import { PrismaFloorRepository } from "../../src/modules/floor-management/infrastructure/prisma-floor-repository";
import type { FloorAssignmentInput } from "../../src/modules/floor-management/contracts";

vi.mock("@/platform/database/prisma", () => ({ prisma: undefined }));
const arrival = new Date("2099-12-01T20:00:00.000Z");
const later = new Date(arrival.getTime() + 30 * 60_000);
const directory = path.resolve("test-results", `floor-reassignment-${randomUUID()}`);
const url = `file:${path.join(directory, "floor.db").replaceAll("\\", "/")}`;

describe("atomic floor rearrangements on SQLite", () => {
  let first: ReturnType<typeof createSqlitePrismaClient>;
  let second: ReturnType<typeof createSqlitePrismaClient>;
  let restaurantId: string;
  let otherRestaurantId: string;
  let roomId: string;
  let locationId: string;
  let tables: { id: string }[];
  const assignment = (index = 0, x = 100): FloorAssignmentInput => ({ roomId, locationId, optionId: `table:${tables[index].id}`, x, y: 100, rotation: 0, expectedRoomRevision: 0 });
  const visit = (index = 0, x = 100) => createWalkIn(first, restaurantId, { customerName: "Ana", partySize: 2, notes: "Ventana", durationMinutes: 90, assignment: assignment(index, x) }, () => arrival);
  const stored = (id: string) => first.tableReservation.findUniqueOrThrow({ where: { id }, include: { allocation: { include: { tables: true } } } });
  const command = (reservationId: string, next = assignment(0, 180)) => ({ reservationId, expectedRevision: 0, expectedAllocationVersion: 0, assignment: next });

  beforeAll(async () => {
    await mkdir(directory, { recursive: true });
    const database = createClient({ url });
    try {
      const root = path.resolve("prisma/migrations");
      for (const name of (await readdir(root)).filter((name) => /^\d/.test(name)).sort()) {
        await database.executeMultiple(await readFile(path.join(root, name, "migration.sql"), "utf8"));
      }
      await database.execute("PRAGMA journal_mode=WAL");
    } finally { database.close(); }
    first = createSqlitePrismaClient(url); second = createSqlitePrismaClient(url);
  }, 30_000);
  afterAll(async () => { await Promise.all([first?.$disconnect(), second?.$disconnect()]); });
  beforeEach(async () => {
    await first.organization.deleteMany();
    const organization = await first.organization.create({ data: { name: "Service", slug: randomUUID() } });
    restaurantId = (await first.restaurant.create({ data: { organizationId: organization.id, name: "Main", slug: randomUUID(), landingSlug: randomUUID(), floorManagementEnabled: true, landingEnabled: false } })).id;
    otherRestaurantId = (await first.restaurant.create({ data: { organizationId: organization.id, name: "Other", slug: randomUUID(), landingSlug: randomUUID(), floorManagementEnabled: true } })).id;
    const room = await first.diningRoom.create({ data: { restaurantId, name: "Main", width: 1000, height: 600,
      locations: { create: { name: "Window", x: 300, y: 200, width: 600, height: 400 } },
      tables: { create: [1, 2, 3].map((label) => ({ label: String(label), shape: "SQUARE" as const, capacity: 4, x: 0, y: 0, width: 80, height: 80 })) },
    }, include: { locations: true, tables: { orderBy: { label: "asc" } } } });
    roomId = room.id; locationId = room.locations[0].id; tables = room.tables;
  });

  it("reads authoritative group options, excluding its own lease and preserving the original visit interval", async () => {
    const current = await visit();
    const options = await getFloorReassignmentOptions(first, restaurantId, current.reservationId, later);
    expect(options.currentAllocation).toMatchObject({ reservationId: current.reservationId, partySize: 2, reservationRevision: 0, version: 0 });
    expect(options.interval).toMatchObject({ blockedFrom: arrival.toISOString(), blockedUntil: new Date(arrival.getTime() + 90 * 60_000).toISOString() });
    expect(options.options.find((option) => option.id === `table:${tables[0].id}`)?.resourceAvailable).toBe(true);
  });

  it("moves and rotates a live visit atomically without extending its stay or altering customer data", async () => {
    const current = await visit();
    const before = await stored(current.reservationId);
    await reassignFloorAllocation(first, restaurantId, command(current.reservationId, { ...assignment(0, 180), rotation: 90 }), () => later);
    const after = await stored(current.reservationId);
    expect(after).toMatchObject({ revision: 1, customerName: before.customerName, notes: before.notes, source: "WALK_IN", customerPhone: "", customerEmail: "", status: "CONFIRMED" });
    expect(after.allocation).toMatchObject({ id: before.allocation!.id, version: 1, serviceStartAt: before.allocation!.serviceStartAt, serviceEndAt: before.allocation!.serviceEndAt, blockedFrom: before.allocation!.blockedFrom, blockedUntil: before.allocation!.blockedUntil });
    expect(after.allocation!.tables[0]).toMatchObject({ tableId: tables[0].id, x: 180, y: 100, rotation: 90 });
  });

  it("saves separated tables for the same reservation and can rejoin them without altering its interval or data", async () => {
    const joined: FloorAssignmentInput = { ...assignment(), optionId: "custom", x: 200, capacity: 6,
      customTables: [{ tableId: tables[0].id, x: 160, y: 100, rotation: 0 }, { tableId: tables[1].id, x: 240, y: 100, rotation: 0 }],
    };
    const current = await createWalkIn(first, restaurantId, { customerName: "Ana", partySize: 6, notes: "Ventana", durationMinutes: 90, assignment: joined }, () => arrival);
    await first.tableReservation.update({ where: { id: current.reservationId }, data: { source: "ADMIN", customerEmail: "private@example.test", customerPhone: "123456", adminNotes: "Private" } });
    const before = await stored(current.reservationId);
    const separated: FloorAssignmentInput = { ...joined, x: 280, customTables: [joined.customTables![0], { ...joined.customTables![1], x: 400 }] };
    await reassignFloorAllocation(first, restaurantId, command(current.reservationId, separated), () => later);
    const after = await stored(current.reservationId);
    expect(after).toMatchObject({ status: before.status, partySize: before.partySize, source: before.source, customerName: before.customerName, customerEmail: before.customerEmail, customerPhone: before.customerPhone, notes: before.notes, adminNotes: before.adminNotes, revision: 1 });
    expect(after.allocation).toMatchObject({ id: before.allocation!.id, capacity: 6, version: 1, serviceStartAt: before.allocation!.serviceStartAt, serviceEndAt: before.allocation!.serviceEndAt, blockedFrom: before.allocation!.blockedFrom, blockedUntil: before.allocation!.blockedUntil });
    expect(after.allocation!.tables.map((table) => table.x).sort((a, b) => a - b)).toEqual([160, 400]);
    const overlap = { ...separated, customTables: [separated.customTables![0], { ...separated.customTables![1], x: 180 }] };
    await expect(reassignFloorAllocation(first, restaurantId, { ...command(current.reservationId, overlap), expectedRevision: 1, expectedAllocationVersion: 1 }, () => later)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await stored(current.reservationId)).toEqual(after);
    await reassignFloorAllocation(first, restaurantId, { ...command(current.reservationId, joined), expectedRevision: 1, expectedAllocationVersion: 1 }, () => later);
    const reunited = await stored(current.reservationId);
    expect(reunited.revision).toBe(2); expect(reunited.allocation!.version).toBe(2);
    expect(reunited.allocation!.tables.map((table) => table.x).sort((a, b) => a - b)).toEqual([160, 240]);
    expect(reunited.allocation!.blockedUntil).toEqual(before.allocation!.blockedUntil);
  });

  it("continues rejecting disconnected predefined combinations", async () => {
    const repository = new PrismaFloorRepository(first);
    const room = (await repository.getConfig(restaurantId)).rooms.find((item) => item.id === roomId)!;
    await expect(repository.saveRoom(restaurantId, { ...room, combinations: [{ id: randomUUID(), name: "Detached preset", active: true, capacity: 6,
      members: [{ tableId: tables[0].id, x: -100, y: 0, rotation: 0 }, { tableId: tables[1].id, x: 100, y: 0, rotation: 0 }],
    }] }, room.revision)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await first.diningTableCombination.count({ where: { restaurantId } })).toBe(0);
  });

  it.each(["ADMIN", "LANDING", "WALK_IN"])("rearranges %s groups without exposing or changing their reservation data", async (source) => {
    const current = await visit();
    await first.tableReservation.update({ where: { id: current.reservationId }, data: { source, customerEmail: "private@example.test", customerPhone: "123456", adminNotes: "Private instructions" } });
    const before = await stored(current.reservationId);
    const options = await getFloorReassignmentOptions(first, restaurantId, current.reservationId, later);
    expect(options.currentAllocation).not.toHaveProperty("customerEmail"); expect(options.currentAllocation).not.toHaveProperty("customerPhone");
    expect(options.currentAllocation).not.toHaveProperty("adminNotes");
    await reassignFloorAllocation(first, restaurantId, command(current.reservationId), () => later);
    const after = await stored(current.reservationId);
    const { allocation: beforeAllocation, updatedAt: beforeUpdatedAt, revision: beforeRevision, ...beforeData } = before;
    const { allocation: afterAllocation, updatedAt: afterUpdatedAt, revision: afterRevision, ...afterData } = after;
    expect(afterData).toEqual(beforeData);
    expect(afterRevision).toBe(beforeRevision + 1); expect(afterUpdatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdatedAt.getTime());
    expect(afterAllocation!.version).toBe(beforeAllocation!.version + 1);
  });

  it("does not read or rearrange another restaurant's allocation", async () => {
    const current = await visit();
    const before = await stored(current.reservationId);
    await expect(getFloorReassignmentOptions(first, otherRestaurantId, current.reservationId, later)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(reassignFloorAllocation(first, otherRestaurantId, command(current.reservationId), () => later)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await stored(current.reservationId)).toEqual(before);
  });

  it.each(["expectedRevision", "expectedAllocationVersion"] as const)("rejects a stale %s without modifying the stored arrangement", async (field) => {
    const current = await visit();
    const before = await stored(current.reservationId);
    await expect(reassignFloorAllocation(first, restaurantId, { ...command(current.reservationId), [field]: 1 }, () => later)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await stored(current.reservationId)).toEqual(before);
  });

  it("rolls back the reservation revision when another group's table blocks the proposed position", async () => {
    const current = await visit();
    await visit(1, 260);
    const before = await stored(current.reservationId);
    await expect(reassignFloorAllocation(first, restaurantId, command(current.reservationId, assignment(0, 260)), () => later)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await stored(current.reservationId)).toEqual(before);
  });

  it.each(["current", "future"])("preserves %s event assignment intervals and reservation data", async (period) => {
    const current = await visit();
    const event = await first.restaurantEvent.create({ data: { restaurantId, title: "Evening", date: "2099-12-01", startTime: "20:00", endTime: "23:00", capacity: 20 } });
    await first.restaurantEventRoom.create({ data: { eventId: event.id, roomId, restaurantId } });
    await first.tableReservation.update({ where: { id: current.reservationId }, data: { source: "LANDING", eventId: event.id, date: event.date, time: event.startTime } });
    const before = await stored(current.reservationId);
    const now = period === "future" ? new Date(arrival.getTime() - 60 * 60_000) : later;
    const options = await getFloorReassignmentOptions(first, restaurantId, current.reservationId, now);
    expect(options.currentAllocation).toMatchObject({ source: "LANDING", reservationId: current.reservationId });
    await reassignFloorAllocation(first, restaurantId, command(current.reservationId), () => now);
    const after = await stored(current.reservationId);
    expect(after.allocation).toMatchObject({ serviceStartAt: before.allocation!.serviceStartAt, serviceEndAt: before.allocation!.serviceEndAt, blockedFrom: before.allocation!.blockedFrom, blockedUntil: before.allocation!.blockedUntil });
    expect(after).toMatchObject({ status: before.status, date: before.date, time: before.time, partySize: before.partySize, eventId: event.id, source: before.source });
  });

  it("rejects released, completed, expired and suspended service instead of reopening an allocation", async () => {
    const current = await visit();
    const end = new Date(arrival.getTime() + 90 * 60_000);
    await expect(getFloorReassignmentOptions(first, restaurantId, current.reservationId, end)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(reassignFloorAllocation(first, restaurantId, command(current.reservationId), () => end)).rejects.toMatchObject({ code: "CONFLICT" });
    await first.restaurant.update({ where: { id: restaurantId }, data: { status: "SUSPENDED" } });
    await expect(reassignFloorAllocation(first, restaurantId, command(current.reservationId), () => later)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await first.restaurant.update({ where: { id: restaurantId }, data: { status: "ACTIVE" } });
    await releaseWalkIn(first, restaurantId, current.reservationId, 0, later);
    await expect(reassignFloorAllocation(first, restaurantId, { ...command(current.reservationId), expectedRevision: 1, expectedAllocationVersion: 1 }, () => later)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await stored(current.reservationId)).allocation!.releasedAt).toEqual(later);
  });

  it("allows only one of two independent clients to commit the same expected revisions", async () => {
    const current = await visit();
    const results = await Promise.allSettled([
      reassignFloorAllocation(first, restaurantId, command(current.reservationId, assignment(0, 180)), () => later),
      reassignFloorAllocation(second, restaurantId, command(current.reservationId, assignment(0, 260)), () => later),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const after = await stored(current.reservationId);
    expect(after.revision).toBe(1); expect(after.allocation!.version).toBe(1);
    expect([180, 260]).toContain(after.allocation!.tables[0].x);
  }, 30_000);

  it("moves two groups into each other's former positions without merging their reservations or changing intervals", async () => {
    const one = await visit(0, 100); const two = await visit(1, 260);
    await first.tableReservation.update({ where: { id: two.reservationId }, data: { source: "LANDING", customerName: "Bruno", customerEmail: "private@example.test", adminNotes: "Private" } });
    const before = await Promise.all([stored(one.reservationId), stored(two.reservationId)]);
    await reassignFloorAllocations(first, restaurantId, { updates: [command(one.reservationId, assignment(0, 260)), command(two.reservationId, { ...assignment(1, 100), rotation: 90 })] }, () => later);
    const after = await Promise.all([stored(one.reservationId), stored(two.reservationId)]);
    for (let index = 0; index < 2; index += 1) {
      expect(after[index]).toMatchObject({ id: before[index].id, revision: 1, source: before[index].source, customerName: before[index].customerName, customerEmail: before[index].customerEmail, customerPhone: before[index].customerPhone, notes: before[index].notes, adminNotes: before[index].adminNotes, partySize: before[index].partySize, status: before[index].status });
      expect(after[index].allocation).toMatchObject({ id: before[index].allocation!.id, version: 1, capacity: 4, serviceStartAt: before[index].allocation!.serviceStartAt, serviceEndAt: before[index].allocation!.serviceEndAt, blockedFrom: before[index].allocation!.blockedFrom, blockedUntil: before[index].allocation!.blockedUntil });
    }
    expect(after[0].allocation!.tables[0]).toMatchObject({ tableId: tables[0].id, x: 260 });
    expect(after[1].allocation!.tables[0]).toMatchObject({ tableId: tables[1].id, x: 100, rotation: 90 });
  });

  it.each(["expectedRevision", "expectedAllocationVersion"] as const)("rejects the complete selection when a later group's %s is stale", async (field) => {
    const one = await visit(0, 100); const two = await visit(1, 260);
    const before = await Promise.all([stored(one.reservationId), stored(two.reservationId)]);
    await expect(reassignFloorAllocations(first, restaurantId, { updates: [command(one.reservationId, assignment(0, 180)), { ...command(two.reservationId, assignment(1, 340)), [field]: 1 }] }, () => later)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await Promise.all([stored(one.reservationId), stored(two.reservationId)])).toEqual(before);
  });

  it.each(["position", "table"])("rejects proposals that conflict with each other's %s before changing either reservation", async (conflict) => {
    const one = await visit(0, 100); const two = await visit(1, 260);
    const before = await Promise.all([stored(one.reservationId), stored(two.reservationId)]);
    const secondAssignment = conflict === "table" ? assignment(0, 340) : assignment(1, 180);
    await expect(reassignFloorAllocations(first, restaurantId, { updates: [command(one.reservationId, assignment(0, 180)), command(two.reservationId, secondAssignment)] }, () => later)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await Promise.all([stored(one.reservationId), stored(two.reservationId)])).toEqual(before);
  });

  it("rejects the complete selection if another lease blocks one final proposal", async () => {
    const one = await visit(0, 100); const two = await visit(1, 260); await visit(2, 420);
    const before = await Promise.all([stored(one.reservationId), stored(two.reservationId)]);
    await expect(reassignFloorAllocations(first, restaurantId, { updates: [command(one.reservationId, assignment(0, 180)), command(two.reservationId, assignment(1, 420))] }, () => later)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await Promise.all([stored(one.reservationId), stored(two.reservationId)])).toEqual(before);
  });

  it("rejects invalid capacity, room revisions and foreign restaurant batches without changing any group", async () => {
    const one = await visit(0, 100); const two = await visit(1, 260);
    const before = await Promise.all([stored(one.reservationId), stored(two.reservationId)]);
    const insufficient: FloorAssignmentInput = { ...assignment(1, 340), optionId: "custom", capacity: 1, customTables: [{ tableId: tables[1].id, x: 340, y: 100, rotation: 0 }] };
    for (const invalid of [insufficient, { ...assignment(1, 340), expectedRoomRevision: 1 }]) {
      await expect(reassignFloorAllocations(first, restaurantId, { updates: [command(one.reservationId, assignment(0, 180)), command(two.reservationId, invalid)] }, () => later)).rejects.toMatchObject({ code: "CONFLICT" });
    }
    await expect(reassignFloorAllocations(first, otherRestaurantId, { updates: [command(one.reservationId), command(two.reservationId)] }, () => later)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await Promise.all([stored(one.reservationId), stored(two.reservationId)])).toEqual(before);
  });

  it("requires distinct reservations and between one and forty updates", async () => {
    const one = await visit();
    const before = await stored(one.reservationId);
    for (const updates of [[], [command(one.reservationId), command(one.reservationId)], Array.from({ length: 41 }, (_, index) => command(`reservation-${index}`))]) {
      await expect(reassignFloorAllocations(first, restaurantId, { updates }, () => later)).rejects.toMatchObject({ name: "ZodError" });
    }
    expect(await stored(one.reservationId)).toEqual(before);
  });

  it("keeps unselected members when the two edited reservations retain more than forty poses", async () => {
    const inventory = await first.diningTable.createManyAndReturn({ data: Array.from({ length: 42 }, (_, index) => ({ restaurantId, roomId, label: `Small-${index}`, shape: "SQUARE" as const, capacity: 1, x: 0, y: 0, width: 10, height: 10 })) });
    const group = (index: number): FloorAssignmentInput => ({ ...assignment(), optionId: "custom", capacity: 21,
      customTables: inventory.slice(index * 21, (index + 1) * 21).map((table, member) => ({ tableId: table.id, x: 50 + index * 200 + member % 7 * 20, y: 50 + Math.floor(member / 7) * 20, rotation: 0 })),
    });
    const groups = [group(0), group(1)];
    const reservations = [];
    for (const current of groups) reservations.push(await createWalkIn(first, restaurantId, { customerName: "Ana", partySize: 2, notes: "", durationMinutes: 90, assignment: current }, () => arrival));
    const updates = reservations.map((reservation, index) => command(reservation.reservationId, { ...groups[index], customTables: groups[index].customTables!.map((pose, member) => member === 0 ? { ...pose, y: pose.y - 20 } : pose) }));
    await reassignFloorAllocations(first, restaurantId, { updates }, () => later);
    for (let index = 0; index < reservations.length; index += 1) {
      const after = await stored(reservations[index].reservationId);
      expect(after.revision).toBe(1); expect(after.allocation!.version).toBe(1);
      expect(after.allocation!.capacity).toBe(21); expect(after.allocation!.tables).toHaveLength(21);
      expect(after.allocation!.tables.find((pose) => pose.tableId === groups[index].customTables![0].tableId)?.y).toBe(30);
      expect(after.allocation!.tables.filter((pose) => pose.tableId !== groups[index].customTables![0].tableId).map(({ tableId, x, y, rotation }) => ({ tableId, x, y, rotation })).sort((a, b) => a.tableId.localeCompare(b.tableId)))
        .toEqual(groups[index].customTables!.slice(1).sort((a, b) => a.tableId.localeCompare(b.tableId)));
    }
  });

  it("commits only one of two concurrent selections with the same expected versions", async () => {
    const one = await visit(0, 100); const two = await visit(1, 260);
    const batch = { updates: [command(one.reservationId, assignment(0, 260)), command(two.reservationId, assignment(1, 100))] };
    const results = await Promise.allSettled([
      reassignFloorAllocations(first, restaurantId, batch, () => later),
      reassignFloorAllocations(second, restaurantId, batch, () => later),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toMatchObject([{ reason: { code: "CONFLICT" } }]);
    const after = await Promise.all([stored(one.reservationId), stored(two.reservationId)]);
    expect(after.map((row) => [row.revision, row.allocation!.version])).toEqual([[1, 1], [1, 1]]);
  }, 30_000);
});
