import { describe, expect, it } from "vitest";
import type { CanvasDocumentV1, CanvasNode } from "../contracts";
import { copyCanvasSelection, pasteCanvasSelection } from "./canvas-clipboard";

const bounds = { x: 0, y: 0, width: 1000, height: 800 };

const text = (id: string, x: number, y: number, groupId: string | null = null): CanvasNode => ({
  id,
  type: "text",
  x,
  y,
  width: 100,
  height: 40,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  groupId,
  link: "https://example.com",
  text: id,
  modalAssetId: "modal-asset",
  fontAssetId: null,
  fontFamily: "Arial",
  fontSize: 20,
  fontWeight: "700",
  fontStyle: "italic",
  textDecoration: "underline",
  align: "center",
  verticalAlign: "middle",
  lineHeight: 1.4,
  letterSpacing: 2,
  fill: "#0459c8",
  semanticRole: "heading",
});

const rectangle = (id: string, x: number, y: number): CanvasNode => ({
  id,
  type: "shape",
  shape: "rect",
  x,
  y,
  width: 220,
  height: 140,
  rotation: 12,
  opacity: 0.8,
  visible: true,
  locked: false,
  groupId: null,
  link: null,
  fill: "#112233",
  stroke: "#aabbcc",
  strokeWidth: 5,
  strokeSides: ["top", "right"],
  cornerRadii: { topLeft: 8, topRight: 16, bottomRight: 24, bottomLeft: 32 },
  fillGradient: {
    angle: 135,
    stops: [
      { color: "#0459c8ff", offset: 0.2 },
      { color: "#ffffff00", offset: 0.8 },
    ],
  },
  backgroundImage: {
    assetId: "background-asset",
    fit: "cover",
    positionX: 0.25,
    positionY: 0.75,
    opacity: 0.6,
  },
});

const documentWith = (nodes: CanvasNode[], groups: CanvasDocumentV1["groups"] = []): CanvasDocumentV1 => ({
  schemaVersion: 1,
  background: "#ffffff",
  initialViewport: bounds,
  canvasBounds: bounds,
  nodes,
  groups,
});

describe("canvas clipboard", () => {
  it("copies every node property into a detached snapshot in layer order", () => {
    const original = rectangle("rectangle", 100, 120);
    const snapshot = copyCanvasSelection(documentWith([original, text("text", 30, 40)]), ["text", "rectangle"]);

    expect(snapshot?.nodes.map((node) => node.id)).toEqual(["rectangle", "text"]);
    expect(snapshot?.nodes[0]).toEqual(original);
    expect(snapshot?.nodes[0]).not.toBe(original);
    const copiedRectangle = snapshot?.nodes[0];
    if (!copiedRectangle || copiedRectangle.type !== "shape") throw new Error("Expected copied rectangle");
    copiedRectangle.cornerRadii.topLeft = 99;
    copiedRectangle.fillGradient!.stops[0].offset = 0.5;
    copiedRectangle.backgroundImage!.opacity = 0.2;
    expect(original.type === "shape" && original.cornerRadii.topLeft).toBe(8);
    expect(original.type === "shape" && original.fillGradient?.stops[0].offset).toBe(0.2);
    expect(original.type === "shape" && original.backgroundImage?.opacity).toBe(0.6);
  });

  it("pastes a selection with fresh IDs, exact styling, and one shared offset", () => {
    const source = documentWith(
      [text("back", 100, 150, "group"), rectangle("front", 300, 250)],
      [{ id: "group", name: "Card", nodeIds: ["back", "front"] }],
    );
    source.nodes[1].groupId = "group";
    const snapshot = copyCanvasSelection(source, ["front", "back"]);
    if (!snapshot) throw new Error("Expected snapshot");
    const ids = ["back-copy", "front-copy", "group-copy"];
    let nextId = 0;
    const pasted = pasteCanvasSelection(snapshot, bounds, () => ids[nextId++]!, 1);

    expect(pasted.nodes.map((node) => node.id)).toEqual(["back-copy", "front-copy"]);
    expect(pasted.nodes.map((node) => [node.x, node.y])).toEqual([[124, 174], [324, 274]]);
    expect(pasted.nodes.every((node) => node.groupId === "group-copy")).toBe(true);
    expect(pasted.groups).toEqual([{ id: "group-copy", name: "Card", nodeIds: ["back-copy", "front-copy"] }]);
    expect({ ...pasted.nodes[1], id: "front", x: 300, y: 250, groupId: "group" }).toEqual(source.nodes[1]);
    expect(snapshot.nodes.map((node) => [node.x, node.y])).toEqual([[100, 150], [300, 250]]);
  });

  it("detaches a partial group so the pasted document has no dangling membership", () => {
    const snapshot = copyCanvasSelection(
      documentWith(
        [text("a", 10, 20, "group"), text("b", 200, 20, "group")],
        [{ id: "group", name: "Pair", nodeIds: ["a", "b"] }],
      ),
      ["a"],
    );

    expect(snapshot?.groups).toEqual([]);
    expect(snapshot?.nodes[0].groupId).toBeNull();
  });

  it("uses progressive offsets and moves inward when the source touches the lower-right edge", () => {
    const centered = copyCanvasSelection(documentWith([text("center", 100, 100)]), ["center"]);
    const atEdge = copyCanvasSelection(documentWith([text("edge", 900, 760)]), ["edge"]);
    if (!centered || !atEdge) throw new Error("Expected snapshots");

    expect(pasteCanvasSelection(centered, bounds, () => "copy-1", 2).nodes[0]).toMatchObject({ x: 148, y: 148 });
    expect(pasteCanvasSelection(atEdge, bounds, () => "copy-2", 1).nodes[0]).toMatchObject({ x: 876, y: 736 });
  });
});
