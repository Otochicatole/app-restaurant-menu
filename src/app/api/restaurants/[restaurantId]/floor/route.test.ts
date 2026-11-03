import { NextRequest } from "next/server";
import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "@/platform/application/errors";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(), operational: vi.fn(), board: vi.fn(), config: vi.fn(),
  create: vi.fn(), release: vi.fn(), options: vi.fn(), save: vi.fn(),
}));
vi.mock("@/modules/restaurant-management/server", () => ({ requireRestaurantContext: mocks.admin }));
vi.mock("@/modules/floor-management/server", () => ({
  requireFloorReadAccess: mocks.operational,
  floorManagement: { getBoard: mocks.board, getConfig: mocks.config, saveRoom: mocks.save },
}));
vi.mock("@/modules/reservation-management/server", async () => {
  const actual = await import("@/modules/reservation-management/contracts");
  return { ...actual, publicAvailabilityQuerySchema: z.object({}), floorWalkIns: { create: mocks.create, release: mocks.release, options: mocks.options } };
});
vi.mock("@/platform/security/csrf", () => ({ validateOrigin: () => true, csrfErrorResponse: () => new Response(null, { status: 403 }) }));
vi.mock("@/platform/database/prisma", () => ({ prisma: undefined }));
vi.mock("@/platform/logging/logger", () => ({ logger: { error: vi.fn() } }));
import { GET, POST } from "./route";

const context = { params: Promise.resolve({ restaurantId: "own" }) };
const send = (body: unknown) => POST(new NextRequest("https://restaurant.test/api/restaurants/own/floor", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}), context);

describe("floor operational permissions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.admin.mockRejectedValue(new ForbiddenError());
    mocks.operational.mockResolvedValue({ restaurantId: "own", readOnly: true, canManageWalkIns: true });
    mocks.board.mockResolvedValue({ allocations: [] });
    mocks.options.mockResolvedValue({ rooms: [], options: [] });
  });

  it("allows staff to consult walk-in resources without exposing administrative configuration", async () => {
    const response = await GET(new NextRequest("https://restaurant.test/api/restaurants/own/floor?mode=walk-in-options&partySize=6&durationMinutes=90&eventId=foreign&excludeReservationId=foreign"), context);
    expect(response.status).toBe(200);
    expect(mocks.options).toHaveBeenCalledWith("own", 6, 90);
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("keeps configuration writes closed to staff", async () => {
    const response = await send({ action: "settings", timeZone: "UTC" });
    expect(response.status).toBe(403);
    expect(mocks.config).not.toHaveBeenCalled();
  });

  it("releases only through the narrow visit operation and returns a sanitized board", async () => {
    const response = await send({ action: "release-walk-in", reservationId: "visit", expectedRevision: 2 });
    expect(response.status).toBe(200);
    expect(mocks.release).toHaveBeenCalledWith("own", "visit", 2);
    expect(mocks.config).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ data: { allocations: [] } });
  });

  it("refuses another restaurant before reading resources or changing a visit", async () => {
    mocks.operational.mockRejectedValue(new NotFoundError("Restaurante"));
    const response = await send({ action: "release-walk-in", reservationId: "visit", expectedRevision: 0 });
    expect(response.status).toBe(404);
    expect(mocks.release).not.toHaveBeenCalled();
    expect(mocks.board).not.toHaveBeenCalled();
  });
});
