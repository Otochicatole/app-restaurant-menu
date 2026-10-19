import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import { blobStore } from "@/platform/storage";
import type {
  LandingRepository,
  LandingTemplateCreateInput,
  TenantInfo,
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

function landingStorageKey(tenantId: string, filename: string): string {
  return `tenants/${tenantId}/landing/${filename}`;
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
  tenantId: string;
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
    tenantId: record.tenantId,
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
  tenantId: string | null;
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
    tenantId: row.tenantId,
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
  async findByTenantId(tenantId: string): Promise<LandingPageData | null> {
    const record = await prisma.landingPage.findUnique({
      where: { tenantId },
    });

    if (!record) return null;
    return toLandingPageData(record);
  }

  async save(command: SaveLandingCommand): Promise<LandingPageData> {
    const documentJson = command.document
      ? JSON.stringify(command.document)
      : undefined;

    const record = await prisma.landingPage.upsert({
      where: { tenantId: command.tenantId },
      create: {
        tenantId: command.tenantId,
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
      where: { tenantId: command.tenantId },
      create: {
        tenantId: command.tenantId,
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
        landingStorageKey(command.tenantId, "index.html"),
        Buffer.from(compiledHtml, "utf-8"),
      ),
      blobStore.put(
        landingStorageKey(command.tenantId, "style.css"),
        Buffer.from(command.cssContent, "utf-8"),
      ),
      blobStore.put(
        landingStorageKey(command.tenantId, "script.js"),
        Buffer.from(command.jsContent, "utf-8"),
      ),
    ]);

    return toLandingPageData(record);
  }

  async getPublishedHtmlFromStorage(tenantId: string): Promise<string | null> {
    const key = landingStorageKey(tenantId, "index.html");
    const exists = await blobStore.exists(key);
    if (!exists) return null;

    try {
      const buffer = await blobStore.read(key);
      return buffer.toString("utf-8");
    } catch {
      return null;
    }
  }

  async findTenantBySlug(slug: string): Promise<TenantInfo | null> {
    return prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        landingEnabled: true,
      },
    });
  }

  async findTenantById(tenantId: string): Promise<TenantInfo | null> {
    return prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        landingEnabled: true,
      },
    });
  }

  async isLandingEnabledForTenant(tenantId: string): Promise<boolean> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { landingEnabled: true },
    });

    return tenant?.landingEnabled ?? false;
  }

  // Reusable Custom Modules
  async listCustomModules(
    tenantId: string,
  ): Promise<LandingCustomModuleView[]> {
    const rows = await prisma.landingCustomModule.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
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
        tenantId: command.tenantId,
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
      tenantId: row.tenantId,
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

  async deleteCustomModule(tenantId: string, moduleId: string): Promise<void> {
    const res = await prisma.landingCustomModule.deleteMany({
      where: { id: moduleId, tenantId },
    });
    if (res.count !== 1) {
      throw new NotFoundError("Módulo personalizado");
    }
  }

  // Landing Templates
  async listTemplates(tenantId: string): Promise<LandingTemplateView[]> {
    const rows = await prisma.landingTemplate.findMany({
      where: {
        OR: [
          { isSystem: true, status: "PUBLISHED" },
          { visibility: "PUBLIC", status: "PUBLISHED" },
          { tenantId },
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
        tenantId: input.tenantId,
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
        tenantId: input.tenantId,
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
    tenantId: string,
    templateId: string,
  ): Promise<void> {
    const result = await prisma.landingTemplate.deleteMany({
      where: {
        id: templateId,
        tenantId,
        isSystem: false,
        visibility: "PRIVATE",
      },
    });
    if (result.count !== 1) {
      throw new NotFoundError("Plantilla de landing");
    }
  }

  async exportPortableTemplate(
    tenantId: string,
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
          { tenantId },
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
    tenantId: string,
    portable: PortableLandingTemplate,
  ): Promise<LandingTemplateView> {
    const row = await prisma.landingTemplate.create({
      data: {
        id: randomUUID(),
        tenantId,
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
                    { tenant: { name: { contains: input.query } } },
                    { tenant: { slug: { contains: input.query } } },
                  ],
                },
              ]
            : []),
        ],
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    });

    const items: SuperadminLandingTemplateView[] = rows.map((row) => ({
      ...toTemplateView(row),
      owner: row.tenant
        ? {
            tenantId: row.tenant.id,
            name: row.tenant.name,
            slug: row.tenant.slug,
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
