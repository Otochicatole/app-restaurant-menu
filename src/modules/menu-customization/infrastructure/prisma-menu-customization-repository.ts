import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import { blobStore } from "@/platform/storage";
import { drainAssetCleanupQueue } from "@/platform/storage/asset-cleanup-queue";
import { logger } from "@/platform/logging/logger";
import type { Font } from "@/generated/prisma/client";
import {
  FONT_CATEGORIES,
  FONT_SETTING_KEYS,
  FONT_TARGETS,
  fontFamilyAlias,
  type CustomFontUpload,
  type FontCategory,
  type FontOption,
  type FontSelection,
  type MenuHeader,
  type SelectFontCommand,
  type UpdateMenuHeaderCommand,
} from "../contracts";
import { fontFamilyValue, validateFontUpload } from "../domain/font-policy";
import type { MenuCustomizationRepository } from "../application/ports";

function toFontOption(font: Font): FontOption {
  const category = FONT_CATEGORIES.includes(font.category as FontCategory)
    ? (font.category as FontCategory)
    : "sans-serif";
  const isCustom = font.source === "custom";
  const alias = isCustom ? fontFamilyAlias(font.id) : font.googleFamily ?? font.name;
  return {
    id: font.id,
    name: font.name,
    category,
    source: isCustom ? "custom" : "google",
    scope: font.tenantId ? "tenant" : "system",
    canDelete: Boolean(font.tenantId && isCustom),
    googleFamily: font.googleFamily,
    familyAlias: alias,
    fontFamily: isCustom ? fontFamilyValue(font.id, category) : font.fontFamily,
    weights: font.weights,
    hasFile: Boolean(font.filePath),
    createdAt: font.createdAt.toISOString(),
    updatedAt: font.updatedAt.toISOString(),
  };
}

export class PrismaMenuCustomizationRepository implements MenuCustomizationRepository {
  async getHeader(tenantId: string): Promise<MenuHeader> {
    const [header, tenant] = await Promise.all([
      prisma.homePage.findUnique({ where: { tenantId } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);
    if (!tenant) throw new NotFoundError("Tenant");
    return header
      ? {
          id: header.id,
          title: header.title,
          description: header.description,
          createdAt: header.createdAt.toISOString(),
          updatedAt: header.updatedAt.toISOString(),
        }
      : { id: null, title: tenant.name, description: "Menú digital", createdAt: null, updatedAt: null };
  }

  async updateHeader(tenantId: string, input: UpdateMenuHeaderCommand): Promise<MenuHeader> {
    const header = await prisma.homePage.upsert({
      where: { tenantId },
      create: { tenantId, ...input },
      update: input,
    });
    return {
      id: header.id,
      title: header.title,
      description: header.description,
      createdAt: header.createdAt.toISOString(),
      updatedAt: header.updatedAt.toISOString(),
    };
  }

  async listFonts(tenantId: string): Promise<FontOption[]> {
    const fonts = await prisma.font.findMany({
      where: { OR: [{ tenantId: null }, { tenantId }] },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return fonts.map(toFontOption);
  }

  async getFontSelection(tenantId: string): Promise<FontSelection> {
    const keys = Object.values(FONT_SETTING_KEYS);
    const settings = await prisma.setting.findMany({ where: { tenantId, key: { in: keys } } });
    const fontIds = [...new Set(settings.map((setting) => setting.value).filter(Boolean))];
    const fonts = fontIds.length
      ? await prisma.font.findMany({
          where: { id: { in: fontIds }, OR: [{ tenantId: null }, { tenantId }] },
        })
      : [];
    const options = new Map(fonts.map((font) => [font.id, toFontOption(font)]));
    const values = new Map(settings.map((setting) => [setting.key, setting.value]));
    return FONT_TARGETS.reduce<FontSelection>((selection, target) => {
      const id = values.get(FONT_SETTING_KEYS[target]);
      selection[target] = id ? options.get(id) ?? null : null;
      return selection;
    }, {} as FontSelection);
  }

  async selectFont(tenantId: string, input: SelectFontCommand): Promise<void> {
    if (input.fontId) {
      const font = await prisma.font.findFirst({
        where: { id: input.fontId, OR: [{ tenantId: null }, { tenantId }] },
        select: { id: true },
      });
      if (!font) throw new NotFoundError("Font");
    }
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: FONT_SETTING_KEYS[input.target] } },
      create: { tenantId, key: FONT_SETTING_KEYS[input.target], value: input.fontId ?? "" },
      update: { value: input.fontId ?? "" },
    });
  }

  async createCustomFont(tenantId: string, input: CustomFontUpload): Promise<FontOption> {
    const extension = validateFontUpload(input.file);
    const duplicate = await prisma.font.findFirst({
      where: { name: input.name, OR: [{ tenantId: null }, { tenantId }] },
      select: { id: true },
    });
    if (duplicate) throw new ConflictError("Ya existe una fuente con ese nombre.");

    const id = randomUUID();
    const storageKey = `tenants/${tenantId}/fonts/${id}.${extension}`;
    await blobStore.put(storageKey, Buffer.from(input.file.buffer));
    try {
      const font = await prisma.font.create({
        data: {
          id,
          tenantId,
          name: input.name,
          category: input.category,
          source: "custom",
          fontFamily: fontFamilyValue(id, input.category),
          weights: "400",
          filePath: storageKey,
        },
      });
      return toFontOption(font);
    } catch (error) {
      await blobStore.delete(storageKey).catch(() => undefined);
      if (isUniqueConstraintError(error)) throw new ConflictError("Ya existe una fuente con ese nombre.");
      throw error;
    }
  }

  async deleteCustomFont(tenantId: string, fontId: string): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const font = await transaction.font.findFirst({ where: { id: fontId, tenantId } });
      if (!font || font.source !== "custom") throw new NotFoundError("Font");
      const active = await transaction.setting.findFirst({
        where: { tenantId, key: { in: Object.values(FONT_SETTING_KEYS) }, value: fontId },
        select: { key: true },
      });
      if (active) throw new ConflictError("No podés eliminar la fuente que está en uso. Elegí otra primero.");
      if (font.filePath) {
        await transaction.assetCleanupJob.upsert({
          where: { storageKey: font.filePath },
          create: { storageKey: font.filePath },
          update: { availableAt: new Date(), lastError: null },
        });
      }
      await transaction.font.delete({ where: { id: font.id } });
    });
    await drainAssetCleanupQueue().catch((error) => logger.error("Deferred font cleanup", error));
  }

  async getCustomFontAsset(tenantId: string, fontId: string): Promise<{ storageKey: string; name: string }> {
    const font = await prisma.font.findFirst({ where: { id: fontId, tenantId, source: "custom" } });
    if (!font?.filePath) throw new NotFoundError("Font");
    return { storageKey: font.filePath, name: font.name };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "P2002";
}
