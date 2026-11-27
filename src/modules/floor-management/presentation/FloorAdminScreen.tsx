"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Grid3x3,
  Hand,
  LayoutGrid,
  Loader2,
  MapPin,
  MousePointer2,
  Package,
  PanelRight,
  Plus,
  Save,
  Shapes,
  Trash2,
  X,
} from "lucide-react";
import { AdminConfirmModal } from "@/ui/admin/AdminUI";
import { useRegisterAdminNavigationGuard } from "@/ui/admin/AdminNavigationGuard";
import { transientButtonProps } from "@/ui/button-state";
import { adminPrimaryButtonClass } from "@/ui/admin/AdminPrimitives";
import {
  floorRoomInputSchema,
  validateRoomLayout,
  type FloorConfigView,
  type FloorFixture,
  type FloorLocation,
  type FloorRoom,
  type FloorRotation,
  type FloorTable,
} from "../contracts";
import { FloorCanvas, type FloorCanvasElement, type FloorInteractionMode } from "./FloorCanvas";
import { FloorSectorContextMenu } from "./FloorSectorContextMenu";
import type { FixedTablePreset } from "./FloorAdminForms";
import { FloorAdminInspector, type InspectorTab } from "./FloorAdminInspector";
import { getFloorConfig, saveFloorAction } from "./floor-api";
import {
  floorAdminSeed,
  floorAdminWorkspace,
  floorConfigLoaded,
  floorRoomChanged,
  floorRoomPatched,
} from "./floor-workspaces";

type ConfirmPanel = {
  title: string;
  description: string;
  confirmLabel: string;
  run: () => void | Promise<void>;
};

const nextRotation = (rotation: number): FloorRotation => ((rotation + 90) % 360) as FloorRotation;
const defaultTablePreset: FixedTablePreset = { shape: "SQUARE", capacity: 4, width: 80, height: 80 };
const sameElement = (a: FloorCanvasElement, b: FloorCanvasElement) => a.kind === b.kind && a.id === b.id;

const topBarButtonBase =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d5934] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap";

function uniqueName(base: string, existing: string[]) {
  if (!existing.includes(base)) return base;
  let suffix = 2;
  while (existing.includes(`${base} ${suffix}`)) suffix += 1;
  return `${base} ${suffix}`;
}

