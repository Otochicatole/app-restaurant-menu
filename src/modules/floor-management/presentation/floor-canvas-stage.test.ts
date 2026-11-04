/** @vitest-environment jsdom */
import { StrictMode, createElement, useState } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
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
  return { Stage, Layer, Group, Circle: Node, Line: Node, Rect, Text };
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
    act(() => {
      (canvas.groups.get("400,300")!.onClick as (event: unknown) => void)({evt: new MouseEvent("click", {button: 0}), target: {}, cancelBubble: false});
      (canvas.groups.get("400,300")!.onDragEnd as (event: unknown) => void)({target: {x: () => 460, y: () => 310}, cancelBubble: false});
    });
    expect(onSelectLocation.mock.calls).toEqual([["window"]]);
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
    expect(canvas.surface.element!.style.cursor).toBe("grab");
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
    expect(onResizeLocation).not.toHaveBeenCalled(); expect(canvas.surface.element!.style.cursor).toBe("grab");
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
});
