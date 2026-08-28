import { describe, expect, it } from "vitest";
import { CatalogRuleViolation } from "./catalog-rules";
import { validateProductMedia } from "./media-policy";

describe("validateProductMedia", () => {
  it("accepts a PNG only when its signature matches the declared MIME", () => {
    const content = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateProductMedia({ type: "image/png", size: content.byteLength, content })).toEqual({
      mediaType: "image",
      extension: "png",
    });
  });

  it("rejects content whose signature does not match its MIME", () => {
    const content = new Uint8Array([0xff, 0xd8, 0xff]);
    expect(() => validateProductMedia({ type: "image/png", size: content.byteLength, content })).toThrow(
      CatalogRuleViolation,
    );
  });

  it("recognizes MP4 and WebM signatures", () => {
    const mp4 = Uint8Array.from([0, 0, 0, 16, ...[..."ftyp"].map((value) => value.charCodeAt(0))]);
    const webm = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3]);
    expect(validateProductMedia({ type: "video/mp4", size: mp4.byteLength, content: mp4 }).mediaType).toBe("video");
    expect(validateProductMedia({ type: "video/webm", size: webm.byteLength, content: webm }).extension).toBe("webm");
  });

  it("uses the actual byte length as an invariant", () => {
    const content = new Uint8Array([0xff, 0xd8, 0xff]);
    expect(() => validateProductMedia({ type: "image/jpeg", size: 99, content })).toThrow(
      "El tamaño declarado del archivo no coincide con su contenido",
    );
  });

  it("recognizes the remaining supported image signatures", () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff]);
    const gif87 = new TextEncoder().encode("GIF87a");
    const gif89 = new TextEncoder().encode("GIF89a");
    const webp = new TextEncoder().encode("RIFFxxxxWEBP");
    expect(validateProductMedia({ type: "image/jpeg", size: jpeg.length, content: jpeg }).extension).toBe("jpg");
    expect(validateProductMedia({ type: "image/gif", size: gif87.length, content: gif87 }).extension).toBe("gif");
    expect(validateProductMedia({ type: "image/gif", size: gif89.length, content: gif89 }).extension).toBe("gif");
    expect(validateProductMedia({ type: "image/webp", size: webp.length, content: webp }).extension).toBe("webp");
  });

  it("enforces image size and rejects unknown or truncated signatures", () => {
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    oversized.set([0xff, 0xd8, 0xff]);
    expect(() => validateProductMedia({ type: "image/jpeg", size: oversized.length, content: oversized })).toThrow("5MB");
    const unknown = new Uint8Array([1, 2, 3]);
    expect(() => validateProductMedia({ type: "application/pdf", size: unknown.length, content: unknown })).toThrow("no soportado");
    const truncatedWebp = new TextEncoder().encode("RIFF");
    expect(() => validateProductMedia({ type: "image/webp", size: truncatedWebp.length, content: truncatedWebp })).toThrow("contenido inválido");
  });
});
