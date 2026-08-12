"use client";

import {useEffect, useRef, useState} from "react";
import {Search, X} from "lucide-react";
import type {GroupWithProducts} from "../utils/layout";
import {setHighlightedProduct} from "../search-highlight";

interface MenuSearchProps {
    sections: GroupWithProducts[];
}

export function MenuSearch({sections}: MenuSearchProps) {
    const highlightTimeoutRef = useRef<number | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const normalizedQuery = query.trim().toLowerCase();
    const matches = normalizedQuery
        ? sections.flatMap((group) => group.products
            .filter((product) => `${product.name} ${product.description ?? ""} ${group.name}`.toLowerCase().includes(normalizedQuery))
            .map((product) => ({product, groupName: group.name})))
        : [];
    const selectedProductId = matches[selectedIndex]?.product.id;

    useEffect(() => {
        if (!selectedProductId) {
            return;
        }
        document.getElementById(`search-result-${selectedProductId}`)?.scrollIntoView({block: "nearest"});
    }, [selectedProductId]);

    function goToProduct(productId: string) {
        setHighlightedProduct(productId);
        document.getElementById(`product-${productId}`)?.scrollIntoView({behavior: "smooth", block: "center"});
        closeSearch();
        if (highlightTimeoutRef.current !== null) {
            window.clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = window.setTimeout(() => setHighlightedProduct(null), 3000);
    }

    function closeSearch() {
        setQuery("");
        setIsOpen(false);
    }

    function openSearch() {
        setSelectedIndex(0);
        setIsOpen(true);
    }

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    return (
        <>
            <button
                type="button"
                onClick={openSearch}
                aria-label="Abrir búsqueda"
                className="fixed bottom-6 right-6 z-[9999] flex h-12 w-12 touch-manipulation items-center justify-center rounded-lg border-2 border-desert bg-primary text-background shadow-lg shadow-primary/20 transition hover:bg-desert focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background [&_svg]:block"
            >
                <Search aria-hidden="true" size={20} strokeWidth={2.5}/>
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-[10000] flex items-end justify-center bg-primary/40 p-0 backdrop-blur-sm sm:p-6"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(event) => event.target === event.currentTarget && closeSearch()}
                >
                    <div className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
                        <div className="min-h-0 flex-1 overflow-y-auto p-3">
                            {matches.length > 0 && (
                                <ul className="space-y-1">
                                    {matches.map(({product, groupName}, index) => (
                                        <li key={product.id}>
                                            <button
                                                id={`search-result-${product.id}`}
                                                type="button"
                                                onClick={() => goToProduct(product.id)}
                                                className={`w-full rounded-xl px-3 py-2 text-left transition ${index === selectedIndex ? "bg-beige" : "hover:bg-beige/50"}`}
                                            >
                                                <span className="block text-sm font-semibold text-primary">{product.name}</span>
                                                <span className="block text-xs text-terracota">{groupName}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {normalizedQuery && matches.length === 0 && (
                                <p className="px-4 py-3 text-sm text-primary/70">No se encontraron productos.</p>
                            )}
                            {!normalizedQuery && (
                                <p className="px-4 py-3 text-sm text-primary/60">Escribí para buscar productos...</p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 border-t border-primary/15 px-4 py-3">
                            <Search aria-hidden="true" size={18} className="shrink-0 text-primary"/>
                            <input
                                autoFocus
                                aria-label="Buscar en el catálogo"
                                placeholder="Buscar en el catálogo..."
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    setSelectedIndex(0);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Escape") {
                                        event.preventDefault();
                                        closeSearch();
                                        return;
                                    }
                                    if (event.key === "ArrowDown") {
                                        event.preventDefault();
                                        if (matches.length > 0) {
                                            setSelectedIndex((index) => Math.min(index + 1, matches.length - 1));
                                        }
                                        return;
                                    }
                                    if (event.key === "ArrowUp") {
                                        event.preventDefault();
                                        if (matches.length > 0) {
                                            setSelectedIndex((index) => Math.max(index - 1, 0));
                                        }
                                        return;
                                    }
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        if (selectedProductId) {
                                            goToProduct(selectedProductId);
                                        }
                                    }
                                }}
                                className="h-10 min-w-0 flex-1 border-none bg-transparent text-sm tracking-wide text-primary outline-none caret-terracota placeholder:text-primary/60"
                                type="search"
                            />
                            <button
                                type="button"
                                onClick={closeSearch}
                                aria-label="Cerrar búsqueda"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary/60 transition hover:bg-beige/60 hover:text-primary"
                            >
                                <X aria-hidden="true" size={20}/>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
