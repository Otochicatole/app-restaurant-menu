import { promises as fs } from "fs";
import path from "path";
import { BadRequestError } from "@/shared/backend/errors/app-error";

export const STORAGE_DIR = path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_ROOT ?? path.join(process.cwd(), "storage"));

export type MediaType = "image" | "video";

const IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const VIDEO_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
};

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
export const MAX_FONT_SIZE = 10 * 1024 * 1024;

const FONT_EXTENSIONS = new Set(["woff", "woff2", "ttf", "otf"]);

export function classifyMime(mimeType: string): MediaType | null {
  if (mimeType in IMAGE_MIME) return "image";
  if (mimeType in VIDEO_MIME) return "video";
  return null;
}

export function extensionForMime(mimeType: string): string | null {
  return IMAGE_MIME[mimeType] ?? VIDEO_MIME[mimeType] ?? null;
}

export function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

export function validateMediaFile(file: { type: string; size: number }): { mediaType: MediaType; extension: string } {
  const mediaType = classifyMime(file.type);
  if (!mediaType) {
    throw new BadRequestError("Formato de archivo no soportado. Usá JPG, PNG, WEBP, GIF, MP4 o WEBM.");
  }

  const maxSize = mediaType === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (file.size > maxSize) {
    const limit = mediaType === "image" ? "5MB" : "50MB";
    throw new BadRequestError(`El archivo excede el tamaño máximo de ${limit}.`);
  }

  const extension = extensionForMime(file.type);
  if (!extension) {
    throw new BadRequestError("Formato de archivo no soportado.");
  }

  return { mediaType, extension };
}

export async function saveFile(relativePath: string, buffer: Buffer): Promise<void> {
  const absolutePath = resolveSafe(relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
}

export async function deleteFile(relativePath: string): Promise<void> {
  const absolutePath = resolveSafe(relativePath);
  await fs.rm(absolutePath, { force: true });
}

export async function readFile(relativePath: string): Promise<Buffer> {
  const absolutePath = resolveSafe(relativePath);
  return fs.readFile(/* turbopackIgnore: true */ absolutePath);
}

export async function fileExists(relativePath: string): Promise<boolean> {
  const absolutePath = resolveSafe(relativePath);
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteDirectory(relativePath: string): Promise<void> {
  const absolutePath = resolveSafe(relativePath);
  await fs.rm(absolutePath, { recursive: true, force: true });
}

export async function moveDirectory(relativePath: string, destinationRelativePath: string): Promise<void> {
  const absolutePath = resolveSafe(relativePath);
  const destination = resolveSafe(destinationRelativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.rename(absolutePath, destination);
}

export async function moveFile(relativePath: string, destinationRelativePath: string): Promise<void> {
  const absolutePath = resolveSafe(relativePath);
  const destination = resolveSafe(destinationRelativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.rename(absolutePath, destination);
}

export function validateFontFile(file: { name: string; size: number }): { extension: string } {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!FONT_EXTENSIONS.has(extension)) {
    throw new BadRequestError("Formato de fuente no soportado. Usá WOFF, WOFF2, TTF u OTF.");
  }
  if (file.size > MAX_FONT_SIZE) {
    throw new BadRequestError("El archivo excede el tamaño máximo de 10MB.");
  }
  return { extension };
}

function resolveSafe(relativePath: string): string {
  const absolutePath = path.resolve(STORAGE_DIR, relativePath);
  if (absolutePath !== STORAGE_DIR && !absolutePath.startsWith(STORAGE_DIR + path.sep)) {
    throw new BadRequestError("Ruta de archivo inválida.");
  }
  return absolutePath;
}
