"use client";

import React, {
  useState,
  useEffect,
  useTransition,
  useMemo,
  useRef,
  useCallback,
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
  GripVertical,
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
  MousePointerClick,
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
  compileLandingDocument,
  compileLandingFromDocument,
  createDefaultLandingDocument,
  createDefaultLandingTemplate,
  deleteSubElementInBlock,
  duplicateSubElementInBlock,
  insertInnerElementInBlock,
  moveSubElementInBlock,
  parseSubElementStyles,
  serializeSubElementStyles,
  syncFieldsWithHtmlTemplate,
  updateSubElementAttributeInBlock,
  type InsertableInnerElementKind,
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
type LeftSidebarTab = "layers" | "components";
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
    textAlign?: string;
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
  const [rightTab, setRightTab] = useState<RightSidebarTab>("properties");
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [interactiveCanvas, setInteractiveCanvas] = useState<boolean>(true);
  const [codeDrawerMode, setCodeDrawerMode] = useState<CodeDrawerMode>("closed");
  const [codeTab, setCodeTab] = useState<CodeTab>("html");
  const [componentSearch, setComponentSearch] = useState("");
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);
  const [isDraggingComponentOverCanvas, setIsDraggingComponentOverCanvas] = useState(false);

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

  useEffect(() => {
    selectedBlockIdRef.current = selectedBlockId;
  }, [selectedBlockId]);

  useEffect(() => {
    selectedSubElementRef.current = selectedSubElement;
  }, [selectedSubElement]);

  useEffect(() => {
    interactiveCanvasRef.current = interactiveCanvas;
  }, [interactiveCanvas]);

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

  // Select block & notify iframe without full reload
  const selectBlockOnStudio = useCallback(
    (blockId: string | null, scrollIntoView = false) => {
      setSelectedBlockId(blockId);
      setSelectedSubElement(null);
      if (blockId) {
        setRightTab("properties");
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
    ) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return insertInnerElementInBlock(b, targetSelector, kind);
        }),
      }));
      setFeedback({
        type: "success",
        message: "Nuevo elemento agregado al bloque.",
      });
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
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    documentState.blocks,
    handleDeleteBlock,
    handleDeleteSubElement,
    handleDuplicateBlock,
    handleDuplicateSubElement,
    handleMoveBlock,
    handleMoveSubElement,
    handleRedo,
    handleSaveDraft,
    handleUndo,
    handleUpdateBlockValue,
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
          message: `¡Landing publicada en /${tenant.slug}!`,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error.message || "Error al publicar la landing.",
        });
      }
    });
  };

  // Keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          <button
            type="button"
            onClick={() => setInteractiveCanvas((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              !interactiveCanvas
                ? "bg-blue-50 text-blue-700 border-blue-200 shadow-2xs font-semibold"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-2xs"
            }`}
            title={
              interactiveCanvas
                ? "Cambiar a vista previa limpia (sin bordes de edición)"
                : "Volver al lienzo interactivo"
            }
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">
              {interactiveCanvas ? "Interactivo" : "Vista Previa"}
            </span>
          </button>

          {/* Code Drawer Toggle (</> like OpenPage) */}
          <button
            type="button"
            onClick={() =>
              setCodeDrawerMode((m) => (m === "closed" ? "block" : "closed"))
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              codeDrawerMode !== "closed"
                ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs font-semibold"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-2xs"
            }`}
            title="Abrir / cerrar editor de código HTML, CSS, JS y JSON"
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
              href={`/${tenant.slug}`}
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
        <aside className="w-68 bg-white border-r border-zinc-200 flex flex-col shrink-0 min-h-0">
          {/* Segmented Pill Toggle: Layers | + Components */}
          <div className="p-2.5 border-b border-zinc-200">
            <div className="grid grid-cols-2 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setLeftTab("layers")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  leftTab === "layers"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Capas
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("components")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  leftTab === "components"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                Módulos
              </button>
            </div>
          </div>

          {leftTab === "layers" ? (
            <>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                  LAYERS
                </span>
                <span className="text-[11px] font-semibold text-zinc-400">
                  {documentState.blocks.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {documentState.blocks.map((block, idx) => {
                  const active = block.id === selectedBlockId;
                  const Icon = getModuleIcon(block.moduleKey);
                  return (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={() => setDraggedLayerIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedLayerIndex !== null) {
                          handleReorderBlocks(draggedLayerIndex, idx);
                          setDraggedLayerIndex(null);
                        }
                      }}
                      onClick={() => selectBlockOnStudio(block.id, true)}
                      className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                        active
                          ? "bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs font-medium"
                          : "bg-transparent border-transparent hover:bg-zinc-50 text-zinc-700"
                      } ${!block.visible ? "opacity-45" : ""}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GripVertical className="h-3.5 w-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                            active
                              ? "bg-blue-100 border-blue-200 text-blue-600"
                              : "bg-zinc-100 border-zinc-200 text-zinc-500"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-medium truncate">
                          {block.name}
                        </span>
                      </div>

                      <div
                        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleBlockVisibility(block.id)}
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
                  );
                })}
              </div>

              {/* Bottom pinned "+ Add Component" button (like OpenPage!) */}
              <div className="p-3 border-t border-zinc-200 space-y-2">
                <button
                  type="button"
                  onClick={() => setLeftTab("components")}
                  className="w-full py-2 px-3 rounded-lg border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar Componente
                </button>
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
          ) : (
            /* + COMPONENTS TAB: Visual 2-Column Draggable Grid (M3E Canvas / Framely style) */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-2.5 border-b border-zinc-200">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                    placeholder="Buscar bloques o cards..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
                <div>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Arrastrá o hacé clic para insertar
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
                            e.dataTransfer.setData(
                              "application/x-landing-builtin",
                              mod.moduleKey,
                            );
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
                            e.dataTransfer.setData(
                              "application/x-landing-custom",
                              cm.id,
                            );
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
        </aside>

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
            const builtinKey = e.dataTransfer.getData(
              "application/x-landing-builtin",
            );
            if (builtinKey) {
              const found = BUILTIN_LANDING_MODULES.find(
                (m) => m.moduleKey === builtinKey,
              );
              if (found) handleAddBuiltinBlock(found);
              return;
            }
            const customId = e.dataTransfer.getData(
              "application/x-landing-custom",
            );
            if (customId) {
              const found = customModules.find((m) => m.id === customId);
              if (found) handleAddCustomBlock(found);
            }
          }}
        >
          {/* Drop indicator overlay when dragging a component over the canvas */}
          {isDraggingComponentOverCanvas && (
            <div className="pointer-events-none absolute inset-3 z-40 rounded-2xl border-2 border-dashed border-blue-500 bg-blue-500/10 flex items-center justify-center backdrop-blur-[1px]">
              <div className="px-4 py-2 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-blue-700 shadow-xl flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Soltá acá para insertar el módulo en el lienzo
              </div>
            </div>
          )}

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
              className={`bg-white rounded-xl overflow-hidden shadow-[0_16px_45px_rgba(0,0,0,0.12)] border border-zinc-300 transition-all duration-300 flex flex-col ${
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
                    /{tenant.slug}
                  </div>
                  <div className="w-10" />
                </div>
              )}

              <iframe
                ref={iframeRef}
                title="Lienzo Visual de Landing"
                srcDoc={debouncedSrcDoc}
                sandbox="allow-scripts allow-forms allow-popups"
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

          {/* ------------------------------------------------------------- */}
          {/* OPTIONAL DOCKED MONACO CODE DRAWER (Block Code or Global/JSON) */}
          {/* ------------------------------------------------------------- */}
          {codeDrawerMode !== "closed" && (
            <div className="h-80 bg-white border-t border-zinc-200 flex flex-col shrink-0 shadow-lg">
              <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  {/* Switch between Selected Block Code vs Full Page / JSON */}
                  <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                    <button
                      type="button"
                      onClick={() => {
                        setCodeDrawerMode("block");
                        if (codeTab === "json") setCodeTab("html");
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        codeDrawerMode === "block"
                          ? "bg-white text-zinc-900 shadow-2xs"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      Módulo: {selectedBlock?.name ?? "Ninguno"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeDrawerMode("global")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        codeDrawerMode === "global"
                          ? "bg-white text-zinc-900 shadow-2xs"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      Página Global / JSON
                    </button>
                  </div>

                  {/* Language Tabs: HTML | CSS | JS | JSON */}
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      onClick={() => setCodeTab("html")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                        codeTab === "html"
                          ? "bg-white text-orange-600 shadow-2xs border border-zinc-200/80 font-semibold"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      <FileCode2 className="h-3.5 w-3.5" />
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeTab("css")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                        codeTab === "css"
                          ? "bg-white text-sky-600 shadow-2xs border border-zinc-200/80 font-semibold"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      <Paintbrush className="h-3.5 w-3.5" />
                      CSS
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeTab("js")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                        codeTab === "js"
                          ? "bg-white text-yellow-600 shadow-2xs border border-zinc-200/80 font-semibold"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      <Braces className="h-3.5 w-3.5" />
                      JS
                    </button>
                    {codeDrawerMode === "global" && (
                      <button
                        type="button"
                        onClick={() => setCodeTab("json")}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                          codeTab === "json"
                            ? "bg-white text-emerald-600 shadow-2xs border border-zinc-200/80 font-semibold"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        JSON Config
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {codeDrawerMode === "block" && (
                    <span className="text-[11px] text-zinc-500 hidden md:inline">
                      Tip: escribí{" "}
                      <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">{"{{miVariable}}"}</code>{" "}
                      en el HTML para crear un campo visual automáticamente
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCodeDrawerMode("closed")}
                    className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-md"
                    title="Cerrar panel de código"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 bg-white">
                {codeDrawerMode === "block" && selectedBlock ? (
                  <Editor
                    height="100%"
                    theme="vs"
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
                      minimap: { enabled: false },
                      fontSize: 12.5,
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      padding: { top: 10 },
                    }}
                  />
                ) : (
                  <Editor
                    height="100%"
                    theme="vs"
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
                      minimap: { enabled: false },
                      fontSize: 12.5,
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      padding: { top: 10 },
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* --------------------------------------------------------------- */}
        {/* RIGHT SIDEBAR: Properties & Design (OpenPage / Framely style)   */}
        {/* --------------------------------------------------------------- */}
        <aside className="w-80 bg-white border-l border-zinc-200 flex flex-col shrink-0 min-h-0">
          {/* Top Tabs: Properties | Design (Identical to OpenPage!) */}
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
              Properties
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
              Design
            </button>
          </div>

          {rightTab === "properties" ? (
            /* ============================================================= */
            /* PROPERTIES TAB (Block & Granular Sub-Element Inspector)       */
            /* ============================================================= */
            selectedBlock ? (
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-200">
                {/* Breadcrumb Hierarchy Bar */}
                <div className="bg-zinc-50 px-3.5 py-2 flex flex-wrap items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => selectSubElementOnStudio(selectedBlock.id, null)}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold transition ${
                      !activeSubElement
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                    }`}
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
                        className="rounded px-1.5 py-0.5 font-medium text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                      >
                        {anc.label}
                      </button>
                    </React.Fragment>
                  ))}

                  {activeSubElement && (
                    <>
                      <span className="text-zinc-400">›</span>
                      <span className="inline-flex items-center gap-1 rounded bg-violet-600 px-1.5 py-0.5 font-semibold text-white shadow-2xs">
                        {activeSubElement.label}
                      </span>
                    </>
                  )}
                </div>

                {activeSubElement ? (
                  /* ========================================================= */
                  /* GRANULAR SUB-ELEMENT INSPECTOR                            */
                  /* ========================================================= */
                  <>
                    {/* Sub-Element Header & Structural Actions */}
                    <div className="p-3.5 space-y-3 bg-violet-50/35">
                      <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-200">
                                {activeSubElement.label}
                              </span>
                              <code className="text-[10px] text-zinc-500 font-mono">
                                &lt;{activeSubElement.tagName}&gt;
                              </code>
                            </div>

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
                          <div className="p-3.5 space-y-3">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                              Contenido del Elemento
                            </span>

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
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-[11px] font-medium text-zinc-700 mb-1 flex items-center gap-1">
                                    <Link2 className="h-3 w-3 text-zinc-400" />
                                    Destino del Botón / Enlace (href)
                                  </label>
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
                                    placeholder="/m/mi-restaurante o #contacto"
                                    className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                                  />
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {[
                                    { label: "Carta Digital", url: `/m/${tenant.slug}` },
                                    { label: "#destacados", url: "#destacados" },
                                    { label: "#experiencia", url: "#experiencia" },
                                    { label: "#contacto", url: "#contacto" },
                                    { label: "WhatsApp", url: "https://wa.me/" },
                                  ].map((preset) => (
                                    <button
                                      key={preset.label}
                                      type="button"
                                      onClick={() => {
                                        if (activeSubElement.boundHrefField) {
                                          handleUpdateBlockValue(
                                            selectedBlock.id,
                                            activeSubElement.boundHrefField,
                                            preset.url,
                                          );
                                        } else {
                                          handleUpdateSubElementAttribute(
                                            selectedBlock.id,
                                            activeSubElement.selector,
                                            "href",
                                            preset.url,
                                          );
                                        }
                                      }}
                                      className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Granular CSS Style Overrides for Sub-Element */}
                        <div className="p-3.5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                              Estilo del Elemento
                            </span>
                            {hasSubStyleOverrides && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleResetSubElementStyles(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                  )
                                }
                                className="text-[10px] text-violet-600 hover:text-violet-800 underline font-medium"
                              >
                                Reset estilos
                              </button>
                            )}
                          </div>

                          {/* Typography: Font Size & Weight */}
                          {!activeSubElement.isImage && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="block text-[11px] text-zinc-600 mb-1">
                                    Tamaño de Letra
                                  </span>
                                  <select
                                    value={curStyle.fontSize || ""}
                                    onChange={(e) =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        { fontSize: e.target.value },
                                      )
                                    }
                                    className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                                  >
                                    <option value="">Por defecto</option>
                                    <option value="12px">12px (XS)</option>
                                    <option value="14px">14px (SM)</option>
                                    <option value="16px">16px (Base)</option>
                                    <option value="18px">18px (MD)</option>
                                    <option value="20px">20px (LG)</option>
                                    <option value="24px">24px (XL)</option>
                                    <option value="32px">32px (2XL)</option>
                                    <option value="40px">40px (3XL)</option>
                                    <option value="48px">48px (4XL)</option>
                                    <option value="56px">56px (Hero)</option>
                                  </select>
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
                                    <option value="400">400 Normal</option>
                                    <option value="500">500 Medium</option>
                                    <option value="600">600 Semibold</option>
                                    <option value="700">700 Bold</option>
                                    <option value="800">800 ExtraBold</option>
                                  </select>
                                </div>
                              </div>

                              {/* Text Color */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-zinc-600">
                                  Color de Texto
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="color"
                                    value={
                                      curStyle.color?.startsWith("#")
                                        ? curStyle.color
                                        : documentState.theme.textColor
                                    }
                                    onChange={(e) =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        { color: e.target.value },
                                      )
                                    }
                                    className="h-6 w-6 rounded border border-zinc-300 bg-transparent cursor-pointer"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Auto"
                                    value={curStyle.color ?? ""}
                                    onChange={(e) =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        { color: e.target.value },
                                      )
                                    }
                                    className="w-24 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-[11px] font-mono text-zinc-800"
                                  />
                                  {curStyle.color && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSubElementStyle(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          { color: "" },
                                        )
                                      }
                                      className="p-0.5 text-zinc-400 hover:text-zinc-700"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Text Align */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-zinc-600">
                                  Alineación
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
                            </>
                          )}

                          {/* Background Color */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-zinc-600">
                              Color de Fondo
                            </span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={
                                  curStyle.backgroundColor?.startsWith("#")
                                    ? curStyle.backgroundColor
                                    : documentState.theme.cardBgColor
                                }
                                onChange={(e) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    { backgroundColor: e.target.value },
                                  )
                                }
                                className="h-6 w-6 rounded border border-zinc-300 bg-transparent cursor-pointer"
                              />
                              <input
                                type="text"
                                placeholder="Auto"
                                value={curStyle.backgroundColor ?? ""}
                                onChange={(e) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    { backgroundColor: e.target.value },
                                  )
                                }
                                className="w-24 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-[11px] font-mono text-zinc-800"
                              />
                              {curStyle.backgroundColor && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSubElementStyle(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                      { backgroundColor: "" },
                                    )
                                  }
                                  className="p-0.5 text-zinc-400 hover:text-zinc-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Background Image for Container / Card */}
                          {!activeSubElement.isImage && (
                            <div className="flex items-center justify-between gap-2">
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

                          {/* Padding & Margin */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="block text-[11px] text-zinc-600 mb-1">
                                Padding Vertical
                              </span>
                              <select
                                value={curStyle.paddingTop || ""}
                                onChange={(e) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      paddingTop: e.target.value,
                                      paddingBottom: e.target.value,
                                    },
                                  )
                                }
                                className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                              >
                                <option value="">Por defecto</option>
                                <option value="0px">0px</option>
                                <option value="8px">8px</option>
                                <option value="12px">12px</option>
                                <option value="16px">16px</option>
                                <option value="24px">24px</option>
                                <option value="32px">32px</option>
                                <option value="48px">48px</option>
                              </select>
                            </div>
                            <div>
                              <span className="block text-[11px] text-zinc-600 mb-1">
                                Padding Horizontal
                              </span>
                              <select
                                value={curStyle.paddingLeft || ""}
                                onChange={(e) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      paddingLeft: e.target.value,
                                      paddingRight: e.target.value,
                                    },
                                  )
                                }
                                className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                              >
                                <option value="">Por defecto</option>
                                <option value="0px">0px</option>
                                <option value="12px">12px</option>
                                <option value="16px">16px</option>
                                <option value="24px">24px</option>
                                <option value="32px">32px</option>
                                <option value="44px">44px</option>
                              </select>
                            </div>
                          </div>

                          {/* Dimensions & Spacing */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="block text-[11px] text-zinc-600 mb-1">
                                Ancho (Width)
                              </span>
                              <select
                                value={curStyle.width || ""}
                                onChange={(e) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    { width: e.target.value },
                                  )
                                }
                                className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                              >
                                <option value="">Auto</option>
                                <option value="100%">100% (Ancho total)</option>
                                <option value="fit-content">Ajustado al texto</option>
                                <option value="240px">240px</option>
                                <option value="320px">320px</option>
                                <option value="480px">480px</option>
                              </select>
                            </div>
                            <div>
                              <span className="block text-[11px] text-zinc-600 mb-1">
                                Margen Inferior
                              </span>
                              <select
                                value={curStyle.marginBottom || ""}
                                onChange={(e) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    { marginBottom: e.target.value },
                                  )
                                }
                                className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                              >
                                <option value="">Por defecto</option>
                                <option value="0px">0px</option>
                                <option value="8px">8px</option>
                                <option value="16px">16px</option>
                                <option value="24px">24px</option>
                                <option value="36px">36px</option>
                              </select>
                            </div>
                          </div>

                          {/* Border & Radius */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="block text-[11px] text-zinc-600 mb-1">
                                Borde
                              </span>
                              <select
                                value={curStyle.borderWidth || ""}
                                onChange={(e) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    { borderWidth: e.target.value },
                                  )
                                }
                                className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                              >
                                <option value="">Por defecto</option>
                                <option value="0px">Sin borde (0px)</option>
                                <option value="1px">1px</option>
                                <option value="2px">2px</option>
                                <option value="3px">3px</option>
                              </select>
                            </div>
                            <div>
                              <span className="block text-[11px] text-zinc-600 mb-1">
                                Esquinas (Radius)
                              </span>
                              <select
                                value={curStyle.borderRadius || ""}
                                onChange={(e) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    { borderRadius: e.target.value },
                                  )
                                }
                                className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                              >
                                <option value="">Por defecto</option>
                                <option value="0px">Recto (0px)</option>
                                <option value="8px">Suave (8px)</option>
                                <option value="14px">Medio (14px)</option>
                                <option value="24px">Redondeado (24px)</option>
                                <option value="9999px">Píldora (Full)</option>
                              </select>
                            </div>
                          </div>

                          {curStyle.borderWidth &&
                            curStyle.borderWidth !== "0px" && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-zinc-600">
                                  Color de Borde
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="color"
                                    value={
                                      curStyle.borderColor?.startsWith("#")
                                        ? curStyle.borderColor
                                        : documentState.theme.borderColor
                                    }
                                    onChange={(e) =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        { borderColor: e.target.value },
                                      )
                                    }
                                    className="h-6 w-6 rounded border border-zinc-300 bg-transparent cursor-pointer"
                                  />
                                  <input
                                    type="text"
                                    value={curStyle.borderColor ?? ""}
                                    onChange={(e) =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        { borderColor: e.target.value },
                                      )
                                    }
                                    className="w-24 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-[11px] font-mono text-zinc-800"
                                  />
                                </div>
                              </div>
                            )}

                          {/* Shadow */}
                          <div>
                            <span className="block text-[11px] text-zinc-600 mb-1">
                              Sombra (Shadow)
                            </span>
                            <select
                              value={curStyle.boxShadow || ""}
                              onChange={(e) =>
                                handleUpdateSubElementStyle(
                                  selectedBlock.id,
                                  activeSubElement.selector,
                                  { boxShadow: e.target.value },
                                )
                              }
                              className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                            >
                              <option value="">Por defecto</option>
                              <option value="none">Sin sombra</option>
                              <option value="0 4px 12px rgba(0,0,0,0.06)">
                                Sombra sutil
                              </option>
                              <option value="0 12px 28px -6px rgba(0,0,0,0.14)">
                                Sombra media
                              </option>
                              <option value="0 20px 44px -10px rgba(0,0,0,0.24)">
                                Sombra pronunciada
                              </option>
                            </select>
                          </div>
                        </div>

                        {/* Insert Inner Element next to / inside selected sub-element */}
                        <div className="p-3.5 space-y-2.5">
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                            + Insertar Elemento Aquí
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(
                              [
                                { kind: "button", label: "+ Botón" },
                                { kind: "image", label: "+ Imagen" },
                                { kind: "heading", label: "+ Título" },
                                { kind: "text", label: "+ Párrafo" },
                                { kind: "badge", label: "+ Insignia" },
                                { kind: "card", label: "+ Tarjeta" },
                              ] as const
                            ).map((item) => (
                              <button
                                key={item.kind}
                                type="button"
                                onClick={() =>
                                  handleInsertInnerElement(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    item.kind,
                                  )
                                }
                                className="rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 px-2 text-[11px] font-semibold text-zinc-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 transition"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                ) : (
                  /* ========================================================= */
                  /* BLOCK ROOT INSPECTOR                                      */
                  /* ========================================================= */
                  <>
                    {/* Block Header & Module Actions */}
                    <div className="p-3.5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {selectedBlock.moduleKey}
                        </span>
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

                      <div className="flex items-center gap-2 rounded-lg border border-violet-200/80 bg-violet-50/50 px-2.5 py-2 text-[11px] text-violet-900">
                        <MousePointerClick className="h-4 w-4 shrink-0 text-violet-600" />
                        <span>
                          Hacé clic en cualquier <strong>botón, tarjeta, título o foto</strong> dentro del lienzo para editar su estilo o duplicarlo.
                        </span>
                      </div>

                      {/* Quick Buttons: Edit Module Code & Save as Reusable Module */}
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCodeDrawerMode((m) =>
                              m === "block" ? "closed" : "block",
                            );
                            setCodeTab("html");
                          }}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                            codeDrawerMode === "block"
                              ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
                              : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                          }`}
                        >
                          <Code2 className="h-3.5 w-3.5 text-amber-600" />
                          Código HTML/JS
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

                    {/* Insert Inner Elements into Block without touching code */}
                    <div className="p-3.5 space-y-2.5">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        + Insertar Elemento en el Bloque
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { kind: "button", label: "+ Botón CTA" },
                            { kind: "image", label: "+ Imagen" },
                            { kind: "heading", label: "+ Título" },
                            { kind: "text", label: "+ Párrafo" },
                            { kind: "badge", label: "+ Insignia" },
                            { kind: "card", label: "+ Tarjeta" },
                          ] as const
                        ).map((item) => (
                          <button
                            key={item.kind}
                            type="button"
                            onClick={() =>
                              handleInsertInnerElement(
                                selectedBlock.id,
                                null,
                                item.kind,
                              )
                            }
                            className="rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 px-2 text-[11px] font-semibold text-zinc-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Content Fields ({{variables}}) */}
                    <div className="p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                          <Type className="h-3.5 w-3.5 text-zinc-400" />
                          Contenido Editable ({selectedBlock.fields.length})
                        </span>
                      </div>

                      {selectedBlock.fields.length === 0 ? (
                        <p className="text-xs text-zinc-500">
                          Este módulo no tiene variables{" "}
                          <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                            {"{{variable}}"}
                          </code>
                          . Usá los botones de arriba o abrí{" "}
                          <strong>Código HTML/JS</strong>.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {selectedBlock.fields.map((field) => {
                            const val =
                              selectedBlock.values[field.key] ??
                              field.defaultValue ??
                              "";
                            const isImageField =
                              field.type === "image" ||
                              /image|img|photo|foto|logo|banner|thumb/i.test(
                                field.key,
                              );

                            return (
                              <div key={field.key} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-medium text-zinc-700">
                                    {field.label}
                                  </label>
                                  <code className="text-[10px] text-zinc-400 font-mono">
                                    {`{{${field.key}}}`}
                                  </code>
                                </div>

                                {isImageField ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <div className="h-10 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                                        {val ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={val}
                                            alt={field.label}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : null}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setMediaPickerTarget({
                                            kind: "field",
                                            blockId: selectedBlock.id,
                                            fieldKey: field.key,
                                            currentUrl: val,
                                            title: `Imagen: ${field.label}`,
                                          })
                                        }
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                      >
                                        <ImageIcon className="h-3.5 w-3.5" />
                                        Elegir / Subir Foto
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={val}
                                      onChange={(e) =>
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          field.key,
                                          e.target.value,
                                        )
                                      }
                                      placeholder="URL de la imagen..."
                                      className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-700 focus:outline-none focus:border-blue-500 focus:bg-white"
                                    />
                                  </div>
                                ) : field.type === "textarea" ? (
                                  <textarea
                                    rows={2}
                                    value={val}
                                    onChange={(e) =>
                                      handleUpdateBlockValue(
                                        selectedBlock.id,
                                        field.key,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                                  />
                                ) : field.type === "color" ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={
                                        val.startsWith("#") ? val : "#c49a45"
                                      }
                                      onChange={(e) =>
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          field.key,
                                          e.target.value,
                                        )
                                      }
                                      className="h-7 w-8 rounded bg-transparent border border-zinc-300 cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={val}
                                      onChange={(e) =>
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          field.key,
                                          e.target.value,
                                        )
                                      }
                                      className="flex-1 rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1 text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                                    />
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={val}
                                    onChange={(e) =>
                                      handleUpdateBlockValue(
                                        selectedBlock.id,
                                        field.key,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Appearance & Layout Overrides (Framely Right Panel style!) */}
                    <div className="p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                          Appearance & Layout
                        </span>
                        {(selectedBlock.values.__bgColor ||
                          selectedBlock.values.__bgImage ||
                          selectedBlock.values.__textColor ||
                          selectedBlock.values.__paddingY ||
                          selectedBlock.values.__textAlign ||
                          (selectedBlock.values.__borderWidth &&
                            selectedBlock.values.__borderWidth !== "0px") ||
                          selectedBlock.values.__borderColor ||
                          (selectedBlock.values.__borderRadius &&
                            selectedBlock.values.__borderRadius !== "0px")) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBlockValues(selectedBlock.id, {
                                __bgColor: "",
                                __bgImage: "",
                                __textColor: "",
                                __paddingY: "",
                                __textAlign: "",
                                __borderWidth: "",
                                __borderColor: "",
                                __borderRadius: "",
                              })
                            }
                            className="text-[10px] text-zinc-500 hover:text-zinc-800 underline"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {/* Fill Color */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-600">Fill Color</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={
                              selectedBlock.values.__bgColor ||
                              documentState.theme.bgColor
                            }
                            onChange={(e) =>
                              handleUpdateBlockValue(
                                selectedBlock.id,
                                "__bgColor",
                                e.target.value,
                              )
                            }
                            className="h-6 w-6 rounded border border-zinc-300 bg-transparent cursor-pointer"
                          />
                          <input
                            type="text"
                            placeholder="Por defecto"
                            value={selectedBlock.values.__bgColor ?? ""}
                            onChange={(e) =>
                              handleUpdateBlockValue(
                                selectedBlock.id,
                                "__bgColor",
                                e.target.value,
                              )
                            }
                            className="w-24 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-[11px] font-mono text-zinc-800 focus:bg-white"
                          />
                          {selectedBlock.values.__bgColor && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__bgColor",
                                  "",
                                )
                              }
                              className="p-0.5 text-zinc-400 hover:text-zinc-700"
                              title="Quitar color personalizado"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Background Image */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-600">
                          Background Image
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
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-600">Text Color</span>
                        <div className="flex items-center gap-1.5">
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
                            className="h-6 w-6 rounded border border-zinc-300 bg-transparent cursor-pointer"
                          />
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
                            className="w-24 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-[11px] font-mono text-zinc-800 focus:bg-white"
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
                              className="p-0.5 text-zinc-400 hover:text-zinc-700"
                              title="Quitar color personalizado"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Text Alignment */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-600">
                          Text Alignment
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

                      {/* Vertical Padding */}
                      <div>
                        <span className="block text-xs text-zinc-600 mb-1.5">
                          Vertical Spacing
                        </span>
                        <div className="grid grid-cols-4 gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                          {[
                            { label: "S", val: "24px" },
                            { label: "M", val: "48px" },
                            { label: "L", val: "80px" },
                            { label: "XL", val: "112px" },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__paddingY",
                                  selectedBlock.values.__paddingY === opt.val
                                    ? ""
                                    : opt.val,
                                )
                              }
                              className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                                selectedBlock.values.__paddingY === opt.val
                                  ? "bg-white text-zinc-900 shadow-2xs"
                                  : "text-zinc-500 hover:text-zinc-800"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stroke & Corner Radius */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[11px] text-zinc-600 mb-1">
                            Border Width
                          </span>
                          <select
                            value={selectedBlock.values.__borderWidth || "0px"}
                            onChange={(e) =>
                              handleUpdateBlockValue(
                                selectedBlock.id,
                                "__borderWidth",
                                e.target.value === "0px" ? "" : e.target.value,
                              )
                            }
                            className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800 focus:bg-white"
                          >
                            <option value="0px">0px (Sin borde)</option>
                            <option value="1px">1px</option>
                            <option value="2px">2px</option>
                            <option value="4px">4px</option>
                          </select>
                        </div>
                        <div>
                          <span className="block text-[11px] text-zinc-600 mb-1">
                            Border Radius
                          </span>
                          <select
                            value={selectedBlock.values.__borderRadius || "0px"}
                            onChange={(e) =>
                              handleUpdateBlockValue(
                                selectedBlock.id,
                                "__borderRadius",
                                e.target.value === "0px" ? "" : e.target.value,
                              )
                            }
                            className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800 focus:bg-white"
                          >
                            <option value="0px">0px</option>
                            <option value="12px">12px</option>
                            <option value="20px">20px</option>
                            <option value="32px">32px</option>
                          </select>
                        </div>
                      </div>

                      {selectedBlock.values.__borderWidth &&
                        selectedBlock.values.__borderWidth !== "0px" && (
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-xs text-zinc-600">
                              Border Color
                            </span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={
                                  selectedBlock.values.__borderColor ||
                                  documentState.theme.borderColor
                                }
                                onChange={(e) =>
                                  handleUpdateBlockValue(
                                    selectedBlock.id,
                                    "__borderColor",
                                    e.target.value,
                                  )
                                }
                                className="h-6 w-6 rounded border border-zinc-300 bg-transparent cursor-pointer"
                              />
                              <input
                                type="text"
                                placeholder="Por defecto"
                                value={selectedBlock.values.__borderColor ?? ""}
                                onChange={(e) =>
                                  handleUpdateBlockValue(
                                    selectedBlock.id,
                                    "__borderColor",
                                    e.target.value,
                                  )
                                }
                                className="w-24 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-[11px] font-mono text-zinc-800 focus:bg-white"
                              />
                            </div>
                          </div>
                        )}
                    </div>
                  </>
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
            /* DESIGN TAB (Identical to OpenPage's Presets & Backgrounds!)   */
            /* ============================================================= */
            <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
              {/* PRESETS 2-Column Visual Grid with Color Dots */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 mb-2.5">
                  PRESETS
                </span>
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
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                          isCurrent
                            ? "bg-emerald-50 border-emerald-500 shadow-2xs"
                            : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-2">
                          {preset.dots.map((dot, i) => (
                            <span
                              key={i}
                              className="h-3 w-3 rounded-full border border-black/10"
                              style={{ backgroundColor: dot }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-zinc-800">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Backgrounds & Surfaces Card (OpenPage style) */}
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 space-y-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-800">
                    Backgrounds & Surfaces
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

                {(
                  [
                    { key: "bgColor", label: "Base" },
                    { key: "cardBgColor", label: "Surface 1 (Cards)" },
                    { key: "borderColor", label: "Border / Divider" },
                  ] as const
                ).map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-[11px] text-zinc-600">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={documentState.theme[key]}
                        onChange={(e) =>
                          handleUpdateTheme({ [key]: e.target.value })
                        }
                        className="h-6 w-6 rounded border border-zinc-300 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={documentState.theme[key]}
                        onChange={(e) =>
                          handleUpdateTheme({ [key]: e.target.value })
                        }
                        className="w-22 rounded-md bg-white border border-zinc-200 px-2 py-1 text-[11px] font-mono text-zinc-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Brand & Accents Card */}
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 space-y-2.5">
                <span className="block text-xs font-semibold text-zinc-800 mb-1">
                  Brand & Accents
                </span>
                {(
                  [
                    { key: "primaryColor", label: "Primary" },
                    { key: "primaryLightColor", label: "Primary Hover" },
                    { key: "accentColor", label: "Accent" },
                  ] as const
                ).map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-[11px] text-zinc-600">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={documentState.theme[key]}
                        onChange={(e) =>
                          handleUpdateTheme({ [key]: e.target.value })
                        }
                        className="h-6 w-6 rounded border border-zinc-300 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={documentState.theme[key]}
                        onChange={(e) =>
                          handleUpdateTheme({ [key]: e.target.value })
                        }
                        className="w-22 rounded-md bg-white border border-zinc-200 px-2 py-1 text-[11px] font-mono text-zinc-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Text Colors Card */}
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 space-y-2.5">
                <span className="block text-xs font-semibold text-zinc-800 mb-1">
                  Text
                </span>
                {(
                  [
                    { key: "textColor", label: "Primary Text" },
                    { key: "mutedTextColor", label: "Muted Text" },
                  ] as const
                ).map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-[11px] text-zinc-600">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={documentState.theme[key]}
                        onChange={(e) =>
                          handleUpdateTheme({ [key]: e.target.value })
                        }
                        className="h-6 w-6 rounded border border-zinc-300 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={documentState.theme[key]}
                        onChange={(e) =>
                          handleUpdateTheme({ [key]: e.target.value })
                        }
                        className="w-22 rounded-md bg-white border border-zinc-200 px-2 py-1 text-[11px] font-mono text-zinc-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Typography & Radius */}
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 space-y-2.5">
                <span className="block text-xs font-semibold text-zinc-800 mb-1">
                  Typography & Radius
                </span>
                <div>
                  <label className="block text-[11px] text-zinc-600 mb-1">
                    Heading Font
                  </label>
                  <input
                    type="text"
                    value={documentState.theme.fontHeading}
                    onChange={(e) =>
                      handleUpdateTheme({ fontHeading: e.target.value })
                    }
                    className="w-full rounded-md bg-white border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-600 mb-1">
                    Body Font
                  </label>
                  <input
                    type="text"
                    value={documentState.theme.fontBody}
                    onChange={(e) =>
                      handleUpdateTheme({ fontBody: e.target.value })
                    }
                    className="w-full rounded-md bg-white border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-zinc-600 mb-1">
                      Radius MD
                    </label>
                    <input
                      type="text"
                      value={documentState.theme.radiusMd}
                      onChange={(e) =>
                        handleUpdateTheme({ radiusMd: e.target.value })
                      }
                      className="w-full rounded-md bg-white border border-zinc-200 px-2 py-1 text-xs font-mono text-zinc-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-600 mb-1">
                      Radius LG
                    </label>
                    <input
                      type="text"
                      value={documentState.theme.radiusLg}
                      onChange={(e) =>
                        handleUpdateTheme({ radiusLg: e.target.value })
                      }
                      className="w-full rounded-md bg-white border border-zinc-200 px-2 py-1 text-xs font-mono text-zinc-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

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
