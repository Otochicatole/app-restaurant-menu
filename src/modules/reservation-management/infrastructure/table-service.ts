import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getJoinedTableGroups, restaurantLocalDateTime, restaurantToday, validateTableArrangement, type FloorRotation } from "@/modules/floor-management/contracts";
import type { ServiceStockPort, StockStatus } from "@/modules/inventory-management/contracts";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/platform/application/errors";
import { withSqliteTransaction } from "@/platform/database/sqlite-transaction";
import {
  serviceAuditActionSchema, serviceAuditSeveritySchema, serviceCashRangeSchema, serviceCommandSchema, servicePaymentMethodSchema, serviceSplitModeSchema,
  type KitchenSnapshot, type KitchenStatus, type KitchenStation, type KitchenTicketView,
  type ServiceAccountAuditLogView, type ServiceAccountPaymentItemView, type ServiceAccountPaymentView, type ServiceAccountView,
  type ServiceAuditAction, type ServiceAuditSeverity, type ServiceCashEventView, type ServiceCashReport, type ServiceCashTotals,
  type ServiceCommand, type ServiceCommandResult, type ServiceDraftRemovalInput, type ServicePaymentMethod,
  type ServiceProductView, type ServiceSnapshot, type ServiceUnservedGroup, type StaffMemberView, type StaffRole,
} from "../service-contracts";
import { syncReservationAllocation } from "./floor-allocations";

type Database = PrismaClient | Prisma.TransactionClient;
type Command<Action extends ServiceCommand["action"]> = Extract<ServiceCommand, { action: Action }>;
const accountInclude = {
  lines: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  tables: { orderBy: [{ label: "asc" }, { tableId: "asc" }] },
  payments: { orderBy: [{ sequence: "asc" }, { id: "asc" }] },
  auditLogs: { orderBy: [{ sequence: "asc" }, { createdAt: "asc" }, { id: "asc" }] },
  allocation: { select: { reservation: { select: { partySize: true } } } },
} satisfies Prisma.ServiceAccountInclude;
type AccountRow = Prisma.ServiceAccountGetPayload<{ include: typeof accountInclude }>;
const allocationInclude = {
  tables: { where: { releasedAt: null }, orderBy: { labelSnapshot: "asc" } },
  reservation: true,
  room: { select: { name: true } },
} satisfies Prisma.ReservationAllocationInclude;
type AllocationRow = Prisma.ReservationAllocationGetPayload<{ include: typeof allocationInclude }>;
const productSelect = {
  id: true,
  name: true,
  unitPriceCents: true,
  station: true,
  active: true,
  recipeId: true,
  inventoryItemId: true,
  recipe: {
    select: {
      name: true,
      yieldPortions: true,
      ingredients: {
        select: {
          quantityMilli: true,
          inventoryItem: {
            select: { currentStockMilli: true, minStockMilli: true, unitCostCents: true },
          },
        },
      },
    },
  },
  inventoryItem: {
    select: {
      name: true,
      unitCostCents: true,
      currentStockMilli: true,
      minStockMilli: true,
    },
  },
} satisfies Prisma.ServiceProductSelect;
type ProductRow = Prisma.ServiceProductGetPayload<{ select: typeof productSelect }>;

function toProduct(row: ProductRow): ServiceProductView {
  const station = (row.station === "BAR" ? "BAR" : "KITCHEN") as KitchenStation;
  if (row.recipe) {
    const safeYield = Math.max(1, row.recipe.yieldPortions);
    let totalCostCents = 0;
    let available = row.recipe.ingredients.length === 0 ? 0 : Number.POSITIVE_INFINITY;
    let hasOut = false;
    let hasLow = false;
    for (const ing of row.recipe.ingredients) {
      totalCostCents += Math.round((ing.quantityMilli * ing.inventoryItem.unitCostCents) / 1000);
      const perPortion = ing.quantityMilli / safeYield;
      if (perPortion > 0) {
        available = Math.min(available, Math.max(0, Math.floor(ing.inventoryItem.currentStockMilli / perPortion)));
      }
      if (ing.inventoryItem.currentStockMilli <= 0) hasOut = true;
      else if (ing.inventoryItem.currentStockMilli <= ing.inventoryItem.minStockMilli) hasLow = true;
    }
    const availableUnits = Number.isFinite(available) ? available : 0;
    const stockStatus: StockStatus = hasOut || availableUnits === 0 ? "OUT" : hasLow ? "LOW" : "OK";
    return {
      id: row.id,
      name: row.name,
      unitPriceCents: row.unitPriceCents,
      station,
      active: row.active,
      sourceKind: "RECIPE",
      sourceName: row.recipe.name,
      unitCostCents: Math.round(totalCostCents / safeYield),
      stockStatus,
      availableUnits,
    };
  }
  if (row.inventoryItem) {
    const stockStatus: StockStatus = row.inventoryItem.currentStockMilli <= 0
      ? "OUT"
      : row.inventoryItem.currentStockMilli <= row.inventoryItem.minStockMilli
        ? "LOW"
        : "OK";
    return {
      id: row.id,
      name: row.name,
      unitPriceCents: row.unitPriceCents,
      station,
      active: row.active,
      sourceKind: "INVENTORY_ITEM",
      sourceName: row.inventoryItem.name,
      unitCostCents: row.inventoryItem.unitCostCents,
      stockStatus,
      availableUnits: Math.max(0, Math.floor(row.inventoryItem.currentStockMilli / 1000)),
    };
  }
  return {
    id: row.id,
    name: row.name,
    unitPriceCents: row.unitPriceCents,
    station,
    active: row.active,
    sourceKind: "MANUAL",
    sourceName: null,
    unitCostCents: null,
    stockStatus: null,
    availableUnits: null,
  };
}
const staffSelect = { id: true, name: true, role: true, phone: true, notes: true, active: true, createdAt: true } satisfies Prisma.RestaurantStaffMemberSelect;
const maxStoredCents = 2_147_483_647;

type StaffRow = Prisma.RestaurantStaffMemberGetPayload<{ select: typeof staffSelect }>;

function toStaffMember(row: StaffRow): StaffMemberView {
  return { ...row, role: row.role as StaffRole, createdAt: row.createdAt.toISOString() };
}

type AuditEntryInput = {
  action: ServiceAuditAction;
  severity?: ServiceAuditSeverity;
  summary: string;
  details?: Record<string, string | number | boolean | null>;
  amountDeltaCents?: number;
};

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const draftRemovalActionText: Record<ServiceDraftRemovalInput["reason"], string> = {
  REMOVED: "Quitó del borrador",
  DECREMENTED: "Restó del borrador",
  CLEARED: "Vació del borrador",
};

