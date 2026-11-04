"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { GripHorizontal, Minus, Square, X } from "lucide-react";
import { transientButtonProps } from "./button-state";

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Geometry = Point & Size;
type Viewport = Size & { left: number; top: number };
type ResizeDirection = "se" | "e" | "s" | "sw" | "w";
type ViewportInset = { left?: number; top?: number; right?: number; bottom?: number };

export interface FloatingModalWindowProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  initialPosition?: Point;
  initialSize?: Size;
  initialAnchor?: "right";
  initialOffset?: number;
  activation?: number;
  viewportInset?: ViewportInset;
  minWidth?: number;
  minHeight?: number;
  zIndex?: number;
  onFocus?: () => void;
  role?: "dialog" | "complementary";
  ariaLabel?: string;
  closeDisabled?: boolean;
  keepMounted?: boolean;
  children: React.ReactNode;
}

function viewport(inset?: ViewportInset): Viewport {
  const visual = window.visualViewport;
  const width = Math.max(1, visual?.width ?? window.innerWidth);
  const height = Math.max(1, visual?.height ?? window.innerHeight);
  const left = clamp(inset?.left ?? 0, 0, width - 1);
  const top = clamp(inset?.top ?? 0, 0, height - 1);
  return { left: (visual?.offsetLeft ?? 0) + left, top: (visual?.offsetTop ?? 0) + top, width: Math.max(1, width - left - Math.max(0, inset?.right ?? 0)), height: Math.max(1, height - top - Math.max(0, inset?.bottom ?? 0)) };
}
function limits(area: Viewport, minWidth: number, minHeight: number) {
  const margin = Math.min(10, Math.max(0, (Math.min(area.width, area.height) - 1) / 2));
  const width = Math.max(1, area.width - margin * 2);
  const height = Math.max(1, area.height - margin * 2);
  return { left: area.left + margin, top: area.top + margin, right: area.left + area.width - margin, bottom: area.top + area.height - margin, width, height, minWidth: Math.min(Math.max(1, minWidth), width), minHeight: Math.min(Math.max(1, minHeight), height) };
}
function clamp(value: number, minimum: number, maximum: number) { return Math.max(minimum, Math.min(maximum, value)); }
function fitGeometry(value: Geometry, area: Viewport, minWidth: number, minHeight: number, visibleHeight?: number): Geometry {
  const bounds = limits(area, minWidth, minHeight);
  const width = clamp(value.width, bounds.minWidth, bounds.width);
  const height = clamp(value.height, bounds.minHeight, bounds.height);
  return { width, height, x: clamp(value.x, bounds.left, bounds.right - width), y: clamp(value.y, bounds.top, bounds.bottom - Math.min(visibleHeight ?? height, bounds.height)) };
}

