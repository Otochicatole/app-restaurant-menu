import { floorTableSchema, type FloorRotation, type FloorTable } from "../contracts";

export type FloorSelectionChanges = {
  inventory?: Partial<Pick<FloorTable, "shape" | "width" | "height" | "capacity" | "active">>;
  labels?: Record<string, string>;
  position?: Partial<Pick<FloorTable, "x" | "y" | "rotation">>;
  translation?: { x: number; y: number; rotation: FloorRotation };
};

type SelectionResult = { success: true; tables: FloorTable[] } | { success: false; error: string };

/** Applies only explicit changes; blank bulk fields never supply defaults. */
export function applyFloorSelectionChanges(tables: FloorTable[], changes: FloorSelectionChanges): SelectionResult {
  if (!tables.length) return { success: false, error: "Seleccioná al menos una mesa para editar." };
  if (new Set(tables.map((table) => table.id)).size !== tables.length) return { success: false, error: "La selección contiene mesas repetidas. Volvé a abrir el editor." };
  if (tables.length > 1 && changes.position && Object.keys(changes.position).length) return { success: false, error: "Usá el desplazamiento del grupo para mover varias mesas." };

  const bounds = tables.map((table) => {
    const width = table.rotation % 180 ? table.height : table.width;
    const height = table.rotation % 180 ? table.width : table.height;
    return { left: table.x - width / 2, right: table.x + width / 2, top: table.y - height / 2, bottom: table.y + height / 2 };
  });
  const centerX = (Math.min(...bounds.map((box) => box.left)) + Math.max(...bounds.map((box) => box.right))) / 2;
  const centerY = (Math.min(...bounds.map((box) => box.top)) + Math.max(...bounds.map((box) => box.bottom))) / 2;
  const result: FloorTable[] = [];
  for (const table of tables) {
    const inventory = changes.inventory ?? {};
    const candidate: FloorTable = { ...table, ...inventory, ...changes.position, label: changes.labels?.[table.id] ?? table.label };
    if (candidate.shape !== "RECTANGLE") {
      // Height is a separate dimension only for rectangles. Choosing a round or
      // square shape preserves each table's own width unless a width was entered.
      candidate.height = inventory.shape !== undefined || inventory.width !== undefined ? candidate.width : table.height;
    }
    if (changes.translation) {
      const { x, y, rotation } = changes.translation;
      if (!Number.isFinite(x) || !Number.isFinite(y) || ![0, 90, 180, 270].includes(rotation)) return { success: false, error: "Revisá el desplazamiento y el giro del grupo." };
      const dx = table.x - centerX; const dy = table.y - centerY;
      const rotated = rotation === 90 ? { x: -dy, y: dx } : rotation === 180 ? { x: -dx, y: -dy } : rotation === 270 ? { x: dy, y: -dx } : { x: dx, y: dy };
      candidate.x = rotation === 0 ? table.x + x : centerX + rotated.x + x;
      candidate.y = rotation === 0 ? table.y + y : centerY + rotated.y + y;
      candidate.rotation = ((table.rotation + rotation) % 360) as FloorRotation;
    }
    const parsed = floorTableSchema.safeParse(candidate);
    if (!parsed.success) return { success: false, error: `Revisá la mesa ${table.label}: el nombre es obligatorio, las medidas deben ser positivas y la capacidad un entero entre 1 y 500. La posición debe estar entre −100.000 y 100.000.` };
    result.push(parsed.data);
  }
  return { success: true, tables: result };
}
