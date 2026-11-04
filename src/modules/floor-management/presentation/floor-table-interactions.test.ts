/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { buildFloorOptions, type FloorAllocationView, type FloorBoardView, type FloorConfigView, type FloorOptionsView, type FloorRoom } from "../contracts";
import type { FloorCanvasProps } from "./FloorCanvas";

const api = vi.hoisted(() => ({ options: vi.fn(), reassignOptions: vi.fn(), reassign: vi.fn(), tables: vi.fn(), board: vi.fn(), config: vi.fn(), save: vi.fn() }));
vi.mock("./floor-api", () => ({ getFloorOptions: api.options, getFloorReassignmentOptions: api.reassignOptions, reassignFloorTables: api.reassign, saveFloorTables: api.tables, getFloorBoard: api.board, getFloorConfig: api.config, saveFloorAction: api.save, floorInputClass: "input" }));
vi.mock("@/modules/identity-access/ui", () => ({ LogoutButton: () => createElement("button", null, "Cerrar sesión") }));
vi.mock("./FloorCanvas", () => ({ FloorCanvas: (props: FloorCanvasProps) => {
  const [pan, setPan] = useState(0);
  return createElement("div", { "data-testid": "table-board" },
    createElement("button", { type: "button", onClick: () => setPan((value) => value + 1) }, "Desplazar plano de prueba"),
    props.onPlace && createElement("button", { type: "button", onClick: () => props.onPlace?.({ x: 440, y: 380 }, "window") }, "Colocar en el tablero"),
    props.tables.map((table) => createElement("button", { key: table.id, type: "button", "aria-label": `Mesa del plano ${table.id}`, onClick: () => props.onSelect?.(table.id, false), onContextMenu: (event) => { event.preventDefault(); props.onContextMenuTable?.(table.id, { x: event.clientX, y: event.clientY }); } }, table.label)),
    createElement("output", { "data-testid": "table-poses" }, JSON.stringify(props.tables)),
    createElement("output", { "data-testid": "table-pan" }, String(pan)));
} }));

import { FloorBoardScreen } from "./FloorBoardScreen";

const room: FloorRoom = { id: "room", restaurantId: "restaurant", name: "Salón principal", width: 800, height: 600, revision: 4, active: true, fixtures: [],
  locations: [{ id: "window", name: "Ventana", x: 400, y: 300, width: 600, height: 400, rotation: 0, active: true }],
  tables: [{ id: "one", label: "M1", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 200, y: 200, rotation: 0, active: true },
    { id: "two", label: "M2", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 400, y: 200, rotation: 0, active: true }], combinations: [] };
const interval = { serviceStartAt: "2099-11-01T23:00:00Z", serviceEndAt: "2099-11-02T01:00:00Z", blockedFrom: "2099-11-01T23:00:00Z", blockedUntil: "2099-11-02T01:00:00Z", timeZone: "America/Argentina/Buenos_Aires" };
const options = (): FloorOptionsView => ({ rooms: [structuredClone(room)], options: buildFloorOptions(room), interval });
const board = (): FloorBoardView => ({ restaurantId: "restaurant", restaurantName: "Bistró", timeZone: interval.timeZone, enabled: true, at: interval.serviceStartAt, rooms: [structuredClone(room)], allocations: [], updatedAt: interval.serviceStartAt });
const config = (currentRoom = structuredClone(room)): FloorConfigView => ({ restaurantId: "restaurant", restaurantName: "Bistró", timeZone: interval.timeZone, enabled: true, rooms: [currentRoom], staffAccount: null, compatibility: { status: "compatible" } });
const allocation = (source = "WALK_IN"): FloorAllocationView => ({ ...interval, id: "allocation", reservationId: "reservation", roomId: "room", locationId: "window", combinationId: null, capacity: 6, customerName: "Grupo de Julia", partySize: 2, date: "2099-11-01", time: "20:00", notes: "Cerca de la ventana", code: "BOOK", releasedAt: null, version: 2, reservationRevision: 7, source,
  poses: room.tables.map((table, index) => { const { id, active: _active, ...pose } = table; void _active; return { ...pose, tableId: id, x: 360 + index * 80, y: 300 }; }) });
const poses = () => JSON.parse(screen.getByTestId("table-poses").textContent!) as { id: string; label: string; shape: string; x: number; y: number; rotation: number; width: number; height: number }[];

