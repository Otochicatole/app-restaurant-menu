/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { KitchenSnapshot } from "../service-contracts";
import { KitchenDisplayScreen } from "./KitchenDisplayScreen";

const snapshot: KitchenSnapshot = {
  restaurantName: "Pepe Café",
  timeZone: "America/Argentina/Buenos_Aires",
  tickets: [
    {
      id: "acc-1-1",
      accountId: "acc-1",
      round: 1,
      roomName: "Salón principal",
      tableLabels: ["M1"],
      customerName: "Sin reserva",
      reservationCode: "W1",
      waiterName: "Nico",
      openedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      allReady: false,
      kitchenReady: false,
      barReady: false,
      hasKitchenItems: true,
      hasBarItems: true,
      lines: [
        {
          id: "line-1",
          name: "Milanesa napolitana",
          quantity: 3,
          deliveredQuantity: 0,
          cancelledQuantity: 1,
          notes: "Sin ajo",
          kitchenStatus: "PENDING",
          station: "KITCHEN",
          createdAt: new Date().toISOString(),
        },
        {
          id: "line-2",
          name: "Limonada",
          quantity: 1,
          deliveredQuantity: 0,
          cancelledQuantity: 0,
          notes: "Con hielo",
          kitchenStatus: "IN_PREP",
          station: "BAR",
          createdAt: new Date().toISOString(),
        },
      ],
    },
  ],
};

describe("kitchen display screen", () => {
  afterEach(cleanup);

  it("renders a light theme and omits back link when backUrl is empty", () => {
    const view = render(
      createElement(KitchenDisplayScreen, {
        restaurantId: "rest-1",
        restaurantName: "Pepe Café",
        initialSnapshot: snapshot,
        backUrl: "",
      }),
    );

    const root = view.container.firstElementChild;
    expect(root?.className).toContain("bg-[#f8faf7]");
    expect(root?.className).not.toContain("bg-zinc-950");
    expect(view.container.querySelector(".bg-zinc-950")).toBeNull();
    expect(screen.queryByRole("link", { name: /Volver/i })).toBeNull();
    expect(screen.getByText("2×")).toBeTruthy();
    expect(screen.getByText("Milanesa napolitana")).toBeTruthy();
    expect(screen.getByText(/Mozo: Nico/)).toBeTruthy();
  });

  it("separates primary items and secondary coordination context between Cocina and Barra", () => {
    render(
      createElement(KitchenDisplayScreen, {
        restaurantId: "rest-1",
        restaurantName: "Pepe Café",
        initialSnapshot: snapshot,
        initialStation: "KITCHEN",
        backUrl: "/floor",
      }),
    );

    expect(screen.getByRole("link", { name: /Volver a Sala/i })).toBeTruthy();

    // In Cocina mode: food is primary actionable; drink is in secondary context box
    expect(screen.getByText("Platos a preparar (Cocina)")).toBeTruthy();
    expect(screen.getByText("Milanesa napolitana")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Marcha" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cocina Lista" })).toBeTruthy();

    const contextCocina = screen.getByTestId("coordination-context");
    expect(within(contextCocina).getByText("Bebidas de esta tanda (Barra)")).toBeTruthy();
    expect(within(contextCocina).getByText("Limonada")).toBeTruthy();
    expect(within(contextCocina).getByText("(Con hielo)")).toBeTruthy();
    expect(within(contextCocina).getByText("En marcha")).toBeTruthy();

    // Switch to Barra mode
    fireEvent.click(screen.getByRole("button", { name: /Barra/i }));

    // In Barra mode: drink is primary actionable; food is in secondary context box
    expect(screen.getByText("Bebidas a preparar (Barra)")).toBeTruthy();
    expect(screen.getByText("Limonada")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Listo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Barra Lista" })).toBeTruthy();

    const contextBarra = screen.getByTestId("coordination-context");
    expect(within(contextBarra).getByText("Comida de esta tanda (Cocina)")).toBeTruthy();
    expect(within(contextBarra).getByText("Milanesa napolitana")).toBeTruthy();
    expect(within(contextBarra).getByText("Pendiente")).toBeTruthy();
  });
});


