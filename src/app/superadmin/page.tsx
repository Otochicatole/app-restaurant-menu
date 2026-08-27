import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { tenantAccountSchema } from "@/features/tenants/backend/schemas/tenant.schema";
import { requireAuthenticatedAccount, requireSuperAdmin } from "@/features/auth/backend/services/auth.service";
import { createTenant, deleteTenant as removeTenant, generateTemporaryPassword, listTenants, resetTenantPassword, setTenantStatus, updateTenant } from "@/features/tenants/backend/services/tenant.service";
import { TenantManager } from "./TenantManager";
import { LogoutButton } from "@/shared/frontend/components/LogoutButton";
import { redirect } from "next/navigation";

export default async function SuperAdminPage() {
  const account = await requireAuthenticatedAccount();
  if (account.role !== "SUPER_ADMIN") redirect("/admin");
  const rows = (await listTenants()).map((tenant) => ({ id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status, createdAt: tenant.createdAt.toISOString(), email: tenant.admin?.email ?? "", lastLoginAt: tenant.admin?.lastLoginAt?.toISOString() ?? null }));

  async function createAccount(formData: FormData) {
    "use server";
    try {
      await requireSuperAdmin();
      const input = tenantAccountSchema.parse({ name: formData.get("name"), email: formData.get("email"), slug: formData.get("slug") });
      const temporaryPassword = generateTemporaryPassword();
      await createTenant({ ...input, passwordHash: await bcrypt.hash(temporaryPassword, 12) });
      revalidatePath("/superadmin");
      return { success: true, temporaryPassword };
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo crear la cuenta" }; }
  }
  async function editAccount(formData: FormData) { "use server"; try { await requireSuperAdmin(); const id = String(formData.get("id")); const name = z.string().trim().min(1).max(100).parse(formData.get("name")); const email = z.string().email().parse(formData.get("email")); await updateTenant(id, { name, email }); revalidatePath("/superadmin"); return { success: true }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo actualizar la cuenta" }; } }
  async function toggleAccount(formData: FormData) { "use server"; try { await requireSuperAdmin(); const id = String(formData.get("id")); const status = z.enum(["ACTIVE", "SUSPENDED"]).parse(formData.get("status")); await setTenantStatus(id, status); revalidatePath("/superadmin"); return { success: true }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo cambiar el estado" }; } }
  async function resetAccount(formData: FormData) { "use server"; try { await requireSuperAdmin(); const temporaryPassword = await resetTenantPassword(String(formData.get("id"))); revalidatePath("/superadmin"); return { success: true, temporaryPassword }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo resetear la contraseña" }; } }
  async function deleteAccount(formData: FormData) { "use server"; try { await requireSuperAdmin(); await removeTenant(String(formData.get("id")), String(formData.get("slug"))); revalidatePath("/superadmin"); return { success: true }; } catch (error) { return { success: false, error: error instanceof Error ? error.message : "No se pudo borrar el tenant" }; } }

  return <div data-admin-panel className="min-h-screen bg-[#f5f7f3] text-zinc-900"><header className="border-b border-zinc-200 bg-emerald-950 text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Plataforma</p><h1 className="mt-1 text-xl font-semibold">Administración general</h1></div><LogoutButton /></div></header><main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10"><div className="mb-8"><p className="text-sm text-zinc-500">Creá y administrá las cuentas que consumen tu aplicación.</p></div><TenantManager tenants={rows} createTenant={createAccount} updateTenant={editAccount} toggleTenant={toggleAccount} resetPassword={resetAccount} deleteTenant={deleteAccount} /></main></div>;
}
