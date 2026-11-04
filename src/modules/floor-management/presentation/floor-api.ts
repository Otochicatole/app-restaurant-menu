import type { FloorAssignmentInput, FloorBoardView, FloorConfigView, FloorOptionsQuery, FloorOptionsView, FloorRoom, FloorTableInventoryInput } from "../contracts";

async function request<T>(restaurantId: string, parameters: Record<string, string>, body?: unknown, signal?: AbortSignal, resource?: { path: string; method?: "PUT" }): Promise<T> {
  const query = new URLSearchParams(parameters);
  const response = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/floor${resource?.path ?? ""}${query.size ? `?${query}` : ""}`, {
    method: resource?.method ?? (body === undefined ? "GET" : "POST"), cache: "no-store", credentials: "same-origin", signal,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "No se pudo cargar el salón. Volvé a intentar.");
  return payload.data as T;
}

export const getFloorConfig = (restaurantId: string, signal?: AbortSignal) => request<FloorConfigView>(restaurantId, { mode: "config" }, undefined, signal);
export const getFloorBoard = (restaurantId: string, at: string, signal?: AbortSignal) => request<FloorBoardView>(restaurantId, { mode: "board", at }, undefined, signal);
export const getFloorReassignmentOptions = (restaurantId: string, reservationId: string, signal?: AbortSignal) => request<FloorOptionsView>(restaurantId, {}, undefined, signal, { path: `/assignments/${encodeURIComponent(reservationId)}` });
export const reassignFloorTables = (restaurantId: string, reservationId: string, command: { expectedRevision: number; expectedAllocationVersion: number; assignment: FloorAssignmentInput }) => request<FloorBoardView>(restaurantId, {}, command, undefined, { path: `/assignments/${encodeURIComponent(reservationId)}`, method: "PUT" });
export const saveFloorTables = (restaurantId: string, command: FloorTableInventoryInput) => request<{ room: FloorRoom }>(restaurantId, {}, command, undefined, { path: "/tables", method: "PUT" });
export const saveFloorAction = <T = FloorConfigView>(restaurantId: string, body: unknown) => request<T>(restaurantId, {}, body);
export const getFloorOptions = (restaurantId: string, input: FloorOptionsQuery, signal?: AbortSignal, walkInDurationMinutes?: number) => request<FloorOptionsView>(restaurantId, {
  mode: walkInDurationMinutes ? "walk-in-options" : "options", date: input.date, time: input.time, partySize: String(input.partySize),
  ...(walkInDurationMinutes ? { durationMinutes: String(walkInDurationMinutes) } : {}),
  ...(input.eventId ? { eventId: input.eventId } : {}), ...(input.excludeReservationId ? { excludeReservationId: input.excludeReservationId } : {}),
}, undefined, signal);

export const floorInputClass = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-[#3d5934] focus:ring-2 focus:ring-[#3d5934]/15 disabled:bg-zinc-100";
