export const FONT_CATEGORIES = ["serif", "sans-serif", "monospace", "display", "script"] as const;

export type FontCategory = (typeof FONT_CATEGORIES)[number];

export const FONT_TARGETS = ["global", "title", "subtitle", "group", "product", "featured"] as const;

export type FontTarget = (typeof FONT_TARGETS)[number];

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

export interface FontDTO {
  id: string;
  name: string;
  category: FontCategory;
  source: "google" | "custom";
  googleFamily?: string | null;
  fontFamily: string;
  weights: string;
  filePath?: string | null;
  createdAt: string;
  updatedAt: string;
}
