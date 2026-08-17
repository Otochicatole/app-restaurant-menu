"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ProductMediaModalProps {
  product: { name: string; mediaUrl: string; mediaType: "image" | "video" } | null;
  onClose: () => void;
}

export function ProductMediaModal({ product, onClose }: ProductMediaModalProps) {
  useEffect(() => {
    if (!product) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [product, onClose]);

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-background shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
        <div className="flex items-center justify-center overflow-hidden bg-black/5">
          {product.mediaType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.mediaUrl} alt={product.name} className="max-h-[75dvh] w-full object-contain" />
          ) : (
            <video src={product.mediaUrl} controls autoPlay playsInline className="max-h-[75dvh] w-full" />
          )}
        </div>
        <div className="px-5 py-4 text-center">
          <h3 className="text-lg font-semibold text-primary">{product.name}</h3>
        </div>
      </div>
    </div>
  );
}
