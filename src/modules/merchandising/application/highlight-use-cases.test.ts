import { describe, expect, it, vi } from "vitest";
import { createHighlightUseCases } from "./highlight-use-cases";
import type { HighlightsRepository } from "./ports";

describe("highlight use cases", () => {
  it("reads and atomically replaces the three slots", async () => {
    const repository: HighlightsRepository = {
      get: vi.fn(async () => [null, null, null] as [null, null, null]),
      replace: vi.fn(async () => undefined),
    };
    const useCases = createHighlightUseCases(repository);
    await expect(useCases.getHighlights("tenant-1")).resolves.toEqual([null, null, null]);
    await expect(useCases.replaceHighlights("tenant-1", { productIds: ["p1", null, "p3"] })).resolves.toBeUndefined();
    expect(repository.replace).toHaveBeenCalledWith("tenant-1", { productIds: ["p1", null, "p3"] });
  });

  it("rejects duplicate products, missing slots and an empty tenant", async () => {
    const repository: HighlightsRepository = { get: vi.fn(), replace: vi.fn() };
    const useCases = createHighlightUseCases(repository);
    expect(() => useCases.getHighlights("")).toThrow();
    expect(() => useCases.replaceHighlights("tenant-1", { productIds: ["p1", "p1", null] })).toThrow();
    expect(() => useCases.replaceHighlights("tenant-1", { productIds: ["p1"] } as never)).toThrow();
    expect(repository.replace).not.toHaveBeenCalled();
  });
});
