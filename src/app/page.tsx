import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Layers3, MonitorSmartphone, Sparkles, Zap } from "lucide-react";
import styles from "./home.module.css";

export default function PlatformHomePage() {
  return (
    <main className={`${styles.page} min-h-[100svh] font-[family-name:var(--font-geist-sans)] text-white`}>
      <div className={styles.texture} aria-hidden="true" />
      <div className={styles.auroraPurple} aria-hidden="true" />
      <div className={styles.auroraGold} aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1540px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12 xl:px-16">
        <nav className="flex items-center justify-between gap-5" aria-label="Navegación principal">
          <Link href="/" className="group flex items-center gap-3.5" aria-label="Menús digitales, inicio">
            <span className={`${styles.brandMark} flex h-11 w-11 items-center justify-center rounded-2xl sm:h-12 sm:w-12`}>
              <Image src="/icon.svg" alt="" width={29} height={29} priority />
            </span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-[#cfb1fc]">Menús digitales</span>
              <span className="mt-1 block text-sm font-semibold text-white">Diseño & publicación</span>
            </span>
          </Link>

          <Link href="/admin/login" className={`${styles.navAccess} group inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold sm:px-5`}>
            <span className="hidden sm:inline">Acceso al estudio</span>
            <span className="sm:hidden">Ingresar</span>
            <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </nav>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(430px,1.05fr)] lg:gap-8 lg:py-8 xl:gap-16">
          <div className="relative z-20 max-w-[720px]">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#cfb1fc]/20 bg-[#cfb1fc]/[0.07] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.21em] text-[#d9c1f3] backdrop-blur-md sm:text-[11px]">
              <Sparkles size={14} strokeWidth={1.8} /> Tu carta también es parte de la experiencia
            </div>

            <h1 className="mt-7 max-w-[700px] text-[clamp(3.6rem,7.4vw,8.2rem)] font-medium leading-[0.84] tracking-[-0.07em]">
              Diseñá para<br />
              <span className={styles.heroAccent}>abrir el apetito.</span>
            </h1>

            <p className="mt-8 max-w-xl text-base leading-7 text-white/62 sm:text-lg sm:leading-8">
              Creá menús digitales con libertad visual, publicalos al instante y convertí cada visita en una experiencia memorable.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/admin/login" className={`${styles.primaryAction} group inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-bold text-[#172019]`}>
                Ingresar al panel
                <ArrowUpRight size={17} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[11px] font-medium text-white/48">
              <span className="flex items-center gap-2"><i className={styles.statusDot} />Sin instalaciones</span>
              <span className="flex items-center gap-2"><i className={styles.statusDot} />Responsive</span>
              <span className="flex items-center gap-2"><i className={styles.statusDot} />Siempre actualizado</span>
            </div>
          </div>

          <MenuShowcase />
        </section>

        <section id="experiencia" className={`${styles.featureRail} grid gap-px overflow-hidden rounded-[1.6rem] sm:grid-cols-3`}>
          <Feature icon={<Layers3 size={18} />} index="01" title="Diseñá sin límites" copy="Capas, tipografías, multimedia y estilos en un lienzo completamente libre." />
          <Feature icon={<Zap size={18} />} index="02" title="Publicá al instante" copy="Cada cambio puede llegar a tu carta pública en cuestión de segundos." />
          <Feature icon={<MonitorSmartphone size={18} />} index="03" title="Perfecto en cada pantalla" copy="Tu diseño conserva su intención en teléfonos, tablets y escritorio." />
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, index, title, copy }: { icon: React.ReactNode; index: string; title: string; copy: string }) {
  return (
    <article className={`${styles.feature} group relative flex gap-4 p-5 sm:p-6`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#cfb1fc] transition duration-300 group-hover:border-[#cfb1fc]/30 group-hover:bg-[#cfb1fc]/10">{icon}</span>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold tracking-[0.18em] text-[#ead8b8]/55">{index}</span>
          <span className="h-px w-5 bg-white/10" />
        </div>
        <h2 className="mt-1.5 text-sm font-semibold text-white">{title}</h2>
        <p className="mt-1.5 max-w-sm text-xs leading-5 text-white/45">{copy}</p>
      </div>
    </article>
  );
}

function MenuShowcase() {
  return (
    <div className={styles.showcase} aria-hidden="true">
      <div className={styles.showcaseOrbit}><span /><span /><span /></div>
      <div className={styles.menuCanvas}>
        <div className={styles.canvasTopbar}>
          <span><i /><i /><i /></span>
          <b>carta · en vivo</b>
          <em>100%</em>
        </div>
        <div className={styles.canvasBody}>
          <div className={styles.menuHeader}>
            <div><small>RESTAURANTE</small><strong>SAVIA</strong></div>
            <span>MENÚ<br />/ 26</span>
          </div>
          <div className={styles.menuArtwork}>
            <div className={styles.artSun} />
            <div className={styles.artPlate}><Image src="/icon.svg" alt="" width={46} height={46} /></div>
            <p>Sabores honestos.<br /><i>Diseño inolvidable.</i></p>
          </div>
          <div className={styles.menuRows}>
            <div><span><b>01</b> Entrada de estación</span><strong>$ 00</strong></div>
            <div><span><b>02</b> Plato de la casa</span><strong>$ 00</strong></div>
            <div><span><b>03</b> Final dulce</span><strong>$ 00</strong></div>
          </div>
        </div>
      </div>

      <div className={`${styles.toolCard} ${styles.layersCard}`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#cfb1fc]/15 text-[#d7baf3]"><Layers3 size={15} /></span>
        <span><b>Capas organizadas</b><small>Todo en su lugar</small></span>
        <i className={styles.toolStatus} />
      </div>
      <div className={`${styles.toolCard} ${styles.publishCard}`}>
        <i className={styles.publishedPulse} />
        <span><b>Publicado</b><small>Tu carta ya está en línea</small></span>
      </div>
      <div className={styles.cursorMark}><span>✦</span></div>
    </div>
  );
}
