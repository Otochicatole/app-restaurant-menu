"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, type MouseEvent } from "react";
import { Building2, Check, Layers3, LayoutGrid, Loader2, MapPin, Package, Pencil, Plus, RotateCw, Ruler, Save, Settings2, Shapes, Trash2, X } from "lucide-react";
import { AdminConfirmModal } from "@/ui/admin/AdminUI";
import { FloatingModalWindow } from "@/ui/FloatingModalWindow";
import { floorAdminWorkspace, floorConfigLoaded, floorRoomChanged, floorRoomPatched, floorAdminSeed, type EditorPanel, type EditorTool, type CombinationMode } from "./floor-workspaces";
import { useFloatingWindows } from "@/ui/useFloatingWindows";
import { useRegisterAdminNavigationGuard } from "@/ui/admin/AdminNavigationGuard";
import { transientButtonProps } from "@/ui/button-state";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { floorRoomInputSchema, validateRoomLayout, type FloorCombination, type FloorConfigView, type FloorFixture, type FloorLocation, type FloorRoom, type FloorRotation } from "../contracts";
import { FloorCanvas, type FloorCanvasElement } from "./FloorCanvas";
import { FloorSectorContextMenu } from "./FloorSectorContextMenu";
import { CombinationPropertiesForm, FloorSettingsForm, InventoryForm, InventoryGroupForm, RoomDimensionsForm, SpatialPropertiesForm, TablePropertiesForm, type StockInput, type StockGroupInput } from "./FloorAdminForms";
import { getFloorConfig, saveFloorAction } from "./floor-api";
import { groupInventoryTables } from "./floor-table-groups";
import { combinationPoses, inventoryTables, resizeInventoryGroup } from "./floor-inventory";
import { capacityAfterLayout, defaultLayoutCapacity } from "./floor-table-layout";

type ConfirmPanel = { title: string; description: string; confirmLabel: string; run: () => void | Promise<void> };
type Flyout = "rooms" | "sectors" | "elements" | null;
const copy = <T,>(value: T): T => structuredClone(value);
const nextRotation = (rotation: number): FloorRotation => ((rotation + 90) % 360) as FloorRotation;
const buttonBase = "flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d5934] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:px-3";
const floatingButton = `${buttonBase} bg-white text-[#263e23] hover:bg-[#edf2e9]`;
const editorToolButtonClass = "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d5934] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:gap-0.5 lg:flex-row lg:gap-2 lg:px-3 lg:text-sm";
const toolIcons = [Building2, Ruler, Package, MapPin, Shapes, Settings2];
const sideActionPosition = "absolute right-3 z-20 bottom-[calc(env(safe-area-inset-bottom,0px)+16.5rem)] sm:right-6 sm:bottom-[calc(env(safe-area-inset-bottom,0px)+13.75rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+8.75rem)]";
const toolLabels = ["Salones", "Medidas", "Inventario", "Sectores", "Elementos", "Configuración"];
const sameElement = (a: FloorCanvasElement, b: FloorCanvasElement) => a.kind === b.kind && a.id === b.id;

function uniqueName(base: string, existing: string[]) {
  if (!existing.includes(base)) return base;
  let suffix = 2; while (existing.includes(`${base} ${suffix}`)) suffix += 1;
  return `${base} ${suffix}`;
}
function roomError(room: FloorRoom): string | null {
  const result = floorRoomInputSchema.safeParse(room);
  return result.success ? validateRoomLayout(result.data) : result.error.issues[0]?.message ?? "Revisá los datos del salón.";
}
function toolId(panel: EditorPanel): string {
  return panel.kind === "sector" || panel.kind === "fixture" || panel.kind === "combination" ? `${panel.kind}:${panel.entity.id}`
    : panel.kind === "table" || panel.kind === "combination-layout" ? `${panel.kind}:${panel.id}` : panel.kind === "table-group" ? `table-group:${panel.key}` : panel.kind;
}
function toolTitle(panel: EditorPanel): string {
  return panel.kind === "dimensions" ? "Medidas del salón" : panel.kind === "inventory" ? "Inventario de mesas" : panel.kind === "table-group" ? "Editar tipo de mesa" : panel.kind === "table" ? "Editar mesa" : panel.kind === "sector" ? "Propiedades del sector" : panel.kind === "fixture" ? "Propiedades del elemento" : panel.kind === "combination" ? "Armado predefinido" : panel.kind === "combination-layout" ? "Edición del armado" : "Configuración del restaurante";
}

