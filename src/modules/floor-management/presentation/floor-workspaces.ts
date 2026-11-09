import { createAction } from "@reduxjs/toolkit";
import { createEditorWorkspace } from "@/ui/editor-workspace";
import { emptyWindows } from "@/ui/useFloatingWindows";
import type { FloorAllocationView, FloorAssignmentInput, FloorBoardView, FloorCombination, FloorConfigView, FloorFixture, FloorLocation, FloorRoom, FloorTable } from "../contracts";
import type { FloorCanvasElement, FloorInteractionMode } from "./FloorCanvas";

export type EditorPanel = { kind: "dimensions" | "inventory" | "settings" } | { kind: "combination"; entity: FloorCombination } | { kind: "combination-layout"; id: string } | { kind: "table"; id: string } | { kind: "table-group"; key: string } | { kind: "sector"; entity: FloorLocation } | { kind: "fixture"; entity: FloorFixture };
export type EditorTool = { panel: EditorPanel; roomId: string | null; baseline: unknown };
export type CombinationMode = { combination: FloorCombination; selectedIds: string[] } | null;
export type Panel = "rooms" | "schedule" | "reservations" | "walk-in" | "detail" | "release" | "table" | "inventory" | null;
export type SelectionSnapshot = { ids: string[]; tables: FloorTable[]; stamp: string; roomId: string };
export type ToolWindow = { kind: Exclude<Panel, "rooms" | "release" | null> | "assembly"; allocation?: FloorAllocationView; selection?: SelectionSnapshot; room?: FloorRoom };
export const emptyWalkIn = { customerName: "", partySize: 2, notes: "", durationMinutes: 120 };

export function floorAdminSeed(initialConfig: FloorConfigView | null = null) {
  return {
    config: initialConfig,
    draft: initialConfig?.rooms[0] ?? null,
    dirty: false,
    busy: false,
    error: null as string | null,
    notice: null as string | null,
    windows: emptyWindows<EditorTool>(),
    editedTools: {} as Record<string, true>,
    placement: null as "sector" | FloorFixture["type"] | null,
    selectedElements: [] as FloorCanvasElement[],
    combinationMode: null as CombinationMode,
  };
}

export const floorConfigLoaded = createAction<{ config: FloorConfigView; room: FloorRoom | null }>("floorAdmin/configLoaded");
export const floorRoomChanged = createAction<{ room: FloorRoom; dirty: boolean }>("floorAdmin/roomChanged");
export const floorRoomPatched = createAction<FloorRoom>("floorAdmin/roomPatched");
export const floorAdminWorkspace = createEditorWorkspace<ReturnType<typeof floorAdminSeed>>("floorAdmin", (builder) => {
  builder
    .addCase(floorConfigLoaded, (state, { payload }) => {
      state.config = payload.config;
      state.draft = payload.room;
      state.error = null;
    })
    .addCase(floorRoomChanged, (state, { payload }) => {
      state.draft = payload.room;
      state.dirty = payload.dirty;
      state.selectedElements = [];
      state.combinationMode = null;
      state.placement = null;
      state.windows = emptyWindows();
      state.editedTools = {};
      state.error = null;
    })
    .addCase(floorRoomPatched, (state, { payload }) => {
      if (state.busy) return;
      state.draft = payload;
      state.dirty = true;
      state.notice = null;
      state.error = null;
    });
});

export function floorBoardSeed(initialBoard: FloorBoardView | null) {
  return {
    board: initialBoard,
    roomId: initialBoard?.rooms.find((room) => room.active)?.id ?? "",
    query: { date: "", time: "" },
    windows: emptyWindows<ToolWindow>(),
    loading: false,
    error: null as string | null,
    refreshedAt: initialBoard?.updatedAt ?? null,
    assembling: false,
    walkIn: emptyWalkIn,
    assignment: null as FloorAssignmentInput | null,
    saving: false,
    operationError: null as string | null,
    selectedResourceIds: [] as string[],
    interactionMode: "select" as FloorInteractionMode,
    layoutPreview: null as Record<string, Pick<FloorTable, "x" | "y" | "rotation">> | null,
    inventoryDirty: false,
    dirtyWindows: {} as Record<string, boolean>,
  };
}

export const floorBoardReceived = createAction<{ board: FloorBoardView; refreshedAt: string }>("floorBoard/received");
export const floorAssignmentChanged = createAction<FloorAssignmentInput | null>("floorBoard/assignmentChanged");
export const floorBoardWorkspace = createEditorWorkspace<ReturnType<typeof floorBoardSeed>>("floorBoard", (builder) => {
  builder
    .addCase(floorBoardReceived, (state, { payload }) => {
      state.board = payload.board;
      state.refreshedAt = payload.refreshedAt;
      state.error = null;
      if (!payload.board.rooms.some((room) => room.id === state.roomId && room.active)) {
        state.roomId = payload.board.rooms.find((room) => room.active)?.id ?? "";
      }
    })
    .addCase(floorAssignmentChanged, (state, { payload }) => {
      state.assignment = payload;
      state.operationError = null;
      const ids = (payload?.customTables ?? []).map((table) => "draft:" + table.tableId);
      const kept = state.selectedResourceIds.filter((id) => !id.startsWith("draft:") || ids.includes(id));
      state.selectedResourceIds = kept.some((id) => id.startsWith("draft:")) || !ids.length ? kept : ids;
    });
});
