import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaFloorRepository } from "../../src/modules/floor-management/infrastructure/prisma-floor-repository";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { withSqliteTransaction } from "../../src/platform/database/sqlite-transaction";
import type { ServiceCommandResult } from "../../src/modules/reservation-management/contracts";
import { syncReservationAllocation } from "../../src/modules/reservation-management/infrastructure/floor-allocations";
import { reassignFloorAllocation } from "../../src/modules/reservation-management/infrastructure/floor-reassignments";
import { createWalkIn } from "../../src/modules/reservation-management/infrastructure/floor-walk-ins";
import { TableService } from "../../src/modules/reservation-management/infrastructure/table-service";

const now = new Date("2099-12-02T02:30:00.000Z");
const date = "2099-12-01";
const actor = "staff-account";
const directory = path.resolve("test-results", `table-service-${randomUUID()}`);
const url = `file:${path.join(directory, "test.db").replaceAll("\\", "/")}`;

vi.mock("@/platform/database/prisma", () => ({ prisma: undefined }));

function accountView(result: ServiceCommandResult) {
  if (!("lines" in result)) throw new Error("Expected account result");
  return result;
}

function productView(result: ServiceCommandResult) {
  if (!("unitPriceCents" in result)) throw new Error("Expected product result");
  return result;
}

