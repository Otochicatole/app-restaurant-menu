import "server-only";

import { cache } from "react";
import {
  getPublicMenuMetadata as readPublicMenuMetadata,
  getPublicMenuStatus,
  getPublishedCanvasBySlug,
  resolvePublishedMenuBySlug,
} from "./infrastructure/prisma-published-canvas-reader";

export type { PublicCanvasAsset, PublicCanvasMenuView, PublicMenuMetadata } from "./contracts";

export const getPublicCanvasMenu = cache(getPublishedCanvasBySlug);
export const getPublicMenuStatusCached = cache(getPublicMenuStatus);
export const getPublicMenuMetadata = cache(readPublicMenuMetadata);
export { resolvePublishedMenuBySlug };

export { PublicCanvasScreen } from "./ui/PublicCanvasScreen";
