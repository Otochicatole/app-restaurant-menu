import { createAction } from "@reduxjs/toolkit";
import { createEditorWorkspace } from "@/ui/editor-workspace";
import { emptyWindows } from "@/ui/useFloatingWindows";
import type { FloorAllocationView, FloorBoardView, FloorConfigView, FloorFixture, FloorLocation, FloorRoom } from "../contracts";
import type { FloorCanvasElement, FloorInteractionMode } from "./FloorCanvas";
import type { FloorServiceTarget } from "./FloorServiceWindow";

export type EditorPanel = { kind: "dimensions" | "tables" | "settings" } | { kind: "table"; id: string } | { kind: "sector"; entity: FloorLocation } | { kind: "fixture"; entity: FloorFixture };
export type EditorTool = { panel: EditorPanel; roomId: string | null; baseline: unknown };
export type Panel = "rooms" | "schedule" | "reservations" | "detail" | "release" | "service-list" | null;
export type OpenTableTarget = { roomId: string; tableId: string };
export type ActiveTableModal =
  | { kind: "open-table"; roomId: string; tableId: string }
  | { kind: "service"; target: FloorServiceTarget }
  | null;
export type ToolWindow = {
  kind: Exclude<Panel, "rooms" | "release" | null>;
  allocation?: FloorAllocationView;
  room?: FloorRoom;
};

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
    placement: null as "sector" | "table" | FloorFixture["type"] | null,
    selectedElements: [] as FloorCanvasElement[],
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
    saving: false,
    operationError: null as string | null,
    interactionMode: "service" as FloorInteractionMode,
    dirtyWindows: {} as Record<string, boolean>,
    activeTableModal: null as ActiveTableModal,
    tableModalDirty: false,
  };
}

export const floorBoardReceived = createAction<{ board: FloorBoardView; refreshedAt: string }>("floorBoard/received");
export const floorBoardWorkspace = createEditorWorkspace<ReturnType<typeof floorBoardSeed>>("floorBoard", (builder) => {
  builder
    .addCase(floorBoardReceived, (state, { payload }) => {
      state.board = payload.board;
      state.refreshedAt = payload.refreshedAt;
      state.error = null;
      if (!payload.board.rooms.some((room) => room.id === state.roomId && room.active)) {
        state.roomId = payload.board.rooms.find((room) => room.active)?.id ?? "";
      }
    });
});
