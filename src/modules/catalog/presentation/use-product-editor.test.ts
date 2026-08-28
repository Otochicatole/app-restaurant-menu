// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductView } from "../contracts";
import { useProductEditorController } from "./use-product-editor";

const product: ProductView = {
  id: "product-1",
  name: "Café",
  description: "",
  price: 3,
  groupId: "group-1",
  groupName: "Bebidas",
  sortOrder: 0,
  mediaUrl: null,
  mediaType: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

afterEach(() => vi.unstubAllGlobals());

describe("useProductEditorController", () => {
  it("reuses the created product when a media upload is retried", async () => {
    vi.stubGlobal("URL", { createObjectURL: () => "blob:preview", revokeObjectURL: () => undefined });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ success: false, error: { message: "Falló la carga" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { ...product, mediaType: "image", mediaUrl: "/media" } }) });
    vi.stubGlobal("fetch", fetchMock);
    const createProduct = vi.fn(async () => ({ success: true as const, data: product }));
    const updateProduct = vi.fn(async () => ({ success: true as const, data: product }));
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useProductEditorController({ createProduct, updateProduct, onSuccess }));

    act(() => result.current.chooseFile(new File(["image"], "menu.png", { type: "image/png" })));
    await act(() => result.current.save({ name: "Café", description: "", price: 3, groupId: "group-1" }));

    expect(createProduct).toHaveBeenCalledTimes(1);
    expect(updateProduct).not.toHaveBeenCalled();
    expect(result.current.serverError).toBe("Falló la carga");

    await act(() => result.current.save({ name: "Café", description: "", price: 3, groupId: "group-1" }));

    expect(createProduct).toHaveBeenCalledTimes(1);
    expect(updateProduct).toHaveBeenCalledWith({
      productId: "product-1",
      input: { name: "Café", description: "", price: 3, groupId: "group-1" },
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

