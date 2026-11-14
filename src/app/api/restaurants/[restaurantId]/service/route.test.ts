import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "@/platform/application/errors";
import { GET, POST } from "./route";

const access = vi.hoisted(() => ({
  floor: vi.fn(), admin: vi.fn(), actor: vi.fn(),
  snapshot: vi.fn(), report: vi.fn(), products: vi.fn(), staff: vi.fn(), execute: vi.fn(),
}));

vi.mock("@/modules/floor-management/server", () => ({ requireFloorReadAccess: access.floor }));
vi.mock("@/modules/restaurant-management/server", () => ({ requireRestaurantContext: access.admin }));
vi.mock("@/modules/identity-access/server", () => ({ requireAuthenticatedAccount: access.actor }));
vi.mock("@/modules/reservation-management/server", () => ({
  tableService: { snapshot: access.snapshot, report: access.report, products: access.products, staff: access.staff, execute: access.execute },
}));

const url = "http://example.test/api/restaurants/restaurant/service";
const context = (restaurantId = "restaurant") => ({ params: Promise.resolve({ restaurantId }) });
const post = (command: object, fetchSite = "same-origin") => new NextRequest(url, {
  method: "POST", headers: { "content-type": "application/json", "sec-fetch-site": fetchSite },
  body: JSON.stringify(command),
});

describe("restaurant service permissions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    access.actor.mockResolvedValue({ kind: "waiter", adminId: "staff" });
    access.admin.mockRejectedValue(new ForbiddenError("Solo administración"));
    access.floor.mockImplementation(async (id: string) => {
      if (id !== "restaurant") throw new NotFoundError("Restaurante");
    });
  });

  it("lets a waiter record checkout only within their floor scope", async () => {
    const checkout = { action: "checkout", accountId: "bill", expectedVersion: 3, paymentMethod: "CASH" };
    access.execute.mockResolvedValue({ receiptNumber: "C-bill" });
    expect((await POST(post(checkout), context("other"))).status).toBe(404);
    expect(access.execute).not.toHaveBeenCalled();
    expect((await POST(post(checkout), context())).status).toBe(200);
    expect(access.execute).toHaveBeenCalledWith("restaurant", "staff", checkout);
  });

  it("requires admin access for the catalog, staff, sales history and closing actions", async () => {
    for (const mode of ["cash", "products", "staff"]) {
      expect((await GET(new NextRequest(url + "?mode=" + mode), context())).status).toBe(403);
    }
    expect((await POST(post({ action: "close-day", date: "2026-11-09" }), context())).status).toBe(403);
    expect((await POST(post({ action: "save-staff", name: "Ana", role: "WAITER" }), context())).status).toBe(403);
    expect((await POST(post({ action: "set-staff-active", id: "st-1", active: false }), context())).status).toBe(403);
    expect(access.report).not.toHaveBeenCalled();
    expect(access.products).not.toHaveBeenCalled();
    expect(access.staff).not.toHaveBeenCalled();
    expect(access.execute).not.toHaveBeenCalled();
  });

  it("lets a waiter reassign an active waiter within their floor scope", async () => {
    const command = { action: "assign-waiter", accountId: "bill", expectedVersion: 1, waiterId: "w-2" };
    access.execute.mockResolvedValue({ id: "bill", assignedWaiterId: "w-2" });
    expect((await POST(post(command), context())).status).toBe(200);
    expect(access.execute).toHaveBeenCalledWith("restaurant", "staff", command);
  });

  it("does not expose historical receipts to a waiter through the board query", async () => {
    const response = await GET(new NextRequest(url + "?at=2026-11-09T14:00:00Z"), context());
    expect(await response.json()).toMatchObject({ success: true, data: { accounts: [] } });
    expect(access.snapshot).not.toHaveBeenCalled();
  });

  it("rejects cross-site writes before resolving the actor", async () => {
    expect((await POST(post({ action: "close-day", date: "2026-11-09" }, "cross-site"), context())).status).toBe(403);
    expect(access.actor).not.toHaveBeenCalled();
  });
});