function baseline(panel: EditorPanel, room: FloorRoom | null, combination: CombinationMode): unknown {
  if (!room) return undefined;
  if (panel.kind === "dimensions") return { name: room.name, width: room.width, height: room.height, active: room.active };
  if (panel.kind === "sector") return room.locations.find((item) => item.id === panel.entity.id);
  if (panel.kind === "fixture") return room.fixtures.find((item) => item.id === panel.entity.id);
  if (panel.kind === "table") return room.tables.find((item) => item.id === panel.id);
  if (panel.kind === "table-group") return groupInventoryTables(room.tables).find((item) => item.key === panel.key)?.tables;
  if (panel.kind === "combination") return combination?.combination.id === panel.entity.id ? combination.combination : room.combinations.find((item) => item.id === panel.entity.id);
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
  const [combinationMode, setCombinationMode] = floorAdminWorkspace.useField("combinationMode");
  const toolbar = useRef<HTMLElement>(null);
  const flyoutSurface = useRef<HTMLDivElement>(null);
  const toolSurfaces = useRef(new Map<string, HTMLDivElement>());
  const toolButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const windowsRef = useRef(tools.windows);
  const hasPendingRoomChanges = dirty || combinationMode !== null;
  const hasUnsaved = hasPendingRoomChanges || Object.keys(editedTools).length > 0;
  const interactive = !busy && !confirmation && !tools.windows.some((entry) => entry.visible && ["sector", "fixture", "combination"].includes(entry.value.panel.kind));
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
    if (!draft || !interactive || placement || combinationMode) return;
    const anchor = (element.kind === "sector" ? draft.locations : draft.fixtures).find((item) => item.id === element.id);
    if (!anchor) return;
    const dx = point.x - anchor.x;
    const dy = point.y - anchor.y;
    if (!dx && !dy) return;
    const moving = selectedElements.some((item) => sameElement(item, element)) ? selectedElements : [element];
    const move = <T extends { id: string; x: number; y: number },>(item: T, kind: FloorCanvasElement["kind"]): T =>
      moving.some((selected) => selected.kind === kind && selected.id === item.id) ? { ...item, x: item.x + dx, y: item.y + dy } : item;
    const next = { ...draft, locations: draft.locations.map((item) => move(item, "sector")), fixtures: draft.fixtures.map((item) => move(item, "fixture")) };
    if (moving.length === 1) { patch(next); return; }
    const invalid = roomError(next);
    if (invalid) setError(invalid);
    else patch(next);
  };
  const resetInteraction = () => { setSectorMenu(null); setSelection(null); setCombinationMode(null); setPlacement(null); setFlyout(null); tools.clear(); setEditedTools({}); setConfirmation(null); setError(null); };
  const clearToolEdit = (id: string) => setEditedTools((previous) => { if (!previous[id]) return previous; const next = { ...previous }; delete next[id]; return next; });
  const closeTool = (id: string) => { if (!busy) { if (id.startsWith("combination-layout:")) setCombinationMode(null); tools.close(id); clearToolEdit(id); } };
  const markToolEdit = (id: string) => setEditedTools((previous) => previous[id] ? previous : { ...previous, [id]: true });
  const staleTool = (value: EditorTool): string | null => {
    if (!draft || value.roomId !== draft.id) return "El salón de esta ventana cambió. Cancelá y volvé a abrir la herramienta.";
    if (JSON.stringify(baseline(value.panel, draft, combinationMode)) !== JSON.stringify(value.baseline)) return "Estos datos cambiaron en otra herramienta. Cancelá y volvé a abrir las propiedades antes de aplicar.";
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
    const next: FloorRoom = { id: crypto.randomUUID(), restaurantId, name, width: 1000, height: 700, active: true, revision: 0, fixtures: [], locations: [], tables: [], combinations: [] };
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
      if (roomAction || (!snapshot.dirty && !snapshot.combinationMode)) {
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
  function openPanel(next: EditorPanel, room = draft) {
    if (busy) return;
    setSectorMenu(null); setError(null); setFlyout(null); setPlacement(null);
    tools.open(toolId(next), { panel: copy(next), roomId: room?.id ?? null, baseline: copy(baseline(next, room, combinationMode)) });
  }
  const openSectorMenu = (id: string, point: { x: number; y: number }) => {
    if (busy || confirmation || placement || combinationMode) return;
    toolButtons.current[3]?.focus();
    setSelection({ kind: "sector", id }); setSectorMenu({ id, point }); setFlyout(null);
  };
  const beginPlacement = (kind: NonNullable<typeof placement>) => {
    if (!draft || busy || combinationMode) return;
    setSectorMenu(null); setPlacement(kind); setSelection(null); setFlyout(null); setError(null);
  };
  const resizeSector = (id: string, geometry: Pick<FloorLocation, "x" | "y" | "width" | "height">) => {
    if (!draft || !interactive || placement || combinationMode || !draft.locations.some((location) => location.id === id)) return;
    const invalid = applyRoom({ ...draft, locations: draft.locations.map((location) => location.id === id ? { ...location, ...geometry } : location) });
    if (invalid) setError(invalid);
  };
  const addStock = (stock: StockInput): string | null => {
    if (!draft || busy) return "Esperá a que termine de guardar.";
    if (!Number.isInteger(stock.quantity) || stock.quantity < 1 || stock.quantity + draft.tables.length > 200 || !Number.isInteger(stock.capacity)) return "Ingresá una cantidad entera válida. El salón admite hasta 200 mesas.";
    return applyRoom({ ...draft, tables: [...draft.tables, ...inventoryTables(stock.quantity, stock, draft.tables)] });
  };
  const applyTableGroup = (key: string, fields: StockGroupInput, after: () => void): string | null => {
    if (!draft || busy) return "Esperá a que termine de guardar.";
    const tables = resizeInventoryGroup(draft, key, fields);
    if (typeof tables === "string") return tables;
    return applyRoom({ ...draft, tables }, after);
  };
  const startCombination = (combination: FloorCombination) => {
    if (combinationMode && combinationMode.combination.id !== combination.id) { setError("Terminá o cancelá el armado actual antes de editar otro."); tools.open(`combination-layout:${combinationMode.combination.id}`, { panel: { kind: "combination-layout", id: combinationMode.combination.id }, roomId: draft?.id ?? null, baseline: undefined }); return; }
    setSectorMenu(null); setCombinationMode((current) => current ?? { combination: copy(combination), selectedIds: combination.members[0] ? [combination.members[0].tableId] : [] }); setSelection(null); setFlyout(null); setPlacement(null); setError(null);
    openPanel({ kind: "combination-layout", id: combination.id });
  };
  const createCombination = (ids: string[]) => {
    if (!draft || busy) return;
    const tables = draft.tables.filter((table) => table.active && ids.includes(table.id)); if (tables.length < 2) return;
    let cursor = -tables.reduce((sum, table) => sum + (table.rotation % 180 ? table.height : table.width), 0) / 2;
    const members = tables.map((table) => { const width = table.rotation % 180 ? table.height : table.width; const x = cursor + width / 2; cursor += width; return { tableId: table.id, x, y: 0, rotation: table.rotation }; });
    startCombination({ id: crypto.randomUUID(), name: uniqueName(tables.map((table) => table.label).join(" + "), draft.combinations.map((item) => item.name)), capacity: defaultLayoutCapacity(combinationPoses(tables, members)), members, active: true });
  };
  const applyCombination = () => {
    if (!draft || !combinationMode || busy || combinationCapacity <= 0) return;
    const combination = { ...combinationMode.combination, capacity: combinationCapacity };
    const combinations = draft.combinations.some((item) => item.id === combination.id) ? draft.combinations.map((item) => item.id === combination.id ? combination : item) : [...draft.combinations, combination];
    const invalid = applyRoom({ ...draft, combinations }, () => { setCombinationMode(null); closeTool(`combination-layout:${combination.id}`); });
    if (invalid) setError(invalid);
  };
  const place = (point: { x: number; y: number }) => {
    if (!draft || !placement || busy || confirmation) return;
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
    const title = selectedSector ? "Eliminar sector" : "Eliminar elemento";
    setConfirmation({
      title,
      description: selectedSector
        ? "El sector se quitará del plano al guardar. Si tiene asignaciones vigentes o futuras, primero tendrás que reasignarlas."
        : "El elemento se quitará del plano cuando guardes los cambios.",
      confirmLabel: title,
      run: () => {
        patch(selectedSector
          ? { ...draft, locations: draft.locations.map((item) => item.id === selection.id ? { ...item, active: false } : item) }
          : { ...draft, fixtures: draft.fixtures.filter((item) => item.id !== selection.id) });
        setSelection(null);
        setConfirmation(null);
      },
    });
  };
  const archiveRoom = () => {
    if (!draft || busy) return;
    setConfirmation({ title: "Archivar salón", description: `${hasUnsaved ? "Se descartarán los cambios sin guardar de este salón. " : ""}No se podrá archivar si tiene asignaciones futuras comprometidas.`, confirmLabel: "Archivar salón", run: async () => { if (await mutate({ action: "archive-room", roomId: draft.id, expectedRevision: draft.revision }, "Salón archivado.", true)) { setConfirmation(null); setSelection(null); } } });
  };
  const configurationAction = async (body: unknown, message: string) => {
    if (hasPendingRoomChanges) { setError("Guardá el plano antes de modificar la configuración."); return false; }
    return mutate(body, message);
  };
  const canvasTables = draft && combinationMode ? combinationMode.combination.members.flatMap((member) => {
    const table = draft.tables.find((item) => item.id === member.tableId); return table ? [{ ...table, x: draft.width / 2 + member.x, y: draft.height / 2 + member.y, rotation: member.rotation }] : [];
  }) : [];
  const combinationCapacity = draft && combinationMode
    ? Math.min(combinationMode.combination.capacity, defaultLayoutCapacity(combinationPoses(draft.tables, combinationMode.combination.members)))
    : 0;
  const canSelectPlan = interactive && !placement && !combinationMode;
  const canSelectTables = interactive && Boolean(combinationMode);
  const selectCombinationTables = (ids: string[], additive = false) => {
    setCombinationMode((current) => current ? {
      ...current,
      selectedIds: additive ? [...new Set([...current.selectedIds, ...ids])] : ids,
    } : null);
  };
  const selectCombinationTable = (id: string, additive: boolean) => {
    setCombinationMode((current) => current ? {
      ...current,
      selectedIds: !additive ? [id] : current.selectedIds.includes(id)
        ? current.selectedIds.filter((selected) => selected !== id)
        : [...current.selectedIds, id],
    } : null);
  };
  const updateCombinationMembers = (update: (current: NonNullable<CombinationMode>) => FloorCombination["members"]) => {
    if (!draft) return;
    setCombinationMode((current) => {
      if (!current) return null;
      const members = update(current);
      const capacity = capacityAfterLayout(current.combination.capacity, combinationPoses(draft.tables, current.combination.members), combinationPoses(draft.tables, members));
      return { ...current, combination: { ...current.combination, members, capacity } };
    });
  };
  const moveCombinationTables = (ids: string[], delta: { x: number; y: number }) => {
    updateCombinationMembers(({ combination }) => combination.members.map((member) =>
      ids.includes(member.tableId) ? { ...member, x: member.x + delta.x, y: member.y + delta.y } : member));
  };
  const selectionCount = combinationMode?.selectedIds.length ?? selectedElements.length;
  let status = "Preparando el plano…";
  if (placement) {
    const target = placement === "sector" ? "el sector" : placement === "WALL" ? "la pared" : placement === "BAR" ? "la barra" : "el texto";
    status = "Tocá dentro del salón para ubicar " + target + ".";
  } else if (selectionCount > 1) {
    status = selectionCount + (combinationMode ? " mesas seleccionadas. Arrastrá una para moverlas juntas." : " elementos seleccionados. Arrastrá uno para moverlos juntos.");
  } else if (combinationMode) {
    status = "Editando armado: " + combinationMode.combination.name;
  } else if (hasUnsaved) {
    status = "Cambios sin guardar";
  } else if (selectedSector) {
    status = "Arrastrá los bordes o las esquinas para ajustar el tamaño del sector.";
  } else if (draft) {
    status = "Arrastrá desde un espacio libre para seleccionar varios elementos. Shift permite sumar.";
  }
  return <main data-admin-panel className={`fixed inset-y-0 left-16 right-0 isolate h-dvh overflow-hidden bg-[#f5f2e9] text-zinc-950 selection:bg-[#d6e8d4] ${confirmation ? "z-50" : ""}`}>
    <h1 className="sr-only">Editor de salones · {config?.restaurantName ?? "Restaurante"}</h1>
    <div role="region" aria-label="Editor del salón" className="absolute inset-0">
      {draft && <FloorCanvas
        key={draft.id} fullScreen editorMode grid
        room={combinationMode ? { ...draft, fixtures: [], locations: [] } : { ...draft, locations: draft.locations.filter((location) => location.active) }}
        tables={canvasTables}
        selectedIds={combinationMode?.selectedIds ?? []}
        selectedElements={selectedElements}
        selectedLocationId={selectedSector?.id}
        selectedFixtureId={selectedFixture?.id}
        draggableIds={canSelectTables ? canvasTables.map((table) => table.id) : []}
        onSelect={canSelectTables ? selectCombinationTable : undefined}
        onSelectMany={canSelectTables ? selectCombinationTables : undefined}
        onMove={canSelectTables ? moveCombinationTables : undefined}
        onClearSelection={canSelectTables ? () => selectCombinationTables([]) : canSelectPlan ? () => selectCanvasElements([], false) : undefined}
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
    {!draft && <div className="absolute inset-0 grid place-items-center p-6"><div className="max-w-sm text-center"><Building2 size={30} className="mx-auto mb-4 text-[#607054]" /><h2 className="text-lg font-semibold">{config ? "Creá tu primer salón" : "Cargando salones…"}</h2><p className="mt-2 text-sm leading-relaxed text-[#52634b]">{config ? "Definí las medidas, cargá tu inventario y dibujá los sectores sobre este tablero." : "Preparando el editor del restaurante."}</p>{config && <button {...transientButtonProps} type="button" disabled={busy} onClick={createRoom} className={`${adminPrimaryButtonClass} mt-5`}><Plus size={16} />Crear salón</button>}</div></div>}
    <header className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top,0px))] z-10 flex items-start justify-between gap-3 px-3 sm:px-6"><div className="pointer-events-auto flex min-w-0 items-start gap-2"><div className="min-w-0 rounded-xl bg-white px-3 py-2 shadow-[0_3px_16px_rgba(24,38,24,0.12)]"><p className="max-w-[32vw] truncate text-[11px] text-[#52634b] sm:max-w-64">{config?.restaurantName ?? "Restaurante"}</p><p className="max-w-[32vw] truncate text-sm font-semibold text-[#263e23] sm:max-w-64">{draft?.name ?? "Salones"}{draft && !draft.active && " · Archivado"}</p></div></div><div className="pointer-events-auto flex shrink-0 gap-2"><Link href={roomHref} aria-label="Ver sala" title="Ver sala" aria-disabled={busy || undefined} onClick={(event) => guardLink(event, roomHref)} className={floatingButton}><LayoutGrid size={18} /><span className="hidden lg:inline">Ver sala</span></Link><button {...transientButtonProps} type="button" aria-label="Guardar plano" title="Guardar plano" disabled={!draft || !dirty || busy || !!combinationMode} onClick={() => { void save(); }} className={`${buttonBase} bg-[#182618] text-white hover:bg-[#2d4628]`}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}<span className="hidden lg:inline">Guardar plano</span></button></div></header>
    <div className="pointer-events-none absolute left-3 right-3 top-[calc(max(1rem,env(safe-area-inset-top,0px))+4rem)] z-10 max-w-xl space-y-2 sm:left-6"><p role="status" className="w-fit rounded-lg bg-white px-3 py-2 text-xs text-[#46543e] shadow-[0_2px_10px_rgba(24,38,24,0.08)]">{status}</p>{error && <div role="alert" className="pointer-events-auto flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"><span>{error}</span>{!config ? <button {...transientButtonProps} type="button" onClick={() => setLoadAttempt((value) => value + 1)} className="font-semibold underline underline-offset-4">Reintentar</button> : <button {...transientButtonProps} type="button" aria-label="Cerrar error" onClick={() => setError(null)}><X size={16} /></button>}</div>}{notice && <p role="status" className="w-fit rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{notice}</p>}{placement && <button {...transientButtonProps} type="button" onClick={() => setPlacement(null)} className={`${adminSecondaryButtonClass} pointer-events-auto`}>Cancelar ubicación</button>}</div>
    {selectedFixture && !combinationMode && <aside aria-label="Selección del plano" className={`${sideActionPosition} max-w-[calc(100%_-_6rem)] rounded-xl bg-white p-3 shadow-[0_6px_28px_-8px_rgba(24,38,24,0.24)]`}><p className="mb-2 truncate text-sm font-semibold">{selectedLabel || (selectedFixture?.type === "WALL" ? "Pared" : "Elemento del salón")}</p><div className="flex flex-wrap gap-1"><button {...transientButtonProps} type="button" disabled={busy} onClick={editSelection} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-[#edf2e9]"><Pencil size={15} />Editar</button><button {...transientButtonProps} type="button" disabled={busy} onClick={rotateSelection} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-[#edf2e9]"><RotateCw size={15} />Girar</button><button {...transientButtonProps} type="button" disabled={busy} onClick={removeSelection} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 size={15} />{selectedSector ? "Archivar" : "Eliminar"}</button></div></aside>}
    {sectorMenu && selectedSector && !busy && !confirmation && !placement && !combinationMode && <FloorSectorContextMenu name={selectedSector.name} point={sectorMenu.point} disabled={busy} onEdit={() => { setSectorMenu(null); editSelection(); }} onRotate={() => { setSectorMenu(null); rotateSelection(); }} onDelete={() => { setSectorMenu(null); removeSelection(); }} onClose={() => setSectorMenu(null)} />}
    <nav ref={toolbar} aria-label="Herramientas del editor" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-1/2 z-30 grid w-[calc(100%_-_1.5rem)] max-w-lg -translate-x-1/2 grid-cols-4 items-center gap-1.5 md:max-w-3xl md:grid-cols-7 lg:flex lg:w-max lg:max-w-[calc(100%_-_1.5rem)]">
      {toolLabels.map((label, index) => {
        const Icon = toolIcons[index];
        const flyoutKind = index === 0 ? "rooms" : index === 3 ? "sectors" : index === 4 ? "elements" : null;
        const panelKind = index === 1 ? "dimensions" : index === 2 ? "inventory" : "settings";
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
            className={editorToolButtonClass + " bg-white text-[#263e23] hover:bg-[#edf2e9]" + (index === 5 ? " col-span-2 md:col-span-1" : "")}>
            <Icon size={18} /><span className="leading-tight lg:whitespace-nowrap">{label}</span>
          </button>
          {index === 3 && <button {...transientButtonProps} type="button" disabled={!draft || busy || Boolean(placement || combinationMode)}
            onClick={() => beginPlacement("sector")} className={editorToolButtonClass + " bg-[#182618] text-white hover:bg-[#2d4628]"}>
            <Plus size={18} /><span className="leading-tight lg:whitespace-nowrap">Agregar sector</span>
          </button>}
        </Fragment>;
      })}
      {flyout && <div ref={flyoutSurface} className="absolute bottom-[calc(100%_+_0.75rem)] left-1/2 max-h-[min(26rem,calc(100dvh_-_7rem))] w-[min(21rem,calc(100vw_-_1.5rem))] -translate-x-1/2 overflow-y-auto rounded-xl bg-white p-3 shadow-[0_6px_28px_-8px_rgba(24,38,24,0.24)] lg:left-0 lg:translate-x-0">
        {flyout === "rooms" && <nav aria-label="Salones del restaurante" className="space-y-1">{config?.rooms.map((room) => <button key={room.id} {...transientButtonProps} type="button" aria-pressed={draft?.id === room.id} onClick={() => selectRoom(room)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm hover:bg-[#edf2e9]"><span>{room.name}{!room.active && " · Archivado"}</span>{draft?.id === room.id && <Check size={16} />}</button>)}<button {...transientButtonProps} type="button" onClick={createRoom} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#2d4628] hover:bg-[#edf2e9]"><Plus size={16} />Nuevo salón</button></nav>}
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
      const group = pane.kind === "table-group" && Array.isArray(value.baseline) ? groupInventoryTables(value.baseline).find((item) => item.key === pane.key) : undefined;
      const table = pane.kind === "table" ? value.baseline as FloorRoom["tables"][number] | undefined : undefined;
      const layout = pane.kind === "combination-layout" && combinationMode?.combination.id === pane.id ? combinationMode : null;
      const icon = pane.kind === "inventory" || pane.kind === "table" || pane.kind === "table-group" ? <Package size={17} className="text-[#3d5934]" /> : pane.kind === "settings" ? <Settings2 size={17} className="text-[#3d5934]" /> : pane.kind === "dimensions" ? <Ruler size={17} className="text-[#3d5934]" /> : pane.kind === "combination-layout" ? <Layers3 size={17} className="text-[#3d5934]" /> : <Shapes size={17} className="text-[#3d5934]" />;
      return <FloatingModalWindow key={entry.id} id={"room-tool-" + entry.id} title={layout?.combination.name ?? title} subtitle={pane.kind === "sector" ? pane.entity.name : pane.kind === "fixture" ? pane.entity.label : layout ? "Armado predefinido" : currentRoom?.name ?? config?.restaurantName} icon={icon} role={pane.kind === "combination-layout" ? "complementary" : "dialog"} ariaLabel={pane.kind === "combination-layout" ? "Edición del armado" : title} isOpen={entry.visible} activation={entry.activation} initialOffset={entry.offset} keepMounted onClose={() => closeTool(entry.id)} closeDisabled={busy} onFocus={() => tools.focus(entry.id)} initialAnchor="right" viewportInset={{ left: 64, bottom: 92 }} initialPosition={{ x: 80, y: 80 }} initialSize={pane.kind === "combination-layout" ? { width: 380, height: 380 } : { width: 420, height: 460 }} minWidth={300} minHeight={240} zIndex={entry.zIndex}>
        <div ref={(element) => { if (element) toolSurfaces.current.set(entry.id, element); else toolSurfaces.current.delete(entry.id); }} tabIndex={-1} onChangeCapture={() => markToolEdit(entry.id)} className="flex min-h-0 flex-1 flex-col outline-none">
          <fieldset disabled={busy} className="flex min-h-0 min-w-0 flex-1 flex-col">
          {currentRoom && pane.kind === "dimensions" && <RoomDimensionsForm room={value.baseline ? { ...currentRoom, ...value.baseline as Pick<FloorRoom, "name" | "width" | "height" | "active"> } : currentRoom} busy={busy} saved={!!config?.rooms.some((room) => room.id === currentRoom.id)} onApply={(fields) => check() ?? applyRoom({ ...currentRoom, ...fields }, finish)} onArchive={archiveRoom} onCancel={finish} />}
          {currentRoom && pane.kind === "inventory" && <InventoryForm room={currentRoom} onAdd={(stock) => { const invalid = check() ?? addStock(stock); if (!invalid) clearToolEdit(entry.id); return invalid; }} onEditGroup={(key) => openPanel({ kind: "table-group", key })} onEditTable={(id) => openPanel({ kind: "table", id })} onEditCombination={(id) => { const combination = currentRoom.combinations.find((item) => item.id === id); if (combination) startCombination(combination); }} onCreateCombination={createCombination} onClose={finish} />}
          {currentRoom && pane.kind === "table-group" && group && <InventoryGroupForm group={group} onApply={(fields) => check() ?? applyTableGroup(group.key, fields, finish)} onCancel={finish} />}
          {currentRoom && pane.kind === "table" && table && <TablePropertiesForm table={table} onApply={(next) => check() ?? applyRoom({ ...currentRoom, tables: currentRoom.tables.map((item) => item.id === next.id ? next : item) }, finish)} onCancel={finish} />}
          {currentRoom && pane.kind === "sector" && <SpatialPropertiesForm kind="sector" entity={pane.entity} onApply={(entity) => {
            const invalid = check(); if (invalid) return invalid;
            const location = entity as FloorLocation;
            return applyRoom({ ...currentRoom, locations: currentRoom.locations.some((item) => item.id === location.id) ? currentRoom.locations.map((item) => item.id === location.id ? location : item) : [...currentRoom.locations, location] }, () => { setSelection({ kind: "sector", id: location.id }); finish(); });
          }} onCancel={finish} />}
          {currentRoom && pane.kind === "fixture" && <SpatialPropertiesForm kind="fixture" entity={pane.entity} onApply={(entity) => {
            const invalid = check(); if (invalid) return invalid;
            const fixture = entity as FloorFixture;
            return applyRoom({ ...currentRoom, fixtures: currentRoom.fixtures.some((item) => item.id === fixture.id) ? currentRoom.fixtures.map((item) => item.id === fixture.id ? fixture : item) : [...currentRoom.fixtures, fixture] }, () => { setSelection({ kind: "fixture", id: fixture.id }); finish(); });
          }} onCancel={finish} />}
          {currentRoom && pane.kind === "combination" && <CombinationPropertiesForm room={currentRoom} combination={pane.entity} onApply={(combination) => {
            const invalid = check(); if (invalid) return invalid;
            const next = { ...currentRoom, combinations: [...currentRoom.combinations.filter((item) => item.id !== combination.id), combination] };
            const problem = roomError(next); if (problem) return problem;
            if (combinationMode?.combination.id === combination.id) setCombinationMode((current) => current ? { ...current, combination } : null);
            else patch(next);
            finish(); return null;
          }} onCancel={finish} />}
          {config && pane.kind === "settings" && <FloorSettingsForm config={config} dirty={hasPendingRoomChanges} busy={busy} onAction={async (body, message) => { const result = await configurationAction(body, message); if (result) clearToolEdit(entry.id); return result; }} onDisableStaff={() => setConfirmation({ title: "Desactivar cuenta de sala", description: "Se cerrarán sus sesiones y el personal dejará de acceder con esta cuenta. Las asignaciones se conservarán.", confirmLabel: "Desactivar cuenta", run: async () => { if (await configurationAction({ action: "disable-staff" }, "Cuenta de sala desactivada.")) setConfirmation(null); } })} />}
          {layout && <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-[#263e23]">
              <p className="text-xs leading-relaxed text-[#52634b]">Arrastrá sus mesas para unirlas. Este armado no cambia las ubicaciones del salón.</p>
              <p role="status" className={`text-sm tabular-nums ${combinationCapacity > 0 ? "text-[#263e23]" : "text-red-800"}`}>
                <strong>{combinationCapacity} {combinationCapacity === 1 ? "lugar útil" : "lugares útiles"}</strong>{combinationCapacity === 0 && ". Mové las mesas para liberar lugares."}
              </p>
              <div role="group" aria-label="Mesas del armado predefinido" className="grid grid-cols-3 gap-2">{layout.combination.members.map((member) => <button key={member.tableId} {...transientButtonProps} type="button" aria-pressed={layout.selectedIds.includes(member.tableId)} disabled={busy} className={"min-h-11 truncate rounded-lg border px-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934] disabled:opacity-50 " + (layout.selectedIds.includes(member.tableId) ? "border-[#7e9272] bg-[#edf2e9]" : "border-stone-200 hover:bg-[#edf2e9]" )} onClick={() => setCombinationMode((current) => current ? { ...current, selectedIds: current.selectedIds.includes(member.tableId) ? current.selectedIds.filter((id) => id !== member.tableId) : [...current.selectedIds, member.tableId] } : null)}>{currentRoom?.tables.find((item) => item.id === member.tableId)?.label}</button>)}</div>
              <button {...transientButtonProps} type="button" disabled={busy || !layout.selectedIds.length} className={adminSecondaryButtonClass + " w-full text-xs"} onClick={() => updateCombinationMembers(({ combination, selectedIds }) => combination.members.map((member) => selectedIds.includes(member.tableId) ? { ...member, rotation: nextRotation(member.rotation) } : member))}><RotateCw size={15} />Girar mesas seleccionadas</button>
              <button {...transientButtonProps} type="button" disabled={busy} className="min-h-11 w-full rounded-lg px-2 text-left text-xs font-semibold underline underline-offset-4 hover:bg-[#edf2e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934]" onClick={() => openPanel({ kind: "combination", entity: copy(layout.combination) })}>Propiedades del armado</button>
            </div>
            <footer className="flex shrink-0 gap-2 border-t border-stone-200 bg-white px-4 py-3"><button {...transientButtonProps} type="button" disabled={busy} onClick={() => { setCombinationMode(null); setError(null); finish(); }} className={adminSecondaryButtonClass + " min-h-11 px-3 text-xs"}>Cancelar armado</button><button {...transientButtonProps} type="button" disabled={busy || combinationCapacity <= 0} onClick={applyCombination} className={adminPrimaryButtonClass + " min-h-11 flex-1 px-3 text-xs"}>Aplicar armado</button></footer>
          </>}
          {!currentRoom && pane.kind !== "settings" && <p role="alert" className="p-4 text-sm text-red-800">El salón de esta ventana ya no está disponible. Cerrala y volvé a abrir la herramienta.</p>}
          </fieldset>
        </div>
      </FloatingModalWindow>;
    })}
    {confirmation && <AdminConfirmModal open title={confirmation.title} description={confirmation.description} confirmLabel={confirmation.confirmLabel} loading={busy} onClose={() => { if (!busy) setConfirmation(null); }} onConfirm={confirmation.run}>{error && <p role="alert" className="mb-4 text-sm text-red-800">{error}</p>}</AdminConfirmModal>}
  </main>;
}
