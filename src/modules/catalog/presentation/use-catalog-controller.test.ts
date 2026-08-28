/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DragEndEvent } from "@dnd-kit/core";
import type { GroupView, ProductView } from "../contracts";
import { useCatalogController } from "./use-catalog-controller";

const router = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const group: GroupView = {
  id: "group-1",
  name: "Bebidas",
  description: "",
  productCount: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const product = (id: string, name: string, sortOrder: number): ProductView => ({
  id,
  name,
  description: "",
  price: 1,
  groupId: group.id,
  groupName: group.name,
  sortOrder,
  mediaUrl: null,
  mediaType: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

afterEach(() => {
  router.refresh.mockReset();
  router.replace.mockReset();
});

describe("useCatalogController", () => {
  it("rolls an optimistic reorder back when persistence fails", async () => {
    const reorderProducts = vi.fn(async () => ({
      success: false as const,
      error: { code: "CONFLICT", message: "El orden cambió" },
    }));
    const products = [product("product-1", "Café", 0), product("product-2", "Té", 1)];
    const { result } = renderHook(() => useCatalogController({
      groups: [group],
      products,
      initialGroupId: group.id,
      deleteGroup: vi.fn(),
      deleteProduct: vi.fn(),
      reorderProducts,
    }));

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: "product-1" },
        over: { id: "product-2" },
      } as unknown as DragEndEvent);
    });

    expect(reorderProducts).toHaveBeenCalledWith({
      groupId: group.id,
      productIds: ["product-2", "product-1"],
    });
    expect(result.current.visibleProducts.map(({ id }) => id)).toEqual(["product-1", "product-2"]);
    expect(result.current.actionError).toBe("El orden cambió");
  });
});
