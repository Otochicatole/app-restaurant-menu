import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import { blobStore } from "@/platform/storage";
import type {
  LandingRepository,
  LandingTemplateCreateInput,
  RestaurantInfo,
} from "../application/ports";
import {
  landingDocumentSchema,
  landingModuleFieldSchema,
  type CreateCustomModuleCommand,
  type LandingCustomModuleView,
  type LandingDocumentV1,
  type LandingModuleField,
  type LandingPageData,
  type LandingTemplateView,
  type PublishLandingCommand,
  type SaveLandingCommand,
  type SuperadminLandingTemplateList,
  type SuperadminLandingTemplateQuery,
  type SuperadminLandingTemplateView,
} from "../contracts";
import { createDefaultLandingDocument } from "../domain/landing-compiler";
import type { PortableLandingTemplate } from "../domain/landing-template-bundle";
import {
  LANDING_TEMPLATE_PRESETS,
  presetAsLandingTemplateView,
} from "../domain/landing-template-presets";

function landingStorageKey(restaurantId: string, filename: string): string {
  return `restaurants/${restaurantId}/landing/${filename}`;
}

const restaurantInfoSelect = {
  id: true,
  organizationId: true,
  name: true,
  slug: true,
  landingSlug: true,
  status: true,
  landingEnabled: true,
  organization: { select: { status: true } },
} as const;

function toRestaurantInfo(record: Omit<RestaurantInfo, "organizationStatus"> & {
  organization: { status: string };
}): RestaurantInfo {
  const { organization, ...restaurant } = record;
  return { ...restaurant, organizationStatus: organization.status };
}

