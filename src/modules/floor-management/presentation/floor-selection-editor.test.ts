/** @vitest-environment jsdom */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FloorTable } from "../contracts";
import { FloorSelectionEditor } from "./FloorSelectionEditor";
import { applyFloorSelectionChanges } from "./floor-selection-editor";

const table = (id: string, overrides: Partial<FloorTable> = {}): FloorTable => ({ id, label: id, shape: "SQUARE", capacity: 4, width: 80, height: 80, x: 100, y: 100, rotation: 0, active: true, ...overrides });
const mixed = () => [table("M1"), table("M2", { shape: "RECTANGLE", width: 120, height: 60, capacity: 6, x: 300, rotation: 90, active: false })];
function applied(tables: FloorTable[], changes: Parameters<typeof applyFloorSelectionChanges>[1]) {
  const result = applyFloorSelectionChanges(tables, changes);
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(result.error);
  return result.tables;
}
function editor(tables = mixed(), props: Partial<Parameters<typeof FloorSelectionEditor>[0]> = {}) {
  const onApply = vi.fn(); const onCancel = vi.fn();
  const view = render(createElement(FloorSelectionEditor, { tables, busy: false, onApply, onCancel, ...props }));
  return { ...view, onApply, onCancel };
}
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const apply = () => fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));

afterEach(cleanup);

describe("selection table changes", () => {
  it("keeps each table's distinct properties when no bulk field changes", () => {
    const tables = mixed(); const before = structuredClone(tables);
    expect(applied(tables, {})).toEqual(tables);
    expect(tables).toEqual(before);
  });

  it("preserves fractional positions exactly when a group has no location changes", () => {
    const tables = [table("M1", { x: 0.1, y: 0.3 }), table("M2", { x: 0.9, y: 0.7 })];
    expect(applied(tables, { translation: { x: 0, y: 0, rotation: 0 } })).toEqual(tables);
  });

  it("changes width without replacing identities, labels, capacity or rectangular height", () => {
    const tables = [...mixed(), table("M3", { shape: "CIRCLE", width: 50, height: 50 })];
    const result = applied(tables, { inventory: { width: 95 } });
    expect(result.map((item) => [item.width, item.height])).toEqual([[95, 95], [95, 60], [95, 95]]);
    expect(result.map((item) => [item.id, item.label, item.capacity, item.active])).toEqual(tables.map((item) => [item.id, item.label, item.capacity, item.active]));
    expect(tables[0].width).toBe(80);
  });

  it("uses each original width for a round shape and applies height only to rectangular tables", () => {
    expect(applied(mixed(), { inventory: { shape: "CIRCLE" } }).map((item) => [item.width, item.height])).toEqual([[80, 80], [120, 120]]);
    expect(applied(mixed(), { inventory: { height: 140 } }).map((item) => [item.width, item.height])).toEqual([[80, 80], [120, 140]]);
  });

  it("rotates selected tables about their footprint center, then translates with exact quarter turns", () => {
    const tables = [table("M1", { x: 100, y: 100 }), table("M2", { x: 300, y: 100, rotation: 90 })];
    const result = applied(tables, { translation: { x: 10, y: 20, rotation: 90 } });
    expect(result.map((item) => [item.x, item.y, item.rotation])).toEqual([[210, 20, 90], [210, 220, 180]]);
    expect(result.map((item) => item.id)).toEqual(["M1", "M2"]);
    expect(result[0].capacity).toBe(tables[0].capacity);
    expect(tables.map((item) => item.x)).toEqual([100, 300]);
  });

  it("uses rotated dimensions for the center of an asymmetric selection", () => {
    const tables = [table("M1", { width: 40, height: 40, x: 0, y: 0 }), table("M2", { shape: "RECTANGLE", width: 200, height: 40, x: 100, y: 0, rotation: 90 })];
    const result = applied(tables, { translation: { x: 0, y: 0, rotation: 180 } });
    expect(result.map((item) => [item.x, item.y])).toEqual([[100, 0], [0, 0]]);
  });

  it("rejects invalid results atomically, empty selections, duplicate IDs and absolute group coordinates", () => {
    const tables = mixed(); const before = structuredClone(tables);
    for (const changes of [{ inventory: { capacity: 2.5 } }, { inventory: { width: 0 } }, { labels: { M2: " " } }, { translation: { x: Infinity, y: 0, rotation: 0 as const } }, { translation: { x: 100000, y: 0, rotation: 0 as const } }, { position: { x: 1 } }]) expect(applyFloorSelectionChanges(tables, changes).success).toBe(false);
    expect(applyFloorSelectionChanges([], {}).success).toBe(false);
    expect(applyFloorSelectionChanges([tables[0], tables[0]], {}).success).toBe(false);
    expect(applyFloorSelectionChanges([table("bad", { shape: "CIRCLE", height: 10 })], {}).success).toBe(false);
    expect(tables).toEqual(before);
  });
});

