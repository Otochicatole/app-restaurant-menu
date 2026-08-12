"use client";

import {useSyncExternalStore} from "react";

let highlightedProductId: string | null = null;
const listeners = new Set<() => void>();

export function setHighlightedProduct(id: string | null) {
    highlightedProductId = id;
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function getSnapshot() {
    return highlightedProductId;
}

function getServerSnapshot() {
    return null;
}

export function useHighlightedProduct() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
