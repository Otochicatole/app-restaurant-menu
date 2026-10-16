import { prisma } from "@/platform/database/prisma";
import { blobStore } from "@/platform/storage";
import type { LandingRepository, TenantInfo } from "../application/ports";
import type {
  LandingPageData,
  PublishLandingCommand,
  SaveLandingCommand,
} from "../contracts";

function landingStorageKey(tenantId: string, filename: string): string {
  return `tenants/${tenantId}/landing/${filename}`;
}

export class PrismaLandingRepository implements LandingRepository {
  async findByTenantId(tenantId: string): Promise<LandingPageData | null> {
    const record = await prisma.landingPage.findUnique({
      where: { tenantId },
    });

    if (!record) return null;

    return {
      id: record.id,
      tenantId: record.tenantId,
      htmlContent: record.htmlContent,
      cssContent: record.cssContent,
      jsContent: record.jsContent,
      published: record.published,
      publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async save(command: SaveLandingCommand): Promise<LandingPageData> {
    const record = await prisma.landingPage.upsert({
      where: { tenantId: command.tenantId },
      create: {
        tenantId: command.tenantId,
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        published: false,
      },
      update: {
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
      },
    });

    return {
      id: record.id,
      tenantId: record.tenantId,
      htmlContent: record.htmlContent,
      cssContent: record.cssContent,
      jsContent: record.jsContent,
      published: record.published,
      publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async publish(
    command: PublishLandingCommand,
    compiledHtml: string,
  ): Promise<LandingPageData> {
    const publishedAt = new Date();

    const record = await prisma.landingPage.upsert({
      where: { tenantId: command.tenantId },
      create: {
        tenantId: command.tenantId,
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        published: true,
        publishedAt,
      },
      update: {
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        published: true,
        publishedAt,
      },
    });

    // Write to /storage for this tenant: index.html, style.css, and script.js
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

    return {
      id: record.id,
      tenantId: record.tenantId,
      htmlContent: record.htmlContent,
      cssContent: record.cssContent,
      jsContent: record.jsContent,
      published: record.published,
      publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
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
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        landingEnabled: true,
      },
    });

    return tenant;
  }

  async findTenantById(tenantId: string): Promise<TenantInfo | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        landingEnabled: true,
      },
    });

    return tenant;
  }

  async isLandingEnabledForTenant(tenantId: string): Promise<boolean> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { landingEnabled: true },
    });

    return tenant?.landingEnabled ?? false;
  }
}
