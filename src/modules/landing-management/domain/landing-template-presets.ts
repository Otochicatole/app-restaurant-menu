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

const BURGER_CRAFT_THEME: LandingTheme = {
  primaryColor: "#e11d48",
  primaryLightColor: "#f43f5e",
  accentColor: "#f59e0b",
  bgColor: "#090d16",
  cardBgColor: "#131a29",
  textColor: "#f8fafc",
  mutedTextColor: "#94a3b8",
  borderColor: "#1e293b",
  fontHeading: "'Plus Jakarta Sans', system-ui, sans-serif",
  fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
  radiusMd: "14px",
  radiusLg: "22px",
};

const SUSHI_FUSION_THEME: LandingTheme = {
  primaryColor: "#059669",
  primaryLightColor: "#10b981",
  accentColor: "#34d399",
  bgColor: "#080c10",
  cardBgColor: "#10161f",
  textColor: "#f1f5f9",
  mutedTextColor: "#8b9cb5",
  borderColor: "#1b2434",
  fontHeading: "'Playfair Display', Georgia, serif",
  fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  radiusMd: "14px",
  radiusLg: "24px",
};

const PIZZERIA_NAPOLI_THEME: LandingTheme = {
  primaryColor: "#b91c1c",
  primaryLightColor: "#dc2626",
  accentColor: "#d97706",
  bgColor: "#fffcf7",
  cardBgColor: "#ffffff",
  textColor: "#292524",
  mutedTextColor: "#78716c",
  borderColor: "#e7e5e4",
  fontHeading: "'Playfair Display', Georgia, serif",
  fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  radiusMd: "16px",
  radiusLg: "26px",
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

function createBurgerPresetDocument(): LandingDocumentV1 {
  const base = createDefaultLandingDocument("Craft Burger & Beers", "restaurante");
  const promoModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "promo-banner")!;
  const statsModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "stats-strip")!;
  const faqModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "faq-accordion")!;

  const promoBlock = createBlockFromBuiltinModule(promoModule, "preset-burger-promo");
  promoBlock.values.tag = "Martes a Jueves · 2x1 en Cervezas Artesanales";
  promoBlock.values.title = "Happy Hour & Smash Burgers";
  promoBlock.values.subtitle = "Medallones 100% novillo Angus, pan de papa casero y 12 canillas rotativas de productores independientes.";
  promoBlock.values.ctaText = "Ver Carta de Burgers";

  const statsBlock = createBlockFromBuiltinModule(statsModule, "preset-burger-stats");
  statsBlock.values.stat1Value = "+40.000";
  statsBlock.values.stat1Label = "Burgers Servidas";
  statsBlock.values.stat2Value = "4.9 ★";
  statsBlock.values.stat2Label = "En Google Reviews";
  statsBlock.values.stat3Value = "100% Angus";
  statsBlock.values.stat3Label = "Cortes Seleccionados";
  statsBlock.values.stat4Value = "12 Canillas";
  statsBlock.values.stat4Label = "Cervezas Tiradas";

  const faqBlock = createBlockFromBuiltinModule(faqModule, "preset-burger-faq");
  faqBlock.values.title = "Preguntas sobre Pedidos & Take Away";
  faqBlock.values.q1 = "¿Tienen opciones vegetarianas y sin TACC?";
  faqBlock.values.a1 = "¡Sí! Tenemos burgers con medallón de gírgolas y garbanzos, además de pan sin TACC certificado.";
  faqBlock.values.q2 = "¿Se puede pedir para retirar en el local?";
  faqBlock.values.a2 = "Podés hacer tu pedido directamente desde nuestra carta digital y retirarlo sin hacer fila en 20 minutos.";
  faqBlock.values.q3 = "¿Qué promociones hay vigentes?";
  faqBlock.values.a3 = "Combos de mediodía con papas y bebida incluidos, y Happy Hour de 18 a 20:30 hs de martes a viernes.";

  const blocks = [...base.blocks];
  const heroBlock = blocks.find((b) => b.moduleKey === "hero");
  if (heroBlock) {
    heroBlock.values.badge = "Smash Burgers · Papas Rústicas · Cerveza Tirada";
    heroBlock.values.title = "La verdadera experiencia smash: costra crujiente y pan de nube";
    heroBlock.values.subtitle =
      "Elaboramos nuestro propio pan de papa a diario, molemos los cortes en la casa y servimos las mejores pintas de la ciudad.";
  }

  const gridBlock = blocks.find((b) => b.moduleKey === "specialties-grid");
  if (gridBlock) {
    gridBlock.values.kicker = "Nuestros Favoritos";
    gridBlock.values.sectionTitle = "Las Más Pedidas del Menú";
    gridBlock.values.card1Icon = "🍔";
    gridBlock.values.card1Title = "Double Oklahoma Smash";
    gridBlock.values.card1Text = "Doble medallón smasheado con cebolla ultrafina caramelizada en su propio jugo, cheddar fundido y alioli casero.";
    gridBlock.values.card2Icon = "🥓";
    gridBlock.values.card2Badge = "Best Seller";
    gridBlock.values.card2Title = "Bacon & Crispy Onion";
    gridBlock.values.card2Text = "Triple panceta ahumada crujiente, cebolla frita crocante, salsa BBQ ahumada al bourbon y doble queso.";
    gridBlock.values.card3Icon = "🍟";
    gridBlock.values.card3Title = "Papas Loaded Especiales";
    gridBlock.values.card3Text = "Papas rústicas con doble fritura, bañadas en fondue de cheddar, bacon picado y ciboulette fresco.";
  }

  // Insert promo, stats, and faq
  blocks.splice(2, 0, statsBlock);
  blocks.splice(4, 0, promoBlock);
  blocks.splice(blocks.length - 2, 0, faqBlock);

  return {
    schemaVersion: 1,
    mode: "visual",
    theme: BURGER_CRAFT_THEME,
    blocks,
    globalCss: "",
    globalJs: "",
  };
}

