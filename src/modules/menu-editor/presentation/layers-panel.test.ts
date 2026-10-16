/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanvasDocumentV1, CanvasNode } from "../contracts";
import { createCanvasLayerIndex } from "../domain/layer-tree";
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
    layerIndex: createCanvasLayerIndex(document),
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

  it("expands and collapses all group folders with the toggle button and disables when empty", async () => {
    const props = panelProps();
    render(React.createElement(LayersPanel, props));

    const toggleButton = screen.getByRole("button", { name: "Contraer todas las carpetas" });
    expect((toggleButton as HTMLButtonElement).disabled).toBe(false);

    // Collapse all
    await userEvent.click(toggleButton);
    expect(screen.queryByText("Child")).toBeNull();
    expect(screen.queryByText("hidden")).toBeNull();
    expect(screen.getByText("Outer")).not.toBeNull();
    expect(screen.getByText("root")).not.toBeNull();

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("test:layer-tree") ?? "[]");
      expect(stored).toContain("outer");
      expect(stored).toContain("child");
    });

    // Expand all
    const expandButton = screen.getByRole("button", { name: "Expandir todas las carpetas" });
    await userEvent.click(expandButton);
    expect(screen.getByText("Child")).not.toBeNull();
    expect(screen.getByText("hidden")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Contraer todas las carpetas" })).not.toBeNull();

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("test:layer-tree") ?? "[]");
      expect(stored).toEqual([]);
    });

    // When there are no groups, button is disabled
    cleanup();
    const docNoGroups: CanvasDocumentV1 = { ...document, groups: [] };
    render(React.createElement(LayersPanel, panelProps({ document: docNoGroups, layerIndex: createCanvasLayerIndex(docNoGroups) })));
    const disabledButton = screen.getByRole("button", { name: "No hay carpetas de capas" });
    expect((disabledButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("filters layers by search query, highlights matches, and handles empty search results", async () => {
    render(React.createElement(LayersPanel, panelProps()));

    const searchInput = screen.getByRole("searchbox", { name: "Buscar capas" });
    expect(searchInput).not.toBeNull();

    // Filter by "hidden"
    await userEvent.type(searchInput, "hidden");
    expect(screen.getByText("1 resultado")).not.toBeNull();
    expect(screen.getByText("hidden")).not.toBeNull();
    expect(screen.getByText("Outer")).not.toBeNull();
    expect(screen.getByText("Child")).not.toBeNull();
    expect(screen.queryByText("root")).toBeNull();

    // Clear with X button
    await userEvent.click(screen.getByRole("button", { name: "Borrar búsqueda" }));
    expect(screen.getByText("root")).not.toBeNull();
    expect((searchInput as HTMLInputElement).value).toBe("");

    // Search case/accent insensitive and match group name
    await userEvent.type(searchInput, "OUTER");
    expect(screen.getByText("Child")).not.toBeNull();
    expect(screen.queryByText("root")).toBeNull();

    // Escape clears search
    fireEvent.keyDown(searchInput, { key: "Escape" });
    expect(screen.getByText("root")).not.toBeNull();

    // Search with no results shows empty state and clear button
    await userEvent.type(searchInput, "no-match-layer");
    expect(screen.getByText("No se encontraron capas")).not.toBeNull();
    expect(screen.getByText(/No hay capas ni grupos que coincidan con “no-match-layer”/)).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(screen.getByText("root")).not.toBeNull();
  });
});
