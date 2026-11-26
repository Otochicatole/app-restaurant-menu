/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InventorySnapshot } from "../contracts";
import { InventoryManagementScreen } from "./InventoryManagementScreen";

const baseSnapshot: InventorySnapshot = {
  suppliers: [
    { id: "sup-1", name: "Molinos del Sur", contactName: "Laura", phone: "11-4444-5555", email: "", notes: "", active: true, itemCount: 2 },
  ],
  items: [
    {
      id: "item-1",
      code: "INS-001",
      name: "Harina 000",
      unit: "KG",
      unitCostCents: 180_000,
      currentStockMilli: 400,
      minStockMilli: 1000,
      stockStatus: "LOW",
      isDirectSale: false,
      supplierId: "sup-1",
      supplierName: "Molinos del Sur",
      active: true,
      linkedProductId: null,
      pendingProposalId: null,
    },
    {
      id: "item-2",
      code: "INS-002",
      name: "Agua sin gas 500ml",
      unit: "U",
      unitCostCents: 60_000,
      currentStockMilli: 12_000,
      minStockMilli: 4_000,
      stockStatus: "OK",
      isDirectSale: true,
      supplierId: "sup-1",
      supplierName: "Molinos del Sur",
      active: true,
      linkedProductId: null,
      pendingProposalId: null,
    },
  ],
  recipes: [
    {
      id: "rec-1",
      code: "REC-001",
      name: "Pizza Muzzarella",
      yieldPortions: 1,
      notes: "",
      active: true,
      totalCostCents: 36_000,
      costPerPortionCents: 36_000,
      availablePortions: 2,
      stockStatus: "LOW",
      ingredients: [
        {
          id: "ri-1",
          inventoryItemId: "item-1",
          itemCode: "INS-001",
          itemName: "Harina 000",
          itemUnit: "KG",
          quantityMilli: 200,
          displayUnit: "G",
          currentStockMilli: 400,
          unitCostCents: 180_000,
          ingredientCostCents: 36_000,
        },
      ],
      linkedProductId: null,
      pendingProposalId: null,
    },
  ],
  movements: [
    {
      id: "mov-1",
      inventoryItemId: "item-1",
      itemCode: "INS-001",
      itemName: "Harina 000",
      itemUnit: "KG",
      kind: "PURCHASE_IN",
      deltaMilli: 400,
      balanceMilli: 400,
      unitCostCents: 180_000,
      supplierName: "Molinos del Sur",
      recipeName: null,
      referenceLabel: "Compra / Entrada",
      notes: "",
      actorId: "admin-1",
      createdAt: "2026-11-25T12:00:00.000Z",
    },
  ],
  proposals: [],
  alerts: [
    {
      inventoryItemId: "item-1",
      code: "INS-001",
      name: "Harina 000",
      unit: "KG",
      currentStockMilli: 400,
      minStockMilli: 1000,
      status: "LOW",
      supplierName: "Molinos del Sur",
    },
  ],
};

describe("InventoryManagementScreen", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders inventory alerts, switches tabs, prepares a recipe with stock warning, and submits catalog proposal", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method || init.method === "GET") {
        return new Response(JSON.stringify({ success: true, data: baseSnapshot }), { status: 200 });
      }
      const command = JSON.parse(String(init.body));
      if (command.action === "prepare-recipe") {
        return new Response(JSON.stringify({
          success: true,
          data: {
            snapshot: baseSnapshot,
            warnings: [
              {
                inventoryItemId: "item-1",
                itemName: "Harina 000",
                unit: "KG",
                requiredMilli: 600,
                availableBeforeMilli: 400,
                balanceAfterMilli: -200,
                minStockMilli: 1000,
                kind: "INSUFFICIENT",
              },
            ],
          },
        }), { status: 200 });
      }
      if (command.action === "submit-proposal") {
        return new Response(JSON.stringify({
          success: true,
          data: {
            snapshot: {
              ...baseSnapshot,
              recipes: [{ ...baseSnapshot.recipes[0], pendingProposalId: "prop-1" }],
            },
            warnings: [],
          },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true, data: { snapshot: baseSnapshot, warnings: [] } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(createElement(InventoryManagementScreen, { restaurantId: "rest-1" }));

    await waitFor(() => expect(screen.getByText("Alertas de reabastecimiento (1)")).toBeTruthy());
    const itemList = screen.getByRole("list", { name: "Tabla de productos de inventario" });
    expect(within(itemList).getByText("Harina 000")).toBeTruthy();
    expect(within(itemList).getByText("Agua sin gas 500ml")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Recetas/ }));
    expect(screen.getByText("Pizza Muzzarella")).toBeTruthy();

    // Prepare 3 portions when only 2 are available -> non-blocking warning
    fireEvent.click(screen.getByRole("button", { name: /Preparar \/ Descontar/ }));
    const prepareDialog = screen.getByRole("dialog", { name: /Preparar \/ Descontar/ });
    fireEvent.change(within(prepareDialog).getByLabelText("Cantidad de porciones a preparar"), { target: { value: "3" } });
    expect(within(prepareDialog).getByText(/Alerta de stock insuficiente/)).toBeTruthy();
    fireEvent.click(within(prepareDialog).getByRole("button", { name: "Descontar stock" }));

    await waitFor(() => expect(screen.getByText(/Preparación registrada: 3 porciones/)).toBeTruthy());
    expect(screen.getByText(/Aviso de consumo:/)).toBeTruthy();

    // Submit recipe for catalog approval
    fireEvent.click(screen.getByRole("button", { name: /Enviar a Catálogo/ }));
    const proposalDialog = screen.getByRole("dialog", { name: "Enviar a aprobación de Catálogo" });
    fireEvent.click(within(proposalDialog).getByRole("button", { name: "Enviar a aprobación" }));

    await waitFor(() => expect(screen.getByText(/"Pizza Muzzarella" quedó pendiente de aprobación en Catálogo/)).toBeTruthy());
    expect(screen.getByText("Pendiente de aprobación")).toBeTruthy();
  });
});
