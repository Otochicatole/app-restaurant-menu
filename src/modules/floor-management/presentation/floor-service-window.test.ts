/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ServiceAccountView, ServiceProductView, StaffMemberView } from "@/modules/reservation-management/contracts";
import { FloorServiceAccounts, FloorServiceWindow, type FloorServiceTarget } from "./FloorServiceWindow";

const target: FloorServiceTarget = {
  allocationId: "alloc-1",
  customerName: "Sin reserva",
  reservationCode: "W1",
  tableLabels: ["M1"],
  tableId: "table-1",
};

const waiters: StaffMemberView[] = [
  { id: "w-1", name: "Ana", role: "WAITER", phone: "", notes: "Salón principal", active: true, createdAt: "2026-11-14T00:00:00.000Z" },
  { id: "w-2", name: "Bruno", role: "WAITER", phone: "", notes: "Terraza", active: true, createdAt: "2026-11-14T00:00:00.000Z" },
];

const openAccount: ServiceAccountView = {
  id: "acc-1",
  allocationId: "alloc-1",
  reservationId: "res-1",
  roomId: "room-1",
  roomName: "Salón",
  reservationCode: "W1",
  customerName: "Sin reserva",
  assignedWaiterId: "w-1",
  assignedWaiterName: "Ana",
  version: 2,
  openedAt: "2026-11-14T00:00:00.000Z",
  closedAt: null,
  businessDate: null,
  paymentMethod: null,
  totalCents: null,
  receiptNumber: null,
  tipCents: 0,
  discountCents: 0,
  discountReason: null,
  cashCents: 0,
  cardCents: 0,
  transferCents: 0,
  tableIds: ["table-1"],
  tableLabels: ["M1"],
  lines: [],
  orderedCents: 0,
  deliveredCents: 0,
  pendingQuantity: 0,
  readyQuantity: 0,
};

describe("FloorServiceWindow waiter assignment", () => {
  afterEach(cleanup);

  it("requires selecting an active waiter instead of a plain Abrir cuenta button", async () => {
    const onCommand = vi.fn(async () => openAccount);
    render(createElement(FloorServiceWindow, {
      target,
      products: [],
      waiters,
      staffHref: "/admin/restaurants/rest-1/staff",
      restaurantName: "Pepe Café",
      timeZone: "America/Argentina/Buenos_Aires",
      loading: false,
      loadError: null,
      busy: false,
      historical: false,
      canOpen: true,
      allocationVersion: 0,
      conflict: false,
      cashClosed: false,
      onCommand,
      onRefresh: vi.fn(),
    }));

    expect(screen.queryByRole("button", { name: "Abrir cuenta" })).toBeNull();
    const confirmButton = screen.getByRole("button", { name: "Asignar camarero y abrir cuenta" }) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: /Ana/i }));
    expect(confirmButton.disabled).toBe(false);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onCommand).toHaveBeenCalledWith({
        action: "open",
        allocationId: "alloc-1",
        tableId: "table-1",
        expectedAllocationVersion: 0,
        waiterId: "w-1",
      });
    });
  });

  it("shows a direct prompt and link to Personal when no active waiters exist", () => {
    render(createElement(FloorServiceWindow, {
      target,
      products: [],
      waiters: [],
      staffHref: "/admin/restaurants/rest-1/staff",
      restaurantName: "Pepe Café",
      timeZone: "America/Argentina/Buenos_Aires",
      loading: false,
      loadError: null,
      busy: false,
      historical: false,
      canOpen: true,
      allocationVersion: 0,
      conflict: false,
      cashClosed: false,
      onCommand: vi.fn(),
      onRefresh: vi.fn(),
    }));

    expect(screen.getByText(/Todavía no hay camareros activos cargados/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ir a Personal/i }).getAttribute("href")).toBe("/admin/restaurants/rest-1/staff");
    expect(screen.queryByRole("button", { name: "Asignar camarero y abrir cuenta" })).toBeNull();
  });

  it("shows and allows reassigning the waiter on an open account and in the accounts list", async () => {
    const onCommand = vi.fn(async () => ({ ...openAccount, assignedWaiterId: "w-2", assignedWaiterName: "Bruno" }));
    render(createElement(FloorServiceAccounts, {
      accounts: [openAccount],
      unserved: [],
      error: null,
      loading: false,
      historical: false,
      onChoose: vi.fn(),
      onRecover: vi.fn(),
      onRefresh: vi.fn(),
    }));
    expect(screen.getByText(/Camarero: Ana/)).toBeTruthy();

    cleanup();
    render(createElement(FloorServiceWindow, {
      target,
      account: openAccount,
      products: [],
      waiters,
      restaurantName: "Pepe Café",
      timeZone: "America/Argentina/Buenos_Aires",
      loading: false,
      loadError: null,
      busy: false,
      historical: false,
      canOpen: true,
      allocationVersion: 0,
      conflict: false,
      cashClosed: false,
      onCommand,
      onRefresh: vi.fn(),
    }));

    expect(screen.getByText("Ana")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar camarero" }));
    fireEvent.change(screen.getByLabelText("Nuevo camarero"), { target: { value: "w-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(onCommand).toHaveBeenCalledWith({
        action: "assign-waiter",
        accountId: "acc-1",
        expectedVersion: 2,
        waiterId: "w-2",
      });
    });
  });
});

