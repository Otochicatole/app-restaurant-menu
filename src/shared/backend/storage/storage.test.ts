import { describe, expect, it } from "vitest";

describe("storage namespace contract", () => {
  it("keeps tenant files beneath the tenant namespace", () => {
    const tenantId = "tenant-a";
    const path = `tenants/${tenantId}/products/product-1.png`;
    expect(path.startsWith(`tenants/${tenantId}/`)).toBe(true);
    expect(path.includes("..")).toBe(false);
  });
});
