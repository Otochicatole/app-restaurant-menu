/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanvasDocumentV1, CanvasNode } from "../contracts";
import { createTemplateDocument } from "../domain/template";
import { LayersPanel } from "./LayersPanel";

const template = createTemplateDocument("Carta");
const sourceText = template.nodes.find((node) => node.type === "text")!;

function text(id: string, layerOrder: number, groupId: string | null, visible = true): CanvasNode {
  return { ...sourceText, id, name: id, groupId, layerOrder, visible };
}

const document: CanvasDocumentV1 = {
  ...template,
  nodes: [text("root", 0, null), text("hidden", 0, "child", false)],
  groups: [
    { id: "outer", name: "Outer", nodeIds: [], parentGroupId: null, layerOrder: 1, visible: true, locked: false },
    { id: "child", name: "Child", nodeIds: ["hidden"], parentGroupId: "outer", layerOrder: 0, visible: true, locked: false },
  ],
};

function panelProps(overrides: Partial<React.ComponentProps<typeof LayersPanel>> = {}): React.ComponentProps<typeof LayersPanel> {
  return {
    document,
    selectedIds: [],
    selectedGroupId: null,
    renameGroupId: null,
    storageKey: "test:layer-tree",
    onCreateGroup: vi.fn(),
    onGroupSelection: vi.fn(),
    onSelectNode: vi.fn(),
    onSelectGroup: vi.fn(),
    onChangeNode: vi.fn(),
    onChangeGroup: vi.fn(),
    onRenameGroup: vi.fn(),
    onUngroup: vi.fn(),
    onMove: vi.fn(),
    onRenameFinished: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("LayersPanel", () => {
  it("renders nested and hidden layers, and collapses without changing the document", async () => {
    render(React.createElement(LayersPanel, panelProps()));
    expect(screen.getAllByRole("treeitem").map((row) => row.getAttribute("aria-level"))).toEqual(["1", "2", "3", "1"]);
    expect(screen.getByRole("button", { name: "Mostrar capa hidden" })).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Contraer grupo Outer" }));
    expect(screen.queryByText("Child")).toBeNull();
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem("test:layer-tree") ?? "[]")).toContain("outer"));
  });

  it("toggles visibility and locks without selecting the row", async () => {
    const props = panelProps();
    render(React.createElement(LayersPanel, props));

    await userEvent.click(screen.getByRole("button", { name: "Ocultar grupo Outer" }));
    expect(props.onChangeGroup).toHaveBeenCalledWith("outer", { visible: false });
    expect(props.onSelectGroup).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Bloquear grupo Outer" }));
    expect(props.onChangeGroup).toHaveBeenCalledWith("outer", { locked: true });
    await userEvent.click(screen.getByRole("button", { name: "Mostrar capa hidden" }));
    expect(props.onChangeNode).toHaveBeenCalledWith("hidden", { visible: true });
    expect(props.onSelectNode).not.toHaveBeenCalled();
  });

  it("creates, groups, selects, renames, and ungroups from direct controls", async () => {
    const props = panelProps({ selectedGroupId: "outer" });
    render(React.createElement(LayersPanel, props));

    await userEvent.click(screen.getByRole("button", { name: "Nuevo grupo" }));
    await userEvent.click(screen.getByRole("button", { name: "Agrupar" }));
    expect(props.onCreateGroup).toHaveBeenCalledOnce();
    expect(props.onGroupSelection).toHaveBeenCalledOnce();

    const outerRow = screen.getAllByRole("treeitem").find((row) => within(row).queryByText("Outer"));
    if (!outerRow) throw new Error("Expected outer row");
    fireEvent.doubleClick(within(outerRow).getByRole("button", { name: "Outer" }));
    const input = screen.getByRole("textbox", { name: "Nombre del grupo Outer" });
    fireEvent.change(input, { target: { value: "Promociones" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(props.onRenameGroup).toHaveBeenCalledWith("outer", "Promociones");

    await userEvent.click(screen.getByRole("button", { name: "Desagrupar y conservar capas" }));
    expect(props.onUngroup).toHaveBeenCalledWith("outer");
  });
});
