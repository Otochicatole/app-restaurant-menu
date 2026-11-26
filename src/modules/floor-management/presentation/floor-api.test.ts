import { NextRequest } from "next/server";
import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/platform/application/errors";
import type { FloorAllocationView, FloorAssignmentInput, FloorBoardView, FloorOptionsView, FloorRoom, FloorTableInventoryInput } from "../contracts";

const services = vi.hoisted(() => ({ access: vi.fn(), admin: vi.fn(), options: vi.fn(), reassign: vi.fn(), reassignMany: vi.fn(), board: vi.fn(), tables: vi.fn() }));
vi.mock("@/modules/floor-management/server", () => ({ requireFloorReadAccess: services.access, floorManagement: { getBoard: services.board, saveTables: services.tables } }));
vi.mock("@/modules/restaurant-management/server", () => ({ requireRestaurantContext: services.admin }));
vi.mock("@/modules/reservation-management/server", async () => {
  const contracts = await import("@/modules/reservation-management/contracts");
  const { floorAssignmentSchema } = await import("@/modules/floor-management/contracts");
  const floorReassignmentSchema = z.object({ reservationId: z.string().min(1), expectedRevision: z.number().int().nonnegative(), expectedAllocationVersion: z.number().int().nonnegative(), assignment: floorAssignmentSchema });
  const floorBatchReassignmentSchema = z.object({ updates: z.array(floorReassignmentSchema).min(1).max(40) }).refine(({ updates }) => new Set(updates.map((update) => update.reservationId)).size === updates.length, "Cada reserva debe aparecer una sola vez.");
  return { ...contracts, floorReassignmentSchema, floorBatchReassignmentSchema,
    floorReassignments: { options: services.options, reassign: services.reassign, reassignMany: services.reassignMany }, floorWalkIns: {} };
});

import { GET, PUT as putAssignment } from "@/app/api/restaurants/[restaurantId]/floor/assignments/[reservationId]/route";
import { PUT as putSelection } from "@/app/api/restaurants/[restaurantId]/floor/assignments/route";
import { PUT as putTables } from "@/app/api/restaurants/[restaurantId]/floor/tables/route";
import { getFloorReassignmentOptions, reassignFloorSelection, reassignFloorTables, saveFloorTables } from "./floor-api";

const origin = "https://restaurant.test";
const assignment: FloorAssignmentInput = { roomId: "room", locationId: "window", optionId: "custom", x: 240.5, y: 200, rotation: 0, expectedRoomRevision: 4, capacity: 4,
  customTables: [{ tableId: "table", x: 240.5, y: 200, rotation: 90 }] };
const allocation: FloorAllocationView = {
  id: "allocation", reservationId: "visit / A", roomId: "room", locationId: "window", combinationId: null, capacity: 4, customerName: "Grupo A", partySize: 2, date: "2099-11-01", time: "22:30", notes: "Ventana", code: "VISIT", source: "WALK_IN", releasedAt: null, version: 6, reservationRevision: 9,
  serviceStartAt: "2099-11-02T01:30:00.000Z", serviceEndAt: "2099-11-02T03:00:00.000Z", blockedFrom: "2099-11-02T01:30:00.000Z", blockedUntil: "2099-11-02T03:00:00.000Z", timeZone: "America/Argentina/Buenos_Aires", poses: [],
};
const options: FloorOptionsView = { rooms: [], options: [], currentAllocation: allocation, interval: { serviceStartAt: allocation.serviceStartAt, serviceEndAt: allocation.serviceEndAt, blockedFrom: allocation.blockedFrom, blockedUntil: allocation.blockedUntil, timeZone: allocation.timeZone } };
const board: FloorBoardView = { restaurantId: "restaurant one", restaurantName: "Bistró", timeZone: allocation.timeZone, enabled: true, at: allocation.serviceStartAt, updatedAt: allocation.serviceStartAt, rooms: [], allocations: [allocation] };
const command = { expectedRevision: allocation.reservationRevision!, expectedAllocationVersion: allocation.version, assignment };
const room: FloorRoom = { id: "room", restaurantId: "restaurant one", name: "Salón principal", width: 800, height: 600, revision: 5, active: true, fixtures: [], locations: [], combinations: [],
  tables: [{ id: "table", label: "M1", shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 0, y: 0, rotation: 0, active: true }] };
