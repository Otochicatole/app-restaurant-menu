import { createHash } from "node:crypto";
import { z } from "zod";
import { BadRequestError } from "@/platform/application/errors";
import { canvasDocumentSchema, type CanvasDocumentV1, type MenuAssetKind } from "../contracts";
import { documentAssetIds, validateCanvasDocument } from "./document-policy";

const BUNDLE_MAGIC = new TextEncoder().encode("RMENU001");
const HEADER_BYTES = BUNDLE_MAGIC.byteLength + 4;
const FORMAT_NAME = "restaurant-menu-template";
const FORMAT_VERSION = 1;

export const TEMPLATE_BUNDLE_MIME_TYPE = "application/vnd.restaurant-menu.template";
export const TEMPLATE_BUNDLE_EXTENSION = ".menutemplate";
export const MAX_TEMPLATE_BUNDLE_MANIFEST_BYTES = 4 * 1024 * 1024;
export const MAX_TEMPLATE_BUNDLE_ASSET_BYTES = 250 * 1024 * 1024;
export const MAX_TEMPLATE_BUNDLE_BYTES = HEADER_BYTES + MAX_TEMPLATE_BUNDLE_MANIFEST_BYTES + MAX_TEMPLATE_BUNDLE_ASSET_BYTES;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
const FONT_TYPES = new Set(["font/woff", "font/woff2", "font/ttf", "font/otf", "application/font-woff", "application/font-woff2", "application/x-font-ttf", "application/vnd.ms-opentype", "application/octet-stream"]);

const portableAssetManifestSchema = z.object({
  id: z.string().trim().min(1).max(200),
  kind: z.enum(["IMAGE", "VIDEO", "FONT"]),
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  byteSize: z.number().int().positive().max(50 * 1024 * 1024),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  width: z.number().int().positive().max(8192).nullable(),
  height: z.number().int().positive().max(8192).nullable(),
  fontFamily: z.string().trim().min(1).max(100).nullable(),
});

const templateBundleManifestSchema = z.object({
  format: z.literal(FORMAT_NAME),
  formatVersion: z.literal(FORMAT_VERSION),
  template: z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500),
    document: canvasDocumentSchema,
  }),
  assets: z.array(portableAssetManifestSchema).max(2_000),
});

export type PortableTemplateAsset = z.output<typeof portableAssetManifestSchema> & {
  content: Uint8Array;
};

export type PortableTemplate = {
  name: string;
  description: string;
  document: CanvasDocumentV1;
  assets: PortableTemplateAsset[];
};

export function encodeTemplateBundle(input: PortableTemplate): Uint8Array {
  const template = validatePortableTemplate(input);
  const manifest = {
    format: FORMAT_NAME,
    formatVersion: FORMAT_VERSION,
    template: { name: template.name, description: template.description, document: template.document },
    assets: template.assets.map((asset) => portableAssetManifestSchema.parse(asset)),
  };
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));
  if (manifestBytes.byteLength > MAX_TEMPLATE_BUNDLE_MANIFEST_BYTES) invalid("El manifiesto es demasiado grande.");
  const totalBytes = template.assets.reduce((total, asset) => total + asset.content.byteLength, HEADER_BYTES + manifestBytes.byteLength);
  if (totalBytes > MAX_TEMPLATE_BUNDLE_BYTES) invalid("La plantilla supera el tamaño máximo permitido.");

  const output = new Uint8Array(totalBytes);
  output.set(BUNDLE_MAGIC, 0);
  new DataView(output.buffer).setUint32(BUNDLE_MAGIC.byteLength, manifestBytes.byteLength, false);
  output.set(manifestBytes, HEADER_BYTES);
  let offset = HEADER_BYTES + manifestBytes.byteLength;
  for (const asset of template.assets) {
    output.set(asset.content, offset);
    offset += asset.content.byteLength;
  }
  return output;
}

export function decodeTemplateBundle(bytes: Uint8Array): PortableTemplate {
  if (bytes.byteLength < HEADER_BYTES || bytes.byteLength > MAX_TEMPLATE_BUNDLE_BYTES) invalid("El tamaño del archivo no es válido.");
  for (let index = 0; index < BUNDLE_MAGIC.byteLength; index += 1) {
    if (bytes[index] !== BUNDLE_MAGIC[index]) invalid("El archivo no es una plantilla compatible.");
  }
  const manifestLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(BUNDLE_MAGIC.byteLength, false);
  if (manifestLength <= 0 || manifestLength > MAX_TEMPLATE_BUNDLE_MANIFEST_BYTES || HEADER_BYTES + manifestLength > bytes.byteLength) invalid("El manifiesto está dañado.");

  let rawManifest: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(HEADER_BYTES, HEADER_BYTES + manifestLength));
    rawManifest = JSON.parse(text);
  } catch {
    invalid("El manifiesto no contiene JSON válido.");
  }
  const parsed = templateBundleManifestSchema.safeParse(rawManifest);
  if (!parsed.success) invalid("El manifiesto no cumple el formato esperado.");

  const declaredAssetBytes = parsed.data.assets.reduce((total, asset) => total + asset.byteSize, 0);
  if (declaredAssetBytes > MAX_TEMPLATE_BUNDLE_ASSET_BYTES) invalid("Los assets superan el tamaño máximo permitido.");
  if (HEADER_BYTES + manifestLength + declaredAssetBytes !== bytes.byteLength) invalid("El contenido del archivo está incompleto o contiene datos inesperados.");

  let offset = HEADER_BYTES + manifestLength;
  const assets = parsed.data.assets.map((asset) => {
    const content = bytes.subarray(offset, offset + asset.byteSize);
    offset += asset.byteSize;
    return validatePortableAsset({ ...asset, content });
  });
  return validatePortableTemplate({ ...parsed.data.template, assets });
}

