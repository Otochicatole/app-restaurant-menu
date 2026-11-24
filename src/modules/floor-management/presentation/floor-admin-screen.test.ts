/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FloorConfigView, FloorFixture, FloorLocation, FloorRoom, FloorRoomInput } from "../contracts";
import type { FloorCanvasElement, FloorInteractionMode } from "./FloorCanvas";

const api = vi.hoisted(() => ({ config: vi.fn(), save: vi.fn(), push: vi.fn(), logout: vi.fn() }));
const cursor = vi.hoisted(() => ({ resize: { x: 420, y: 300, width: 640, height: 400 }, move: { x: 460, y: 310 } }));

vi.mock("./floor-api", () => ({ getFloorConfig: api.config, saveFloorAction: api.save, floorInputClass: "input" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: api.push }),
  usePathname: () => "/admin/restaurants/restaurant/rooms",
}));
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => createElement("img", { alt, src }),
}));
vi.mock("@/modules/identity-access/ui", () => ({
  LogoutButton: ({
    disabled,
    onBeforeLogout,
  }: {
    disabled?: boolean;
    onBeforeLogout?: (proceed: () => Promise<void>) => void;
  }) =>
    createElement(
      "button",
      {
        disabled,
        onClick: () => {
          if (onBeforeLogout) onBeforeLogout(api.logout);
          else void api.logout();
        },
      },
      "Cerrar sesión",
    ),
}));

vi.mock("./FloorCanvas", () => ({
  FloorCanvas: (props: {
    room: { id: string; width: number; height: number; locations?: FloorLocation[]; fixtures: FloorFixture[] };
    tables: { id: string; label: string; x: number; y: number }[];
    selectedIds?: string[];
    selectedLocationId?: string | null;
    interactionMode?: FloorInteractionMode;
    fullScreen?: boolean;
    editorMode?: boolean;
    hideModeSwitch?: boolean;
    grid?: boolean;
    onSelect?: (id: string, additive: boolean) => void;
    onMove?: (ids: string[], delta: { x: number; y: number }) => void;
    onSelectMany?: (ids: string[], additive: boolean) => void;
    onSelectElements?: (elements: FloorCanvasElement[], additive: boolean) => void;
    onClearSelection?: () => void;
    onPlace?: (point: { x: number; y: number }, locationId?: string) => void;
    onSelectLocation?: (id: string) => void;
    onMoveLocation?: (id: string, point: { x: number; y: number }) => void;
    onContextMenuLocation?: (id: string, point: { x: number; y: number }) => void;
    onResizeLocation?: (id: string, geometry: { x: number; y: number; width: number; height: number }) => void;
    onSelectFixture?: (id: string) => void;
    onMoveFixture?: (id: string, point: { x: number; y: number }) => void;
  }) => {
    const [pan, setPan] = useState(0);
    return createElement(
      "div",
      {
        "data-testid": "admin-canvas",
        "data-full-screen": props.fullScreen,
        "data-editor-mode": props.editorMode,
        "data-hide-mode-switch": props.hideModeSwitch,
        "data-grid": props.grid,
        "data-interaction-mode": props.interactionMode,
        "data-resize-enabled": Boolean(props.onResizeLocation),
      },
      createElement("button", { type: "button", onClick: () => setPan((value) => value + 1) }, "Desplazar plano"),
      props.onPlace &&
        createElement(
          "button",
          { type: "button", onClick: () => props.onPlace?.({ x: 500, y: 350 }) },
          "Colocar en plano",
        ),
      ...(props.room.locations ?? []).map((location) =>
        createElement(
          "div",
          { key: location.id },
          createElement(
            "button",
            { type: "button", onClick: () => props.onSelectLocation?.(location.id) },
            `Seleccionar sector ${location.name}`,
          ),
          createElement(
            "button",
            {
              type: "button",
              disabled: !props.onContextMenuLocation,
              onContextMenu: (event: { preventDefault: () => void }) => {
                event.preventDefault();
                props.onContextMenuLocation?.(location.id, { x: 420, y: 300 });
              },
            },
            `Menú del sector ${location.name}`,
          ),
          createElement(
            "button",
            {
              type: "button",
              disabled: !props.onResizeLocation || props.selectedLocationId !== location.id,
              onClick: () => props.onResizeLocation?.(location.id, { ...cursor.resize }),
            },
            `Redimensionar sector ${location.name}`,
          ),
          createElement(
            "button",
            { type: "button", onClick: () => props.onMoveLocation?.(location.id, cursor.move) },
            `Arrastrar sector ${location.name}`,
          ),
        ),
      ),
      ...props.room.fixtures.map((fixture) =>
        createElement(
          "div",
          { key: fixture.id },
          createElement(
            "button",
            { type: "button", onClick: () => props.onSelectFixture?.(fixture.id) },
            `Seleccionar elemento ${fixture.label}`,
          ),
          createElement(
            "button",
            { type: "button", onClick: () => props.onMoveFixture?.(fixture.id, { x: 620, y: 440 }) },
            `Arrastrar elemento ${fixture.label}`,
          ),
        ),
      ),
      createElement(
        "button",
        { type: "button", onClick: () => props.onSelectMany?.(props.tables.map((table) => table.id), false) },
        "Seleccionar todas las mesas",
      ),
      createElement(
        "button",
        {
          type: "button",
          onClick: () =>
            props.onSelectElements?.(
              [
                ...(props.room.locations ?? []).slice(0, 1).map((location) => ({
                  kind: "sector" as const,
                  id: location.id,
                })),
                ...props.room.fixtures.slice(0, 1).map((fixture) => ({
                  kind: "fixture" as const,
                  id: fixture.id,
                })),
              ],
              false,
            ),
        },
        "Seleccionar con recuadro",
      ),
      createElement("button", { type: "button", onClick: props.onClearSelection }, "Limpiar selección"),
      createElement(
        "button",
        { type: "button", onClick: () => props.onMove?.(props.selectedIds ?? [], { x: 20, y: 10 }) },
        "Mover armado",
      ),
      createElement("output", { "data-testid": "admin-pan" }, String(pan)),
      createElement(
        "output",
        { "data-testid": "admin-interaction" },
        JSON.stringify({
          place: Boolean(props.onPlace),
          selectSector: Boolean(props.onSelectLocation),
          dragSector: Boolean(props.onMoveLocation),
          selectElement: Boolean(props.onSelectFixture),
          dragElement: Boolean(props.onMoveFixture),
        }),
      ),
      createElement("output", { "data-testid": "admin-plan" }, JSON.stringify(props.room)),
      createElement("output", { "data-testid": "admin-tables" }, JSON.stringify(props.tables)),
    );
  },
}));

