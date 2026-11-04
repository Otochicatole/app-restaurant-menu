/** @vitest-environment jsdom */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { act, fireEvent, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FloorBoardView } from "../contracts";

const api = vi.hoisted(() => ({ board: vi.fn() }));
vi.mock("./floor-api", () => ({ getFloorBoard: api.board, saveFloorAction: vi.fn(), floorInputClass: "input" }));
vi.mock("./FloorCanvas", () => ({ FloorCanvas: ({ room }: { room: { name: string } }) => createElement("div", { role: "img", "aria-label": `Plano de ${room.name}` }) }));
vi.mock("./FloorAssignmentPicker", () => ({ FloorAssignmentPicker: () => null }));
vi.mock("@/modules/identity-access/ui", () => ({ LogoutButton: () => createElement("button", null, "Cerrar sesión") }));
import { FloorBoardScreen } from "./FloorBoardScreen";

const snapshot: FloorBoardView = {
  restaurantId: "restaurant", restaurantName: "Café", timeZone: "America/Argentina/Buenos_Aires", enabled: true,
  at: "2026-11-02T12:00:00.000Z", updatedAt: "2026-11-02T12:00:05.000Z", allocations: [],
  rooms: [{ id: "room", restaurantId: "restaurant", name: "Ventana", width: 800, height: 600, active: true, revision: 0, fixtures: [], locations: [], tables: [], combinations: [] }],
};

describe("floor board server snapshot hydration", () => {
  let root: Root | undefined;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.resetAllMocks();
    api.board.mockResolvedValue(snapshot);
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(async () => {
    if (root) await act(async () => { root?.unmount(); });
    root = undefined;
    container.remove();
    vi.restoreAllMocks();
  });

  it("hydrates the same initial controls, room and timestamp without requesting the snapshot again", async () => {
    const element = createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Café", readOnly: true, canManageWalkIns: true, initialBoard: snapshot });
    container.innerHTML = renderToString(element);
    const dom = within(container);
    expect(dom.getByRole("img", { name: "Plano de Ventana" })).toBeTruthy();
    for (const name of ["Cambiar salón", "Fecha y hora", "Reservas"]) {
      const button = dom.getByRole("button", { name }) as HTMLButtonElement;
      expect(button.disabled).toBe(false);
      expect(button.getAttribute("autocomplete")).toBe("off");
    }
    expect(dom.getByRole("status").textContent).toBe("Actualizado 09:00:05");
    const serverHtml = container.innerHTML;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoverable = vi.fn();
    await act(async () => { root = hydrateRoot(container, element, { onRecoverableError: recoverable }); });
    expect(errors).not.toHaveBeenCalled();
    expect(recoverable).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe(serverHtml);
    for (const name of ["Cambiar salón", "Fecha y hora", "Reservas"]) expect(dom.getByRole("button", { name }).getAttribute("autocomplete")).toBe("off");
    expect(api.board).not.toHaveBeenCalled();

    fireEvent.click(dom.getByRole("button", { name: "Fecha y hora" }));
    const schedule = dom.getByRole("dialog", {name: "Fecha y hora"});
    expect(schedule.getAttribute("aria-modal")).toBe("false");
    expect(document.body.style.overflow).not.toBe("hidden");
    fireEvent.click(dom.getByRole("button", {name: "Reservas"}));
    const reservations = dom.getByRole("dialog", {name: "Reservas de Ventana"});
    expect(dom.getByRole("dialog", {name: "Fecha y hora"})).toBe(schedule);
    fireEvent.change(dom.getByLabelText("Hora"), { target: { value: "21:30" } });
    fireEvent.click(dom.getByRole("button", { name: "Ver este horario" }));
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 10)); });
    expect(api.board).toHaveBeenCalledWith("restaurant", "2026-11-03T00:30:00Z", expect.any(AbortSignal));
    expect(dom.queryByRole("dialog", {name: "Fecha y hora"})).toBeNull();
    expect(dom.getByRole("dialog", {name: "Reservas de Ventana"})).toBe(reservations);
    expect(errors).not.toHaveBeenCalled();
  });

  it("does not derive its first update timestamp from the server or browser's local time zone", async () => {
    const formatter = Intl.DateTimeFormat;
    let localZone = "UTC";
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function(locale, options) {
      return new formatter(locale, { timeZone: localZone, ...options });
    } as typeof Intl.DateTimeFormat);
    const element = createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Café", readOnly: true, initialBoard: snapshot });
    container.innerHTML = renderToString(element);
    const html = container.innerHTML;
    localZone = "Asia/Tokyo";
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => { root = hydrateRoot(container, element); });
    expect(errors).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe(html);
    expect(within(container).getByRole("status").textContent).toBe("Actualizado 09:00:05");
  });
});
