import { describe, expect, it } from "vitest";
import { createTemplateDocument } from "./template";
import { documentAssetIds, validateCanvasDocument } from "./document-policy";

describe("menu editor document policy", () => {
  it("accepts the template and extracts image/font assets", () => {
    const template = createTemplateDocument("Café");
    const document = validateCanvasDocument({ ...template, nodes: [...template.nodes, { ...template.nodes[0], id: "image", type: "image", assetId: "asset-image", alt: "Plato", fit: "contain", cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, cornerRadius: 0 }, { ...template.nodes[0], id: "fonted", fontAssetId: "asset-font" }] });
    expect(documentAssetIds(document)).toEqual(new Set(["asset-image", "asset-font"]));
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
});
