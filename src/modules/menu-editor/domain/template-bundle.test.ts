import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createTemplateDocument } from "./template";
import { decodeTemplateBundle, encodeTemplateBundle, templateBundleFilename, type PortableTemplate } from "./template-bundle";

function fixture(): PortableTemplate {
  const content = pngHeader(2, 3);
  const document = createTemplateDocument("Portable");
  document.nodes.push({
    id: "image-node",
    type: "image",
    assetId: "image-asset",
    name: "Imagen",
    x: 10,
    y: 20,
    width: 200,
    height: 100,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    groupId: null,
    layerOrder: document.nodes.length,
    link: null,
    fit: "cover",
    cropX: 0,
    cropY: 0,
    cropWidth: 1,
    cropHeight: 1,
    cornerRadius: 0,
    alt: "Prueba",
  });
  return {
    name: "Café completo",
    description: "Incluye todos sus recursos",
    document,
    assets: [{
      id: "image-asset",
      kind: "IMAGE",
      name: "fondo.png",
      mimeType: "image/png",
      byteSize: content.byteLength,
      checksum: createHash("sha256").update(content).digest("hex"),
      width: 2,
      height: 3,
      fontFamily: null,
      content,
    }],
  };
}

describe("template bundle", () => {
  it("conserva documento, metadatos y bytes de los assets", () => {
    const source = fixture();
    const decoded = decodeTemplateBundle(encodeTemplateBundle(source));
    expect(decoded.name).toBe(source.name);
    expect(decoded.document.nodes.at(-1)).toMatchObject({ type: "image", assetId: "image-asset" });
    expect(decoded.assets).toHaveLength(1);
    expect(decoded.assets[0]).toMatchObject({ id: "image-asset", width: 2, height: 3 });
    expect([...decoded.assets[0].content]).toEqual([...source.assets[0].content]);
  });

  it("rechaza archivos alterados y referencias incompletas", () => {
    const bundle = encodeTemplateBundle(fixture());
    bundle[bundle.length - 1] ^= 0xff;
    expect(() => decodeTemplateBundle(bundle)).toThrow(/dañado/);
    expect(() => encodeTemplateBundle({ ...fixture(), assets: [] })).toThrow(/no coinciden/);
  });

  it("genera nombres de archivo seguros", () => {
    expect(templateBundleFilename("  Menú / Café  ")).toBe("Menu-Cafe.menutemplate");
  });
});

function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}
