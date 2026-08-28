import { describe, expect, it } from "vitest";
import { fontFamilyAlias } from "../contracts";
import { fontFamilyValue, MAX_FONT_SIZE, validateFontUpload } from "./font-policy";

describe("font policy", () => {
  it("derives CSS-safe aliases only from internal identifiers", () => {
    expect(fontFamilyAlias('id";}body{color:red')).toBe("tenant-font-idbodycolorred");
    expect(fontFamilyAlias("###")).toBe("tenant-font-custom");
    expect(fontFamilyValue("font-1", "script")).toBe('"tenant-font-font-1", cursive');
    expect(fontFamilyValue("font-2", "serif")).toContain("serif");
  });

  it.each([
    ["brand.woff", Buffer.from("wOFF")],
    ["brand.woff2", Buffer.from("wOF2")],
    ["brand.otf", Buffer.from("OTTO")],
    ["brand.ttf", Buffer.from([0x00, 0x01, 0x00, 0x00])],
    ["legacy.ttf", Buffer.from("true")],
  ])("accepts a valid %s signature", (name, buffer) => {
    expect(validateFontUpload({ name, size: buffer.length, buffer })).toBe(name.split(".").pop());
  });

  it("rejects empty, oversized, unknown and forged font files", () => {
    expect(() => validateFontUpload({ name: "empty.woff", size: 0, buffer: Buffer.alloc(0) })).toThrow("vacío");
    const oversized = Buffer.alloc(MAX_FONT_SIZE + 1);
    expect(() => validateFontUpload({ name: "huge.woff", size: oversized.length, buffer: oversized })).toThrow("10MB");
    expect(() => validateFontUpload({ name: "font.exe", size: 4, buffer: Buffer.from("wOFF") })).toThrow("no soportado");
    expect(() => validateFontUpload({ name: "forged.woff2", size: 4, buffer: Buffer.from("wOFF") })).toThrow("contenido inválido");
  });
});
