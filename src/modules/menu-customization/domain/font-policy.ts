import { fontFamilyAlias, type FontCategory } from "../contracts";

export class FontPolicyViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FontPolicyViolation";
  }
}

export const MAX_FONT_SIZE = 10 * 1024 * 1024;

const SIGNATURES: Record<string, (buffer: Uint8Array) => boolean> = {
  woff: (buffer) => matchesAscii(buffer, "wOFF"),
  woff2: (buffer) => matchesAscii(buffer, "wOF2"),
  otf: (buffer) => matchesAscii(buffer, "OTTO"),
  ttf: (buffer) => startsWith(buffer, [0x00, 0x01, 0x00, 0x00]) || matchesAscii(buffer, "true"),
};

const FALLBACKS: Record<FontCategory, string> = {
  serif: "serif",
  "sans-serif": "sans-serif",
  monospace: "monospace",
  display: "sans-serif",
  script: "cursive",
};

export function fontFamilyValue(id: string, category: FontCategory): string {
  return `"${fontFamilyAlias(id)}", ${FALLBACKS[category]}`;
}

export function validateFontUpload(file: { name: string; size: number; buffer: Uint8Array }): string {
  if (file.size <= 0 || file.buffer.length <= 0) throw new FontPolicyViolation("El archivo de fuente está vacío.");
  if (file.size > MAX_FONT_SIZE || file.buffer.length > MAX_FONT_SIZE) {
    throw new FontPolicyViolation("El archivo excede el tamaño máximo de 10MB.");
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const validatesSignature = SIGNATURES[extension];
  if (!validatesSignature || !validatesSignature(file.buffer)) {
    throw new FontPolicyViolation("Formato de fuente no soportado o contenido inválido. Usá WOFF, WOFF2, TTF u OTF.");
  }
  return extension;
}

function startsWith(content: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => content[index] === byte);
}

function matchesAscii(content: Uint8Array, value: string): boolean {
  if (content.byteLength < value.length) return false;
  return [...value].every((character, index) => content[index] === character.charCodeAt(0));
}
