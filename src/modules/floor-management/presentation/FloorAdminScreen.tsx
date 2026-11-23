"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, type MouseEvent } from "react";
import { Building2, Check, LayoutGrid, Loader2, MapPin, Package, Pencil, Plus, RotateCw, Ruler, Save, Settings2, Shapes, Trash2, X } from "lucide-react";
import { AdminConfirmModal } from "@/ui/admin/AdminUI";
import { FloatingModalWindow } from "@/ui/FloatingModalWindow";
import { floorAdminWorkspace, floorConfigLoaded, floorRoomChanged, floorRoomPatched, floorAdminSeed, type EditorPanel, type EditorTool } from "./floor-workspaces";
import { useFloatingWindows } from "@/ui/useFloatingWindows";
import { useRegisterAdminNavigationGuard } from "@/ui/admin/AdminNavigationGuard";
import { transientButtonProps } from "@/ui/button-state";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { floorRoomInputSchema, validateRoomLayout, type FloorConfigView, type FloorFixture, type FloorLocation, type FloorRoom, type FloorRotation, type FloorTable } from "../contracts";
import { FloorCanvas, type FloorCanvasElement } from "./FloorCanvas";
import { FloorSectorContextMenu } from "./FloorSectorContextMenu";
import { FloorSettingsForm, RoomDimensionsForm, RoomTablesPanel, SpatialPropertiesForm, TablePropertiesForm, type FixedTablePreset } from "./FloorAdminForms";
import { getFloorConfig, saveFloorAction } from "./floor-api";

type ConfirmPanel = { title: string; description: string; confirmLabel: string; run: () => void | Promise<void> };
type Flyout = "rooms" | "sectors" | "elements" | null;
const copy = <T,>(value: T): T => structuredClone(value);
const nextRotation = (rotation: number): FloorRotation => ((rotation + 90) % 360) as FloorRotation;
const defaultTablePreset: FixedTablePreset = { shape: "SQUARE", capacity: 4, width: 80, height: 80 };
const buttonBase = "flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d5934] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:px-3";
const floatingButton = `${buttonBase} bg-white text-[#263e23] hover:bg-[#edf2e9]`;
const editorToolButtonClass = "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d5934] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:gap-0.5 lg:flex-row lg:gap-2 lg:px-3 lg:text-sm";
const toolIcons = [Building2, Ruler, Package, MapPin, Shapes, Settings2];
const sideActionPosition = "absolute right-3 z-20 bottom-[calc(env(safe-area-inset-bottom,0px)+16.5rem)] sm:right-6 sm:bottom-[calc(env(safe-area-inset-bottom,0px)+13.75rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+8.75rem)]";
const toolLabels = ["Salones", "Medidas", "Mesas", "Sectores", "Elementos", "Configuración"];
const sameElement = (a: FloorCanvasElement, b: FloorCanvasElement) => a.kind === b.kind && a.id === b.id;