export function templateBundleFilename(name: string): string {
  const normalized = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `${normalized || "plantilla"}${TEMPLATE_BUNDLE_EXTENSION}`;
}

function validatePortableTemplate(input: PortableTemplate): PortableTemplate {
  const document = validateCanvasDocument(input.document);
  const header = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(500) }).safeParse(input);
  if (!header.success) invalid("Los datos de la plantilla no son válidos.");
  if (input.assets.length > 2_000) invalid("La plantilla contiene demasiados assets.");

  const assets = input.assets.map(validatePortableAsset);
  const assetIds = new Set<string>();
  let totalBytes = 0;
  for (const asset of assets) {
    if (assetIds.has(asset.id)) invalid("La plantilla contiene IDs de assets duplicados.");
    assetIds.add(asset.id);
    totalBytes += asset.byteSize;
  }
  if (totalBytes > MAX_TEMPLATE_BUNDLE_ASSET_BYTES) invalid("Los assets superan el tamaño máximo permitido.");

  const referencedIds = documentAssetIds(document);
  if (referencedIds.size !== assetIds.size || [...referencedIds].some((id) => !assetIds.has(id))) {
    invalid("Los assets incluidos no coinciden con los usados por el documento.");
  }
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  for (const node of document.nodes) {
    if (node.type === "image" && assetsById.get(node.assetId)?.kind !== "IMAGE") invalid("Un objeto de imagen referencia un asset incompatible.");
    if (node.type === "text" && node.fontAssetId && assetsById.get(node.fontAssetId)?.kind !== "FONT") invalid("Una fuente de texto referencia un asset incompatible.");
    if (node.type === "text" && node.modalAssetId && !["IMAGE", "VIDEO"].includes(assetsById.get(node.modalAssetId)?.kind ?? "")) invalid("Un modal de texto referencia un asset incompatible.");
    if (node.type === "shape" && node.shape === "rect" && node.backgroundImage && assetsById.get(node.backgroundImage.assetId)?.kind !== "IMAGE") invalid("Un fondo de rectángulo referencia un asset incompatible.");
  }
  return { name: header.data.name, description: header.data.description, document, assets };
}

function validatePortableAsset(input: PortableTemplateAsset): PortableTemplateAsset {
  const parsed = portableAssetManifestSchema.safeParse(input);
  if (!parsed.success) invalid("Un asset de la plantilla tiene metadatos inválidos.");
  if (!(input.content instanceof Uint8Array) || input.content.byteLength !== parsed.data.byteSize) invalid("Un asset tiene un tamaño distinto al declarado.");
  const policy = assetPolicy(parsed.data.kind);
  if (!policy.types.has(parsed.data.mimeType) || parsed.data.byteSize > policy.maxBytes) invalid(`El asset “${parsed.data.name}” no tiene un formato o tamaño permitido.`);
  if (sha256(input.content) !== parsed.data.checksum) invalid(`El asset “${parsed.data.name}” está dañado.`);

  if (parsed.data.kind === "IMAGE") {
    const dimensions = imageDimensions(input.content, parsed.data.mimeType);
    if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0 || dimensions.width > 8192 || dimensions.height > 8192) invalid(`La imagen “${parsed.data.name}” no es válida.`);
    if ((parsed.data.width !== null && parsed.data.width !== dimensions.width) || (parsed.data.height !== null && parsed.data.height !== dimensions.height)) invalid(`Las dimensiones de “${parsed.data.name}” no coinciden.`);
    return { ...parsed.data, ...dimensions, content: input.content };
  }
  return { ...parsed.data, content: input.content };
}

function assetPolicy(kind: MenuAssetKind): { types: Set<string>; maxBytes: number } {
  if (kind === "IMAGE") return { types: IMAGE_TYPES, maxBytes: 5 * 1024 * 1024 };
  if (kind === "VIDEO") return { types: VIDEO_TYPES, maxBytes: 50 * 1024 * 1024 };
  return { types: FONT_TYPES, maxBytes: 10 * 1024 * 1024 };
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function imageDimensions(bytes: Uint8Array, mimeType: string): { width: number; height: number } | null {
  if (mimeType === "image/png" && bytes.length >= 24 && matchesBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) && matchesBytes(bytes, 12, [0x49, 0x48, 0x44, 0x52])) return { width: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(16), height: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(20) };
  if (mimeType === "image/webp" && bytes.length >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X") return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
    if (chunk === "VP8L" && bytes[20] === 0x2f && bytes.length >= 25) return { width: 1 + ((bytes[21] | (bytes[22] << 8)) & 0x3fff), height: 1 + (((bytes[22] >> 6) | (bytes[23] << 2) | (bytes[24] << 10)) & 0x3fff) };
    if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { width: bytes[26] | (bytes[27] << 8), height: bytes[28] | (bytes[29] << 8) };
  }
  if (mimeType === "image/jpeg" && bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) return null;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      offset += 2 + length;
    }
  }
  return null;
}

function matchesBytes(bytes: Uint8Array, offset: number, expected: number[]): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function invalid(message: string): never {
  throw new BadRequestError(`Archivo de plantilla inválido. ${message}`);
}
