/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { buildFloorOptions, validateAssembly, type FloorAssignmentInput, type FloorBoardView, type FloorOptionsQuery, type FloorOptionsView, type FloorPose, type FloorRoom } from "../contracts";

const api = vi.hoisted(() => ({ options: vi.fn(), board: vi.fn(), config: vi.fn(), save: vi.fn(), reassignSelection: vi.fn() }));
vi.mock("./floor-api", () => ({ getFloorOptions: api.options, getFloorBoard: api.board, getFloorConfig: api.config, saveFloorAction: api.save, reassignFloorSelection: api.reassignSelection, floorInputClass: "input" }));
vi.mock("@/modules/identity-access/ui", () => ({ LogoutButton: ({className, disabled}: {className?: string; disabled?: boolean}) => createElement("button", {className, disabled}, "Cerrar sesión") }));
vi.mock("./FloorCanvas", () => ({ FloorCanvas: (props: {
  onMove?: (ids: string[], delta: { x: number; y: number }) => void;
  onPlace?: (point: { x: number; y: number }, locationId?: string) => void;
  onSelect?: (id: string, additive: boolean) => void;
  onContextMenuTable?: (id: string, point: { x: number; y: number }) => void;
  room?: {id: string}; selectedIds?: string[]; tables: { id: string; x?: number; y?: number; rotation?: number }[];
}) => {
  const [pan, setPan] = useState(0);
  return createElement("div", {"data-testid": "floor-canvas", "data-room-id": props.room?.id},
    createElement("button", { type: "button", onClick: () => props.onMove?.(props.selectedIds ?? [], { x: 20, y: 10 }) }, "Mover unión"),
    props.onPlace && createElement("button", {type: "button", onClick: () => props.onPlace?.({x: 500, y: 350}, "window")}, "Ubicar armado"),
    createElement("button", {type: "button", onClick: () => setPan((current) => current + 1)}, "Desplazar tablero"),
    props.onSelect && props.tables.map((table) => createElement("button", { key: table.id, type: "button", "aria-label": `Mesa para editar ${table.id}`, onClick: () => props.onSelect?.(table.id, false), onContextMenu: (event) => { event.preventDefault(); props.onContextMenuTable?.(table.id, { x: event.clientX, y: event.clientY }); } }, table.id)),
    createElement("output", {"data-testid": "canvas-pan"}, String(pan)),
    createElement("output", {"data-testid": "canvas-poses"}, JSON.stringify(props.tables)),
    createElement("output", { "data-testid": "canvas-tables" }, JSON.stringify(props.tables.map((table) => table.id))));
} }));

import { FloorAssignmentPicker } from "./FloorAssignmentPicker";
import { FloorBoardScreen } from "./FloorBoardScreen";

const room: FloorRoom = { id: "room", restaurantId: "restaurant", name: "Salón principal", width: 800, height: 600, revision: 4,
  active: true, fixtures: [], locations: [{id: "window", name: "Ventana", x: 400, y: 300, width: 600, height: 400, rotation: 0, active: true}], tables: [
    { id: "one", label: "1", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 200, y: 200, rotation: 0, active: true },
    { id: "two", label: "2", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 400, y: 200, rotation: 0, active: true },
  ], combinations: [{ id: "joined", name: "Mesas 1 + 2", capacity: 6, active: true, members: [{ tableId: "one", x: -40, y: 0, rotation: 0 }, { tableId: "two", x: 40, y: 0, rotation: 0 }] }] };
const interval = { serviceStartAt: "2026-11-01T23:00:00Z", serviceEndAt: "2026-11-02T01:00:00Z", blockedFrom: "2026-11-01T21:00:00Z", blockedUntil: "2026-11-02T01:00:00Z", timeZone: "America/Argentina/Buenos_Aires" };
const query: FloorOptionsQuery = { date: "2026-11-01", time: "20:00", partySize: 6 };
const options = (): FloorOptionsView => ({ rooms: [structuredClone(room)], options: buildFloorOptions(room), interval });
const board = (): FloorBoardView => ({ restaurantId: "restaurant", restaurantName: "Bistró", timeZone: interval.timeZone, enabled: true, at: interval.serviceStartAt, rooms: [structuredClone(room)], allocations: [], updatedAt: interval.serviceStartAt });

function Picker({ input = query, walkIn = false }: { input?: FloorOptionsQuery; walkIn?: boolean }) {
  const [value, setValue] = useState<FloorAssignmentInput | null>(null);
  return createElement("div", null, createElement(FloorAssignmentPicker, { restaurantId: "restaurant", query: input, value, onChange: setValue, walkIn }), createElement("output", { "data-testid": "assignment" }, JSON.stringify(value)));
}
function selectQuantity(quantity: number, type = "Cuadrada 80 × 80") {
  fireEvent.change(screen.getByRole("spinbutton", {name: `Cantidad de ${type}`}), {target: {value: String(quantity)}});
}
function positionBoardDraft() {
  const summary = screen.getByText("Ajustes del armado", { selector: "summary" });
  const details = summary.closest("details")!; const wasOpen = details.open;
  if (!wasOpen) fireEvent.click(summary);
  fireEvent.change(screen.getByLabelText("Centro X"), { target: { value: "500" } });
  fireEvent.change(screen.getByLabelText("Centro Y"), { target: { value: "350" } });
  if (!wasOpen) fireEvent.click(summary);
}
const assignment = (): FloorAssignmentInput | null => JSON.parse(screen.getByTestId("assignment").textContent!);

