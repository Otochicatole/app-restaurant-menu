/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FloorConfigView, FloorFixture, FloorLocation, FloorRoom, FloorRoomInput } from "../contracts";
import type { FloorCanvasElement } from "./FloorCanvas";

const api = vi.hoisted(() => ({ config: vi.fn(), save: vi.fn(), push: vi.fn(), logout: vi.fn() }));
const cursor = vi.hoisted(() => ({resize: {x: 420, y: 300, width: 640, height: 400}, move: {x: 460, y: 310}}));
vi.mock("./floor-api", () => ({ getFloorConfig: api.config, saveFloorAction: api.save, floorInputClass: "input" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: api.push }), usePathname: () => "/admin/restaurants/restaurant/rooms" }));
vi.mock("next/image", () => ({ default: ({alt, src}: {alt: string; src: string}) => createElement("img", {alt, src}) }));
vi.mock("@/modules/identity-access/ui", () => ({ LogoutButton: ({disabled, onBeforeLogout}: {disabled?: boolean; onBeforeLogout?: (proceed: () => Promise<void>) => void}) => createElement("button", {disabled, onClick: () => { if (onBeforeLogout) onBeforeLogout(api.logout); else void api.logout(); }}, "Cerrar sesión") }));
vi.mock("./FloorCanvas", () => ({ FloorCanvas: (props: {
  room: {id: string; width: number; height: number; locations?: FloorLocation[]; fixtures: FloorFixture[]};
  tables: {id: string; label: string; x: number; y: number}[]; selectedIds?: string[]; selectedLocationId?: string | null; fullScreen?: boolean; editorMode?: boolean;
  onSelect?: (id: string, additive: boolean) => void; onMove?: (ids: string[], delta: {x: number; y: number}) => void;
  onSelectMany?: (ids: string[], additive: boolean) => void;
  onSelectElements?: (elements: FloorCanvasElement[], additive: boolean) => void;
  onClearSelection?: () => void;
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
      createElement("button", {type: "button", onClick: () => props.onMoveLocation?.(location.id, cursor.move)}, `Arrastrar sector ${location.name}`))),
    ...props.room.fixtures.map((fixture) => createElement("div", {key: fixture.id},
      createElement("button", {type: "button", onClick: () => props.onSelectFixture?.(fixture.id)}, `Seleccionar elemento ${fixture.label}`),
      createElement("button", {type: "button", onClick: () => props.onMoveFixture?.(fixture.id, {x: 620, y: 440})}, `Arrastrar elemento ${fixture.label}`))),
    createElement("button", {type: "button", onClick: () => props.onSelectMany?.(props.tables.map((table) => table.id), false)}, "Seleccionar todas las mesas"),
    createElement("button", {type: "button", onClick: () => props.onSelectElements?.([
      ...(props.room.locations ?? []).slice(0, 1).map((location) => ({kind: "sector" as const, id: location.id})),
      ...props.room.fixtures.slice(0, 1).map((fixture) => ({kind: "fixture" as const, id: fixture.id})),
    ], false)}, "Seleccionar con recuadro"),
    createElement("button", {type: "button", onClick: props.onClearSelection}, "Limpiar selección"),
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
    {id: "one", label: "M1", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 240, y: 260, rotation: 0, active: true, locationId: "window"},
    {id: "two", label: "M2", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 380, y: 260, rotation: 0, active: true, locationId: "window"},
  ],
  combinations: [],
};
function config(): FloorConfigView {
  return {restaurantId: "restaurant", restaurantName: "Bistró", enabled: true, timeZone: "America/Argentina/Buenos_Aires", rooms: [structuredClone(room)], staffAccount: null, compatibility: {status: "compatible"}};
}
const plan = (): FloorRoom => JSON.parse(screen.getByTestId("admin-plan").textContent!);
const tables = (): {id: string}[] => JSON.parse(screen.getByTestId("admin-tables").textContent!);
function closeDialog() { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", {name: "Cerrar ventana"})); }
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
    Object.assign(cursor.move, {x: 460, y: 310});
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
    expect(tables().map((table) => table.id)).toEqual(["one", "two"]);
    const toolbar = screen.getByRole("navigation", {name: "Herramientas del editor"});
    for (const name of ["Salones", "Medidas", "Mesas", "Sectores", "Agregar sector", "Agregar mesa", "Elementos", "Configuración"]) {
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
    expect(screen.getByRole("link", {name: "Ver sala"}).getAttribute("href")).toBe("/floor?restaurantId=restaurant");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByLabelText("Ancho del plano")).toBeNull();
    expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(true);
    tool("Configuración");
    expect(screen.getByRole("dialog", {name: "Configuración del restaurante"})).toBeTruthy();
    expect(screen.getAllByTestId("admin-canvas")).toHaveLength(1);
  });

  it("preserves pending fields and geometry when minimized, but X closes without a dock", async () => {
    const canvas = await editor({withShell: true}); tool("Medidas");
    const pane = screen.getByRole("dialog", {name: "Medidas del sal\u00F3n"});
    const input = within(pane).getByLabelText("Ancho del plano") as HTMLInputElement;
    fireEvent.change(input, {target: {value: "1200"}});
    const scroller = pane.querySelector<HTMLElement>(".overflow-y-auto")!; scroller.scrollTop = 90;
    fireEvent.keyDown(within(pane).getByRole("button", {name: "Mover ventana Medidas del sal\u00F3n"}), {key: "ArrowLeft"});
    const left = pane.style.left;
    fireEvent.click(within(pane).getByRole("button", {name: "Minimizar ventana"})); tool("Medidas");
    expect(screen.getByRole("dialog", {name: "Medidas del sal\u00F3n"})).toBe(pane);
    expect(input.value).toBe("1200"); expect(scroller.scrollTop).toBe(90); expect(pane.style.left).toBe(left);
    expect(screen.getByRole("navigation", {name: "Navegaci\u00F3n principal"})).toBeTruthy();
    fireEvent.click(within(pane).getByRole("button", {name: "Cerrar ventana"}));
    expect(pane.isConnected).toBe(false); expect(input.isConnected).toBe(false);
    expect(screen.queryByRole("button", {name: /Abrir ventana/})).toBeNull();
    expect(plan().width).toBe(800); tool("Medidas");
    const reopened = screen.getByRole("dialog", {name: "Medidas del sal\u00F3n"}); expect(reopened).not.toBe(pane);
    expect((within(reopened).getByLabelText("Ancho del plano") as HTMLInputElement).value).toBe("800");
    fireEvent.change(within(reopened).getByLabelText("Ancho del plano"), {target: {value: "1200"}});
    fireEvent.click(within(reopened).getByRole("button", {name: "Aplicar medidas"}));
    expect(plan().width).toBe(1200); expect(screen.getByTestId("admin-canvas")).toBe(canvas); expect(api.save).not.toHaveBeenCalled();
  });

  it("keeps tables, dimensions and sector tools independent while applying each to the latest room draft", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    tool("Medidas");
    const dimensions = screen.getByRole("dialog", {name: "Medidas del salón"});
    const name = within(dimensions).getByLabelText("Nombre del salón") as HTMLInputElement;
    fireEvent.change(name, {target: {value: "Salón con ventana"}});
    fireEvent.keyDown(within(dimensions).getByRole("button", {name: "Mover ventana Medidas del salón"}), {key: "ArrowLeft"});
    const position = dimensions.style.left;
    tool("Mesas");
    const tablesDialog = screen.getByRole("dialog", {name: "Mesas y cupos por sector"});
    const cap = within(tablesDialog).getByLabelText("Capacidad base") as HTMLInputElement;
    fireEvent.change(cap, {target: {value: "6"}});
    fireEvent.click(within(sectorMenu()).getByRole("menuitem", {name: "Editar"}));
    const sector = screen.getByRole("dialog", {name: "Propiedades del sector"});
    expect(screen.getAllByRole("dialog")).toHaveLength(3);
    fireEvent.change(within(sector).getByLabelText("Nombre del sector"), {target: {value: "Ventana norte"}});
    fireEvent.click(within(sector).getByRole("button", {name: "Aplicar sector"}));
    expect(screen.queryByRole("dialog", {name: "Propiedades del sector"})).toBeNull();
    expect(screen.getByRole("dialog", {name: "Medidas del salón"})).toBe(dimensions);
    expect(screen.getByRole("dialog", {name: "Mesas y cupos por sector"})).toBe(tablesDialog);
    expect(name.value).toBe("Salón con ventana"); expect(cap.value).toBe("6");
    fireEvent.click(within(tablesDialog).getByRole("button", {name: "Agregar mesa"}));
    expect(plan().tables).toHaveLength(3);
    expect(plan().tables[2]).toMatchObject({locationId: "window", capacity: 6});
    fireEvent.click(within(dimensions).getByRole("button", {name: "Aplicar medidas"}));
    expect(plan()).toMatchObject({name: "Salón con ventana", locations: [expect.objectContaining({name: "Ventana norte"})]});
    expect(plan().tables).toHaveLength(3);
    expect(dimensions.style.left).toBe(position);
    expect(screen.getByRole("dialog", {name: "Mesas y cupos por sector"})).toBe(tablesDialog);
    fireEvent.click(within(tablesDialog).getByRole("button", {name: "Volver al plano"}));
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("restaurant", expect.objectContaining({expectedRevision: 4, room: expect.objectContaining({name: "Salón con ventana", tables: plan().tables})})));
    expect(screen.getByTestId("admin-canvas")).toBe(canvas); expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it("closes only the requested tool while another minimized form preserves its draft", async () => {
    await editor(); tool("Medidas"); const dimensions = screen.getByRole("dialog", {name: "Medidas del sal\u00F3n"});
    fireEvent.change(within(dimensions).getByLabelText("Ancho del plano"), {target: {value: "1200"}});
    fireEvent.click(within(dimensions).getByRole("button", {name: "Minimizar ventana"})); tool("Mesas");
    const tablesDialog = screen.getByRole("dialog", {name: "Mesas y cupos por sector"});
    fireEvent.change(within(tablesDialog).getByLabelText("Capacidad base"), {target: {value: "8"}});
    fireEvent.click(within(tablesDialog).getByRole("button", {name: "Cerrar ventana"}));
    expect(tablesDialog.isConnected).toBe(false); expect(dimensions.isConnected).toBe(true);
    expect(within(dimensions).getByRole("button", {name: "Restaurar ventana"})).toBeTruthy();
    tool("Mesas"); expect((within(screen.getByRole("dialog", {name: "Mesas y cupos por sector"})).getByLabelText("Capacidad base") as HTMLInputElement).value).toBe("4");
    tool("Medidas"); expect((within(dimensions).getByLabelText("Ancho del plano") as HTMLInputElement).value).toBe("1200");
    expect(screen.getAllByRole("dialog")).toHaveLength(2); expect(screen.queryByRole("button", {name: /Abrir ventana/})).toBeNull();
  });

  it("rejects stale table properties after another edit modifies that table", async () => {
    await editor(); tool("Mesas");
    const tablesDialog = screen.getByRole("dialog", {name: "Mesas y cupos por sector"});
    fireEvent.click(within(tablesDialog).getByRole("button", {name: "Editar mesa M1"}));
    const tableDialog = screen.getByRole("dialog", {name: "Propiedades de la mesa"});
    const label = within(tableDialog).getByLabelText("Número o nombre") as HTMLInputElement;
    fireEvent.change(label, {target: {value: "Pendiente"}});
    fireEvent.click(within(tableDialog).getByRole("button", {name: "Minimizar ventana"}));
    fireEvent.click(screen.getByRole("button", {name: "Arrastrar sector Ventana"}));
    fireEvent.click(within(tableDialog).getByRole("button", {name: "Restaurar ventana"}));
    fireEvent.click(within(tableDialog).getByRole("button", {name: "Aplicar mesa"}));
    expect(within(tableDialog).getByRole("alert").textContent).toContain("cambiaron en otra herramienta");
    expect(plan().tables[0]).toMatchObject({id: "one", label: "M1"});
    expect(label.value).toBe("Pendiente"); expect(label.isConnected).toBe(true);
    fireEvent.click(within(tableDialog).getByRole("button", {name: "Cancelar"}));
    expect(screen.getByRole("dialog", {name: "Mesas y cupos por sector"})).toBe(tablesDialog);
    expect(api.save).not.toHaveBeenCalled();
  });

  it("opens one independent window per sector and restores the chosen entity with its pending values", async () => {
    const value = config();
    value.rooms[0].locations.push({...room.locations[0], id: "entrance", name: "Entrada", x: 160, width: 140});
    api.config.mockResolvedValue(value);
    await editor();
    fireEvent.click(within(sectorMenu()).getByRole("menuitem", {name: "Editar"}));
    const windowSector = screen.getByRole("dialog", {name: "Propiedades del sector"});
    const windowName = within(windowSector).getByLabelText("Nombre del sector") as HTMLInputElement;
    fireEvent.change(windowName, {target: {value: "Ventana pendiente"}});
    const openEntrance = () => {
      tool("Sectores");
      fireEvent.click(within(screen.getByRole("navigation", {name: "Sectores del salón"})).getByRole("button", {name: "Entrada"}));
      fireEvent.click(within(screen.getByRole("menu", {name: "Acciones de Entrada"})).getByRole("menuitem", {name: "Editar"}));
    };
    openEntrance();
    const entranceSector = screen.getAllByRole("dialog", {name: "Propiedades del sector"}).find((dialog) => dialog !== windowSector)!;
    const entranceName = within(entranceSector).getByLabelText("Nombre del sector") as HTMLInputElement;
    fireEvent.change(entranceName, {target: {value: "Entrada pendiente"}});
    fireEvent.click(within(entranceSector).getByRole("button", {name: "Minimizar ventana"}));
    openEntrance();
    expect(screen.getAllByRole("dialog", {name: "Propiedades del sector"})).toHaveLength(2);
    expect(within(entranceSector).getByLabelText("Nombre del sector")).toBe(entranceName);
    expect(entranceName.value).toBe("Entrada pendiente");
    fireEvent.click(within(windowSector).getByRole("button", {name: "Minimizar ventana"}));
    fireEvent.click(within(entranceSector).getByRole("button", {name: "Aplicar sector"}));
    expect(plan().locations.map((sector) => sector.name)).toEqual(["Ventana", "Entrada pendiente"]);
    fireEvent.click(within(windowSector).getByRole("button", {name: "Restaurar ventana"}));
    expect(windowName.value).toBe("Ventana pendiente");
    fireEvent.click(within(windowSector).getByRole("button", {name: "Aplicar sector"}));
    expect(plan().locations.map((sector) => sector.name)).toEqual(["Ventana pendiente", "Entrada pendiente"]);
    expect(api.save).not.toHaveBeenCalled();
  });

  it("keeps a removed element's old properties visible but refuses to resurrect it", async () => {
    await editor();
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar elemento Barra"}));
    fireEvent.click(within(screen.getByRole("complementary", {name: "Selección del plano"})).getByRole("button", {name: "Editar"}));
    const element = screen.getByRole("dialog", {name: "Propiedades del elemento"});
    const text = within(element).getByLabelText("Texto") as HTMLInputElement;
    fireEvent.change(text, {target: {value: "Barra pendiente"}});
    fireEvent.click(within(screen.getByRole("complementary", {name: "Selección del plano"})).getByRole("button", {name: "Eliminar"}));
    fireEvent.click(within(screen.getByRole("dialog", {name: "Eliminar elemento"})).getByRole("button", {name: "Eliminar elemento"}));
    expect(plan().fixtures).toEqual([]);
    expect(screen.getByRole("dialog", {name: "Propiedades del elemento"})).toBe(element);
    fireEvent.click(within(element).getByRole("button", {name: "Aplicar elemento"}));
    expect(within(element).getByRole("alert").textContent).toContain("cambiaron en otra herramienta");
    expect(plan().fixtures).toEqual([]); expect(text.value).toBe("Barra pendiente");
    expect(api.save).not.toHaveBeenCalled();
  });

  it("preserves every pending tool when navigation is canceled and clears them only after changing rooms", async () => {
    const value = config(); value.rooms.push({...structuredClone(room), id: "terrace", name: "Terraza"}); api.config.mockResolvedValue(value);
    await editor(); tool("Medidas");
    const dimensions = screen.getByRole("dialog", {name: "Medidas del salón"});
    const name = within(dimensions).getByLabelText("Nombre del salón") as HTMLInputElement;
    fireEvent.change(name, {target: {value: "Nombre pendiente"}});
    tool("Mesas");
    const tablesDialog = screen.getByRole("dialog", {name: "Mesas y cupos por sector"});
    const cap = within(tablesDialog).getByLabelText("Capacidad base") as HTMLInputElement;
    fireEvent.change(cap, {target: {value: "6"}});
    const switchRoom = () => { tool("Salones"); fireEvent.click(within(screen.getByRole("navigation", {name: "Salones del restaurante"})).getByRole("button", {name: "Terraza"})); };
    switchRoom();
    fireEvent.click(within(screen.getByRole("dialog", {name: "Descartar cambios sin guardar"})).getByRole("button", {name: "Cancelar"}));
    expect(screen.getByRole("dialog", {name: "Medidas del salón"})).toBe(dimensions);
    expect(screen.getByRole("dialog", {name: "Mesas y cupos por sector"})).toBe(tablesDialog);
    expect(name.value).toBe("Nombre pendiente"); expect(cap.value).toBe("6");
    expect(plan().id).toBe("main");
    switchRoom(); fireEvent.click(screen.getByRole("button", {name: "Descartar y continuar"}));
    expect(plan().id).toBe("terrace"); expect(name.isConnected).toBe(false); expect(cap.isConnected).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull(); expect(screen.queryByRole("complementary", {name: "Ventanas ocultas del salón"})).toBeNull();
    expect(api.save).not.toHaveBeenCalled();
  });

  it("discards only the spatial property form on X or Cancelar", async () => {
    await editor(); tool("Mesas"); const tablesDialog = screen.getByRole("dialog", {name: "Mesas y cupos por sector"});
    fireEvent.change(within(tablesDialog).getByLabelText("Capacidad base"), {target: {value: "6"}});
    fireEvent.click(within(sectorMenu()).getByRole("menuitem", {name: "Editar"}));
    const pane = screen.getByRole("dialog", {name: "Propiedades del sector"});
    fireEvent.change(within(pane).getByLabelText("Nombre del sector"), {target: {value: "Sin aplicar"}});
    fireEvent.click(within(pane).getByRole("button", {name: "Cerrar ventana"})); expect(pane.isConnected).toBe(false);
    expect(plan().locations[0].name).toBe("Ventana"); expect((within(tablesDialog).getByLabelText("Capacidad base") as HTMLInputElement).value).toBe("6");
    fireEvent.click(within(sectorMenu()).getByRole("menuitem", {name: "Editar"}));
    const fresh = screen.getByRole("dialog", {name: "Propiedades del sector"}); expect((within(fresh).getByLabelText("Nombre del sector") as HTMLInputElement).value).toBe("Ventana");
    fireEvent.click(within(fresh).getByRole("button", {name: "Cancelar"})); expect(screen.queryByRole("dialog", {name: "Propiedades del sector"})).toBeNull();
    expect(screen.getByRole("dialog", {name: "Mesas y cupos por sector"})).toBe(tablesDialog);
  });

  it("keeps destructive confirmations modal while returning to the nonmodal editor on cancel", async () => {
    await editor(); tool("Medidas");
    expect(screen.getByRole("dialog", {name: "Medidas del salón"}).getAttribute("aria-modal")).toBe("false");
    fireEvent.click(screen.getByRole("button", {name: "Archivar salón"}));
    const confirmation = screen.getByRole("dialog", {name: "Archivar salón"});
    expect(confirmation.getAttribute("aria-modal")).toBe("true");
    expect(screen.getAllByRole("dialog").filter((dialog) => dialog.getAttribute("aria-modal") === "true")).toEqual([confirmation]);
    expect(screen.getByRole("dialog", {name: "Medidas del salón"})).toBeTruthy();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(within(confirmation).getByRole("button", {name: "Cancelar"}));
    expect(screen.getByRole("dialog", {name: "Medidas del salón"}).getAttribute("aria-modal")).toBe("false");
    expect(document.body.style.overflow).toBe(""); expect(api.save).not.toHaveBeenCalled();
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

  it("configures sector quotas and fixed tables inside sectors, enforcing maxTables limit", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    fireEvent.click(within(sectorMenu()).getByRole("menuitem", {name: "Editar"}));
    const sectorDialog = screen.getByRole("dialog", {name: "Propiedades del sector"});
    fireEvent.change(within(sectorDialog).getByLabelText("Cupo de mesas"), {target: {value: "3"}});
    fireEvent.change(within(sectorDialog).getByLabelText("Cupo de personas"), {target: {value: "16"}});
    fireEvent.click(within(sectorDialog).getByRole("button", {name: "Aplicar sector"}));

    tool("Mesas");
    const tablesDialog = screen.getByRole("dialog", {name: "Mesas y cupos por sector"});
    fireEvent.click(within(tablesDialog).getByRole("button", {name: "Agregar mesa"}));
    expect(tables().map((t) => t.id)).toHaveLength(3);
    expect((within(tablesDialog).getByRole("button", {name: "Agregar mesa"}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(tablesDialog).getByRole("button", {name: "Volver al plano"}));

    applyWidth(1400);
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    const command = api.save.mock.calls[0][1];
    expect(command).toMatchObject({action: "save-room", expectedRevision: 4, room: {id: "main", width: 1400}});
    expect(command.room.tables).toHaveLength(3);
    expect(command.room.tables.every((table: {locationId?: string}) => table.locationId === "window")).toBe(true);
    expect(command.room.locations[0]).toMatchObject({maxTables: 3, maxCapacity: 16});
    await waitFor(() => expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(true));
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it("allows assigning legacy unlocated tables into a sector", async () => {
    const value = config();
    value.rooms[0].tables.push({id: "legacy", label: "L1", shape: "SQUARE", capacity: 2, width: 80, height: 80, x: 0, y: 0, rotation: 0, active: true});
    api.config.mockResolvedValue(value);
    await editor();
    expect(tables().map((t) => t.id)).toEqual(["one", "two"]);
    tool("Mesas");
    expect(screen.getByText(/Mesas sin ubicar en sector \(1\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Ubicar"}));
    expect(tables().map((t) => t.id)).toEqual(["one", "two", "legacy"]);
    expect(plan().tables.find((t) => t.id === "legacy")).toMatchObject({locationId: "window", active: true});
  });

  it("moves a marquee selection together and rejects a move that places any member outside the room", async () => {
    const value = config();
    const entrance = {id: "entry", type: "LABEL" as const, label: "Entrada", x: 100, y: 100, width: 80, height: 20, rotation: 0 as const};
    value.rooms[0].fixtures.push(entrance);
    api.config.mockResolvedValue(value);
    await editor();
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar con recuadro"}));
    expect(screen.getByText(/^2 elementos seleccionados/).getAttribute("role")).toBe("status");
    expect((screen.getByRole("button", {name: "Redimensionar sector Ventana"}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", {name: "Arrastrar sector Ventana"}));
    const moved = plan();
    expect(moved.locations[0]).toMatchObject({x: 460, y: 310});
    expect(moved.fixtures[0]).toMatchObject({x: 710, y: 460});
    expect(moved.fixtures[1]).toEqual(entrance);

    Object.assign(cursor.move, {x: 530, y: 310});
    fireEvent.click(screen.getByRole("button", {name: "Arrastrar sector Ventana"}));
    expect(screen.getByRole("alert").textContent).toContain("La referencia Barra queda fuera del salón");
    expect(plan()).toEqual(moved);
    fireEvent.click(screen.getByRole("button", {name: "Limpiar selección"}));
    expect(screen.getByText("Cambios sin guardar").getAttribute("role")).toBe("status");
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
    fireEvent.click(screen.getByRole("button", {name: "Cancelar"}));
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
    fireEvent.click(screen.getByRole("button", {name: "Cancelar"}));
    expect(plan().fixtures).toHaveLength(1);
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
    expect(api.save).not.toHaveBeenCalled();
  });

  it("opens sector actions at the pointer, adds a fixed table, and archives the sector on confirmation", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar sector Ventana"}));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("complementary", {name: "Selección del plano"})).toBeNull();
    const menu = sectorMenu();
    expect(menu.style.left).toBe("420px"); expect(menu.style.top).toBe("300px");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Editar", "Girar", "Eliminar", "Agregar mesa aquí"]);
    fireEvent.click(within(menu).getByRole("menuitem", {name: "Agregar mesa aquí"}));
    expect(tables()).toHaveLength(3);
    fireEvent.click(within(sectorMenu()).getByRole("menuitem", {name: "Girar"}));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(plan().locations[0].rotation).toBe(90);
    fireEvent.click(within(sectorMenu()).getByRole("menuitem", {name: "Eliminar"}));
    expect(screen.queryByRole("menu")).toBeNull();
    const confirmation = screen.getByRole("dialog", {name: "Archivar sector"});
    expect(plan().locations[0].active).toBe(true);
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(within(confirmation).getByRole("button", {name: "Archivar sector"}));
    expect(plan().locations).toEqual([]);
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
    expect(plan().locations[0]).toMatchObject(room.locations[0]);
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
    expect(plan()).toMatchObject({ width: 2000, height: 2000 });
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
    expect(plan().locations[0]).toMatchObject(room.locations[0]);
    expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(true);
    applyWidth(900);
    fireEvent.click(screen.getByRole("button", {name: "Redimensionar sector Ventana"}));
    expect((screen.getByRole("alert")).textContent).toContain("fuera del salón");
    expect(plan()).toMatchObject({width: 900, locations: [expect.objectContaining(room.locations[0])]});
    expect((screen.getByRole("button", {name: "Guardar plano"}) as HTMLButtonElement).disabled).toBe(false);
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    expect(api.save.mock.calls[0][1]).toMatchObject({expectedRevision: 4, room: {width: 900, locations: room.locations}});
  });

  it("keeps general tool windows nonmodal and locks geometry only for spatial edits, placement or saving", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Seleccionar sector Ventana"}));
    expect(canvas.getAttribute("data-resize-enabled")).toBe("true");
    tool("Medidas");
    expect(canvas.getAttribute("data-resize-enabled")).toBe("true");
    closeDialog();
    expect(canvas.getAttribute("data-resize-enabled")).toBe("true");
    fireEvent.click(within(sectorMenu()).getByRole("menuitem", {name: "Editar"}));
    expect(canvas.getAttribute("data-resize-enabled")).toBe("false");
    fireEvent.click(screen.getByRole("button", {name: "Cancelar"}));
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
    fireEvent.keyDown(screen.getByRole("dialog", {name: "Medidas del salón"}), {key: "Escape"});
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
    tool("Medidas");
    expect((screen.getByLabelText("Ancho del plano") as HTMLInputElement).value).toBe("1400");
    fireEvent.click(screen.getByRole("button", {name: "Cancelar"}));
    const unloadAfterCancel = new Event("beforeunload", {cancelable: true});
    act(() => { window.dispatchEvent(unloadAfterCancel); });
    expect(unloadAfterCancel.defaultPrevented).toBe(false);
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

  it("translates child fixed tables when dragging their sector and saves fixed layout", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", {name: "Desplazar plano"}));
    fireEvent.click(screen.getByRole("button", {name: "Arrastrar sector Ventana"}));
    expect(plan().locations[0]).toMatchObject({x: 460, y: 310});
    expect(plan().tables.map((t) => ({id: t.id, x: t.x, y: t.y}))).toEqual([
      {id: "one", x: 300, y: 270},
      {id: "two", x: 440, y: 270},
    ]);
    fireEvent.click(screen.getByRole("button", {name: "Guardar plano"}));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    const saved = api.save.mock.calls[0][1].room as FloorRoom;
    expect(saved.combinations).toEqual([]);
    expect(saved.tables[0]).toMatchObject({id: "one", x: 300, y: 270, locationId: "window"});
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it("deletes rooms from the rooms flyout and dimensions dialog with confirmation", async () => {
    const secondRoom: FloorRoom = {...structuredClone(room), id: "terrace", name: "Terraza", revision: 2};
    const initial = config();
    initial.rooms.push(secondRoom);
    api.config.mockResolvedValue(initial);
    api.save.mockImplementation(async (_restaurantId: string, command: {action: string; roomId?: string}) => {
      if (command.action === "delete-room") {
        return {...initial, rooms: initial.rooms.filter((item) => item.id !== command.roomId)};
      }
      return initial;
    });

    await editor();
    tool("Salones");
    const flyoutNav = screen.getByRole("navigation", {name: "Salones del restaurante"});
    fireEvent.click(within(flyoutNav).getByRole("button", {name: "Eliminar salón Terraza"}));

    const confirmModal = screen.getByRole("dialog", {name: "Eliminar salón"});
    fireEvent.click(within(confirmModal).getByRole("button", {name: "Eliminar salón"}));

    await waitFor(() => {
      expect(api.save).toHaveBeenCalledWith("restaurant", {action: "delete-room", roomId: "terrace", expectedRevision: 2});
    });

    // Also supports deleting the currently open room from Medidas
    tool("Medidas");
    fireEvent.click(screen.getByRole("button", {name: "Eliminar salón"}));
    const currentConfirm = screen.getByRole("dialog", {name: "Eliminar salón"});
    fireEvent.click(within(currentConfirm).getByRole("button", {name: "Eliminar salón"}));

    await waitFor(() => {
      expect(api.save).toHaveBeenCalledWith("restaurant", {action: "delete-room", roomId: "main", expectedRevision: 4});
    });
  });
});
