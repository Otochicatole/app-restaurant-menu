"use client";

import { transientButtonProps } from "@/ui/button-state";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Expand, Hand, Minus, MoreHorizontal, MousePointer2, Plus } from "lucide-react";

export type FloorInteractionMode = "pan" | "select";

export type FloorCanvasTable = {
  id: string; label: string; capacity: number; shape: "SQUARE" | "RECTANGLE" | "CIRCLE";
  x: number; y: number; width: number; height: number; rotation: number; active: boolean;
  state?: "available" | "reserved" | "selected" | "unavailable";
};
export type FloorCanvasFixture = {
  id: string; type: "WALL" | "BAR" | "LABEL"; label: string;
  x: number; y: number; width: number; height: number; rotation: number;
};
export type FloorCanvasJoinedGroup = { id: string; tableIds: string[]; label: string };
export type FloorCanvasElement = { kind: "sector" | "fixture"; id: string };
export type FloorCanvasProps = {
  room: { id: string; name: string; width: number; height: number; fixtures: FloorCanvasFixture[]; locations?: { id: string; name: string; x: number; y: number; width: number; height: number; rotation: number; active: boolean }[] };
  tables: FloorCanvasTable[];
  appearance?: "default" | "operational";
  joinedGroups?: FloorCanvasJoinedGroup[];
  selectedIds?: string[];
  selectedElements?: FloorCanvasElement[];
  selectedFixtureId?: string | null;
  selectedLocationId?: string | null;
  draggableIds?: string[];
  interactionMode?: FloorInteractionMode;
  onInteractionModeChange?: (mode: FloorInteractionMode) => void;
  onSelect?: (id: string, additive: boolean) => void;
  onSelectMany?: (ids: string[], additive: boolean) => void;
  onSelectElements?: (elements: FloorCanvasElement[], additive: boolean) => void;
  onClearSelection?: () => void;
  onContextMenuSelection?: (point: { x: number; y: number }) => void;
  onContextMenuTable?: (id: string, point: { x: number; y: number }) => void;
  onContextMenuGroup?: (ids: string[], point: { x: number; y: number }) => void;
  onMove?: (ids: string[], delta: { x: number; y: number }) => void;
  onSelectFixture?: (id: string, additive?: boolean) => void;
  onMoveFixture?: (id: string, point: { x: number; y: number }) => void;
  onSelectLocation?: (id: string, additive?: boolean) => void;
  onContextMenuLocation?: (id: string, point: { x: number; y: number }) => void;
  onPlace?: (point: { x: number; y: number }, locationId?: string) => void;
  onMoveLocation?: (id: string, point: { x: number; y: number }) => void;
  onResizeLocation?: (id: string, geometry: { x: number; y: number; width: number; height: number }) => void;
  grid?: boolean;
  compact?: boolean;
  fullScreen?: boolean;
  editorMode?: boolean;
};

const Stage = dynamic(() => import("./FloorCanvasStage"), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-72 place-items-center text-sm text-zinc-600" role="status">Preparando el plano…</div>,
});

