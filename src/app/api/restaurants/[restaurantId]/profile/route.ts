import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { verifyCurrentPassword } from "@/modules/identity-access/server";
import { menuEditor, profileSchema, requireActiveMenuProjectForApi } from "@/modules/menu-editor/server";
import { BadRequestError } from "@/platform/application/errors";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";
type Context = { params: Promise<{ restaurantId: string }> };
export async function GET(_request: NextRequest, { params }: Context) {
 try {
  const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
  const project = await requireActiveMenuProjectForApi(restaurantId);
  return successResponse(await menuEditor.getProfile(restaurantId, project.id));
 } catch (error) { return handleApiError(error); }
}
export async function PATCH(request: NextRequest, { params }: Context) {
 try {
  if (!validateOrigin(request)) return csrfErrorResponse();
  const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
  const project = await requireActiveMenuProjectForApi(restaurantId);
  const current = await menuEditor.getProfile(restaurantId, project.id);
  const body = await request.json();
  const profile = profileSchema.parse(body);
  if (profile.slug !== current.slug || profile.landingSlug !== current.landingSlug) {
   if (typeof body.currentPassword !== "string" || !body.currentPassword.trim()) throw new BadRequestError("Confirmá tu contraseña para cambiar los enlaces públicos.");
   await verifyCurrentPassword({ currentPassword: body.currentPassword });
  }
  const saved = await menuEditor.updateProfile(restaurantId, project.id, profile);
  revalidatePath("/m/" + current.slug); revalidatePath("/m/" + saved.slug);
  revalidatePath("/l/" + current.landingSlug); revalidatePath("/l/" + saved.landingSlug);
  revalidatePath("/admin", "layout");
  return successResponse(saved);
 } catch (error) { return handleApiError(error); }
}
