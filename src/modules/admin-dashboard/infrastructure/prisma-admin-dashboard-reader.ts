import { NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import type { AdminDashboardView } from "../contracts";
import type { AdminDashboardReader } from "../application/ports";

export class PrismaAdminDashboardReader implements AdminDashboardReader {
  async get(tenantId: string): Promise<AdminDashboardView> {
    const [productCount, groupCount, highlightedCount, header, tenant] = await Promise.all([
      prisma.product.count({ where: { tenantId } }),
      prisma.group.count({ where: { tenantId } }),
      prisma.featuredProduct.count({ where: { tenantId } }),
      prisma.homePage.findUnique({ where: { tenantId } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);
    if (!tenant) throw new NotFoundError("Tenant");
    return {
      productCount,
      groupCount,
      highlightedCount,
      header: {
        title: header?.title ?? tenant.name,
        description: header?.description ?? "Menú digital",
      },
    };
  }
}
