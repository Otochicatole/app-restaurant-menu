import { NextRequest } from "next/server";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";
import { BadRequestError, ForbiddenError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";

export async function resolveEditorAssetTenantId(
  request: NextRequest,
  formTenantId?: string | null,
  formTenantSlug?: string | null,
): Promise<string> {
  const actor = await requireAuthenticatedAccount();
  if (actor.kind === "tenant-admin") {
    if (actor.mustChangePassword) {
      throw new ForbiddenError("Debés cambiar tu contraseña antes de continuar");
    }
    return actor.tenantId;
  }
  if (actor.kind === "super-admin") {
    const searchParams = new URL(request.url).searchParams;
    const requestedTenantId = formTenantId || searchParams.get("tenantId");
    if (requestedTenantId) {
      return requestedTenantId;
    }
    const requestedSlug = formTenantSlug || searchParams.get("tenantSlug");
    if (requestedSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: requestedSlug },
        select: { id: true },
      });
      if (tenant) return tenant.id;
    }
    throw new BadRequestError("Se requiere tenantId o tenantSlug para Super Admin");
  }
  throw new ForbiddenError("No tenés permisos para esta acción");
}
