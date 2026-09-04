"use client";

import { useEffect, useState } from "react";

type ImageCacheEntry = {
  image: HTMLImageElement;
  loaded: boolean;
  subscribers: Set<(image: HTMLImageElement) => void>;
  references: number;
  releaseTimer: number | null;
};

const imageCache = new Map<string, ImageCacheEntry>();
const RELEASE_DELAY_MS = 5_000;

/** Reuses one decoded browser image for every node that references the same asset. */
export function useSharedImage(url?: string): HTMLImageElement | undefined {
  const [loaded, setLoaded] = useState<{ url: string; image: HTMLImageElement } | null>(null);

  useEffect(() => {
    if (!url) return;
    let active = true;
    let entry = imageCache.get(url);
    if (!entry) {
      const image = new window.Image();
      image.crossOrigin = "anonymous";
      entry = { image, loaded: false, subscribers: new Set(), references: 0, releaseTimer: null };
      imageCache.set(url, entry);
      image.onload = () => {
        const current = imageCache.get(url);
        if (!current || current.image !== image) return;
        current.loaded = true;
        current.subscribers.forEach((subscriber) => subscriber(image));
      };
      image.onerror = () => {
        const current = imageCache.get(url);
        if (current?.image === image && current.references === 0) imageCache.delete(url);
      };
      image.src = url;
    }

    entry.references += 1;
    if (entry.releaseTimer !== null) {
      window.clearTimeout(entry.releaseTimer);
      entry.releaseTimer = null;
    }
    const notify = (image: HTMLImageElement) => { if (active) setLoaded({ url, image }); };
    entry.subscribers.add(notify);
    if (entry.loaded) queueMicrotask(() => notify(entry.image));

    return () => {
      active = false;
      const current = imageCache.get(url);
      if (!current) return;
      current.subscribers.delete(notify);
      current.references = Math.max(0, current.references - 1);
      if (current.references > 0) return;
      current.releaseTimer = window.setTimeout(() => {
        const unused = imageCache.get(url);
        if (!unused || unused.references > 0) return;
        unused.image.onload = null;
        unused.image.onerror = null;
        unused.image.src = "";
        imageCache.delete(url);
      }, RELEASE_DELAY_MS);
    };
  }, [url]);

  if (!url) return undefined;
  const cached = imageCache.get(url);
  if (cached?.loaded) return cached.image;
  return loaded?.url === url ? loaded.image : undefined;
}
