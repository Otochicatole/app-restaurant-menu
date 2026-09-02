import { STROKE_SIDES, type CanvasDocumentV1 } from "../contracts";
import { allCornerRadii } from "./rectangle-border";

export function createTemplateDocument(name: string): CanvasDocumentV1 {
  return {
    schemaVersion: 1,
    background: "#F3EEDC",
    initialViewport: { x: -120, y: -80, width: 1240, height: 900 },
    canvasBounds: { x: 0, y: 0, width: 1240, height: 900 },
    nodes: [
      { id: "template-title", type: "text", x: 80, y: 70, width: 900, height: 100, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, text: name, fontAssetId: null, fontFamily: "Georgia", fontSize: 72, fontWeight: "800", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "middle", lineHeight: 1.1, letterSpacing: 0, fill: "#3A4824", semanticRole: "heading" },
      { id: "template-subtitle", type: "text", x: 85, y: 190, width: 700, height: 56, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, text: "Diseñá tu carta desde este lienzo", fontAssetId: null, fontFamily: "Trebuchet MS", fontSize: 30, fontWeight: "400", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "middle", lineHeight: 1.2, letterSpacing: 0, fill: "#AB5641", semanticRole: "paragraph" },
      { id: "template-card", type: "shape", x: 80, y: 300, width: 720, height: 300, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, shape: "rect", fill: "#EAD8B8", stroke: "#B8790A", strokeWidth: 3, strokeSides: [...STROKE_SIDES], cornerRadii: allCornerRadii(24) },
      { id: "template-help", type: "text", x: 125, y: 370, width: 620, height: 130, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, text: "Agregá textos, imágenes, formas e iconos desde la barra lateral.", fontAssetId: null, fontSize: 34, fontWeight: "600", fontStyle: "normal", textDecoration: "none", align: "center", verticalAlign: "middle", lineHeight: 1.25, letterSpacing: 0, fill: "#3A4824", semanticRole: "paragraph" },
    ],
    groups: [],
  };
}
