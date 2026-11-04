/** @vitest-environment jsdom */
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FloorBoardView, FloorRoom, FloorTableInventoryInput } from "../contracts";
import type { FloorCanvasProps } from "./FloorCanvas";

const api = vi.hoisted(() => ({ board: vi.fn(), tables: vi.fn(), save: vi.fn(), options: vi.fn(), reassignOptions: vi.fn(), reassign: vi.fn() }));
vi.mock("./floor-api", () => ({ getFloorBoard: api.board, saveFloorTables: api.tables, saveFloorAction: api.save, getFloorOptions: api.options, getFloorReassignmentOptions: api.reassignOptions, reassignFloorTables: api.reassign, floorInputClass: "input" }));
vi.mock("@/modules/identity-access/ui", () => ({ LogoutButton: () => createElement("button", null, "Cerrar sesión") }));
vi.mock("./FloorCanvas", () => ({ FloorCanvas: (props: FloorCanvasProps) => createElement("output", { "data-testid": "inventory-room" }, JSON.stringify(props.room)) }));

import { FloorBoardScreen } from "./FloorBoardScreen";

const room: FloorRoom = { id: "room", restaurantId: "restaurant", name: "Salón principal", width: 800, height: 600, revision: 4, active: true,
  fixtures: [{ id: "bar", type: "BAR", label: "Barra", x: 150, y: 70, width: 180, height: 40, rotation: 0 }],
  locations: [{ id: "window", name: "Ventana", x: 400, y: 300, width: 600, height: 400, rotation: 0, active: true }],
  tables: [{ id: "one", label: "M1", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 200, y: 200, rotation: 0, active: true },
    { id: "two", label: "M2", shape: "SQUARE", capacity: 6, width: 80, height: 80, x: 400, y: 200, rotation: 0, active: true }],
  combinations: [{ id: "joined", name: "Unión de ventana", capacity: 8, active: true, members: [{ tableId: "one", x: -40, y: 0, rotation: 0 }, { tableId: "two", x: 40, y: 0, rotation: 0 }] }] };
const board = (): FloorBoardView => ({ restaurantId: "restaurant", restaurantName: "Bistró", enabled: true, timeZone: "America/Argentina/Buenos_Aires", at: "2099-11-01T23:00:00Z", updatedAt: "2099-11-01T23:00:00Z", rooms: [structuredClone(room)], allocations: [] });
function openInventory() {
  render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true, initialBoard: board() }));
  fireEvent.click(screen.getByRole("button", { name: "Inventario de mesas" }));
  return screen.getByRole("dialog", { name: "Inventario de mesas" });
}
function increaseType(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: "Editar tipo Cuadrada 80 × 80" }));
  fireEvent.change(within(dialog).getByLabelText("Cantidad de mesas"), { target: { value: "3" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar tipo" }));
}

describe("waiter inventory from the operational toolbar", () => {
  beforeEach(() => {
    vi.resetAllMocks(); document.body.style.overflow = "";
    api.board.mockResolvedValue(board());
    api.tables.mockImplementation(async (_restaurantId: string, input: FloorTableInventoryInput) => ({ room: { ...room, revision: 5, tables: input.tables, combinations: input.combinations } }));
  });
  afterEach(() => { cleanup(); document.body.style.overflow = ""; vi.restoreAllMocks(); });

  it("edits grouped quantities and saves only table inventory while preserving the room and sectors", async () => {
    const dialog = openInventory();
    expect(screen.queryByRole("link", { name: "Administrar" })).toBeNull();
    for (const label of ["Ancho del plano", "Alto del plano", "Nombre del sector"]) expect(within(dialog).queryByLabelText(label)).toBeNull();
    increaseType(dialog);
    expect(api.tables).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar inventario" }));
    await waitFor(() => expect(api.tables).toHaveBeenCalledOnce());
    const [restaurantId, input] = api.tables.mock.calls[0] as [string, FloorTableInventoryInput];
    expect(restaurantId).toBe("restaurant");
    expect(Object.keys(input).sort()).toEqual(["roomId", "expectedRevision", "tables", "combinations"].sort());
    expect(input).toMatchObject({ roomId: room.id, expectedRevision: 4, combinations: room.combinations });
    expect(input.tables).toHaveLength(3);
    expect(input.tables).toEqual(expect.arrayContaining(room.tables));
    expect(new Set(input.tables.map((table) => table.id)).size).toBe(3);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const updated = JSON.parse(screen.getByTestId("inventory-room").textContent!) as FloorRoom;
    expect(updated).toMatchObject({ id: room.id, name: room.name, width: room.width, height: room.height, fixtures: room.fixtures, locations: room.locations });
    expect(api.save).not.toHaveBeenCalled();
  });

  it("keeps unsaved quantities after refusing discard and restores stored inventory after accepting it", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const dialog = openInventory();
    increaseType(dialog);
    fireEvent.click(within(dialog).getByText("Cerrar", { selector: "button" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog", { name: "Inventario de mesas" })).toBe(dialog);
    expect(within(dialog).getByText("3 activas · 3 en total")).toBeTruthy();
    fireEvent.click(within(dialog).getByText("Cerrar", { selector: "button" }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Inventario de mesas" }));
    const reopened = screen.getByRole("dialog", { name: "Inventario de mesas" });
    expect(within(reopened).getByText("2 activas · 2 en total")).toBeTruthy();
    expect((within(reopened).getByRole("button", { name: "Guardar inventario" }) as HTMLButtonElement).disabled).toBe(true);
    expect(api.tables).not.toHaveBeenCalled();
    expect(api.save).not.toHaveBeenCalled();
  });

  it("preserves the original inventory draft and revision when polling removes its room or selects another one", async () => {
    const scheduled = vi.spyOn(window, "setInterval");
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const dialog = openInventory();
    increaseType(dialog);
    const poll = scheduled.mock.calls.find((call) => call[1] === 15_000)?.[0] as () => void;
    expect(poll).toBeTypeOf("function");
    api.board.mockResolvedValue({ ...board(), rooms: [] });
    await act(async () => { poll(); });
    expect(screen.getByRole("dialog", { name: "Inventario de mesas" })).toBe(dialog);
    expect(within(dialog).getByText("3 activas · 3 en total")).toBeTruthy();
    api.board.mockResolvedValue({ ...board(), rooms: [{ ...room, id: "terrace", name: "Terraza", tables: [], combinations: [] }] });
    await act(async () => { poll(); });
    await waitFor(() => expect(JSON.parse(screen.getByTestId("inventory-room").textContent!).id).toBe("terrace"));
    expect(screen.getByRole("dialog", { name: "Inventario de mesas" })).toBe(dialog);
    expect(within(dialog).getByText("3 activas · 3 en total")).toBeTruthy();
    api.tables.mockRejectedValue(new Error("El salón cambió en otra pestaña. Actualizalo antes de guardar."));
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar inventario" }));
    await waitFor(() => expect(api.tables).toHaveBeenCalledWith("restaurant", expect.objectContaining({ roomId: "room", expectedRevision: 4 })));
    expect((await within(dialog).findByRole("alert")).textContent).toContain("El salón cambió");
    expect(within(dialog).getByText("3 activas · 3 en total")).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Guardar inventario" }) as HTMLButtonElement).disabled).toBe(false);
    expect(api.save).not.toHaveBeenCalled();
  });
});
