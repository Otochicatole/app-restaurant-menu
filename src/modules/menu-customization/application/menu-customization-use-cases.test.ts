import { describe, expect, it, vi } from "vitest";
import type { CustomFontUpload, FontOption, FontSelection } from "../contracts";
import { createMenuCustomizationUseCases } from "./menu-customization-use-cases";
import type { MenuCustomizationRepository } from "./ports";

const font: FontOption = {
  id: "font-1",
  name: "Inter",
  category: "sans-serif",
  source: "google",
  scope: "system",
  canDelete: false,
  googleFamily: "Inter",
  familyAlias: "Inter",
  fontFamily: "Inter, sans-serif",
  weights: "400;700",
  hasFile: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const selection = Object.fromEntries(
  ["global", "title", "subtitle", "group", "product", "featured"].map((target) => [target, null]),
) as FontSelection;

function repository(): MenuCustomizationRepository {
  return {
    getHeader: vi.fn(async () => ({ id: null, title: "Carta", description: "Menú", createdAt: null, updatedAt: null })),
    updateHeader: vi.fn(async (_tenantId, input) => ({ id: "header-1", ...input, createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() })),
    listFonts: vi.fn(async () => [font]),
    getFontSelection: vi.fn(async () => selection),
    selectFont: vi.fn(async () => undefined),
    createCustomFont: vi.fn(async (_tenantId: string, input: CustomFontUpload): Promise<FontOption> => ({ ...font, id: "custom-1", name: input.name, source: "custom", scope: "tenant", canDelete: true, hasFile: true })),
    deleteCustomFont: vi.fn(async () => undefined),
    getCustomFontAsset: vi.fn(async () => ({ storageKey: "opaque/font.woff2", name: "Marca" })),
  };
}

describe("menu customization use cases", () => {
  it("validates tenant scope and delegates every customization operation", async () => {
    const repo = repository();
    const useCases = createMenuCustomizationUseCases(repo);
    const file = { name: "brand.woff2", size: 4, buffer: Buffer.from("wOF2") };

    await expect(useCases.getHeader("tenant-1")).resolves.toMatchObject({ title: "Carta" });
    await expect(useCases.updateHeader("tenant-1", { title: " Nueva carta ", description: " Hoy " })).resolves.toMatchObject({ title: "Nueva carta", description: "Hoy" });
    await expect(useCases.listFonts("tenant-1")).resolves.toEqual([font]);
    await expect(useCases.getFontSelection("tenant-1")).resolves.toBe(selection);
    await expect(useCases.selectFont("tenant-1", { target: "title", fontId: "font-1" })).resolves.toBeUndefined();
    await expect(useCases.createCustomFont("tenant-1", { name: " Marca ", category: "display", file })).resolves.toMatchObject({ name: "Marca" });
    await expect(useCases.deleteCustomFont("tenant-1", "custom-1")).resolves.toBeUndefined();
    await expect(useCases.getCustomFontAsset("tenant-1", "custom-1")).resolves.toMatchObject({ name: "Marca" });

    expect(repo.createCustomFont).toHaveBeenCalledWith("tenant-1", { name: "Marca", category: "display", file });
  });

  it("rejects empty scopes and malformed commands before reaching persistence", async () => {
    const repo = repository();
    const useCases = createMenuCustomizationUseCases(repo);
    expect(() => useCases.getHeader("")).toThrow();
    expect(() => useCases.updateHeader("tenant-1", { title: "", description: "" })).toThrow();
    expect(() => useCases.selectFont("tenant-1", { target: "title", fontId: "" })).toThrow();
    expect(() => useCases.deleteCustomFont("tenant-1", "")).toThrow();
    expect(() => useCases.getCustomFontAsset("", "font-1")).toThrow();
    expect(() => useCases.createCustomFont("tenant-1", {
      name: "Falsa",
      category: "display",
      file: { name: "false.woff2", size: 4, buffer: Buffer.from("wOFF") },
    })).toThrowError(expect.objectContaining({ code: "BAD_REQUEST" }));
    expect(repo.updateHeader).not.toHaveBeenCalled();
    expect(repo.createCustomFont).not.toHaveBeenCalled();
  });
});
