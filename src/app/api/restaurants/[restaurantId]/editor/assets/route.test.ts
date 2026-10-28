import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError } from "@/platform/application/errors";

const mocks = vi.hoisted(() => ({
  requireContext: vi.fn(), createAsset: vi.fn(), put: vi.fn(), delete: vi.fn(), enqueueCleanup: vi.fn(),
}));

vi.mock("@/modules/restaurant-management/server", () => ({ requireRestaurantContext: mocks.requireContext }));
vi.mock("@/modules/menu-editor/server", () => ({ menuEditor: { createAsset: mocks.createAsset }, checksum: () => "a".repeat(64) }));
vi.mock("@/platform/storage", () => ({ blobStore: { put: mocks.put, delete: mocks.delete } }));
vi.mock("@/platform/storage/asset-cleanup-queue", () => ({ enqueueAssetCleanup: mocks.enqueueCleanup }));
vi.mock("@/platform/security/csrf", () => ({ validateOrigin: () => true, csrfErrorResponse: () => new Response(null, { status: 403 }) }));
vi.mock("@/platform/logging/logger", () => ({ logger: { error: vi.fn() } }));

import { POST } from "./route";

function upload(width = 1, height = 1) {
  const bytes = new Uint8Array(24);
  bytes[0] = 0x89;
  bytes[1] = 0x50;
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  const form = new FormData();
  form.set("kind", "IMAGE");
  form.set("file", new File([bytes], "fixture.png", { type: "image/png" }));
  return POST(new NextRequest("http://localhost/api/restaurants/restaurant-1/editor/assets", { method: "POST", body: form }), {
    params: Promise.resolve({ restaurantId: "restaurant-1" }),
  });
}

describe("asset upload failure cleanup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireContext.mockResolvedValue({ restaurantId: "restaurant-1" });
    mocks.createAsset.mockResolvedValue({ id: "asset-1" });
    mocks.put.mockResolvedValue(undefined);
    mocks.delete.mockResolvedValue(undefined);
    mocks.enqueueCleanup.mockResolvedValue(undefined);
  });

  it("removes a partially written file when staging fails before database insertion", async () => {
    mocks.put.mockRejectedValue(new Error("partial write"));
    const response = await upload();
    expect(response.status).toBe(500);
    expect(mocks.createAsset).not.toHaveBeenCalled();
    expect(mocks.delete).toHaveBeenCalledWith(mocks.put.mock.calls[0][0]);
    expect(mocks.enqueueCleanup).not.toHaveBeenCalled();
  });

  it("removes the staged file when the database rejects the upload quota", async () => {
    mocks.createAsset.mockRejectedValue(new BadRequestError("Se alcanzó la cuota de archivos del restaurante."));
    const response = await upload();
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "BAD_REQUEST" } });
    expect(mocks.delete).toHaveBeenCalledWith(mocks.put.mock.calls[0][0]);
  });

  it.each(["staging", "database"])("queues cleanup when deletion after %s failure is unavailable", async (stage) => {
    if (stage === "staging") mocks.put.mockRejectedValue(new Error("partial write"));
    else mocks.createAsset.mockRejectedValue(new BadRequestError("quota"));
    mocks.delete.mockRejectedValue(new Error("storage offline"));
    const response = await upload();
    expect(response.status).toBe(stage === "staging" ? 500 : 400);
    expect(mocks.enqueueCleanup).toHaveBeenCalledWith(mocks.put.mock.calls[0][0]);
  });

  it("preserves the original validation error when both cleanup attempts fail", async () => {
    mocks.createAsset.mockRejectedValue(new BadRequestError("quota"));
    mocks.delete.mockRejectedValue(new Error("storage offline"));
    mocks.enqueueCleanup.mockRejectedValue(new Error("database offline"));
    const response = await upload();
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { message: "quota" } });
  });

  it.each([[0, 1], [1, 0]])("rejects invalid image dimensions (%i × %i) before storage or database writes", async (width, height) => {
    const response = await upload(width, height);
    expect(response.status).toBe(400);
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.createAsset).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("keeps the file after a successful upload", async () => {
    const response = await upload();
    expect(response.status).toBe(201);
    expect(mocks.createAsset).toHaveBeenCalledWith("restaurant-1", expect.objectContaining({ width: 1, height: 1 }));
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.enqueueCleanup).not.toHaveBeenCalled();
  });
});
