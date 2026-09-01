import { describe, expect, it } from "vitest";
import { validateCanvasDocument } from "./document-policy";
import { TEMPLATE_PRESETS } from "./template-presets";

describe("plantillas del sistema", () => {
  it("registra exactamente tres presets válidos", () => {
    expect(TEMPLATE_PRESETS).toHaveLength(3);
    for (const preset of TEMPLATE_PRESETS) {
      expect(preset.document.canvasBounds.width).toBeGreaterThan(0);
      expect(validateCanvasDocument(preset.document).nodes.length).toBeGreaterThan(0);
    }
  });

  it("usa nombres y estilos diferenciados", () => {
    expect(TEMPLATE_PRESETS.map((preset) => preset.name)).toEqual(["Minimalista vertical", "Cafetería", "Gourmet"]);
    expect(TEMPLATE_PRESETS[1].document.background).toBe("#F3E4CF");
    expect(TEMPLATE_PRESETS[2].document.background).toBe("#1F2421");
  });
});
