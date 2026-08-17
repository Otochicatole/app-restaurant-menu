import { prisma } from "@/shared/backend/database/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "@/shared/backend/errors/app-error";
import { deleteFile, saveFile, validateFontFile } from "@/shared/backend/storage";
import { createCustomFontSchema } from "../schemas/font.schema";
import type { FontCategory, FontDTO } from "../types";

const ACTIVE_FONT_KEY = "menu.activeFontId";

const GENERIC_FALLBACK: Record<FontCategory, string> = {
  serif: "serif",
  "sans-serif": "sans-serif",
  monospace: "monospace",
  display: "sans-serif",
  script: "cursive",
};

interface FontRow {
  id: string;
  name: string;
  category: string;
  source: string;
  googleFamily: string | null;
  fontFamily: string;
  weights: string;
  filePath: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toDTO(font: FontRow): FontDTO {
  return {
    id: font.id,
    name: font.name,
    category: font.category as FontCategory,
    source: font.source as FontDTO["source"],
    googleFamily: font.googleFamily,
    fontFamily: font.fontFamily,
    weights: font.weights,
    filePath: font.filePath,
    createdAt: font.createdAt.toISOString(),
    updatedAt: font.updatedAt.toISOString(),
  };
}

export async function getFonts(): Promise<FontDTO[]> {
  const fonts = await prisma.font.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return fonts.map(toDTO);
}

export async function getActiveFont(): Promise<FontDTO | null> {
  const setting = await prisma.setting.findUnique({ where: { key: ACTIVE_FONT_KEY } });
  if (!setting?.value) return null;

  const font = await prisma.font.findUnique({ where: { id: setting.value } });
  if (!font) return null;
  return toDTO(font);
}

export async function setActiveFont(fontId: string | null): Promise<void> {
  if (fontId) {
    const font = await prisma.font.findUnique({ where: { id: fontId } });
    if (!font) throw new NotFoundError("Font");
  }

  await prisma.setting.upsert({
    where: { key: ACTIVE_FONT_KEY },
    create: { key: ACTIVE_FONT_KEY, value: fontId ?? "" },
    update: { value: fontId ?? "" },
  });
}

export async function createCustomFont(input: {
  name: string;
  category: FontCategory;
  file: { name: string; size: number; buffer: Buffer };
}): Promise<FontDTO> {
  const parsed = createCustomFontSchema.safeParse({ name: input.name, category: input.category });
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const existing = await prisma.font.findUnique({ where: { name: parsed.data.name } });
  if (existing) throw new ConflictError("Ya existe una fuente con ese nombre.");

  const { extension } = validateFontFile(input.file);
  const fallback = GENERIC_FALLBACK[parsed.data.category];

  const font = await prisma.font.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      source: "custom",
      fontFamily: `"${parsed.data.name}", ${fallback}`,
      weights: "400",
    },
  });

  const relativePath = `fonts/${font.id}.${extension}`;
  await saveFile(relativePath, input.file.buffer);

  const updated = await prisma.font.update({
    where: { id: font.id },
    data: { filePath: relativePath },
  });

  return toDTO(updated);
}

export async function deleteFont(id: string): Promise<void> {
  const font = await prisma.font.findUnique({ where: { id } });
  if (!font) throw new NotFoundError("Font");

  const active = await getActiveFont();
  if (active?.id === id) {
    throw new ConflictError("No podés eliminar la fuente que está en uso. Elegí otra primero.");
  }

  if (font.filePath) {
    await deleteFile(font.filePath);
  }

  await prisma.font.delete({ where: { id } });
}

export async function getFontFile(id: string): Promise<{ filePath: string; name: string }> {
  const font = await prisma.font.findUnique({ where: { id } });
  if (!font?.filePath) throw new NotFoundError("Font");
  return { filePath: font.filePath, name: font.name };
}
