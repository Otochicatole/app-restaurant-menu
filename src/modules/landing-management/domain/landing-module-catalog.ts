import type {
  LandingBlock,
  LandingCustomModuleView,
  LandingModuleField,
} from "../contracts";

export type BuiltinLandingModuleDefinition = {
  moduleKey: string;
  name: string;
  description: string;
  category: "estructura" | "contenido" | "tarjetas" | "contacto" | "codigo";
  fields: LandingModuleField[];
  htmlTemplate: string;
  cssTemplate: string;
  jsTemplate: string;
};

export const BUILTIN_LANDING_MODULES: BuiltinLandingModuleDefinition[] = [
  {
    moduleKey: "blank-container",
    name: "Contenedor / Sección Libre",
    description: "Sección vacía con contenedor central responsive lista para arrastrar y soltar componentes.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Sección / Contenedor Libre -->
<section class="section" style="padding: 48px 0;">
  <div class="container" style="max-width: 1100px; margin: 0 auto; padding: 0 20px;">
    <div class="content-container" style="padding: 32px; border: 2px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 14px); min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; box-sizing: border-box;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500;">Contenedor Libre — Arrastrá componentes o hacé clic para insertar</p>
    </div>
  </div>
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "columns-container",
    name: "Sección 2 Columnas",
    description: "Sección con grilla responsive de 2 columnas para armar layouts divididos.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Sección 2 Columnas -->
<section class="section" style="padding: 48px 0;">
  <div class="container" style="max-width: 1100px; margin: 0 auto; padding: 0 20px;">
    <div class="grid-columns-2" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; width: 100%; box-sizing: border-box;">
      <div class="grid-column" style="padding: 24px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 100px; box-sizing: border-box;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 1 — Arrastrá componentes aquí</p>
      </div>
      <div class="grid-column" style="padding: 24px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 100px; box-sizing: border-box;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 2 — Arrastrá componentes aquí</p>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "columns-3-container",
    name: "Sección 3 Columnas (CSS Grid)",
    description: "Sección con grilla responsive de 3 columnas para tarjetas, servicios o menú.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Sección 3 Columnas -->
<section class="section" style="padding: 48px 0;">
  <div class="container" style="max-width: 1100px; margin: 0 auto; padding: 0 20px;">
    <div class="grid-columns-3" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; width: 100%; box-sizing: border-box;">
      <div class="grid-column" style="padding: 20px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 90px; box-sizing: border-box;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 1</p>
      </div>
      <div class="grid-column" style="padding: 20px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 90px; box-sizing: border-box;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 2</p>
      </div>
      <div class="grid-column" style="padding: 20px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 90px; box-sizing: border-box;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 3</p>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "columns-4-container",
    name: "Sección 4 Columnas (CSS Grid)",
    description: "Sección con grilla responsive de 4 columnas para métricas, fotos o productos.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Sección 4 Columnas -->
<section class="section" style="padding: 48px 0;">
  <div class="container" style="max-width: 1100px; margin: 0 auto; padding: 0 20px;">
    <div class="grid-columns-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; width: 100%; box-sizing: border-box;">
      <div class="grid-column" style="padding: 16px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 1</p>
      </div>
      <div class="grid-column" style="padding: 16px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 2</p>
      </div>
      <div class="grid-column" style="padding: 16px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 3</p>
      </div>
      <div class="grid-column" style="padding: 16px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 4</p>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "flex-row-container",
    name: "Fila Flexible (Flex Row)",
    description: "Contenedor horizontal flexible con display: flex y dirección row, con salto de línea y gap.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Fila Flexible -->
<section class="section" style="padding: 48px 0;">
  <div class="container" style="max-width: 1100px; margin: 0 auto; padding: 0 20px;">
    <div class="flex-row" style="display: flex; flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; width: 100%; box-sizing: border-box; padding: 24px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 14px);">
      <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500;">Fila Flex — Insertá elementos para alinearlos horizontalmente</p>
    </div>
  </div>
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "flex-col-container",
    name: "Columna Flexible (Flex Column)",
    description: "Contenedor vertical flexible con display: flex y dirección column para apilar elementos.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Columna Flexible -->
<section class="section" style="padding: 48px 0;">
  <div class="container" style="max-width: 1100px; margin: 0 auto; padding: 0 20px;">
    <div class="flex-col" style="display: flex; flex-direction: column; align-items: stretch; gap: 16px; width: 100%; box-sizing: border-box; padding: 24px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 14px);">
      <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500;">Columna Flex — Insertá elementos para apilarlos verticalmente</p>
    </div>
  </div>
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "header",
    name: "Barra de Navegación",
    description: "Encabezado fijo con nombre del restaurante, enlaces de ancla y botón directo a la carta digital.",
    category: "estructura",
    fields: [
      { key: "brandIcon", label: "Ícono / Emoji de marca", type: "text", defaultValue: "🍽️" },
      { key: "brandTitle", label: "Nombre visible", type: "text", defaultValue: "{{restaurantName}}" },
      { key: "link1Text", label: "Texto enlace 1", type: "text", defaultValue: "Inicio" },
      { key: "link1Href", label: "Destino enlace 1", type: "url", defaultValue: "#inicio" },
      { key: "link2Text", label: "Texto enlace 2", type: "text", defaultValue: "Especialidades" },
      { key: "link2Href", label: "Destino enlace 2", type: "url", defaultValue: "#destacados" },
      { key: "link3Text", label: "Texto enlace 3", type: "text", defaultValue: "Experiencia" },
      { key: "link3Href", label: "Destino enlace 3", type: "url", defaultValue: "#experiencia" },
      { key: "link4Text", label: "Texto enlace 4", type: "text", defaultValue: "Ubicación" },
      { key: "link4Href", label: "Destino enlace 4", type: "url", defaultValue: "#contacto" },
      { key: "ctaText", label: "Texto botón principal", type: "text", defaultValue: "Ver Carta Digital" },
      { key: "ctaUrl", label: "URL botón principal", type: "url", defaultValue: "{{menuUrl}}" },
    ],
    htmlTemplate: `<!-- Header / Navegación -->
<header class="site-header">
  <div class="container nav-container">
    <a href="#" class="brand-logo">
      <span class="brand-icon">{{brandIcon}}</span>
      <span class="brand-name">{{brandTitle}}</span>
    </a>

    <nav class="nav-menu" id="navMenu">
      <a href="{{link1Href}}" class="nav-link">{{link1Text}}</a>
      <a href="{{link2Href}}" class="nav-link">{{link2Text}}</a>
      <a href="{{link3Href}}" class="nav-link">{{link3Text}}</a>
      <a href="{{link4Href}}" class="nav-link">{{link4Text}}</a>
      <a href="{{ctaUrl}}" target="_top" class="btn btn-primary nav-cta">{{ctaText}}</a>
    </nav>

    <button class="nav-toggle" id="navToggle" aria-label="Abrir menú">
      <span></span>
      <span></span>
      <span></span>
    </button>
  </div>
</header>`,
    cssTemplate: `.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  padding: 14px 0;
}
.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  font-family: var(--font-serif);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary);
}
.brand-icon { font-size: 1.5rem; }
.nav-menu {
  display: flex;
  align-items: center;
  gap: 24px;
}
.nav-link {
  color: var(--color-text-main);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: var(--transition);
}
.nav-link:hover { color: var(--color-accent); }
.nav-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
}
.nav-toggle span {
  display: block;
  width: 24px;
  height: 2px;
  background-color: var(--color-primary);
  transition: var(--transition);
}
@media (max-width: 868px) {
  .nav-menu {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    flex-direction: column;
    padding: 24px;
    gap: 18px;
    display: none;
    box-shadow: var(--shadow-soft);
  }
  .nav-menu.open { display: flex; }
  .nav-toggle { display: flex; }
}`,
    jsTemplate: `const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
  });
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
    });
  });
}`,
  },
  {
    moduleKey: "hero",
    name: "Hero / Portada Principal",
    description: "Sección de bienvenida con insignia superior, titular destacado, bajada descriptiva y dos botones de acción.",
    category: "estructura",
    fields: [
      { key: "badge", label: "Insignia superior", type: "text", defaultValue: "Sabor & Tradición Gastronómica" },
      { key: "title", label: "Título principal", type: "text", defaultValue: "Una experiencia culinaria que despierta tus sentidos" },
      { key: "subtitle", label: "Subtítulo descriptivo", type: "textarea", defaultValue: "Descubrí ingredientes frescos, recetas de autor y una ambientación pensada para compartir momentos inolvidables en {{restaurantName}}." },
      { key: "primaryBtnText", label: "Texto botón principal", type: "text", defaultValue: "📖 Ver Menú Digital" },
      { key: "primaryBtnUrl", label: "URL botón principal", type: "url", defaultValue: "{{menuUrl}}" },
      { key: "secondaryBtnText", label: "Texto botón secundario", type: "text", defaultValue: "📍 Cómo Llegar" },
      { key: "secondaryBtnUrl", label: "URL botón secundario", type: "url", defaultValue: "#contacto" },
    ],
    htmlTemplate: `<!-- Hero Section -->
<section class="hero-section" id="inicio">
  <div class="container hero-container">
    <div class="hero-content">
      <span class="hero-badge">{{badge}}</span>
      <h1 class="hero-title">{{title}}</h1>
      <p class="hero-subtitle">{{subtitle}}</p>
      <div class="hero-actions">
        <a href="{{primaryBtnUrl}}" target="_top" class="btn btn-primary btn-lg">
          <span>{{primaryBtnText}}</span>
        </a>
        <a href="{{secondaryBtnUrl}}" class="btn btn-secondary btn-lg">
          <span>{{secondaryBtnText}}</span>
        </a>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: `.hero-section {
  position: relative;
  padding: 100px 0 110px;
  overflow: hidden;
  border-bottom: 1px solid var(--color-border);
}
.hero-container {
  position: relative;
  z-index: 2;
}
.hero-content { max-width: 700px; }
.hero-badge {
  display: inline-block;
  padding: 6px 14px;
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-border);
  color: var(--color-accent);
  font-size: 0.82rem;
  font-weight: 700;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
}
.hero-title {
  font-size: 3.2rem;
  letter-spacing: -0.02em;
  margin-bottom: 20px;
}
.hero-subtitle {
  font-size: 1.18rem;
  color: var(--color-text-muted);
  margin-bottom: 34px;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
@media (max-width: 868px) {
  .hero-title { font-size: 2.35rem; }
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "specialties-grid",
    name: "Grilla de Especialidades (3 Cards)",
    description: "Sección con encabezado y 3 tarjetas de especialidades gastronómicas con ícono, etiqueta y botón inferior.",
    category: "tarjetas",
    fields: [
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "Nuestra Propuesta" },
      { key: "sectionTitle", label: "Título de sección", type: "text", defaultValue: "Especialidades de la Casa" },
      { key: "sectionDescription", label: "Descripción de sección", type: "textarea", defaultValue: "Platos elaborados con dedicación, cuidando cada detalle y selección de materia prima." },
      { key: "card1Icon", label: "Card 1 · Ícono", type: "text", defaultValue: "🥩" },
      { key: "card1Title", label: "Card 1 · Título", type: "text", defaultValue: "Cortes Seleccionados" },
      { key: "card1Text", label: "Card 1 · Descripción", type: "textarea", defaultValue: "Cocción a fuego lento con madera de quebracho y sazonado con sales aromáticas exclusivas." },
      { key: "card2Icon", label: "Card 2 · Ícono", type: "text", defaultValue: "🍝" },
      { key: "card2Badge", label: "Card 2 · Etiqueta destacada", type: "text", defaultValue: "Favorito" },
      { key: "card2Title", label: "Card 2 · Título", type: "text", defaultValue: "Pastas Artesanales" },
      { key: "card2Text", label: "Card 2 · Descripción", type: "textarea", defaultValue: "Amasadas a diario con sémola de trigo candeal, salsas reducidas por horas y quesos madurados." },
      { key: "card3Icon", label: "Card 3 · Ícono", type: "text", defaultValue: "🍷" },
      { key: "card3Title", label: "Card 3 · Título", type: "text", defaultValue: "Cava & Coctelería" },
      { key: "card3Text", label: "Card 3 · Descripción", type: "textarea", defaultValue: "Maridajes recomendados por sommeliers y cócteles clásicos reversionados por nuestro bartender." },
      { key: "ctaText", label: "Texto botón inferior", type: "text", defaultValue: "Explorar toda la carta interactiva →" },
      { key: "ctaUrl", label: "URL botón inferior", type: "url", defaultValue: "{{menuUrl}}" },
    ],
    htmlTemplate: `<!-- Especialidades Destacadas -->
<section class="section specialties-section" id="destacados">
  <div class="container">
    <div class="section-header">
      <span class="section-kicker">{{kicker}}</span>
      <h2 class="section-title">{{sectionTitle}}</h2>
      <p class="section-description">{{sectionDescription}}</p>
    </div>

    <div class="cards-grid">
      <article class="card">
        <div class="card-icon">{{card1Icon}}</div>
        <h3 class="card-title">{{card1Title}}</h3>
        <p class="card-text">{{card1Text}}</p>
      </article>

      <article class="card featured-card">
        <div class="card-icon">{{card2Icon}}</div>
        <div class="card-badge">{{card2Badge}}</div>
        <h3 class="card-title">{{card2Title}}</h3>
        <p class="card-text">{{card2Text}}</p>
      </article>

      <article class="card">
        <div class="card-icon">{{card3Icon}}</div>
        <h3 class="card-title">{{card3Title}}</h3>
        <p class="card-text">{{card3Text}}</p>
      </article>
    </div>

    <div class="section-cta-wrap">
      <a href="{{ctaUrl}}" target="_top" class="btn btn-outline">{{ctaText}}</a>
    </div>
  </div>
</section>`,
    cssTemplate: `.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
}
.card {
  position: relative;
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 36px 30px;
  box-shadow: var(--shadow-soft);
  transition: var(--transition);
}
.card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-hover);
}
.featured-card {
  border-color: var(--color-accent);
}
.card-badge {
  position: absolute;
  top: 18px;
  right: 18px;
  background-color: var(--color-accent);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
  text-transform: uppercase;
}
.card-icon {
  font-size: 2.4rem;
  margin-bottom: 20px;
}
.card-title {
  font-size: 1.4rem;
  margin-bottom: 12px;
}
.card-text {
  color: var(--color-text-muted);
  font-size: 0.98rem;
}
.section-cta-wrap {
  text-align: center;
  margin-top: 48px;
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "custom-card",
    name: "Card Destacada (Plato / Promo)",
    description: "Módulo de tarjeta individual con imagen/ícono, precio o etiqueta, descripción y botón. Ideal para personalizar o guardar en tu biblioteca.",
    category: "tarjetas",
    fields: [
      { key: "badge", label: "Etiqueta superior", type: "text", defaultValue: "Sugerencia del Chef" },
      { key: "icon", label: "Ícono o Emoji", type: "text", defaultValue: "🔥" },
      { key: "title", label: "Título de la Card", type: "text", defaultValue: "Menú Degustación de Estación" },
      { key: "priceTag", label: "Precio / Destacado", type: "text", defaultValue: "4 Pasos + Maridaje" },
      { key: "description", label: "Descripción", type: "textarea", defaultValue: "Un recorrido por nuestros sabores insignia acompañado de etiquetas seleccionadas de nuestra cava." },
      { key: "buttonText", label: "Texto del botón", type: "text", defaultValue: "Ver en la Carta Digital" },
      { key: "buttonUrl", label: "Enlace del botón", type: "url", defaultValue: "{{menuUrl}}" },
    ],
    htmlTemplate: `<!-- Card Destacada -->
<section class="section single-card-section">
  <div class="container">
    <article class="spotlight-card">
      <div class="spotlight-icon">{{icon}}</div>
      <div class="spotlight-body">
        <div class="spotlight-meta">
          <span class="spotlight-badge">{{badge}}</span>
          <span class="spotlight-price">{{priceTag}}</span>
        </div>
        <h3 class="spotlight-title">{{title}}</h3>
        <p class="spotlight-desc">{{description}}</p>
      </div>
      <div class="spotlight-action">
        <a href="{{buttonUrl}}" target="_top" class="btn btn-primary">{{buttonText}}</a>
      </div>
    </article>
  </div>
</section>`,
    cssTemplate: `.single-card-section {
  padding: 48px 0;
}
.spotlight-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-lg);
  padding: 36px;
  box-shadow: var(--shadow-soft);
}
.spotlight-icon {
  font-size: 3rem;
  flex-shrink: 0;
}
.spotlight-body {
  flex: 1;
}
.spotlight-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.spotlight-badge {
  background-color: var(--color-accent);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 9999px;
  text-transform: uppercase;
}
.spotlight-price {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-primary);
}
.spotlight-title {
  font-size: 1.6rem;
  margin-bottom: 8px;
}
.spotlight-desc {
  color: var(--color-text-muted);
  font-size: 0.98rem;
}
@media (max-width: 768px) {
  .spotlight-card {
    flex-direction: column;
    align-items: flex-start;
  }
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "experience-split",
    name: "Historia & Filosofía (2 Columnas)",
    description: "Bloque editorial dividido en dos columnas con cita destacada, insignia porcentual y puntos diferenciales.",
    category: "contenido",
    fields: [
      { key: "metricNumber", label: "Número / Métrica insignia", type: "text", defaultValue: "100%" },
      { key: "metricLabel", label: "Texto insignia", type: "text", defaultValue: "Pasión Artesanal" },
      { key: "quote", label: "Cita destacada", type: "textarea", defaultValue: "\"La cocina no es solo alimentar, es generar recuerdos que perduran en cada bocado.\"" },
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "Filosofía" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "Pasión por el detalle" },
      { key: "description", label: "Párrafo principal", type: "textarea", defaultValue: "En {{restaurantName}} creemos que cada comida debe ser una celebración. Por eso trabajamos junto a productores locales para garantizar frescura, sustentabilidad y sabor genuino." },
      { key: "feature1Title", label: "Punto 1 · Título", type: "text", defaultValue: "Ingredientes Locales:" },
      { key: "feature1Text", label: "Punto 1 · Detalle", type: "text", defaultValue: "Priorizamos productores regionales de primera calidad." },
      { key: "feature2Title", label: "Punto 2 · Título", type: "text", defaultValue: "Ambiente Cálido:" },
      { key: "feature2Text", label: "Punto 2 · Detalle", type: "text", defaultValue: "Espacios diseñados para encuentros relajados y ocasiones especiales." },
      { key: "feature3Title", label: "Punto 3 · Título", type: "text", defaultValue: "Menú Digital Siempre al Día:" },
      { key: "feature3Text", label: "Punto 3 · Detalle", type: "text", defaultValue: "Consultá opciones y sugerencias en tiempo real desde tu móvil." },
    ],
    htmlTemplate: `<!-- Experiencia / Historia -->
<section class="section experience-section" id="experiencia">
  <div class="container experience-container">
    <div class="experience-visual">
      <div class="experience-badge-float">
        <span class="exp-number">{{metricNumber}}</span>
        <span class="exp-label">{{metricLabel}}</span>
      </div>
      <div class="experience-quote">
        <p>{{quote}}</p>
      </div>
    </div>
    <div class="experience-content">
      <span class="section-kicker">{{kicker}}</span>
      <h2 class="section-title">{{title}}</h2>
      <p class="section-text">{{description}}</p>
      <div class="features-list">
        <div class="feature-item">
          <span class="feature-check">✓</span>
          <div><strong>{{feature1Title}}</strong> {{feature1Text}}</div>
        </div>
        <div class="feature-item">
          <span class="feature-check">✓</span>
          <div><strong>{{feature2Title}}</strong> {{feature2Text}}</div>
        </div>
        <div class="feature-item">
          <span class="feature-check">✓</span>
          <div><strong>{{feature3Title}}</strong> {{feature3Text}}</div>
        </div>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: `.experience-section {
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}
.experience-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}
.experience-visual {
  position: relative;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  border-radius: var(--radius-lg);
  padding: 60px 40px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 360px;
}
.experience-quote p {
  font-family: var(--font-serif);
  font-size: 1.45rem;
  font-style: italic;
  line-height: 1.5;
  color: #ffffff;
}
.experience-badge-float {
  display: inline-block;
  background: var(--color-accent);
  color: #ffffff;
  padding: 10px 18px;
  border-radius: var(--radius-md);
  margin-bottom: 24px;
  align-self: flex-start;
}
.experience-badge-float .exp-number {
  font-size: 1.3rem;
  font-weight: 800;
  margin-right: 6px;
}
.section-text {
  font-size: 1.05rem;
  color: var(--color-text-muted);
  margin-bottom: 24px;
}
.features-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.feature-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.feature-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: var(--color-primary);
  color: #ffffff;
  border-radius: 50%;
  font-size: 0.78rem;
  font-weight: 800;
  flex-shrink: 0;
  margin-top: 2px;
}
@media (max-width: 868px) {
  .experience-container {
    grid-template-columns: 1fr;
    gap: 36px;
  }
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "promo-banner",
    name: "Franja Promocional / Evento",
    description: "Banner de alto impacto para anunciar Happy Hour, eventos en vivo o promociones de temporada.",
    category: "contenido",
    fields: [
      { key: "tag", label: "Etiqueta", type: "text", defaultValue: "Jueves a Sábados · 19 a 21 hs" },
      { key: "title", label: "Título de promoción", type: "text", defaultValue: "Sunset & Coctelería de Autor 2x1" },
      { key: "subtitle", label: "Descripción breve", type: "textarea", defaultValue: "Música en vivo, tapas seleccionadas y nuestra barra de coctelería clásica y de autor." },
      { key: "ctaText", label: "Texto del botón", type: "text", defaultValue: "Ver Carta de Cócteles" },
      { key: "ctaUrl", label: "URL del botón", type: "url", defaultValue: "{{menuUrl}}" },
    ],
    htmlTemplate: `<section class="promo-banner-section">
  <div class="container">
    <div class="promo-banner-box">
      <div class="promo-banner-copy">
        <span class="promo-tag">{{tag}}</span>
        <h2 class="promo-title">{{title}}</h2>
        <p class="promo-subtitle">{{subtitle}}</p>
      </div>
      <div class="promo-banner-cta">
        <a href="{{ctaUrl}}" target="_top" class="btn btn-primary btn-lg">{{ctaText}}</a>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: `.promo-banner-section {
  padding: 56px 0;
}
.promo-banner-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #ffffff;
  border-radius: var(--radius-lg);
  padding: 48px 44px;
  box-shadow: var(--shadow-hover);
}
.promo-tag {
  display: inline-block;
  background-color: var(--color-accent);
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 5px 12px;
  border-radius: 9999px;
  margin-bottom: 14px;
}
.promo-title {
  color: #ffffff;
  font-size: 2rem;
  margin-bottom: 10px;
}
.promo-subtitle {
  color: rgba(255, 255, 255, 0.85);
  max-width: 580px;
  font-size: 1.02rem;
}
@media (max-width: 768px) {
  .promo-banner-box {
    flex-direction: column;
    align-items: flex-start;
    padding: 32px 24px;
  }
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "testimonials",
    name: "Reseñas de Comensales",
    description: "Grilla de 3 testimonios con calificación de estrellas y nombre del cliente.",
    category: "tarjetas",
    fields: [
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "Experiencias Reales" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "Lo que dicen nuestros comensales" },
      { key: "review1Text", label: "Reseña 1 · Comentario", type: "textarea", defaultValue: "\"Excelente atención y cada plato supera al anterior. La carta digital es súper clara y rápida.\"" },
      { key: "review1Author", label: "Reseña 1 · Autor", type: "text", defaultValue: "Lucía Fernández" },
      { key: "review2Text", label: "Reseña 2 · Comentario", type: "textarea", defaultValue: "\"El punto de la carne perfecto y una cava de vinos increíble. Lugar ideal para celebrar.\"" },
      { key: "review2Author", label: "Reseña 2 · Autor", type: "text", defaultValue: "Martín Gómez" },
      { key: "review3Text", label: "Reseña 3 · Comentario", type: "textarea", defaultValue: "\"Ambiente cálido, música suave y postres caseros inolvidables. Volveremos sin dudas.\"" },
      { key: "review3Author", label: "Reseña 3 · Autor", type: "text", defaultValue: "Sofía & Andrés" },
    ],
    htmlTemplate: `<section class="section testimonials-section">
  <div class="container">
    <div class="section-header">
      <span class="section-kicker">{{kicker}}</span>
      <h2 class="section-title">{{title}}</h2>
    </div>
    <div class="cards-grid">
      <article class="card review-card">
        <div class="review-stars">★★★★★</div>
        <p class="card-text">{{review1Text}}</p>
        <p class="review-author">— {{review1Author}}</p>
      </article>
      <article class="card review-card">
        <div class="review-stars">★★★★★</div>
        <p class="card-text">{{review2Text}}</p>
        <p class="review-author">— {{review2Author}}</p>
      </article>
      <article class="card review-card">
        <div class="review-stars">★★★★★</div>
        <p class="card-text">{{review3Text}}</p>
        <p class="review-author">— {{review3Author}}</p>
      </article>
    </div>
  </div>
</section>`,
    cssTemplate: `.review-stars {
  color: var(--color-accent);
  font-size: 1.15rem;
  letter-spacing: 2px;
  margin-bottom: 14px;
}
.review-author {
  margin-top: 18px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--color-primary);
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "contact-hours",
    name: "Horarios, Ubicación y WhatsApp",
    description: "Sección de 3 tarjetas informativas con horarios de apertura, dirección y contacto directo por WhatsApp.",
    category: "contacto",
    fields: [
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "Visitános" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "Horarios y Ubicación" },
      { key: "description", label: "Descripción", type: "textarea", defaultValue: "Te esperamos con las puertas abiertas para compartir un momento único." },
      { key: "hoursTitle", label: "Tarjeta 1 · Título", type: "text", defaultValue: "Horarios de Atención" },
      { key: "hoursLine1", label: "Horario principal", type: "text", defaultValue: "Martes a Sábado: 12:00 a 16:00 | 20:00 a 00:30" },
      { key: "hoursLine2", label: "Horario secundario", type: "text", defaultValue: "Domingos: 12:30 a 17:00" },
      { key: "hoursNote", label: "Nota de horario", type: "text", defaultValue: "Lunes cerrado por descanso del equipo." },
      { key: "addressTitle", label: "Tarjeta 2 · Título", type: "text", defaultValue: "Ubicación" },
      { key: "addressLine1", label: "Dirección", type: "text", defaultValue: "Avenida Principal 1234, Centro Histórico" },
      { key: "addressLine2", label: "Detalle de ubicación", type: "text", defaultValue: "Estacionamiento exclusivo para clientes." },
      { key: "contactTitle", label: "Tarjeta 3 · Título", type: "text", defaultValue: "Reservas & Consultas" },
      { key: "phoneText", label: "Teléfono", type: "text", defaultValue: "Teléfono: +54 9 11 0000-0000" },
      { key: "whatsappText", label: "WhatsApp visible", type: "text", defaultValue: "WhatsApp: +54 9 11 9999-9999" },
      { key: "whatsappUrl", label: "Enlace de WhatsApp", type: "url", defaultValue: "https://wa.me/" },
      { key: "whatsappBtnLabel", label: "Texto botón WhatsApp", type: "text", defaultValue: "Escribinos por WhatsApp" },
    ],
    htmlTemplate: `<!-- Información y Contacto -->
