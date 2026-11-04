import { NextRequest } from "next/server";
import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "@/platform/application/errors";

const mocks = vi.hoisted(() => ({ access: vi.fn(), options: vi.fn(), reassign: vi.fn(), board: vi.fn(), origin: vi.fn() }));
vi.mock("@/modules/floor-management/server", () => ({ requireFloorReadAccess: mocks.access, floorManagement: { getBoard: mocks.board } }));
vi.mock("@/modules/reservation-management/server", async () => {
  const { floorAssignmentSchema } = await import("@/modules/floor-management/contracts");
  const floorReassignmentSchema = z.object({ reservationId: z.string().min(1), expectedRevision: z.number().int().nonnegative(), expectedAllocationVersion: z.number().int().nonnegative(), assignment: floorAssignmentSchema });
  return { floorReassignmentSchema, floorReassignments: { options: mocks.options, reassign: mocks.reassign } };
});
vi.mock("@/platform/security/csrf", () => ({ validateOrigin: mocks.origin, csrfErrorResponse: () => new Response(null, { status: 403 }) }));
vi.mock("@/platform/logging/logger", () => ({ logger: { error: vi.fn() } }));
import { GET, PUT } from "./route";

const context = { params: Promise.resolve({ restaurantId: "own", reservationId: "reservation" }) };
const url = "https://restaurant.test/api/restaurants/own/floor/assignments/reservation";
const command = { expectedRevision: 2, expectedAllocationVersion: 3,
  assignment: { roomId: "room", locationId: "location", optionId: "table:table", x: 100, y: 100, rotation: 90, expectedRoomRevision: 1 },
};
const send = (body: unknown = command) => PUT(new NextRequest(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), context);

describe("floor assignment resource permissions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.access.mockResolvedValue({ restaurantId: "own", readOnly: true, canManageWalkIns: true });
    mocks.origin.mockReturnValue(true);
    mocks.options.mockResolvedValue({ rooms: [], options: [], currentAllocation: { source: "ADMIN" } });
    mocks.board.mockResolvedValue({ allocations: [] });
  });

  it("lets waiters read all group arrangements through a resource path independent of query modes", async () => {
    const response = await GET(new NextRequest(`${url}?mode=unknown&reservationId=foreign&partySize=1&at=2099-01-01`), context);
    expect(response.status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith("own");
    expect(mocks.options).toHaveBeenCalledWith("own", "reservation");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ data: { currentAllocation: { source: "ADMIN" } } });
  });

  it("uses the path identity, strips unrelated reservation writes and returns only the sanitized board", async () => {
    const response = await send({ ...command, reservationId: "foreign", customerPhone: "secret", partySize: 1, status: "CANCELLED", adminNotes: "changed" });
    expect(response.status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith("own");
    expect(mocks.reassign).toHaveBeenCalledWith("own", { ...command, reservationId: "reservation" });
    expect(mocks.board).toHaveBeenCalledWith("own");
    expect(await response.json()).toEqual({ success: true, data: { allocations: [] } });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects another restaurant before consulting or changing any assignment", async () => {
    mocks.access.mockRejectedValue(new NotFoundError("Restaurante"));
    const read = await GET(new NextRequest(url), context);
    const write = await send();
    expect(read.status).toBe(404); expect(write.status).toBe(404);
    expect(mocks.options).not.toHaveBeenCalled(); expect(mocks.reassign).not.toHaveBeenCalled(); expect(mocks.board).not.toHaveBeenCalled();
  });

  it("rejects cross-origin writes before consulting authorization or storage", async () => {
    mocks.origin.mockReturnValue(false);
    const response = await send();
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.access).not.toHaveBeenCalled(); expect(mocks.reassign).not.toHaveBeenCalled();
  });

  it("keeps revision conflicts visible without returning a successful board", async () => {
    mocks.reassign.mockRejectedValue(new ConflictError("El armado cambió."));
    const response = await send();
    expect(response.status).toBe(409); expect(mocks.board).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ error: { code: "CONFLICT" } });
  });

  it("requires both expected revisions before writing", async () => {
    const response = await send({ expectedRevision: 2, assignment: command.assignment });
    expect(response.status).toBe(422); expect(mocks.reassign).not.toHaveBeenCalled();
  });
});
