import type {
  LandingDocumentV1,
  LandingTemplateView,
  LandingTheme,
} from "../contracts";
import {
  compileLandingFromDocument,
  createDefaultLandingDocument,
} from "./landing-compiler";
import {
  BUILTIN_LANDING_MODULES,
  createBlockFromBuiltinModule,
} from "./landing-module-catalog";

export type LandingTemplatePreset = {
  id: string;
  name: string;
  description: string;
  document: LandingDocumentV1;
  updatedAt: string;
};

const DARK_STEAKHOUSE_THEME: LandingTheme = {
  primaryColor: "#e6a15c",
  primaryLightColor: "#f0b475",
  accentColor: "#d96b38",
  bgColor: "#111315",
  cardBgColor: "#1a1d21",
  textColor: "#f4f1ea",
  mutedTextColor: "#a39e93",
  borderColor: "#2a2f36",
  fontHeading: "'Playfair Display', Georgia, serif",
  fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  radiusMd: "12px",
  radiusLg: "20px",
};

const CAFE_MINIMAL_THEME: LandingTheme = {
  primaryColor: "#5c3a28",
  primaryLightColor: "#754c36",
  accentColor: "#c86d44",
  bgColor: "#fdfbf7",
  cardBgColor: "#ffffff",
  textColor: "#2b211c",
  mutedTextColor: "#786960",
  borderColor: "#ede5dc",
  fontHeading: "'Playfair Display', Georgia, serif",
  fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  radiusMd: "16px",
  radiusLg: "28px",
};

function createSteakhousePresetDocument(): LandingDocumentV1 {
  const base = createDefaultLandingDocument("Brasa & Cava", "restaurante");
  const promoModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "promo-banner")!;
  const reviewsModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "testimonials")!;

  const promoBlock = createBlockFromBuiltinModule(promoModule, "preset-promo");
  const reviewsBlock = createBlockFromBuiltinModule(reviewsModule, "preset-reviews");

  const blocks = [...base.blocks];
  const heroBlock = blocks.find((b) => b.moduleKey === "hero");
  if (heroBlock) {
    heroBlock.values.badge = "Fuegos, Carnes Maduradas & Coctelería";
    heroBlock.values.title = "El ritual del fuego lento y las grandes etiquetas";
    heroBlock.values.subtitle =
      "Cortes seleccionados a la leña de quebracho, cava subterránea y barra de autor en un ambiente íntimo.";
  }

  // Insert promo and reviews before contact-hours
  blocks.splice(blocks.length - 2, 0, promoBlock, reviewsBlock);

  return {
    schemaVersion: 1,
    mode: "visual",
    theme: DARK_STEAKHOUSE_THEME,
    blocks,
    globalCss: "",
    globalJs: "",
  };
}

function createCafePresetDocument(): LandingDocumentV1 {
  const base = createDefaultLandingDocument("Café de Especialidad", "restaurante");
  const cardModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "custom-card")!;
  const spotlightBlock = createBlockFromBuiltinModule(cardModule, "preset-card");
  spotlightBlock.values.badge = "Brunch de Fin de Semana";
  spotlightBlock.values.icon = "🥐";
  spotlightBlock.values.title = "Brunch Artesanal para Compartir";
  spotlightBlock.values.priceTag = "Sábados y Domingos · 9 a 15 hs";
  spotlightBlock.values.description =
    "Laminados de manteca francesa, huevos de campo, café de filtro de origen único y jugos prensados en frío.";

  const blocks = [...base.blocks];
  const heroBlock = blocks.find((b) => b.moduleKey === "hero");
  if (heroBlock) {
    heroBlock.values.badge = "Tostadores de Café & Pastelería de Masa Madre";
    heroBlock.values.title = "Cada taza cuenta una historia de origen";
    heroBlock.values.subtitle =
      "Granos seleccionados de pequeños productores, horneados diarios y un rincón luminoso pensado para disfrutar sin prisa.";
  }

  const gridBlock = blocks.find((b) => b.moduleKey === "specialties-grid");
  if (gridBlock) {
    gridBlock.values.card1Icon = "☕";
    gridBlock.values.card1Title = "Espresso & Filtrados";
    gridBlock.values.card1Text =
      "Perfiles de tueste propios y métodos V60, Chemex y Aeropress calibrados al detalle.";
    gridBlock.values.card2Icon = "🥐";
    gridBlock.values.card2Title = "Laminados & Viennoiserie";
    gridBlock.values.card2Text =
      "Croissants, pain au chocolat y danesas horneadas cada mañana con manteca extra.";
    gridBlock.values.card3Icon = "🥑";
    gridBlock.values.card3Title = "Brunch & Tostones";
    gridBlock.values.card3Text =
      "Hogazas de fermentación natural de 36 horas con ingredientes frescos de estación.";
  }

  blocks.splice(3, 0, spotlightBlock);

  return {
    schemaVersion: 1,
    mode: "visual",
    theme: CAFE_MINIMAL_THEME,
    blocks,
    globalCss: "",
    globalJs: "",
  };
}

export const LANDING_TEMPLATE_PRESETS: LandingTemplatePreset[] = [
  {
    id: "landing-preset-clasico-editorial",
    name: "Clásico Gastronómico (Editorial)",
    description:
      "Diseño cálido con tipografía serif, verde bosque y acentos dorados. Incluye navegación, hero, especialidades, filosofía, horarios y WhatsApp.",
    document: createDefaultLandingDocument("Restaurante", "restaurante"),
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "landing-preset-nocturno-brasa",
    name: "Nocturno & Brasa (Parrilla / Bar)",
    description:
      "Estética oscura y elegante con acentos fuego/ámbar, banner de Happy Hour, reseñas de comensales y grilla de especialidades.",
    document: createSteakhousePresetDocument(),
    updatedAt: "2026-10-02T00:00:00.000Z",
  },
  {
    id: "landing-preset-cafeteria-brunch",
    name: "Cafetería & Brunch Minimal",
    description:
      "Paleta luminosa en crema y terracota con Card destacada de Brunch, métodos de café, pastelería artesanal y contacto rápido.",
    document: createCafePresetDocument(),
    updatedAt: "2026-10-03T00:00:00.000Z",
  },
];

export function presetAsLandingTemplateView(
  preset: LandingTemplatePreset,
  restaurantName = preset.name,
  restaurantSlug = "restaurante",
): LandingTemplateView {
  const compiled = compileLandingFromDocument(preset.document, {
    restaurantName,
    restaurantSlug,
  });

  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    visibility: "PUBLIC",
    status: "PUBLISHED",
    isSystem: true,
    tenantId: null,
    document: preset.document,
    htmlContent: compiled.htmlContent,
    cssContent: compiled.cssContent,
    jsContent: compiled.jsContent,
    rejectionReason: null,
    createdAt: preset.updatedAt,
    updatedAt: preset.updatedAt,
  };
}
