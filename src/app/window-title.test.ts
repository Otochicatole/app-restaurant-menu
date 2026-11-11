import { describe, expect, it } from "vitest";
import {
  formatWindowTitle,
  resolveRestaurantLayoutMetadata,
  resolveSectionMetadata,
} from "./window-title";

describe("window title helpers", () => {
  it("formats section and restaurant name with section first", () => {
    expect(formatWindowTitle("Cocina", "Pepe Café")).toBe("Cocina · Pepe Café");
    expect(formatWindowTitle("Sala", "  ")).toBe("Sala");
    expect(formatWindowTitle("Caja", null)).toBe("Caja");
  });

  it("resolves section metadata cleanly and falls back when access throws", async () => {
    await expect(resolveSectionMetadata("Sala", async () => "Pepe Café")).resolves.toEqual({
      title: { absolute: "Sala · Pepe Café" },
    });
    await expect(
      resolveSectionMetadata("Cocina", async () => {
        throw new Error("Unauthorized");
      }),
    ).resolves.toEqual({
      title: { absolute: "Cocina" },
    });
  });

  it("resolves inherited restaurant layout template metadata safely", async () => {
    await expect(resolveRestaurantLayoutMetadata(async () => "Pepe Café")).resolves.toEqual({
      title: {
        default: "Editor · Pepe Café",
        template: "%s · Pepe Café",
      },
    });
    await expect(
      resolveRestaurantLayoutMetadata(async () => {
        throw new Error("Not found");
      }),
    ).resolves.toEqual({
      title: {
        default: "Editor",
        template: "%s",
      },
    });
  });
});

