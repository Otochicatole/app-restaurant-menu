/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FloorConfigView, FloorFixture, FloorLocation, FloorRoom, FloorRoomInput } from "../contracts";

const api = vi.hoisted(() => ({ config: vi.fn(), save: vi.fn(), push: vi.fn(), logout: vi.fn() }));
const cursor = vi.hoisted(() => ({resize: {x: 420, y: 300, width: 640, height: 400}}));
vi.mock("./floor-api", () => ({ getFloorConfig: api.config, saveFloorAction: api.save, floorInputClass: "input" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: api.push }), usePathname: () => "/admin/restaurants/restaurant/rooms" }));
vi.mock("next/image", () => ({ default: ({alt, src}: {alt: string; src: string}) => createElement("img", {alt, src}) }));
vi.mock("@/modules/identity-access/ui", () => ({ LogoutButton: ({disabled, onBeforeLogout}: {disabled?: boolean; onBeforeLogout?: (proceed: () => Promise<void>) => void}) => createElement("button", {disabled, onClick: () => { if (onBeforeLogout) onBeforeLogout(api.logout); else void api.logout(); }}, "Cerrar sesión") }));
vi.mock("./FloorCanvas", () => ({ FloorCanvas: (props: {
  room: {id: string; width: number; height: number; locations?: FloorLocation[]; fixtures: FloorFixture[]};
  tables: {id: string; label: string; x: number; y: number}[]; selectedIds?: string[]; selectedLocationId?: string | null; fullScreen?: boolean; editorMode?: boolean;
  onSelect?: (id: string, additive: boolean) => void; onMove?: (ids: string[], delta: {x: number; y: number}) => void;
  onPlace?: (point: {x: number; y: number}) => void;
  onSelectLocation?: (id: string) => void; onMoveLocation?: (id: string, point: {x: number; y: number}) => void;
  onContextMenuLocation?: (id: string, point: {x: number; y: number}) => void;
  onResizeLocation?: (id: string, geometry: {x: number; y: number; width: number; height: number}) => void;
  onSelectFixture?: (id: string) => void; onMoveFixture?: (id: string, point: {x: number; y: number}) => void;
}) => {
  const [pan, setPan] = useState(0);
  return createElement("div", {"data-testid": "admin-canvas", "data-full-screen": props.fullScreen, "data-editor-mode": props.editorMode, "data-resize-enabled": Boolean(props.onResizeLocation)},
    createElement("button", {type: "button", onClick: () => setPan((value) => value + 1)}, "Desplazar plano"),
    props.onPlace && createElement("button", {type: "button", onClick: () => props.onPlace?.({x: 500, y: 350})}, "Colocar en plano"),
    ...(props.room.locations ?? []).map((location) => createElement("div", {key: location.id},
      createElement("button", {type: "button", onClick: () => props.onSelectLocation?.(location.id)}, `Seleccionar sector ${location.name}`),
      createElement("button", {type: "button", disabled: !props.onContextMenuLocation, onContextMenu: (event: {preventDefault: () => void}) => { event.preventDefault(); props.onContextMenuLocation?.(location.id, {x: 420, y: 300}); }}, `Menú del sector ${location.name}`),
      createElement("button", {type: "button", disabled: !props.onResizeLocation || props.selectedLocationId !== location.id, onClick: () => props.onResizeLocation?.(location.id, {...cursor.resize})}, `Redimensionar sector ${location.name}`),
      createElement("button", {type: "button", onClick: () => props.onMoveLocation?.(location.id, {x: 460, y: 310})}, `Arrastrar sector ${location.name}`))),
    ...props.room.fixtures.map((fixture) => createElement("div", {key: fixture.id},
      createElement("button", {type: "button", onClick: () => props.onSelectFixture?.(fixture.id)}, `Seleccionar elemento ${fixture.label}`),
      createElement("button", {type: "button", onClick: () => props.onMoveFixture?.(fixture.id, {x: 620, y: 440})}, `Arrastrar elemento ${fixture.label}`))),
    createElement("button", {type: "button", onClick: () => props.tables.forEach((table, index) => props.onSelect?.(table.id, index > 0))}, "Seleccionar todas las mesas"),
    createElement("button", {type: "button", onClick: () => props.onMove?.(props.selectedIds ?? [], {x: 20, y: 10})}, "Mover armado"),
    createElement("output", {"data-testid": "admin-pan"}, String(pan)),
    createElement("output", {"data-testid": "admin-interaction"}, JSON.stringify({place: Boolean(props.onPlace), selectSector: Boolean(props.onSelectLocation), dragSector: Boolean(props.onMoveLocation), selectElement: Boolean(props.onSelectFixture), dragElement: Boolean(props.onMoveFixture)})),
    createElement("output", {"data-testid": "admin-plan"}, JSON.stringify(props.room)),
    createElement("output", {"data-testid": "admin-tables"}, JSON.stringify(props.tables)));
} }));

