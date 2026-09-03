import { z } from "zod";
import { isLucideIconKey } from "./domain/lucide-icon-catalog";

const finiteNumber = z.number().finite();
const id = z.string().trim().min(1).max(200);
const color = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);
const link = z.string().trim().max(2048).refine((value) => /^(https?:|mailto:|tel:)/i.test(value), "Link inválido").nullable();
export const SYSTEM_FONT_FAMILIES = ["Arial", "Georgia", "Verdana", "Trebuchet MS", "Times New Roman", "Courier New", "Tahoma", "Impact"] as const;
export const systemFontFamilySchema = z.enum(SYSTEM_FONT_FAMILIES);
export const STROKE_SIDES = ["top", "right", "bottom", "left"] as const;
export const strokeSideSchema = z.enum(STROKE_SIDES);
export type StrokeSide = z.infer<typeof strokeSideSchema>;
export const CORNER_RADII = ["topLeft", "topRight", "bottomRight", "bottomLeft"] as const;
export const cornerRadiusKeySchema = z.enum(CORNER_RADII);
export type CornerRadiusKey = z.infer<typeof cornerRadiusKeySchema>;

const strokeSidesSchema = z.array(strokeSideSchema).max(STROKE_SIDES.length).refine((sides) => new Set(sides).size === sides.length, "Los lados del borde no pueden repetirse").transform((sides) => STROKE_SIDES.filter((side) => sides.includes(side)));
const cornerRadiiSchema = z.object({
  topLeft: finiteNumber.min(0).max(10_000),
  topRight: finiteNumber.min(0).max(10_000),
  bottomRight: finiteNumber.min(0).max(10_000),
  bottomLeft: finiteNumber.min(0).max(10_000),
});
const gradientStopSchema = z.object({
  color,
  offset: finiteNumber.min(0).max(1),
});
const fillGradientSchema = z.object({
  angle: finiteNumber.min(0).max(360),
  stops: z.tuple([gradientStopSchema, gradientStopSchema]).refine(([first, second]) => first.offset <= second.offset, "Las paradas del degradado deben estar ordenadas"),
});
const backgroundImageSchema = z.object({
  assetId: id,
  fit: z.enum(["cover", "contain", "stretch"]),
  positionX: finiteNumber.min(0).max(1),
  positionY: finiteNumber.min(0).max(1),
  opacity: finiteNumber.min(0).max(1),
});

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
  modalAssetId: id.nullable().default(null),
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
  strokeSides: strokeSidesSchema.default([...STROKE_SIDES]),
  cornerRadii: cornerRadiiSchema.optional(),
  fillGradient: fillGradientSchema.nullable().default(null),
  backgroundImage: backgroundImageSchema.nullable().default(null),
  /** @deprecated Only accepted while reading documents created before cornerRadii. */
  cornerRadius: finiteNumber.min(0).max(10_000).optional(),
});

const iconNode = nodeBase.extend({
  type: z.literal("icon"),
  iconKey: z.string().regex(/^[a-z0-9-]+$/).max(80).refine(isLucideIconKey, "Icono Lucide inválido"),
  accessibleLabel: z.string().trim().max(160).default(""),
  fill: color.default("#3A4824"),
  strokeWidth: finiteNumber.min(0.5).max(20).default(2),
});

export const canvasNodeSchema = z.discriminatedUnion("type", [textNode, imageNode, shapeNode, iconNode]);

export const canvasGroupSchema = z.object({
  id,
  name: z.string().trim().min(1).max(100),
  nodeIds: z.array(id).max(2_000),
});

const canvasDocumentInputSchema = z.object({
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
});

function normalizeShapeNode(node: z.output<typeof shapeNode>) {
  const { cornerRadius, cornerRadii, ...canonicalNode } = node;
  const legacyRadius = cornerRadius ?? 0;
  return {
    ...canonicalNode,
    cornerRadii: cornerRadii ?? {
      topLeft: legacyRadius,
      topRight: legacyRadius,
      bottomRight: legacyRadius,
      bottomLeft: legacyRadius,
    },
  };
}

export const canvasDocumentSchema = canvasDocumentInputSchema.transform((document) => ({
  ...document,
  canvasBounds: document.canvasBounds ?? { ...document.initialViewport },
  nodes: document.nodes.map((node) => node.type === "shape" ? normalizeShapeNode(node) : node),
}));

export type CanvasDocumentV1 = z.output<typeof canvasDocumentSchema>;
export type CanvasNode = CanvasDocumentV1["nodes"][number];
export type CanvasTextNode = Extract<CanvasNode, { type: "text" }>;
export type CanvasImageNode = Extract<CanvasNode, { type: "image" }>;
export type CanvasShapeNode = Extract<CanvasNode, { type: "shape" }>;
export type CanvasIconNode = Extract<CanvasNode, { type: "icon" }>;
export type FillGradient = z.output<typeof fillGradientSchema>;
export type RectangleBackgroundImage = z.output<typeof backgroundImageSchema>;

export const saveDocumentSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  document: canvasDocumentSchema,
});
export const publishDocumentSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  document: canvasDocumentSchema,
});
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
};

export type MenuAssetKind = "IMAGE" | "VIDEO" | "FONT";
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

export const templateVisibilitySchema = z.enum(["PRIVATE", "PUBLIC"]);
export const templateStatusSchema = z.enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"]);
export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
  submitPublic: z.boolean().default(false),
});
export const templateIdSchema = z.string().trim().min(1).max(200);
export type MenuTemplateVisibility = z.infer<typeof templateVisibilitySchema>;
export type MenuTemplateStatus = z.infer<typeof templateStatusSchema>;
export type CreateTemplateCommand = z.infer<typeof createTemplateSchema>;
export type MenuTemplateView = {
  id: string;
  name: string;
  description: string;
  visibility: MenuTemplateVisibility;
  status: MenuTemplateStatus;
  isSystem: boolean;
  tenantId: string | null;
  document: CanvasDocumentV1;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export const superadminTemplateTabSchema = z.enum(["all", "system", "published", "pending", "rejected", "archived"]);
export const superadminTemplateQuerySchema = z.object({
  tab: superadminTemplateTabSchema.default("all"),
  query: z.string().trim().max(120).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(24),
});
export type SuperadminTemplateTab = z.infer<typeof superadminTemplateTabSchema>;
export type SuperadminTemplateQuery = z.infer<typeof superadminTemplateQuerySchema>;
export type SuperadminTemplateView = MenuTemplateView & {
  owner: { tenantId: string; name: string; slug: string } | null;
};
export type SuperadminTemplateList = {
  items: SuperadminTemplateView[];
  total: number;
  page: number;
  pageSize: number;
};
