/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { buildFloorOptions, type FloorAllocationView, type FloorAssignmentInput, type FloorBoardView, type FloorConfigView, type FloorOptionsView, type FloorRoom } from "../contracts";
import type { FloorCanvasProps } from "./FloorCanvas";

const api = vi.hoisted(() => ({ options: vi.fn(), reassignOptions: vi.fn(), reassign: vi.fn(), reassignSelection: vi.fn(), tables: vi.fn(), board: vi.fn(), config: vi.fn(), save: vi.fn() }));
vi.mock("./floor-api", () => ({ getFloorOptions: api.options, getFloorReassignmentOptions: api.reassignOptions, reassignFloorTables: api.reassign, reassignFloorSelection: api.reassignSelection, saveFloorTables: api.tables, getFloorBoard: api.board, getFloorConfig: api.config, saveFloorAction: api.save, floorInputClass: "input" }));
vi.mock("@/modules/identity-access/ui", () => ({ LogoutButton: () => createElement("button", null, "Cerrar sesión") }));
vi.mock("./FloorCanvas", () => ({ FloorCanvas: (props: FloorCanvasProps) => {
  const [pan, setPan] = useState(0);
  return createElement("div", { "data-testid": "table-board" },
    createElement("button", { type: "button", onClick: () => setPan((value) => value + 1) }, "Desplazar plano de prueba"),
    props.onMove && createElement("button", { type: "button", onClick: () => props.onMove?.(props.selectedIds ?? [], { x: 20, y: 10 }) }, "Arrastrar seleccionadas"),
    props.onPlace && createElement("button", { type: "button", onClick: () => props.onPlace?.({ x: 440, y: 380 }, "window") }, "Colocar en el tablero"),
    props.onSelectMany && createElement("button", { type: "button", onClick: (event) => props.onSelectMany?.(props.tables.slice(0, 2).map((table) => table.id), event.shiftKey || event.ctrlKey || event.metaKey) }, "Seleccionar rectángulo de prueba"),
    props.onSelectMany && createElement("button", { type: "button", onClick: () => props.onSelectMany?.([], false) }, "Deseleccionar mesas de prueba"),
    props.onContextMenuSelection && createElement("button", { type: "button", onClick: () => props.onContextMenuSelection?.({ x: 320, y: 260 }), onKeyDown: (event) => { if (event.key === "F10" && event.shiftKey) { event.preventDefault(); props.onContextMenuSelection?.({ x: 320, y: 260 }); } }, onContextMenu: (event) => { event.preventDefault(); props.onContextMenuSelection?.({ x: event.clientX, y: event.clientY }); } }, "Acciones de la selección del plano"),
    (props.joinedGroups ?? []).map((group) => createElement("button", { key: group.id, type: "button", "aria-label": "Grupo del plano " + group.tableIds.join("+"), onClick: (event) => props.onSelectMany?.(group.tableIds, event.shiftKey || event.ctrlKey || event.metaKey), onContextMenu: (event) => { event.preventDefault(); props.onContextMenuGroup?.(group.tableIds, { x: event.clientX, y: event.clientY }); } }, group.label)),
    props.tables.map((table) => createElement("button", { key: table.id, type: "button", "aria-label": `Mesa del plano ${table.id}`, onClick: (event) => props.onSelect?.(table.id, event.shiftKey || event.ctrlKey || event.metaKey), onContextMenu: (event) => { event.preventDefault(); props.onContextMenuTable?.(table.id, { x: event.clientX, y: event.clientY }); } }, table.label)),
    createElement("output", { "data-testid": "table-poses" }, JSON.stringify(props.tables)),
    createElement("output", { "data-testid": "joined-groups" }, JSON.stringify(props.joinedGroups ?? [])),
    createElement("output", { "data-testid": "table-selection" }, JSON.stringify(props.selectedIds ?? [])),
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
const joinedGroups = () => JSON.parse(screen.getByTestId("joined-groups").textContent!) as { tableIds: string[]; label: string }[];
const tableSummary = () => Object.fromEntries([...screen.getByRole("group", { name: "Mesas del salón" }).querySelectorAll("dt")]
  .map((term) => [term.textContent, term.parentElement?.querySelector("dd")?.textContent]));
const selected = () => JSON.parse(screen.getByTestId("table-selection").textContent!) as string[];
type SelectionCommand = { updates: { reservationId: string; expectedRevision: number; expectedAllocationVersion: number; assignment: FloorAssignmentInput }[] };
const selectionCommand = () => api.reassignSelection.mock.calls[0][1] as SelectionCommand;

function selectOnly(id: string) {
  fireEvent.click(screen.getByRole("button", { name: "Deseleccionar mesas de prueba" }));
  fireEvent.click(screen.getByRole("button", { name: `Mesa del plano ${id}` }));
}
function openEditor(id: string, inventory = false) {
  selectOnly(id); fireEvent.click(within(openTable(id)).getByRole("menuitem", { name: "Editar" }));
  const label = poses().find((pose) => pose.id === id)!.label;
  const pane = screen.getByRole("dialog", { name: `Editar mesa ${label}` });
  if (inventory) fireEvent.click(within(pane).getByRole("tab", { name: "Inventario" }));
  return pane;
}
function mockInventorySave() {
  api.tables.mockImplementation(async (_restaurantId: string, command: { tables: FloorRoom["tables"]; combinations: FloorRoom["combinations"] }) => {
    const savedRoom = { ...room, tables: command.tables, combinations: command.combinations, revision: 5 };
    api.options.mockResolvedValue({ ...options(), rooms: [savedRoom], options: buildFloorOptions(savedRoom) });
    api.board.mockResolvedValue({ ...board(), rooms: [savedRoom] }); return { room: savedRoom };
  });
}
function mockSelectionSave(current: FloorBoardView) {
  api.reassignSelection.mockImplementation(async (_restaurantId: string, command: SelectionCommand) => ({ ...current, allocations: current.allocations.map((stored) => {
    const update = command.updates.find((item) => item.reservationId === stored.reservationId);
    return update ? { ...stored, version: stored.version + 1, reservationRevision: (stored.reservationRevision ?? 0) + 1, poses: stored.poses.map((pose) => ({ ...pose, ...update.assignment.customTables?.find((item) => item.tableId === pose.tableId) })) } : stored;
  }) }));
}
function multiPartyBoard() {
  const current = board(); const first = allocation();
  const third = { ...room.tables[0], id: "three", label: "M3", x: 600, y: 260 };
  current.rooms[0].tables.push(third);
  current.allocations = [first, { ...first, id: "allocation-b", reservationId: "reservation-b", customerName: "Otro grupo", version: 5, reservationRevision: 11, capacity: 4,
    poses: [{ ...first.poses[0], tableId: third.id, label: third.label, x: third.x, y: third.y }] }];
  return current;
}

function show(current = board(), readOnly = false) {
  return render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly, canManageWalkIns: true, initialBoard: current }));
}
async function startDraft(readOnly = false, current = board(), count = 2) {
  show(current, readOnly);
  fireEvent.click(screen.getByRole("button", { name: "Atender sin reserva" }));
  fireEvent.click(screen.getByRole("button", { name: "Elegir mesas" }));
  const sector = await screen.findByLabelText("Sector del salón") as HTMLSelectElement;
  await waitFor(() => expect(sector.disabled).toBe(false));
  fireEvent.change(sector, { target: { value: "window" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Cantidad de Cuadrada 80 × 80" }), { target: { value: String(count) } });
  await waitFor(() => expect(poses().filter((pose) => pose.id.startsWith("draft:"))).toHaveLength(count));
}
function openTable(id = "draft:one") {
  fireEvent.contextMenu(screen.getByRole("button", { name: `Mesa del plano ${id}` }), { clientX: 320, clientY: 260 });
  return screen.getByRole("menu");
}
function openGroup(id = "draft:one") { const group = joinedGroups().find((item) => item.tableIds.includes(id))!; fireEvent.contextMenu(screen.getByRole("button", { name: "Grupo del plano " + group.tableIds.join("+") }), { clientX: 320, clientY: 260 }); return screen.getByRole("menu"); }
function openAssemblySettings() {
  const summary = screen.getByText("Ajustes del armado", { selector: "summary" });
  const details = summary.closest("details")!;
  if (!details.open) fireEvent.click(summary);
  return details;
}

describe("table actions on the operational board", () => {
  beforeEach(() => { vi.resetAllMocks(); document.body.style.overflow = ""; api.options.mockResolvedValue(options()); api.board.mockResolvedValue(board()); api.config.mockResolvedValue(config()); });
  afterEach(() => { cleanup(); document.body.style.overflow = ""; vi.restoreAllMocks(); });

  it("keeps draft table arrangements out of the committed physical table counts", async () => {
    await startDraft();
    expect(poses().map((pose) => pose.id)).toEqual(["draft:one", "draft:two"]);
    expect(tableSummary()).toEqual({ Libres: "2", Ocupadas: "0", Activas: "2" });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Cantidad de Cuadrada 80 × 80" }), { target: { value: "1" } });
    await waitFor(() => expect(poses()).toHaveLength(1));
    expect(tableSummary()).toEqual({ Libres: "2", Ocupadas: "0", Activas: "2" });
    expect(api.save).not.toHaveBeenCalled();
  });

  it("selects on left click without opening details and keeps modifiers and marquee in one selection", () => {
    const current = board(); current.allocations = [allocation()]; show(current);
    selectOnly("one"); expect(selected()).toEqual(["one"]); expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mesa del plano two" }), { shiftKey: true }); expect(selected()).toEqual(["one", "two"]);
    fireEvent.click(screen.getByRole("button", { name: "Mesa del plano one" }), { ctrlKey: true }); expect(selected()).toEqual(["two"]);
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar rect\u00E1ngulo de prueba" })); expect(selected()).toEqual(["one", "two"]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("preserves all selected resources on right click and uses that set from a blank-plan action", async () => {
    await startDraft(); const canvas = screen.getByTestId("table-board"); const original = poses();
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    const menu = openTable(); expect(selected()).toEqual(["draft:one", "draft:two"]);
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Editar", "Separar"]);
    expect(screen.getByRole("menu", { name: "Acciones de 2 mesas seleccionadas" })).toBe(menu);
    fireEvent.keyDown(menu, { key: "Escape" });
    fireEvent.contextMenu(screen.getByRole("button", { name: "Acciones de la selecci\u00F3n del plano" }), { clientX: 10, clientY: 20 });
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Editar" }));
    const pane = screen.getByRole("dialog", { name: "Editar selecci\u00F3n (2 mesas)" });
    expect(within(pane).getByRole("tab", { name: "Ubicaci\u00F3n" }).getAttribute("aria-selected")).toBe("true");
    expect(poses()).toEqual(original); expect(screen.getByTestId("table-board")).toBe(canvas); expect(screen.getByTestId("table-pan").textContent).toBe("1"); expect(api.save).not.toHaveBeenCalled();
  });

  it("selects the complete joined group from its outline using the same editor", async () => {
    await startDraft(); fireEvent.click(screen.getByRole("button", { name: "Deseleccionar mesas de prueba" })); expect(selected()).toEqual([]);
    const menu = openGroup(); expect(selected()).toEqual(["draft:one", "draft:two"]);
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Editar" }));
    expect(screen.getByRole("dialog", { name: "Editar selecci\u00F3n (2 mesas)" })).toBeTruthy(); expect(screen.queryByRole("dialog", { name: "Editar mesa M1" })).toBeNull();
  });

  it("opens the selection menu from the keyboard and restores focus without blocking the board", async () => {
    await startDraft(); selectOnly("draft:one");
    const trigger = screen.getByRole("button", { name: "Acciones de la selección del plano" });
    trigger.focus(); fireEvent.keyDown(trigger, { key: "F10", shiftKey: true });
    const menu = screen.getByRole("menu");
    expect(document.activeElement).toBe(within(menu).getByRole("menuitem", { name: "Editar" }));
    fireEvent.keyDown(menu, { key: "End" }); expect(document.activeElement).toBe(within(menu).getByRole("menuitem", { name: "Separar" }));
    fireEvent.keyDown(menu, { key: "Escape" }); expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger); expect(document.body.style.overflow).not.toBe("hidden");
    expect(screen.getAllByTestId("table-board")).toHaveLength(1);
  });

  it("keeps the existing selection when right click lands on an unselected resource", () => {
    const current = multiPartyBoard(); show(current); selectOnly("one");
    fireEvent.click(screen.getByRole("button", { name: "Mesa del plano two" }), { shiftKey: true });
    const menu = openTable("three"); expect(selected()).toEqual(["one", "two"]);
    expect(screen.getByRole("menu", { name: "Acciones de 2 mesas seleccionadas" })).toBe(menu);
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Editar" }));
    expect(screen.getByRole("dialog", { name: "Editar selección (2 mesas)" })).toBeTruthy();
  });

  it("edits one draft pose while preserving its companion and the main board", async () => {
    await startDraft(); const canvas = screen.getByTestId("table-board"); fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    const originalSecond = poses().find((pose) => pose.id === "draft:two"); const pane = openEditor("draft:one");
    fireEvent.change(within(pane).getByLabelText("Centro Y"), { target: { value: "380" } }); fireEvent.change(within(pane).getByLabelText("Rotaci\u00F3n"), { target: { value: "90" } });
    fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    expect(poses().find((pose) => pose.id === "draft:one")).toMatchObject({ y: 380, rotation: 90 }); expect(poses().find((pose) => pose.id === "draft:two")).toEqual(originalSecond);
    expect(screen.getByTestId("table-board")).toBe(canvas); expect(screen.getByTestId("table-pan").textContent).toBe("1"); expect(api.reassignSelection).not.toHaveBeenCalled(); expect(api.tables).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  });

  it("moves and rotates a draft group locally before occupying physical resources", async () => {
    await startDraft(); const original = poses(); fireEvent.click(within(openGroup()).getByRole("menuitem", { name: "Editar" }));
    const pane = screen.getByRole("dialog", { name: "Editar selecci\u00F3n (2 mesas)" });
    fireEvent.change(within(pane).getByLabelText("Desplazar Y"), { target: { value: "30" } }); fireEvent.change(within(pane).getByLabelText("Girar alrededor del centro"), { target: { value: "90" } });
    fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" })); const center = { x: (original[0].x + original[1].x) / 2, y: original[0].y };
    for (const pose of original) expect(poses().find((candidate) => candidate.id === pose.id)).toMatchObject({ x: center.x - (pose.y - center.y), y: center.y + (pose.x - center.x) + 30, rotation: 90 });
    expect(joinedGroups()).toHaveLength(1); expect(api.reassignSelection).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  });

  it("saves inventory separately with the room revision and retains other tables and positions", async () => {
    mockInventorySave(); await startDraft(); const original = poses(); const pane = openEditor("draft:one", true);
    expect(within(pane).queryByLabelText("Centro Y")).toBeNull(); fireEvent.change(within(pane).getByLabelText("N\u00FAmero o nombre"), { target: { value: "Ventana 1" } });
    fireEvent.change(within(pane).getByLabelText("Forma"), { target: { value: "RECTANGLE" } }); fireEvent.change(within(pane).getByLabelText("Alto"), { target: { value: "60" } });
    fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(api.tables).toHaveBeenCalledWith("restaurant", { roomId: "room", expectedRevision: 4, tables: expect.arrayContaining([expect.objectContaining({ id: "one", label: "Ventana 1", shape: "RECTANGLE", width: 80, height: 60 }), room.tables[1]]), combinations: [] }));
    await waitFor(() => expect(pane.isConnected).toBe(false)); expect(poses()[0]).toMatchObject({ label: "Ventana 1", shape: "RECTANGLE", x: original[0].x, y: original[0].y, rotation: original[0].rotation });
    expect(poses()[1]).toEqual(original[1]); expect(api.reassignSelection).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  });

  it("keeps staged inventory values and the arrangement when a protected write fails", async () => {
    api.tables.mockRejectedValue(new Error("La mesa M1 tiene reservas futuras.")); await startDraft(); const original = poses(); const pane = openEditor("draft:one", true);
    fireEvent.change(within(pane).getByLabelText("Forma"), { target: { value: "CIRCLE" } }); fireEvent.change(within(pane).getByLabelText("Di\u00E1metro"), { target: { value: "70" } });
    fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" })); expect((await within(pane).findByRole("alert")).textContent).toContain("reservas futuras");
    expect((within(pane).getByLabelText("Di\u00E1metro") as HTMLInputElement).value).toBe("70"); expect(poses()).toEqual(original);
    fireEvent.click(within(pane).getByRole("button", { name: "Cancelar" })); expect(pane.isConnected).toBe(false); expect(poses()).toEqual(original);
  });

  it("lets staff edit inventory with advanced reservation capacity without changing positions", async () => {
    mockInventorySave(); await startDraft(true); const original = poses(); const pane = openEditor("draft:one", true);
    fireEvent.click(within(pane).getByText("Opciones avanzadas")); expect(within(pane).getByLabelText("Capacidad para reservas")).toBeTruthy();
    fireEvent.change(within(pane).getByLabelText("N\u00FAmero o nombre"), { target: { value: "Ventana del mozo" } }); fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(pane.isConnected).toBe(false)); expect(poses()[0]).toMatchObject({ label: "Ventana del mozo", x: original[0].x, y: original[0].y });
    expect(api.tables).toHaveBeenCalledWith("restaurant", expect.objectContaining({ roomId: "room", expectedRevision: 4 })); expect(api.reassignSelection).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  });

  it("merges bulk inventory changes into the selected stock and preserves the unselected physical table", async () => {
    const current = multiPartyBoard(); api.board.mockResolvedValue(current);
    api.tables.mockImplementation(async (_restaurantId: string, command: { tables: FloorRoom["tables"] }) => {
      const savedRoom = { ...current.rooms[0], revision: 5, tables: command.tables };
      api.board.mockResolvedValue({ ...current, rooms: [savedRoom] }); return { room: savedRoom };
    });
    show(current); selectOnly("one"); fireEvent.click(screen.getByRole("button", { name: "Mesa del plano three" }), { shiftKey: true });
    fireEvent.click(within(openTable("one")).getByRole("menuitem", { name: "Editar" }));
    const pane = screen.getByRole("dialog", { name: "Editar selección (2 mesas)" });
    fireEvent.click(within(pane).getByRole("tab", { name: "Inventario" }));
    fireEvent.change(within(pane).getByLabelText("Ancho"), { target: { value: "70" } });
    fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(api.tables).toHaveBeenCalledOnce());
    const saved = api.tables.mock.calls[0][1].tables as FloorRoom["tables"];
    expect(saved).toEqual([{ ...current.rooms[0].tables[0], width: 70, height: 70 }, current.rooms[0].tables[1], { ...current.rooms[0].tables[2], width: 70, height: 70 }]);
    expect(saved.map((table) => table.id)).toEqual(["one", "two", "three"]);
    expect(api.reassignSelection).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
    await waitFor(() => expect(pane.isConnected).toBe(false));
  });

  it.each(["ADMIN", "PUBLIC", "WALK_IN"])("applies a committed %s group with both revisions in one batch", async (source) => {
    const current = board(); const stored = allocation(source); current.allocations = [stored]; mockSelectionSave(current); show(current, true);
    const canvas = screen.getByTestId("table-board"); fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    fireEvent.click(within(openGroup("one")).getByRole("menuitem", { name: "Editar" })); const pane = screen.getByRole("dialog", { name: "Editar selecci\u00F3n (2 mesas)" });
    fireEvent.change(within(pane).getByLabelText("Girar alrededor del centro"), { target: { value: "90" } }); fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(api.reassignSelection).toHaveBeenCalledOnce());
    expect(selectionCommand()).toMatchObject({ updates: [{ reservationId: stored.reservationId, expectedRevision: 7, expectedAllocationVersion: 2, assignment: { roomId: room.id, expectedRoomRevision: 4, customTables: [expect.objectContaining({ tableId: "one", rotation: 90 }), expect.objectContaining({ tableId: "two", rotation: 90 })] } }] });
    expect(api.reassignSelection.mock.calls[0][2]).toBe(current.at);
    await waitFor(() => expect(pane.isConnected).toBe(false)); expect(poses().map((pose) => pose.id)).toEqual(["one", "two"]); expect(poses().map((pose) => pose.rotation)).toEqual([90, 90]);
    expect(screen.queryByRole("button", { name: "Guardar armado" })).toBeNull(); expect(api.reassign).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: "Administrar" })).toBeNull(); expect(screen.getByTestId("table-board")).toBe(canvas); expect(screen.getByTestId("table-pan").textContent).toBe("1");
  });

  it("keeps one committed resource independent from its joined companion", async () => {
    const current = board(); current.allocations = [allocation()]; mockSelectionSave(current); show(current); const original = poses(); const pane = openEditor("one");
    fireEvent.change(within(pane).getByLabelText("Centro Y"), { target: { value: "420" } }); fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(api.reassignSelection).toHaveBeenCalledOnce()); expect(selectionCommand().updates[0].assignment.customTables).toEqual([expect.objectContaining({ tableId: "one", y: 420 }), expect.objectContaining({ tableId: "two", x: original[1].x, y: original[1].y, rotation: original[1].rotation })]);
    await waitFor(() => expect(pane.isConnected).toBe(false)); expect(poses()[1]).toEqual(original[1]);
  });

  it("drags only the selected committed resource without opening an assembly or editor", async () => {
    const current = board(); current.allocations = [allocation()]; mockSelectionSave(current); show(current);
    const original = poses(); selectOnly("two");
    fireEvent.click(screen.getByRole("button", { name: "Arrastrar seleccionadas" }));
    await waitFor(() => expect(api.reassignSelection).toHaveBeenCalledOnce());
    expect(selectionCommand().updates[0].assignment.customTables).toEqual([
      expect.objectContaining({ tableId: "one", x: original[0].x, y: original[0].y }),
      expect.objectContaining({ tableId: "two", x: original[1].x + 20, y: original[1].y + 10 }),
    ]);
    expect(screen.queryByRole("dialog")).toBeNull(); expect(screen.queryByRole("complementary", { name: "Armar mesas en sala" })).toBeNull();
  });

  it("applies across reservations without merging identities or changing unselected tables", async () => {
    const current = multiPartyBoard(); mockSelectionSave(current); show(current); const original = poses(); selectOnly("one"); fireEvent.click(screen.getByRole("button", { name: "Mesa del plano three" }), { shiftKey: true });
    const menu = openTable("one"); expect(selected()).toEqual(["one", "three"]); fireEvent.click(within(menu).getByRole("menuitem", { name: "Editar" })); const pane = screen.getByRole("dialog", { name: "Editar selecci\u00F3n (2 mesas)" });
    fireEvent.change(within(pane).getByLabelText("Desplazar Y"), { target: { value: "100" } }); fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(api.reassignSelection).toHaveBeenCalledOnce()); const updates = selectionCommand().updates;
    expect(updates.map((update) => update.reservationId)).toEqual(["reservation", "reservation-b"]);
    expect(updates[0].assignment.customTables).toEqual([expect.objectContaining({ tableId: "one", y: 400 }), expect.objectContaining({ tableId: "two", y: 300 })]); expect(updates[1].assignment.customTables).toEqual([expect.objectContaining({ tableId: "three", y: 360 })]);
    await waitFor(() => expect(pane.isConnected).toBe(false)); expect(poses().find((pose) => pose.id === "two")).toEqual(original.find((pose) => pose.id === "two")); expect(joinedGroups()).toEqual([]);
    expect(api.reassign).not.toHaveBeenCalled(); expect(api.tables).not.toHaveBeenCalled();
  });

  it("keeps every party, pending field and viewport on a batch failure and retries once", async () => {
    const current = multiPartyBoard(); mockSelectionSave(current); api.reassignSelection.mockRejectedValueOnce(new Error("El segundo grupo cambi\u00F3 en otra pantalla.")); show(current);
    const canvas = screen.getByTestId("table-board"); const original = poses(); fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    selectOnly("one"); fireEvent.click(screen.getByRole("button", { name: "Mesa del plano three" }), { ctrlKey: true }); fireEvent.click(within(openTable("three")).getByRole("menuitem", { name: "Editar" })); const pane = screen.getByRole("dialog", { name: "Editar selecci\u00F3n (2 mesas)" });
    fireEvent.change(within(pane).getByLabelText("Desplazar Y"), { target: { value: "30" } }); fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    expect((await within(pane).findByRole("alert")).textContent).toContain("segundo grupo"); expect(poses()).toEqual(original); expect((within(pane).getByLabelText("Desplazar Y") as HTMLInputElement).value).toBe("30"); expect(selected()).toEqual(["one", "three"]);
    expect(screen.getByTestId("table-board")).toBe(canvas); expect(screen.getByTestId("table-pan").textContent).toBe("1");
    fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" })); await waitFor(() => expect(api.reassignSelection).toHaveBeenCalledTimes(2)); await waitFor(() => expect(pane.isConnected).toBe(false)); expect(api.reassign).not.toHaveBeenCalled();
  });

  it("keeps a local draft unchanged when a mixed committed and draft selection fails to save", async () => {
    const current = multiPartyBoard(); current.allocations = [current.allocations[0]];
    const availability: FloorOptionsView = { ...options(), rooms: current.rooms, options: buildFloorOptions(current.rooms[0]).map((option) => option.id === "table:three" ? option : { ...option, available: false, resourceAvailable: false }) };
    api.options.mockResolvedValue(availability); api.board.mockResolvedValue(current);
    api.reassignSelection.mockRejectedValue(new Error("La reserva cambió; la selección no se guardó."));
    await startDraft(true, current, 1);
    const local = openEditor("draft:three");
    fireEvent.change(within(local).getByLabelText("Centro X"), { target: { value: "600" } });
    fireEvent.change(within(local).getByLabelText("Centro Y"), { target: { value: "400" } });
    fireEvent.click(within(local).getByRole("button", { name: "Aplicar cambios" }));
    expect(local.isConnected).toBe(false);
    const original = poses(); fireEvent.click(screen.getByRole("button", { name: "Mesa del plano one" }), { shiftKey: true });
    expect(selected()).toEqual(["draft:three", "one"]);
    fireEvent.click(within(openTable("one")).getByRole("menuitem", { name: "Editar" }));
    const pane = screen.getByRole("dialog", { name: "Editar selección (2 mesas)" });
    fireEvent.change(within(pane).getByLabelText("Desplazar Y"), { target: { value: "20" } });
    fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    expect((await within(pane).findByRole("alert")).textContent).toContain("selección no se guardó");
    expect(api.reassignSelection).toHaveBeenCalledOnce(); expect(poses()).toEqual(original);
    expect((within(pane).getByLabelText("Desplazar Y") as HTMLInputElement).value).toBe("20");
    expect(api.save).not.toHaveBeenCalled();
  });

  it.each(["allocation", "pose", "inventory"])("preserves selection on refresh and rejects a stale %s snapshot", async (changed) => {
    const scheduled = vi.spyOn(window, "setInterval"); vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const current = multiPartyBoard(); api.board.mockResolvedValue(current); show(current); selectOnly("one"); fireEvent.click(screen.getByRole("button", { name: "Mesa del plano three" }), { shiftKey: true });
    fireEvent.click(within(openTable("one")).getByRole("menuitem", { name: "Editar" })); const pane = screen.getByRole("dialog", { name: "Editar selecci\u00F3n (2 mesas)" }); fireEvent.change(within(pane).getByLabelText("Desplazar Y"), { target: { value: "20" } });
    const updated = structuredClone(current);
    if (changed === "allocation") updated.allocations[1].version += 1;
    else if (changed === "pose") updated.allocations[1].poses[0].y += 10;
    else { updated.rooms[0].tables[0].width += 5; updated.rooms[0].tables[0].height += 5; }
    api.board.mockResolvedValue(updated); const poll = scheduled.mock.calls.find((call) => call[1] === 15000)?.[0] as () => void; await act(async () => { poll(); });
    expect(selected()).toEqual(["one", "three"]); expect(screen.getByRole("dialog", { name: "Editar selecci\u00F3n (2 mesas)" })).toBe(pane); fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    expect((await within(pane).findByRole("alert")).textContent).toMatch(/cambi|actualiz|abr/i); expect(api.reassignSelection).not.toHaveBeenCalled(); expect((within(pane).getByLabelText("Desplazar Y") as HTMLInputElement).value).toBe("20");
    const cancel = within(pane).getByRole("button", { name: "Cancelar" }) as HTMLButtonElement;
    expect(cancel.disabled).toBe(false); fireEvent.click(cancel); expect(pane.isConnected).toBe(false);
  });

  it("keeps invalid bulk position values and the viewport available for correction", async () => {
    await startDraft(); const original = poses(); const canvas = screen.getByTestId("table-board");
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    fireEvent.click(within(openGroup()).getByRole("menuitem", { name: "Editar" }));
    const pane = screen.getByRole("dialog", { name: "Editar selección (2 mesas)" });
    fireEvent.change(within(pane).getByLabelText("Desplazar X"), { target: { value: "900" } });
    fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    expect((await within(pane).findByRole("alert")).textContent).toMatch(/fuera|sector|salón/i);
    expect((within(pane).getByLabelText("Desplazar X") as HTMLInputElement).value).toBe("900");
    expect(poses()).toEqual(original); expect(screen.getByTestId("table-board")).toBe(canvas); expect(screen.getByTestId("table-pan").textContent).toBe("1");
    expect(api.reassignSelection).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  });

  it("guards a committed batch against repeated applies while saving", async () => {
    const current = board(); current.allocations = [allocation()];
    let finish: (value: FloorBoardView) => void = () => {};
    api.reassignSelection.mockImplementation(() => new Promise<FloorBoardView>((resolve) => { finish = resolve; }));
    show(current); const pane = openEditor("one");
    fireEvent.change(within(pane).getByLabelText("Centro Y"), { target: { value: "420" } });
    fireEvent.click(within(pane).getByRole("button", { name: "Aplicar cambios" }));
    await waitFor(() => expect(api.reassignSelection).toHaveBeenCalledOnce());
    const saving = within(pane).getByRole("button", { name: "Guardando…" }) as HTMLButtonElement;
    expect(saving.disabled).toBe(true); fireEvent.click(saving);
    expect(api.reassignSelection).toHaveBeenCalledOnce();
    expect((within(pane).getByLabelText("Centro Y") as HTMLInputElement).value).toBe("420");
    await act(async () => { finish(current); });
    await waitFor(() => expect(pane.isConnected).toBe(false));
  });

  it("separates the committed selection and disables separation after it is already apart", async () => {
    const current = board(); current.allocations = [allocation()]; mockSelectionSave(current); show(current); fireEvent.click(within(openGroup("one")).getByRole("menuitem", { name: "Separar" }));
    await waitFor(() => expect(api.reassignSelection).toHaveBeenCalledOnce()); await waitFor(() => expect(joinedGroups()).toEqual([])); const menu = openTable("one");
    expect((within(menu).getByRole("menuitem", { name: "Separar" }) as HTMLButtonElement).disabled).toBe(true); expect(selectionCommand().updates).toHaveLength(1); expect(api.reassign).not.toHaveBeenCalled();
  });

  it.each([false, true])("separates tables on the main board and saves them with rejoin=%s", async (rejoin) => {
    api.save.mockResolvedValue({});
    await startDraft(true);
    const canvas = screen.getByTestId("table-board");
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    expect(joinedGroups()).toEqual([expect.objectContaining({ tableIds: ["draft:one", "draft:two"] })]);
    fireEvent.click(screen.getByRole("button", { name: "Separar seleccionadas" }));
    expect(joinedGroups()).toEqual([]);
    openAssemblySettings();
    expect((screen.getByLabelText("Lugares útiles") as HTMLInputElement).value).toBe("8");
    expect(screen.queryByRole("dialog")).toBeNull();
    if (rejoin) {
      fireEvent.click(screen.getByRole("button", { name: "Unir seleccionadas" }));
      expect(joinedGroups()).toEqual([expect.objectContaining({ tableIds: ["draft:one", "draft:two"] })]);
      expect((screen.getByLabelText("Lugares útiles") as HTMLInputElement).value).toBe("6");
    }
    const visible = poses();
    const save = screen.getByRole("button", { name: "Armar y ocupar mesas" }) as HTMLButtonElement;
    await waitFor(() => expect(save.disabled).toBe(false));
    fireEvent.click(save);
    await waitFor(() => expect(api.save).toHaveBeenCalledOnce());
    expect(api.save.mock.calls[0][1]).toMatchObject({ action: "walk-in", assignment: { capacity: rejoin ? 6 : 8, customTables: visible.map((pose) => ({ tableId: pose.id.replace(/^draft:/, ""), x: pose.x, y: pose.y, rotation: pose.rotation })) } });
    expect(screen.getAllByTestId("table-board")).toHaveLength(1);
    expect(screen.getByTestId("table-board")).toBe(canvas);
    expect(screen.getByTestId("table-pan").textContent).toBe("1");
  });

  it("moves and rotates only the selected pair while preserving another visual group and the viewport", async () => {
    const value = options();
    value.rooms[0].tables.push({ ...room.tables[0], id: "three", label: "M3" }, { ...room.tables[0], id: "four", label: "M4" });
    value.options = buildFloorOptions(value.rooms[0]); api.options.mockResolvedValue(value);
    await startDraft(true);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Cantidad de Cuadrada 80 × 80" }), { target: { value: "4" } });
    selectOnly("draft:one");
    for (const id of ["draft:two", "draft:three", "draft:four"]) fireEvent.click(screen.getByRole("button", { name: `Mesa del plano ${id}` }), { shiftKey: true });
    const canvas = screen.getByTestId("table-board");
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    fireEvent.click(screen.getByRole("button", { name: "Separar seleccionadas" }));
    const toggle = (label: string) => fireEvent.click(screen.getByRole("button", { name: `Seleccionar mesa ${label}` }));
    toggle("M3"); toggle("M4");
    fireEvent.click(screen.getByRole("button", { name: "Unir seleccionadas" }));
    toggle("M1"); toggle("M2"); toggle("M3"); toggle("M4");
    fireEvent.click(screen.getByRole("button", { name: "Unir seleccionadas" }));
    expect(joinedGroups()).toHaveLength(2);
    const fixed = poses().filter((pose) => ["draft:one", "draft:two"].includes(pose.id));
    const moving = poses().filter((pose) => ["draft:three", "draft:four"].includes(pose.id));
    fireEvent.click(screen.getByRole("button", { name: "Arrastrar seleccionadas" }));
    expect(poses()).toEqual(expect.arrayContaining(fixed));
    for (const pose of moving) expect(poses().find((candidate) => candidate.id === pose.id)).toMatchObject({ x: pose.x + 20, y: pose.y + 10 });
    fireEvent.click(screen.getByRole("button", { name: "Acciones de la selección del plano" }));
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Editar" }));
    const editor = screen.getByRole("dialog", { name: "Editar selección (2 mesas)" });
    fireEvent.change(within(editor).getByLabelText("Girar alrededor del centro"), { target: { value: "90" } });
    fireEvent.click(within(editor).getByRole("button", { name: "Aplicar cambios" }));
    expect(poses()).toEqual(expect.arrayContaining(fixed));
    for (const id of ["draft:three", "draft:four"]) expect(poses().find((pose) => pose.id === id)?.rotation).toBe(90);
    expect(joinedGroups()).toHaveLength(2);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("table-board")).toBe(canvas);
    expect(screen.getByTestId("table-pan").textContent).toBe("1");
  });

  it("keeps touching tables from different reservations out of a shared visual group", () => {
    const current = board(); const first = allocation();
    current.allocations = [{ ...first, poses: [first.poses[0]] }, { ...first, id: "other-allocation", reservationId: "other-reservation", customerName: "Otro grupo", poses: [first.poses[1]] }];
    show(current, true);
    expect(poses()).toHaveLength(2);
    expect(poses()[1].x - poses()[0].x).toBe(80);
    expect(joinedGroups()).toEqual([]);
  });

  it("closes the assembly palette without leaving a dock or discarding the board draft", async () => {
    await startDraft(true); const canvas = screen.getByTestId("table-board");
    const palette = screen.getByRole("complementary", {name: "Armar mesas en sala"}); const staged = poses();
    const selection = selected(); fireEvent.click(screen.getByRole("button", { name: "Desplazar plano de prueba" }));
    fireEvent.click(within(palette).getByRole("button", {name: "Cerrar ventana"}));
    expect(palette.isConnected).toBe(false); expect(screen.queryByRole("button", {name: /Abrir ventana/})).toBeNull();
    expect(poses()).toEqual(staged); expect(screen.getByTestId("table-board")).toBe(canvas);
    fireEvent.click(screen.getByRole("button", { name: "Armar mesas" }));
    const reopened = screen.getByRole("complementary", { name: "Armar mesas en sala" });
    expect(reopened).not.toBe(palette);
    expect((within(reopened).getByRole("spinbutton", { name: "Cantidad de Cuadrada 80 × 80" }) as HTMLInputElement).value).toBe("2");
    expect(poses()).toEqual(staged); expect(selected()).toEqual(selection);
    expect(screen.getByTestId("table-board")).toBe(canvas); expect(screen.getByTestId("table-pan").textContent).toBe("1");
    expect(screen.queryByRole("dialog", { name: "Atender sin reserva" })).toBeNull();
    fireEvent.click(within(reopened).getByRole("button", { name: "Cerrar ventana" }));
    const groupMenu = openGroup();
    fireEvent.click(within(groupMenu).getByRole("menuitem", {name: "Editar"}));
    expect(screen.queryByRole("complementary", {name: "Armar mesas en sala"})).toBeNull();
    expect(screen.getByRole("dialog", {name: "Editar selección (2 mesas)"})).toBeTruthy();
    expect(poses()).toEqual(staged); expect(api.save).not.toHaveBeenCalled(); expect(api.reassign).not.toHaveBeenCalled();
  });

  it("restores the same window with selection, expanded settings, values and scroll intact", async () => {
    await startDraft(true);
    const floating = screen.getByRole("complementary", { name: "Armar mesas en sala" });
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar mesa M2" }));
    const details = openAssemblySettings();
    const capacity = within(floating).getByLabelText("Lugares útiles") as HTMLInputElement;
    fireEvent.change(capacity, { target: { value: "5" } });
    const scroller = details.closest<HTMLElement>(".overflow-y-auto")!;
    scroller.scrollTop = 140;
    const staged = poses();
    fireEvent.click(within(floating).getByRole("button", { name: "Minimizar ventana" }));
    fireEvent.click(within(floating).getByRole("button", { name: "Restaurar ventana" }));
    expect(screen.getByRole("complementary", { name: "Armar mesas en sala" })).toBe(floating);
    expect(details.open).toBe(true);
    expect(within(floating).getByLabelText("Lugares útiles")).toBe(capacity);
    expect(capacity.value).toBe("5");
    expect(scroller.scrollTop).toBe(140);
    expect(within(floating).getByRole("button", { name: "Seleccionar mesa M1" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(floating).getByRole("button", { name: "Seleccionar mesa M2" }).getAttribute("aria-pressed")).toBe("false");
    expect(poses()).toEqual(staged);
    expect(api.save).not.toHaveBeenCalled();
  });

  it("minimizes the window while its table selection remains movable on the main board", async () => {
    await startDraft(true);
    const floating = screen.getByRole("complementary", { name: "Armar mesas en sala" });
    const original = poses();
    fireEvent.click(within(floating).getByRole("button", { name: "Minimizar ventana" }));
    expect(screen.getByRole("complementary", { name: "Armar mesas en sala" })).toBe(floating);
    expect(within(floating).queryByRole("spinbutton", { name: "Cantidad de Cuadrada 80 × 80" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Arrastrar seleccionadas" }));
    for (const pose of original) expect(poses().find((item) => item.id === pose.id)).toMatchObject({ x: pose.x + 20, y: pose.y + 10 });
    fireEvent.click(within(floating).getByRole("button", { name: "Restaurar ventana" }));
    expect((within(floating).getByRole("spinbutton", { name: "Cantidad de Cuadrada 80 × 80" }) as HTMLInputElement).value).toBe("2");
    expect(screen.getAllByTestId("table-board")).toHaveLength(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(api.save).not.toHaveBeenCalled();
  });

  it("retains table edits when minimized and discards only that editor on X", async () => {
    await startDraft(true); const staged = poses();
    const pane = openEditor("draft:one", true);
    const name = within(pane).getByLabelText("N\u00FAmero o nombre") as HTMLInputElement;
    fireEvent.change(name, {target: {value: "Sin aplicar"}}); const scroller = name.closest<HTMLElement>(".overflow-y-auto")!; scroller.scrollTop = 130;
    fireEvent.click(within(pane).getByRole("button", {name: "Minimizar ventana"}));
    fireEvent.click(within(pane).getByRole("button", {name: "Restaurar ventana"}));
    expect(name.value).toBe("Sin aplicar"); expect(scroller.scrollTop).toBe(130);
    fireEvent.click(within(pane).getByRole("button", {name: "Cerrar ventana"})); expect(pane.isConnected).toBe(false);
    expect(screen.getByRole("complementary", {name: "Armar mesas en sala"})).toBeTruthy();
    expect(screen.queryByRole("button", {name: /Abrir ventana/})).toBeNull();
    const fresh = openEditor("draft:one", true); expect(fresh).not.toBe(pane);
    expect((within(fresh).getByLabelText("N\u00FAmero o nombre") as HTMLInputElement).value).toBe("M1");
    expect(poses()).toEqual(staged); expect(api.tables).not.toHaveBeenCalled();
  });

  it("keeps two physical table editors independent while the assembly and another tool remain open", async () => {
    await startDraft(true);
    const canvas = screen.getByTestId("table-board");
    const assemblyWindow = screen.getByRole("complementary", { name: "Armar mesas en sala" });
    const first = openEditor("draft:one", true);
    const firstName = within(first).getByLabelText("Número o nombre") as HTMLInputElement;
    fireEvent.change(firstName, { target: { value: "Ventana 1" } });
    fireEvent.click(within(openTable("draft:one")).getByRole("menuitem", { name: "Editar" }));
    expect(screen.getByRole("dialog", { name: "Editar mesa M1" })).toBe(first);
    expect(firstName.value).toBe("Ventana 1");
    const second = openEditor("draft:two", true);
    const secondName = within(second).getByLabelText("Número o nombre") as HTMLInputElement;
    fireEvent.change(secondName, { target: { value: "Ventana 2" } });
    fireEvent.click(screen.getByRole("button", { name: "Fecha y hora" }));
    const scheduleWindow = screen.getByRole("dialog", { name: "Fecha y hora" });
    expect(firstName.value).toBe("Ventana 1");
    expect(secondName.value).toBe("Ventana 2");
    expect(screen.getByRole("complementary", { name: "Armar mesas en sala" })).toBe(assemblyWindow);
    expect(screen.getAllByRole("dialog")).toHaveLength(3);

    fireEvent.click(within(first).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Editar mesa M1" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Editar mesa M2" })).toBe(second);
    expect(secondName.value).toBe("Ventana 2");
    fireEvent.click(within(second).getByRole("button", { name: "Cerrar ventana" }));
    expect(screen.queryByRole("dialog", { name: "Editar mesa M2" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Fecha y hora" })).toBe(scheduleWindow);
    expect(screen.getByRole("complementary", { name: "Armar mesas en sala" })).toBe(assemblyWindow);
    expect(second.isConnected).toBe(false);
    const fresh = openEditor("draft:two", true); expect(fresh).not.toBe(second);
    expect((within(fresh).getByLabelText("Número o nombre") as HTMLInputElement).value).toBe("M2");
    expect(screen.getByTestId("table-board")).toBe(canvas);
    expect(api.tables).not.toHaveBeenCalled(); expect(api.reassign).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  });

  it("keeps staged inventory when minimized and confirms explicit X discard without closing other tools", async () => {
    show(board(), true); const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", {name: "Inventario de mesas"}));
    const pane = screen.getByRole("dialog", {name: "Inventario de mesas"});
    fireEvent.change(within(pane).getByLabelText("Cantidad a agregar"), {target: {value: "3"}});
    fireEvent.click(within(pane).getByRole("button", {name: "Agregar al inventario"}));
    const scroller = pane.querySelector<HTMLElement>(".overflow-y-auto")!; scroller.scrollTop = 175;
    fireEvent.click(screen.getByRole("button", {name: "Fecha y hora"})); const schedule = screen.getByRole("dialog", {name: "Fecha y hora"});
    expect(confirm).not.toHaveBeenCalled(); expect(tableSummary()).toEqual({Libres: "2", Ocupadas: "0", Activas: "2"});
    fireEvent.click(within(pane).getByRole("button", {name: "Minimizar ventana"})); fireEvent.click(screen.getByRole("button", {name: "Inventario de mesas"}));
    expect(within(pane).getByRole("heading", {name: "Inventario de mesas \u00B7 5"})).toBeTruthy(); expect(scroller.scrollTop).toBe(175);
    fireEvent.click(within(pane).getByRole("button", {name: "Cerrar ventana"})); expect(confirm).toHaveBeenCalledOnce(); expect(pane.isConnected).toBe(true);
    confirm.mockReturnValue(true); fireEvent.click(within(pane).getByRole("button", {name: "Cerrar ventana"}));
    expect(pane.isConnected).toBe(false); expect(screen.getByRole("dialog", {name: "Fecha y hora"})).toBe(schedule);
    expect(screen.queryByRole("button", {name: /Abrir ventana/})).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Inventario de mesas"})); const fresh = screen.getByRole("dialog", {name: "Inventario de mesas"});
    expect(fresh).not.toBe(pane); expect(within(fresh).getByRole("heading", {name: "Inventario de mesas \u00B7 2"})).toBeTruthy(); expect(api.tables).not.toHaveBeenCalled();
  });

});