import { FloorAdminScreen } from "./FloorAdminScreen";
import { AdminShell } from "@/ui/admin/AdminShell";

const room: FloorRoom = {
  id: "main", restaurantId: "restaurant", name: "Salón principal", width: 800, height: 600, revision: 4, active: true,
  fixtures: [{id: "bar", type: "BAR", label: "Barra", x: 650, y: 450, width: 100, height: 60, rotation: 0}],
  locations: [{id: "window", name: "Ventana", x: 400, y: 300, width: 600, height: 400, rotation: 0, active: true}],
  tables: [
    {id: "one", label: "M1", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 0, y: 0, rotation: 0, active: true},
    {id: "two", label: "M2", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 0, y: 0, rotation: 0, active: true},
  ],
  combinations: [{id: "joined", name: "M1 + M2", capacity: 6, active: true, members: [{tableId: "one", x: -40, y: 0, rotation: 0}, {tableId: "two", x: 40, y: 0, rotation: 0}]}],
};
function config(): FloorConfigView {
  return {restaurantId: "restaurant", restaurantName: "Bistró", enabled: true, timeZone: "America/Argentina/Buenos_Aires", rooms: [structuredClone(room)], staffAccount: null, compatibility: {status: "compatible"}};
}
const plan = (): FloorRoom => JSON.parse(screen.getByTestId("admin-plan").textContent!);
const tables = (): {id: string}[] => JSON.parse(screen.getByTestId("admin-tables").textContent!);
function closeDialog() { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", {name: "Cerrar"})); }
async function editor({withShell = false, landingEnabled = true}: {withShell?: boolean; landingEnabled?: boolean} = {}) {
  const content = createElement(FloorAdminScreen, {restaurantId: "restaurant"});
  render(withShell ? createElement(AdminShell, {restaurantId: "restaurant", organizationName: "Organización", brandTitle: "Bistró", brandSubtitle: "", showMenuPickerLink: true, landingEnabled} as Parameters<typeof AdminShell>[0], content) : content);
  return screen.findByTestId("admin-canvas");
}
function tool(name: string) { fireEvent.click(within(screen.getByRole("navigation", {name: "Herramientas del editor"})).getByRole("button", {name})); }
function applyWidth(width: number) {
  tool("Medidas");
  fireEvent.change(screen.getByLabelText("Ancho del plano"), {target: {value: String(width)}});
  fireEvent.click(screen.getByRole("button", {name: "Aplicar medidas"}));
}
function sectorMenu(name = "Ventana") {
  fireEvent.contextMenu(screen.getByRole("button", {name: `Menú del sector ${name}`}));
  return screen.getByRole("menu", {name: `Acciones de ${name}`});
}

describe("fullscreen room editor workflows", () => {
  beforeEach(() => {
    vi.resetAllMocks(); document.body.style.overflow = "";
    Object.assign(cursor.resize, {x: 420, y: 300, width: 640, height: 400});
    api.logout.mockResolvedValue(undefined);
    const current = config();
    api.config.mockResolvedValue(current);
    api.save.mockImplementation(async (_restaurantId: string, command: {action: string; room?: FloorRoomInput; expectedRevision?: number}) => {
      if (command.action !== "save-room" || !command.room) return current;
      const saved = {...command.room, id: command.room.id!, restaurantId: "restaurant", revision: (command.expectedRevision ?? 0) + 1};
      return {...current, rooms: [saved, ...current.rooms.filter((item) => item.id !== saved.id)]};
    });
  });
  afterEach(() => { cleanup(); document.body.style.overflow = ""; vi.restoreAllMocks(); });

  it("keeps the existing administrative sidebar around the canvas and its local tools", async () => {
    await editor({withShell: true});
    expect(screen.getByRole("region", {name: "Editor del salón"})).toBeTruthy();
    expect(screen.getAllByTestId("admin-canvas")).toHaveLength(1);
    expect(screen.getByTestId("admin-canvas").getAttribute("data-full-screen")).toBe("true");
    expect(screen.getByTestId("admin-canvas").getAttribute("data-editor-mode")).toBe("true");
    expect(tables()).toEqual([]);
    const toolbar = screen.getByRole("navigation", {name: "Herramientas del editor"});
    for (const name of ["Salones", "Medidas", "Inventario", "Sectores", "Elementos", "Configuración"]) {
      const button = within(toolbar).getByRole("button", {name});
      const text = within(button).getByText(name);
      expect(text.closest("[hidden], [aria-hidden='true'], .hidden, .sr-only")).toBeNull();
    }
    expect(screen.getAllByRole("navigation", {name: "Navegación principal"})).toHaveLength(1);
    expect(screen.queryByRole("navigation", {name: "Navegación del editor"})).toBeNull();
    const navigation = screen.getByRole("navigation", {name: "Navegación principal"});
    const destinations = {Editor: "/admin/restaurants/restaurant", Salones: "/admin/restaurants/restaurant/rooms", Landing: "/admin/restaurants/restaurant/landing", Reservas: "/admin/restaurants/restaurant/reservations", Configuración: "/admin/restaurants/restaurant/settings", "Mi cuenta": "/admin/account", "Cambiar restaurante": "/admin/restaurants"};
    for (const [name, href] of Object.entries(destinations)) {
      const link = within(navigation).getByRole("link", {name});
      expect(link.getAttribute("href")).toBe(href);
    }
    expect(within(navigation).getByRole("link", {name: "Salones"}).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", {name: "Cerrar sesión"})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Agregar sector"})).toBeTruthy();
    expect(screen.getByRole("link", {name: "Ver sala"}).getAttribute("href")).toBe("/floor?restaurantId=restaurant");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByLabelText("Ancho del plano")).toBeNull();
    expect(screen.queryByLabelText("Cantidad a agregar")).toBeNull();
    expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(true);
    tool("Configuración");
    expect(screen.getByRole("dialog", {name: "Configuración del restaurante"})).toBeTruthy();
    expect(screen.getAllByTestId("admin-canvas")).toHaveLength(1);
  });

  it("adds a sector directly while suppressing geometry selection and dragging until placement is applied", async () => {
    const canvas = await editor();
    expect(screen.queryByRole("navigation", {name: "Navegación del editor"})).toBeNull();
    expect(screen.queryByRole("navigation", {name: "Navegación principal"})).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Agregar sector"}));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(JSON.parse(screen.getByTestId("admin-interaction").textContent!)).toEqual({place: true, selectSector: false, dragSector: false, selectElement: false, dragElement: false});
    fireEvent.click(screen.getByRole("button", {name: "Colocar en plano"}));
    expect(screen.getByRole("dialog", {name: "Propiedades del sector"})).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nombre del sector"), {target: {value: "Ventana lateral"}});
    expect(plan().locations).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", {name: "Aplicar sector"}));
    expect(plan().locations).toEqual(expect.arrayContaining([expect.objectContaining({name: "Ventana lateral", x: 500, y: 350})]));
    expect(JSON.parse(screen.getByTestId("admin-interaction").textContent!)).toEqual({place: false, selectSector: true, dragSector: true, selectElement: true, dragElement: true});
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("restaurant", expect.objectContaining({action: "save-room", room: expect.objectContaining({locations: expect.arrayContaining([expect.objectContaining({name: "Ventana lateral"})])})})));
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
  });

  it("keeps navigation limited to the restaurant's enabled capabilities", async () => {
    await editor({withShell: true, landingEnabled: false});
    const navigation = screen.getByRole("navigation", {name: "Navegación principal"});
    expect(within(navigation).queryByRole("link", {name: "Landing"})).toBeNull();
    expect(within(navigation).queryByRole("link", {name: "Reservas"})).toBeNull();
    expect(within(navigation).getByRole("link", {name: "Editor"})).toBeTruthy();
    expect(within(navigation).getByRole("link", {name: "Configuración"})).toBeTruthy();
  });

  it("adds stable inventory in a modal and saves custom dimensions and a newly placed sector", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    tool("Inventario");
    fireEvent.change(screen.getByLabelText("Cantidad a agregar"), {target: {value: "3"}});
    fireEvent.click(screen.getByRole("button", {name: "Agregar al inventario"}));
    closeDialog();
    expect(tables()).toEqual([]);
    applyWidth(1400);
    tool("Sectores");
    fireEvent.click(screen.getByRole("button", {name: "Nuevo sector"}));
    fireEvent.click(screen.getByRole("button", {name: "Colocar en plano"}));
    expect(screen.getByRole("dialog", {name: "Propiedades del sector"})).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nombre del sector"), {target: {value: "Fondo"}});
    expect(plan().locations).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", {name: "Aplicar sector"}));
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    const command = api.save.mock.calls[0][1];
    expect(command).toMatchObject({action: "save-room", expectedRevision: 4, room: {id: "main", width: 1400}});
    expect(command.room.tables).toHaveLength(5);
    expect(command.room.tables.slice(0, 2).map((table: {id: string}) => table.id)).toEqual(["one", "two"]);
    expect(new Set(command.room.tables.map((table: {id: string}) => table.id)).size).toBe(5);
    expect(command.room.tables.every((table: {x: number; y: number}) => table.x === 0 && table.y === 0)).toBe(true);
    expect(command.room.locations).toEqual(expect.arrayContaining([expect.objectContaining({name: "Fondo", x: 500, y: 350})]));
    await waitFor(() => expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(true));
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
    expect(tables()).toEqual([]);
  });

  it("edits a type quantity by preserving physical IDs and mixed capacities, archiving decreases and reactivating increases", async () => {
    const value = config();
    value.rooms[0].tables[1].capacity = 6;
    value.rooms[0].tables.push({...room.tables[0], id: "three", label: "M3", capacity: 2}, {...room.tables[0], id: "four", label: "M4", capacity: 3, active: false});
    api.config.mockResolvedValue(value);
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    const editQuantity = (quantity: number) => {
      tool("Inventario");
      const group = screen.getByRole("group", {name: "Tipo de mesa Cuadrada 80 × 80"});
      expect(within(group).queryByText(/M1|M2|lugares/)).toBeNull();
      fireEvent.click(within(group).getByRole("button", {name: "Editar tipo Cuadrada 80 × 80"}));
      expect(screen.getByRole("dialog", {name: "Editar tipo de mesa"})).toBeTruthy();
      fireEvent.change(screen.getByLabelText("Cantidad de mesas"), {target: {value: String(quantity)}});
      fireEvent.click(screen.getByRole("button", {name: "Aplicar tipo"}));
      closeDialog();
    };
    editQuantity(4);
    expect(plan().tables.map((table) => table.id)).toEqual(["one", "two", "three", "four"]);
    expect(plan().tables.every((table) => table.active)).toBe(true);
    editQuantity(2);
    expect(plan().tables.map((table) => ({id: table.id, active: table.active, capacity: table.capacity}))).toEqual([
      {id: "one", active: true, capacity: 4}, {id: "two", active: true, capacity: 6},
      {id: "three", active: false, capacity: 2}, {id: "four", active: false, capacity: 3},
    ]);
    expect(plan().combinations).toEqual(room.combinations);
    expect(tables()).toEqual([]);
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    expect(api.save.mock.calls[0][1]).toMatchObject({action: "save-room", expectedRevision: 4, room: {tables: plan().tables, combinations: room.combinations}});
    await waitFor(() => expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(true));
    editQuantity(4);
    expect(plan().tables.map((table) => table.id)).toEqual(["one", "two", "three", "four"]);
    expect(plan().tables.map((table) => table.capacity)).toEqual([4, 6, 2, 3]);
    expect(plan().tables.every((table) => table.active)).toBe(true);
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2));
    expect(api.save.mock.calls[1][1].expectedRevision).toBe(5);
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it("separates types by shape and dimensions and edits only that type without overwriting table capacities", async () => {
    const value = config();
    value.rooms[0].combinations = [];
    value.rooms[0].tables[1].capacity = 6;
    const large = {...room.tables[0], id: "large", label: "M3", width: 100, height: 100, capacity: 8};
    value.rooms[0].tables.push(large);
    api.config.mockResolvedValue(value);
    await editor(); tool("Inventario");
    const smallGroup = screen.getByRole("group", {name: "Tipo de mesa Cuadrada 80 × 80"});
    const largeGroup = screen.getByRole("group", {name: "Tipo de mesa Cuadrada 100 × 100"});
    expect((within(smallGroup).getByRole("spinbutton", {name: "Cantidad para armado · Cuadrada 80 × 80"}) as HTMLInputElement).max).toBe("2");
    expect((within(largeGroup).getByRole("spinbutton", {name: "Cantidad para armado · Cuadrada 100 × 100"}) as HTMLInputElement).max).toBe("1");
    expect(screen.queryByRole("checkbox", {name: /Incluir mesa/})).toBeNull();
    const individualDetails = screen.getByRole("button", {name: "Editar mesa M1"}).closest("details");
    expect(individualDetails).not.toBeNull();
    expect(individualDetails!.open).toBe(false);
    fireEvent.click(within(smallGroup).getByRole("button", {name: "Editar tipo Cuadrada 80 × 80"}));
    fireEvent.change(screen.getByLabelText("Ancho"), {target: {value: "90"}});
    fireEvent.click(screen.getByRole("button", {name: "Aplicar tipo"}));
    expect(screen.getByRole("group", {name: "Tipo de mesa Cuadrada 90 × 90"})).toBeTruthy();
    closeDialog();
    expect(plan().tables.slice(0, 2)).toEqual([expect.objectContaining({id: "one", width: 90, height: 90, capacity: 4}), expect.objectContaining({id: "two", width: 90, height: 90, capacity: 6})]);
    expect(plan().tables.find((table) => table.id === "large")).toEqual(large);
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    expect(api.save.mock.calls[0][1]).toMatchObject({expectedRevision: 4, room: {tables: plan().tables}});
  });

  it("selects and drags sectors and fixtures on the main canvas while canceled property edits stay local", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    fireEvent.click(screen.getByRole("button", {name: "Arrastrar sector Ventana"}));
    expect(plan().locations[0]).toMatchObject({x: 460, y: 310});
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar sector Ventana"}));
    expect(screen.queryByRole("complementary", {name: "Selección del plano"})).toBeNull();
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.contextMenu(screen.getByRole("button", {name: "Menú del sector Ventana"}));
    fireEvent.click(within(screen.getByRole("menu", {name: "Acciones de Ventana"})).getByRole("menuitem", {name: "Editar"}));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("dialog", {name: "Propiedades del sector"})).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nombre del sector"), {target: {value: "Nombre descartado"}});
    closeDialog();
    expect(plan().locations[0].name).toBe("Ventana");
    fireEvent.click(screen.getByRole("button", {name: "Arrastrar elemento Barra"}));
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar elemento Barra"}));
    fireEvent.click(within(screen.getByRole("complementary", {name: "Selección del plano"})).getByRole("button", {name: "Editar"}));
    expect(screen.getByRole("dialog", {name: "Propiedades del elemento"})).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Texto"), {target: {value: "Barra principal"}});
    fireEvent.click(screen.getByRole("button", {name: "Aplicar elemento"}));
    expect(plan().fixtures[0]).toMatchObject({label: "Barra principal", x: 620, y: 440});
    tool("Elementos"); fireEvent.click(screen.getByRole("button", {name: "Texto"}));
    fireEvent.click(screen.getByRole("button", {name: "Colocar en plano"}));
    fireEvent.change(screen.getByLabelText("Texto"), {target: {value: "Entrada descartada"}});
    closeDialog();
    expect(plan().fixtures).toHaveLength(1);
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
    expect(api.save).not.toHaveBeenCalled();
  });

  it("opens sector actions at the pointer and saves rotation and confirmed archival", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar sector Ventana"}));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("complementary", {name: "Selección del plano"})).toBeNull();
    const menu = sectorMenu();
    expect(menu.style.left).toBe("420px"); expect(menu.style.top).toBe("300px");
    for (const name of ["Editar", "Girar", "Archivar"]) expect(within(menu).getByRole("menuitem", {name})).toBeTruthy();
    fireEvent.click(within(menu).getByRole("menuitem", {name: "Girar"}));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(plan().locations[0].rotation).toBe(90);
    fireEvent.click(within(sectorMenu()).getByRole("menuitem", {name: "Archivar"}));
    expect(screen.queryByRole("menu")).toBeNull();
    const confirmation = screen.getByRole("dialog", {name: "Archivar sector"});
    expect(plan().locations[0].active).toBe(true);
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(within(confirmation).getByRole("button", {name: "Archivar sector"}));
    expect(plan().locations[0]).toMatchObject({active: false, rotation: 90});
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("restaurant", expect.objectContaining({action: "save-room", expectedRevision: 4, room: expect.objectContaining({locations: [expect.objectContaining({id: "window", active: false, rotation: 90})]})})));
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it("closes sector actions with Escape or outside pointer input without changing the viewport", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    const menu = sectorMenu();
    await waitFor(() => expect(document.activeElement).toBe(within(menu).getByRole("menuitem", {name: "Editar"})));
    fireEvent.keyDown(menu, {key: "Escape"});
    expect(screen.queryByRole("menu")).toBeNull();
    sectorMenu(); fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(plan().locations).toEqual(room.locations);
    expect(api.save).not.toHaveBeenCalled();
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it.each(["click", "Shift+F10", "ContextMenu"] as const)("offers sector actions from its accessible list using %s", async (gesture) => {
    await editor(); tool("Sectores");
    const row = within(screen.getByRole("navigation", {name: "Sectores del salón"})).getByRole("button", {name: "Ventana"});
    row.focus();
    if (gesture === "click") fireEvent.click(row);
    else fireEvent.keyDown(row, {key: gesture === "Shift+F10" ? "F10" : "ContextMenu", shiftKey: gesture === "Shift+F10"});
    const menu = screen.getByRole("menu", {name: "Acciones de Ventana"});
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(within(menu).getByRole("menuitem", {name: "Editar"}));
    expect(screen.getByRole("dialog", {name: "Propiedades del sector"})).toBeTruthy();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("suppresses sector menus during placement, saving and a guarded room change", async () => {
    await editor();
    fireEvent.click(screen.getByRole("button", {name: "Agregar sector"}));
    const duringPlacement = screen.getByRole("button", {name: "Menú del sector Ventana"}) as HTMLButtonElement;
    expect(duringPlacement.disabled).toBe(true);
    fireEvent.contextMenu(duringPlacement);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Cancelar ubicación"}));
    let finishSave!: (value: FloorConfigView) => void;
    api.save.mockImplementationOnce(() => new Promise<FloorConfigView>((complete) => { finishSave = complete; }));
    applyWidth(900); fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    const duringSave = screen.getByRole("button", {name: "Menú del sector Ventana"}) as HTMLButtonElement;
    expect(duringSave.disabled).toBe(true);
    fireEvent.contextMenu(duringSave);
    expect(screen.queryByRole("menu")).toBeNull();
    const saved = config(); saved.rooms[0].width = 900; saved.rooms[0].revision = 5;
    await act(async () => { finishSave(saved); });
    expect((screen.getByRole("button", {name: "Menú del sector Ventana"}) as HTMLButtonElement).disabled).toBe(false);
    applyWidth(1000); sectorMenu(); tool("Salones");
    fireEvent.click(screen.getByRole("button", {name: "Nuevo salón"}));
    expect(screen.getByRole("dialog", {name: "Descartar cambios sin guardar"})).toBeTruthy();
    expect(screen.queryByRole("menu")).toBeNull();
    expect((screen.getByRole("button", {name: "Menú del sector Ventana"}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", {name: "Descartar y continuar"}));
    expect(screen.getByRole("dialog", {name: "Medidas del salón"})).toBeTruthy();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(plan().id).not.toBe("main"); expect(plan().locations).toEqual([]);
    expect(api.save).toHaveBeenCalledTimes(1);
  });

  it("saves a selected sector's cursor resize and retains numeric fields as a precise alternative", async () => {
    const initial = config(); initial.rooms[0].locations[0].rotation = 180; api.config.mockResolvedValue(initial);
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    expect((screen.getByRole("button", {name: "Redimensionar sector Ventana"}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar sector Ventana"}));
    fireEvent.click(screen.getByRole("button", {name: "Redimensionar sector Ventana"}));
    expect(plan().locations[0]).toMatchObject({x: 420, y: 300, width: 640, height: 400, rotation: 180});
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    expect(api.save.mock.calls[0][1]).toMatchObject({expectedRevision: 4, room: {locations: [{id: "window", x: 420, y: 300, width: 640, height: 400, rotation: 180}]}});
    await waitFor(() => expect(canvas.getAttribute("data-resize-enabled")).toBe("true"));
    fireEvent.click(within(sectorMenu()).getByRole("menuitem", {name: "Editar"}));
    for (const [label, value] of [["Centro X", "420"], ["Centro Y", "300"], ["Ancho del sector", "640"], ["Alto del sector", "400"], ["Rotación", "180"]]) expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe(value);
    for (const [label, value] of [["Centro X", "430"], ["Centro Y", "310"], ["Ancho del sector", "620"], ["Alto del sector", "380"]]) fireEvent.change(screen.getByLabelText(label), {target: {value}});
    fireEvent.click(screen.getByRole("button", {name: "Aplicar sector"}));
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2));
    expect(api.save.mock.calls[1][1]).toMatchObject({expectedRevision: 5, room: {locations: [{id: "window", x: 430, y: 310, width: 620, height: 380, rotation: 180}]}});
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it("rejects an out-of-room resize without changing pristine or previously edited room data", async () => {
    await editor();
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar sector Ventana"}));
    Object.assign(cursor.resize, {x: 20});
    fireEvent.click(screen.getByRole("button", {name: "Redimensionar sector Ventana"}));
    expect((screen.getByRole("alert")).textContent).toContain("fuera del salón");
    expect(plan().locations).toEqual(room.locations);
    expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(true);
    applyWidth(900);
    fireEvent.click(screen.getByRole("button", {name: "Redimensionar sector Ventana"}));
    expect((screen.getByRole("alert")).textContent).toContain("fuera del salón");
    expect(plan()).toMatchObject({width: 900, locations: room.locations});
    expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(false);
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    expect(api.save.mock.calls[0][1]).toMatchObject({expectedRevision: 4, room: {width: 900, locations: room.locations}});
  });

  it("disables cursor resizing while placing, saving, editing properties or assembling a preset", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar sector Ventana"}));
    expect(canvas.getAttribute("data-resize-enabled")).toBe("true");
    tool("Medidas");
    expect(canvas.getAttribute("data-resize-enabled")).toBe("false");
    closeDialog();
    expect(canvas.getAttribute("data-resize-enabled")).toBe("true");
    fireEvent.click(screen.getByRole("button", {name: "Agregar sector"}));
    expect(canvas.getAttribute("data-resize-enabled")).toBe("false");
    fireEvent.click(screen.getByRole("button", {name: "Cancelar ubicación"}));
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar sector Ventana"}));
    let finishSave!: (value: FloorConfigView) => void;
    api.save.mockImplementationOnce(() => new Promise<FloorConfigView>((complete) => { finishSave = complete; }));
    applyWidth(900); fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    expect(canvas.getAttribute("data-resize-enabled")).toBe("false");
    const saved = config(); saved.rooms[0].width = 900; saved.rooms[0].revision = 5;
    await act(async () => { finishSave(saved); });
    expect(canvas.getAttribute("data-resize-enabled")).toBe("true");
    tool("Inventario");
    fireEvent.change(screen.getByRole("spinbutton", {name: "Cantidad para armado · Cuadrada 80 × 80"}), {target: {value: "2"}});
    fireEvent.click(screen.getByRole("button", {name: "Crear armado predefinido"}));
    expect(canvas.getAttribute("data-resize-enabled")).toBe("false");
    fireEvent.click(screen.getByRole("button", {name: "Cancelar armado"}));
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar sector Ventana"}));
    expect(canvas.getAttribute("data-resize-enabled")).toBe("true");
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(api.save).toHaveBeenCalledTimes(1);
  });

  it("preserves applied draft changes and their revision after a failed save", async () => {
    api.save.mockRejectedValueOnce(new Error("El salón cambió en otra pestaña."));
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    applyWidth(1400);
    tool("Medidas");
    fireEvent.change(screen.getByLabelText("Ancho del plano"), {target: {value: "1500"}});
    fireEvent.keyDown(document, {key: "Escape"});
    expect(plan().width).toBe(1400);
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    expect((await screen.findByRole("alert")).textContent).toContain("El salón cambió");
    expect(plan().width).toBe(1400);
    expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2));
    expect(api.save.mock.calls[0][1]).toEqual(api.save.mock.calls[1][1]);
    expect(api.save.mock.calls[1][1].expectedRevision).toBe(4);
    await waitFor(() => expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(true));
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
    const unloadAfterSave = new Event("beforeunload", {cancelable: true});
    act(() => { window.dispatchEvent(unloadAfterSave); });
    expect(unloadAfterSave.defaultPrevented).toBe(false);
  });

  it("requires an explicit discard before switching rooms and keeps canceled changes", async () => {
    const value = config(); value.rooms.push({...structuredClone(room), id: "terrace", name: "Terraza"}); api.config.mockResolvedValue(value);
    const nativeConfirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await editor(); applyWidth(1400);
    if (!screen.queryByRole("navigation", {name: "Salones del restaurante"})) tool("Salones");
    fireEvent.click(within(screen.getByRole("navigation", {name: "Salones del restaurante"})).getByRole("button", {name: "Terraza"}));
    const confirmation = screen.getByRole("dialog", {name: "Descartar cambios sin guardar"});
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(within(confirmation).getByRole("button", {name: "Cancelar"}));
    expect(plan()).toMatchObject({id: "main", width: 1400});
    if (!screen.queryByRole("navigation", {name: "Salones del restaurante"})) tool("Salones");
    fireEvent.click(within(screen.getByRole("navigation", {name: "Salones del restaurante"})).getByRole("button", {name: "Terraza"}));
    fireEvent.click(screen.getByRole("button", {name: "Descartar y continuar"}));
    expect(plan()).toMatchObject({id: "terrace", name: "Terraza", width: 800});
    expect(nativeConfirm).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  });

  it("protects unsaved changes when creating a room or leaving the editor", async () => {
    const nativeConfirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await editor(); applyWidth(1400);
    const unload = new Event("beforeunload", {cancelable: true});
    act(() => { window.dispatchEvent(unload); });
    expect(unload.defaultPrevented).toBe(true);
    tool("Salones"); fireEvent.click(screen.getByRole("button", {name: "Nuevo salón"}));
    fireEvent.click(within(screen.getByRole("dialog", {name: "Descartar cambios sin guardar"})).getByRole("button", {name: "Cancelar"}));
    expect(plan()).toMatchObject({id: "main", width: 1400});
    fireEvent.click(screen.getByRole("link", {name: "Ver sala"}));
    expect(api.push).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog", {name: "Descartar cambios sin guardar"})).getByRole("button", {name: "Cancelar"}));
    expect(plan().width).toBe(1400);
    fireEvent.click(screen.getByRole("link", {name: "Ver sala"}));
    fireEvent.click(screen.getByRole("button", {name: "Descartar y continuar"}));
    expect(api.push).toHaveBeenCalledWith("/floor?restaurantId=restaurant");
    expect(nativeConfirm).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  });

  it("guards persistent navigation and signs out only after confirming a discard", async () => {
    const canvas = await editor({withShell: true}); applyWidth(1400);
    const navigation = screen.getByRole("navigation", {name: "Navegación principal"});
    fireEvent.click(within(navigation).getByRole("link", {name: "Reservas"}));
    expect(api.push).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog", {name: "Descartar cambios sin guardar"})).getByRole("button", {name: "Cancelar"}));
    expect(plan().width).toBe(1400);
    fireEvent.click(screen.getByRole("button", {name: "Cerrar sesión"}));
    expect(api.logout).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog", {name: "Descartar cambios sin guardar"})).getByRole("button", {name: "Cancelar"}));
    expect(api.logout).not.toHaveBeenCalled();
    expect(plan().width).toBe(1400);
    fireEvent.click(screen.getByRole("button", {name: "Cerrar sesión"}));
    fireEvent.click(screen.getByRole("button", {name: "Descartar y continuar"}));
    await waitFor(() => expect(api.logout).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(plan().width).toBe(1400);
    expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(false);
  });

  it("edits a predefined assembly on the same main canvas while preserving the base inventory", async () => {
    const value = config(); value.rooms[0].combinations = []; api.config.mockResolvedValue(value);
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    tool("Inventario");
    fireEvent.change(screen.getByRole("spinbutton", {name: "Cantidad para armado · Cuadrada 80 × 80"}), {target: {value: "2"}});
    fireEvent.click(screen.getByRole("button", {name: "Crear armado predefinido"}));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(tables().map((table) => table.id)).toEqual(["one", "two"]);
    expect(screen.getAllByTestId("admin-canvas")).toHaveLength(1);
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar todas las mesas"}));
    fireEvent.click(screen.getByRole("button", {name: "Mover armado"}));
    fireEvent.click(screen.getByRole("button", {name: "Aplicar armado"}));
    expect(tables()).toEqual([]);
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    const saved = api.save.mock.calls[0][1].room as FloorRoom;
    expect(saved.combinations).toHaveLength(1);
    expect(saved.combinations.find((combination) => combination.id !== "joined")).toMatchObject({capacity: 6, members: [{tableId: "one", x: -20, y: 10}, {tableId: "two", x: 60, y: 10}]});
    expect(saved.tables).toEqual(room.tables);
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });
});
