import React from "react";
import { Code2, Sparkles, Layers, LayoutTemplate, Wrench, Box, Type, Image as ImageIcon, MessageSquareQuote, MapPin, HelpCircle, BarChart3, CalendarDays, Megaphone, PanelBottom, Compass, Link2, MousePointerClick, Columns, Grid, Minus, Rows, Scan, PartyPopper, LayoutGrid, CalendarCheck, UtensilsCrossed, Star } from "lucide-react";
import { type LandingTheme } from "../contracts";
import { type InsertableInnerElementKind } from "../domain/landing-compiler";

type ThemePresetItem = {
  id: string;
  name: string;
  dots: [string, string, string, string];
  theme: LandingTheme;
};

export const STUDIO_THEME_PRESETS: ThemePresetItem[] = [
  {
    id: "dark-minimal",
    name: "Dark Minimal",
    dots: ["#09090b", "#18181b", "#22c55e", "#fafafa"],
    theme: {
      primaryColor: "#22c55e",
      primaryLightColor: "#16a34a",
      accentColor: "#4ade80",
      bgColor: "#09090b",
      cardBgColor: "#141418",
      textColor: "#fafafa",
      mutedTextColor: "#a1a1aa",
      borderColor: "#27272a",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
      radiusMd: "12px",
      radiusLg: "20px",
    },
  },
  {
    id: "ivory",
    name: "Ivory",
    dots: ["#faf8f5", "#ffffff", "#1e3321", "#c49a45"],
    theme: {
      primaryColor: "#1e3321",
      primaryLightColor: "#2c4a30",
      accentColor: "#c49a45",
      bgColor: "#faf8f5",
      cardBgColor: "#ffffff",
      textColor: "#192019",
      mutedTextColor: "#5e695d",
      borderColor: "#e8e4dc",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
      radiusMd: "14px",
      radiusLg: "24px",
    },
  },
  {
    id: "clean",
    name: "Clean",
    dots: ["#ffffff", "#f4f4f5", "#2563eb", "#09090b"],
    theme: {
      primaryColor: "#2563eb",
      primaryLightColor: "#1d4ed8",
      accentColor: "#3b82f6",
      bgColor: "#ffffff",
      cardBgColor: "#f8fafc",
      textColor: "#0f172a",
      mutedTextColor: "#64748b",
      borderColor: "#e2e8f0",
      fontHeading: "'Plus Jakarta Sans', system-ui, sans-serif",
      fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
      radiusMd: "12px",
      radiusLg: "20px",
    },
  },
  {
    id: "sand",
    name: "Sand",
    dots: ["#f6f2ea", "#fffdf9", "#9a3412", "#d97706"],
    theme: {
      primaryColor: "#9a3412",
      primaryLightColor: "#b45309",
      accentColor: "#d97706",
      bgColor: "#f6f2ea",
      cardBgColor: "#fffdf9",
      textColor: "#292524",
      mutedTextColor: "#78716c",
      borderColor: "#e7e0d3",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
      radiusMd: "14px",
      radiusLg: "24px",
    },
  },
  {
    id: "amber",
    name: "Amber Brasa",
    dots: ["#12100e", "#1c1917", "#f59e0b", "#fafaf9"],
    theme: {
      primaryColor: "#d97706",
      primaryLightColor: "#f59e0b",
      accentColor: "#fbbf24",
      bgColor: "#12100e",
      cardBgColor: "#1c1917",
      textColor: "#fafaf9",
      mutedTextColor: "#a8a29e",
      borderColor: "#292524",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
      radiusMd: "12px",
      radiusLg: "20px",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    dots: ["#0b132b", "#1c2541", "#0ea5e9", "#f8fafc"],
    theme: {
      primaryColor: "#0ea5e9",
      primaryLightColor: "#0284c7",
      accentColor: "#38bdf8",
      bgColor: "#0b132b",
      cardBgColor: "#151f38",
      textColor: "#f8fafc",
      mutedTextColor: "#94a3b8",
      borderColor: "#233152",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
      radiusMd: "14px",
      radiusLg: "22px",
    },
  },
  {
    id: "rose",
    name: "Rosé",
    dots: ["#fff9fa", "#ffffff", "#be123c", "#f43f5e"],
    theme: {
      primaryColor: "#be123c",
      primaryLightColor: "#9f1239",
      accentColor: "#f43f5e",
      bgColor: "#fff9fa",
      cardBgColor: "#ffffff",
      textColor: "#1f2937",
      mutedTextColor: "#6b7280",
      borderColor: "#fce7f3",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
      radiusMd: "16px",
      radiusLg: "26px",
    },
  },
  {
    id: "forest",
    name: "Forest",
    dots: ["#0b1911", "#132a1d", "#10b981", "#ecfdf5"],
    theme: {
      primaryColor: "#10b981",
      primaryLightColor: "#059669",
      accentColor: "#34d399",
      bgColor: "#0b1911",
      cardBgColor: "#12261a",
      textColor: "#ecfdf5",
      mutedTextColor: "#86efac",
      borderColor: "#1e3a2a",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
      radiusMd: "14px",
      radiusLg: "22px",
    },
  },
];

export type ModuleCategory =
  | "reservas"
  | "estructura"
  | "menu"
  | "contenido"
  | "contacto"
  | "codigo";

export function getModuleCategory(moduleKey: string): ModuleCategory {
  if (
    moduleKey === "reservations-table" ||
    moduleKey === "reservations-booking" ||
    moduleKey === "reservations-events" ||
    moduleKey === "reservations" ||
    moduleKey === "events"
  ) {
    return "reservas";
  }
  if (
    moduleKey === "blank-container" ||
    moduleKey === "columns-container" ||
    moduleKey === "columns-3-container" ||
    moduleKey === "columns-4-container" ||
    moduleKey === "flex-row-container" ||
    moduleKey === "flex-col-container" ||
    moduleKey === "header" ||
    moduleKey === "footer"
  ) {
    return "estructura";
  }
  if (
    moduleKey === "specialties-grid" ||
    moduleKey === "custom-card" ||
    moduleKey === "gallery-grid" ||
    moduleKey === "specialties" ||
    moduleKey === "card"
  ) {
    return "menu";
  }
  if (moduleKey === "contact-hours") {
    return "contacto";
  }
  if (moduleKey === "custom-code" || moduleKey.startsWith("custom:")) {
    return "codigo";
  }
  return "contenido";
}

export const MODULE_CATEGORY_META: Record<
  ModuleCategory,
  {
    label: string;
    fullLabel: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    iconText: string;
    iconBorder: string;
    hoverBorder: string;
  }
> = {
  reservas: {
    label: "Reservas",
    fullLabel: "Reservas & Eventos",
    badgeBg: "bg-rose-50 border border-rose-200/80",
    badgeText: "text-rose-700",
    iconBg: "bg-rose-50 group-hover:bg-rose-100",
    iconText: "text-rose-600",
    iconBorder: "border-rose-200/80",
    hoverBorder: "hover:border-rose-300",
  },
  estructura: {
    label: "Estructura",
    fullLabel: "Estructura & Layout",
    badgeBg: "bg-sky-50 border border-sky-200/80",
    badgeText: "text-sky-700",
    iconBg: "bg-sky-50 group-hover:bg-sky-100",
    iconText: "text-sky-600",
    iconBorder: "border-sky-200/80",
    hoverBorder: "hover:border-sky-300",
  },
  menu: {
    label: "Menú",
    fullLabel: "Menú & Especialidades",
    badgeBg: "bg-amber-50 border border-amber-200/80",
    badgeText: "text-amber-800",
    iconBg: "bg-amber-50 group-hover:bg-amber-100",
    iconText: "text-amber-600",
    iconBorder: "border-amber-200/80",
    hoverBorder: "hover:border-amber-300",
  },
  contenido: {
    label: "Contenido",
    fullLabel: "Contenido & Portada",
    badgeBg: "bg-violet-50 border border-violet-200/80",
    badgeText: "text-violet-700",
    iconBg: "bg-violet-50 group-hover:bg-violet-100",
    iconText: "text-violet-600",
    iconBorder: "border-violet-200/80",
    hoverBorder: "hover:border-violet-300",
  },
  contacto: {
    label: "Contacto",
    fullLabel: "Ubicación & Contacto",
    badgeBg: "bg-emerald-50 border border-emerald-200/80",
    badgeText: "text-emerald-700",
    iconBg: "bg-emerald-50 group-hover:bg-emerald-100",
    iconText: "text-emerald-600",
    iconBorder: "border-emerald-200/80",
    hoverBorder: "hover:border-emerald-300",
  },
  codigo: {
    label: "Código",
    fullLabel: "Código & Personalizado",
    badgeBg: "bg-zinc-100 border border-zinc-200",
    badgeText: "text-zinc-700",
    iconBg: "bg-zinc-100 group-hover:bg-zinc-200",
    iconText: "text-zinc-700",
    iconBorder: "border-zinc-300",
    hoverBorder: "hover:border-zinc-400",
  },
};

export const MODULE_GROUPS: {
  key: ModuleCategory;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "reservas", title: "Reservas & Eventos", icon: CalendarCheck },
  { key: "estructura", title: "Estructura & Layout", icon: Columns },
  { key: "menu", title: "Menú & Especialidades", icon: UtensilsCrossed },
  { key: "contenido", title: "Contenido & Portada", icon: Sparkles },
  { key: "contacto", title: "Ubicación & Contacto", icon: MapPin },
  { key: "codigo", title: "Avanzado & Código Libre", icon: Code2 },
];