function createSushiPresetDocument(): LandingDocumentV1 {
  const base = createDefaultLandingDocument("Omakase & Sake Bar", "restaurante");
  const galleryModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "gallery-grid")!;
  const spotlightModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "image-spotlight")!;
  const reviewsModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "testimonials")!;

  const spotlightBlock = createBlockFromBuiltinModule(spotlightModule, "preset-sushi-spotlight");
  spotlightBlock.values.kicker = "Experiencia Omakase";
  spotlightBlock.values.title = "La confianza absoluta en las manos del Itamae";
  spotlightBlock.values.description =
    "Una secuencia íntima de 12 a 16 bocados elegidos cada noche según la pesca más fresca y fresca maduración en frío.";
  spotlightBlock.values.photoCaption = "Niguiris pincelados con nikiri de la casa y sal marina";
  spotlightBlock.values.ctaText = "Ver Menú Omakase";

  const galleryBlock = createBlockFromBuiltinModule(galleryModule, "preset-sushi-gallery");
  galleryBlock.values.tag = "Estética & Detalle";
  galleryBlock.values.title = "Nuestra cocina en imágenes";
  galleryBlock.values.img1Caption = "Niguiri de Salmón Flambeado";
  galleryBlock.values.img2Caption = "Omakase en Barra";
  galleryBlock.values.img3Caption = "Coctelería de Autor con Sake";

  const reviewsBlock = createBlockFromBuiltinModule(reviewsModule, "preset-sushi-reviews");
  reviewsBlock.values.kicker = "Comensales";
  reviewsBlock.values.title = "Elogios de Nuestra Barra";
  reviewsBlock.values.review1Text = "\"El mejor Omakase de la ciudad. El arroz templado y la frescura de los pescados son incomparables.\"";
  reviewsBlock.values.review1Author = "Federico Rossi";
  reviewsBlock.values.review2Text = "\"Ambiente íntimo con iluminación tenue perfecta, maridaje de sakes impecable y un servicio de 10.\"";
  reviewsBlock.values.review2Author = "Camila Zhang";

  const blocks = [...base.blocks];
  const heroBlock = blocks.find((b) => b.moduleKey === "hero");
  if (heroBlock) {
    heroBlock.values.badge = "Cocina Nikkei & Tradición Japonesa";
    heroBlock.values.title = "Pesca fresca del día, precisión milenaria y coctelería botánica";
    heroBlock.values.subtitle =
      "Barra para 14 comensales, cortes seleccionados y técnicas de maduración que elevan el sabor de cada pieza.";
  }

  const gridBlock = blocks.find((b) => b.moduleKey === "specialties-grid");
  if (gridBlock) {
    gridBlock.values.kicker = "Propuesta";
    gridBlock.values.sectionTitle = "Cortes & Rolls de Autor";
    gridBlock.values.card1Icon = "🍣";
    gridBlock.values.card1Title = "Niguiris Trufados";
    gridBlock.values.card1Text = "Pesca blanca del día flambeada con manteca trufada y zest de lima sobre arroz Koshihikari templado.";
    gridBlock.values.card2Icon = "🥢";
    gridBlock.values.card2Badge = "Exclusivo";
    gridBlock.values.card2Title = "Tiradito de Pulpo & Ají Amarillo";
    gridBlock.values.card2Text = "Láminas finas de pulpo macerado en leche de tigre al ají amarillo, maíz cancha y batata glaseada.";
    gridBlock.values.card3Icon = "🍶";
    gridBlock.values.card3Title = "Cava de Sakes & Whisky Japonés";
    gridBlock.values.card3Text = "Selección importada de sakes Junmai Daiginjo y destilados de malta pura para maridar cada paso.";
  }

  blocks.splice(2, 0, spotlightBlock);
  blocks.splice(4, 0, galleryBlock);
  blocks.splice(blocks.length - 2, 0, reviewsBlock);

  return {
    schemaVersion: 1,
    mode: "visual",
    theme: SUSHI_FUSION_THEME,
    blocks,
    globalCss: "",
    globalJs: "",
  };
}

