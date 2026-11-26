/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { buildFloorOptions, type FloorAssignmentInput, type FloorBoardView, type FloorOptionsQuery, type FloorOptionsView, type FloorRoom } from "../contracts";

const api = vi.hoisted(() => ({ options: vi.fn(), board: vi.fn(), config: vi.fn(), save: vi.fn(), reassignSelection: vi.fn() }));
vi.mock("./floor-api", () => ({ getFloorOptions: api.options, getFloorBoard: api.board, getFloorConfig: api.config, saveFloorAction: api.save, reassignFloorSelection: api.reassignSelection, floorInputClass: "input" }));
vi.mock("@/modules/identity-access/ui", () => ({ LogoutButton: ({className, disabled}: {className?: string; disabled?: boolean}) => createElement("button", {className, disabled}, "Cerrar sesión") }));
vi.mock("./FloorCanvas", () => ({ FloorCanvas: (props: {
  onSelect?: (id: string, additive: boolean) => void;
  onSelectLocation?: (id: string) => void;
  onServiceTable?: (id: string) => void;
  room?: { id: string; locations?: { id: string; name: string; quotaStatus?: string; quotaLabel?: string }[] };
  selectedIds?: string[];
  tables: { id: string; label?: string; state?: string; x?: number; y?: number; rotation?: number }[];
}) => {
  const [pan, setPan] = useState(0);
  return createElement("div", { "data-testid": "floor-canvas", "data-room-id": props.room?.id },
    createElement("button", { type: "button", onClick: () => setPan((current) => current + 1) }, "Desplazar tablero"),
    props.onSelectLocation && (props.room?.locations ?? []).map((loc) => createElement("button", { key: loc.id, type: "button", onClick: () => props.onSelectLocation?.(loc.id) }, `Sector ${loc.name}`)),
    props.onServiceTable && props.tables.map((table) => createElement("button", { key: table.id, type: "button", "aria-label": `Atender mesa ${table.label ?? table.id}`, "data-state": table.state, onClick: () => props.onServiceTable?.(table.id) }, table.label ?? table.id)),
    props.onSelect && !props.onServiceTable && props.tables.map((table) => createElement("button", { key: table.id, type: "button", "aria-label": `Seleccionar mesa ${table.label ?? table.id}`, onClick: () => props.onSelect?.(table.id, false) }, table.label ?? table.id)),
    createElement("output", { "data-testid": "canvas-pan" }, String(pan)),
    createElement("output", { "data-testid": "canvas-poses" }, JSON.stringify(props.tables)),
    createElement("output", { "data-testid": "canvas-locations" }, JSON.stringify(props.room?.locations ?? [])),
    createElement("output", { "data-testid": "canvas-tables" }, JSON.stringify(props.tables.map((table) => table.id))));
} }));

import { FloorAssignmentPicker } from "./FloorAssignmentPicker";
import { FloorBoardScreen } from "./FloorBoardScreen";

const room: FloorRoom = {
  id: "room", restaurantId: "restaurant", name: "Salón principal", width: 800, height: 600, revision: 4,
  active: true, fixtures: [],
  locations: [{ id: "window", name: "Ventana", x: 400, y: 300, width: 600, height: 400, rotation: 0, active: true }],
  tables: [
    { id: "one", label: "1", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 240, y: 260, rotation: 0, active: true, locationId: "window" },
    { id: "two", label: "2", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 400, y: 260, rotation: 0, active: true, locationId: "window" },
  ],
  combinations: [],
};
const interval = { serviceStartAt: "2026-11-01T23:00:00Z", serviceEndAt: "2026-11-02T01:00:00Z", blockedFrom: "2026-11-01T21:00:00Z", blockedUntil: "2026-11-02T01:00:00Z", timeZone: "America/Argentina/Buenos_Aires" };
const query: FloorOptionsQuery = { date: "2026-11-01", time: "20:00", partySize: 6 };
const options = (): FloorOptionsView => ({ rooms: [structuredClone(room)], options: buildFloorOptions(room), interval });
const board = (): FloorBoardView => ({ restaurantId: "restaurant", restaurantName: "Bistró", timeZone: interval.timeZone, enabled: true, at: interval.serviceStartAt, rooms: [structuredClone(room)], allocations: [], updatedAt: interval.serviceStartAt });

