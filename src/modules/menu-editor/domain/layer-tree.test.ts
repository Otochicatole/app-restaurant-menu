import { describe, expect, it } from "vitest";
import type { CanvasDocumentV1, CanvasGroup, CanvasNode } from "../contracts";
import { validateCanvasDocument } from "./document-policy";
import {
  createCanvasGroup,
  descendantGroupIds,
  descendantNodeIds,
  directLayerItems,
  groupCanvasSelection,
  groupLayerState,
  layerTreeRows,
  moveCanvasLayer,
  nodeLayerState,
  outermostGroupId,
  ungroupCanvasGroup,
} from "./layer-tree";
import { createTemplateDocument } from "./template";

const template = createTemplateDocument("Carta");
const sourceText = template.nodes.find((node) => node.type === "text")!;

function text(id: string, layerOrder: number, groupId: string | null = null): CanvasNode {
  return { ...sourceText, id, name: id, x: layerOrder * 50, y: layerOrder * 30, groupId, layerOrder };
}

function group(id: string, parentGroupId: string | null, layerOrder: number, nodeIds: string[] = [], patch: Partial<CanvasGroup> = {}): CanvasGroup {
  return { id, name: id, parentGroupId, layerOrder, nodeIds, visible: true, locked: false, ...patch };
}

function documentWith(nodes: CanvasNode[], groups: CanvasGroup[] = []): CanvasDocumentV1 {
  return { ...template, nodes, groups };
}

