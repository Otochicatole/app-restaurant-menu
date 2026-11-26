import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "@/platform/application/errors";

const mocks = vi.hoisted(() => ({ access: vi.fn(), save: vi.fn(), originValid: true }));
vi.mock("@/modules/floor-management/server", () => ({ requireFloorReadAccess: mocks.access, floorManagement: { saveTables: mocks.save } }));
vi.mock("@/platform/security/csrf", () => ({ validateOrigin: () => mocks.originValid, csrfErrorResponse: () => new Response(null, { status: 403 }) }));
vi.mock("@/platform/logging/logger", () => ({ logger: { error: vi.fn() } }));
import { PUT } from "./route";

const context = { params: Promise.resolve({ restaurantId: "own" }) };
const inventory = { roomId: "room", expectedRevision: 3, tables: [{ id: "table", label: "M1", shape: "SQUARE", width: 80, height: 80, capacity: 4, x: 0, y: 0, rotation: 0, active: true }], combinations: [] };
const send = (body: unknown) => PUT(new NextRequest("https://restaurant.test/api/restaurants/own/floor/tables", {
  method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}), context);

describe("staff table inventory permissions", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.originValid = true; mocks.access.mockResolvedValue({ restaurantId: "own", readOnly: true }); mocks.save.mockResolvedValue({ id: "room", revision: 4, tables: inventory.tables }); });

  it("lets staff update only table inventory and returns a private room response", async () => {
    const response = await send(inventory);
    expect(response.status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith("own");
    expect(mocks.save).toHaveBeenCalledWith("own", inventory);
    expect(await response.json()).toMatchObject({ success: true, data: { room: { id: "room", revision: 4 } } });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it.each(["name", "width", "height", "active", "locations", "fixtures", "timeZone", "staffAccount"])("rejects an injected %s plan or account property", async (field) => {
    const response = await send({ ...inventory, [field]: "unauthorized" });
    expect(response.status).toBe(422);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it.each([new NotFoundError("Restaurante"), new ForbiddenError()])("rejects inaccessible or suspended restaurants before writing", async (error) => {
    mocks.access.mockRejectedValue(error);
    const response = await send(inventory);
    expect([403, 404]).toContain(response.status);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rejects cross-origin changes before authorization or mutation", async () => {
    mocks.originValid = false;
    expect((await send(inventory)).status).toBe(403);
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
