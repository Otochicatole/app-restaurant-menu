import { z } from "zod";
import { isLucideIconKey } from "./domain/lucide-icon-catalog";

const finiteNumber = z.number().finite();
const id = z.string().trim().min(1).max(200);
const color = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);
const link = z.string().trim().max(2048).refine((value) => /^(https?:|mailto:|tel:)/i.test(value), "Link inválido").nullable();
export const SYSTEM_FONT_FAMILIES = ["Arial", "Georgia", "Verdana", "Trebuchet MS", "Times New Roman", "Courier New", "Tahoma", "Impact"] as const;
export const systemFontFamilySchema = z.enum(SYSTEM_FONT_FAMILIES);

const nodeBase = z.object({
  id,
  name: z.string().trim().max(120).optional(),
  x: finiteNumber,
  y: finiteNumber,
  width: finiteNumber.positive().max(100_000),
  height: finiteNumber.positive().max(100_000),
  rotation: finiteNumber.min(-360).max(360).default(0),
  opacity: finiteNumber.min(0).max(1).default(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  groupId: id.nullable().default(null),
  link,
});

const textNode = nodeBase.extend({
  type: z.literal("text"),
  text: z.string().max(20_000),
  fontAssetId: id.nullable().default(null),
  fontFamily: systemFontFamilySchema.optional(),
  fontSize: finiteNumber.positive().max(2_000).default(32),
  fontWeight: z.enum(["400", "500", "600", "700", "800", "900"]).default("400"),
  fontStyle: z.enum(["normal", "italic"]).default("normal"),
  textDecoration: z.enum(["none", "underline", "line-through"]).default("none"),
  align: z.enum(["left", "center", "right"]).default("left"),
  verticalAlign: z.enum(["top", "middle", "bottom"]).default("top"),
  lineHeight: finiteNumber.min(0.5).max(4).default(1.2),
  letterSpacing: finiteNumber.min(-20).max(100).default(0),
  fill: color.default("#171717"),
  semanticRole: z.enum(["none", "heading", "paragraph", "label", "price"]).default("paragraph"),
});

const imageNode = nodeBase.extend({
  type: z.literal("image"),
  assetId: id,
  fit: z.enum(["contain", "cover", "stretch"]).default("contain"),
  cropX: finiteNumber.min(0).max(1).default(0),
  cropY: finiteNumber.min(0).max(1).default(0),
  cropWidth: finiteNumber.min(0).max(1).default(1),
  cropHeight: finiteNumber.min(0).max(1).default(1),
  cornerRadius: finiteNumber.min(0).max(10_000).default(0),
  alt: z.string().max(500).default(""),
});

const shapeNode = nodeBase.extend({
  type: z.literal("shape"),
  shape: z.enum(["rect", "ellipse", "line", "arrow", "triangle", "star"]),
  fill: color.nullable().default("#3A4824"),
  stroke: color.nullable().default(null),
  strokeWidth: finiteNumber.min(0).max(500).default(0),
  cornerRadius: finiteNumber.min(0).max(10_000).default(0),
});

const iconNode = nodeBase.extend({
  type: z.literal("icon"),
  iconKey: z.string().regex(/^[a-z0-9-]+$/).max(80).refine(isLucideIconKey, "Icono Lucide inválido"),
  accessibleLabel: z.string().trim().max(160).default(""),
  fill: color.default("#3A4824"),
  strokeWidth: finiteNumber.min(0.5).max(20).default(2),
});

export const canvasNodeSchema = z.discriminatedUnion("type", [textNode, imageNode, shapeNode, iconNode]);
export type CanvasNode = z.infer<typeof canvasNodeSchema>;
export type CanvasTextNode = z.infer<typeof textNode>;
export type CanvasImageNode = z.infer<typeof imageNode>;
export type CanvasShapeNode = z.infer<typeof shapeNode>;
export type CanvasIconNode = z.infer<typeof iconNode>;

export const canvasGroupSchema = z.object({
  id,
  name: z.string().trim().min(1).max(100),
  nodeIds: z.array(id).max(2_000),
});

export const canvasDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  background: color.default("#F3EEDC"),
  initialViewport: z.object({
    x: finiteNumber.min(-100_000).max(100_000),
    y: finiteNumber.min(-100_000).max(100_000),
    width: finiteNumber.positive().max(100_000),
    height: finiteNumber.positive().max(100_000),
  }),
  canvasBounds: z.object({
    x: finiteNumber.min(-100_000).max(100_000),
    y: finiteNumber.min(-100_000).max(100_000),
    width: finiteNumber.positive().max(100_000),
    height: finiteNumber.positive().max(100_000),
  }).optional(),
  nodes: z.array(canvasNodeSchema).max(2_000),
  groups: z.array(canvasGroupSchema).max(200),
}).transform((document) => ({ ...document, canvasBounds: document.canvasBounds ?? { ...document.initialViewport } }));

export type CanvasDocumentV1 = z.infer<typeof canvasDocumentSchema>;

export const saveDocumentSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  document: canvasDocumentSchema,
});
export const publishDocumentSchema = z.object({ baseRevision: z.number().int().nonnegative() });
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  publicDescription: z.string().trim().max(500),
});

export type SaveDocumentCommand = z.infer<typeof saveDocumentSchema>;
export type PublishDocumentCommand = z.infer<typeof publishDocumentSchema>;
export type RestaurantProfile = z.infer<typeof profileSchema>;

export type MenuProjectView = {
  document: CanvasDocumentV1;
  draftRevision: number;
  publishedRevision: number | null;
  publishedAt: string | null;
  hasPublishedDocument: boolean;
  legacyFallback: boolean;
};

export type MenuAssetKind = "IMAGE" | "FONT";
export type MenuAssetView = {
  id: string;
  kind: MenuAssetKind;
  name: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  fontFamily: string | null;
  url: string;
  createdAt: string;
};
