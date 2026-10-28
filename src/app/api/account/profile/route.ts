import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTenantAdmin, updateAccountEmail, verifyCurrentPassword } from "@/modules/identity-access/server";
import { prisma } from "@/platform/database/prisma";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { revalidatePath } from "next/cache";

const profileSchema = z.object({ name: z.string().trim().min(1).max(100), email: z.string().trim().toLowerCase().email(), currentPassword: z.string().optional() });
export async function GET() {
  try {
    const actor = await requireTenantAdmin();
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { name: true } });
    return successResponse({ name: organization.name, email: actor.email });
  } catch (error) { return handleApiError(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const input = profileSchema.parse(await request.json());
    if (input.email !== actor.email) await verifyCurrentPassword({ currentPassword: input.currentPassword ?? "" });
    const email = await updateAccountEmail({ email: input.email });
    const organization = await prisma.organization.update({ where: { id: actor.organizationId }, data: { name: input.name }, select: { name: true } });
    revalidatePath("/admin", "layout"); revalidatePath("/superadmin/clientes");
    return successResponse({ name: organization.name, email });
  } catch (error) { return handleApiError(error); }
}
