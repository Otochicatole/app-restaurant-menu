/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FloorBoardView, FloorRoom } from "../contracts";
import type { ServiceAccountView, ServiceSnapshot } from "@/modules/reservation-management/contracts";

const api = vi.hoisted(() => ({ board: vi.fn(), save: vi.fn() }));
vi.mock("./floor-api", () => ({
  getFloorBoard: api.board,
  saveFloorAction: api.save,
  floorInputClass: "input",
}));
vi.mock("@/modules/identity-access/ui", () => ({
  LogoutButton: ({ className, disabled }: { className?: string; disabled?: boolean }) =>
    createElement("button", { className, disabled }, "Cerrar sesión"),
}));
vi.mock("./FloorCanvas", () => ({
  FloorCanvas: (props: {
    room?: FloorRoom & { locations?: { id: string; name: string; quotaStatus?: string; quotaLabel?: string }[] };
    tables: { id: string; label?: string; state?: string; subtitle?: string }[];
    onServiceTable?: (id: string) => void;
  }) => {
    const [pan, setPan] = useState(0);
    return createElement(
      "div",
      { "data-testid": "floor-canvas" },
      createElement("button", { type: "button", onClick: () => setPan((current) => current + 1) }, "Desplazar tablero"),
      props.onServiceTable && props.tables.map((table) =>
        createElement(
          "button",
          {
            key: table.id,
            type: "button",
            "aria-label": `Atender mesa ${table.label ?? table.id}`,
            "data-state": table.state ?? "",
            onClick: () => props.onServiceTable?.(table.id),
          },
          `${table.label ?? table.id} (${table.state ?? ""})`,
        ),
      ),
      createElement("output", { "data-testid": "canvas-pan" }, String(pan)),
      createElement("output", { "data-testid": "canvas-tables" }, JSON.stringify(props.tables)),
      createElement("output", { "data-testid": "canvas-locations" }, JSON.stringify(props.room?.locations ?? [])),
    );
  },
}));

import { FloorBoardScreen } from "./FloorBoardScreen";
import { FloorTableSummary } from "./FloorTableSummary";
import { summarizeFloorTables } from "./floor-table-summary";

const interval = {
  serviceStartAt: "2026-11-01T23:00:00Z",
  serviceEndAt: "2026-11-02T01:00:00Z",
  blockedFrom: "2026-11-01T21:00:00Z",
  blockedUntil: "2026-11-02T01:00:00Z",
  timeZone: "America/Argentina/Buenos_Aires",
};

function makeRoom(): FloorRoom {
  return {
    id: "room",
    restaurantId: "restaurant",
    name: "Salón principal",
    width: 900,
    height: 600,
    revision: 3,
    active: true,
    fixtures: [],
    locations: [
      { id: "window", name: "Ventana", x: 250, y: 300, width: 400, height: 420, rotation: 0, active: true, maxTables: 4, maxCapacity: 10 },
      { id: "patio", name: "Patio", x: 680, y: 300, width: 340, height: 420, rotation: 0, active: true, maxTables: 2, maxCapacity: 5 },
    ],
    tables: [
      { id: "t-1", label: "1", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 160, y: 220, rotation: 0, active: true, locationId: "window" },
      { id: "t-2", label: "2", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 320, y: 220, rotation: 0, active: true, locationId: "window" },
      { id: "t-3", label: "3", shape: "RECTANGLE", capacity: 6, width: 120, height: 80, x: 640, y: 220, rotation: 0, active: true, locationId: "patio" },
    ],
    combinations: [],
  };
}

function makeBoard(allocations: FloorBoardView["allocations"] = []): FloorBoardView {
  return {
    restaurantId: "restaurant",
    restaurantName: "Bistró",
    timeZone: interval.timeZone,
    enabled: true,
    at: interval.serviceStartAt,
    rooms: [makeRoom()],
    allocations,
    updatedAt: interval.serviceStartAt,
  };
}

function makeAccount(overrides: Partial<ServiceAccountView> = {}): ServiceAccountView {
  return {
    id: "acc-1",
    allocationId: "alloc-occ",
    reservationId: "res-occ",
    roomId: "room",
    roomName: "Salón principal",
    reservationCode: "SALA-1",
    customerName: "Mesa ocupada",
    partySize: 8,
    assignedWaiterId: "w-1",
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
    tableIds: ["t-2"],
    tableLabels: ["2"],
    lines: [],
    orderedCents: 0,
    deliveredCents: 0,
    paidSubtotalCents: 0,
    remainingCents: 0,
    pendingQuantity: 0,
    readyQuantity: 0,
    payments: [],
    auditLogs: [],
    hasAuditAlerts: false,
    auditAlertCount: 0,
    cancellationCount: 0,
    ...overrides,
  };
}

