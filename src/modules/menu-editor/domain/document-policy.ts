import { BadRequestError } from "@/platform/application/errors";
import { CORNER_RADII, canvasDocumentSchema, type CanvasDocumentV1 } from "../contracts";
import { canonicalizeLucideIconKey, humanizeLucideIconName, isLucideIconKey } from "./lucide-icon-catalog";

export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const MAX_NODE_COUNT = 2_000;

export function normalizeLegacyCanvasDocument(input: unknown): unknown {
  if (!input || typeof input !== "object" || !Array.isArray((input as { nodes?: unknown }).nodes)) return input;
  const document = input as { nodes: unknown[] };
  return { ...document, nodes: document.nodes.map((node) => {
    if (!node || typeof node !== "object") return node;
    if ((node as { type?: string }).type === "shape") {
      const shape = node as { cornerRadius?: unknown; cornerRadii?: unknown };
      if (shape.cornerRadii === undefined && typeof shape.cornerRadius === "number") {
        return { ...(node as object), cornerRadii: Object.fromEntries(CORNER_RADII.map((corner) => [corner, shape.cornerRadius])) };
      }
      return node;
    }
    if ((node as { type?: string }).type !== "icon") return node;
    const raw = String((node as { iconKey?: unknown }).iconKey ?? "");
    const iconKey = isLucideIconKey(raw) ? canonicalizeLucideIconKey(raw) : "sparkles";
    const accessibleLabel = String((node as { accessibleLabel?: unknown }).accessibleLabel ?? "").trim() || humanizeLucideIconName(iconKey);
    return { ...(node as object), iconKey, accessibleLabel };
  }) };
}

export function validateCanvasDocument(input: unknown): CanvasDocumentV1 {
  const document = canvasDocumentSchema.parse(input);
  if (document.nodes.length > MAX_NODE_COUNT) throw new BadRequestError("El lienzo excede el máximo de objetos.");
  const nodeIds = new Set<string>();
  for (const node of document.nodes) {
    if (nodeIds.has(node.id)) throw new BadRequestError("El documento contiene IDs duplicados.");
    nodeIds.add(node.id);
    if (node.x < -100_000 || node.x > 100_000 || node.y < -100_000 || node.y > 100_000 || node.x + node.width > 100_000 || node.y + node.height > 100_000) {
      throw new BadRequestError("La posición de un objeto está fuera de los límites permitidos.");
    }
    if (node.type === "shape" && node.shape !== "rect" && (node.fillGradient || node.backgroundImage)) {
      throw new BadRequestError("Los fondos avanzados solo están disponibles para rectángulos.");
    }
  }
  const groupIds = new Set<string>();
  for (const group of document.groups) {
    if (groupIds.has(group.id)) throw new BadRequestError("El documento contiene grupos duplicados.");
    groupIds.add(group.id);
    for (const nodeId of group.nodeIds) {
      if (!nodeIds.has(nodeId)) throw new BadRequestError("Un grupo referencia un objeto inexistente.");
    }
  }
  const serialized = JSON.stringify(document);
  if (Buffer.byteLength(serialized, "utf8") > MAX_DOCUMENT_BYTES) throw new BadRequestError("El documento excede el tamaño máximo.");
  return document;
}

export function documentAssetIds(document: CanvasDocumentV1): Set<string> {
  const ids = new Set<string>();
  for (const node of document.nodes) {
    if (node.type === "image") ids.add(node.assetId);
    if (node.type === "text" && node.fontAssetId) ids.add(node.fontAssetId);
    if (node.type === "text" && node.modalAssetId) ids.add(node.modalAssetId);
    if (node.type === "shape" && node.shape === "rect" && node.backgroundImage) ids.add(node.backgroundImage.assetId);
  }
  return ids;
}

export function documentImageAssetIds(document: CanvasDocumentV1): Set<string> {
  return new Set(document.nodes.flatMap((node) => node.type === "image" ? [node.assetId] : []));
}

export function documentFontAssetIds(document: CanvasDocumentV1): Set<string> {
  return new Set(document.nodes.flatMap((node) => node.type === "text" && node.fontAssetId ? [node.fontAssetId] : []));
}

export function documentModalAssetIds(document: CanvasDocumentV1): Set<string> {
  return new Set(document.nodes.flatMap((node) => node.type === "text" && node.modalAssetId ? [node.modalAssetId] : []));
}

export function documentBackgroundImageAssetIds(document: CanvasDocumentV1): Set<string> {
  return new Set(document.nodes.flatMap((node) => node.type === "shape" && node.shape === "rect" && node.backgroundImage ? [node.backgroundImage.assetId] : []));
}
