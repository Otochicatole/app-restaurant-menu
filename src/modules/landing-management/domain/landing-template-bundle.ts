import { z } from "zod";
import { BadRequestError } from "@/platform/application/errors";
import { landingDocumentSchema, type LandingDocumentV1 } from "../contracts";

const BUNDLE_MAGIC = new TextEncoder().encode("RLAND001");
const HEADER_BYTES = BUNDLE_MAGIC.byteLength + 4;
const FORMAT_NAME = "restaurant-landing-template";
const FORMAT_VERSION = 1;

export const LANDING_TEMPLATE_BUNDLE_MIME_TYPE =
  "application/vnd.restaurant-menu.landing-template";
export const LANDING_TEMPLATE_BUNDLE_EXTENSION = ".landingtemplate";
export const MAX_LANDING_TEMPLATE_BUNDLE_BYTES = 5 * 1024 * 1024;

const landingBundleManifestSchema = z.object({
  format: z.literal(FORMAT_NAME),
  formatVersion: z.literal(FORMAT_VERSION),
  template: z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500),
    document: landingDocumentSchema,
    htmlContent: z.string().max(500_000).default(""),
    cssContent: z.string().max(500_000).default(""),
    jsContent: z.string().max(500_000).default(""),
  }),
});

export type PortableLandingTemplate = z.infer<
  typeof landingBundleManifestSchema
>["template"];

export function encodeLandingTemplateBundle(
  input: PortableLandingTemplate,
): Uint8Array {
  const parsed = landingBundleManifestSchema.safeParse({
    format: FORMAT_NAME,
    formatVersion: FORMAT_VERSION,
    template: input,
  });
  if (!parsed.success) {
    throw new BadRequestError("Los datos de la plantilla de landing no son válidos.");
  }

  const manifestBytes = new TextEncoder().encode(JSON.stringify(parsed.data));
  const totalBytes = HEADER_BYTES + manifestBytes.byteLength;
  if (totalBytes > MAX_LANDING_TEMPLATE_BUNDLE_BYTES) {
    throw new BadRequestError("La plantilla de landing supera el tamaño máximo permitido.");
  }

  const output = new Uint8Array(totalBytes);
  output.set(BUNDLE_MAGIC, 0);
  new DataView(output.buffer).setUint32(
    BUNDLE_MAGIC.byteLength,
    manifestBytes.byteLength,
    false,
  );
  output.set(manifestBytes, HEADER_BYTES);
  return output;
}

export function decodeLandingTemplateBundle(
  bytes: Uint8Array,
): PortableLandingTemplate {
  if (
    bytes.byteLength < HEADER_BYTES ||
    bytes.byteLength > MAX_LANDING_TEMPLATE_BUNDLE_BYTES
  ) {
    throw new BadRequestError("Archivo de plantilla inválido: tamaño no compatible.");
  }

  for (let i = 0; i < BUNDLE_MAGIC.byteLength; i += 1) {
    if (bytes[i] !== BUNDLE_MAGIC[i]) {
      throw new BadRequestError(
        "El archivo no es una plantilla .landingtemplate compatible.",
      );
    }
  }

  const manifestLength = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(BUNDLE_MAGIC.byteLength, false);

  if (
    manifestLength <= 0 ||
    HEADER_BYTES + manifestLength !== bytes.byteLength
  ) {
    throw new BadRequestError("El manifiesto de la plantilla está dañado.");
  }

  let rawManifest: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      bytes.subarray(HEADER_BYTES, HEADER_BYTES + manifestLength),
    );
    rawManifest = JSON.parse(text);
  } catch {
    throw new BadRequestError("El archivo de plantilla no contiene JSON válido.");
  }

  const parsed = landingBundleManifestSchema.safeParse(rawManifest);
  if (!parsed.success) {
    throw new BadRequestError(
      "El manifiesto de la plantilla no cumple el formato esperado.",
    );
  }

  return parsed.data.template;
}

export function landingTemplateBundleFilename(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${normalized || "landing-template"}${LANDING_TEMPLATE_BUNDLE_EXTENSION}`;
}

export function ensureDocumentForLanding(
  document: LandingDocumentV1 | null | undefined,
  fallback: () => LandingDocumentV1,
): LandingDocumentV1 {
  if (!document) return fallback();
  const parsed = landingDocumentSchema.safeParse(document);
  return parsed.success ? parsed.data : fallback();
}
