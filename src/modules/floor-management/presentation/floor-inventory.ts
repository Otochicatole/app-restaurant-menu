import type { FloorRoom, FloorTable } from "../contracts";
import { groupInventoryTables } from "./floor-table-groups";

export function inventoryTables(quantity: number, fields: Pick<FloorTable, "shape" | "capacity" | "width" | "height">, existing: FloorTable[]): FloorTable[] {
  const labels = new Set(existing.map((table) => table.label));
  return Array.from({ length: quantity }, () => {
    let number = 1; while (labels.has(`M${number}`)) number += 1; labels.add(`M${number}`);
    return { ...fields, id: crypto.randomUUID(), label: `M${number}`, x: 0, y: 0, height: fields.shape === "RECTANGLE" ? fields.height : fields.width, rotation: 0, active: true };
  });
}

export function resizeInventoryGroup(room: FloorRoom, key: string, fields: Pick<FloorTable, "shape" | "width" | "height"> & { quantity: number }): FloorTable[] | string {
  if (!Number.isInteger(fields.quantity) || fields.quantity < 0 || fields.quantity > 200) return "Ingresá una cantidad entera entre 0 y 200.";
  const group = groupInventoryTables(room.tables).find((item) => item.key === key);
  if (!group) return "El tipo de mesa ya no está disponible. Volvé al inventario.";
  const referenced = new Set(room.combinations.filter((item) => item.active).flatMap((item) => item.members.map((member) => member.tableId)));
  const active = group.tables.filter((table) => table.active);
  const protectedTables = active.filter((table) => referenced.has(table.id));
  if (fields.quantity < protectedTables.length) return "Este tipo tiene mesas usadas por armados predefinidos. Modificá esos armados antes de reducir la cantidad.";
  const candidates = [...protectedTables, ...active.filter((table) => !referenced.has(table.id)), ...group.tables.filter((table) => !table.active)];
  const kept = new Set(candidates.slice(0, fields.quantity).map((table) => table.id));
  const members = new Set(group.tables.map((table) => table.id));
  const dimensions = { shape: fields.shape, width: fields.width, height: fields.shape === "RECTANGLE" ? fields.height : fields.width };
  const tables = room.tables.map((table) => members.has(table.id) ? { ...table, ...dimensions, active: kept.has(table.id) } : table);
  const additional = Math.max(0, fields.quantity - group.tables.length);
  if (tables.length + additional > 200) return "El salón admite hasta 200 mesas en el inventario.";
  const capacity = active[0]?.capacity ?? group.tables[0].capacity;
  tables.push(...inventoryTables(additional, { ...dimensions, capacity }, tables));
  return tables;
}
