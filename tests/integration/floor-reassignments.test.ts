import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { createWalkIn, releaseWalkIn } from "../../src/modules/reservation-management/infrastructure/floor-walk-ins";
import { getFloorReassignmentOptions, reassignFloorAllocation } from "../../src/modules/reservation-management/infrastructure/floor-reassignments";
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
});