function stubServiceFetch(snapshot: ServiceSnapshot, onPostAccount?: ServiceAccountView) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        const account = onPostAccount ?? makeAccount({
          id: "acc-opened",
          allocationId: "alloc-opened",
          reservationId: "res-opened",
          reservationCode: "SALA-NEW",
          customerName: body.customerName || "Sin reserva",
          partySize: body.partySize ?? 4,
          tableIds: [body.tableId ?? "t-1"],
          tableLabels: ["1"],
        });
        return new Response(JSON.stringify({ success: true, data: account }));
      }
      return new Response(JSON.stringify({ success: true, data: snapshot }));
    }),
  );
}

describe("fixed operational floor table interactions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.save.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders all fixed tables with available, reserved and occupied states plus amber sector quota alerts", async () => {
    const board = makeBoard([
      {
        ...interval,
        id: "alloc-occ",
        reservationId: "res-occ",
        roomId: "room",
        locationId: "window",
        combinationId: null,
        capacity: 8,
        customerName: "Mesa ocupada",
        partySize: 8,
        date: "2026-11-01",
        time: "20:00",
        notes: "",
        code: "SALA-1",
        releasedAt: null,
        version: 1,
        source: "WALK_IN",
        reservationRevision: 1,
        poses: [{ tableId: "t-2", label: "2", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 320, y: 220, rotation: 0 }],
      },
      {
        ...interval,
        id: "alloc-res",
        reservationId: "res-res",
        roomId: "room",
        locationId: "patio",
        combinationId: null,
        capacity: 6,
        customerName: "Reserva patio",
        partySize: 6,
        date: "2026-11-01",
        time: "20:00",
        notes: "",
        code: "RES-3",
        releasedAt: null,
        version: 1,
        source: "ADMIN",
        reservationRevision: 1,
        poses: [{ tableId: "t-3", label: "3", shape: "RECTANGLE", capacity: 6, width: 120, height: 80, x: 640, y: 220, rotation: 0 }],
      },
    ]);
    api.board.mockResolvedValue(board);
    stubServiceFetch({
      accounts: [makeAccount()],
      products: [],
      waiters: [{ id: "w-1", name: "Ana", role: "WAITER", phone: "", notes: "", active: true, createdAt: interval.serviceStartAt }],
      cashClosed: false,
      unserved: [],
    });

    render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true }));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    await waitFor(() => expect((screen.getByRole("button", { name: "Atender mesa 2" })).getAttribute("data-state")).toBe("occupied"));

    expect(screen.getByRole("button", { name: "Atender mesa 1" }).getAttribute("data-state")).toBe("available");
    expect(screen.getByRole("button", { name: "Atender mesa 2" }).getAttribute("data-state")).toBe("occupied");
    expect(screen.getByRole("button", { name: "Atender mesa 3" }).getAttribute("data-state")).toBe("reserved");

    const locations = JSON.parse(screen.getByTestId("canvas-locations").textContent!) as {
      id: string;
      quotaStatus: string;
      quotaLabel: string;
    }[];
    expect(locations.find((loc) => loc.id === "window")?.quotaStatus).toBe("warning");
    expect(locations.find((loc) => loc.id === "patio")?.quotaStatus).toBe("exceeded");

    const summaryGroup = screen.getByRole("group", { name: "Mesas del salón" });
    expect(within(summaryGroup).getByText("Ventana · Cerca del cupo")).toBeTruthy();
    expect(within(summaryGroup).getByText("Patio · Cupo superado")).toBeTruthy();

    const directCounts = summarizeFloorTables(board.rooms[0], board.allocations, board.at, ["t-2"]);
    expect(directCounts).toMatchObject({ total: 3, free: 1, reserved: 1, occupied: 1 });
    render(createElement(FloorTableSummary, { counts: directCounts }));
    expect(screen.getAllByText("Sectores y cupos").length).toBe(2);
  });

  it("opens a free fixed table with logical partySize exceeding capacity and displays a non-blocking amber warning", async () => {
    const board = makeBoard();
    board.rooms[0].locations[0].maxCapacity = 8;
    api.board.mockResolvedValue(board);
    stubServiceFetch({
      accounts: [],
      products: [],
      waiters: [{ id: "w-1", name: "Ana", role: "WAITER", phone: "", notes: "", active: true, createdAt: interval.serviceStartAt }],
      cashClosed: false,
      unserved: [],
    });

    render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true }));
    await waitFor(() => expect(api.board).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Atender mesa 1" }));
    const dialog = screen.getByRole("dialog", { name: "Abrir mesa" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(within(dialog).queryByRole("button", { name: /Minimizar/i })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "10p" }));
    expect(within(dialog).getByRole("status").textContent).toContain("por encima de su cupo");

    const submit = within(dialog).getByRole("button", { name: "Abrir mesa" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    await waitFor(() => {
      const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const post = fetchCalls.find((call) => call[1]?.method === "POST");
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post![1].body))).toEqual({
        action: "open-table",
        roomId: "room",
        tableId: "t-1",
        partySize: 10,
        waiterId: "w-1",
      });
    });
    const accountDialog = await screen.findByRole("dialog", { name: "Cuenta · Sin reserva" });
    expect(accountDialog.tagName).toBe("DIALOG");
    expect(within(accountDialog).queryByRole("button", { name: /Minimizar/i })).toBeNull();
  });

  it("clicks an occupied table to open its live account and a reserved table to open its reservation check-in", async () => {
    const board = makeBoard([
      {
        ...interval,
        id: "alloc-occ",
        reservationId: "res-occ",
        roomId: "room",
        locationId: "window",
        combinationId: null,
        capacity: 4,
        customerName: "Mesa ocupada",
        partySize: 4,
        date: "2026-11-01",
        time: "20:00",
        notes: "",
        code: "SALA-1",
        releasedAt: null,
        version: 1,
        source: "WALK_IN",
        reservationRevision: 1,
        poses: [{ tableId: "t-2", label: "2", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 320, y: 220, rotation: 0 }],
      },
      {
        ...interval,
        id: "alloc-res",
        reservationId: "res-res",
        roomId: "room",
        locationId: "patio",
        combinationId: null,
        capacity: 4,
        customerName: "Familia Pérez",
        partySize: 4,
        date: "2026-11-01",
        time: "20:00",
        notes: "",
        code: "RES-3",
        releasedAt: null,
        version: 2,
        source: "ADMIN",
        reservationRevision: 1,
        poses: [{ tableId: "t-3", label: "3", shape: "RECTANGLE", capacity: 6, width: 120, height: 80, x: 640, y: 220, rotation: 0 }],
      },
    ]);
    api.board.mockResolvedValue(board);
    stubServiceFetch({
      accounts: [makeAccount()],
      products: [],
      waiters: [{ id: "w-1", name: "Ana", role: "WAITER", phone: "", notes: "", active: true, createdAt: interval.serviceStartAt }],
      cashClosed: false,
      unserved: [],
    });

    render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true }));
    await waitFor(() => expect(api.board).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "Atender mesa 2" }).getAttribute("data-state")).toBe("occupied"));

    fireEvent.click(screen.getByRole("button", { name: "Atender mesa 2" }));
    expect(screen.getByRole("dialog", { name: "Cuenta · Mesa ocupada" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Atender mesa 3" }));
    const reservedDialog = screen.getByRole("dialog", { name: "Cuenta · Familia Pérez" });
    expect(within(reservedDialog).getByRole("button", { name: "Asignar camarero y abrir cuenta" })).toBeTruthy();
  });

  it("preserves an open-table draft and viewport pan across background polling updates", async () => {
    const scheduled = vi.spyOn(window, "setInterval");
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    api.board.mockResolvedValue(makeBoard());
    stubServiceFetch({
      accounts: [],
      products: [],
      waiters: [{ id: "w-1", name: "Ana", role: "WAITER", phone: "", notes: "", active: true, createdAt: interval.serviceStartAt }],
      cashClosed: false,
      unserved: [],
    });

    render(createElement(FloorBoardScreen, { restaurantId: "restaurant", restaurantName: "Bistró", readOnly: true, canManageWalkIns: true }));
    await waitFor(() => expect(api.board).toHaveBeenCalled());

    const canvas = screen.getByTestId("floor-canvas");
    fireEvent.click(screen.getByRole("button", { name: "Desplazar tablero" }));
    fireEvent.click(screen.getByRole("button", { name: "Atender mesa 1" }));

    const dialog = screen.getByRole("dialog", { name: "Abrir mesa" });
    fireEvent.change(within(dialog).getByLabelText("Comensales"), { target: { value: "9" } });
    fireEvent.change(within(dialog).getByLabelText("Nombre del grupo (opcional)"), { target: { value: "Grupo Terraza" } });

    const updated = makeBoard();
    updated.at = "2026-11-01T23:02:00Z";
    api.board.mockResolvedValue(updated);
    const boardPoll = scheduled.mock.calls.map((call) => call[0] as () => void);
    await act(async () => {
      for (const callback of boardPoll) callback();
    });

    expect((within(dialog).getByLabelText("Comensales") as HTMLInputElement).value).toBe("9");
    expect((within(dialog).getByLabelText("Nombre del grupo (opcional)") as HTMLInputElement).value).toBe("Grupo Terraza");
    expect(screen.getByTestId("floor-canvas")).toBe(canvas);
    expect(screen.getByTestId("canvas-pan").textContent).toBe("1");
  });
});