const tableInput: FloorTableInventoryInput = { roomId: room.id, expectedRevision: 4, tables: room.tables, combinations: [] };

// Keep the real HTTP serialization, route dispatch, schemas and response handling on
// both sides of fetch. Only authenticated services are replaced; no server is started.
function connectClientToRoute() {
  const fetchRoute = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input), origin);
    const match = /^\/api\/restaurants\/([^/]+)\/floor\/(?:assignments(?:\/([^/]+))?|(tables))$/.exec(url.pathname);
    if (!match) throw new Error(`Unexpected API URL: ${url.pathname}`);
    const headers = new Headers(init?.headers);
    headers.set("sec-fetch-site", "same-origin");
    const request = new NextRequest(url, { ...init, signal: init?.signal ?? undefined, headers });
    const restaurantId = decodeURIComponent(match[1]);
    if (match[3] === "tables") return putTables(request, { params: Promise.resolve({ restaurantId }) });
    if (!match[2]) return putSelection(request, { params: Promise.resolve({ restaurantId }) });
    const context = { params: Promise.resolve({ restaurantId, reservationId: decodeURIComponent(match[2]) }) };
    return request.method === "PUT" ? putAssignment(request, context) : GET(request, context);
  });
  vi.stubGlobal("fetch", fetchRoute);
  return fetchRoute;
}