export function FloatingModalWindow({ id, title, subtitle, icon, isOpen, onClose, initialPosition = { x: 360, y: 70 }, initialSize = { width: 400, height: 540 }, initialAnchor, initialOffset = 0, activation, viewportInset, minWidth = 300, minHeight = 240, zIndex = 70, onFocus, role = "dialog", ariaLabel = title, closeDisabled = false, keepMounted = false, children }: FloatingModalWindowProps) {
  const { left: insetLeft = 0, top: insetTop = 0, right: insetRight = 0, bottom: insetBottom = 0 } = viewportInset ?? {};
  const getViewport = useCallback(() => viewport({ left: insetLeft, top: insetTop, right: insetRight, bottom: insetBottom }), [insetLeft, insetTop, insetRight, insetBottom]);
  const [geometry, setGeometry] = useState<Geometry>(() => ({ x: initialPosition.x + initialOffset, y: initialPosition.y + initialOffset, ...initialSize }));
  const [isMinimized, setIsMinimized] = useState(false);
  const geometryRef = useRef(geometry);
  const minimized = useRef(false);
  const initialized = useRef(false);
  const preferredSize = useRef(initialSize);
  const previousActivation = useRef(activation);
  const headerRef = useRef<HTMLDivElement>(null);
  const moveHandleRef = useRef<HTMLButtonElement>(null);
  const stopGesture = useRef<(() => void) | null>(null);
  const updateGeometry = useCallback((next: Geometry) => { geometryRef.current = next; setGeometry(next); }, []);
  const headerHeight = () => Math.max(1, headerRef.current?.getBoundingClientRect().height || 56);
  const fit = (value: Geometry, area = getViewport()) => fitGeometry(value, area, minWidth, minHeight, minimized.current ? headerHeight() : undefined);

  useLayoutEffect(() => {
    if (!isOpen) { stopGesture.current?.(); return; }
    const adjust = () => {
      stopGesture.current?.();
      const area = getViewport();
      let next = fitGeometry({ ...geometryRef.current, ...preferredSize.current }, area, minWidth, minHeight, minimized.current ? headerRef.current?.getBoundingClientRect().height || 56 : undefined);
      if (!initialized.current && initialAnchor === "right") next = fitGeometry({ ...next, x: limits(area, minWidth, minHeight).right - next.width - initialOffset }, area, minWidth, minHeight);
      initialized.current = true;
      updateGeometry(next);
    };
    adjust();
    window.addEventListener("resize", adjust);
    const visual = window.visualViewport;
    visual?.addEventListener("resize", adjust);
    visual?.addEventListener("scroll", adjust);
    return () => { window.removeEventListener("resize", adjust); visual?.removeEventListener("resize", adjust); visual?.removeEventListener("scroll", adjust); };
  }, [isOpen, initialAnchor, initialOffset, minWidth, minHeight, updateGeometry, getViewport]);
  useLayoutEffect(() => {
    if (activation === previousActivation.current) return;
    previousActivation.current = activation;
    if (activation === undefined || !isOpen || !minimized.current) return;
    stopGesture.current?.(); minimized.current = false; setIsMinimized(false);
    updateGeometry(fitGeometry(geometryRef.current, getViewport(), minWidth, minHeight));
  }, [activation, isOpen, getViewport, minWidth, minHeight, updateGeometry]);
  useEffect(() => () => { stopGesture.current?.(); }, []);

  const beginGesture = (event: ReactPointerEvent<HTMLElement>, resize?: ResizeDirection) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    if (!resize) {
      const target = event.target as HTMLElement;
      if (target.closest("button,input,textarea,a,select") && !target.closest("[data-window-move]")) return;
    }
    event.preventDefault(); event.stopPropagation();
    onFocus?.(); stopGesture.current?.();
    if (!resize) moveHandleRef.current?.focus({ preventScroll: true });
    const pointerId = event.pointerId;
    const origin = { x: event.clientX, y: event.clientY };
    const start = geometryRef.current;
    const area = getViewport();
    const bounds = limits(area, minWidth, minHeight);
    const onMove = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      const dx = next.clientX - origin.x; const dy = next.clientY - origin.y;
      if (!resize) { updateGeometry(fit({ ...start, x: start.x + dx, y: start.y + dy }, area)); return; }
      let value = { ...start };
      if (resize === "e" || resize === "se") value.width = clamp(start.width + dx, bounds.minWidth, bounds.right - start.x);
      if (resize === "w" || resize === "sw") { value.x = clamp(start.x + dx, bounds.left, start.x + start.width - bounds.minWidth); value.width = start.x + start.width - value.x; }
      if (resize === "s" || resize === "se" || resize === "sw") value.height = clamp(start.height + dy, bounds.minHeight, bounds.bottom - start.y);
      value = fit(value, area); preferredSize.current = { width: value.width, height: value.height }; updateGeometry(value);
    };
    const finish = (next: PointerEvent) => { if (next.pointerId === pointerId) stop(); };
    const stop = () => {
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish);
      window.removeEventListener("blur", stop);
      if (stopGesture.current === stop) stopGesture.current = null;
    };
    stopGesture.current = stop;
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", finish);
    window.addEventListener("blur", stop);
  };
  const keyboardGeometry = (event: KeyboardEvent<HTMLButtonElement>, resize: boolean) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation(); onFocus?.(); stopGesture.current?.();
    const step = event.shiftKey ? 1 : 10;
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    const current = geometryRef.current;
    const next = fit(resize ? { ...current, width: current.width + dx, height: current.height + dy } : { ...current, x: current.x + dx, y: current.y + dy });
    if (resize) preferredSize.current = { width: next.width, height: next.height };
    updateGeometry(next);
  };
  const toggleMinimized = () => {
    stopGesture.current?.(); minimized.current = !minimized.current; setIsMinimized(minimized.current);
    updateGeometry(fit(geometryRef.current));
  };
  if (!isOpen && !keepMounted) return null;
  const buttonClass = "flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--tool-window-muted,#71717a)] transition hover:bg-[var(--tool-window-hover,#e4e4e799)] hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tool-window-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-6 sm:w-6";
  return <div id={id} role={role} aria-modal={role === "dialog" ? false : undefined} aria-label={ariaLabel} hidden={!isOpen} inert={!isOpen} onPointerDownCapture={onFocus} onFocusCapture={onFocus} onKeyDown={(event) => { if (event.key === "Escape" && !closeDisabled) { event.preventDefault(); event.stopPropagation(); stopGesture.current?.(); onClose(); } }} className={`fixed flex select-none flex-col overflow-hidden rounded-2xl border border-[var(--tool-window-border,#e4e4e7e6)] shadow-2xl shadow-zinc-950/20 backdrop-blur-md transition-shadow ${isMinimized ? "bg-[var(--tool-window-header,#fafafaf2)]" : "bg-white/95"}`} style={{ left: geometry.x, top: geometry.y, width: geometry.width, height: isMinimized ? "auto" : geometry.height, zIndex, display: isOpen ? undefined : "none", maxWidth: "calc(100vw - 2px)", maxHeight: "calc(100dvh - 2px)" }}>
    <div ref={headerRef} onPointerDown={(event) => beginGesture(event)} className={`flex shrink-0 touch-none cursor-grab items-center justify-between bg-[var(--tool-window-header,#fafafae6)] px-3.5 py-2.5 transition-colors active:cursor-grabbing ${isMinimized ? "rounded-2xl" : "rounded-t-2xl border-b border-[var(--tool-window-border,#e4e4e7cc)]"}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {icon && <span className="shrink-0">{icon}</span>}<div className="min-w-0"><h2 className="truncate text-xs font-semibold leading-tight text-[var(--tool-window-ink,#18181b)]">{title}</h2>{subtitle && <p className="mt-0.5 truncate text-[10px] leading-none text-[var(--tool-window-muted,#71717a)]">{subtitle}</p>}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 pl-2"><button ref={moveHandleRef} {...transientButtonProps} type="button" data-window-move aria-label={`Mover ventana ${title}`} aria-describedby={`${id}-controls-help`} onKeyDown={(event) => keyboardGeometry(event, false)} className="flex h-6 w-4 shrink-0 cursor-grab items-center justify-center rounded-sm text-zinc-400 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tool-window-focus,#3d5934)] active:cursor-grabbing"><GripHorizontal className="h-4 w-4 opacity-60" aria-hidden="true" /></button><button {...transientButtonProps} type="button" onClick={toggleMinimized} aria-label={isMinimized ? "Restaurar ventana" : "Minimizar ventana"} aria-controls={`${id}-body`} aria-expanded={!isMinimized} className={buttonClass}>{isMinimized ? <Square size={11} /> : <Minus size={13} />}</button><button {...transientButtonProps} type="button" onClick={onClose} disabled={closeDisabled} aria-label="Cerrar ventana" className={`${buttonClass} hover:bg-red-50 hover:text-red-700`}><X size={14} /></button></div>
    </div>
    <p id={`${id}-controls-help`} className="sr-only">Usá las flechas para mover o redimensionar la ventana. Mayús permite ajustar de a un píxel.</p>
    <div id={`${id}-body`} hidden={isMinimized} inert={isMinimized} className="min-h-0 flex-1 select-text flex-col overflow-hidden" style={{ display: isMinimized ? "none" : "flex" }}>{children}</div>
    {!isMinimized && <>
      <div onPointerDown={(event) => beginGesture(event, "e")} className="absolute bottom-4 right-0 top-8 w-2 touch-none cursor-ew-resize transition-colors hover:bg-blue-500/10" aria-hidden="true" />
      <div onPointerDown={(event) => beginGesture(event, "s")} className="absolute bottom-0 left-4 right-4 h-2 touch-none cursor-ns-resize transition-colors hover:bg-blue-500/10" aria-hidden="true" />
      <div onPointerDown={(event) => beginGesture(event, "w")} className="absolute bottom-4 left-0 top-8 w-2 touch-none cursor-ew-resize transition-colors hover:bg-blue-500/10" aria-hidden="true" />
      <div onPointerDown={(event) => beginGesture(event, "sw")} className="absolute bottom-0 left-0 h-4 w-4 touch-none cursor-nesw-resize" aria-hidden="true" />
      <button {...transientButtonProps} type="button" onPointerDown={(event) => beginGesture(event, "se")} onKeyDown={(event) => keyboardGeometry(event, true)} className="absolute bottom-0 right-0 flex h-5 w-5 touch-none cursor-nwse-resize items-end justify-end p-1 text-zinc-400 transition hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--tool-window-focus,#3d5934)]" aria-label="Cambiar tamaño de ventana" aria-describedby={`${id}-controls-help`} title="Arrastrá o usá las flechas para redimensionar"><svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><line x1="10" y1="2" x2="2" y2="10" /><line x1="10" y1="6" x2="6" y2="10" /><line x1="10" y1="10" x2="10" y2="10" /></svg></button>
    </>}
  </div>;
}