export function getModuleIcon(moduleKey: string) {
  if (moduleKey === "blank-container") return Box;
  if (moduleKey === "columns-container") return Columns;
  if (moduleKey === "columns-3-container") return LayoutGrid;
  if (moduleKey === "columns-4-container") return Grid;
  if (moduleKey === "flex-row-container") return Rows;
  if (moduleKey === "flex-col-container") return Columns;
  if (moduleKey === "header") return Compass;
  if (moduleKey === "hero") return Sparkles;
  if (moduleKey === "custom-card" || moduleKey === "card") return Star;
  if (moduleKey === "specialties-grid" || moduleKey === "specialties") return UtensilsCrossed;
  if (moduleKey === "experience-split" || moduleKey === "story") return ImageIcon;
  if (moduleKey === "promo-banner") return Megaphone;
  if (moduleKey === "testimonials") return MessageSquareQuote;
  if (moduleKey === "contact-hours") return MapPin;
  if (moduleKey === "reservations-table" || moduleKey === "reservations") return CalendarDays;
  if (moduleKey === "reservations-booking") return CalendarCheck;
  if (moduleKey === "reservations-events" || moduleKey === "events") return PartyPopper;
  if (moduleKey === "footer") return PanelBottom;
  if (moduleKey === "stats-strip") return BarChart3;
  if (moduleKey === "gallery-grid") return LayoutGrid;
  if (moduleKey === "image-spotlight") return ImageIcon;
  if (moduleKey === "faq-accordion") return HelpCircle;
  if (moduleKey === "custom-code") return Code2;
  if (moduleKey.startsWith("custom:")) return Wrench;
  return Code2;
}

