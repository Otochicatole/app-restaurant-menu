import { describe, expect, it } from "vitest";
import { createTemplateDocument } from "./template";
import { documentAssetIds, validateCanvasDocument } from "./document-policy";

describe("menu editor document policy", () => {
  it("accepts the template and extracts image/font/modal assets", () => {
    const template = createTemplateDocument("Café");
    const document = validateCanvasDocument({ ...template, nodes: [...template.nodes, { ...template.nodes[0], id: "image", type: "image", assetId: "asset-image", alt: "Plato", fit: "contain", cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, cornerRadius: 0 }, { ...template.nodes[0], id: "fonted", fontAssetId: "asset-font", modalAssetId: "asset-video" }] });
    expect(documentAssetIds(document)).toEqual(new Set(["asset-image", "asset-font", "asset-video"]));
    const modalText = document.nodes.find((node) => node.id === "fonted");
    expect(modalText?.type === "text" ? modalText.modalAssetId : undefined).toBe("asset-video");
  });

  it("rejects duplicate ids and dangling groups", () => {
    const template = createTemplateDocument("Café");
    expect(() => validateCanvasDocument({ ...template, nodes: [template.nodes[0], template.nodes[0]] })).toThrow("IDs duplicados");
    expect(() => validateCanvasDocument({ ...template, groups: [{ id: "g", name: "Grupo", nodeIds: ["missing"] }] })).toThrow("objeto inexistente");
  });

  it("derives canvas bounds for legacy documents", () => {
    const template = createTemplateDocument("Café");
    const legacyDocument = { ...template } as unknown as Record<string, unknown>;
    delete legacyDocument.canvasBounds;
    const normalized = validateCanvasDocument(legacyDocument);
    expect(normalized.canvasBounds).toEqual(template.initialViewport);
  });

  it("defaults legacy text modal assets to null", () => {
    const template = createTemplateDocument("Café");
    const legacyDocument = structuredClone(template) as unknown as { nodes: Array<Record<string, unknown>> };
    legacyDocument.nodes.forEach((node) => { if (node.type === "text") delete node.modalAssetId; });
    const normalized = validateCanvasDocument(legacyDocument);
    const text = normalized.nodes.find((node) => node.type === "text");
    expect(text?.type === "text" ? text.modalAssetId : undefined).toBeNull();
  });

  it("defaults legacy shape borders to all sides", () => {
    const template = createTemplateDocument("Café");
    const legacyDocument = structuredClone(template) as unknown as { nodes: Array<Record<string, unknown>> };
    legacyDocument.nodes.forEach((node) => { if (node.type === "shape") delete node.strokeSides; });
    const normalized = validateCanvasDocument(legacyDocument);
    const shape = normalized.nodes.find((node) => node.type === "shape");
    expect(shape?.type === "shape" ? shape.strokeSides : undefined).toEqual(["top", "right", "bottom", "left"]);
  });

  it("normalizes shape border sides to canonical order", () => {
    const template = createTemplateDocument("Café");
    const normalized = validateCanvasDocument({ ...template, nodes: template.nodes.map((node) => node.type === "shape" ? { ...node, strokeSides: ["left", "top"] } : node) });
    const shape = normalized.nodes.find((node) => node.type === "shape");
    expect(shape?.type === "shape" ? shape.strokeSides : undefined).toEqual(["top", "left"]);
  });

  it("copies the legacy cornerRadius to all rectangle corners", () => {
    const template = createTemplateDocument("Café");
    const legacyDocument = structuredClone(template) as unknown as { nodes: Array<Record<string, unknown>> };
    legacyDocument.nodes.forEach((node) => {
      if (node.type === "shape" && node.shape === "rect") {
        delete node.cornerRadii;
        node.cornerRadius = 24;
      }
    });
    const normalized = validateCanvasDocument(legacyDocument);
    const shape = normalized.nodes.find((node) => node.type === "shape" && node.shape === "rect");
    expect(shape?.type === "shape" ? shape.cornerRadii : undefined).toEqual({ topLeft: 24, topRight: 24, bottomRight: 24, bottomLeft: 24 });
    expect(shape?.type === "shape" ? "cornerRadius" in shape : false).toBe(false);
  });

  it("accepts safe system font families and rejects arbitrary CSS values", () => {
    const template = createTemplateDocument("Café");
    const valid = validateCanvasDocument({ ...template, nodes: template.nodes.map((node) => node.type === "text" ? { ...node, fontFamily: "Georgia" } : node) });
    expect(valid.nodes.find((node) => node.type === "text")?.fontFamily).toBe("Georgia");
    expect(() => validateCanvasDocument({ ...template, nodes: template.nodes.map((node) => node.type === "text" ? { ...node, fontFamily: "url(javascript:alert(1))" } : node) })).toThrow();
  });
});
