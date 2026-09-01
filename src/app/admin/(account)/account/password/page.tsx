import { ChangePasswordForm } from "@/modules/identity-access/ui";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";

export default async function ChangePasswordPage() {
  const actor = await requireAuthenticatedAccount();
  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-950 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Seguridad</p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-950">Cambiá tu contraseña</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Usá al menos 12 caracteres. Este paso es obligatorio antes de administrar el menú.
        </p>
        <ChangePasswordForm successPath={actor.kind === "super-admin" ? "/superadmin" : "/admin"} />
      </div>
    </main>
  );
}
