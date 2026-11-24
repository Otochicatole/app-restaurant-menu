/** @vitest-environment jsdom */
import { StrictMode, createElement, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const canvas = vi.hoisted(() => {
  const point = { x: 0, y: 0 };
  const surface = { element: undefined as HTMLDivElement | undefined };
  const groups = new Map<string, Record<string, unknown>>();
  return {
    point,
    pointer: { x: 0, y: 0 },
    layer: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    stageEvents: {} as Record<string, unknown>,
    groups,
    rects: new Map<string, Record<string, unknown>>(),
    texts: new Map<string, Record<string, unknown>>(),
    groupOrder: [] as string[],
    surface,
    dragEnd: undefined as ((event: { target: unknown }) => void) | undefined,
    node: {
      x: () => point.x, y: () => point.y,
      position: (next: { x: number; y: number }) => { Object.assign(point, next); },
      stopDrag: () => {},
      container: () => surface.element,
      findOne: (selector: string) => {
        const group = groups.get(selector.slice(1));
        return group ? { position: (position: { x: number; y: number }) => Object.assign(group, position) } : undefined;
      },
    },
  };
});

vi.mock("react-konva", async () => {
  const { createElement, forwardRef, useImperativeHandle } = await import("react");
  type Props = { children?: import("react").ReactNode; id?: string; x?: number; y?: number; rotation?: number; scaleX?: number; scaleY?: number; onDragEnd?: (event: { target: unknown }) => void };
  const Node = ({ children }: Props) => createElement("div", null, children);
  const Group = (props: Props) => {
    canvas.groups.set(props.id ?? `${props.x},${props.y}`, { ...props });
    canvas.groupOrder.push(props.id ?? `${props.x},${props.y}`);
    return createElement("div", { "data-testid": props.id, "data-konva-group": "", "data-x": props.x, "data-y": props.y, "data-rotation": props.rotation }, props.children);
  };
  const Stage = forwardRef<unknown, Props>((props, ref) => {
    useImperativeHandle(ref, () => canvas.node);
    canvas.dragEnd = props.onDragEnd;
    canvas.stageEvents = { ...props };
    return createElement("div", null, props.children);
  });
  const Layer = forwardRef<unknown, Props>(({ children, x = 0, y = 0, scaleX = 1, scaleY = 1 }, ref) => {
    Object.assign(canvas.layer, { x, y, scaleX, scaleY });
    useImperativeHandle(ref, () => ({ getRelativePointerPosition: () => ({
      x: (canvas.pointer.x - canvas.point.x - canvas.layer.x) / canvas.layer.scaleX,
      y: (canvas.pointer.y - canvas.point.y - canvas.layer.y) / canvas.layer.scaleY,
    }) }));
    return createElement("div", null, createElement("output", { "data-testid": "viewport-offset" }, JSON.stringify({ x, y })), children);
  });
  const Rect = (props: Props) => { if (props.id) canvas.rects.set(props.id, { ...props }); return createElement("div"); };
  const Text = (props: Props) => { if (props.id) canvas.texts.set(props.id, { ...props }); return createElement("div"); };
  const Line = ({ children }: Props) => createElement("div", { "data-konva-line": "" }, children);
  return { Stage, Layer, Group, Circle: Node, Line, Rect, Text };
});

import FloorCanvasStage from "./FloorCanvasStage";

const room = { id: "room", name: "Ventana", width: 800, height: 600, fixtures: [] };
const offset = (): { x: number; y: number } => JSON.parse(screen.getByTestId("viewport-offset").textContent!);
function stageEvent(name: string, event: unknown = {}) { (canvas.stageEvents[name] as (event: unknown) => void)(event); }
function pointAt(x: number, y: number) {
  Object.assign(canvas.pointer, { x: canvas.layer.x + canvas.point.x + x * canvas.layer.scaleX, y: canvas.layer.y + canvas.point.y + y * canvas.layer.scaleY });
}
function resizeGesture(anchor: string, edge = false) {
  const id = `floor-sector-window-${edge ? "edge" : "handle"}-${anchor}`;
  const node = { position: vi.fn(), stopDrag: vi.fn() };
  return { node, call(name: string, evt: Record<string, unknown> = {}) {
    const handler = canvas.rects.get(id)![name] as (event: unknown) => void;
    act(() => handler({ target: node, cancelBubble: false, evt: { type: "mousemove", button: 0, ...evt } }));
  } };
}
const resizable = { id: "window", name: "Ventana", x: 400, y: 300, width: 200, height: 100, rotation: 0 as const, active: true };

describe("floor viewport dragging", () => {
  beforeEach(() => {
    Object.assign(canvas.point, { x: 0, y: 0 });
    canvas.groups.clear();
    canvas.rects.clear(); canvas.texts.clear(); canvas.groupOrder.length = 0; canvas.surface.element = document.createElement("div");
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it.each([
    { name: "desktop wide room", viewport: { width: 800, height: 500 }, dimensions: { width: 1600, height: 600 }, allowed: { left: 72, top: 128, right: 776, bottom: 404 }, expectedLeft: 72 },
    { name: "mobile tall room", viewport: { width: 256, height: 640 }, dimensions: { width: 300, height: 1000 }, allowed: { left: 57.6, top: 128, right: 236.8, bottom: 488 }, expectedTop: 128 },
    { name: "mobile wide room", viewport: { width: 256, height: 640 }, dimensions: { width: 1000, height: 400 }, allowed: { left: 57.6, top: 128, right: 236.8, bottom: 488 }, expectedLeft: 57.6 },
  ])("fits the entire $name inside the editor frame beside the shared sidebar", ({ viewport, dimensions, allowed, expectedLeft, expectedTop }) => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(viewport.width);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(viewport.height);
    vi.stubGlobal("ResizeObserver", class {
      constructor(private notify: () => void) {}
      observe() { this.notify(); }
      disconnect() {}
    });
    render(createElement(FloorCanvasStage, { room: { ...room, ...dimensions }, tables: [], zoom: 1, fullScreen: true, editorMode: true, onZoomChange: vi.fn() }));
    expect(canvas.stageEvents.width).toBe(viewport.width);
    expect(canvas.stageEvents.height).toBe(viewport.height);
    const fitted = { left: canvas.layer.x, top: canvas.layer.y,
      right: canvas.layer.x + dimensions.width * canvas.layer.scaleX,
      bottom: canvas.layer.y + dimensions.height * canvas.layer.scaleY };
    expect(canvas.layer.scaleX).toBeGreaterThan(0);
    expect(canvas.layer.scaleX).toBe(canvas.layer.scaleY);
    expect(fitted.left).toBeGreaterThanOrEqual(allowed.left - 0.001);
    expect(fitted.top).toBeGreaterThanOrEqual(allowed.top - 0.001);
    expect(fitted.right).toBeLessThanOrEqual(allowed.right + 0.001);
    expect(fitted.bottom).toBeLessThanOrEqual(allowed.bottom + 0.001);
    if (expectedLeft !== undefined) expect(fitted.left).toBeCloseTo(expectedLeft);
    if (expectedTop !== undefined) expect(fitted.top).toBeCloseTo(expectedTop);
  });

  it("keeps successive zoomed pans after React batches the gestures and board data refreshes", () => {
    const props = { room, tables: [], zoom: 2, onZoomChange: vi.fn() };
    const view = render(createElement(StrictMode, null, createElement(FloorCanvasStage, props)));
    const before = offset();
    act(() => {
      canvas.node.position({ x: 100, y: 50 });
      canvas.dragEnd!({ target: canvas.node });
      canvas.node.position({ x: -40, y: 20 });
      canvas.dragEnd!({ target: canvas.node });
    });
    expect(offset().x).toBeCloseTo(before.x + 60);
    expect(offset().y).toBeCloseTo(before.y + 70);
    expect(canvas.point).toEqual({ x: 0, y: 0 });

    view.rerender(createElement(StrictMode, null, createElement(FloorCanvasStage, { ...props, room: { ...room }, tables: [] })));
    expect(offset().x).toBeCloseTo(before.x + 60);
    expect(offset().y).toBeCloseTo(before.y + 70);
  });

  it("does not pan the viewport when a table or room element finishes moving", () => {
    render(createElement(FloorCanvasStage, { room, tables: [], zoom: 2, onZoomChange: vi.fn() }));
    const before = offset();
    const child = { x: () => 200, y: () => 150, position: vi.fn() };
    act(() => { canvas.dragEnd!({ target: child }); });
    expect(offset()).toEqual(before);
    expect(child.position).not.toHaveBeenCalled();
  });

  it("places at room coordinates after zoom, viewport panning and a live stage translation", () => {
    const onPlace = vi.fn();
    render(createElement(FloorCanvasStage, { room, tables: [], zoom: 2, onZoomChange: vi.fn(), onPlace }));
    act(() => { canvas.node.position({x: 60, y: -40}); canvas.dragEnd!({target: canvas.node}); });
    canvas.node.position({x: 20, y: 10});
    pointAt(320.5, 240.25);
    act(() => { stageEvent("onMouseDown"); stageEvent("onClick", {target: canvas.node}); });
    expect(onPlace).toHaveBeenCalledTimes(1);
    expect(onPlace.mock.calls[0][0].x).toBeCloseTo(320.5);
    expect(onPlace.mock.calls[0][0].y).toBeCloseTo(240.25);
    expect(onPlace.mock.calls[0][1]).toBeUndefined();
  });

  it("passes the tapped sector and the exact room point without placing a second time through bubbling", () => {
    const onPlace = vi.fn();
    const location = {id: "window", name: "Ventana", x: 400, y: 300, width: 600, height: 400, rotation: 90 as const, active: true};
    render(createElement(FloorCanvasStage, {room: {...room, locations: [location]}, tables: [], zoom: 2, fullScreen: true, onZoomChange: vi.fn(), onPlace}));
    pointAt(320, 240);
    const target = {};
    const event = {target, cancelBubble: false};
    act(() => {
      (canvas.groups.get("400,300")!.onTap as (event: unknown) => void)(event);
      stageEvent("onTap", {target});
    });
    expect(event.cancelBubble).toBe(true);
    expect(onPlace).toHaveBeenCalledTimes(1);
    expect(onPlace.mock.calls[0][0].x).toBeCloseTo(320);
    expect(onPlace.mock.calls[0][0].y).toBeCloseTo(240);
    expect(onPlace.mock.calls[0][1]).toBe("window");
  });

  it("opens a sector context menu at client coordinates without selecting or placing after zoom and pan", () => {
    const onContextMenuLocation = vi.fn(); const onSelectLocation = vi.fn(); const onMoveLocation = vi.fn(); const onPlace = vi.fn();
    const location = {id: "window", name: "Ventana", x: 400, y: 300, width: 600, height: 400, rotation: 90 as const, active: true};
    render(createElement(FloorCanvasStage, {room: {...room, locations: [location]}, tables: [], zoom: 2, fullScreen: true, onZoomChange: vi.fn(), onContextMenuLocation, onSelectLocation, onMoveLocation, onPlace}));
    act(() => { canvas.node.position({x: 60, y: -40}); canvas.dragEnd!({target: canvas.node}); });
    canvas.node.position({x: 20, y: 10});
    pointAt(320, 240);
    const native = new MouseEvent("contextmenu", {button: 2, clientX: 630, clientY: 270, cancelable: true});
    const event = {evt: native, target: {}, cancelBubble: false};
    act(() => {
      (canvas.groups.get("400,300")!.onContextMenu as (event: unknown) => void)(event);
      // Konva also emits a click on right-button release; it must not place the group.
      (canvas.groups.get("400,300")!.onClick as (event: unknown) => void)({evt: new MouseEvent("click", {button: 2}), target: {}, cancelBubble: false});
    });
    expect(native.defaultPrevented).toBe(true);
    expect(event.cancelBubble).toBe(true);
    expect(onContextMenuLocation.mock.calls).toEqual([["window", {x: 630, y: 270}]]);
    expect(onSelectLocation).not.toHaveBeenCalled();
    expect(onMoveLocation).not.toHaveBeenCalled();
    expect(onPlace).not.toHaveBeenCalled();
  });

  it("keeps left-click selection and sector dragging separate from its context menu", () => {
    const onContextMenuLocation = vi.fn(); const onSelectLocation = vi.fn(); const onMoveLocation = vi.fn();
    const location = {id: "window", name: "Ventana", x: 400, y: 300, width: 600, height: 400, rotation: 0 as const, active: true};
    render(createElement(FloorCanvasStage, {room: {...room, locations: [location]}, tables: [], zoom: 1, onZoomChange: vi.fn(), onContextMenuLocation, onSelectLocation, onMoveLocation}));
    const node = {x: () => 460, y: () => 310};
    act(() => {
      (canvas.groups.get("400,300")!.onClick as (event: unknown) => void)({evt: new MouseEvent("click", {button: 0}), target: {}, cancelBubble: false});
      (canvas.groups.get("400,300")!.onDragStart as (event: unknown) => void)({target: node, cancelBubble: false});
      (canvas.groups.get("400,300")!.onDragEnd as (event: unknown) => void)({target: node, cancelBubble: false});
    });
    expect(onSelectLocation.mock.calls).toEqual([["window"], ["window"]]);
    expect(onMoveLocation.mock.calls).toEqual([["window", {x: 460, y: 310}]]);
    expect(onContextMenuLocation).not.toHaveBeenCalled();
  });

  it("leaves the native sector context menu alone when no callback is provided", () => {
    const onSelectLocation = vi.fn();
    const location = {id: "window", name: "Ventana", x: 400, y: 300, width: 600, height: 400, rotation: 0 as const, active: true};
    render(createElement(FloorCanvasStage, {room: {...room, locations: [location]}, tables: [], zoom: 1, onZoomChange: vi.fn(), onSelectLocation}));
    const native = new MouseEvent("contextmenu", {button: 2, cancelable: true});
    const event = {evt: native, target: {}, cancelBubble: false};
    const handler = canvas.groups.get("400,300")!.onContextMenu as ((event: unknown) => void) | undefined;
    act(() => { handler?.(event); });
    expect(handler).toBeUndefined();
    expect(native.defaultPrevented).toBe(false);
    expect(event.cancelBubble).toBe(false);
    expect(onSelectLocation).not.toHaveBeenCalled();
  });

  it("opens a table context menu at client coordinates without selecting or placing after zoom and pan", () => {
    const onContextMenuTable = vi.fn(); const onContextMenuLocation = vi.fn(); const onSelect = vi.fn(); const onPlace = vi.fn();
    const table = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    render(createElement(FloorCanvasStage, { room: { ...room, locations: [resizable] }, tables: [table], zoom: 2, fullScreen: true, onZoomChange: vi.fn(), onContextMenuTable, onContextMenuLocation, onSelect, onPlace }));
    act(() => { canvas.node.position({ x: 60, y: -40 }); canvas.dragEnd!({ target: canvas.node }); });
    const before = offset();
    const native = new MouseEvent("contextmenu", { button: 2, clientX: 630, clientY: 270, cancelable: true });
    const event = { evt: native, target: {}, cancelBubble: false };
    act(() => {
      (canvas.groups.get("floor-table-one")!.onMouseDown as (event: unknown) => void)({ evt: new MouseEvent("mousedown", { button: 2 }), target: {}, cancelBubble: false });
      (canvas.groups.get("floor-table-one")!.onContextMenu as (event: unknown) => void)(event);
    });
    expect(native.defaultPrevented).toBe(true); expect(event.cancelBubble).toBe(true);
    expect(onContextMenuTable.mock.calls).toEqual([["one", { x: 630, y: 270 }]]);
    expect(onContextMenuLocation).not.toHaveBeenCalled(); expect(onSelect).not.toHaveBeenCalled(); expect(onPlace).not.toHaveBeenCalled();
    expect(offset()).toEqual(before);
  });

  it("keeps the native table context menu without a handler and selects tables only with the primary button or touch", () => {
    const onSelect = vi.fn();
    const table = { id: "one", label: "M1", shape: "CIRCLE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    render(createElement(FloorCanvasStage, { room, tables: [table], zoom: 1, onZoomChange: vi.fn(), onSelect }));
    const group = canvas.groups.get("floor-table-one")!;
    expect(group.onContextMenu).toBeUndefined();
    act(() => {
      for (const button of [1, 2]) (group.onMouseDown as (event: unknown) => void)({ evt: new MouseEvent("mousedown", { button }), target: {}, cancelBubble: false });
    });
    expect(onSelect).not.toHaveBeenCalled();
    act(() => {
      (group.onMouseDown as (event: unknown) => void)({ evt: new MouseEvent("mousedown", { button: 0, shiftKey: true }), target: {}, cancelBubble: false });
      (group.onTap as (event: unknown) => void)({ target: {}, cancelBubble: false });
    });
    expect(onSelect.mock.calls).toEqual([["one", true], ["one", false]]);
  });

  it("moves an individually selected table without including neighboring tables in its drag", () => {
    const onMove = vi.fn(); const onSelect = vi.fn();
    const table = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const second = { ...table, id: "two", label: "M2", x: 280 };
    render(createElement(FloorCanvasStage, { room, tables: [table, second], zoom: 2, onZoomChange: vi.fn(), selectedIds: ["one"], draggableIds: ["one"], onMove, onSelect }));
    expect(canvas.groups.get("floor-table-one")!.draggable).toBe(true);
    expect(canvas.groups.get("floor-table-two")!.draggable).toBe(false);
    const position = { x: 200, y: 200 };
    const node = { x: () => position.x, y: () => position.y };
    act(() => { (canvas.groups.get("floor-table-one")!.onDragStart as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    Object.assign(position, { x: 230.5, y: 245.25 });
    act(() => {
      (canvas.groups.get("floor-table-one")!.onDragMove as (event: unknown) => void)({ target: node, cancelBubble: false });
      (canvas.groups.get("floor-table-one")!.onDragEnd as (event: unknown) => void)({ target: node, cancelBubble: false });
    });
    expect(onMove.mock.calls).toEqual([[["one"], { x: 30.5, y: 45.25 }]]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(canvas.groups.get("floor-table-two")!.x).toBe(280);
  });

  it("keeps the joined outline and its label attached throughout a zoomed drag and the parent's commit", () => {
    const moved = vi.fn(); const onPlace = vi.fn(); const onContextMenuTable = vi.fn();
    const first = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true, state: "selected" as const };
    const second = { ...first, id: "two", label: "M2", shape: "RECTANGLE" as const, x: 300, height: 120, rotation: 90 };
    function Editor({ refresh = 0 }: { refresh?: number }) {
      const [tables, setTables] = useState([first, second]);
      return createElement(FloorCanvasStage, { room: { ...room, name: `Ventana ${refresh}` }, tables, zoom: 2, onZoomChange: vi.fn(), selectedIds: ["one", "two"], joinedGroups: [{ id: "joined", tableIds: ["one", "two"], label: "M1 + M2" }], onPlace, onContextMenuTable,
        onMove: (ids, delta) => { moved(ids, delta); setTables((current) => current.map((table) => ids.includes(table.id) ? { ...table, x: table.x + delta.x, y: table.y + delta.y } : table)); },
      });
    }
    const view = render(createElement(Editor));
    act(() => { canvas.node.position({ x: 60, y: -40 }); canvas.dragEnd!({ target: canvas.node }); });
    const before = offset();
    const outline = canvas.rects.get("floor-joined-outline-joined")!;
    expect(outline.width).toBe(212); expect(outline.height).toBe(92); expect(outline.stroke).toBe("#255f46");
    expect(outline.listening).toBe(false);
    expect(canvas.texts.get("floor-joined-label-joined")!.text).toBe("Unidas · M1 + M2");
    expect(canvas.texts.get("floor-joined-label-joined")!.listening).toBe(false);
    const group = canvas.groups.get("floor-joined-group-joined")!;
    expect(group.x).toBe(154); expect(group.y).toBe(154); expect(group.listening).toBe(false);
    expect(group.onClick).toBeUndefined(); expect(group.onContextMenu).toBeUndefined();
    expect(canvas.groupOrder.indexOf("floor-joined-group-joined")).toBeLessThan(canvas.groupOrder.indexOf("floor-table-one"));
    const position = { x: 200, y: 200 }; const node = { x: () => position.x, y: () => position.y };
    act(() => { (canvas.groups.get("floor-table-one")!.onDragStart as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    Object.assign(position, { x: 230.5, y: 245.25 });
    act(() => { (canvas.groups.get("floor-table-one")!.onDragMove as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    expect(canvas.groups.get("floor-joined-group-joined")!.x).toBe(184.5);
    expect(canvas.groups.get("floor-joined-group-joined")!.y).toBe(199.25);
    expect(canvas.groups.get("floor-table-one")!.x).toBe(230.5);
    expect(canvas.groups.get("floor-table-two")!.x).toBe(330.5);
    expect(moved).not.toHaveBeenCalled();
    act(() => { (canvas.groups.get("floor-table-one")!.onDragEnd as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    expect(moved.mock.calls).toEqual([[["one", "two"], { x: 30.5, y: 45.25 }]]);
    view.rerender(createElement(Editor, { refresh: 1 }));
    expect(canvas.groups.get("floor-joined-group-joined")!.x).toBe(184.5);
    expect(canvas.groups.get("floor-joined-group-joined")!.y).toBe(199.25);
    expect(offset()).toEqual(before);
    const native = new MouseEvent("contextmenu", { button: 2, clientX: 500, clientY: 250, cancelable: true });
    act(() => { (canvas.groups.get("floor-table-one")!.onContextMenu as (event: unknown) => void)({ evt: native, target: node, cancelBubble: false }); });
    expect(onContextMenuTable.mock.calls).toEqual([["one", { x: 500, y: 250 }]]);
    pointAt(400, 300);
    act(() => { stageEvent("onClick", { target: canvas.node }); });
    expect(onPlace).toHaveBeenCalledOnce();
    expect(onPlace.mock.calls[0][0].x).toBeCloseTo(400);
    expect(onPlace.mock.calls[0][0].y).toBeCloseTo(300);
    expect(onPlace.mock.calls[0][1]).toBeUndefined();
  });

  it("outlines only explicit groups with at least two rendered tables, rather than inferring joins from table colors", () => {
    const first = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true, state: "reserved" as const };
    const second = { ...first, id: "two", label: "M2", x: 280 };
    const third = { ...first, id: "three", label: "M3", x: 360 };
    render(createElement(FloorCanvasStage, { room, tables: [first, second, third], zoom: 1, onZoomChange: vi.fn(), joinedGroups: [{ id: "actual", tableIds: ["one", "two"], label: "M1 + M2" }, { id: "single", tableIds: ["three", "missing"], label: "M3" }] }));
    expect(canvas.rects.get("floor-joined-outline-actual")!.stroke).toBe("#95664c");
    expect(canvas.groups.has("floor-joined-group-single")).toBe(false);
    expect(canvas.rects.get("floor-joined-outline-actual")!.width).toBe(172);
  });

  it("removes a dragged-away table from its live joined outline before the drop", () => {
    const first = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const second = { ...first, id: "two", label: "M2", x: 280 };
    const third = { ...first, id: "three", label: "M3", x: 360 };
    const onMove = vi.fn();
    render(createElement(FloorCanvasStage, { room, tables: [first, second, third], zoom: 2, onZoomChange: vi.fn(), selectedIds: ["one"], draggableIds: ["one"], onMove, joinedGroups: [{ id: "joined", tableIds: ["one", "two", "three"], label: "M1 + M2 + M3" }] }));
    expect(screen.getByTestId("floor-joined-group-joined")).toBeTruthy();
    const position = { x: 200, y: 200 }; const node = { x: () => position.x, y: () => position.y };
    act(() => { (canvas.groups.get("floor-table-one")!.onDragStart as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    Object.assign(position, { x: 100, y: 150 });
    act(() => { (canvas.groups.get("floor-table-one")!.onDragMove as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    expect(screen.queryByTestId("floor-joined-group-joined")).toBeNull();
    const remainingId = "joined:three+two";
    expect(screen.getByTestId(`floor-joined-group-${remainingId}`)).toBeTruthy();
    expect(canvas.groups.get(`floor-joined-group-${remainingId}`)!.x).toBe(234);
    expect(canvas.rects.get(`floor-joined-outline-${remainingId}`)!.width).toBe(172);
    expect(canvas.texts.get(`floor-joined-label-${remainingId}`)!.text).toBe("Unidas · M2 + M3");
    expect(onMove).not.toHaveBeenCalled();
  });

  it.each(["WALL", "BAR", "LABEL"] as const)("prioritizes placement over selecting a %s for both mouse clicks and touch taps", (type) => {
    const onPlace = vi.fn(); const onSelectFixture = vi.fn();
    const fixture = {id: "fixture", type, label: "Referencia", x: 500, y: 400, width: 120, height: 60, rotation: 90 as const};
    render(createElement(FloorCanvasStage, {room: {...room, fixtures: [fixture]}, tables: [], zoom: 2, onZoomChange: vi.fn(), onPlace, onSelectFixture}));
    act(() => { canvas.node.position({x: 60, y: -40}); canvas.dragEnd!({target: canvas.node}); });
    for (const [handler, x, y] of [["onClick", 512.5, 410.25], ["onTap", 480.75, 390.5]] as const) {
      pointAt(x, y);
      const target = {}; const event = {target, cancelBubble: false};
      act(() => {
        (canvas.groups.get("500,400")![handler] as (event: unknown) => void)(event);
        stageEvent(handler, {target});
      });
      expect(event.cancelBubble).toBe(true);
      const placed = onPlace.mock.calls.at(-1)!;
      expect(placed[0].x).toBeCloseTo(x);
      expect(placed[0].y).toBeCloseTo(y);
      expect(placed[1]).toBeUndefined();
    }
    expect(onPlace).toHaveBeenCalledTimes(2);
    expect(onSelectFixture).not.toHaveBeenCalled();
  });

  it("continues selecting fixtures when placement is inactive", () => {
    const onSelectFixture = vi.fn();
    const fixture = {id: "label", type: "LABEL" as const, label: "Entrada", x: 500, y: 400, width: 120, height: 60, rotation: 0 as const};
    render(createElement(FloorCanvasStage, {room: {...room, fixtures: [fixture]}, tables: [], zoom: 1, onZoomChange: vi.fn(), onSelectFixture}));
    for (const handler of ["onClick", "onTap"]) {
      const event = {target: {}, cancelBubble: false};
      act(() => { (canvas.groups.get("500,400")![handler] as (event: unknown) => void)(event); });
      expect(event.cancelBubble).toBe(true);
    }
    expect(onSelectFixture.mock.calls).toEqual([["label"], ["label"]]);
  });

  it("ignores out-of-room points, pinch gestures and taps on existing tables", () => {
    const onPlace = vi.fn(); const onSelect = vi.fn(); const onSelectFixture = vi.fn();
    const fixture = {id: "bar", type: "BAR" as const, label: "Barra", x: 500, y: 400, width: 120, height: 60, rotation: 0 as const};
    const table = {id: "one", label: "1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0 as const, active: true};
    render(createElement(FloorCanvasStage, {room: {...room, fixtures: [fixture]}, tables: [table], zoom: 2, onZoomChange: vi.fn(), onPlace, onSelect, onSelectFixture}));
    pointAt(-1, 100);
    act(() => { stageEvent("onClick", {target: canvas.node}); });
    pointAt(100, 100);
    act(() => {
      stageEvent("onTouchStart", {evt: {touches: [{clientX: 10, clientY: 10}, {clientX: 50, clientY: 50}], preventDefault: vi.fn()}});
      stageEvent("onTouchEnd");
      stageEvent("onTap", {target: canvas.node});
      (canvas.groups.get("500,400")!.onTap as (event: unknown) => void)({target: {}, cancelBubble: false});
    });
    expect(onPlace).not.toHaveBeenCalled();
    expect(onSelectFixture).not.toHaveBeenCalled();
    act(() => {
      stageEvent("onMouseDown");
      stageEvent("onClick", {target: canvas.node});
    });
    expect(onPlace).toHaveBeenCalledTimes(1);
    const child = {}; const event = {target: child, cancelBubble: false};
    act(() => {
      (canvas.groups.get("floor-table-one")!.onTap as (event: unknown) => void)(event);
      stageEvent("onTap", {target: child});
    });
    expect(onSelect).toHaveBeenCalledWith("one", false);
    expect(onSelectFixture).not.toHaveBeenCalled();
    expect(event.cancelBubble).toBe(true);
    expect(onPlace).toHaveBeenCalledTimes(1);
  });

  it("shows eight constant-size resize markers and continuous edge strips only for the editable selected sector", () => {
    const props = { room: { ...room, locations: [resizable] }, tables: [], zoom: 2, onZoomChange: vi.fn(), selectedLocationId: "window", onResizeLocation: vi.fn() };
    const view = render(createElement(FloorCanvasStage, props));
    expect([...canvas.rects.keys()].filter((id) => id.includes("-handle-"))).toHaveLength(8);
    expect([...canvas.rects.keys()].filter((id) => id.includes("-edge-"))).toHaveLength(4);
    expect(canvas.groupOrder.at(-1)).toBe("floor-sector-resize-window");
    for (const [id, rect] of canvas.rects) if (id.includes("-handle-")) expect(Number(rect.width) * canvas.layer.scaleX).toBeCloseTo(10);
    resizeGesture("top-center").call("onMouseEnter"); expect(canvas.surface.element!.style.cursor).toBe("ns-resize");
    resizeGesture("middle-right").call("onMouseEnter"); expect(canvas.surface.element!.style.cursor).toBe("ew-resize");
    canvas.rects.clear(); view.rerender(createElement(FloorCanvasStage, { ...props, onResizeLocation: undefined }));
    expect(canvas.rects.size).toBe(0);
    view.rerender(createElement(FloorCanvasStage, { ...props, selectedLocationId: "another" }));
    expect(canvas.rects.size).toBe(0);
  });

  it.each(["window", "other"])("keeps resize handles with a rotated sector dragged while %s was selected, including after the parent commits", (initialSelection) => {
    const moved = vi.fn(); const resized = vi.fn(); const selected = vi.fn();
    function Editor({ refresh = 0 }: { refresh?: number }) {
      const [locations, setLocations] = useState([
        { ...resizable, rotation: 90 as const },
        { ...resizable, id: "other", name: "Entrada", x: 150, y: 120, width: 100, height: 80 },
      ]);
      const [selectedLocationId, setSelectedLocationId] = useState(initialSelection);
      return createElement(FloorCanvasStage, {
        room: { ...room, name: `Ventana ${refresh}`, locations: locations.map((location) => ({ ...location })) },
        tables: [], zoom: 2, onZoomChange: vi.fn(), selectedLocationId,
        onSelectLocation: (id) => { selected(id); setSelectedLocationId(id); },
        onMoveLocation: (id, point) => { moved(id, point); setLocations((current) => current.map((location) => location.id === id ? { ...location, ...point } : location)); },
        onResizeLocation: (id, geometry) => { resized(id, geometry); setLocations((current) => current.map((location) => location.id === id ? { ...location, ...geometry } : location)); },
      });
    }
    const view = render(createElement(Editor));
    act(() => { canvas.node.position({ x: 60, y: -40 }); canvas.dragEnd!({ target: canvas.node }); });
    const before = offset();
    const position = { x: 400, y: 300 };
    const node = { x: () => position.x, y: () => position.y, position: vi.fn((next: { x: number; y: number }) => Object.assign(position, next)) };
    const dragSector = (name: string) => {
      const handler = canvas.groups.get(`${position.x},${position.y}`)![name] as (event: unknown) => void;
      const event = { target: node, cancelBubble: false, evt: new MouseEvent("mousemove", { button: 0 }) };
      act(() => handler(event));
      expect(event.cancelBubble).toBe(true);
    };
    const expectTogether = (x: number, y: number) => {
      const body = view.container.querySelector(`[data-konva-group][data-x="${x}"][data-y="${y}"]:not([data-testid])`);
      expect(body).not.toBeNull();
      expect(body!.getAttribute("data-rotation")).toBe("90");
      const handles = screen.getByTestId("floor-sector-resize-window");
      expect(handles.getAttribute("data-x")).toBe(String(x));
      expect(handles.getAttribute("data-y")).toBe(String(y));
      expect(handles.getAttribute("data-rotation")).toBe("90");
      expect(offset()).toEqual(before);
    };

    dragSector("onDragStart");
    if (initialSelection === "other") expect(selected).toHaveBeenLastCalledWith("window");
    expectTogether(400, 300);
    expect(screen.queryByTestId("floor-sector-resize-other")).toBeNull();
    for (const next of [{ x: 430, y: 320 }, { x: 470, y: 350 }]) {
      const handler = canvas.groups.get(`${position.x},${position.y}`)!.onDragMove as (event: unknown) => void;
      Object.assign(position, next);
      const event = { target: node, cancelBubble: false };
      act(() => handler(event));
      expect(event.cancelBubble).toBe(true);
      expectTogether(next.x, next.y);
      expect(moved).not.toHaveBeenCalled();
      expect(resized).not.toHaveBeenCalled();
    }
    dragSector("onDragEnd");
    // A bubbled child drag must never turn into a viewport pan.
    act(() => canvas.dragEnd!({ target: node }));
    expect(moved.mock.calls).toEqual([["window", { x: 470, y: 350 }]]);
    expectTogether(470, 350);
    view.rerender(createElement(Editor, { refresh: 1 }));
    expectTogether(470, 350);

    // At 90 degrees the local right edge is the bottom world edge. Resizing
    // after the drop must start at the newly committed center, not its old one.
    const resize = resizeGesture("middle-right", true);
    pointAt(470, 450); resize.call("onMouseDown");
    pointAt(470, 490); resize.call("onDragStart"); resize.call("onDragMove");
    expectTogether(470, 370);
    expect(resized).not.toHaveBeenCalled();
    resize.call("onDragEnd", { type: "mouseup" });
    expect(resized.mock.calls).toEqual([["window", { x: 470, y: 370, width: 240, height: 100 }]]);
    expect(moved).toHaveBeenCalledTimes(1);
    expectTogether(470, 370);
  });

  it("previews a border resize after zoom and pan, counts the first movement, and commits once on release", () => {
    const onResizeLocation = vi.fn(); const onMoveLocation = vi.fn();
    render(createElement(FloorCanvasStage, { room: { ...room, locations: [resizable] }, tables: [], zoom: 2, onZoomChange: vi.fn(), selectedLocationId: "window", onResizeLocation, onMoveLocation }));
    act(() => { canvas.node.position({ x: 60, y: -40 }); canvas.dragEnd!({ target: canvas.node }); });
    const before = offset(); canvas.node.position({ x: 20, y: 10 });
    const gesture = resizeGesture("middle-right", true);
    pointAt(503, 320); gesture.call("onMouseDown");
    pointAt(603, 320); gesture.call("onDragStart"); gesture.call("onDragMove");
    expect(onResizeLocation).not.toHaveBeenCalled();
    expect(canvas.groups.get("450,300")?.draggable).toBe(false);
    gesture.call("onDragEnd", { type: "mouseup" });
    expect(onResizeLocation.mock.calls).toEqual([["window", { x: 450, y: 300, width: 300, height: 100 }]]);
    expect(onMoveLocation).not.toHaveBeenCalled(); expect(offset()).toEqual(before);
    expect(canvas.surface.element!.style.cursor).toBe("default");
  });

  it("changes corner width and height independently and ignores Shift ratio locking", () => {
    const onResizeLocation = vi.fn();
    render(createElement(FloorCanvasStage, { room: { ...room, locations: [resizable] }, tables: [], zoom: 1, onZoomChange: vi.fn(), selectedLocationId: "window", onResizeLocation }));
    const gesture = resizeGesture("bottom-right");
    pointAt(500, 350); gesture.call("onMouseDown");
    pointAt(550, 400); gesture.call("onDragStart", { shiftKey: true }); gesture.call("onDragEnd", { type: "mouseup", shiftKey: true });
    expect(onResizeLocation.mock.calls).toEqual([["window", { x: 425, y: 325, width: 250, height: 150 }]]);
  });

  it("uses rotated resize cursors, keeps the opposite edge fixed, and clamps at the room boundary", () => {
    const onResizeLocation = vi.fn();
    render(createElement(FloorCanvasStage, { room: { ...room, locations: [{ ...resizable, rotation: 90 }] }, tables: [], zoom: 2, onZoomChange: vi.fn(), selectedLocationId: "window", onResizeLocation }));
    const gesture = resizeGesture("middle-right", true);
    gesture.call("onMouseEnter"); expect(canvas.surface.element!.style.cursor).toBe("ns-resize");
    resizeGesture("top-left").call("onMouseEnter"); expect(canvas.surface.element!.style.cursor).toBe("nesw-resize");
    pointAt(400, 400); gesture.call("onMouseDown");
    pointAt(400, 1000); gesture.call("onDragStart"); gesture.call("onDragMove"); gesture.call("onDragEnd", { type: "mouseup" });
    expect(onResizeLocation.mock.calls).toEqual([["window", { x: 400, y: 400, width: 400, height: 100 }]]);
  });

  it("does not dirty a sector when a grab starts away from the marker center without movement", () => {
    const onResizeLocation = vi.fn();
    render(createElement(FloorCanvasStage, { room: { ...room, locations: [resizable] }, tables: [], zoom: 1, onZoomChange: vi.fn(), selectedLocationId: "window", onResizeLocation }));
    const gesture = resizeGesture("bottom-right");
    pointAt(503, 354); gesture.call("onMouseDown"); gesture.call("onDragStart"); gesture.call("onDragEnd", { type: "mouseup" });
    expect(onResizeLocation).not.toHaveBeenCalled();
  });

  it("cancels an in-progress resize when the second finger starts elsewhere on the stage", () => {
    const onResizeLocation = vi.fn();
    render(createElement(FloorCanvasStage, { room: { ...room, locations: [resizable] }, tables: [], zoom: 2, onZoomChange: vi.fn(), selectedLocationId: "window", onResizeLocation }));
    const gesture = resizeGesture("middle-right", true);
    pointAt(500, 300); gesture.call("onTouchStart", { touches: [{ clientX: 20, clientY: 20 }] });
    pointAt(600, 300); gesture.call("onDragStart"); gesture.call("onDragMove");
    act(() => stageEvent("onTouchStart", { evt: { touches: [{ clientX: 20, clientY: 20 }, { clientX: 80, clientY: 80 }], preventDefault: vi.fn() } }));
    expect(gesture.node.stopDrag).toHaveBeenCalledOnce(); gesture.call("onDragEnd", { type: "touchend" });
    expect(onResizeLocation).not.toHaveBeenCalled(); expect(canvas.surface.element!.style.cursor).toBe("default");
  });

  it("keeps the sector context menu available over the topmost resize overlay", () => {
    const onContextMenuLocation = vi.fn();
    render(createElement(FloorCanvasStage, { room: { ...room, locations: [resizable] }, tables: [], zoom: 1, onZoomChange: vi.fn(), selectedLocationId: "window", onResizeLocation: vi.fn(), onContextMenuLocation }));
    const native = new MouseEvent("contextmenu", { button: 2, clientX: 480, clientY: 310, cancelable: true });
    const event = { evt: native, cancelBubble: false };
    act(() => (canvas.groups.get("floor-sector-resize-window")!.onContextMenu as (event: unknown) => void)(event));
    expect(native.defaultPrevented).toBe(true); expect(event.cancelBubble).toBe(true);
    expect(onContextMenuLocation.mock.calls).toEqual([["window", { x: 480, y: 310 }]]);
  });
  it("opens group actions from the joined outline without routing them to an individual table", () => {
    const first = {id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true};
    const second = {...first, id: "two", label: "M2", x: 280};
    const groupAction = vi.fn(); const tableAction = vi.fn();
    render(createElement(FloorCanvasStage, {room, tables: [first, second], joinedGroups: [{id: "joined", tableIds: ["one", "two"], label: "M1 + M2"}], zoom: 1, onZoomChange: vi.fn(), onContextMenuGroup: groupAction, onContextMenuTable: tableAction}));
    const group = canvas.groups.get("floor-joined-group-joined")!;
    expect(group.listening).toBe(true); expect(canvas.rects.get("floor-joined-outline-joined")!.hitStrokeWidth).toBe(16);
    const native = new MouseEvent("contextmenu", {clientX: 320, clientY: 240, cancelable: true});
    const event = {evt: native, cancelBubble: false};
    act(() => { (group.onContextMenu as (event: unknown) => void)(event); });
    expect(native.defaultPrevented).toBe(true); expect(event.cancelBubble).toBe(true);
    expect(groupAction).toHaveBeenCalledWith(["one", "two"], {x: 320, y: 240}); expect(tableAction).not.toHaveBeenCalled();
  });

  it("routes service clicks to occupied tables and leaves selection and geometry untouched", () => {
    const first = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true, state: "reserved" as const };
    const onServiceTable = vi.fn();
    const onSelect = vi.fn();
    const onMove = vi.fn();
    render(createElement(FloorCanvasStage, {
      room, tables: [first, { ...first, id: "two", x: 280 }, { ...first, id: "free", x: 400, state: "available" }],
      joinedGroups: [{ id: "joined", tableIds: ["one", "two"], label: "M1 + M2" }],
      interactionMode: "service", zoom: 1, onZoomChange: vi.fn(), onServiceTable, onSelect, onMove,
    }));
    const click = (id: string) => act(() => {
      const event = { evt: new MouseEvent("click", { button: 0 }), cancelBubble: false };
      (canvas.groups.get(id)!.onClick as (event: unknown) => void)(event);
    });
    expect(canvas.stageEvents.draggable).toBe(false);
    expect(canvas.groups.get("floor-table-one")!.draggable).toBe(false);
    click("floor-table-two");
    click("floor-joined-group-joined");
    click("floor-table-free");
    expect(onServiceTable.mock.calls).toEqual([["two"], ["one"], ["free"]]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it.each([
    { press: "onMouseDown", click: "onClick", double: "onDblClick" },
    { press: "onTouchStart", click: "onTap", double: "onDblTap" },
  ])("selects a joined group with $click and isolates the hit table with $double", ({ press, click, double }) => {
    const first = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const second = { ...first, id: "two", label: "M2", x: 280 };
    const onMove = vi.fn();
    function Board() {
      const [selectedIds, setSelectedIds] = useState<string[]>([]);
      return createElement(FloorCanvasStage, {
        room, tables: [first, second], selectJoinedTables: true, selectedIds, zoom: 1, onZoomChange: vi.fn(), onMove,
        joinedGroups: [{ id: "joined", tableIds: ["one", "two"], label: "M1 + M2" }],
        onSelect: (id) => setSelectedIds([id]), onSelectMany: (ids) => setSelectedIds(ids),
      });
    }
    render(createElement(Board));
    const trigger = (name: string) => act(() => {
      const event = { evt: new MouseEvent("click", { button: 0 }), cancelBubble: false };
      (canvas.groups.get("floor-table-two")![name] as (event: unknown) => void)(event);
    });
    const outline = () => canvas.rects.get("floor-joined-outline-joined")!.stroke;
    const neutral = outline();
    trigger(press);
    trigger(click);
    expect(outline()).not.toBe(neutral);
    trigger(press);
    trigger(click);
    trigger(double);
    expect(outline()).toBe(neutral);

    const table = canvas.groups.get("floor-table-two")!;
    let x = second.x;
    const node = { x: () => x, y: () => second.y };
    trigger(press);
    act(() => { (table.onDragStart as (event: unknown) => void)({ target: node }); });
    x += 10;
    act(() => { (canvas.groups.get("floor-table-two")!.onDragEnd as (event: unknown) => void)({ target: node }); });
    expect(onMove).toHaveBeenCalledWith(["two"], { x: 10, y: 0 });
  });

  it("pans at 100% from table surfaces without selecting or moving resources and preserves that viewport across modes and refreshes", () => {
    const table = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const onMove = vi.fn(); const onSelect = vi.fn(); const onSelectFixture = vi.fn(); const onSelectLocation = vi.fn();
    const props = { room: { ...room, locations: [resizable], fixtures: [{ id: "bar", type: "BAR" as const, label: "Barra", x: 100, y: 100, width: 100, height: 40, rotation: 0 }] }, tables: [table], zoom: 1, onZoomChange: vi.fn(), onMove, onSelect, onSelectFixture, onSelectLocation, onMoveLocation: vi.fn(), onMoveFixture: vi.fn() };
    const view = render(createElement(FloorCanvasStage, { ...props, interactionMode: "pan" }));
    expect(canvas.stageEvents.draggable).toBe(true);
    expect(canvas.groups.get("floor-table-one")!.draggable).toBe(false);
    expect(canvas.groups.get("400,300")!.draggable).toBe(false);
    expect(canvas.groups.get("100,100")!.draggable).toBe(false);
    const event = { evt: new MouseEvent("mousedown", { button: 0 }), cancelBubble: false };
    act(() => { (canvas.groups.get("floor-table-one")!.onMouseDown as (event: unknown) => void)(event); });
    expect(event.cancelBubble).toBe(false);
    const before = offset();
    act(() => { canvas.node.position({ x: 70, y: -25 }); canvas.dragEnd!({ target: canvas.node }); });
    expect(offset()).toEqual({ x: before.x + 70, y: before.y - 25 });
    view.rerender(createElement(FloorCanvasStage, { ...props, room: { ...props.room }, interactionMode: "select" }));
    expect(canvas.stageEvents.draggable).toBe(false);
    expect(offset()).toEqual({ x: before.x + 70, y: before.y - 25 });
    expect(onMove).not.toHaveBeenCalled(); expect(onSelect).not.toHaveBeenCalled(); expect(onSelectFixture).not.toHaveBeenCalled(); expect(onSelectLocation).not.toHaveBeenCalled();
  });

  it.each(["shiftKey", "ctrlKey", "metaKey"])("toggles a table once with %s and preserves the selection for right-click", (modifier) => {
    const table = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const onSelect = vi.fn(); const onContextMenuTable = vi.fn();
    render(createElement(FloorCanvasStage, { room, tables: [table], selectedIds: ["one"], zoom: 1, onZoomChange: vi.fn(), onSelect, onContextMenuTable }));
    const group = canvas.groups.get("floor-table-one")!;
    for (const name of ["onMouseDown", "onClick"]) act(() => { (group[name] as (event: unknown) => void)({ evt: new MouseEvent("click", { button: 0, [modifier]: true }), cancelBubble: false }); });
    expect(onSelect.mock.calls).toEqual([["one", true]]);
    const native = new MouseEvent("contextmenu", { button: 2, clientX: 50, clientY: 60, cancelable: true });
    for (const name of ["onMouseDown", "onClick", "onContextMenu"]) act(() => { (group[name] as (event: unknown) => void)({ evt: native, cancelBubble: false }); });
    expect(onSelect.mock.calls).toEqual([["one", true]]);
    expect(onContextMenuTable).toHaveBeenCalledWith("one", { x: 50, y: 60 });
  });

  it("keeps a selected group intact when dragging one member and only moves active allowed resource IDs", () => {
    const first = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const onSelect = vi.fn(); const onMove = vi.fn();
    render(createElement(FloorCanvasStage, { room, tables: [first, { ...first, id: "two", x: 280 }, { ...first, id: "inactive", active: false }, { ...first, id: "blocked" }], selectedIds: ["one", "two", "inactive", "missing", "blocked"], draggableIds: ["one", "two"], zoom: 2, onZoomChange: vi.fn(), onSelect, onMove }));
    const group = canvas.groups.get("floor-table-one")!;
    const position = { x: 200, y: 200 }; const node = { x: () => position.x, y: () => position.y };
    act(() => { (group.onMouseDown as (event: unknown) => void)({ evt: new MouseEvent("mousedown", { button: 0 }), cancelBubble: false }); (group.onDragStart as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    Object.assign(position, { x: 230, y: 240 });
    act(() => { (canvas.groups.get("floor-table-one")!.onDragEnd as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onMove.mock.calls).toEqual([[["one", "two"], { x: 30, y: 40 }]]);
  });

  it.each([
    { name: "square physical edge without its center", shape: "SQUARE" as const, rotation: 0, width: 80, height: 80, from: { x: 235, y: 195 }, to: { x: 245, y: 205 }, expected: ["one"] },
    { name: "rotated rectangular physical edge", shape: "RECTANGLE" as const, rotation: 90, width: 140, height: 40, from: { x: 215, y: 240 }, to: { x: 225, y: 260 }, expected: ["one"] },
    { name: "space outside a circle's rendered diameter", shape: "CIRCLE" as const, rotation: 0, width: 80, height: 800, from: { x: 195, y: 250 }, to: { x: 205, y: 260 }, expected: [] },
  ])("selects by $name after zoom and pan and suppresses the trailing blank click", ({ shape, rotation, width, height, from, to, expected }) => {
    const table = { id: "one", label: "M1", shape, capacity: 4, x: 200, y: 200, width, height, rotation, active: true };
    const onSelectMany = vi.fn(); const onClearSelection = vi.fn();
    render(createElement(FloorCanvasStage, { room, tables: [table, { ...table, id: "inactive", active: false }], grid: true, zoom: 2, onZoomChange: vi.fn(), onSelectMany, onClearSelection }));
    act(() => { canvas.node.position({ x: 60, y: -40 }); canvas.dragEnd!({ target: canvas.node }); });
    const before = offset();
    pointAt(from.x, from.y);
    act(() => { stageEvent("onMouseDown", { target: canvas.node, evt: new MouseEvent("mousedown", { button: 0, metaKey: true }) }); });
    pointAt(to.x, to.y);
    act(() => { stageEvent("onMouseMove"); });
    expect(canvas.rects.get("floor-selection-marquee")!.width).toBeCloseTo(Math.abs(to.x - from.x));
    act(() => { stageEvent("onMouseUp"); stageEvent("onClick", { target: canvas.node, evt: new MouseEvent("click", { button: 0 }) }); });
    expect(onSelectMany.mock.calls).toEqual([[expected, true]]);
    expect(onClearSelection).not.toHaveBeenCalled(); expect(offset()).toEqual(before);
    act(() => { stageEvent("onMouseDown", { target: canvas.node, evt: new MouseEvent("mousedown", { button: 0 }) }); stageEvent("onMouseUp"); stageEvent("onClick", { target: canvas.node, evt: new MouseEvent("click", { button: 0 }) }); });
    expect(onClearSelection).toHaveBeenCalledOnce();
  });

  it("starts marquee selection over operational sectors and selects joined outlines with modifiers", () => {
    const first = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const onSelectMany = vi.fn(); const onSelectLocation = vi.fn();
    render(createElement(FloorCanvasStage, { room: { ...room, locations: [resizable] }, tables: [first, { ...first, id: "two", x: 280 }], joinedGroups: [{ id: "joined", tableIds: ["one", "two"], label: "M1 + M2" }], zoom: 1, onZoomChange: vi.fn(), onSelectMany, onSelectLocation }));
    pointAt(150, 150);
    act(() => { (canvas.groups.get("400,300")!.onMouseDown as (event: unknown) => void)({ evt: new MouseEvent("mousedown", { button: 0 }), cancelBubble: false }); });
    pointAt(325, 245);
    act(() => { stageEvent("onMouseMove"); stageEvent("onMouseUp"); (canvas.groups.get("400,300")!.onClick as (event: unknown) => void)({ evt: new MouseEvent("click", { button: 0 }), cancelBubble: false }); });
    expect(onSelectMany.mock.calls).toEqual([[["one", "two"], false]]); expect(onSelectLocation).not.toHaveBeenCalled();
    act(() => { (canvas.groups.get("floor-joined-group-joined")!.onClick as (event: unknown) => void)({ evt: new MouseEvent("click", { button: 0, ctrlKey: true }), cancelBubble: false }); });
    expect(onSelectMany).toHaveBeenLastCalledWith(["one", "two"], true);
  });

  it("selects active sectors and rotated fixtures touched by the editor marquee", () => {
    const rotated = { ...resizable, id: "rotated", x: 400, y: 300, rotation: 90 as const };
    const wall = { id: "wall", type: "WALL" as const, label: "Pared", x: 490, y: 350, width: 20, height: 160, rotation: 90 };
    const onSelectElements = vi.fn(); const onClearSelection = vi.fn();
    render(createElement(FloorCanvasStage, {
      room: { ...room, locations: [
        rotated,
        { ...rotated, id: "archived", active: false },
        { ...resizable, id: "partial", x: 430, width: 400 },
        { ...resizable, id: "edge", x: 550, width: 200 },
        { ...resizable, id: "outside", x: 551, width: 200 },
      ], fixtures: [wall] },
      tables: [], grid: true, zoom: 2, onZoomChange: vi.fn(), onSelectElements, onClearSelection,
    }));
    act(() => { canvas.node.position({ x: 55, y: 25 }); canvas.dragEnd!({ target: canvas.node }); });
    pointAt(450, 400);
    act(() => { stageEvent("onMouseDown", { target: canvas.node, evt: new MouseEvent("mousedown", { button: 0 }) }); });
    pointAt(350, 200);
    act(() => { stageEvent("onMouseMove"); });
    const marquee = canvas.rects.get("floor-selection-marquee");
    expect(marquee?.width).toBeCloseTo(100);
    expect(marquee?.height).toBeCloseTo(200);
    act(() => { stageEvent("onMouseUp"); stageEvent("onClick", { target: canvas.node, evt: new MouseEvent("click", { button: 0 }) }); });
    expect(onSelectElements.mock.calls).toEqual([[[
      { kind: "sector", id: "rotated" }, { kind: "sector", id: "partial" },
      { kind: "sector", id: "edge" }, { kind: "fixture", id: "wall" },
    ], false]]);
    expect(onClearSelection).not.toHaveBeenCalled();
  });

  it.each(["sector", "fixture"] as const)("uses a modifier to draw over a draggable %s without moving or clicking it", (kind) => {
    const label = { id: "label", type: "LABEL" as const, label: "Entrada", x: 430, y: 310, width: 50, height: 20, rotation: 0 };
    const onSelectElements = vi.fn(); const onSelectElement = vi.fn();
    render(createElement(FloorCanvasStage, {
      room: { ...room, locations: [resizable], fixtures: [label] }, tables: [], zoom: 1, onZoomChange: vi.fn(),
      onSelectElements, onSelectLocation: onSelectElement, onSelectFixture: onSelectElement, onMoveLocation: vi.fn(), onMoveFixture: vi.fn(),
    }));
    const surface = canvas.groups.get(kind === "sector" ? "400,300" : "430,310")!;
    const stopDrag = vi.fn();
    const mouse = (handler: string, native: MouseEvent) => act(() => {
      (surface[handler] as (event: unknown) => void)({ currentTarget: { stopDrag }, evt: native, cancelBubble: false });
    });
    pointAt(420, 305);
    mouse("onMouseDown", new MouseEvent("mousedown", { button: 0, shiftKey: true }));
    pointAt(460, 335);
    act(() => { stageEvent("onMouseMove"); stageEvent("onMouseUp"); });
    mouse("onClick", new MouseEvent("click", { button: 0, shiftKey: true }));
    expect(stopDrag).toHaveBeenCalledOnce();
    expect(onSelectElements.mock.calls).toEqual([[[{ kind: "sector", id: "window" }, { kind: "fixture", id: "label" }], true]]);
    expect(onSelectElement).not.toHaveBeenCalled();

    mouse("onMouseDown", new MouseEvent("mousedown", { button: 0, ctrlKey: true }));
    act(() => { stageEvent("onMouseUp"); });
    mouse("onClick", new MouseEvent("click", { button: 0, ctrlKey: true }));
    expect(onSelectElement).toHaveBeenCalledWith(kind === "sector" ? "window" : "label", true);
  });

  it("previews a mixed drag from a selected label and restores the group if its drop is rejected", () => {
    const label = { id: "label", type: "LABEL" as const, label: "Entrada", x: 430, y: 310, width: 50, height: 20, rotation: 0 };
    const onMoveFixture = vi.fn(); const onSelectFixture = vi.fn();
    const view = render(createElement(FloorCanvasStage, {
      room: { ...room, locations: [resizable], fixtures: [label] }, tables: [], zoom: 1, onZoomChange: vi.fn(),
      selectedElements: [{ kind: "sector", id: "window" }, { kind: "fixture", id: "label" }], onSelectElements: vi.fn(),
      onSelectFixture, onMoveLocation: vi.fn(), onMoveFixture,
    }));
    const position = { x: 430, y: 310 };
    const node = { x: () => position.x, y: () => position.y };
    const event = { target: node, cancelBubble: false };
    const group = canvas.groups.get("430,310")!;
    const drag = (handler: string) => act(() => { (group[handler] as (event: unknown) => void)(event); });
    drag("onDragStart");
    Object.assign(position, { x: 455, y: 345 });
    drag("onDragMove");
    expect(view.container.querySelector('[data-konva-group][data-x="425"][data-y="335"]')).not.toBeNull();
    expect(view.container.querySelector('[data-konva-group][data-x="455"][data-y="345"]')).not.toBeNull();
    expect(canvas.rects.get("floor-label-selection-label")).toMatchObject({ listening: false });
    expect(onSelectFixture).not.toHaveBeenCalled();
    drag("onDragEnd");
    expect(onMoveFixture).toHaveBeenCalledWith("label", { x: 455, y: 345 });
    expect(view.container.querySelector('[data-konva-group][data-x="400"][data-y="300"]')).not.toBeNull();
    expect(view.container.querySelector('[data-konva-group][data-x="430"][data-y="310"]')).not.toBeNull();
  });

  it("clears selection from blank operational sector clicks and taps, preserving modifiers and Admin selection and placement", () => {
    const onClearSelection = vi.fn(); const onSelectLocation = vi.fn(); const onPlace = vi.fn();
    const props = { room: { ...room, locations: [resizable] }, tables: [], zoom: 1, onZoomChange: vi.fn(), onClearSelection };
    const view = render(createElement(FloorCanvasStage, props));
    const sectorEvent = (handler: string, native = new MouseEvent("click", { button: 0 })) => { act(() => { (canvas.groups.get("400,300")![handler] as (event: unknown) => void)({ evt: native, cancelBubble: false }); }); };
    sectorEvent("onClick"); sectorEvent("onTap");
    expect(onClearSelection).toHaveBeenCalledTimes(2);
    for (const modifier of ["shiftKey", "ctrlKey", "metaKey"]) sectorEvent("onClick", new MouseEvent("click", { button: 0, [modifier]: true }));
    expect(onClearSelection).toHaveBeenCalledTimes(2);
    view.rerender(createElement(FloorCanvasStage, { ...props, onSelectLocation }));
    sectorEvent("onClick"); sectorEvent("onTap");
    expect(onSelectLocation.mock.calls).toEqual([["window"], ["window"]]); expect(onClearSelection).toHaveBeenCalledTimes(2);
    view.rerender(createElement(FloorCanvasStage, { ...props, onPlace }));
    pointAt(400, 300); sectorEvent("onClick"); sectorEvent("onTap");
    expect(onPlace).toHaveBeenCalledTimes(2); expect(onClearSelection).toHaveBeenCalledTimes(2);
  });

  it("opens current-selection actions on blank right-click without clearing or replacing the selection", () => {
    const onContextMenuSelection = vi.fn(); const onClearSelection = vi.fn(); const onSelectMany = vi.fn();
    render(createElement(FloorCanvasStage, { room, tables: [], selectedIds: ["one", "two"], zoom: 1, onZoomChange: vi.fn(), onContextMenuSelection, onClearSelection, onSelectMany }));
    const native = new MouseEvent("contextmenu", { button: 2, clientX: 320, clientY: 240, cancelable: true });
    act(() => { stageEvent("onMouseDown", { target: canvas.node, evt: native }); stageEvent("onContextMenu", { target: canvas.node, evt: native }); stageEvent("onClick", { target: canvas.node, evt: native }); });
    expect(native.defaultPrevented).toBe(true); expect(onContextMenuSelection).toHaveBeenCalledWith({ x: 320, y: 240 });
    expect(onSelectMany).not.toHaveBeenCalled(); expect(onClearSelection).not.toHaveBeenCalled();
  });

  it("opens current-selection actions for an unhandled right-click bubbling from an operational sector surface", () => {
    const onContextMenuSelection = vi.fn(); const onClearSelection = vi.fn();
    render(createElement(FloorCanvasStage, { room: { ...room, locations: [resizable] }, tables: [], selectedIds: ["one", "two"], zoom: 1, onZoomChange: vi.fn(), onContextMenuSelection, onClearSelection }));
    const native = new MouseEvent("contextmenu", { button: 2, clientX: 400, clientY: 300, cancelable: true });
    const sectorSurface = {};
    expect(canvas.groups.get("400,300")!.onContextMenu).toBeUndefined();
    act(() => { stageEvent("onContextMenu", { target: sectorSurface, evt: native }); });
    expect(native.defaultPrevented).toBe(true);
    expect(onContextMenuSelection).toHaveBeenCalledWith({ x: 400, y: 300 });
    expect(onClearSelection).not.toHaveBeenCalled();
  });

  it("cancels an active marquee or table drag before Escape clears the selection", () => {
    const table = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const onClearSelection = vi.fn(); const onSelectMany = vi.fn(); const onMove = vi.fn();
    render(createElement(FloorCanvasStage, { room, tables: [table], selectedIds: ["one"], zoom: 1, onZoomChange: vi.fn(), onClearSelection, onSelectMany, onMove }));
    pointAt(100, 100);
    act(() => { stageEvent("onMouseDown", { target: canvas.node, evt: new MouseEvent("mousedown", { button: 0 }) }); });
    pointAt(300, 300);
    act(() => { stageEvent("onMouseMove"); });
    fireEvent.keyDown(document.body, { key: "Escape" });
    act(() => { stageEvent("onMouseUp"); });
    expect(onClearSelection).not.toHaveBeenCalled(); expect(onSelectMany).not.toHaveBeenCalled();
    const position = { x: 200, y: 200 }; const node = { x: () => position.x, y: () => position.y };
    act(() => { (canvas.groups.get("floor-table-one")!.onDragStart as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    Object.assign(position, { x: 240, y: 240 });
    act(() => { (canvas.groups.get("floor-table-one")!.onDragMove as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    fireEvent.keyDown(document.body, { key: "Escape" });
    act(() => { (canvas.groups.get("floor-table-one")!.onDragEnd as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    expect(onMove).not.toHaveBeenCalled(); expect(onClearSelection).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClearSelection).toHaveBeenCalledOnce();
  });

  it("translates child tables live during sector dragMove before drop and resets on Escape cancel", () => {
    const onMoveLocation = vi.fn();
    const sector = { id: "window", name: "Superior", x: 400, y: 300, width: 600, height: 400, rotation: 0 as const, active: true };
    const child = { id: "child", label: "M1", shape: "SQUARE" as const, capacity: 4, locationId: "window", x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const other = { id: "other", label: "M2", shape: "SQUARE" as const, capacity: 4, x: 700, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const view = render(createElement(FloorCanvasStage, {
      room: { ...room, locations: [sector] },
      tables: [child, other],
      zoom: 1,
      onZoomChange: vi.fn(),
      onMoveLocation,
      onSelectLocation: vi.fn(),
    }));
    const position = { x: 400, y: 300 };
    const stopDrag = vi.fn();
    const node = {
      x: () => position.x,
      y: () => position.y,
      position: (next: { x: number; y: number }) => { Object.assign(position, next); },
      stopDrag,
    };
    const group = canvas.groups.get("400,300")!;
    act(() => { (group.onDragStart as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    Object.assign(position, { x: 460, y: 340 });
    act(() => { (group.onDragMove as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    expect(onMoveLocation).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-konva-group][data-x="460"][data-y="340"]')).not.toBeNull();
    expect(canvas.groups.get("floor-table-child")).toMatchObject({ x: 260, y: 240 });
    expect(canvas.groups.get("floor-table-other")).toMatchObject({ x: 700, y: 200 });

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(stopDrag).toHaveBeenCalledOnce();
    expect(canvas.groups.get("floor-table-child")).toMatchObject({ x: 200, y: 200 });
    act(() => { (group.onDragEnd as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    expect(onMoveLocation).not.toHaveBeenCalled();

    Object.assign(position, { x: 400, y: 300 });
    act(() => { (group.onDragStart as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    Object.assign(position, { x: 460, y: 340 });
    act(() => { (group.onDragMove as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    act(() => { (group.onDragEnd as (event: unknown) => void)({ target: node, cancelBubble: false }); });
    expect(onMoveLocation).toHaveBeenCalledWith("window", { x: 460, y: 340 });
  });

  it("applies distinct cursors for select, hover/drag, marquee, resize, pan/grabbing, place, and service without leaking state", () => {
    const table = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, locationId: "window", x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const fixtures = [{ id: "bar", type: "BAR" as const, label: "Barra", x: 120, y: 100, width: 100, height: 40, rotation: 0 }];
    const baseProps = {
      room: { ...room, locations: [resizable], fixtures },
      tables: [table],
      zoom: 2,
      onZoomChange: vi.fn(),
      selectedLocationId: "window",
      onSelect: vi.fn(),
      onSelectMany: vi.fn(),
      onSelectElements: vi.fn(),
      onMove: vi.fn(),
      onSelectLocation: vi.fn(),
      onMoveLocation: vi.fn(),
      onResizeLocation: vi.fn(),
      onSelectFixture: vi.fn(),
      onMoveFixture: vi.fn(),
    };
    const view = render(createElement(FloorCanvasStage, baseProps));

    // 1. Select mode rests at "default" even when zoomed (> 1)
    expect(canvas.surface.element!.style.cursor).toBe("default");
    expect((canvas.stageEvents.style as { cursor?: string })?.cursor).toBe("default");

    // 2. Hovering movable table, sector, or fixture shows "move" and restores "default" on leave
    act(() => { (canvas.groups.get("floor-table-one")!.onMouseEnter as (event: unknown) => void)({ cancelBubble: false }); });
    expect(canvas.surface.element!.style.cursor).toBe("move");
    act(() => { (canvas.groups.get("floor-table-one")!.onMouseLeave as (event: unknown) => void)({ cancelBubble: false }); });
    expect(canvas.surface.element!.style.cursor).toBe("default");

    act(() => { (canvas.groups.get("400,300")!.onMouseEnter as (event: unknown) => void)({ cancelBubble: false }); });
    expect(canvas.surface.element!.style.cursor).toBe("move");
    act(() => { (canvas.groups.get("400,300")!.onMouseLeave as (event: unknown) => void)({ cancelBubble: false }); });
    expect(canvas.surface.element!.style.cursor).toBe("default");

    act(() => { (canvas.groups.get("120,100")!.onMouseEnter as (event: unknown) => void)({ cancelBubble: false }); });
    expect(canvas.surface.element!.style.cursor).toBe("move");

    // 3. Resize handles show resize cursor and reset cleanly to "default" (not "grab") at zoom 2
    resizeGesture("top-center").call("onMouseEnter");
    expect(canvas.surface.element!.style.cursor).toBe("ns-resize");
    resizeGesture("top-center").call("onMouseLeave");
    expect(canvas.surface.element!.style.cursor).toBe("default");

    // 4. Drawing a marquee turns cursor into "crosshair" and restores "default" when released
    pointAt(100, 100);
    act(() => { stageEvent("onMouseDown", { target: canvas.node, evt: new MouseEvent("mousedown", { button: 0 }) }); });
    pointAt(260, 260);
    act(() => { stageEvent("onMouseMove"); });
    expect(canvas.surface.element!.style.cursor).toBe("crosshair");
    act(() => { stageEvent("onMouseUp"); });
    expect(canvas.surface.element!.style.cursor).toBe("default");

    // 5. Pan mode shows "grab", turns into "grabbing" while dragging viewport, and ignores hover overrides
    view.rerender(createElement(FloorCanvasStage, { ...baseProps, room: { ...room, locations: [resizable], fixtures }, interactionMode: "pan" }));
    expect(canvas.surface.element!.style.cursor).toBe("grab");
    act(() => { (canvas.groups.get("floor-table-one")!.onMouseEnter as (event: unknown) => void)({ cancelBubble: false }); });
    expect(canvas.surface.element!.style.cursor).toBe("grab");
    act(() => { stageEvent("onMouseDown", { target: canvas.node, evt: new MouseEvent("mousedown", { button: 0 }) }); });
    expect(canvas.surface.element!.style.cursor).toBe("grabbing");
    act(() => { stageEvent("onDragEnd", { target: canvas.node }); });
    expect(canvas.surface.element!.style.cursor).toBe("grab");

    // 6. Placement mode shows "crosshair" everywhere and disables dragging on existing items
    view.rerender(createElement(FloorCanvasStage, { ...baseProps, room: { ...room, locations: [resizable], fixtures }, interactionMode: "select", onPlace: vi.fn() }));
    expect(canvas.surface.element!.style.cursor).toBe("crosshair");
    expect(canvas.groups.get("floor-table-one")!.draggable).toBe(false);
    expect(canvas.groups.get("400,300")!.draggable).toBe(false);
    expect(canvas.groups.get("120,100")!.draggable).toBe(false);
    act(() => { (canvas.groups.get("floor-table-one")!.onMouseEnter as (event: unknown) => void)({ cancelBubble: false }); });
    expect(canvas.surface.element!.style.cursor).toBe("crosshair");

    // 7. Service mode shows "default" on background and "pointer" on active tables
    view.rerender(createElement(FloorCanvasStage, { ...baseProps, room: { ...room, locations: [resizable], fixtures }, interactionMode: "service", onServiceTable: vi.fn() }));
    expect(canvas.surface.element!.style.cursor).toBe("default");
    act(() => { (canvas.groups.get("floor-table-one")!.onMouseEnter as (event: unknown) => void)({ cancelBubble: false }); });
    expect(canvas.surface.element!.style.cursor).toBe("pointer");
  });

  it("toggles background grid lines independently while keeping inactive editor sectors and tables visible", () => {
    const activeTable = { id: "active", label: "M1", shape: "SQUARE" as const, capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const archivedTable = { ...activeTable, id: "archived", label: "M2", x: 320, active: false };
    const archivedSector = { ...resizable, id: "archived-sector", name: "Archivado", x: 500, y: 400, active: false };
    const view = render(createElement(FloorCanvasStage, {
      room: { ...room, locations: [resizable, archivedSector] },
      tables: [activeTable, archivedTable],
      editorMode: true,
      grid: true,
      zoom: 1,
      onZoomChange: vi.fn(),
    }));
    expect(view.container.querySelectorAll("[data-konva-line]").length).toBeGreaterThan(0);
    expect(canvas.groups.get("floor-table-archived")).toBeDefined();
    expect(canvas.groups.get("500,400")).toBeDefined();

    view.rerender(createElement(FloorCanvasStage, {
      room: { ...room, locations: [resizable, archivedSector] },
      tables: [activeTable, archivedTable],
      editorMode: true,
      grid: false,
      zoom: 1,
      onZoomChange: vi.fn(),
    }));
    expect(view.container.querySelectorAll("[data-konva-line]")).toHaveLength(0);
    expect(canvas.groups.get("floor-table-archived")).toBeDefined();
    expect(canvas.groups.get("500,400")).toBeDefined();
  });

  it("snaps tables, sectors (with child tables), fixtures, resized edges, and placed points to the 40px grid when grid is enabled", () => {
    const onMove = vi.fn();
    const onMoveLocation = vi.fn();
    const onMoveFixture = vi.fn();
    const onResizeLocation = vi.fn();
    const onPlace = vi.fn();
    const sector = { id: "window", name: "Superior", x: 380, y: 300, width: 200, height: 120, rotation: 0 as const, active: true };
    const tableOne = { id: "one", label: "M1", shape: "SQUARE" as const, capacity: 4, locationId: "window", x: 200, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const tableTwo = { id: "two", label: "M2", shape: "SQUARE" as const, capacity: 4, locationId: "window", x: 320, y: 200, width: 80, height: 80, rotation: 0, active: true };
    const fixture = { id: "bar", type: "BAR" as const, label: "Barra", x: 120, y: 80, width: 160, height: 80, rotation: 0 };
    const view = render(createElement(FloorCanvasStage, {
      room: { ...room, locations: [sector], fixtures: [fixture] },
      tables: [tableOne, tableTwo],
      selectedIds: ["one", "two"],
      selectedLocationId: "window",
      editorMode: true,
      grid: true,
      zoom: 1,
      onZoomChange: vi.fn(),
      onMove,
      onMoveLocation,
      onMoveFixture,
      onResizeLocation,
      onSelectLocation: vi.fn(),
    }));

    // 1. Dragging a table snaps live and commits a grid-aligned delta for co-selected tables
    const tablePos = { x: 200, y: 200 };
    const tableNode = {
      x: () => tablePos.x,
      y: () => tablePos.y,
      position: (next: { x: number; y: number }) => Object.assign(tablePos, next),
    };
    act(() => { (canvas.groups.get("floor-table-one")!.onDragStart as (event: unknown) => void)({ target: tableNode, cancelBubble: false }); });
    Object.assign(tablePos, { x: 254, y: 231 });
    act(() => { (canvas.groups.get("floor-table-one")!.onDragMove as (event: unknown) => void)({ target: tableNode, cancelBubble: false }); });
    expect(tablePos).toEqual({ x: 240, y: 240 });
    expect(canvas.groups.get("floor-table-two")).toMatchObject({ x: 360, y: 240 });
    act(() => { (canvas.groups.get("floor-table-one")!.onDragEnd as (event: unknown) => void)({ target: tableNode, cancelBubble: false }); });
    expect(onMove).toHaveBeenCalledWith(["one", "two"], { x: 40, y: 40 });

    // 2. Dragging a sector (width 200 -> half=100, height 120 -> half=60) snaps edges to 40px lines and translates child tables by the exact snapped delta
    const sectorPos = { x: 380, y: 300 };
    const sectorNode = {
      x: () => sectorPos.x,
      y: () => sectorPos.y,
      position: (next: { x: number; y: number }) => Object.assign(sectorPos, next),
    };
    act(() => { (canvas.groups.get("380,300")!.onDragStart as (event: unknown) => void)({ target: sectorNode, cancelBubble: false }); });
    Object.assign(sectorPos, { x: 433, y: 355 });
    act(() => { (canvas.groups.get("380,300")!.onDragMove as (event: unknown) => void)({ target: sectorNode, cancelBubble: false }); });
    expect(sectorPos).toEqual({ x: 420, y: 340 });
    expect(canvas.groups.get("floor-table-one")).toMatchObject({ x: 240, y: 240 });
    act(() => { (canvas.groups.get("380,300")!.onDragEnd as (event: unknown) => void)({ target: sectorNode, cancelBubble: false }); });
    expect(onMoveLocation).toHaveBeenCalledWith("window", { x: 420, y: 340 });

    // 3. Dragging a fixture snaps its bounds cleanly to the 40px grid
    const barPos = { x: 120, y: 80 };
    const barNode = {
      x: () => barPos.x,
      y: () => barPos.y,
      position: (next: { x: number; y: number }) => Object.assign(barPos, next),
    };
    act(() => { (canvas.groups.get("120,80")!.onDragStart as (event: unknown) => void)({ target: barNode, cancelBubble: false }); });
    Object.assign(barPos, { x: 151, y: 117 });
    act(() => { (canvas.groups.get("120,80")!.onDragMove as (event: unknown) => void)({ target: barNode, cancelBubble: false }); });
    expect(barPos).toEqual({ x: 160, y: 120 });
    act(() => { (canvas.groups.get("120,80")!.onDragEnd as (event: unknown) => void)({ target: barNode, cancelBubble: false }); });
    expect(onMoveFixture).toHaveBeenCalledWith("bar", { x: 160, y: 120 });

    // 4. Resizing a sector snaps the dragged edge to the 40px grid
    const gesture = resizeGesture("middle-right", true);
    pointAt(480, 300); gesture.call("onMouseDown");
    pointAt(533, 300); gesture.call("onDragStart"); gesture.call("onDragMove");
    gesture.call("onDragEnd", { type: "mouseup" });
    expect(onResizeLocation).toHaveBeenCalledWith("window", { x: 400, y: 300, width: 240, height: 120 });

    // 5. Placing on the canvas snaps to the nearest 40px intersection when grid is on, and leaves raw coordinates when grid is off
    view.rerender(createElement(FloorCanvasStage, {
      room: { ...room, locations: [sector], fixtures: [fixture] },
      tables: [tableOne, tableTwo],
      editorMode: true,
      grid: true,
      zoom: 1,
      onZoomChange: vi.fn(),
      onPlace,
    }));
    pointAt(213, 189);
    act(() => { stageEvent("onClick", { target: canvas.node, evt: new MouseEvent("click", { button: 0 }) }); });
    expect(onPlace).toHaveBeenLastCalledWith({ x: 200, y: 200 }, undefined);

    view.rerender(createElement(FloorCanvasStage, {
      room: { ...room, locations: [sector], fixtures: [fixture] },
      tables: [tableOne, tableTwo],
      editorMode: true,
      grid: false,
      zoom: 1,
      onZoomChange: vi.fn(),
      onPlace,
      onMove,
    }));
    act(() => { stageEvent("onClick", { target: canvas.node, evt: new MouseEvent("click", { button: 0 }) }); });
    const placedPoint = onPlace.mock.calls.at(-1)?.[0] as { x: number; y: number };
    expect(placedPoint.x).toBeCloseTo(213);
    expect(placedPoint.y).toBeCloseTo(189);
  });

});
