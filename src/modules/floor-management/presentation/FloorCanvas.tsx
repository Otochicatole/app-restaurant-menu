"use client";

import { transientButtonProps } from "@/ui/button-state";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Expand, Minus, Plus } from "lucide-react";

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
export type FloorCanvasProps = {
  room: { id: string; name: string; width: number; height: number; fixtures: FloorCanvasFixture[]; locations?: { id: string; name: string; x: number; y: number; width: number; height: number; rotation: number; active: boolean }[] };
  tables: FloorCanvasTable[];
  joinedGroups?: FloorCanvasJoinedGroup[];
  selectedIds?: string[];
  selectedFixtureId?: string | null;
  selectedLocationId?: string | null;
  draggableIds?: string[];
  onSelect?: (id: string, additive: boolean) => void;
  onContextMenuTable?: (id: string, point: { x: number; y: number }) => void;
  onMove?: (ids: string[], delta: { x: number; y: number }) => void;
  onSelectFixture?: (id: string) => void;
  onMoveFixture?: (id: string, point: { x: number; y: number }) => void;
  onSelectLocation?: (id: string) => void;
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
  const [zoom, setZoom] = useState(1);
  const [viewReset, setViewReset] = useState(0);
  const fitToScreen = () => { setZoom(1); setViewReset((value) => value + 1); };
  const floatingZoomPosition = props.editorMode
    ? "bottom-[calc(env(safe-area-inset-bottom,0px)+10rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]";
  const zoomButtonClass = props.fullScreen ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934] disabled:opacity-30" : "rounded p-2 text-zinc-700 hover:bg-zinc-100 disabled:opacity-30";
  return <div className={`relative isolate overflow-hidden bg-[#f5f2e9] ${props.fullScreen ? "h-full min-h-0 w-full" : `rounded-xl border border-stone-200 ${props.compact ? "h-[350px]" : "h-[min(65dvh,620px)] min-h-[360px]"}`}`}>
    <div className="h-full w-full" role="img" aria-label={`Plano de ${props.room.name}. ${props.tables.filter((table) => table.active).length} mesas. Usá la lista para seleccionar mesas con el teclado.`}>
      <Stage key={`${props.room.id}:${viewReset}`} {...props} zoom={zoom} onZoomChange={setZoom} />
    </div>
    <div className={`absolute z-10 flex items-center bg-white p-1 ${props.fullScreen ? `${floatingZoomPosition} left-[max(0.75rem,env(safe-area-inset-left,0px))] flex-col rounded-xl shadow-[0_6px_24px_-8px_rgba(30,40,25,0.28)] sm:left-[max(1.25rem,env(safe-area-inset-left,0px))]` : "bottom-3 left-3 rounded-lg border border-stone-200"}`} role="group" aria-label="Zoom del plano">
      <button {...transientButtonProps} type="button" aria-label="Alejar plano" disabled={zoom <= 1} onClick={() => { if (zoom / 1.25 <= 1) fitToScreen(); else setZoom((value) => value / 1.25); }} className={`${zoomButtonClass} ${props.fullScreen ? "order-3" : ""}`}><Minus size={props.fullScreen ? 19 : 16} /></button>
      <span className={props.fullScreen ? "order-2 py-1 text-center text-[11px] tabular-nums text-zinc-600" : "min-w-12 text-center text-xs tabular-nums text-zinc-600"}>{Math.round(zoom * 100)}%</span>
      <button {...transientButtonProps} type="button" aria-label="Acercar plano" disabled={zoom >= 4} onClick={() => setZoom((value) => Math.min(4, value * 1.25))} className={`${zoomButtonClass} ${props.fullScreen ? "order-1" : ""}`}><Plus size={props.fullScreen ? 19 : 16} /></button>
      <button {...transientButtonProps} type="button" aria-label="Ajustar salón a pantalla" onClick={fitToScreen} className={props.fullScreen ? `order-4 ${zoomButtonClass}` : `ml-1 ${zoomButtonClass}`}><Expand size={props.fullScreen ? 18 : 16} /></button>
    </div>
    {!props.fullScreen && <span className="pointer-events-none absolute bottom-5 right-4 hidden text-[11px] text-stone-600 sm:block">{props.grid ? "Arrastrá para ubicar" : "Pellizcá o usá + para acercar"}</span>}
  </div>;
}