describe("layer tree", () => {
  it("normalizes legacy flat groups, derives order, and reconciles both membership representations", () => {
    const legacy = {
      ...template,
      nodes: [
        { ...text("listed", 0), groupId: undefined, layerOrder: undefined },
        { ...text("referenced", 1, "legacy"), layerOrder: undefined },
        { ...text("root", 2), layerOrder: undefined },
      ],
      groups: [{ id: "legacy", name: "Legacy", nodeIds: ["listed"] }],
    };

    const normalized = validateCanvasDocument(legacy);
    const normalizedGroup = normalized.groups[0];
    expect(normalizedGroup).toMatchObject({ parentGroupId: null, visible: true, locked: false });
    expect(normalizedGroup.nodeIds).toEqual(["listed", "referenced"]);
    expect(normalized.nodes.find((node) => node.id === "listed")?.groupId).toBe("legacy");
    expect(normalized.nodes.filter((node) => node.groupId === "legacy").map((node) => node.layerOrder)).toEqual([0, 1]);
    expect(directLayerItems(normalized, null)).toEqual([{ kind: "group", id: "legacy" }, { kind: "node", id: "root" }]);
  });

  it("rejects missing parents, duplicate memberships, self references, and cycles", () => {
    expect(() => validateCanvasDocument({ ...template, groups: [{ id: "child", name: "Child", nodeIds: [], parentGroupId: "missing" }] })).toThrow("grupo padre inexistente");
    expect(() => validateCanvasDocument({ ...template, nodes: [text("a", 0)], groups: [{ id: "one", name: "One", nodeIds: ["a"] }, { id: "two", name: "Two", nodeIds: ["a"] }] })).toThrow("más de un grupo");
    expect(() => validateCanvasDocument({ ...template, groups: [{ id: "self", name: "Self", nodeIds: [], parentGroupId: "self" }] })).toThrow("sí mismo");
    expect(() => validateCanvasDocument({ ...template, groups: [{ id: "a", name: "A", nodeIds: [], parentGroupId: "b" }, { id: "b", name: "B", nodeIds: [], parentGroupId: "a" }] })).toThrow("ciclo");
  });

  it("inherits visibility and locks without overwriting child state", () => {
    const hidden = documentWith(
      [text("node", 0, "inner")],
      [group("outer", null, 0, [], { visible: false, locked: true }), group("inner", "outer", 0, ["node"])],
    );
    expect(nodeLayerState(hidden, "node")).toMatchObject({ effectiveVisible: false, effectiveLocked: true, inheritedHidden: true, inheritedLocked: true });
    expect(groupLayerState(hidden, "inner")).toMatchObject({ effectiveVisible: false, effectiveLocked: true, inheritedHidden: true, inheritedLocked: true });

    const restored = { ...hidden, groups: hidden.groups.map((item) => item.id === "outer" ? { ...item, visible: true, locked: false } : item) };
    expect(nodeLayerState(restored, "node")).toMatchObject({ effectiveVisible: true, effectiveLocked: false });
    expect(restored.nodes[0]).toMatchObject({ visible: true, locked: false });
  });

  it("creates empty nested groups and groups a selection without changing coordinates", () => {
    const base = documentWith([text("back", 0), text("front", 1)]);
    const outer = createCanvasGroup(base, "outer", "Outer", null);
    const nested = createCanvasGroup(outer, "empty", "Empty", "outer");
    expect(nested.groups.find((item) => item.id === "empty")).toMatchObject({ parentGroupId: "outer", nodeIds: [] });

    const grouped = groupCanvasSelection(base, [{ kind: "node", id: "back" }, { kind: "node", id: "front" }], "selection", "Selection");
    expect(descendantNodeIds(grouped, "selection")).toEqual(["back", "front"]);
    expect(grouped.nodes.map(({ id, x, y }) => ({ id, x, y }))).toEqual(base.nodes.map(({ id, x, y }) => ({ id, x, y })));
    expect(grouped.groups.find((item) => item.id === "selection")?.nodeIds).toEqual(["back", "front"]);
  });

  it("reparents, reorders, outdents, and refuses group cycles", () => {
    const base = documentWith(
      [text("inside", 0, "parent"), text("root", 1)],
      [group("parent", null, 0, ["inside"]), group("child", "parent", 1)],
    );
    const nestedRoot = moveCanvasLayer(base, { kind: "node", id: "root" }, { type: "inside", groupId: "child" });
    expect(nestedRoot.nodes.find((node) => node.id === "root")?.groupId).toBe("child");
    expect(outermostGroupId(nestedRoot, "root")).toBe("parent");
    expect(descendantGroupIds(nestedRoot, "parent")).toEqual(["child"]);

    const unchanged = moveCanvasLayer(nestedRoot, { kind: "group", id: "parent" }, { type: "inside", groupId: "child" });
    expect(unchanged).toBe(nestedRoot);

    const outdented = moveCanvasLayer(nestedRoot, { kind: "node", id: "root" }, { type: "outdent" });
    expect(outdented.nodes.find((node) => node.id === "root")?.groupId).toBe("parent");
    expect(directLayerItems(outdented, "parent").at(-1)).toEqual({ kind: "node", id: "root" });
  });

  it("moves every descendant as one visual block when a group is reordered", () => {
    const base = documentWith(
      [text("group-back", 0, "folder"), text("between", 1), text("group-front", 1, "folder")],
      [group("folder", null, 0, ["group-back", "group-front"])],
    );
    const moved = moveCanvasLayer(base, { kind: "group", id: "folder" }, { type: "before", target: { kind: "node", id: "between" } });
    expect(moved.nodes.map((node) => node.id)).toEqual(["between", "group-back", "group-front"]);
    expect(directLayerItems(moved, null)).toEqual([{ kind: "node", id: "between" }, { kind: "group", id: "folder" }]);
  });

  it("ungroups into the same parent while preserving nested groups, nodes, and coordinates", () => {
    const base = documentWith(
      [text("direct", 0, "folder"), text("nested", 0, "child"), text("sibling", 1)],
      [group("folder", null, 0, ["direct"]), group("child", "folder", 1, ["nested"])],
    );
    const beforeFrames = base.nodes.map(({ id, x, y }) => ({ id, x, y }));
    const result = ungroupCanvasGroup(base, "folder");

    expect(result.groups.some((item) => item.id === "folder")).toBe(false);
    expect(result.groups.find((item) => item.id === "child")?.parentGroupId).toBeNull();
    expect(result.nodes.find((node) => node.id === "direct")?.groupId).toBeNull();
    expect(result.nodes.map(({ id, x, y }) => ({ id, x, y }))).toEqual(beforeFrames);
  });

  it("flattens only expanded branches for the panel while keeping hidden rows available", () => {
    const base = documentWith(
      [text("inside", 0, "folder"), { ...text("hidden", 1), visible: false }],
      [group("folder", null, 0, ["inside"])],
    );
    expect(layerTreeRows(base, new Set()).map((row) => row.ref.id)).toEqual(["hidden", "folder", "inside"]);
    expect(layerTreeRows(base, new Set(["folder"])).map((row) => row.ref.id)).toEqual(["hidden", "folder"]);
    expect(layerTreeRows(base, new Set()).find((row) => row.ref.id === "hidden")?.effectiveVisible).toBe(false);
  });
});
