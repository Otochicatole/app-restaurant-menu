import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/modules/identity-access/ui";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Ingresar",
  description: "Accedé al editor de tu menú digital.",
};

export default function AdminLoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.backdropGlow} aria-hidden="true" />

      <div className="relative z-10 grid min-h-[100svh] lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left Side: Brand & Atmosphere */}
        <section className="hidden min-h-[100svh] flex-col justify-between p-12 text-[#f5f2eb] lg:flex xl:p-16">
          <header>
            <Brand />
          </header>

          <div className="my-auto max-w-xl py-12">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#f5f2eb] sm:text-5xl">
              Tu carta, con intención en cada detalle.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-[#c3cebf] sm:text-lg">
              Diseñá un menú interactivo que hable de tu cocina antes del primer bocado. Mantené precios, platos de temporada y maridajes siempre actualizados.
            </p>

            <div className={styles.editorialCard}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b8c9b2]">
                Estudio de diseño gastronómico
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-[#e2ded4]">
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-[#a8d59d]" />
                  <span>Publicación instantánea en tu enlace público <code>/m/[slug]</code></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-[#a8d59d]" />
                  <span>Código QR vectorial listo para imprimir en mesa</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={16} className="text-[#a8d59d]" />
                  <span>Aislamiento seguro de datos y recursos por restaurante</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#8c9c89]">
            <p>Plataforma para gastronomía independiente</p>
            <Link href="/" className="underline hover:text-[#f5f2eb]">
              Volver al inicio
            </Link>
          </div>
        </section>

        {/* Right Side: Login Card */}
        <section className="flex min-h-[100svh] items-center justify-center p-4 sm:p-8 lg:p-10 xl:p-14">
          <div className={`${styles.panel} w-full max-w-[460px] p-8 sm:p-10`}>
            <div className="mb-6 lg:hidden">
              <Brand dark />
            </div>

            <div className="mb-6">
              <span className={styles.statusIndicator}>
                <span className={styles.statusDot} />
                Acceso al estudio
              </span>
            </div>

            <h2 className={styles.panelTitle}>
              Iniciar sesión
            </h2>
            <p className={styles.panelSubtitle}>
              Ingresá tus credenciales para administrar tus cartas y contenidos.
            </p>

            <div className="mt-8">
              <LoginForm />
            </div>

            <div className="mt-8 flex items-center gap-3 border-t border-zinc-200/80 pt-5 text-xs text-zinc-500">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8efe6] text-[#2e4729]">
                <ShieldCheck size={16} />
              </span>
              <span>Acceso protegido y cifrado para la gestión de tu restaurante.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3.5" aria-label="Menús digitales, inicio">
      <span className={dark ? styles.brandMarkDark : styles.brandMark}>
        <Image src="/icon.svg" alt="" width={24} height={24} priority />
      </span>
      <span>
        <span className={`block text-[10px] font-bold uppercase tracking-[0.22em] ${dark ? "text-[#556b50]" : "text-[#b8c9b2]"}`}>
          Menús digitales
        </span>
        <span className={`text-sm font-semibold ${dark ? "text-[#121913]" : "text-[#f5f2eb]"}`}>
          Estudio de carta
        </span>
      </span>
    </Link>
  );
}