function nextTableLabel(tables: FloorTable[]): string {
  const activeTables = tables.filter((table) => table.active);
  const usedLabels = new Set(activeTables.map((table) => table.label.trim().toUpperCase()));
  let candidate = 1;
  while (usedLabels.has(`M${candidate}`)) candidate += 1;
  return uniqueName(`M${candidate}`, activeTables.map((table) => table.label));
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
  const effW =
    spec.shape === "CIRCLE"
      ? spec.width
      : Math.abs(Math.cos((spec.rotation * Math.PI) / 180)) * spec.width +
        Math.abs(Math.sin((spec.rotation * Math.PI) / 180)) * spec.height;
  const effH =
    spec.shape === "CIRCLE"
      ? spec.width
      : Math.abs(Math.sin((spec.rotation * Math.PI) / 180)) * spec.width +
        Math.abs(Math.cos((spec.rotation * Math.PI) / 180)) * spec.height;
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

export function FloorAdminScreen({
  restaurantId,
  initialConfig,
}: {
  restaurantId: string;
  initialConfig?: FloorConfigView | null;
}) {
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
  const [confirmation, setConfirmation] = useState<ConfirmPanel | null>(null);
  const [placement, setPlacement] = floorAdminWorkspace.useField("placement");
  const [selectedElements, setSelectedElements] = floorAdminWorkspace.useField("selectedElements");
  const selection = selectedElements.length === 1 ? selectedElements[0] : null;
  const [interactionMode, setInteractionMode] = useState<FloorInteractionMode>("select");
  const [showGrid, setShowGrid] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<InspectorTab>("structure");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [roomsMenuOpen, setRoomsMenuOpen] = useState(false);
  const [elementsMenuOpen, setElementsMenuOpen] = useState(false);
  const [sectorMenu, setSectorMenu] = useState<{ id: string; point: { x: number; y: number } } | null>(null);

  const roomsMenuRef = useRef<HTMLDivElement>(null);
  const elementsMenuRef = useRef<HTMLDivElement>(null);
  const roomsTriggerRef = useRef<HTMLButtonElement>(null);
  const elementsTriggerRef = useRef<HTMLButtonElement>(null);

  const hasUnsaved = dirty;
  const interactive = !busy && !confirmation;
  const roomHref = `/floor?restaurantId=${encodeURIComponent(restaurantId)}`;

  useEffect(() => {
    if (loadAttempt === 0 && store.getState().config) return;
    const controller = new AbortController();
    void getFloorConfig(restaurantId, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        store.dispatch(floorConfigLoaded({ config: value, room: value.rooms[0] ?? null }));
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : "No se pudieron cargar los salones.");
        }
      });
    return () => controller.abort();
  }, [restaurantId, loadAttempt, store, setError]);

  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  useEffect(() => {
    if (!roomsMenuOpen && !elementsMenuOpen && !placement) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (roomsMenuOpen && !roomsMenuRef.current?.contains(target)) setRoomsMenuOpen(false);
      if (elementsMenuOpen && !elementsMenuRef.current?.contains(target)) setElementsMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (roomsMenuOpen || elementsMenuOpen) {
        event.preventDefault();
        if (roomsMenuOpen) {
          setRoomsMenuOpen(false);
          roomsTriggerRef.current?.focus();
        }
        if (elementsMenuOpen) {
          setElementsMenuOpen(false);
          elementsTriggerRef.current?.focus();
        }
        return;
      }
      if (placement) {
        event.preventDefault();
        setPlacement(null);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [roomsMenuOpen, elementsMenuOpen, placement, setPlacement]);

  const patch = (next: FloorRoom) => {
    setSectorMenu(null);
    store.dispatch(floorRoomPatched(next));
  };

  const setSelection = (element: FloorCanvasElement | null) => {
    if (element) setInspectorOpen(true);
    setSelectedElements(element ? [element] : []);
  };

  const selectCanvasElement = (element: FloorCanvasElement, additive = false) => {
    setSectorMenu(null);
    setRoomsMenuOpen(false);
    setElementsMenuOpen(false);
    setInspectorOpen(true);
    if (!additive) {
      setSelection(element);
      return;
    }
    setSelectedElements((current) =>
      current.some((item) => sameElement(item, element))
        ? current.filter((item) => !sameElement(item, element))
        : [...current, element],
    );
  };

  const selectCanvasElements = (elements: FloorCanvasElement[], additive: boolean) => {
    setSectorMenu(null);
    setRoomsMenuOpen(false);
    setElementsMenuOpen(false);
    if (elements.length) setInspectorOpen(true);
    setSelectedElements((current) =>
      additive ? [...current, ...elements.filter((el) => !current.some((item) => sameElement(item, el)))] : elements,
    );
  };

  const moveCanvasElement = (element: FloorCanvasElement, point: { x: number; y: number }) => {
    if (!draft || !interactive || placement) return;
    const anchor = (
      element.kind === "sector" ? draft.locations : element.kind === "fixture" ? draft.fixtures : draft.tables
    ).find((item) => item.id === element.id);
    if (!anchor) return;
    const dx = point.x - anchor.x;
    const dy = point.y - anchor.y;
    if (!dx && !dy) return;
    const moving = selectedElements.some((item) => sameElement(item, element)) ? selectedElements : [element];
    const movedSectorIds = new Set(moving.filter((item) => item.kind === "sector").map((item) => item.id));
    const move = <T extends { id: string; x: number; y: number }>(item: T, kind: FloorCanvasElement["kind"]): T =>
      moving.some((selected) => selected.kind === kind && selected.id === item.id)
        ? { ...item, x: item.x + dx, y: item.y + dy }
        : item;
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
    if (moving.length === 1 && element.kind !== "table") {
      patch(next);
      return;
    }
    const invalid = roomError(next);
    if (invalid) setError(invalid);
    else patch(next);
  };

  const moveTables = (ids: string[], delta: { x: number; y: number }) => {
    if (!draft || !interactive || placement || (!delta.x && !delta.y)) return;
    const next: FloorRoom = {
      ...draft,
      tables: draft.tables.map((table) =>
        ids.includes(table.id) ? { ...table, x: table.x + delta.x, y: table.y + delta.y } : table,
      ),
    };
    const invalid = roomError(next);
    if (invalid) setError(invalid);
    else patch(next);
  };

  const resetInteraction = () => {
    setSectorMenu(null);
    setSelection(null);
    setPlacement(null);
    setRoomsMenuOpen(false);
    setElementsMenuOpen(false);
    setConfirmation(null);
    setError(null);
  };

  const discardBefore = (run: () => void) => {
    if (busy) return;
    setRoomsMenuOpen(false);
    setElementsMenuOpen(false);
    setSectorMenu(null);
    if (!hasUnsaved) {
      run();
      return;
    }
    setConfirmation({
      title: "Descartar cambios sin guardar",
      description:
        "Los cambios del plano y el armado que estás editando se perderán. Podés cancelar y guardar antes de continuar.",
      confirmLabel: "Descartar y continuar",
      run: () => {
        setConfirmation(null);
        run();
      },
    });
  };

  useRegisterAdminNavigationGuard(discardBefore);

  const changeRoom = (room: FloorRoom, roomDirty: boolean) => {
    setSectorMenu(null);
    setRoomsMenuOpen(false);
    setElementsMenuOpen(false);
    setConfirmation(null);
    store.dispatch(floorRoomChanged({ room, dirty: roomDirty }));
  };

  const selectRoom = (room: FloorRoom) => {
    if (room.id === draft?.id) {
      setRoomsMenuOpen(false);
      return;
    }
    discardBefore(() => {
      changeRoom(room, false);
      setSidebarTab("structure");
    });
  };

  const createRoom = () =>
    discardBefore(() => {
      const name = uniqueName("Nuevo salón", config?.rooms.map((room) => room.name) ?? []);
      const next: FloorRoom = {
        id: crypto.randomUUID(),
        restaurantId,
        name,
        width: 2000,
        height: 2000,
        active: true,
        revision: 0,
        fixtures: [],
        locations: [],
        tables: [],
        combinations: [],
      };
      changeRoom(next, true);
      setSidebarTab("room");
      setInspectorOpen(true);
    });

  const guardLink = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (busy || hasUnsaved) {
      event.preventDefault();
      if (!busy) discardBefore(() => router.push(href));
    }
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
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No se pudo guardar. Conservamos tus cambios para volver a intentar.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft || busy) return;
    const invalid = roomError(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    const { id, name, width, height, fixtures, locations, active, tables } = draft;
    await mutate(
      {
        action: "save-room",
        room: { id, name, width, height, fixtures, locations, active, tables, combinations: [] },
        expectedRevision: draft.revision,
      },
      "Plano y mesas guardados.",
      true,
    );
  };

  const applyRoom = (next: FloorRoom, then?: () => void): string | null => {
    if (busy) return "Esperá a que termine de guardar.";
    const invalid = roomError(next);
    if (invalid) return invalid;
    patch(next);
    then?.();
    return null;
  };

  const applyRoomChecked = (next: FloorRoom, then?: () => void): string | null => {
    const invalid = applyRoom(next, then);
    if (invalid) setError(invalid);
    return invalid;
  };

  const openSectorMenu = (id: string, point: { x: number; y: number }) => {
    if (busy || confirmation || placement) return;
    setSelection({ kind: "sector", id });
    setSectorMenu({ id, point });
    setRoomsMenuOpen(false);
    setElementsMenuOpen(false);
  };

  const beginPlacement = (kind: NonNullable<typeof placement>) => {
    if (!draft || busy) return;
    setSectorMenu(null);
    setRoomsMenuOpen(false);
    setElementsMenuOpen(false);
    setInteractionMode("select");
    setPlacement(kind);
    setSelection(null);
    setError(null);
  };

  const resizeSector = (id: string, geometry: Pick<FloorLocation, "x" | "y" | "width" | "height">) => {
    if (!draft || !interactive || placement || !draft.locations.some((location) => location.id === id)) return;
    const invalid = applyRoom({
      ...draft,
      locations: draft.locations.map((location) => (location.id === id ? { ...location, ...geometry } : location)),
    });
    if (invalid) setError(invalid);
  };

  const addTableInSector = (
    locationId: string,
    preset: FixedTablePreset,
    preferredPoint?: { x: number; y: number },
  ): string | null => {
    if (!draft || busy) return "Esperá a que termine de guardar.";
    const sector = draft.locations.find((item) => item.id === locationId && item.active);
    if (!sector) return "Elegí un sector activo para ubicar la mesa.";
    if (draft.tables.filter((item) => item.active).length >= 200) return "El salón admite hasta 200 mesas.";
    const sectorTableCount = draft.tables.filter((item) => item.active && item.locationId === sector.id).length;
    if (sector.maxTables != null && sectorTableCount >= sector.maxTables) {
      const msg = `El sector ${sector.name} alcanzó su cupo máximo de ${sector.maxTables} mesas.`;
      setError(msg);
      return msg;
    }
    const width = Math.max(20, Math.min(2000, Math.round(preset.width)));
    const height = preset.shape === "RECTANGLE" ? Math.max(20, Math.min(2000, Math.round(preset.height))) : width;
    const slot = findOpenTableSlot(draft, sector, { width, height, shape: preset.shape, rotation: 0 }, undefined, preferredPoint);
    if (!slot) {
      const msg = `No hay espacio libre en ${sector.name} para una mesa de ${width}×${height}. Ampliá el sector o achicá la mesa.`;
      setError(msg);
      return msg;
    }
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
    const invalid = applyRoom({ ...draft, tables: [...draft.tables, created] }, () => {
      setPlacement(null);
      setSelection({ kind: "table", id: created.id });
    });
    if (invalid) setError(invalid);
    return invalid;
  };

  const assignUnlocatedTable = (tableId: string, locationId: string): string | null => {
    if (!draft || busy) return "Esperá a que termine de guardar.";
    const table = draft.tables.find((item) => item.id === tableId);
    const sector = draft.locations.find((item) => item.id === locationId && item.active);
    if (!table || !sector) return "Elegí una mesa y un sector activo.";
    const sectorTableCount = draft.tables.filter(
      (item) => item.active && item.locationId === sector.id && item.id !== table.id,
    ).length;
    if (sector.maxTables != null && sectorTableCount >= sector.maxTables) {
      const msg = `El sector ${sector.name} alcanzó su cupo máximo de ${sector.maxTables} mesas.`;
      setError(msg);
      return msg;
    }
    const slot = findOpenTableSlot(draft, sector, table, table.id);
    if (!slot) {
      const msg = `No hay espacio libre en ${sector.name} para ubicar ${table.label}. Ampliá el sector o editá la mesa.`;
      setError(msg);
      return msg;
    }
    const invalid = applyRoom(
      {
        ...draft,
        tables: draft.tables.map((item) =>
          item.id === table.id ? { ...item, locationId: sector.id, x: slot.x, y: slot.y, active: true } : item,
        ),
      },
      () => setSelection({ kind: "table", id: table.id }),
    );
    if (invalid) setError(invalid);
    return invalid;
  };

  const reassignTableSector = (tableId: string, locationId: string | undefined): string | null => {
    if (!draft || busy) return "Esperá a que termine de guardar.";
    if (!locationId) {
      return applyRoomChecked({
        ...draft,
        tables: draft.tables.map((item) => (item.id === tableId ? { ...item, locationId: undefined } : item)),
      });
    }
    return assignUnlocatedTable(tableId, locationId);
  };

  const place = (point: { x: number; y: number }, locationId?: string) => {
    if (!draft || !placement || busy || confirmation) return;
    const x = point.x;
    const y = point.y;
    if (placement === "sector") {
      const width = Math.min(320, draft.width);
      const height = Math.min(240, draft.height);
      const created: FloorLocation = {
        id: crypto.randomUUID(),
        name: uniqueName("Sector", draft.locations.filter((item) => item.active).map((item) => item.name)),
        width,
        height,
        x: Math.round(Math.max(width / 2, Math.min(draft.width - width / 2, x))),
        y: Math.round(Math.max(height / 2, Math.min(draft.height - height / 2, y))),
        rotation: 0,
        active: true,
      };
      applyRoomChecked({ ...draft, locations: [...draft.locations, created] }, () => {
        setPlacement(null);
        setSelection({ kind: "sector", id: created.id });
      });
    } else if (placement === "table") {
      if (!locationId) {
        setError("Tocá dentro de un sector activo para dibujar la mesa.");
        return;
      }
      addTableInSector(locationId, defaultTablePreset, { x, y });
    } else {
      const type = placement;
      const width = Math.min(type === "LABEL" ? 160 : type === "BAR" ? 240 : 160, draft.width);
      const height = Math.min(type === "WALL" ? 16 : type === "BAR" ? 80 : 40, draft.height);
      const created: FloorFixture = {
        id: crypto.randomUUID(),
        type,
        label: type === "BAR" ? "Barra" : type === "LABEL" ? "Entrada" : "",
        width,
        height,
        x: Math.round(Math.max(width / 2, Math.min(draft.width - width / 2, x))),
        y: Math.round(Math.max(height / 2, Math.min(draft.height - height / 2, y))),
        rotation: 0,
      };
      applyRoomChecked({ ...draft, fixtures: [...draft.fixtures, created] }, () => {
        setPlacement(null);
        setSelection({ kind: "fixture", id: created.id });
      });
    }
  };

  const selectedSector = selection?.kind === "sector" ? draft?.locations.find((item) => item.id === selection.id) : undefined;
  const selectedFixture = selection?.kind === "fixture" ? draft?.fixtures.find((item) => item.id === selection.id) : undefined;
  const selectedTable = selection?.kind === "table" ? draft?.tables.find((item) => item.id === selection.id) : undefined;

  const rotateSelection = () => {
    if (!draft || busy) return;
    if (selectedSector) {
      patch({
        ...draft,
        locations: draft.locations.map((item) =>
          item.id === selectedSector.id ? { ...item, rotation: nextRotation(item.rotation) } : item,
        ),
      });
    }
    if (selectedFixture) {
      patch({
        ...draft,
        fixtures: draft.fixtures.map((item) =>
          item.id === selectedFixture.id ? { ...item, rotation: nextRotation(item.rotation) } : item,
        ),
      });
    }
    if (selectedTable) {
      applyRoomChecked({
        ...draft,
        tables: draft.tables.map((item) =>
          item.id === selectedTable.id ? { ...item, rotation: nextRotation(item.rotation) } : item,
        ),
      });
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
        const archivedTableIds = selectedSector
          ? new Set(draft.tables.filter((item) => item.locationId === selection.id).map((item) => item.id))
          : selectedTable
            ? new Set([selection.id])
            : new Set<string>();
        patch(
          selectedSector
            ? {
                ...draft,
                locations: draft.locations.map((item) => (item.id === selection.id ? { ...item, active: false } : item)),
                tables: draft.tables.map((item) => (item.locationId === selection.id ? { ...item, active: false } : item)),
                combinations: draft.combinations.map((combo) =>
                  combo.members.some((m) => archivedTableIds.has(m.tableId)) ? { ...combo, active: false } : combo,
                ),
              }
            : selectedTable
              ? {
                  ...draft,
                  tables: draft.tables.map((item) => (item.id === selection.id ? { ...item, active: false } : item)),
                  combinations: draft.combinations.map((combo) =>
                    combo.members.some((m) => archivedTableIds.has(m.tableId)) ? { ...combo, active: false } : combo,
                  ),
                }
              : { ...draft, fixtures: draft.fixtures.filter((item) => item.id !== selection.id) },
        );
        setSelection(null);
        setConfirmation(null);
      },
    });
  };

  const archiveRoom = () => {
    if (!draft || busy) return;
    setError(null);
    setConfirmation({
      title: "Archivar salón",
      description: `${hasUnsaved ? "Se descartarán los cambios sin guardar de este salón. " : ""}No se podrá archivar si tiene asignaciones futuras comprometidas.`,
      confirmLabel: "Archivar salón",
      run: async () => {
        if (await mutate({ action: "archive-room", roomId: draft.id, expectedRevision: draft.revision }, "Salón archivado.", true)) {
          setConfirmation(null);
          setSelection(null);
        }
      },
    });
  };

  const deleteRoom = (target: FloorRoom) => {
    if (busy) return;
    setRoomsMenuOpen(false);
    setElementsMenuOpen(false);
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
          store.dispatch(
            floorAdminWorkspace.changed({
              draft: config?.rooms[0] ?? null,
              dirty: false,
              notice: "Borrador de salón descartado.",
            }),
          );
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
        if (
          await mutate(
            { action: "delete-room", roomId: target.id, expectedRevision: target.revision },
            "Salón eliminado.",
            isCurrent,
          )
        ) {
          setConfirmation(null);
          if (isCurrent) setSelection(null);
        }
      },
    });
  };

  const configurationAction = async (body: unknown, message: string) => {
    if (hasUnsaved) {
      setError("Guardá el plano antes de modificar la configuración.");
      return false;
    }
    return mutate(body, message);
  };

  const activeSectors = draft?.locations.filter((location) => location.active) ?? [];
  const canvasTables = draft
    ? draft.tables
        .filter((table) => table.active && Boolean(table.locationId))
        .map((table) => ({ ...table, subtitle: `${table.capacity}p` }))
    : [];
  const editorLocations = draft
    ? draft.locations
        .filter((location) => location.active)
        .map((location) => {
          const placedCount = draft.tables.filter((table) => table.active && table.locationId === location.id).length;
          const quotaParts = [
            location.maxTables != null ? `${placedCount}/${location.maxTables}m` : `${placedCount}m`,
            location.maxCapacity != null ? `Cupo ${location.maxCapacity}p` : null,
          ].filter(Boolean);
          return { ...location, quotaLabel: quotaParts.join(" · ") };
        })
    : [];

  const canSelectPlan = interactive && !placement;
  const selectionCount = selectedElements.length;
  let status = "Preparando el plano…";
  if (placement) {
    const target =
      placement === "sector"
        ? "el sector"
        : placement === "table"
          ? "la mesa dentro de un sector"
          : placement === "WALL"
            ? "la pared"
            : placement === "BAR"
              ? "la barra"
              : "el texto";
    status = "Tocá dentro del salón para ubicar " + target + ".";
  } else if (selectionCount > 1) {
    status = selectionCount + " elementos seleccionados. Arrastrá uno para moverlos juntos.";
  } else if (hasUnsaved) {
    status = "Cambios sin guardar";
  } else if (selectedSector) {
    status = "Arrastrá los bordes o esquinas para ajustar el sector, o arrastralo para mover sector y mesas.";
  } else if (selectedTable) {
    status = `Mesa ${selectedTable.label} seleccionada. Arrastrala dentro del sector o editala en el panel.`;
  } else if (draft) {
    status = "Dibujá sectores con su cupo y ubicá sus mesas fijas adentro.";
  }

  return (
    <main
      data-admin-panel
      className={`fixed inset-y-0 left-16 right-0 isolate flex h-dvh flex-col overflow-hidden bg-[#f5f2e9] text-zinc-950 selection:bg-[#d6e8d4] ${
        confirmation ? "z-50" : ""
      }`}
    >
      <h1 className="sr-only">Editor de salones · {config?.restaurantName ?? "Restaurante"}</h1>

      {/* Zone 1: Top Studio Header Bar */}
      <header className="relative z-30 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 py-2 sm:px-4">
        {/* Left: Restaurant & Quick Room Switcher */}
        <div className="flex min-w-0 items-center gap-2">
          <div ref={roomsMenuRef} className="relative">
            <button
              ref={roomsTriggerRef}
              {...transientButtonProps}
              type="button"
              aria-label="Cambiar salón"
              aria-haspopup="menu"
              aria-expanded={roomsMenuOpen}
              disabled={!config || busy}
              onClick={() => {
                setElementsMenuOpen(false);
                setRoomsMenuOpen((open) => !open);
              }}
              className="inline-flex h-9 max-w-[14rem] items-center gap-2 rounded-lg border border-stone-200 bg-[#f8faf7] px-2.5 text-left text-xs font-semibold text-[#182618] hover:bg-[#edf2e9] disabled:opacity-45 sm:max-w-[18rem]"
            >
              <Building2 size={15} className="shrink-0 text-[#3d5934]" aria-hidden="true" />
              <span className="truncate">{draft?.name ?? (config ? "Sin salones" : "Cargando…")}</span>
              {draft && (
                <span className="hidden text-[11px] font-normal text-[#46543e] tabular-nums sm:inline">
                  {draft.width}×{draft.height}
                </span>
              )}
              <ChevronDown size={14} className="shrink-0 text-stone-500" aria-hidden="true" />
            </button>

            {roomsMenuOpen && (
              <nav
                aria-label="Selector rápido de salones"
                className="absolute left-0 top-[calc(100%+0.375rem)] z-40 w-72 rounded-xl border border-stone-200 bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(24,38,24,0.18)]"
              >
                <div className="mb-1 border-b border-stone-100 px-2.5 py-1.5 text-[11px] font-medium text-[#46543e]">
                  {config?.restaurantName ?? "Restaurante"}
                </div>
                <div className="max-h-64 space-y-0.5 overflow-y-auto">
                  {config?.rooms.map((room) => (
                    <div key={room.id} className="flex items-center gap-1">
                      <button
                        {...transientButtonProps}
                        type="button"
                        aria-pressed={draft?.id === room.id}
                        onClick={() => selectRoom(room)}
                        className={`flex min-h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2.5 text-left text-xs font-medium transition-colors ${
                          draft?.id === room.id
                            ? "bg-[#edf2e9] font-semibold text-[#182618]"
                            : "text-zinc-800 hover:bg-stone-50"
                        }`}
                      >
                        <span className="truncate">
                          {room.name}
                          {!room.active && " · Archivado"}
                        </span>
                        {draft?.id === room.id && <Check size={14} className="shrink-0 text-[#3d5934]" />}
                      </button>
                      <button
                        {...transientButtonProps}
                        type="button"
                        disabled={busy}
                        aria-label={`Eliminar salón ${room.name}`}
                        title={`Eliminar salón ${room.name}`}
                        onClick={() => deleteRoom(room)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-45"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  {...transientButtonProps}
                  type="button"
                  disabled={!config || busy}
                  onClick={createRoom}
                  className="mt-1 flex min-h-9 w-full items-center gap-1.5 border-t border-stone-100 px-2.5 pt-2 text-xs font-semibold text-[#2d4628] hover:text-[#182618]"
                >
                  <Plus size={14} aria-hidden="true" />
                  Nuevo salón
                </button>
              </nav>
            )}
          </div>
          {draft && !draft.active && (
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
              Archivado
            </span>
          )}
        </div>

        {/* Center: Primary Canvas Modes & Direct Placement Tools */}
        <nav aria-label="Herramientas del editor" className="flex flex-wrap items-center gap-1.5">
          <div
            role="group"
            aria-label="Modo del plano"
            className="flex items-center rounded-lg border border-stone-200 bg-stone-50 p-0.5"
          >
            <button
              {...transientButtonProps}
              type="button"
              aria-pressed={interactionMode === "select"}
              disabled={!draft || busy}
              onClick={() => {
                setPlacement(null);
                setInteractionMode("select");
              }}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors disabled:opacity-45 ${
                interactionMode === "select" ? "bg-[#3d5934] text-white" : "text-zinc-700 hover:bg-white"
              }`}
            >
              <MousePointer2 size={14} aria-hidden="true" />
              <span className="hidden md:inline">Seleccionar</span>
            </button>
            <button
              {...transientButtonProps}
              type="button"
              aria-pressed={interactionMode === "pan"}
              disabled={!draft || busy}
              onClick={() => {
                setPlacement(null);
                setInteractionMode("pan");
              }}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors disabled:opacity-45 ${
                interactionMode === "pan" ? "bg-[#3d5934] text-white" : "text-zinc-700 hover:bg-white"
              }`}
            >
              <Hand size={14} aria-hidden="true" />
              <span className="hidden md:inline">Mover vista</span>
            </button>
          </div>

          <span aria-hidden className="hidden h-5 w-px bg-stone-200 sm:inline-block" />

          <button
            {...transientButtonProps}
            type="button"
            aria-pressed={placement === "sector"}
            disabled={!draft || busy || Boolean(placement)}
            onClick={() => beginPlacement("sector")}
            className={`${topBarButtonBase} bg-[#182618] text-white hover:bg-[#2d4628]`}
          >
            <MapPin size={14} aria-hidden="true" />
            <span>Agregar sector</span>
          </button>

          <button
            {...transientButtonProps}
            type="button"
            aria-pressed={placement === "table"}
            disabled={!draft || busy || Boolean(placement) || !activeSectors.length}
            onClick={() => beginPlacement("table")}
            className={`${topBarButtonBase} bg-[#2d4628] text-white hover:bg-[#3d5934]`}
          >
            <Package size={14} aria-hidden="true" />
            <span>Agregar mesa</span>
          </button>

          <div ref={elementsMenuRef} className="relative">
            <button
              ref={elementsTriggerRef}
              {...transientButtonProps}
              type="button"
              aria-haspopup="menu"
              aria-expanded={elementsMenuOpen}
              disabled={!draft || busy}
              onClick={() => {
                setRoomsMenuOpen(false);
                setElementsMenuOpen((open) => !open);
              }}
              className={`${topBarButtonBase} border border-stone-200 bg-white text-zinc-800 hover:bg-stone-50`}
            >
              <Shapes size={14} aria-hidden="true" />
              <span>Agregar elemento</span>
              <ChevronDown size={13} aria-hidden="true" />
            </button>

            {elementsMenuOpen && (
              <div
                role="menu"
                aria-label="Insertar elemento"
                className="absolute right-0 top-[calc(100%+0.375rem)] z-40 w-44 rounded-xl border border-stone-200 bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(24,38,24,0.18)]"
              >
                {(
                  [
                    ["WALL", "Pared"],
                    ["BAR", "Barra"],
                    ["LABEL", "Texto"],
                  ] as const
                ).map(([type, label]) => (
                  <button
                    key={type}
                    {...transientButtonProps}
                    type="button"
                    role="menuitem"
                    onClick={() => beginPlacement(type)}
                    className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold text-zinc-800 hover:bg-[#edf2e9]"
                  >
                    <Plus size={14} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {placement && (
            <button
              {...transientButtonProps}
              type="button"
              onClick={() => setPlacement(null)}
              className={`${topBarButtonBase} border border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100`}
            >
              <X size={14} aria-hidden="true" />
              <span>Cancelar ubicación</span>
            </button>
          )}
        </nav>

        {/* Right: Grid toggle, Panel toggle, Live Room View, Save */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            {...transientButtonProps}
            type="button"
            aria-pressed={showGrid}
            title={showGrid ? "Ocultar cuadrícula" : "Mostrar cuadrícula"}
            disabled={!draft}
            onClick={() => setShowGrid((value) => !value)}
            className={`${topBarButtonBase} border ${
              showGrid
                ? "border-[#3d5934] bg-[#edf2e9] text-[#182618] hover:bg-[#e1eadc]"
                : "border-stone-200 bg-white text-zinc-700 hover:bg-stone-50"
            }`}
          >
            <Grid3x3 size={15} aria-hidden="true" />
            <span className="hidden xl:inline">Cuadrícula</span>
          </button>

          <button
            {...transientButtonProps}
            type="button"
            aria-label={inspectorOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
            title={inspectorOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
            onClick={() => setInspectorOpen((open) => !open)}
            className={`${topBarButtonBase} border border-stone-200 bg-white text-zinc-800 hover:bg-stone-50`}
          >
            <PanelRight size={15} aria-hidden="true" />
            <span className="hidden xl:inline">{inspectorOpen ? "Panel" : "Propiedades"}</span>
          </button>

          <Link
            href={roomHref}
            aria-label="Ver sala"
            title="Ver sala"
            aria-disabled={busy || undefined}
            onClick={(event) => guardLink(event, roomHref)}
            className={`${topBarButtonBase} border border-stone-200 bg-white text-zinc-800 hover:bg-stone-50`}
          >
            <LayoutGrid size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Ver sala</span>
          </Link>

          <button
            {...transientButtonProps}
            type="button"
            aria-label="Guardar plano"
            title="Guardar plano"
            disabled={!draft || !dirty || busy}
            onClick={() => {
              void save();
            }}
            className={`${topBarButtonBase} bg-[#182618] px-3 text-white hover:bg-[#2d4628]`}
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <Save size={15} aria-hidden="true" />
            )}
            <span>Guardar plano</span>
          </button>
        </div>
      </header>

      {/* Main Content Area: Unobstructed Canvas + Full-Height Docked Right Sidebar */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Zone 2: Clean 2D Canvas */}
        <div role="region" aria-label="Editor del salón" className="relative min-w-0 flex-1 bg-[#f5f2e9]">
          {draft && (
            <FloorCanvas
              key={draft.id}
              fullScreen
              editorMode
              hideModeSwitch
              grid={showGrid}
              interactionMode={interactionMode}
              onInteractionModeChange={setInteractionMode}
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
              onSelectLocation={
                canSelectPlan ? (id, additive) => selectCanvasElement({ kind: "sector", id }, additive) : undefined
              }
              onContextMenuLocation={canSelectPlan ? openSectorMenu : undefined}
              onResizeLocation={canSelectPlan ? resizeSector : undefined}
              onMoveLocation={
                canSelectPlan ? (id, point) => moveCanvasElement({ kind: "sector", id }, point) : undefined
              }
              onSelectFixture={
                canSelectPlan ? (id, additive) => selectCanvasElement({ kind: "fixture", id }, additive) : undefined
              }
              onMoveFixture={
                canSelectPlan ? (id, point) => moveCanvasElement({ kind: "fixture", id }, point) : undefined
              }
            />
          )}

          {!draft && (
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="max-w-sm text-center">
                <Building2 size={30} className="mx-auto mb-4 text-[#607054]" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-zinc-950">
                  {config ? "Creá tu primer salón" : "Cargando salones…"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#52634b]">
                  {config
                    ? "Definí las medidas, dibujá los sectores con sus cupos y ubicá las mesas fijas."
                    : "Preparando el editor del restaurante."}
                </p>
                {config && (
                  <button
                    {...transientButtonProps}
                    type="button"
                    disabled={busy}
                    onClick={createRoom}
                    className={`${adminPrimaryButtonClass} mt-5`}
                  >
                    <Plus size={16} aria-hidden="true" />
                    Crear salón
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Subtle Status & Feedback Overlay */}
          <div className="pointer-events-none absolute left-4 right-4 top-3 z-10 max-w-xl space-y-2">
            <p role="status" className="w-fit text-xs font-medium text-[#46543e]">
              {status}
            </p>
            {error && (
              <div
                role="alert"
                className="pointer-events-auto flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-900"
              >
                <span>{error}</span>
                {!config ? (
                  <button
                    {...transientButtonProps}
                    type="button"
                    onClick={() => setLoadAttempt((value) => value + 1)}
                    className="shrink-0 font-semibold underline underline-offset-4"
                  >
                    Reintentar
                  </button>
                ) : (
                  <button
                    {...transientButtonProps}
                    type="button"
                    aria-label="Cerrar error"
                    onClick={() => setError(null)}
                    className="shrink-0 text-red-700 hover:text-red-950"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            {notice && (
              <p
                role="status"
                className="w-fit rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-950"
              >
                {notice}
              </p>
            )}
          </div>
        </div>

        {/* Zone 3: Full-Height Docked Right Inspector Sidebar */}
        {inspectorOpen && (
          <>
            <div
              aria-hidden="true"
              onClick={() => setInspectorOpen(false)}
              className="fixed inset-0 z-30 bg-zinc-950/25 xl:hidden"
            />
            <aside className="fixed inset-y-0 right-0 left-16 z-40 flex h-full flex-col border-l border-stone-200 bg-white shadow-xl sm:left-auto sm:w-full sm:max-w-md xl:static xl:z-auto xl:w-96 xl:max-w-none xl:shadow-none">
              <FloorAdminInspector
                onCloseMobile={() => setInspectorOpen(false)}
                room={draft}
              config={config}
              dirty={dirty}
              activeTab={sidebarTab}
              onTabChange={setSidebarTab}
              selectedSector={selectedSector}
              selectedTable={selectedTable}
              selectedFixture={selectedFixture}
              busy={busy}
              onClearSelection={() => setSelection(null)}
              onUpdateRoomFields={(fields) => (draft ? applyRoom({ ...draft, ...fields }) : null)}
              onUpdateSector={(sector) =>
                draft
                  ? applyRoomChecked({
                      ...draft,
                      locations: draft.locations.map((loc) => (loc.id === sector.id ? sector : loc)),
                    })
                  : null
              }
              onUpdateTable={(table) =>
                draft
                  ? applyRoomChecked({
                      ...draft,
                      tables: draft.tables.map((tbl) => (tbl.id === table.id ? table : tbl)),
                    })
                  : null
              }
              onUpdateFixture={(fixture) =>
                draft
                  ? applyRoomChecked({
                      ...draft,
                      fixtures: draft.fixtures.map((fix) => (fix.id === fixture.id ? fixture : fix)),
                    })
                  : null
              }
              onAddTableInSector={(sectorId, preset) => addTableInSector(sectorId, preset)}
              onAssignUnlocatedTable={assignUnlocatedTable}
              onReassignTableSector={reassignTableSector}
              onRotateSelection={rotateSelection}
              onRemoveSelection={removeSelection}
              onSelectTable={(tableId) => setSelection({ kind: "table", id: tableId })}
              onSelectSector={(sectorId) => setSelection({ kind: "sector", id: sectorId })}
              onSelectFixture={(fixtureId) => setSelection({ kind: "fixture", id: fixtureId })}
              onOpenSectorContextMenu={openSectorMenu}
              onStartPlacement={beginPlacement}
              onSelectRoom={selectRoom}
              onCreateRoom={createRoom}
              onArchiveRoom={archiveRoom}
              onDeleteRoom={deleteRoom}
              onConfigurationAction={configurationAction}
              onDisableStaff={() =>
                setConfirmation({
                  title: "Desactivar cuenta de sala",
                  description:
                    "Se cerrarán sus sesiones y el personal dejará de acceder con esta cuenta. Las asignaciones se conservarán.",
                  confirmLabel: "Desactivar cuenta",
                  run: async () => {
                    if (await configurationAction({ action: "disable-staff" }, "Cuenta de sala desactivada.")) {
                      setConfirmation(null);
                    }
                  },
                })
              }
            />
          </aside>
          </>
        )}
      </div>

      {sectorMenu && selectedSector && selectedSector.active && !busy && !confirmation && !placement && (
        <FloorSectorContextMenu
          name={selectedSector.name}
          point={sectorMenu.point}
          disabled={busy}
          onAddTable={() => {
            setSectorMenu(null);
            addTableInSector(selectedSector.id, defaultTablePreset);
          }}
          onClose={() => setSectorMenu(null)}
        />
      )}

      {confirmation && (
        <AdminConfirmModal
          open
          title={confirmation.title}
          description={confirmation.description}
          confirmLabel={confirmation.confirmLabel}
          loading={busy}
          onClose={() => {
            if (!busy) setConfirmation(null);
          }}
          onConfirm={confirmation.run}
        >
          {error && (
            <p role="alert" className="mb-4 text-sm text-red-800">
              {error}
            </p>
          )}
        </AdminConfirmModal>
      )}
    </main>
  );
}
