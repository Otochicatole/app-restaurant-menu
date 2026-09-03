"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Eye, EyeOff, Layers, LockKeyhole, MousePointer2, Paintbrush, Scan, SlidersHorizontal, Square, Trash2, Type, Unlock } from "lucide-react";
import { STROKE_SIDES, SYSTEM_FONT_FAMILIES, type CanvasDocumentV1, type CanvasGroup, type CanvasNode, type CornerRadiusKey, type FillGradient, type MenuAssetView, type RectangleBackgroundImage, type StrokeSide } from "../contracts";
import { descendantNodeIds, groupLayerState, nodeLayerState } from "../domain/layer-tree";
import { allCornerRadii, hasAllStrokeSides, toggleStrokeSide } from "../domain/rectangle-border";
import { HexColorInput } from "./HexColorInput";

type InspectorProps = {
  node: CanvasNode | null;
  group: CanvasGroup | null;
  selectedCount: number;
  document: CanvasDocumentV1;
  assets: MenuAssetView[];
  onCanvasSizeChange: (dimension: "width" | "height", value: number) => void;
  onOpenModalMedia: () => void;
  onOpenBackgroundImage: () => void;
  onChange: (patch: Partial<CanvasNode>) => void;
  onChangeSelected: (patch: Partial<CanvasNode>) => void;
  onDuplicate: () => void;
  onMoveLayer: (delta: number) => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onOpacityChange: (opacity: number) => void;
  onGroupChange: (patch: Partial<Pick<CanvasGroup, "name" | "visible" | "locked">>) => void;
  onUngroup: () => void;
};

const fieldClass = "mt-1.5 min-w-0 w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-zinc-100 disabled:text-zinc-400";
const labelClass = "block min-w-0 text-xs font-medium text-zinc-700";
const buttonClass = "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-40";

