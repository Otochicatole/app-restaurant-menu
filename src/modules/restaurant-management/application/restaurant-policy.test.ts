import { describe, expect, it } from "vitest";
import { assertRestaurantAccess } from "./restaurant-policy";
import type { RestaurantSummary } from "../contracts";

const restaurant: RestaurantSummary = { id: "r1", organizationId: "o1", name: "Centro", slug: "centro", landingSlug: "centro", publicDescription: "", status: "ACTIVE", landingEnabled: true, assetQuotaBytes: 1000 };
const actor = { kind: "tenant-admin", organizationId: "o1", mustChangePassword: false };
describe("restaurant authorization", () => {
  it("permits a restaurant belonging to the authenticated organization", () => expect(() => assertRestaurantAccess(actor, restaurant, "ACTIVE")).not.toThrow());
  it("rejects another organization and missing restaurant", () => {
    expect(() => assertRestaurantAccess({ ...actor, organizationId: "o2" }, restaurant, "ACTIVE")).toThrow("not found");
    expect(() => assertRestaurantAccess(actor, null, "ACTIVE")).toThrow("not found");
  });
  it("rejects suspended restaurants, organizations and password changes", () => {
    expect(() => assertRestaurantAccess(actor, { ...restaurant, status: "SUSPENDED" }, "ACTIVE")).toThrow("no está disponible");
    expect(() => assertRestaurantAccess(actor, restaurant, "SUSPENDED")).toThrow("no está disponible");
    expect(() => assertRestaurantAccess({ ...actor, mustChangePassword: true }, restaurant, "ACTIVE")).toThrow("contraseña");
  });
  it("permits superadmin only through an explicit management entry point", () => {
    const superadmin = { kind: "super-admin", organizationId: null, mustChangePassword: false };
    expect(() => assertRestaurantAccess(superadmin, restaurant, "ACTIVE")).toThrow("not found");
    expect(() => assertRestaurantAccess(superadmin, { ...restaurant, status: "SUSPENDED" }, "SUSPENDED", true)).not.toThrow();
  });
});
