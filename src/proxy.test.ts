import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

const verifySessionToken = vi.hoisted(() => vi.fn());
vi.mock("@/modules/identity-access/server", () => ({ verifySessionToken }));
vi.mock("@/platform/config/server-env", () => ({ getServerEnv: () => ({ NODE_ENV: "test" }) }));

describe("floor route authentication", () => {
  beforeEach(() => { verifySessionToken.mockReset(); });

  it.each(["/floor", "/floor/rooms"])("requires a session for %s", async (path) => {
    const response = await proxy(new NextRequest(`https://restaurant.test${path}?restaurantId=restaurant`));
    expect(response.headers.get("location")).toBe("https://restaurant.test/admin/login");
    expect(verifySessionToken).not.toHaveBeenCalled();
  });

  it("rejects an invalid session on the English floor route", async () => {
    verifySessionToken.mockRejectedValue(new Error("Expired session"));
    const response = await proxy(new NextRequest("https://restaurant.test/floor", { headers: { cookie: "session=expired" } }));
    expect(response.headers.get("location")).toBe("https://restaurant.test/admin/login");
  });

  it("keeps authenticated floor responses private", async () => {
    verifySessionToken.mockResolvedValue({});
    const response = await proxy(new NextRequest("https://restaurant.test/floor?restaurantId=restaurant", { headers: { cookie: "session=valid" } }));
    expect(verifySessionToken).toHaveBeenCalledWith("valid");
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-middleware-request-x-pathname")).toBe("/floor");
  });
});
