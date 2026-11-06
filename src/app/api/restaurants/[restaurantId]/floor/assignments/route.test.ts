import { NextRequest } from "next/server";
import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "@/platform/application/errors";

const mocks = vi.hoisted(() => ({ access: vi.fn(), reassignMany: vi.fn(), board: vi.fn(), origin: vi.fn() }));
vi.mock("@/modules/floor-management/server", () => ({ requireFloorReadAccess: mocks.access, floorManagement: { getBoard: mocks.board } }));
vi.mock("@/modules/reservation-management/server", async () => {
  const { floorAssignmentSchema } = await import("@/modules/floor-management/contracts");
  const update = z.object({ reservationId: z.string().min(1), expectedRevision: z.number().int().nonnegative(), expectedAllocationVersion: z.number().int().nonnegative(), assignment: floorAssignmentSchema });
  return { floorBatchReassignmentSchema: z.object({ updates: z.array(update).min(1).max(40) }), floorReassignments: { reassignMany: mocks.reassignMany } };
});
vi.mock("@/platform/security/csrf", () => ({ validateOrigin: mocks.origin, csrfErrorResponse: () => new Response(null, { status: 403 }) }));
vi.mock("@/platform/logging/logger", () => ({ logger: { error: vi.fn() } }));
import { PUT } from "./route";

const context = { params: Promise.resolve({ restaurantId: "own" }) };
const url = "https://restaurant.test/api/restaurants/own/floor/assignments";
const update = { reservationId: "reservation", expectedRevision: 2, expectedAllocationVersion: 3,
  assignment: { roomId: "room", locationId: "location", optionId: "table:table", x: 100, y: 100, rotation: 90, expectedRoomRevision: 1 },
};
const send = (body: unknown = { updates: [update] }, at?: string) => PUT(new NextRequest(at === undefined ? url : `${url}?at=${encodeURIComponent(at)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), context);

describe("atomic floor selection route permissions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.access.mockResolvedValue({ restaurantId: "own", readOnly: true, canManageWalkIns: true });
    mocks.origin.mockReturnValue(true);
    mocks.board.mockResolvedValue({ allocations: [] });
  });

  it("lets floor staff submit a selection once and returns the sanitized board", async () => {
    const response = await send({ updates: [{ ...update, customerPhone: "secret", status: "CANCELLED", partySize: 1 }], adminNotes: "changed" });
    expect(response.status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith("own");
    expect(mocks.reassignMany).toHaveBeenCalledExactlyOnceWith("own", { updates: [update] });
    expect(mocks.board).toHaveBeenCalledWith("own");
    expect(await response.json()).toEqual({ success: true, data: { allocations: [] } });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects a foreign restaurant before consulting or changing assignments", async () => {
    mocks.access.mockRejectedValue(new NotFoundError("Restaurante"));
    expect((await send()).status).toBe(404);
    expect(mocks.reassignMany).not.toHaveBeenCalled(); expect(mocks.board).not.toHaveBeenCalled();
  });

  it("rejects cross-origin writes before authorization and storage", async () => {
    mocks.origin.mockReturnValue(false);
    const response = await send();
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.access).not.toHaveBeenCalled(); expect(mocks.reassignMany).not.toHaveBeenCalled();
  });

  it("returns batch conflicts without returning a successful board", async () => {
    mocks.reassignMany.mockRejectedValue(new ConflictError("El armado cambió."));
    const response = await send();
    expect(response.status).toBe(409); expect(mocks.board).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ error: { code: "CONFLICT" } });
  });

  it("requires a nonempty bounded selection and both expected revisions before writing", async () => {
    for (const body of [{ updates: [] }, { updates: [{ reservationId: "reservation", expectedRevision: 2, assignment: update.assignment }] }, { updates: Array.from({ length: 41 }, () => update) }]) {
      expect((await send(body)).status).toBe(422);
    }
    expect(mocks.reassignMany).not.toHaveBeenCalled();
  });

  it("returns the board at the selected historical or future time after the atomic update", async () => {
    const at = "2099-12-01T20:00:00.000Z";
    expect((await send({ updates: [update] }, at)).status).toBe(200);
    expect(mocks.reassignMany).toHaveBeenCalledExactlyOnceWith("own", { updates: [update] });
    expect(mocks.board).toHaveBeenCalledExactlyOnceWith("own", at);
  });

  it("validates the selected board time before changing any reservation", async () => {
    for (const at of ["not-a-time", ""]) {
      const response = await send({ updates: [update] }, at);
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    }
    expect(mocks.reassignMany).not.toHaveBeenCalled(); expect(mocks.board).not.toHaveBeenCalled();
  });
});
