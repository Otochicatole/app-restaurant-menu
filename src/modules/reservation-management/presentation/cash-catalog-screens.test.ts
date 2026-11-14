/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
});

