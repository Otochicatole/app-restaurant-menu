import type { Metadata } from "next";
import Image from "next/image";
import { AccountPasswordNav, ChangePasswordForm } from "@/modules/identity-access/ui";
import { requireAuthenticatedAccount, type CurrentActor } from "@/modules/identity-access/server";

export const metadata: Metadata = {
  title: "Cambiar contraseña",
  description: "Actualizá la contraseña de acceso a tu cuenta.",
};

function resolveBack(actor: CurrentActor) {
  if (actor.mustChangePassword) {
    return { exitToLogin: true as const };
  }
  if (actor.kind === "super-admin") {
    return { href: "/superadmin" as const };
  }
  return { href: "/admin/settings" as const };
}

export default async function ChangePasswordPage() {
  const actor = await requireAuthenticatedAccount();
  const back = resolveBack(actor);
  const successPath = actor.kind === "super-admin" ? "/superadmin" : "/admin";

  return (
    <main className="grid min-h-svh grid-rows-[auto_1fr_auto] bg-white font-[family-name:var(--font-geist-sans)]">
      <header className="border-b border-zinc-100/80 px-5 py-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <AccountPasswordNav {...back} />
          <div className="flex items-center gap-2.5 text-zinc-900">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-white">
              <Image src="/icon.svg" alt="" width={22} height={22} priority />
            </span>
            <span className="hidden text-sm font-medium sm:inline">Menús digitales</span>
          </div>
        </div>
      </header>

      <div className="flex items-center px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-12 lg:grid-cols-[1fr_24rem] lg:items-center lg:gap-14 xl:grid-cols-[1.15fr_26rem] xl:gap-20">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Seguridad</p>
            <h1 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-tight tracking-[-0.035em] text-zinc-950">
              Cambiá tu contraseña
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-zinc-500">
              {actor.mustChangePassword
                ? "Este paso es obligatorio antes de administrar el menú. Elegí una clave de al menos 12 caracteres."
                : "Elegí una clave de al menos 12 caracteres para mantener tu cuenta protegida."}
            </p>
            <ul className="mt-8 space-y-2.5 border-l border-zinc-200 pl-4 text-sm leading-6 text-zinc-500">
              <li>Mínimo 12 caracteres en la nueva contraseña.</li>
              <li>Al guardar, cerramos las demás sesiones activas.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-[0_20px_50px_-36px_rgba(0,0,0,0.35)] sm:p-7">
            <p className="text-sm font-medium text-zinc-900">Nueva clave de acceso</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Completá los tres campos para confirmar el cambio.</p>
            <ChangePasswordForm successPath={successPath} className="mt-6" />
          </section>
        </div>
      </div>

      <footer className="border-t border-zinc-100/80 px-5 py-4 sm:px-8">
        <p className="mx-auto w-full max-w-5xl text-center text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 sm:text-left">
          Acceso protegido · Panel de gestión
        </p>
      </footer>
    </main>
  );
}