describe("floor assignment interactions", () => {
  beforeEach(() => { vi.resetAllMocks(); document.body.style.overflow = ""; api.options.mockResolvedValue(options()); api.board.mockResolvedValue(board()); });
  afterEach(() => { cleanup(); document.body.style.overflow = ""; vi.useRealTimers(); vi.restoreAllMocks(); });

  it("requires an explicit available choice and sends the room revision", async () => {
    const value = options();
    value.options[0].available = false; value.options[0].conflict = "Mesa ocupada";
    api.options.mockResolvedValue(value);
    render(createElement(Picker));
    await screen.findByLabelText("Sector del salón");
    fireEvent.change(screen.getByLabelText("Sector del salón"), { target: { value: "window" } });
    const quantity = screen.getByRole("spinbutton", {name: "Cantidad de Cuadrada 80 × 80"}) as HTMLInputElement;
    expect(quantity.max).toBe("1");
    expect(screen.queryByRole("checkbox", {name: /Mesa 1/})).toBeNull();
    expect(screen.getByTestId("assignment").textContent).toBe("null");
    fireEvent.click(screen.getByText("Armados predefinidos"));
    fireEvent.click(screen.getByRole("button", { name: /Mesas 1 \+ 2/ }));
    expect(JSON.parse(screen.getByTestId("assignment").textContent!)).toMatchObject({ roomId: "room", locationId: "window", optionId: "combination:joined", expectedRoomRevision: 4 });
  });

  it("moves and rotates the selected combination as one unit", async () => {
    render(createElement(Picker));
    fireEvent.change(await screen.findByLabelText("Sector del salón"), { target: { value: "window" } });
    fireEvent.click(screen.getByText("Armados predefinidos"));
    fireEvent.click(await screen.findByRole("button", { name: /Mesas 1 \+ 2/ }));
    fireEvent.click(screen.getByRole("button", { name: "Mover unión" }));
    fireEvent.click(screen.getByRole("button", { name: "Girar unión 90°" }));
    expect(JSON.parse(screen.getByTestId("assignment").textContent!)).toMatchObject({ x: 420, y: 310, rotation: 90 });
  });

  it("supports positioning a selection with numeric fields without dragging", async () => {
    render(createElement(Picker));
    fireEvent.change(await screen.findByLabelText("Sector del salón"), { target: { value: "window" } });
    fireEvent.click(screen.getByText("Armados predefinidos"));
    fireEvent.click(await screen.findByRole("button", { name: /Mesas 1 \+ 2/ }));
    fireEvent.change(screen.getByLabelText("Centro X"), { target: { value: "480" } });
    fireEvent.change(screen.getByLabelText("Centro Y"), { target: { value: "320" } });
    expect(JSON.parse(screen.getByTestId("assignment").textContent!)).toMatchObject({ x: 480, y: 320, retainExisting: false });
  });

  it("preserves a previously positioned combination when editing a reservation", async () => {
    const value = options();
    value.currentAllocation = { ...interval, id: "allocation", reservationId: "reservation", roomId: "room", combinationId: "joined", capacity: 6, customerName: "Ana", partySize: 6, date: query.date, time: query.time, notes: "", code: "BOOK", releasedAt: null, version: 1,
      poses: value.options[2].poses.map((pose, index) => ({ ...pose, x: 500, y: index === 0 ? 310 : 390, rotation: 90 })) };
    api.options.mockResolvedValue(value);
    render(createElement(Picker, { input: { ...query, excludeReservationId: "reservation" } }));
    await waitFor(() => expect(JSON.parse(screen.getByTestId("assignment").textContent!)).toMatchObject({ optionId: "combination:joined", x: 500, y: 350, retainExisting: true }));
    expect(screen.getByText(/Conservar asignación actual/)).toBeTruthy();
  });

  it("invalidates a choice after reservation details change", async () => {
    const view = render(createElement(Picker));
    fireEvent.change(await screen.findByLabelText("Sector del salón"), { target: { value: "window" } });
    fireEvent.click(screen.getByText("Armados predefinidos"));
    fireEvent.click(await screen.findByRole("button", { name: /Mesas 1 \+ 2/ }));
    view.rerender(createElement(Picker, { input: { ...query, time: "22:00" } }));
    await waitFor(() => expect(screen.getByTestId("assignment").textContent).toBe("null"));
    expect(api.options).toHaveBeenLastCalledWith("restaurant", expect.objectContaining({ time: "22:00" }), expect.any(AbortSignal), undefined);
  });

  it("keeps a stored layout when its combination is no longer in the catalog", async () => {
    const value = options();
    const stored = value.options[2].poses;
    value.options = value.options.slice(0, 2);
    value.currentAllocation = { ...interval, id: "allocation", reservationId: "reservation", roomId: "room", combinationId: "archived", capacity: 6, customerName: "Ana", partySize: 2, date: query.date, time: query.time, notes: "", code: "BOOK", releasedAt: null, version: 1, poses: stored };
    api.options.mockResolvedValue(value);
    render(createElement(Picker, { input: { ...query, partySize: 2, excludeReservationId: "reservation" } }));
    await screen.findByText(/Conservar asignación actual/);
    fireEvent.click(screen.getByRole("button", { name: "Mover unión" }));
    expect(JSON.parse(screen.getByTestId("assignment").textContent!)).toMatchObject({ optionId: "combination:archived", retainExisting: true });
    fireEvent.change(screen.getByLabelText("Sector del salón"), { target: { value: "window" } });
    selectQuantity(1);
    expect(JSON.parse(screen.getByTestId("assignment").textContent!)).toMatchObject({ optionId: "custom", retainExisting: false });
  });

  it("can retry a failed availability request without losing the reservation form", async () => {
    api.options.mockRejectedValueOnce(new Error("Sin conexión"));
    render(createElement(Picker));
    fireEvent.click(await screen.findByRole("button", { name: "Volver a consultar" }));
    expect(await screen.findByLabelText("Sector del salón")).toBeTruthy();
  });

  it("keeps idle inventory off the plan and joins arbitrary tables with explicit useful capacity", async () => {
    const value = options();
    value.options = value.options.slice(0, 2).map((option) => ({ ...option, available: false, resourceAvailable: true }));
    api.options.mockResolvedValue(value);
    render(createElement(Picker));
    fireEvent.change(await screen.findByLabelText("Sector del salón"), { target: { value: "window" } });
    await waitFor(() => expect(screen.getByTestId("canvas-tables").textContent).toBe("[]"));
    selectQuantity(2);
    const chosen = assignment();
    expect(chosen).toMatchObject({ optionId: "custom", locationId: "window", capacity: 6, customTables: [{tableId: "one", x: 360, y: 300}, {tableId: "two", x: 440, y: 300}] });
    expect(new Set(chosen!.customTables!.map((pose) => pose.tableId)).size).toBe(2);
    expect(screen.getByTestId("canvas-tables").textContent).toBe('["one","two"]');
    fireEvent.change(screen.getByLabelText("Lugares útiles"), { target: { value: "7" } });
    expect(JSON.parse(screen.getByTestId("assignment").textContent!).capacity).toBe(7);
  });

  it("keeps fractional table edges joined when moving and rotating a grouped selection", async () => {
    const value = options();
    value.rooms[0].tables = value.rooms[0].tables.map((table) => ({...table, width: 80.5, height: 80.5}));
    value.rooms[0].combinations = [];
    value.options = buildFloorOptions(value.rooms[0]);
    api.options.mockResolvedValue(value);
    render(createElement(Picker));
    fireEvent.change(await screen.findByLabelText("Sector del salón"), {target: {value: "window"}});
    selectQuantity(2, "Cuadrada 80,5 × 80,5");
    const poses = (): FloorPose[] => JSON.parse(screen.getByTestId("canvas-poses").textContent!);
    expect(assignment()!.customTables).toEqual([{tableId: "one", x: 359.75, y: 300, rotation: 0}, {tableId: "two", x: 440.25, y: 300, rotation: 0}]);
    expect(validateAssembly(poses())).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Mover unión"}));
    expect(assignment()!.customTables).toEqual([{tableId: "one", x: 379.75, y: 310, rotation: 0}, {tableId: "two", x: 460.25, y: 310, rotation: 0}]);
    expect(validateAssembly(poses())).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Girar unión 90°"}));
    expect(assignment()!.customTables).toEqual([{tableId: "one", x: 420, y: 269.75, rotation: 90}, {tableId: "two", x: 420, y: 350.25, rotation: 90}]);
    expect(validateAssembly(poses())).toBeNull();
    expect(poses().map((pose) => pose.tableId)).toEqual(["one", "two"]);
    expect((screen.getByRole("spinbutton", {name: "Cantidad de Cuadrada 80,5 × 80,5"}) as HTMLInputElement).value).toBe("2");
  });

  it("groups equal sizes without losing different capacities and keeps other types and existing poses when quantities change", async () => {
    const value = options();
    const current = value.rooms[0];
    current.combinations = [];
    current.tables[1].capacity = 6;
    current.tables.push({...current.tables[0], id: "large", label: "Grande", width: 100, height: 100, capacity: 8});
    value.options = buildFloorOptions(current);
    api.options.mockResolvedValue(value);
    render(createElement(Picker));
    fireEvent.change(await screen.findByLabelText("Sector del salón"), {target: {value: "window"}});
    expect(screen.getAllByRole("spinbutton", {name: /^Cantidad de /})).toHaveLength(2);
    expect(screen.queryByRole("checkbox")).toBeNull();
    selectQuantity(1);
    fireEvent.change(screen.getByLabelText("Centro X"), {target: {value: "460"}});
    fireEvent.change(screen.getByLabelText("Centro Y"), {target: {value: "330"}});
    fireEvent.click(screen.getByRole("button", {name: "Girar unión 90°"}));
    const first = assignment()!.customTables![0];
    expect(first).toMatchObject({tableId: "one", x: 460, y: 330, rotation: 90});
    selectQuantity(1, "Cuadrada 100 × 100");
    expect(assignment()!.customTables).toContainEqual(first);
    const large = assignment()!.customTables!.find((pose) => pose.tableId === "large")!;
    selectQuantity(2);
    const added = assignment()!;
    expect(added.customTables).toEqual(expect.arrayContaining([first, large, expect.objectContaining({tableId: "two"})]));
    expect(new Set(added.customTables!.map((pose) => pose.tableId)).size).toBe(3);
    expect(added.capacity).toBe(14);
    const drawn = JSON.parse(screen.getByTestId("canvas-poses").textContent!) as {id: string; capacity: number}[];
    expect(drawn.find((pose) => pose.id === "one")?.capacity).toBe(4);
    expect(drawn.find((pose) => pose.id === "two")?.capacity).toBe(6);
    selectQuantity(1);
    expect(assignment()!.customTables).toEqual(expect.arrayContaining([first, large]));
    expect(assignment()!.customTables).toHaveLength(2);
    selectQuantity(0, "Cuadrada 100 × 100");
    expect(assignment()!.customTables).toEqual([first]);
  });

  it("caps a type at its free physical inventory and never selects an occupied table", async () => {
    const value = options();
    value.options = value.options.map((option) => option.id === "table:one" ? {...option, available: false, resourceAvailable: false, conflict: "Ocupada por otra reserva"} : option);
    api.options.mockResolvedValue(value);
    render(createElement(Picker));
    fireEvent.change(await screen.findByLabelText("Sector del salón"), {target: {value: "window"}});
    expect((screen.getByRole("spinbutton", {name: "Cantidad de Cuadrada 80 × 80"}) as HTMLInputElement).max).toBe("1");
    selectQuantity(2);
    expect(assignment()).toBeNull();
    selectQuantity(1);
    expect(assignment()!.customTables).toEqual([expect.objectContaining({tableId: "two"})]);
    expect((screen.getByRole("spinbutton", {name: "Cantidad de Cuadrada 80 × 80"}) as HTMLInputElement).value).toBe("1");
    selectQuantity(0);
    expect(assignment()).toBeNull();
  });

  it("requires a new selection when a historical allocation has been released", async () => {
    const value = options();
    value.currentAllocation = { ...interval, id: "allocation", reservationId: "reservation", roomId: "room", combinationId: "joined", capacity: 6, customerName: "Ana", partySize: 6, date: query.date, time: query.time, notes: "", code: "BOOK", releasedAt: interval.blockedFrom, version: 1, poses: value.options[2].poses };
    api.options.mockResolvedValue(value);
    render(createElement(Picker));
    await screen.findByLabelText("Sector del salón");
    expect(screen.queryByText(/Conservar asignación actual/)).toBeNull();
    expect(screen.getByTestId("assignment").textContent).toBe("null");
  });

  it("keeps a walk-in assembly when board polling crosses into the next minute", async () => {
    const view = render(createElement(Picker, {walkIn: true}));
    fireEvent.change(await screen.findByLabelText("Sector del salón"), {target: {value: "window"}});
    selectQuantity(1);
    const assignment = screen.getByTestId("assignment").textContent;
    const requests = api.options.mock.calls.length;
    view.rerender(createElement(Picker, {walkIn: true, input: {...query, time: "20:01"}}));
    expect(screen.getByTestId("assignment").textContent).toBe(assignment);
    expect(api.options).toHaveBeenCalledTimes(requests);
  });

  it("lets a waiter create a walk-in without exposing administrative links", async () => {
    api.save.mockResolvedValue({});
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    expect(screen.queryByRole("link", {name: "Administrar"})).toBeNull();
    expect(screen.getByRole("button", {name: "Cerrar sesión"})).toBeTruthy();
    expect(screen.queryByRole("button", {name: "Menú de sala"})).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", {name: "Desplazar tablero"}));
    const opener = await screen.findByRole("button", {name: "Atender sin reserva"});
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog", {name: "Atender sin reserva"})).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), {target: {value: "Grupo de Ana"}});
    expect(screen.queryByLabelText("Sector del salón")).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Elegir mesas"}));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByRole("complementary", {name: "Armar mesas en sala"})).toBeTruthy();
    expect(screen.getAllByTestId("floor-canvas")).toHaveLength(1);
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
    expect((screen.getByRole("button", {name: "Fecha y hora"}) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", {name: "Reservas"}) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(await screen.findByLabelText("Sector del salón"), {target: {value: "window"}});
    selectQuantity(1);
    positionBoardDraft();
    fireEvent.click(screen.getByRole("button", {name: "Mover unión"}));
    fireEvent.click(screen.getByText("Ajustes del armado", {selector: "summary"}));
    fireEvent.click(screen.getByRole("button", {name: "Girar armado 90°"}));
    api.board.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", {name: "Armar y ocupar mesas"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("restaurant", expect.objectContaining({action: "walk-in", customerName: "Grupo de Ana", partySize: 2, durationMinutes: 120, assignment: expect.objectContaining({locationId: "window", optionId: "custom", x: 520, y: 360, rotation: 90, customTables: [{tableId: "one", x: 520, y: 360, rotation: 90}]})})));
    expect(api.options).toHaveBeenCalledWith("restaurant", expect.anything(), expect.any(AbortSignal), 120);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((screen.getByRole("button", {name: "Atender sin reserva"}) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
  });

  it("assembles grouped quantities from distinct free tables while preserving another type and the board viewport", async () => {
    const value = options();
    const current = value.rooms[0];
    current.combinations = [];
    current.tables.push({...current.tables[0], id: "three", label: "3"}, {...current.tables[0], id: "large", label: "Grande", width: 100, height: 100, capacity: 6});
    value.options = buildFloorOptions(current).map((option) => option.id === "table:one" ? {...option, available: false, resourceAvailable: false, conflict: "Ocupada"} : option);
    api.options.mockResolvedValue(value);
    const currentBoard = board(); currentBoard.rooms = [structuredClone(current)]; api.board.mockResolvedValue(currentBoard);
    api.save.mockResolvedValue({});
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", {name: "Desplazar tablero"}));
    fireEvent.click(screen.getByRole("button", {name: "Atender sin reserva"}));
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), {target: {value: "Grupo por tipos"}});
    fireEvent.click(screen.getByRole("button", {name: "Elegir mesas"}));
    fireEvent.change(await screen.findByLabelText("Sector del salón"), {target: {value: "window"}});
    expect((screen.getByRole("spinbutton", {name: "Cantidad de Cuadrada 80 × 80"}) as HTMLInputElement).max).toBe("2");
    selectQuantity(2);
    positionBoardDraft();
    fireEvent.click(screen.getByRole("button", {name: "Mover unión"}));
    const poses = () => JSON.parse(screen.getByTestId("canvas-poses").textContent!) as {id: string; x: number; y: number; rotation: number}[];
    const positioned = poses();
    expect(positioned.map((pose) => pose.id)).toEqual(["draft:two", "draft:three"]);
    selectQuantity(1, "Cuadrada 100 × 100");
    expect(poses()).toEqual(expect.arrayContaining(positioned));
    const large = poses().find((pose) => pose.id === "draft:large")!;
    selectQuantity(1);
    expect(poses()).toEqual(expect.arrayContaining([positioned[0], large]));
    expect(poses()).toHaveLength(2);
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByRole("button", {name: "Armar y ocupar mesas"}) as HTMLButtonElement).disabled).toBe(false);
    const adjacentX = positioned[0].x + 40 + 50;
    const target = screen.getByRole("button", { name: "Mesa para editar draft:large" });
    fireEvent.click(target); fireEvent.contextMenu(target, { clientX: 300, clientY: 240 });
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Editar" }));
    const editor = screen.getByRole("dialog", { name: "Editar mesa Grande" });
    fireEvent.change(within(editor).getByLabelText("Centro X"), {target: {value: String(adjacentX)}});
    fireEvent.click(within(editor).getByRole("button", { name: "Aplicar cambios" }));
    expect(editor.isConnected).toBe(false);
    fireEvent.click(screen.getByRole("button", {name: "Armar y ocupar mesas"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    const command = api.save.mock.calls[0][1];
    expect(command).toMatchObject({action: "walk-in", assignment: {expectedRoomRevision: 4, customTables: [expect.objectContaining({tableId: "two", x: positioned[0].x, y: positioned[0].y}), expect.objectContaining({tableId: "large", x: adjacentX, y: large.y})]}});
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
  });

  it("offers release only for walk-ins in the current operational view", async () => {
    const value = board();
    value.allocations = [{ ...interval, id: "allocation", reservationId: "reservation", roomId: "room", combinationId: null, capacity: 4, customerName: "Ana", partySize: 2, date: query.date, time: query.time, notes: "", code: "BOOK", releasedAt: null, version: 1, source: "WALK_IN", reservationRevision: 3, poses: options().options[0].poses }];
    value.allocations.push({...value.allocations[0], id: "admin-allocation", reservationId: "admin-reservation", source: "ADMIN", customerName: "Reserva confirmada", poses: options().options[1].poses});
    api.board.mockResolvedValue(value); api.save.mockResolvedValue({});
    const nativeConfirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", {name: "Fecha y hora"}));
    const scheduleWindow = screen.getByRole("dialog", {name: "Fecha y hora"});
    fireEvent.change(within(scheduleWindow).getByLabelText("Hora"), {target: {value: "21:15"}});
    fireEvent.click(screen.getByRole("button", {name: /^Reservas/}));
    const reservations = screen.getByRole("dialog", {name: "Reservas de Salón principal"});
    expect(screen.getAllByRole("button", {name: "Liberar mesas"})).toHaveLength(1);
    fireEvent.click(await screen.findByRole("button", {name: "Liberar mesas"}));
    const confirmation = screen.getByRole("dialog", {name: "Liberar mesas"});
    expect(screen.getByRole("dialog", {name: "Reservas de Salón principal"})).toBe(reservations);
    expect(screen.getByRole("dialog", {name: "Fecha y hora"})).toBe(scheduleWindow);
    expect((within(scheduleWindow).getByLabelText("Hora") as HTMLInputElement).value).toBe("21:15");
    expect(confirmation.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(within(confirmation).getByRole("button", {name: "Cancelar"}));
    expect(screen.getByRole("dialog", {name: "Reservas de Salón principal"})).toBe(reservations);
    expect(reservations.getAttribute("aria-modal")).toBe("false");
    expect(document.body.style.overflow).toBe("");
    fireEvent.click(within(reservations).getByRole("button", {name: "Liberar mesas"}));
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog", {name: "Liberar mesas"})).getByRole("button", {name: "Confirmar liberación"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("restaurant", {action: "release-walk-in", reservationId: "reservation", expectedRevision: 3}));
    expect(nativeConfirm).not.toHaveBeenCalled();
  });

  it("polls the read-only board and refreshes when focus returns", async () => {
    const scheduled = vi.spyOn(window, "setInterval");
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true }));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "Reservas de Salón principal" })).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: /^Reservas/}));
    expect(screen.getByRole("heading", { name: "Reservas de Salón principal" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Administrar" })).toBeNull();
    const initialCalls = api.board.mock.calls.length;
    expect(scheduled).toHaveBeenCalledWith(expect.any(Function), 15_000);
    await act(async () => { (scheduled.mock.calls[0][0] as () => void)(); });
    expect(api.board.mock.calls.length).toBe(initialCalls + 1);
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(api.board.mock.calls.length).toBe(initialCalls + 2);
    visibility.mockReturnValue("hidden");
    await act(async () => { (scheduled.mock.calls[0][0] as () => void)(); window.dispatchEvent(new Event("focus")); });
    expect(api.board.mock.calls.length).toBe(initialCalls + 2);
  });

  it("keeps date and time controls in a dialog and fetches only after applying its draft", async () => {
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    expect(screen.queryByLabelText("Fecha")).toBeNull();
    expect(screen.queryByLabelText("Hora")).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Fecha y hora"}));
    const initialCalls = api.board.mock.calls.length;
    fireEvent.change(screen.getByLabelText("Fecha"), {target: {value: "2099-12-01"}});
    fireEvent.change(screen.getByLabelText("Hora"), {target: {value: "20:30"}});
    await act(async () => { await Promise.resolve(); });
    expect(api.board).toHaveBeenCalledTimes(initialCalls);
    fireEvent.click(screen.getByRole("button", {name: "Ver este horario"}));
    await waitFor(() => expect(api.board).toHaveBeenLastCalledWith("restaurant", "2099-12-01T23:30:00Z", expect.any(AbortSignal)));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes an ordinary tool with Escape without leaving a dock or locking scroll", async () => {
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistr\u00F3", readOnly: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled()); document.body.style.overflow = "clip";
    fireEvent.click(screen.getByRole("button", {name: "Fecha y hora"}));
    const dialog = screen.getByRole("dialog", {name: "Fecha y hora"});
    const original = (within(dialog).getByLabelText("Hora") as HTMLInputElement).value;
    fireEvent.change(within(dialog).getByLabelText("Hora"), {target: {value: "22:15"}});
    fireEvent.keyDown(dialog, {key: "Escape"}); expect(dialog.isConnected).toBe(false);
    expect(screen.queryByRole("button", {name: /Abrir ventana/})).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Fecha y hora"}));
    const reopened = screen.getByRole("dialog", {name: "Fecha y hora"}); expect(reopened).not.toBe(dialog);
    expect((within(reopened).getByLabelText("Hora") as HTMLInputElement).value).toBe(original);
    expect(document.body.style.overflow).toBe("clip");
  });

  it("keeps ordinary tools nonmodal so keyboard users can focus and use the main board", async () => {
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", {name: "Fecha y hora"}));
    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    const pan = screen.getByRole("button", {name: "Desplazar tablero"});
    pan.focus();
    expect(document.activeElement).toBe(pan);
    fireEvent.click(pan);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
    expect(screen.getByRole("dialog", {name: "Fecha y hora"})).toBe(dialog);
    expect(dialog.getAttribute("aria-modal")).toBe("false");
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("keeps independent tool drafts, scroll and geometry while restoring only the requested window", async () => {
    render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true, initialBoard: board() }));
    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", { name: "Atender sin reserva" }));
    const arrival = screen.getByRole("dialog", { name: "Atender sin reserva" });
    const name = within(arrival).getByLabelText("Nombre del grupo") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Julia y familia" } });
    fireEvent.change(within(arrival).getByLabelText("Personas"), { target: { value: "6" } });
    const scroller = name.closest<HTMLElement>(".overflow-y-auto")!;
    scroller.scrollTop = 115;
    fireEvent.keyDown(within(arrival).getByRole("button", { name: "Mover ventana Atender sin reserva" }), { key: "ArrowLeft" });
    fireEvent.keyDown(within(arrival).getByRole("button", { name: "Cambiar tamaño de ventana" }), { key: "ArrowLeft" });
    const geometry = { left: arrival.style.left, top: arrival.style.top, width: arrival.style.width, height: arrival.style.height };

    fireEvent.click(screen.getByRole("button", { name: "Fecha y hora" }));
    const scheduleWindow = screen.getByRole("dialog", { name: "Fecha y hora" });
    fireEvent.change(within(scheduleWindow).getByLabelText("Fecha"), { target: { value: "2099-12-01" } });
    fireEvent.change(within(scheduleWindow).getByLabelText("Hora"), { target: { value: "22:15" } });
    fireEvent.click(screen.getByRole("button", { name: "Reservas" }));
    const reservations = screen.getByRole("dialog", { name: "Reservas de Salón principal" });
    expect(screen.getAllByRole("dialog")).toHaveLength(3);
    expect(name.value).toBe("Julia y familia");
    expect(scroller.scrollTop).toBe(115);
    expect(within(arrival).getByLabelText("Nombre del grupo")).toBe(name);

    fireEvent.click(within(arrival).getByRole("button", { name: "Minimizar ventana" }));
    expect(within(arrival).queryByRole("textbox", { name: "Nombre del grupo" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Fecha y hora" })).toBe(scheduleWindow);
    expect(screen.getByRole("dialog", { name: "Reservas de Salón principal" })).toBe(reservations);
    fireEvent.click(screen.getByRole("button", { name: "Atender sin reserva" }));
    expect(within(arrival).getByLabelText("Nombre del grupo")).toBe(name);
    expect((within(arrival).getByLabelText("Personas") as HTMLInputElement).value).toBe("6");
    expect({ left: arrival.style.left, top: arrival.style.top, width: arrival.style.width, height: arrival.style.height }).toEqual(geometry);
    expect(scroller.scrollTop).toBe(115);

    fireEvent.click(within(scheduleWindow).getByRole("button", { name: "Minimizar ventana" }));
    expect(within(scheduleWindow).getByRole("button", { name: "Restaurar ventana" })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Atender sin reserva" })).toBe(arrival);
    expect(screen.getByRole("dialog", { name: "Reservas de Salón principal" })).toBe(reservations);
    fireEvent.click(screen.getByRole("button", { name: "Fecha y hora" }));
    expect(screen.getByRole("dialog", { name: "Fecha y hora" })).toBe(scheduleWindow);
    expect((within(scheduleWindow).getByLabelText("Fecha") as HTMLInputElement).value).toBe("2099-12-01");
    expect((within(scheduleWindow).getByLabelText("Hora") as HTMLInputElement).value).toBe("22:15");
    fireEvent.click(within(arrival).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Atender sin reserva" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Fecha y hora" })).toBe(scheduleWindow);
    expect(screen.getByRole("dialog", { name: "Reservas de Salón principal" })).toBe(reservations);
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(api.save).not.toHaveBeenCalled();
  });

  it("promotes a tool on pointer or keyboard focus while keeping every tool below confirmation overlays", async () => {
    render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true, initialBoard: board() }));
    fireEvent.click(screen.getByRole("button", { name: "Atender sin reserva" }));
    const arrival = screen.getByRole("dialog", { name: "Atender sin reserva" });
    fireEvent.click(screen.getByRole("button", { name: "Fecha y hora" }));
    const scheduleWindow = screen.getByRole("dialog", { name: "Fecha y hora" });
    const layer = (element: HTMLElement) => Number(element.style.zIndex);
    expect(layer(scheduleWindow)).toBeGreaterThan(layer(arrival));
    fireEvent.pointerDown(within(arrival).getByLabelText("Nombre del grupo"));
    expect(layer(arrival)).toBeGreaterThan(layer(scheduleWindow));
    fireEvent.focus(within(scheduleWindow).getByLabelText("Hora"));
    expect(layer(scheduleWindow)).toBeGreaterThan(layer(arrival));
    for (const tool of [arrival, scheduleWindow]) expect(layer(tool)).toBeLessThan(50);
    expect(arrival.getAttribute("aria-modal")).toBe("false");
    expect(scheduleWindow.getAttribute("aria-modal")).toBe("false");
  });

  it("keeps separate reservation detail windows and restores the same reservation without replacing another", () => {
    const value = board();
    value.allocations = options().options.slice(0, 2).map((option, index) => ({ ...interval,
      id: `allocation-${index}`, reservationId: `reservation-${index}`, roomId: "room", combinationId: null,
      capacity: 4, customerName: index === 0 ? "Ana" : "Bruno", partySize: 2, date: query.date, time: query.time,
      notes: index === 0 ? "Silla para bebé" : "Junto a la ventana", code: `BOOK-${index}`, releasedAt: null, version: 1, poses: option.poses,
    }));
    render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, initialBoard: value }));
    fireEvent.click(screen.getByRole("button", { name: "Reservas" }));
    const reservations = screen.getByRole("dialog", { name: "Reservas de Salón principal" });
    const details = within(reservations).getAllByRole("button", { name: "Ver detalle" });
    fireEvent.click(details[0]);
    const ana = screen.getByRole("dialog", { name: "Detalle de la reserva" });
    fireEvent.click(details[1]);
    const bruno = screen.getAllByRole("dialog", { name: "Detalle de la reserva" }).find((window) => window !== ana)!;
    expect(within(ana).getByRole("heading", { name: "Ana" })).toBeTruthy();
    expect(within(bruno).getByRole("heading", { name: "Bruno" })).toBeTruthy();
    expect(within(ana).getByText("Silla para bebé")).toBeTruthy();
    expect(within(bruno).getByText("Junto a la ventana")).toBeTruthy();
    fireEvent.click(within(ana).getByRole("button", { name: "Cerrar ventana" }));
    expect(screen.getByRole("dialog", { name: "Detalle de la reserva" })).toBe(bruno);
    expect(screen.getByRole("dialog", { name: "Reservas de Salón principal" })).toBe(reservations);
    fireEvent.click(details[0]);
    expect(screen.getAllByRole("dialog", { name: "Detalle de la reserva" })).toHaveLength(2);
    const reopened = screen.getAllByRole("dialog", { name: "Detalle de la reserva" }).find((pane) => pane !== bruno)!;
    expect(ana.isConnected).toBe(false); expect(within(reopened).getByRole("heading", { name: "Ana" })).toBeTruthy();
    expect(Number(reopened.style.zIndex)).toBeGreaterThan(Number(bruno.style.zIndex));
  });

  it("minimizes a walk-in draft without losing data and discards only that window on X", async () => {
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistr\u00F3", readOnly: true, canManageWalkIns: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled()); const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", {name: "Atender sin reserva"}));
    const dialog = screen.getByRole("dialog", {name: "Atender sin reserva"});
    fireEvent.change(within(dialog).getByLabelText("Nombre del grupo"), {target: {value: "Julia y familia"}});
    fireEvent.change(within(dialog).getByLabelText("Personas"), {target: {value: "6"}});
    const scroller = dialog.querySelector<HTMLElement>(".overflow-y-auto")!; scroller.scrollTop = 110;
    fireEvent.click(within(dialog).getByRole("button", {name: "Minimizar ventana"}));
    fireEvent.click(screen.getByRole("button", {name: "Desplazar tablero"}));
    fireEvent.click(screen.getByRole("button", {name: "Atender sin reserva"}));
    expect(screen.getByRole("dialog", {name: "Atender sin reserva"})).toBe(dialog);
    expect((within(dialog).getByLabelText("Personas") as HTMLInputElement).value).toBe("6"); expect(scroller.scrollTop).toBe(110);
    fireEvent.click(screen.getByRole("button", {name: "Fecha y hora"})); const schedule = screen.getByRole("dialog", {name: "Fecha y hora"});
    fireEvent.click(within(dialog).getByRole("button", {name: "Cerrar ventana"})); expect(dialog.isConnected).toBe(false);
    expect(screen.getByRole("dialog", {name: "Fecha y hora"})).toBe(schedule); expect(screen.queryByRole("button", {name: /Abrir ventana/})).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Atender sin reserva"}));
    expect((within(screen.getByRole("dialog", {name: "Atender sin reserva"})).getByLabelText("Nombre del grupo") as HTMLInputElement).value).toBe("");
    expect(screen.getByTestId("floor-canvas")).toBe(canvas); expect(api.save).not.toHaveBeenCalled();
  });

  it("preserves walk-in details while the room updates in the background", async () => {
    const scheduled = vi.spyOn(window, "setInterval");
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    api.save.mockResolvedValue({});
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", {name: "Desplazar tablero"}));
    fireEvent.click(screen.getByRole("button", {name: "Atender sin reserva"}));
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), {target: {value: "Grupo de Julia"}});
    fireEvent.change(screen.getByLabelText("Personas"), {target: {value: "6"}});
    fireEvent.change(screen.getByLabelText("Estadía prevista (minutos)"), {target: {value: "90"}});
    fireEvent.change(screen.getByLabelText("Notas de atención"), {target: {value: "Cerca de la ventana"}});
    const next = board(); next.at = "2026-11-01T23:01:00Z";
    api.board.mockResolvedValue(next);
    const initialCalls = api.board.mock.calls.length;
    await act(async () => { (scheduled.mock.calls[0][0] as () => void)(); });
    expect(api.board).toHaveBeenCalledTimes(initialCalls + 1);
    expect((screen.getByLabelText("Nombre del grupo") as HTMLInputElement).value).toBe("Grupo de Julia");
    expect((screen.getByLabelText("Personas") as HTMLInputElement).value).toBe("6");
    expect((screen.getByLabelText("Estadía prevista (minutos)") as HTMLInputElement).value).toBe("90");
    expect((screen.getByLabelText("Notas de atención") as HTMLTextAreaElement).value).toBe("Cerca de la ventana");
    fireEvent.click(screen.getByRole("button", {name: "Elegir mesas"}));
    expect(screen.queryByRole("dialog")).toBeNull();
    const sector = await screen.findByRole("combobox", {name: "Sector del salón"}) as HTMLSelectElement;
    await waitFor(() => {
      expect(sector.disabled).toBe(false);
      expect(within(sector).getByRole("option", {name: "Ventana"}).getAttribute("value")).toBe("window");
    });
    fireEvent.change(sector, {target: {value: "window"}});
    await screen.findByRole("spinbutton", {name: "Cantidad de Cuadrada 80 × 80"});
    selectQuantity(2);
    positionBoardDraft();
    fireEvent.click(screen.getByRole("button", {name: "Mover unión"}));
    const positioned = screen.getByTestId("canvas-poses").textContent;
    const refreshed = board(); refreshed.at = "2026-11-01T23:02:00Z";
    api.board.mockResolvedValue(refreshed);
    await act(async () => { (scheduled.mock.calls[0][0] as () => void)(); });
    expect(screen.getByTestId("canvas-poses").textContent).toBe(positioned);
    const assemblyPanel = screen.getByRole("complementary", {name: "Armar mesas en sala"});
    const refreshBoard = screen.getAllByRole("button", {name: "Actualizar"}).find((button) => !assemblyPanel.contains(button));
    fireEvent.click(refreshBoard!);
    await waitFor(() => expect(api.board.mock.calls.length).toBeGreaterThan(initialCalls + 2));
    expect(screen.getByTestId("canvas-poses").textContent).toBe(positioned);
    expect(screen.getAllByTestId("floor-canvas")).toHaveLength(1);
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
    fireEvent.click(screen.getByRole("button", {name: "Editar datos"}));
    expect(screen.getByRole("dialog", {name: "Atender sin reserva"})).toBeTruthy();
    expect((screen.getByLabelText("Nombre del grupo") as HTMLInputElement).value).toBe("Grupo de Julia");
    expect((screen.getByLabelText("Personas") as HTMLInputElement).value).toBe("6");
    expect((screen.getByLabelText("Estadía prevista (minutos)") as HTMLInputElement).value).toBe("90");
    expect((screen.getByLabelText("Notas de atención") as HTMLTextAreaElement).value).toBe("Cerca de la ventana");
    fireEvent.click(screen.getByRole("button", {name: "Elegir mesas"}));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("canvas-poses").textContent).toBe(positioned);
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
    await waitFor(() => expect((screen.getByRole("button", {name: "Armar y ocupar mesas"}) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", {name: "Armar y ocupar mesas"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("restaurant", expect.objectContaining({action: "walk-in", customerName: "Grupo de Julia", partySize: 6, durationMinutes: 90, notes: "Cerca de la ventana", assignment: expect.objectContaining({capacity: 6})})));
  });

  it("cancels an assembly on the room board without saving or resetting its viewport", async () => {
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", {name: "Desplazar tablero"}));
    fireEvent.click(screen.getByRole("button", {name: "Atender sin reserva"}));
    fireEvent.change(screen.getByLabelText("Nombre del grupo"), {target: {value: "Armado que se descarta"}});
    fireEvent.click(screen.getByRole("button", {name: "Elegir mesas"}));
    fireEvent.change(await screen.findByLabelText("Sector del salón"), {target: {value: "window"}});
    selectQuantity(1);
    expect(screen.getByTestId("canvas-tables").textContent).toBe('["draft:one"]');
    fireEvent.click(within(screen.getByRole("complementary", {name: "Armar mesas en sala"})).getByRole("button", {name: "Cancelar"}));
    expect(screen.queryByRole("complementary", {name: "Armar mesas en sala"})).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("canvas-tables").textContent).toBe("[]");
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
    expect(api.save).not.toHaveBeenCalled();
  });

  it("exposes administrative navigation directly in the toolbar for an administrator", async () => {
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: false}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    const toolbar = screen.getByRole("navigation", {name: "Herramientas de sala"});
    expect(within(toolbar).getByRole("link", {name: "Administrar"}).getAttribute("href")).toBe("/admin/restaurants/restaurant/rooms");
    expect(within(toolbar).getByRole("button", {name: "Cerrar sesión"})).toBeTruthy();
    expect(screen.queryByRole("button", {name: "Menú de sala"})).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps direct operational actions available without exposing administrator navigation to read-only staff", async () => {
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    const toolbar = screen.getByRole("navigation", {name: "Herramientas de sala"});
    for (const name of ["Cambiar salón", "Fecha y hora", "Reservas", "Cerrar sesión"]) expect(within(toolbar).getByRole("button", {name})).toBeTruthy();
    expect(screen.queryByRole("link", {name: "Administrar"})).toBeNull();
    expect(screen.queryByRole("button", {name: "Atender sin reserva"})).toBeNull();
    expect(screen.queryByRole("button", {name: "Menú de sala"})).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(within(toolbar).getByRole("button", {name: "Reservas"}));
    expect(screen.getByRole("dialog", {name: "Reservas de Salón principal"})).toBeTruthy();
    fireEvent.keyDown(document, {key: "Escape"});
    fireEvent.click(within(toolbar).getByRole("button", {name: "Fecha y hora"}));
    expect(screen.getByRole("dialog", {name: "Fecha y hora"})).toBeTruthy();
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
  });

  it("uses a nonmodal room popover that closes with Escape or an outside click without resetting the canvas", async () => {
    document.body.style.overflow = "clip";
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    const trigger = screen.getByRole("button", {name: "Cambiar salón"});
    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", {name: "Desplazar tablero"}));
    trigger.focus(); fireEvent.click(trigger);
    const popover = screen.getByRole("navigation", {name: "Salones"});
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("clip");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const currentRoom = within(popover).getByRole("button", {name: "Salón principal"});
    expect(currentRoom.getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(currentRoom));
    fireEvent.keyDown(popover, {key: "Escape"});
    await waitFor(() => expect(screen.queryByRole("navigation", {name: "Salones"})).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    const reopened = screen.getByRole("navigation", {name: "Salones"});
    await waitFor(() => expect(document.activeElement).toBe(within(reopened).getByRole("button", {name: "Salón principal"})));
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole("navigation", {name: "Salones"})).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
    expect(document.body.style.overflow).toBe("clip");
  });

  it("switches rooms directly from the floating room popover", async () => {
    const value = board(); value.rooms.push({...structuredClone(room), id: "terrace", name: "Terraza"});
    api.board.mockResolvedValue(value);
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", {name: "Cambiar salón"}));
    fireEvent.click(within(screen.getByRole("navigation", {name: "Salones"})).getByRole("button", {name: "Terraza"}));
    expect(screen.queryByRole("navigation", {name: "Salones"})).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("floor-canvas").getAttribute("data-room-id")).toBe("terrace");
    fireEvent.click(screen.getByRole("button", {name: "Reservas"}));
    expect(screen.getByRole("dialog", {name: "Reservas de Terraza"})).toBeTruthy();
  });
});