export function CanvasInspector({ node, group, selectedCount, document, assets, onCanvasSizeChange, onOpenModalMedia, onOpenBackgroundImage, onChange, onChangeSelected, onDuplicate, onMoveLayer, onDelete, onRename, onOpacityChange, onGroupChange, onUngroup }: InspectorProps) {
  if (group) {
    const state = groupLayerState(document, group);
    const descendants = descendantNodeIds(document, group.id);
    return <InspectorLayout title="Grupo" description={`${descendants.length} ${descendants.length === 1 ? "capa" : "capas"} en este árbol.`}
      header={<>
        <div className="mt-3 flex items-end gap-2">
          <GroupNameField key={group.name} value={group.name} disabled={state.effectiveLocked} onCommit={(name) => onGroupChange({ name })} />
          <button type="button" className={buttonClass + " shrink-0 px-2"} aria-label={group.visible ? "Ocultar grupo" : "Mostrar grupo"} title={group.visible ? "Ocultar grupo" : "Mostrar grupo"} onClick={() => onGroupChange({ visible: !group.visible })}>{group.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
          <button type="button" className={buttonClass + (group.locked ? " shrink-0 border-amber-300 bg-amber-50 px-2 text-amber-800" : " shrink-0 px-2")} aria-label={group.locked ? "Desbloquear grupo" : "Bloquear grupo"} title={group.locked ? "Desbloquear grupo" : "Bloquear grupo"} onClick={() => onGroupChange({ locked: !group.locked })}>{group.locked ? <LockKeyhole size={16} /> : <Unlock size={16} />}</button>
        </div>
        {(state.inheritedHidden || state.inheritedLocked) && <p className="mt-2 text-xs leading-5 text-amber-800">{state.inheritedHidden ? "Oculto" : "Bloqueado"} por un grupo superior. El estado propio se conserva.</p>}
      </>}
      footer={<div className="space-y-2"><button type="button" className={buttonClass + " w-full"} disabled={state.effectiveLocked} onClick={onDuplicate}><Copy size={14} aria-hidden="true" />Duplicar grupo</button><button type="button" className={buttonClass + " w-full border-red-200 text-red-700 hover:bg-red-50"} disabled={state.effectiveLocked} onClick={onUngroup}><Layers size={14} aria-hidden="true" />Desagrupar y conservar capas</button><ClipboardShortcutHint /></div>}>
      <InspectorSection title="Estado del grupo" icon={<Layers size={16} />} description="Ocultar o bloquear el grupo no cambia el estado individual de sus capas." defaultOpen>
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-700"><input className="accent-emerald-700" type="checkbox" checked={group.visible} onChange={(event) => onGroupChange({ visible: event.target.checked })} />Mostrar grupo</label>
        <label className="mt-3 flex items-center gap-2 text-xs font-medium text-zinc-700"><input className="accent-emerald-700" type="checkbox" checked={group.locked} onChange={(event) => onGroupChange({ locked: event.target.checked })} />Bloquear grupo</label>
      </InspectorSection>
      <InspectorSection title="Orden" icon={<Layers size={16} />} defaultOpen>
        <div className="grid grid-cols-2 gap-2"><button type="button" className={buttonClass} disabled={state.effectiveLocked} onClick={() => onMoveLayer(1)}><ArrowUp size={14} />Adelante</button><button type="button" className={buttonClass} disabled={state.effectiveLocked} onClick={() => onMoveLayer(-1)}><ArrowDown size={14} />Atrás</button></div>
      </InspectorSection>
    </InspectorLayout>;
  }

  if (!node) {
    return <InspectorLayout title="Lienzo" description="Seleccioná un objeto para editar sus propiedades.">
      <InspectorSection title="Tamaño de la carta" icon={<Scan size={16} />} description="El área visible de tu menú público." defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Ancho" value={document.canvasBounds.width} unit="px" onChange={(value) => onCanvasSizeChange("width", value)} />
          <NumberField label="Alto" value={document.canvasBounds.height} unit="px" onChange={(value) => onCanvasSizeChange("height", value)} />
        </div>
        <p className="mb-2 mt-4 text-xs font-medium text-zinc-700">Formatos rápidos</p>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className={buttonClass} onClick={() => { onCanvasSizeChange("width", 1080); onCanvasSizeChange("height", 1920); }}>Vertical</button>
          <button type="button" className={buttonClass} onClick={() => { onCanvasSizeChange("width", 1920); onCanvasSizeChange("height", 1080); }}>Horizontal</button>
          <button type="button" className={buttonClass} onClick={() => { onCanvasSizeChange("width", 1080); onCanvasSizeChange("height", 1080); }}>Cuadrado</button>
        </div>
      </InspectorSection>
    </InspectorLayout>;
  }

  if (selectedCount > 1) {
    return <InspectorLayout title={selectedCount + " objetos"} description="Las propiedades compartidas se aplican a los objetos desbloqueados." footer={<div className="space-y-2"><button type="button" className={buttonClass + " w-full border-red-200 text-red-700 hover:bg-red-50"} onClick={onDelete}><Trash2 size={14} aria-hidden="true" />Eliminar selección</button><ClipboardShortcutHint /></div>}>
      <InspectorSection title="Tamaño y opacidad" icon={<Scan size={16} />} defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Ancho" unit="px" value={node.width} onChange={(value) => onChangeSelected({ width: value })} />
          <NumberField label="Alto" unit="px" value={node.height} onChange={(value) => onChangeSelected({ height: value })} />
        </div>
        <div className="mt-4"><PercentRangeField label="Opacidad de la selección" value={node.opacity} disabled={false} onChange={(opacity) => onChangeSelected({ opacity })} /></div>
      </InspectorSection>
      <InspectorSection title="Estado de la selección" icon={<Layers size={16} />} defaultOpen>
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-700"><input className="accent-emerald-700" type="checkbox" checked={node.locked} onChange={(event) => onChangeSelected({ locked: event.target.checked })} />Bloquear selección</label>
        <label className="mt-3 flex items-center gap-2 text-xs font-medium text-zinc-700"><input className="accent-emerald-700" type="checkbox" checked={node.visible} onChange={(event) => onChangeSelected({ visible: event.target.checked })} />Mostrar objetos</label>
      </InspectorSection>
    </InspectorLayout>;
  }

  const typeLabel = node.type === "text" ? "Texto" : node.type === "image" ? "Imagen" : node.type === "shape" ? ({ rect: "Rectángulo", ellipse: "Elipse", line: "Línea", arrow: "Flecha", triangle: "Triángulo", star: "Estrella" }[node.shape]) : "Icono";
  const layerState = nodeLayerState(document, node);
  const disabled = layerState.effectiveLocked;
  const modalAsset = node.type === "text" && node.modalAssetId ? assets.find((asset) => asset.id === node.modalAssetId) : undefined;
  return <InspectorLayout title={typeLabel}
    header={<>
      <div className="mt-3 flex items-end gap-2">
        <label className={labelClass + " flex-1"}>Nombre de la capa<input disabled={disabled} className={fieldClass} value={node.name ?? ""} placeholder={"Ej. " + typeLabel.toLowerCase() + " principal"} onChange={(event) => onRename(event.target.value)} /></label>
        <button type="button" className={buttonClass + " shrink-0 px-2"} disabled={disabled} aria-label={node.visible ? "Ocultar objeto" : "Mostrar objeto"} title={node.visible ? "Ocultar objeto" : "Mostrar objeto"} onClick={() => onChange({ visible: !node.visible })}>{node.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
        <button type="button" className={buttonClass + (node.locked ? " shrink-0 border-amber-300 bg-amber-50 px-2 text-amber-800" : " shrink-0 px-2")} aria-label={node.locked ? "Desbloquear objeto" : "Bloquear objeto"} title={layerState.inheritedLocked && !node.locked ? "Bloqueado por un grupo superior" : node.locked ? "Desbloquear objeto" : "Bloquear objeto"} onClick={() => onChange({ locked: !node.locked })}>{node.locked ? <LockKeyhole size={16} /> : <Unlock size={16} />}</button>
      </div>
      {(disabled || !layerState.effectiveVisible) && <p className="mt-2 text-xs leading-5 text-amber-800">{layerState.inheritedLocked ? "Objeto bloqueado por un grupo superior." : node.locked ? "Objeto bloqueado. Desbloquealo para editar." : layerState.inheritedHidden ? "Objeto oculto por un grupo superior." : "Objeto oculto en el menú."}</p>}
    </>}
    footer={<div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={buttonClass} disabled={disabled} onClick={onDuplicate}><Copy size={14} aria-hidden="true" />Duplicar</button>
        <button type="button" className={buttonClass + " border-red-200 text-red-700 hover:bg-red-50"} disabled={disabled} onClick={onDelete}><Trash2 size={14} aria-hidden="true" />Eliminar</button>
      </div>
      <ClipboardShortcutHint />
    </div>}>
    {node.type === "text" && <InspectorSection title="Texto y tipografía" icon={<Type size={16} />} defaultOpen>
      <label className={labelClass}>Contenido<textarea disabled={disabled} className={fieldClass + " min-h-24 resize-y text-sm"} value={node.text} onChange={(event) => onChange({ text: event.target.value })} /></label>
      <label className={labelClass + " mt-4"}>Fuente<select disabled={disabled} className={fieldClass} value={node.fontAssetId ? "asset:" + node.fontAssetId : "system:" + (node.fontFamily ?? "Arial")} onChange={(event) => { const value = event.target.value; onChange(value.startsWith("asset:") ? { fontAssetId: value.slice(6), fontFamily: undefined } : { fontAssetId: null, fontFamily: value.slice(7) as typeof SYSTEM_FONT_FAMILIES[number] }); }}><optgroup label="Fuentes del sistema">{SYSTEM_FONT_FAMILIES.map((family) => <option key={family} value={"system:" + family} style={{ fontFamily: family }}>{family}</option>)}</optgroup><optgroup label="Fuentes subidas">{assets.filter((asset) => asset.kind === "FONT").map((asset) => <option key={asset.id} value={"asset:" + asset.id}>{asset.name}</option>)}</optgroup></select></label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <NumberField label="Tamaño" unit="px" value={node.fontSize} disabled={disabled} onChange={(fontSize) => onChange({ fontSize })} />
        <label className={labelClass}>Peso<select disabled={disabled} className={fieldClass} value={node.fontWeight} onChange={(event) => onChange({ fontWeight: event.target.value as typeof node.fontWeight })}><option value="400">Regular</option><option value="500">Medio</option><option value="600">Seminegrita</option><option value="700">Negrita</option><option value="800">Extranegrita</option><option value="900">Muy grueso</option></select></label>
        <label className={labelClass}>Alineación<select disabled={disabled} className={fieldClass} value={node.align} onChange={(event) => onChange({ align: event.target.value as typeof node.align })}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></label>
        <label className={labelClass}>Estilo<select disabled={disabled} className={fieldClass} value={node.fontStyle} onChange={(event) => onChange({ fontStyle: event.target.value as typeof node.fontStyle })}><option value="normal">Normal</option><option value="italic">Cursiva</option></select></label>
      </div>
      <div className="mt-3"><ColorField label="Color del texto" value={node.fill} disabled={disabled} onChange={(fill) => onChange({ fill })} /></div>
    </InspectorSection>}

    {node.type === "shape" && <>
      <InspectorSection title="Relleno y fondo" icon={<Paintbrush size={16} />} description={node.shape === "rect" ? "Color base · imagen · degradado" : undefined} defaultOpen>
        <AlphaColorField label="Color de relleno" value={node.fill ?? "#3A4824"} disabled={disabled} onChange={(fill) => onChange({ fill })} />
        {node.shape === "rect" && <RectFillField node={node} assets={assets} disabled={disabled} onChange={onChange} onOpenBackgroundImage={onOpenBackgroundImage} />}
      </InspectorSection>
      <InspectorSection title="Borde" icon={<Square size={16} />} description={node.stroke && node.strokeWidth > 0 ? node.strokeWidth + " px" : "Sin borde visible"} defaultOpen={Boolean(node.stroke && node.strokeWidth > 0)}>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Grosor del borde" unit="px" value={node.strokeWidth} disabled={disabled} onChange={(strokeWidth) => onChange({ strokeWidth })} />
          <ColorField label="Color del borde" value={node.stroke ?? "#3A4824"} disabled={disabled} onChange={(stroke) => onChange({ stroke })} />
        </div>
        {node.shape === "rect" && <RectBorderSidesField value={node.strokeSides} disabled={disabled} onChange={(strokeSides) => onChange({ strokeSides })} />}
      </InspectorSection>
      {node.shape === "rect" && <InspectorSection title="Esquinas" icon={<Scan size={16} />} description="Radio común o una medida por esquina">
        <RectCornerRadiiField width={node.width} height={node.height} value={node.cornerRadii} disabled={disabled} onChange={(cornerRadii) => onChange({ cornerRadii })} />
      </InspectorSection>}
    </>}

    {node.type === "image" && <InspectorSection title="Imagen" icon={<Paintbrush size={16} />} defaultOpen>
      <label className={labelClass}>Ajuste<select disabled={disabled} className={fieldClass} value={node.fit} onChange={(event) => onChange({ fit: event.target.value as typeof node.fit })}><option value="contain">Contener — imagen completa</option><option value="cover">Cubrir — llenar el espacio</option><option value="stretch">Estirar — adaptar al tamaño</option></select></label>
      <div className="mt-3"><NumberField label="Redondeado" unit="px" value={node.cornerRadius} disabled={disabled} onChange={(value) => onChange({ cornerRadius: Math.max(0, value) })} /></div>
    </InspectorSection>}

    {node.type === "icon" && <InspectorSection title="Estilo del icono" icon={<Paintbrush size={16} />} defaultOpen>
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Color" value={node.fill} disabled={disabled} onChange={(fill) => onChange({ fill })} />
        <NumberField label="Grosor" unit="px" value={node.strokeWidth} disabled={disabled} onChange={(strokeWidth) => onChange({ strokeWidth })} />
      </div>
    </InspectorSection>}

    <InspectorSection title="Posición y tamaño" icon={<Scan size={16} />} description={Math.round(node.width) + " × " + Math.round(node.height) + " px"}>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Ancho" unit="px" value={node.width} disabled={disabled} onChange={(width) => onChange({ width })} />
        <NumberField label="Alto" unit="px" value={node.height} disabled={disabled} onChange={(height) => onChange({ height })} />
        <NumberField label="X" unit="px" value={node.x} disabled={disabled} onChange={(x) => onChange({ x })} />
        <NumberField label="Y" unit="px" value={node.y} disabled={disabled} onChange={(y) => onChange({ y })} />
      </div>
      <div className="mt-3"><NumberField label="Rotación" unit="°" value={node.rotation} disabled={disabled} onChange={(rotation) => onChange({ rotation })} /></div>
    </InspectorSection>

    <InspectorSection title="Al hacer clic" icon={<MousePointer2 size={16} />} description={modalAsset ? "Abrir multimedia" : node.link ? "Abrir enlace en otra pestaña" : "Sin acción configurada"} defaultOpen={Boolean(modalAsset || node.link)}>
      <label className={labelClass}>Enlace<input disabled={disabled} className={fieldClass} type="url" placeholder="https://..." value={node.link ?? ""} onChange={(event) => onChange({ link: event.target.value || null })} /></label>
      <p className="mt-1.5 text-xs leading-5 text-zinc-500">Se abre en una pestaña nueva.</p>
      {node.type === "text" && <div className="mt-4 border-t border-zinc-100 pt-4">
        <p className="text-xs font-semibold text-zinc-800">Imagen o video en un modal</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Funciona en la vista previa y en el menú público.</p>
        <div className="mt-3 rounded-md bg-zinc-50 p-3" aria-live="polite">
          <p className="break-words text-xs font-medium text-zinc-800">{modalAsset?.name ?? "Sin multimedia asociada"}</p>
          {modalAsset && <p className="mt-1 text-xs text-zinc-500">{modalAsset.kind === "VIDEO" ? "Video" : "Imagen"}</p>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={disabled} className={buttonClass + " flex-1 border-emerald-200 text-emerald-800 hover:bg-emerald-50"} onClick={onOpenModalMedia}>{node.modalAssetId ? "Cambiar multimedia" : "Elegir multimedia"}</button>
          {node.modalAssetId && <button type="button" disabled={disabled} className={buttonClass} onClick={() => onChange({ modalAssetId: null })}>Quitar</button>}
        </div>
        {node.modalAssetId && <p className="mt-2 text-xs leading-5 text-emerald-800">La multimedia tiene prioridad sobre el enlace.</p>}
      </div>}
    </InspectorSection>

    <InspectorSection title="Orden y opacidad" icon={<Layers size={16} />} description={Math.round(node.opacity * 100) + "% de opacidad"}>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={buttonClass} disabled={disabled} onClick={() => onMoveLayer(1)}><ArrowUp size={14} aria-hidden="true" />Subir capa</button>
        <button type="button" className={buttonClass} disabled={disabled} onClick={() => onMoveLayer(-1)}><ArrowDown size={14} aria-hidden="true" />Bajar capa</button>
      </div>
      <div className="mt-4"><PercentRangeField label="Opacidad del objeto" value={node.opacity} disabled={disabled} onChange={onOpacityChange} /></div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">Afecta a todo el objeto, incluido el fondo y el borde.</p>
    </InspectorSection>

    {node.type !== "shape" && <InspectorSection title="Accesibilidad" icon={<SlidersHorizontal size={16} />} description="Descripción para lectores de pantalla">
      {node.type === "text" && <label className={labelClass}>Función del texto<select disabled={disabled} className={fieldClass} value={node.semanticRole} onChange={(event) => onChange({ semanticRole: event.target.value as typeof node.semanticRole })}><option value="none">Ninguno</option><option value="heading">Encabezado</option><option value="paragraph">Párrafo</option><option value="label">Etiqueta</option><option value="price">Precio</option></select></label>}
      {node.type === "image" && <label className={labelClass}>Texto alternativo<input disabled={disabled} className={fieldClass} value={node.alt} placeholder="Describí la imagen" onChange={(event) => onChange({ alt: event.target.value })} /></label>}
      {node.type === "icon" && <label className={labelClass}>Nombre accesible<input disabled={disabled} className={fieldClass} value={node.accessibleLabel} onChange={(event) => onChange({ accessibleLabel: event.target.value })} /></label>}
    </InspectorSection>}
  </InspectorLayout>;
}

function GroupNameField({ value, disabled, onCommit }: { value: string; disabled: boolean; onCommit(name: string): void }) {
  const [draft, setDraft] = useState(value);
  const cancelBlur = useRef(false);
  const finish = () => {
    if (cancelBlur.current) { cancelBlur.current = false; return; }
    const name = draft.trim();
    if (name && name !== value) onCommit(name);
    else setDraft(value);
  };
  return <label className={labelClass + " flex-1"}>Nombre del grupo<input className={fieldClass} disabled={disabled} value={draft} maxLength={100} onChange={(event) => setDraft(event.target.value)} onBlur={finish} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { cancelBlur.current = true; setDraft(value); event.currentTarget.blur(); } }} /></label>;
}

function InspectorLayout({ title, description, header, footer, children }: { title: string; description?: string; header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col">
    <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-4">
      <p className="text-xs font-medium text-zinc-500">Propiedades</p>
      <h2 className="mt-1 text-base font-semibold text-zinc-900">{title}</h2>
      {description && <p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>}
      {header}
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4" data-inspector-scroll>{children}</div>
    {footer && <footer className="shrink-0 border-t border-zinc-200 bg-white p-3">{footer}</footer>}
  </div>;
}

function ClipboardShortcutHint() {
  return <p className="text-center text-[10px] leading-4 text-zinc-400"><kbd className="font-sans">Ctrl/⌘ + C</kbd> copiar · <kbd className="font-sans">Ctrl/⌘ + V</kbd> pegar</p>;
}

function InspectorSection({ title, description, icon, defaultOpen = false, children }: { title: string; description?: string; icon: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return <section className="border-b border-zinc-200 last:border-b-0" aria-labelledby={id + "-title"}>
    <h3><button id={id + "-title"} type="button" className="flex w-full items-start gap-2.5 py-4 text-left text-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600" aria-expanded={open} aria-controls={id + "-content"} onClick={() => setOpen(!open)}>
      <span className="mt-0.5 shrink-0 text-zinc-500" aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold">{title}</span>{description && <span className="mt-1 block text-xs font-normal leading-4 text-zinc-500">{description}</span>}</span>
      <ChevronDown size={16} aria-hidden="true" className={"mt-0.5 shrink-0 text-zinc-400 transition-transform " + (open ? "rotate-180" : "")} />
    </button></h3>
    <div id={id + "-content"} hidden={!open} className="pb-4">{children}</div>
  </section>;
}

function NumberField({ label, value, onChange, disabled = false, unit }: { label: string; value: number; onChange: (value: number) => void; disabled?: boolean; unit?: string }) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return <label className={labelClass}><span className="flex items-center justify-between gap-2"><span>{label}</span>{unit && <span className="text-[11px] font-normal text-zinc-500">{unit}</span>}</span><input aria-label={label} disabled={disabled} className={fieldClass} type="number" step="any" value={Math.round(safeValue * 100) / 100} onChange={(event) => onChange(Number(event.target.value) || 0)} /></label>;
}

function ColorField({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const normalized = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value) ? value : "#3A4824";
  const alpha = normalized.length === 9 ? parseInt(normalized.slice(7, 9), 16) / 255 : 1;
  return <div>
    <p className="text-xs font-medium text-zinc-700">{label}</p>
    <div className="mt-1.5 flex items-start gap-2">
      <input aria-label={label} disabled={disabled} className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-zinc-300 bg-white p-1 disabled:opacity-40" type="color" value={normalized.slice(0, 7)} onChange={(event) => onChange(withColorAlpha(event.target.value, alpha))} />
      <HexColorInput label={label} value={normalized} disabled={disabled} onChange={onChange} />
    </div>
  </div>;
}

function AlphaColorField({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const normalized = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value) ? value : "#3A4824";
  const alpha = normalized.length === 9 ? parseInt(normalized.slice(7, 9), 16) / 255 : 1;
  const base = normalized.slice(0, 7);
  return <div>
    <p className="text-xs font-semibold text-zinc-800">{label}</p>
    <div className="mt-2 flex items-start gap-2">
      <input aria-label={label} disabled={disabled} className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-zinc-300 bg-white p-1 disabled:opacity-40" type="color" value={base} onChange={(event) => onChange(withColorAlpha(event.target.value, alpha))} />
      <HexColorInput label={label} value={base} disabled={disabled} allowAlpha={false} onChange={(color) => onChange(withColorAlpha(color, alpha))} />
    </div>
    <label className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-600"><span>Opacidad</span><span className="flex items-center gap-1.5"><input aria-label={"Porcentaje de transparencia de " + label.toLowerCase()} disabled={disabled} className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right text-xs disabled:bg-zinc-100" type="number" min="0" max="100" step="1" value={Math.round(alpha * 100)} onChange={(event) => onChange(withColorAlpha(base, Number(event.target.value) / 100))} /><span>%</span></span></label>
    <input aria-label={"Transparencia de " + label.toLowerCase()} disabled={disabled} className="mt-3 block w-full accent-emerald-700 disabled:opacity-40" type="range" min="0" max="1" step="0.01" value={alpha} onChange={(event) => onChange(withColorAlpha(base, Number(event.target.value)))} />
  </div>;
}

function withColorAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  const base = color.slice(0, 7);
  if (clamped >= 0.999) return base;
  return `${base}${Math.round(clamped * 255).toString(16).padStart(2, "0")}`;
}

function RectFillField({ node, assets, disabled, onChange, onOpenBackgroundImage }: { node: Extract<CanvasNode, { type: "shape" }>; assets: MenuAssetView[]; disabled: boolean; onChange: (patch: Partial<CanvasNode>) => void; onOpenBackgroundImage: () => void }) {
  const gradient = node.fillGradient;
  const backgroundImage = node.backgroundImage;
  const [gradientOpen, setGradientOpen] = useState(!gradient);
  const [imageOpen, setImageOpen] = useState(!backgroundImage);
  const imageAsset = backgroundImage ? assets.find((asset) => asset.id === backgroundImage.assetId) : undefined;
  const changeGradient = (next: FillGradient | null) => onChange({ fillGradient: next });
  const changeBackgroundImage = (patch: Partial<RectangleBackgroundImage>) => onChange({ backgroundImage: backgroundImage ? { ...backgroundImage, ...patch } : null });
  const updateStop = (index: 0 | 1, patch: Partial<FillGradient["stops"][number]>) => {
    if (!gradient) return;
    const stops = [...gradient.stops] as FillGradient["stops"];
    stops[index] = { ...stops[index], ...patch };
    changeGradient({ ...gradient, stops });
  };
  const updateOffset = (index: 0 | 1, value: number) => {
    if (!gradient) return;
    const next = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    const other = gradient.stops[index === 0 ? 1 : 0].offset;
    updateStop(index, { offset: index === 0 ? Math.min(next, other) : Math.max(next, other) });
  };
  return <div className="mt-4 space-y-3">
    <FillLayer title="Imagen de fondo" description="Sobre el color base." active={Boolean(backgroundImage)} open={imageOpen} onToggle={() => setImageOpen(!imageOpen)}
      action={<button type="button" disabled={disabled} aria-label={backgroundImage ? "Quitar imagen de fondo" : "Elegir imagen de fondo"} className={buttonClass + " shrink-0 px-2 text-emerald-800"} onClick={backgroundImage ? () => onChange({ backgroundImage: null }) : () => { setImageOpen(true); onOpenBackgroundImage(); }}>{backgroundImage ? "Quitar" : "Elegir"}</button>}>
      {backgroundImage && <div className="space-y-4">
        <div className="flex min-w-0 items-center gap-3"><span className="h-10 w-10 shrink-0 border border-zinc-200 bg-zinc-100 bg-cover bg-center" style={imageAsset ? { backgroundImage: "url(" + imageAsset.url + ")" } : undefined} aria-hidden="true" /><p className="min-w-0 flex-1 break-words text-xs font-medium text-zinc-700">{imageAsset?.name ?? "Imagen no disponible"}</p></div>
        <button type="button" disabled={disabled} className={buttonClass + " w-full"} onClick={onOpenBackgroundImage}>Cambiar imagen</button>
        <label className={labelClass}>Ajuste de imagen<select aria-label="Ajuste de imagen de fondo" disabled={disabled} className={fieldClass} value={backgroundImage.fit} onChange={(event) => changeBackgroundImage({ fit: event.target.value as RectangleBackgroundImage["fit"] })}><option value="cover">Cubrir — llenar el rectángulo</option><option value="contain">Contener — imagen completa</option><option value="stretch">Estirar — adaptar al tamaño</option></select></label>
        <PercentRangeField label="Posición horizontal" value={backgroundImage.positionX} disabled={disabled} onChange={(positionX) => changeBackgroundImage({ positionX })} />
        <PercentRangeField label="Posición vertical" value={backgroundImage.positionY} disabled={disabled} onChange={(positionY) => changeBackgroundImage({ positionY })} />
        <PercentRangeField label="Opacidad de imagen" value={backgroundImage.opacity} disabled={disabled} onChange={(opacity) => changeBackgroundImage({ opacity })} />
      </div>}
    </FillLayer>

    <FillLayer title="Degradado lineal" description="Sobre el color y la imagen." active={Boolean(gradient)} open={gradientOpen} onToggle={() => setGradientOpen(!gradientOpen)}
      action={<button type="button" disabled={disabled} aria-label={gradient ? "Quitar degradado" : "Agregar degradado"} className={buttonClass + " shrink-0 px-2 text-emerald-800"} onClick={() => { setGradientOpen(true); changeGradient(gradient ? null : defaultGradient()); }}>{gradient ? "Quitar" : "Agregar"}</button>}>
      {gradient && <div className="space-y-4">
        <div className="h-8 w-full rounded-md border border-zinc-200" style={{ background: "linear-gradient(" + gradient.angle + "deg, " + gradient.stops[0].color + " " + gradient.stops[0].offset * 100 + "%, " + gradient.stops[1].color + " " + gradient.stops[1].offset * 100 + "%)" }} aria-label="Vista previa del degradado" role="img" />
        <div>
          <p className="text-xs font-semibold text-zinc-800">Dirección</p>
          <div className="mt-2 grid grid-cols-4 gap-2" role="group" aria-label="Dirección del degradado">
            {GRADIENT_PRESETS.map((preset) => {
              const selected = Math.abs(((gradient.angle - preset.angle + 540) % 360) - 180) < 0.1;
              return <button key={preset.label} type="button" disabled={disabled} aria-pressed={selected} aria-label={"Degradado hacia " + preset.label} title={"Hacia " + preset.label} className={buttonClass + " px-0 text-base " + (selected ? "border-emerald-400 bg-emerald-50 text-emerald-900" : "")} onClick={() => changeGradient({ ...gradient, angle: preset.angle })}>{preset.symbol}</button>;
            })}
          </div>
          <div className="mt-3"><NumberField label="Ángulo del degradado" unit="°" value={gradient.angle} disabled={disabled} onChange={(angle) => changeGradient({ ...gradient, angle: Math.max(0, Math.min(360, angle)) })} /></div>
          <input aria-label="Barra de ángulo del degradado" disabled={disabled} className="mt-3 block w-full accent-emerald-700 disabled:opacity-40" type="range" min="0" max="360" step="1" value={gradient.angle} onChange={(event) => changeGradient({ ...gradient, angle: Number(event.target.value) })} />
        </div>
        {gradient.stops.map((stop, index) => <div key={index} className="min-w-0 border-t border-zinc-200 pt-4">
          <AlphaColorField label={index === 0 ? "Color inicial" : "Color final"} value={stop.color} disabled={disabled} onChange={(color) => updateStop(index as 0 | 1, { color })} />
          <label className="mt-3 block text-xs font-medium text-zinc-700"><span className="flex items-center justify-between"><span>Posición</span><output className="font-normal tabular-nums text-zinc-500">{Math.round(stop.offset * 100)}%</output></span><input aria-label={"Posición " + (index === 0 ? "inicial" : "final") + " del degradado"} disabled={disabled} className="mt-2 block w-full accent-emerald-700 disabled:opacity-40" type="range" min="0" max="1" step="0.01" value={stop.offset} onChange={(event) => updateOffset(index as 0 | 1, Number(event.target.value))} /></label>
        </div>)}
      </div>}
    </FillLayer>
  </div>;
}

function FillLayer({ title, description, active, open, onToggle, action, children }: { title: string; description: string; active: boolean; open: boolean; onToggle: () => void; action: ReactNode; children: ReactNode }) {
  const id = useId();
  return <div className="rounded-md border border-zinc-200 bg-zinc-50/70 p-3">
    <div className="flex items-center justify-between gap-2">
      <h4 className="min-w-0 flex-1"><button type="button" disabled={!active} className="flex w-full items-center gap-2 text-left text-xs font-semibold text-zinc-800 disabled:cursor-default" aria-label={"Ajustes de " + title.toLowerCase()} aria-expanded={active && open} aria-controls={id} onClick={onToggle}>{title}{active && <ChevronDown size={14} aria-hidden="true" className={"shrink-0 " + (open ? "rotate-180" : "")} />}</button></h4>
      {action}
    </div>
    <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
    <div id={id} hidden={!active || !open} className="mt-3 border-t border-zinc-200 pt-3">{children}</div>
  </div>;
}

const GRADIENT_PRESETS = [
  { label: "arriba", angle: 0, symbol: "↑" }, { label: "arriba derecha", angle: 45, symbol: "↗" }, { label: "derecha", angle: 90, symbol: "→" }, { label: "abajo derecha", angle: 135, symbol: "↘" },
  { label: "abajo", angle: 180, symbol: "↓" }, { label: "abajo izquierda", angle: 225, symbol: "↙" }, { label: "izquierda", angle: 270, symbol: "←" }, { label: "arriba izquierda", angle: 315, symbol: "↖" },
] as const;

function defaultGradient(): FillGradient {
  return { angle: 180, stops: [{ color: "#00000099", offset: 0 }, { color: "#00000000", offset: 1 }] };
}

function PercentRangeField({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (value: number) => void }) {
  const safeValue = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));
  const percentage = Math.round(safeValue * 100);
  return <div className="min-w-0">
    <label className="flex items-center justify-between gap-3 text-xs font-medium text-zinc-700"><span>{label}</span><span className="flex shrink-0 items-center gap-1.5"><input aria-label={label + " porcentaje"} disabled={disabled} className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right text-xs tabular-nums outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-zinc-100" type="number" min="0" max="100" step="1" value={percentage} onChange={(event) => onChange(Math.max(0, Math.min(1, (Number(event.target.value) || 0) / 100)))} /><span className="font-normal text-zinc-500">%</span></span></label>
    <input aria-label={"Barra de " + label.toLowerCase()} disabled={disabled} className="mt-3 block w-full accent-emerald-700 disabled:opacity-40" type="range" min="0" max="1" step="0.01" value={safeValue} onChange={(event) => onChange(Number(event.target.value))} />
  </div>;
}