describe("floor reassignment client and route protocol", () => {
  beforeEach(() => { vi.resetAllMocks(); services.access.mockResolvedValue({ restaurantId: "restaurant one", readOnly: true }); services.options.mockResolvedValue(options); services.board.mockResolvedValue(board); services.tables.mockResolvedValue(room); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("loads the assignment resource and saves its current revisions without altering its stored interval", async () => {
    const fetchRoute = connectClientToRoute();
    const controller = new AbortController();
    const loaded = await getFloorReassignmentOptions("restaurant one", allocation.reservationId, controller.signal);
    const url = new URL(String(fetchRoute.mock.calls[0][0]), origin);
    expect(url.pathname).toBe("/api/restaurants/restaurant%20one/floor/assignments/visit%20%2F%20A");
    expect(url.search).toBe("");
    expect(fetchRoute.mock.calls[0][1]).toMatchObject({ cache: "no-store", credentials: "same-origin", signal: controller.signal });
    expect(services.options).toHaveBeenCalledWith("restaurant one", "visit / A");
    expect(loaded).toEqual(options);
    expect(loaded.interval).toEqual({ serviceStartAt: allocation.serviceStartAt, serviceEndAt: allocation.serviceEndAt, blockedFrom: allocation.blockedFrom, blockedUntil: allocation.blockedUntil, timeZone: allocation.timeZone });
    const saved = await reassignFloorTables("restaurant one", allocation.reservationId, command);
    expect(fetchRoute.mock.calls[1][1]).toMatchObject({ method: "PUT" });
    expect(JSON.parse(String(fetchRoute.mock.calls[1][1]?.body))).toEqual(command);
    expect(services.reassign).toHaveBeenCalledWith("restaurant one", { ...command, reservationId: allocation.reservationId });
    expect(saved).toEqual(board);
    expect(saved.allocations[0]).toMatchObject({ version: 6, reservationRevision: 9, serviceStartAt: allocation.serviceStartAt, serviceEndAt: allocation.serviceEndAt });
    expect(services.admin).not.toHaveBeenCalled();
  });

  it("surfaces a route conflict as a recoverable client error instead of a successful save", async () => {
    connectClientToRoute();
    services.reassign.mockRejectedValue(new ConflictError("El armado cambió en otra pantalla. Actualizá la sala."));
    await expect(reassignFloorTables("restaurant one", allocation.reservationId, command)).rejects.toThrow("El armado cambió en otra pantalla. Actualizá la sala.");
    expect(services.reassign).toHaveBeenCalledWith("restaurant one", { ...command, reservationId: allocation.reservationId });
    expect(services.board).not.toHaveBeenCalled();
  });

  it("serializes all selected reservation updates in one PUT and preserves the displayed instant", async () => {
    const fetchRoute = connectClientToRoute();
    const updates = [{ ...command, reservationId: allocation.reservationId }, { ...command, reservationId: "other reservation", expectedRevision: 11, expectedAllocationVersion: 3 }];
    const saved = await reassignFloorSelection("restaurant one", { updates }, allocation.serviceStartAt);
    const url = new URL(String(fetchRoute.mock.calls[0][0]), origin);
    expect(url.pathname).toBe("/api/restaurants/restaurant%20one/floor/assignments");
    expect(url.searchParams.get("at")).toBe(allocation.serviceStartAt);
    expect(fetchRoute.mock.calls[0][1]).toMatchObject({ method: "PUT", cache: "no-store", credentials: "same-origin" });
    expect(JSON.parse(String(fetchRoute.mock.calls[0][1]?.body))).toEqual({ updates });
    expect(services.reassignMany).toHaveBeenCalledOnce(); expect(services.reassignMany).toHaveBeenCalledWith("restaurant one", { updates });
    expect(services.board).toHaveBeenCalledWith("restaurant one", allocation.serviceStartAt);
    expect(saved).toEqual(board); expect(services.reassign).not.toHaveBeenCalled(); expect(services.admin).not.toHaveBeenCalled();
  });

  it("rejects a batch conflict without issuing separate reservation writes or returning a board", async () => {
    connectClientToRoute(); services.reassignMany.mockRejectedValue(new ConflictError("Otra reserva cambió. No se guardó la selección."));
    await expect(reassignFloorSelection("restaurant one", { updates: [{ ...command, reservationId: allocation.reservationId }] }, allocation.serviceStartAt)).rejects.toThrow("No se guardó la selección");
    expect(services.reassignMany).toHaveBeenCalledOnce(); expect(services.reassign).not.toHaveBeenCalled(); expect(services.board).not.toHaveBeenCalled();
  });

  it("rejects empty or duplicate reservation batches before calling the transactional service", async () => {
    connectClientToRoute(); const update = { ...command, reservationId: allocation.reservationId };
    await expect(reassignFloorSelection("restaurant one", { updates: [] })).rejects.toThrow();
    await expect(reassignFloorSelection("restaurant one", { updates: [update, update] })).rejects.toThrow();
    expect(services.reassignMany).not.toHaveBeenCalled(); expect(services.board).not.toHaveBeenCalled();
  });

  it("allows staff inventory edits through the table endpoint while rejecting room and sector mutations", async () => {
    const fetchRoute = connectClientToRoute();
    const saved = await saveFloorTables("restaurant one", tableInput);
    expect(String(fetchRoute.mock.calls[0][0])).toBe("/api/restaurants/restaurant%20one/floor/tables");
    expect(fetchRoute.mock.calls[0][1]).toMatchObject({ method: "PUT" });
    expect(services.tables).toHaveBeenCalledWith("restaurant one", tableInput);
    expect(saved).toEqual({ room });
    services.tables.mockClear();
    const forbidden = { ...tableInput, width: 2000, locations: [] };
    await expect(saveFloorTables("restaurant one", forbidden)).rejects.toThrow(/unrecognized keys/i);
    expect(services.tables).not.toHaveBeenCalled();
    expect(services.admin).not.toHaveBeenCalled();
  });
});