interface DraggableComponentItem {
  kind: InsertableInnerElementKind;
  name: string;
  category: "layout" | "text" | "action" | "media";
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

export const ATOMIC_COMPONENTS_CATALOG: DraggableComponentItem[] = [
  // Layout & Contenedores (HTML Tag Presets)
  {
    kind: "container",
    name: "Contenedor (div)",
    category: "layout",
    description: "Etiqueta <div> contenedora flexible con relleno",
    icon: Box,
    tag: "<div>",
  },
  {
    kind: "flex-row",
    name: "Fila Flex (Flex Row)",
    category: "layout",
    description: "Contenedor display: flex en fila horizontal",
    icon: Rows,
    tag: "div.flex-row",
  },
  {
    kind: "flex-col",
    name: "Columna Flex (Flex Col)",
    category: "layout",
    description: "Contenedor display: flex en columna vertical",
    icon: Columns,
    tag: "div.flex-col",
  },
  {
    kind: "columns-2",
    name: "Grilla 2 Columnas",
    category: "layout",
    description: "Contenedor display: grid de 2 columnas responsive",
    icon: Columns,
    tag: "div.grid-2",
  },
  {
    kind: "columns-3",
    name: "Grilla 3 Columnas",
    category: "layout",
    description: "Contenedor display: grid de 3 columnas responsive",
    icon: Grid,
    tag: "div.grid-3",
  },
  {
    kind: "columns-4",
    name: "Grilla 4 Columnas",
    category: "layout",
    description: "Contenedor display: grid de 4 columnas responsive",
    icon: Grid,
    tag: "div.grid-4",
  },
  {
    kind: "section",
    name: "Sub-Sección (section)",
    category: "layout",
    description: "Etiqueta semántica <section> para agrupar bloques",
    icon: LayoutTemplate,
    tag: "<section>",
  },
  {
    kind: "card",
    name: "Tarjeta (article)",
    category: "layout",
    description: "Etiqueta <article> con ícono, título y texto",
    icon: Layers,
    tag: "<article>",
  },
  {
    kind: "header-box",
    name: "Encabezado (header)",
    category: "layout",
    description: "Etiqueta semántica <header> para cabeceras",
    icon: PanelBottom,
    tag: "<header>",
  },
  {
    kind: "footer-box",
    name: "Pie de Sección (footer)",
    category: "layout",
    description: "Etiqueta semántica <footer> con fila flexible",
    icon: PanelBottom,
    tag: "<footer>",
  },
  {
    kind: "nav-bar",
    name: "Navegación (nav)",
    category: "layout",
    description: "Etiqueta <nav> con enlaces horizontales",
    icon: Compass,
    tag: "<nav>",
  },

  // Textos y Tipografía (HTML Tag Presets)
  {
    kind: "h1",
    name: "Título Principal (H1)",
    category: "text",
    description: "Encabezado principal <h1> de alto impacto",
    icon: Type,
    tag: "<h1>",
  },
  {
    kind: "h2",
    name: "Título de Sección (H2)",
    category: "text",
    description: "Encabezado secundario <h2> para secciones",
    icon: Type,
    tag: "<h2>",
  },
  {
    kind: "heading",
    name: "Subtítulo (H3)",
    category: "text",
    description: "Encabezado <h3> para tarjetas o bloques",
    icon: Type,
    tag: "<h3>",
  },
  {
    kind: "h4",
    name: "Encabezado Menor (H4)",
    category: "text",
    description: "Encabezado compacto <h4>",
    icon: Type,
    tag: "<h4>",
  },
  {
    kind: "text",
    name: "Párrafo (p)",
    category: "text",
    description: "Etiqueta <p> para texto descriptivo",
    icon: Type,
    tag: "<p>",
  },
  {
    kind: "badge",
    name: "Insignia / Pill (span)",
    category: "text",
    description: "Etiqueta <span> tipo badge inline-flex",
    icon: Sparkles,
    tag: "<span>",
  },
  {
    kind: "blockquote",
    name: "Cita / Reseña (blockquote)",
    category: "text",
    description: "Etiqueta <blockquote> con borde lateral",
    icon: MessageSquareQuote,
    tag: "<blockquote>",
  },
  {
    kind: "ul-list",
    name: "Lista con Viñetas (ul)",
    category: "text",
    description: "Lista desordenada <ul> con 3 ítems <li>",
    icon: Layers,
    tag: "<ul>",
  },
  {
    kind: "ol-list",
    name: "Lista Numerada (ol)",
    category: "text",
    description: "Lista ordenada <ol> paso a paso",
    icon: Layers,
    tag: "<ol>",
  },
  {
    kind: "li-item",
    name: "Ítem de Lista (li)",
    category: "text",
    description: "Elemento individual <li> para listas",
    icon: Minus,
    tag: "<li>",
  },

  // Acciones e Interactivos (HTML Tag Presets)
  {
    kind: "button",
    name: "Botón CTA Primario",
    category: "action",
    description: "Enlace <a> con estilo de botón principal",
    icon: MousePointerClick,
    tag: "a.btn-primary",
  },
  {
    kind: "button-secondary",
    name: "Botón Secundario Outline",
    category: "action",
    description: "Enlace <a> con borde sutil y fondo transparente",
    icon: MousePointerClick,
    tag: "a.btn-secondary",
  },
  {
    kind: "html-button",
    name: "Botón Nativo (button)",
    category: "action",
    description: "Etiqueta <button> interactiva HTML",
    icon: MousePointerClick,
    tag: "<button>",
  },
  {
    kind: "link",
    name: "Enlace de Texto (a)",
    category: "action",
    description: "Etiqueta <a> para navegación inline",
    icon: Link2,
    tag: "<a>",
  },
  {
    kind: "accordion",
    name: "Acordeón / FAQ (details)",
    category: "action",
    description: "Etiqueta <details> + <summary> desplegable",
    icon: HelpCircle,
    tag: "<details>",
  },

  // Medios y Separadores (HTML Tag Presets)
  {
    kind: "image",
    name: "Imagen (img)",
    category: "media",
    description: "Etiqueta <img> responsive con galería",
    icon: ImageIcon,
    tag: "<img>",
  },
  {
    kind: "figure",
    name: "Figura con Epígrafe",
    category: "media",
    description: "Etiqueta <figure> con <img> y <figcaption>",
    icon: ImageIcon,
    tag: "<figure>",
  },
  {
    kind: "divider",
    name: "Separador (hr)",
    category: "media",
    description: "Línea divisoria horizontal <hr>",
    icon: Minus,
    tag: "<hr>",
  },
  {
    kind: "spacer",
    name: "Espaciador Vertical",
    category: "media",
    description: "Bloque vacío para dar aire vertical",
    icon: Scan,
    tag: "div.spacer",
  },
];