import { FloorAdminScreen } from "./FloorAdminScreen";
import { AdminShell } from "@/ui/admin/AdminShell";

const room: FloorRoom = {
  id: "main",
  restaurantId: "restaurant",
  name: "Salón principal",
  width: 800,
  height: 600,
  revision: 4,
  active: true,
  fixtures: [{ id: "bar", type: "BAR", label: "Barra", x: 650, y: 450, width: 100, height: 60, rotation: 0 }],
  locations: [{ id: "window", name: "Ventana", x: 400, y: 300, width: 600, height: 400, rotation: 0, active: true }],
  tables: [
    { id: "one", label: "M1", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 240, y: 260, rotation: 0, active: true, locationId: "window" },
    { id: "two", label: "M2", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 380, y: 260, rotation: 0, active: true, locationId: "window" },
  ],
  combinations: [],
};

function config(): FloorConfigView {
  return {
    restaurantId: "restaurant",
    restaurantName: "Bistró",
    enabled: true,
    timeZone: "America/Argentina/Buenos_Aires",
    rooms: [structuredClone(room)],
    staffAccount: null,
    compatibility: { status: "compatible" },
  };
}

const plan = (): FloorRoom => JSON.parse(screen.getByTestId("admin-plan").textContent!);
const tables = (): { id: string }[] => JSON.parse(screen.getByTestId("admin-tables").textContent!);

