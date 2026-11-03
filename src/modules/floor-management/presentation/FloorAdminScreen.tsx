"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Building2, Check, LayoutGrid, Loader2, MapPin, Package, Pencil, Plus, RotateCw, Ruler, Save, Settings2, Shapes, Trash2, X } from "lucide-react";
import { AdminConfirmModal, AdminModal } from "@/ui/admin/AdminUI";
import { useRegisterAdminNavigationGuard } from "@/ui/admin/AdminNavigationGuard";
import { transientButtonProps } from "@/ui/button-state";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { floorRoomInputSchema, validateRoomLayout, type FloorCombination, type FloorConfigView, type FloorFixture, type FloorLocation, type FloorRoom, type FloorRotation, type FloorTable } from "../contracts";
import { FloorCanvas } from "./FloorCanvas";
import { FloorSectorContextMenu } from "./FloorSectorContextMenu";
import { CombinationPropertiesForm, FloorSettingsForm, InventoryForm, RoomDimensionsForm, SpatialPropertiesForm, TablePropertiesForm, type StockInput } from "./FloorAdminForms";
import { getFloorConfig, saveFloorAction } from "./floor-api";

type EditorPanel = { kind: "dimensions" | "inventory" | "settings" | "combination" } | { kind: "table"; id: string } | { kind: "sector"; entity: FloorLocation } | { kind: "fixture"; entity: FloorFixture };
type ConfirmPanel = { kind: "confirm"; title: string; description: string; confirmLabel: string; run: () => void | Promise<void>; cancelTo?: EditorPanel };
type Panel = EditorPanel | ConfirmPanel | null;
type Flyout = "rooms" | "sectors" | "elements" | null;
type Selection = { kind: "sector" | "fixture"; id: string } | null;
type CombinationMode = { combination: FloorCombination; selectedIds: string[] } | null;
const copy = <T,>(value: T): T => structuredClone(value);
const nextRotation = (rotation: number): FloorRotation => ((rotation + 90) % 360) as FloorRotation;
const buttonBase = "flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d5934] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:px-3";
const floatingButton = `${buttonBase} bg-white text-[#263e23] hover:bg-[#edf2e9]`;
const toolIcons = [Building2, Ruler, Package, MapPin, Shapes, Settings2];
const toolLabels = ["Salones", "Medidas", "Inventario", "Sectores", "Elementos", "Configuración"];

function uniqueName(base: string, existing: string[]) {
  if (!existing.includes(base)) return base;
  let suffix = 2; while (existing.includes(`${base} ${suffix}`)) suffix += 1;
  return `${base} ${suffix}`;
}
function roomError(room: FloorRoom): string | null {
  const result = floorRoomInputSchema.safeParse(room);
  return result.success ? validateRoomLayout(result.data) : result.error.issues[0]?.message ?? "Revisá los datos del salón.";
}