describe("FloorServiceWindow draft order list and kitchen confirmation", () => {
  afterEach(cleanup);

  const products: ServiceProductView[] = [
    { id: "prod-1", name: "Milanesa", unitPriceCents: 1200000, active: true },
    { id: "prod-2", name: "Agua sin gas", unitPriceCents: 250000, active: true },
  ];

  it("builds a draft list in a table first and sends confirm-order only when confirmed", async () => {
    const confirmedAccount: ServiceAccountView = {
      ...openAccount,
      version: 3,
      orderedCents: 2650000,
      pendingQuantity: 3,
      lines: [
        {
          id: "line-1",
          name: "Milanesa",
          unitPriceCents: 1200000,
          quantity: 2,
          deliveredQuantity: 0,
          cancelledQuantity: 0,
          notes: "Con papas",
          kitchenStatus: "PENDING",
          round: 1,
          station: "KITCHEN",
          createdAt: "2026-11-14T00:05:00.000Z",
        },
      ],
    };
    const onCommand = vi.fn(async () => confirmedAccount);

    const view = render(createElement(FloorServiceWindow, {
      target,
      account: openAccount,
      products,
      waiters,
      restaurantName: "Pepe Café",
      timeZone: "America/Argentina/Buenos_Aires",
      loading: false,
      loadError: null,
      busy: false,
      historical: false,
      canOpen: true,
      allocationVersion: 0,
      conflict: false,
      cashClosed: false,
      onCommand,
      onRefresh: vi.fn(),
    }));

    // Select first catalog product and add 1 unit with note
    const picker = screen.getByLabelText("Producto");
    fireEvent.focus(picker);
    fireEvent.click(screen.getByRole("option", { name: /Milanesa/i }));
    fireEvent.change(screen.getByLabelText("Notas de elaboración"), { target: { value: "Con papas" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar a la lista" }));

    // Select second catalog product to BAR
    fireEvent.focus(picker);
    fireEvent.click(screen.getByRole("option", { name: /Agua sin gas/i }));
    fireEvent.change(screen.getByLabelText("Estación"), { target: { value: "BAR" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar a la lista" }));

    // Nothing sent to server / kitchen yet!
    expect(onCommand).not.toHaveBeenCalled();

    const draftTable = screen.getByRole("table", { name: "Listado del pedido borrador pendiente de confirmar" });
    expect(within(draftTable).getByRole("rowheader", { name: /Milanesa/i })).toBeTruthy();
    expect(within(draftTable).getByRole("rowheader", { name: /Agua sin gas/i })).toBeTruthy();
    expect(within(draftTable).getByText("Barra")).toBeTruthy();

    // Adjust Milanesa quantity +1 and remove Agua sin gas? Let's keep both after incrementing Milanesa to 2!
    fireEvent.click(screen.getByRole("button", { name: "Sumar uno de Milanesa" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido y enviar a cocina" }));

    await waitFor(() => {
      expect(onCommand).toHaveBeenCalledWith({
        action: "confirm-order",
        accountId: "acc-1",
        expectedVersion: 2,
        items: [
          { productId: "prod-1", quantity: 2, notes: "Con papas", station: "KITCHEN" },
          { productId: "prod-2", quantity: 1, station: "BAR" },
        ],
      });
    });

    // Draft list clears once confirmed and confirmed orders render in table format.
    await waitFor(() => {
      expect(screen.queryByRole("table", { name: "Listado del pedido borrador pendiente de confirmar" })).toBeNull();
    });

    view.rerender(createElement(FloorServiceWindow, {
      target,
      account: confirmedAccount,
      products,
      waiters,
      restaurantName: "Pepe Café",
      timeZone: "America/Argentina/Buenos_Aires",
      loading: false,
      loadError: null,
      busy: false,
      historical: false,
      canOpen: true,
      allocationVersion: 0,
      conflict: false,
      cashClosed: false,
      onCommand,
      onRefresh: vi.fn(),
    }));

    const confirmedTable = screen.getByRole("table", { name: "Pedidos confirmados enviados a cocina y entregados" });
    expect(within(confirmedTable).getByRole("rowheader", { name: /Milanesa/i })).toBeTruthy();
    expect(within(confirmedTable).getByText("Tanda 1")).toBeTruthy();
    expect(within(confirmedTable).getByText("2 pend. · 0 ent.")).toBeTruthy();
    expect(within(confirmedTable).getByRole("button", { name: "Entregar uno de Milanesa" })).toBeTruthy();
  });
});