function Picker({ input = query, walkIn = false }: { input?: FloorOptionsQuery; walkIn?: boolean }) {
  const [value, setValue] = useState<FloorAssignmentInput | null>(null);
  return createElement("div", null, createElement(FloorAssignmentPicker, { restaurantId: "restaurant", query: input, value, onChange: setValue, walkIn }), createElement("output", { "data-testid": "assignment" }, JSON.stringify(value)));
}
const assignment = (): FloorAssignmentInput | null => JSON.parse(screen.getByTestId("assignment").textContent!);

function stubServiceFetch(openedAccount?: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      const account = openedAccount ?? {
        id: "acc-new",
        allocationId: "alloc-new",
        reservationId: "res-new",
        roomId: body.roomId ?? "room",
        roomName: "Salón principal",
        reservationCode: "SALA-NEW",
        customerName: body.customerName ?? "Sin reserva",
        partySize: body.partySize ?? 4,
        assignedWaiterId: body.waiterId ?? "w-1",
        assignedWaiterName: "Ana",
        version: 1,
        openedAt: interval.serviceStartAt,
        closedAt: null,
        businessDate: null,
        paymentMethod: null,
        totalCents: null,
        receiptNumber: null,
        tipCents: 0,
        discountCents: 0,
        discountReason: null,
        cashCents: 0,
        cardCents: 0,
        transferCents: 0,
        tableIds: [body.tableId ?? "one"],
        tableLabels: ["1"],
        lines: [],
        orderedCents: 0,
        deliveredCents: 0,
        pendingQuantity: 0,
        readyQuantity: 0,
        paidSubtotalCents: 0,
        remainingCents: 0,
        payments: [],
        auditLogs: [],
        hasAuditAlerts: false,
        auditAlertCount: 0,
        cancellationCount: 0,
      };
      return new Response(JSON.stringify({ success: true, data: account }));
    }
    return new Response(JSON.stringify({
      success: true,
      data: {
        accounts: [],
        products: [],
        waiters: [{ id: "w-1", name: "Ana", role: "WAITER", phone: "", notes: "", active: true, createdAt: interval.serviceStartAt }],
        unserved: [],
        cashClosed: false,
      },
    }));
  }));
}

