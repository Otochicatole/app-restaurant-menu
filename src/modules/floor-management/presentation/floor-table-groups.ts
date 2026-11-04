import type { FloorTable } from "../contracts";

export type FloorTableGroup = {
  key: string; label: string; shape: FloorTable["shape"]; width: number; height: number; tables: FloorTable[];
};

const shapeLabels = { SQUARE: "Cuadrada", RECTANGLE: "Rectangular", CIRCLE: "Redonda" } as const;
const shapeOrder = { SQUARE: 0, RECTANGLE: 1, CIRCLE: 2 } as const;
const labels = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
const dimensionLabel = (value: number) => String(value).replace(".", ",");

export function tableTypeKey(table: Pick<FloorTable, "shape" | "width" | "height">): string {
  return `${table.shape}:${table.width}:${table.height}`;
}

export function groupInventoryTables(tables: readonly FloorTable[]): FloorTableGroup[] {
  const groups = new Map<string, FloorTableGroup>();
  for (const table of tables) {
    const key = tableTypeKey(table);
    let group = groups.get(key);
    if (!group) {
      group = { key, shape: table.shape, width: table.width, height: table.height,
        label: `${shapeLabels[table.shape]} ${dimensionLabel(table.width)} × ${dimensionLabel(table.height)}`, tables: [] };
      groups.set(key, group);
    }
    group.tables.push(table);
  }
  for (const group of groups.values()) group.tables.sort((a, b) => labels.compare(a.label, b.label) || labels.compare(a.id, b.id));
  return [...groups.values()].sort((a, b) => shapeOrder[a.shape] - shapeOrder[b.shape] || a.width - b.width || a.height - b.height);
}

/** Keep concrete table identities while changing the quantity of just one type. */
export function selectTableGroupQuantity(group: FloorTableGroup, selectedIds: readonly string[], quantity: number, availableIds?: ReadonlySet<string>): string[] | null {
  if (!Number.isInteger(quantity) || quantity < 0) return null;
  const selected = new Set(selectedIds);
  const available = availableIds ?? new Set(group.tables.filter((table) => table.active).map((table) => table.id));
  const members = new Set(group.tables.map((table) => table.id));
  const current = group.tables.filter((table) => selected.has(table.id));
  const currentAvailable = current.filter((table) => table.active && available.has(table.id));
  const currentUnavailable = current.filter((table) => !table.active || !available.has(table.id));
  const additions = group.tables.filter((table) => table.active && available.has(table.id) && !selected.has(table.id));
  if (quantity > current.length + additions.length) return null;
  const wanted = [...currentAvailable, ...currentUnavailable, ...additions].slice(0, quantity).map((table) => table.id);
  const wantedIds = new Set(wanted);
  return [...selectedIds.filter((id) => !members.has(id) || wantedIds.has(id)), ...wanted.filter((id) => !selected.has(id))];
}
