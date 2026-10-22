"use client";

import React, {
  useState,
  useEffect,
  useTransition,
  useMemo,
  useRef,
  useCallback,
  useId,
} from "react";
import Editor, { loader } from "@monaco-editor/react";
import {
  Code2,
  Eye,
  EyeOff,
  Save,
  Globe,
  RotateCcw,
  ExternalLink,
  Smartphone,
  Monitor,
  Tablet,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileCode2,
  Paintbrush,
  Braces,
  Layers,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  FoldVertical,
  Palette,
  LayoutTemplate,
  Download,
  Upload,
  BookmarkPlus,
  Wrench,
  Search,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sliders,
  Box,
  Type,
  Image as ImageIcon,
  MessageSquareQuote,
  MapPin,
  HelpCircle,
  BarChart3,
  Megaphone,
  Utensils,
  PanelBottom,
  Compass,
  X,
  ArrowLeft,
  ArrowRight,
  CornerLeftUp,
  Link2,
  Unlink,
  MousePointerClick,
  Columns,
  Grid,
  Minus,
  Rows,
  Scan,
  Square,
  CornerUpLeft,
  CornerUpRight,
  CornerDownLeft,
  CornerDownRight,
} from "lucide-react";
import type {
  LandingBlock,
  LandingCustomModuleView,
  LandingDocumentV1,
  LandingTemplateView,
  LandingTheme,
  SubElementStyleOverride,
} from "../contracts";
import type { LandingEditorView } from "../application/landing-use-cases";
import {
  BUILTIN_LANDING_MODULES,
  createBlockFromBuiltinModule,
  createBlockFromCustomModule,
  type BuiltinLandingModuleDefinition,
} from "./../domain/landing-module-catalog";
import {
  buildBlockSubLayerTree,
  compileLandingDocument,
  compileLandingFromDocument,
  createBlankContainerBlock,
  createDefaultLandingDocument,
  createDefaultLandingTemplate,
  deleteSubElementInBlock,
  duplicateSubElementInBlock,
  insertInnerElementInBlock,
  moveBlockIntoBlock,
  moveSubElementBetweenBlocks,
  moveSubElementInBlock,
  parseSubElementStyles,
  reparentSubElementInBlock,
  resolveDocumentBlockAnchors,
  sanitizeAnchorSlug,
  serializeSubElementStyles,
  syncFieldsWithHtmlTemplate,
  updateSubElementAttributeInBlock,
  updateSubElementTextInBlock,
  type InsertableInnerElementKind,
  type LandingSubLayerIconType,
  type LandingSubLayerNode,
} from "../domain/landing-compiler";
import {
  saveLandingDraftAction,
  publishLandingAction,
  createCustomLandingModuleAction,
  deleteCustomLandingModuleAction,
  createLandingTemplateAction,
  deletePrivateLandingTemplateAction,
  exportLandingTemplateAction,
  importLandingTemplateAction,
} from "./actions";
import { LandingMediaModal } from "./LandingMediaModal";

loader.config({
  paths: {
    vs: "/api/monaco/vs",
  },
});

type ViewportMode = "desktop" | "tablet" | "mobile";
type LeftSidebarTab = "layers" | "components" | "modules";
type RightSidebarTab = "properties" | "design";
type CodeDrawerMode = "closed" | "block" | "global";
type CodeTab = "html" | "css" | "js" | "json";

type SubElementAncestor = {
  selector: string;
  label: string;
  tagName: string;
  isRepeatable: boolean;
};

type SelectedSubElementInfo = {
  blockId: string;
  selector: string;
  tagName: string;
  label: string;
  isImage: boolean;
  isLink: boolean;
  isRepeatable: boolean;
  boundTextField: string | null;
  boundSrcField: string | null;
  boundHrefField: string | null;
  boundAltField: string | null;
  childFieldKeys?: string[];
  currentSrc: string;
  currentAlt: string;
  currentHref: string;
  ancestors: SubElementAncestor[];
  computedStyles?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: string;
    paddingTop?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    paddingRight?: string;
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
    textAlign?: string;
    display?: string;
    flexDirection?: string;
    flexWrap?: string;
    justifyContent?: string;
    alignItems?: string;
    gap?: string;
    gridTemplateColumns?: string;
    width?: string;
    maxWidth?: string;
    height?: string;
    minHeight?: string;
    overflow?: string;
    position?: string;
  };
};

type MediaPickerTarget =
  | {
      kind: "field";
      blockId: string;
      fieldKey: string;
      currentUrl: string;
      title: string;
    }
  | {
      kind: "block-bg";
      blockId: string;
      currentUrl: string;
      title: string;
    }
  | {
      kind: "sub-img";
      blockId: string;
      selector: string;
      boundSrcField: string | null;
      boundAltField: string | null;
      currentUrl: string;
      title: string;
    }
  | {
      kind: "sub-bg";
      blockId: string;
      selector: string;
      currentUrl: string;
      title: string;
    };

interface MonacoLandingEditorProps {
  initialData: LandingEditorView;
  isSuperAdmin?: boolean;
}

type ThemePresetItem = {
  id: string;
  name: string;
  dots: [string, string, string, string];
  theme: LandingTheme;
};

const STUDIO_THEME_PRESETS: ThemePresetItem[] = [
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

function getModuleIcon(moduleKey: string) {
  if (moduleKey === "blank-container") return Box;
  if (moduleKey === "columns-container") return Columns;
  if (moduleKey === "header") return Compass;
  if (moduleKey === "hero") return Sparkles;
  if (moduleKey === "custom-card" || moduleKey === "card") return Box;
  if (moduleKey === "specialties-grid" || moduleKey === "specialties") return Utensils;
  if (moduleKey === "experience-split" || moduleKey === "story") return ImageIcon;
  if (moduleKey === "promo-banner") return Megaphone;
  if (moduleKey === "testimonials") return MessageSquareQuote;
  if (moduleKey === "contact-hours") return MapPin;
  if (moduleKey === "footer") return PanelBottom;
  if (moduleKey === "stats-strip") return BarChart3;
  if (moduleKey === "gallery-grid" || moduleKey === "image-spotlight") return ImageIcon;
  if (moduleKey === "faq-accordion") return HelpCircle;
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

const ATOMIC_COMPONENTS_CATALOG: DraggableComponentItem[] = [
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

function SubLayerIcon({
  iconType,
  className,
}: {
  iconType: LandingSubLayerIconType;
  className?: string;
}) {
  switch (iconType) {
    case "image":
      return <ImageIcon className={className} />;
    case "button":
      return <MousePointerClick className={className} />;
    case "link":
      return <Link2 className={className} />;
    case "text":
      return <Type className={className} />;
    case "card":
      return <Layers className={className} />;
    case "badge":
      return <Sparkles className={className} />;
    case "container":
    default:
      return <Box className={className} />;
  }
}

export type DraggedLayerItem =
  | {
      type: "block";
      blockId: string;
      blockIndex: number;
      label: string;
    }
  | {
      type: "sublayer";
      blockId: string;
      selector: string;
      label: string;
      tag: string;
    };

interface SubLayerTreeRowProps {
  block: LandingBlock;
  node: LandingSubLayerNode;
  depth: number;
  selectedBlockId: string | null;
  activeSubElementSelector?: string | null;
  expandedSubLayerIds: Record<string, boolean>;
  matchingNodeIds?: Set<string>;
  ancestorNodeIds?: Set<string>;
  isSearching?: boolean;
  onSelectSubElement: (blockId: string, selector: string) => void;
  onHoverSubElement: (blockId: string | null, selector: string | null) => void;
  onToggleExpand: (nodeId: string, e: React.MouseEvent) => void;
  onDuplicateSubElement: (blockId: string, selector: string) => void;
  onDeleteSubElement: (blockId: string, selector: string) => void;
  onDropComponentOnSubElement?: (
    blockId: string,
    selector: string,
    kind: InsertableInnerElementKind,
  ) => void;
  draggedComponentKind?: InsertableInnerElementKind | null;
  draggedLayerItem?: DraggedLayerItem | null;
  onDragStartLayer?: (item: DraggedLayerItem, e: React.DragEvent) => void;
  onDragEndLayer?: () => void;
  onDropLayerOnSubElement?: (
    targetBlockId: string,
    targetSelector: string,
    position: "inside" | "before" | "after",
  ) => void;
}

interface LandingDragWindow extends Window {
  __draggedComponentKind?: InsertableInnerElementKind | null;
  __draggedBuiltinKey?: string | null;
  __draggedCustomId?: string | null;
  __draggedLayerItem?: DraggedLayerItem | null;
}

function getDragWindow(): LandingDragWindow | null {
  if (typeof window === "undefined") return null;
  return window as unknown as LandingDragWindow;
}

function SubLayerTreeRow({
  block,
  node,
  depth,
  selectedBlockId,
  activeSubElementSelector,
  expandedSubLayerIds,
  matchingNodeIds,
  ancestorNodeIds,
  isSearching,
  onSelectSubElement,
  onHoverSubElement,
  onToggleExpand,
  onDuplicateSubElement,
  onDeleteSubElement,
  onDropComponentOnSubElement,
  draggedComponentKind,
  draggedLayerItem,
  onDragStartLayer,
  onDragEndLayer,
  onDropLayerOnSubElement,
}: SubLayerTreeRowProps) {
  const [dropPosition, setDropPosition] = useState<
    "inside" | "before" | "after" | null
  >(null);
  const autoExpandTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isSelected =
    selectedBlockId === block.id &&
    activeSubElementSelector === node.selector;
  const hasChildren = node.children.length > 0;
  const isSearchingActive = Boolean(isSearching);
  const isExpanded =
    isSearchingActive && ancestorNodeIds?.has(node.id)
      ? true
      : Boolean(expandedSubLayerIds[node.id]);
  const isMatching =
    isSearchingActive && Boolean(matchingNodeIds?.has(node.id));

  const isSelfDragging =
    draggedLayerItem?.type === "sublayer" &&
    draggedLayerItem.blockId === block.id &&
    draggedLayerItem.selector === node.selector;

  const isDropInside = dropPosition === "inside";

  return (
    <div className="flex flex-col">
      <div
        draggable
        onDragStart={(e) => {
          if ((e.target as HTMLElement).closest("button")) {
            e.preventDefault();
            return;
          }
          const item: DraggedLayerItem = {
            type: "sublayer",
            blockId: block.id,
            selector: node.selector,
            label: node.label,
            tag: node.tag,
          };
          onDragStartLayer?.(item, e);
          const win = getDragWindow();
          if (win) win.__draggedLayerItem = item;
          try {
            e.dataTransfer.setData(
              "application/x-landing-layer",
              JSON.stringify(item),
            );
            e.dataTransfer.setData(
              "text/plain",
              `landing-layer:${item.blockId}:${item.selector}`,
            );
            e.dataTransfer.effectAllowed = "move";
          } catch {
            // ignore
          }
        }}
        onDragEnd={() => {
          if (autoExpandTimerRef.current) {
            clearTimeout(autoExpandTimerRef.current);
            autoExpandTimerRef.current = null;
          }
          onDragEndLayer?.();
          const win = getDragWindow();
          if (win) win.__draggedLayerItem = null;
          setDropPosition(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectSubElement(block.id, node.selector);
        }}
        onMouseEnter={() => onHoverSubElement(block.id, node.selector)}
        onMouseLeave={() => onHoverSubElement(null, null)}
        onDragOver={(e) => {
          const win = getDragWindow();
          const currentLayer = draggedLayerItem || win?.__draggedLayerItem;
          const compKind = draggedComponentKind || win?.__draggedComponentKind;

          // Prevent dropping onto self or descendants
          if (
            currentLayer?.type === "sublayer" &&
            currentLayer.blockId === block.id
          ) {
            if (
              currentLayer.selector === node.selector ||
              node.selector.startsWith(currentLayer.selector + " > ")
            ) {
              return;
            }
          }

          let isAcceptable = Boolean(compKind || currentLayer);
          if (!isAcceptable && e.dataTransfer) {
            try {
              const plain = e.dataTransfer.getData("text/plain") || "";
              if (
                plain.startsWith("landing-component:") ||
                plain.startsWith("landing-layer:") ||
                e.dataTransfer.types.includes(
                  "application/x-landing-component",
                ) ||
                e.dataTransfer.types.includes("application/x-landing-layer")
              ) {
                isAcceptable = true;
              }
            } catch {
              // ignore
            }
          }

          if (isAcceptable) {
            e.preventDefault();
            e.stopPropagation();

            if (hasChildren && !isExpanded) {
              if (!autoExpandTimerRef.current) {
                autoExpandTimerRef.current = setTimeout(() => {
                  onToggleExpand(node.id, e as unknown as React.MouseEvent);
                  autoExpandTimerRef.current = null;
                }, 600);
              }
            }

            const rect = e.currentTarget.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            const ratio = relY / rect.height;

            let pos: "inside" | "before" | "after" = "inside";
            if (ratio < 0.25) pos = "before";
            else if (ratio > 0.75) pos = "after";
            else pos = "inside";

            setDropPosition(pos);
          }
        }}
        onDragLeave={() => {
          setDropPosition(null);
          if (autoExpandTimerRef.current) {
            clearTimeout(autoExpandTimerRef.current);
            autoExpandTimerRef.current = null;
          }
        }}
        onDrop={(e) => {
          if (autoExpandTimerRef.current) {
            clearTimeout(autoExpandTimerRef.current);
            autoExpandTimerRef.current = null;
          }
          const pos = dropPosition || "inside";
          setDropPosition(null);

          const win = getDragWindow();
          const currentLayer = draggedLayerItem || win?.__draggedLayerItem;

          // 1. Drop dragged layer
          if (currentLayer) {
            e.preventDefault();
            e.stopPropagation();
            onDropLayerOnSubElement?.(block.id, node.selector, pos);
            return;
          }

          // 2. Drop catalog component
          let kind = draggedComponentKind || win?.__draggedComponentKind;
          if (!kind) {
            try {
              const plain = e.dataTransfer.getData("text/plain") || "";
              if (plain.startsWith("landing-component:")) {
                kind = plain.slice(
                  "landing-component:".length,
                ) as InsertableInnerElementKind;
              } else {
                kind = (e.dataTransfer.getData(
                  "application/x-landing-component",
                ) || null) as InsertableInnerElementKind | null;
              }
            } catch {
              // ignore
            }
          }

          if (kind) {
            e.preventDefault();
            e.stopPropagation();
            onDropComponentOnSubElement?.(block.id, node.selector, kind);
            return;
          }
        }}
        style={{ paddingLeft: `${4 + depth * 10}px` }}
        className={`group relative flex items-center justify-between gap-1.5 py-1.5 pr-2 rounded-md cursor-pointer text-xs transition-colors border select-none ${
          isSelfDragging
            ? "opacity-35 bg-zinc-100 border-dashed border-zinc-400"
            : isDropInside
              ? "bg-violet-100/90 border-violet-400 text-violet-950 font-semibold ring-2 ring-violet-300 shadow-2xs"
              : isSelected
                ? "bg-violet-100/90 border-violet-300 text-violet-900 font-semibold shadow-2xs"
                : isMatching
                  ? "bg-blue-50/90 border-blue-400 text-blue-900 font-semibold ring-1 ring-blue-300 shadow-2xs"
                  : "border-transparent hover:bg-zinc-100/80 text-zinc-600 hover:text-zinc-900"
        }`}
        title={`Seleccionar ${node.label} (Arrastrá para reordenar o anidar)`}
      >
        {dropPosition === "before" && (
          <div className="absolute -top-0.5 left-1 right-1 h-[2px] bg-blue-500 rounded-full z-20 pointer-events-none shadow-xs" />
        )}
        {dropPosition === "after" && (
          <div className="absolute -bottom-0.5 left-1 right-1 h-[2px] bg-blue-500 rounded-full z-20 pointer-events-none shadow-xs" />
        )}

        <div className="flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => onToggleExpand(node.id, e)}
              className="p-0.5 -ml-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-200/60"
              title={isExpanded ? "Colapsar capa" : "Expandir capa"}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
            </button>
          ) : (
            <span className="w-3 shrink-0" />
          )}

          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
              isSelected
                ? "text-violet-700"
                : "text-zinc-400 group-hover:text-zinc-600"
            }`}
          >
            <SubLayerIcon iconType={node.iconType} className="h-3 w-3" />
          </span>

          <span className="truncate text-[11px] font-normal" title={node.label}>
            {node.label}
          </span>

          {isDropInside && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-600 text-white px-1.5 py-0.5 rounded shadow-2xs animate-pulse shrink-0">
              ↳ dentro
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onDuplicateSubElement(block.id, node.selector)}
            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded"
            title="Duplicar este elemento"
          >
            <Copy className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteSubElement(block.id, node.selector)}
            className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Eliminar este elemento"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <SubLayerTreeRow
              key={child.id}
              block={block}
              node={child}
              depth={depth + 1}
              selectedBlockId={selectedBlockId}
              activeSubElementSelector={activeSubElementSelector}
              expandedSubLayerIds={expandedSubLayerIds}
              matchingNodeIds={matchingNodeIds}
              ancestorNodeIds={ancestorNodeIds}
              isSearching={isSearching}
              onSelectSubElement={onSelectSubElement}
              onHoverSubElement={onHoverSubElement}
              onToggleExpand={onToggleExpand}
              onDuplicateSubElement={onDuplicateSubElement}
              onDeleteSubElement={onDeleteSubElement}
              onDropComponentOnSubElement={onDropComponentOnSubElement}
              draggedComponentKind={draggedComponentKind}
              draggedLayerItem={draggedLayerItem}
              onDragStartLayer={onDragStartLayer}
              onDragEndLayer={onDragEndLayer}
              onDropLayerOnSubElement={onDropLayerOnSubElement}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeDimensionValue(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return "";
  if (
    trimmed === "auto" ||
    trimmed === "inherit" ||
    trimmed === "initial" ||
    trimmed === "unset"
  ) {
    return trimmed;
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}px`;
  }
  return trimmed;
}

interface DirectionalInputProps {
  value?: string;
  placeholder?: string;
  title: string;
  onChange: (val: string) => void;
  variant?: "neutral" | "margin" | "padding";
  className?: string;
}

function DirectionalInput({
  value,
  placeholder,
  title,
  onChange,
  variant = "neutral",
  className,
}: DirectionalInputProps) {
  const [prevValue, setPrevValue] = useState(value ?? "");
  const [localVal, setLocalVal] = useState(value ?? "");

  if (prevValue !== (value ?? "")) {
    setPrevValue(value ?? "");
    setLocalVal(value ?? "");
  }

  const commit = () => {
    const norm = normalizeDimensionValue(localVal);
    if (norm !== (value ?? "")) {
      onChange(norm);
    }
  };

  const hasValue = Boolean(
    value && value.trim() && value !== "0" && value !== "0px",
  );

  let variantClasses =
    "border-zinc-200/90 bg-white text-zinc-700 placeholder:text-zinc-400";
  if (hasValue) {
    if (variant === "margin") {
      variantClasses =
        "border-amber-400 bg-amber-50 text-amber-950 font-semibold shadow-2xs";
    } else if (variant === "padding") {
      variantClasses =
        "border-blue-400 bg-blue-50 text-blue-950 font-semibold shadow-2xs";
    } else {
      variantClasses =
        "border-zinc-400 bg-zinc-50 text-zinc-900 font-semibold shadow-2xs";
    }
  }

  return (
    <input
      type="text"
      value={localVal}
      placeholder={placeholder || "-"}
      title={title}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          e.currentTarget.blur();
        }
      }}
      className={
        className ||
        `w-12 h-6 text-center text-[11px] font-mono rounded-md border hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:bg-white focus:outline-none transition-all ${variantClasses}`
      }
    />
  );
}

interface BoxModelSpacingEditorProps {
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  computedStyles?: {
    paddingTop?: string;
    paddingRight?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    marginTop?: string;
    marginRight?: string;
    marginBottom?: string;
    marginLeft?: string;
  };
  onUpdatePadding: (patch: {
    paddingTop?: string;
    paddingRight?: string;
    paddingBottom?: string;
    paddingLeft?: string;
  }) => void;
  onUpdateMargin: (patch: {
    marginTop?: string;
    marginRight?: string;
    marginBottom?: string;
    marginLeft?: string;
  }) => void;
}