describe("floor assignment interactions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.style.overflow = "";
    api.options.mockResolvedValue(options());
    api.board.mockResolvedValue(board());
    stubServiceFetch();
  });
  afterEach(() => { cleanup(); document.body.style.overflow = ""; vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("selects a fixed table in 1 click, sends room revision, and allows logical partySize above nominal table capacity", async () => {
    render(createElement(Picker));
    const tableOneButton = await screen.findByRole("button", { name: /^1\s*Ventana/i });
    fireEvent.click(tableOneButton);
    expect(assignment()).toMatchObject({
      roomId: "room",
      locationId: "window",
      optionId: "table:one",
      expectedRoomRevision: 4,
      capacity: 6,
      x: 240,
      y: 260,
    });
    const tableTwoButton = screen.getByRole("button", { name: /^2\s*Ventana/i });
    fireEvent.click(tableTwoButton);
    expect(assignment()).toMatchObject({
      roomId: "room",
      locationId: "window",
      optionId: "custom",
      capacity: 8,
      customTables: [
        { tableId: "one", x: 240, y: 260, rotation: 0 },
        { tableId: "two", x: 400, y: 260, rotation: 0 },
      ],
    });
  });

  it("shows yellow sector quota warning when partySize approaches or exceeds maxCapacity without blocking selection", async () => {
    const value = options();
    value.rooms[0].locations[0].maxCapacity = 5;
    api.options.mockResolvedValue(value);
    render(createElement(Picker, { input: { ...query, partySize: 6 } }));
    const tableOneButton = await screen.findByRole("button", { name: /^1\s*Ventana/i });
    fireEvent.click(tableOneButton);
    await waitFor(() => expect(screen.getByText(/El sector Ventana supera su cupo/)).toBeTruthy());
    const locations = JSON.parse(screen.getByTestId("canvas-locations").textContent!) as { quotaStatus?: string }[];
    expect(locations[0].quotaStatus).toBe("exceeded");
    expect(assignment()).toMatchObject({ optionId: "table:one", capacity: 6 });
  });

  it("preserves a previously stored allocation when editing a reservation", async () => {
    const value = options();
    value.currentAllocation = {
      ...interval, id: "allocation", reservationId: "reservation", roomId: "room", locationId: "window",
      combinationId: null, capacity: 4, customerName: "Ana", partySize: 4, date: query.date, time: query.time,
      notes: "", code: "BOOK", releasedAt: null, version: 1,
      poses: [{ tableId: "one", label: "1", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 240, y: 260, rotation: 0 }],
    };
    api.options.mockResolvedValue(value);
    render(createElement(Picker, { input: { ...query, partySize: 4, excludeReservationId: "reservation" } }));
    await waitFor(() => expect(assignment()).toMatchObject({ optionId: "table:one", retainExisting: true }));
    expect(screen.getByText(/Asignación actual conservada/)).toBeTruthy();
  });

  it("invalidates a choice after reservation details change", async () => {
    const view = render(createElement(Picker));
    const tableOneButton = await screen.findByRole("button", { name: /^1\s*Ventana/i });
    fireEvent.click(tableOneButton);
    expect(assignment()).not.toBeNull();
    view.rerender(createElement(Picker, { input: { ...query, time: "22:00" } }));
    await waitFor(() => expect(screen.getByTestId("assignment").textContent).toBe("null"));
    expect(api.options).toHaveBeenLastCalledWith("restaurant", expect.objectContaining({ time: "22:00" }), expect.any(AbortSignal), undefined);
  });

  it("can retry a failed availability request without losing the reservation form", async () => {
    api.options.mockRejectedValueOnce(new Error("Sin conexión"));
    render(createElement(Picker));
    fireEvent.click(await screen.findByRole("button", { name: "Volver a consultar" }));
    expect(await screen.findByRole("button", { name: /^1\s*Ventana/i })).toBeTruthy();
  });

  it("never selects an occupied table", async () => {
    const value = options();
    value.options = value.options.map((option) => option.id === "table:one" ? { ...option, available: false, resourceAvailable: false, conflict: "Ocupada" } : option);
    api.options.mockResolvedValue(value);
    render(createElement(Picker));
    const oneBtn = (await screen.findByRole("button", { name: /^1\s*Ventana/i })) as HTMLButtonElement;
    const twoBtn = screen.getByRole("button", { name: /^2\s*Ventana/i }) as HTMLButtonElement;
    expect(oneBtn.disabled).toBe(true);
    expect(twoBtn.disabled).toBe(false);
    fireEvent.click(twoBtn);
    expect(assignment()).toMatchObject({ optionId: "table:two" });
  });

  it("requires a new selection when a historical allocation has been released", async () => {
    const value = options();
    value.currentAllocation = {
      ...interval, id: "allocation", reservationId: "reservation", roomId: "room", locationId: "window",
      combinationId: null, capacity: 4, customerName: "Ana", partySize: 4, date: query.date, time: query.time,
      notes: "", code: "BOOK", releasedAt: interval.blockedFrom, version: 1,
      poses: [{ tableId: "one", label: "1", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 240, y: 260, rotation: 0 }],
    };
    api.options.mockResolvedValue(value);
    render(createElement(Picker));
    await screen.findByRole("button", { name: /^1\s*Ventana/i });
    expect(screen.queryByText(/Asignación actual conservada/)).toBeNull();
    expect(assignment()).toBeNull();
  });

  it("lets a waiter click a free fixed table to open a logical party above capacity with a yellow sector warning", async () => {
    const currentBoard = board();
    currentBoard.rooms[0].locations[0].maxCapacity = 8;
    api.board.mockResolvedValue(currentBoard);

    render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true }));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Administrar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Atender sin reserva" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Inventario de mesas" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();

    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", { name: "Desplazar tablero" }));
    fireEvent.click(screen.getByRole("button", { name: "Atender mesa 1" }));

    const dialog = screen.getByRole("dialog", { name: "Abrir mesa" });
    fireEvent.change(within(dialog).getByLabelText("Comensales"), { target: { value: "10" } });
    fireEvent.change(within(dialog).getByLabelText("Nombre del grupo (opcional)"), { target: { value: "Grupo de Ana" } });
    expect(within(dialog).getByRole("status").textContent).toContain("por encima de su cupo");

    const openBtn = within(dialog).getByRole("button", { name: "Abrir mesa" }) as HTMLButtonElement;
    expect(openBtn.disabled).toBe(false);
    fireEvent.click(openBtn);

    await waitFor(() => {
      const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const postCall = fetchCalls.find((call) => call[1]?.method === "POST");
      expect(postCall).toBeTruthy();
      expect(JSON.parse(String(postCall![1].body))).toEqual({
        action: "open-table",
        roomId: "room",
        tableId: "one",
        partySize: 10,
        waiterId: "w-1",
        customerName: "Grupo de Ana",
      });
    });

    expect(await screen.findByRole("dialog", { name: "Cuenta · Grupo de Ana" })).toBeTruthy();
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
  });

  it("offers release for allocations in the current operational view", async () => {
    const value = board();
    value.allocations = [{ ...interval, id: "allocation", reservationId: "reservation", roomId: "room", combinationId: null, capacity: 4, customerName: "Ana", partySize: 2, date: query.date, time: query.time, notes: "", code: "BOOK", releasedAt: null, version: 1, source: "WALK_IN", reservationRevision: 3, poses: options().options[0].poses }];
    value.allocations.push({...value.allocations[0], id: "admin-allocation", reservationId: "admin-reservation", source: "ADMIN", customerName: "Reserva confirmada", poses: options().options[1].poses});
    api.board.mockResolvedValue(value); api.save.mockResolvedValue({});
    const nativeConfirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Reservas" }));
    const reservations = screen.getByRole("region", { name: "Reservas de Salón principal" });
    expect(within(reservations).getAllByRole("button", { name: "Liberar mesas" })).toHaveLength(2);
    fireEvent.click(within(reservations).getAllByRole("button", { name: "Liberar mesas" })[0]);
    const confirmation = screen.getByRole("dialog", { name: "Liberar mesas" });
    expect(screen.getByRole("region", { name: "Reservas de Salón principal" })).toBe(reservations);
    expect(confirmation.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(within(confirmation).getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("region", { name: "Reservas de Salón principal" })).toBe(reservations);
    expect(document.body.style.overflow).toBe("");
    fireEvent.click(within(reservations).getAllByRole("button", { name: "Liberar mesas" })[0]);
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Liberar mesas" })).getByRole("button", { name: "Confirmar liberación" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("restaurant", { action: "release-reservation", reservationId: "reservation", expectedRevision: 3, reason: "COMPLETED" }));
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

  it("switches docked studio inspector tabs and filters quick tables without losing canvas viewport or confirmation layering", async () => {
    const value = board();
    value.allocations = options().options.slice(0, 2).map((option, index) => ({ ...interval,
      id: `allocation-${index}`, reservationId: `reservation-${index}`, roomId: "room", combinationId: null,
      capacity: 4, customerName: index === 0 ? "Ana" : "Bruno", partySize: 2, date: query.date, time: query.time,
      notes: index === 0 ? "Silla para bebé" : "Junto a la ventana", code: `BOOK-${index}`, releasedAt: null, version: 1, poses: option.poses,
    }));
    render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true, initialBoard: value }));
    const canvas = screen.getByTestId("floor-canvas");
    const inspector = screen.getByRole("complementary", { name: "Panel operativo de sala" });

    // 1. Default Sala tab lists summary + quick filterable tables without floating windows
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Desplazar tablero" }));
    expect(within(inspector).getByRole("tab", { name: "Sala" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(within(inspector).getByRole("button", { name: "Libres" }));
    expect(within(inspector).queryByRole("button", { name: "Gestionar mesa 1" })).toBeNull();
    fireEvent.click(within(inspector).getByRole("button", { name: "Reserv." }));
    expect(within(inspector).getByRole("button", { name: "Gestionar mesa 1" })).toBeTruthy();

    // 2. Cuentas tab switches cleanly inside the docked panel
    fireEvent.click(screen.getByRole("button", { name: "Cuentas de servicio" }));
    expect(within(inspector).getByRole("region", { name: "Cuentas abiertas" })).toBeTruthy();

    // 3. Reservas tab renders inline detail with back navigation instead of multiple floating windows
    fireEvent.click(screen.getByRole("button", { name: "Reservas" }));
    const reservations = within(inspector).getByRole("region", { name: "Reservas de Salón principal" });
    fireEvent.click(within(reservations).getAllByRole("button", { name: "Ver detalle" })[0]);
    const ana = within(inspector).getByRole("region", { name: "Detalle de la reserva" });
    expect(within(ana).getByRole("heading", { name: "Ana" })).toBeTruthy();
    expect(within(ana).getByText("Silla para bebé")).toBeTruthy();
    fireEvent.click(within(ana).getByRole("button", { name: "Volver a reservas" }));
    expect(within(inspector).getByRole("region", { name: "Reservas de Salón principal" })).toBeTruthy();
    fireEvent.click(within(reservations).getAllByRole("button", { name: "Ver detalle" })[1]);
    expect(within(inspector).getByRole("heading", { name: "Bruno" })).toBeTruthy();
    expect(within(inspector).getByText("Junto a la ventana")).toBeTruthy();

    // 4. Panel can be toggled closed and back open without disturbing the canvas viewport
    fireEvent.click(screen.getByRole("button", { name: "Ocultar panel lateral" }));
    expect(screen.queryByRole("complementary", { name: "Panel operativo de sala" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar panel lateral" }));
    expect(screen.getByRole("complementary", { name: "Panel operativo de sala" })).toBeTruthy();
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(api.save).not.toHaveBeenCalled();
  });

  it("opens table onboarding inside a fixed native dialog without floating window controls and guards unsaved edits inline", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistr\u00F3", readOnly: true, canManageWalkIns: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled()); const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", {name: "Desplazar tablero"}));
    fireEvent.click(screen.getByRole("button", {name: "Atender mesa 1"}));
    const dialog = screen.getByRole("dialog", {name: "Abrir mesa"});
    expect(dialog.tagName).toBe("DIALOG");
    expect(within(dialog).queryByRole("button", {name: "Minimizar ventana"})).toBeNull();
    expect(within(dialog).queryByRole("button", {name: /Mover ventana/i})).toBeNull();
    fireEvent.change(within(dialog).getByLabelText("Nombre del grupo (opcional)"), {target: {value: "Julia y familia"}});
    fireEvent.change(within(dialog).getByLabelText("Comensales"), {target: {value: "6"}});

    fireEvent.click(within(dialog).getByRole("button", {name: "Cerrar"}));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("alert")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", {name: "Seguir editando"}));
    expect((within(dialog).getByLabelText("Nombre del grupo (opcional)") as HTMLInputElement).value).toBe("Julia y familia");

    fireEvent.click(within(dialog).getByRole("button", {name: "Cerrar"}));
    fireEvent.click(within(dialog).getByRole("button", {name: "Descartar y cerrar"}));
    expect(screen.queryByRole("dialog", {name: "Abrir mesa"})).toBeNull();
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");

    fireEvent.click(screen.getByRole("button", {name: "Atender mesa 1"}));
    expect((within(screen.getByRole("dialog", {name: "Abrir mesa"})).getByLabelText("Nombre del grupo (opcional)") as HTMLInputElement).value).toBe("");
    expect(api.save).not.toHaveBeenCalled();
  });

  it("preserves open-table details while the room updates in the background", async () => {
    const scheduled = vi.spyOn(window, "setInterval");
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    api.save.mockResolvedValue({});
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", {name: "Desplazar tablero"}));
    fireEvent.click(screen.getByRole("button", {name: "Atender mesa 1"}));
    const dialog = screen.getByRole("dialog", {name: "Abrir mesa"});
    fireEvent.change(within(dialog).getByLabelText("Nombre del grupo (opcional)"), {target: {value: "Grupo de Julia"}});
    fireEvent.change(within(dialog).getByLabelText("Comensales"), {target: {value: "6"}});
    const next = board(); next.at = "2026-11-01T23:01:00Z";
    api.board.mockResolvedValue(next);
    const initialCalls = api.board.mock.calls.length;
    await act(async () => { (scheduled.mock.calls[0][0] as () => void)(); });
    expect(api.board).toHaveBeenCalledTimes(initialCalls + 1);
    expect((within(dialog).getByLabelText("Nombre del grupo (opcional)") as HTMLInputElement).value).toBe("Grupo de Julia");
    expect((within(dialog).getByLabelText("Comensales") as HTMLInputElement).value).toBe("6");
    fireEvent.click(screen.getByRole("button", {name: "Actualizar"}));
    await waitFor(() => expect(api.board.mock.calls.length).toBeGreaterThan(initialCalls + 1));
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
    expect((within(dialog).getByLabelText("Nombre del grupo (opcional)") as HTMLInputElement).value).toBe("Grupo de Julia");
    fireEvent.click(within(dialog).getByRole("button", {name: "Abrir mesa"}));
    await waitFor(() => {
      const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const postCall = fetchCalls.find((call) => call[1]?.method === "POST");
      expect(postCall).toBeTruthy();
      expect(JSON.parse(String(postCall![1].body))).toEqual({
        action: "open-table",
        roomId: "room",
        tableId: "one",
        partySize: 6,
        waiterId: "w-1",
        customerName: "Grupo de Julia",
      });
    });
  });

  it("cancels an open-table draft on the room board without saving or resetting its viewport", async () => {
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", {name: "Desplazar tablero"}));
    fireEvent.click(screen.getByRole("button", {name: "Atender mesa 1"}));
    const dialog = screen.getByRole("dialog", {name: "Abrir mesa"});
    fireEvent.click(within(dialog).getByRole("button", {name: "Cancelar"}));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
    expect(api.save).not.toHaveBeenCalled();
  });

  it("exposes administrative navigation directly in the toolbar for an administrator", async () => {
    render(createElement(FloorBoardScreen, {restaurantId: "restaurant", restaurantName: "Bistró", readOnly: false}));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    const toolbar = screen.getByRole("navigation", {name: "Herramientas de sala"});
    expect(within(toolbar).getByRole("link", {name: "Administrar"}).getAttribute("href")).toBe("/admin/restaurants/restaurant/rooms");
    expect(within(toolbar).queryByRole("button", {name: "Cerrar sesión"})).toBeNull();
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
    expect(screen.queryByRole("button", {name: "Atender mesa 1"})).toBeNull();
    expect(screen.queryByRole("dialog", {name: "Abrir mesa"})).toBeNull();
    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(within(toolbar).getByRole("button", { name: "Reservas" }));
    expect(screen.getByRole("region", { name: "Reservas de Salón principal" })).toBeTruthy();
    fireEvent.click(within(toolbar).getByRole("button", { name: "Fecha y hora" }));
    expect(screen.getByRole("dialog", { name: "Fecha y hora" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
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
    fireEvent.click(screen.getByRole("button", { name: "Reservas" }));
    expect(screen.getByRole("region", { name: "Reservas de Terraza" })).toBeTruthy();
  });

  it("displays active kitchen and bar tickets in the docked Cocina tab with filters, status actions, and account shortcut", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        if (body.action === "update-kitchen-status") {
          return new Response(JSON.stringify({ success: true, data: { updated: true } }));
        }
        return new Response(JSON.stringify({ success: true, data: {} }));
      }
      return new Response(JSON.stringify({
        success: true,
        data: {
          accounts: [
            {
              id: "acc-1",
              allocationId: "alloc-1",
              reservationId: "res-1",
              roomId: "room",
              roomName: "Salón principal",
              reservationCode: "SALA-1",
              customerName: "Mesa 1",
              partySize: 4,
              assignedWaiterId: "w-1",
              assignedWaiterName: "Ana",
              version: 2,
              openedAt: interval.serviceStartAt,
              closedAt: null,
              businessDate: null,
              paymentMethod: null,
              totalCents: null,
              receiptNumber: null,
              tipCents: 0,
              discountCents: 0,
              discountReason: null,
              cashCents: 0,
              cardCents: 0,
              transferCents: 0,
              tableIds: ["one"],
              tableLabels: ["1"],
              lines: [
                {
                  id: "l-1",
                  name: "Milanesa",
                  unitPriceCents: 1350000,
                  quantity: 1,
                  deliveredQuantity: 0,
                  cancelledQuantity: 0,
                  notes: "Sin sal",
                  kitchenStatus: "READY",
                  round: 1,
                  station: "KITCHEN",
                  createdAt: interval.serviceStartAt,
                },
                {
                  id: "l-2",
                  name: "Limonada",
                  unitPriceCents: 460000,
                  quantity: 2,
                  deliveredQuantity: 0,
                  cancelledQuantity: 0,
                  notes: "",
                  kitchenStatus: "IN_PREP",
                  round: 1,
                  station: "BAR",
                  createdAt: interval.serviceStartAt,
                },
              ],
              orderedCents: 2270000,
              deliveredCents: 0,
              paidSubtotalCents: 0,
              remainingCents: 2270000,
              pendingQuantity: 3,
              readyQuantity: 1,
              payments: [],
              auditLogs: [],
              hasAuditAlerts: false,
              auditAlertCount: 0,
              cancellationCount: 0,
            },
          ],
          products: [],
          waiters: [{ id: "w-1", name: "Ana", role: "WAITER", phone: "", notes: "", active: true, createdAt: interval.serviceStartAt }],
          unserved: [],
          cashClosed: false,
        },
      }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: false }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Tickets de cocina" }).textContent).toContain("1"));

    fireEvent.click(screen.getByRole("button", { name: "Tickets de cocina" }));
    const kitchenPanel = screen.getByRole("region", { name: "Tickets de cocina y barra" });
    expect(within(kitchenPanel).getByText("Milanesa")).toBeTruthy();
    expect(within(kitchenPanel).getByText("Limonada")).toBeTruthy();
    expect(within(kitchenPanel).getByText("Nota: Sin sal")).toBeTruthy();
    expect(within(kitchenPanel).getByRole("link", { name: "KDS" }).getAttribute("href")).toBe("/admin/restaurants/restaurant/kitchen");

    // Station filtering
    const stationGroup = within(kitchenPanel).getByRole("group", { name: "Filtrar tickets por estación" });
    fireEvent.click(within(stationGroup).getByRole("button", { name: "Barra" }));
    expect(within(kitchenPanel).queryByText("Milanesa")).toBeNull();
    expect(within(kitchenPanel).getByText("Limonada")).toBeTruthy();

    fireEvent.click(within(stationGroup).getByRole("button", { name: "Todos" }));
    expect(within(kitchenPanel).getByText("Milanesa")).toBeTruthy();

    // Update kitchen status
    fireEvent.click(within(kitchenPanel).getByRole("button", { name: "Entregar Milanesa" }));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST");
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post![1]!.body))).toEqual({
        action: "update-kitchen-status",
        lineId: "l-1",
        status: "SERVED",
      });
    });

    // Quick open account from ticket
    fireEvent.click(within(kitchenPanel).getByRole("button", { name: "Cuenta" }));
    expect(screen.getByRole("dialog", { name: "Cuenta · Mesa 1" })).toBeTruthy();
  });
});
