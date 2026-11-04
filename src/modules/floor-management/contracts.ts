import { z } from "zod";

export const rotationSchema = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);
export type FloorRotation = z.infer<typeof rotationSchema>;
export const tableShapeSchema = z.enum(["SQUARE", "RECTANGLE", "CIRCLE"]);
export type FloorTableShape = z.infer<typeof tableShapeSchema>;
const coordinate = z.number().finite().min(-100_000).max(100_000);
const dimension = z.number().finite().positive().max(20_000);
export const fixtureSchema = z.object({
  id: z.string().min(1), type: z.enum(["WALL", "BAR", "LABEL"]),
  x: coordinate, y: coordinate, width: dimension, height: dimension,
  rotation: rotationSchema.default(0), label: z.string().max(100).default(""),
});
export type FloorFixture = z.infer<typeof fixtureSchema>;
export const floorLocationSchema = z.object({
  id: z.string().min(1), name: z.string().trim().min(1).max(100),
  x: coordinate, y: coordinate, width: dimension, height: dimension,
  rotation: rotationSchema.default(0), active: z.boolean().default(true),
});
export type FloorLocation = z.infer<typeof floorLocationSchema>;
export const floorTableSchema = z.object({
  id: z.string().min(1), label: z.string().trim().min(1).max(40), shape: tableShapeSchema,
  capacity: z.number().int().min(1).max(500), x: coordinate, y: coordinate,
  width: dimension, height: dimension, rotation: rotationSchema.default(0), active: z.boolean().default(true),
}).refine((table) => table.shape === "RECTANGLE" || table.width === table.height, "Las mesas cuadradas o redondas deben tener ancho y alto iguales.");
export type FloorTable = z.infer<typeof floorTableSchema>;
export const combinationMemberSchema = z.object({ tableId: z.string().min(1), x: coordinate, y: coordinate, rotation: rotationSchema.default(0) });
export const floorCombinationSchema = z.object({
  id: z.string().min(1), name: z.string().trim().min(1).max(80), capacity: z.number().int().positive().max(500),
  active: z.boolean().default(true), members: z.array(combinationMemberSchema).min(2).max(40),
});
export type FloorCombination = z.infer<typeof floorCombinationSchema>;
export const floorTableInventorySchema = z.object({
  roomId: z.string().min(1), expectedRevision: z.number().int().nonnegative(),
  tables: z.array(floorTableSchema).max(200), combinations: z.array(floorCombinationSchema).max(200),
}).strict();
export type FloorTableInventoryInput = z.infer<typeof floorTableInventorySchema>;
export const floorRoomInputSchema = z.object({
  id: z.string().optional(), name: z.string().trim().min(1).max(100), width: dimension, height: dimension,
  fixtures: z.array(fixtureSchema).max(200), locations: z.array(floorLocationSchema).max(100).default([]), active: z.boolean().default(true),
  tables: z.array(floorTableSchema).max(200), combinations: z.array(floorCombinationSchema).max(200),
});
export type FloorRoomInput = z.infer<typeof floorRoomInputSchema>;
export type FloorRoom = Omit<FloorRoomInput, "id"> & { id: string; restaurantId: string; revision: number };
export const floorAssignmentSchema = z.object({
  roomId: z.string().min(1), optionId: z.string().regex(/^(?:(?:table|combination):.+|custom)$/),
  locationId: z.string().min(1).optional(),
  customTables: z.array(z.object({ tableId: z.string().min(1), x: coordinate, y: coordinate, rotation: rotationSchema })).min(1).max(40).optional(),
  capacity: z.number().int().positive().max(500).optional(),
  x: coordinate, y: coordinate, rotation: rotationSchema,
  expectedRoomRevision: z.number().int().nonnegative(),
  retainExisting: z.boolean().optional(),
});
export type FloorAssignmentInput = z.infer<typeof floorAssignmentSchema>;
export type FloorPose = Omit<FloorTable, "id" | "active"> & { tableId: string };
export type FloorInterval = { serviceStartAt: string; serviceEndAt: string; blockedFrom: string; blockedUntil: string; timeZone: string };
export type FloorAllocationView = FloorInterval & {
  id: string; reservationId: string; roomId: string; combinationId: string | null; capacity: number;
  customerName: string; partySize: number; date: string; time: string; notes: string; code: string;
  releasedAt: string | null; poses: FloorPose[]; version: number;
  locationId?: string | null; source?: string; reservationRevision?: number;
};
export type FloorAssignmentOption = {
  id: string; roomId: string; label: string; capacity: number; x: number; y: number; rotation: FloorRotation;
  poses: FloorPose[]; available: boolean; resourceAvailable?: boolean; locationId?: string; conflict?: string;
};
export type FloorOptionsQuery = { date: string; time: string; partySize: number; eventId?: string | null; excludeReservationId?: string };
export type FloorOptionsView = {
  rooms: FloorRoom[]; options: FloorAssignmentOption[]; interval: FloorInterval;
  currentAllocation?: FloorAllocationView | null; hasAvailability?: boolean;
};
export type FloorConfigView = {
  restaurantId: string; restaurantName: string; timeZone: string; enabled: boolean; rooms: FloorRoom[];
  staffAccount: { email: string } | null;
  compatibility: { status: "compatible" | "manual-update-required"; hasManagedReservations?: boolean; reason?: string };
};
export type FloorBoardView = {
  restaurantId: string; restaurantName: string; timeZone: string; enabled: boolean; at: string;
  rooms: FloorRoom[]; allocations: FloorAllocationView[]; updatedAt: string;
};
export type FloorLease = { id: string; reservationId: string; roomId: string; blockedFrom: string; blockedUntil: string; releasedAt: string | null; poses: FloorPose[]; locationId?: string | null };

/** Shared mapping boundary; accepts repository rows without exposing ORM types. */
export function toFloorRoom(value: unknown): FloorRoom {
  const row = value as Record<string, unknown>;
  const room = floorRoomInputSchema.parse({ ...row, fixtures: JSON.parse(String(row.fixturesJson ?? "[]")) });
  return { ...room, id: String(row.id), restaurantId: String(row.restaurantId), revision: Number(row.revision) };
}

export { calculateFloorInterval, restaurantToday, restaurantLocalDateTime, validateTimeZone } from "./domain/time-policy";
export { buildFloorOptions, composeRoomPoses, validateRoomLayout, validateFloorPlacement, transformPoses, findFloorPlacement, validateAssembly, validateTableArrangement, getJoinedTableGroups } from "./domain/floor-policy";
