import { z } from "zod";

export const FONT_CATEGORIES = ["serif", "sans-serif", "monospace", "display", "script"] as const;
export const FONT_TARGETS = ["global", "title", "subtitle", "group", "product", "featured"] as const;

export type FontCategory = (typeof FONT_CATEGORIES)[number];
export type FontTarget = (typeof FONT_TARGETS)[number];

export function fontFamilyAlias(id: string): string {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  return `tenant-font-${safeId || "custom"}`;
}

export const FONT_SETTING_KEYS: Record<FontTarget, string> = {
  global: "menu.activeFontId",
  title: "menu.font.title",
  subtitle: "menu.font.subtitle",
  group: "menu.font.group",
  product: "menu.font.product",
  featured: "menu.font.featured",
};

export const FONT_TARGET_LABELS: Record<FontTarget, string> = {
  global: "Global",
  title: "Título",
  subtitle: "Subtítulo",
  group: "Grupos",
  product: "Productos",
  featured: "Destacados",
};

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  serif: "Serif",
  "sans-serif": "Sans Serif",
  monospace: "Monoespaciada",
  display: "Display",
  script: "Script",
};

export const updateMenuHeaderSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(100, "El título es demasiado largo"),
  description: z.string().trim().max(500, "La descripción es demasiado larga"),
});

export const fontTargetSchema = z.enum(FONT_TARGETS);
export const fontCategorySchema = z.enum(FONT_CATEGORIES);
export const createCustomFontSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(100, "El nombre es demasiado largo"),
  category: fontCategorySchema,
});
export const selectFontSchema = z.object({
  target: fontTargetSchema,
  fontId: z.string().min(1).nullable(),
});

export type MenuHeader = {
  id: string | null;
  title: string;
  description: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type FontOption = {
  id: string;
  name: string;
  category: FontCategory;
  source: "google" | "custom";
  scope: "system" | "tenant";
  canDelete: boolean;
  googleFamily: string | null;
  familyAlias: string;
  fontFamily: string;
  weights: string;
  hasFile: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FontSelection = Record<FontTarget, FontOption | null>;
export type UpdateMenuHeaderCommand = z.infer<typeof updateMenuHeaderSchema>;
export type SelectFontCommand = z.infer<typeof selectFontSchema>;

export type CustomFontUpload = {
  name: string;
  category: FontCategory;
  file: { name: string; size: number; buffer: Uint8Array };
};
