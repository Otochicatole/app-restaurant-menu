import type { Metadata } from "next";
import Image from "next/image";
import { ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "@/modules/identity-access/ui";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Ingresar",
  description: "Accedé al editor de tu menú digital.",
};

export default function AdminLoginPage() {
  return (
    <main className={`${styles.page} min-h-[100svh] font-[family-name:var(--font-geist-sans)]`}>
      <div className={styles.texture} aria-hidden="true" />
      <div className={styles.auroraOne} aria-hidden="true" />
      <div className={styles.auroraTwo} aria-hidden="true" />

      <div className="relative z-10 grid min-h-[100svh] lg:grid-cols-[minmax(0,1.12fr)_minmax(430px,0.88fr)]">
        <section className="relative hidden min-h-[100svh] overflow-hidden px-10 py-9 text-white lg:flex lg:flex-col xl:px-16 xl:py-12">
          <header className="relative z-20 flex items-center justify-between gap-6">
            <Brand />
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ead8b8] backdrop-blur-md">
              Estudio gastronómico
            </span>
          </header>

          <div className="relative z-20 my-auto max-w-[620px] py-20">
            <div className="mb-7 flex items-center gap-3 text-[#cfb1fc]">
              <span className={styles.sparkleBadge}><Sparkles size={15} strokeWidth={1.8} /></span>
              <span className="text-xs font-semibold uppercase tracking-[0.26em]">Diseño que abre el apetito</span>
            </div>
            <p className="max-w-[590px] text-[clamp(3.5rem,5.7vw,6.8rem)] font-medium leading-[0.88] tracking-[-0.065em]">
              Tu carta,<br />
              <span className={styles.heroAccent}>en escena.</span>
            </p>
            <p className="mt-8 max-w-lg text-base leading-7 text-white/62 xl:text-lg xl:leading-8">
              Construí una experiencia visual que empiece antes del primer plato y actualizala en el momento.
            </p>
            <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-xs font-medium text-white/68">
              <span className="flex items-center gap-2"><i className={styles.featureDot} />Diseño libre</span>
              <span className="flex items-center gap-2"><i className={styles.featureDot} />Publicación instantánea</span>
              <span className="flex items-center gap-2"><i className={styles.featureDot} />Siempre editable</span>
            </div>
          </div>

          <div className="relative z-20 flex items-center gap-3 text-xs text-white/45">
            <span className="h-px w-10 bg-white/20" />
            Tu menú, servido con intención.
          </div>

          <CulinaryOrbit />
        </section>

        <section className={`${styles.panel} relative m-2 flex min-h-[calc(100svh-1rem)] flex-col justify-between overflow-hidden rounded-[2rem] px-6 py-7 sm:m-3 sm:min-h-[calc(100svh-1.5rem)] sm:px-10 sm:py-10 lg:ml-0 xl:px-16`}>
          <div className={styles.panelGlow} aria-hidden="true" />
          <div className="relative z-10 lg:hidden">
            <Brand dark />
          </div>

          <div className="relative z-10 mx-auto my-12 w-full max-w-[440px] sm:my-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#3a4824]/10 bg-white/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#3a4824] shadow-sm backdrop-blur">
              <span className={styles.liveDot} /> Acceso al estudio
            </div>
            <h1 className="mt-7 text-[clamp(2.35rem,5vw,3.8rem)] font-medium leading-[0.95] tracking-[-0.055em] text-[#172019]">
              Bienvenido<br />de nuevo.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#596259] sm:text-[15px]">
              Ingresá para diseñar, publicar y mantener tu carta siempre al día.
            </p>

            <div className="mt-9 sm:mt-10">
              <LoginForm />
            </div>

            <div className="mt-7 flex items-center gap-3 border-t border-[#24351f]/10 pt-5 text-xs leading-5 text-[#687068]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#3a4824]/10 bg-white/60 text-[#3a4824]">
                <ShieldCheck size={16} strokeWidth={1.8} />
              </span>
              Acceso privado y protegido para administrar tu espacio.
            </div>
          </div>

          <p className="relative z-10 text-center text-[10px] font-semibold uppercase tracking-[0.19em] text-[#7d847c] lg:text-left">
            Menús digitales · Panel de gestión
          </p>
        </section>
      </div>
    </main>
  );
}

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className={`${styles.brandMark} flex h-12 w-12 items-center justify-center rounded-2xl`}>
        <Image src="/icon.svg" alt="" width={30} height={30} priority />
      </span>
      <span>
        <span className={`block text-[10px] font-bold uppercase tracking-[0.25em] ${dark ? "text-[#7a5aa4]" : "text-[#cfb1fc]"}`}>Menús digitales</span>
        <span className={`mt-1 block text-sm font-semibold ${dark ? "text-[#263126]" : "text-white"}`}>Editor de carta</span>
      </span>
    </div>
  );
}

function CulinaryOrbit() {
  return (
    <div className={styles.orbitScene} aria-hidden="true">
      <div className={styles.orbitOuter}><span /><span /></div>
      <div className={styles.orbitInner}><span /><span /></div>
      <div className={styles.orbitCore}>
        <div className={styles.coreHalo} />
        <div className={styles.coreMark}><Image src="/icon.svg" alt="" width={62} height={62} /></div>
      </div>
      <div className={`${styles.floatingCard} ${styles.cardOne}`}>
        <span className={styles.cardIndex}>01</span>
        <span><b>Entradas</b><small>Una apertura inolvidable</small></span>
        <i />
      </div>
      <div className={`${styles.floatingCard} ${styles.cardTwo}`}>
        <span className={styles.cardIndex}>02</span>
        <span><b>Especialidad</b><small>La firma de la casa</small></span>
        <i />
      </div>
      <div className={styles.sparkleA}>✦</div>
      <div className={styles.sparkleB}>✦</div>
    </div>
  );
}