function BoxModelSpacingEditor({
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  computedStyles,
  onUpdatePadding,
  onUpdateMargin,
}: BoxModelSpacingEditorProps) {
  const [isPaddingLinked, setIsPaddingLinked] = useState<boolean>(() => {
    const hasAny = Boolean(paddingTop || paddingRight || paddingBottom || paddingLeft);
    if (!hasAny) return true;
    return (
      paddingTop === paddingRight &&
      paddingRight === paddingBottom &&
      paddingBottom === paddingLeft
    );
  });

  const [isMarginLinked, setIsMarginLinked] = useState<boolean>(() => {
    const hasAny = Boolean(marginTop || marginRight || marginBottom || marginLeft);
    if (!hasAny) return false;
    return (
      marginTop === marginRight &&
      marginRight === marginBottom &&
      marginBottom === marginLeft
    );
  });

  const hasCustomPadding = Boolean(
    paddingTop || paddingRight || paddingBottom || paddingLeft,
  );
  const hasCustomMargin = Boolean(
    marginTop || marginRight || marginBottom || marginLeft,
  );
  const isHorizontallyCentered =
    marginLeft === "auto" && marginRight === "auto";

  const paddingPresets = ["0px", "4px", "8px", "12px", "16px", "24px", "32px", "48px"];
  const marginPresets = ["0px", "4px", "8px", "12px", "16px", "24px", "32px", "auto"];

  const handleToggleCenter = () => {
    if (isHorizontallyCentered) {
      onUpdateMargin({ marginLeft: "", marginRight: "" });
    } else {
      onUpdateMargin({ marginLeft: "auto", marginRight: "auto" });
    }
  };

  return (
    <div className="space-y-2">
      {/* Padding Panel */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-zinc-800">
              Padding (Relleno)
            </span>
            {hasCustomPadding && (
              <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                Personalizado
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsPaddingLinked(!isPaddingLinked)}
              className={`p-1 rounded-md border text-xs transition-colors ${
                isPaddingLinked
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-800"
              }`}
              title={
                isPaddingLinked
                  ? "Lados vinculados (click para editar lados por separado)"
                  : "Lados independientes (click para unificar todos los lados)"
              }
            >
              {isPaddingLinked ? (
                <Link2 className="h-3 w-3" />
              ) : (
                <Unlink className="h-3 w-3" />
              )}
            </button>
            {hasCustomPadding && (
              <button
                type="button"
                onClick={() =>
                  onUpdatePadding({
                    paddingTop: "",
                    paddingRight: "",
                    paddingBottom: "",
                    paddingLeft: "",
                  })
                }
                className="p-1 rounded-md text-zinc-400 hover:text-red-600"
                title="Restablecer padding"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* If Linked: Single Unified Input; If Unlinked: 4-col Grid */}
          {isPaddingLinked ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-zinc-500 shrink-0">
                Unificado:
              </span>
              <DirectionalInput
                value={paddingTop || paddingBottom || paddingLeft || paddingRight || ""}
                placeholder={computedStyles?.paddingTop || "0px"}
                title="Padding para todos los lados"
                variant="padding"
                onChange={(val) => {
                  const norm = normalizeDimensionValue(val);
                  onUpdatePadding({
                    paddingTop: norm,
                    paddingRight: norm,
                    paddingBottom: norm,
                    paddingLeft: norm,
                  });
                }}
                className="flex-1 h-6 text-xs font-mono font-medium rounded-md bg-zinc-50/80 border border-zinc-200 px-2 text-zinc-800 focus:bg-white focus:border-blue-500 focus:outline-none text-center"
              />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                  Top
                </span>
                <DirectionalInput
                  value={paddingTop}
                  placeholder={computedStyles?.paddingTop || "0px"}
                  title="Padding Superior (Top)"
                  variant="padding"
                  onChange={(val) =>
                    onUpdatePadding({ paddingTop: normalizeDimensionValue(val) })
                  }
                  className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-blue-500 focus:outline-none text-zinc-800"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                  Der
                </span>
                <DirectionalInput
                  value={paddingRight}
                  placeholder={computedStyles?.paddingRight || "0px"}
                  title="Padding Derecho (Right)"
                  variant="padding"
                  onChange={(val) =>
                    onUpdatePadding({ paddingRight: normalizeDimensionValue(val) })
                  }
                  className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-blue-500 focus:outline-none text-zinc-800"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                  Abajo
                </span>
                <DirectionalInput
                  value={paddingBottom}
                  placeholder={computedStyles?.paddingBottom || "0px"}
                  title="Padding Inferior (Bottom)"
                  variant="padding"
                  onChange={(val) =>
                    onUpdatePadding({ paddingBottom: normalizeDimensionValue(val) })
                  }
                  className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-blue-500 focus:outline-none text-zinc-800"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                  Izq
                </span>
                <DirectionalInput
                  value={paddingLeft}
                  placeholder={computedStyles?.paddingLeft || "0px"}
                  title="Padding Izquierdo (Left)"
                  variant="padding"
                  onChange={(val) =>
                    onUpdatePadding({ paddingLeft: normalizeDimensionValue(val) })
                  }
                  className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-blue-500 focus:outline-none text-zinc-800"
                />
              </div>
            </div>
          )}

          {/* Quick Presets for Padding (No scrollbars, clean wrap) */}
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[9px] text-zinc-400 font-medium mr-0.5">
              Presets:
            </span>
            {paddingPresets.map((p) => {
              const isSelected =
                paddingTop === p &&
                paddingBottom === p &&
                paddingLeft === p &&
                paddingRight === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    onUpdatePadding({
                      paddingTop: p,
                      paddingRight: p,
                      paddingBottom: p,
                      paddingLeft: p,
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white font-semibold shadow-2xs"
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Margin Panel */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs font-semibold text-zinc-800">
                Margen Exterior
              </span>
              {hasCustomMargin && (
                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  Personalizado
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Center Button */}
              <button
                type="button"
                onClick={handleToggleCenter}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors ${
                  isHorizontallyCentered
                    ? "bg-amber-100 border-amber-300 text-amber-800 font-semibold shadow-2xs"
                    : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
                title="Centrar horizontalmente (auto a izquierda y derecha)"
              >
                <AlignCenter className="h-3 w-3" />
                <span>Centrar</span>
              </button>

              {/* Link/Unlink Toggle */}
              <button
                type="button"
                onClick={() => setIsMarginLinked(!isMarginLinked)}
                className={`p-1 rounded-md border text-xs transition-colors ${
                  isMarginLinked
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-800"
                }`}
                title={
                  isMarginLinked
                    ? "Lados vinculados (click para editar lados por separado)"
                    : "Lados independientes (click para unificar todos los lados)"
                }
              >
                {isMarginLinked ? (
                  <Link2 className="h-3 w-3" />
                ) : (
                  <Unlink className="h-3 w-3" />
                )}
              </button>

              {/* Reset */}
              {hasCustomMargin && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateMargin({
                      marginTop: "",
                      marginRight: "",
                      marginBottom: "",
                      marginLeft: "",
                    })
                  }
                  className="p-1 rounded-md text-zinc-400 hover:text-red-600"
                  title="Restablecer margen"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* If Linked: Single Unified Input; If Unlinked: 4-col Grid */}
          {isMarginLinked ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-zinc-500 shrink-0">
                Unificado:
              </span>
              <DirectionalInput
                value={marginTop || marginBottom || marginLeft || marginRight || ""}
                placeholder={computedStyles?.marginTop || "0px"}
                title="Margen para todos los lados"
                variant="margin"
                onChange={(val) => {
                  const norm = normalizeDimensionValue(val);
                  onUpdateMargin({
                    marginTop: norm,
                    marginRight: norm,
                    marginBottom: norm,
                    marginLeft: norm,
                  });
                }}
                className="flex-1 h-6 text-xs font-mono font-medium rounded-md bg-zinc-50/80 border border-zinc-200 px-2 text-zinc-800 focus:bg-white focus:border-amber-500 focus:outline-none text-center"
              />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                  Top
                </span>
                <DirectionalInput
                  value={marginTop}
                  placeholder={computedStyles?.marginTop || "0px"}
                  title="Margen Superior (Top)"
                  variant="margin"
                  onChange={(val) =>
                    onUpdateMargin({ marginTop: normalizeDimensionValue(val) })
                  }
                  className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-amber-500 focus:outline-none text-zinc-800"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                  Der
                </span>
                <DirectionalInput
                  value={marginRight}
                  placeholder={computedStyles?.marginRight || "0px"}
                  title="Margen Derecho (Right)"
                  variant="margin"
                  onChange={(val) =>
                    onUpdateMargin({ marginRight: normalizeDimensionValue(val) })
                  }
                  className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-amber-500 focus:outline-none text-zinc-800"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                  Abajo
                </span>
                <DirectionalInput
                  value={marginBottom}
                  placeholder={computedStyles?.marginBottom || "0px"}
                  title="Margen Inferior (Bottom)"
                  variant="margin"
                  onChange={(val) =>
                    onUpdateMargin({ marginBottom: normalizeDimensionValue(val) })
                  }
                  className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-amber-500 focus:outline-none text-zinc-800"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                  Izq
                </span>
                <DirectionalInput
                  value={marginLeft}
                  placeholder={computedStyles?.marginLeft || "0px"}
                  title="Margen Izquierdo (Left)"
                  variant="margin"
                  onChange={(val) =>
                    onUpdateMargin({ marginLeft: normalizeDimensionValue(val) })
                  }
                  className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-amber-500 focus:outline-none text-zinc-800"
                />
              </div>
            </div>
          )}

          {/* Quick Presets for Margin (No scrollbars, clean wrap) */}
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[9px] text-zinc-400 font-medium mr-0.5">
              Presets:
            </span>
            {marginPresets.map((m) => {
              const isSelected =
                marginTop === m &&
                marginBottom === m &&
                marginLeft === m &&
                marginRight === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    onUpdateMargin({
                      marginTop: m,
                      marginRight: m,
                      marginBottom: m,
                      marginLeft: m,
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    isSelected
                      ? "bg-amber-600 text-white font-semibold shadow-2xs"
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      </div>
  );
}

interface StudioInspectorSectionProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function StudioInspectorSection({
  title,
  description,
  icon,
  defaultOpen = false,
  badge,
  action,
  children,
  className = "",
}: StudioInspectorSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <section
      className={`border-b border-zinc-200 last:border-b-0 ${className}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-50/80 transition-colors group">
        <button
          id={`${id}-title`}
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={`${id}-content`}
          className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none cursor-pointer select-none py-0.5"
        >
          <span
            className="shrink-0 text-zinc-400 group-hover:text-zinc-600 transition-colors"
            aria-hidden="true"
          >
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-800">
                {title}
              </span>
              {badge}
            </span>
            {description && (
              <span className="block text-[10px] text-zinc-400 font-normal leading-tight mt-0.5">
                {description}
              </span>
            )}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200 mr-1 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {action && <div className="shrink-0 ml-1">{action}</div>}
      </div>

      <div
        id={`${id}-content`}
        hidden={!open}
        className="px-3.5 pb-3.5 pt-1 space-y-3"
      >
        {children}
      </div>
    </section>
  );
}

function parseColorWithAlpha(color?: string, fallback = "#ffffff"): {
  baseHex: string;
  alpha: number;
  isTransparent: boolean;
} {
  const val = (color ?? "").trim().toLowerCase();
  if (!val) {
    return { baseHex: fallback, alpha: 1, isTransparent: false };
  }
  if (val === "transparent") {
    return { baseHex: fallback, alpha: 0, isTransparent: true };
  }

  const hex8Match = /^#([0-9a-f]{6})([0-9a-f]{2})$/i.exec(val);
  if (hex8Match) {
    const base = `#${hex8Match[1]}`;
    const a = parseInt(hex8Match[2], 16) / 255;
    return {
      baseHex: base,
      alpha: Math.round(a * 100) / 100,
      isTransparent: a === 0,
    };
  }

  const hex6Match = /^#([0-9a-f]{6})$/i.exec(val);
  if (hex6Match) {
    return { baseHex: val, alpha: 1, isTransparent: false };
  }

  const hex3Match = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(val);
  if (hex3Match) {
    const full = `#${hex3Match[1]}${hex3Match[1]}${hex3Match[2]}${hex3Match[2]}${hex3Match[3]}${hex3Match[3]}`;
    return { baseHex: full, alpha: 1, isTransparent: false };
  }

  const rgbaMatch =
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i.exec(val);
  if (rgbaMatch) {
    const r = Math.min(255, parseInt(rgbaMatch[1], 10))
      .toString(16)
      .padStart(2, "0");
    const g = Math.min(255, parseInt(rgbaMatch[2], 10))
      .toString(16)
      .padStart(2, "0");
    const b = Math.min(255, parseInt(rgbaMatch[3], 10))
      .toString(16)
      .padStart(2, "0");
    const a = Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])));
    return { baseHex: `#${r}${g}${b}`, alpha: a, isTransparent: a === 0 };
  }

  const rgbMatch = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(val);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10))
      .toString(16)
      .padStart(2, "0");
    const g = Math.min(255, parseInt(rgbMatch[2], 10))
      .toString(16)
      .padStart(2, "0");
    const b = Math.min(255, parseInt(rgbMatch[3], 10))
      .toString(16)
      .padStart(2, "0");
    return { baseHex: `#${r}${g}${b}`, alpha: 1, isTransparent: false };
  }

  return { baseHex: fallback, alpha: 1, isTransparent: false };
}

function formatColorWithAlpha(baseHex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  const normalizedBase = baseHex.startsWith("#")
    ? baseHex.slice(0, 7)
    : `#${baseHex}`.slice(0, 7);
  const base = normalizedBase.length === 7 ? normalizedBase : "#ffffff";
  if (clamped <= 0.005) return "transparent";
  if (clamped >= 0.995) return base;
  const alphaHex = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
  return `${base}${alphaHex}`;
}

function parseElementOpacity(opacity?: string): number {
  if (!opacity || !opacity.trim()) return 100;
  const cleaned = opacity.trim().replace("%", "");
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return 100;
  if (num <= 1 && (opacity.includes(".") || num > 0)) {
    return Math.round(num * 100);
  }
  return Math.max(0, Math.min(100, Math.round(num)));
}

function formatElementOpacity(percent: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  if (clamped >= 100) return "";
  return (clamped / 100).toString();
}

interface StudioAlphaColorFieldProps {
  label: string;
  value?: string;
  defaultColor?: string;
  onChange: (value: string) => void;
  className?: string;
}

function StudioAlphaColorField({
  label,
  value = "",
  defaultColor = "#ffffff",
  onChange,
  className = "",
}: StudioAlphaColorFieldProps) {
  const { baseHex, alpha, isTransparent } = useMemo(
    () => parseColorWithAlpha(value, defaultColor),
    [value, defaultColor],
  );

  const percent = Math.round(alpha * 100);

  const handleColorChange = (newHex: string) => {
    const effectiveAlpha = isTransparent ? 1 : alpha;
    onChange(formatColorWithAlpha(newHex, effectiveAlpha));
  };

  const handleAlphaChange = (newPercent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newPercent)));
    onChange(formatColorWithAlpha(baseHex, clamped / 100));
  };

  const handleReset = () => {
    onChange("");
  };

  const handleSetTransparent = () => {
    onChange("transparent");
  };

  const hasCustomValue = Boolean(value && value.trim());

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-zinc-600">{label}</span>
        <div className="flex items-center gap-1.5">
          <label
            className="relative flex items-center justify-center h-6 w-6 rounded-md border border-zinc-300 shadow-2xs cursor-pointer overflow-hidden transition-transform hover:scale-105 shrink-0"
            style={{
              backgroundImage:
                "conic-gradient(#e4e4e7 25%, #ffffff 25% 50%, #e4e4e7 50% 75%, #ffffff 75% 100%)",
              backgroundSize: "8px 8px",
            }}
            title="Elegir color base"
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: isTransparent
                  ? "transparent"
                  : value || defaultColor,
              }}
            />
            <input
              type="color"
              value={baseHex}
              onChange={(e) => handleColorChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          <input
            type="text"
            placeholder={defaultColor}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-24 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono font-medium text-zinc-800 uppercase focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
          />

          {hasCustomValue && (
            <button
              type="button"
              onClick={handleReset}
              className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
              title="Restablecer color por defecto"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-zinc-50/70 border border-zinc-200/80 p-2 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>Opacidad del fondo</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              value={isTransparent ? 0 : percent}
              onChange={(e) => handleAlphaChange(Number(e.target.value))}
              className="w-12 rounded bg-white border border-zinc-200 px-1.5 py-0.5 text-right font-mono text-xs font-semibold text-zinc-800 focus:outline-none focus:border-blue-500"
            />
            <span className="font-mono text-[10px] text-zinc-400">%</span>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={isTransparent ? 0 : percent}
          onChange={(e) => handleAlphaChange(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
        />

        <div className="flex items-center gap-1 pt-0.5">
          {[
            { label: "100%", val: 100 },
            { label: "80%", val: 80 },
            { label: "50%", val: 50 },
            { label: "20%", val: 20 },
            { label: "Transp.", val: 0 },
          ].map((preset) => {
            const isSelected =
              preset.val === 0
                ? isTransparent || (hasCustomValue && percent === 0)
                : !isTransparent && percent === preset.val;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  if (preset.val === 0) {
                    handleSetTransparent();
                  } else {
                    handleAlphaChange(preset.val);
                  }
                }}
                className={`flex-1 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  isSelected
                    ? "bg-blue-600 text-white font-semibold shadow-2xs"
                    : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface StudioElementOpacityFieldProps {
  label?: string;
  description?: string;
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

function StudioElementOpacityField({
  label = "Opacidad del Elemento",
  description = "Transparencia de toda la capa y su contenido",
  value = "",
  onChange,
  className = "",
}: StudioElementOpacityFieldProps) {
  const percent = useMemo(() => parseElementOpacity(value), [value]);

  const handlePercentChange = (newPercent: number) => {
    onChange(formatElementOpacity(newPercent));
  };

  const hasCustomValue = Boolean(value && value.trim() && percent < 100);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs text-zinc-600">
        <div>
          <span className="font-medium text-zinc-700">{label}</span>
          {description && (
            <span className="block text-[10px] text-zinc-400 font-normal leading-tight">
              {description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={percent}
            onChange={(e) => handlePercentChange(Number(e.target.value))}
            className="w-13 rounded-md bg-zinc-50 border border-zinc-200 px-1.5 py-1 text-right font-mono text-xs font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:border-blue-500"
          />
          <span className="font-mono text-xs text-zinc-400">%</span>
          {hasCustomValue && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
              title="Restablecer opacidad al 100%"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={percent}
        onChange={(e) => handlePercentChange(Number(e.target.value))}
        className="w-full accent-blue-600 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
      />

      <div className="flex items-center gap-1 pt-0.5">
        {[
          { label: "100%", val: 100 },
          { label: "75%", val: 75 },
          { label: "50%", val: 50 },
          { label: "25%", val: 25 },
        ].map((preset) => {
          const isSelected = percent === preset.val;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePercentChange(preset.val)}
              className={`flex-1 py-0.5 rounded text-[10px] font-medium transition-colors ${
                isSelected
                  ? "bg-blue-600 text-white font-semibold shadow-2xs"
                  : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function parsePxNumber(val?: string, fallback = 0): number {
  if (!val) return fallback;
  const num = parseFloat(val.replace("px", "").trim());
  return Number.isNaN(num) ? fallback : num;
}

interface StudioBordersAndCornersEditorProps {
  borderWidth?: string;
  borderTopWidth?: string;
  borderRightWidth?: string;
  borderBottomWidth?: string;
  borderLeftWidth?: string;
  borderColor?: string;
  borderStyle?: string;
  defaultBorderColor?: string;

  borderRadius?: string;
  borderTopLeftRadius?: string;
  borderTopRightRadius?: string;
  borderBottomRightRadius?: string;
  borderBottomLeftRadius?: string;

  boxShadow?: string;
  showShadow?: boolean;

  onUpdateBorders: (patch: {
    borderWidth?: string;
    borderTopWidth?: string;
    borderRightWidth?: string;
    borderBottomWidth?: string;
    borderLeftWidth?: string;
    borderColor?: string;
    borderStyle?: string;
  }) => void;

  onUpdateRadius: (patch: {
    borderRadius?: string;
    borderTopLeftRadius?: string;
    borderTopRightRadius?: string;
    borderBottomRightRadius?: string;
    borderBottomLeftRadius?: string;
  }) => void;

  onUpdateShadow?: (shadow: string) => void;
}

function StudioBordersAndCornersEditor({
  borderWidth = "",
  borderTopWidth = "",
  borderRightWidth = "",
  borderBottomWidth = "",
  borderLeftWidth = "",
  borderColor = "",
  borderStyle = "solid",
  defaultBorderColor = "#e2e8f0",
  borderRadius = "",
  borderTopLeftRadius = "",
  borderTopRightRadius = "",
  borderBottomRightRadius = "",
  borderBottomLeftRadius = "",
  boxShadow = "",
  showShadow = false,
  onUpdateBorders,
  onUpdateRadius,
  onUpdateShadow,
}: StudioBordersAndCornersEditorProps) {
  const hasIndividualBorders = Boolean(
    borderTopWidth || borderRightWidth || borderBottomWidth || borderLeftWidth,
  );
  const [isBordersLinked, setIsBordersLinked] = useState<boolean>(() => {
    if (!hasIndividualBorders) return true;
    return (
      borderTopWidth === borderRightWidth &&
      borderRightWidth === borderBottomWidth &&
      borderBottomWidth === borderLeftWidth
    );
  });

  const hasIndividualRadius = Boolean(
    borderTopLeftRadius ||
      borderTopRightRadius ||
      borderBottomRightRadius ||
      borderBottomLeftRadius,
  );
  const [isRadiusLinked, setIsRadiusLinked] = useState<boolean>(() => {
    if (!hasIndividualRadius) return true;
    return (
      borderTopLeftRadius === borderTopRightRadius &&
      borderTopRightRadius === borderBottomRightRadius &&
      borderBottomRightRadius === borderBottomLeftRadius
    );
  });

  // Active border presence
  const hasAnyBorder = Boolean(
    (borderWidth && borderWidth !== "0px" && borderWidth !== "0") ||
      (borderTopWidth && borderTopWidth !== "0px" && borderTopWidth !== "0") ||
      (borderRightWidth &&
        borderRightWidth !== "0px" &&
        borderRightWidth !== "0") ||
      (borderBottomWidth &&
        borderBottomWidth !== "0px" &&
        borderBottomWidth !== "0") ||
      (borderLeftWidth && borderLeftWidth !== "0px" && borderLeftWidth !== "0"),
  );

  const unifiedBorderWidth =
    borderWidth ||
    borderTopWidth ||
    borderRightWidth ||
    borderBottomWidth ||
    borderLeftWidth ||
    "";

  const unifiedRadius =
    borderRadius ||
    borderTopLeftRadius ||
    borderTopRightRadius ||
    borderBottomRightRadius ||
    borderBottomLeftRadius ||
    "";

  const radiusNumber = useMemo(
    () => parsePxNumber(unifiedRadius, 0),
    [unifiedRadius],
  );

  const handleSetUnifiedBorder = (width: string) => {
    onUpdateBorders({
      borderWidth: width,
      borderTopWidth: "",
      borderRightWidth: "",
      borderBottomWidth: "",
      borderLeftWidth: "",
    });
  };

  const handleSetUnifiedRadius = (radius: string) => {
    onUpdateRadius({
      borderRadius: radius,
      borderTopLeftRadius: "",
      borderTopRightRadius: "",
      borderBottomRightRadius: "",
      borderBottomLeftRadius: "",
    });
  };

  return (
    <div className="space-y-3.5">
      {/* 1. SECCIÓN: BORDES */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-semibold text-zinc-800">
              Grosor y Lados del Borde
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isBordersLinked) {
                const current = unifiedBorderWidth || "1px";
                onUpdateBorders({
                  borderWidth: "",
                  borderTopWidth: current,
                  borderRightWidth: current,
                  borderBottomWidth: current,
                  borderLeftWidth: current,
                });
                setIsBordersLinked(false);
              } else {
                const current =
                  borderTopWidth ||
                  borderBottomWidth ||
                  borderLeftWidth ||
                  borderRightWidth ||
                  "1px";
                onUpdateBorders({
                  borderWidth: current,
                  borderTopWidth: "",
                  borderRightWidth: "",
                  borderBottomWidth: "",
                  borderLeftWidth: "",
                });
                setIsBordersLinked(true);
              }
            }}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${
              isBordersLinked
                ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
            }`}
            title={
              isBordersLinked
                ? "Cambiar a lados independientes (arriba, abajo, izq, der)"
                : "Vincular todos los lados"
            }
          >
            {isBordersLinked ? (
              <>
                <Link2 className="h-3 w-3 text-zinc-500" />
                <span>Todos los lados</span>
              </>
            ) : (
              <>
                <Unlink className="h-3 w-3 text-indigo-600" />
                <span>Lados separados</span>
              </>
            )}
          </button>
        </div>

        {/* BORDES VINCULADOS (TODOS LOS LADOS) */}
        {isBordersLinked ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={unifiedBorderWidth || "0px"}
                onChange={(e) => handleSetUnifiedBorder(e.target.value)}
                className="flex-1 rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="0px">Sin borde (0px)</option>
                <option value="1px">1px (Estándar)</option>
                <option value="2px">2px (Medio)</option>
                <option value="3px">3px (Grueso)</option>
                <option value="4px">4px (Fuerte)</option>
              </select>

              <div className="w-20">
                <DirectionalInput
                  value={unifiedBorderWidth}
                  placeholder="0px"
                  title="Grosor personalizado de todos los lados"
                  onChange={handleSetUnifiedBorder}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              {[
                { label: "0px", val: "0px" },
                { label: "1px", val: "1px" },
                { label: "2px", val: "2px" },
                { label: "3px", val: "3px" },
                { label: "4px", val: "4px" },
              ].map((chip) => {
                const isSelected = (unifiedBorderWidth || "0px") === chip.val;
                return (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => handleSetUnifiedBorder(chip.val)}
                    className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                      isSelected
                        ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                        : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200/80"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* BORDES DESVINCULADOS (INDIVIDUALES: TOP, RIGHT, BOTTOM, LEFT) */
          <div className="space-y-2.5">
            {/* Presets rápidos para combinaciones comunes */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                {
                  label: "Solo Abajo",
                  patch: {
                    borderTopWidth: "0px",
                    borderRightWidth: "0px",
                    borderBottomWidth: "2px",
                    borderLeftWidth: "0px",
                    borderWidth: "",
                  },
                },
                {
                  label: "Solo Arriba",
                  patch: {
                    borderTopWidth: "2px",
                    borderRightWidth: "0px",
                    borderBottomWidth: "0px",
                    borderLeftWidth: "0px",
                    borderWidth: "",
                  },
                },
                {
                  label: "Arriba/Abajo",
                  patch: {
                    borderTopWidth: "1px",
                    borderRightWidth: "0px",
                    borderBottomWidth: "1px",
                    borderLeftWidth: "0px",
                    borderWidth: "",
                  },
                },
                {
                  label: "Solo Izq",
                  patch: {
                    borderTopWidth: "0px",
                    borderRightWidth: "0px",
                    borderBottomWidth: "0px",
                    borderLeftWidth: "3px",
                    borderWidth: "",
                  },
                },
                {
                  label: "Todos 1px",
                  patch: {
                    borderTopWidth: "1px",
                    borderRightWidth: "1px",
                    borderBottomWidth: "1px",
                    borderLeftWidth: "1px",
                    borderWidth: "",
                  },
                },
                {
                  label: "Ninguno",
                  patch: {
                    borderTopWidth: "0px",
                    borderRightWidth: "0px",
                    borderBottomWidth: "0px",
                    borderLeftWidth: "0px",
                    borderWidth: "",
                  },
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onUpdateBorders(preset.patch)}
                  className="rounded bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 border border-zinc-200/80 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Cuadrícula de 4 lados */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-50/70 p-2 rounded-lg border border-zinc-200/80">
              {/* Arriba / Top */}
              <div className="flex items-center justify-between gap-1.5 bg-white px-2 py-1.5 rounded-md border border-zinc-200/90 shadow-2xs">
                <span className="text-[11px] font-medium text-zinc-700">
                  ↑ Arriba
                </span>
                <DirectionalInput
                  value={borderTopWidth}
                  placeholder="0px"
                  title="Borde superior"
                  onChange={(val) =>
                    onUpdateBorders({ borderTopWidth: val, borderWidth: "" })
                  }
                />
              </div>

              {/* Abajo / Bottom */}
              <div className="flex items-center justify-between gap-1.5 bg-white px-2 py-1.5 rounded-md border border-zinc-200/90 shadow-2xs">
                <span className="text-[11px] font-medium text-zinc-700">
                  ↓ Abajo
                </span>
                <DirectionalInput
                  value={borderBottomWidth}
                  placeholder="0px"
                  title="Borde inferior"
                  onChange={(val) =>
                    onUpdateBorders({ borderBottomWidth: val, borderWidth: "" })
                  }
                />
              </div>

              {/* Izquierda / Left */}
              <div className="flex items-center justify-between gap-1.5 bg-white px-2 py-1.5 rounded-md border border-zinc-200/90 shadow-2xs">
                <span className="text-[11px] font-medium text-zinc-700">
                  ← Izq
                </span>
                <DirectionalInput
                  value={borderLeftWidth}
                  placeholder="0px"
                  title="Borde izquierdo"
                  onChange={(val) =>
                    onUpdateBorders({ borderLeftWidth: val, borderWidth: "" })
                  }
                />
              </div>

              {/* Derecha / Right */}
              <div className="flex items-center justify-between gap-1.5 bg-white px-2 py-1.5 rounded-md border border-zinc-200/90 shadow-2xs">
                <span className="text-[11px] font-medium text-zinc-700">
                  → Der
                </span>
                <DirectionalInput
                  value={borderRightWidth}
                  placeholder="0px"
                  title="Borde derecho"
                  onChange={(val) =>
                    onUpdateBorders({ borderRightWidth: val, borderWidth: "" })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Color de Borde y Estilo (si hay grosor o color personalizado) */}
        {(hasAnyBorder || borderColor) && (
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <StudioAlphaColorField
              label="Color de Borde"
              value={borderColor}
              defaultColor={defaultBorderColor}
              onChange={(val) => onUpdateBorders({ borderColor: val })}
            />

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100/80">
              <span className="text-xs text-zinc-600">Estilo de Borde</span>
              <div className="flex items-center gap-1">
                {[
                  { label: "Sólido", val: "solid" },
                  { label: "Discontinuo", val: "dashed" },
                  { label: "Punteado", val: "dotted" },
                ].map((st) => (
                  <button
                    key={st.val}
                    type="button"
                    onClick={() => onUpdateBorders({ borderStyle: st.val })}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      (borderStyle || "solid") === st.val
                        ? "bg-zinc-800 text-white font-semibold"
                        : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. SECCIÓN: ESQUINAS REDONDEADAS (RADIUS) */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-zinc-800">
              Esquinas (Border Radius)
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isRadiusLinked) {
                const current = unifiedRadius || "8px";
                onUpdateRadius({
                  borderRadius: "",
                  borderTopLeftRadius: current,
                  borderTopRightRadius: current,
                  borderBottomRightRadius: current,
                  borderBottomLeftRadius: current,
                });
                setIsRadiusLinked(false);
              } else {
                const current =
                  borderTopLeftRadius ||
                  borderTopRightRadius ||
                  borderBottomRightRadius ||
                  borderBottomLeftRadius ||
                  "8px";
                onUpdateRadius({
                  borderRadius: current,
                  borderTopLeftRadius: "",
                  borderTopRightRadius: "",
                  borderBottomRightRadius: "",
                  borderBottomLeftRadius: "",
                });
                setIsRadiusLinked(true);
              }
            }}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${
              isRadiusLinked
                ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
            title={
              isRadiusLinked
                ? "Cambiar a esquinas independientes (arriba-izq, arriba-der, etc.)"
                : "Vincular todas las esquinas"
            }
          >
            {isRadiusLinked ? (
              <>
                <Link2 className="h-3 w-3 text-zinc-500" />
                <span>Todas iguales</span>
              </>
            ) : (
              <>
                <Unlink className="h-3 w-3 text-emerald-600" />
                <span>Esquinas separadas</span>
              </>
            )}
          </button>
        </div>

        {/* ESQUINAS VINCULADAS (TODAS IGUALES) */}
        {isRadiusLinked ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="48"
                step="1"
                value={Math.min(48, radiusNumber)}
                onChange={(e) => handleSetUnifiedRadius(`${e.target.value}px`)}
                className="flex-1 accent-emerald-600 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
              />
              <div className="w-20">
                <DirectionalInput
                  value={unifiedRadius}
                  placeholder="0px"
                  title="Radio de todas las esquinas"
                  onChange={handleSetUnifiedRadius}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              {[
                { label: "0px", val: "0px" },
                { label: "8px", val: "8px" },
                { label: "14px", val: "14px" },
                { label: "24px", val: "24px" },
                { label: "Píldora", val: "9999px" },
              ].map((chip) => {
                const isSelected = (unifiedRadius || "0px") === chip.val;
                return (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => handleSetUnifiedRadius(chip.val)}
                    className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                      isSelected
                        ? "bg-emerald-600 text-white font-semibold shadow-2xs"
                        : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200/80"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ESQUINAS DESVINCULADAS (4 ESQUINAS INDIVIDUALES EN GRID 2X2) */
          <div className="space-y-2.5">
            {/* Presets rápidos para esquinas comunes */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                {
                  label: "Solo Arriba",
                  patch: {
                    borderTopLeftRadius: "16px",
                    borderTopRightRadius: "16px",
                    borderBottomRightRadius: "0px",
                    borderBottomLeftRadius: "0px",
                    borderRadius: "",
                  },
                },
                {
                  label: "Solo Abajo",
                  patch: {
                    borderTopLeftRadius: "0px",
                    borderTopRightRadius: "0px",
                    borderBottomRightRadius: "16px",
                    borderBottomLeftRadius: "16px",
                    borderRadius: "",
                  },
                },
                {
                  label: "Solo Izq",
                  patch: {
                    borderTopLeftRadius: "16px",
                    borderTopRightRadius: "0px",
                    borderBottomRightRadius: "0px",
                    borderBottomLeftRadius: "16px",
                    borderRadius: "",
                  },
                },
                {
                  label: "Cruzadas",
                  patch: {
                    borderTopLeftRadius: "24px",
                    borderTopRightRadius: "0px",
                    borderBottomRightRadius: "24px",
                    borderBottomLeftRadius: "0px",
                    borderRadius: "",
                  },
                },
                {
                  label: "Todas 12px",
                  patch: {
                    borderTopLeftRadius: "12px",
                    borderTopRightRadius: "12px",
                    borderBottomRightRadius: "12px",
                    borderBottomLeftRadius: "12px",
                    borderRadius: "",
                  },
                },
                {
                  label: "Rectas (0px)",
                  patch: {
                    borderTopLeftRadius: "0px",
                    borderTopRightRadius: "0px",
                    borderBottomRightRadius: "0px",
                    borderBottomLeftRadius: "0px",
                    borderRadius: "",
                  },
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onUpdateRadius(preset.patch)}
                  className="rounded bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 border border-zinc-200/80 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Matriz 2x2 física de las 4 esquinas */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-50/70 p-2 rounded-lg border border-zinc-200/80">
              {/* Arriba-Izquierda (Top-Left) */}
              <div className="flex items-center justify-between gap-1.5 bg-white px-2 py-1.5 rounded-md border border-zinc-200/90 shadow-2xs">
                <div className="flex items-center gap-1 text-zinc-700">
                  <CornerUpLeft className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] font-medium">Sup. Izq</span>
                </div>
                <DirectionalInput
                  value={borderTopLeftRadius}
                  placeholder="0px"
                  title="Esquina superior izquierda"
                  onChange={(val) =>
                    onUpdateRadius({
                      borderTopLeftRadius: val,
                      borderRadius: "",
                    })
                  }
                />
              </div>

              {/* Arriba-Derecha (Top-Right) */}
              <div className="flex items-center justify-between gap-1.5 bg-white px-2 py-1.5 rounded-md border border-zinc-200/90 shadow-2xs">
                <div className="flex items-center gap-1 text-zinc-700">
                  <CornerUpRight className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] font-medium">Sup. Der</span>
                </div>
                <DirectionalInput
                  value={borderTopRightRadius}
                  placeholder="0px"
                  title="Esquina superior derecha"
                  onChange={(val) =>
                    onUpdateRadius({
                      borderTopRightRadius: val,
                      borderRadius: "",
                    })
                  }
                />
              </div>

              {/* Abajo-Izquierda (Bottom-Left) */}
              <div className="flex items-center justify-between gap-1.5 bg-white px-2 py-1.5 rounded-md border border-zinc-200/90 shadow-2xs">
                <div className="flex items-center gap-1 text-zinc-700">
                  <CornerDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] font-medium">Inf. Izq</span>
                </div>
                <DirectionalInput
                  value={borderBottomLeftRadius}
                  placeholder="0px"
                  title="Esquina inferior izquierda"
                  onChange={(val) =>
                    onUpdateRadius({
                      borderBottomLeftRadius: val,
                      borderRadius: "",
                    })
                  }
                />
              </div>

              {/* Abajo-Derecha (Bottom-Right) */}
              <div className="flex items-center justify-between gap-1.5 bg-white px-2 py-1.5 rounded-md border border-zinc-200/90 shadow-2xs">
                <div className="flex items-center gap-1 text-zinc-700">
                  <CornerDownRight className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] font-medium">Inf. Der</span>
                </div>
                <DirectionalInput
                  value={borderBottomRightRadius}
                  placeholder="0px"
                  title="Esquina inferior derecha"
                  onChange={(val) =>
                    onUpdateRadius({
                      borderBottomRightRadius: val,
                      borderRadius: "",
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. SECCIÓN: SOMBRA (OPCIONAL) */}
      {showShadow && onUpdateShadow && (
        <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800">
              Sombra (Box Shadow)
            </span>
            {boxShadow && boxShadow !== "none" && (
              <button
                type="button"
                onClick={() => onUpdateShadow("")}
                className="text-[10px] text-zinc-400 hover:text-zinc-700"
              >
                Quitar
              </button>
            )}
          </div>
          <select
            value={boxShadow || ""}
            onChange={(e) => onUpdateShadow(e.target.value)}
            className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800 focus:bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Por defecto</option>
            <option value="none">Sin sombra</option>
            <option value="0 2px 8px rgba(0,0,0,0.06)">
              Sombra suave (2px)
            </option>
            <option value="0 8px 20px -4px rgba(0,0,0,0.12)">
              Sombra media (Card)
            </option>
            <option value="0 16px 36px -8px rgba(0,0,0,0.20)">
              Sombra pronunciada (Elevada)
            </option>
            <option value="inset 0 2px 4px rgba(0,0,0,0.08)">
              Sombra interior (Hundido)
            </option>
          </select>
        </div>
      )}
    </div>
  );
}

interface StudioLayoutAndDisplayEditorProps {
  style: SubElementStyleOverride;
  computedStyles?: SelectedSubElementInfo["computedStyles"];
  onUpdateStyle: (patch: Partial<SubElementStyleOverride>) => void;
  showChildControls?: boolean;
}

function StudioLayoutAndDisplayEditor({
  style,
  computedStyles,
  onUpdateStyle,
  showChildControls = true,
}: StudioLayoutAndDisplayEditorProps) {
  const effectiveDisplay =
    style.display ||
    (computedStyles?.display === "flex" ||
    computedStyles?.display === "inline-flex" ||
    computedStyles?.display === "grid"
      ? computedStyles.display
      : "");

  const isFlex =
    effectiveDisplay === "flex" || effectiveDisplay === "inline-flex";
  const isGrid = effectiveDisplay === "grid";

  const activeFlexDir =
    style.flexDirection || computedStyles?.flexDirection || "row";
  const activeJustify =
    style.justifyContent || computedStyles?.justifyContent || "flex-start";
  const activeAlign =
    style.alignItems || computedStyles?.alignItems || "stretch";
  const activeWrap = style.flexWrap || computedStyles?.flexWrap || "nowrap";

  return (
    <div className="space-y-3">
      {/* 1. DISPLAY SELECTOR */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            <span className="text-xs font-semibold text-zinc-800">
              Modo de Display
            </span>
          </div>
          {style.display && (
            <button
              type="button"
              onClick={() => onUpdateStyle({ display: "" })}
              className="text-[10px] text-zinc-400 hover:text-zinc-700"
              title="Restablecer display por defecto"
            >
              Auto
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1">
          {[
            { val: "block", label: "Block", hint: "Bloque vertical" },
            { val: "flex", label: "Flex", hint: "Caja flexible (1D)" },
            { val: "grid", label: "Grid", hint: "Grilla 2D" },
            {
              val: "inline-flex",
              label: "Inline Flex",
              hint: "Flex ajustado al contenido",
            },
            {
              val: "inline-block",
              label: "Inline Block",
              hint: "En línea con dimensiones",
            },
            { val: "none", label: "Oculto", hint: "display: none" },
          ].map((opt) => {
            const isSelected = effectiveDisplay === opt.val;
            return (
              <button
                key={opt.val}
                type="button"
                title={opt.hint}
                onClick={() =>
                  onUpdateStyle({
                    display: style.display === opt.val ? "" : opt.val,
                  })
                }
                className={`py-1.5 px-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                  isSelected
                    ? "bg-violet-600 text-white border-violet-600 shadow-2xs"
                    : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200/80"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. FLEXBOX CONTROLS (Shown when Flex or Inline-Flex) */}
      {isFlex && (
        <div className="rounded-xl border border-violet-200/90 bg-violet-50/25 p-2.5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-800 flex items-center gap-1">
              <Rows className="h-3 w-3 text-violet-600" />
              Propiedades Flexbox
            </span>
            <span className="text-[10px] font-mono text-violet-600 bg-violet-100/80 px-1.5 py-0.5 rounded">
              {effectiveDisplay}
            </span>
          </div>

          {/* Dirección (flex-direction) */}
          <div>
            <span className="block text-[10px] font-medium text-zinc-600 mb-1">
              Dirección del Eje (flex-direction)
            </span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { val: "row", label: "→ Fila" },
                { val: "column", label: "↓ Col" },
                { val: "row-reverse", label: "← Inv" },
                { val: "column-reverse", label: "↑ Inv" },
              ].map((dir) => {
                const isSelected = activeFlexDir === dir.val;
                return (
                  <button
                    key={dir.val}
                    type="button"
                    onClick={() =>
                      onUpdateStyle({
                        display: effectiveDisplay || "flex",
                        flexDirection: dir.val,
                      })
                    }
                    className={`py-1 px-1 rounded text-[10px] font-medium border transition-colors ${
                      isSelected
                        ? "bg-violet-600 text-white border-violet-600 font-semibold"
                        : "bg-white hover:bg-violet-50 text-zinc-700 border-zinc-200"
                    }`}
                  >
                    {dir.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Justify Content (Eje Principal) */}
          <div>
            <span className="block text-[10px] font-medium text-zinc-600 mb-1">
              Distribución Principal (justify-content)
            </span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { val: "flex-start", label: "Inicio" },
                { val: "center", label: "Centro" },
                { val: "flex-end", label: "Fin" },
                { val: "space-between", label: "Separar" },
                { val: "space-around", label: "Alrededor" },
                { val: "space-evenly", label: "Uniforme" },
              ].map((jc) => {
                const isSelected = activeJustify === jc.val;
                return (
                  <button
                    key={jc.val}
                    type="button"
                    onClick={() =>
                      onUpdateStyle({
                        display: effectiveDisplay || "flex",
                        justifyContent: jc.val,
                      })
                    }
                    className={`py-1 px-1.5 rounded text-[10px] font-medium border transition-colors ${
                      isSelected
                        ? "bg-violet-600 text-white border-violet-600 font-semibold"
                        : "bg-white hover:bg-violet-50 text-zinc-700 border-zinc-200"
                    }`}
                  >
                    {jc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Align Items (Eje Cruzado) */}
          <div>
            <span className="block text-[10px] font-medium text-zinc-600 mb-1">
              Alineación Cruzada (align-items)
            </span>
            <div className="grid grid-cols-5 gap-1">
              {[
                { val: "stretch", label: "Estirar" },
                { val: "flex-start", label: "Inicio" },
                { val: "center", label: "Centro" },
                { val: "flex-end", label: "Fin" },
                { val: "baseline", label: "Base" },
              ].map((ai) => {
                const isSelected = activeAlign === ai.val;
                return (
                  <button
                    key={ai.val}
                    type="button"
                    onClick={() =>
                      onUpdateStyle({
                        display: effectiveDisplay || "flex",
                        alignItems: ai.val,
                      })
                    }
                    className={`py-1 px-1 rounded text-[10px] font-medium border transition-colors ${
                      isSelected
                        ? "bg-violet-600 text-white border-violet-600 font-semibold"
                        : "bg-white hover:bg-violet-50 text-zinc-700 border-zinc-200"
                    }`}
                  >
                    {ai.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flex Wrap */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-violet-200/60">
            <span className="text-[10px] font-medium text-zinc-600">
              Salto de línea (wrap)
            </span>
            <div className="flex items-center gap-1">
              {[
                { val: "nowrap", label: "No Wrap" },
                { val: "wrap", label: "Wrap (Multilínea)" },
              ].map((fw) => (
                <button
                  key={fw.val}
                  type="button"
                  onClick={() =>
                    onUpdateStyle({
                      display: effectiveDisplay || "flex",
                      flexWrap: fw.val,
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                    activeWrap === fw.val
                      ? "bg-violet-600 text-white border-violet-600 font-semibold"
                      : "bg-white hover:bg-violet-50 text-zinc-700 border-zinc-200"
                  }`}
                >
                  {fw.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. CSS GRID CONTROLS (Shown when Grid) */}
      {isGrid && (
        <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/25 p-2.5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1">
              <Grid className="h-3 w-3 text-indigo-600" />
              Propiedades CSS Grid
            </span>
            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-100/80 px-1.5 py-0.5 rounded">
              grid
            </span>
          </div>

          {/* Column Presets */}
          <div>
            <span className="block text-[10px] font-medium text-zinc-600 mb-1">
              Estructura de Columnas (grid-template-columns)
            </span>
            <div className="grid grid-cols-3 gap-1 mb-1.5">
              {[
                { label: "1 Columna", val: "1fr" },
                { label: "2 Columnas", val: "repeat(2, minmax(0, 1fr))" },
                { label: "3 Columnas", val: "repeat(3, minmax(0, 1fr))" },
                { label: "4 Columnas", val: "repeat(4, minmax(0, 1fr))" },
                {
                  label: "Auto-Fit Resp.",
                  val: "repeat(auto-fit, minmax(240px, 1fr))",
                },
                { label: "1/3 + 2/3", val: "1fr 2fr" },
              ].map((preset) => {
                const isSelected = style.gridTemplateColumns === preset.val;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      onUpdateStyle({
                        display: "grid",
                        gridTemplateColumns: preset.val,
                      })
                    }
                    className={`py-1 px-1.5 rounded text-[10px] font-medium border transition-colors ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                        : "bg-white hover:bg-indigo-50 text-zinc-700 border-zinc-200"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={style.gridTemplateColumns ?? ""}
              placeholder={
                computedStyles?.gridTemplateColumns ||
                "repeat(auto-fit, minmax(240px, 1fr))"
              }
              onChange={(e) =>
                onUpdateStyle({
                  display: "grid",
                  gridTemplateColumns: e.target.value,
                })
              }
              className="w-full rounded-lg bg-white border border-zinc-200 px-2.5 py-1 text-xs font-mono text-zinc-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Grid Alignment */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[10px] font-medium text-zinc-600 mb-1">
                Alinear Ítems (V)
              </span>
              <select
                value={style.alignItems || ""}
                onChange={(e) =>
                  onUpdateStyle({ alignItems: e.target.value })
                }
                className="w-full rounded-lg bg-white border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
              >
                <option value="">Estirar (stretch)</option>
                <option value="start">Arriba (start)</option>
                <option value="center">Centro (center)</option>
                <option value="end">Abajo (end)</option>
              </select>
            </div>
            <div>
              <span className="block text-[10px] font-medium text-zinc-600 mb-1">
                Justificar Ítems (H)
              </span>
              <select
                value={style.justifyItems || ""}
                onChange={(e) =>
                  onUpdateStyle({ justifyItems: e.target.value })
                }
                className="w-full rounded-lg bg-white border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
              >
                <option value="">Estirar (stretch)</option>
                <option value="start">Izquierda (start)</option>
                <option value="center">Centro (center)</option>
                <option value="end">Derecha (end)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4. GAP (ESPACIO ENTRE ELEMENTOS HIJOS) */}
      {(isFlex || isGrid || Boolean(style.gap || style.rowGap || style.columnGap)) && (
        <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800">
              Separación entre Hijos (Gap)
            </span>
            <div className="w-20">
              <DirectionalInput
                value={style.gap ?? ""}
                placeholder={computedStyles?.gap || "0px"}
                title="Espacio entre elementos hijos (gap)"
                onChange={(val) => onUpdateStyle({ gap: val })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {["0px", "8px", "12px", "16px", "24px", "32px", "48px"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onUpdateStyle({ gap: g, rowGap: "", columnGap: "" })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  style.gap === g
                    ? "bg-violet-600 text-white font-semibold"
                    : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] text-zinc-500">Gap Filas (Y)</span>
              <DirectionalInput
                value={style.rowGap ?? ""}
                placeholder={style.gap || "Auto"}
                title="Espacio vertical entre filas (row-gap)"
                onChange={(val) => onUpdateStyle({ rowGap: val })}
              />
            </div>
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] text-zinc-500">Gap Cols (X)</span>
              <DirectionalInput
                value={style.columnGap ?? ""}
                placeholder={style.gap || "Auto"}
                title="Espacio horizontal entre columnas (column-gap)"
                onChange={(val) => onUpdateStyle({ columnGap: val })}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. COMPORTAMIENTO COMO HIJO FLEX / GRID (Self Item Controls) */}
      {showChildControls && (
        <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-700">
              Comportamiento dentro del Padre
            </span>
            {Boolean(style.flexGrow || style.alignSelf || style.gridColumn) && (
              <button
                type="button"
                onClick={() =>
                  onUpdateStyle({
                    flexGrow: "",
                    flexShrink: "",
                    alignSelf: "",
                    gridColumn: "",
                  })
                }
                className="text-[10px] text-zinc-400 hover:text-red-600"
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <span className="block text-[10px] text-zinc-500 mb-0.5">
                Crecer (Flex)
              </span>
              <select
                value={style.flexGrow || ""}
                onChange={(e) => onUpdateStyle({ flexGrow: e.target.value })}
                className="w-full rounded-md bg-zinc-50 border border-zinc-200 px-1.5 py-1 text-[11px] text-zinc-800"
              >
                <option value="">Auto</option>
                <option value="0">0 (No crecer)</option>
                <option value="1">1 (Expandir)</option>
              </select>
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 mb-0.5">
                Align Self
              </span>
              <select
                value={style.alignSelf || ""}
                onChange={(e) => onUpdateStyle({ alignSelf: e.target.value })}
                className="w-full rounded-md bg-zinc-50 border border-zinc-200 px-1.5 py-1 text-[11px] text-zinc-800"
              >
                <option value="">Heredar</option>
                <option value="flex-start">Inicio</option>
                <option value="center">Centro</option>
                <option value="flex-end">Fin</option>
                <option value="stretch">Estirar</option>
              </select>
            </div>
            <div>
              <span className="block text-[10px] text-zinc-500 mb-0.5">
                Span Grilla
              </span>
              <select
                value={style.gridColumn || ""}
                onChange={(e) => onUpdateStyle({ gridColumn: e.target.value })}
                className="w-full rounded-md bg-zinc-50 border border-zinc-200 px-1.5 py-1 text-[11px] text-zinc-800"
              >
                <option value="">1 Col</option>
                <option value="span 2">2 Columnas</option>
                <option value="span 3">3 Columnas</option>
                <option value="1 / -1">Fila Completa</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StudioDimensionsAndPositionEditorProps {
  style: SubElementStyleOverride;
  computedStyles?: SelectedSubElementInfo["computedStyles"];
  onUpdateStyle: (patch: Partial<SubElementStyleOverride>) => void;
}

function StudioDimensionsAndPositionEditor({
  style,
  computedStyles,
  onUpdateStyle,
}: StudioDimensionsAndPositionEditorProps) {
  return (
    <div className="space-y-3">
      {/* 1. ANCHO (WIDTH, MIN-WIDTH, MAX-WIDTH) */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-zinc-800">
              Ancho (Width)
            </span>
          </div>
          <div className="w-22">
            <DirectionalInput
              value={style.width ?? ""}
              placeholder={computedStyles?.width || "auto"}
              title="Ancho del elemento (px, %, vw, fit-content)"
              onChange={(val) => onUpdateStyle({ width: val })}
              className="w-full h-6 text-center text-[11px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Presets de Ancho */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { label: "Auto", val: "auto" },
            { label: "100%", val: "100%" },
            { label: "Fit Text", val: "fit-content" },
            { label: "50%", val: "50%" },
            { label: "320px", val: "320px" },
            { label: "640px", val: "640px" },
          ].map((w) => (
            <button
              key={w.val}
              type="button"
              onClick={() =>
                onUpdateStyle({ width: style.width === w.val ? "" : w.val })
              }
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                style.width === w.val
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-zinc-100">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-500">Mín</span>
            <DirectionalInput
              value={style.minWidth ?? ""}
              placeholder="0px"
              title="Ancho mínimo (min-width)"
              onChange={(val) => onUpdateStyle({ minWidth: val })}
              className="w-16 h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-500">Máx</span>
            <DirectionalInput
              value={style.maxWidth ?? ""}
              placeholder="none"
              title="Ancho máximo (max-width)"
              onChange={(val) => onUpdateStyle({ maxWidth: val })}
              className="w-16 h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. ALTO (HEIGHT, MIN-HEIGHT, MAX-HEIGHT) */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            <span className="text-xs font-semibold text-zinc-800">
              Alto (Height)
            </span>
          </div>
          <div className="w-22">
            <DirectionalInput
              value={style.height ?? ""}
              placeholder={computedStyles?.height || "auto"}
              title="Alto del elemento (px, %, dvh, auto)"
              onChange={(val) => onUpdateStyle({ height: val })}
              className="w-full h-6 text-center text-[11px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 focus:bg-white focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Presets de Min-Height / Height */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[9px] text-zinc-400 mr-0.5">Alto mín:</span>
          {[
            { label: "Auto", val: "" },
            { label: "120px", val: "120px" },
            { label: "260px", val: "260px" },
            { label: "420px", val: "420px" },
            { label: "100dvh", val: "100dvh" },
          ].map((h) => (
            <button
              key={h.label}
              type="button"
              onClick={() => onUpdateStyle({ minHeight: h.val })}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                (style.minHeight || "") === h.val
                  ? "bg-teal-600 text-white font-semibold"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-zinc-100">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-500">Mín</span>
            <DirectionalInput
              value={style.minHeight ?? ""}
              placeholder="auto"
              title="Alto mínimo (min-height)"
              onChange={(val) => onUpdateStyle({ minHeight: val })}
              className="w-16 h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 focus:bg-white focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-500">Máx</span>
            <DirectionalInput
              value={style.maxHeight ?? ""}
              placeholder="none"
              title="Alto máximo (max-height)"
              onChange={(val) => onUpdateStyle({ maxHeight: val })}
              className="w-16 h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 focus:bg-white focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. PROPORCIÓN, RECORTE Y POSICIÓN */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="block text-[10px] font-medium text-zinc-600 mb-1">
              Proporción (Aspect Ratio)
            </span>
            <select
              value={style.aspectRatio || ""}
              onChange={(e) => onUpdateStyle({ aspectRatio: e.target.value })}
              className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
            >
              <option value="">Libre (auto)</option>
              <option value="1 / 1">1:1 (Cuadrado)</option>
              <option value="16 / 9">16:9 (Video / Hero)</option>
              <option value="4 / 3">4:3 (Clásico)</option>
              <option value="3 / 4">3:4 (Retrato)</option>
              <option value="21 / 9">21:9 (Panorámico)</option>
            </select>
          </div>
          <div>
            <span className="block text-[10px] font-medium text-zinc-600 mb-1">
              Desborde (Overflow)
            </span>
            <select
              value={style.overflow || ""}
              onChange={(e) => onUpdateStyle({ overflow: e.target.value })}
              className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
            >
              <option value="">Visible</option>
              <option value="hidden">Recortar (hidden)</option>
              <option value="clip">Clip exacto</option>
              <option value="auto">Scroll (auto)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-zinc-100">
          <div>
            <span className="block text-[10px] font-medium text-zinc-600 mb-1">
              Posición (Position)
            </span>
            <select
              value={style.position || ""}
              onChange={(e) => onUpdateStyle({ position: e.target.value })}
              className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
            >
              <option value="">Normal (static)</option>
              <option value="relative">Relativa (relative)</option>
              <option value="sticky">Fija al Scroll (sticky)</option>
              <option value="absolute">Absoluta (absolute)</option>
            </select>
          </div>
          <div>
            <span className="block text-[10px] font-medium text-zinc-600 mb-1">
              Capa Z (z-index)
            </span>
            <input
              type="text"
              value={style.zIndex ?? ""}
              placeholder="auto"
              onChange={(e) => onUpdateStyle({ zIndex: e.target.value })}
              className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono text-zinc-800 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonacoLandingEditor({ initialData }: MonacoLandingEditorProps) {
  const { tenant } = initialData;

  const initialDoc = useMemo<LandingDocumentV1>(() => {
    if (initialData.landingPage.document) {
      return initialData.landingPage.document;
    }
    return createDefaultLandingDocument(tenant.name, tenant.slug);
  }, [initialData.landingPage.document, tenant.name, tenant.slug]);

  const [documentState, setDocumentState] = useState<LandingDocumentV1>(initialDoc);
  const [history, setHistory] = useState<{
    past: LandingDocumentV1[];
    future: LandingDocumentV1[];
  }>({ past: [], future: [] });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    initialDoc.blocks[0]?.id ?? null,
  );
  const [selectedSubElement, setSelectedSubElement] =
    useState<SelectedSubElementInfo | null>(null);
  const [mediaPickerTarget, setMediaPickerTarget] =
    useState<MediaPickerTarget | null>(null);

  // Raw code state (for Global Code mode or synced from visual blocks)
  const [rawHtml, setRawHtml] = useState<string>(initialData.landingPage.htmlContent);
  const [rawCss, setRawCss] = useState<string>(initialData.landingPage.cssContent);
  const [rawJs, setRawJs] = useState<string>(initialData.landingPage.jsContent);
  const [jsonEditorText, setJsonEditorText] = useState<string>(() =>
    JSON.stringify(initialDoc, null, 2),
  );

  // Studio UI panels state
  const [leftTab, setLeftTab] = useState<LeftSidebarTab>("layers");
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [rightTab, setRightTab] = useState<RightSidebarTab>("properties");
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [interactiveCanvas, setInteractiveCanvas] = useState<boolean>(true);
  const [codeDrawerMode, setCodeDrawerMode] = useState<CodeDrawerMode>("closed");
  const [codeTab, setCodeTab] = useState<CodeTab>("html");
  const [componentSearch, setComponentSearch] = useState("");
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);
  const [draggedLayerItem, setDraggedLayerItem] = useState<DraggedLayerItem | null>(null);
  const [blockDropTarget, setBlockDropTarget] = useState<{
    blockId: string;
    position: "inside" | "before" | "after";
  } | null>(null);
  const autoExpandBlockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isDraggingComponentOverCanvas, setIsDraggingComponentOverCanvas] = useState(false);
  const [draggedComponentKind, setDraggedComponentKind] =
    useState<InsertableInnerElementKind | null>(null);
  const [draggedBuiltinKey, setDraggedBuiltinKey] = useState<string | null>(null);
  const [draggedCustomId, setDraggedCustomId] = useState<string | null>(null);
  const [selectedComponentCategory, setSelectedComponentCategory] = useState<
    "all" | "layout" | "text" | "action" | "media"
  >("all");

  // Nested Figma-style Layers state (collapsed by default)
  const [expandedBlockIds, setExpandedBlockIds] = useState<
    Record<string, boolean>
  >({});
  const [expandedSubLayerIds, setExpandedSubLayerIds] = useState<
    Record<string, boolean>
  >({});
  const [layerSearchQuery, setLayerSearchQuery] = useState("");
  const [isLeftTabMenuOpen, setIsLeftTabMenuOpen] = useState(false);
  const leftTabMenuRef = useRef<HTMLDivElement>(null);

  const toggleBlockExpanded = useCallback(
    (blockId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setExpandedBlockIds((prev) => ({
        ...prev,
        [blockId]: !prev[blockId],
      }));
    },
    [],
  );

  const toggleSubLayerExpanded = useCallback(
    (nodeId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setExpandedSubLayerIds((prev) => ({
        ...prev,
        [nodeId]: !prev[nodeId],
      }));
    },
    [],
  );

  const handleHoverSubElement = useCallback(
    (blockId: string | null, subSelector: string | null) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "LANDING_HOVER_SUBELEMENT",
          blockId,
          subSelector,
        },
        "*",
      );
    },
    [],
  );

  // Libraries state
  const [customModules, setCustomModules] = useState<LandingCustomModuleView[]>(
    initialData.customModules ?? [],
  );
  const [templates, setTemplates] = useState<LandingTemplateView[]>(
    initialData.templates ?? [],
  );

  // Modals state
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showSaveModuleModal, setShowSaveModuleModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  // Forms inside modals
  const [moduleName, setModuleName] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateSubmitPublic, setTemplateSubmitPublic] = useState(false);

  // Status & feedback
  const [isPublished, setIsPublished] = useState<boolean>(
    initialData.landingPage.published && initialData.hasPublishedStorage,
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    initialData.landingPage.updatedAt,
  );
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const inlineEditingRef = useRef<boolean>(false);
  const inlineEditSnapshotRef = useRef<LandingDocumentV1 | null>(null);
  const pendingScrollBlockIdRef = useRef<string | null>(null);
  const pendingSubSelectorRef = useRef<string | null | undefined>(undefined);
  const iframeScrollYRef = useRef<number>(0);
  const selectedBlockIdRef = useRef<string | null>(selectedBlockId);
  const selectedSubElementRef = useRef<SelectedSubElementInfo | null>(
    selectedSubElement,
  );
  const interactiveCanvasRef = useRef<boolean>(interactiveCanvas);
  const draggedComponentKindRef =
    useRef<InsertableInnerElementKind | null>(null);
  const draggedBuiltinKeyRef = useRef<string | null>(null);
  const draggedCustomIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedBlockIdRef.current = selectedBlockId;
  }, [selectedBlockId]);

  useEffect(() => {
    selectedSubElementRef.current = selectedSubElement;
  }, [selectedSubElement]);

  useEffect(() => {
    interactiveCanvasRef.current = interactiveCanvas;
  }, [interactiveCanvas]);

  useEffect(() => {
    draggedComponentKindRef.current = draggedComponentKind;
  }, [draggedComponentKind]);

  useEffect(() => {
    draggedBuiltinKeyRef.current = draggedBuiltinKey;
  }, [draggedBuiltinKey]);

  useEffect(() => {
    draggedCustomIdRef.current = draggedCustomId;
  }, [draggedCustomId]);

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setIsDraggingComponentOverCanvas(false);
      setDraggedComponentKind(null);
      setDraggedBuiltinKey(null);
      setDraggedCustomId(null);
      const win = getDragWindow();
      if (win) {
        win.__draggedComponentKind = null;
        win.__draggedBuiltinKey = null;
        win.__draggedCustomId = null;
      }
    };
    window.addEventListener("dragend", handleGlobalDragEnd);
    return () => window.removeEventListener("dragend", handleGlobalDragEnd);
  }, []);

  const updateDocument = useCallback(
    (
      updater:
        | LandingDocumentV1
        | ((prev: LandingDocumentV1) => LandingDocumentV1),
      recordHistory = true,
    ) => {
      setDocumentState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (recordHistory) {
          setHistory((h) => ({
            past: [...h.past.slice(-29), prev],
            future: [],
          }));
        }
        setJsonEditorText(JSON.stringify(next, null, 2));
        return next;
      });
      setIsDirty(true);
      setFeedback(null);
    },
    [],
  );

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1]!;
      const newPast = h.past.slice(0, -1);
      setDocumentState(() => {
        setJsonEditorText(JSON.stringify(previous, null, 2));
        return previous;
      });
      setIsDirty(true);
      return {
        past: newPast,
        future: [documentState, ...h.future.slice(0, 29)],
      };
    });
  }, [documentState]);

  const handleRedo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[0]!;
      const newFuture = h.future.slice(1);
      setDocumentState(() => {
        setJsonEditorText(JSON.stringify(next, null, 2));
        return next;
      });
      setIsDirty(true);
      return {
        past: [...h.past.slice(-29), documentState],
        future: newFuture,
      };
    });
  }, [documentState]);

  // Compile output from visual document with interactiveEditor always enabled for the studio canvas
  const compiledVisual = useMemo(
    () =>
      compileLandingFromDocument(
        documentState,
        {
          restaurantName: tenant.name,
          restaurantSlug: tenant.slug,
        },
        {
          interactiveEditor: true,
        },
      ),
    [documentState, tenant.name, tenant.slug],
  );

  // Compile clean output for saving/publishing
  const compiledClean = useMemo(
    () =>
      compileLandingFromDocument(documentState, {
        restaurantName: tenant.name,
        restaurantSlug: tenant.slug,
      }),
    [documentState, tenant.name, tenant.slug],
  );

  const activeCodePayload = useMemo(() => {
    if (documentState.mode === "visual") {
      return {
        htmlContent: compiledClean.htmlContent,
        cssContent: compiledClean.cssContent,
        jsContent: compiledClean.jsContent,
        fullHtml: compiledVisual.fullHtml,
      };
    }
    return {
      htmlContent: rawHtml,
      cssContent: rawCss,
      jsContent: rawJs,
      fullHtml: compileLandingDocument({
        htmlContent: rawHtml,
        cssContent: rawCss,
        jsContent: rawJs,
        title: tenant.name,
      }),
    };
  }, [
    documentState.mode,
    compiledClean,
    compiledVisual.fullHtml,
    rawHtml,
    rawCss,
    rawJs,
    tenant.name,
  ]);

  // Stable bootstrap srcDoc: in visual mode, we only reload srcDoc if mode or jsContent changes!
  // All visual block/style/theme changes are applied in-place via LANDING_LIVE_PATCH with zero reload.
  const [debouncedSrcDoc, setDebouncedSrcDoc] = useState<string>(
    activeCodePayload.fullHtml,
  );
  const prevModeRef = useRef<string>(documentState.mode);
  const prevJsContentRef = useRef<string>(compiledVisual.jsContent);

  useEffect(() => {
    if (documentState.mode === "visual") {
      const modeChanged = prevModeRef.current !== "visual";
      const jsChanged = prevJsContentRef.current !== compiledVisual.jsContent;
      prevModeRef.current = "visual";
      prevJsContentRef.current = compiledVisual.jsContent;
      if (modeChanged || jsChanged) {
        setDebouncedSrcDoc(compiledVisual.fullHtml);
      }
      return;
    }
    prevModeRef.current = "raw";
    const timer = setTimeout(() => {
      setDebouncedSrcDoc(activeCodePayload.fullHtml);
    }, 200);
    return () => clearTimeout(timer);
  }, [
    documentState.mode,
    compiledVisual.jsContent,
    compiledVisual.fullHtml,
    activeCodePayload.fullHtml,
  ]);

  // Live zero-reload DOM & CSS patching for visual mode
  useEffect(() => {
    if (documentState.mode !== "visual") return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const skipDomHtmlUpdate = inlineEditingRef.current;
    inlineEditingRef.current = false;
    const scrollIntoViewBlockId = pendingScrollBlockIdRef.current;
    pendingScrollBlockIdRef.current = null;
    const explicitSubSelector = pendingSubSelectorRef.current;
    pendingSubSelectorRef.current = undefined;

    const currentSub =
      explicitSubSelector !== undefined
        ? explicitSubSelector
        : selectedSubElementRef.current?.blockId === selectedBlockIdRef.current
          ? selectedSubElementRef.current?.selector ?? null
          : null;

    win.postMessage(
      {
        type: "LANDING_LIVE_PATCH",
        htmlContent: compiledVisual.htmlContent,
        cssContent: compiledVisual.previewCss,
        selectedBlockId: selectedBlockIdRef.current,
        subSelector: currentSub,
        notifySubElement: explicitSubSelector !== undefined && Boolean(explicitSubSelector),
        previewMode: !interactiveCanvas,
        skipDomHtmlUpdate,
        scrollIntoViewBlockId,
      },
      "*",
    );
  }, [
    documentState.mode,
    compiledVisual.htmlContent,
    compiledVisual.previewCss,
    interactiveCanvas,
  ]);

  // Sync selection highlight whenever selectedBlockId changes programmatically
  useEffect(() => {
    if (documentState.mode !== "visual") return;
    const currentSub =
      selectedSubElementRef.current?.blockId === selectedBlockId
        ? selectedSubElementRef.current?.selector ?? null
        : null;
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "LANDING_SET_SELECTED_BLOCK",
        blockId: selectedBlockId,
        subSelector: currentSub,
        scrollIntoView: false,
      },
      "*",
    );
  }, [documentState.mode, selectedBlockId]);

  const selectedBlock = useMemo(
    () => documentState.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [documentState.blocks, selectedBlockId],
  );

  const activeSubElement = useMemo(
    () =>
      selectedBlock &&
      selectedSubElement &&
      selectedSubElement.blockId === selectedBlock.id
        ? selectedSubElement
        : null,
    [selectedBlock, selectedSubElement],
  );

  const curStyle = useMemo<SubElementStyleOverride>(() => {
    if (!selectedBlock || !activeSubElement) return {};
    const map = parseSubElementStyles(selectedBlock.values.__subStyles);
    return map[activeSubElement.selector] ?? {};
  }, [selectedBlock, activeSubElement]);

  const hasSubStyleOverrides = useMemo(
    () => Object.keys(curStyle).length > 0,
    [curStyle],
  );

  const repeatableParent = useMemo(() => {
    if (!activeSubElement) return undefined;
    return [...(activeSubElement.ancestors ?? [])]
      .reverse()
      .find((a) => a.isRepeatable);
  }, [activeSubElement]);

  const effectiveSrc = useMemo(() => {
    if (!selectedBlock || !activeSubElement) return "";
    return activeSubElement.boundSrcField
      ? selectedBlock.values[activeSubElement.boundSrcField] ??
          activeSubElement.currentSrc
      : activeSubElement.currentSrc;
  }, [selectedBlock, activeSubElement]);

  const effectiveAlt = useMemo(() => {
    if (!selectedBlock || !activeSubElement) return "";
    return activeSubElement.boundAltField
      ? selectedBlock.values[activeSubElement.boundAltField] ??
          activeSubElement.currentAlt
      : activeSubElement.currentAlt;
  }, [selectedBlock, activeSubElement]);

  const effectiveHref = useMemo(() => {
    if (!selectedBlock || !activeSubElement) return "";
    return activeSubElement.boundHrefField
      ? selectedBlock.values[activeSubElement.boundHrefField] ??
          activeSubElement.currentHref
      : activeSubElement.currentHref;
  }, [selectedBlock, activeSubElement]);

  const blockSubLayerTrees = useMemo(() => {
    const map = new Map<string, LandingSubLayerNode[]>();
    for (const block of documentState.blocks) {
      map.set(block.id, buildBlockSubLayerTree(block));
    }
    return map;
  }, [documentState.blocks]);

  const handleExpandAllLayers = useCallback(() => {
    const nextBlocks: Record<string, boolean> = {};
    for (const b of documentState.blocks) {
      nextBlocks[b.id] = true;
    }
    const nextSubLayers: Record<string, boolean> = {};
    const collectSubIds = (nodes: LandingSubLayerNode[]) => {
      for (const n of nodes) {
        nextSubLayers[n.id] = true;
        if (n.children && n.children.length > 0) {
          collectSubIds(n.children);
        }
      }
    };
    blockSubLayerTrees.forEach((tree) => collectSubIds(tree));
    setExpandedBlockIds(nextBlocks);
    setExpandedSubLayerIds(nextSubLayers);
  }, [documentState.blocks, blockSubLayerTrees]);

  const handleCollapseAllLayers = useCallback(() => {
    setExpandedBlockIds({});
    setExpandedSubLayerIds({});
  }, []);

  const { matchingNodeIds, ancestorNodeIds, matchingBlockIds } = useMemo(() => {
    const q = layerSearchQuery.trim().toLowerCase();
    const matchNodes = new Set<string>();
    const ancNodes = new Set<string>();
    const matchBlocks = new Set<string>();

    if (!q) {
      return {
        matchingNodeIds: matchNodes,
        ancestorNodeIds: ancNodes,
        matchingBlockIds: matchBlocks,
      };
    }

    const checkNode = (
      node: LandingSubLayerNode,
      block: LandingBlock,
    ): boolean => {
      let selfMatch = false;
      if (node.label.toLowerCase().includes(q)) selfMatch = true;
      if (node.tag.toLowerCase().includes(q)) selfMatch = true;
      if (node.selector.toLowerCase().includes(q)) selfMatch = true;
      for (const key of node.childFieldKeys) {
        const val = block.values[key];
        if (typeof val === "string" && val.toLowerCase().includes(q)) {
          selfMatch = true;
          break;
        }
      }

      let childMatch = false;
      if (node.children) {
        for (const child of node.children) {
          if (checkNode(child, block)) {
            childMatch = true;
          }
        }
      }

      if (selfMatch) {
        matchNodes.add(node.id);
      }
      if (selfMatch || childMatch) {
        ancNodes.add(node.id);
        return true;
      }
      return false;
    };

    for (const block of documentState.blocks) {
      const blockNameMatch = block.name.toLowerCase().includes(q);
      const blockKeyMatch = block.moduleKey.toLowerCase().includes(q);
      const tree = blockSubLayerTrees.get(block.id) || [];
      let subLayerMatch = false;
      for (const rootNode of tree) {
        if (checkNode(rootNode, block)) {
          subLayerMatch = true;
        }
      }
      if (blockNameMatch || blockKeyMatch || subLayerMatch) {
        matchBlocks.add(block.id);
      }
    }

    return {
      matchingNodeIds: matchNodes,
      ancestorNodeIds: ancNodes,
      matchingBlockIds: matchBlocks,
    };
  }, [layerSearchQuery, documentState.blocks, blockSubLayerTrees]);

  useEffect(() => {
    if (!isLeftTabMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        leftTabMenuRef.current &&
        !leftTabMenuRef.current.contains(e.target as Node)
      ) {
        setIsLeftTabMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLeftTabMenuOpen]);

  const pageAnchors = useMemo(
    () => resolveDocumentBlockAnchors(documentState.blocks),
    [documentState.blocks],
  );

  const selectedBlockAnchor = useMemo(
    () => pageAnchors.find((a) => a.blockId === selectedBlock?.id) ?? null,
    [pageAnchors, selectedBlock],
  );

  const handlePreviewScrollToAnchor = useCallback((anchorHref: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "LANDING_SCROLL_TO_ANCHOR",
        anchor: anchorHref,
      },
      "*",
    );
  }, []);

  // Select block & notify iframe without full reload
  const selectBlockOnStudio = useCallback(
    (blockId: string | null, scrollIntoView = false) => {
      setSelectedBlockId(blockId);
      setSelectedSubElement(null);
      if (blockId) {
        setRightTab("properties");
        setExpandedBlockIds((prev) => ({ ...prev, [blockId]: true }));
      }
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "LANDING_SET_SELECTED_BLOCK",
            blockId,
            subSelector: null,
            scrollIntoView,
          },
          "*",
        );
      }
    },
    [],
  );

  const selectSubElementOnStudio = useCallback(
    (blockId: string, subSelector: string | null) => {
      setSelectedBlockId(blockId);
      setRightTab("properties");
      setExpandedBlockIds((prev) => ({ ...prev, [blockId]: true }));
      if (!subSelector) {
        setSelectedSubElement(null);
      }
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "LANDING_SET_SELECTED_BLOCK",
            blockId,
            subSelector,
            notifySubElement: Boolean(subSelector),
            scrollIntoView: false,
          },
          "*",
        );
      }
    },
    [],
  );

  // Helper to insert a new block in a logical position (after selected block, or before footer)
  const insertBlockSmartly = useCallback(
    (created: LandingBlock) => {
      pendingScrollBlockIdRef.current = created.id;
      updateDocument((prev) => {
        const nextBlocks = [...prev.blocks];
        const currentIdx = selectedBlockIdRef.current
          ? nextBlocks.findIndex((b) => b.id === selectedBlockIdRef.current)
          : -1;
        if (
          currentIdx !== -1 &&
          nextBlocks[currentIdx]?.moduleKey !== "footer"
        ) {
          nextBlocks.splice(currentIdx + 1, 0, created);
        } else if (
          created.moduleKey !== "footer" &&
          nextBlocks.length > 0 &&
          nextBlocks[nextBlocks.length - 1]?.moduleKey === "footer"
        ) {
          nextBlocks.splice(nextBlocks.length - 1, 0, created);
        } else {
          nextBlocks.push(created);
        }
        return {
          ...prev,
          mode: "visual",
          blocks: nextBlocks,
        };
      });
      setSelectedBlockId(created.id);
      setSelectedSubElement(null);
      setRightTab("properties");
    },
    [updateDocument],
  );

  // Block operations
  const handleAddBuiltinBlock = useCallback(
    (definition: BuiltinLandingModuleDefinition) => {
      const safeName = tenant.name.trim() || "Nuestro Restaurante";
      const menuUrl = `/m/${tenant.slug}`;
      const created = createBlockFromBuiltinModule(definition);
      for (const [k, v] of Object.entries(created.values)) {
        created.values[k] = v
          .replace(/\{\{\s*restaurantName\s*\}\}/g, safeName)
          .replace(/\{\{\s*menuUrl\s*\}\}/g, menuUrl);
      }
      insertBlockSmartly(created);
    },
    [insertBlockSmartly, tenant.name, tenant.slug],
  );

  const handleAddCustomBlock = useCallback(
    (customModule: LandingCustomModuleView) => {
      const created = createBlockFromCustomModule(customModule);
      insertBlockSmartly(created);
    },
    [insertBlockSmartly],
  );

  const handleCreateContainerSection = useCallback(
    (kind?: InsertableInnerElementKind) => {
      let created = createBlankContainerBlock(kind);
      if (
        kind &&
        kind !== "container" &&
        kind !== "columns-2" &&
        kind !== "columns-3" &&
        kind !== "flex-row"
      ) {
        created = insertInnerElementInBlock(created, null, kind);
      }
      insertBlockSmartly(created);
      setFeedback({
        type: "success",
        message:
          "Sección creada con tu componente.",
      });
    },
    [insertBlockSmartly],
  );

  const handleMoveBlock = useCallback(
    (blockId: string, direction: "up" | "down") => {
      pendingScrollBlockIdRef.current = blockId;
      updateDocument((prev) => {
        const index = prev.blocks.findIndex((b) => b.id === blockId);
        if (index === -1) return prev;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= prev.blocks.length) return prev;
        const nextBlocks = [...prev.blocks];
        const [moved] = nextBlocks.splice(index, 1);
        if (!moved) return prev;
        nextBlocks.splice(targetIndex, 0, moved);
        return { ...prev, blocks: nextBlocks };
      });
    },
    [updateDocument],
  );

  const handleReorderBlocks = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      updateDocument((prev) => {
        const nextBlocks = [...prev.blocks];
        const [moved] = nextBlocks.splice(fromIndex, 1);
        if (!moved) return prev;
        nextBlocks.splice(toIndex, 0, moved);
        return { ...prev, blocks: nextBlocks };
      });
    },
    [updateDocument],
  );

  const handleToggleBlockVisibility = useCallback(
    (blockId: string) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId ? { ...b, visible: !b.visible } : b,
        ),
      }));
    },
    [updateDocument],
  );

  const handleDuplicateBlock = useCallback(
    (block: LandingBlock) => {
      const copyId = `${block.id}-copy-${Math.random().toString(36).slice(2, 6)}`;
      const cloned: LandingBlock = {
        ...block,
        id: copyId,
        name: `${block.name} (Copia)`,
        fields: block.fields.map((f) => ({ ...f })),
        values: { ...block.values },
      };
      pendingScrollBlockIdRef.current = copyId;
      updateDocument((prev) => {
        const index = prev.blocks.findIndex((b) => b.id === block.id);
        const nextBlocks = [...prev.blocks];
        nextBlocks.splice(index + 1, 0, cloned);
        return { ...prev, blocks: nextBlocks };
      });
      setSelectedBlockId(copyId);
      setSelectedSubElement(null);
    },
    [updateDocument],
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      updateDocument((prev) => {
        const nextBlocks = prev.blocks.filter((b) => b.id !== blockId);
        if (selectedBlockId === blockId) {
          setSelectedBlockId(nextBlocks[0]?.id ?? null);
          setSelectedSubElement(null);
        }
        return { ...prev, blocks: nextBlocks };
      });
    },
    [selectedBlockId, updateDocument],
  );

  const handleUpdateBlockValue = useCallback(
    (blockId: string, key: string, value: string, fromInlineCanvas = false) => {
      if (fromInlineCanvas) {
        if (!inlineEditSnapshotRef.current) {
          inlineEditSnapshotRef.current = documentState;
        }
        inlineEditingRef.current = true;
      }
      updateDocument(
        (prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) =>
            b.id === blockId
              ? { ...b, values: { ...b.values, [key]: value } }
              : b,
          ),
        }),
        !fromInlineCanvas,
      );
    },
    [documentState, updateDocument],
  );

  const handleUpdateBlockValues = useCallback(
    (blockId: string, patch: Record<string, string>) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId
            ? { ...b, values: { ...b.values, ...patch } }
            : b,
        ),
      }));
    },
    [updateDocument],
  );

  const handleUpdateBlockName = useCallback(
    (blockId: string, name: string) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId ? { ...b, name } : b,
        ),
      }));
    },
    [updateDocument],
  );

  const handleUpdateBlockCode = useCallback(
    (
      blockId: string,
      patch: Partial<
        Pick<LandingBlock, "htmlTemplate" | "cssTemplate" | "jsTemplate">
      >,
    ) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const nextHtml = patch.htmlTemplate ?? b.htmlTemplate;
          const synced =
            patch.htmlTemplate !== undefined
              ? syncFieldsWithHtmlTemplate(b.fields, b.values, nextHtml)
              : { fields: b.fields, values: b.values };

          return {
            ...b,
            ...patch,
            fields: synced.fields,
            values: synced.values,
          };
        }),
      }));
    },
    [updateDocument],
  );

  // Sub-element style & structural handlers
  const handleUpdateSubElementStyle = useCallback(
    (
      blockId: string,
      selector: string,
      patch: Partial<SubElementStyleOverride>,
    ) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const map = parseSubElementStyles(b.values.__subStyles);
          const current = map[selector] ?? {};
          const nextStyle: SubElementStyleOverride = { ...current, ...patch };
          for (const [k, v] of Object.entries(nextStyle)) {
            if (!v || !v.trim()) {
              delete nextStyle[k as keyof SubElementStyleOverride];
            }
          }
          if (Object.keys(nextStyle).length > 0) {
            map[selector] = nextStyle;
          } else {
            delete map[selector];
          }
          return {
            ...b,
            values: {
              ...b.values,
              __subStyles: serializeSubElementStyles(map),
            },
          };
        }),
      }));
    },
    [updateDocument],
  );

  const handleResetSubElementStyles = useCallback(
    (blockId: string, selector: string) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const map = parseSubElementStyles(b.values.__subStyles);
          delete map[selector];
          return {
            ...b,
            values: {
              ...b.values,
              __subStyles: serializeSubElementStyles(map),
            },
          };
        }),
      }));
    },
    [updateDocument],
  );

  const handleDuplicateSubElement = useCallback(
    (blockId: string, selector: string) => {
      let nextSel: string | null = null;
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const res = duplicateSubElementInBlock(b, selector);
          if (!res) return b;
          nextSel = res.newSelector;
          return res.block;
        }),
      }));
      if (nextSel) {
        pendingSubSelectorRef.current = nextSel;
        setFeedback({
          type: "success",
          message: "Elemento duplicado con variables independientes.",
        });
      }
    },
    [updateDocument],
  );

  const handleMoveSubElement = useCallback(
    (blockId: string, selector: string, direction: "prev" | "next") => {
      let nextSel: string | null = null;
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const res = moveSubElementInBlock(b, selector, direction);
          if (!res) return b;
          nextSel = res.newSelector;
          return res.block;
        }),
      }));
      if (nextSel) {
        pendingSubSelectorRef.current = nextSel;
      }
    },
    [updateDocument],
  );

  const handleMoveLayer = useCallback(
    (
      sourceItem: DraggedLayerItem,
      target: { blockId: string; selector?: string | null },
      position: "inside" | "before" | "after" = "inside",
    ) => {
      if (sourceItem.type === "sublayer") {
        if (sourceItem.blockId === target.blockId && target.selector) {
          let nextSel: string | null = null;
          updateDocument((prev) => ({
            ...prev,
            blocks: prev.blocks.map((b) => {
              if (b.id !== sourceItem.blockId) return b;
              const res = reparentSubElementInBlock(
                b,
                sourceItem.selector,
                target.selector!,
                position,
              );
              if (res) {
                nextSel = res.newSelector;
                return res.block;
              }
              return b;
            }),
          }));

          if (nextSel) {
            selectSubElementOnStudio(target.blockId, nextSel);
            setExpandedSubLayerIds((prev) => ({
              ...prev,
              [`${target.blockId}:${target.selector}`]: true,
            }));
            setFeedback({
              type: "success",
              message: `Capa "${sourceItem.label}" movida con éxito.`,
            });
          }
          return;
        }

        // Cross-block sublayer move (or target.selector is null: drop on block)
        let nextSel: string | null = null;
        updateDocument((prev) => {
          const sourceBlock = prev.blocks.find(
            (b) => b.id === sourceItem.blockId,
          );
          const targetBlock = prev.blocks.find(
            (b) => b.id === target.blockId,
          );
          if (!sourceBlock || !targetBlock) return prev;

          const res = moveSubElementBetweenBlocks(
            sourceBlock,
            sourceItem.selector,
            targetBlock,
            target.selector ?? null,
            position,
          );
          if (!res) return prev;

          nextSel = res.newSelector;
          return {
            ...prev,
            blocks: prev.blocks.map((b) => {
              if (b.id === res.sourceBlock.id) return res.sourceBlock;
              if (b.id === res.targetBlock.id) return res.targetBlock;
              return b;
            }),
          };
        });

        if (nextSel) {
          selectSubElementOnStudio(target.blockId, nextSel);
          setExpandedBlockIds((prev) => ({ ...prev, [target.blockId]: true }));
          setFeedback({
            type: "success",
            message: `Capa "${sourceItem.label}" movida a la sección destino.`,
          });
        }
        return;
      }

      if (sourceItem.type === "block") {
        if (position === "inside" && sourceItem.blockId !== target.blockId) {
          let nextSel: string | null = null;
          updateDocument((prev) => {
            const sourceBlock = prev.blocks.find(
              (b) => b.id === sourceItem.blockId,
            );
            const targetBlock = prev.blocks.find(
              (b) => b.id === target.blockId,
            );
            if (!sourceBlock || !targetBlock) return prev;

            const res = moveBlockIntoBlock(
              sourceBlock,
              targetBlock,
              target.selector ?? null,
            );
            if (!res) return prev;
            nextSel = res.newSelector;

            return {
              ...prev,
              blocks: prev.blocks
                .filter((b) => b.id !== sourceItem.blockId)
                .map((b) => (b.id === res.targetBlock.id ? res.targetBlock : b)),
            };
          });

          if (nextSel) {
            selectSubElementOnStudio(target.blockId, nextSel);
            setExpandedBlockIds((prev) => ({ ...prev, [target.blockId]: true }));
            setFeedback({
              type: "success",
              message: `Sección "${sourceItem.label}" anidada como capa dentro del bloque.`,
            });
          }
        } else {
          const sourceIdx =
            "blockIndex" in sourceItem && sourceItem.blockIndex !== undefined
              ? sourceItem.blockIndex
              : documentState.blocks.findIndex((b) => b.id === sourceItem.blockId);
          const targetIdx = documentState.blocks.findIndex(
            (b) => b.id === target.blockId,
          );
          if (sourceIdx >= 0 && targetIdx >= 0 && sourceIdx !== targetIdx) {
            let finalTargetIdx = targetIdx;
            if (position === "after" && sourceIdx < targetIdx) {
              finalTargetIdx = targetIdx;
            } else if (position === "before" && sourceIdx > targetIdx) {
              finalTargetIdx = targetIdx;
            }
            handleReorderBlocks(sourceIdx, finalTargetIdx);
          }
        }
      }
    },
    [
      documentState.blocks,
      handleReorderBlocks,
      selectSubElementOnStudio,
      setFeedback,
      updateDocument,
    ],
  );

  const handleDeleteSubElement = useCallback(
    (blockId: string, selector: string) => {
      pendingSubSelectorRef.current = null;
      setSelectedSubElement(null);
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return deleteSubElementInBlock(b, selector) ?? b;
        }),
      }));
    },
    [updateDocument],
  );

  const handleInsertInnerElement = useCallback(
    (
      blockId: string,
      targetSelector: string | null,
      kind: InsertableInnerElementKind,
      position: "inside" | "before" | "after" = "inside",
    ) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return insertInnerElementInBlock(b, targetSelector, kind, position);
        }),
      }));
      setFeedback({
        type: "success",
        message: "Nuevo elemento agregado al bloque.",
      });
    },
    [updateDocument],
  );

  const handleUpdateSubElementText = useCallback(
    (blockId: string, selector: string, text: string) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return updateSubElementTextInBlock(b, selector, text);
        }),
      }));
    },
    [updateDocument],
  );

  const handleUpdateSubElementAttribute = useCallback(
    (
      blockId: string,
      selector: string,
      attrName: "src" | "href" | "alt",
      value: string,
    ) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return updateSubElementAttributeInBlock(b, selector, attrName, value);
        }),
      }));
      setSelectedSubElement((prev) => {
        if (!prev || prev.blockId !== blockId || prev.selector !== selector) {
          return prev;
        }
        return {
          ...prev,
          ...(attrName === "src" ? { currentSrc: value } : {}),
          ...(attrName === "href" ? { currentHref: value } : {}),
          ...(attrName === "alt" ? { currentAlt: value } : {}),
        };
      });
    },
    [updateDocument],
  );

  const handleUpdateTheme = useCallback(
    (patch: Partial<LandingTheme>) => {
      updateDocument((prev) => ({
        ...prev,
        theme: { ...prev.theme, ...patch },
      }));
    },
    [updateDocument],
  );

  // Save & Publish handlers
  const handleSaveDraft = useCallback(() => {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveLandingDraftAction({
        tenantId: tenant.id,
        htmlContent: activeCodePayload.htmlContent,
        cssContent: activeCodePayload.cssContent,
        jsContent: activeCodePayload.jsContent,
        document: documentState,
      });

      if (res.success) {
        setIsDirty(false);
        setLastSavedAt(res.data.updatedAt);
        setFeedback({
          type: "success",
          message: "Borrador guardado correctamente.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error.message || "No se pudo guardar el borrador.",
        });
      }
    });
  }, [activeCodePayload, documentState, tenant.id]);

  // Listen to messages from the Interactive Canvas Bridge inside the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "LANDING_SCROLL_SYNC" && typeof data.scrollY === "number") {
        iframeScrollYRef.current = data.scrollY;
      } else if (data.type === "LANDING_SELECT_BLOCK" && typeof data.blockId === "string") {
        setSelectedBlockId(data.blockId);
        setSelectedSubElement(null);
        setRightTab("properties");
      } else if (
        data.type === "LANDING_SELECT_SUBELEMENT" &&
        typeof data.blockId === "string" &&
        data.subElement &&
        typeof data.subElement === "object"
      ) {
        setSelectedBlockId(data.blockId);
        setSelectedSubElement({
          blockId: data.blockId,
          ...(data.subElement as Omit<SelectedSubElementInfo, "blockId">),
        });
        setRightTab("properties");
      } else if (
        data.type === "LANDING_SUBELEMENT_ACTION" &&
        typeof data.blockId === "string" &&
        typeof data.selector === "string" &&
        typeof data.action === "string"
      ) {
        if (data.action === "move-prev") {
          handleMoveSubElement(data.blockId, data.selector, "prev");
        } else if (data.action === "move-next") {
          handleMoveSubElement(data.blockId, data.selector, "next");
        } else if (data.action === "duplicate") {
          handleDuplicateSubElement(data.blockId, data.selector);
        } else if (data.action === "delete") {
          handleDeleteSubElement(data.blockId, data.selector);
        } else if (data.action === "pick-image") {
          const curSub =
            selectedSubElementRef.current?.selector === data.selector
              ? selectedSubElementRef.current
              : null;
          setMediaPickerTarget({
            kind: "sub-img",
            blockId: data.blockId,
            selector: data.selector,
            boundSrcField: curSub ? curSub.boundSrcField : null,
            boundAltField: curSub ? curSub.boundAltField : null,
            currentUrl: curSub ? curSub.currentSrc : "",
            title: "Cambiar Imagen del Elemento",
          });
        }
      } else if (
        data.type === "LANDING_INLINE_FIELD_CHANGE" &&
        typeof data.blockId === "string" &&
        typeof data.fieldKey === "string" &&
        typeof data.value === "string"
      ) {
        handleUpdateBlockValue(data.blockId, data.fieldKey, data.value, true);
      } else if (data.type === "LANDING_INLINE_FIELD_COMMIT") {
        if (inlineEditSnapshotRef.current) {
          const snapshot = inlineEditSnapshotRef.current;
          inlineEditSnapshotRef.current = null;
          setHistory((h) => ({
            past: [...h.past.slice(-29), snapshot],
            future: [],
          }));
        }
      } else if (data.type === "LANDING_SHORTCUT" && typeof data.action === "string") {
        if (data.action === "save") {
          handleSaveDraft();
        } else if (data.action === "undo") {
          handleUndo();
        } else if (data.action === "redo") {
          handleRedo();
        }
      } else if (
        data.type === "LANDING_BLOCK_ACTION" &&
        typeof data.blockId === "string" &&
        typeof data.action === "string"
      ) {
        const targetBlock = documentState.blocks.find((b) => b.id === data.blockId);
        if (!targetBlock) return;
        if (data.action === "move-up") {
          handleMoveBlock(data.blockId, "up");
        } else if (data.action === "move-down") {
          handleMoveBlock(data.blockId, "down");
        } else if (data.action === "duplicate") {
          handleDuplicateBlock(targetBlock);
        } else if (data.action === "code") {
          setSelectedBlockId(data.blockId);
          setCodeDrawerMode("block");
          setCodeTab("html");
        } else if (data.action === "delete") {
          handleDeleteBlock(data.blockId);
        }
      } else if (data.type === "LANDING_CANVAS_MOVE") {
        if (data.sourceItem && data.target) {
          handleMoveLayer(data.sourceItem, data.target, data.position || "inside");
        }
      } else if (data.type === "LANDING_SUBELEMENT_TEXT_UPDATE") {
        if (data.blockId && data.selector && typeof data.text === "string") {
          handleUpdateSubElementText(data.blockId, data.selector, data.text);
        }
      } else if (data.type === "LANDING_CANVAS_DROP") {
        setIsDraggingComponentOverCanvas(false);
        const dragWin = getDragWindow();
        const compKind = (data.componentKind ||
          draggedComponentKindRef.current ||
          dragWin?.__draggedComponentKind) as InsertableInnerElementKind | null;
        const bKey = (data.builtinKey ||
          draggedBuiltinKeyRef.current ||
          dragWin?.__draggedBuiltinKey) as string | null;
        const cId = (data.customId ||
          draggedCustomIdRef.current ||
          dragWin?.__draggedCustomId) as string | null;

        if (compKind) {
          if (data.blockId) {
            handleInsertInnerElement(
              data.blockId,
              data.subSelector ?? null,
              compKind,
              data.position || "inside",
            );
            selectSubElementOnStudio(data.blockId, data.subSelector ?? null);
          } else if (selectedBlockIdRef.current) {
            handleInsertInnerElement(
              selectedBlockIdRef.current,
              null,
              compKind,
              data.position || "inside",
            );
          } else {
            handleCreateContainerSection(compKind);
          }
          setDraggedComponentKind(null);
          if (dragWin) {
            dragWin.__draggedComponentKind = null;
          }
        } else if (bKey) {
          const found = BUILTIN_LANDING_MODULES.find(
            (m) => m.moduleKey === bKey,
          );
          if (found) handleAddBuiltinBlock(found);
          setDraggedBuiltinKey(null);
          if (dragWin) {
            dragWin.__draggedBuiltinKey = null;
          }
        } else if (cId) {
          const found = customModules.find((m) => m.id === cId);
          if (found) handleAddCustomBlock(found);
          setDraggedCustomId(null);
          if (dragWin) {
            dragWin.__draggedCustomId = null;
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    customModules,
    documentState.blocks,
    handleAddBuiltinBlock,
    handleAddCustomBlock,
    handleCreateContainerSection,
    handleDeleteBlock,
    handleDeleteSubElement,
    handleDuplicateBlock,
    handleDuplicateSubElement,
    handleInsertInnerElement,
    handleMoveBlock,
    handleMoveLayer,
    handleMoveSubElement,
    handleRedo,
    handleSaveDraft,
    handleUndo,
    handleUpdateBlockValue,
    handleUpdateSubElementText,
    selectSubElementOnStudio,
  ]);

  const handlePublish = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await publishLandingAction({
        tenantId: tenant.id,
        htmlContent: activeCodePayload.htmlContent,
        cssContent: activeCodePayload.cssContent,
        jsContent: activeCodePayload.jsContent,
        document: documentState,
      });

      if (res.success) {
        setIsDirty(false);
        setIsPublished(true);
        setLastSavedAt(res.data.updatedAt);
        setFeedback({
          type: "success",
          message: `¡Landing publicada en /l/${tenant.slug}!`,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error.message || "Error al publicar la landing.",
        });
      }
    });
  };

  // Keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && codeDrawerMode !== "closed") {
        e.preventDefault();
        setCodeDrawerMode("closed");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveDraft();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        !e.shiftKey &&
        codeDrawerMode === "closed"
      ) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          handleUndo();
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey)) &&
        codeDrawerMode === "closed"
      ) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveDraft, handleUndo, handleRedo, codeDrawerMode]);

  const handleSaveSelectedAsCustomModule = () => {
    if (!selectedBlock || !moduleName.trim()) return;
    startTransition(async () => {
      const res = await createCustomLandingModuleAction({
        tenantId: tenant.id,
        name: moduleName.trim(),
        description: moduleDesc.trim(),
        category: "custom",
        fields: selectedBlock.fields,
        htmlTemplate: selectedBlock.htmlTemplate,
        cssTemplate: selectedBlock.cssTemplate,
        jsTemplate: selectedBlock.jsTemplate,
      });

      if (res.success) {
        setCustomModules((prev) => [res.data, ...prev]);
        setShowSaveModuleModal(false);
        setModuleName("");
        setModuleDesc("");
        setFeedback({
          type: "success",
          message: `Módulo "${res.data.name}" guardado en tu biblioteca.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error.message || "No se pudo guardar el módulo.",
        });
      }
    });
  };

  const handleDeleteCustomModule = (moduleId: string) => {
    startTransition(async () => {
      const res = await deleteCustomLandingModuleAction(tenant.id, moduleId);
      if (res.success) {
        setCustomModules((prev) => prev.filter((m) => m.id !== moduleId));
        setFeedback({
          type: "success",
          message: "Módulo eliminado de tu biblioteca.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error.message || "No se pudo eliminar el módulo.",
        });
      }
    });
  };

  // Template actions
  const handleApplyTemplate = (template: LandingTemplateView) => {
    if (
      !window.confirm(
        `¿Cargar la plantilla "${template.name}"? Reemplazará el diseño actual en el editor.`,
      )
    ) {
      return;
    }

    const clonedDoc: LandingDocumentV1 = JSON.parse(
      JSON.stringify(template.document),
    );
    updateDocument(clonedDoc);
    setSelectedBlockId(clonedDoc.blocks[0]?.id ?? null);
    setRawHtml(template.htmlContent);
    setRawCss(template.cssContent);
    setRawJs(template.jsContent);
    setShowTemplatesModal(false);
    setFeedback({
      type: "success",
      message: `Plantilla "${template.name}" aplicada.`,
    });
  };

  const handleCreateTemplate = () => {
    if (!templateName.trim()) return;
    startTransition(async () => {
      const res = await createLandingTemplateAction({
        tenantId: tenant.id,
        document: documentState,
        command: {
          name: templateName.trim(),
          description: templateDesc.trim(),
          submitPublic: templateSubmitPublic,
        },
      });

      if (res.success) {
        setTemplates((prev) => [res.data, ...prev]);
        setShowSaveTemplateModal(false);
        setTemplateName("");
        setTemplateDesc("");
        setTemplateSubmitPublic(false);
        setFeedback({
          type: "success",
          message: templateSubmitPublic
            ? "Plantilla enviada a moderación para la comunidad."
            : "Plantilla privada guardada en tu biblioteca.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error.message || "No se pudo guardar la plantilla.",
        });
      }
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    startTransition(async () => {
      const res = await deletePrivateLandingTemplateAction(
        tenant.id,
        templateId,
      );
      if (res.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
        setFeedback({
          type: "success",
          message: "Plantilla eliminada.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error.message || "No se pudo eliminar la plantilla.",
        });
      }
    });
  };

  const handleExportTemplate = (templateId: string) => {
    startTransition(async () => {
      const res = await exportLandingTemplateAction(tenant.id, templateId);
      if (res.success) {
        const binary = atob(res.data.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], {
          type: "application/vnd.restaurant-menu.landing-template",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.data.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setFeedback({
          type: "error",
          message: res.error.message || "No se pudo exportar la plantilla.",
        });
      }
    });
  };

  const handleImportTemplateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]!);
      }
      const base64 = btoa(binary);
      startTransition(async () => {
        const res = await importLandingTemplateAction(tenant.id, base64);
        if (res.success) {
          setTemplates((prev) => [res.data, ...prev]);
          setFeedback({
            type: "success",
            message: `Plantilla "${res.data.name}" importada a tu biblioteca.`,
          });
        } else {
          setFeedback({
            type: "error",
            message: res.error.message || "Archivo .landingtemplate inválido.",
          });
        }
      });
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleResetDefault = () => {
    if (
      !window.confirm(
        "¿Restaurar la landing inicial? Se perderán los cambios no guardados.",
      )
    ) {
      return;
    }
    const starter = createDefaultLandingTemplate(tenant.name, tenant.slug);
    updateDocument(starter.document);
    setSelectedBlockId(starter.document.blocks[0]?.id ?? null);
    setRawHtml(starter.html);
    setRawCss(starter.css);
    setRawJs(starter.js);
    setFeedback({
      type: "success",
      message: "Diseño inicial restaurado.",
    });
  };

  const filteredBuiltinModules = useMemo(() => {
    const q = componentSearch.trim().toLowerCase();
    if (!q) return BUILTIN_LANDING_MODULES;
    return BUILTIN_LANDING_MODULES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q),
    );
  }, [componentSearch]);

  const filteredCustomModules = useMemo(() => {
    const q = componentSearch.trim().toLowerCase();
    if (!q) return customModules;
    return customModules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q),
    );
  }, [customModules, componentSearch]);

  const filteredAtomicComponents = useMemo(() => {
    const q = componentSearch.trim().toLowerCase();
    return ATOMIC_COMPONENTS_CATALOG.filter((item) => {
      const matchesCategory =
        selectedComponentCategory === "all" ||
        item.category === selectedComponentCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.kind.toLowerCase().includes(q)
      );
    });
  }, [componentSearch, selectedComponentCategory]);

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-100 text-zinc-900 overflow-hidden select-none">
      {/* ================================================================= */}
      {/* TOP STUDIO HEADER (OpenPage / Framely style)                      */}
      {/* ================================================================= */}
      <header className="flex items-center justify-between h-13 px-4 bg-white border-b border-zinc-200 shrink-0 gap-3 shadow-2xs">
        {/* Left: Breadcrumb + Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            <span className="text-xs font-medium text-zinc-500 hidden sm:inline">
              Landing
            </span>
            <span className="text-zinc-400 hidden sm:inline">/</span>
            <span className="text-sm font-semibold text-zinc-900 truncate max-w-[180px]">
              {tenant.name}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
              isPublished
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-zinc-100 text-zinc-600 border-zinc-200"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isPublished ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {isPublished ? "Publicada" : "Borrador"}
          </span>

          {isDirty && (
            <span className="text-[11px] text-amber-600 font-medium hidden md:inline">
              • Sin guardar
            </span>
          )}
        </div>

        {/* Center: Viewport Switcher + Undo/Redo + Preview + Code + Templates */}
        <div className="flex items-center gap-1.5">
          {/* Device Viewport Switcher */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`p-1.5 rounded-md transition-colors ${
                viewport === "desktop"
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Vista Escritorio"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport("tablet")}
              className={`p-1.5 rounded-md transition-colors ${
                viewport === "tablet"
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Vista Tablet (768px)"
            >
              <Tablet className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`p-1.5 rounded-md transition-colors ${
                viewport === "mobile"
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Vista Móvil (390px)"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-200 mx-0.5 hidden sm:block" />

          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.past.length === 0}
              className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={history.future.length === 0}
              className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-200 mx-0.5" />

          {/* Clean Preview vs Interactive Canvas Toggle */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setInteractiveCanvas(true)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                interactiveCanvas
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Lienzo de edición: seleccioná bloques, arrastrá elementos y editá textos"
            >
              <MousePointerClick className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setInteractiveCanvas(false)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                !interactiveCanvas
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Vista previa interactiva: probá el sitio como un cliente final (menú responsive, enlaces, acordeones)"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Interactivo</span>
            </button>
          </div>

          {/* Code Drawer Toggle (Full-Screen Modal) */}
          <button
            type="button"
            onClick={() =>
              setCodeDrawerMode((m) =>
                m === "closed" ? (selectedBlockId ? "block" : "global") : "closed",
              )
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              codeDrawerMode !== "closed"
                ? "bg-blue-50 text-blue-700 border-blue-300 shadow-2xs font-semibold"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-2xs"
            }`}
            title="Abrir editor de código a pantalla completa"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Código</span>
          </button>

          {/* Templates Library Button */}
          <button
            type="button"
            onClick={() => setShowTemplatesModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-2xs transition-colors"
            title="Biblioteca de Plantillas de Landing"
          >
            <LayoutTemplate className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden md:inline">Plantillas</span>
          </button>
        </div>

        {/* Right: External Link + Save + Publish */}
        <div className="flex items-center gap-2">
          {isPublished && (
            <a
              href={`/l/${tenant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-2xs transition-colors"
              title="Ver landing pública en pestaña nueva"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Ver sitio</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 shadow-2xs transition-colors disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Guardar</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors disabled:opacity-50"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Publicar</span>
          </button>
        </div>
      </header>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between px-4 py-2 text-xs font-medium border-b shrink-0 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-zinc-500 hover:text-zinc-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3-COLUMN STUDIO BODY (Left Layers/Components | Center Canvas | Right Properties/Design) */}
      {/* ================================================================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* --------------------------------------------------------------- */}
        {/* LEFT SIDEBAR: Layers & + Components (OpenPage / M3E Canvas)     */}
        {/* --------------------------------------------------------------- */}
        <div className="relative flex shrink-0">
          <aside
            className={`bg-white border-r border-zinc-200 flex flex-col shrink-0 min-h-0 transition-[width,opacity] duration-200 ease-in-out overflow-hidden ${
              isLeftSidebarOpen
                ? "w-96 opacity-100"
                : "w-0 border-r-0 opacity-0"
            }`}
          >
            <div className="w-96 h-full flex flex-col shrink-0 min-h-0">
          {/* Listado Selector: Capas | Componentes | Módulos */}
          <div className="p-2 border-b border-zinc-200 relative" ref={leftTabMenuRef}>
            <button
              type="button"
              onClick={() => setIsLeftTabMenuOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 transition-colors shadow-2xs group"
              aria-expanded={isLeftTabMenuOpen}
              aria-haspopup="listbox"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {leftTab === "layers" ? (
                  <>
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-200/80 text-zinc-700 shrink-0">
                      <Layers className="h-3 w-3" />
                    </span>
                    <span className="font-semibold text-zinc-900 truncate">Capas</span>
                    <span className="text-[10px] bg-zinc-200 text-zinc-600 font-bold px-1.5 py-0.2 rounded-full shrink-0">
                      {documentState.blocks.length}
                    </span>
                  </>
                ) : leftTab === "components" ? (
                  <>
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-700 shrink-0">
                      <Box className="h-3 w-3" />
                    </span>
                    <span className="font-semibold text-blue-900 truncate">Componentes</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded-full shrink-0">
                      Atómicos
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-700 shrink-0">
                      <Sparkles className="h-3 w-3" />
                    </span>
                    <span className="font-semibold text-amber-900 truncate">Módulos</span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.2 rounded-full shrink-0">
                      Plantillas
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center shrink-0 text-zinc-400 group-hover:text-zinc-600 ml-1">
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-150 ${
                    isLeftTabMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {isLeftTabMenuOpen && (
              <div
                role="listbox"
                className="absolute top-full left-2 right-2 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-40 p-1 space-y-1 animate-in fade-in-50 zoom-in-95 duration-100"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                  Seleccionar panel
                </div>
                <button
                  type="button"
                  role="option"
                  aria-selected={leftTab === "layers"}
                  onClick={() => {
                    setLeftTab("layers");
                    setIsLeftTabMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                    leftTab === "layers"
                      ? "bg-zinc-100 text-zinc-900 font-semibold"
                      : "hover:bg-zinc-50 text-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 shrink-0">
                      <Layers className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900">Capas</div>
                      <div className="text-[10px] text-zinc-500 truncate">
                        Estructura y jerarquía del lienzo
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] bg-zinc-200 text-zinc-600 font-bold px-1.5 py-0.5 rounded-full">
                      {documentState.blocks.length}
                    </span>
                    {leftTab === "layers" && <Check className="h-3.5 w-3.5 text-zinc-800" />}
                  </div>
                </button>

                <button
                  type="button"
                  role="option"
                  aria-selected={leftTab === "components"}
                  onClick={() => {
                    setLeftTab("components");
                    setIsLeftTabMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                    leftTab === "components"
                      ? "bg-blue-50 text-blue-900 font-semibold"
                      : "hover:bg-zinc-50 text-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 border border-blue-200 text-blue-700 shrink-0">
                      <Box className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900">Componentes</div>
                      <div className="text-[10px] text-zinc-500 truncate">
                        Elementos atómicos y contenedores
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">
                      {filteredAtomicComponents.length}
                    </span>
                    {leftTab === "components" && <Check className="h-3.5 w-3.5 text-blue-700" />}
                  </div>
                </button>

                <button
                  type="button"
                  role="option"
                  aria-selected={leftTab === "modules"}
                  onClick={() => {
                    setLeftTab("modules");
                    setIsLeftTabMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                    leftTab === "modules"
                      ? "bg-amber-50 text-amber-900 font-semibold"
                      : "hover:bg-zinc-50 text-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 border border-amber-200 text-amber-700 shrink-0">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900">Módulos</div>
                      <div className="text-[10px] text-zinc-500 truncate">
                        Secciones y plantillas prearmadas
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">
                      {BUILTIN_LANDING_MODULES.length + customModules.length}
                    </span>
                    {leftTab === "modules" && <Check className="h-3.5 w-3.5 text-amber-700" />}
                  </div>
                </button>
              </div>
            )}
          </div>

          {leftTab === "layers" ? (
            <>
              {/* Capas Header with Expand/Collapse All buttons */}
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Estructura de Capas
                  </span>
                  <span className="text-[10px] font-bold text-zinc-600 bg-zinc-200/80 px-1.5 py-0.2 rounded-full">
                    {documentState.blocks.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleExpandAllLayers}
                    title="Expandir todas las capas"
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors flex items-center gap-1 text-[10px] font-medium"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Expandir</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCollapseAllLayers}
                    title="Contraer todas las capas"
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors flex items-center gap-1 text-[10px] font-medium"
                  >
                    <FoldVertical className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Contraer</span>
                  </button>
                </div>
              </div>

              {/* Layer Search Input */}
              <div className="p-2 border-b border-zinc-100">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={layerSearchQuery}
                    onChange={(e) => setLayerSearchQuery(e.target.value)}
                    placeholder="Buscar capas por nombre, etiqueta o texto..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                  {layerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLayerSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {layerSearchQuery.trim() && (
                  <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-zinc-500">
                    <span>
                      {matchingBlockIds.size}{" "}
                      {matchingBlockIds.size === 1
                        ? "sección encontrada"
                        : "secciones encontradas"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLayerSearchQuery("")}
                      className="text-blue-600 hover:underline"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {(() => {
                  const visibleBlocks = layerSearchQuery.trim()
                    ? documentState.blocks.filter((b) =>
                        matchingBlockIds.has(b.id),
                      )
                    : documentState.blocks;

                  if (visibleBlocks.length === 0) {
                    return (
                      <div className="py-8 px-4 text-center">
                        <Search className="h-6 w-6 text-zinc-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-zinc-700">
                          No se encontraron capas
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          No hay capas ni textos que coincidan con &ldquo;
                          {layerSearchQuery}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={() => setLayerSearchQuery("")}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Limpiar búsqueda
                        </button>
                      </div>
                    );
                  }

                  return visibleBlocks.map((block, idx) => {
                    const isBlockSelected = block.id === selectedBlockId;
                    const isSectionActive =
                      isBlockSelected && !activeSubElement;
                    const Icon = getModuleIcon(block.moduleKey);
                    const subLayers = blockSubLayerTrees.get(block.id) || [];
                    const hasSubLayers = subLayers.length > 0;
                    const isSearching = Boolean(layerSearchQuery.trim());
                    const isBlockExpanded = isSearching
                      ? true
                      : Boolean(expandedBlockIds[block.id]);

                  const isThisBlockDrop = blockDropTarget?.blockId === block.id;
                  const isThisBlockInside =
                    isThisBlockDrop && blockDropTarget.position === "inside";
                  const isThisBlockBefore =
                    isThisBlockDrop && blockDropTarget.position === "before";
                  const isThisBlockAfter =
                    isThisBlockDrop && blockDropTarget.position === "after";
                  const isSelfBlockDragging =
                    draggedLayerItem?.type === "block" &&
                    draggedLayerItem.blockId === block.id;

                  return (
                    <div key={block.id} className="flex flex-col">
                      <div
                        draggable
                        onDragStart={(e) => {
                          if ((e.target as HTMLElement).closest("button")) {
                            e.preventDefault();
                            return;
                          }
                          const realIdx = documentState.blocks.findIndex(
                            (b) => b.id === block.id,
                          );
                          const blockIndex = realIdx !== -1 ? realIdx : idx;
                          const item: DraggedLayerItem = {
                            type: "block",
                            blockId: block.id,
                            blockIndex,
                            label: block.name,
                          };
                          setDraggedLayerItem(item);
                          setDraggedLayerIndex(blockIndex);
                          const win = getDragWindow();
                          if (win) win.__draggedLayerItem = item;
                          try {
                            e.dataTransfer.setData(
                              "application/x-landing-layer",
                              JSON.stringify(item),
                            );
                            e.dataTransfer.setData(
                              "text/plain",
                              `landing-block:${block.id}`,
                            );
                            e.dataTransfer.effectAllowed = "move";
                          } catch {
                            // ignore
                          }
                        }}
                        onDragEnd={() => {
                          if (autoExpandBlockTimerRef.current) {
                            clearTimeout(autoExpandBlockTimerRef.current);
                            autoExpandBlockTimerRef.current = null;
                          }
                          setDraggedLayerItem(null);
                          setDraggedLayerIndex(null);
                          setBlockDropTarget(null);
                          const win = getDragWindow();
                          if (win) win.__draggedLayerItem = null;
                        }}
                        onDragOver={(e) => {
                          const win = getDragWindow();
                          const currentLayer =
                            draggedLayerItem || win?.__draggedLayerItem;
                          const compKind =
                            draggedComponentKind || win?.__draggedComponentKind;

                          if (
                            currentLayer?.type === "block" &&
                            currentLayer.blockId === block.id
                          ) {
                            return;
                          }

                          let isAcceptable = Boolean(compKind || currentLayer);
                          if (!isAcceptable && e.dataTransfer) {
                            try {
                              const plain =
                                e.dataTransfer.getData("text/plain") || "";
                              if (
                                plain.startsWith("landing-component:") ||
                                plain.startsWith("landing-layer:") ||
                                plain.startsWith("landing-block:") ||
                                e.dataTransfer.types.includes(
                                  "application/x-landing-component",
                                ) ||
                                e.dataTransfer.types.includes(
                                  "application/x-landing-layer",
                                )
                              ) {
                                isAcceptable = true;
                              }
                            } catch {
                              // ignore
                            }
                          }

                          if (isAcceptable) {
                            e.preventDefault();
                            e.stopPropagation();

                            if (hasSubLayers && !isBlockExpanded) {
                              if (!autoExpandBlockTimerRef.current) {
                                autoExpandBlockTimerRef.current = setTimeout(
                                  () => {
                                    setExpandedBlockIds((prev) => ({
                                      ...prev,
                                      [block.id]: true,
                                    }));
                                    autoExpandBlockTimerRef.current = null;
                                  },
                                  650,
                                );
                              }
                            }

                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const relY = e.clientY - rect.top;
                            const ratio = relY / rect.height;

                            let pos: "inside" | "before" | "after" = "inside";
                            if (currentLayer?.type === "block") {
                              if (ratio < 0.25) pos = "before";
                              else if (ratio > 0.75) pos = "after";
                              else pos = "inside";
                            } else {
                              pos = "inside";
                            }

                            setBlockDropTarget({
                              blockId: block.id,
                              position: pos,
                            });
                          }
                        }}
                        onDragLeave={() => {
                          setBlockDropTarget((prev) =>
                            prev?.blockId === block.id ? null : prev,
                          );
                          if (autoExpandBlockTimerRef.current) {
                            clearTimeout(autoExpandBlockTimerRef.current);
                            autoExpandBlockTimerRef.current = null;
                          }
                        }}
                        onDrop={(e) => {
                          if (autoExpandBlockTimerRef.current) {
                            clearTimeout(autoExpandBlockTimerRef.current);
                            autoExpandBlockTimerRef.current = null;
                          }
                          const pos = blockDropTarget?.position || "inside";
                          setBlockDropTarget(null);

                          const win = getDragWindow();
                          const currentLayer =
                            draggedLayerItem || win?.__draggedLayerItem;

                          if (draggedComponentKind) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleInsertInnerElement(
                              block.id,
                              null,
                              draggedComponentKind,
                            );
                            setDraggedComponentKind(null);
                            return;
                          }

                          if (currentLayer) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMoveLayer(
                              currentLayer,
                              { blockId: block.id, selector: null },
                              pos,
                            );
                            setDraggedLayerItem(null);
                            setDraggedLayerIndex(null);
                            if (win) win.__draggedLayerItem = null;
                            return;
                          }

                          if (draggedLayerIndex !== null) {
                            const targetRealIdx =
                              documentState.blocks.findIndex(
                                (b) => b.id === block.id,
                              );
                            handleReorderBlocks(
                              draggedLayerIndex,
                              targetRealIdx !== -1 ? targetRealIdx : idx,
                            );
                            setDraggedLayerIndex(null);
                          }
                        }}
                        onClick={() => selectBlockOnStudio(block.id, true)}
                        className={`group relative flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all border select-none ${
                          isSelfBlockDragging
                            ? "opacity-35 bg-zinc-100 border-dashed border-zinc-400"
                            : isThisBlockInside
                              ? "bg-blue-100/90 border-blue-400 text-blue-900 ring-2 ring-blue-300 font-semibold shadow-2xs"
                              : isSectionActive
                                ? "bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs font-medium"
                                : isBlockSelected
                                  ? "bg-zinc-100/70 border-zinc-200 text-zinc-800"
                                  : "bg-transparent border-transparent hover:bg-zinc-50 text-zinc-700"
                        } ${!block.visible ? "opacity-45" : ""}`}
                      >
                        {isThisBlockBefore && (
                          <div className="absolute -top-0.5 left-1 right-1 h-[2px] bg-blue-500 rounded-full z-20 pointer-events-none shadow-xs" />
                        )}
                        {isThisBlockAfter && (
                          <div className="absolute -bottom-0.5 left-1 right-1 h-[2px] bg-blue-500 rounded-full z-20 pointer-events-none shadow-xs" />
                        )}

                        <div className="flex items-center gap-1.5 min-w-0">
                          {hasSubLayers ? (
                            <button
                              type="button"
                              onClick={(e) => toggleBlockExpanded(block.id, e)}
                              className="p-0.5 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-200/60"
                              title={
                                isBlockExpanded
                                  ? "Colapsar capas del bloque"
                                  : "Expandir capas del bloque"
                              }
                            >
                              {isBlockExpanded ? (
                                <ChevronDown className="h-3 w-3 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 shrink-0" />
                              )}
                            </button>
                          ) : (
                            <span className="w-3 shrink-0" />
                          )}

                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                              isSectionActive
                                ? "bg-blue-100 border-blue-200 text-blue-600"
                                : "bg-zinc-100 border-zinc-200 text-zinc-500"
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                          </span>
                          <span className="text-xs font-medium truncate">
                            {block.name}
                          </span>

                          {isThisBlockInside && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-2xs animate-pulse shrink-0">
                              ↳ Soltar dentro
                            </span>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleBlockVisibility(block.id)
                            }
                            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded"
                            title={block.visible ? "Ocultar" : "Mostrar"}
                          >
                            {block.visible ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateBlock(block)}
                            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded"
                            title="Duplicar"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(block.id)}
                            className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Nested Sub-Layers (Figma Style) */}
                      {hasSubLayers && isBlockExpanded && (
                        <div className="flex flex-col ml-3 pl-1.5 border-l border-zinc-200/80 my-0.5 space-y-0.5">
                          {subLayers.map((subNode) => (
                            <SubLayerTreeRow
                              key={subNode.id}
                              block={block}
                              node={subNode}
                              depth={1}
                              selectedBlockId={selectedBlockId}
                              activeSubElementSelector={
                                activeSubElement?.selector
                              }
                              expandedSubLayerIds={expandedSubLayerIds}
                              matchingNodeIds={matchingNodeIds}
                              ancestorNodeIds={ancestorNodeIds}
                              isSearching={isSearching}
                              onSelectSubElement={selectSubElementOnStudio}
                              onHoverSubElement={handleHoverSubElement}
                              onToggleExpand={toggleSubLayerExpanded}
                              onDuplicateSubElement={handleDuplicateSubElement}
                              onDeleteSubElement={handleDeleteSubElement}
                              onDropComponentOnSubElement={(
                                bId,
                                selector,
                                kind,
                              ) => {
                                handleInsertInnerElement(bId, selector, kind);
                                setDraggedComponentKind(null);
                              }}
                              draggedComponentKind={draggedComponentKind}
                              draggedLayerItem={draggedLayerItem}
                              onDragStartLayer={(item) => {
                                setDraggedLayerItem(item);
                                const win = getDragWindow();
                                if (win) win.__draggedLayerItem = item;
                              }}
                              onDragEndLayer={() => {
                                setDraggedLayerItem(null);
                                const win = getDragWindow();
                                if (win) win.__draggedLayerItem = null;
                              }}
                              onDropLayerOnSubElement={(
                                targetBlockId,
                                targetSelector,
                                position,
                              ) => {
                                const item =
                                  draggedLayerItem ||
                                  getDragWindow()?.__draggedLayerItem;
                                if (item) {
                                  handleMoveLayer(
                                    item,
                                    {
                                      blockId: targetBlockId,
                                      selector: targetSelector,
                                    },
                                    position,
                                  );
                                  setDraggedLayerItem(null);
                                  const win = getDragWindow();
                                  if (win) win.__draggedLayerItem = null;
                                }
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
              </div>

              {/* Bottom pinned actions in Layers */}
              <div className="p-3 border-t border-zinc-200 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLeftTab("components")}
                    className="py-1.5 px-2 rounded-lg border border-dashed border-zinc-300 hover:border-blue-400 bg-zinc-50 hover:bg-blue-50/60 text-[11px] font-semibold text-zinc-700 hover:text-blue-700 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="h-3 w-3 text-blue-600" />
                    Componente
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateContainerSection()}
                    className="py-1.5 px-2 rounded-lg border border-dashed border-zinc-300 hover:border-violet-400 bg-zinc-50 hover:bg-violet-50/60 text-[11px] font-semibold text-zinc-700 hover:text-violet-700 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Box className="h-3 w-3 text-violet-600" />
                    Contenedor
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveTemplateModal(true)}
                    className="flex-1 py-1.5 px-2 rounded-md bg-zinc-50 hover:bg-zinc-100 text-[11px] font-medium text-zinc-700 border border-zinc-200 flex items-center justify-center gap-1"
                  >
                    <BookmarkPlus className="h-3 w-3 text-emerald-600" />
                    Guardar Plantilla
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="py-1.5 px-2 rounded-md bg-zinc-50 hover:bg-zinc-100 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 border border-zinc-200"
                    title="Restaurar diseño inicial"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </>
          ) : leftTab === "components" ? (
            /* ======================================================= */
            /* + COMPONENTS TAB: Atomic UI Components (Figma / OpenPage)*/
            /* ======================================================= */
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              {/* Search */}
              <div className="p-2.5 border-b border-zinc-200">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                    placeholder="Buscar contenedor, botón, texto..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Category filter pills */}
              <div className="px-2.5 py-1.5 border-b border-zinc-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: "all", label: "Todos" },
                    { id: "layout", label: "Estructura" },
                    { id: "text", label: "Textos" },
                    { id: "action", label: "Acciones" },
                    { id: "media", label: "Medios" },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedComponentCategory(cat.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors ${
                      selectedComponentCategory === cat.id
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Direct Action: Create Container Section */}
              <div className="p-2.5 pb-1">
                <button
                  type="button"
                  onClick={() => handleCreateContainerSection()}
                  className="w-full py-2 px-3 rounded-xl bg-blue-50/80 hover:bg-blue-100 border border-blue-200 text-left flex items-center justify-between group transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
                      <Box className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <span className="text-xs font-semibold text-blue-900 block leading-tight">
                        + Nueva Sección Contenedor
                      </span>
                      <span className="text-[10px] text-blue-700/80 leading-tight">
                        Crea una sección libre para armar
                      </span>
                    </div>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              {/* Component Cards List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                    Arrastrá al lienzo o clic
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {filteredAtomicComponents.length} items
                  </span>
                </div>

                <div className="space-y-1.5">
                  {filteredAtomicComponents.map((comp) => {
                    const CompIcon = comp.icon;
                    return (
                      <div
                        key={comp.kind}
                        draggable
                        onDragStart={(e) => {
                          try {
                            e.dataTransfer.setData(
                              "application/x-landing-component",
                              comp.kind,
                            );
                            e.dataTransfer.setData(
                              "text/plain",
                              `landing-component:${comp.kind}`,
                            );
                            e.dataTransfer.effectAllowed = "copy";
                          } catch {
                            // ignore dataTransfer access errors
                          }
                          const win = getDragWindow();
                          if (win) {
                            win.__draggedComponentKind = comp.kind;
                          }
                          draggedComponentKindRef.current = comp.kind;
                          setDraggedComponentKind(comp.kind);
                        }}
                        onDragEnd={() => {
                          const win = getDragWindow();
                          if (win) {
                            win.__draggedComponentKind = null;
                          }
                          draggedComponentKindRef.current = null;
                          setDraggedComponentKind(null);
                          setIsDraggingComponentOverCanvas(false);
                        }}
                        onClick={() => {
                          if (selectedBlockId) {
                            handleInsertInnerElement(
                              selectedBlockId,
                              activeSubElement?.selector ?? null,
                              comp.kind,
                            );
                            setFeedback({
                              type: "success",
                              message: `Componente "${comp.name}" agregado.`,
                            });
                          } else {
                            handleCreateContainerSection(comp.kind);
                          }
                        }}
                        className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-white hover:bg-blue-50/40 border border-zinc-200 hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing shadow-2xs select-none"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-blue-100 text-zinc-600 group-hover:text-blue-600 transition-colors">
                          <CompIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-semibold text-zinc-800 group-hover:text-blue-900 truncate">
                              {comp.name}
                            </span>
                            <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 group-hover:bg-blue-100 group-hover:text-blue-700 shrink-0">
                              {comp.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 line-clamp-1 leading-snug">
                            {comp.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================= */
            /* MÓDULOS TAB: Pre-built full sections & Custom Modules    */
            /* ======================================================= */
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              <div className="p-2.5 border-b border-zinc-200">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                    placeholder="Buscar secciones o módulos..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
                <div>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Módulos Prearmados ({filteredBuiltinModules.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredBuiltinModules.map((mod) => {
                      const Icon = getModuleIcon(mod.moduleKey);
                      return (
                        <button
                          key={mod.moduleKey}
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            try {
                              e.dataTransfer.setData(
                                "application/x-landing-builtin",
                                mod.moduleKey,
                              );
                              e.dataTransfer.setData(
                                "text/plain",
                                `landing-builtin:${mod.moduleKey}`,
                              );
                              e.dataTransfer.effectAllowed = "copy";
                            } catch {
                              // ignore
                            }
                            const win = getDragWindow();
                            if (win) {
                              win.__draggedBuiltinKey = mod.moduleKey;
                            }
                            draggedBuiltinKeyRef.current = mod.moduleKey;
                            setDraggedBuiltinKey(mod.moduleKey);
                          }}
                          onDragEnd={() => {
                            const win = getDragWindow();
                            if (win) {
                              win.__draggedBuiltinKey = null;
                            }
                            draggedBuiltinKeyRef.current = null;
                            setDraggedBuiltinKey(null);
                            setIsDraggingComponentOverCanvas(false);
                          }}
                          onClick={() => handleAddBuiltinBlock(mod)}
                          className="group flex flex-col items-center justify-center text-center p-3 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing"
                          title={mod.description}
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-blue-50 text-zinc-600 group-hover:text-blue-600 mb-2 transition-colors">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-[11px] font-semibold text-zinc-800 line-clamp-2 leading-tight">
                            {mod.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* User's Saved Custom Modules */}
                <div>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                      Mis Módulos Guardados ({filteredCustomModules.length})
                    </span>
                  </div>
                  {filteredCustomModules.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 p-3 text-center bg-zinc-50/50">
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Personalizá cualquier Card o bloque y tocá{" "}
                        <strong className="text-zinc-700">
                          Guardar como Módulo
                        </strong>{" "}
                        para reutilizarlo acá.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredCustomModules.map((cm) => (
                        <div
                          key={cm.id}
                          draggable
                          onDragStart={(e) => {
                            try {
                              e.dataTransfer.setData(
                                "application/x-landing-custom",
                                cm.id,
                              );
                              e.dataTransfer.setData(
                                "text/plain",
                                `landing-custom:${cm.id}`,
                              );
                              e.dataTransfer.effectAllowed = "copy";
                            } catch {
                              // ignore
                            }
                            const win = getDragWindow();
                            if (win) {
                              win.__draggedCustomId = cm.id;
                            }
                            draggedCustomIdRef.current = cm.id;
                            setDraggedCustomId(cm.id);
                          }}
                          onDragEnd={() => {
                            const win = getDragWindow();
                            if (win) {
                              win.__draggedCustomId = null;
                            }
                            draggedCustomIdRef.current = null;
                            setDraggedCustomId(null);
                            setIsDraggingComponentOverCanvas(false);
                          }}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-amber-400 transition-colors cursor-grab shadow-2xs"
                        >
                          <button
                            type="button"
                            onClick={() => handleAddCustomBlock(cm)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                              <Wrench className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-800 truncate">
                                {cm.name}
                              </p>
                              <p className="text-[10px] text-zinc-500 truncate">
                                {cm.fields.length} variables editables
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomModule(cm.id)}
                            className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar módulo guardado"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
            </div>
          </aside>

          {/* Flechita flotante en el medio del borde para cerrar/abrir */}
          <button
            type="button"
            onClick={() => setIsLeftSidebarOpen((prev) => !prev)}
            className="absolute top-1/2 -translate-y-1/2 left-full z-40 flex h-8 w-4.5 items-center justify-center bg-white border-y border-r border-zinc-300 border-l-0 rounded-r-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 hover:w-5 shadow-xs active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            title={
              isLeftSidebarOpen
                ? "Ocultar panel lateral (Capas y Componentes)"
                : "Mostrar panel lateral (Capas y Componentes)"
            }
            aria-label={
              isLeftSidebarOpen
                ? "Ocultar panel lateral"
                : "Mostrar panel lateral"
            }
          >
            {isLeftSidebarOpen ? (
              <ChevronLeft className="h-3.5 w-3.5 -ml-0.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 -ml-0.5" />
            )}
          </button>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* CENTER INTERACTIVE CANVAS + OPTIONAL CODE DRAWER                 */}
        {/* --------------------------------------------------------------- */}
        <div
          className="flex-1 flex flex-col min-w-0 min-h-0 relative"
          style={{
            backgroundColor: "#f4f4f7",
            backgroundImage:
              "radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingComponentOverCanvas(true);
          }}
          onDragLeave={() => setIsDraggingComponentOverCanvas(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingComponentOverCanvas(false);
            const dragWin = getDragWindow();
            let plainText = "";
            try {
              plainText = e.dataTransfer.getData("text/plain") || "";
            } catch {
              // ignore
            }

            let compKind = (e.dataTransfer.getData(
              "application/x-landing-component",
            ) ||
              draggedComponentKindRef.current ||
              dragWin?.__draggedComponentKind) as InsertableInnerElementKind | null;
            if (!compKind && plainText.startsWith("landing-component:")) {
              compKind = plainText.slice(
                "landing-component:".length,
              ) as InsertableInnerElementKind;
            }

            if (compKind) {
              if (selectedBlockIdRef.current) {
                handleInsertInnerElement(
                  selectedBlockIdRef.current,
                  selectedSubElementRef.current?.selector ?? null,
                  compKind,
                );
              } else {
                handleCreateContainerSection(compKind);
              }
              setDraggedComponentKind(null);
              if (dragWin) {
                dragWin.__draggedComponentKind = null;
              }
              return;
            }

            let builtinKey =
              e.dataTransfer.getData("application/x-landing-builtin") ||
              draggedBuiltinKeyRef.current ||
              dragWin?.__draggedBuiltinKey;
            if (!builtinKey && plainText.startsWith("landing-builtin:")) {
              builtinKey = plainText.slice("landing-builtin:".length);
            }
            if (builtinKey) {
              const found = BUILTIN_LANDING_MODULES.find(
                (m) => m.moduleKey === builtinKey,
              );
              if (found) handleAddBuiltinBlock(found);
              setDraggedBuiltinKey(null);
              if (dragWin) {
                dragWin.__draggedBuiltinKey = null;
              }
              return;
            }

            let customId =
              e.dataTransfer.getData("application/x-landing-custom") ||
              draggedCustomIdRef.current ||
              dragWin?.__draggedCustomId;
            if (!customId && plainText.startsWith("landing-custom:")) {
              customId = plainText.slice("landing-custom:".length);
            }
            if (customId) {
              const found = customModules.find((m) => m.id === customId);
              if (found) handleAddCustomBlock(found);
              setDraggedCustomId(null);
              if (dragWin) {
                dragWin.__draggedCustomId = null;
              }
            }
          }}
        >
          {/* Top Canvas Hint Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 text-[11px] text-zinc-600 border-b border-zinc-200 bg-white/90 backdrop-blur-xs shrink-0 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  documentState.mode === "raw"
                    ? "bg-amber-500"
                    : interactiveCanvas
                    ? "bg-blue-500"
                    : "bg-zinc-400"
                }`}
              />
              <span className="truncate">
                {documentState.mode === "raw"
                  ? "Modo HTML Libre activo: estás editando el documento completo manualmente"
                  : interactiveCanvas
                  ? "Lienzo Interactivo: hacé clic en cualquier bloque para seleccionarlo o editá los textos directamente sobre la página"
                  : "Vista previa limpia como visitante"}
              </span>
              {documentState.mode === "raw" && (
                <button
                  type="button"
                  onClick={() =>
                    updateDocument((prev) => ({ ...prev, mode: "visual" }))
                  }
                  className="ml-2 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-semibold shrink-0 transition-colors"
                >
                  Volver al Modo Visual Modular
                </button>
              )}
            </div>
            {lastSavedAt && (
              <span className="text-zinc-400 hidden sm:inline shrink-0" suppressHydrationWarning>
                Guardado{" "}
                {new Date(lastSavedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          {/* Center Artboard Container */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-4 sm:p-6 min-h-0">
            <div
              className={`bg-white rounded-xl overflow-hidden shadow-[0_16px_45px_rgba(0,0,0,0.12)] border transition-all duration-300 flex flex-col ${
                isDraggingComponentOverCanvas
                  ? "border-blue-400 ring-4 ring-blue-400/20"
                  : "border-zinc-300"
              } ${
                viewport === "desktop"
                  ? "w-full h-full"
                  : viewport === "tablet"
                  ? "w-[768px] h-full max-w-full"
                  : "w-[390px] h-[780px] max-w-full my-auto rounded-[28px] border-[6px] border-zinc-700"
              }`}
            >
              {/* Subtle Browser Top Chrome on Desktop/Tablet */}
              {viewport !== "mobile" && (
                <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-100 border-b border-zinc-200 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="px-3 py-0.5 rounded-md bg-white border border-zinc-200 text-[11px] font-mono text-zinc-600 shadow-2xs">
                    /l/{tenant.slug}
                  </div>
                  <div className="w-10" />
                </div>
              )}

              <iframe
                ref={iframeRef}
                title="Lienzo Visual de Landing"
                srcDoc={debouncedSrcDoc}
                sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                onLoad={() => {
                  iframeRef.current?.contentWindow?.postMessage(
                    {
                      type: "LANDING_SYNC_STATE",
                      blockId: selectedBlockIdRef.current,
                      scrollY: iframeScrollYRef.current,
                      previewMode: !interactiveCanvasRef.current,
                    },
                    "*",
                  );
                }}
                className="w-full flex-1 border-0 bg-white"
              />
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* RIGHT SIDEBAR: Properties & Design (OpenPage / Framely style)   */}
        {/* --------------------------------------------------------------- */}
        <aside className="w-96 bg-white border-l border-zinc-200 flex flex-col shrink-0 min-h-0">
          {/* Top Tabs: Propiedades | Diseño Global */}
          <div className="grid grid-cols-2 border-b border-zinc-200 bg-white">
            <button
              type="button"
              onClick={() => setRightTab("properties")}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                rightTab === "properties"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Propiedades
            </button>
            <button
              type="button"
              onClick={() => setRightTab("design")}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                rightTab === "design"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              Diseño Global
            </button>
          </div>

          {rightTab === "properties" ? (
            /* ============================================================= */
            /* PROPERTIES TAB (Block & Granular Sub-Element Inspector)       */
            /* ============================================================= */
            selectedBlock ? (
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-200">
                {/* Breadcrumb Hierarchy Bar + Ver Código Action */}
                <div className="bg-zinc-50 border-b border-zinc-200/70 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1 text-[11px] min-w-0">
                    <button
                      type="button"
                      onClick={() => selectSubElementOnStudio(selectedBlock.id, null)}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold transition shrink-0 ${
                        !activeSubElement
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                      }`}
                      title="Seleccionar sección completa"
                    >
                      <Layers className="h-3 w-3" />
                      <span className="max-w-28 truncate">{selectedBlock.name}</span>
                    </button>

                    {activeSubElement?.ancestors.map((anc) => (
                      <React.Fragment key={anc.selector}>
                        <span className="text-zinc-400">›</span>
                        <button
                          type="button"
                          onClick={() =>
                            selectSubElementOnStudio(selectedBlock.id, anc.selector)
                          }
                          className="rounded px-1.5 py-0.5 font-medium text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 truncate max-w-24"
                        >
                          {anc.label}
                        </button>
                      </React.Fragment>
                    ))}

                    {activeSubElement && (
                      <>
                        <span className="text-zinc-400">›</span>
                        <span className="inline-flex items-center gap-1 rounded bg-violet-600 px-1.5 py-0.5 font-semibold text-white shadow-2xs truncate max-w-28">
                          {activeSubElement.label}
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCodeDrawerMode("block");
                      setCodeTab("html");
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200 text-xs font-semibold shrink-0 shadow-2xs transition-colors"
                    title="Ver y editar el código HTML/CSS/JS de este bloque a pantalla completa"
                  >
                    <Code2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Ver Código</span>
                  </button>
                </div>

                {activeSubElement ? (
                  /* ========================================================= */
                  /* GRANULAR SUB-ELEMENT INSPECTOR                            */
                  /* ========================================================= */
                  <div key={activeSubElement.selector} className="divide-y divide-zinc-200">
                    {/* Sub-Element Header & Structural Actions */}
                    <div className="p-3.5 space-y-3 bg-violet-50/35 border-b border-zinc-200">
                      <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-200">
                                {activeSubElement.label}
                              </span>
                              <code className="text-[10px] text-zinc-500 font-mono">
                                &lt;{activeSubElement.tagName}&gt;
                              </code>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setCodeDrawerMode("block");
                                  setCodeTab("html");
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white hover:bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 transition-colors shadow-2xs"
                                title="Ver código HTML/CSS/JS en pantalla completa"
                              >
                                <Code2 className="h-3 w-3 text-blue-600" />
                                Código
                              </button>
                              {hasSubStyleOverrides && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResetSubElementStyles(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                    )
                                  }
                                  className="text-[10px] text-violet-700 hover:text-red-600 font-semibold px-2 py-0.5 rounded border border-violet-200 bg-white hover:bg-red-50 transition-colors"
                                  title="Restablecer todos los estilos personalizados de este elemento"
                                >
                                  Reset estilos
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  selectSubElementOnStudio(selectedBlock.id, null)
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100"
                                title="Volver a las propiedades del bloque"
                              >
                                <CornerLeftUp className="h-3 w-3" />
                                Bloque
                              </button>
                            </div>
                          </div>

                          {/* Structural Actions: Move, Duplicate, Delete */}
                          <div className="grid grid-cols-4 gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveSubElement(
                                  selectedBlock.id,
                                  activeSubElement.selector,
                                  "prev",
                                )
                              }
                              className="flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white py-1.5 px-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                              title="Mover antes del elemento anterior"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                              Antes
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveSubElement(
                                  selectedBlock.id,
                                  activeSubElement.selector,
                                  "next",
                                )
                              }
                              className="flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white py-1.5 px-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                              title="Mover después del elemento siguiente"
                            >
                              Después
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDuplicateSubElement(
                                  selectedBlock.id,
                                  activeSubElement.selector,
                                )
                              }
                              className="flex items-center justify-center gap-1 rounded-lg border border-violet-200 bg-violet-600 py-1.5 px-2 text-[11px] font-semibold text-white hover:bg-violet-500"
                              title="Duplicar este elemento con variables propias"
                            >
                              <Copy className="h-3 w-3" />
                              Duplicar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSubElement(
                                  selectedBlock.id,
                                  activeSubElement.selector,
                                )
                              }
                              className="flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-white py-1.5 px-2 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                              title="Eliminar este elemento"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Parent Repeatable Card Helper */}
                          {repeatableParent && (
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-violet-200/80 bg-white px-2.5 py-2">
                              <div className="min-w-0">
                                <span className="block text-[10px] font-semibold text-zinc-500">
                                  Contenedor: {repeatableParent.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    selectSubElementOnStudio(
                                      selectedBlock.id,
                                      repeatableParent.selector,
                                    )
                                  }
                                  className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  Seleccionar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDuplicateSubElement(
                                      selectedBlock.id,
                                      repeatableParent.selector,
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded bg-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-800 hover:bg-violet-200"
                                >
                                  <Copy className="h-2.5 w-2.5" />
                                  Duplicar {repeatableParent.label}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Direct Content / Attributes (Text, Image, Link) */}
                        {(activeSubElement.boundTextField ||
                          activeSubElement.isImage ||
                          activeSubElement.isLink) && (
                          <StudioInspectorSection
                            title="Contenido del Elemento"
                            description="Textos, enlaces e imágenes vinculadas"
                            icon={<Type className="h-3.5 w-3.5" />}
                          >
                            {activeSubElement.boundTextField && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-medium text-zinc-700">
                                    Texto visible
                                  </label>
                                  <code className="text-[10px] text-zinc-400 font-mono">
                                    {`{{${activeSubElement.boundTextField}}}`}
                                  </code>
                                </div>
                                <textarea
                                  rows={2}
                                  value={
                                    selectedBlock.values[
                                      activeSubElement.boundTextField
                                    ] ?? ""
                                  }
                                  onChange={(e) =>
                                    handleUpdateBlockValue(
                                      selectedBlock.id,
                                      activeSubElement.boundTextField!,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white"
                                />
                              </div>
                            )}

                            {activeSubElement.isImage && (
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                                  <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                                    {effectiveSrc ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={effectiveSrc}
                                        alt={effectiveAlt || "Imagen"}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-zinc-300">
                                        <ImageIcon className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMediaPickerTarget({
                                          kind: "sub-img",
                                          blockId: selectedBlock.id,
                                          selector: activeSubElement.selector,
                                          boundSrcField:
                                            activeSubElement.boundSrcField,
                                          boundAltField:
                                            activeSubElement.boundAltField,
                                          currentUrl: effectiveSrc,
                                          title: "Seleccionar o Subir Imagen",
                                        })
                                      }
                                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-2xs"
                                    >
                                      <ImageIcon className="h-3.5 w-3.5" />
                                      Elegir / Subir Imagen
                                    </button>
                                    <p className="mt-1 text-[10px] text-zinc-500 truncate">
                                      Galeria del restaurante o URL
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                                    URL de imagen (src)
                                  </label>
                                  <input
                                    type="text"
                                    value={effectiveSrc}
                                    onChange={(e) => {
                                      if (activeSubElement.boundSrcField) {
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          activeSubElement.boundSrcField,
                                          e.target.value,
                                        );
                                      } else {
                                        handleUpdateSubElementAttribute(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          "src",
                                          e.target.value,
                                        );
                                      }
                                    }}
                                    className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                                      Texto alternativo (alt)
                                    </label>
                                    <input
                                      type="text"
                                      value={effectiveAlt}
                                      onChange={(e) => {
                                        if (activeSubElement.boundAltField) {
                                          handleUpdateBlockValue(
                                            selectedBlock.id,
                                            activeSubElement.boundAltField,
                                            e.target.value,
                                          );
                                        } else {
                                          handleUpdateSubElementAttribute(
                                            selectedBlock.id,
                                            activeSubElement.selector,
                                            "alt",
                                            e.target.value,
                                          );
                                        }
                                      }}
                                      className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-900 focus:bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                                      Encuadre (Fit)
                                    </label>
                                    <select
                                      value={curStyle.objectFit || "cover"}
                                      onChange={(e) =>
                                        handleUpdateSubElementStyle(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          { objectFit: e.target.value },
                                        )
                                      }
                                      className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                                    >
                                      <option value="cover">Cubrir (Cover)</option>
                                      <option value="contain">Ajustar (Contain)</option>
                                      <option value="fill">Estirar (Fill)</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeSubElement.isLink && (
                              <div className="space-y-2.5">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-medium text-zinc-700 flex items-center gap-1">
                                      <Link2 className="h-3 w-3 text-zinc-400" />
                                      Destino del Botón / Enlace (href)
                                    </label>
                                    {effectiveHref.startsWith("#") &&
                                      effectiveHref.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handlePreviewScrollToAnchor(
                                              effectiveHref,
                                            )
                                          }
                                          className="inline-flex items-center gap-1 rounded bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100"
                                          title="Desplazar el lienzo hasta esta sección para probar el ancla"
                                        >
                                          Probar scroll ⤵
                                        </button>
                                      )}
                                  </div>
                                  <input
                                    type="text"
                                    value={effectiveHref}
                                    onChange={(e) => {
                                      if (activeSubElement.boundHrefField) {
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          activeSubElement.boundHrefField,
                                          e.target.value,
                                        );
                                      } else {
                                        handleUpdateSubElementAttribute(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          "href",
                                          e.target.value,
                                        );
                                      }
                                    }}
                                    placeholder="/m/mi-restaurante o #destacados"
                                    className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                                  />
                                </div>

                                {/* Selector directo de secciones reales de la página */}
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                                    Ir a una sección de tu página (Scroll):
                                  </label>
                                  <select
                                    value={
                                      pageAnchors.some(
                                        (a) => a.href === effectiveHref,
                                      )
                                        ? effectiveHref
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (!val) return;
                                      if (activeSubElement.boundHrefField) {
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          activeSubElement.boundHrefField,
                                          val,
                                        );
                                      } else {
                                        handleUpdateSubElementAttribute(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          "href",
                                          val,
                                        );
                                      }
                                      handlePreviewScrollToAnchor(val);
                                    }}
                                    className="w-full rounded-lg bg-white border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-violet-500"
                                  >
                                    <option value="">
                                      — Elegir sección de la página —
                                    </option>
                                    {pageAnchors.map((anc) => (
                                      <option key={anc.blockId} value={anc.href}>
                                        📍 {anc.blockName} ({anc.href})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = `/m/${tenant.slug}`;
                                      if (activeSubElement.boundHrefField) {
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          activeSubElement.boundHrefField,
                                          url,
                                        );
                                      } else {
                                        handleUpdateSubElementAttribute(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          "href",
                                          url,
                                        );
                                      }
                                    }}
                                    className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition ${
                                      effectiveHref === `/m/${tenant.slug}`
                                        ? "border-blue-300 bg-blue-50 text-blue-800"
                                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                    }`}
                                  >
                                    Carta Digital
                                  </button>
                                  {pageAnchors.map((anc) => (
                                    <button
                                      key={anc.blockId}
                                      type="button"
                                      onClick={() => {
                                        if (activeSubElement.boundHrefField) {
                                          handleUpdateBlockValue(
                                            selectedBlock.id,
                                            activeSubElement.boundHrefField,
                                            anc.href,
                                          );
                                        } else {
                                          handleUpdateSubElementAttribute(
                                            selectedBlock.id,
                                            activeSubElement.selector,
                                            "href",
                                            anc.href,
                                          );
                                        }
                                        handlePreviewScrollToAnchor(anc.href);
                                      }}
                                      title={`Hacer scroll a: ${anc.blockName}`}
                                      className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition ${
                                        effectiveHref === anc.href
                                          ? "border-violet-300 bg-violet-100 text-violet-900 font-semibold"
                                          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                      }`}
                                    >
                                      {anc.href}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = "https://wa.me/";
                                      if (activeSubElement.boundHrefField) {
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          activeSubElement.boundHrefField,
                                          url,
                                        );
                                      } else {
                                        handleUpdateSubElementAttribute(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          "href",
                                          url,
                                        );
                                      }
                                    }}
                                    className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                  >
                                    WhatsApp
                                  </button>
                                </div>
                              </div>
                            )}
                          </StudioInspectorSection>
                        )}

                        {/* Disposición (Display, Flexbox y CSS Grid) */}
                        <StudioInspectorSection
                          title="Disposición (Display, Flex y Grid)"
                          description="Modo de caja, alineación de hijos, columnas y gap"
                          icon={<Rows className="h-3.5 w-3.5" />}
                          badge={
                            Boolean(
                              curStyle.display ||
                                curStyle.flexDirection ||
                                curStyle.justifyContent ||
                                curStyle.alignItems ||
                                curStyle.flexWrap ||
                                curStyle.gridTemplateColumns ||
                                curStyle.gap ||
                                curStyle.rowGap ||
                                curStyle.columnGap ||
                                curStyle.flexGrow ||
                                curStyle.alignSelf ||
                                curStyle.gridColumn,
                            ) ? (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-violet-500"
                                title="Disposición Flex/Grid personalizada"
                              />
                            ) : undefined
                          }
                          action={
                            Boolean(
                              curStyle.display ||
                                curStyle.flexDirection ||
                                curStyle.justifyContent ||
                                curStyle.alignItems ||
                                curStyle.flexWrap ||
                                curStyle.gridTemplateColumns ||
                                curStyle.gap ||
                                curStyle.rowGap ||
                                curStyle.columnGap ||
                                curStyle.flexGrow ||
                                curStyle.alignSelf ||
                                curStyle.gridColumn,
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      display: "",
                                      flexDirection: "",
                                      flexWrap: "",
                                      justifyContent: "",
                                      alignItems: "",
                                      justifyItems: "",
                                      gridTemplateColumns: "",
                                      gap: "",
                                      rowGap: "",
                                      columnGap: "",
                                      flexGrow: "",
                                      flexShrink: "",
                                      alignSelf: "",
                                      gridColumn: "",
                                    },
                                  )
                                }
                                className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                title="Restablecer disposición"
                              >
                                Reset
                              </button>
                            ) : undefined
                          }
                        >
                          <StudioLayoutAndDisplayEditor
                            style={curStyle}
                            computedStyles={activeSubElement.computedStyles}
                            onUpdateStyle={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                          />
                        </StudioInspectorSection>

                        {/* Granular CSS Style Overrides for Sub-Element */}
                        {!activeSubElement.isImage && (
                          <StudioInspectorSection
                            title="Tipografía y Alineación"
                            description="Fuente, tamaño, grosor, interlineado, color y estilo"
                            icon={<Type className="h-3.5 w-3.5" />}
                            badge={
                              Boolean(
                                curStyle.fontFamily ||
                                  curStyle.fontSize ||
                                  curStyle.fontWeight ||
                                  curStyle.fontStyle ||
                                  curStyle.lineHeight ||
                                  curStyle.letterSpacing ||
                                  curStyle.textTransform ||
                                  curStyle.textDecoration ||
                                  curStyle.color ||
                                  curStyle.textAlign,
                              ) ? (
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                  title="Estilos tipográficos personalizados"
                                />
                              ) : undefined
                            }
                            action={
                              Boolean(
                                curStyle.fontFamily ||
                                  curStyle.fontSize ||
                                  curStyle.fontWeight ||
                                  curStyle.fontStyle ||
                                  curStyle.lineHeight ||
                                  curStyle.letterSpacing ||
                                  curStyle.textTransform ||
                                  curStyle.textDecoration ||
                                  curStyle.color ||
                                  curStyle.textAlign,
                              ) ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSubElementStyle(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                      {
                                        fontFamily: "",
                                        fontSize: "",
                                        fontWeight: "",
                                        fontStyle: "",
                                        lineHeight: "",
                                        letterSpacing: "",
                                        textTransform: "",
                                        textDecoration: "",
                                        color: "",
                                        textAlign: "",
                                      },
                                    )
                                  }
                                  className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                  title="Restablecer tipografía"
                                >
                                  Reset
                                </button>
                              ) : undefined
                            }
                          >
                            {/* Font Family */}
                            <div>
                              <span className="block text-[11px] text-zinc-600 mb-1">
                                Familia Tipográfica
                              </span>
                              <select
                                value={curStyle.fontFamily || ""}
                                onChange={(e) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    { fontFamily: e.target.value },
                                  )
                                }
                                className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                              >
                                <option value="">Heredar del tema</option>
                                <option value="var(--font-heading)">
                                  Fuente de Títulos (Tema)
                                </option>
                                <option value="var(--font-body)">
                                  Fuente de Cuerpo (Tema)
                                </option>
                                <option value="'Playfair Display', Georgia, serif">
                                  Playfair Display (Serif)
                                </option>
                                <option value="'Plus Jakarta Sans', system-ui, sans-serif">
                                  Plus Jakarta Sans
                                </option>
                                <option value="'Inter', system-ui, sans-serif">
                                  Inter (Sans-Serif)
                                </option>
                                <option value="ui-monospace, SFMono-Regular, monospace">
                                  Monospace (Código / Precio)
                                </option>
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Tamaño de Letra
                                </span>
                                <div className="flex items-center gap-1">
                                  <select
                                    value={curStyle.fontSize || ""}
                                    onChange={(e) =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        { fontSize: e.target.value },
                                      )
                                    }
                                    className="flex-1 min-w-0 rounded-lg bg-zinc-50 border border-zinc-200 px-1.5 py-1.5 text-xs text-zinc-800"
                                  >
                                    <option value="">Auto</option>
                                    <option value="12px">12px</option>
                                    <option value="14px">14px</option>
                                    <option value="16px">16px</option>
                                    <option value="18px">18px</option>
                                    <option value="20px">20px</option>
                                    <option value="24px">24px</option>
                                    <option value="32px">32px</option>
                                    <option value="40px">40px</option>
                                    <option value="48px">48px</option>
                                    <option value="56px">56px</option>
                                    <option value="64px">64px</option>
                                  </select>
                                  <DirectionalInput
                                    value={curStyle.fontSize}
                                    placeholder={
                                      activeSubElement.computedStyles?.fontSize ||
                                      "16px"
                                    }
                                    title="Tamaño exacto (px, rem, clamp)"
                                    onChange={(val) =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        { fontSize: val },
                                      )
                                    }
                                  />
                                </div>
                              </div>
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Peso (Grosor)
                                </span>
                                <select
                                  value={curStyle.fontWeight || ""}
                                  onChange={(e) =>
                                    handleUpdateSubElementStyle(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                      { fontWeight: e.target.value },
                                    )
                                  }
                                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                                >
                                  <option value="">Por defecto</option>
                                  <option value="300">300 Light</option>
                                  <option value="400">400 Normal</option>
                                  <option value="500">500 Medium</option>
                                  <option value="600">600 Semibold</option>
                                  <option value="700">700 Bold</option>
                                  <option value="800">800 ExtraBold</option>
                                </select>
                              </div>
                            </div>

                            {/* Line Height & Letter Spacing */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Interlineado (Line Height)
                                </span>
                                <select
                                  value={curStyle.lineHeight || ""}
                                  onChange={(e) =>
                                    handleUpdateSubElementStyle(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                      { lineHeight: e.target.value },
                                    )
                                  }
                                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
                                >
                                  <option value="">Auto</option>
                                  <option value="1">1.0 (Compacto)</option>
                                  <option value="1.15">1.15 (Titular)</option>
                                  <option value="1.3">1.3 (Subtítulo)</option>
                                  <option value="1.5">1.5 (Normal)</option>
                                  <option value="1.7">1.7 (Lectura amplia)</option>
                                </select>
                              </div>
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Espaciado Letras (Tracking)
                                </span>
                                <select
                                  value={curStyle.letterSpacing || ""}
                                  onChange={(e) =>
                                    handleUpdateSubElementStyle(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                      { letterSpacing: e.target.value },
                                    )
                                  }
                                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
                                >
                                  <option value="">Normal</option>
                                  <option value="-0.03em">-0.03em (Ajustado)</option>
                                  <option value="-0.015em">-0.015em (Suave)</option>
                                  <option value="0.04em">+0.04em (Abierto)</option>
                                  <option value="0.1em">+0.10em (Etiqueta)</option>
                                  <option value="0.18em">+0.18em (Kicker)</option>
                                </select>
                              </div>
                            </div>

                            {/* Transform, Decoration & Style */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Transformación
                                </span>
                                <div className="grid grid-cols-4 gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                                  {[
                                    { val: "", label: "Aa" },
                                    { val: "uppercase", label: "AA" },
                                    { val: "capitalize", label: "Ab" },
                                    { val: "lowercase", label: "aa" },
                                  ].map((tt) => (
                                    <button
                                      key={tt.label}
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSubElementStyle(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          { textTransform: tt.val },
                                        )
                                      }
                                      className={`py-1 rounded text-[10px] font-semibold transition-colors ${
                                        (curStyle.textTransform || "") === tt.val
                                          ? "bg-white text-zinc-900 shadow-2xs"
                                          : "text-zinc-500 hover:text-zinc-800"
                                      }`}
                                    >
                                      {tt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Estilo y Subrayado
                                </span>
                                <div className="grid grid-cols-3 gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        {
                                          fontStyle:
                                            curStyle.fontStyle === "italic"
                                              ? ""
                                              : "italic",
                                        },
                                      )
                                    }
                                    className={`py-1 rounded text-[10px] italic font-serif font-semibold transition-colors ${
                                      curStyle.fontStyle === "italic"
                                        ? "bg-white text-zinc-900 shadow-2xs"
                                        : "text-zinc-500 hover:text-zinc-800"
                                    }`}
                                    title="Cursiva (Italic)"
                                  >
                                    I
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        {
                                          textDecoration:
                                            curStyle.textDecoration ===
                                            "underline"
                                              ? ""
                                              : "underline",
                                        },
                                      )
                                    }
                                    className={`py-1 rounded text-[10px] underline font-semibold transition-colors ${
                                      curStyle.textDecoration === "underline"
                                        ? "bg-white text-zinc-900 shadow-2xs"
                                        : "text-zinc-500 hover:text-zinc-800"
                                    }`}
                                    title="Subrayado (Underline)"
                                  >
                                    U
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        {
                                          textDecoration:
                                            curStyle.textDecoration === "none"
                                              ? ""
                                              : "none",
                                        },
                                      )
                                    }
                                    className={`py-1 rounded text-[10px] font-semibold transition-colors ${
                                      curStyle.textDecoration === "none"
                                        ? "bg-white text-zinc-900 shadow-2xs"
                                        : "text-zinc-500 hover:text-zinc-800"
                                    }`}
                                    title="Sin subrayado (text-decoration: none)"
                                  >
                                    Sin U
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Text Color with Alpha */}
                            <div className="pt-1 border-t border-zinc-100">
                              <StudioAlphaColorField
                                label="Color de Texto"
                                value={curStyle.color ?? ""}
                                defaultColor={documentState.theme.textColor}
                                onChange={(val) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    { color: val },
                                  )
                                }
                              />
                            </div>

                            {/* Text Align */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                              <span className="text-xs text-zinc-600">
                                Alineación de Texto
                              </span>
                              <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                                {[
                                  { val: "left", icon: AlignLeft },
                                  { val: "center", icon: AlignCenter },
                                  { val: "right", icon: AlignRight },
                                ].map(({ val, icon: AlignIcon }) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        {
                                          textAlign:
                                            curStyle.textAlign === val
                                              ? ""
                                              : val,
                                        },
                                      )
                                    }
                                    className={`p-1.5 rounded-md transition-colors ${
                                      curStyle.textAlign === val
                                        ? "bg-white text-zinc-900 shadow-2xs"
                                        : "text-zinc-500 hover:text-zinc-800"
                                    }`}
                                  >
                                    <AlignIcon className="h-3.5 w-3.5" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </StudioInspectorSection>
                        )}

                        {/* Background Color, Transparency & Opacity */}
                        <StudioInspectorSection
                          title="Fondo y Transparencia"
                          description="Color de relleno, desenfoque y opacidad de capa"
                          icon={<Paintbrush className="h-3.5 w-3.5" />}
                          badge={
                            Boolean(
                              curStyle.backgroundColor ||
                                curStyle.backgroundImage ||
                                curStyle.backdropFilter ||
                                (curStyle.opacity && curStyle.opacity !== "1"),
                            ) ? (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                title="Fondo u opacidad personalizada"
                              />
                            ) : undefined
                          }
                          action={
                            Boolean(
                              curStyle.backgroundColor ||
                                curStyle.backgroundImage ||
                                curStyle.backdropFilter ||
                                (curStyle.opacity && curStyle.opacity !== "1"),
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      backgroundColor: "",
                                      backgroundImage: "",
                                      backdropFilter: "",
                                      opacity: "",
                                    },
                                  )
                                }
                                className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                title="Restablecer fondo y opacidad"
                              >
                                Reset
                              </button>
                            ) : undefined
                          }
                        >
                          {/* Background Color with Alpha & Transparency Controls */}
                          <StudioAlphaColorField
                            label="Color de Fondo"
                            value={curStyle.backgroundColor ?? ""}
                            defaultColor={documentState.theme.cardBgColor}
                            onChange={(val) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                { backgroundColor: val },
                              )
                            }
                          />

                          {/* Background Image for Container / Card */}
                          {!activeSubElement.isImage && (
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                              <span className="text-xs text-zinc-600">
                                Imagen de Fondo
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMediaPickerTarget({
                                      kind: "sub-bg",
                                      blockId: selectedBlock.id,
                                      selector: activeSubElement.selector,
                                      currentUrl:
                                        curStyle.backgroundImage ?? "",
                                      title: "Imagen de Fondo del Elemento",
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  <ImageIcon className="h-3 w-3 text-blue-600" />
                                  {curStyle.backgroundImage
                                    ? "Cambiar fondo"
                                    : "Elegir imagen"}
                                </button>
                                {curStyle.backgroundImage && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        { backgroundImage: "" },
                                      )
                                    }
                                    className="p-1 text-zinc-400 hover:text-red-600"
                                    title="Quitar imagen de fondo"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Backdrop Blur (Glassmorphism) */}
                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-100">
                            <span className="text-xs text-zinc-600">
                              Efecto Cristal (Blur)
                            </span>
                            <div className="flex items-center gap-1">
                              {[
                                { label: "No", val: "" },
                                { label: "Suave", val: "blur(6px)" },
                                { label: "Medio", val: "blur(12px)" },
                                { label: "Fuerte", val: "blur(20px)" },
                              ].map((bf) => (
                                <button
                                  key={bf.label}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSubElementStyle(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                      { backdropFilter: bf.val },
                                    )
                                  }
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                    (curStyle.backdropFilter || "") === bf.val
                                      ? "bg-blue-600 text-white font-semibold"
                                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                                  }`}
                                >
                                  {bf.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Whole Element Opacity / Layer Transparency */}
                          <div className="pt-2 border-t border-zinc-100">
                            <StudioElementOpacityField
                              label="Opacidad del Elemento"
                              description="Transparencia de toda la capa y su contenido"
                              value={curStyle.opacity ?? ""}
                              onChange={(val) =>
                                handleUpdateSubElementStyle(
                                  selectedBlock.id,
                                  activeSubElement.selector,
                                  { opacity: val },
                                )
                              }
                            />
                          </div>
                        </StudioInspectorSection>

                        {/* Espaciado del Elemento */}
                        <StudioInspectorSection
                          title="Espaciado (Padding y Margen)"
                          description="Espacio interno y separación externa"
                          icon={<Scan className="h-3.5 w-3.5" />}
                          badge={
                            Boolean(
                              curStyle.paddingTop ||
                                curStyle.paddingRight ||
                                curStyle.paddingBottom ||
                                curStyle.paddingLeft ||
                                curStyle.marginTop ||
                                curStyle.marginRight ||
                                curStyle.marginBottom ||
                                curStyle.marginLeft,
                            ) ? (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                title="Espaciado personalizado"
                              />
                            ) : undefined
                          }
                          action={
                            Boolean(
                              curStyle.paddingTop ||
                                curStyle.paddingRight ||
                                curStyle.paddingBottom ||
                                curStyle.paddingLeft ||
                                curStyle.marginTop ||
                                curStyle.marginRight ||
                                curStyle.marginBottom ||
                                curStyle.marginLeft,
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      paddingTop: "",
                                      paddingRight: "",
                                      paddingBottom: "",
                                      paddingLeft: "",
                                      marginTop: "",
                                      marginRight: "",
                                      marginBottom: "",
                                      marginLeft: "",
                                    },
                                  )
                                }
                                className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                title="Limpiar espaciado"
                              >
                                Reset
                              </button>
                            ) : undefined
                          }
                        >
                          <BoxModelSpacingEditor
                            paddingTop={curStyle.paddingTop}
                            paddingRight={curStyle.paddingRight}
                            paddingBottom={curStyle.paddingBottom}
                            paddingLeft={curStyle.paddingLeft}
                            marginTop={curStyle.marginTop}
                            marginRight={curStyle.marginRight}
                            marginBottom={curStyle.marginBottom}
                            marginLeft={curStyle.marginLeft}
                            computedStyles={activeSubElement.computedStyles}
                            onUpdatePadding={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                            onUpdateMargin={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                          />
                        </StudioInspectorSection>

                        {/* Dimensiones y Posición */}
                        <StudioInspectorSection
                          title="Dimensiones y Posición"
                          description="Ancho, alto, proporción, overflow y posición"
                          icon={<Columns className="h-3.5 w-3.5" />}
                          badge={
                            Boolean(
                              curStyle.width ||
                                curStyle.minWidth ||
                                curStyle.maxWidth ||
                                curStyle.height ||
                                curStyle.minHeight ||
                                curStyle.maxHeight ||
                                curStyle.aspectRatio ||
                                curStyle.overflow ||
                                curStyle.position ||
                                curStyle.zIndex,
                            ) ? (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                title="Dimensiones o posición personalizada"
                              />
                            ) : undefined
                          }
                          action={
                            Boolean(
                              curStyle.width ||
                                curStyle.minWidth ||
                                curStyle.maxWidth ||
                                curStyle.height ||
                                curStyle.minHeight ||
                                curStyle.maxHeight ||
                                curStyle.aspectRatio ||
                                curStyle.overflow ||
                                curStyle.position ||
                                curStyle.zIndex,
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      width: "",
                                      minWidth: "",
                                      maxWidth: "",
                                      height: "",
                                      minHeight: "",
                                      maxHeight: "",
                                      aspectRatio: "",
                                      overflow: "",
                                      position: "",
                                      zIndex: "",
                                    },
                                  )
                                }
                                className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                title="Restablecer dimensiones y posición"
                              >
                                Reset
                              </button>
                            ) : undefined
                          }
                        >
                          <StudioDimensionsAndPositionEditor
                            style={curStyle}
                            computedStyles={activeSubElement.computedStyles}
                            onUpdateStyle={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                          />
                        </StudioInspectorSection>

                        {/* Border & Corner Radius */}
                        <StudioInspectorSection
                          title="Bordes y Esquinas"
                          description="Grosor por lado, esquinas redondeadas y elevación"
                          icon={<Square className="h-3.5 w-3.5" />}
                          badge={
                            Boolean(
                              curStyle.borderWidth ||
                                curStyle.borderTopWidth ||
                                curStyle.borderRightWidth ||
                                curStyle.borderBottomWidth ||
                                curStyle.borderLeftWidth ||
                                curStyle.borderRadius ||
                                curStyle.borderTopLeftRadius ||
                                curStyle.borderTopRightRadius ||
                                curStyle.borderBottomRightRadius ||
                                curStyle.borderBottomLeftRadius ||
                                curStyle.borderColor ||
                                curStyle.boxShadow,
                            ) ? (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                title="Bordes o esquinas personalizadas"
                              />
                            ) : undefined
                          }
                          action={
                            Boolean(
                              curStyle.borderWidth ||
                                curStyle.borderTopWidth ||
                                curStyle.borderRightWidth ||
                                curStyle.borderBottomWidth ||
                                curStyle.borderLeftWidth ||
                                curStyle.borderRadius ||
                                curStyle.borderTopLeftRadius ||
                                curStyle.borderTopRightRadius ||
                                curStyle.borderBottomRightRadius ||
                                curStyle.borderBottomLeftRadius ||
                                curStyle.borderColor ||
                                curStyle.boxShadow,
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      borderWidth: "",
                                      borderTopWidth: "",
                                      borderRightWidth: "",
                                      borderBottomWidth: "",
                                      borderLeftWidth: "",
                                      borderStyle: "",
                                      borderRadius: "",
                                      borderTopLeftRadius: "",
                                      borderTopRightRadius: "",
                                      borderBottomRightRadius: "",
                                      borderBottomLeftRadius: "",
                                      borderColor: "",
                                      boxShadow: "",
                                    },
                                  )
                                }
                                className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                title="Restablecer bordes y esquinas"
                              >
                                Reset
                              </button>
                            ) : undefined
                          }
                        >
                          <StudioBordersAndCornersEditor
                            borderWidth={curStyle.borderWidth}
                            borderTopWidth={curStyle.borderTopWidth}
                            borderRightWidth={curStyle.borderRightWidth}
                            borderBottomWidth={curStyle.borderBottomWidth}
                            borderLeftWidth={curStyle.borderLeftWidth}
                            borderColor={curStyle.borderColor}
                            borderStyle={curStyle.borderStyle}
                            defaultBorderColor={documentState.theme.borderColor}
                            borderRadius={curStyle.borderRadius}
                            borderTopLeftRadius={curStyle.borderTopLeftRadius}
                            borderTopRightRadius={curStyle.borderTopRightRadius}
                            borderBottomRightRadius={curStyle.borderBottomRightRadius}
                            borderBottomLeftRadius={curStyle.borderBottomLeftRadius}
                            boxShadow={curStyle.boxShadow}
                            showShadow={true}
                            onUpdateBorders={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                            onUpdateRadius={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                            onUpdateShadow={(shadow) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                { boxShadow: shadow },
                              )
                            }
                          />
                        </StudioInspectorSection>
                      </div>
                ) : (
                  /* ========================================================= */
                  /* BLOCK ROOT INSPECTOR                                      */
                  /* ========================================================= */
                  <div key={selectedBlock.id} className="divide-y divide-zinc-200">
                    {/* Block Header & Module Actions */}
                    <div className="p-3.5 space-y-3 border-b border-zinc-200">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {selectedBlock.moduleKey}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCodeDrawerMode("block");
                              setCodeTab("html");
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white hover:bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 transition-colors shadow-2xs"
                            title="Ver código del módulo a pantalla completa"
                          >
                            <Code2 className="h-3 w-3 text-blue-600" />
                            Código
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveBlock(selectedBlock.id, "up")}
                            className="p-1 rounded bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600 hover:text-zinc-900"
                            title="Subir bloque"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveBlock(selectedBlock.id, "down")
                            }
                            className="p-1 rounded bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600 hover:text-zinc-900"
                            title="Bajar bloque"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateBlock(selectedBlock)}
                            className="p-1 rounded bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600 hover:text-zinc-900"
                            title="Duplicar bloque"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(selectedBlock.id)}
                            className="p-1 rounded bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-600"
                            title="Eliminar bloque"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                          Nombre de la Capa
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.name}
                          onChange={(e) =>
                            handleUpdateBlockName(
                              selectedBlock.id,
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-zinc-600 flex items-center gap-1">
                            <Link2 className="h-3 w-3 text-zinc-400" />
                            Ancla de Scroll (ID de esta sección)
                          </label>
                          {selectedBlockAnchor && (
                            <code className="text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              {selectedBlockAnchor.href}
                            </code>
                          )}
                        </div>
                        <div className="flex items-center rounded-lg bg-zinc-50 border border-zinc-200 focus-within:border-blue-500 focus-within:bg-white overflow-hidden">
                          <span className="px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-400 bg-zinc-100 border-r border-zinc-200">
                            #
                          </span>
                          <input
                            type="text"
                            value={
                              selectedBlock.values.__anchorId ??
                              selectedBlockAnchor?.anchorId ??
                              ""
                            }
                            onChange={(e) =>
                              handleUpdateBlockValue(
                                selectedBlock.id,
                                "__anchorId",
                                sanitizeAnchorSlug(e.target.value),
                              )
                            }
                            placeholder="ej: destacados, galeria, contacto"
                            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs font-mono text-zinc-900 focus:outline-none"
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-500">
                          Cualquier botón con destino{" "}
                          <strong>{selectedBlockAnchor?.href ?? "#seccion"}</strong>{" "}
                          hará scroll suave hasta este bloque.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg border border-violet-200/80 bg-violet-50/50 px-2.5 py-2 text-[11px] text-violet-900">
                        <MousePointerClick className="h-4 w-4 shrink-0 text-violet-600" />
                        <span>
                          Estás editando la <strong>sección completa</strong>. Para modificar un elemento hijo específico (texto, botón, imagen), haz clic directamente en él en el lienzo o selecciónalo en el árbol de <strong>Capas</strong>.
                        </span>
                      </div>

                      {/* Quick Buttons: Edit Module Code & Save as Reusable Module */}
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCodeDrawerMode("block");
                            setCodeTab("html");
                          }}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                            codeDrawerMode === "block"
                              ? "bg-blue-50 text-blue-800 border-blue-300 shadow-2xs"
                              : "bg-blue-50/60 hover:bg-blue-100 text-blue-700 border-blue-200"
                          }`}
                        >
                          <Code2 className="h-3.5 w-3.5 text-blue-600" />
                          Ver Código HTML/JS
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModuleName(selectedBlock.name);
                            setModuleDesc("");
                            setShowSaveModuleModal(true);
                          }}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5 text-emerald-600" />
                          Guardar Módulo
                        </button>
                      </div>
                    </div>

                    {/* Dropdown 1: Section Appearance & Colors */}
                    <StudioInspectorSection
                      title="Apariencia y Colores"
                      description="Fondo, opacidad, imagen y color del texto"
                      icon={<Paintbrush className="h-3.5 w-3.5" />}
                      badge={
                        Boolean(
                          selectedBlock.values.__bgColor ||
                            selectedBlock.values.__bgImage ||
                            selectedBlock.values.__textColor ||
                            selectedBlock.values.__textAlign ||
                            (selectedBlock.values.__opacity &&
                              selectedBlock.values.__opacity !== "1"),
                        ) ? (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-blue-500"
                            title="Apariencia u opacidad personalizada"
                          />
                        ) : undefined
                      }
                      action={
                        Boolean(
                          selectedBlock.values.__bgColor ||
                            selectedBlock.values.__bgImage ||
                            selectedBlock.values.__textColor ||
                            selectedBlock.values.__textAlign ||
                            (selectedBlock.values.__opacity &&
                              selectedBlock.values.__opacity !== "1"),
                        ) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBlockValues(selectedBlock.id, {
                                __bgColor: "",
                                __bgImage: "",
                                __textColor: "",
                                __textAlign: "",
                                __opacity: "",
                              })
                            }
                            className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                            title="Restablecer apariencia y opacidad"
                          >
                            Reset
                          </button>
                        ) : undefined
                      }
                    >
                      {/* Background Color with Alpha & Transparency Controls */}
                      <StudioAlphaColorField
                        label="Color de Fondo"
                        value={
                          typeof selectedBlock.values.__bgColor === "string"
                            ? selectedBlock.values.__bgColor
                            : ""
                        }
                        defaultColor={documentState.theme.bgColor}
                        onChange={(val) =>
                          handleUpdateBlockValue(
                            selectedBlock.id,
                            "__bgColor",
                            val,
                          )
                        }
                      />

                      {/* Background Image */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                        <span className="text-xs text-zinc-600">
                          Imagen de Fondo
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setMediaPickerTarget({
                                kind: "block-bg",
                                blockId: selectedBlock.id,
                                currentUrl:
                                  selectedBlock.values.__bgImage ?? "",
                                title: `Fondo de ${selectedBlock.name}`,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
                          >
                            <ImageIcon className="h-3 w-3 text-blue-600" />
                            {selectedBlock.values.__bgImage
                              ? "Cambiar foto"
                              : "Elegir foto"}
                          </button>
                          {selectedBlock.values.__bgImage && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__bgImage",
                                  "",
                                )
                              }
                              className="p-1 text-zinc-400 hover:text-red-600"
                              title="Quitar imagen de fondo"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Text Color */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                        <span className="text-xs text-zinc-600">Color de Texto</span>
                        <div className="flex items-center gap-1.5">
                          <label
                            className="relative flex items-center justify-center h-6 w-6 rounded-md border border-zinc-300 shadow-2xs cursor-pointer overflow-hidden transition-transform hover:scale-105 shrink-0"
                            style={{
                              backgroundColor:
                                selectedBlock.values.__textColor ||
                                documentState.theme.textColor,
                            }}
                            title="Elegir color de texto de la sección"
                          >
                            <input
                              type="color"
                              value={
                                selectedBlock.values.__textColor ||
                                documentState.theme.textColor
                              }
                              onChange={(e) =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__textColor",
                                  e.target.value,
                                )
                              }
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </label>
                          <input
                            type="text"
                            placeholder="Por defecto"
                            value={selectedBlock.values.__textColor ?? ""}
                            onChange={(e) =>
                              handleUpdateBlockValue(
                                selectedBlock.id,
                                "__textColor",
                                e.target.value,
                              )
                            }
                            className="w-22 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono font-medium text-zinc-800 uppercase focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                          />
                          {selectedBlock.values.__textColor && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__textColor",
                                  "",
                                )
                              }
                              className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                              title="Quitar color personalizado"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Text Alignment */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                        <span className="text-xs text-zinc-600">
                          Alineación de Texto
                        </span>
                        <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                          {[
                            { val: "left", icon: AlignLeft },
                            { val: "center", icon: AlignCenter },
                            { val: "right", icon: AlignRight },
                          ].map(({ val, icon: AlignIcon }) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__textAlign",
                                  selectedBlock.values.__textAlign === val
                                    ? ""
                                    : val,
                                )
                              }
                              className={`p-1.5 rounded-md transition-colors ${
                                selectedBlock.values.__textAlign === val
                                  ? "bg-white text-zinc-900 shadow-2xs"
                                  : "text-zinc-500 hover:text-zinc-800"
                              }`}
                            >
                              <AlignIcon className="h-3.5 w-3.5" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Whole Section Opacity / Layer Transparency */}
                      <div className="pt-2 border-t border-zinc-100">
                        <StudioElementOpacityField
                          label="Opacidad de la Sección"
                          description="Transparencia de todo el bloque y sus elementos"
                          value={
                            typeof selectedBlock.values.__opacity === "string"
                              ? selectedBlock.values.__opacity
                              : ""
                          }
                          onChange={(val) =>
                            handleUpdateBlockValue(
                              selectedBlock.id,
                              "__opacity",
                              val,
                            )
                          }
                        />
                      </div>
                    </StudioInspectorSection>

                    {/* Dropdown 2: Section Layout & Display */}
                    <StudioInspectorSection
                      title="Disposición y Tamaño de la Sección"
                      description="Display Flex/Grid, alineación, gap y alto mínimo"
                      icon={<Rows className="h-3.5 w-3.5" />}
                      badge={
                        Boolean(
                          selectedBlock.values.__display ||
                            selectedBlock.values.__flexDirection ||
                            selectedBlock.values.__justifyContent ||
                            selectedBlock.values.__alignItems ||
                            selectedBlock.values.__gridTemplateColumns ||
                            selectedBlock.values.__gap ||
                            selectedBlock.values.__minHeight ||
                            selectedBlock.values.__overflow,
                        ) ? (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-violet-500"
                            title="Disposición o tamaño de sección personalizado"
                          />
                        ) : undefined
                      }
                      action={
                        Boolean(
                          selectedBlock.values.__display ||
                            selectedBlock.values.__flexDirection ||
                            selectedBlock.values.__justifyContent ||
                            selectedBlock.values.__alignItems ||
                            selectedBlock.values.__gridTemplateColumns ||
                            selectedBlock.values.__gap ||
                            selectedBlock.values.__minHeight ||
                            selectedBlock.values.__overflow,
                        ) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBlockValues(selectedBlock.id, {
                                __display: "",
                                __flexDirection: "",
                                __flexWrap: "",
                                __justifyContent: "",
                                __alignItems: "",
                                __gridTemplateColumns: "",
                                __gap: "",
                                __minHeight: "",
                                __overflow: "",
                              })
                            }
                            className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                            title="Restablecer disposición de sección"
                          >
                            Reset
                          </button>
                        ) : undefined
                      }
                    >
                      <StudioLayoutAndDisplayEditor
                        style={{
                          display: selectedBlock.values.__display || "",
                          flexDirection:
                            selectedBlock.values.__flexDirection || "",
                          flexWrap: selectedBlock.values.__flexWrap || "",
                          justifyContent:
                            selectedBlock.values.__justifyContent || "",
                          alignItems: selectedBlock.values.__alignItems || "",
                          gridTemplateColumns:
                            selectedBlock.values.__gridTemplateColumns || "",
                          gap: selectedBlock.values.__gap || "",
                        }}
                        showChildControls={false}
                        onUpdateStyle={(patch) =>
                          handleUpdateBlockValues(selectedBlock.id, {
                            ...(patch.display !== undefined && {
                              __display: patch.display,
                            }),
                            ...(patch.flexDirection !== undefined && {
                              __flexDirection: patch.flexDirection,
                            }),
                            ...(patch.flexWrap !== undefined && {
                              __flexWrap: patch.flexWrap,
                            }),
                            ...(patch.justifyContent !== undefined && {
                              __justifyContent: patch.justifyContent,
                            }),
                            ...(patch.alignItems !== undefined && {
                              __alignItems: patch.alignItems,
                            }),
                            ...(patch.gridTemplateColumns !== undefined && {
                              __gridTemplateColumns: patch.gridTemplateColumns,
                            }),
                            ...(patch.gap !== undefined && {
                              __gap: patch.gap,
                            }),
                          })
                        }
                      />

                      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-800">
                            Alto Mínimo de Sección (min-height)
                          </span>
                          <div className="w-22">
                            <DirectionalInput
                              value={selectedBlock.values.__minHeight ?? ""}
                              placeholder="auto"
                              title="Alto mínimo de la sección (px, dvh)"
                              onChange={(val) =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__minHeight",
                                  val,
                                )
                              }
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {[
                            { label: "Auto", val: "" },
                            { label: "320px", val: "320px" },
                            { label: "480px", val: "480px" },
                            { label: "640px", val: "640px" },
                            { label: "80dvh", val: "80dvh" },
                            { label: "100dvh", val: "100dvh" },
                          ].map((mh) => (
                            <button
                              key={mh.label}
                              type="button"
                              onClick={() =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__minHeight",
                                  mh.val,
                                )
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                (selectedBlock.values.__minHeight || "") ===
                                mh.val
                                  ? "bg-teal-600 text-white font-semibold"
                                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                              }`}
                            >
                              {mh.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </StudioInspectorSection>

                    {/* Dropdown 3: Section Spacing */}
                    <StudioInspectorSection
                      title="Espaciado de la Sección"
                      description="Padding interno y margen exterior"
                      icon={<Scan className="h-3.5 w-3.5" />}
                      badge={
                        Boolean(
                          selectedBlock.values.__paddingTop ||
                            selectedBlock.values.__paddingBottom ||
                            selectedBlock.values.__paddingLeft ||
                            selectedBlock.values.__paddingRight ||
                            selectedBlock.values.__paddingY ||
                            selectedBlock.values.__paddingX ||
                            selectedBlock.values.__marginTop ||
                            selectedBlock.values.__marginBottom ||
                            selectedBlock.values.__marginLeft ||
                            selectedBlock.values.__marginRight,
                        ) ? (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-blue-500"
                            title="Espaciado personalizado"
                          />
                        ) : undefined
                      }
                      action={
                        Boolean(
                          selectedBlock.values.__paddingTop ||
                            selectedBlock.values.__paddingBottom ||
                            selectedBlock.values.__paddingLeft ||
                            selectedBlock.values.__paddingRight ||
                            selectedBlock.values.__paddingY ||
                            selectedBlock.values.__paddingX ||
                            selectedBlock.values.__marginTop ||
                            selectedBlock.values.__marginBottom ||
                            selectedBlock.values.__marginLeft ||
                            selectedBlock.values.__marginRight,
                        ) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBlockValues(selectedBlock.id, {
                                __paddingTop: "",
                                __paddingBottom: "",
                                __paddingLeft: "",
                                __paddingRight: "",
                                __paddingY: "",
                                __paddingX: "",
                                __marginTop: "",
                                __marginBottom: "",
                                __marginLeft: "",
                                __marginRight: "",
                              })
                            }
                            className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                            title="Restablecer espaciado"
                          >
                            Reset
                          </button>
                        ) : undefined
                      }
                    >
                      <BoxModelSpacingEditor
                        paddingTop={
                          selectedBlock.values.__paddingTop ||
                          selectedBlock.values.__paddingY
                        }
                        paddingRight={
                          selectedBlock.values.__paddingRight ||
                          selectedBlock.values.__paddingX
                        }
                        paddingBottom={
                          selectedBlock.values.__paddingBottom ||
                          selectedBlock.values.__paddingY
                        }
                        paddingLeft={
                          selectedBlock.values.__paddingLeft ||
                          selectedBlock.values.__paddingX
                        }
                        marginTop={selectedBlock.values.__marginTop}
                        marginRight={selectedBlock.values.__marginRight}
                        marginBottom={selectedBlock.values.__marginBottom}
                        marginLeft={selectedBlock.values.__marginLeft}
                        onUpdatePadding={(patch) =>
                          handleUpdateBlockValues(selectedBlock.id, {
                            __paddingTop: patch.paddingTop ?? "",
                            __paddingRight: patch.paddingRight ?? "",
                            __paddingBottom: patch.paddingBottom ?? "",
                            __paddingLeft: patch.paddingLeft ?? "",
                            __paddingY: "",
                            __paddingX: "",
                          })
                        }
                        onUpdateMargin={(patch) =>
                          handleUpdateBlockValues(selectedBlock.id, {
                            __marginTop: patch.marginTop ?? "",
                            __marginRight: patch.marginRight ?? "",
                            __marginBottom: patch.marginBottom ?? "",
                            __marginLeft: patch.marginLeft ?? "",
                          })
                        }
                      />
                    </StudioInspectorSection>

                    {/* Dropdown 3: Border & Corner Radius */}
                    <StudioInspectorSection
                      title="Bordes y Esquinas"
                      description="Grosor por lado y redondeo de esquinas"
                      icon={<Square className="h-3.5 w-3.5" />}
                      badge={
                        Boolean(
                          selectedBlock.values.__borderWidth ||
                            selectedBlock.values.__borderTopWidth ||
                            selectedBlock.values.__borderRightWidth ||
                            selectedBlock.values.__borderBottomWidth ||
                            selectedBlock.values.__borderLeftWidth ||
                            selectedBlock.values.__borderRadius ||
                            selectedBlock.values.__borderTopLeftRadius ||
                            selectedBlock.values.__borderTopRightRadius ||
                            selectedBlock.values.__borderBottomRightRadius ||
                            selectedBlock.values.__borderBottomLeftRadius ||
                            selectedBlock.values.__borderColor,
                        ) ? (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-blue-500"
                            title="Bordes o esquinas personalizadas"
                          />
                        ) : undefined
                      }
                      action={
                        Boolean(
                          selectedBlock.values.__borderWidth ||
                            selectedBlock.values.__borderTopWidth ||
                            selectedBlock.values.__borderRightWidth ||
                            selectedBlock.values.__borderBottomWidth ||
                            selectedBlock.values.__borderLeftWidth ||
                            selectedBlock.values.__borderRadius ||
                            selectedBlock.values.__borderTopLeftRadius ||
                            selectedBlock.values.__borderTopRightRadius ||
                            selectedBlock.values.__borderBottomRightRadius ||
                            selectedBlock.values.__borderBottomLeftRadius ||
                            selectedBlock.values.__borderColor,
                        ) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBlockValues(selectedBlock.id, {
                                __borderWidth: "",
                                __borderTopWidth: "",
                                __borderRightWidth: "",
                                __borderBottomWidth: "",
                                __borderLeftWidth: "",
                                __borderStyle: "",
                                __borderRadius: "",
                                __borderTopLeftRadius: "",
                                __borderTopRightRadius: "",
                                __borderBottomRightRadius: "",
                                __borderBottomLeftRadius: "",
                                __borderColor: "",
                              })
                            }
                            className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                            title="Restablecer bordes y esquinas"
                          >
                            Reset
                          </button>
                        ) : undefined
                      }
                    >
                      <StudioBordersAndCornersEditor
                        borderWidth={
                          typeof selectedBlock.values.__borderWidth === "string"
                            ? selectedBlock.values.__borderWidth
                            : ""
                        }
                        borderTopWidth={
                          typeof selectedBlock.values.__borderTopWidth ===
                          "string"
                            ? selectedBlock.values.__borderTopWidth
                            : ""
                        }
                        borderRightWidth={
                          typeof selectedBlock.values.__borderRightWidth ===
                          "string"
                            ? selectedBlock.values.__borderRightWidth
                            : ""
                        }
                        borderBottomWidth={
                          typeof selectedBlock.values.__borderBottomWidth ===
                          "string"
                            ? selectedBlock.values.__borderBottomWidth
                            : ""
                        }
                        borderLeftWidth={
                          typeof selectedBlock.values.__borderLeftWidth ===
                          "string"
                            ? selectedBlock.values.__borderLeftWidth
                            : ""
                        }
                        borderColor={
                          typeof selectedBlock.values.__borderColor === "string"
                            ? selectedBlock.values.__borderColor
                            : ""
                        }
                        borderStyle={
                          typeof selectedBlock.values.__borderStyle === "string"
                            ? selectedBlock.values.__borderStyle
                            : ""
                        }
                        defaultBorderColor={documentState.theme.borderColor}
                        borderRadius={
                          typeof selectedBlock.values.__borderRadius ===
                          "string"
                            ? selectedBlock.values.__borderRadius
                            : ""
                        }
                        borderTopLeftRadius={
                          typeof selectedBlock.values.__borderTopLeftRadius ===
                          "string"
                            ? selectedBlock.values.__borderTopLeftRadius
                            : ""
                        }
                        borderTopRightRadius={
                          typeof selectedBlock.values.__borderTopRightRadius ===
                          "string"
                            ? selectedBlock.values.__borderTopRightRadius
                            : ""
                        }
                        borderBottomRightRadius={
                          typeof selectedBlock.values
                            .__borderBottomRightRadius === "string"
                            ? selectedBlock.values.__borderBottomRightRadius
                            : ""
                        }
                        borderBottomLeftRadius={
                          typeof selectedBlock.values
                            .__borderBottomLeftRadius === "string"
                            ? selectedBlock.values.__borderBottomLeftRadius
                            : ""
                        }
                        showShadow={false}
                        onUpdateBorders={(patch) =>
                          handleUpdateBlockValues(selectedBlock.id, {
                            ...(patch.borderWidth !== undefined && {
                              __borderWidth: patch.borderWidth,
                            }),
                            ...(patch.borderTopWidth !== undefined && {
                              __borderTopWidth: patch.borderTopWidth,
                            }),
                            ...(patch.borderRightWidth !== undefined && {
                              __borderRightWidth: patch.borderRightWidth,
                            }),
                            ...(patch.borderBottomWidth !== undefined && {
                              __borderBottomWidth: patch.borderBottomWidth,
                            }),
                            ...(patch.borderLeftWidth !== undefined && {
                              __borderLeftWidth: patch.borderLeftWidth,
                            }),
                            ...(patch.borderColor !== undefined && {
                              __borderColor: patch.borderColor,
                            }),
                            ...(patch.borderStyle !== undefined && {
                              __borderStyle: patch.borderStyle,
                            }),
                          })
                        }
                        onUpdateRadius={(patch) =>
                          handleUpdateBlockValues(selectedBlock.id, {
                            ...(patch.borderRadius !== undefined && {
                              __borderRadius: patch.borderRadius,
                            }),
                            ...(patch.borderTopLeftRadius !== undefined && {
                              __borderTopLeftRadius: patch.borderTopLeftRadius,
                            }),
                            ...(patch.borderTopRightRadius !== undefined && {
                              __borderTopRightRadius:
                                patch.borderTopRightRadius,
                            }),
                            ...(patch.borderBottomRightRadius !== undefined && {
                              __borderBottomRightRadius:
                                patch.borderBottomRightRadius,
                            }),
                            ...(patch.borderBottomLeftRadius !== undefined && {
                              __borderBottomLeftRadius:
                                patch.borderBottomLeftRadius,
                            }),
                          })
                        }
                      />
                    </StudioInspectorSection>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                <Layers className="h-8 w-8 mb-2 text-zinc-300" />
                <p className="text-xs font-semibold text-zinc-700">
                  Ningún bloque seleccionado
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Hacé clic en cualquier bloque o elemento del lienzo central
                  para editar sus propiedades.
                </p>
              </div>
            )
          ) : (
            /* ============================================================= */
            /* DESIGN TAB (Global Theme Presets & System Tokens)            */
            /* ============================================================= */
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* PRESETS DE TEMA */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                    Presets de Tema
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {STUDIO_THEME_PRESETS.length} paletas
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {STUDIO_THEME_PRESETS.map((preset) => {
                    const isCurrent =
                      documentState.theme.bgColor.toLowerCase() ===
                        preset.theme.bgColor.toLowerCase() &&
                      documentState.theme.primaryColor.toLowerCase() ===
                        preset.theme.primaryColor.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleUpdateTheme(preset.theme)}
                        className={`group relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                          isCurrent
                            ? "bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-2xs"
                            : "bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        {isCurrent && (
                          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xs">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                        <div className="flex items-center gap-1 mb-2">
                          {preset.dots.map((dot, i) => (
                            <span
                              key={i}
                              className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-2xs"
                              style={{ backgroundColor: dot }}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-xs font-semibold leading-tight truncate w-full ${
                            isCurrent ? "text-blue-900" : "text-zinc-800"
                          }`}
                        >
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SUPERFICIES Y FONDOS */}
              <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-zinc-400" />
                    Superficies y Fondos
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-black/10"
                      style={{ backgroundColor: documentState.theme.bgColor }}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-black/10"
                      style={{
                        backgroundColor: documentState.theme.cardBgColor,
                      }}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-black/10"
                      style={{
                        backgroundColor: documentState.theme.borderColor,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {(
                    [
                      { key: "bgColor", label: "Fondo de Página (Base)" },
                      { key: "cardBgColor", label: "Tarjetas y Contenedores" },
                      { key: "borderColor", label: "Bordes y Divisores" },
                    ] as const
                  ).map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-zinc-600">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <label
                          className="relative flex items-center justify-center h-6 w-6 rounded-md border border-zinc-300 shadow-2xs cursor-pointer overflow-hidden transition-transform hover:scale-105 shrink-0"
                          style={{ backgroundColor: documentState.theme[key] }}
                          title={`Elegir color para ${label}`}
                        >
                          <input
                            type="color"
                            value={documentState.theme[key]}
                            onChange={(e) =>
                              handleUpdateTheme({ [key]: e.target.value })
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                        <input
                          type="text"
                          value={documentState.theme[key]}
                          onChange={(e) =>
                            handleUpdateTheme({ [key]: e.target.value })
                          }
                          className="w-22 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono font-medium text-zinc-800 uppercase focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COLORES DE MARCA */}
              <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Colores de Marca
                </span>
                <div className="space-y-2">
                  {(
                    [
                      { key: "primaryColor", label: "Color Primario (Botones)" },
                      { key: "primaryLightColor", label: "Hover Primario" },
                      { key: "accentColor", label: "Color de Acento" },
                    ] as const
                  ).map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-zinc-600">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <label
                          className="relative flex items-center justify-center h-6 w-6 rounded-md border border-zinc-300 shadow-2xs cursor-pointer overflow-hidden transition-transform hover:scale-105 shrink-0"
                          style={{ backgroundColor: documentState.theme[key] }}
                          title={`Elegir color para ${label}`}
                        >
                          <input
                            type="color"
                            value={documentState.theme[key]}
                            onChange={(e) =>
                              handleUpdateTheme({ [key]: e.target.value })
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                        <input
                          type="text"
                          value={documentState.theme[key]}
                          onChange={(e) =>
                            handleUpdateTheme({ [key]: e.target.value })
                          }
                          className="w-22 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono font-medium text-zinc-800 uppercase focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COLORES DE TEXTO */}
              <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 flex items-center gap-1.5">
                  <Type className="h-3 w-3 text-zinc-400" />
                  Colores de Texto
                </span>
                <div className="space-y-2">
                  {(
                    [
                      { key: "textColor", label: "Texto Principal" },
                      { key: "mutedTextColor", label: "Texto Secundario" },
                    ] as const
                  ).map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-zinc-600">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <label
                          className="relative flex items-center justify-center h-6 w-6 rounded-md border border-zinc-300 shadow-2xs cursor-pointer overflow-hidden transition-transform hover:scale-105 shrink-0"
                          style={{ backgroundColor: documentState.theme[key] }}
                          title={`Elegir color para ${label}`}
                        >
                          <input
                            type="color"
                            value={documentState.theme[key]}
                            onChange={(e) =>
                              handleUpdateTheme({ [key]: e.target.value })
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                        <input
                          type="text"
                          value={documentState.theme[key]}
                          onChange={(e) =>
                            handleUpdateTheme({ [key]: e.target.value })
                          }
                          className="w-22 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono font-medium text-zinc-800 uppercase focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TIPOGRAFÍA GLOBAL */}
              <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 flex items-center gap-1.5">
                  <Type className="h-3 w-3 text-zinc-400" />
                  Tipografía Global
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Fuente de Títulos
                    </label>
                    <input
                      type="text"
                      value={documentState.theme.fontHeading}
                      onChange={(e) =>
                        handleUpdateTheme({ fontHeading: e.target.value })
                      }
                      className="w-full rounded-md bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        {
                          label: "Playfair (Serif)",
                          val: "'Playfair Display', Georgia, serif",
                        },
                        {
                          label: "Jakarta (Sans)",
                          val: "'Plus Jakarta Sans', system-ui, sans-serif",
                        },
                        {
                          label: "Inter",
                          val: "'Inter', system-ui, sans-serif",
                        },
                        { label: "Outfit", val: "'Outfit', sans-serif" },
                      ].map((f) => (
                        <button
                          key={f.label}
                          type="button"
                          onClick={() =>
                            handleUpdateTheme({ fontHeading: f.val })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                            documentState.theme.fontHeading === f.val
                              ? "bg-blue-100 text-blue-800 font-semibold border border-blue-200"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 border border-zinc-200"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Fuente de Párrafos
                    </label>
                    <input
                      type="text"
                      value={documentState.theme.fontBody}
                      onChange={(e) =>
                        handleUpdateTheme({ fontBody: e.target.value })
                      }
                      className="w-full rounded-md bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        {
                          label: "Plus Jakarta",
                          val: "'Plus Jakarta Sans', system-ui, sans-serif",
                        },
                        {
                          label: "Inter",
                          val: "'Inter', system-ui, sans-serif",
                        },
                        { label: "Roboto", val: "'Roboto', sans-serif" },
                      ].map((f) => (
                        <button
                          key={f.label}
                          type="button"
                          onClick={() =>
                            handleUpdateTheme({ fontBody: f.val })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                            documentState.theme.fontBody === f.val
                              ? "bg-blue-100 text-blue-800 font-semibold border border-blue-200"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 border border-zinc-200"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* REDONDEO DE ESQUINAS */}
              <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 flex items-center gap-1.5">
                  <Box className="h-3 w-3 text-zinc-400" />
                  Redondeo de Esquinas
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Tarjetas (Radius MD)
                    </label>
                    <input
                      type="text"
                      value={documentState.theme.radiusMd}
                      onChange={(e) =>
                        handleUpdateTheme({ radiusMd: e.target.value })
                      }
                      placeholder="12px"
                      className="w-full rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono text-zinc-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Botones (Radius LG)
                    </label>
                    <input
                      type="text"
                      value={documentState.theme.radiusLg}
                      onChange={(e) =>
                        handleUpdateTheme({ radiusLg: e.target.value })
                      }
                      placeholder="20px"
                      className="w-full rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono text-zinc-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    { label: "Recto (0px)", md: "0px", lg: "0px" },
                    { label: "Suave (8px)", md: "8px", lg: "14px" },
                    { label: "Moderno (14px)", md: "14px", lg: "24px" },
                    { label: "Píldora", md: "16px", lg: "9999px" },
                  ].map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() =>
                        handleUpdateTheme({ radiusMd: r.md, radiusLg: r.lg })
                      }
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ================================================================= */}
      {/* FULL-SCREEN CODE EDITOR MODAL                                      */}
      {/* ================================================================= */}
      {codeDrawerMode !== "closed" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white animate-in fade-in-50 duration-150 overflow-hidden"
        >
          {/* Top Modal Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
                  <Code2 className="h-4 w-4" />
                </span>
                <span className="text-sm font-bold text-white hidden sm:inline">
                  Editor de Código
                </span>
              </div>

              {/* Mode Switcher: Selected Block vs Full Page / JSON */}
              <div className="flex items-center bg-zinc-800 p-0.5 rounded-lg border border-zinc-700 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCodeDrawerMode("block");
                    if (codeTab === "json") setCodeTab("html");
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    codeDrawerMode === "block"
                      ? "bg-zinc-700 text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Módulo: {selectedBlock?.name ?? "Seleccionado"}
                </button>
                <button
                  type="button"
                  onClick={() => setCodeDrawerMode("global")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    codeDrawerMode === "global"
                      ? "bg-zinc-700 text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Página Global / JSON
                </button>
              </div>

              {/* Language Tabs: HTML | CSS | JS | JSON */}
              <div className="flex items-center gap-1 bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-700/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setCodeTab("html")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    codeTab === "html"
                      ? "bg-orange-500/25 text-orange-300 font-semibold border border-orange-500/40"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <FileCode2 className="h-3.5 w-3.5 text-orange-400" />
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab("css")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    codeTab === "css"
                      ? "bg-sky-500/25 text-sky-300 font-semibold border border-sky-500/40"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Paintbrush className="h-3.5 w-3.5 text-sky-400" />
                  CSS
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab("js")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    codeTab === "js"
                      ? "bg-yellow-500/25 text-yellow-300 font-semibold border border-yellow-500/40"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Braces className="h-3.5 w-3.5 text-yellow-400" />
                  JS
                </button>
                {codeDrawerMode === "global" && (
                  <button
                    type="button"
                    onClick={() => setCodeTab("json")}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      codeTab === "json"
                        ? "bg-emerald-500/25 text-emerald-300 font-semibold border border-emerald-500/40"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                    JSON Config
                  </button>
                )}
              </div>
            </div>

            {/* Right side of header */}
            <div className="flex items-center gap-2.5 shrink-0">
              {codeDrawerMode === "block" && (
                <span className="text-[11px] text-zinc-400 hidden xl:inline">
                  Tip: escribí{" "}
                  <code className="text-amber-300 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">
                    {"{{miVariable}}"}
                  </code>{" "}
                  en el HTML para crear campos visuales automáticos
                </span>
              )}
              <span className="text-[11px] text-zinc-500 hidden md:inline font-mono">
                <kbd className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700">
                  Esc
                </kbd>{" "}
                para salir
              </span>
              <button
                type="button"
                onClick={() => setCodeDrawerMode("closed")}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                Listo y Volver
              </button>
              <button
                type="button"
                onClick={() => setCodeDrawerMode("closed")}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Cerrar editor de código (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Monaco Editor Container - 100% full screen height */}
          <div className="flex-1 min-h-0 bg-[#1e1e1e] relative">
            {codeDrawerMode === "block" && selectedBlock ? (
              <Editor
                height="100%"
                theme="vs-dark"
                path={`block-${selectedBlock.id}.${codeTab}`}
                language={
                  codeTab === "html"
                    ? "html"
                    : codeTab === "css"
                    ? "css"
                    : "javascript"
                }
                value={
                  codeTab === "html"
                    ? selectedBlock.htmlTemplate
                    : codeTab === "css"
                    ? selectedBlock.cssTemplate
                    : selectedBlock.jsTemplate
                }
                onChange={(val) => {
                  const nextVal = val ?? "";
                  if (codeTab === "html") {
                    handleUpdateBlockCode(selectedBlock.id, {
                      htmlTemplate: nextVal,
                    });
                  } else if (codeTab === "css") {
                    handleUpdateBlockCode(selectedBlock.id, {
                      cssTemplate: nextVal,
                    });
                  } else {
                    handleUpdateBlockCode(selectedBlock.id, {
                      jsTemplate: nextVal,
                    });
                  }
                }}
                options={{
                  minimap: { enabled: true },
                  fontSize: 13.5,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  padding: { top: 12 },
                }}
              />
            ) : (
              <Editor
                height="100%"
                theme="vs-dark"
                path={`global-landing.${codeTab}`}
                language={
                  codeTab === "html"
                    ? "html"
                    : codeTab === "css"
                    ? "css"
                    : codeTab === "json"
                    ? "json"
                    : "javascript"
                }
                value={
                  codeTab === "json"
                    ? jsonEditorText
                    : codeTab === "html"
                    ? activeCodePayload.htmlContent
                    : codeTab === "css"
                    ? documentState.globalCss
                    : documentState.globalJs
                }
                onChange={(val) => {
                  const nextVal = val ?? "";
                  if (codeTab === "json") {
                    setJsonEditorText(nextVal);
                    try {
                      const parsed = JSON.parse(nextVal);
                      if (parsed && Array.isArray(parsed.blocks)) {
                        updateDocument(parsed, false);
                      }
                    } catch {
                      // Allow intermediate typing in JSON editor
                    }
                  } else if (codeTab === "html") {
                    setRawHtml(nextVal);
                    updateDocument((prev) => ({ ...prev, mode: "raw" }));
                  } else if (codeTab === "css") {
                    updateDocument((prev) => ({
                      ...prev,
                      globalCss: nextVal,
                    }));
                  } else {
                    updateDocument((prev) => ({
                      ...prev,
                      globalJs: nextVal,
                    }));
                  }
                }}
                options={{
                  minimap: { enabled: true },
                  fontSize: 13.5,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  padding: { top: 12 },
                }}
              />
            )}
          </div>

          {/* Bottom Status / Footer Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-950 text-zinc-400 border-t border-zinc-850 text-xs shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Sincronización en vivo con el lienzo
              </span>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-400">
                {codeDrawerMode === "block"
                  ? `Módulo: ${selectedBlock?.name ?? "Bloque"}`
                  : `Documento completo: ${documentState.blocks.length} módulos`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-zinc-500">
                {codeTab.toUpperCase()} • Monaco IDE
              </span>
              <button
                type="button"
                onClick={() => setCodeDrawerMode("closed")}
                className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                Cerrar Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: SAVE AS REUSABLE CUSTOM MODULE                             */}
      {/* ================================================================= */}
      {showSaveModuleModal && selectedBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-6 shadow-2xl space-y-4 text-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-emerald-600" />
              Guardar Módulo Reutilizable
            </h3>
            <p className="text-xs text-zinc-600">
              Guardá este bloque (con su HTML, CSS, JS y{" "}
              {selectedBlock.fields.length} variables editables) en tu
              biblioteca de módulos para insertarlo en cualquier momento.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nombre del módulo
                </label>
                <input
                  type="text"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="Ej: Card Especial del Chef"
                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Descripción breve (opcional)
                </label>
                <input
                  type="text"
                  value={moduleDesc}
                  onChange={(e) => setModuleDesc(e.target.value)}
                  placeholder="Ej: Tarjeta con precio, foto y botón"
                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveModuleModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || !moduleName.trim()}
                onClick={handleSaveSelectedAsCustomModule}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs disabled:opacity-50 transition-colors"
              >
                Guardar en mi biblioteca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: SAVE CURRENT LANDING AS TEMPLATE                           */}
      {/* ================================================================= */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-6 shadow-2xl space-y-4 text-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-emerald-600" />
              Guardar como Plantilla de Landing
            </h3>
            <p className="text-xs text-zinc-600">
              Guardá esta landing completa (todos sus módulos, estilos y tema)
              como plantilla privada o compartila con la comunidad.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nombre de la plantilla
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ej: Bistró de Autor Nocturno"
                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Ideal para parrillas, bares de vinos o restaurantes de autor."
                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={templateSubmitPublic}
                  onChange={(e) => setTemplateSubmitPublic(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-900 block">
                    Publicar para la comunidad
                  </span>
                  <span className="text-zinc-500">
                    Si lo activás, será revisada por un Superadmin antes de
                    aparecer como pública. Si no, quedará solo para tu negocio.
                  </span>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || !templateName.trim()}
                onClick={handleCreateTemplate}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs disabled:opacity-50 transition-colors"
              >
                Guardar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: TEMPLATES LIBRARY (System, Private, Community, Import/Export) */}
      {/* ================================================================= */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white border border-zinc-200 shadow-2xl flex flex-col overflow-hidden text-zinc-900">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/70">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-emerald-600" />
                  Biblioteca de Plantillas de Landing
                </h3>
                <p className="text-xs text-zinc-500">
                  Cargá plantillas del sistema, de la comunidad o tus propias
                  plantillas privadas (.landingtemplate).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".landingtemplate"
                  onChange={handleImportTemplateFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-2xs transition-colors"
                >
                  <Upload className="h-3.5 w-3.5 text-amber-600" />
                  Importar .landingtemplate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplatesModal(false);
                    setShowSaveTemplateModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  Guardar actual
                </button>
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-zinc-50/30">
              {templates.map((tpl) => {
                const badge = tpl.isSystem
                  ? {
                      text: "Sistema",
                      cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
                    }
                  : tpl.visibility === "PUBLIC"
                  ? {
                      text:
                        tpl.status === "PUBLISHED"
                          ? "Comunidad"
                          : tpl.status === "PENDING"
                          ? "En revisión"
                          : tpl.status,
                      cls:
                        tpl.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200",
                    }
                  : {
                      text: "Privada",
                      cls: "bg-zinc-100 text-zinc-700 border-zinc-200",
                    };

                return (
                  <div
                    key={tpl.id}
                    className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-xs transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.cls}`}
                        >
                          {badge.text}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black/10"
                            style={{
                              backgroundColor: tpl.document.theme.primaryColor,
                            }}
                          />
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black/10"
                            style={{
                              backgroundColor: tpl.document.theme.accentColor,
                            }}
                          />
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black/10"
                            style={{
                              backgroundColor: tpl.document.theme.bgColor,
                            }}
                          />
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-zinc-900">
                        {tpl.name}
                      </h4>
                      <p className="text-xs text-zinc-600 mt-1 line-clamp-2">
                        {tpl.description || "Sin descripción"}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-2">
                        {tpl.document.blocks.length} bloques incluidos
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                      >
                        Usar plantilla
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportTemplate(tpl.id)}
                        className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 transition-colors"
                        title="Descargar archivo .landingtemplate"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {!tpl.isSystem && tpl.tenantId === tenant.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-red-50 text-zinc-500 hover:text-red-600 transition-colors"
                          title="Eliminar plantilla"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {mediaPickerTarget && (
        <LandingMediaModal
          open={true}
          tenantSlug={tenant.slug}
          tenantId={tenant.id}
          currentUrl={mediaPickerTarget.currentUrl}
          title={mediaPickerTarget.title}
          onClose={() => setMediaPickerTarget(null)}
          onSelectUrl={(url, altSuggestion) => {
            if (mediaPickerTarget.kind === "field") {
              handleUpdateBlockValue(
                mediaPickerTarget.blockId,
                mediaPickerTarget.fieldKey,
                url,
              );
            } else if (mediaPickerTarget.kind === "block-bg") {
              handleUpdateBlockValue(
                mediaPickerTarget.blockId,
                "__style_bgImage",
                url,
              );
            } else if (mediaPickerTarget.kind === "sub-img") {
              if (mediaPickerTarget.boundSrcField) {
                const patch: Record<string, string> = {
                  [mediaPickerTarget.boundSrcField]: url,
                };
                if (
                  altSuggestion &&
                  mediaPickerTarget.boundAltField &&
                  selectedSubElement &&
                  !selectedSubElement.currentAlt
                ) {
                  patch[mediaPickerTarget.boundAltField] = altSuggestion;
                }
                handleUpdateBlockValues(mediaPickerTarget.blockId, patch);
                setSelectedSubElement((prev) =>
                  prev &&
                  prev.blockId === mediaPickerTarget.blockId &&
                  prev.selector === mediaPickerTarget.selector
                    ? {
                        ...prev,
                        currentSrc: url,
                        ...(altSuggestion && !prev.currentAlt
                          ? { currentAlt: altSuggestion }
                          : {}),
                      }
                    : prev,
                );
              } else {
                handleUpdateSubElementAttribute(
                  mediaPickerTarget.blockId,
                  mediaPickerTarget.selector,
                  "src",
                  url,
                );
              }
            } else if (mediaPickerTarget.kind === "sub-bg") {
              handleUpdateSubElementStyle(
                mediaPickerTarget.blockId,
                mediaPickerTarget.selector,
                { backgroundImage: url },
              );
            }
            setMediaPickerTarget(null);
          }}
        />
      )}
    </div>
  );
}
