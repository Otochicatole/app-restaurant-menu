"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Image from "next/image";

export type MediaModalAsset = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  name: string;
  mimeType: string;
  url: string;
  width?: number | null;
  height?: number | null;
};

export function MediaModal({ asset, onClose }: { asset: MediaModalAsset | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!asset) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", closeOnEscape); previouslyFocused?.focus(); };
  }, [asset, onClose]);
  if (!asset || typeof document === "undefined") return null;
  const content = <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="relative flex min-h-14 min-w-14 max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] items-center justify-center overflow-hidden rounded-xl bg-zinc-950 p-2 shadow-2xl" role="dialog" aria-modal="true" aria-label={asset.name}>
      <button ref={closeRef} type="button" className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-zinc-800 shadow hover:bg-white" onClick={onClose} aria-label="Cerrar multimedia"><X size={18} /></button>
      {asset.kind === "VIDEO" ? <video className="block h-auto w-auto max-h-[calc(100dvh-3rem)] max-w-[calc(100vw-3rem)] rounded-lg object-contain" src={asset.url} controls playsInline preload="metadata" /> : <Image className="block h-auto w-auto max-h-[calc(100dvh-3rem)] max-w-[calc(100vw-3rem)] rounded-lg object-contain" src={asset.url} alt={asset.name} width={asset.width ?? 1600} height={asset.height ?? 1200} sizes="calc(100vw - 3rem)" unoptimized />}
    </div>
  </div>;
  return createPortal(content, document.body);
}
