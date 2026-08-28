import { describe, expect, it, vi } from "vitest";
import { createGetAdminDashboard } from "./get-admin-dashboard";
import type { AdminDashboardReader } from "./ports";

describe("admin dashboard query", () => {
  it("requires a tenant scope before delegating", async () => {
    const view = { groupCount: 2, productCount: 8, highlightedCount: 3, header: { title: "Carta", description: "Hoy" } };
    const reader: AdminDashboardReader = { get: vi.fn(async () => view) };
    const query = createGetAdminDashboard(reader);
    await expect(query("tenant-1")).resolves.toBe(view);
    expect(() => query("")).toThrow();
    expect(reader.get).toHaveBeenCalledTimes(1);
  });
});