describe("selection editor", () => {
  it("starts on location and applies only the position of one physical table", () => {
    const tables = [table("M1")]; const { onApply } = editor(tables);
    expect(screen.getByRole("tab", { name: "Ubicación" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByLabelText("Capacidad para reservas")).toBeNull();
    fireEvent.change(input("Centro X"), { target: { value: "245.25" } });
    fireEvent.change(input("Rotación"), { target: { value: "270" } });
    apply();
    expect(onApply).toHaveBeenCalledWith([{ ...tables[0], x: 245.25, rotation: 270 }], "layout");
  });

  it("shows mixed bulk values and preserves untouched inventory fields and each label", () => {
    const tables = mixed(); const { onApply } = editor(tables, { initialTab: "inventory" });
    expect(screen.getByText("Se aplicará a 2 mesas")).toBeTruthy();
    expect(input("Forma").value).toBe("");
    expect(input("Ancho").placeholder).toBe("Valores diferentes");
    expect(input("Capacidad para reservas").placeholder).toBe("Valores diferentes");
    fireEvent.change(input("Ancho"), { target: { value: "96" } });
    apply();
    expect(onApply).toHaveBeenCalledWith([{ ...tables[0], width: 96, height: 96 }, { ...tables[1], width: 96 }], "inventory");
  });

  it("preserves different values after clearing a bulk field and supports individual names", () => {
    const tables = mixed(); const { onApply } = editor(tables, { initialTab: "inventory" });
    fireEvent.change(input("Capacidad para reservas"), { target: { value: "10" } });
    fireEvent.change(input("Capacidad para reservas"), { target: { value: "" } });
    fireEvent.change(input("Nombre de M2"), { target: { value: "Ventana" } });
    apply();
    expect(onApply).toHaveBeenCalledWith([tables[0], { ...tables[1], label: "Ventana" }], "inventory");
  });

  it("discards unapplied values on tab changes and never mixes inventory and position writes", () => {
    const tables = mixed(); const { onApply } = editor(tables);
    fireEvent.change(input("Desplazar X"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("tab", { name: "Inventario" }));
    fireEvent.change(input("Ancho"), { target: { value: "95" } });
    apply();
    expect(onApply).toHaveBeenLastCalledWith([{ ...tables[0], width: 95, height: 95 }, { ...tables[1], width: 95 }], "inventory");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Inventario" }), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Ubicación" }));
    expect(input("Desplazar X").value).toBe("");
    fireEvent.change(input("Desplazar Y"), { target: { value: "-20" } });
    apply();
    expect(onApply).toHaveBeenLastCalledWith(tables.map((item) => ({ ...item, y: item.y - 20 })), "layout");
  });

  it("applies a group rotation and translation without changing mixed inventory", () => {
    const tables = [table("M1"), table("M2", { x: 300, rotation: 90, capacity: 6 })]; const { onApply } = editor(tables);
    fireEvent.change(input("Desplazar X"), { target: { value: "10" } });
    fireEvent.change(input("Girar alrededor del centro"), { target: { value: "90" } });
    apply();
    expect(onApply).toHaveBeenCalledWith([{ ...tables[0], x: 210, y: 0, rotation: 90 }, { ...tables[1], x: 210, y: 200, rotation: 180 }], "layout");
  });

  it("explains disabled position editing and permits a separate inventory apply", () => {
    const tables = [table("M1")]; const { onApply } = editor(tables, { positionsEditable: false });
    expect(screen.queryByLabelText("Centro X")).toBeNull();
    expect(screen.getByText(/Esta selección conserva su posición y giro/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Aplicar cambios" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("tab", { name: "Inventario" }));
    fireEvent.change(input("Número o nombre"), { target: { value: "Barra" } }); apply();
    expect(onApply).toHaveBeenCalledWith([{ ...tables[0], label: "Barra" }], "inventory");
  });

  it("keeps saving, cancellation and switching disabled while busy", () => {
    const { container, onApply, onCancel } = editor(mixed(), { busy: true, error: "No se pudo guardar." });
    expect(screen.getByRole("alert").textContent).toBe("No se pudo guardar.");
    fireEvent.submit(container.querySelector("form")!);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("tab", { name: "Inventario" }));
    expect(onApply).not.toHaveBeenCalled(); expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "Ubicación" }).getAttribute("aria-selected")).toBe("true");
  });

  it("reports validation errors without submitting any table", () => {
    const { container, onApply } = editor(mixed(), { initialTab: "inventory" });
    fireEvent.change(input("Capacidad para reservas"), { target: { value: "2.5" } });
    fireEvent.submit(container.querySelector("form")!);
    expect(screen.getByRole("alert").textContent).toContain("entero entre 1 y 500");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("starts fresh if a different selection reuses the editor", () => {
    const onApply = vi.fn(); const { rerender } = editor([table("M1")], { onApply });
    fireEvent.change(input("Centro X"), { target: { value: "900" } });
    const second = table("M2", { x: 200 });
    rerender(createElement(FloorSelectionEditor, { tables: [second], busy: false, onApply, onCancel: vi.fn() }));
    expect(input("Centro X").value).toBe("200"); apply();
    expect(onApply).toHaveBeenCalledWith([second], "layout");
  });
});
