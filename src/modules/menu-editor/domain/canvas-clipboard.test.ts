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
  layerOrder: 0,
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
  layerOrder: 0,
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
      [{ id: "group", name: "Card", nodeIds: ["back", "front"], parentGroupId: null, layerOrder: 0, visible: true, locked: false }],
    );
    source.nodes[1].groupId = "group";
    const snapshot = copyCanvasSelection(source, ["front", "back"]);
    if (!snapshot) throw new Error("Expected snapshot");
    const ids = ["back-copy", "front-copy", "group-copy"];
    let nextId = 0;
    const pasted = pasteCanvasSelection(snapshot, source, () => ids[nextId++]!, 1);

    expect(pasted.nodes.map((node) => node.id)).toEqual(["back-copy", "front-copy"]);
    expect(pasted.nodes.map((node) => [node.x, node.y])).toEqual([[124, 174], [324, 274]]);
    expect(pasted.nodes.every((node) => node.groupId === "group-copy")).toBe(true);
    expect(pasted.groups).toEqual([{ id: "group-copy", name: "Card", nodeIds: ["back-copy", "front-copy"], parentGroupId: null, layerOrder: 1, visible: true, locked: false }]);
    expect(pasted.rootGroupIds).toEqual(["group-copy"]);
    expect({ ...pasted.nodes[1], id: "front", x: 300, y: 250, groupId: "group" }).toEqual(source.nodes[1]);
    expect(snapshot.nodes.map((node) => [node.x, node.y])).toEqual([[100, 150], [300, 250]]);
  });

  it("detaches a partial group so the pasted document has no dangling membership", () => {
    const snapshot = copyCanvasSelection(
      documentWith(
        [text("a", 10, 20, "group"), text("b", 200, 20, "group")],
        [{ id: "group", name: "Pair", nodeIds: ["a", "b"], parentGroupId: null, layerOrder: 0, visible: true, locked: false }],
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

    expect(pasteCanvasSelection(centered, documentWith([text("existing", 0, 0)]), () => "copy-1", 2).nodes[0]).toMatchObject({ x: 148, y: 148 });
    expect(pasteCanvasSelection(atEdge, documentWith([]), () => "copy-2", 1).nodes[0]).toMatchObject({ x: 876, y: 736 });
  });

  it("copies nested and empty groups and pastes the root as a sibling when its parent still exists", () => {
    const source = documentWith(
      [text("member", 80, 90, "outer")],
      [
        { id: "parent", name: "Parent", nodeIds: [], parentGroupId: null, layerOrder: 0, visible: true, locked: false },
        { id: "outer", name: "Outer", nodeIds: ["member"], parentGroupId: "parent", layerOrder: 0, visible: false, locked: true },
        { id: "empty", name: "Empty", nodeIds: [], parentGroupId: "outer", layerOrder: 1, visible: true, locked: false },
      ],
    );
    const snapshot = copyCanvasSelection(source, ["member"], "outer");
    if (!snapshot) throw new Error("Expected nested snapshot");
    expect(snapshot.groups.map((group) => group.id)).toEqual(["outer", "empty"]);

    const ids = ["member-copy", "outer-copy", "empty-copy"];
    let nextId = 0;
    const pasted = pasteCanvasSelection(snapshot, source, () => ids[nextId++]!, 1);
    expect(pasted.rootGroupIds).toEqual(["outer-copy"]);
    expect(pasted.groups).toEqual([
      { id: "outer-copy", name: "Outer", nodeIds: ["member-copy"], parentGroupId: "parent", layerOrder: 1, visible: false, locked: true },
      { id: "empty-copy", name: "Empty", nodeIds: [], parentGroupId: "outer-copy", layerOrder: 1, visible: true, locked: false },
    ]);
    expect(pasted.nodes[0]).toMatchObject({ id: "member-copy", groupId: "outer-copy", x: 104, y: 114 });
  });

  it("copies and pastes a completely empty group", () => {
    const source = documentWith([], [{ id: "empty", name: "Empty", nodeIds: [], parentGroupId: null, layerOrder: 0, visible: true, locked: false }]);
    const snapshot = copyCanvasSelection(source, [], "empty");
    if (!snapshot) throw new Error("Expected empty group snapshot");
    const pasted = pasteCanvasSelection(snapshot, source, () => "empty-copy", 1);
    expect(pasted.nodes).toEqual([]);
    expect(pasted.rootGroupIds).toEqual(["empty-copy"]);
    expect(pasted.groups[0]).toMatchObject({ id: "empty-copy", parentGroupId: null, layerOrder: 1 });
  });
});
