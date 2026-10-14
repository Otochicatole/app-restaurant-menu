"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import styles from "./home.module.css";

export default function PlatformHomePage() {
  return (
    <div className={styles.page}>
      <div className={styles.backdropGlow} aria-hidden="true" />

      <div className="mx-auto flex min-h-[100svh] w-full max-w-[1440px] flex-col px-6 py-6 sm:px-10 lg:px-14">
        {/* Navigation */}
        <header className="flex items-center justify-between gap-6" aria-label="Navegación principal">
          <Link href="/" className="group flex items-center gap-3.5" aria-label="Menús digitales, inicio">
            <span className={styles.brandMark}>
              <Image src="/icon.svg" alt="" width={24} height={24} priority />
            </span>
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-[#b8c9b2]">
                Menús Digitales
              </span>
              <span className="text-sm font-semibold text-[#f5f2eb]">
                Estudio Gastronómico
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/admin/login" className={styles.navAction}>
              Acceso al estudio
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 xl:gap-20">
          <div className="max-w-[700px]">
            <h1 className={styles.heroHeading}>
              Tu carta digital, con presencia de autor.
            </h1>

            <p className={styles.heroLead}>
              Diseñá con absoluta libertad visual en un lienzo interactivo, actualizá precios y platos en el instante, y ofrecé a tus comensales una experiencia inolvidable desde su propio móvil.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/admin/login" className={styles.primaryButton}>
                Ingresar al panel
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <a href="#caracteristicas" className={styles.secondaryButton}>
                Conocer la plataforma
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-[#a0ad9d]">
              <span className="flex items-center gap-2">
                <Check size={14} className="text-[#a8d59d]" /> Canvas visual sin cuadrículas rígidas
              </span>
              <span className="flex items-center gap-2">
                <Check size={14} className="text-[#a8d59d]" /> Código QR vectorial de alta definición
              </span>
              <span className="flex items-center gap-2">
                <Check size={14} className="text-[#a8d59d]" /> Actualización en vivo sin reimpresiones
              </span>
            </div>
          </div>

          {/* Interactive Menu Showcase */}
          <div className={styles.showcaseContainer}>
            <InteractiveMenuPreview />
          </div>
        </section>

        {/* Claims / Features Section */}
        <section id="caracteristicas" className={styles.featureSection}>
          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <h2 className={styles.featureTitle}>Composición libre sobre Canvas</h2>
              <p className={styles.featureText}>
                Ubicá fotografías de producto, tipografías editoriales, bloques de texto y detalles estacionales exactamente donde los imaginaste, sin depender de plantillas cerradas.
              </p>
            </article>

            <article className={styles.featureCard}>
              <h2 className={styles.featureTitle}>Código QR e identidad propia</h2>
              <p className={styles.featureText}>
                Cada restaurante cuenta con su enlace público en <code>/m/[slug]</code> y descarga directa de su QR optimizado para imprenta, posavasos o cartelería de mesa.
              </p>
            </article>

            <article className={styles.featureCard}>
              <h2 className={styles.featureTitle}>Multi-carta y temporadas</h2>
              <p className={styles.featureText}>
                Gestioná menús de mediodía, cartas nocturnas y especiales de temporada desde un único acceso. Publicá en segundos ante cualquier cambio de cocina.
              </p>
            </article>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p>Menús digitales · Plataforma gastronómica de diseño y publicación independiente.</p>
            <p className="text-xs">Estudio de carta en vivo</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function InteractiveMenuPreview() {
  const [activeTab, setActiveTab] = useState<"menu" | "wines">("menu");

  return (
    <div className={styles.menuBoard}>
      {/* Top bar with interactive tab switch */}
      <div className="flex items-center justify-between border-b border-zinc-200/70 bg-[#ece7dc] px-5 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("menu")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              activeTab === "menu"
                ? "bg-[#1f2d1e] text-[#f7f4ee]"
                : "text-[#556353] hover:text-[#1f2d1e]"
            }`}
          >
            Carta Estacional
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wines")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              activeTab === "wines"
                ? "bg-[#1f2d1e] text-[#f7f4ee]"
                : "text-[#556353] hover:text-[#1f2d1e]"
            }`}
          >
            Vinos & Cócteles
          </button>
        </div>

        <span className={styles.menuBadgeLive}>
          <span className={styles.menuLiveDot} />
          En vivo
        </span>
      </div>

      <div className={styles.menuBoardHeader}>
        <div>
          <h2 className={styles.restaurantName}>SAVIA</h2>
          <p className={styles.restaurantSubtitle}>Cocina de Origen & Estación</p>
        </div>
        <span className={styles.menuTypeTag}>
          {activeTab === "menu" ? "Otoño 2026" : "Cava & Barra"}
        </span>
      </div>

      <div className={styles.menuBoardBody}>
        {activeTab === "menu" ? (
          <>
            <p className={styles.sectionHeading}>Entradas y Frescos</p>
            <div className={styles.dishItem}>
              <div className={styles.dishMain}>
                <span className={styles.dishTitle}>Tartar de trucha patagónica</span>
                <span className={styles.dishPrice}>$ 14.800</span>
              </div>
              <p className={styles.dishDescription}>
                Emulsión de eneldo silvestre, pickles de mostaza y crocante de algas nori.
              </p>
            </div>

            <div className={styles.dishItem}>
              <div className={styles.dishMain}>
                <span className={styles.dishTitle}>Burrata tibia ahumada</span>
                <span className={styles.dishPrice}>$ 12.500</span>
              </div>
              <p className={styles.dishDescription}>
                Higos asados a la leña, reducción de aceto balsámico añejo y masa madre.
              </p>
            </div>

            <p className={`${styles.sectionHeading} mt-6`}>Fuegos y Principales</p>
            <div className={styles.dishItem}>
              <div className={styles.dishMain}>
                <span className={styles.dishTitle}>Ojo de bife madurado (40 días)</span>
                <span className={styles.dishPrice}>$ 28.500</span>
              </div>
              <p className={styles.dishDescription}>
                Milhojas de papa trufada, chalotas glaseadas y jugo concentrado de asado.
              </p>
            </div>

            <div className={styles.dishItem}>
              <div className={styles.dishMain}>
                <span className={styles.dishTitle}>Pesca del día a la chapa</span>
                <span className={styles.dishPrice}>$ 22.000</span>
              </div>
              <p className={styles.dishDescription}>
                Puré sedoso de coliflor tostada, alcaparras fritas y manteca de salvia.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className={styles.sectionHeading}>Vinos por Copa</p>
            <div className={styles.dishItem}>
              <div className={styles.dishMain}>
                <span className={styles.dishTitle}>Malbec de Paraje Altamira</span>
                <span className={styles.dishPrice}>$ 8.200</span>
              </div>
              <p className={styles.dishDescription}>
                Cosecha 2023 · Fruta negra madura, violetas y mineralidad caliza.
              </p>
            </div>

            <div className={styles.dishItem}>
              <div className={styles.dishMain}>
                <span className={styles.dishTitle}>Chardonnay del Valle de Uco</span>
                <span className={styles.dishPrice}>$ 7.600</span>
              </div>
              <p className={styles.dishDescription}>
                Crianza en barrica francesa, notas a manteca, pera blanca y acidez vibrante.
              </p>
            </div>

            <p className={`${styles.sectionHeading} mt-6`}>Coctelería de Autor</p>
            <div className={styles.dishItem}>
              <div className={styles.dishMain}>
                <span className={styles.dishTitle}>Negroni de la Huerta</span>
                <span className={styles.dishPrice}>$ 9.500</span>
              </div>
              <p className={styles.dishDescription}>
                Gin macerado con romero fresco, Campari, vermut rosso y perfume cítrico.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