describe("table service in SQLite", () => {
  let first: ReturnType<typeof createSqlitePrismaClient>;
  let second: ReturnType<typeof createSqlitePrismaClient>;
  let service: TableService;
  let restaurantId: string;
  let otherRestaurantId: string;
  let roomId: string;
  let locationId: string;
  let tableIds: string[];
  let waiterId: string;

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
    first = createSqlitePrismaClient(url);
    second = createSqlitePrismaClient(url);
    service = new TableService(first);
  }, 30_000);

  afterAll(async () => { await Promise.all([first?.$disconnect(), second?.$disconnect()]); });

  beforeEach(async () => {
    const organization = await first.organization.create({ data: { name: "Service", slug: randomUUID() } });
    const restaurants = await Promise.all(["Salón principal", "Otra sucursal"].map((name) => first.restaurant.create({
      data: { organizationId: organization.id, name, slug: randomUUID(), landingSlug: randomUUID(), floorManagementEnabled: true },
    })));
    [restaurantId, otherRestaurantId] = restaurants.map(({ id }) => id);
    const room = await first.diningRoom.create({ data: { restaurantId, name: "Salón", width: 1000, height: 600,
      locations: { create: { name: "Ventana", x: 300, y: 200, width: 600, height: 400 } },
      tables: { create: [1, 2, 3].map((label) => ({ label: String(label), shape: "SQUARE" as const, capacity: 4, x: 0, y: 0, width: 80, height: 80 })) },
    }, include: { locations: true, tables: { orderBy: { label: "asc" } } } });
    roomId = room.id;
    locationId = room.locations[0].id;
    tableIds = room.tables.map(({ id }) => id);
    const waiter = await first.restaurantStaffMember.create({ data: { restaurantId, name: "Ana", role: "WAITER", active: true } });
    waiterId = waiter.id;
  });

  async function visit() {
    const { reservationId } = await createWalkIn(first, restaurantId, { customerName: "Grupo", partySize: 8, notes: "", durationMinutes: 120,
      assignment: { roomId, locationId, optionId: "custom", capacity: 10, x: 260, y: 180, rotation: 0, expectedRoomRevision: 0,
        customTables: tableIds.map((tableId, index) => ({ tableId, x: [180, 260, 420][index], y: 180, rotation: 0 })) },
    }, () => now);
    return first.reservationAllocation.findUniqueOrThrow({ where: { reservationId } });
  }

  async function open(allocationId: string, index = 0, expectedAllocationVersion = 0, client = service, assignedWaiterId = waiterId) {
    return accountView(await client.execute(restaurantId, actor, { action: "open", allocationId,
      tableId: tableIds[index], expectedAllocationVersion, waiterId: assignedWaiterId }, now));
  }

  it("opens one account per joined group and releases only that group until the last checkout", async () => {
    const allocation = await visit();
    const joined = await open(allocation.id);
    expect(joined.tableIds).toEqual(tableIds.slice(0, 2));
    expect((await open(allocation.id, 1)).id).toBe(joined.id);
    const separate = await open(allocation.id, 2);
    expect(separate.tableIds).toEqual([tableIds[2]]);
    const firstReceipt = accountView(await service.execute(restaurantId, actor, { action: "checkout", accountId: joined.id, expectedVersion: joined.version }, now));
    expect(firstReceipt).toMatchObject({ businessDate: date, totalCents: 0, paymentMethod: null, receiptNumber: `C-${joined.id}` });
    expect(await first.tableReservation.findUnique({ where: { id: allocation.reservationId } })).toMatchObject({ status: "CONFIRMED" });
    const activeTables = await first.reservationAllocationTable.findMany({ where: { allocationId: allocation.id, releasedAt: null } });
    expect(activeTables.map(({ tableId }) => tableId)).toEqual([tableIds[2]]);
    await expect(createWalkIn(second, restaurantId, { customerName: "Otro grupo", partySize: 2, notes: "", durationMinutes: 120,
      assignment: { roomId, locationId, optionId: `table:${tableIds[0]}`, x: 180, y: 180, rotation: 0, expectedRoomRevision: 0 },
    }, () => new Date(now.getTime() + 60_000))).resolves.toHaveProperty("reservationId");
    await service.execute(restaurantId, actor, { action: "checkout", accountId: separate.id, expectedVersion: separate.version }, now);
    expect(await first.tableReservation.findUnique({ where: { id: allocation.reservationId } })).toMatchObject({ status: "COMPLETED" });
    expect(await first.reservationAllocation.findUnique({ where: { id: allocation.id } })).toMatchObject({ releasedAt: now, version: 2 });
    expect(await first.reservationAllocationTable.count({ where: { allocationId: allocation.id, releasedAt: { not: null } } })).toBe(3);
    expect((await service.report(restaurantId, date, date, now)).totals.receiptCount).toBe(2);
  });

  it("snapshots catalog prices, settles pending quantities and keeps a receipt immutable on retry", async () => {
    const allocation = await visit();
    const opened = await open(allocation.id);
    const product = productView(await service.execute(restaurantId, actor, { action: "save-product", name: "Pizza", unitPriceCents: 1999 }, now));
    const ordered = accountView(await service.execute(restaurantId, actor, { action: "add-line", accountId: opened.id,
      expectedVersion: 0, productId: product.id, quantity: 3 }, now));
    await service.execute(restaurantId, actor, { action: "save-product", id: product.id, name: "Pizza familiar", unitPriceCents: 3000 }, now);
    await expect(service.execute(restaurantId, actor, { action: "checkout", accountId: ordered.id, expectedVersion: 1, paymentMethod: "CARD" }, now))
      .rejects.toMatchObject({ code: "CONFLICT" });
    const delivered = accountView(await service.execute(restaurantId, actor, { action: "update-line", accountId: ordered.id, expectedVersion: 1,
      lineId: ordered.lines[0].id, deliveredQuantity: 2, cancelledQuantity: 1 }, now));
    expect(delivered).toMatchObject({ orderedCents: 3998, deliveredCents: 3998, pendingQuantity: 0, lines: [{ name: "Pizza", unitPriceCents: 1999 }] });
    const close = { action: "checkout", accountId: ordered.id, expectedVersion: 2, paymentMethod: "CARD" } as const;
    const receipt = accountView(await service.execute(restaurantId, actor, close, now));
    expect(receipt).toMatchObject({ totalCents: 3998, paymentMethod: "CARD", businessDate: date });
    expect(await service.execute(restaurantId, actor, close, now)).toEqual(receipt);
    await expect(service.execute(restaurantId, actor, { ...close, paymentMethod: "CASH" }, now))
      .rejects.toMatchObject({ code: "CONFLICT" });
    await expect(service.execute(restaurantId, actor, { action: "update-line", accountId: ordered.id, expectedVersion: 3,
      lineId: ordered.lines[0].id, deliveredQuantity: 0, cancelledQuantity: 3 }, now)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await service.report(restaurantId, date, date, now)).totals).toMatchObject({ receiptCount: 1, cardCents: 3998, totalCents: 3998 });
  });

  it("locks a closed local cash day and records an administrator reopening without changing its prior totals", async () => {
    const allocation = await visit();
    const firstClose = await service.execute(restaurantId, actor, { action: "close-day", date }, now);
    expect(firstClose).toMatchObject({ kind: "CLOSE", receiptCount: 0, revision: 1 });
    const account = await open(allocation.id);
    const close = { action: "checkout", accountId: account.id, expectedVersion: 0 } as const;
    await expect(service.execute(restaurantId, actor, close, now)).rejects.toMatchObject({ code: "CONFLICT" });
    await service.execute(restaurantId, actor, { action: "reopen-day", date, reason: "Cuenta pendiente de confirmar" }, now);
    await expect(service.execute(restaurantId, actor, { action: "close-day", date }, now)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await service.snapshot(restaurantId, now)).cashClosed).toBe(false);
    await service.execute(restaurantId, actor, close, now);
    await service.execute(restaurantId, actor, { action: "close-day", date }, now);
    const report = await service.report(restaurantId, date, "2099-12-02", now);
    expect(report.today).toBe(date);
    expect(report.receipts[0].businessDate).toBe(date);
    expect(report.days.map(({ kind, receiptCount, revision }) => ({ kind, receiptCount, revision }))).toEqual([
      { kind: "CLOSE", receiptCount: 1, revision: 3 },
      { kind: "REOPEN", receiptCount: 0, revision: 2 },
      { kind: "CLOSE", receiptCount: 0, revision: 1 },
    ]);
    await expect(service.execute(restaurantId, actor, { action: "reopen-day", date, reason: "Caja anterior" }, new Date("2099-12-02T03:00:00Z")))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("closes an expired unstarted group without affecting a later visit on the same table", async () => {
    const old = await visit();
    const account = await open(old.id);
    await service.execute(restaurantId, actor, { action: "checkout", accountId: account.id, expectedVersion: 0 }, now);
    expect((await service.snapshot(restaurantId, now)).unserved).toEqual([]);
    const after = new Date(now.getTime() + 121 * 60_000);
    const later = await createWalkIn(first, restaurantId, { customerName: "Otro grupo", partySize: 2, notes: "", durationMinutes: 120,
      assignment: { roomId, locationId, optionId: `table:${tableIds[2]}`, x: 420, y: 180, rotation: 0, expectedRoomRevision: 0 },
    }, () => after);
    const laterAllocation = await first.reservationAllocation.findUniqueOrThrow({ where: { reservationId: later.reservationId } });
    await service.execute(restaurantId, actor, { action: "open", allocationId: laterAllocation.id, tableId: tableIds[2], expectedAllocationVersion: 0, waiterId }, after);
    const snapshot = await service.snapshot(restaurantId, after);
    expect(snapshot.unserved).toEqual([expect.objectContaining({ allocationId: old.id, tableId: tableIds[2], expectedAllocationVersion: 1 })]);
    const close = { action: "close-empty", allocationId: old.id, tableId: tableIds[2], expectedAllocationVersion: 1 } as const;
    const receipt = await service.execute(restaurantId, actor, close, after);
    expect(receipt).toMatchObject({ businessDate: "2099-12-02", totalCents: 0, tableIds: [tableIds[2]] });
    expect(await service.execute(restaurantId, actor, close, after)).toEqual(receipt);
    expect(await first.tableReservation.findUnique({ where: { id: old.reservationId } })).toMatchObject({ status: "COMPLETED" });
    expect(await first.tableReservation.findUnique({ where: { id: later.reservationId } })).toMatchObject({ status: "CONFIRMED" });
    expect((await service.snapshot(restaurantId, after)).accounts.map(({ allocationId }) => allocationId)).toEqual([laterAllocation.id]);
  });

  it("isolates accounts, catalog and history between restaurants", async () => {
    const allocation = await visit();
    const account = await open(allocation.id);
    const foreignProduct = productView(await service.execute(otherRestaurantId, actor, { action: "save-product", name: "Pizza", unitPriceCents: 1100 }, now));
    await expect(service.account(otherRestaurantId, account.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.execute(restaurantId, actor, { action: "add-line", accountId: account.id,
      expectedVersion: 0, productId: foreignProduct.id, quantity: 1 }, now)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await service.account(restaurantId, account.id)).version).toBe(0);
    expect((await service.report(otherRestaurantId, date, date, now)).totals.receiptCount).toBe(0);
  });

  it("serializes checkout retries across independent clients into one receipt", async () => {
    const allocation = await visit();
    const account = await open(allocation.id);
    const close = { action: "checkout", accountId: account.id, expectedVersion: 0 } as const;
    const results = await Promise.all([
      service.execute(restaurantId, actor, close, now), new TableService(second).execute(restaurantId, actor, close, now),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect((await service.report(restaurantId, date, date, now)).totals.receiptCount).toBe(1);
    expect(await first.reservationAllocation.findUnique({ where: { id: allocation.id } })).toMatchObject({ version: 1 });
  }, 30_000);

  it("keeps an expired open account occupied for a second client until its checkout", async () => {
    const allocation = await visit();
    const account = await open(allocation.id);
    const after = new Date(now.getTime() + 121 * 60_000);
    const nextVisit = { customerName: "Otro grupo", partySize: 2, notes: "", durationMinutes: 120,
      assignment: { roomId, locationId, optionId: `table:${tableIds[0]}`, x: 180, y: 180, rotation: 0 as const, expectedRoomRevision: 0 } };
    await expect(createWalkIn(second, restaurantId, nextVisit, () => after)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await second.tableReservation.count({ where: { restaurantId } })).toBe(1);
    await service.execute(restaurantId, actor, { action: "checkout", accountId: account.id, expectedVersion: 0 }, after);
    await expect(createWalkIn(second, restaurantId, nextVisit, () => after)).resolves.toHaveProperty("reservationId");
  });

  it("blocks starting a scheduled check at the position of another group's expired account", async () => {
    const allocation = await visit();
    const account = await open(allocation.id);
    const scheduled = await withSqliteTransaction(first, async (tx) => {
      const reservation = await tx.tableReservation.create({ data: { restaurantId, code: randomUUID(),
        customerName: "Grupo siguiente", customerPhone: "12345678", date: "2099-12-02", time: "01:46", status: "CONFIRMED" } });
      await syncReservationAllocation(tx, reservation, { roomId, locationId, optionId: `table:${tableIds[2]}`,
        x: 180, y: 180, rotation: 0, expectedRoomRevision: 0 });
      return tx.reservationAllocation.findUniqueOrThrow({ where: { reservationId: reservation.id } });
    });
    const after = new Date(now.getTime() + 121 * 60_000);
    const floor = new PrismaFloorRepository(first);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(after);
    try {
      const live = await floor.getBoard(restaurantId, undefined, true);
      const owner = live.allocations.find(({ id }) => id === allocation.id);
      expect(owner?.serviceOverrun).toBe(true);
      expect(owner?.poses.map(({ tableId }) => tableId).sort()).toEqual(tableIds.slice(0, 2).sort());
      expect(live.allocations.find(({ id }) => id === scheduled.id)).toMatchObject({ serviceConflict: true, poses: [] });
      const timed = await floor.getBoard(restaurantId, after.toISOString());
      expect(timed.allocations.map(({ id }) => id)).toEqual([scheduled.id]);
      expect(timed.allocations[0]).not.toHaveProperty("serviceConflict");
      expect(timed.allocations[0].poses.map(({ tableId }) => tableId)).toEqual([tableIds[2]]);
    } finally { vi.useRealTimers(); }
    const openScheduled = { action: "open", allocationId: scheduled.id, tableId: tableIds[2], expectedAllocationVersion: 0, waiterId } as const;
    await expect(new TableService(second).execute(restaurantId, actor, openScheduled, after))
      .rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("en la ubicación de este armado") });
    await service.execute(restaurantId, actor, { action: "checkout", accountId: account.id, expectedVersion: 0 }, after);
    await expect(new TableService(second).execute(restaurantId, actor, openScheduled, after)).resolves.toMatchObject({ tableIds: [tableIds[2]] });
  });

  it("serializes concurrent cash closing and checkout without losing a receipt", async () => {
    const allocation = await visit();
    const account = await open(allocation.id);
    const added = accountView(await service.execute(restaurantId, actor, { action: "add-line", accountId: account.id,
      expectedVersion: 0, name: "Pizza", unitPriceCents: 1000, quantity: 1 }, now));
    await service.execute(restaurantId, actor, { action: "update-line", accountId: account.id, expectedVersion: 1,
      lineId: added.lines[0].id, deliveredQuantity: 1, cancelledQuantity: 0 }, now);
    const [paid, closed] = await Promise.allSettled([
      service.execute(restaurantId, actor, { action: "checkout", accountId: account.id, expectedVersion: 2, paymentMethod: "CASH" }, now),
      new TableService(second).execute(restaurantId, actor, { action: "close-day", date }, now),
    ]);
    expect(paid).toMatchObject({ status: "fulfilled", value: { totalCents: 1000 } });
    if (closed.status === "rejected") {
      expect(closed.reason).toMatchObject({ code: "CONFLICT" });
      await service.execute(restaurantId, actor, { action: "close-day", date }, now);
    }
    const report = await service.report(restaurantId, date, date, now);
    expect(report.days).toEqual([expect.objectContaining({ kind: "CLOSE", cashCents: 1000, receiptCount: 1 })]);
    expect(report.receipts).toHaveLength(1);
  }, 30_000);

  it("allows translating a group with an open account and rejects splitting its tables", async () => {
    const allocation = await visit();
    const account = await open(allocation.id);
    const move = (version: number, x: number[]) => reassignFloorAllocation(second, restaurantId, {
      reservationId: allocation.reservationId, expectedRevision: version, expectedAllocationVersion: version,
      assignment: { roomId, locationId, optionId: "custom", capacity: 10, x: 300, y: 200, rotation: 0, expectedRoomRevision: 0,
        customTables: tableIds.map((tableId, index) => ({ tableId, x: x[index], y: 200, rotation: 0 })) },
    }, () => now);
    await move(0, [220, 300, 460]);
    await expect(move(1, [180, 280, 420])).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("conservar sus mesas juntas") });
    expect((await service.account(restaurantId, account.id)).tableIds).toEqual(tableIds.slice(0, 2));
    const saved = await first.reservationAllocation.findUniqueOrThrow({ where: { id: allocation.id }, include: { tables: { orderBy: { labelSnapshot: "asc" } } } });
    expect(saved.tables.map(({ x }) => x)).toEqual([220, 300, 460]);
    expect(saved.version).toBe(1);
  });

  it("moves an overdue open group without absorbing its unserved neighbor", async () => {
    const allocation = await visit();
    const account = await open(allocation.id);
    const late = new Date(allocation.blockedUntil.getTime() + 60_000);
    await reassignFloorAllocation(second, restaurantId, {
      reservationId: allocation.reservationId, expectedRevision: 0, expectedAllocationVersion: 0,
      assignment: { roomId, locationId, optionId: "custom", capacity: 6, x: 300, y: 180, rotation: 0, expectedRoomRevision: 0,
        customTables: tableIds.slice(0, 2).map((tableId, index) => ({ tableId, x: 260 + index * 80, y: 180, rotation: 0 })) },
    }, () => late);
    expect((await service.snapshot(restaurantId, late)).unserved).toEqual([
      expect.objectContaining({ tableId: tableIds[2], expectedAllocationVersion: 1 }),
    ]);
    await service.execute(restaurantId, actor, { action: "close-empty", allocationId: allocation.id,
      tableId: tableIds[2], expectedAllocationVersion: 1 }, late);
    expect((await service.account(restaurantId, account.id)).tableIds).toEqual(tableIds.slice(0, 2));
    expect(await first.reservationAllocationTable.findMany({ where: { allocationId: allocation.id, releasedAt: null }, orderBy: { x: "asc" } }))
      .toMatchObject([{ tableId: tableIds[0], x: 260 }, { tableId: tableIds[1], x: 340 }]);
  });

  it("manages restaurant staff and requires an active waiter when opening or reassigning an account", async () => {
    const secondWaiter = await service.execute(restaurantId, actor, {
      action: "save-staff", name: "Bruno", role: "WAITER", phone: "1155550000", notes: "Turno noche", active: true,
    }, now);
    if (!("role" in secondWaiter)) throw new Error("Expected staff member");
    const cook = await service.execute(restaurantId, actor, {
      action: "save-staff", name: "Carla", role: "KITCHEN", phone: "", notes: "Parrilla", active: true,
    }, now);
    if (!("role" in cook)) throw new Error("Expected cook staff member");
    const foreignWaiter = await first.restaurantStaffMember.create({ data: { restaurantId: otherRestaurantId, name: "Otro", role: "WAITER", active: true } });

    expect((await service.staff(restaurantId)).map((m) => [m.name, m.role])).toEqual([
      ["Carla", "KITCHEN"],
      ["Ana", "WAITER"],
      ["Bruno", "WAITER"],
    ]);
    expect((await service.snapshot(restaurantId, now)).waiters.map((w) => w.name)).toEqual(["Ana", "Bruno"]);

    const allocation = await visit();
    await expect(service.execute(restaurantId, actor, {
      action: "open", allocationId: allocation.id, tableId: tableIds[0], expectedAllocationVersion: 0, waiterId: cook.id,
    }, now)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(service.execute(restaurantId, actor, {
      action: "open", allocationId: allocation.id, tableId: tableIds[0], expectedAllocationVersion: 0, waiterId: foreignWaiter.id,
    }, now)).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const opened = await open(allocation.id, 0, 0, service, waiterId);
    expect(opened).toMatchObject({ assignedWaiterId: waiterId, assignedWaiterName: "Ana" });

    const reassigned = accountView(await service.execute(restaurantId, actor, {
      action: "assign-waiter", accountId: opened.id, expectedVersion: opened.version, waiterId: secondWaiter.id,
    }, now));
    expect(reassigned).toMatchObject({ assignedWaiterId: secondWaiter.id, assignedWaiterName: "Bruno", version: 1 });

    await service.execute(restaurantId, actor, { action: "set-staff-active", id: secondWaiter.id, active: false }, now);
    expect((await service.snapshot(restaurantId, now)).waiters.map((w) => w.name)).toEqual(["Ana"]);
    await expect(service.execute(restaurantId, actor, {
      action: "assign-waiter", accountId: opened.id, expectedVersion: reassigned.version, waiterId: secondWaiter.id,
    }, now)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // Existing account keeps the assigned waiter name snapshot even after deactivation.
    expect((await service.account(restaurantId, opened.id)).assignedWaiterName).toBe("Bruno");
  });
});