function createPizzeriaPresetDocument(): LandingDocumentV1 {
  const base = createDefaultLandingDocument("Napoli & Fuoco", "restaurante");
  const promoModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "promo-banner")!;
  const faqModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "faq-accordion")!;

  const promoBlock = createBlockFromBuiltinModule(promoModule, "preset-pizzeria-promo");
  promoBlock.values.tag = "Todos los Domingos · Noche de Clásicos";
  promoBlock.values.title = "Pizzas de Horno a Leña & Aperol Spritz";
  promoBlock.values.subtitle = "Vení a disfrutar de la verdadera pizza stile napoletano con bordes inflados y masa de lenta fermentación.";
  promoBlock.values.ctaText = "Ver Carta de Pizzas";

  const faqBlock = createBlockFromBuiltinModule(faqModule, "preset-pizzeria-faq");
  faqBlock.values.title = "Dudas Habituales sobre Nuestras Pizzas";
  faqBlock.values.q1 = "¿Cuánto tiempo fermenta la masa de sus pizzas?";
  faqBlock.values.a1 = "Nuestra masa lleva una fermentación en frío de mínimo 48 horas, lo que la hace sumamente liviana y de fácil digestión.";
  faqBlock.values.q2 = "¿Qué tipo de harina y tomates utilizan?";
  faqBlock.values.a2 = "Usamos exclusivamente harina italiana tipo 00 de alta fuerza y tomates San Marzano D.O.P. importados.";
  faqBlock.values.q3 = "¿Tienen opciones veganas y vegetarianas?";
  faqBlock.values.a3 = "Sí, contamos con opciones vegetarianas con quesos italianos y opciones veganas con quesos de frutos secos artesanales.";

  const blocks = [...base.blocks];
  const heroBlock = blocks.find((b) => b.moduleKey === "hero");
  if (heroBlock) {
    heroBlock.values.badge = "Pizza Verace Napoletana · Horno a Leña";
    heroBlock.values.title = "Harina 00 italiana, 48 horas de fermentación y fuego a 450°C";
    heroBlock.values.subtitle =
      "Cornicione alto y alveolado, mozzarella fior di latte fresca y tomates San Marzano en cada porción de nuestra trattoria.";
  }

  const gridBlock = blocks.find((b) => b.moduleKey === "specialties-grid");
  if (gridBlock) {
    gridBlock.values.kicker = "Especialidades";
    gridBlock.values.sectionTitle = "Nuestras Pizzas Insignia";
    gridBlock.values.card1Icon = "🍕";
    gridBlock.values.card1Title = "Margherita D.O.P.";
    gridBlock.values.card1Text = "Tomate San Marzano, mozzarella fior di latte, albahaca fresca de huerta propia y aceite de oliva extra virgen.";
    gridBlock.values.card2Icon = "🔥";
    gridBlock.values.card2Badge = "Piccante";
    gridBlock.values.card2Title = "Diavola Napolitana";
    gridBlock.values.card2Text = "Salame piccante artesanal de Calabria, fior di latte, peperoncino fresco y un toque de miel infusionada.";
    gridBlock.values.card3Icon = "🧀";
    gridBlock.values.card3Title = "Burrata & Pesto di Pistacchio";
    gridBlock.values.card3Text = "Base blanca con burrata cremosa entera al centro, mortadela con pistacho y lluvia de pistachos tostados.";
  }

  const expBlock = blocks.find((b) => b.moduleKey === "experience-split");
  if (expBlock) {
    expBlock.values.metricNumber = "48 hs";
    expBlock.values.metricLabel = "Fermentación Natural";
    expBlock.values.quote = "\"La pizza no se apura: el secreto está en darle al tiempo y al calor el respeto que merecen.\"";
    expBlock.values.title = "La tradición de Nápoles en tu mesa";
  }

  blocks.splice(3, 0, promoBlock);
  blocks.splice(blocks.length - 2, 0, faqBlock);

  return {
    schemaVersion: 1,
    mode: "visual",
    theme: PIZZERIA_NAPOLI_THEME,
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
  {
    id: "landing-preset-burger-craft",
    name: "Burger & Street Food (Casual Moderno)",
    description:
      "Estilo dinámico y oscuro con tipografía sans moderna, métricas destacadas, combos de Happy Hour, grilla de smash burgers y FAQ interactivo.",
    document: createBurgerPresetDocument(),
    updatedAt: "2026-10-04T00:00:00.000Z",
  },
  {
    id: "landing-preset-sushi-fusion",
    name: "Sushi & Asian Fusion (Minimal Dark)",
    description:
      "Atmósfera elegante en obsidiana y esmeralda, spotlight de plato Omakase, galería fotográfica en mosaico y reseñas de barra.",
    document: createSushiPresetDocument(),
    updatedAt: "2026-10-05T00:00:00.000Z",
  },
  {
    id: "landing-preset-pizzeria-napoli",
    name: "Pizzería Napolitana & Trattoria",
    description:
      "Calidez italiana con masa fermentada 48hs a la leña, promociones de fin de semana, historia gastronómica y preguntas frecuentes.",
    document: createPizzeriaPresetDocument(),
    updatedAt: "2026-10-06T00:00:00.000Z",
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
