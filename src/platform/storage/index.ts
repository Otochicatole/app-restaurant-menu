import path from "node:path";
import { getServerEnv } from "@/platform/config/server-env";
import { LocalBlobStore } from "./local-blob-store";

export type { BlobMetadata, BlobStore } from "./blob-store";
export { LocalBlobStore } from "./local-blob-store";

// Storage is an operator-provided runtime mount and must not be bundled into the server trace.
export const storageRoot = path.resolve(
  /* turbopackIgnore: true */ getServerEnv().STORAGE_ROOT || path.join(process.cwd(), "storage"),
);
export const blobStore = new LocalBlobStore(storageRoot);

const CONTENT_TYPES: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  mp4: "video/mp4",
  otf: "font/otf",
  png: "image/png",
  ttf: "font/ttf",
  webm: "video/webm",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
};

export function contentTypeForKey(key: string): string {
  return CONTENT_TYPES[path.extname(key).slice(1).toLowerCase()] ?? "application/octet-stream";
}