function uniqueName(base: string, existing: string[]) {
  if (!existing.includes(base)) return base;
  let suffix = 2; while (existing.includes(`${base} ${suffix}`)) suffix += 1;
  return `${base} ${suffix}`;
}
function nextTableLabel(tables: FloorTable[]): string {
  let maxNumber = 0;
  for (const table of tables) {
    const match = /^M(\d+)$/i.exec(table.label.trim());
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
  }
  return uniqueName(`M${maxNumber + 1}`, tables.map((table) => table.label));
}
function roomError(room: FloorRoom): string | null {
  const result = floorRoomInputSchema.safeParse(room);
  return result.success ? validateRoomLayout(result.data) : result.error.issues[0]?.message ?? "Revisá los datos del salón.";
}
function findOpenTableSlot(
  room: FloorRoom,
  sector: FloorLocation,
  spec: Pick<FloorTable, "width" | "height" | "shape" | "rotation">,
  excludeTableId?: string,
  preferredPoint?: { x: number; y: number },
): { x: number; y: number } | null {
  const candidates: { x: number; y: number }[] = [];
  if (preferredPoint) candidates.push({ x: Math.round(preferredPoint.x), y: Math.round(preferredPoint.y) });
  const rad = (sector.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const halfW = sector.width / 2;
  const halfH = sector.height / 2;
  const effW = spec.shape === "CIRCLE" ? spec.width : Math.abs(Math.cos((spec.rotation * Math.PI) / 180)) * spec.width + Math.abs(Math.sin((spec.rotation * Math.PI) / 180)) * spec.height;
  const effH = spec.shape === "CIRCLE" ? spec.width : Math.abs(Math.sin((spec.rotation * Math.PI) / 180)) * spec.width + Math.abs(Math.cos((spec.rotation * Math.PI) / 180)) * spec.height;
  const padX = effW / 2 + 4;
  const padY = effH / 2 + 4;
  const step = 20;
  for (let ly = -halfH + padY; ly <= halfH - padY + 0.01; ly += step) {
    for (let lx = -halfW + padX; lx <= halfW - padX + 0.01; lx += step) {
      candidates.push({
        x: Math.round(sector.x + lx * cos - ly * sin),
        y: Math.round(sector.y + lx * sin + ly * cos),
      });
    }
  }
  const baseTables = room.tables.filter((table) => table.id !== excludeTableId);
  for (const point of candidates) {
    const probe: FloorTable = {
      id: excludeTableId ?? "probe-table",
      label: "__probe__",
      capacity: 4,
      shape: spec.shape,
      x: point.x,
      y: point.y,
      width: spec.width,
      height: spec.shape === "RECTANGLE" ? spec.height : spec.width,
      rotation: spec.rotation,
      active: true,
      locationId: sector.id,
    };
    if (!roomError({ ...room, tables: [...baseTables, probe] })) return point;
  }
  return null;
}
function toolId(panel: EditorPanel): string {
  return panel.kind === "sector" || panel.kind === "fixture" ? `${panel.kind}:${panel.entity.id}`
    : panel.kind === "table" ? `${panel.kind}:${panel.id}` : panel.kind;
}
function toolTitle(panel: EditorPanel): string {
  return panel.kind === "dimensions" ? "Medidas del salón" : panel.kind === "tables" ? "Mesas y cupos por sector" : panel.kind === "table" ? "Propiedades de la mesa" : panel.kind === "sector" ? "Propiedades del sector" : panel.kind === "fixture" ? "Propiedades del elemento" : "Configuración del restaurante";
}

function baseline(panel: EditorPanel, room: FloorRoom | null): unknown {
  if (!room) return undefined;
  if (panel.kind === "dimensions") return { name: room.name, width: room.width, height: room.height, active: room.active };
  if (panel.kind === "sector") return room.locations.find((item) => item.id === panel.entity.id);
  if (panel.kind === "fixture") return room.fixtures.find((item) => item.id === panel.entity.id);
  if (panel.kind === "table") return room.tables.find((item) => item.id === panel.id);
  return undefined;
}

export function FloorAdminScreen({ restaurantId, initialConfig }: { restaurantId: string; initialConfig?: FloorConfigView | null }) {
  return (
    <floorAdminWorkspace.Provider key={restaurantId} seed={floorAdminSeed(initialConfig)}>
      <FloorAdminContent restaurantId={restaurantId} />
    </floorAdminWorkspace.Provider>
  );
}

function FloorAdminContent({ restaurantId }: { restaurantId: string }) {
  const store = floorAdminWorkspace.useStore();
  const router = useRouter();
  const [config] = floorAdminWorkspace.useField("config");
  const [draft] = floorAdminWorkspace.useField("draft");
  const [dirty] = floorAdminWorkspace.useField("dirty");
  const [busy, setBusy] = floorAdminWorkspace.useField("busy");
  const [error, setError] = floorAdminWorkspace.useField("error");
  const [notice] = floorAdminWorkspace.useField("notice");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const tools = useFloatingWindows(floorAdminWorkspace.useField("windows"));
  const [confirmation, setConfirmation] = useState<ConfirmPanel | null>(null);
  const [editedTools, setEditedTools] = floorAdminWorkspace.useField("editedTools");
  const [flyout, setFlyout] = useState<Flyout>(null);
  const [placement, setPlacement] = floorAdminWorkspace.useField("placement");
  const [selectedElements, setSelectedElements] = floorAdminWorkspace.useField("selectedElements");
  const selection = selectedElements.length === 1 ? selectedElements[0] : null;
  const [sectorMenu, setSectorMenu] = useState<{ id: string; point: { x: number; y: number } } | null>(null);
  const toolbar = useRef<HTMLElement>(null);
  const flyoutSurface = useRef<HTMLDivElement>(null);
  const toolSurfaces = useRef(new Map<string, HTMLDivElement>());
  const toolButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const windowsRef = useRef(tools.windows);
  const hasPendingRoomChanges = dirty;
  const hasUnsaved = hasPendingRoomChanges || Object.keys(editedTools).length > 0;
  const interactive = !busy && !confirmation && !tools.windows.some((entry) => entry.visible && ["sector", "fixture"].includes(entry.value.panel.kind));
  const activationKey = tools.windows.map((entry) => `${entry.id}:${entry.visible}:${entry.activation}`).join("|");
  const roomHref = `/floor?restaurantId=${encodeURIComponent(restaurantId)}`;

  useEffect(() => {
    if (loadAttempt === 0 && store.getState().config) return;
    const controller = new AbortController();
    void getFloorConfig(restaurantId, controller.signal).then((value) => {
      if (controller.signal.aborted) return;
      store.dispatch(floorConfigLoaded({ config: value, room: value.rooms[0] ?? null }));
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "No se pudieron cargar los salones."); });
    return () => controller.abort();
  }, [restaurantId, loadAttempt, store, setError]);
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
    windowsRef.current = tools.windows;
  }, [tools.windows]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const latest = windowsRef.current.filter((entry) => entry.visible).sort((a, b) => b.zIndex - a.zIndex)[0];
      const surface = latest && toolSurfaces.current.get(latest.id);
      (surface?.querySelector<HTMLElement>("input:not([disabled]),select:not([disabled]),button:not([disabled])") ?? surface)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activationKey]);

  const patch = (next: FloorRoom) => { setSectorMenu(null); store.dispatch(floorRoomPatched(next)); };
  const setSelection = (element: FloorCanvasElement | null) => setSelectedElements(element ? [element] : []);
  const selectCanvasElement = (element: FloorCanvasElement, additive = false) => {
    setSectorMenu(null);
    setFlyout(null);
    if (!additive) { setSelection(element); return; }
    setSelectedElements((current) => current.some((item) => sameElement(item, element))
      ? current.filter((item) => !sameElement(item, element))
      : [...current, element]);
  };
  const selectCanvasElements = (elements: FloorCanvasElement[], additive: boolean) => {
    setSectorMenu(null);
    setFlyout(null);
    setSelectedElements((current) => additive
      ? [...current, ...elements.filter((element) => !current.some((item) => sameElement(item, element)))]
      : elements);
  };
  const moveCanvasElement = (element: FloorCanvasElement, point: { x: number; y: number }) => {
    if (!draft || !interactive || placement) return;
    const anchor = (element.kind === "sector" ? draft.locations : element.kind === "fixture" ? draft.fixtures : draft.tables).find((item) => item.id === element.id);
    if (!anchor) return;
    const dx = point.x - anchor.x;
    const dy = point.y - anchor.y;
    if (!dx && !dy) return;
    const moving = selectedElements.some((item) => sameElement(item, element)) ? selectedElements : [element];
    const movedSectorIds = new Set(moving.filter((item) => item.kind === "sector").map((item) => item.id));
    const move = <T extends { id: string; x: number; y: number }>(item: T, kind: FloorCanvasElement["kind"]): T =>
      moving.some((selected) => selected.kind === kind && selected.id === item.id) ? { ...item, x: item.x + dx, y: item.y + dy } : item;
    const next: FloorRoom = {
      ...draft,
      locations: draft.locations.map((item) => move(item, "sector")),
      fixtures: draft.fixtures.map((item) => move(item, "fixture")),
      tables: draft.tables.map((table) => {
        if (table.locationId && movedSectorIds.has(table.locationId)) {
          return { ...table, x: table.x + dx, y: table.y + dy };
        }
        return move(table, "table");
      }),
    };
    if (moving.length === 1 && element.kind !== "table") { patch(next); return; }
    const invalid = roomError(next);
    if (invalid) setError(invalid);
    else patch(next);
  };
  const moveTables = (ids: string[], delta: { x: number; y: number }) => {
    if (!draft || !interactive || placement || (!delta.x && !delta.y)) return;
    const next: FloorRoom = {
      ...draft,
      tables: draft.tables.map((table) => ids.includes(table.id) ? { ...table, x: table.x + delta.x, y: table.y + delta.y } : table),
    };
    const invalid = roomError(next);
    if (invalid) setError(invalid);
    else patch(next);
  };
  const resetInteraction = () => { setSectorMenu(null); setSelection(null); setPlacement(null); setFlyout(null); tools.clear(); setEditedTools({}); setConfirmation(null); setError(null); };
  const clearToolEdit = (id: string) => setEditedTools((previous) => { if (!previous[id]) return previous; const next = { ...previous }; delete next[id]; return next; });
  const closeTool = (id: string) => { if (!busy) { tools.close(id); clearToolEdit(id); } };
  const markToolEdit = (id: string) => setEditedTools((previous) => previous[id] ? previous : { ...previous, [id]: true });
  const staleTool = (value: EditorTool): string | null => {
    if (!draft || value.roomId !== draft.id) return "El salón de esta ventana cambió. Cancelá y volvé a abrir la herramienta.";
    if (JSON.stringify(baseline(value.panel, draft)) !== JSON.stringify(value.baseline)) return "Estos datos cambiaron en otra herramienta. Cancelá y volvé a abrir las propiedades antes de aplicar.";
    return null;
  };
  const discardBefore = (run: () => void) => {
    if (busy) return;
    setFlyout(null); setSectorMenu(null);
    if (!hasUnsaved) { run(); return; }
    setConfirmation({ title: "Descartar cambios sin guardar", description: "Los cambios del plano y el armado que estás editando se perderán. Podés cancelar y guardar antes de continuar.", confirmLabel: "Descartar y continuar", run: () => { setConfirmation(null); run(); } });
  };
  useRegisterAdminNavigationGuard(discardBefore);
  const selectRoom = (room: FloorRoom) => {
    if (room.id === draft?.id) { setFlyout(null); return; }
    discardBefore(() => changeRoom(room, false));
  };
  const changeRoom = (room: FloorRoom, dirty: boolean) => {
    setSectorMenu(null);
    setFlyout(null);
    setConfirmation(null);
    store.dispatch(floorRoomChanged({ room, dirty }));
  };
  const createRoom = () => discardBefore(() => {
    const name = uniqueName("Nuevo salón", config?.rooms.map((room) => room.name) ?? []);
    const next: FloorRoom = { id: crypto.randomUUID(), restaurantId, name, width: 2000, height: 2000, active: true, revision: 0, fixtures: [], locations: [], tables: [], combinations: [] };
    changeRoom(next, true); openPanel({ kind: "dimensions" }, next);
  });
  const guardLink = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (busy || hasUnsaved) { event.preventDefault(); if (!busy) discardBefore(() => router.push(href)); }
  };
  const mutate = async (body: unknown, message: string, roomAction = false): Promise<boolean> => {
    const snapshot = store.getState();
    if (snapshot.busy) return false;
    setSectorMenu(null);
    store.dispatch(floorAdminWorkspace.changed({ busy: true, error: null, notice: null }));
    try {
      const next = await saveFloorAction(restaurantId, body);
      const update: Partial<ReturnType<typeof floorAdminSeed>> = { config: next, notice: message };
      if (roomAction || !snapshot.dirty) {
        const room = next.rooms.find((item) => item.id === snapshot.draft?.id) ?? next.rooms[0];
        if (room?.id !== snapshot.draft?.id) resetInteraction();
        update.draft = room ?? null;
        if (roomAction) update.dirty = false;
      }
      store.dispatch(floorAdminWorkspace.changed(update));
      return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo guardar. Conservamos tus cambios para volver a intentar."); return false; }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!draft || busy) return;
    const invalid = roomError(draft); if (invalid) { setError(invalid); return; }
    const { id, name, width, height, fixtures, locations, active, tables } = draft;
    await mutate({ action: "save-room", room: { id, name, width, height, fixtures, locations, active, tables, combinations: [] }, expectedRevision: draft.revision }, "Plano y mesas guardados.", true);
  };
  const applyRoom = (next: FloorRoom, then?: () => void): string | null => {
    if (busy) return "Esperá a que termine de guardar.";
    const invalid = roomError(next); if (invalid) return invalid;
    patch(next); then?.(); return null;
  };
  function openPanel(next: EditorPanel, room = draft) {
    if (busy) return;
    setSectorMenu(null); setError(null); setFlyout(null); setPlacement(null);
    tools.open(toolId(next), { panel: copy(next), roomId: room?.id ?? null, baseline: copy(baseline(next, room)) });
  }
  const openSectorMenu = (id: string, point: { x: number; y: number }) => {
    if (busy || confirmation || placement) return;
    toolButtons.current[3]?.focus();
    setSelection({ kind: "sector", id }); setSectorMenu({ id, point }); setFlyout(null);
  };
  const beginPlacement = (kind: NonNullable<typeof placement>) => {
    if (!draft || busy) return;
    setSectorMenu(null); setPlacement(kind); setSelection(null); setFlyout(null); setError(null);
  };
  const resizeSector = (id: string, geometry: Pick<FloorLocation, "x" | "y" | "width" | "height">) => {
    if (!draft || !interactive || placement || !draft.locations.some((location) => location.id === id)) return;
    const invalid = applyRoom({ ...draft, locations: draft.locations.map((location) => location.id === id ? { ...location, ...geometry } : location) });
    if (invalid) setError(invalid);
  };
  const addTableInSector = (locationId: string, preset: FixedTablePreset, preferredPoint?: { x: number; y: number }): string | null => {
    if (!draft || busy) return "Esperá a que termine de guardar.";
    const sector = draft.locations.find((item) => item.id === locationId && item.active);
    if (!sector) return "Elegí un sector activo para ubicar la mesa.";
    if (draft.tables.length >= 200) return "El salón admite hasta 200 mesas.";
    const sectorTableCount = draft.tables.filter((item) => item.active && item.locationId === sector.id).length;
    if (sector.maxTables != null && sectorTableCount >= sector.maxTables) {
      return `El sector ${sector.name} alcanzó su cupo máximo de ${sector.maxTables} mesas.`;
    }
    const width = Math.max(20, Math.min(2000, Math.round(preset.width)));
    const height = preset.shape === "RECTANGLE" ? Math.max(20, Math.min(2000, Math.round(preset.height))) : width;
    const slot = findOpenTableSlot(draft, sector, { width, height, shape: preset.shape, rotation: 0 }, undefined, preferredPoint);
    if (!slot) return `No hay espacio libre en ${sector.name} para una mesa de ${width}×${height}. Ampliá el sector o achicá la mesa.`;
    const created: FloorTable = {
      id: crypto.randomUUID(),
      label: nextTableLabel(draft.tables),
      capacity: Math.max(1, Math.min(100, Math.round(preset.capacity))),
      shape: preset.shape,
      x: slot.x,
      y: slot.y,
      width,
      height,
      rotation: 0,
      active: true,
      locationId: sector.id,
    };
    return applyRoom({ ...draft, tables: [...draft.tables, created] }, () => {
      setPlacement(null);
      setSelection({ kind: "table", id: created.id });
    });
  };
  const assignUnlocatedTable = (tableId: string, locationId: string): string | null => {
    if (!draft || busy) return "Esperá a que termine de guardar.";
    const table = draft.tables.find((item) => item.id === tableId);
    const sector = draft.locations.find((item) => item.id === locationId && item.active);
    if (!table || !sector) return "Elegí una mesa y un sector activo.";
    const sectorTableCount = draft.tables.filter((item) => item.active && item.locationId === sector.id && item.id !== table.id).length;
    if (sector.maxTables != null && sectorTableCount >= sector.maxTables) {
      return `El sector ${sector.name} alcanzó su cupo máximo de ${sector.maxTables} mesas.`;
    }
    const slot = findOpenTableSlot(draft, sector, table, table.id);
    if (!slot) return `No hay espacio libre en ${sector.name} para ubicar ${table.label}. Ampliá el sector o editá la mesa.`;
    return applyRoom({
      ...draft,
      tables: draft.tables.map((item) => item.id === table.id ? { ...item, locationId: sector.id, x: slot.x, y: slot.y, active: true } : item),
    }, () => setSelection({ kind: "table", id: table.id }));
  };
  const place = (point: { x: number; y: number }, locationId?: string) => {
    if (!draft || !placement || busy || confirmation) return;
    const x = point.x; const y = point.y;
    if (placement === "sector") {
      const width = Math.min(360, draft.width); const height = Math.min(260, draft.height);
      openPanel({ kind: "sector", entity: { id: crypto.randomUUID(), name: uniqueName("Sector", draft.locations.map((item) => item.name)), width, height, x: Math.max(width / 2, Math.min(draft.width - width / 2, x)), y: Math.max(height / 2, Math.min(draft.height - height / 2, y)), rotation: 0, active: true } });
    } else if (placement === "table") {
      if (!locationId) {
        setError("Tocá dentro de un sector activo para dibujar la mesa.");
        return;
      }
      const problem = addTableInSector(locationId, defaultTablePreset, { x, y });
      if (problem) setError(problem);
    } else {
      const type = placement; const width = Math.min(type === "LABEL" ? 160 : 200, draft.width); const height = Math.min(type === "WALL" ? 12 : type === "BAR" ? 60 : 32, draft.height);
      openPanel({ kind: "fixture", entity: { id: crypto.randomUUID(), type, label: type === "BAR" ? "Barra" : type === "LABEL" ? "Entrada" : "", width, height, x: Math.max(width / 2, Math.min(draft.width - width / 2, x)), y: Math.max(height / 2, Math.min(draft.height - height / 2, y)), rotation: 0 } });
    }
  };
  const selectedSector = selection?.kind === "sector" ? draft?.locations.find((item) => item.id === selection.id) : undefined;
  const selectedFixture = selection?.kind === "fixture" ? draft?.fixtures.find((item) => item.id === selection.id) : undefined;
  const selectedTable = selection?.kind === "table" ? draft?.tables.find((item) => item.id === selection.id) : undefined;
  const selectedLabel = selectedSector?.name ?? selectedFixture?.label ?? selectedTable?.label ?? "";
  const editSelection = () => {
    if (selectedSector) openPanel({ kind: "sector", entity: copy(selectedSector) });
    else if (selectedFixture) openPanel({ kind: "fixture", entity: copy(selectedFixture) });
    else if (selectedTable) openPanel({ kind: "table", id: selectedTable.id });
  };
  const rotateSelection = () => {
    if (!draft || busy) return;
    if (selectedSector) patch({ ...draft, locations: draft.locations.map((item) => item.id === selectedSector.id ? { ...item, rotation: nextRotation(item.rotation) } : item) });
    if (selectedFixture) patch({ ...draft, fixtures: draft.fixtures.map((item) => item.id === selectedFixture.id ? { ...item, rotation: nextRotation(item.rotation) } : item) });
    if (selectedTable) {
      const invalid = applyRoom({ ...draft, tables: draft.tables.map((item) => item.id === selectedTable.id ? { ...item, rotation: nextRotation(item.rotation) } : item) });
      if (invalid) setError(invalid);
    }
  };
  const removeSelection = () => {
    if (!draft || !selection || busy) return;
    const title = selectedSector ? "Archivar sector" : selectedTable ? "Archivar mesa" : "Eliminar elemento";
    setConfirmation({
      title,
      description: selectedSector
        ? "El sector se quitará del plano al guardar. Si tiene asignaciones vigentes o futuras, primero tendrás que reasignarlas."
        : selectedTable
          ? "La mesa se archivará al guardar cambios. Si tiene reservas o cuentas vigentes, reasignalas primero."
          : "El elemento se quitará del plano cuando guardes los cambios.",
      confirmLabel: title,
      run: () => {
        patch(selectedSector
          ? {
              ...draft,
              locations: draft.locations.map((item) => item.id === selection.id ? { ...item, active: false } : item),
              tables: draft.tables.map((item) => item.locationId === selection.id ? { ...item, active: false } : item),
            }
          : selectedTable
            ? { ...draft, tables: draft.tables.map((item) => item.id === selection.id ? { ...item, active: false } : item) }
            : { ...draft, fixtures: draft.fixtures.filter((item) => item.id !== selection.id) });
        setSelection(null);
        setConfirmation(null);
      },
    });
  };
  const archiveRoom = () => {
    if (!draft || busy) return;
    setError(null);
    setConfirmation({ title: "Archivar salón", description: `${hasUnsaved ? "Se descartarán los cambios sin guardar de este salón. " : ""}No se podrá archivar si tiene asignaciones futuras comprometidas.`, confirmLabel: "Archivar salón", run: async () => { if (await mutate({ action: "archive-room", roomId: draft.id, expectedRevision: draft.revision }, "Salón archivado.", true)) { setConfirmation(null); setSelection(null); } } });
  };
  const deleteRoom = (target: FloorRoom) => {
    if (busy) return;
    setFlyout(null);
    setSectorMenu(null);
    setError(null);
    const saved = Boolean(config?.rooms.some((item) => item.id === target.id));
    if (!saved) {
      setConfirmation({
        title: "Descartar salón sin guardar",
        description: "Se descartará el borrador de este salón que todavía no fue guardado.",
        confirmLabel: "Descartar salón",
        run: () => {
          resetInteraction();
          store.dispatch(floorAdminWorkspace.changed({
            draft: config?.rooms[0] ?? null,
            dirty: false,
            notice: "Borrador de salón descartado.",
          }));
        },
      });
      return;
    }
    const isCurrent = target.id === draft?.id;
    setConfirmation({
      title: "Eliminar salón",
      description: `${isCurrent && hasUnsaved ? "Se descartarán los cambios sin guardar de este salón. " : ""}Se eliminará «${target.name}» junto con sus sectores y mesas fijas. Si tiene historial de reservas o cuentas, el sistema impedirá borrarlo y podrás archivarlo.`,
      confirmLabel: "Eliminar salón",
      run: async () => {
        if (await mutate({ action: "delete-room", roomId: target.id, expectedRevision: target.revision }, "Salón eliminado.", isCurrent)) {
          setConfirmation(null);
          if (isCurrent) setSelection(null);
        }
      },
    });
  };
  const configurationAction = async (body: unknown, message: string) => {
    if (hasPendingRoomChanges) { setError("Guardá el plano antes de modificar la configuración."); return false; }
    return mutate(body, message);
  };
  const activeSectors = draft?.locations.filter((location) => location.active) ?? [];
  const canvasTables = draft ? draft.tables.filter((table) => table.active && Boolean(table.locationId)).map((table) => ({
    ...table,
    subtitle: `${table.capacity}p`,
  })) : [];
  const editorLocations = draft ? draft.locations.filter((location) => location.active).map((location) => {
    const placedCount = draft.tables.filter((table) => table.active && table.locationId === location.id).length;
    const quotaParts = [
      location.maxTables != null ? `${placedCount}/${location.maxTables}m` : `${placedCount}m`,
      location.maxCapacity != null ? `Cupo ${location.maxCapacity}p` : null,
    ].filter(Boolean);
    return { ...location, quotaLabel: quotaParts.join(" · ") };
  }) : [];
  const canSelectPlan = interactive && !placement;
  const selectionCount = selectedElements.length;
  let status = "Preparando el plano…";
  if (placement) {
    const target = placement === "sector" ? "el sector" : placement === "table" ? "la mesa dentro de un sector" : placement === "WALL" ? "la pared" : placement === "BAR" ? "la barra" : "el texto";
    status = "Tocá dentro del salón para ubicar " + target + ".";
  } else if (selectionCount > 1) {
    status = selectionCount + " elementos seleccionados. Arrastrá uno para moverlos juntos.";
  } else if (hasUnsaved) {
    status = "Cambios sin guardar";
  } else if (selectedSector) {
    status = "Arrastrá los bordes o esquinas para ajustar el sector, o arrastralo para mover sector y mesas.";
  } else if (selectedTable) {
    status = `Mesa ${selectedTable.label} seleccionada. Arrastrala dentro del sector o abrí editar.`;
  } else if (draft) {
    status = "Dibujá sectores con su cupo y ubicá sus mesas fijas adentro.";
  }
  return <main data-admin-panel className={`fixed inset-y-0 left-16 right-0 isolate h-dvh overflow-hidden bg-[#f5f2e9] text-zinc-950 selection:bg-[#d6e8d4] ${confirmation ? "z-50" : ""}`}>
    <h1 className="sr-only">Editor de salones · {config?.restaurantName ?? "Restaurante"}</h1>
    <div role="region" aria-label="Editor del salón" className="absolute inset-0">
      {draft && <FloorCanvas
        key={draft.id} fullScreen editorMode grid
        room={{ ...draft, locations: editorLocations }}
        tables={canvasTables}
        selectedIds={selectedElements.filter((item) => item.kind === "table").map((item) => item.id)}
        selectedElements={selectedElements}
        selectedLocationId={selectedSector?.id}
        selectedFixtureId={selectedFixture?.id}
        draggableIds={canSelectPlan ? canvasTables.map((table) => table.id) : []}
        onSelect={canSelectPlan ? (id, additive) => selectCanvasElement({ kind: "table", id }, additive) : undefined}
        onMove={canSelectPlan ? moveTables : undefined}
        onClearSelection={canSelectPlan ? () => selectCanvasElements([], false) : undefined}
        onSelectElements={canSelectPlan ? selectCanvasElements : undefined}
        onPlace={!busy && !confirmation && placement ? place : undefined}
        onSelectLocation={canSelectPlan ? (id, additive) => selectCanvasElement({ kind: "sector", id }, additive) : undefined}
        onContextMenuLocation={canSelectPlan ? openSectorMenu : undefined}
        onResizeLocation={canSelectPlan ? resizeSector : undefined}
        onMoveLocation={canSelectPlan ? (id, point) => moveCanvasElement({ kind: "sector", id }, point) : undefined}
        onSelectFixture={canSelectPlan ? (id, additive) => selectCanvasElement({ kind: "fixture", id }, additive) : undefined}
        onMoveFixture={canSelectPlan ? (id, point) => moveCanvasElement({ kind: "fixture", id }, point) : undefined}
      />}
    </div>
    {!draft && <div className="absolute inset-0 grid place-items-center p-6"><div className="max-w-sm text-center"><Building2 size={30} className="mx-auto mb-4 text-[#607054]" /><h2 className="text-lg font-semibold">{config ? "Creá tu primer salón" : "Cargando salones…"}</h2><p className="mt-2 text-sm leading-relaxed text-[#52634b]">{config ? "Definí las medidas, dibujá los sectores con sus cupos y ubicá las mesas fijas." : "Preparando el editor del restaurante."}</p>{config && <button {...transientButtonProps} type="button" disabled={busy} onClick={createRoom} className={`${adminPrimaryButtonClass} mt-5`}><Plus size={16} />Crear salón</button>}</div></div>}
    <header className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top,0px))] z-10 flex items-start justify-between gap-3 px-3 sm:px-6"><div className="pointer-events-auto flex min-w-0 items-start gap-2"><div className="min-w-0 rounded-xl bg-white px-3 py-2 shadow-[0_3px_16px_rgba(24,38,24,0.12)]"><p className="max-w-[32vw] truncate text-[11px] text-[#52634b] sm:max-w-64">{config?.restaurantName ?? "Restaurante"}</p><p className="max-w-[32vw] truncate text-sm font-semibold text-[#263e23] sm:max-w-64">{draft?.name ?? "Salones"}{draft && !draft.active && " · Archivado"}</p></div></div><div className="pointer-events-auto flex shrink-0 gap-2"><Link href={roomHref} aria-label="Ver sala" title="Ver sala" aria-disabled={busy || undefined} onClick={(event) => guardLink(event, roomHref)} className={floatingButton}><LayoutGrid size={18} /><span className="hidden lg:inline">Ver sala</span></Link><button {...transientButtonProps} type="button" aria-label="Guardar plano" title="Guardar plano" disabled={!draft || !dirty || busy} onClick={() => { void save(); }} className={`${buttonBase} bg-[#182618] text-white hover:bg-[#2d4628]`}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}<span className="hidden lg:inline">Guardar plano</span></button></div></header>
    <div className="pointer-events-none absolute left-3 right-3 top-[calc(max(1rem,env(safe-area-inset-top,0px))+4rem)] z-10 max-w-xl space-y-2 sm:left-6"><p role="status" className="w-fit rounded-lg bg-white px-3 py-2 text-xs text-[#46543e] shadow-[0_2px_10px_rgba(24,38,24,0.08)]">{status}</p>{error && <div role="alert" className="pointer-events-auto flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"><span>{error}</span>{!config ? <button {...transientButtonProps} type="button" onClick={() => setLoadAttempt((value) => value + 1)} className="font-semibold underline underline-offset-4">Reintentar</button> : <button {...transientButtonProps} type="button" aria-label="Cerrar error" onClick={() => setError(null)}><X size={16} /></button>}</div>}{notice && <p role="status" className="w-fit rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{notice}</p>}{placement && <button {...transientButtonProps} type="button" onClick={() => setPlacement(null)} className={`${adminSecondaryButtonClass} pointer-events-auto`}>Cancelar ubicación</button>}</div>
    {(selectedFixture || selectedTable) && <aside aria-label="Selección del plano" className={`${sideActionPosition} max-w-[calc(100%_-_6rem)] rounded-xl bg-white p-3 shadow-[0_6px_28px_-8px_rgba(24,38,24,0.24)]`}><p className="mb-2 truncate text-sm font-semibold">{selectedTable ? `${selectedTable.label} (${selectedTable.capacity}p)` : selectedLabel || (selectedFixture?.type === "WALL" ? "Pared" : "Elemento del salón")}</p><div className="flex flex-wrap gap-1"><button {...transientButtonProps} type="button" disabled={busy} onClick={editSelection} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-[#edf2e9]"><Pencil size={15} />Editar</button><button {...transientButtonProps} type="button" disabled={busy} onClick={rotateSelection} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-[#edf2e9]"><RotateCw size={15} />Girar</button><button {...transientButtonProps} type="button" disabled={busy} onClick={removeSelection} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 size={15} />{selectedTable ? "Archivar" : "Eliminar"}</button></div></aside>}
    {sectorMenu && selectedSector && !busy && !confirmation && !placement && <FloorSectorContextMenu name={selectedSector.name} point={sectorMenu.point} disabled={busy} onEdit={() => { setSectorMenu(null); editSelection(); }} onRotate={() => { setSectorMenu(null); rotateSelection(); }} onDelete={() => { setSectorMenu(null); removeSelection(); }} onAddTable={selectedSector.active ? () => { setSectorMenu(null); const problem = addTableInSector(selectedSector.id, defaultTablePreset); if (problem) setError(problem); } : undefined} onClose={() => setSectorMenu(null)} />}
    <nav ref={toolbar} aria-label="Herramientas del editor" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-1/2 z-30 grid w-[calc(100%_-_1.5rem)] max-w-lg -translate-x-1/2 grid-cols-4 items-center gap-1.5 md:max-w-3xl md:grid-cols-8 lg:flex lg:w-max lg:max-w-[calc(100%_-_1.5rem)]">
      {toolLabels.map((label, index) => {
        const Icon = toolIcons[index];
        const flyoutKind = index === 0 ? "rooms" : index === 3 ? "sectors" : index === 4 ? "elements" : null;
        const panelKind = index === 1 ? "dimensions" : index === 2 ? "tables" : "settings";
        return <Fragment key={label}>
          <button {...transientButtonProps} ref={(element) => { toolButtons.current[index] = element; }} type="button" aria-label={label} title={label}
            aria-haspopup={flyoutKind ? undefined : "dialog"}
            aria-expanded={flyoutKind ? flyout === flyoutKind : tools.isVisible(panelKind)}
            disabled={!config || busy || ((index >= 1 && index <= 4) && !draft)}
            onClick={() => {
              setSectorMenu(null);
              if (flyoutKind) {
                setFlyout((current) => current === flyoutKind ? null : flyoutKind);
                setPlacement(null);
              } else openPanel({ kind: panelKind });
            }}
            className={editorToolButtonClass + " bg-white text-[#263e23] hover:bg-[#edf2e9]"}>
            <Icon size={18} /><span className="leading-tight lg:whitespace-nowrap">{label}</span>
          </button>
          {index === 3 && <>
            <button {...transientButtonProps} type="button" disabled={!draft || busy || Boolean(placement)}
              onClick={() => beginPlacement("sector")} className={editorToolButtonClass + " bg-[#182618] text-white hover:bg-[#2d4628]"}>
              <Plus size={18} /><span className="leading-tight lg:whitespace-nowrap">Agregar sector</span>
            </button>
            <button {...transientButtonProps} type="button" disabled={!draft || busy || Boolean(placement) || !activeSectors.length}
              onClick={() => beginPlacement("table")} className={editorToolButtonClass + " bg-[#2d4628] text-white hover:bg-[#3d5934]"}>
              <Plus size={18} /><span className="leading-tight lg:whitespace-nowrap">Agregar mesa</span>
            </button>
          </>}
        </Fragment>;
      })}
      {flyout && <div ref={flyoutSurface} className="absolute bottom-[calc(100%_+_0.75rem)] left-1/2 max-h-[min(26rem,calc(100dvh_-_7rem))] w-[min(21rem,calc(100vw_-_1.5rem))] -translate-x-1/2 overflow-y-auto rounded-xl bg-white p-3 shadow-[0_6px_28px_-8px_rgba(24,38,24,0.24)] lg:left-0 lg:translate-x-0">
        {flyout === "rooms" && <nav aria-label="Salones del restaurante" className="space-y-1">{config?.rooms.map((room) => (
          <div key={room.id} className="flex items-center gap-1">
            <button {...transientButtonProps} type="button" aria-pressed={draft?.id === room.id} onClick={() => selectRoom(room)} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-3 text-left text-sm hover:bg-[#edf2e9]"><span className="truncate">{room.name}{!room.active && " · Archivado"}</span>{draft?.id === room.id && <Check size={16} className="shrink-0" />}</button>
            <button {...transientButtonProps} type="button" disabled={busy} aria-label={`Eliminar salón ${room.name}`} title={`Eliminar salón ${room.name}`} onClick={() => deleteRoom(room)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934] disabled:opacity-45"><Trash2 size={15} aria-hidden="true" /></button>
          </div>
        ))}<button {...transientButtonProps} type="button" onClick={createRoom} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#2d4628] hover:bg-[#edf2e9]"><Plus size={16} />Nuevo salón</button></nav>}
        {flyout === "sectors" && <nav aria-label="Sectores del salón" className="space-y-1"><button {...transientButtonProps} type="button" onClick={() => { beginPlacement("sector"); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-[#edf2e9]"><Plus size={16} />Nuevo sector</button>{draft?.locations.map((location) => <button key={location.id} {...transientButtonProps} type="button" aria-pressed={selectedElements.some((item) => item.kind === "sector" && item.id === location.id)} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); openSectorMenu(location.id, { x: rect.left, y: rect.bottom }); }} onContextMenu={(event) => { event.preventDefault(); openSectorMenu(location.id, { x: event.clientX, y: event.clientY }); }} onKeyDown={(event) => { if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); openSectorMenu(location.id, { x: rect.left, y: rect.bottom }); } }} className="min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-[#edf2e9]">{location.name}{!location.active && " · Archivado"}</button>)}</nav>}
        {flyout === "elements" && <nav aria-label="Elementos del salón" className="space-y-1">{([['WALL', 'Pared'], ['BAR', 'Barra'], ['LABEL', 'Texto']] as const).map(([type, label]) => <button key={type} {...transientButtonProps} type="button" onClick={() => { beginPlacement(type); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-[#edf2e9]"><Plus size={16} />{label}</button>)}{draft?.fixtures.map((fixture, index) => <button key={fixture.id} {...transientButtonProps} type="button" onClick={() => { setSelection({ kind: "fixture", id: fixture.id }); setFlyout(null); }} className="min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-[#edf2e9]">{fixture.label || `${fixture.type === "WALL" ? "Pared" : "Elemento"} ${index + 1}`}</button>)}</nav>}
      </div>}
    </nav>
    {tools.windows.map((entry) => {
      const value = entry.value;
      const pane = value.panel;
      const currentRoom = draft && draft.id === value.roomId ? draft : null;
      const title = toolTitle(pane);
      const finish = () => closeTool(entry.id);
      const check = () => staleTool(value);
      const table = pane.kind === "table" && currentRoom ? currentRoom.tables.find((item) => item.id === pane.id) ?? (value.baseline as FloorTable | undefined) : undefined;
      const icon = pane.kind === "tables" || pane.kind === "table" ? <Package size={17} className="text-[#3d5934]" /> : pane.kind === "settings" ? <Settings2 size={17} className="text-[#3d5934]" /> : pane.kind === "dimensions" ? <Ruler size={17} className="text-[#3d5934]" /> : <Shapes size={17} className="text-[#3d5934]" />;
      return <FloatingModalWindow key={entry.id} id={"room-tool-" + entry.id} title={title} subtitle={pane.kind === "sector" ? pane.entity.name : pane.kind === "fixture" ? pane.entity.label : pane.kind === "table" ? table?.label : currentRoom?.name ?? config?.restaurantName} icon={icon} role="dialog" ariaLabel={title} isOpen={entry.visible} activation={entry.activation} initialOffset={entry.offset} keepMounted onClose={() => closeTool(entry.id)} closeDisabled={busy} onFocus={() => tools.focus(entry.id)} initialAnchor="right" viewportInset={{ left: 64, bottom: 92 }} initialPosition={{ x: 80, y: 80 }} initialSize={{ width: 420, height: 480 }} minWidth={300} minHeight={240} zIndex={entry.zIndex}>
        <div ref={(element) => { if (element) toolSurfaces.current.set(entry.id, element); else toolSurfaces.current.delete(entry.id); }} tabIndex={-1} onChangeCapture={() => markToolEdit(entry.id)} className="flex min-h-0 flex-1 flex-col outline-none">
          <fieldset disabled={busy} className="flex min-h-0 min-w-0 flex-1 flex-col">
          {currentRoom && pane.kind === "dimensions" && <RoomDimensionsForm room={value.baseline ? { ...currentRoom, ...value.baseline as Pick<FloorRoom, "name" | "width" | "height" | "active"> } : currentRoom} busy={busy} saved={!!config?.rooms.some((room) => room.id === currentRoom.id)} onApply={(fields) => check() ?? applyRoom({ ...currentRoom, ...fields }, finish)} onArchive={archiveRoom} onDelete={() => deleteRoom(currentRoom)} onCancel={finish} />}
          {currentRoom && pane.kind === "tables" && (
            <RoomTablesPanel
              room={currentRoom}
              onAddTableInSector={(locationId, preset) => {
                const invalid = check() ?? addTableInSector(locationId, preset);
                if (!invalid) clearToolEdit(entry.id);
                return invalid;
              }}
              onAssignUnlocatedTable={(tableId, locationId) => {
                const invalid = check() ?? assignUnlocatedTable(tableId, locationId);
                if (!invalid) clearToolEdit(entry.id);
                return invalid;
              }}
              onEditTable={(id) => openPanel({ kind: "table", id })}
              onEditSector={(location) => openPanel({ kind: "sector", entity: copy(location) })}
              onClose={finish}
            />
          )}
          {currentRoom && pane.kind === "table" && table && (
            <TablePropertiesForm
              table={table}
              locations={currentRoom.locations}
              onApply={(next) => check() ?? applyRoom({ ...currentRoom, tables: currentRoom.tables.map((item) => item.id === next.id ? next : item) }, () => { setSelection({ kind: "table", id: next.id }); finish(); })}
              onArchive={() => {
                const invalid = check() ?? applyRoom({ ...currentRoom, tables: currentRoom.tables.map((item) => item.id === table.id ? { ...item, active: false } : item) }, () => { setSelection(null); finish(); });
                if (invalid) setError(invalid);
              }}
              onCancel={finish}
            />
          )}
          {currentRoom && pane.kind === "sector" && <SpatialPropertiesForm kind="sector" entity={pane.entity} placedTableCount={currentRoom.tables.filter((item) => item.active && item.locationId === pane.entity.id).length} onApply={(entity) => {
            const invalid = check(); if (invalid) return invalid;
            const location = entity as FloorLocation;
            return applyRoom({ ...currentRoom, locations: currentRoom.locations.some((item) => item.id === location.id) ? currentRoom.locations.map((item) => item.id === location.id ? location : item) : [...currentRoom.locations, location] }, () => { setSelection({ kind: "sector", id: location.id }); finish(); });
          }} onCancel={finish} />}
          {currentRoom && pane.kind === "fixture" && <SpatialPropertiesForm kind="fixture" entity={pane.entity} onApply={(entity) => {
            const invalid = check(); if (invalid) return invalid;
            const fixture = entity as FloorFixture;
            return applyRoom({ ...currentRoom, fixtures: currentRoom.fixtures.some((item) => item.id === fixture.id) ? currentRoom.fixtures.map((item) => item.id === fixture.id ? fixture : item) : [...currentRoom.fixtures, fixture] }, () => { setSelection({ kind: "fixture", id: fixture.id }); finish(); });
          }} onCancel={finish} />}
          {config && pane.kind === "settings" && <FloorSettingsForm config={config} dirty={hasPendingRoomChanges} busy={busy} onAction={async (body, message) => { const result = await configurationAction(body, message); if (result) clearToolEdit(entry.id); return result; }} onDisableStaff={() => setConfirmation({ title: "Desactivar cuenta de sala", description: "Se cerrarán sus sesiones y el personal dejará de acceder con esta cuenta. Las asignaciones se conservarán.", confirmLabel: "Desactivar cuenta", run: async () => { if (await configurationAction({ action: "disable-staff" }, "Cuenta de sala desactivada.")) setConfirmation(null); } })} />}
          {!currentRoom && pane.kind !== "settings" && <p role="alert" className="p-4 text-sm text-red-800">El salón de esta ventana ya no está disponible. Cerrala y volvé a abrir la herramienta.</p>}
          </fieldset>
        </div>
      </FloatingModalWindow>;
    })}
    {confirmation && <AdminConfirmModal open title={confirmation.title} description={confirmation.description} confirmLabel={confirmation.confirmLabel} loading={busy} onClose={() => { if (!busy) setConfirmation(null); }} onConfirm={confirmation.run}>{error && <p role="alert" className="mb-4 text-sm text-red-800">{error}</p>}</AdminConfirmModal>}
  </main>;
}