export function FloorAdminScreen({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [config, setConfig] = useState<FloorConfigView | null>(null);
  const [draft, setDraft] = useState<FloorRoom | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [flyout, setFlyout] = useState<Flyout>(null);
  const [placement, setPlacement] = useState<"sector" | FloorFixture["type"] | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [sectorMenu, setSectorMenu] = useState<{ id: string; point: { x: number; y: number } } | null>(null);
  const [combinationMode, setCombinationMode] = useState<CombinationMode>(null);
  const toolbar = useRef<HTMLElement>(null);
  const flyoutSurface = useRef<HTMLDivElement>(null);
  const panelSurface = useRef<HTMLDivElement>(null);
  const toolButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const hasUnsaved = dirty || combinationMode !== null;
  const roomHref = `/sala?restaurantId=${encodeURIComponent(restaurantId)}`;

  useEffect(() => {
    const controller = new AbortController();
    void getFloorConfig(restaurantId, controller.signal).then((value) => {
      if (controller.signal.aborted) return;
      setConfig(value); setDraft(value.rooms[0] ? copy(value.rooms[0]) : null); setError(null);
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No se pudieron cargar los salones."); });
    return () => controller.abort();
  }, [restaurantId, loadAttempt]);
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);
  useEffect(() => {
    if (!flyout) return;
    const frame = window.requestAnimationFrame(() => (flyoutSurface.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ?? flyoutSurface.current?.querySelector<HTMLButtonElement>("button"))?.focus());
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || flyoutSurface.current?.contains(target) || toolbar.current?.contains(target)) return;
      setFlyout(null);
      if (!(target instanceof Element) || !target.closest("button,a[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")) toolButtons.current[flyout === "rooms" ? 0 : flyout === "sectors" ? 3 : 4]?.focus();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault(); setFlyout(null); toolButtons.current[flyout === "rooms" ? 0 : flyout === "sectors" ? 3 : 4]?.focus();
    };
    document.addEventListener("pointerdown", closeOutside); document.addEventListener("keydown", escape);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", escape); };
  }, [flyout]);
  useEffect(() => {
    if (!panel || panel.kind === "confirm") return;
    const frame = window.requestAnimationFrame(() => (panelSurface.current?.querySelector<HTMLElement>("input,select,button:not([disabled])") ?? panelSurface.current)?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [panel]);

  const patch = (next: FloorRoom) => { if (busy) return; setSectorMenu(null); setDraft(next); setDirty(true); setNotice(null); setError(null); };
  const resetInteraction = () => { setSectorMenu(null); setSelection(null); setCombinationMode(null); setPlacement(null); setFlyout(null); setPanel(null); setError(null); };
  const discardBefore = (run: () => void) => {
    if (busy) return;
    setFlyout(null); setSectorMenu(null);
    if (!hasUnsaved) { run(); return; }
    setPanel({ kind: "confirm", title: "Descartar cambios sin guardar", description: "Los cambios del plano y el armado que estás editando se perderán. Podés cancelar y guardar antes de continuar.", confirmLabel: "Descartar y continuar", run: () => { setPanel(null); run(); } });
  };
  useRegisterAdminNavigationGuard(discardBefore);
  const selectRoom = (room: FloorRoom) => {
    if (room.id === draft?.id) { setFlyout(null); return; }
    discardBefore(() => { setDraft(copy(room)); setDirty(false); resetInteraction(); });
  };
  const createRoom = () => discardBefore(() => {
    const name = uniqueName("Nuevo salón", config?.rooms.map((room) => room.name) ?? []);
    setDraft({ id: crypto.randomUUID(), restaurantId, name, width: 1000, height: 700, active: true, revision: 0, fixtures: [], locations: [], tables: [], combinations: [] });
    setDirty(true); resetInteraction(); setPanel({ kind: "dimensions" });
  });
  const guardLink = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (busy || hasUnsaved) { event.preventDefault(); if (!busy) discardBefore(() => router.push(href)); }
  };
  const mutate = async (body: unknown, message: string, roomAction = false): Promise<boolean> => {
    if (busy) return false;
    setSectorMenu(null); setBusy(true); setError(null); setNotice(null);
    try {
      const next = await saveFloorAction(restaurantId, body);
      setConfig(next);
      if (roomAction || !hasUnsaved) {
        const room = next.rooms.find((item) => item.id === draft?.id) ?? next.rooms[0];
        setDraft(room ? copy(room) : null); if (roomAction) setDirty(false);
      }
      setNotice(message); return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo guardar. Conservamos tus cambios para volver a intentar."); return false; }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!draft || busy || combinationMode) return;
    const invalid = roomError(draft); if (invalid) { setError(invalid); return; }
    const { id, name, width, height, fixtures, locations, active, tables, combinations } = draft;
    await mutate({ action: "save-room", room: { id, name, width, height, fixtures, locations, active, tables, combinations }, expectedRevision: draft.revision }, "Plano e inventario guardados.", true);
  };
  const applyRoom = (next: FloorRoom, then?: () => void): string | null => {
    if (busy) return "Esperá a que termine de guardar.";
    const invalid = roomError(next); if (invalid) return invalid;
    patch(next); then?.(); return null;
  };
  const openPanel = (next: EditorPanel) => { if (busy) return; setSectorMenu(null); setError(null); setFlyout(null); setPlacement(null); setPanel(next); };
  const openSectorMenu = (id: string, point: { x: number; y: number }) => {
    if (busy || panel || placement || combinationMode) return;
    toolButtons.current[3]?.focus();
    setSelection({ kind: "sector", id }); setSectorMenu({ id, point }); setFlyout(null);
  };
  const beginPlacement = (kind: NonNullable<typeof placement>) => {
    if (!draft || busy || combinationMode) return;
    setSectorMenu(null); setPlacement(kind); setSelection(null); setFlyout(null); setPanel(null); setError(null);
  };
  const resizeSector = (id: string, geometry: Pick<FloorLocation, "x" | "y" | "width" | "height">) => {
    if (!draft || busy || panel || placement || combinationMode || !draft.locations.some((location) => location.id === id)) return;
    const invalid = applyRoom({ ...draft, locations: draft.locations.map((location) => location.id === id ? { ...location, ...geometry } : location) });
    if (invalid) setError(invalid);
  };
  const addStock = (stock: StockInput): string | null => {
    if (!draft || busy) return "Esperá a que termine de guardar.";
    if (!Number.isInteger(stock.quantity) || stock.quantity < 1 || stock.quantity + draft.tables.length > 200 || !Number.isInteger(stock.capacity)) return "Ingresá una cantidad entera válida. El salón admite hasta 200 mesas.";
    const labels = new Set(draft.tables.map((table) => table.label));
    const tables = Array.from({ length: stock.quantity }, (): FloorTable => {
      let number = 1; while (labels.has(`M${number}`)) number += 1; labels.add(`M${number}`);
      return { id: crypto.randomUUID(), label: `M${number}`, shape: stock.shape, capacity: stock.capacity, x: 0, y: 0, width: stock.width, height: stock.shape === "RECTANGLE" ? stock.height : stock.width, rotation: 0, active: true };
    });
    return applyRoom({ ...draft, tables: [...draft.tables, ...tables] });
  };
  const startCombination = (combination: FloorCombination) => { setSectorMenu(null); setCombinationMode({ combination: copy(combination), selectedIds: combination.members[0] ? [combination.members[0].tableId] : [] }); setSelection(null); setPanel(null); setFlyout(null); setPlacement(null); setError(null); };
  const createCombination = (ids: string[]) => {
    if (!draft || busy) return;
    const tables = draft.tables.filter((table) => table.active && ids.includes(table.id)); if (tables.length < 2) return;
    let cursor = -tables.reduce((sum, table) => sum + (table.rotation % 180 ? table.height : table.width), 0) / 2;
    const members = tables.map((table) => { const width = table.rotation % 180 ? table.height : table.width; const x = cursor + width / 2; cursor += width; return { tableId: table.id, x, y: 0, rotation: table.rotation }; });
    startCombination({ id: crypto.randomUUID(), name: uniqueName(tables.map((table) => table.label).join(" + "), draft.combinations.map((item) => item.name)), capacity: Math.max(1, tables.reduce((sum, table) => sum + table.capacity, 0) - (tables.length - 1) * 2), members, active: true });
  };
  const applyCombination = () => {
    if (!draft || !combinationMode || busy) return;
    const combination = combinationMode.combination;
    const combinations = draft.combinations.some((item) => item.id === combination.id) ? draft.combinations.map((item) => item.id === combination.id ? combination : item) : [...draft.combinations, combination];
    const invalid = applyRoom({ ...draft, combinations }, () => { setCombinationMode(null); setPanel(null); });
    if (invalid) setError(invalid);
  };
  const place = (point: { x: number; y: number }) => {
    if (!draft || !placement || busy || panel) return;
    const x = point.x; const y = point.y;
    if (placement === "sector") {
      const width = Math.min(360, draft.width); const height = Math.min(260, draft.height);
      openPanel({ kind: "sector", entity: { id: crypto.randomUUID(), name: uniqueName("Sector", draft.locations.map((item) => item.name)), width, height, x: Math.max(width / 2, Math.min(draft.width - width / 2, x)), y: Math.max(height / 2, Math.min(draft.height - height / 2, y)), rotation: 0, active: true } });
    } else {
      const type = placement; const width = Math.min(type === "LABEL" ? 160 : 200, draft.width); const height = Math.min(type === "WALL" ? 12 : type === "BAR" ? 60 : 32, draft.height);
      openPanel({ kind: "fixture", entity: { id: crypto.randomUUID(), type, label: type === "BAR" ? "Barra" : type === "LABEL" ? "Entrada" : "", width, height, x: Math.max(width / 2, Math.min(draft.width - width / 2, x)), y: Math.max(height / 2, Math.min(draft.height - height / 2, y)), rotation: 0 } });
    }
  };
  const selectedSector = selection?.kind === "sector" ? draft?.locations.find((item) => item.id === selection.id) : undefined;
  const selectedFixture = selection?.kind === "fixture" ? draft?.fixtures.find((item) => item.id === selection.id) : undefined;
  const selectedLabel = selectedSector?.name ?? selectedFixture?.label ?? "";
  const editSelection = () => { if (selectedSector) openPanel({ kind: "sector", entity: copy(selectedSector) }); else if (selectedFixture) openPanel({ kind: "fixture", entity: copy(selectedFixture) }); };
  const rotateSelection = () => {
    if (!draft || busy) return;
    if (selectedSector) patch({ ...draft, locations: draft.locations.map((item) => item.id === selectedSector.id ? { ...item, rotation: nextRotation(item.rotation) } : item) });
    if (selectedFixture) patch({ ...draft, fixtures: draft.fixtures.map((item) => item.id === selectedFixture.id ? { ...item, rotation: nextRotation(item.rotation) } : item) });
  };
  const removeSelection = () => {
    if (!draft || !selection || busy) return;
    setPanel({ kind: "confirm", title: selectedSector ? "Archivar sector" : "Eliminar elemento", description: selectedSector ? "El sector dejará de estar disponible. Las asignaciones futuras se comprobarán al guardar." : "El elemento se quitará del plano cuando guardes los cambios.", confirmLabel: selectedSector ? "Archivar sector" : "Eliminar elemento", run: () => { patch(selectedSector ? { ...draft, locations: draft.locations.map((item) => item.id === selection.id ? { ...item, active: false } : item) } : { ...draft, fixtures: draft.fixtures.filter((item) => item.id !== selection.id) }); setSelection(null); setPanel(null); } });
  };
  const archiveRoom = () => {
    if (!draft || busy) return;
    setPanel({ kind: "confirm", title: "Archivar salón", description: `${hasUnsaved ? "Se descartarán los cambios sin guardar de este salón. " : ""}No se podrá archivar si tiene asignaciones futuras comprometidas.`, confirmLabel: "Archivar salón", cancelTo: { kind: "dimensions" }, run: async () => { if (await mutate({ action: "archive-room", roomId: draft.id, expectedRevision: draft.revision }, "Salón archivado.", true)) { setPanel(null); setSelection(null); } } });
  };
  const configurationAction = async (body: unknown, message: string) => {
    if (hasUnsaved) { setError("Guardá el plano antes de modificar la configuración."); return false; }
    return mutate(body, message);
  };
  const closePanel = () => { if (!busy) setPanel(null); };
  const title = panel?.kind === "dimensions" ? "Medidas del salón" : panel?.kind === "inventory" ? "Inventario de mesas" : panel?.kind === "table" ? "Editar mesa" : panel?.kind === "sector" ? "Propiedades del sector" : panel?.kind === "fixture" ? "Propiedades del elemento" : panel?.kind === "combination" ? "Armado predefinido" : "Configuración del restaurante";
  const canvasTables = draft && combinationMode ? combinationMode.combination.members.flatMap((member) => {
    const table = draft.tables.find((item) => item.id === member.tableId); return table ? [{ ...table, x: draft.width / 2 + member.x, y: draft.height / 2 + member.y, rotation: member.rotation }] : [];
  }) : [];
  const interactive = !busy && panel === null;

  return <main data-admin-panel className={`fixed inset-y-0 left-16 right-0 isolate h-dvh overflow-hidden bg-[#f5f2e9] text-zinc-950 selection:bg-[#d6e8d4] ${panel ? "z-50" : ""}`}>
    <h1 className="sr-only">Editor de salones · {config?.restaurantName ?? "Restaurante"}</h1>
    <div role="region" aria-label="Editor del salón" className="absolute inset-0">{draft && <FloorCanvas key={draft.id} fullScreen editorMode grid room={combinationMode ? { ...draft, fixtures: [], locations: [] } : draft} tables={canvasTables} selectedIds={combinationMode?.selectedIds ?? []} selectedLocationId={selection?.kind === "sector" ? selection.id : undefined} selectedFixtureId={selection?.kind === "fixture" ? selection.id : undefined} draggableIds={interactive && combinationMode ? canvasTables.map((table) => table.id) : []} onSelect={interactive && combinationMode ? (id, additive) => setCombinationMode((current) => current ? { ...current, selectedIds: additive ? current.selectedIds.includes(id) ? current.selectedIds.filter((item) => item !== id) : [...current.selectedIds, id] : [id] } : null) : undefined} onMove={interactive && combinationMode ? (ids, delta) => setCombinationMode((current) => current ? { ...current, combination: { ...current.combination, members: current.combination.members.map((member) => ids.includes(member.tableId) ? { ...member, x: member.x + delta.x, y: member.y + delta.y } : member) } } : null) : undefined} onPlace={interactive && placement ? place : undefined} onSelectLocation={interactive && !placement && !combinationMode ? (id) => { setSectorMenu(null); setSelection({ kind: "sector", id }); setFlyout(null); } : undefined} onContextMenuLocation={interactive && !placement && !combinationMode ? openSectorMenu : undefined} onResizeLocation={interactive && !placement && !combinationMode ? resizeSector : undefined} onMoveLocation={interactive && !placement && !combinationMode ? (id, point) => patch({ ...draft, locations: draft.locations.map((item) => item.id === id ? { ...item, ...point } : item) }) : undefined} onSelectFixture={interactive && !placement && !combinationMode ? (id) => { setSectorMenu(null); setSelection({ kind: "fixture", id }); setFlyout(null); } : undefined} onMoveFixture={interactive && !placement && !combinationMode ? (id, point) => patch({ ...draft, fixtures: draft.fixtures.map((item) => item.id === id ? { ...item, ...point } : item) }) : undefined} />}</div>
    {!draft && <div className="absolute inset-0 grid place-items-center p-6"><div className="max-w-sm text-center"><Building2 size={30} className="mx-auto mb-4 text-[#607054]" /><h2 className="text-lg font-semibold">{config ? "Creá tu primer salón" : "Cargando salones…"}</h2><p className="mt-2 text-sm leading-relaxed text-[#52634b]">{config ? "Definí las medidas, cargá tu inventario y dibujá los sectores sobre este tablero." : "Preparando el editor del restaurante."}</p>{config && <button {...transientButtonProps} type="button" disabled={busy} onClick={createRoom} className={`${adminPrimaryButtonClass} mt-5`}><Plus size={16} />Crear salón</button>}</div></div>}
    <header className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top,0px))] z-10 flex items-start justify-between gap-3 px-3 sm:px-6"><div className="pointer-events-auto flex min-w-0 items-start gap-2"><div className="min-w-0 rounded-xl bg-white px-3 py-2 shadow-[0_3px_16px_rgba(24,38,24,0.12)]"><p className="max-w-[32vw] truncate text-[11px] text-[#52634b] sm:max-w-64">{config?.restaurantName ?? "Restaurante"}</p><p className="max-w-[32vw] truncate text-sm font-semibold text-[#263e23] sm:max-w-64">{draft?.name ?? "Salones"}{draft && !draft.active && " · Archivado"}</p></div></div><div className="pointer-events-auto flex shrink-0 gap-2"><Link href={roomHref} aria-label="Ver sala" title="Ver sala" aria-disabled={busy || undefined} onClick={(event) => guardLink(event, roomHref)} className={floatingButton}><LayoutGrid size={18} /><span className="hidden lg:inline">Ver sala</span></Link><button {...transientButtonProps} type="button" aria-label="Guardar plano" title="Guardar plano" disabled={!draft || !dirty || busy || !!combinationMode} onClick={() => { void save(); }} className={`${buttonBase} bg-[#182618] text-white hover:bg-[#2d4628]`}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}<span className="hidden lg:inline">Guardar plano</span></button></div></header>
    <div className="pointer-events-none absolute left-3 right-3 top-[calc(max(1rem,env(safe-area-inset-top,0px))+4rem)] z-10 max-w-xl space-y-2 sm:left-6"><p role="status" className="w-fit rounded-lg bg-white px-3 py-2 text-xs text-[#46543e] shadow-[0_2px_10px_rgba(24,38,24,0.08)]">{placement ? `Tocá dentro del salón para ubicar ${placement === "sector" ? "el sector" : placement === "WALL" ? "la pared" : placement === "BAR" ? "la barra" : "el texto"}.` : combinationMode ? `Editando armado: ${combinationMode.combination.name}` : dirty ? "Cambios sin guardar" : selectedSector ? "Arrastrá los bordes o las esquinas para ajustar el tamaño del sector." : config ? "Clic derecho en un sector para ver sus acciones." : "Preparando el plano…"}</p>{error && !panel && <div role="alert" className="pointer-events-auto flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"><span>{error}</span>{!config ? <button {...transientButtonProps} type="button" onClick={() => setLoadAttempt((value) => value + 1)} className="font-semibold underline underline-offset-4">Reintentar</button> : <button {...transientButtonProps} type="button" aria-label="Cerrar error" onClick={() => setError(null)}><X size={16} /></button>}</div>}{notice && !panel && <p role="status" className="w-fit rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{notice}</p>}{placement && <button {...transientButtonProps} type="button" onClick={() => setPlacement(null)} className={`${adminSecondaryButtonClass} pointer-events-auto`}>Cancelar ubicación</button>}</div>
    {draft && !placement && !combinationMode && !selectedFixture && <button {...transientButtonProps} type="button" disabled={busy} onClick={() => beginPlacement("sector")} className={`${adminPrimaryButtonClass} absolute bottom-[calc(max(1rem,env(safe-area-inset-bottom,0px))+8.5rem)] right-3 z-20 shadow-[0_3px_16px_rgba(24,38,24,0.12)] md:bottom-[calc(max(1rem,env(safe-area-inset-bottom,0px))+4.5rem)] sm:right-6`}><Plus size={18} />Agregar sector</button>}
    {selectedFixture && !combinationMode && <aside aria-label="Selección del plano" className="absolute bottom-[calc(max(1rem,env(safe-area-inset-bottom,0px))+8.5rem)] right-3 z-20 md:bottom-[calc(max(1rem,env(safe-area-inset-bottom,0px))+4.5rem)] max-w-[calc(100%_-_6rem)] rounded-xl bg-white p-3 shadow-[0_6px_28px_-8px_rgba(24,38,24,0.24)] sm:right-6"><p className="mb-2 truncate text-sm font-semibold">{selectedLabel || (selectedFixture?.type === "WALL" ? "Pared" : "Elemento del salón")}</p><div className="flex flex-wrap gap-1"><button {...transientButtonProps} type="button" disabled={busy} onClick={editSelection} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-[#edf2e9]"><Pencil size={15} />Editar</button><button {...transientButtonProps} type="button" disabled={busy} onClick={rotateSelection} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-[#edf2e9]"><RotateCw size={15} />Girar</button><button {...transientButtonProps} type="button" disabled={busy} onClick={removeSelection} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 size={15} />{selectedSector ? "Archivar" : "Eliminar"}</button></div></aside>}
    {sectorMenu && selectedSector && !panel && !placement && !combinationMode && <FloorSectorContextMenu name={selectedSector.name} point={sectorMenu.point} disabled={busy} onEdit={() => { setSectorMenu(null); editSelection(); }} onRotate={() => { setSectorMenu(null); rotateSelection(); }} onArchive={() => { setSectorMenu(null); removeSelection(); }} onClose={() => setSectorMenu(null)} />}
    {combinationMode && <aside aria-label="Edición del armado" className="absolute bottom-[calc(max(1rem,env(safe-area-inset-bottom,0px))+8.5rem)] right-3 z-20 md:bottom-[calc(max(1rem,env(safe-area-inset-bottom,0px))+4.5rem)] max-h-[calc(100dvh-13rem)] max-w-[calc(100%_-_6rem)] space-y-3 overflow-y-auto rounded-xl bg-white p-4 shadow-[0_6px_28px_-8px_rgba(24,38,24,0.24)] sm:right-6"><p className="text-sm font-semibold">{combinationMode.combination.name}</p><p className="max-w-xs text-xs leading-relaxed text-[#52634b]">Arrastrá sus mesas para unirlas. Este armado no cambia las ubicaciones del salón.</p><div className="flex flex-wrap gap-2">{combinationMode.combination.members.map((member) => <button key={member.tableId} {...transientButtonProps} type="button" aria-pressed={combinationMode.selectedIds.includes(member.tableId)} disabled={busy} className="min-h-11 rounded-lg border border-stone-200 px-3 text-xs" onClick={() => setCombinationMode((current) => current ? { ...current, selectedIds: current.selectedIds.includes(member.tableId) ? current.selectedIds.filter((id) => id !== member.tableId) : [...current.selectedIds, member.tableId] } : null)}>{draft?.tables.find((table) => table.id === member.tableId)?.label}</button>)}</div><button {...transientButtonProps} type="button" disabled={busy || !combinationMode.selectedIds.length} className={adminSecondaryButtonClass} onClick={() => setCombinationMode((current) => current ? { ...current, combination: { ...current.combination, members: current.combination.members.map((member) => current.selectedIds.includes(member.tableId) ? { ...member, rotation: nextRotation(member.rotation) } : member) } } : null)}><RotateCw size={15} />Girar mesas seleccionadas</button><button {...transientButtonProps} type="button" className="block min-h-11 text-xs font-semibold underline underline-offset-4" onClick={() => openPanel({ kind: "combination" })}>Propiedades del armado</button><div className="flex flex-wrap gap-2"><button {...transientButtonProps} type="button" disabled={busy} onClick={() => { setCombinationMode(null); setError(null); }} className={adminSecondaryButtonClass}>Cancelar armado</button><button {...transientButtonProps} type="button" disabled={busy} onClick={applyCombination} className={adminPrimaryButtonClass}>Aplicar armado</button></div></aside>}
    <nav ref={toolbar} aria-label="Herramientas del editor" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-1/2 z-30 grid w-[calc(100%_-_1.5rem)] max-w-lg -translate-x-1/2 grid-cols-3 items-center gap-1.5 md:flex md:w-max md:max-w-[calc(100%_-_1.5rem)]">{toolLabels.map((label, index) => { const Icon = toolIcons[index]; return <button key={label} {...transientButtonProps} ref={(element) => { toolButtons.current[index] = element; }} type="button" aria-label={label} title={label} aria-haspopup={index === 1 || index === 2 || index === 5 ? "dialog" : undefined} aria-expanded={index === 0 ? flyout === "rooms" : index === 3 ? flyout === "sectors" : index === 4 ? flyout === "elements" : panel?.kind === (index === 1 ? "dimensions" : index === 2 ? "inventory" : "settings")} disabled={!config || busy || (index !== 0 && !!combinationMode) || ((index === 1 || index === 2 || index === 3 || index === 4) && !draft)} onClick={() => { setSectorMenu(null); if (index === 0 || index === 3 || index === 4) { const next = index === 0 ? "rooms" : index === 3 ? "sectors" : "elements"; setFlyout((current) => current === next ? null : next); setPlacement(null); } else openPanel({ kind: index === 1 ? "dimensions" : index === 2 ? "inventory" : "settings" }); }} className="flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-white px-1 text-[10px] font-semibold text-[#263e23] shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors hover:bg-[#edf2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d5934] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:flex-row md:gap-2 md:px-3 md:text-xs lg:text-sm"><Icon size={18} /><span className="whitespace-nowrap">{label}</span></button>; })}
      {flyout && <div ref={flyoutSurface} className="absolute bottom-[calc(100%_+_0.75rem)] left-1/2 max-h-[min(26rem,calc(100dvh_-_7rem))] w-[min(21rem,calc(100vw_-_1.5rem))] -translate-x-1/2 overflow-y-auto rounded-xl bg-white p-3 shadow-[0_6px_28px_-8px_rgba(24,38,24,0.24)] lg:left-0 lg:translate-x-0">
        {flyout === "rooms" && <nav aria-label="Salones del restaurante" className="space-y-1">{config?.rooms.map((room) => <button key={room.id} {...transientButtonProps} type="button" aria-pressed={draft?.id === room.id} onClick={() => selectRoom(room)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm hover:bg-[#edf2e9]"><span>{room.name}{!room.active && " · Archivado"}</span>{draft?.id === room.id && <Check size={16} />}</button>)}<button {...transientButtonProps} type="button" onClick={createRoom} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#2d4628] hover:bg-[#edf2e9]"><Plus size={16} />Nuevo salón</button></nav>}
        {flyout === "sectors" && <nav aria-label="Sectores del salón" className="space-y-1"><button {...transientButtonProps} type="button" onClick={() => { beginPlacement("sector"); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-[#edf2e9]"><Plus size={16} />Nuevo sector</button>{draft?.locations.map((location) => <button key={location.id} {...transientButtonProps} type="button" aria-pressed={selection?.id === location.id} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); openSectorMenu(location.id, { x: rect.left, y: rect.bottom }); }} onContextMenu={(event) => { event.preventDefault(); openSectorMenu(location.id, { x: event.clientX, y: event.clientY }); }} onKeyDown={(event) => { if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); openSectorMenu(location.id, { x: rect.left, y: rect.bottom }); } }} className="min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-[#edf2e9]">{location.name}{!location.active && " · Archivado"}</button>)}</nav>}
        {flyout === "elements" && <nav aria-label="Elementos del salón" className="space-y-1">{([['WALL', 'Pared'], ['BAR', 'Barra'], ['LABEL', 'Texto']] as const).map(([type, label]) => <button key={type} {...transientButtonProps} type="button" onClick={() => { beginPlacement(type); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-[#edf2e9]"><Plus size={16} />{label}</button>)}{draft?.fixtures.map((fixture, index) => <button key={fixture.id} {...transientButtonProps} type="button" onClick={() => { setSelection({ kind: "fixture", id: fixture.id }); setFlyout(null); }} className="min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-[#edf2e9]">{fixture.label || `${fixture.type === "WALL" ? "Pared" : "Elemento"} ${index + 1}`}</button>)}</nav>}
      </div>}
    </nav>
    <AdminModal open={panel !== null && panel.kind !== "confirm"} title={title} onClose={closePanel} wide={panel?.kind === "inventory" || panel?.kind === "combination"}>
      <div ref={panelSurface} tabIndex={-1} className="outline-none">
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {draft && panel?.kind === "dimensions" && <RoomDimensionsForm key={draft.id} room={draft} busy={busy} saved={!!config?.rooms.some((room) => room.id === draft.id)} onApply={(fields) => applyRoom({ ...draft, ...fields }, closePanel)} onArchive={archiveRoom} onCancel={closePanel} />}
      {draft && panel?.kind === "inventory" && <InventoryForm room={draft} onAdd={addStock} onEditTable={(id) => openPanel({ kind: "table", id })} onEditCombination={(id) => { const combination = draft.combinations.find((item) => item.id === id); if (combination) startCombination(combination); }} onCreateCombination={createCombination} onClose={closePanel} />}
      {draft && panel?.kind === "table" && draft.tables.some((table) => table.id === panel.id) && <TablePropertiesForm key={panel.id} table={draft.tables.find((table) => table.id === panel.id)!} onApply={(table) => applyRoom({ ...draft, tables: draft.tables.map((item) => item.id === table.id ? table : item) }, () => setPanel({ kind: "inventory" }))} onCancel={() => setPanel({ kind: "inventory" })} />}
      {draft && panel?.kind === "sector" && <SpatialPropertiesForm key={panel.entity.id} kind="sector" entity={panel.entity} onApply={(entity) => { const location = entity as FloorLocation; return applyRoom({ ...draft, locations: draft.locations.some((item) => item.id === location.id) ? draft.locations.map((item) => item.id === location.id ? location : item) : [...draft.locations, location] }, () => { setSelection({ kind: "sector", id: location.id }); closePanel(); }); }} onCancel={closePanel} />}
      {draft && panel?.kind === "fixture" && <SpatialPropertiesForm key={panel.entity.id} kind="fixture" entity={panel.entity} onApply={(entity) => { const fixture = entity as FloorFixture; return applyRoom({ ...draft, fixtures: draft.fixtures.some((item) => item.id === fixture.id) ? draft.fixtures.map((item) => item.id === fixture.id ? fixture : item) : [...draft.fixtures, fixture] }, () => { setSelection({ kind: "fixture", id: fixture.id }); closePanel(); }); }} onCancel={closePanel} />}
      {draft && combinationMode && panel?.kind === "combination" && <CombinationPropertiesForm key={combinationMode.combination.id} room={draft} combination={combinationMode.combination} onApply={(combination) => { const next = { ...draft, combinations: [...draft.combinations.filter((item) => item.id !== combination.id), combination] }; const invalid = roomError(next); if (invalid) return invalid; setCombinationMode((current) => current ? { ...current, combination } : null); closePanel(); return null; }} onCancel={closePanel} />}
      {config && panel?.kind === "settings" && <FloorSettingsForm config={config} dirty={hasUnsaved} busy={busy} onAction={configurationAction} onDisableStaff={() => setPanel({ kind: "confirm", title: "Desactivar cuenta de sala", description: "Se cerrarán sus sesiones y el personal dejará de acceder con esta cuenta. Las asignaciones se conservarán.", confirmLabel: "Desactivar cuenta", cancelTo: { kind: "settings" }, run: async () => { if (await configurationAction({ action: "disable-staff" }, "Cuenta de sala desactivada.")) setPanel({ kind: "settings" }); } })} />}
      </div>
    </AdminModal>
    {panel?.kind === "confirm" && <AdminConfirmModal open title={panel.title} description={panel.description} confirmLabel={panel.confirmLabel} loading={busy} onClose={() => { if (!busy) setPanel(panel.cancelTo ?? null); }} onConfirm={panel.run}>{error && <p role="alert" className="mb-4 text-sm text-red-800">{error}</p>}</AdminConfirmModal>}
  </main>;
}
