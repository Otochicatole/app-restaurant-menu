import { useState, useMemo } from "react";
import { Link2, Unlink, Grid, Rows, CornerUpLeft, CornerUpRight, CornerDownLeft, CornerDownRight } from "lucide-react";
import { type SubElementStyleOverride } from "../contracts";
import { type SelectedSubElementInfo } from "./landing-workspace";
import { DirectionalInput, StudioAlphaColorField } from "./LandingInspectorFields";

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

export function StudioBordersAndCornersEditor({
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

export function StudioLayoutAndDisplayEditor({
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

export function StudioDimensionsAndPositionEditor({
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

      {/* 3. PROPORCIÓN Y DESBORDE */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          <span className="text-xs font-semibold text-zinc-800">
            Proporción y Desborde (Aspect & Overflow)
          </span>
        </div>
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
      </div>

      {/* 4. POSICIONAMIENTO Y COORDENADAS (POSITION, TOP, RIGHT, BOTTOM, LEFT, Z-INDEX) */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-semibold text-zinc-800">
              Posicionamiento (Position)
            </span>
          </div>
          {style.position && (
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-indigo-700 uppercase">
              {style.position}
            </span>
          )}
        </div>

        {/* Dropdown Selector de Posición */}
        <div>
          <select
            value={style.position || ""}
            onChange={(e) => onUpdateStyle({ position: e.target.value })}
            className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 focus:bg-white focus:border-indigo-500 focus:outline-none font-medium"
          >
            <option value="">Normal / Estática (static)</option>
            <option value="relative">Relativa (relative)</option>
            <option value="absolute">Absoluta (absolute)</option>
            <option value="fixed">Fija en pantalla (fixed)</option>
            <option value="sticky">Pegajosa / Fija al scroll (sticky)</option>
          </select>
        </div>

        {/* Botones de acceso rápido a los tipos de position */}
        <div className="grid grid-cols-5 gap-1">
          {[
            { id: "", label: "Static", title: "Flujo normal del documento" },
            { id: "relative", label: "Relative", title: "Desplazamiento relativo a su posición natural" },
            { id: "absolute", label: "Absolute", title: "Posicionamiento absoluto respecto al ancestro con posición" },
            { id: "fixed", label: "Fixed", title: "Fijo en la ventana del navegador (viewport)" },
            { id: "sticky", label: "Sticky", title: "Pegajoso al hacer scroll" },
          ].map((pos) => {
            const isActive = (style.position || "") === pos.id;
            return (
              <button
                key={pos.id || "static"}
                type="button"
                title={pos.title}
                onClick={() => onUpdateStyle({ position: pos.id })}
                className={`py-1 px-0.5 rounded text-[10px] font-medium text-center transition-colors truncate ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                    : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                }`}
              >
                {pos.label}
              </button>
            );
          })}
        </div>

        {/* COORDENADAS: TOP, RIGHT, BOTTOM, LEFT */}
        <div className="pt-2 border-t border-zinc-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1">
              <span>Coordenadas de Ubicación</span>
              {Boolean(style.top || style.right || style.bottom || style.left) && (
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              )}
            </span>
            {Boolean(style.top || style.right || style.bottom || style.left) && (
              <button
                type="button"
                onClick={() =>
                  onUpdateStyle({
                    top: "",
                    right: "",
                    bottom: "",
                    left: "",
                  })
                }
                className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                title="Limpiar todas las coordenadas"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Matriz Visual de Anclaje Rápido (Pin Presets) */}
          <div className="bg-zinc-50 rounded-lg p-2 border border-zinc-200/80 space-y-1.5">
            <span className="block text-[9px] font-medium uppercase tracking-wider text-zinc-400">
              Anclaje Rápido (Presets)
            </span>
            <div className="grid grid-cols-3 gap-1">
              {[
                {
                  label: "↖ Arr-Izq",
                  title: "Superior Izquierda (Top: 0, Left: 0)",
                  patch: { top: "0px", left: "0px", right: "", bottom: "" },
                },
                {
                  label: "⬆ Arr-Centro",
                  title: "Superior Centrado (Top: 0, Left: 50%)",
                  patch: { top: "0px", left: "50%", right: "", bottom: "" },
                },
                {
                  label: "↗ Arr-Der",
                  title: "Superior Derecha (Top: 0, Right: 0)",
                  patch: { top: "0px", right: "0px", left: "", bottom: "" },
                },
                {
                  label: "⬅ Cen-Izq",
                  title: "Centro Izquierda (Top: 50%, Left: 0)",
                  patch: { top: "50%", left: "0px", right: "", bottom: "" },
                },
                {
                  label: "⏺ Centro",
                  title: "Centro Absoluto (Top: 50%, Left: 50%)",
                  patch: { top: "50%", left: "50%", right: "", bottom: "" },
                },
                {
                  label: "➡ Cen-Der",
                  title: "Centro Derecha (Top: 50%, Right: 0)",
                  patch: { top: "50%", right: "0px", left: "", bottom: "" },
                },
                {
                  label: "↙ Aba-Izq",
                  title: "Inferior Izquierda (Bottom: 0, Left: 0)",
                  patch: { bottom: "0px", left: "0px", top: "", right: "" },
                },
                {
                  label: "⬇ Aba-Centro",
                  title: "Inferior Centrado (Bottom: 0, Left: 50%)",
                  patch: { bottom: "0px", left: "50%", top: "", right: "" },
                },
                {
                  label: "↘ Aba-Der",
                  title: "Inferior Derecha (Bottom: 0, Right: 0)",
                  patch: { bottom: "0px", right: "0px", top: "", left: "" },
                },
              ].map((pin) => (
                <button
                  key={pin.label}
                  type="button"
                  title={pin.title}
                  onClick={() =>
                    onUpdateStyle({
                      ...pin.patch,
                      ...(!style.position || style.position === "static"
                        ? { position: "absolute" }
                        : {}),
                    })
                  }
                  className="px-1 py-1 rounded bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-zinc-200 text-[10px] font-medium text-zinc-700 transition-colors shadow-2xs text-center"
                >
                  {pin.label}
                </button>
              ))}
            </div>

            {/* Presets adicionales: Inset 0 (Cubrir todo) */}
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateStyle({
                    top: "0px",
                    right: "0px",
                    bottom: "0px",
                    left: "0px",
                    ...(!style.position || style.position === "static"
                      ? { position: "absolute" }
                      : {}),
                  })
                }
                className="flex-1 py-1 px-1.5 rounded bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-zinc-200 text-[10px] font-medium text-zinc-700 text-center transition-colors shadow-2xs"
                title="Cubrir todo el contenedor (Top: 0, Right: 0, Bottom: 0, Left: 0)"
              >
                ⤢ Cubrir Todo (Inset 0)
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateStyle({
                    top: "",
                    right: "",
                    bottom: "",
                    left: "",
                  })
                }
                className="py-1 px-2 rounded bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-zinc-200 text-[10px] font-medium text-zinc-500 text-center transition-colors shadow-2xs"
                title="Limpiar coordenadas (auto)"
              >
                Restablecer
              </button>
            </div>
          </div>

          {/* 4 Inputs Direccionales (Top, Right, Bottom, Left) */}
          <div className="grid grid-cols-4 gap-1.5">
            <div>
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                Top
              </span>
              <DirectionalInput
                value={style.top ?? ""}
                placeholder={computedStyles?.top || "auto"}
                title="Posición Superior (top)"
                variant="position"
                onChange={(val) =>
                  onUpdateStyle({
                    top: val,
                    ...(!style.position || style.position === "static"
                      ? { position: "absolute" }
                      : {}),
                  })
                }
                className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-indigo-500 focus:outline-none text-zinc-800"
              />
            </div>
            <div>
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                Der
              </span>
              <DirectionalInput
                value={style.right ?? ""}
                placeholder={computedStyles?.right || "auto"}
                title="Posición Derecha (right)"
                variant="position"
                onChange={(val) =>
                  onUpdateStyle({
                    right: val,
                    ...(!style.position || style.position === "static"
                      ? { position: "absolute" }
                      : {}),
                  })
                }
                className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-indigo-500 focus:outline-none text-zinc-800"
              />
            </div>
            <div>
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                Abajo
              </span>
              <DirectionalInput
                value={style.bottom ?? ""}
                placeholder={computedStyles?.bottom || "auto"}
                title="Posición Inferior (bottom)"
                variant="position"
                onChange={(val) =>
                  onUpdateStyle({
                    bottom: val,
                    ...(!style.position || style.position === "static"
                      ? { position: "absolute" }
                      : {}),
                  })
                }
                className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-indigo-500 focus:outline-none text-zinc-800"
              />
            </div>
            <div>
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5 text-center">
                Izq
              </span>
              <DirectionalInput
                value={style.left ?? ""}
                placeholder={computedStyles?.left || "auto"}
                title="Posición Izquierda (left)"
                variant="position"
                onChange={(val) =>
                  onUpdateStyle({
                    left: val,
                    ...(!style.position || style.position === "static"
                      ? { position: "absolute" }
                      : {}),
                  })
                }
                className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50/80 focus:bg-white focus:border-indigo-500 focus:outline-none text-zinc-800"
              />
            </div>
          </div>
        </div>

        {/* Z-INDEX (CAPA / PROFUNDIDAD) */}
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
          <div>
            <span className="block text-[10px] font-semibold text-zinc-700">
              Capa Z (z-index)
            </span>
            <span className="text-[9px] text-zinc-400">
              Superposición visual
            </span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={style.zIndex ?? ""}
              placeholder={computedStyles?.zIndex || "auto"}
              onChange={(e) => onUpdateStyle({ zIndex: e.target.value })}
              className="w-16 h-6 text-center text-[11px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              title="z-index (número o auto)"
            />
            {["0", "10", "20", "50"].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() =>
                  onUpdateStyle({ zIndex: style.zIndex === z ? "" : z })
                }
                className={`px-1.5 h-6 rounded text-[9px] font-mono font-medium transition-colors ${
                  style.zIndex === z
                    ? "bg-indigo-600 text-white font-semibold"
                    : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>

        {/* NOTA CONTEXTUAL EXPLICATIVA */}
        {style.position === "absolute" && (
          <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 p-2 text-[10px] text-indigo-900 leading-relaxed">
            <span className="font-semibold block mb-0.5">💡 Posición Absoluta:</span>
            El elemento se ubica en las coordenadas indicadas (top, right, bottom, left) respecto a su contenedor padre más cercano que tenga posición (ej. <code className="bg-white/80 px-1 py-0.5 rounded text-indigo-800 font-mono">relative</code>).
          </div>
        )}
        {style.position === "fixed" && (
          <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 p-2 text-[10px] text-indigo-900 leading-relaxed">
            <span className="font-semibold block mb-0.5">💡 Posición Fixed (Fija):</span>
            El elemento permanece anclado en la ventana del navegador (viewport) incluso al desplazarse o hacer scroll por la página.
          </div>
        )}
        {style.position === "sticky" && (
          <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 p-2 text-[10px] text-indigo-900 leading-relaxed">
            <span className="font-semibold block mb-0.5">💡 Posición Sticky:</span>
            El elemento se desplaza en el flujo normal hasta que alcanza el umbral de scroll especificado (ej. <code className="bg-white/80 px-1 py-0.5 rounded text-indigo-800 font-mono">top: 0px</code>).
          </div>
        )}
        {style.position === "relative" && (
          <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 p-2 text-[10px] text-indigo-900 leading-relaxed">
            <span className="font-semibold block mb-0.5">💡 Posición Relativa:</span>
            Permite desplazar el elemento desde su posición original y sirve como referencia de anclaje para los elementos hijos con posición absoluta.
          </div>
        )}
      </div>
    </div>
  );
}
