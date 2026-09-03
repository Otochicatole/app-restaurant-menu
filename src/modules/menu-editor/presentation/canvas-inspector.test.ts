/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanvasInspector } from "./CanvasInspector";
import { createTemplateDocument } from "../domain/template";

const document = createTemplateDocument("Carta de prueba");
const rectangle = document.nodes.find((node) => node.type === "shape")!;
const textNode = document.nodes.find((node) => node.type === "text")!;

function inspectorProps(overrides: Partial<React.ComponentProps<typeof CanvasInspector>> = {}): React.ComponentProps<typeof CanvasInspector> {
  return {
    node: rectangle, selectedCount: 1, document, assets: [], onCanvasSizeChange: vi.fn(),
    onOpenModalMedia: vi.fn(), onOpenBackgroundImage: vi.fn(), onChange: vi.fn(),
    onChangeSelected: vi.fn(), onDuplicate: vi.fn(), onMoveLayer: vi.fn(), onDelete: vi.fn(),
    onRename: vi.fn(), onOpacityChange: vi.fn(), ...overrides,
  };
}

afterEach(cleanup);

describe("CanvasInspector", () => {
  it("puts appearance before geometry and interaction, without exposing internal metadata", () => {
    render(React.createElement(CanvasInspector, inspectorProps()));
    const headings = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Relleno y fondoColor base · imagen · degradado", "Borde3 px",
      "EsquinasRadio común o una medida por esquina", "Posición y tamaño720 × 300 px",
      "Al hacer clicSin acción configurada", "Orden y opacidad100% de opacidad",
    ]);
    expect(screen.queryByText("Normalizada")).toBeNull();
    expect(screen.queryByText(rectangle.id.slice(0, 8))).toBeNull();
    expect(screen.getByRole("button", { name: "Duplicar" })).not.toBeNull();
    expect(screen.getByRole("button", { name: /^Posición y tamaño/ }).getAttribute("aria-expanded")).toBe("false");
  });

  it("opens sections with the keyboard and preserves immediate common-radius editing", async () => {
    const user = userEvent.setup();
    const props = inspectorProps();
    render(React.createElement(CanvasInspector, props));
    const corners = screen.getByRole("button", { name: /^Esquinas/ });
    corners.focus();
    await user.keyboard("{Enter}");
    expect(corners.getAttribute("aria-expanded")).toBe("true");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Valor común (px)" }), { target: { value: "32" } });
    expect(props.onChange).toHaveBeenLastCalledWith({ cornerRadii: { topLeft: 32, topRight: 32, bottomLeft: 32, bottomRight: 32 } });
    fireEvent.change(screen.getByRole("slider", { name: "Barra de valor común" }), { target: { value: "50" } });
    expect(props.onChange).toHaveBeenLastCalledWith({ cornerRadii: { topLeft: 75, topRight: 75, bottomLeft: 75, bottomRight: 75 } });
    expect(screen.getAllByRole("spinbutton").filter((input) => /Arriba|Abajo/.test(input.getAttribute("aria-label") ?? "")).map((input) => input.getAttribute("aria-label"))).toEqual(["Arriba izquierda", "Arriba derecha", "Abajo izquierda", "Abajo derecha"]);
  });

  it("groups the link and multimedia under one action section", async () => {
    const props = inspectorProps({ node: textNode });
    render(React.createElement(CanvasInspector, props));
    expect(screen.getAllByRole("heading", { level: 3 })[0].textContent).toBe("Texto y tipografía");
    await userEvent.click(screen.getByRole("button", { name: /^Al hacer clic/ }));
    const interaction = screen.getByRole("region", { name: /^Al hacer clic/ });
    fireEvent.change(within(interaction).getByRole("textbox", { name: "Enlace" }), { target: { value: "https://example.com" } });
    expect(props.onChange).toHaveBeenCalledWith({ link: "https://example.com" });
    await userEvent.click(within(interaction).getByRole("button", { name: "Elegir multimedia" }));
    expect(props.onOpenModalMedia).toHaveBeenCalledOnce();
    expect(within(interaction).getByText("Se abre en una pestaña nueva.")).not.toBeNull();
  });

  it("accepts pasted hexadecimal colors for fills, borders and text", () => {
    const shapeProps = inspectorProps();
    const shapeView = render(React.createElement(CanvasInspector, shapeProps));
    fireEvent.change(screen.getByRole("textbox", { name: "Código HEX de color de relleno" }), { target: { value: "#0459c8" } });
    expect(shapeProps.onChange).toHaveBeenCalledWith({ fill: "#0459c8" });
    fireEvent.change(screen.getByRole("textbox", { name: "Código HEX de color del borde" }), { target: { value: "#123abc" } });
    expect(shapeProps.onChange).toHaveBeenCalledWith({ stroke: "#123abc" });

    shapeView.unmount();
    const textProps = inspectorProps({ node: textNode });
    render(React.createElement(CanvasInspector, textProps));
    fireEvent.change(screen.getByRole("textbox", { name: "Código HEX de color del texto" }), { target: { value: "#0459c8" } });
    expect(textProps.onChange).toHaveBeenCalledWith({ fill: "#0459c8" });
  });

  it("keeps unlock accessible and prevents edits to a locked object", async () => {
    const props = inspectorProps({ node: { ...rectangle, locked: true } });
    render(React.createElement(CanvasInspector, props));
    expect((screen.getByRole("textbox", { name: "Nombre de la capa" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Eliminar" }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: /^Posición y tamaño/ }));
    expect((screen.getByRole("spinbutton", { name: "Ancho" }) as HTMLInputElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Desbloquear objeto" }));
    expect(props.onChange).toHaveBeenCalledWith({ locked: false });
  });

  it("retains canvas presets when no object is selected", async () => {
    const props = inspectorProps({ node: null, selectedCount: 0 });
    render(React.createElement(CanvasInspector, props));
    await userEvent.click(screen.getByRole("button", { name: "Vertical" }));
    expect(props.onCanvasSizeChange).toHaveBeenNthCalledWith(1, "width", 1080);
    expect(props.onCanvasSizeChange).toHaveBeenNthCalledWith(2, "height", 1920);
  });

  it("keeps bulk editing separate from single-object controls", () => {
    const props = inspectorProps({ selectedCount: 2 });
    render(React.createElement(CanvasInspector, props));
    expect(screen.getByRole("heading", { name: "2 objetos" })).not.toBeNull();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Ancho" }), { target: { value: "400" } });
    expect(props.onChangeSelected).toHaveBeenCalledWith({ width: 400 });
    expect(screen.queryByRole("button", { name: /^Relleno y fondo/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Eliminar selección" })).not.toBeNull();
  });
});
