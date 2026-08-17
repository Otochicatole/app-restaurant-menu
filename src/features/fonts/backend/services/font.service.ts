import { prisma } from "@/shared/backend/database/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "@/shared/backend/errors/app-error";
import { deleteFile, saveFile, validateFontFile } from "@/shared/backend/storage";
import { createCustomFontSchema } from "../schemas/font.schema";
import { FONT_TARGETS, type FontCategory, type FontDTO, type FontTarget } from "../types";

const FONT_SETTING_KEYS: Record<FontTarget, string> = {
  global: "menu.activeFontId",
  title: "menu.font.title",
  subtitle: "menu.font.subtitle",
  group: "menu.font.group",
  product: "menu.font.product",
  featured: "menu.font.featured",
};

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

export async function getFontForTarget(target: FontTarget): Promise<FontDTO | null> {
  const setting = await prisma.setting.findUnique({ where: { key: FONT_SETTING_KEYS[target] } });
  if (!setting?.value) return null;

  const font = await prisma.font.findUnique({ where: { id: setting.value } });
  if (!font) return null;
  return toDTO(font);
}

export async function getFontSelection(): Promise<Record<FontTarget, FontDTO | null>> {
  const keys = Object.values(FONT_SETTING_KEYS);
  const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });

  const fontIds = settings.map((setting) => setting.value).filter(Boolean);
  const fonts = fontIds.length > 0
    ? await prisma.font.findMany({ where: { id: { in: fontIds } } })
    : [];

  const byId = new Map(fonts.map((font) => [font.id, font]));
  const valueByKey = new Map(settings.map((setting) => [setting.key, setting.value]));

  return FONT_TARGETS.reduce<Record<FontTarget, FontDTO | null>>(
    (acc, target) => {
      const value = valueByKey.get(FONT_SETTING_KEYS[target]);
      const font = value ? byId.get(value) ?? null : null;
      acc[target] = font ? toDTO(font) : null;
      return acc;
    },
    {} as Record<FontTarget, FontDTO | null>,
  );
}

export async function setFontForTarget(target: FontTarget, fontId: string | null): Promise<void> {
  if (fontId) {
    const font = await prisma.font.findUnique({ where: { id: fontId } });
    if (!font) throw new NotFoundError("Font");
  }

  await prisma.setting.upsert({
    where: { key: FONT_SETTING_KEYS[target] },
    create: { key: FONT_SETTING_KEYS[target], value: fontId ?? "" },
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

  const active = await getFontSelection();
  if (Object.values(active).some((font) => font?.id === id)) {
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
