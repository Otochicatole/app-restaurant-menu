import { CatalogRuleViolation } from "./catalog-rules";

export type SupportedMediaType = "image" | "video";

export interface ValidatedMedia {
  mediaType: SupportedMediaType;
  extension: "gif" | "jpg" | "mp4" | "png" | "webm" | "webp";
}

const FIVE_MEGABYTES = 5 * 1024 * 1024;
const FIFTY_MEGABYTES = 50 * 1024 * 1024;

export function validateProductMedia(file: { type: string; size: number; content: Uint8Array }): ValidatedMedia {
  if (file.size !== file.content.byteLength) {
    throw new CatalogRuleViolation("El tamaño declarado del archivo no coincide con su contenido");
  }

  const definition = MEDIA_DEFINITIONS[file.type];
  if (!definition || !definition.matches(file.content)) {
    throw new CatalogRuleViolation("Formato de archivo no soportado o contenido inválido. Usá JPG, PNG, WEBP, GIF, MP4 o WEBM.");
  }

  const maxSize = definition.mediaType === "image" ? FIVE_MEGABYTES : FIFTY_MEGABYTES;
  if (file.size > maxSize) {
    throw new CatalogRuleViolation(
      `El archivo excede el tamaño máximo de ${definition.mediaType === "image" ? "5MB" : "50MB"}.`,
    );
  }

  return { mediaType: definition.mediaType, extension: definition.extension };
}

type MediaDefinition = ValidatedMedia & { matches(content: Uint8Array): boolean };

const MEDIA_DEFINITIONS: Record<string, MediaDefinition> = {
  "image/jpeg": { mediaType: "image", extension: "jpg", matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]) },
  "image/png": {
    mediaType: "image",
    extension: "png",
    matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  "image/gif": {
    mediaType: "image",
    extension: "gif",
    matches: (bytes) => matchesAscii(bytes, 0, "GIF87a") || matchesAscii(bytes, 0, "GIF89a"),
  },
  "image/webp": {
    mediaType: "image",
    extension: "webp",
    matches: (bytes) => matchesAscii(bytes, 0, "RIFF") && matchesAscii(bytes, 8, "WEBP"),
  },
  "video/mp4": { mediaType: "video", extension: "mp4", matches: (bytes) => matchesAscii(bytes, 4, "ftyp") },
  "video/webm": { mediaType: "video", extension: "webm", matches: (bytes) => startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]) },
};

function startsWith(content: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => content[index] === byte);
}

function matchesAscii(content: Uint8Array, offset: number, value: string): boolean {
  if (content.byteLength < offset + value.length) return false;
  return [...value].every((character, index) => content[offset + index] === character.charCodeAt(0));
}