export function FloorCanvas(props: FloorCanvasProps) {
  const { onInteractionModeChange } = props;
  const [zoom, setZoom] = useState(1);
  const [viewReset, setViewReset] = useState(0);
  const [localMode, setLocalMode] = useState<FloorInteractionMode>("select");
  const placing = Boolean(props.onPlace);
  const [previousPlacing, setPreviousPlacing] = useState(placing);
  const placementWasActive = useRef(placing);
  if (placing !== previousPlacing) {
    setPreviousPlacing(placing);
    if (placing) setLocalMode("select");
  }
  const [spacePanning, setSpacePanning] = useState(false);
  const mode = props.interactionMode ?? localMode;
  const interactionMode = spacePanning ? "pan" : mode;
  const changeMode = (next: FloorInteractionMode) => { setLocalMode(next); onInteractionModeChange?.(next); };
  useEffect(() => {
    if (placing && !placementWasActive.current) onInteractionModeChange?.("select");
    placementWasActive.current = placing;
  }, [placing, onInteractionModeChange]);
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.code !== "Space" || event.altKey || event.ctrlKey || event.metaKey || target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))) return;
      event.preventDefault(); setSpacePanning(true);
    };
    const release = () => setSpacePanning(false);
    const keyUp = (event: KeyboardEvent) => { if (event.code === "Space") release(); };
    window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp); window.addEventListener("blur", release);
    return () => { window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); window.removeEventListener("blur", release); };
  }, []);
  const fitToScreen = () => { setZoom(1); setViewReset((value) => value + 1); };
  const floatingZoomPosition = props.editorMode
    ? "bottom-[calc(env(safe-area-inset-bottom,0px)+10rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] xl:bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom,0px)+7.5rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]";
  const floatingModePosition = props.editorMode
    ? "bottom-[calc(env(safe-area-inset-bottom,0px)+10rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom,0px)+7.5rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)]";
  const zoomButtonClass = props.fullScreen ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--floor-ink,#3f3f46)] hover:bg-[var(--floor-hover,#f5f5f4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)] disabled:opacity-30" : "rounded p-2 text-[var(--floor-ink,#3f3f46)] hover:bg-[var(--floor-hover,#f4f4f5)] disabled:opacity-30";
  const selectionHelp = props.onSelectElements ? "Arrastrá para dibujar un recuadro. Usá Shift, Ctrl o Cmd para sumar a la selección." : "Shift, Ctrl o Cmd para sumar mesas";
  const keyboardHelp = props.editorMode && !props.tables.length ? "Usá las listas Sectores y Elementos para seleccionar con el teclado." : `${props.tables.filter((table) => table.active).length} mesas. Usá la lista para seleccionar mesas con el teclado.`;
  return <div className={`relative isolate overflow-hidden ${props.appearance === "operational" ? "bg-[#eef4f6]" : "bg-[#f5f2e9]"} ${props.fullScreen ? "h-full min-h-0 w-full" : `rounded-xl border border-stone-200 ${props.compact ? "h-[350px]" : "h-[min(65dvh,620px)] min-h-[360px]"}`}`}>
    <div className="h-full w-full" role="img" aria-label={`Plano de ${props.room.name}. ${keyboardHelp}`}>
      <Stage key={`${props.room.id}:${viewReset}`} {...props} interactionMode={interactionMode} zoom={zoom} onZoomChange={setZoom} />
    </div>
    <div className={`absolute z-10 flex flex-col rounded-xl bg-[var(--floor-surface,#fff)] p-1 shadow-[0_6px_24px_-8px_rgba(30,40,25,0.28)] sm:flex-row ${props.fullScreen ? `${floatingModePosition} left-1/2 w-max max-w-[calc(100%_-_1.5rem)] -translate-x-1/2` : "bottom-16 left-3"}`} role="group" aria-label="Modo del plano">
      {([{ value: "select", label: "Seleccionar", icon: MousePointer2 }, { value: "pan", label: "Mover vista", icon: Hand }] as const).map(({ value, label, icon: Icon }) => <button key={value} {...transientButtonProps} type="button" aria-pressed={interactionMode === value} title={value === "pan" ? "Mover vista · mantené Espacio para mover temporalmente" : `Seleccionar · ${selectionHelp}`} onClick={() => changeMode(value)} className={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium sm:px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)] ${interactionMode === value ? "bg-[var(--floor-action,#3d5934)] text-white" : "text-[var(--floor-ink,#3f3f46)] hover:bg-[var(--floor-hover,#f4f4f5)]"}`}><Icon size={17} aria-hidden="true" />{label}</button>)}
      {Boolean(props.selectedIds?.length) && props.onContextMenuSelection && <button {...transientButtonProps} type="button" aria-label="Acciones de la selección" onClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); props.onContextMenuSelection?.({ x: bounds.left, y: bounds.top }); }} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[var(--floor-ink,#3f3f46)] hover:bg-[var(--floor-hover,#f4f4f5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)]"><MoreHorizontal size={18} aria-hidden="true" />Acciones ({props.selectedIds?.length})</button>}
    </div>
    <div className={`absolute z-10 flex items-center bg-[var(--floor-surface,#fff)] p-1 ${props.fullScreen ? `${floatingZoomPosition} left-[max(0.75rem,env(safe-area-inset-left,0px))] flex-col rounded-xl shadow-[0_6px_24px_-8px_rgba(30,40,25,0.28)] sm:left-[max(1.25rem,env(safe-area-inset-left,0px))]` : "bottom-3 left-3 rounded-lg border border-stone-200"}`} role="group" aria-label="Zoom del plano">
      <button {...transientButtonProps} type="button" aria-label="Alejar plano" disabled={zoom <= 1} onClick={() => { if (zoom / 1.25 <= 1) fitToScreen(); else setZoom((value) => value / 1.25); }} className={`${zoomButtonClass} ${props.fullScreen ? "order-3" : ""}`}><Minus size={props.fullScreen ? 19 : 16} /></button>
      <span className={props.fullScreen ? "order-2 py-1 text-center text-[11px] tabular-nums text-[var(--floor-muted,#52525b)]" : "min-w-12 text-center text-xs tabular-nums text-[var(--floor-muted,#52525b)]"}>{Math.round(zoom * 100)}%</span>
      <button {...transientButtonProps} type="button" aria-label="Acercar plano" disabled={zoom >= 4} onClick={() => setZoom((value) => Math.min(4, value * 1.25))} className={`${zoomButtonClass} ${props.fullScreen ? "order-1" : ""}`}><Plus size={props.fullScreen ? 19 : 16} /></button>
      <button {...transientButtonProps} type="button" aria-label="Ajustar salón a pantalla" onClick={fitToScreen} className={props.fullScreen ? `order-4 ${zoomButtonClass}` : `ml-1 ${zoomButtonClass}`}><Expand size={props.fullScreen ? 18 : 16} /></button>
    </div>
    {!props.fullScreen && <span className="pointer-events-none absolute bottom-5 right-4 hidden text-[11px] text-[var(--floor-muted,#57534e)] sm:block">{interactionMode === "pan" ? "Arrastrá para mover la vista" : props.onPlace ? "Tocá el plano para ubicar" : "Arrastrá un área para seleccionar · Espacio para mover vista"}</span>}
  </div>;
}
