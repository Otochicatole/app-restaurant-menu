/** @vitest-environment jsdom */
import { createElement, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FloorPose } from "../contracts";
import { FloorAssemblyGrouping } from "./FloorAssemblyGrouping";

const actions = { join: vi.fn(), separate: vi.fn(), move: vi.fn(), rotate: vi.fn(), menu: vi.fn() };
const tables: FloorPose[] = [100, 180, 400].map((x, index) => ({ tableId: `table-${index}`, label: `M${index + 1}`, shape: "SQUARE", capacity: 4, width: 80, height: 80, x, y: 200, rotation: 0 }));

function Harness({ disabled = false, initial = [] }: { disabled?: boolean; initial?: string[] }) {
  const [selected, setSelected] = useState(initial);
  return createElement(FloorAssemblyGrouping, { tables, selectedTableIds: selected, disabled,
    onSelectTable: (id, additive) => setSelected((previous) => additive ? previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id] : [id]),
    onSelectTableGroup: setSelected, onTableActions: actions.menu,
    onJoinTables: () => actions.join(selected), onSeparateTables: () => actions.separate(selected),
    onMoveTableGroup: () => actions.move(selected), onRotateTableGroup: () => actions.rotate(selected) });
}

describe("visual table groups and selection", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it("selects a touching group and adds another table through touch-friendly toggles", () => {
    render(createElement(Harness));
    expect(screen.getByText("Unidas: M1 + M2")).toBeTruthy();
    expect(screen.getByText("Mesa M3")).toBeTruthy();
    const join = screen.getByRole("button", { name: "Unir seleccionadas" }) as HTMLButtonElement;
    expect(join.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar grupo M1 + M2" }));
    expect(screen.getByRole("button", { name: "Seleccionar mesa M1" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Seleccionar mesa M2" }).getAttribute("aria-pressed")).toBe("true");
    expect(join.disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar mesa M3" }));
    expect(screen.getByText("3 mesas seleccionadas")).toBeTruthy();
    fireEvent.click(join);
    expect(actions.join).toHaveBeenCalledWith(["table-0", "table-1", "table-2"]);
    fireEvent.click(screen.getByRole("button", { name: "Mover grupo" }));
    fireEvent.click(screen.getByRole("button", { name: "Girar grupo 90°" }));
    expect(actions.move).toHaveBeenCalledWith(["table-0", "table-1", "table-2"]);
    expect(actions.rotate).toHaveBeenCalledWith(["table-0", "table-1", "table-2"]);
  });

  it("enables separation only when the selected scope contains a joined table", () => {
    render(createElement(Harness));
    const separate = screen.getByRole("button", { name: "Separar seleccionadas" }) as HTMLButtonElement;
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar mesa M3" }));
    expect(separate.disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Mover grupo" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar mesa M1" }));
    expect(separate.disabled).toBe(false);
    fireEvent.click(separate);
    expect(actions.separate).toHaveBeenCalledWith(["table-2", "table-0"]);
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar mesa M1" }));
    expect(separate.disabled).toBe(true);
    expect(screen.getByText("1 mesa seleccionada")).toBeTruthy();
  });

  it("keeps selection and spatial actions inert during a pending save", () => {
    render(createElement(Harness, { disabled: true, initial: ["table-0", "table-1"] }));
    for (const button of screen.getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true); fireEvent.click(button);
    }
    expect(screen.getByText("2 mesas seleccionadas")).toBeTruthy();
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled();
  });
});
