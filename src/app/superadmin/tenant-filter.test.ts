import { describe, expect, it } from "vitest";
import { filterTenantRows, normalizeTenantSearch, type TenantStatusFilter } from "./tenant-filter";

const tenants = [
  { id: "1", name: "Café Central", email: "hola@central.test", slug: "cafe-central", status: "ACTIVE" as const },
  { id: "2", name: "La Esquina", email: "admin@esquina.test", slug: "la-esquina", status: "SUSPENDED" as const },
  { id: "3", name: "Bistró Norte", email: "equipo@bistronorte.test", slug: "bistro-norte", status: "ACTIVE" as const },
];

describe("tenant filtering", () => {
  it("normalizes accents, case and surrounding whitespace", () => {
    expect(normalizeTenantSearch("  CAFÉ  ")).toBe("cafe");
    expect(filterTenantRows(tenants, "  CAFE ", "ALL").map((tenant) => tenant.id)).toEqual(["1"]);
  });

  it("matches name, email and slug", () => {
    expect(filterTenantRows(tenants, "esquina", "ALL").map((tenant) => tenant.id)).toEqual(["2"]);
    expect(filterTenantRows(tenants, "bistronorte.test", "ALL").map((tenant) => tenant.id)).toEqual(["3"]);
    expect(filterTenantRows(tenants, "cafe-central", "ALL").map((tenant) => tenant.id)).toEqual(["1"]);
  });

  it("applies all status filters", () => {
    const filters: TenantStatusFilter[] = ["ALL", "ACTIVE", "SUSPENDED"];
    expect(filters.map((filter) => filterTenantRows(tenants, "", filter).length)).toEqual([3, 2, 1]);
    expect(filterTenantRows(tenants, "norte", "SUSPENDED")).toEqual([]);
  });

  it("returns an empty list when there are no matches", () => {
    expect(filterTenantRows(tenants, "sin resultados", "ALL")).toEqual([]);
  });
});