function parseDocumentJson(raw: string | null): LandingDocumentV1 | null {
  if (!raw) return null;
  try {
    const parsed = landingDocumentSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function parseFieldsJson(raw: string): LandingModuleField[] {
  try {
    const parsed = landingModuleFieldSchema.array().safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function toLandingPageData(record: {
  id: string;
  restaurantId: string;
  documentJson: string | null;
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): LandingPageData {
  return {
    id: record.id,
    restaurantId: record.restaurantId,
    document: parseDocumentJson(record.documentJson),
    htmlContent: record.htmlContent,
    cssContent: record.cssContent,
    jsContent: record.jsContent,
    published: record.published,
    publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toTemplateView(row: {
  id: string;
  name: string;
  description: string;
  visibility: string;
  status: string;
  isSystem: boolean;
  restaurantId: string | null;
  documentJson: string;
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): LandingTemplateView {
  const document =
    parseDocumentJson(row.documentJson) ??
    createDefaultLandingDocument(row.name, "restaurante");

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility as LandingTemplateView["visibility"],
    status: row.status as LandingTemplateView["status"],
    isSystem: row.isSystem,
    restaurantId: row.restaurantId,
    document,
    htmlContent: row.htmlContent,
    cssContent: row.cssContent,
    jsContent: row.jsContent,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaLandingRepository implements LandingRepository {
  async findByRestaurantId(restaurantId: string): Promise<LandingPageData | null> {
    const record = await prisma.landingPage.findUnique({
      where: { restaurantId },
    });

    if (!record) return null;
    return toLandingPageData(record);
  }

  async save(command: SaveLandingCommand): Promise<LandingPageData> {
    const documentJson = command.document
      ? JSON.stringify(command.document)
      : undefined;

    const record = await prisma.landingPage.upsert({
      where: { restaurantId: command.restaurantId },
      create: {
        restaurantId: command.restaurantId,
        documentJson: documentJson ?? null,
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        published: false,
      },
      update: {
        ...(documentJson !== undefined ? { documentJson } : {}),
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
      },
    });

    return toLandingPageData(record);
  }

  async publish(
    command: PublishLandingCommand,
    compiledHtml: string,
  ): Promise<LandingPageData> {
    const publishedAt = new Date();
    const documentJson = command.document
      ? JSON.stringify(command.document)
      : undefined;

    const record = await prisma.landingPage.upsert({
      where: { restaurantId: command.restaurantId },
      create: {
        restaurantId: command.restaurantId,
        documentJson: documentJson ?? null,
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        published: true,
        publishedAt,
      },
      update: {
        ...(documentJson !== undefined ? { documentJson } : {}),
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        published: true,
        publishedAt,
      },
    });

    await Promise.all([
      blobStore.put(
        landingStorageKey(command.restaurantId, "index.html"),
        Buffer.from(compiledHtml, "utf-8"),
      ),
      blobStore.put(
        landingStorageKey(command.restaurantId, "style.css"),
        Buffer.from(command.cssContent, "utf-8"),
      ),
      blobStore.put(
        landingStorageKey(command.restaurantId, "script.js"),
        Buffer.from(command.jsContent, "utf-8"),
      ),
    ]);

    return toLandingPageData(record);
  }

  async getPublishedHtmlFromStorage(restaurantId: string): Promise<string | null> {
    const key = landingStorageKey(restaurantId, "index.html");
    const exists = await blobStore.exists(key);
    if (!exists) return null;

    try {
      const buffer = await blobStore.read(key);
      return buffer.toString("utf-8");
    } catch {
      return null;
    }
  }

  async findRestaurantByLandingSlug(slug: string): Promise<RestaurantInfo | null> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { landingSlug: slug },
      select: restaurantInfoSelect,
    });
    return restaurant ? toRestaurantInfo(restaurant) : null;
  }

  async findRestaurantById(restaurantId: string): Promise<RestaurantInfo | null> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: restaurantInfoSelect,
    });
    return restaurant ? toRestaurantInfo(restaurant) : null;
  }

  async isLandingEnabledForRestaurant(restaurantId: string): Promise<boolean> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        landingEnabled: true,
        status: true,
        organization: { select: { status: true } },
      },
    });

    return Boolean(
      restaurant?.landingEnabled &&
      restaurant.status === "ACTIVE" &&
      restaurant.organization.status === "ACTIVE",
    );
  }

  // Reusable Custom Modules
  async listCustomModules(
    restaurantId: string,
  ): Promise<LandingCustomModuleView[]> {
    const rows = await prisma.landingCustomModule.findMany({
      where: { restaurantId },
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      restaurantId: row.restaurantId,
      name: row.name,
      description: row.description,
      category: row.category,
      fields: parseFieldsJson(row.fieldsJson),
      htmlTemplate: row.htmlTemplate,
      cssTemplate: row.cssTemplate,
      jsTemplate: row.jsTemplate,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async createCustomModule(
    command: CreateCustomModuleCommand,
  ): Promise<LandingCustomModuleView> {
    const row = await prisma.landingCustomModule.create({
      data: {
        id: randomUUID(),
        restaurantId: command.restaurantId,
        name: command.name,
        description: command.description,
        category: command.category,
        fieldsJson: JSON.stringify(command.fields),
        htmlTemplate: command.htmlTemplate,
        cssTemplate: command.cssTemplate,
        jsTemplate: command.jsTemplate,
      },
    });

    return {
      id: row.id,
      restaurantId: row.restaurantId,
      name: row.name,
      description: row.description,
      category: row.category,
      fields: parseFieldsJson(row.fieldsJson),
      htmlTemplate: row.htmlTemplate,
      cssTemplate: row.cssTemplate,
      jsTemplate: row.jsTemplate,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async deleteCustomModule(restaurantId: string, moduleId: string): Promise<void> {
    const res = await prisma.landingCustomModule.deleteMany({
      where: { id: moduleId, restaurantId },
    });
    if (res.count !== 1) {
      throw new NotFoundError("Módulo personalizado");
    }
  }

  // Landing Templates
  async listTemplates(restaurantId: string): Promise<LandingTemplateView[]> {
    const rows = await prisma.landingTemplate.findMany({
      where: {
        OR: [
          { isSystem: true, status: "PUBLISHED" },
          { visibility: "PUBLIC", status: "PUBLISHED" },
          { restaurantId },
        ],
      },
      orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }],
    });

    const views = rows.map(toTemplateView);
    const existingIds = new Set(views.map((v) => v.id));
    for (const preset of LANDING_TEMPLATE_PRESETS) {
      if (!existingIds.has(preset.id)) {
        views.unshift(presetAsLandingTemplateView(preset));
      }
    }
    return views;
  }

  async createPrivateTemplate(
    input: LandingTemplateCreateInput,
  ): Promise<LandingTemplateView> {
    const row = await prisma.landingTemplate.create({
      data: {
        id: randomUUID(),
        restaurantId: input.restaurantId,
        name: input.name,
        description: input.description,
        documentJson: JSON.stringify(input.document),
        htmlContent: input.htmlContent,
        cssContent: input.cssContent,
        jsContent: input.jsContent,
        schemaVersion: input.document.schemaVersion,
        visibility: "PRIVATE",
        status: "DRAFT",
      },
    });
    return toTemplateView(row);
  }

  async submitPublicTemplate(
    input: LandingTemplateCreateInput,
  ): Promise<LandingTemplateView> {
    const row = await prisma.landingTemplate.create({
      data: {
        id: randomUUID(),
        restaurantId: input.restaurantId,
        name: input.name,
        description: input.description,
        documentJson: JSON.stringify(input.document),
        htmlContent: input.htmlContent,
        cssContent: input.cssContent,
        jsContent: input.jsContent,
        schemaVersion: input.document.schemaVersion,
        visibility: "PUBLIC",
        status: "PENDING",
        submittedAt: new Date(),
      },
    });
    return toTemplateView(row);
  }

  async deletePrivateTemplate(
    restaurantId: string,
    templateId: string,
  ): Promise<void> {
    const result = await prisma.landingTemplate.deleteMany({
      where: {
        id: templateId,
        restaurantId,
        isSystem: false,
        visibility: "PRIVATE",
      },
    });
    if (result.count !== 1) {
      throw new NotFoundError("Plantilla de landing");
    }
  }

  async exportPortableTemplate(
    restaurantId: string,
    templateId: string,
  ): Promise<PortableLandingTemplate> {
    const preset = LANDING_TEMPLATE_PRESETS.find((item) => item.id === templateId);
    if (preset) {
      const view = presetAsLandingTemplateView(preset);
      return {
        name: view.name,
        description: view.description,
        document: view.document,
        htmlContent: view.htmlContent,
        cssContent: view.cssContent,
        jsContent: view.jsContent,
      };
    }

    const row = await prisma.landingTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { isSystem: true, status: "PUBLISHED" },
          { visibility: "PUBLIC", status: "PUBLISHED" },
          { restaurantId },
        ],
      },
    });

    if (!row) {
      throw new NotFoundError("Plantilla de landing");
    }

    const view = toTemplateView(row);
    return {
      name: view.name,
      description: view.description,
      document: view.document,
      htmlContent: view.htmlContent,
      cssContent: view.cssContent,
      jsContent: view.jsContent,
    };
  }

  async importPortableTemplate(
    restaurantId: string,
    portable: PortableLandingTemplate,
  ): Promise<LandingTemplateView> {
    const row = await prisma.landingTemplate.create({
      data: {
        id: randomUUID(),
        restaurantId,
        name: portable.name,
        description: portable.description,
        documentJson: JSON.stringify(portable.document),
        htmlContent: portable.htmlContent,
        cssContent: portable.cssContent,
        jsContent: portable.jsContent,
        schemaVersion: portable.document.schemaVersion,
        visibility: "PRIVATE",
        status: "DRAFT",
      },
    });
    return toTemplateView(row);
  }

  async listTemplatesForSuperadmin(
    input: SuperadminLandingTemplateQuery,
  ): Promise<SuperadminLandingTemplateList> {
    const status: "PUBLISHED" | "PENDING" | "REJECTED" | "ARCHIVED" | undefined =
      input.tab === "published"
        ? "PUBLISHED"
        : input.tab === "pending"
        ? "PENDING"
        : input.tab === "rejected"
        ? "REJECTED"
        : input.tab === "archived"
        ? "ARCHIVED"
        : undefined;

    const scope =
      input.tab === "system"
        ? { isSystem: true }
        : input.tab === "all"
        ? { OR: [{ isSystem: true }, { visibility: "PUBLIC" as const }] }
        : { isSystem: false, visibility: "PUBLIC" as const };

    const rows = await prisma.landingTemplate.findMany({
      where: {
        AND: [
          scope,
          ...(status ? [{ status }] : []),
          ...(input.query
            ? [
                {
                  OR: [
                    { name: { contains: input.query } },
                    { description: { contains: input.query } },
                    { restaurant: { name: { contains: input.query } } },
                    { restaurant: { slug: { contains: input.query } } },
                  ],
                },
              ]
            : []),
        ],
      },
      include: { restaurant: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    });

    const items: SuperadminLandingTemplateView[] = rows.map((row) => ({
      ...toTemplateView(row),
      owner: row.restaurant
        ? {
            restaurantId: row.restaurant.id,
            name: row.restaurant.name,
            slug: row.restaurant.slug,
          }
        : null,
    }));

    for (const preset of LANDING_TEMPLATE_PRESETS) {
      if (input.tab !== "all" && input.tab !== "system") continue;
      if (
        input.query &&
        !`${preset.name} ${preset.description}`
          .toLocaleLowerCase()
          .includes(input.query.toLocaleLowerCase())
      ) {
        continue;
      }
      if (!items.some((item) => item.id === preset.id)) {
        items.push({ ...presetAsLandingTemplateView(preset), owner: null });
      }
    }

    items.sort(
      (left, right) =>
        Number(right.isSystem) - Number(left.isSystem) ||
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.id.localeCompare(right.id),
    );

    const start = (input.page - 1) * input.pageSize;
    return {
      items: items.slice(start, start + input.pageSize),
      total: items.length,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async moderateTemplate(
    templateId: string,
    action: "publish" | "reject" | "archive" | "restore",
    reason?: string,
  ): Promise<LandingTemplateView> {
    const template = await prisma.landingTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template || template.visibility !== "PUBLIC" || template.isSystem) {
      throw new NotFoundError("Plantilla de landing");
    }

    const validTransitions = {
      publish: "PENDING",
      reject: "PENDING",
      archive: "PUBLISHED",
      restore: "ARCHIVED",
    } as const;

    if (template.status !== validTransitions[action]) {
      throw new ConflictError(
        "La plantilla no está en un estado válido para esta acción.",
      );
    }

    const status =
      action === "publish" || action === "restore"
        ? "PUBLISHED"
        : action === "reject"
        ? "REJECTED"
        : "ARCHIVED";

    const row = await prisma.landingTemplate.update({
      where: { id: templateId },
      data: {
        status,
        rejectionReason: action === "reject" ? reason ?? null : null,
        publishedAt: action === "publish" ? new Date() : null,
      },
    });

    return toTemplateView(row);
  }

  async deletePublicTemplate(templateId: string): Promise<void> {
    const template = await prisma.landingTemplate.findFirst({
      where: { id: templateId, visibility: "PUBLIC", isSystem: false },
    });
    if (!template) {
      throw new NotFoundError("Plantilla de landing");
    }
    await prisma.landingTemplate.delete({ where: { id: template.id } });
  }
}
