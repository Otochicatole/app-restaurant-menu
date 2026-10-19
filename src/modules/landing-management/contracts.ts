import { z } from "zod";

export const landingFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "color",
  "url",
  "image",
]);

export type LandingFieldType = z.infer<typeof landingFieldTypeSchema>;

export const subElementStyleOverrideSchema = z.object({
  fontSize: z.string().max(40).optional(),
  fontWeight: z.string().max(40).optional(),
  color: z.string().max(80).optional(),
  textAlign: z.string().max(40).optional(),
  lineHeight: z.string().max(40).optional(),
  letterSpacing: z.string().max(40).optional(),
  backgroundColor: z.string().max(120).optional(),
  backgroundImage: z.string().max(600).optional(),
  backgroundSize: z.string().max(60).optional(),
  backgroundPosition: z.string().max(60).optional(),
  opacity: z.string().max(40).optional(),
  paddingTop: z.string().max(40).optional(),
  paddingBottom: z.string().max(40).optional(),
  paddingLeft: z.string().max(40).optional(),
  paddingRight: z.string().max(40).optional(),
  marginTop: z.string().max(40).optional(),
  marginBottom: z.string().max(40).optional(),
  width: z.string().max(60).optional(),
  maxWidth: z.string().max(60).optional(),
  minHeight: z.string().max(60).optional(),
  height: z.string().max(60).optional(),
  gap: z.string().max(40).optional(),
  borderWidth: z.string().max(40).optional(),
  borderColor: z.string().max(80).optional(),
  borderRadius: z.string().max(40).optional(),
  boxShadow: z.string().max(160).optional(),
  objectFit: z.string().max(40).optional(),
});

export type SubElementStyleOverride = z.infer<
  typeof subElementStyleOverrideSchema
>;
export type SubElementStylesMap = Record<string, SubElementStyleOverride>;

export const landingModuleFieldSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]+$/, "La clave solo admite letras, números y guiones bajos")
    .min(1)
    .max(60),
  label: z.string().trim().min(1).max(80),
  type: landingFieldTypeSchema,
  defaultValue: z.string().max(5_000),
});

export type LandingModuleField = z.infer<typeof landingModuleFieldSchema>;

export const landingBlockSchema = z.object({
  id: z.string().trim().min(1).max(120),
  moduleKey: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  visible: z.boolean().default(true),
  fields: z.array(landingModuleFieldSchema).max(60),
  values: z.record(z.string(), z.string().max(25_000)),
  htmlTemplate: z.string().max(250_000),
  cssTemplate: z.string().max(250_000),
  jsTemplate: z.string().max(250_000),
});

export type LandingBlock = z.infer<typeof landingBlockSchema>;

export const landingThemeSchema = z.object({
  primaryColor: z.string().trim().min(1).max(40).default("#1e3321"),
  primaryLightColor: z.string().trim().min(1).max(40).default("#2c4a30"),
  accentColor: z.string().trim().min(1).max(40).default("#c49a45"),
  bgColor: z.string().trim().min(1).max(40).default("#faf8f5"),
  cardBgColor: z.string().trim().min(1).max(40).default("#ffffff"),
  textColor: z.string().trim().min(1).max(40).default("#192019"),
  mutedTextColor: z.string().trim().min(1).max(40).default("#5e695d"),
  borderColor: z.string().trim().min(1).max(40).default("#e8e4dc"),
  fontHeading: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .default("'Playfair Display', Georgia, serif"),
  fontBody: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .default("'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"),
  radiusMd: z.string().trim().min(1).max(24).default("14px"),
  radiusLg: z.string().trim().min(1).max(24).default("24px"),
});

export type LandingTheme = z.infer<typeof landingThemeSchema>;

export const landingDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  mode: z.enum(["visual", "raw"]).default("visual"),
  theme: landingThemeSchema,
  blocks: z.array(landingBlockSchema).max(60),
  globalCss: z.string().max(250_000).default(""),
  globalJs: z.string().max(250_000).default(""),
});

export type LandingDocumentV1 = z.infer<typeof landingDocumentSchema>;

export const landingContentSchema = z.object({
  htmlContent: z.string().max(500_000, "El HTML no puede superar 500 KB"),
  cssContent: z.string().max(500_000, "El CSS no puede superar 500 KB"),
  jsContent: z.string().max(500_000, "El JavaScript no puede superar 500 KB"),
  document: landingDocumentSchema.optional(),
});

export const saveLandingCommandSchema = landingContentSchema.extend({
  tenantId: z.string().min(1),
});

export const publishLandingCommandSchema = landingContentSchema.extend({
  tenantId: z.string().min(1),
});

export type SaveLandingCommand = z.infer<typeof saveLandingCommandSchema>;
export type PublishLandingCommand = z.infer<typeof publishLandingCommandSchema>;

export type LandingPageData = {
  id: string;
  tenantId: string;
  document: LandingDocumentV1 | null;
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicLandingResult =
  | { kind: "not_found" }
  | { kind: "disabled" }
  | { kind: "preparation"; restaurantName: string; restaurantSlug: string }
  | {
      kind: "ready";
      restaurantName: string;
      restaurantSlug: string;
      html: string;
    };

// Reusable Custom Modules
export const createCustomModuleCommandSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  description: z.string().trim().max(300).default(""),
  category: z.string().trim().max(50).default("custom"),
  fields: z.array(landingModuleFieldSchema).max(60),
  htmlTemplate: z.string().max(250_000),
  cssTemplate: z.string().max(250_000),
  jsTemplate: z.string().max(250_000),
});

export type CreateCustomModuleCommand = z.infer<
  typeof createCustomModuleCommandSchema
>;

export type LandingCustomModuleView = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: string;
  fields: LandingModuleField[];
  htmlTemplate: string;
  cssTemplate: string;
  jsTemplate: string;
  createdAt: string;
  updatedAt: string;
};

// Landing Templates (Private, Community Public, System Presets)
export type LandingTemplateVisibility = "PRIVATE" | "PUBLIC";
export type LandingTemplateStatus =
  | "DRAFT"
  | "PENDING"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

export const createLandingTemplateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  description: z.string().trim().max(500).default(""),
  submitPublic: z.boolean().default(false),
});

export type CreateLandingTemplateCommand = z.infer<
  typeof createLandingTemplateSchema
>;

export type LandingTemplateView = {
  id: string;
  name: string;
  description: string;
  visibility: LandingTemplateVisibility;
  status: LandingTemplateStatus;
  isSystem: boolean;
  tenantId: string | null;
  document: LandingDocumentV1;
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export const superadminLandingTemplateTabSchema = z.enum([
  "all",
  "system",
  "published",
  "pending",
  "rejected",
  "archived",
]);

export type SuperadminLandingTemplateTab = z.infer<
  typeof superadminLandingTemplateTabSchema
>;

export const superadminLandingTemplateQuerySchema = z.object({
  tab: superadminLandingTemplateTabSchema.default("all"),
  query: z.string().trim().max(120).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export type SuperadminLandingTemplateQuery = z.infer<
  typeof superadminLandingTemplateQuerySchema
>;

export type SuperadminLandingTemplateView = LandingTemplateView & {
  owner: {
    tenantId: string;
    name: string;
    slug: string;
  } | null;
};

export type SuperadminLandingTemplateList = {
  items: SuperadminLandingTemplateView[];
  total: number;
  page: number;
  pageSize: number;
};
