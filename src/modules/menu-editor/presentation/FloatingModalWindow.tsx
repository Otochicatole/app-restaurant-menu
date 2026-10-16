"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GripHorizontal, Minus, Square, X } from "lucide-react";

export interface FloatingModalWindowProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  zIndex?: number;
  onFocus?: () => void;
  children: React.ReactNode;
}

export function FloatingModalWindow({
  title,
  subtitle,
  icon,
  isOpen,
  onClose,
  initialPosition = { x: 360, y: 70 },
  initialSize = { width: 400, height: 540 },
  minWidth = 300,
  minHeight = 240,
  zIndex = 70,
  onFocus,
  children,
}: FloatingModalWindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isMinimized, setIsMinimized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep modal inside viewport when window resizes
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(10, Math.min(window.innerWidth - 100, prev.x)),
        y: Math.max(50, Math.min(window.innerHeight - 80, prev.y)),
      }));
      setSize((prev) => ({
        width: Math.min(prev.width, Math.max(minWidth, window.innerWidth - 40)),
        height: Math.min(prev.height, Math.max(minHeight, window.innerHeight - 80)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [minWidth, minHeight]);

  // Handle Drag / Move by Header
  const handleHeaderPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, input, textarea, a")) return;
    event.preventDefault();
    onFocus?.();

    const startX = event.clientX;
    const startY = event.clientY;
    const startPosX = position.x;
    const startPosY = position.y;

    const onPointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const maxX = Math.max(10, window.innerWidth - 100);
      const maxY = Math.max(50, window.innerHeight - 60);
      setPosition({
        x: Math.max(10, Math.min(maxX, startPosX + deltaX)),
        y: Math.max(50, Math.min(maxY, startPosY + deltaY)),
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Handle Resizing
  const handleResizeStart = (
    direction: "se" | "e" | "s" | "sw" | "w",
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onFocus?.();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    const startPosX = position.x;

    const onPointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let nextWidth = startWidth;
      let nextHeight = startHeight;
      let nextPosX = startPosX;

      if (direction === "se" || direction === "e") {
        nextWidth = Math.max(minWidth, Math.min(window.innerWidth - startPosX - 20, startWidth + deltaX));
      }
      if (direction === "se" || direction === "s") {
        nextHeight = Math.max(minHeight, Math.min(window.innerHeight - position.y - 20, startHeight + deltaY));
      }
      if (direction === "sw" || direction === "w") {
        const potentialWidth = startWidth - deltaX;
        if (potentialWidth >= minWidth) {
          nextWidth = Math.min(potentialWidth, startPosX + startWidth - 20);
          nextPosX = startPosX + deltaX;
        } else {
          nextWidth = minWidth;
          nextPosX = startPosX + (startWidth - minWidth);
        }
      }
      if (direction === "sw") {
        nextHeight = Math.max(minHeight, Math.min(window.innerHeight - position.y - 20, startHeight + deltaY));
      }

      setSize({ width: nextWidth, height: nextHeight });
      if (nextPosX !== position.x) {
        setPosition((prev) => ({ ...prev, x: nextPosX }));
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      onPointerDownCapture={onFocus}
      className={`fixed flex flex-col rounded-2xl border border-zinc-200/90 shadow-2xl shadow-zinc-950/20 backdrop-blur-md transition-shadow select-none overflow-hidden ${
        isMinimized ? "bg-zinc-50/95" : "bg-white/95"
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? "auto" : `${size.height}px`,
        zIndex,
      }}
    >
      {/* Draggable Header */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className={`flex shrink-0 cursor-grab active:cursor-grabbing items-center justify-between bg-zinc-50/90 px-3.5 py-2.5 transition-colors ${
          isMinimized ? "rounded-2xl" : "rounded-t-2xl border-b border-zinc-200/80"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {icon && <span className="shrink-0">{icon}</span>}
          <div className="min-w-0">
            <h2 className="truncate text-xs font-semibold text-zinc-900 leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="truncate text-[10px] text-zinc-500 leading-none mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 pl-2">
          <GripHorizontal className="h-4 w-4 text-zinc-400 opacity-60" aria-hidden="true" />

          {/* Minimize / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsMinimized((prev) => !prev)}
            aria-label={isMinimized ? "Restaurar ventana" : "Minimizar ventana"}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-800 transition"
          >
            {isMinimized ? <Square size={11} /> : <Minus size={13} />}
          </button>

          {/* Close Window */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-700 transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Window Body (hidden if minimized) */}
      {!isMinimized && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden select-text">
          {children}
        </div>
      )}

      {/* Resize Handles (hidden if minimized) */}
      {!isMinimized && (
        <>
          {/* Right edge */}
          <div
            onPointerDown={(e) => handleResizeStart("e", e)}
            className="absolute top-8 right-0 bottom-4 w-2 cursor-ew-resize hover:bg-blue-500/10 transition-colors"
            aria-hidden="true"
          />
          {/* Bottom edge */}
          <div
            onPointerDown={(e) => handleResizeStart("s", e)}
            className="absolute right-4 bottom-0 left-4 h-2 cursor-ns-resize hover:bg-blue-500/10 transition-colors"
            aria-hidden="true"
          />
          {/* Left edge */}
          <div
            onPointerDown={(e) => handleResizeStart("w", e)}
            className="absolute top-8 left-0 bottom-4 w-2 cursor-ew-resize hover:bg-blue-500/10 transition-colors"
            aria-hidden="true"
          />
          {/* Bottom-left corner */}
          <div
            onPointerDown={(e) => handleResizeStart("sw", e)}
            className="absolute bottom-0 left-0 h-4 w-4 cursor-nesw-resize"
            aria-hidden="true"
          />
          {/* Bottom-right corner (with visual grip indicator) */}
          <div
            onPointerDown={(e) => handleResizeStart("se", e)}
            className="absolute bottom-0 right-0 flex h-5 w-5 cursor-nwse-resize items-end justify-end p-1 text-zinc-400 hover:text-zinc-700 transition"
            aria-label="Cambiar tamaño de ventana"
            title="Arrastrar para redimensionar"
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <line x1="10" y1="2" x2="2" y2="10" />
              <line x1="10" y1="6" x2="6" y2="10" />
              <line x1="10" y1="10" x2="10" y2="10" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