function show(current = board(), readOnly = false) {
  return render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly, canManageWalkIns: true, initialBoard: current }));
}
async function startDraft(readOnly = false) {
  show(board(), readOnly);
  fireEvent.click(screen.getByRole("button", { name: "Atender sin reserva" }));
  fireEvent.click(screen.getByRole("button", { name: "Elegir mesas" }));
  const sector = await screen.findByLabelText("Sector del salón") as HTMLSelectElement;
  await waitFor(() => expect(sector.disabled).toBe(false));
  fireEvent.change(sector, { target: { value: "window" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Cantidad de Cuadrada 80 × 80" }), { target: { value: "2" } });
  await waitFor(() => expect(poses()).toHaveLength(2));
}
function openTable(id = "draft:one") {
  fireEvent.contextMenu(screen.getByRole("button", { name: `Mesa del plano ${id}` }), { clientX: 320, clientY: 260 });
  return screen.getByRole("menu");
}

describe("table actions on the operational board", () => {
  beforeEach(() => { vi.resetAllMocks(); document.body.style.overflow = ""; api.options.mockResolvedValue(options()); api.board.mockResolvedValue(board()); api.config.mockResolvedValue(config()); });
  afterEach(() => { cleanup(); document.body.style.overflow = ""; vi.restoreAllMocks(); });

  it("rotates and moves only the right-clicked table without replacing the main board", async () => {
    await startDraft();
    const canvas = screen.getByTestId("table-board");
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    const originalSecond = poses().find((pose) => pose.id === "draft:two");
    fireEvent.click(within(openTable()).getByRole("menuitem", { name: "Girar" }));
    expect(poses().find((pose) => pose.id === "draft:one")?.rotation).toBe(90);
    expect(poses().find((pose) => pose.id === "draft:two")).toEqual(originalSecond);
    fireEvent.click(within(openTable()).getByRole("menuitem", { name: "Mover" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Colocar en el tablero" }));
    expect(poses().find((pose) => pose.id === "draft:one")).toMatchObject({ x: 440, y: 380, rotation: 90 });
    expect(poses().find((pose) => pose.id === "draft:two")).toEqual(originalSecond);
    expect(screen.getAllByTestId("table-board")).toHaveLength(1);
    expect(screen.getByTestId("table-board")).toBe(canvas);
    expect(screen.getByTestId("table-pan").textContent).toBe("1");
    expect(api.save).not.toHaveBeenCalled();
  });

  it("opens the same table actions from the keyboard and returns focus without blocking the board", async () => {
    await startDraft();
    const trigger = screen.getByRole("button", { name: "Acciones de mesa M1" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "F10", shiftKey: true });
    const menu = screen.getByRole("menu");
    expect(document.activeElement).toBe(within(menu).getByRole("menuitem", { name: "Editar" }));
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(within(menu).getByRole("menuitem", { name: "Mover" }));
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(screen.getAllByTestId("table-board")).toHaveLength(1);
  });

  it("saves inventory properties with the room revision while retaining the other physical table and its position", async () => {
    api.tables.mockImplementation(async (_restaurantId: string, command: { tables: FloorRoom["tables"]; combinations: FloorRoom["combinations"] }) => {
      const savedRoom = { ...room, tables: command.tables, combinations: command.combinations, revision: 5 };
      api.options.mockResolvedValue({ ...options(), rooms: [savedRoom], options: buildFloorOptions(savedRoom) });
      api.board.mockResolvedValue({ ...board(), rooms: [savedRoom] });
      return { room: savedRoom };
    });
    await startDraft();
    const canvas = screen.getByTestId("table-board");
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    const originalSecond = poses().find((pose) => pose.id === "draft:two");
    fireEvent.click(within(openTable()).getByRole("menuitem", { name: "Editar" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByTestId("table-board")).toBeNull();
    fireEvent.change(within(dialog).getByLabelText("Número o nombre"), { target: { value: "Ventana 1" } });
    fireEvent.change(within(dialog).getByLabelText("Forma"), { target: { value: "RECTANGLE" } });
    fireEvent.change(within(dialog).getByLabelText("Alto"), { target: { value: "60" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(api.tables).toHaveBeenCalledWith("restaurant", { roomId: "room", expectedRevision: 4, tables: expect.arrayContaining([expect.objectContaining({ id: "one", label: "Ventana 1", shape: "RECTANGLE", width: 80, height: 60 }), room.tables[1]]), combinations: [] }));
    expect(api.save).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(poses().find((pose) => pose.id === "draft:one")).toMatchObject({ label: "Ventana 1", shape: "RECTANGLE", width: 80, height: 60 });
    expect(poses().find((pose) => pose.id === "draft:two")).toEqual(originalSecond);
    expect(screen.getByTestId("table-board")).toBe(canvas);
    expect(screen.getByTestId("table-pan").textContent).toBe("1");
  });

  it("keeps staged inventory fields and the arrangement when a protected table update is rejected", async () => {
    api.tables.mockRejectedValue(new Error("La mesa M1 tiene reservas futuras."));
    await startDraft();
    const original = poses();
    fireEvent.click(within(openTable()).getByRole("menuitem", { name: "Editar" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Forma"), { target: { value: "CIRCLE" } });
    fireEvent.change(within(dialog).getByLabelText("Diámetro"), { target: { value: "90" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar cambios" }));
    await within(dialog).findByRole("alert");
    expect(within(dialog).getByRole("alert").textContent).toContain("reservas futuras");
    expect((within(dialog).getByLabelText("Diámetro") as HTMLInputElement).value).toBe("90");
    expect(poses()).toEqual(original);
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(poses()).toEqual(original);
  });

  it("lets staff change table inventory through the narrow endpoint without writing the room layout", async () => {
    api.tables.mockImplementation(async (_restaurantId: string, command: { tables: FloorRoom["tables"] }) => {
      const savedRoom = { ...room, tables: command.tables, revision: 5 };
      api.options.mockResolvedValue({ ...options(), rooms: [savedRoom], options: buildFloorOptions(savedRoom) });
      return { room: savedRoom };
    });
    await startDraft(true);
    fireEvent.click(within(openTable()).getByRole("menuitem", { name: "Editar" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Forma")).toBeTruthy();
    expect(within(dialog).getByLabelText("Capacidad")).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Número o nombre"), { target: { value: "Ventana del mozo" } });
    fireEvent.change(within(dialog).getByLabelText("Centro Y"), { target: { value: "380" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(poses().find((pose) => pose.id === "draft:one")).toMatchObject({ label: "Ventana del mozo", y: 380 });
    expect(api.tables).toHaveBeenCalledWith("restaurant", { roomId: "room", expectedRevision: 4, tables: expect.arrayContaining([expect.objectContaining({ id: "one", label: "Ventana del mozo" })]), combinations: [] });
    expect(api.save).not.toHaveBeenCalled();
  });

  it("reassigns a saved group from the same board with both expected versions", async () => {
    const current = board(); const stored = allocation(); current.allocations = [stored];
    const existingOptions = options(); existingOptions.currentAllocation = stored; api.reassignOptions.mockResolvedValue(existingOptions);
    api.reassign.mockResolvedValue(current);
    show(current);
    const canvas = screen.getByTestId("table-board");
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    fireEvent.click(within(openTable("one")).getByRole("menuitem", { name: "Girar" }));
    await waitFor(() => expect(api.reassignOptions).toHaveBeenCalled());
    await waitFor(() => expect(poses().find((pose) => pose.id === "draft:one")?.rotation).toBe(90));
    expect(screen.queryByRole("dialog")).toBeNull();
    const save = screen.getByRole("button", { name: "Guardar armado" }) as HTMLButtonElement;
    await waitFor(() => expect(save.disabled).toBe(false));
    fireEvent.click(save);
    await waitFor(() => expect(api.reassign).toHaveBeenCalledWith("restaurant", "reservation", expect.objectContaining({ expectedRevision: 7, expectedAllocationVersion: 2, assignment: expect.objectContaining({ expectedRoomRevision: 4, customTables: [expect.objectContaining({ tableId: "one", rotation: 90 }), expect.objectContaining({ tableId: "two", rotation: 0 })] }) })));
    expect(api.save).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("table-board")).toHaveLength(1);
    expect(screen.getByTestId("table-board")).toBe(canvas);
    expect(screen.getByTestId("table-pan").textContent).toBe("1");
  });

  it("keeps a rejected reassignment on the board so the administrator can correct it", async () => {
    const current = board(); const stored = allocation(); current.allocations = [stored];
    const existingOptions = options(); existingOptions.currentAllocation = stored; api.reassignOptions.mockResolvedValue(existingOptions);
    api.reassign.mockRejectedValue(new Error("El armado cambió en otra pantalla."));
    show(current);
    fireEvent.click(within(openTable("one")).getByRole("menuitem", { name: "Girar" }));
    const save = await screen.findByRole("button", { name: "Guardar armado" }) as HTMLButtonElement;
    await waitFor(() => expect(save.disabled).toBe(false));
    const staged = poses(); fireEvent.click(save);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("otra pantalla"));
    expect(poses()).toEqual(staged);
    expect(screen.getAllByTestId("table-board")).toHaveLength(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("lets the user close a failed table editor and retry availability without saving", async () => {
    const current = board(); const stored = allocation(); current.allocations = [stored];
    const existingOptions = options(); existingOptions.currentAllocation = stored;
    api.reassignOptions.mockRejectedValueOnce(new Error("Sin conexión con la sala")).mockResolvedValue(existingOptions);
    api.board.mockResolvedValue(current);
    show(current);
    fireEvent.click(within(openTable("one")).getByRole("menuitem", { name: "Editar" }));
    const dialog = screen.getByRole("dialog");
    expect((await within(dialog).findByRole("alert")).textContent).toContain("Sin conexión");
    const cancel = within(dialog).getByRole("button", { name: "Cancelar" }) as HTMLButtonElement;
    expect(cancel.disabled).toBe(false); fireEvent.click(cancel);
    const controls = screen.getByRole("complementary", { name: "Armar mesas en sala" });
    fireEvent.click(within(controls).getByRole("button", { name: "Actualizar" }));
    await waitFor(() => expect(api.reassignOptions).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(poses().map((pose) => pose.id)).toEqual(["draft:one", "draft:two"]));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(api.save).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "PUBLIC", "WALK_IN"])("lets staff rotate and save the tables of a %s reservation", async (source) => {
    const current = board(); const stored = allocation(source); current.allocations = [stored];
    const existingOptions = options(); existingOptions.currentAllocation = stored;
    api.reassignOptions.mockResolvedValue(existingOptions); api.reassign.mockResolvedValue(current);
    show(current, true);
    fireEvent.click(within(openTable("one")).getByRole("menuitem", { name: "Girar" }));
    const save = await screen.findByRole("button", { name: "Guardar armado" }) as HTMLButtonElement;
    await waitFor(() => expect(save.disabled).toBe(false));
    expect(poses()[0]).toMatchObject({ id: "draft:one", rotation: 90 });
    fireEvent.click(save);
    await waitFor(() => expect(api.reassign).toHaveBeenCalledWith("restaurant", "reservation", expect.objectContaining({ expectedRevision: 7, expectedAllocationVersion: 2 })));
    expect(api.save).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: "Administrar" })).toBeNull();
  });

  it("keeps the saved room editable when availability fails and validates before saving", async () => {
    const current = board(); const stored = allocation(); current.allocations = [stored];
    const verified = options(); verified.currentAllocation = stored;
    api.reassignOptions.mockRejectedValueOnce(new Error("Modo de consulta inválido.")).mockResolvedValue(verified);
    api.board.mockResolvedValue(current); api.reassign.mockResolvedValue(current);
    show(current);
    const canvas = screen.getByTestId("table-board");
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    fireEvent.click(within(openTable("one")).getByRole("menuitem", { name: "Mover" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Modo de consulta inválido."));
    const controls = screen.getByRole("complementary", { name: "Armar mesas en sala" });
    expect(within(controls).getByText("Salón principal")).toBeTruthy();
    expect((within(controls).getByLabelText("Sector del salón") as HTMLSelectElement).value).toBe("window");
    expect(screen.queryByText("Los lugares útiles superan la capacidad de las mesas elegidas.")).toBeNull();
    expect(poses().map((pose) => pose.id)).toEqual(["draft:one", "draft:two"]);
    const second = poses()[1];
    fireEvent.click(screen.getByRole("button", { name: "Colocar en el tablero" }));
    expect(poses()[0]).toMatchObject({ id: "draft:one", x: 440, y: 380 });
    fireEvent.click(within(openTable()).getByRole("menuitem", { name: "Girar" }));
    expect(poses()[0]).toMatchObject({ rotation: 90 });
    expect(poses()[1]).toEqual(second);
    const save = screen.getByRole("button", { name: "Guardar armado" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true); fireEvent.click(save);
    expect(api.save).not.toHaveBeenCalled();
    const staged = poses();
    fireEvent.click(within(controls).getByRole("button", { name: "Actualizar" }));
    await waitFor(() => expect(save.disabled).toBe(false));
    expect(poses()).toEqual(staged);
    expect(screen.getByTestId("table-board")).toBe(canvas);
    expect(screen.getByTestId("table-pan").textContent).toBe("1");
    fireEvent.click(save);
    await waitFor(() => expect(api.reassign).toHaveBeenCalledWith("restaurant", "reservation", expect.objectContaining({ expectedRevision: 7, expectedAllocationVersion: 2 })));
  });
});