async function editor({ withShell = false, landingEnabled = true }: { withShell?: boolean; landingEnabled?: boolean } = {}) {
  const content = createElement(FloorAdminScreen, { restaurantId: "restaurant" });
  render(
    withShell
      ? createElement(
          AdminShell,
          {
            restaurantId: "restaurant",
            organizationName: "Organización",
            brandTitle: "Bistró",
            brandSubtitle: "",
            showMenuPickerLink: true,
            landingEnabled,
          } as Parameters<typeof AdminShell>[0],
          content,
        )
      : content,
  );
  return screen.findByTestId("admin-canvas");
}

function openTab(label: "Estructura" | "Salón" | "Ajustes") {
  if (screen.queryByRole("button", { name: "Volver al salón" })) {
    fireEvent.click(screen.getByRole("button", { name: "Volver al salón" }));
  }
  fireEvent.click(screen.getByRole("tab", { name: label }));
}

function applyWidth(width: number) {
  openTab("Salón");
  fireEvent.change(screen.getByLabelText("Ancho del plano"), { target: { value: String(width) } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar medidas" }));
}

function sectorMenu(name = "Ventana") {
  fireEvent.contextMenu(screen.getByRole("button", { name: `Menú del sector ${name}` }));
  return screen.getByRole("menu", { name: `Acciones de ${name}` });
}

describe("fullscreen studio room editor workflows", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.style.overflow = "";
    Object.assign(cursor.resize, { x: 420, y: 300, width: 640, height: 400 });
    Object.assign(cursor.move, { x: 460, y: 310 });
    api.logout.mockResolvedValue(undefined);
    const current = config();
    api.config.mockResolvedValue(current);
    api.save.mockImplementation(
      async (_restaurantId: string, command: { action: string; room?: FloorRoomInput; expectedRevision?: number }) => {
        if (command.action !== "save-room" || !command.room) return current;
        const saved = {
          ...command.room,
          id: command.room.id!,
          restaurantId: "restaurant",
          revision: (command.expectedRevision ?? 0) + 1,
        };
        return { ...current, rooms: [saved, ...current.rooms.filter((item) => item.id !== saved.id)] };
      },
    );
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
    vi.restoreAllMocks();
  });

  it("renders the clean 3-zone studio layout without floating bottom toolbar or modal windows", async () => {
    await editor({ withShell: true });
    expect(screen.getByRole("region", { name: "Editor del salón" })).toBeTruthy();
    const canvas = screen.getByTestId("admin-canvas");
    expect(canvas.getAttribute("data-full-screen")).toBe("true");
    expect(canvas.getAttribute("data-editor-mode")).toBe("true");
    expect(canvas.getAttribute("data-hide-mode-switch")).toBe("true");
    expect(tables().map((table) => table.id)).toEqual(["one", "two"]);

    // Top studio bar controls (without the old 8-button bottom dock)
    const toolbar = screen.getByRole("navigation", { name: "Herramientas del editor" });
    for (const name of ["Seleccionar", "Mover vista", "Agregar sector", "Agregar mesa", "Agregar elemento"]) {
      expect(within(toolbar).getByRole("button", { name })).toBeTruthy();
    }
    expect(within(toolbar).queryByRole("button", { name: "Medidas" })).toBeNull();
    expect(within(toolbar).queryByRole("button", { name: "Salones" })).toBeNull();
    expect(screen.queryByRole("complementary", { name: "Selección del plano" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();

    // AdminShell sidebar links
    const navigation = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(within(navigation).getByRole("link", { name: "Salones" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Ver sala" }).getAttribute("href")).toBe("/floor?restaurantId=restaurant");
    expect((screen.getByRole("button", { name: "Guardar plano" }) as HTMLButtonElement).disabled).toBe(true);

    // Docked inspector tabs
    expect(screen.getByRole("tab", { name: "Estructura" }).getAttribute("aria-selected")).toBe("true");
    openTab("Ajustes");
    expect(screen.getByText(/Asignación de mesas/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("switches interaction modes from the top bar and keeps canvas zoom/pan intact", async () => {
    const canvas = await editor();
    expect(canvas.getAttribute("data-interaction-mode")).toBe("select");
    fireEvent.click(screen.getByRole("button", { name: "Mover vista" }));
    expect(canvas.getAttribute("data-interaction-mode")).toBe("pan");
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    expect(canvas.getAttribute("data-interaction-mode")).toBe("select");
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    fireEvent.click(screen.getByRole("button", { name: "Agregar sector" }));
    expect(JSON.parse(screen.getByTestId("admin-interaction").textContent!).place).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    expect(JSON.parse(screen.getByTestId("admin-interaction").textContent!).place).toBe(false);

    const gridButton = screen.getByRole("button", { name: "Cuadrícula" });
    expect(gridButton.getAttribute("aria-pressed")).toBe("true");
    expect(canvas.getAttribute("data-grid")).toBe("true");
    fireEvent.click(gridButton);
    expect(gridButton.getAttribute("aria-pressed")).toBe("false");
    expect(canvas.getAttribute("data-grid")).toBe("false");
    fireEvent.click(gridButton);
    expect(gridButton.getAttribute("aria-pressed")).toBe("true");
    expect(canvas.getAttribute("data-grid")).toBe("true");
  });

  it("adds a sector directly onto the plan and opens its contextual inspector without dialogs", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", { name: "Agregar sector" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(JSON.parse(screen.getByTestId("admin-interaction").textContent!)).toEqual({
      place: true,
      selectSector: false,
      dragSector: false,
      selectElement: false,
      dragElement: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "Colocar en plano" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(plan().locations).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Inspector del sector" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nombre del sector"), { target: { value: "Ventana lateral" } });
    expect(plan().locations).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Ventana lateral", x: 500, y: 350 })]),
    );
    expect(JSON.parse(screen.getByTestId("admin-interaction").textContent!)).toEqual({
      place: false,
      selectSector: true,
      dragSector: true,
      selectElement: true,
      dragElement: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar plano" }));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        "restaurant",
        expect.objectContaining({
          action: "save-room",
          room: expect.objectContaining({
            locations: expect.arrayContaining([expect.objectContaining({ name: "Ventana lateral" })]),
          }),
        }),
      ),
    );
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
  });

  it("configures sector quotas and fixed tables inside the sector inspector, enforcing maxTables limit", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano" }));
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar sector Ventana" }));

    const inspector = screen.getByRole("region", { name: "Inspector del sector" });
    fireEvent.change(within(inspector).getByLabelText("Cupo de mesas"), { target: { value: "3" } });
    fireEvent.change(within(inspector).getByLabelText("Cupo de personas"), { target: { value: "16" } });
    fireEvent.change(within(inspector).getByLabelText("Capacidad base"), { target: { value: "6" } });

    const addBtn = within(inspector).getByRole("button", { name: "Agregar mesa" }) as HTMLButtonElement;
    fireEvent.click(addBtn);
    expect(tables()).toHaveLength(3);
    expect(plan().tables[2]).toMatchObject({ locationId: "window", capacity: 6 });
    expect(screen.getByRole("region", { name: "Inspector de mesa" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Volver al salón" }));
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar sector Ventana" }));
    expect(
      (within(screen.getByRole("region", { name: "Inspector del sector" })).getByRole("button", { name: "Agregar mesa" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    applyWidth(1400);
    fireEvent.click(screen.getByRole("button", { name: "Guardar plano" }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    const command = api.save.mock.calls[0][1];
    expect(command).toMatchObject({ action: "save-room", expectedRevision: 4, room: { id: "main", width: 1400 } });
    expect(command.room.tables).toHaveLength(3);
    expect(command.room.locations[0]).toMatchObject({ maxTables: 3, maxCapacity: 16 });
    await waitFor(() => expect((screen.getByRole("button", { name: "Guardar plano" }) as HTMLButtonElement).disabled).toBe(true));
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it("allows assigning legacy unlocated tables into a sector from the Estructura tab", async () => {
    const value = config();
    value.rooms[0].tables.push({
      id: "legacy",
      label: "L1",
      shape: "SQUARE",
      capacity: 2,
      width: 80,
      height: 80,
      x: 0,
      y: 0,
      rotation: 0,
      active: true,
    });
    api.config.mockResolvedValue(value);
    await editor();
    expect(tables().map((t) => t.id)).toEqual(["one", "two"]);
    expect(screen.getByText(/Mesas sin ubicar en sector \(1\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ubicar" }));
    expect(tables().map((t) => t.id)).toEqual(["one", "two", "legacy"]);
    expect(plan().tables.find((t) => t.id === "legacy")).toMatchObject({ locationId: "window", active: true });
  });

  it("moves a marquee selection together and rejects moves that place any member outside the room", async () => {
    const value = config();
    const entrance = {
      id: "entry",
      type: "LABEL" as const,
      label: "Entrada",
      x: 100,
      y: 100,
      width: 80,
      height: 20,
      rotation: 0 as const,
    };
    value.rooms[0].fixtures.push(entrance);
    api.config.mockResolvedValue(value);
    await editor();
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar con recuadro" }));
    expect(screen.getByText(/^2 elementos seleccionados/).getAttribute("role")).toBe("status");
    expect((screen.getByRole("button", { name: "Redimensionar sector Ventana" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Arrastrar sector Ventana" }));
    const moved = plan();
    expect(moved.locations[0]).toMatchObject({ x: 460, y: 310 });
    expect(moved.fixtures[0]).toMatchObject({ x: 710, y: 460 });
    expect(moved.fixtures[1]).toEqual(entrance);

    Object.assign(cursor.move, { x: 530, y: 310 });
    fireEvent.click(screen.getByRole("button", { name: "Arrastrar sector Ventana" }));
    expect(screen.getByRole("alert").textContent).toContain("La referencia Barra queda fuera del salón");
    expect(plan()).toEqual(moved);
    fireEvent.click(screen.getByRole("button", { name: "Limpiar selección" }));
    expect(screen.getByText("Cambios sin guardar").getAttribute("role")).toBe("status");
  });

  it("edits tables and architectural fixtures live via contextual inspector and places new elements", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano" }));

    fireEvent.click(screen.getByRole("button", { name: "Arrastrar elemento Barra" }));
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar elemento Barra" }));
    expect(screen.getByRole("region", { name: "Inspector de elemento" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "Barra principal" } });
    expect(plan().fixtures[0]).toMatchObject({ label: "Barra principal", x: 620, y: 440 });

    // Place a Texto fixture via the top bar dropdown menu
    fireEvent.click(screen.getByRole("button", { name: "Agregar elemento" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "Insertar elemento" })).getByRole("menuitem", { name: "Texto" }));
    fireEvent.click(screen.getByRole("button", { name: "Colocar en plano" }));
    expect(plan().fixtures).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Inspector de elemento" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "Recepción" } });
    expect(plan().fixtures[1].label).toBe("Recepción");

    // Delete newly added fixture
    fireEvent.click(screen.getByRole("button", { name: "Eliminar elemento" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Eliminar elemento" })).getByRole("button", { name: "Eliminar elemento" }));
    expect(plan().fixtures).toHaveLength(1);
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it("opens sector actions at the pointer, adds a fixed table, rotates, and archives the sector on confirmation", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano" }));
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar sector Ventana" }));
    expect(screen.queryByRole("menu")).toBeNull();
    const menu = sectorMenu();
    expect(menu.style.left).toBe("420px");
    expect(menu.style.top).toBe("300px");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Editar",
      "Girar",
      "Eliminar",
      "Agregar mesa aquí",
    ]);
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Agregar mesa aquí" }));
    expect(tables()).toHaveLength(3);

    fireEvent.click(within(sectorMenu()).getByRole("menuitem", { name: "Girar" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(plan().locations[0].rotation).toBe(90);

    fireEvent.click(within(sectorMenu()).getByRole("menuitem", { name: "Eliminar" }));
    const confirmDialog = screen.getByRole("dialog", { name: "Archivar sector" });
    expect(plan().locations[0].active).toBe(true);
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "Archivar sector" }));
    expect(plan().locations).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Guardar plano" }));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        "restaurant",
        expect.objectContaining({
          action: "save-room",
          expectedRevision: 4,
          room: expect.objectContaining({
            locations: [expect.objectContaining({ id: "window", active: false, rotation: 90 })],
          }),
        }),
      ),
    );
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it.each(["Shift+F10", "ContextMenu"] as const)(
    "offers sector actions from Estructura sector list via %s",
    async (gesture) => {
      await editor();
      const row = within(screen.getByRole("navigation", { name: "Sectores del salón" })).getByRole("button", {
        name: "Ventana",
      });
      row.focus();
      fireEvent.keyDown(row, {
        key: gesture === "Shift+F10" ? "F10" : "ContextMenu",
        shiftKey: gesture === "Shift+F10",
      });
      const menu = screen.getByRole("menu", { name: "Acciones de Ventana" });
      fireEvent.click(within(menu).getByRole("menuitem", { name: "Editar" }));
      expect(screen.getByRole("region", { name: "Inspector del sector" })).toBeTruthy();
      expect(screen.queryByRole("menu")).toBeNull();
    },
  );

  it("suppresses sector menus during placement, saving and a guarded room change", async () => {
    await editor();
    fireEvent.click(screen.getByRole("button", { name: "Agregar sector" }));
    const duringPlacement = screen.getByRole("button", { name: "Menú del sector Ventana" }) as HTMLButtonElement;
    expect(duringPlacement.disabled).toBe(true);
    fireEvent.contextMenu(duringPlacement);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar ubicación" }));

    let finishSave!: (value: FloorConfigView) => void;
    api.save.mockImplementationOnce(
      () =>
        new Promise<FloorConfigView>((complete) => {
          finishSave = complete;
        }),
    );
    applyWidth(900);
    fireEvent.click(screen.getByRole("button", { name: "Guardar plano" }));
    const duringSave = screen.getByRole("button", { name: "Menú del sector Ventana" }) as HTMLButtonElement;
    expect(duringSave.disabled).toBe(true);
    fireEvent.contextMenu(duringSave);
    expect(screen.queryByRole("menu")).toBeNull();

    const saved = config();
    saved.rooms[0].width = 900;
    saved.rooms[0].revision = 5;
    await act(async () => {
      finishSave(saved);
    });
    expect((screen.getByRole("button", { name: "Menú del sector Ventana" }) as HTMLButtonElement).disabled).toBe(false);

    applyWidth(1000);
    sectorMenu();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar salón" }));
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Selector rápido de salones" })).getByRole("button", {
        name: "Nuevo salón",
      }),
    );
    expect(screen.getByRole("dialog", { name: "Descartar cambios sin guardar" })).toBeTruthy();
    expect(screen.queryByRole("menu")).toBeNull();
    expect((screen.getByRole("button", { name: "Menú del sector Ventana" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Descartar y continuar" }));
    expect(plan().id).not.toBe("main");
    expect(plan().locations).toEqual([]);
    expect(plan()).toMatchObject({ width: 2000, height: 2000 });
    expect((screen.getByLabelText("Ancho del plano") as HTMLInputElement).value).toBe("2000");
    expect(api.save).toHaveBeenCalledTimes(1);
  });

  it("saves a selected sector's cursor resize and allows live numeric geometry updates", async () => {
    const initial = config();
    initial.rooms[0].locations[0].rotation = 180;
    api.config.mockResolvedValue(initial);
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano" }));
    expect((screen.getByRole("button", { name: "Redimensionar sector Ventana" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar sector Ventana" }));
    fireEvent.click(screen.getByRole("button", { name: "Redimensionar sector Ventana" }));
    expect(plan().locations[0]).toMatchObject({ x: 420, y: 300, width: 640, height: 400, rotation: 180 });
    fireEvent.click(screen.getByRole("button", { name: "Guardar plano" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    expect(api.save.mock.calls[0][1]).toMatchObject({
      expectedRevision: 4,
      room: { locations: [{ id: "window", x: 420, y: 300, width: 640, height: 400, rotation: 180 }] },
    });

    for (const [label, value] of [
      ["Centro X", "420"],
      ["Centro Y", "300"],
      ["Ancho del sector", "640"],
      ["Alto del sector", "400"],
      ["Rotación", "180"],
    ]) {
      expect((screen.getByLabelText(label) as HTMLInputElement | HTMLSelectElement).value).toBe(value);
    }
    for (const [label, value] of [
      ["Centro X", "430"],
      ["Centro Y", "310"],
      ["Ancho del sector", "620"],
      ["Alto del sector", "380"],
    ]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole("button", { name: "Guardar plano" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2));
    expect(api.save.mock.calls[1][1]).toMatchObject({
      expectedRevision: 5,
      room: { locations: [{ id: "window", x: 430, y: 310, width: 620, height: 380, rotation: 180 }] },
    });
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it("rejects an out-of-room resize without changing pristine or previously edited room data", async () => {
    await editor();
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar sector Ventana" }));
    Object.assign(cursor.resize, { x: 20 });
    fireEvent.click(screen.getByRole("button", { name: "Redimensionar sector Ventana" }));
    expect(screen.getByRole("alert").textContent).toContain("fuera del salón");
    expect(plan().locations[0]).toMatchObject(room.locations[0]);
    expect((screen.getByRole("button", { name: "Guardar plano" }) as HTMLButtonElement).disabled).toBe(true);

    applyWidth(900);
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar sector Ventana" }));
    fireEvent.click(screen.getByRole("button", { name: "Redimensionar sector Ventana" }));
    expect(screen.getByRole("alert").textContent).toContain("fuera del salón");
    expect(plan()).toMatchObject({ width: 900, locations: [expect.objectContaining(room.locations[0])] });
    expect((screen.getByRole("button", { name: "Guardar plano" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Guardar plano" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    expect(api.save.mock.calls[0][1]).toMatchObject({
      expectedRevision: 4,
      room: { width: 900, locations: room.locations },
    });
  });

  it("keeps destructive confirmations modal while locking geometry only during placement or saving", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar sector Ventana" }));
    expect(canvas.getAttribute("data-resize-enabled")).toBe("true");

    openTab("Salón");
    fireEvent.click(screen.getByRole("button", { name: "Archivar salón" }));
    const modal = screen.getByRole("dialog", { name: "Archivar salón" });
    expect(modal.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(within(modal).getByRole("button", { name: "Cancelar" }));
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Agregar sector" }));
    expect(canvas.getAttribute("data-resize-enabled")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar ubicación" }));
    expect(canvas.getAttribute("data-resize-enabled")).toBe("true");

    let finishSave!: (value: FloorConfigView) => void;
    api.save.mockImplementationOnce(
      () =>
        new Promise<FloorConfigView>((complete) => {
          finishSave = complete;
        }),
    );
    applyWidth(900);
    fireEvent.click(screen.getByRole("button", { name: "Guardar plano" }));
    expect(canvas.getAttribute("data-resize-enabled")).toBe("false");
    const saved = config();
    saved.rooms[0].width = 900;
    saved.rooms[0].revision = 5;
    await act(async () => {
      finishSave(saved);
    });
    expect(canvas.getAttribute("data-resize-enabled")).toBe("true");
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
  });

  it("preserves applied draft changes and their revision after a failed save", async () => {
    api.save.mockRejectedValueOnce(new Error("El salón cambió en otra pestaña."));
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano" }));
    applyWidth(1400);
    fireEvent.click(screen.getByRole("button", { name: "Guardar plano" }));
    expect((await screen.findByRole("alert")).textContent).toContain("El salón cambió");
    expect(plan().width).toBe(1400);
    expect((screen.getByRole("button", { name: "Guardar plano" }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Guardar plano" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2));
    expect(api.save.mock.calls[0][1]).toEqual(api.save.mock.calls[1][1]);
    expect(api.save.mock.calls[1][1].expectedRevision).toBe(4);
    await waitFor(() => expect((screen.getByRole("button", { name: "Guardar plano" }) as HTMLButtonElement).disabled).toBe(true));
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");

    const unloadAfterSave = new Event("beforeunload", { cancelable: true });
    act(() => {
      window.dispatchEvent(unloadAfterSave);
    });
    expect(unloadAfterSave.defaultPrevented).toBe(false);
  });

  it("requires an explicit discard before switching rooms, creating a room, leaving, or signing out", async () => {
    const value = config();
    value.rooms.push({ ...structuredClone(room), id: "terrace", name: "Terraza" });
    api.config.mockResolvedValue(value);
    const nativeConfirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    await editor({ withShell: true });
    applyWidth(1400);

    const unload = new Event("beforeunload", { cancelable: true });
    act(() => {
      window.dispatchEvent(unload);
    });
    expect(unload.defaultPrevented).toBe(true);

    // Switch via quick room switcher dropdown
    fireEvent.click(screen.getByRole("button", { name: "Cambiar salón" }));
    fireEvent.click(within(screen.getByRole("navigation", { name: "Selector rápido de salones" })).getByRole("button", { name: "Terraza" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Descartar cambios sin guardar" })).getByRole("button", { name: "Cancelar" }));
    expect(plan()).toMatchObject({ id: "main", width: 1400 });

    // Create room canceled
    fireEvent.click(screen.getByRole("button", { name: "Nuevo salón" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Descartar cambios sin guardar" })).getByRole("button", { name: "Cancelar" }));
    expect(plan()).toMatchObject({ id: "main", width: 1400 });

    // Navigation guard canceled
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegación principal" })).getByRole("link", { name: "Reservas" }));
    expect(api.push).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Descartar cambios sin guardar" })).getByRole("button", { name: "Cancelar" }));

    // Logout guard canceled then confirmed
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(api.logout).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Descartar cambios sin guardar" })).getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar y continuar" }));
    await waitFor(() => expect(api.logout).toHaveBeenCalledTimes(1));

    // Confirm switching room
    fireEvent.click(within(screen.getByRole("navigation", { name: "Salones del restaurante" })).getByRole("button", { name: "Terraza" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar y continuar" }));
    expect(plan()).toMatchObject({ id: "terrace", name: "Terraza", width: 800 });

    // Guard Ver sala link when dirty again
    applyWidth(1300);
    fireEvent.click(screen.getByRole("link", { name: "Ver sala" }));
    expect(api.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Descartar y continuar" }));
    expect(api.push).toHaveBeenCalledWith("/floor?restaurantId=restaurant");
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(api.save).not.toHaveBeenCalled();
  });

  it("translates child fixed tables when dragging their sector and saves fixed layout", async () => {
    const canvas = await editor();
    fireEvent.click(screen.getByRole("button", { name: "Desplazar plano" }));
    fireEvent.click(screen.getByRole("button", { name: "Arrastrar sector Ventana" }));
    expect(plan().locations[0]).toMatchObject({ x: 460, y: 310 });
    expect(plan().tables.map((t) => ({ id: t.id, x: t.x, y: t.y }))).toEqual([
      { id: "one", x: 300, y: 270 },
      { id: "two", x: 440, y: 270 },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Guardar plano" }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    const saved = api.save.mock.calls[0][1].room as FloorRoom;
    expect(saved.combinations).toEqual([]);
    expect(saved.tables[0]).toMatchObject({ id: "one", x: 300, y: 270, locationId: "window" });
    expect(screen.getByTestId("admin-canvas")).toBe(canvas);
    expect(screen.getByTestId("admin-pan").textContent).toBe("1");
  });

  it("deletes rooms from both the quick switcher dropdown and Salón tab with confirmation", async () => {
    const secondRoom: FloorRoom = { ...structuredClone(room), id: "terrace", name: "Terraza", revision: 2 };
    const initial = config();
    initial.rooms.push(secondRoom);
    api.config.mockResolvedValue(initial);
    api.save.mockImplementation(async (_restaurantId: string, command: { action: string; roomId?: string }) => {
      if (command.action === "delete-room") {
        return { ...initial, rooms: initial.rooms.filter((item) => item.id !== command.roomId) };
      }
      return initial;
    });

    await editor();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar salón" }));
    const quickNav = screen.getByRole("navigation", { name: "Selector rápido de salones" });
    fireEvent.click(within(quickNav).getByRole("button", { name: "Eliminar salón Terraza" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Eliminar salón" })).getByRole("button", { name: "Eliminar salón" }));

    await waitFor(() => {
      expect(api.save).toHaveBeenCalledWith("restaurant", {
        action: "delete-room",
        roomId: "terrace",
        expectedRevision: 2,
      });
    });

    openTab("Salón");
    fireEvent.click(screen.getByRole("button", { name: "Eliminar salón" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Eliminar salón" })).getByRole("button", { name: "Eliminar salón" }));

    await waitFor(() => {
      expect(api.save).toHaveBeenCalledWith("restaurant", {
        action: "delete-room",
        roomId: "main",
        expectedRevision: 4,
      });
    });
  });
});
