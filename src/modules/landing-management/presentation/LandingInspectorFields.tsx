import React, { useState, useMemo, useId } from "react";
import { ChevronDown, AlignCenter, X, Link2, Unlink } from "lucide-react";

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
  variant?: "neutral" | "margin" | "padding" | "position";
  className?: string;
}

export function DirectionalInput({
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
    } else if (variant === "position") {
      variantClasses =
        "border-indigo-400 bg-indigo-50 text-indigo-950 font-semibold shadow-2xs";
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

export function BoxModelSpacingEditor({
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

export function StudioInspectorSection({
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

export function StudioAlphaColorField({
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

export function StudioElementOpacityField({
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