function parseAuditDetails(detailsJson: string | null): Record<string, string | number | boolean | null> | null {
  if (!detailsJson) return null;
  try {
    const parsed = JSON.parse(detailsJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, string | number | boolean | null>;
  } catch {
    return null;
  }
}

async function resolveActorLabel(tx: Prisma.TransactionClient, actorId: string): Promise<string> {
  const admin = await tx.admin.findUnique({ where: { id: actorId }, select: { role: true, email: true } });
  if (!admin) return `Usuario (${actorId})`;
  return admin.role === "WAITER" ? `Sala (${admin.email})` : `Admin (${admin.email})`;
}

async function appendAuditLogs(
  tx: Prisma.TransactionClient,
  accountId: string,
  restaurantId: string,
  waiterName: string | null,
  actorId: string,
  now: Date,
  entries: readonly AuditEntryInput[],
) {
  if (entries.length === 0) return;
  const [actorLabel, lastEntry] = await Promise.all([
    resolveActorLabel(tx, actorId),
    tx.serviceAccountAuditLog.findFirst({
      where: { accountId, restaurantId },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    }),
  ]);
  let sequence = (lastEntry?.sequence ?? 0) + 1;
  for (const entry of entries) {
    await tx.serviceAccountAuditLog.create({
      data: {
        accountId,
        restaurantId,
        sequence: sequence++,
        action: entry.action,
        severity: entry.severity ?? "INFO",
        summary: entry.summary,
        detailsJson: entry.details ? JSON.stringify(entry.details) : null,
        amountDeltaCents: entry.amountDeltaCents ?? 0,
        waiterName,
        actorId,
        actorLabel,
        createdAt: now,
      },
    });
  }
}

function buildDraftRemovalAuditEntries(removals?: readonly ServiceDraftRemovalInput[]): AuditEntryInput[] {
  if (!removals?.length) return [];
  return removals.map((item) => ({
    action: "DRAFT_ITEM_REMOVED",
    severity: "INFO",
    summary: `${draftRemovalActionText[item.reason]}: ${item.quantity}x ${item.name}`,
    details: {
      productId: item.productId ?? null,
      itemName: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      reason: item.reason,
    },
    amountDeltaCents: -(item.unitPriceCents * item.quantity),
  }));
}

function parsePaymentItems(itemsJson: string | null): ServiceAccountPaymentItemView[] {
  if (!itemsJson) return [];
  try {
    const parsed = JSON.parse(itemsJson);
    return Array.isArray(parsed) ? parsed as ServiceAccountPaymentItemView[] : [];
  } catch {
    return [];
  }
}

function toAccount(row: AccountRow): ServiceAccountView {
  const { id, allocationId, reservationId, roomId, roomName, reservationCode, customerName,
    assignedWaiterId, assignedWaiterName,
    version, openedAt, closedAt, businessDate, paymentMethod, totalCents, receiptNumber,
    tipCents, discountCents, discountReason, cashCents, cardCents, transferCents } = row;
  const lines = row.lines.map(({ id, name, unitPriceCents, quantity, deliveredQuantity, cancelledQuantity, paidQuantity, notes, kitchenStatus, round, station, createdAt }) =>
    ({ id, name, unitPriceCents, quantity, deliveredQuantity, cancelledQuantity, paidQuantity: paidQuantity ?? 0,
      notes: notes ?? "",
      kitchenStatus: (kitchenStatus ?? "PENDING") as KitchenStatus,
      round: round ?? 1,
      station: (station ?? "KITCHEN") as KitchenStation,
      createdAt: createdAt.toISOString() }));
  const totals = lines.reduce((summary, line) => {
    summary.orderedCents += line.unitPriceCents * (line.quantity - line.cancelledQuantity);
    summary.deliveredCents += line.unitPriceCents * line.deliveredQuantity;
    summary.pendingQuantity += line.quantity - line.deliveredQuantity - line.cancelledQuantity;
    if (line.kitchenStatus === "READY" && line.deliveredQuantity < line.quantity - line.cancelledQuantity) {
      summary.readyQuantity += line.quantity - line.deliveredQuantity - line.cancelledQuantity;
    }
    return summary;
  }, { orderedCents: 0, deliveredCents: 0, pendingQuantity: 0, readyQuantity: 0 });
  const payments: ServiceAccountPaymentView[] = row.payments.map((payment) => ({
    id: payment.id,
    sequence: payment.sequence,
    receiptNumber: payment.receiptNumber,
    splitMode: serviceSplitModeSchema.parse(payment.splitMode),
    payerLabel: payment.payerLabel,
    businessDate: payment.businessDate,
    paymentMethod: servicePaymentMethodSchema.parse(payment.paymentMethod),
    subtotalCents: payment.subtotalCents,
    discountCents: payment.discountCents,
    discountReason: payment.discountReason ?? null,
    tipCents: payment.tipCents,
    totalCents: payment.totalCents,
    cashCents: payment.cashCents,
    cardCents: payment.cardCents,
    transferCents: payment.transferCents,
    items: parsePaymentItems(payment.itemsJson),
    paidBy: payment.paidBy,
    paidAt: payment.paidAt.toISOString(),
  }));
  const paidSubtotalCents = payments.reduce((sum, payment) => sum + payment.subtotalCents, 0);
  const remainingCents = closedAt ? 0 : Math.max(0, totals.deliveredCents - paidSubtotalCents);
  const partySize = row.allocation?.reservation?.partySize ?? 2;
  const auditLogs: ServiceAccountAuditLogView[] = row.auditLogs.map((entry) => ({
    id: entry.id,
    sequence: entry.sequence,
    action: serviceAuditActionSchema.parse(entry.action),
    severity: serviceAuditSeveritySchema.parse(entry.severity),
    summary: entry.summary,
    details: parseAuditDetails(entry.detailsJson),
    amountDeltaCents: entry.amountDeltaCents === 0 ? null : entry.amountDeltaCents,
    waiterName: entry.waiterName ?? null,
    actorId: entry.actorId,
    actorLabel: entry.actorLabel,
    createdAt: entry.createdAt.toISOString(),
  }));
  const cancellationCount = lines.reduce((sum, line) => sum + line.cancelledQuantity, 0);
  const recordedAlertCount = auditLogs.filter((entry) => entry.severity === "WARNING").length;
  const legacyHasAlerts = cancellationCount > 0 || (discountCents ?? 0) > 0;
  const auditAlertCount = recordedAlertCount > 0 ? recordedAlertCount : legacyHasAlerts ? 1 : 0;
  return { id, allocationId, reservationId, roomId, roomName, reservationCode, customerName, partySize,
    assignedWaiterId: assignedWaiterId ?? null, assignedWaiterName: assignedWaiterName ?? null, version,
    openedAt: openedAt.toISOString(), closedAt: closedAt?.toISOString() ?? null, businessDate,
    paymentMethod: paymentMethod === null ? null : servicePaymentMethodSchema.parse(paymentMethod), totalCents, receiptNumber,
    tipCents: tipCents ?? 0, discountCents: discountCents ?? 0, discountReason: discountReason ?? null,
    cashCents: cashCents ?? 0, cardCents: cardCents ?? 0, transferCents: transferCents ?? 0,
    tableIds: row.tables.map(({ tableId }) => tableId), tableLabels: row.tables.map(({ label }) => label), lines, ...totals,
    paidSubtotalCents, remainingCents, payments,
    auditLogs, hasAuditAlerts: auditAlertCount > 0, auditAlertCount, cancellationCount };
}

function toCashEvent(row: Prisma.ServiceCashEventGetPayload<object>): ServiceCashEventView {
  const { kind, createdAt, ...data } = row;
  if (kind !== "CLOSE" && kind !== "REOPEN") throw new Error("Movimiento de caja inválido.");
  return { ...data, kind, createdAt: createdAt.toISOString() };
}

function summarizeCash(receipts: readonly (Pick<ServiceAccountView, "paymentMethod" | "totalCents"> & Partial<Pick<ServiceAccountView, "cashCents" | "cardCents" | "transferCents" | "tipCents" | "discountCents">> )[]): ServiceCashTotals {
  const totals = { cashCents: 0, cardCents: 0, transferCents: 0, tipCents: 0, discountCents: 0, receiptCount: receipts.length, totalCents: 0 };
  for (const receipt of receipts) {
    const cents = receipt.totalCents ?? 0;
    const cash = receipt.cashCents ?? (receipt.paymentMethod === "CASH" ? cents : 0);
    const card = receipt.cardCents ?? (receipt.paymentMethod === "CARD" ? cents : 0);
    const transfer = receipt.transferCents ?? (receipt.paymentMethod === "TRANSFER_QR" ? cents : 0);
    totals.cashCents += cash;
    totals.cardCents += card;
    totals.transferCents += transfer;
    totals.tipCents += receipt.tipCents ?? 0;
    totals.discountCents += receipt.discountCents ?? 0;
    totals.totalCents += cents;
  }
  return totals;
}

async function settings(database: Database, restaurantId: string, requireFloor = false) {
  const restaurant = await database.restaurant.findUnique({ where: { id: restaurantId }, select: {
    name: true, timeZone: true, floorManagementEnabled: true, status: true, organization: { select: { status: true } },
  } });
  if (!restaurant) throw new NotFoundError("Restaurante");
  if (restaurant.status !== "ACTIVE" || restaurant.organization.status !== "ACTIVE" || requireFloor && !restaurant.floorManagementEnabled) {
    throw new ForbiddenError("El servicio de salón no está disponible.");
  }
  return restaurant;
}

function lastCashEvent(database: Database, restaurantId: string, businessDate: string) {
  return database.serviceCashEvent.findFirst({ where: { restaurantId, businessDate }, orderBy: { revision: "desc" } });
}

async function findAccount(database: Database, restaurantId: string, id: string): Promise<AccountRow> {
  const account = await database.serviceAccount.findFirst({ where: { id, restaurantId }, include: accountInclude });
  if (!account) throw new NotFoundError("Cuenta");
  return account;
}

async function updateAccount(tx: Prisma.TransactionClient, account: AccountRow, expectedVersion: number, data: Prisma.ServiceAccountUncheckedUpdateManyInput = {}) {
  const updated = await tx.serviceAccount.updateMany({
    where: { id: account.id, restaurantId: account.restaurantId, version: expectedVersion, closedAt: null },
    data: { ...data, version: { increment: 1 } },
  });
  if (updated.count !== 1) throw new ConflictError("La cuenta cambió. Actualizala y volvé a intentar.");
}

function toPose(table: AllocationRow["tables"][number]) {
  return { tableId: table.tableId, label: table.labelSnapshot, shape: table.shapeSnapshot, capacity: table.capacitySnapshot,
    width: table.width, height: table.height, x: table.x, y: table.y, rotation: table.rotation as FloorRotation };
}

function groupsOf(allocation: AllocationRow, excluded?: ReadonlySet<string>) {
  return getJoinedTableGroups(allocation.tables.filter(({ tableId }) => !excluded?.has(tableId)).map(toPose));
}

async function findAllocation(tx: Prisma.TransactionClient, restaurantId: string, id: string) {
  const allocation = await tx.reservationAllocation.findFirst({ where: { id, restaurantId }, include: allocationInclude });
  if (!allocation) throw new NotFoundError("Asignación");
  return allocation;
}

function assertCurrentAllocation(allocation: AllocationRow, command: Command<"open"> | Command<"close-empty">) {
  if (allocation.version !== command.expectedAllocationVersion) throw new ConflictError("El armado de mesas cambió. Actualizá el plano.");
  if (allocation.reservation.status !== "CONFIRMED" || allocation.releasedAt) {
    throw new ConflictError("La asignación ya no está disponible.");
  }
}

function accountDetails(allocation: AllocationRow, actorId: string, now: Date) {
  return { restaurantId: allocation.restaurantId, reservationId: allocation.reservationId, allocationId: allocation.id,
    roomId: allocation.roomId, roomName: allocation.room.name, reservationCode: allocation.reservation.code,
    customerName: allocation.reservation.customerName, openedAt: now, openedBy: actorId };
}

async function requireActiveWaiter(tx: Prisma.TransactionClient, restaurantId: string, waiterId: string) {
  const waiter = await tx.restaurantStaffMember.findFirst({
    where: { id: waiterId, restaurantId, active: true, role: "WAITER" },
    select: { id: true, name: true },
  });
  if (!waiter) throw new BadRequestError("Elegí un camarero activo del restaurante.");
  return waiter;
}

async function openAccount(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, command: Command<"open">, now: Date) {
  const waiter = await requireActiveWaiter(tx, restaurantId, command.waiterId);
  const allocation = await findAllocation(tx, restaurantId, command.allocationId);
  assertCurrentAllocation(allocation, command);
  const existing = await tx.serviceAccount.findFirst({
    where: { restaurantId, allocationId: allocation.id, closedAt: null, tables: { some: { tableId: command.tableId, releasedAt: null } } },
    include: accountInclude,
  });
  if (existing) return toAccount(existing);
  if (allocation.blockedFrom > now || allocation.blockedUntil <= now) {
    throw new ConflictError("La asignación ya no está disponible para abrir una cuenta.");
  }
  const group = groupsOf(allocation).find((component) => component.some(({ tableId }) => tableId === command.tableId));
  if (!group) throw new ConflictError("La mesa ya no pertenece a este armado.");
  const occupied = await tx.serviceAccountTable.findFirst({ where: {
    restaurantId, tableId: { in: group.map(({ tableId }) => tableId) }, releasedAt: null,
  }, select: { label: true } });
  if (occupied) throw new ConflictError(`La mesa ${occupied.label} ya tiene una cuenta abierta.`);
  const roomAccounts = await tx.serviceAccount.findMany({ where: { restaurantId, roomId: allocation.roomId, closedAt: null }, select: {
    tables: { where: { releasedAt: null }, select: { tableId: true } },
    allocation: { select: { tables: { where: { releasedAt: null } } } },
  } });
  const openPoses = roomAccounts.flatMap(({ tables, allocation }) => {
    const tableIds = new Set(tables.map(({ tableId }) => tableId));
    return allocation.tables.filter(({ tableId }) => tableIds.has(tableId)).map(toPose);
  });
  const collision = validateTableArrangement([...group, ...openPoses]);
  if (collision) throw new ConflictError(`Hay una cuenta abierta en la ubicación de este armado. ${collision}`);
  const account = await tx.serviceAccount.create({ data: {
    ...accountDetails(allocation, actorId, now),
    assignedWaiterId: waiter.id,
    assignedWaiterName: waiter.name,
    tables: { create: group.map(({ tableId, label }) => ({ tableId, label })) },
  }, include: accountInclude });
  if (command.partySize !== undefined && command.partySize !== allocation.reservation.partySize) {
    await tx.tableReservation.update({ where: { id: allocation.reservationId }, data: { partySize: command.partySize } });
  }
  const tableLabels = account.tables.map(({ label }) => label).join(", ");
  const seatedPartySize = command.partySize ?? allocation.reservation.partySize;
  await appendAuditLogs(tx, account.id, restaurantId, waiter.name, actorId, now, [{
    action: "ACCOUNT_OPENED",
    severity: "INFO",
    summary: `Abrió cuenta en ${tableLabels} · ${seatedPartySize} ${seatedPartySize === 1 ? "persona" : "personas"} · Camarero: ${waiter.name}`,
    details: {
      tables: tableLabels,
      partySize: seatedPartySize,
      reservationCode: allocation.reservation.code,
      waiterId: waiter.id,
      waiterName: waiter.name,
    },
  }]);
  return toAccount(await findAccount(tx, restaurantId, account.id));
}

async function openTable(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, command: Command<"open-table">, timeZone: string, now: Date) {
  const waiter = await requireActiveWaiter(tx, restaurantId, command.waiterId);
  const table = await tx.diningTable.findFirst({
    where: { id: command.tableId, roomId: command.roomId, restaurantId, active: true },
    include: { room: true },
  });
  if (!table || !table.room.active) throw new NotFoundError("Mesa activa");
  const location = table.locationId
    ? await tx.diningRoomLocation.findFirst({ where: { id: table.locationId, restaurantId, roomId: table.roomId, active: true } })
    : await tx.diningRoomLocation.findFirst({ where: { restaurantId, roomId: table.roomId, active: true }, orderBy: { name: "asc" } });
  if (!location) throw new BadRequestError("La mesa debe pertenecer a un sector activo del salón.");
  const [openAccountTable, overlappingAllocation] = await Promise.all([
    tx.serviceAccountTable.findFirst({ where: { restaurantId, tableId: table.id, releasedAt: null }, select: { label: true } }),
    tx.reservationAllocationTable.findFirst({
      where: {
        restaurantId,
        tableId: table.id,
        releasedAt: null,
        allocation: { releasedAt: null, blockedFrom: { lte: now }, blockedUntil: { gt: now } },
      },
      include: { allocation: { include: { reservation: { select: { customerName: true, code: true } } } } },
    }),
  ]);
  if (openAccountTable) throw new ConflictError(`La mesa ${table.label} ya tiene una cuenta abierta.`);
  if (overlappingAllocation) {
    throw new ConflictError(`La mesa ${table.label} está reservada para ${overlappingAllocation.allocation.reservation.customerName} (${overlappingAllocation.allocation.reservation.code}).`);
  }
  const durationMinutes = command.durationMinutes ?? 120;
  const endAt = new Date(now.getTime() + durationMinutes * 60_000);
  const local = restaurantLocalDateTime(timeZone, now);
  const code = `SALA-${randomUUID()}`;
  const customerName = command.customerName?.trim() || "Sin reserva";
  const reservation = await tx.tableReservation.create({
    data: {
      restaurantId,
      code,
      customerName,
      customerPhone: "",
      customerEmail: "",
      notes: command.notes?.trim() ?? "",
      partySize: command.partySize,
      ...local,
      source: "WALK_IN",
      status: "CONFIRMED",
    },
  });
  const allocation = await tx.reservationAllocation.create({
    data: {
      id: randomUUID(),
      restaurantId,
      reservationId: reservation.id,
      roomId: table.roomId,
      locationId: location.id,
      capacity: Math.max(table.capacity, command.partySize),
      timeZone,
      serviceStartAt: now,
      serviceEndAt: endAt,
      blockedFrom: now,
      blockedUntil: endAt,
      roomRevision: table.room.revision,
      tables: {
        create: [{
          tableId: table.id,
          labelSnapshot: table.label,
          shapeSnapshot: table.shape,
          capacitySnapshot: table.capacity,
          width: table.width,
          height: table.height,
          x: table.x,
          y: table.y,
          rotation: table.rotation,
        }],
      },
    },
  });
  const account = await tx.serviceAccount.create({
    data: {
      restaurantId,
      reservationId: reservation.id,
      allocationId: allocation.id,
      roomId: table.roomId,
      roomName: table.room.name,
      reservationCode: code,
      customerName,
      openedAt: now,
      openedBy: actorId,
      assignedWaiterId: waiter.id,
      assignedWaiterName: waiter.name,
      tables: { create: [{ tableId: table.id, label: table.label }] },
    },
    include: accountInclude,
  });
  await appendAuditLogs(tx, account.id, restaurantId, waiter.name, actorId, now, [{
    action: "ACCOUNT_OPENED",
    severity: "INFO",
    summary: `Abrió mesa ${table.label} (${location.name}) · ${command.partySize} ${command.partySize === 1 ? "persona" : "personas"} · Camarero: ${waiter.name}`,
    details: {
      tables: table.label,
      sector: location.name,
      partySize: command.partySize,
      reservationCode: code,
      waiterId: waiter.id,
      waiterName: waiter.name,
    },
  }]);
  return toAccount(await findAccount(tx, restaurantId, account.id));
}

async function assignWaiter(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, command: Command<"assign-waiter">, now: Date) {
  const waiter = await requireActiveWaiter(tx, restaurantId, command.waiterId);
  const account = await findAccount(tx, restaurantId, command.accountId);
  await updateAccount(tx, account, command.expectedVersion, {
    assignedWaiterId: waiter.id,
    assignedWaiterName: waiter.name,
  });
  const previousWaiterName = account.assignedWaiterName ?? null;
  await appendAuditLogs(tx, account.id, restaurantId, waiter.name, actorId, now, [{
    action: previousWaiterName ? "WAITER_CHANGED" : "WAITER_ASSIGNED",
    severity: "INFO",
    summary: previousWaiterName
      ? `Cambió camarero de ${previousWaiterName} a ${waiter.name}`
      : `Asignó camarero: ${waiter.name}`,
    details: { previousWaiterName, waiterId: waiter.id, waiterName: waiter.name },
  }]);
  return toAccount(await findAccount(tx, restaurantId, account.id));
}

type OrderLineInput = {
  productId?: string;
  name?: string;
  unitPriceCents?: number;
  quantity: number;
  notes?: string;
  station?: KitchenStation;
};

async function resolveOrderLineData(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  accountId: string,
  round: number,
  now: Date,
  item: OrderLineInput,
  productsById?: Map<string, ProductRow>,
) {
  let product: ProductRow | null = null;
  if (item.productId) {
    product = productsById?.get(item.productId) ?? await tx.serviceProduct.findFirst({
      where: { id: item.productId, restaurantId, active: true },
      select: productSelect,
    });
    if (!product) throw new NotFoundError("Producto activo");
    productsById?.set(product.id, product);
  }
  const name = product?.name ?? item.name;
  const unitPriceCents = product?.unitPriceCents ?? item.unitPriceCents;
  if (name === undefined || unitPriceCents === undefined) {
    throw new BadRequestError("Indicá el nombre y precio del consumo.");
  }
  return {
    accountId,
    restaurantId,
    productId: product?.id,
    name,
    unitPriceCents,
    quantity: item.quantity,
    createdAt: now,
    notes: item.notes ?? "",
    kitchenStatus: "PENDING" as const,
    round,
    station: item.station ?? (product?.station === "BAR" ? "BAR" : "KITCHEN"),
  };
}

async function addLine(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, command: Command<"add-line">, now: Date, stockPort?: ServiceStockPort) {
  const account = await findAccount(tx, restaurantId, command.accountId);
  await updateAccount(tx, account, command.expectedVersion);
  const currentRound = account.lines.reduce((max, line) => Math.max(max, line.round ?? 1), 1);
  const data = await resolveOrderLineData(tx, restaurantId, account.id, currentRound, now, command);
  const lineTotalCents = data.unitPriceCents * data.quantity;
  if (toAccount(account).orderedCents + lineTotalCents > maxStoredCents) {
    throw new BadRequestError("El total de la cuenta supera el máximo admitido.");
  }
  const created = await tx.serviceOrderLine.create({ data });
  const reference = `${account.roomName} · ${account.tables.map((t) => t.label).join("+") || account.reservationCode}`;
  const stockWarnings = created.productId && stockPort
    ? await stockPort.consumeForOrderLines(tx, restaurantId, actorId, reference, [{
        orderLineId: created.id,
        productId: created.productId,
        productName: created.name,
        quantity: created.quantity,
      }])
    : [];
  await appendAuditLogs(tx, account.id, restaurantId, account.assignedWaiterName ?? null, actorId, now, [
    data.productId
      ? {
          action: "LINE_ADDED",
          severity: "INFO",
          summary: `Agregó ${data.quantity}x ${data.name} (${currencyFormatter.format(lineTotalCents / 100)})`,
          details: { itemName: data.name, quantity: data.quantity, unitPriceCents: data.unitPriceCents, round: currentRound, station: data.station },
          amountDeltaCents: lineTotalCents,
        }
      : {
          action: "MANUAL_ITEM_CREATED",
          severity: "WARNING",
          summary: `Creó ítem manual fuera de catálogo: ${data.quantity}x ${data.name} (${currencyFormatter.format(lineTotalCents / 100)})`,
          details: { itemName: data.name, quantity: data.quantity, unitPriceCents: data.unitPriceCents, round: currentRound, station: data.station },
          amountDeltaCents: lineTotalCents,
        },
  ]);
  const result = toAccount(await findAccount(tx, restaurantId, account.id));
  return stockWarnings.length > 0 ? { ...result, stockWarnings } : result;
}

async function confirmOrder(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, command: Command<"confirm-order">, now: Date, stockPort?: ServiceStockPort) {
  const account = await findAccount(tx, restaurantId, command.accountId);
  await updateAccount(tx, account, command.expectedVersion);
  const nextRound = account.lines.reduce((max, line) => Math.max(max, line.round ?? 1), 0) + 1;
  const productsById = new Map<string, ProductRow>();
  const linesToCreate: Awaited<ReturnType<typeof resolveOrderLineData>>[] = [];
  let runningOrderedCents = toAccount(account).orderedCents;
  let confirmedTotalCents = 0;
  for (const item of command.items) {
    const data = await resolveOrderLineData(tx, restaurantId, account.id, nextRound, now, item, productsById);
    const lineTotal = data.unitPriceCents * data.quantity;
    runningOrderedCents += lineTotal;
    confirmedTotalCents += lineTotal;
    if (runningOrderedCents > maxStoredCents) {
      throw new BadRequestError("El total de la cuenta supera el máximo admitido.");
    }
    linesToCreate.push(data);
  }
  const stockTargets: { orderLineId: string; productId: string; productName: string; quantity: number }[] = [];
  for (const data of linesToCreate) {
    const created = await tx.serviceOrderLine.create({ data });
    if (created.productId) {
      stockTargets.push({
        orderLineId: created.id,
        productId: created.productId,
        productName: created.name,
        quantity: created.quantity,
      });
    }
  }
  const reference = `${account.roomName} · ${account.tables.map((t) => t.label).join("+") || account.reservationCode}`;
  const stockWarnings = stockTargets.length > 0 && stockPort
    ? await stockPort.consumeForOrderLines(tx, restaurantId, actorId, reference, stockTargets)
    : [];
  const manualEntries: AuditEntryInput[] = linesToCreate
    .filter((data) => !data.productId)
    .map((data) => {
      const totalCents = data.unitPriceCents * data.quantity;
      return {
        action: "MANUAL_ITEM_CREATED",
        severity: "WARNING",
        summary: `Creó ítem manual fuera de catálogo: ${data.quantity}x ${data.name} (${currencyFormatter.format(totalCents / 100)})`,
        details: { itemName: data.name, quantity: data.quantity, unitPriceCents: data.unitPriceCents, round: nextRound, station: data.station },
        amountDeltaCents: totalCents,
      };
    });
  const totalUnits = linesToCreate.reduce((sum, line) => sum + line.quantity, 0);
  await appendAuditLogs(tx, account.id, restaurantId, account.assignedWaiterName ?? null, actorId, now, [
    ...buildDraftRemovalAuditEntries(command.draftRemovals),
    {
      action: "ORDER_CONFIRMED",
      severity: "INFO",
      summary: `Confirmó Tanda ${nextRound} (${linesToCreate.length} ${linesToCreate.length === 1 ? "ítem" : "ítems"}, ${totalUnits} uds.)`,
      details: { round: nextRound, itemCount: linesToCreate.length, totalUnits, items: linesToCreate.map((l) => `${l.quantity}x ${l.name}`).join(", ") },
      amountDeltaCents: confirmedTotalCents,
    },
    ...manualEntries,
  ]);
  const result = toAccount(await findAccount(tx, restaurantId, account.id));
  return stockWarnings.length > 0 ? { ...result, stockWarnings } : result;
}

async function updateLine(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, command: Command<"update-line">, now: Date, stockPort?: ServiceStockPort) {
  const account = await findAccount(tx, restaurantId, command.accountId);
  await updateAccount(tx, account, command.expectedVersion);
  const line = account.lines.find(({ id }) => id === command.lineId);
  if (!line) throw new NotFoundError("Consumo");
  const { deliveredQuantity, cancelledQuantity } = command;
  if (deliveredQuantity + cancelledQuantity > line.quantity) {
    throw new BadRequestError("Las cantidades entregadas y canceladas superan la cantidad pedida.");
  }
  if (deliveredQuantity < line.paidQuantity) {
    throw new BadRequestError("No podés reducir entregas por debajo de las unidades ya cobradas.");
  }
  const view = toAccount(account);
  const nextDeliveredCents = view.deliveredCents + (deliveredQuantity - line.deliveredQuantity) * line.unitPriceCents;
  if (nextDeliveredCents < view.paidSubtotalCents) {
    throw new BadRequestError("No podés reducir entregas por debajo del monto ya cobrado en pagos parciales.");
  }
  const restoredCents = (line.cancelledQuantity - cancelledQuantity) * line.unitPriceCents;
  if (toAccount(account).orderedCents + restoredCents > maxStoredCents) {
    throw new BadRequestError("El total de la cuenta supera el máximo admitido.");
  }
  const remaining = line.quantity - cancelledQuantity;
  const nextStatus =
    cancelledQuantity === line.quantity
      ? "CANCELLED"
      : remaining > 0 && deliveredQuantity === remaining
        ? "SERVED"
        : line.kitchenStatus;
  await tx.serviceOrderLine.update({ where: { id: line.id }, data: { deliveredQuantity, cancelledQuantity, kitchenStatus: nextStatus } });
  if (line.kitchenStatus === "PENDING" && line.productId && cancelledQuantity !== line.cancelledQuantity && stockPort) {
    const reference = `${account.roomName} · ${account.tables.map((t) => t.label).join("+") || account.reservationCode}`;
    await stockPort.syncCancelledOrderLine(tx, restaurantId, actorId, reference, {
      orderLineId: line.id,
      productId: line.productId,
      previousCancelledQuantity: line.cancelledQuantity,
      nextCancelledQuantity: cancelledQuantity,
    });
  }
  const entries: AuditEntryInput[] = [];
  if (cancelledQuantity > line.cancelledQuantity) {
    const delta = cancelledQuantity - line.cancelledQuantity;
    const deltaCents = -(delta * line.unitPriceCents);
    entries.push({
      action: "ITEM_CANCELLED",
      severity: "WARNING",
      summary: `Anuló ${delta}x ${line.name} (${currencyFormatter.format((delta * line.unitPriceCents) / 100)})`,
      details: { lineId: line.id, itemName: line.name, deltaQuantity: delta, round: line.round ?? 1 },
      amountDeltaCents: deltaCents,
    });
  } else if (cancelledQuantity < line.cancelledQuantity) {
    const delta = line.cancelledQuantity - cancelledQuantity;
    const deltaCents = delta * line.unitPriceCents;
    entries.push({
      action: "CANCELLATION_REVERTED",
      severity: "WARNING",
      summary: `Deshizo anulación de ${delta}x ${line.name}`,
      details: { lineId: line.id, itemName: line.name, deltaQuantity: delta, round: line.round ?? 1 },
      amountDeltaCents: deltaCents,
    });
  }
  if (deliveredQuantity > line.deliveredQuantity) {
    const delta = deliveredQuantity - line.deliveredQuantity;
    entries.push({
      action: "ITEM_DELIVERED",
      severity: "INFO",
      summary: `Entregó ${delta}x ${line.name}`,
      details: { lineId: line.id, itemName: line.name, deltaQuantity: delta, round: line.round ?? 1 },
    });
  } else if (deliveredQuantity < line.deliveredQuantity) {
    const delta = line.deliveredQuantity - deliveredQuantity;
    entries.push({
      action: "DELIVERY_REVERTED",
      severity: "WARNING",
      summary: `Revirtió entrega de ${delta}x ${line.name}`,
      details: { lineId: line.id, itemName: line.name, deltaQuantity: delta, round: line.round ?? 1 },
    });
  }
  await appendAuditLogs(tx, account.id, restaurantId, account.assignedWaiterName ?? null, actorId, now, entries);
  return toAccount(await findAccount(tx, restaurantId, account.id));
}

async function deliverAll(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, command: Command<"deliver-all">, now: Date) {
  const account = await findAccount(tx, restaurantId, command.accountId);
  await updateAccount(tx, account, command.expectedVersion);
  let deliveredUnits = 0;
  let deliveredLines = 0;
  for (const line of account.lines) {
    const unserved = line.quantity - line.cancelledQuantity;
    if (unserved > line.deliveredQuantity) {
      deliveredUnits += unserved - line.deliveredQuantity;
      deliveredLines += 1;
      await tx.serviceOrderLine.update({
        where: { id: line.id },
        data: { deliveredQuantity: unserved, kitchenStatus: "SERVED" },
      });
    }
  }
  if (deliveredUnits > 0) {
    await appendAuditLogs(tx, account.id, restaurantId, account.assignedWaiterName ?? null, actorId, now, [{
      action: "ALL_ITEMS_DELIVERED",
      severity: "INFO",
      summary: `Entregó todos los pendientes (${deliveredLines} ${deliveredLines === 1 ? "línea" : "líneas"}, ${deliveredUnits} uds.)`,
      details: { deliveredLines, deliveredUnits },
    }]);
  }
  return toAccount(await findAccount(tx, restaurantId, account.id));
}

async function marchRound(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, command: Command<"march-round">, now: Date) {
  const account = await findAccount(tx, restaurantId, command.accountId);
  await updateAccount(tx, account, command.expectedVersion);
  const marched = await tx.serviceOrderLine.updateMany({
    where: { accountId: account.id, restaurantId, kitchenStatus: "PENDING" },
    data: { kitchenStatus: "IN_PREP" },
  });
  await appendAuditLogs(tx, account.id, restaurantId, account.assignedWaiterName ?? null, actorId, now, [{
    action: "ROUND_MARCHED",
    severity: "INFO",
    summary: `Marchó pedido a cocina/barra (${marched.count} ${marched.count === 1 ? "línea" : "líneas"})`,
    details: { lineCount: marched.count },
  }]);
  return toAccount(await findAccount(tx, restaurantId, account.id));
}

async function updateKitchenStatus(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, command: Command<"update-kitchen-status">, now: Date) {
  const line = await tx.serviceOrderLine.findFirst({
    where: { id: command.lineId, restaurantId },
    include: { account: { select: { id: true, assignedWaiterName: true } } },
  });
  if (!line) throw new NotFoundError("Consumo");
  const data: Prisma.ServiceOrderLineUpdateInput = { kitchenStatus: command.status };
  if (command.status === "SERVED") {
    data.deliveredQuantity = line.quantity - line.cancelledQuantity;
  }
  await tx.serviceOrderLine.update({ where: { id: line.id }, data });
  if (line.kitchenStatus !== command.status) {
    const isCancel = command.status === "CANCELLED";
    const lineCents = line.unitPriceCents * line.quantity;
    await appendAuditLogs(tx, line.account.id, restaurantId, line.account.assignedWaiterName ?? null, actorId, now, [
      isCancel
        ? {
            action: "ITEM_CANCELLED",
            severity: "WARNING",
            summary: `Cocina/Barra anuló ${line.quantity}x ${line.name} (${currencyFormatter.format(lineCents / 100)})`,
            details: { lineId: line.id, itemName: line.name, quantity: line.quantity, previousStatus: line.kitchenStatus, nextStatus: command.status, station: line.station },
            amountDeltaCents: -lineCents,
          }
        : {
            action: "KITCHEN_STATUS_CHANGED",
            severity: "INFO",
            summary: `Cocina/Barra cambió ${line.name} a ${command.status}`,
            details: { lineId: line.id, itemName: line.name, previousStatus: line.kitchenStatus, nextStatus: command.status, station: line.station },
          },
    ]);
  }
  return { updated: true };
}

async function ensureCashOpen(tx: Prisma.TransactionClient, restaurantId: string, businessDate: string) {
  if ((await lastCashEvent(tx, restaurantId, businessDate))?.kind === "CLOSE") {
    throw new ConflictError("La caja del día está cerrada. Reabrila para cerrar esta cuenta.");
  }
}

async function releaseTables(tx: Prisma.TransactionClient, allocation: Pick<AllocationRow, "id" | "reservationId" | "restaurantId">,
  tableIds: string[], now: Date) {
  const { id: allocationId, restaurantId, reservationId } = allocation;
  const released = await tx.reservationAllocationTable.updateMany({ where: {
    allocationId, restaurantId, tableId: { in: tableIds }, releasedAt: null,
  }, data: { releasedAt: now } });
  if (released.count !== tableIds.length) throw new ConflictError("Las mesas de la cuenta cambiaron. Actualizá el plano.");
  const remaining = await tx.reservationAllocationTable.count({ where: { allocationId, restaurantId, releasedAt: null } });
  if (remaining > 0) {
    await tx.reservationAllocation.update({ where: { id: allocationId }, data: { version: { increment: 1 } } });
    return;
  }
  const reservation = await tx.tableReservation.update({ where: { id: reservationId }, data: {
    status: "COMPLETED", revision: { increment: 1 },
  } });
  await syncReservationAllocation(tx, reservation, undefined, now);
}

function resolvePaymentBreakdown(
  method: ServicePaymentMethod,
  netCents: number,
  tipCents: number,
  command: { cashCents?: number; cardCents?: number; transferCents?: number },
) {
  let cash = command.cashCents ?? 0;
  let card = command.cardCents ?? 0;
  let transfer = command.transferCents ?? 0;
  if (method === "SPLIT") {
    const totalPaid = cash + card + transfer;
    const expectedPaid = netCents + tipCents;
    if (totalPaid !== expectedPaid) {
      throw new BadRequestError(`La suma de los pagos ($${totalPaid / 100}) debe ser igual al total a cobrar ($${expectedPaid / 100}).`);
    }
  } else if (method === "CASH") {
    cash = netCents + tipCents;
    card = 0;
    transfer = 0;
  } else if (method === "CARD") {
    card = netCents + tipCents;
    cash = 0;
    transfer = 0;
  } else if (method === "TRANSFER_QR") {
    transfer = netCents + tipCents;
    cash = 0;
    card = 0;
  }
  return { cash, card, transfer };
}

async function finalizeAccountFromPayments(
  tx: Prisma.TransactionClient,
  account: AccountRow,
  actorId: string,
  businessDate: string,
  now: Date,
  auditEntries: AuditEntryInput[],
) {
  const allocation = await tx.reservationAllocation.findFirst({
    where: { id: account.allocationId, restaurantId: account.restaurantId, reservationId: account.reservationId },
    include: { reservation: true },
  });
  if (!allocation || allocation.releasedAt || allocation.reservation.status !== "CONFIRMED") {
    throw new ConflictError("La asignación cambió. Actualizá el plano antes de cerrar la cuenta.");
  }
  const payments = await tx.serviceAccountPayment.findMany({
    where: { accountId: account.id, restaurantId: account.restaurantId },
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
  });
  const totalCents = payments.reduce((sum, item) => sum + item.totalCents, 0);
  const tipCents = payments.reduce((sum, item) => sum + item.tipCents, 0);
  const discountCents = payments.reduce((sum, item) => sum + item.discountCents, 0);
  const cashCents = payments.reduce((sum, item) => sum + item.cashCents, 0);
  const cardCents = payments.reduce((sum, item) => sum + item.cardCents, 0);
  const transferCents = payments.reduce((sum, item) => sum + item.transferCents, 0);
  const reasons = [...new Set(payments.map((item) => item.discountReason?.trim()).filter(Boolean))];
  const methods = [...new Set(payments.map((item) => item.paymentMethod))];
  const consolidatedMethod = totalCents === 0 ? null : methods.length === 1 ? methods[0] : "SPLIT";
  const receiptNumber = `C-${account.id}`;
  await tx.serviceAccount.updateMany({
    where: { id: account.id, restaurantId: account.restaurantId, closedAt: null },
    data: {
      closedAt: now,
      closedBy: actorId,
      businessDate,
      totalCents,
      tipCents,
      discountCents,
      discountReason: reasons.length > 0 ? reasons.join(" · ").slice(0, 100) : null,
      cashCents,
      cardCents,
      transferCents,
      paymentMethod: consolidatedMethod,
      receiptNumber,
    },
  });
  const tableIds = account.tables.map(({ tableId }) => tableId);
  await tx.serviceAccountTable.updateMany({ where: { accountId: account.id, restaurantId: account.restaurantId, releasedAt: null }, data: { releasedAt: now } });
  await releaseTables(tx, allocation, tableIds, now);
  const suspiciousZeroClose = totalCents === 0 && account.lines.length > 0;
  auditEntries.push({
    action: "ACCOUNT_CHECKED_OUT",
    severity: suspiciousZeroClose ? "WARNING" : "INFO",
    summary: suspiciousZeroClose
      ? "Cerró cuenta en $ 0,00 tras anulaciones o descuento"
      : `Cerró cuenta · Total ${currencyFormatter.format(totalCents / 100)}${consolidatedMethod ? ` · ${consolidatedMethod}` : ""}${payments.length > 1 ? ` (${payments.length} pagos)` : ""}`,
    details: {
      paymentMethod: consolidatedMethod ?? null,
      totalCents,
      tipCents,
      discountCents,
      cashCents,
      cardCents,
      transferCents,
      paymentCount: payments.length,
      receiptNumber,
    },
    amountDeltaCents: totalCents,
  });
  await appendAuditLogs(tx, account.id, account.restaurantId, account.assignedWaiterName ?? null, actorId, now, auditEntries);
}

async function payPartial(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  actorId: string,
  command: Command<"pay-partial">,
  businessDate: string,
  now: Date,
) {
  const account = await findAccount(tx, restaurantId, command.accountId);
  if (account.closedAt) throw new ConflictError("La cuenta ya fue cerrada. Consultá su recibo.");
  const view = toAccount(account);
  await ensureCashOpen(tx, restaurantId, businessDate);
  if (view.remainingCents <= 0) {
    throw new BadRequestError("La cuenta no tiene saldo pendiente para cobrar.");
  }

  let subtotalCents = 0;
  const itemsSnapshot: ServiceAccountPaymentItemView[] = [];
  const lineUpdates: { lineId: string; quantity: number }[] = [];

  if (command.splitMode === "BY_ITEMS") {
    if (!command.items?.length) throw new BadRequestError("Seleccioná al menos un producto entregado para cobrar.");
    const requestedByLine = new Map<string, number>();
    for (const item of command.items) {
      requestedByLine.set(item.lineId, (requestedByLine.get(item.lineId) ?? 0) + item.quantity);
    }
    for (const [lineId, quantity] of requestedByLine) {
      const line = account.lines.find((candidate) => candidate.id === lineId);
      if (!line) throw new NotFoundError("Consumo");
      const unpaid = line.deliveredQuantity - (line.paidQuantity ?? 0);
      if (quantity > unpaid) {
        throw new BadRequestError(`Solo quedan ${unpaid} unidad(es) entregadas sin cobrar de ${line.name}.`);
      }
      subtotalCents += line.unitPriceCents * quantity;
      itemsSnapshot.push({ lineId: line.id, name: line.name, quantity, unitPriceCents: line.unitPriceCents });
      lineUpdates.push({ lineId: line.id, quantity });
    }
    if (subtotalCents <= 0 || subtotalCents > view.remainingCents) {
      throw new BadRequestError("La selección supera el saldo pendiente de la cuenta.");
    }
  } else {
    subtotalCents = command.splitMode === "FULL" ? view.remainingCents : (command.amountCents ?? 0);
    if (subtotalCents <= 0 || subtotalCents > view.remainingCents) {
      throw new BadRequestError("El monto a cobrar debe ser mayor a $0 y no superar el saldo pendiente.");
    }
  }

  const discount = Math.min(subtotalCents, command.discountCents ?? 0);
  const netPaid = Math.max(0, subtotalCents - discount);
  const tip = command.tipCents ?? 0;
  const { cash, card, transfer } = resolvePaymentBreakdown(command.paymentMethod, netPaid, tip, command);

  await updateAccount(tx, account, command.expectedVersion);
  for (const update of lineUpdates) {
    await tx.serviceOrderLine.update({
      where: { id: update.lineId },
      data: { paidQuantity: { increment: update.quantity } },
    });
  }

  const sequence = account.payments.reduce((max, item) => Math.max(max, item.sequence), 0) + 1;
  const payerLabel = command.payerLabel?.trim() || (sequence === 1 ? "Pago 1" : `Pago ${sequence}`);
  const partialReceiptNumber = `C-${account.id}-P${sequence}`;
  await tx.serviceAccountPayment.create({
    data: {
      accountId: account.id,
      restaurantId,
      sequence,
      receiptNumber: partialReceiptNumber,
      splitMode: command.splitMode,
      payerLabel,
      businessDate,
      paymentMethod: command.paymentMethod,
      subtotalCents,
      discountCents: discount,
      discountReason: command.discountReason ?? null,
      tipCents: tip,
      totalCents: netPaid,
      cashCents: cash,
      cardCents: card,
      transferCents: transfer,
      itemsJson: itemsSnapshot.length > 0 ? JSON.stringify(itemsSnapshot) : null,
      paidBy: actorId,
      paidAt: now,
    },
  });

  const auditEntries: AuditEntryInput[] = [...buildDraftRemovalAuditEntries(command.draftRemovals)];
  if (discount > 0) {
    auditEntries.push({
      action: "DISCOUNT_APPLIED",
      severity: "WARNING",
      summary: `Aplicó descuento de ${currencyFormatter.format(discount / 100)} en ${payerLabel}${command.discountReason ? ` (${command.discountReason})` : ""}`,
      details: { discountCents: discount, discountReason: command.discountReason ?? null, partialReceiptNumber },
      amountDeltaCents: -discount,
    });
  }
  const splitDetail = itemsSnapshot.length > 0 ? ` · ${itemsSnapshot.map((i) => `${i.quantity}x ${i.name}`).join(", ")}` : "";
  auditEntries.push({
    action: "PARTIAL_PAYMENT_RECORDED",
    severity: "INFO",
    summary: `Cobró parte (${payerLabel}) ${currencyFormatter.format(netPaid / 100)} · ${command.paymentMethod}${splitDetail}`,
    details: { splitMode: command.splitMode, payerLabel, subtotalCents, discountCents: discount, tipCents: tip, totalCents: netPaid, partialReceiptNumber },
    amountDeltaCents: netPaid,
  });

  const nextRemainingCents = view.remainingCents - subtotalCents;
  if (nextRemainingCents === 0 && view.pendingQuantity === 0) {
    await finalizeAccountFromPayments(tx, account, actorId, businessDate, now, auditEntries);
  } else {
    await appendAuditLogs(tx, account.id, restaurantId, account.assignedWaiterName ?? null, actorId, now, auditEntries);
  }
  return toAccount(await findAccount(tx, restaurantId, account.id));
}

async function checkout(tx: Prisma.TransactionClient, restaurantId: string, actorId: string,
  command: Command<"checkout">, businessDate: string, now: Date) {
  const account = await findAccount(tx, restaurantId, command.accountId);
  const view = toAccount(account);
  if (account.closedAt) {
    const lastPaymentMethod = account.payments.length > 0 ? account.payments[account.payments.length - 1].paymentMethod : account.paymentMethod;
    const expectedMethod = account.totalCents === 0 ? null : command.paymentMethod;
    if (
      account.version === command.expectedVersion + 1
      && (account.paymentMethod === expectedMethod || (account.payments.length > 1 && lastPaymentMethod === expectedMethod))
    ) {
      return view;
    }
    throw new ConflictError("La cuenta ya fue cerrada. Consultá su recibo antes de registrar otro pago.");
  }
  await ensureCashOpen(tx, restaurantId, businessDate);
  if (view.pendingQuantity) throw new ConflictError("Marcá los consumos pendientes como entregados o cancelados antes de cerrar.");

  const settleCents = view.remainingCents;
  const discount = Math.min(settleCents, command.discountCents ?? 0);
  const netDelivered = Math.max(0, settleCents - discount);
  const tip = command.tipCents ?? 0;
  if (settleCents > 0 && !command.paymentMethod) throw new BadRequestError("Elegí un medio de pago.");
  const method = settleCents === 0 ? null : (command.paymentMethod ?? "CASH");
  const { cash, card, transfer } = method
    ? resolvePaymentBreakdown(method, netDelivered, tip, command)
    : { cash: 0, card: 0, transfer: 0 };

  await updateAccount(tx, account, command.expectedVersion);

  const auditEntries: AuditEntryInput[] = [...buildDraftRemovalAuditEntries(command.draftRemovals)];
  if (discount > 0) {
    auditEntries.push({
      action: "DISCOUNT_APPLIED",
      severity: "WARNING",
      summary: `Aplicó descuento de ${currencyFormatter.format(discount / 100)}${command.discountReason ? ` (${command.discountReason})` : ""}`,
      details: { discountCents: discount, discountReason: command.discountReason ?? null },
      amountDeltaCents: -discount,
    });
  }

  if (settleCents > 0 && method) {
    const sequence = account.payments.reduce((max, item) => Math.max(max, item.sequence), 0) + 1;
    const isFinalPart = account.payments.length > 0;
    const payerLabel = isFinalPart ? "Saldo final" : "Cuenta completa";
    const unpaidItems: ServiceAccountPaymentItemView[] = account.lines
      .filter((line) => line.deliveredQuantity - (line.paidQuantity ?? 0) > 0)
      .map((line) => ({
        lineId: line.id,
        name: line.name,
        quantity: line.deliveredQuantity - (line.paidQuantity ?? 0),
        unitPriceCents: line.unitPriceCents,
      }));
    for (const line of account.lines) {
      const diff = line.deliveredQuantity - (line.paidQuantity ?? 0);
      if (diff > 0) {
        await tx.serviceOrderLine.update({ where: { id: line.id }, data: { paidQuantity: line.deliveredQuantity } });
      }
    }
    await tx.serviceAccountPayment.create({
      data: {
        accountId: account.id,
        restaurantId,
        sequence,
        receiptNumber: `C-${account.id}-P${sequence}`,
        splitMode: isFinalPart ? "CUSTOM_AMOUNT" : "FULL",
        payerLabel,
        businessDate,
        paymentMethod: method,
        subtotalCents: settleCents,
        discountCents: discount,
        discountReason: command.discountReason ?? null,
        tipCents: tip,
        totalCents: netDelivered,
        cashCents: cash,
        cardCents: card,
        transferCents: transfer,
        itemsJson: unpaidItems.length > 0 ? JSON.stringify(unpaidItems) : null,
        paidBy: actorId,
        paidAt: now,
      },
    });
  }

  await finalizeAccountFromPayments(tx, account, actorId, businessDate, now, auditEntries);
  return toAccount(await findAccount(tx, restaurantId, account.id));
}

async function unservedGroups(database: Database, restaurantId: string, now: Date): Promise<ServiceUnservedGroup[]> {
  const allocations = await database.reservationAllocation.findMany({
    where: { restaurantId, releasedAt: null, blockedUntil: { lte: now }, reservation: { status: "CONFIRMED" } },
    include: { ...allocationInclude, serviceAccounts: { where: { closedAt: null }, select: { tables: { select: { tableId: true } } } } },
    orderBy: [{ blockedUntil: "asc" }, { id: "asc" }],
  });
  return allocations.flatMap((allocation) => {
    const openTableIds = new Set(allocation.serviceAccounts.flatMap(({ tables }) => tables.map(({ tableId }) => tableId)));
    return groupsOf(allocation, openTableIds)
      .map((group) => ({ allocationId: allocation.id, expectedAllocationVersion: allocation.version,
        tableId: group[0].tableId, tableLabels: group.map(({ label }) => label), reservationCode: allocation.reservation.code,
        customerName: allocation.reservation.customerName, roomName: allocation.room.name }));
  });
}

async function closeEmpty(tx: Prisma.TransactionClient, restaurantId: string, actorId: string,
  command: Command<"close-empty">, businessDate: string, now: Date) {
  const allocation = await findAllocation(tx, restaurantId, command.allocationId);
  const priorAccounts = await tx.serviceAccount.findMany({ where: { restaurantId, allocationId: allocation.id },
    select: { closedAt: true, tables: { select: { tableId: true } } } });
  const openTableIds = new Set(priorAccounts.filter(({ closedAt }) => !closedAt).flatMap(({ tables }) => tables.map(({ tableId }) => tableId)));
  if (openTableIds.has(command.tableId)) throw new ConflictError("Este grupo tiene una cuenta abierta. Cerrala desde la lista de cuentas.");
  const group = groupsOf(allocation, openTableIds).find((component) => component.some(({ tableId }) => tableId === command.tableId));
  if (!group) {
    const existing = await tx.serviceAccount.findFirst({ where: { restaurantId, allocationId: allocation.id,
      closedAt: { not: null }, totalCents: 0, tables: { some: { tableId: command.tableId } }, lines: { none: {} } }, include: accountInclude });
    if (existing) return toAccount(existing);
    throw new ConflictError("La mesa ya no pertenece a un grupo pendiente de cierre.");
  }
  assertCurrentAllocation(allocation, command);
  if (allocation.blockedUntil > now) throw new ConflictError("Abrí la cuenta desde el plano para cerrar las mesas dentro de su horario.");
  const tableIds = group.map(({ tableId }) => tableId);
  await ensureCashOpen(tx, restaurantId, businessDate);
  const id = randomUUID();
  const receipt = await tx.serviceAccount.create({ data: { ...accountDetails(allocation, actorId, now), id,
    closedAt: now, closedBy: actorId, businessDate, totalCents: 0, receiptNumber: `C-${id}`,
    tables: { create: group.map(({ tableId, label }) => ({ tableId, label, releasedAt: now })) },
  }, include: accountInclude });
  await releaseTables(tx, allocation, tableIds, now);
  await appendAuditLogs(tx, receipt.id, restaurantId, null, actorId, now, [{
    action: "ACCOUNT_CLOSED_EMPTY",
    severity: "INFO",
    summary: `Cerró mesa sin consumo (${group.map(({ label }) => label).join(", ")})`,
    details: { tables: group.map(({ label }) => label).join(", "), receiptNumber: `C-${id}` },
  }]);
  return toAccount(await findAccount(tx, restaurantId, receipt.id));
}

async function saveProduct(tx: Prisma.TransactionClient, restaurantId: string, command: Command<"save-product">) {
  if (!command.id) {
    return toProduct(await tx.serviceProduct.create({
      data: { restaurantId, name: command.name, unitPriceCents: command.unitPriceCents, station: command.station ?? "KITCHEN", active: true },
      select: productSelect,
    }));
  }
  const data = {
    name: command.name,
    unitPriceCents: command.unitPriceCents,
    active: true,
    ...(command.station !== undefined ? { station: command.station } : {}),
  };
  const updated = await tx.serviceProduct.updateMany({ where: { id: command.id, restaurantId }, data });
  if (updated.count !== 1) throw new NotFoundError("Producto");
  return toProduct(await tx.serviceProduct.findUniqueOrThrow({ where: { id: command.id }, select: productSelect }));
}

async function archiveProduct(tx: Prisma.TransactionClient, restaurantId: string, id: string) {
  const updated = await tx.serviceProduct.updateMany({ where: { id, restaurantId }, data: { active: false } });
  if (updated.count !== 1) throw new NotFoundError("Producto");
  return toProduct(await tx.serviceProduct.findUniqueOrThrow({ where: { id }, select: productSelect }));
}

async function approveCatalogProposal(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  actorId: string,
  command: Command<"approve-catalog-proposal">,
  now: Date,
) {
  const proposal = await tx.catalogProductProposal.findFirst({
    where: { id: command.proposalId, restaurantId, status: "PENDING" },
    select: { id: true, sourceKind: true, recipeId: true, inventoryItemId: true },
  });
  if (!proposal) throw new NotFoundError("Solicitud pendiente de aprobación");

  if (proposal.sourceKind === "RECIPE") {
    if (!proposal.recipeId) throw new BadRequestError("La solicitud no tiene una receta válida.");
    const recipe = await tx.recipe.findFirst({ where: { id: proposal.recipeId, restaurantId, active: true }, select: { id: true } });
    if (!recipe) throw new NotFoundError("Receta activa");
    const duplicate = await tx.serviceProduct.findFirst({
      where: { restaurantId, recipeId: proposal.recipeId, active: true },
      select: { id: true },
    });
    if (duplicate) throw new ConflictError("Esta receta ya cuenta con un producto activo en el Catálogo.");
  } else {
    if (!proposal.inventoryItemId) throw new BadRequestError("La solicitud no tiene un producto de inventario válido.");
    const item = await tx.inventoryItem.findFirst({
      where: { id: proposal.inventoryItemId, restaurantId, active: true },
      select: { id: true },
    });
    if (!item) throw new NotFoundError("Producto de inventario activo");
    const duplicate = await tx.serviceProduct.findFirst({
      where: { restaurantId, inventoryItemId: proposal.inventoryItemId, active: true },
      select: { id: true },
    });
    if (duplicate) throw new ConflictError("Este producto ya cuenta con un producto activo en el Catálogo.");
  }

  const created = await tx.serviceProduct.create({
    data: {
      restaurantId,
      name: command.name,
      unitPriceCents: command.unitPriceCents,
      station: command.station,
      recipeId: proposal.recipeId,
      inventoryItemId: proposal.inventoryItemId,
      active: true,
    },
    select: productSelect,
  });

  await tx.catalogProductProposal.update({
    where: { id: proposal.id },
    data: {
      status: "APPROVED",
      approvedProductId: created.id,
      reviewedBy: actorId,
      reviewedAt: now,
    },
  });

  return toProduct(created);
}

async function rejectCatalogProposal(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  actorId: string,
  command: Command<"reject-proposal" extends never ? never : "reject-catalog-proposal">,
  now: Date,
) {
  const updated = await tx.catalogProductProposal.updateMany({
    where: { id: command.proposalId, restaurantId, status: "PENDING" },
    data: {
      status: "REJECTED",
      rejectionReason: command.reason?.trim() || "Rechazada desde Catálogo.",
      reviewedBy: actorId,
      reviewedAt: now,
    },
  });
  if (updated.count !== 1) throw new NotFoundError("Solicitud pendiente de aprobación");
  return { updated: true };
}

async function saveStaff(tx: Prisma.TransactionClient, restaurantId: string, command: Command<"save-staff">) {
  const data = {
    name: command.name,
    role: command.role,
    phone: command.phone,
    notes: command.notes,
    active: command.active,
  };
  if (!command.id) {
    return toStaffMember(await tx.restaurantStaffMember.create({ data: { restaurantId, ...data }, select: staffSelect }));
  }
  const updated = await tx.restaurantStaffMember.updateMany({ where: { id: command.id, restaurantId }, data });
  if (updated.count !== 1) throw new NotFoundError("Integrante del personal");
  return toStaffMember(await tx.restaurantStaffMember.findUniqueOrThrow({ where: { id: command.id }, select: staffSelect }));
}

async function setStaffActive(tx: Prisma.TransactionClient, restaurantId: string, command: Command<"set-staff-active">) {
  const updated = await tx.restaurantStaffMember.updateMany({
    where: { id: command.id, restaurantId },
    data: { active: command.active },
  });
  if (updated.count !== 1) throw new NotFoundError("Integrante del personal");
  return toStaffMember(await tx.restaurantStaffMember.findUniqueOrThrow({ where: { id: command.id }, select: staffSelect }));
}

async function recordCashEvent(tx: Prisma.TransactionClient, restaurantId: string, actorId: string,
  command: Command<"close-day"> | Command<"reopen-day">, today: string, now: Date) {
  if (command.date > today) throw new BadRequestError("No podés operar la caja de un día futuro.");
  const previous = await lastCashEvent(tx, restaurantId, command.date);
  const kind = command.action === "close-day" ? "CLOSE" : "REOPEN";
  if (kind === "REOPEN" && command.date !== today) throw new BadRequestError("Solo podés reabrir la caja de hoy.");
  if (kind === "CLOSE" && command.date === today && await tx.serviceAccount.count({ where: { restaurantId, closedAt: null } })) {
    throw new ConflictError("Cerrá las cuentas abiertas antes de cerrar la caja de hoy.");
  }
  if (kind === "CLOSE") {
    const openWithPartial = await tx.serviceAccount.findFirst({
      where: { restaurantId, closedAt: null, payments: { some: { businessDate: command.date } } },
      select: { tables: { select: { label: true } } },
    });
    if (openWithPartial) {
      const labels = openWithPartial.tables.map((table) => table.label).join(", ");
      throw new ConflictError(`Hay pagos parciales sin cerrar en ${labels || "una mesa abierta"} para esta fecha. Cerrá esa cuenta antes de cerrar la caja.`);
    }
  }
  if (previous?.kind === kind) return toCashEvent(previous);
  if (kind === "REOPEN" && !previous) throw new ConflictError("La caja de ese día todavía no se cerró.");
  const receipts = await tx.serviceAccount.findMany({ where: { restaurantId, businessDate: command.date, closedAt: { not: null } },
    include: accountInclude });
  const { cashCents, cardCents, transferCents, receiptCount } = summarizeCash(receipts.map(toAccount));
  if ([cashCents, cardCents, transferCents].some((amount) => amount > maxStoredCents)) {
    throw new BadRequestError("El total de un medio de pago supera el máximo admitido para el cierre.");
  }
  return toCashEvent(await tx.serviceCashEvent.create({ data: { restaurantId, businessDate: command.date,
    revision: (previous?.revision ?? 0) + 1, kind, actorId, createdAt: now,
    reason: command.action === "reopen-day" ? command.reason : null, cashCents, cardCents, transferCents, receiptCount } }));
}

export class TableService {
  constructor(
    private readonly database: PrismaClient,
    private readonly stockPort?: ServiceStockPort,
  ) {}

  async snapshot(restaurantId: string, now = new Date(), at?: Date): Promise<ServiceSnapshot> {
    return withSqliteTransaction(this.database, async (tx) => {
      const { timeZone } = await settings(tx, restaurantId, true);
      const today = restaurantToday(timeZone, now);
      const [accounts, products, waiters, cash, unserved] = await Promise.all([
        tx.serviceAccount.findMany({ where: { restaurantId, ...(at
          ? { closedAt: { lte: at }, businessDate: restaurantToday(timeZone, at) }
          : { closedAt: null }) }, include: accountInclude, orderBy: [{ openedAt: "asc" }, { id: "asc" }] }),
        tx.serviceProduct.findMany({ where: { restaurantId, active: true }, select: productSelect, orderBy: { name: "asc" } }),
        at
          ? Promise.resolve([])
          : tx.restaurantStaffMember.findMany({
              where: { restaurantId, active: true, role: "WAITER" },
              select: staffSelect,
              orderBy: [{ name: "asc" }, { id: "asc" }],
            }),
        lastCashEvent(tx, restaurantId, today),
        at ? [] : unservedGroups(tx, restaurantId, now),
      ]);
      return {
        accounts: accounts.map(toAccount),
        products: products.map(toProduct),
        waiters: waiters.map(toStaffMember),
        cashClosed: cash?.kind === "CLOSE",
        unserved,
      };
    });
  }

  async kitchen(restaurantId: string): Promise<KitchenSnapshot> {
    return withSqliteTransaction(this.database, async (tx) => {
      const restaurant = await settings(tx, restaurantId, true);
      const accounts = await tx.serviceAccount.findMany({
        where: { restaurantId, closedAt: null },
        include: accountInclude,
        orderBy: [{ openedAt: "asc" }, { id: "asc" }],
      });
      const tickets: KitchenTicketView[] = [];
      for (const account of accounts) {
        const uncancelledLines = account.lines.filter((line) => line.quantity > line.cancelledQuantity);
        if (!uncancelledLines.length) continue;
        const rounds = [...new Set(uncancelledLines.map((line) => line.round ?? 1))].sort((a, b) => a - b);
        for (const round of rounds) {
          const roundLines = uncancelledLines.filter((line) => (line.round ?? 1) === round);
          const hasUnserved = roundLines.some((line) => line.kitchenStatus !== "SERVED");
          if (!hasUnserved) continue;

          const kitchenLines = roundLines.filter((line) => (line.station ?? "KITCHEN") === "KITCHEN");
          const barLines = roundLines.filter((line) => line.station === "BAR");

          const hasKitchenItems = kitchenLines.some((line) => line.kitchenStatus !== "SERVED");
          const hasBarItems = barLines.some((line) => line.kitchenStatus !== "SERVED");

          const allReady = roundLines.every((line) => line.kitchenStatus === "READY" || line.kitchenStatus === "SERVED");
          const kitchenReady = kitchenLines.length > 0 && kitchenLines.every((line) => line.kitchenStatus === "READY" || line.kitchenStatus === "SERVED");
          const barReady = barLines.length > 0 && barLines.every((line) => line.kitchenStatus === "READY" || line.kitchenStatus === "SERVED");

          tickets.push({
            id: `${account.id}-${round}`,
            accountId: account.id,
            round,
            roomName: account.roomName,
            tableLabels: account.tables.map((t) => t.label),
            customerName: account.customerName,
            reservationCode: account.reservationCode,
            waiterName: account.assignedWaiterName ?? null,
            openedAt: account.openedAt.toISOString(),
            createdAt: roundLines[0].createdAt.toISOString(),
            allReady,
            kitchenReady,
            barReady,
            hasKitchenItems,
            hasBarItems,
            lines: roundLines.map((line) => ({
              id: line.id,
              name: line.name,
              quantity: line.quantity,
              deliveredQuantity: line.deliveredQuantity,
              cancelledQuantity: line.cancelledQuantity,
              notes: line.notes ?? "",
              kitchenStatus: (line.kitchenStatus ?? "PENDING") as KitchenStatus,
              station: (line.station ?? "KITCHEN") as KitchenStation,
              createdAt: line.createdAt.toISOString(),
            })),
          });
        }
      }
      return {
        restaurantName: restaurant.name ?? "",
        timeZone: restaurant.timeZone,
        tickets,
      };
    });
  }

  async account(restaurantId: string, accountId: string): Promise<ServiceAccountView> {
    await settings(this.database, restaurantId);
    return toAccount(await findAccount(this.database, restaurantId, accountId));
  }

  async products(restaurantId: string): Promise<ServiceProductView[]> {
    await settings(this.database, restaurantId);
    const rows = await this.database.serviceProduct.findMany({ where: { restaurantId }, select: productSelect, orderBy: { name: "asc" } });
    return rows.map(toProduct);
  }

  async staff(restaurantId: string): Promise<StaffMemberView[]> {
    await settings(this.database, restaurantId);
    const rows = await this.database.restaurantStaffMember.findMany({
      where: { restaurantId },
      select: staffSelect,
      orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }, { id: "asc" }],
    });
    return rows.map(toStaffMember);
  }

  async report(restaurantId: string, from?: string, to?: string, now = new Date()): Promise<ServiceCashReport> {
    return withSqliteTransaction(this.database, async (tx) => {
      const { timeZone } = await settings(tx, restaurantId);
      const today = restaurantToday(timeZone, now);
      const range = serviceCashRangeSchema.parse({ from: from ?? to ?? today, to: to ?? from ?? today });
      const businessDate = { gte: range.from, lte: range.to };
      const [rows, events] = await Promise.all([
        tx.serviceAccount.findMany({ where: { restaurantId, businessDate, closedAt: { not: null } },
          include: accountInclude, orderBy: [{ closedAt: "desc" }, { id: "asc" }] }),
        tx.serviceCashEvent.findMany({ where: { restaurantId, businessDate }, orderBy: [{ businessDate: "desc" }, { revision: "desc" }] }),
      ]);
      const receipts = rows.map(toAccount);
      return { today, ...range, receipts, totals: summarizeCash(receipts), days: events.map(toCashEvent) };
    });
  }

  async execute(restaurantId: string, actorId: string, raw: ServiceCommand, now = new Date()): Promise<ServiceCommandResult> {
    const command = serviceCommandSchema.parse(raw);
    return withSqliteTransaction(this.database, async (tx) => {
      const requiresFloor = command.action === "open" || command.action === "open-table" || command.action === "assign-waiter" || command.action === "close-empty"
        || command.action === "add-line" || command.action === "confirm-order" || command.action === "update-line" || command.action === "pay-partial" || command.action === "checkout"
        || command.action === "deliver-all" || command.action === "march-round" || command.action === "update-kitchen-status";
      const { timeZone } = await settings(tx, restaurantId, requiresFloor);
      switch (command.action) {
        case "open": return openAccount(tx, restaurantId, actorId, command, now);
        case "open-table": return openTable(tx, restaurantId, actorId, command, timeZone, now);
        case "assign-waiter": return assignWaiter(tx, restaurantId, actorId, command, now);
        case "close-empty": return closeEmpty(tx, restaurantId, actorId, command, restaurantToday(timeZone, now), now);
        case "add-line": return addLine(tx, restaurantId, actorId, command, now, this.stockPort);
        case "confirm-order": return confirmOrder(tx, restaurantId, actorId, command, now, this.stockPort);
        case "update-line": return updateLine(tx, restaurantId, actorId, command, now, this.stockPort);
        case "deliver-all": return deliverAll(tx, restaurantId, actorId, command, now);
        case "march-round": return marchRound(tx, restaurantId, actorId, command, now);
        case "update-kitchen-status": return updateKitchenStatus(tx, restaurantId, actorId, command, now);
        case "pay-partial": return payPartial(tx, restaurantId, actorId, command, restaurantToday(timeZone, now), now);
        case "checkout": return checkout(tx, restaurantId, actorId, command, restaurantToday(timeZone, now), now);
        case "save-product": return saveProduct(tx, restaurantId, command);
        case "archive-product": return archiveProduct(tx, restaurantId, command.id);
        case "approve-catalog-proposal": return approveCatalogProposal(tx, restaurantId, actorId, command, now);
        case "reject-catalog-proposal": return rejectCatalogProposal(tx, restaurantId, actorId, command, now);
        case "save-staff": return saveStaff(tx, restaurantId, command);
        case "set-staff-active": return setStaffActive(tx, restaurantId, command);
        case "close-day":
        case "reopen-day": return recordCashEvent(tx, restaurantId, actorId, command, restaurantToday(timeZone, now), now);
      }
    });
  }
}
