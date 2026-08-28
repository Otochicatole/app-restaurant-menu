import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/platform/application/errors";
import type { PublicMenuView } from "../contracts";
import { createPublicMenuUseCases } from "./public-menu-use-cases";
import type { PublishedMenuReader } from "./ports";

const menu = {
  tenant: { id: "tenant-1", name: "Café", slug: "cafe-central" },
  header: { title: "Carta", description: "Hoy" },
  sections: [],
  highlights: [null, null, null],
  theme: { fonts: { global: null, title: null, subtitle: null, group: null, product: null, featured: null } },
} satisfies PublicMenuView;

describe("public menu use cases", () => {
  it("normalizes slugs and returns the complete public view", async () => {
    const reader: PublishedMenuReader = {
      getBySlug: vi.fn(async () => menu),
    };
    const useCases = createPublicMenuUseCases(reader);
    await expect(useCases.getPublicMenu(" CAFE-Central ")).resolves.toBe(menu);
    await expect(useCases.getPublicMenu(" CAFÉ-CENTRAL ")).rejects.toBeDefined();
    expect(reader.getBySlug).toHaveBeenCalledWith("cafe-central");
  });

  it("returns a safe not-found error for unpublished menus", async () => {
    const reader: PublishedMenuReader = {
      getBySlug: vi.fn(async () => null),
    };
    const useCases = createPublicMenuUseCases(reader);
    await expect(useCases.getPublicMenu("missing-menu")).rejects.toBeInstanceOf(NotFoundError);
  });
});