function RectBorderSidesField({ value, disabled, onChange }: { value: StrokeSide[]; disabled: boolean; onChange: (value: StrokeSide[]) => void }) {
  const allSelected = hasAllStrokeSides(value);
  const labels: Record<StrokeSide, string> = { top: "Arriba", right: "Derecha", bottom: "Abajo", left: "Izquierda" };
  return <div className="mt-3">
    <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">Lados del borde</span><button type="button" disabled={disabled} className="text-[11px] font-medium text-emerald-800 hover:underline disabled:opacity-40" onClick={() => onChange(allSelected ? [] : [...STROKE_SIDES])}>{allSelected ? "Ninguno" : "Todos"}</button></div>
    <div className="mt-2 grid grid-cols-2 gap-1.5" role="group" aria-label="Lados del borde del rectángulo">{STROKE_SIDES.map((side) => <button key={side} type="button" disabled={disabled} aria-pressed={value.includes(side)} aria-label={`Borde ${labels[side].toLowerCase()}`} className={`rounded-md border px-2 py-2 text-[11px] font-medium transition disabled:opacity-40 ${value.includes(side) ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"}`} onClick={() => onChange(toggleStrokeSide(value, side))}>{labels[side]}</button>)}</div>
  </div>;
}

function RectCornerRadiiField({ width, height, value, disabled, onChange }: { width: number; height: number; value: Record<CornerRadiusKey, number>; disabled: boolean; onChange: (value: Record<CornerRadiusKey, number>) => void }) {
  const [commonRadius, setCommonRadius] = useState(() => value.topLeft);
  const labels: Record<CornerRadiusKey, string> = { topLeft: "Arriba izquierda", topRight: "Arriba derecha", bottomRight: "Abajo derecha", bottomLeft: "Abajo izquierda" };
  const corners: CornerRadiusKey[] = ["topLeft", "topRight", "bottomLeft", "bottomRight"];
  const maxCommonRadius = Math.max(0, Math.min(width, height) / 2);
  const commonPercentage = maxCommonRadius > 0 ? Math.min(100, (commonRadius / maxCommonRadius) * 100) : 0;
  const applyCommon = (radius: number) => { const nextRadius = Math.max(0, Math.min(10_000, radius)); setCommonRadius(nextRadius); onChange(allCornerRadii(nextRadius)); };
  return <div>
    <NumberField label="Valor común (px)" value={commonRadius} disabled={disabled} onChange={applyCommon} />
    <p className="mt-1.5 text-xs leading-5 text-zinc-500">Al cambiarlo, se aplica a las cuatro esquinas.</p>
    <label className="mt-3 block text-xs font-medium text-zinc-700"><span className="flex items-center justify-between"><span>Porcentaje de radio</span><span className="font-normal tabular-nums text-zinc-500">{Math.round(commonPercentage)}%</span></span><input aria-label="Barra de valor común" disabled={disabled} className="mt-2 block w-full accent-emerald-700 disabled:opacity-40" type="range" min="0" max="100" step="1" value={commonPercentage} onChange={(event) => applyCommon(maxCommonRadius * Number(event.target.value) / 100)} /></label>
    <div className="mt-4 border-t border-zinc-200 pt-4">
      <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-zinc-800">Por esquina</span><button type="button" disabled={disabled} className="text-xs font-medium text-emerald-800 hover:underline disabled:opacity-40" onClick={() => onChange(allCornerRadii(commonRadius))}>Igualar esquinas</button></div>
      <div className="mt-3 grid grid-cols-2 gap-3">{corners.map((corner) => <NumberField key={corner} label={labels[corner]} unit="px" value={value[corner]} disabled={disabled} onChange={(radius) => onChange({ ...value, [corner]: Math.max(0, Math.min(10_000, radius)) })} />)}</div>
    </div>
  </div>;
}
