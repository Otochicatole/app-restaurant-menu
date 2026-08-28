"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

type SearchItem = { id: string; name: string; description: string; groupName: string };
type MediaItem = { name: string; url: string; type: "image" | "video" };

export function PublicMenuInteractions({ items }: { items: SearchItem[] }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const searchDialogRef = useRef<HTMLDivElement>(null);
  const mediaDialogRef = useRef<HTMLDivElement>(null);

  const closeSearch = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    setSearchOpen(false);
  }, []);
  const closeMedia = useCallback(() => setMedia(null), []);

  const matches = useMemo(() => {
    const normalized = normalize(query);
    if (!normalized) return [];
    return items.filter((item) => normalize(`${item.name} ${item.description} ${item.groupName}`).includes(normalized));
  }, [items, query]);

  useEffect(() => {
    const handleMediaClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>("[data-menu-media]");
      if (!button) return;
      const url = button.dataset.mediaUrl;
      const name = button.dataset.mediaName;
      const type = button.dataset.mediaType;
      if (url && name && (type === "image" || type === "video")) setMedia({ url, name, type });
    };
    document.addEventListener("click", handleMediaClick);
    return () => document.removeEventListener("click", handleMediaClick);
  }, []);

  useDialogFocus(searchOpen, searchDialogRef, closeSearch);
  useDialogFocus(Boolean(media), mediaDialogRef, closeMedia);

  useEffect(() => {
    if (!searchOpen && !media) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [media, searchOpen]);

  const selectedId = matches[selectedIndex]?.id;

  function goToProduct(id: string) {
    const product = document.getElementById(`product-${id}`);
    product?.scrollIntoView({ behavior: "smooth", block: "center" });
    product?.classList.add("menu-product-highlight");
    window.setTimeout(() => product?.classList.remove("menu-product-highlight"), 3_000);
    closeSearch();
  }

  return (
    <>
      <button type="button" onClick={() => setSearchOpen(true)} aria-label="Abrir búsqueda" className="fixed bottom-6 right-6 z-[9999] flex h-12 w-12 touch-manipulation items-center justify-center rounded-lg border-2 border-desert bg-primary text-background shadow-lg shadow-primary/20 transition hover:bg-desert focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background">
        <Search aria-hidden="true" size={20} strokeWidth={2.5} />
      </button>

      {searchOpen && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-primary/40 p-0 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeSearch()}>
          <div ref={searchDialogRef} role="dialog" aria-modal="true" aria-labelledby="menu-search-title" className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
            <h2 id="menu-search-title" className="sr-only">Buscar en el catálogo</h2>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {matches.length > 0 && (
                <ul className="space-y-1">
                  {matches.map((item, index) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => goToProduct(item.id)} className={`w-full rounded-xl px-3 py-2 text-left transition ${index === selectedIndex ? "bg-beige" : "hover:bg-beige/50"}`}>
                        <span className="block text-sm font-semibold text-primary">{item.name}</span>
                        <span className="block text-xs text-terracota">{item.groupName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {query.trim() && matches.length === 0 && <p className="px-4 py-3 text-sm text-primary/70">No se encontraron productos.</p>}
              {!query.trim() && <p className="px-4 py-3 text-sm text-primary/60">Escribí para buscar productos...</p>}
            </div>
            <div className="flex items-center gap-2 border-t border-primary/15 px-4 py-3">
              <Search aria-hidden="true" size={18} className="shrink-0 text-primary" />
              <input autoFocus aria-label="Buscar en el catálogo" placeholder="Buscar en el catálogo..." value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={(event) => {
                if (event.key === "ArrowDown" && matches.length) { event.preventDefault(); setSelectedIndex((index) => Math.min(index + 1, matches.length - 1)); }
                if (event.key === "ArrowUp" && matches.length) { event.preventDefault(); setSelectedIndex((index) => Math.max(index - 1, 0)); }
                if (event.key === "Enter" && selectedId) { event.preventDefault(); goToProduct(selectedId); }
              }} className="h-10 min-w-0 flex-1 border-none bg-transparent text-sm tracking-wide text-primary outline-none caret-terracota placeholder:text-primary/60" type="search" />
              <button type="button" onClick={closeSearch} aria-label="Cerrar búsqueda" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary/60 transition hover:bg-beige/60 hover:text-primary"><X aria-hidden="true" size={20} /></button>
            </div>
          </div>
        </div>
      )}

      {media && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeMedia()}>
          <div ref={mediaDialogRef} role="dialog" aria-modal="true" aria-labelledby="product-media-title" className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-background shadow-2xl">
            <button type="button" onClick={closeMedia} className="absolute right-3 top-3 z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70" aria-label="Cerrar"><X size={20} /></button>
            <div className="flex items-center justify-center overflow-hidden bg-black/5">
              {media.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.url} alt={media.name} className="max-h-[75dvh] w-full object-contain" />
              ) : <video src={media.url} controls autoPlay playsInline className="max-h-[75dvh] w-full" />}
            </div>
            <div className="px-5 py-4 text-center"><h2 id="product-media-title" className="text-lg font-semibold text-primary">{media.name}</h2></div>
          </div>
        </div>
      )}
    </>
  );
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function useDialogFocus(
  active: boolean,
  dialogRef: React.RefObject<HTMLDivElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusables = () => [...(dialog?.querySelectorAll<HTMLElement>('button, input, video[controls], [href], [tabindex]:not([tabindex="-1"])') ?? [])].filter((element) => !element.hasAttribute("disabled"));
    window.requestAnimationFrame(() => focusables()[0]?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const elements = focusables();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus();
    };
  }, [active, close, dialogRef]);
}
