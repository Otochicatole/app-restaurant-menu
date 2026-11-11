/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
      openedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      allReady: false,
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
          notes: "",
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
  });

  it("shows back link when backUrl is provided and filters by station", () => {
    render(
      createElement(KitchenDisplayScreen, {
        restaurantId: "rest-1",
        restaurantName: "Pepe Café",
        initialSnapshot: snapshot,
        backUrl: "/floor",
      }),
    );

    expect(screen.getByRole("link", { name: /Volver a Sala/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Barra" }));
    expect(screen.queryByText("Milanesa napolitana")).toBeNull();
    expect(screen.getByText("Limonada")).toBeTruthy();
  });
});

