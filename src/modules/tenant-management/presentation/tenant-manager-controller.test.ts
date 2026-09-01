/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTenantManager } from "./use-tenant-manager";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const successAction = vi.fn(async () => ({ success: true as const, data: {} }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("useTenantManager", () => {
  it("refreshes without reloading the document and exposes a temporary password", async () => {
    const createTenant = vi.fn(async () => ({ success: true as const, data: { temporaryPassword: "temporary-123" } }));
    const { result } = renderHook(() => useTenantManager({
      tenants: [],
      createTenant,
      updateTenant: successAction,
      toggleTenant: successAction,
      resetPassword: successAction,
      deleteTenant: successAction,
    }));

    await act(() => result.current.submitCreate(new FormData()));

    expect(result.current.temporaryPassword?.value).toBe("temporary-123");
    expect(result.current.isBusy("create")).toBe(false);
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("recovers from a rejected server action", async () => {
    const createTenant = vi.fn(async () => { throw new Error("offline"); });
    const { result } = renderHook(() => useTenantManager({
      tenants: [],
      createTenant,
      updateTenant: successAction,
      toggleTenant: successAction,
      resetPassword: successAction,
      deleteTenant: successAction,
    }));

    await act(() => result.current.submitCreate(new FormData()));

    expect(result.current.notice).toContain("servidor");
    expect(result.current.isBusy("create")).toBe(false);
  });
});
