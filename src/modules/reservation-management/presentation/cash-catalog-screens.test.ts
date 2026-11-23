/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ServiceAccountView } from "../contracts";
import { CashCmsScreen } from "./CashCmsScreen";
import { ServiceCatalogScreen } from "./ServiceCatalogScreen";

const emptyCashReport = {
  today: "2026-11-14",
  from: "2026-11-14",
  to: "2026-11-14",
  receipts: [],
  totals: { totalCents: 0, cashCents: 0, cardCents: 0, transferCents: 0, tipCents: 0, discountCents: 0, receiptCount: 0 },
  days: [],
};

describe("CashCmsScreen and ServiceCatalogScreen separation", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows only cash receipts and closing in CashCmsScreen without Catálogo or Cocina (KDS) links", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: emptyCashReport }))));
    render(createElement(CashCmsScreen, {
      restaurantId: "rest-1",
      restaurantName: "Pepe Café",
      timeZone: "America/Argentina/Buenos_Aires",
      initialToday: "2026-11-14",
    }));

    expect(screen.getByRole("heading", { name: "Caja" })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Recibos de consumo" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Cerrar día" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Caja y catálogo" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Catálogo" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Cocina (KDS)" })).toBeNull();
  });

  it("shows catalog management on its own screen without Recibos y cierre or Cocina (KDS) links", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: [] }))));
    render(createElement(ServiceCatalogScreen, { restaurantId: "rest-1" }));

    expect(screen.getByRole("heading", { name: "Catálogo de productos" })).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Todavía no hay productos")).toBeTruthy());
    expect(screen.queryByRole("navigation", { name: "Caja y catálogo" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Recibos y cierre" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Cocina (KDS)" })).toBeNull();
  });

  it("highlights flagged receipts in yellow, filters alerts, and opens the account audit modal", async () => {
    const cleanReceipt: ServiceAccountView = {
      id: "acc-clean",
      allocationId: "alloc-1",
      reservationId: "res-1",
      roomId: "room-1",
      roomName: "Salón Principal",
      reservationCode: "R-10",
      customerName: "Lucía",
      partySize: 4,
      assignedWaiterId: "w-1",
      assignedWaiterName: "Bruno",
      version: 3,
      openedAt: "2026-11-14T15:00:00.000Z",
      closedAt: "2026-11-14T16:00:00.000Z",
      businessDate: "2026-11-14",
      paymentMethod: "CASH",
      totalCents: 500000,
      receiptNumber: "C-acc-clean",
      tipCents: 0,
      discountCents: 0,
      discountReason: null,
      cashCents: 500000,
      cardCents: 0,
      transferCents: 0,
      tableIds: ["t-1"],
      tableLabels: ["M1"],
      lines: [],
      orderedCents: 500000,
      deliveredCents: 500000,
      pendingQuantity: 0,
      readyQuantity: 0,
      paidSubtotalCents: 500000,
      remainingCents: 0,
      payments: [],
      auditLogs: [
        {
          id: "log-1",
          sequence: 1,
          action: "ACCOUNT_OPENED",
          severity: "INFO",
          summary: "Abrió cuenta en M1 · Camarero: Bruno",
          details: null,
          amountDeltaCents: null,
          waiterName: "Bruno",
          actorId: "u-1",
          actorLabel: "Sala (salon@pepe.test)",
          createdAt: "2026-11-14T15:00:00.000Z",
        },
      ],
      hasAuditAlerts: false,
      auditAlertCount: 0,
      cancellationCount: 0,
    };

    const flaggedReceipt: ServiceAccountView = {
      ...cleanReceipt,
      id: "acc-flagged",
      reservationCode: "R-11",
      customerName: "Martín",
      assignedWaiterName: "Ana",
      totalCents: 250000,
      cashCents: 250000,
      receiptNumber: "C-acc-flagged",
      tableLabels: ["M4"],
      cancellationCount: 1,
      auditAlertCount: 2,
      hasAuditAlerts: true,
      auditLogs: [
        {
          id: "log-f1",
          sequence: 1,
          action: "ACCOUNT_OPENED",
          severity: "INFO",
          summary: "Abrió cuenta en M4 · Camarero: Ana",
          details: null,
          amountDeltaCents: null,
          waiterName: "Ana",
          actorId: "u-1",
          actorLabel: "Sala (salon@pepe.test)",
          createdAt: "2026-11-14T15:10:00.000Z",
        },
        {
          id: "log-f2",
          sequence: 2,
          action: "ITEM_CANCELLED",
          severity: "WARNING",
          summary: "Anuló 1x Vino Reserva ($ 4.500,00)",
          details: { itemName: "Vino Reserva", deltaQuantity: 1 },
          amountDeltaCents: -450000,
          waiterName: "Ana",
          actorId: "u-1",
          actorLabel: "Sala (salon@pepe.test)",
          createdAt: "2026-11-14T15:25:00.000Z",
        },
      ],
    };

    const reportWithAlerts = {
      ...emptyCashReport,
      receipts: [flaggedReceipt, cleanReceipt],
      totals: {
        totalCents: 750000,
        cashCents: 750000,
        cardCents: 0,
        transferCents: 0,
        tipCents: 0,
        discountCents: 0,
        receiptCount: 2,
      },
    };

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: reportWithAlerts }))));
    render(createElement(CashCmsScreen, {
      restaurantId: "rest-1",
      restaurantName: "Pepe Café",
      timeZone: "America/Argentina/Buenos_Aires",
      initialToday: "2026-11-14",
    }));

    await waitFor(() => expect(screen.getByText(/C-acc-flagged · M4/)).toBeTruthy());
    const flaggedRow = screen.getByText(/C-acc-flagged · M4/).closest("li");
    const cleanRow = screen.getByText(/C-acc-clean · M1/).closest("li");
    expect(flaggedRow?.getAttribute("data-audit-alert")).toBe("true");
    expect(flaggedRow?.className).toContain("bg-amber-50");
    expect(cleanRow?.getAttribute("data-audit-alert")).toBe("false");
    expect(screen.getByText("1 anulación")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ver registro C-acc-flagged" }));
    const dialog = screen.getByRole("dialog", { name: "Registro de movimientos de la cuenta" });
    expect(within(dialog).getByText("Anuló 1x Vino Reserva ($ 4.500,00)")).toBeTruthy();
    expect(within(dialog).getAllByText(/Sala \(salon@pepe\.test\)/).length).toBeGreaterThan(0);

    fireEvent.click(within(dialog).getByRole("button", { name: "Ver recibo" }));
    const receiptDialog = screen.getByRole("dialog", { name: "Recibo de consumo" });
    expect(receiptDialog).toBeTruthy();
    fireEvent.click(within(receiptDialog).getByText("Cerrar"));

    fireEvent.click(screen.getByRole("button", { name: /Solo con alertas \(1\)/ }));
    expect(screen.getByText(/C-acc-flagged · M4/)).toBeTruthy();
    expect(screen.queryByText(/C-acc-clean · M1/)).toBeNull();
  });

  it("displays Dividida pill on split-payment receipts and breakdown inside CashReceipt", async () => {
    const splitReceipt: ServiceAccountView = {
      id: "acc-split",
      allocationId: "alloc-s",
      reservationId: "res-s",
      roomId: "room-1",
      roomName: "Salón Principal",
      reservationCode: "R-20",
      customerName: "Carla",
      partySize: 3,
      assignedWaiterId: "w-1",
      assignedWaiterName: "Bruno",
      version: 5,
      openedAt: "2026-11-14T20:00:00.000Z",
      closedAt: "2026-11-14T21:30:00.000Z",
      businessDate: "2026-11-14",
      paymentMethod: "SPLIT",
      totalCents: 1500000,
      receiptNumber: "C-acc-split",
      tipCents: 0,
      discountCents: 0,
      discountReason: null,
      cashCents: 500000,
      cardCents: 1000000,
      transferCents: 0,
      tableIds: ["t-1"],
      tableLabels: ["M1"],
      lines: [
        { id: "l-1", name: "Coca", unitPriceCents: 500000, quantity: 1, deliveredQuantity: 1, cancelledQuantity: 0, paidQuantity: 1, notes: "", kitchenStatus: "SERVED", round: 1, station: "BAR", createdAt: "2026-11-14T20:05:00.000Z" },
        { id: "l-2", name: "Pizza", unitPriceCents: 1000000, quantity: 1, deliveredQuantity: 1, cancelledQuantity: 0, paidQuantity: 1, notes: "", kitchenStatus: "SERVED", round: 1, station: "KITCHEN", createdAt: "2026-11-14T20:05:00.000Z" },
      ],
      orderedCents: 1500000,
      deliveredCents: 1500000,
      pendingQuantity: 0,
      readyQuantity: 0,
      paidSubtotalCents: 1500000,
      remainingCents: 0,
      payments: [
        {
          id: "pay-1",
          sequence: 1,
          receiptNumber: "C-acc-split-P1",
          splitMode: "BY_ITEMS",
          payerLabel: "Carla",
          businessDate: "2026-11-14",
          paymentMethod: "CASH",
          subtotalCents: 500000,
          discountCents: 0,
          discountReason: null,
          tipCents: 0,
          totalCents: 500000,
          cashCents: 500000,
          cardCents: 0,
          transferCents: 0,
          items: [{ lineId: "l-1", name: "Coca", quantity: 1, unitPriceCents: 500000 }],
          paidBy: "u-1",
          paidAt: "2026-11-14T21:20:00.000Z",
        },
        {
          id: "pay-2",
          sequence: 2,
          receiptNumber: "C-acc-split-P2",
          splitMode: "BY_ITEMS",
          payerLabel: "Nico",
          businessDate: "2026-11-14",
          paymentMethod: "CARD",
          subtotalCents: 1000000,
          discountCents: 0,
          discountReason: null,
          tipCents: 0,
          totalCents: 1000000,
          cashCents: 0,
          cardCents: 1000000,
          transferCents: 0,
          items: [{ lineId: "l-2", name: "Pizza", quantity: 1, unitPriceCents: 1000000 }],
          paidBy: "u-1",
          paidAt: "2026-11-14T21:30:00.000Z",
        },
      ],
      auditLogs: [],
      hasAuditAlerts: false,
      auditAlertCount: 0,
      cancellationCount: 0,
    };

    const reportWithSplit = {
      ...emptyCashReport,
      receipts: [splitReceipt],
      totals: { totalCents: 1500000, cashCents: 500000, cardCents: 1000000, transferCents: 0, tipCents: 0, discountCents: 0, receiptCount: 1 },
    };

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true, data: reportWithSplit }))));
    render(createElement(CashCmsScreen, {
      restaurantId: "rest-1",
      restaurantName: "Pepe Café",
      timeZone: "America/Argentina/Buenos_Aires",
      initialToday: "2026-11-14",
    }));

    await waitFor(() => expect(screen.getByText(/C-acc-split · M1/)).toBeTruthy());
    expect(screen.getByText("Dividida (2 pagos)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ver recibo C-acc-split" }));
    const receiptDialog = screen.getByRole("dialog", { name: "Recibo de consumo" });
    expect(within(receiptDialog).getByText("Cómo se dividió la cuenta (2 pagos)")).toBeTruthy();
    expect(within(receiptDialog).getByText(/C-acc-split-P1 · Carla/)).toBeTruthy();
    expect(within(receiptDialog).getByText(/Productos: 1× Coca/)).toBeTruthy();
    expect(within(receiptDialog).getByText(/C-acc-split-P2 · Nico/)).toBeTruthy();
    expect(within(receiptDialog).getByText(/Productos: 1× Pizza/)).toBeTruthy();
  });

  it("lets admins assign Cocina or Barra per product, displays station pills, and filters by station", async () => {
    const initialProducts = [
      { id: "p-kitchen", name: "Milanesa", unitPriceCents: 1200000, station: "KITCHEN", active: true },
      { id: "p-bar", name: "Negroni", unitPriceCents: 850000, station: "BAR", active: true },
    ];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        const created = { id: "p-new", name: body.name, unitPriceCents: body.unitPriceCents, station: body.station ?? "KITCHEN", active: true };
        initialProducts.push(created);
        return new Response(JSON.stringify({ success: true, data: created }));
      }
      return new Response(JSON.stringify({ success: true, data: [...initialProducts] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(createElement(ServiceCatalogScreen, { restaurantId: "rest-1" }));
    const list = await screen.findByRole("list", { name: "Productos del catálogo" });
    expect(within(list).getByText("Milanesa")).toBeTruthy();
    expect(within(list).getByText("Negroni")).toBeTruthy();
    expect(within(list).getByText("Cocina")).toBeTruthy();
    expect(within(list).getByText("Barra")).toBeTruthy();

    // Filter to Barra only
    const filterGroup = screen.getByRole("group", { name: "Filtrar por estación" });
    fireEvent.click(within(filterGroup).getByRole("button", { name: "Barra" }));
    expect(within(list).queryByText("Milanesa")).toBeNull();
    expect(within(list).getByText("Negroni")).toBeTruthy();
    fireEvent.click(within(filterGroup).getByRole("button", { name: "Todos" }));

    // Create a new BAR product
    fireEvent.click(screen.getByRole("button", { name: "Nuevo producto" }));
    const modal = screen.getByRole("dialog", { name: "Nuevo producto" });
    fireEvent.change(within(modal).getByLabelText("Nombre"), { target: { value: "Copa Malbec" } });
    fireEvent.change(within(modal).getByLabelText(/Precio unitario en pesos/i), { target: { value: "4500,00" } });
    fireEvent.click(within(modal).getByRole("radio", { name: "Barra" }));
    fireEvent.click(within(modal).getByRole("button", { name: "Guardar producto" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find((call) => call[1]?.method === "POST");
      expect(postCall).toBeTruthy();
      expect(JSON.parse(String(postCall![1]!.body))).toEqual({
        action: "save-product",
        id: undefined,
        name: "Copa Malbec",
        unitPriceCents: 450000,
        station: "BAR",
      });
    });
  });
});

