import { prisma } from "@/platform/database/prisma";
import {
  FONT_CATEGORIES,
  FONT_SETTING_KEYS,
  FONT_TARGETS,
  fontFamilyAlias,
  type FontCategory,
  type FontTarget,
} from "@/modules/menu-customization/contracts";
import type { Font } from "@/generated/prisma/client";
import type {
  PublicMenuFont,
  PublicMenuTheme,
  PublicMenuView,
} from "../contracts";
import type { PublishedMenuReader } from "../application/ports";

function toPublicFont(font: Font, tenantSlug: string): PublicMenuFont {
  const category = FONT_CATEGORIES.includes(font.category as FontCategory)
    ? (font.category as FontCategory)
    : "sans-serif";
  const custom = font.source === "custom";
  const alias = custom ? fontFamilyAlias(font.id) : font.googleFamily ?? font.name;
  return {
    id: font.id,
    name: font.name,
    category,
    source: custom ? "custom" : "google",
    googleFamily: font.googleFamily,
    familyAlias: alias,
    fontFamily: custom ? `"${alias}", ${fallbackFor(category)}` : font.fontFamily,
    weights: font.weights,
    fileUrl: custom ? `/api/public/menus/${tenantSlug}/fonts/${font.id}/file` : null,
  };
}

export class PrismaPublishedMenuReader implements PublishedMenuReader {
  async getBySlug(slug: string): Promise<PublicMenuView | null> {
    const tenant = await prisma.tenant.findFirst({
      where: { slug, status: "ACTIVE" },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) return null;

    const [header, groups, highlights, settings] = await Promise.all([
      prisma.homePage.findUnique({ where: { tenantId: tenant.id } }),
      prisma.group.findMany({
        where: { tenantId: tenant.id },
        include: { products: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
        orderBy: { name: "asc" },
      }),
      prisma.featuredProduct.findMany({
        where: { tenantId: tenant.id },
        include: { product: { include: { group: true } } },
        orderBy: { position: "asc" },
      }),
      prisma.setting.findMany({
        where: { tenantId: tenant.id, key: { in: Object.values(FONT_SETTING_KEYS) } },
      }),
    ]);

    const fontIds = [...new Set(settings.map((setting) => setting.value).filter(Boolean))];
    const fonts = fontIds.length
      ? await prisma.font.findMany({
          where: { id: { in: fontIds }, OR: [{ tenantId: null }, { tenantId: tenant.id }] },
        })
      : [];
    const fontsById = new Map(fonts.map((font) => [font.id, toPublicFont(font, tenant.slug)]));
    const settingByKey = new Map(settings.map((setting) => [setting.key, setting.value]));
    const theme: PublicMenuTheme = {
      fonts: FONT_TARGETS.reduce<Record<FontTarget, PublicMenuFont | null>>((selection, target) => {
        const fontId = settingByKey.get(FONT_SETTING_KEYS[target]);
        selection[target] = fontId ? fontsById.get(fontId) ?? null : null;
        return selection;
      }, {} as Record<FontTarget, PublicMenuFont | null>),
    };

    const highlightSlots: PublicMenuView["highlights"] = [null, null, null];
    for (const highlight of highlights) {
      if (highlight.position < 1 || highlight.position > 3) continue;
      highlightSlots[highlight.position - 1] = {
        position: highlight.position as 1 | 2 | 3,
        product: {
          id: highlight.product.id,
          name: highlight.product.name,
          price: highlight.product.price,
          groupName: highlight.product.group.name,
        },
      };
    }

    return {
      tenant,
      header: {
        title: header?.title ?? tenant.name,
        description: header?.description ?? "Menú digital",
      },
      sections: groups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        items: group.products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          mediaUrl: product.mediaPath
            ? `/api/public/menus/${tenant.slug}/products/${product.id}/media?v=${product.updatedAt.getTime()}`
            : null,
          mediaType: product.mediaType === "image" || product.mediaType === "video" ? product.mediaType : null,
        })),
      })),
      highlights: highlightSlots,
      theme,
    };
  }
}

function fallbackFor(category: FontCategory): string {
  if (category === "serif") return "serif";
  if (category === "monospace") return "monospace";
  if (category === "script") return "cursive";
  return "sans-serif";
}
