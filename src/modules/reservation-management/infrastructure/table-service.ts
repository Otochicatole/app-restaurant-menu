import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getJoinedTableGroups, restaurantToday, validateTableArrangement, type FloorRotation } from "@/modules/floor-management/contracts";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/platform/application/errors";
import { withSqliteTransaction } from "@/platform/database/sqlite-transaction";
import {
  serviceCashRangeSchema, serviceCommandSchema, servicePaymentMethodSchema,
  type ServiceAccountView, type ServiceCashEventView, type ServiceCashReport, type ServiceCashTotals,
  type ServiceCommand, type ServiceCommandResult, type ServiceProductView, type ServiceSnapshot, type ServiceUnservedGroup,
} from "../service-contracts";
import { syncReservationAllocation } from "./floor-allocations";

type Database = PrismaClient | Prisma.TransactionClient;
type Command<Action extends ServiceCommand["action"]> = Extract<ServiceCommand, { action: Action }>;
const accountInclude = {
  lines: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  tables: { orderBy: [{ label: "asc" }, { tableId: "asc" }] },
} satisfies Prisma.ServiceAccountInclude;
type AccountRow = Prisma.ServiceAccountGetPayload<{ include: typeof accountInclude }>;
const allocationInclude = {
  tables: { where: { releasedAt: null }, orderBy: { labelSnapshot: "asc" } },
  reservation: true,
  room: { select: { name: true } },
} satisfies Prisma.ReservationAllocationInclude;
type AllocationRow = Prisma.ReservationAllocationGetPayload<{ include: typeof allocationInclude }>;
const productSelect = { id: true, name: true, unitPriceCents: true, active: true } satisfies Prisma.ServiceProductSelect;
const maxStoredCents = 2_147_483_647;

function toAccount(row: AccountRow): ServiceAccountView {
  const { id, allocationId, reservationId, roomId, roomName, reservationCode, customerName,
    version, openedAt, closedAt, businessDate, paymentMethod, totalCents, receiptNumber } = row;
  const lines = row.lines.map(({ id, name, unitPriceCents, quantity, deliveredQuantity, cancelledQuantity }) =>
    ({ id, name, unitPriceCents, quantity, deliveredQuantity, cancelledQuantity }));
  const totals = lines.reduce((summary, line) => {
    summary.orderedCents += line.unitPriceCents * (line.quantity - line.cancelledQuantity);
    summary.deliveredCents += line.unitPriceCents * line.deliveredQuantity;
    summary.pendingQuantity += line.quantity - line.deliveredQuantity - line.cancelledQuantity;
    return summary;
  }, { orderedCents: 0, deliveredCents: 0, pendingQuantity: 0 });
  return { id, allocationId, reservationId, roomId, roomName, reservationCode, customerName, version,
    openedAt: openedAt.toISOString(), closedAt: closedAt?.toISOString() ?? null, businessDate,
    paymentMethod: paymentMethod === null ? null : servicePaymentMethodSchema.parse(paymentMethod), totalCents, receiptNumber,
    tableIds: row.tables.map(({ tableId }) => tableId), tableLabels: row.tables.map(({ label }) => label), lines, ...totals };
}

function toCashEvent(row: Prisma.ServiceCashEventGetPayload<object>): ServiceCashEventView {
  const { kind, createdAt, ...data } = row;
  if (kind !== "CLOSE" && kind !== "REOPEN") throw new Error("Movimiento de caja inválido.");
  return { ...data, kind, createdAt: createdAt.toISOString() };
}

function summarizeCash(receipts: readonly Pick<ServiceAccountView, "paymentMethod" | "totalCents">[]): ServiceCashTotals {
  const totals = { cashCents: 0, cardCents: 0, transferCents: 0, receiptCount: receipts.length, totalCents: 0 };
  for (const { paymentMethod, totalCents } of receipts) {
    const cents = totalCents ?? 0;
    if (paymentMethod === "CASH") totals.cashCents += cents;
    if (paymentMethod === "CARD") totals.cardCents += cents;
    if (paymentMethod === "TRANSFER_QR") totals.transferCents += cents;
    totals.totalCents += cents;
  }
  return totals;
}

