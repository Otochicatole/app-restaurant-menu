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
});

