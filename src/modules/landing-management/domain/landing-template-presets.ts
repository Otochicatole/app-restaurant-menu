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
import {
  ARCO_GLOBAL_CSS,
  ARCO_GLOBAL_JS,
} from "./landing-preset-arco-assets";

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

const ARCO_BAR_THEME: LandingTheme = {
  primaryColor: "#E5392C",
  primaryLightColor: "#FF6B5E",
  accentColor: "#E5392C",
  bgColor: "#0A0807",
  cardBgColor: "#141210",
  textColor: "#F4EFEA",
  mutedTextColor: "#A09890",
  borderColor: "rgba(255, 255, 255, 0.08)",
  fontHeading: "'Montserrat', system-ui, -apple-system, sans-serif",
  fontBody: "'Montserrat', system-ui, -apple-system, sans-serif",
  radiusMd: "14px",
  radiusLg: "22px",
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
  spotlightBlock.values.badge = "BRUNCH DE FIN DE SEMANA";
  spotlightBlock.values.icon = "✦";
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
    gridBlock.values.card1Icon = "Filtrados Manuales";
    gridBlock.values.card1Title = "Espresso & Filtrados";
    gridBlock.values.card1Text =
      "Perfiles de tueste propios y métodos V60, Chemex y Aeropress calibrados al detalle.";
    gridBlock.values.card2Icon = "Laminados & Viennoiserie";
    gridBlock.values.card2Title = "Laminados & Viennoiserie";
    gridBlock.values.card2Text =
      "Croissants, pain au chocolat y danesas horneadas cada mañana con manteca extra.";
    gridBlock.values.card3Icon = "Tostones de Masa Madre";
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
    gridBlock.values.card1Icon = "Smash Doble Angus";
    gridBlock.values.card1Title = "Double Oklahoma Smash";
    gridBlock.values.card1Text = "Doble medallón smasheado con cebolla ultrafina caramelizada en su propio jugo, cheddar fundido y alioli casero.";
    gridBlock.values.card2Icon = "Smoked Bacon & BBQ";
    gridBlock.values.card2Badge = "Best Seller";
    gridBlock.values.card2Title = "Bacon & Crispy Onion";
    gridBlock.values.card2Text = "Triple panceta ahumada crujiente, cebolla frita crocante, salsa BBQ ahumada al bourbon y doble queso.";
    gridBlock.values.card3Icon = "Papas Rústicas Loaded";
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
    gridBlock.values.card1Icon = "Niguiris Trufados";
    gridBlock.values.card1Title = "Niguiris Trufados";
    gridBlock.values.card1Text = "Pesca blanca del día flambeada con manteca trufada y zest de lima sobre arroz Koshihikari templado.";
    gridBlock.values.card2Icon = "Tiradito Nikkei";
    gridBlock.values.card2Badge = "Exclusivo";
    gridBlock.values.card2Title = "Tiradito de Pulpo & Ají Amarillo";
    gridBlock.values.card2Text = "Láminas finas de pulpo macerado en leche de tigre al ají amarillo, maíz cancha y batata glaseada.";
    gridBlock.values.card3Icon = "Cava de Sakes";
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
    gridBlock.values.card1Icon = "San Marzano D.O.P.";
    gridBlock.values.card1Title = "Margherita D.O.P.";
    gridBlock.values.card1Text = "Tomate San Marzano, mozzarella fior di latte, albahaca fresca de huerta propia y aceite de oliva extra virgen.";
    gridBlock.values.card2Icon = "Calabrese Piccante";
    gridBlock.values.card2Badge = "Piccante";
    gridBlock.values.card2Title = "Diavola Napolitana";
    gridBlock.values.card2Text = "Salame piccante artesanal de Calabria, fior di latte, peperoncino fresco y un toque de miel infusionada.";
    gridBlock.values.card3Icon = "Burrata & Pesto";
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

function createArcoBarPresetDocument(): LandingDocumentV1 {
  const headerModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "header")!;
  const heroModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
  const resTableModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "reservations-table")!;
  const promoModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "promo-banner")!;
  const expModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "experience-split")!;
  const galleryModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "gallery-grid")!;
  const reviewsModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "testimonials")!;
  const footerModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "footer")!;

  // 1. Barra Lateral de Navegación Arco (Columna 1 Desktop - .bb-izq)
  const bbIzqBlock = createBlockFromBuiltinModule(headerModule, "preset-arco-bb-izq");
  bbIzqBlock.name = "Panel de Navegación Arco (.bb-izq)";
  bbIzqBlock.htmlTemplate = `<div class="bb-izq" id="panel-navegacion">
  <aside class="panel">
    <a class="panel__marca" href="#reservar">
      <img class="logo-tema--osc" src="https://arco.mise.ar/api/foto/img.logo?v=1791861570" alt="Arco" loading="lazy" decoding="async"/>
      <img class="logo-tema--clr" src="https://arco.mise.ar/api/foto/img.logo-claro?v=1791861570" alt="" aria-hidden="true" loading="lazy" decoding="async"/>
    </a>
    <nav class="panel__nav" aria-label="Accesos">
      <a class="acceso es-principal" href="#reservas-mesa">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.6 18.4h18.8"></path><path d="M4 18.4a8 9 0 0 1 16 0"></path><path d="M12 9.4V7.6"></path><circle cx="12" cy="6.3" r="1.3" fill="currentColor" stroke="none"></circle></svg>
        <span data-i18n="nav.reservar">Reservar</span>
      </a>
      <a class="acceso" href="https://arco.mise.ar/carta" target="_blank" rel="noreferrer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v18M6 3c-1.2 0-2 1.6-2 4s.8 4 2 4M18 3v18M18 3c1.4 0 2 2 2 4.5S19 12 18 12h-1"></path></svg>
        <span data-i18n="nav.carta">Carta</span>
      </a>
      <a class="acceso" href="https://www.google.com/maps/search/?api=1&amp;query=Arco%2C%20Olavarr%C3%ADa%203132%2C%20Mar%20del%20Plata" target="_blank" rel="noreferrer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"></path><circle cx="12" cy="10" r="2.6"></circle></svg>
        <span data-i18n="nav.comoLlegar">Cómo llegar</span>
      </a>
      <a class="acceso" href="https://www.instagram.com/arco.mdp" target="_blank" rel="noreferrer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"></circle></svg>
        <span data-i18n="nav.instagram">Instagram</span>
      </a>
    </nav>
    <ul class="saber">
      <li data-i18n="saber.1">Abrimos todos los días desde las 19:00: de domingo a jueves hasta las 02:00, viernes y sábado hasta las 04:00.</li>
      <li data-i18n="saber.2">Happy hour de cerveza tirada de 19 a 21, todos los días.</li>
      <li data-i18n="saber.3">Reservás a las 19, 20, 21, 22 o 23:30. Después, se entra por orden de llegada mientras haya lugar.</li>
      <li data-i18n="saber.4">La confirmación te llega por mail al instante, con el código de tu reserva.</li>
      <li data-i18n="saber.5">Tu mesa se confirma con una seña de $20.000 por Mercado Pago, que después se descuenta de tu cuenta.</li>
      <li data-i18n="saber.6">Hasta 8 personas reservás acá. Si son más, escribinos y armamos tu mesa.</li>
    </ul>
  </aside>
  <a class="wspCta wspCta--panel" href="https://api.whatsapp.com/send?phone=5492233482402&amp;text=%C2%A1Hola%20Arco!%20Estoy%20en%20la%20p%C3%A1gina%20de%20reservas%20y%20tengo%20una%20consulta." target="_blank" rel="noreferrer">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z"></path></svg>
    <span data-i18n="nav.contactanos">Contactanos</span>
  </a>
</div>`;

  // 2. Cabecera & Portada Arco (Tapa + Selector Idioma + Toggle Tema + Hero Figura Banda)
  const tapaHeroBlock = createBlockFromBuiltinModule(heroModule, "preset-arco-tapa-hero");
  tapaHeroBlock.name = "Cabecera & Portada Arco";
  tapaHeroBlock.htmlTemplate = `<div class="pag-header-wrap">
  <div class="fondoFotos es-espera" aria-hidden="true"></div>
  <svg class="orbitas-b" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <circle cx="1230" cy="520" r="640"></circle>
    <circle cx="300" cy="860" r="520"></circle>
    <circle cx="1420" cy="60" r="360"></circle>
  </svg>
  <header class="tapa">
    <div class="idsel idsel--cabecera" id="arcoIdsel">
      <button type="button" class="idsel__boton" id="idselBoton" aria-expanded="false" aria-label="Idioma">
        <img class="idsel__bandera" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 480'%3E%3Cpath fill='%2375aadb' d='M0 0h640v480H0z'/%3E%3Cpath fill='%23fff' d='M0 160h640v160H0z'/%3E%3Ccircle cx='320' cy='240' r='40' fill='%23f6b40e'/%3E%3C/svg%3E" alt="AR" width="22" height="16"/>
        <span class="idsel__nombre">Español</span>
        <svg class="idsel__flecha" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
      </button>
      <button class="tematog" id="temaBoton" type="button" aria-label="Cambiar a modo claro" title="Modo claro" style="backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.1"></circle>
          <path d="M12 2.6v2.1M12 19.3v2.1M4.7 4.7l1.5 1.5M17.8 17.8l1.5 1.5M2.6 12h2.1M19.3 12h2.1M4.7 19.3l1.5-1.5M17.8 6.2l1.5-1.5"></path>
        </svg>
      </button>
      <div class="idsel__lista" id="idselLista" role="listbox" style="display: none;">
        <button type="button" role="option" class="idsel__op es-elegido" data-lang="es">
          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 480'%3E%3Cpath fill='%2375aadb' d='M0 0h640v480H0z'/%3E%3Cpath fill='%23fff' d='M0 160h640v160H0z'/%3E%3Ccircle cx='320' cy='240' r='40' fill='%23f6b40e'/%3E%3C/svg%3E" alt="AR" width="22" height="16" />
          <span>Español</span>
          <i class="idsel__punto" aria-hidden="true"></i>
        </button>
        <button type="button" role="option" class="idsel__op" data-lang="en">
          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 480'%3E%3Cpath fill='%23bd3d44' d='M0 0h640v480H0z'/%3E%3Cpath stroke='%23fff' stroke-width='37' d='M0 55h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640'/%3E%3Cpath fill='%23192f5d' d='M0 0h260v222H0z'/%3E%3C/svg%3E" alt="US" width="22" height="16" />
          <span>English</span>
          <i class="idsel__punto" aria-hidden="true" style="display: none;"></i>
        </button>
        <button type="button" role="option" class="idsel__op" data-lang="pt">
          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 480'%3E%3Cpath fill='%23009b3a' d='M0 0h640v480H0z'/%3E%3Cpath fill='%23fedf00' d='M320 40l280 200-280 200L40 240z'/%3E%3Ccircle cx='320' cy='240' r='90' fill='%23002776'/%3E%3C/svg%3E" alt="BR" width="22" height="16" />
          <span>Português</span>
          <i class="idsel__punto" aria-hidden="true" style="display: none;"></i>
        </button>
      </div>
    </div>
    <p class="tapa__eyebrow" data-i18n="tapa.eyebrow">{{kicker}}</p>
    <h1 class="tapa__titulo"><span data-i18n="tapa.titulo">{{title}}</span><span data-i18n="tapa.subtitulo">{{subtitle}}</span></h1>
  </header>
  <figure class="banda">
    <img src="{{heroImage}}" fetchPriority="high" alt="La noche en Arco, con la gente y las luces rojas del salón"/>
    <figcaption data-i18n="tapa.caption">{{photoCaption}}</figcaption>
  </figure>
</div>`;
  tapaHeroBlock.values.kicker = "Reservas en línea · Arco";
  tapaHeroBlock.values.title = "Reservá tu mesa ";
  tapaHeroBlock.values.subtitle = "en menos de un minuto";
  tapaHeroBlock.values.heroImage = "https://arco.mise.ar/api/foto/img.banda?v=1791861570";
  tapaHeroBlock.values.photoCaption = "Tragos de autor, buena música y la noche más linda de Mar del Plata.";

  // 3. Módulo de Reservas (.pap)
  const resTableBlock = createBlockFromBuiltinModule(resTableModule, "preset-arco-reservations");
  resTableBlock.name = "Turnos de Reserva (.pap)";
  resTableBlock.values.kicker = "Reservas en línea · Arco";
  resTableBlock.values.title = "Reservá tu mesa en menos de un minuto";
  resTableBlock.values.venueName = "Arco";
  resTableBlock.values.venueAddress = "Olavarría 3132";
  resTableBlock.values.venueCity = "Mar del Plata · Argentina";
  resTableBlock.values.venueImage = "https://arco.mise.ar/api/foto/img.ficha?v=1791861570";
  resTableBlock.values.depositNotice = "Tu mesa, confirmada con la seña.";
  resTableBlock.values.restaurantPhone = "+5492233482402";
  resTableBlock.values.btnSubmitLabel = "Confirmar reserva";

  // 4. Cumpleaños en Arco
  const cumpleBlock = createBlockFromBuiltinModule(promoModule, "preset-arco-cumple");
  cumpleBlock.name = "Cumpleaños en Arco";
  cumpleBlock.htmlTemplate = `<section class="especiales" id="cumple">
  <p class="tapa__eyebrow" data-i18n="cumple.tag">{{tag}}</p>
  <h2 class="tapa__titulo tapa__titulo--chico"><span data-i18n="cumple.titulo">{{title}}</span><span data-i18n="cumple.subtitulo">con papas y pizza libre</span></h2>
  <p class="especiales__texto" data-i18n="cumple.texto">{{subtitle}}</p>
  <div class="especiales__botones">
    <a class="botonRelieve" href="https://wa.me/5492233482402?text=%C2%A1Hola%20Arco!%20Quiero%20festejar%20mi%20cumplea%C3%B1os%20con%20el%20men%C3%BA%20cumple.%20%C2%BFMe%20pasan%20informaci%C3%B3n%20para%20reservar%3F%20%C2%A1Gracias!" target="_blank" rel="noreferrer">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16M4.5 20v-5.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2V20"></path><path d="M4.5 16.2c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.2.6 2.2 1.1"></path><path d="M12 12.5V9M12 6.6V5.2"></path></svg>
      <span data-i18n="cumple.btnCumple">{{ctaText}}</span>
      <svg class="botonRelieve__flecha" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
    </a>
    <a class="botonRelieve" href="https://wa.me/5492233482402?text=%C2%A1Hola%20Arco!%20Quiero%20armar%20un%20evento%20con%20ustedes.%20%C2%BFMe%20pasan%20informaci%C3%B3n%20de%20capacidad%20y%20propuestas%3F%20%C2%A1Gracias!" target="_blank" rel="noreferrer">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h6l-3 7-3-7zM8 10v9M5.5 19h5"></path><path d="M14 3h6l-3 7-3-7zM17 10v9M14.5 19h5"></path></svg>
      <span data-i18n="cumple.btnEvento">Armar mi evento</span>
      <svg class="botonRelieve__flecha" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
    </a>
  </div>
</section>`;
  cumpleBlock.values.tag = "Cumpleaños en Arco";
  cumpleBlock.values.title = "Festejá tu cumpleaños ";
  cumpleBlock.values.subtitle = "Menú cumple $19.900 por persona: papas y pizza libre (muzza, speciale y margherita) con una consumición, con o sin alcohol. Escribinos y te armamos la mesa.";
  cumpleBlock.values.ctaText = "Festejar mi cumpleaños";

  // 5. Información General & Accesos
  const generalBlock = createBlockFromBuiltinModule(expModule, "preset-arco-general");
  generalBlock.name = "Información General & Accesos";
  generalBlock.htmlTemplate = `<section class="especiales general" id="informacion-general">
  <div class="filete" aria-hidden="true">
    <span class="filete__hilo"></span>
    <svg class="filete__joya" viewBox="0 0 78 49" fill="none" aria-hidden="true">
      <path d="M39 2L47 18L64 24.5L47 31L39 47L31 31L14 24.5L31 18L39 2Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.2"></path>
      <circle cx="39" cy="24.5" r="4.5" fill="currentColor"></circle>
    </svg>
    <span class="filete__hilo filete__hilo--der"></span>
  </div>
  <p class="tapa__eyebrow" data-i18n="gen.kicker">{{kicker}}</p>
  <p class="general__texto" data-i18n="gen.p1">Un bar en la esquina de Olavarría y Rodríguez Peña, con barra de autor, cocina abierta hasta tarde y terraza.</p>
  <p class="general__texto" data-i18n="gen.p2">Música en vivo y DJ sets los fines de semana. Festejos de cumpleaños, salidas en grupo o una copa tranquila en la barra.</p>
</section>`;
  generalBlock.values.kicker = "Información general";

  // 6. Galería 9 Fotos Oficiales de Arco con soporte para pantalla completa (Visor)
  const galeriaBlock = createBlockFromBuiltinModule(galleryModule, "preset-arco-galeria");
  galeriaBlock.name = "Galería de Fotos Arco";
  galeriaBlock.htmlTemplate = `<div class="galeria" id="galeria">
  <button class="galeria__foto galeria__grande" type="button" aria-label="Ver El frente de Arco de noche, con el deck lleno en pantalla completa"><img src="https://arco.mise.ar/api/foto/img.galeria-hero?v=1791861570" alt="El frente de Arco de noche, con el deck lleno" loading="lazy"/></button>
  <button class="galeria__foto galeria__media" type="button" aria-label="Ver Un brindis frente al cartel de neón de Arco en pantalla completa"><img src="https://arco.mise.ar/api/foto/img.galeria-festejo?v=1791861570" alt="Un brindis frente al cartel de neón de Arco" loading="lazy"/></button>
  <button class="galeria__foto galeria__media" type="button" aria-label="Ver Un cóctel de autor en la barra de Arco en pantalla completa"><img src="https://arco.mise.ar/api/foto/img.galeria-barman?v=1791861570" alt="Un cóctel de autor en la barra de Arco" loading="lazy"/></button>
  <button class="galeria__foto galeria__media" type="button" aria-label="Ver La noche de la inauguración de Arco en pantalla completa"><img src="https://arco.mise.ar/api/foto/img.galeria-extra1?v=1791864377" alt="La noche de la inauguración de Arco" loading="lazy"/></button>
  <button class="galeria__foto galeria__media" type="button" aria-label="Ver Amigas en los sillones verdes de Arco en pantalla completa"><img src="https://arco.mise.ar/api/foto/img.galeria-extra2?v=1791864377" alt="Amigas en los sillones verdes de Arco" loading="lazy"/></button>
  <button class="galeria__foto" type="button" aria-label="Ver Amigas posando bajo el neón de Arco en pantalla completa"><img src="https://arco.mise.ar/api/foto/img.galeria-trago?v=1791864377" alt="Amigas posando bajo el neón de Arco" loading="lazy"/></button>
  <button class="galeria__foto" type="button" aria-label="Ver La noche con DJ en Arco en pantalla completa"><img src="https://arco.mise.ar/api/foto/img.galeria-vip?v=1791861570" alt="La noche con DJ en Arco" loading="lazy"/></button>
  <button class="galeria__foto" type="button" aria-label="Ver El cartel de neón Arco prendido en pantalla completa"><img src="https://arco.mise.ar/api/foto/img.galeria-papas?v=1791861570" alt="El cartel de neón Arco prendido" loading="lazy"/></button>
  <button class="galeria__foto" type="button" aria-label="Ver Copa de cerveza tirada en la barra en pantalla completa"><img src="https://arco.mise.ar/api/foto/img.galeria-noche?v=1791861570" alt="Copa de cerveza tirada en la barra" loading="lazy"/></button>
</div>`;

  // 7. Reseñas Google, Ubicación y Tragos Destacados (Columna 3 Desktop - .costado)
  const costadoBlock = createBlockFromBuiltinModule(reviewsModule, "preset-arco-costado");
  costadoBlock.name = "Reseñas & Costado Arco (.costado)";
  costadoBlock.htmlTemplate = `<aside class="costado" id="costado-informacion">
  <section class="tarjeta opin" id="opiniones-google">
    <p class="opin__rotulo" data-i18n="opin.titulo">Opiniones de Google</p>
    <div class="opin__ficha" id="opinCard">
      <div class="opin__quien">
        <img class="opin__cara" id="opinAuthorAvatar" src="https://arco.mise.ar/resenas-arco/lorena-abatino.webp" alt="Lorena Abatino" width="44" height="44" loading="lazy"/>
        <div class="opin__datos">
          <b id="opinAuthorName">Lorena Abatino</b>
          <small id="opinAuthorMeta">2 opiniones</small>
        </div>
        <svg class="opin__g" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"></path></svg>
      </div>
      <div class="opin__puntaje">
        <span class="encu__estrellas" aria-label="5 de 5 estrellas">★★★★★</span>
        <span id="opinDate">hace 3 meses</span>
      </div>
      <p class="opin__texto" id="opinText">Excelente atención por parte de la bartender Agustina, fuimos por el cumple de una amiga y la pasamos excelente, los tragos unos mejores que los otros y a su vez, la gastronomía ni hablar. Muy recomendable!!!</p>
    </div>
    <div class="opin__pie">
      <button type="button" class="opin__paso" id="opinPrevBtn" aria-label="Opinión anterior">‹</button>
      <div class="opin__puntos" id="opinDots" role="tablist" aria-label="Elegir opinión">
        <button type="button" role="tab" aria-selected="true" class="opin__punto es-actual" data-idx="0"></button>
        <button type="button" role="tab" aria-selected="false" class="opin__punto" data-idx="1"></button>
        <button type="button" role="tab" aria-selected="false" class="opin__punto" data-idx="2"></button>
        <button type="button" role="tab" aria-selected="false" class="opin__punto" data-idx="3"></button>
        <button type="button" role="tab" aria-selected="false" class="opin__punto" data-idx="4"></button>
        <button type="button" role="tab" aria-selected="false" class="opin__punto" data-idx="5"></button>
        <button type="button" role="tab" aria-selected="false" class="opin__punto" data-idx="6"></button>
      </div>
      <button type="button" class="opin__paso" id="opinNextBtn" aria-label="Opinión siguiente">›</button>
    </div>
    <a class="opin__fuente" data-i18n="opin.ver" href="https://www.google.com/maps/place/Arco/@-38.0170048,-57.5439655,17z/data=!4m8!3m7!1s0x9584ddf99dfbce3d:0x59169f0d11bc98a0!8m2!3d-38.0170048!4d-57.5439655!9m1!1b1!16s%2Fg%2F11tsxpk4g2" target="_blank" rel="noreferrer">Opiniones reales en Google · verlas todas</a>
  </section>

  <section class="tarjeta">
    <h2 class="tarjeta__titulo" data-i18n="costado.ubicacion">La ubicación</h2>
    <a class="ubic__mapa" href="https://www.google.com/maps/search/?api=1&query=Arco%2C%20Olavarr%C3%ADa%203132%2C%20Mar%20del%20Plata" target="_blank" rel="noreferrer">
      <img src="https://arco.mise.ar/api/foto/img.mapa?v=1791859444" alt="Mapa de la zona con la ubicación de Arco en Mar del Plata" width="900" height="675" loading="lazy"/>
    </a>
    <p class="ubic__texto"><strong>ARCO</strong> está en Olavarría 3132, Mar del Plata.</p>
    <p class="ubic__rotulo" data-i18n="costado.comoLlegar">Dirección</p>
    <p class="ubic__calle">Olavarría 3132</p>
    <p class="ubic__entre" data-i18n="costado.entre">Entre San Lorenzo y Roca</p>
  </section>

  <section class="tarjeta">
    <h2 class="tarjeta__titulo">Recomendaciones</h2>
    <article class="reco">
      <img src="https://arco.mise.ar/api/foto/img.lido?v=1791861570" alt="Chili Power, el trago de la casa" loading="lazy" decoding="async"/>
      <p class="reco__tipo">El trago de la casa</p>
      <h3 class="reco__nombre">Chili Power</h3>
      <p class="reco__detalle">Tequila blanco, jugo de naranja y de limón, almíbar de maracuyá y un toque de ají molido.</p>
    </article>
    <article class="reco">
      <img src="https://arco.mise.ar/api/foto/img.ossobuco?v=1791861570" alt="Papas Arco, para compartir" loading="lazy" decoding="async"/>
      <p class="reco__tipo">El plato de la casa</p>
      <h3 class="reco__nombre">Papas Arco</h3>
      <p class="reco__detalle">Para compartir: salsa de quesos, salsa bomba de chorizo y osobuco braseado, con dressing de rúcula.<span class="reco__marca">Burgers y pizzas</span></p>
    </article>
  </section>

  <a class="wspCta" href="https://api.whatsapp.com/send?phone=5492233482402&text=%C2%A1Hola%20Arco!%20Estoy%20en%20la%20p%C3%A1gina%20de%20reservas%20y%20tengo%20una%20consulta." target="_blank" rel="noreferrer">
    <span class="wspCta__cuerpo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z"></path></svg>
      <span data-i18n="nav.contactanos">Contactanos</span>
    </span>
  </a>
</aside>`;

  // 8. Pie de Página (MISE)
  const footerBlock = createBlockFromBuiltinModule(footerModule, "preset-arco-footer");
  footerBlock.name = "Pie de Página (MISE)";
  footerBlock.htmlTemplate = `<footer class="pie">
  <p class="pie__marca" data-i18n="pie.texto">Reservas con <strong>MISE</strong> · Buenos Aires, Argentina</p>
</footer>`;

  return {
    schemaVersion: 1,
    mode: "visual",
    theme: ARCO_BAR_THEME,
    blocks: [
      bbIzqBlock,
      tapaHeroBlock,
      resTableBlock,
      cumpleBlock,
      generalBlock,
      galeriaBlock,
      costadoBlock,
      footerBlock,
    ],
    globalCss: ARCO_GLOBAL_CSS,
    globalJs: ARCO_GLOBAL_JS,
  };
}

