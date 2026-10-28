import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";
import { AccountProfileForm, LogoutButton } from "@/modules/identity-access/ui";
import { prisma } from "@/platform/database/prisma";

export default async function AccountPage() {
  const actor = await requireAuthenticatedAccount();
  if (actor.kind === "super-admin") redirect("/superadmin");
  if (actor.mustChangePassword) redirect("/admin/account/password");
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId } });
  return <main data-admin-panel className="min-h-screen bg-[#f8faf7] px-5 py-10 text-zinc-900"><div className="mx-auto max-w-xl"><header className="flex items-center justify-between gap-4"><Link href="/admin/restaurantes" className="text-sm underline underline-offset-4">Volver a restaurantes</Link><LogoutButton compact /></header><h1 className="mt-8 text-3xl font-semibold tracking-tight">Mi cuenta</h1><p className="mt-3 text-sm leading-6 text-zinc-700">Estos datos corresponden a toda la organización y al acceso a sus restaurantes.</p><section className="mt-6 rounded-xl bg-white p-5"><AccountProfileForm initialName={organization.name} initialEmail={actor.email} /></section><Link href="/admin/account/password" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">Cambiar contraseña</Link></div></main>;
}