<section class="section contact-section" id="contacto">
  <div class="container">
    <div class="section-header">
      <span class="section-kicker">{{kicker}}</span>
      <h2 class="section-title">{{title}}</h2>
      <p class="section-description">{{description}}</p>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <span class="info-icon">🕒</span>
        <h3>{{hoursTitle}}</h3>
        <p>{{hoursLine1}}</p>
        <p>{{hoursLine2}}</p>
        <p class="info-note">{{hoursNote}}</p>
      </div>

      <div class="info-card">
        <span class="info-icon">📍</span>
        <h3>{{addressTitle}}</h3>
        <p>{{addressLine1}}</p>
        <p>{{addressLine2}}</p>
      </div>

      <div class="info-card">
        <span class="info-icon">📞</span>
        <h3>{{contactTitle}}</h3>
        <p>{{phoneText}}</p>
        <p>{{whatsappText}}</p>
        <a href="{{whatsappUrl}}" target="_blank" rel="noreferrer" class="btn btn-whatsapp mt-3">{{whatsappBtnLabel}}</a>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: `.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
.info-card {
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-soft);
}
.info-icon {
  font-size: 2rem;
  margin-bottom: 16px;
  display: inline-block;
}
.info-card h3 {
  font-size: 1.25rem;
  margin-bottom: 12px;
}
.info-note {
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-style: italic;
}
.btn-whatsapp {
  background-color: #25d366;
  color: #ffffff;
}
.btn-whatsapp:hover {
  background-color: #20ba5a;
}
.mt-3 { margin-top: 14px; }`,
    jsTemplate: "",
  },
  {
    moduleKey: "footer",
    name: "Pie de Página (Footer)",
    description: "Footer oscuro con nombre del local, año dinámico y accesos rápidos.",
    category: "estructura",
    fields: [
      { key: "brandTitle", label: "Nombre del local", type: "text", defaultValue: "{{restaurantName}}" },
      { key: "copyrightText", label: "Texto de derechos", type: "text", defaultValue: "Todos los derechos reservados." },
      { key: "menuLinkText", label: "Texto enlace carta", type: "text", defaultValue: "Carta Digital" },
      { key: "topLinkText", label: "Texto enlace subir", type: "text", defaultValue: "Subir" },
    ],
    htmlTemplate: `<!-- Footer -->
<footer class="site-footer">
  <div class="container footer-container">
    <div class="footer-brand">
      <span class="brand-name">{{brandTitle}}</span>
      <p class="footer-copy">© <span class="js-current-year">2026</span> {{brandTitle}}. {{copyrightText}}</p>
    </div>
    <div class="footer-links">
      <a href="{{menuUrl}}" target="_top" class="footer-link">{{menuLinkText}}</a>
      <a href="#inicio" class="footer-link">{{topLinkText}}</a>
    </div>
  </div>
</footer>`,
    cssTemplate: `.site-footer {
  background-color: #121912;
  color: #a2aba1;
  padding: 40px 0;
  font-size: 0.9rem;
}
.footer-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
.footer-brand .brand-name {
  color: #ffffff;
  font-family: var(--font-serif);
  font-size: 1.2rem;
  font-weight: 700;
  display: block;
  margin-bottom: 4px;
}
.footer-links {
  display: flex;
  gap: 20px;
}
.footer-link {
  color: #a2aba1;
  text-decoration: none;
  transition: var(--transition);
}
.footer-link:hover { color: #ffffff; }`,
    jsTemplate: `document.querySelectorAll('.js-current-year').forEach(el => {
  el.textContent = String(new Date().getFullYear());
});`,
  },
  {
    moduleKey: "custom-code",
    name: "Módulo Libre (HTML / CSS / JS)",
    description: "Módulo en blanco para diseñar una Card o sección a medida con HTML, CSS y JS propio. Usá {{variable}} en el HTML para crear campos visuales automáticamente.",
    category: "codigo",
    fields: [
      { key: "title", label: "Título del módulo", type: "text", defaultValue: "Nuevo Módulo Personalizado" },
      { key: "subtitle", label: "Descripción", type: "textarea", defaultValue: "Podés editar este texto desde el inspector visual o abrir el código HTML/CSS/JS en Monaco." },
    ],
    htmlTemplate: `<section class="section custom-module-block">
  <div class="container">
    <div class="custom-module-card">
      <h3>{{title}}</h3>
      <p>{{subtitle}}</p>
    </div>
  </div>
</section>`,
    cssTemplate: `.custom-module-card {
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-soft);
}
.custom-module-card h3 {
  font-size: 1.5rem;
  margin-bottom: 8px;
}
.custom-module-card p {
  color: var(--color-text-muted);
}`,
    jsTemplate: `// Lógica JS opcional para este módulo`,
  },
  {
    moduleKey: "stats-strip",
    name: "Métricas & Logros (Stats)",
    description: "Franja de 4 indicadores numéricos para destacar trayectoria, reseñas y especialidades.",
    category: "contenido",
    fields: [
      { key: "stat1Value", label: "Métrica 1 (Valor)", type: "text", defaultValue: "+15 Años" },
      { key: "stat1Label", label: "Métrica 1 (Etiqueta)", type: "text", defaultValue: "Tradición gastronómica" },
      { key: "stat2Value", label: "Métrica 2 (Valor)", type: "text", defaultValue: "4.9 ★" },
      { key: "stat2Label", label: "Métrica 2 (Etiqueta)", type: "text", defaultValue: "Calificación de clientes" },
      { key: "stat3Value", label: "Métrica 3 (Valor)", type: "text", defaultValue: "100%" },
      { key: "stat3Label", label: "Métrica 3 (Etiqueta)", type: "text", defaultValue: "Ingredientes frescos" },
      { key: "stat4Value", label: "Métrica 4 (Valor)", type: "text", defaultValue: "+40" },
      { key: "stat4Label", label: "Métrica 4 (Etiqueta)", type: "text", defaultValue: "Etiquetas en cava" },
    ],
    htmlTemplate: `<section class="section stats-strip-section">
  <div class="container">
    <div class="stats-strip-grid">
      <div class="stat-card">
        <span class="stat-val">{{stat1Value}}</span>
        <span class="stat-lbl">{{stat1Label}}</span>
      </div>
      <div class="stat-card">
        <span class="stat-val">{{stat2Value}}</span>
        <span class="stat-lbl">{{stat2Label}}</span>
      </div>
      <div class="stat-card">
        <span class="stat-val">{{stat3Value}}</span>
        <span class="stat-lbl">{{stat3Label}}</span>
      </div>
      <div class="stat-card">
        <span class="stat-val">{{stat4Value}}</span>
        <span class="stat-lbl">{{stat4Label}}</span>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: `.stats-strip-section {
  padding: 48px 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-card-bg);
}
.stats-strip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 24px;
  text-align: center;
}
.stat-card {
  padding: 16px;
}
.stat-val {
  display: block;
  font-family: var(--font-serif);
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 6px;
}
.stat-lbl {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  font-weight: 500;
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "gallery-grid",
    name: "Galería de Fotos",
    description: "Mosaico visual de 3 fotografías destacadas del salón y platos.",
    category: "tarjetas",
    fields: [
      { key: "tag", label: "Etiqueta superior", type: "text", defaultValue: "Galería" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "Nuestra atmósfera y cocina" },
      { key: "img1Url", label: "Foto 1", type: "image", defaultValue: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80" },
      { key: "img1Caption", label: "Pie de foto 1", type: "text", defaultValue: "Salón Principal" },
      { key: "img2Url", label: "Foto 2", type: "image", defaultValue: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80" },
      { key: "img2Caption", label: "Pie de foto 2", type: "text", defaultValue: "Cocina de Autor" },
      { key: "img3Url", label: "Foto 3", type: "image", defaultValue: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80" },
      { key: "img3Caption", label: "Pie de foto 3", type: "text", defaultValue: "Barra & Coctelería" },
    ],
    htmlTemplate: `<section class="section">
  <div class="container">
    <div class="section-header">
      <span class="section-tag">{{tag}}</span>
      <h2 class="section-title">{{title}}</h2>
    </div>
    <div class="gallery-mosaic">
      <figure class="gallery-item">
        <img src="{{img1Url}}" alt="{{img1Caption}}" loading="lazy" />
        <figcaption>{{img1Caption}}</figcaption>
      </figure>
      <figure class="gallery-item">
        <img src="{{img2Url}}" alt="{{img2Caption}}" loading="lazy" />
        <figcaption>{{img2Caption}}</figcaption>
      </figure>
      <figure class="gallery-item">
        <img src="{{img3Url}}" alt="{{img3Caption}}" loading="lazy" />
        <figcaption>{{img3Caption}}</figcaption>
      </figure>
    </div>
  </div>
</section>`,
    cssTemplate: `.gallery-mosaic {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}
.gallery-item {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--color-border);
}
.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.gallery-item:hover img {
  transform: scale(1.05);
}
.gallery-item figcaption {
  position: absolute;
  inset: auto 0 0 0;
  padding: 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.75), transparent);
  color: #ffffff;
  font-weight: 600;
  font-size: 0.95rem;
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "image-spotlight",
    name: "Sección con Imagen Destacada",
    description: "Bloque visual de dos columnas con fotografía protagonista, texto editorial y botón de acción.",
    category: "contenido",
    fields: [
      { key: "kicker", label: "Etiqueta superior", type: "text", defaultValue: "Especialidad de Temporada" },
      { key: "title", label: "Título principal", type: "text", defaultValue: "Sabores auténticos pensados para compartir" },
      { key: "description", label: "Descripción", type: "textarea", defaultValue: "Cada plato combina técnicas contemporáneas con productos frescos de estación seleccionados cada mañana." },
      { key: "photoUrl", label: "Fotografía destacada", type: "image", defaultValue: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80" },
      { key: "photoCaption", label: "Etiqueta sobre la foto", type: "text", defaultValue: "Elaboración propia todos los días" },
      { key: "ctaText", label: "Texto del botón", type: "text", defaultValue: "Ver en la Carta Digital" },
      { key: "ctaUrl", label: "URL del botón", type: "url", defaultValue: "{{menuUrl}}" },
    ],
    htmlTemplate: `<section class="section image-spotlight-section">
  <div class="container image-spotlight-grid">
    <div class="image-spotlight-media">
      <img src="{{photoUrl}}" alt="{{title}}" loading="lazy" />
      <span class="image-spotlight-caption">{{photoCaption}}</span>
    </div>
    <div class="image-spotlight-copy">
      <span class="section-kicker">{{kicker}}</span>
      <h2 class="section-title">{{title}}</h2>
      <p class="section-description">{{description}}</p>
      <div class="image-spotlight-actions">
        <a href="{{ctaUrl}}" target="_top" class="btn btn-primary btn-lg">{{ctaText}}</a>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: `.image-spotlight-grid {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 52px;
  align-items: center;
}
.image-spotlight-media {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-soft);
  aspect-ratio: 4 / 3;
}
.image-spotlight-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.image-spotlight-caption {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: rgba(18, 25, 18, 0.82);
  backdrop-filter: blur(8px);
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}
.image-spotlight-actions {
  margin-top: 28px;
}
@media (max-width: 868px) {
  .image-spotlight-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "faq-accordion",
    name: "Preguntas Frecuentes (FAQ)",
    description: "Acordeón interactivo para dudas sobre reservas, opciones sin TACC/veganas y eventos.",
    category: "contenido",
    fields: [
      { key: "title", label: "Título FAQ", type: "text", defaultValue: "Preguntas Frecuentes" },
      { key: "q1", label: "Pregunta 1", type: "text", defaultValue: "¿Contamos con opciones sin TACC y vegetarianas?" },
      { key: "a1", label: "Respuesta 1", type: "textarea", defaultValue: "Sí, nuestra carta digital identifica todos los platos aptos celíacos, vegetarianos y veganos." },
      { key: "q2", label: "Pregunta 2", type: "text", defaultValue: "¿Es necesario reservar mesa con anticipación?" },
      { key: "a2", label: "Respuesta 2", type: "textarea", defaultValue: "Para cenas de viernes y sábados recomendamos reservar por WhatsApp. También recibimos clientes sin reserva por orden de llegada." },
      { key: "q3", label: "Pregunta 3", type: "text", defaultValue: "¿Realizan eventos privados o menús para grupos?" },
      { key: "a3", label: "Respuesta 3", type: "textarea", defaultValue: "Sí, diseñamos menús por pasos personalizados para celebraciones, cumpleaños y eventos corporativos." },
    ],
    htmlTemplate: `<section class="section">
  <div class="container faq-container">
    <div class="section-header">
      <h2 class="section-title">{{title}}</h2>
    </div>
    <div class="faq-list">
      <details class="faq-item" open>
        <summary>{{q1}}</summary>
        <p>{{a1}}</p>
      </details>
      <details class="faq-item">
        <summary>{{q2}}</summary>
        <p>{{a2}}</p>
      </details>
      <details class="faq-item">
        <summary>{{q3}}</summary>
        <p>{{a3}}</p>
      </details>
    </div>
  </div>
</section>`,
    cssTemplate: `.faq-container { max-width: 780px; }
.faq-list { display: flex; flex-direction: column; gap: 12px; }
.faq-item {
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 18px 22px;
}
.faq-item summary {
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text-main);
  font-size: 1.02rem;
}
.faq-item p {
  margin-top: 10px;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}`,
    jsTemplate: "",
  },
];

export function createBlockFromBuiltinModule(
  definition: BuiltinLandingModuleDefinition,
  idSuffix?: string,
): LandingBlock {
  const id = `block-${definition.moduleKey}-${idSuffix ?? Math.random().toString(36).slice(2, 8)}`;
  const values: Record<string, string> = {};
  for (const field of definition.fields) {
    values[field.key] = field.defaultValue;
  }

  return {
    id,
    moduleKey: definition.moduleKey,
    name: definition.name,
    visible: true,
    fields: definition.fields.map((field) => ({ ...field })),
    values,
    htmlTemplate: definition.htmlTemplate,
    cssTemplate: definition.cssTemplate,
    jsTemplate: definition.jsTemplate,
  };
}

export function createBlockFromCustomModule(
  customModule: LandingCustomModuleView,
  idSuffix?: string,
): LandingBlock {
  const id = `block-custom-${idSuffix ?? Math.random().toString(36).slice(2, 8)}`;
  const values: Record<string, string> = {};
  for (const field of customModule.fields) {
    values[field.key] = field.defaultValue;
  }

  return {
    id,
    moduleKey: `custom:${customModule.id}`,
    name: customModule.name,
    visible: true,
    fields: customModule.fields.map((field) => ({ ...field })),
    values,
    htmlTemplate: customModule.htmlTemplate,
    cssTemplate: customModule.cssTemplate,
    jsTemplate: customModule.jsTemplate,
  };
}