export const LANDING_TEMPLATE_PRESETS: LandingTemplatePreset[] = [
  {
    id: "landing-preset-arco-bar",
    name: "Arco - Bar, Cocina & Música (Mise)",
    description:
      "Atmósfera nocturna con neones rojos en Mar del Plata, barra de autor, DJ en vivo, wizard interactivo de reservas de mesas (.pap), especiales de cumpleaños y reseñas Google.",
    document: createArcoBarPresetDocument(),
    updatedAt: "2026-10-24T00:00:00.000Z",
  },

  {
    id: "landing-preset-clasico-editorial",
    name: "Clásico Gastronómico (Editorial)",
    description:
      "Bistró francés y cocina de autor con tipografía serif refinada, tonos oliva y verde bosque, citas de filosofía y carta digital integrada.",
    document: createDefaultLandingDocument("Restaurante", "restaurante"),
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "landing-preset-nocturno-brasa",
    name: "Nocturno & Brasa (Parrilla / Bar)",
    description:
      "Atmósfera noir con ámbar fuego, cortes de 45 días de maduración a la leña viva, aperitivos y elogios de la crítica gastronómica.",
    document: createSteakhousePresetDocument(),
    updatedAt: "2026-10-02T00:00:00.000Z",
  },
  {
    id: "landing-preset-cafeteria-brunch",
    name: "Cafetería & Brunch Minimal",
    description:
      "Estética nórdica y cálida en tonos crema y café tostado con spotlight de brunch de fin de semana, filtrados manuales y viennoiserie.",
    document: createCafePresetDocument(),
    updatedAt: "2026-10-03T00:00:00.000Z",
  },
  {
    id: "landing-preset-burger-craft",
    name: "Burger & Street Food (Casual Moderno)",
    description:
      "Taproom contemporáneo con smash burgers artesanales de novillo Angus, métricas de calidad, happy hour de canillas y FAQ de pedidos.",
    document: createBurgerPresetDocument(),
    updatedAt: "2026-10-04T00:00:00.000Z",
  },
  {
    id: "landing-preset-sushi-fusion",
    name: "Sushi & Asian Fusion (Minimal Dark)",
    description:
      "Experiencia Omakase de 14 comensales en obsidiana y jade esmeralda, pesca madurada del día, mosaico de barra y maridaje de sakes.",
    document: createSushiPresetDocument(),
    updatedAt: "2026-10-05T00:00:00.000Z",
  },
  {
    id: "landing-preset-pizzeria-napoli",
    name: "Pizzería Napolitana & Trattoria",
    description:
      "Trattoria verace napoletana con fermentación de 48 horas a 450°C, tomate San Marzano D.O.P., mozzarella fresca y dudas de comensales.",
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
    restaurantId: null,
    document: preset.document,
    htmlContent: compiled.htmlContent,
    cssContent: compiled.cssContent,
    jsContent: compiled.jsContent,
    rejectionReason: null,
    createdAt: preset.updatedAt,
    updatedAt: preset.updatedAt,
  };
}