async function settings(database: Database, restaurantId: string, requireFloor = false) {
  const restaurant = await database.restaurant.findUnique({ where: { id: restaurantId }, select: {
    timeZone: true, floorManagementEnabled: true, status: true, organization: { select: { status: true } },
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

async function updateAccount(tx: Prisma.TransactionClient, account: AccountRow, expectedVersion: number, data: Prisma.ServiceAccountUpdateManyMutationInput = {}) {
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

async function openAccount(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, command: Command<"open">, now: Date) {
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
    tables: { create: group.map(({ tableId, label }) => ({ tableId, label })) },
  }, include: accountInclude });
  return toAccount(account);
}

async function addLine(tx: Prisma.TransactionClient, restaurantId: string, command: Command<"add-line">, now: Date) {
  const account = await findAccount(tx, restaurantId, command.accountId);
  await updateAccount(tx, account, command.expectedVersion);
  const product = command.productId ? await tx.serviceProduct.findFirst({
    where: { id: command.productId, restaurantId, active: true }, select: productSelect,
  }) : null;
  if (command.productId && !product) throw new NotFoundError("Producto activo");
  const name = product?.name ?? command.name;
  const unitPriceCents = product?.unitPriceCents ?? command.unitPriceCents;
  if (name === undefined || unitPriceCents === undefined) throw new BadRequestError("Indicá el nombre y precio del consumo.");
  if (toAccount(account).orderedCents + unitPriceCents * command.quantity > maxStoredCents) {
    throw new BadRequestError("El total de la cuenta supera el máximo admitido.");
  }
  await tx.serviceOrderLine.create({ data: { accountId: account.id, restaurantId, productId: product?.id,
    name, unitPriceCents, quantity: command.quantity, createdAt: now } });
  return toAccount(await findAccount(tx, restaurantId, account.id));
}

async function updateLine(tx: Prisma.TransactionClient, restaurantId: string, command: Command<"update-line">) {
  const account = await findAccount(tx, restaurantId, command.accountId);
  await updateAccount(tx, account, command.expectedVersion);
  const line = account.lines.find(({ id }) => id === command.lineId);
  if (!line) throw new NotFoundError("Consumo");
  const { deliveredQuantity, cancelledQuantity } = command;
  if (deliveredQuantity + cancelledQuantity > line.quantity) {
    throw new BadRequestError("Las cantidades entregadas y canceladas superan la cantidad pedida.");
  }
  const restoredCents = (line.cancelledQuantity - cancelledQuantity) * line.unitPriceCents;
  if (toAccount(account).orderedCents + restoredCents > maxStoredCents) {
    throw new BadRequestError("El total de la cuenta supera el máximo admitido.");
  }
  await tx.serviceOrderLine.update({ where: { id: line.id }, data: { deliveredQuantity, cancelledQuantity } });
  return toAccount(await findAccount(tx, restaurantId, account.id));
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

async function checkout(tx: Prisma.TransactionClient, restaurantId: string, actorId: string,
  command: Command<"checkout">, businessDate: string, now: Date) {
  const account = await findAccount(tx, restaurantId, command.accountId);
  const view = toAccount(account);
  if (account.closedAt) {
    const paymentMethod = account.totalCents === 0 ? null : command.paymentMethod;
    if (account.version === command.expectedVersion + 1 && account.paymentMethod === paymentMethod) return view;
    throw new ConflictError("La cuenta ya fue cerrada. Consultá su recibo antes de registrar otro pago.");
  }
  await ensureCashOpen(tx, restaurantId, businessDate);
  if (view.pendingQuantity) throw new ConflictError("Marcá los consumos pendientes como entregados o cancelados antes de cerrar.");
  if (view.deliveredCents > 0 && !command.paymentMethod) throw new BadRequestError("Elegí un medio de pago.");
  const allocation = await tx.reservationAllocation.findFirst({ where: {
    id: account.allocationId, restaurantId, reservationId: account.reservationId,
  }, include: { reservation: true } });
  if (!allocation || allocation.releasedAt || allocation.reservation.status !== "CONFIRMED") {
    throw new ConflictError("La asignación cambió. Actualizá el plano antes de cerrar la cuenta.");
  }
  const tableIds = account.tables.map(({ tableId }) => tableId);
  await updateAccount(tx, account, command.expectedVersion, { closedAt: now, closedBy: actorId, businessDate,
    totalCents: view.deliveredCents, paymentMethod: view.deliveredCents === 0 ? null : command.paymentMethod,
    receiptNumber: `C-${account.id}` });
  await tx.serviceAccountTable.updateMany({ where: { accountId: account.id, restaurantId, releasedAt: null }, data: { releasedAt: now } });
  await releaseTables(tx, allocation, tableIds, now);
  return toAccount(await findAccount(tx, restaurantId, account.id));
}

async function unservedGroups(database: Database, restaurantId: string, now: Date): Promise<ServiceUnservedGroup[]> {
  const allocations = await database.reservationAllocation.findMany({
    where: { restaurantId, releasedAt: null, blockedUntil: { lte: now }, reservation: { status: "CONFIRMED" }, serviceAccounts: { some: {} } },
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
  if (!priorAccounts.length) throw new ConflictError("La asignación no tiene historial de servicio.");
  const tableIds = group.map(({ tableId }) => tableId);
  await ensureCashOpen(tx, restaurantId, businessDate);
  const id = randomUUID();
  const receipt = await tx.serviceAccount.create({ data: { ...accountDetails(allocation, actorId, now), id,
    closedAt: now, closedBy: actorId, businessDate, totalCents: 0, receiptNumber: `C-${id}`,
    tables: { create: group.map(({ tableId, label }) => ({ tableId, label, releasedAt: now })) },
  }, include: accountInclude });
  await releaseTables(tx, allocation, tableIds, now);
  return toAccount(receipt);
}

async function saveProduct(tx: Prisma.TransactionClient, restaurantId: string, command: Command<"save-product">) {
  const data = { name: command.name, unitPriceCents: command.unitPriceCents, active: true };
  if (!command.id) return tx.serviceProduct.create({ data: { restaurantId, ...data }, select: productSelect });
  const updated = await tx.serviceProduct.updateMany({ where: { id: command.id, restaurantId }, data });
  if (updated.count !== 1) throw new NotFoundError("Producto");
  return tx.serviceProduct.findUniqueOrThrow({ where: { id: command.id }, select: productSelect });
}

async function archiveProduct(tx: Prisma.TransactionClient, restaurantId: string, id: string) {
  const updated = await tx.serviceProduct.updateMany({ where: { id, restaurantId }, data: { active: false } });
  if (updated.count !== 1) throw new NotFoundError("Producto");
  return tx.serviceProduct.findUniqueOrThrow({ where: { id }, select: productSelect });
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
  if (previous?.kind === kind) return toCashEvent(previous);
  if (kind === "REOPEN" && !previous) throw new ConflictError("La caja de ese día todavía no se cerró.");
  const receipts = await tx.serviceAccount.findMany({ where: { restaurantId, businessDate: command.date, closedAt: { not: null } },
    select: { paymentMethod: true, totalCents: true } });
  const { cashCents, cardCents, transferCents, receiptCount } = summarizeCash(receipts.map((receipt) => ({ ...receipt,
    paymentMethod: receipt.paymentMethod === null ? null : servicePaymentMethodSchema.parse(receipt.paymentMethod),
  })));
  if ([cashCents, cardCents, transferCents].some((amount) => amount > maxStoredCents)) {
    throw new BadRequestError("El total de un medio de pago supera el máximo admitido para el cierre.");
  }
  return toCashEvent(await tx.serviceCashEvent.create({ data: { restaurantId, businessDate: command.date,
    revision: (previous?.revision ?? 0) + 1, kind, actorId, createdAt: now,
    reason: command.action === "reopen-day" ? command.reason : null, cashCents, cardCents, transferCents, receiptCount } }));
}

export class TableService {
  constructor(private readonly database: PrismaClient) {}

  async snapshot(restaurantId: string, now = new Date(), at?: Date): Promise<ServiceSnapshot> {
    return withSqliteTransaction(this.database, async (tx) => {
      const { timeZone } = await settings(tx, restaurantId, true);
      const today = restaurantToday(timeZone, now);
      const [accounts, products, cash, unserved] = await Promise.all([
        tx.serviceAccount.findMany({ where: { restaurantId, ...(at
          ? { closedAt: { lte: at }, businessDate: restaurantToday(timeZone, at) }
          : { closedAt: null }) }, include: accountInclude, orderBy: [{ openedAt: "asc" }, { id: "asc" }] }),
        tx.serviceProduct.findMany({ where: { restaurantId, active: true }, select: productSelect, orderBy: { name: "asc" } }),
        lastCashEvent(tx, restaurantId, today),
        at ? [] : unservedGroups(tx, restaurantId, now),
      ]);
      return { accounts: accounts.map(toAccount), products, cashClosed: cash?.kind === "CLOSE", unserved };
    });
  }

  async account(restaurantId: string, accountId: string): Promise<ServiceAccountView> {
    await settings(this.database, restaurantId);
    return toAccount(await findAccount(this.database, restaurantId, accountId));
  }

  async products(restaurantId: string): Promise<ServiceProductView[]> {
    await settings(this.database, restaurantId);
    return this.database.serviceProduct.findMany({ where: { restaurantId }, select: productSelect, orderBy: { name: "asc" } });
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
      const requiresFloor = command.action === "open" || command.action === "close-empty" || command.action === "add-line"
        || command.action === "update-line" || command.action === "checkout";
      const { timeZone } = await settings(tx, restaurantId, requiresFloor);
      switch (command.action) {
        case "open": return openAccount(tx, restaurantId, actorId, command, now);
        case "close-empty": return closeEmpty(tx, restaurantId, actorId, command, restaurantToday(timeZone, now), now);
        case "add-line": return addLine(tx, restaurantId, command, now);
        case "update-line": return updateLine(tx, restaurantId, command);
        case "checkout": return checkout(tx, restaurantId, actorId, command, restaurantToday(timeZone, now), now);
        case "save-product": return saveProduct(tx, restaurantId, command);
        case "archive-product": return archiveProduct(tx, restaurantId, command.id);
        case "close-day":
        case "reopen-day": return recordCashEvent(tx, restaurantId, actorId, command, restaurantToday(timeZone, now), now);
      }
    });
  }
}
