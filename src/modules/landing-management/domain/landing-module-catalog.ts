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
  .nav-menu.open { display: flex; z-index: 999; }
  .nav-toggle { display: flex; }
  .nav-toggle.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .nav-toggle.open span:nth-child(2) { opacity: 0; }
  .nav-toggle.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
}`,
    jsTemplate: `(function() {
  document.addEventListener('click', function(e) {
    if (document.getElementById('__landing-blocks-root') && document.documentElement.getAttribute('data-preview-mode') !== 'true') {
      return;
    }
    if (e.__navToggleHandled) return;
    const toggle = e.target.closest('#navToggle, .nav-toggle');
    if (toggle) {
      e.__navToggleHandled = true;
      const header = toggle.closest('.site-header') || document;
      const menu = header.querySelector('#navMenu, .nav-menu');
      if (menu) {
        const isOpen = menu.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
      }
      return;
    }
    const link = e.target.closest('#navMenu a, .nav-menu a');
    if (link) {
      const menu = link.closest('#navMenu, .nav-menu');
      if (menu) {
        menu.classList.remove('open');
        const header = menu.closest('.site-header') || document;
        const toggle = header.querySelector('#navToggle, .nav-toggle');
        if (toggle) {
          toggle.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      }
    }
  });
})();`,
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
    moduleKey: "reservations-table",
    name: "Reserva de Mesas (Turnos)",
    description: "Módulo exclusivo de reserva de mesas con selector visual interactivo de 14 días (chips), turnos disponibles en tiempo real, bloqueo de horarios ocupados y comprobante WhatsApp.",
    category: "contacto",
    fields: [
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "Reservas Online" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "Asegurá tu Mesa" },
      { key: "description", label: "Descripción", type: "textarea", defaultValue: "Elegí el día, turno y cantidad de comensales. Confirmación inmediata y recordatorio por WhatsApp." },
      { key: "partyLabel", label: "Etiqueta: Comensales", type: "text", defaultValue: "¿Cuántas personas?" },
      { key: "dateLabel", label: "Etiqueta: Fecha", type: "text", defaultValue: "Fecha de reserva" },
      { key: "slotsLabel", label: "Etiqueta: Horarios", type: "text", defaultValue: "Turnos disponibles" },
      { key: "nameLabel", label: "Etiqueta: Nombre", type: "text", defaultValue: "Nombre y Apellido" },
      { key: "phoneLabel", label: "Etiqueta: WhatsApp", type: "text", defaultValue: "WhatsApp / Teléfono" },
      { key: "emailLabel", label: "Etiqueta: Email", type: "text", defaultValue: "Email (opcional)" },
      { key: "notesLabel", label: "Etiqueta: Comentarios", type: "text", defaultValue: "Aclaraciones o Preferencias" },
      { key: "notesPlaceholder", label: "Placeholder notas", type: "text", defaultValue: "Alergias, cumpleaños, mesa interior o terraza..." },
      { key: "btnSubmitLabel", label: "Texto botón confirmar", type: "text", defaultValue: "Confirmar Reserva de Mesa" },
      { key: "policyNotice", label: "Texto aviso / política", type: "text", defaultValue: "Tolerancia máxima de 15 minutos. Ante cancelaciones o modificaciones, por favor contactanos con anticipación." },
      { key: "restaurantPhone", label: "WhatsApp para comprobante", type: "text", defaultValue: "+5491100000000" },
      { key: "successTitle", label: "Título al confirmar", type: "text", defaultValue: "¡Mesa Reservada con Éxito!" },
      { key: "successMessage", label: "Mensaje de éxito", type: "textarea", defaultValue: "Hemos registrado tu turno exitosamente. Podés guardar este comprobante o enviárnoslo por WhatsApp." },
    ],
    htmlTemplate: `<!-- Reserva de Mesas (Turnos) -->
<section class="section reservation-section res-table-section" id="reservas-mesa" data-restaurant-slug="{{restaurantSlug}}" data-restaurant-name="{{restaurantName}}" data-restaurant-phone="{{restaurantPhone}}">
  <div class="container reservation-container">
    <div class="section-header text-center">
      <span class="section-kicker">{{kicker}}</span>
      <h2 class="section-title">{{title}}</h2>
      <p class="section-description">{{description}}</p>
    </div>

    <div class="res-card">
      <form class="res-form" id="resTableForm" autocomplete="off">
        <input type="hidden" name="time" id="resSelectedTime" value="" />
        <input type="hidden" name="partySize" id="resSelectedPartySize" value="2" />

        <!-- Paso 1: Comensales -->
        <div class="res-form-step">
          <label class="res-step-label">
            <span class="res-step-num">1</span>
            <span>{{partyLabel}}</span>
          </label>
          <div class="res-party-selector" id="resPartyPills">
            <button type="button" class="res-party-pill" data-party="1">1</button>
            <button type="button" class="res-party-pill active" data-party="2">2</button>
            <button type="button" class="res-party-pill" data-party="3">3</button>
            <button type="button" class="res-party-pill" data-party="4">4</button>
            <button type="button" class="res-party-pill" data-party="5">5</button>
            <button type="button" class="res-party-pill" data-party="6">6</button>
            <button type="button" class="res-party-pill" data-party="8">8</button>
            <div class="res-party-custom">
              <input type="number" id="resCustomPartyInput" min="1" max="40" placeholder="+8" aria-label="Otra cantidad de comensales" />
            </div>
          </div>
        </div>

        <!-- Paso 2: Calendario Completo Mensual (Grid D L M M J V S) -->
        <div class="res-form-step">
          <div class="res-step-header">
            <label class="res-step-label">
              <span class="res-step-num">2</span>
              <span>{{dateLabel}}</span>
            </label>
            <input type="hidden" id="resDateInput" value="" />
          </div>

          <div class="res-calendar-card" id="resCalendarCard">
            <div class="res-cal-header">
              <button type="button" class="res-cal-nav-btn" id="resCalPrevBtn" aria-label="Mes anterior">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div class="res-cal-month-title" id="resCalMonthTitle">Octubre 2026</div>
              <button type="button" class="res-cal-nav-btn" id="resCalNextBtn" aria-label="Mes siguiente">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <div class="res-cal-weekdays">
              <span>D</span>
              <span>L</span>
              <span>M</span>
              <span>M</span>
              <span>J</span>
              <span>V</span>
              <span>S</span>
            </div>

            <div class="res-cal-grid res-days-row" id="resDaysRow" role="grid" aria-label="Calendario de reservas">
              <div class="res-cal-empty"></div>
              <div class="res-cal-empty"></div>
              <div class="res-cal-empty"></div>
              <div class="res-cal-empty"></div>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-01"><span class="res-cal-day-num">1</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-02"><span class="res-cal-day-num">2</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-03"><span class="res-cal-day-num">3</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip res-day-closed" data-date="2026-10-04"><span class="res-cal-day-num">4</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-05"><span class="res-cal-day-num">5</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-06"><span class="res-cal-day-num">6</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-07"><span class="res-cal-day-num">7</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-08"><span class="res-cal-day-num">8</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-09"><span class="res-cal-day-num">9</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-10"><span class="res-cal-day-num">10</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip res-day-closed" data-date="2026-10-11"><span class="res-cal-day-num">11</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-12"><span class="res-cal-day-num">12</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-13"><span class="res-cal-day-num">13</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-14"><span class="res-cal-day-num">14</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-15"><span class="res-cal-day-num">15</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-16"><span class="res-cal-day-num">16</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-17"><span class="res-cal-day-num">17</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip res-day-closed" data-date="2026-10-18"><span class="res-cal-day-num">18</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-19"><span class="res-cal-day-num">19</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-20"><span class="res-cal-day-num">20</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-21"><span class="res-cal-day-num">21</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-22"><span class="res-cal-day-num">22</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip active" data-date="2026-10-23"><span class="res-cal-day-num">23</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-24"><span class="res-cal-day-num">24</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip res-day-closed" data-date="2026-10-25"><span class="res-cal-day-num">25</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-26"><span class="res-cal-day-num">26</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-27"><span class="res-cal-day-num">27</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-28"><span class="res-cal-day-num">28</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-29"><span class="res-cal-day-num">29</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-30"><span class="res-cal-day-num">30</span><span class="res-cal-day-dot"></span></button>
              <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-31"><span class="res-cal-day-num">31</span><span class="res-cal-day-dot"></span></button>
            </div>

            <div class="res-cal-footer">
              <div class="res-cal-selected-badge" id="resSelectedDateIndicator">
                <span class="res-cal-badge-dot"></span>
                <span id="resSelectedDateText">Viernes 23 de Octubre de 2026</span>
              </div>
              <div class="res-cal-legend">
                <span class="res-cal-legend-item"><span class="legend-dot available"></span> Libre</span>
                <span class="res-cal-legend-item"><span class="legend-dot closed"></span> Cerrado</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Paso 3: Horarios / Turnos -->
        <div class="res-form-step">
          <div class="res-step-header">
            <label class="res-step-label">
              <span class="res-step-num">3</span>
              <span>{{slotsLabel}}</span>
            </label>
            <span class="res-slots-status-badge" id="resSlotsStatusBadge"></span>
          </div>

          <div class="res-slots-container" id="resSlotsContainer">
            <div class="res-slots-grid" id="resSlotsGrid">
              <button type="button" class="res-slot-pill active" data-time="20:00">20:00</button>
              <button type="button" class="res-slot-pill" data-time="21:00">21:00</button>
              <button type="button" class="res-slot-pill" data-time="22:00">22:00</button>
            </div>
          </div>
          <div class="res-slots-alert" id="resSlotsAlert" style="display: none;"></div>
        </div>

        <!-- Paso 4: Datos de Contacto -->
        <div class="res-form-step">
          <label class="res-step-label">
            <span class="res-step-num">4</span>
            <span>Datos del Titular</span>
          </label>
          <div class="res-grid-fields">
            <div class="res-field-group">
              <label for="resNameInput">{{nameLabel}} *</label>
              <input type="text" id="resNameInput" class="res-input" placeholder="Ej: Valentina Morales" required />
            </div>
            <div class="res-field-group">
              <label for="resPhoneInput">{{phoneLabel}} *</label>
              <input type="tel" id="resPhoneInput" class="res-input" placeholder="Ej: +54 9 11 1234-5678" required />
            </div>
          </div>
          <div class="res-field-group mt-3">
            <label for="resEmailInput">{{emailLabel}}</label>
            <input type="email" id="resEmailInput" class="res-input" placeholder="tuemail@ejemplo.com" />
          </div>
          <div class="res-field-group mt-3">
            <label for="resNotesInput">{{notesLabel}}</label>
            <textarea id="resNotesInput" class="res-input res-textarea" rows="2" placeholder="{{notesPlaceholder}}"></textarea>
          </div>
        </div>

        <div class="res-error-box" id="resErrorBox" style="display: none;"></div>

        <div class="res-form-actions">
          <p class="res-policy-text">ℹ️ {{policyNotice}}</p>
          <button type="submit" class="btn btn-primary res-submit-btn" id="resSubmitBtn">
            <span class="res-btn-text">{{btnSubmitLabel}}</span>
            <span class="res-btn-spinner" style="display: none;">⏳ Confirmando reserva de mesa...</span>
          </button>
        </div>
      </form>

      <div class="res-success-view" id="resSuccessView" style="display: none;">
        <div class="res-success-header">
          <div class="res-success-icon-badge">✓</div>
          <h3 class="res-success-title">{{successTitle}}</h3>
          <p class="res-success-desc">{{successMessage}}</p>
        </div>

        <div class="res-voucher-card">
          <div class="res-voucher-kicker">Comprobante de Mesa Confirmada</div>
          <div class="res-voucher-code" id="resVoucherCode">#RES-0000</div>

          <div class="res-voucher-details">
            <div class="res-voucher-item">
              <span class="voucher-label">Fecha</span>
              <strong class="voucher-value" id="resVoucherDate">-</strong>
            </div>
            <div class="res-voucher-item">
              <span class="voucher-label">Turno / Horario</span>
              <strong class="voucher-value" id="resVoucherTime">-</strong>
            </div>
            <div class="res-voucher-item">
              <span class="voucher-label">Comensales</span>
              <strong class="voucher-value" id="resVoucherGuests">-</strong>
            </div>
            <div class="res-voucher-item">
              <span class="voucher-label">Titular</span>
              <strong class="voucher-value" id="resVoucherName">-</strong>
            </div>
          </div>
        </div>

        <div class="res-success-actions">
          <a href="#" target="_blank" rel="noreferrer" class="btn btn-whatsapp res-voucher-wa-btn" id="resVoucherWaBtn">
            <span>Compartir por WhatsApp</span>
          </a>
          <button type="button" class="btn btn-outline res-new-booking-btn" id="resNewBookingBtn">
            Realizar otra reserva
          </button>
        </div>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: `.reservation-container {
  max-width: 760px;
  margin: 0 auto;
}
.res-card {
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg, 16px);
  padding: 36px 32px;
  box-shadow: var(--shadow-soft);
}
.res-form-step {
  margin-bottom: 28px;
}
.res-step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.res-step-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--color-text-main);
  margin-bottom: 0;
}
.res-step-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  font-weight: 700;
  flex-shrink: 0;
}
/* Calendario Completo Mensual (Estilo Dark Grid con Navegación) */
.res-calendar-card {
  background: #101014;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 22px 18px 18px 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  color: #f3f4f6;
  user-select: none;
  margin-top: 8px;
}
.res-cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  padding: 0 4px;
}
.res-cal-month-title {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #ffffff;
  text-transform: capitalize;
}
.res-cal-nav-btn {
  background: #1b1b22;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.res-cal-nav-btn:hover:not(:disabled) {
  background: #272732;
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}
.res-cal-nav-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
  pointer-events: none;
}
.res-cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  text-align: center;
  margin-bottom: 12px;
}
.res-cal-weekdays span {
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.res-cal-grid {
  display: grid !important;
  grid-template-columns: repeat(7, 1fr) !important;
  gap: 8px !important;
  margin-bottom: 16px;
}
.res-cal-empty {
  min-height: 52px;
  visibility: hidden;
}
.res-cal-day,
.res-day-chip {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 52px !important;
  padding: 8px 4px !important;
  border-radius: 14px !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  background: #19191d !important;
  color: #ffffff !important;
  cursor: pointer !important;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
  user-select: none !important;
}
.res-cal-day:hover:not(:disabled),
.res-day-chip:hover:not(:disabled) {
  background: #25252c !important;
  border-color: rgba(255, 255, 255, 0.22) !important;
  transform: translateY(-2px);
}
.res-cal-day-num,
.res-day-num {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 3px;
  color: #ffffff;
}
.res-cal-day-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ea384c;
  display: block;
  transition: background 0.15s ease;
}
/* Día Seleccionado (Estilo Imagen 2: Rojo/Coral Sólido) */
.res-cal-day.active,
.res-day-chip.active {
  background: #ea384c !important;
  color: #ffffff !important;
  border-color: #ea384c !important;
  box-shadow: 0 4px 14px rgba(234, 56, 76, 0.45) !important;
  transform: scale(1.03) !important;
}
.res-cal-day.active .res-cal-day-num,
.res-day-chip.active .res-day-num {
  color: #ffffff !important;
  font-weight: 800;
}
.res-cal-day.active .res-cal-day-dot {
  background: #ffffff !important;
}
/* Días Pasados */
.res-cal-day.res-day-past,
.res-day-chip.res-day-past {
  opacity: 0.18 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
  background: transparent !important;
  border-color: transparent !important;
}
.res-cal-day.res-day-past .res-cal-day-dot {
  display: none !important;
}
/* Días Cerrados (Descanso semanal o Bloqueado) */
.res-cal-day.res-day-closed,
.res-day-chip.res-day-closed {
  opacity: 0.35 !important;
  cursor: not-allowed !important;
  background: #141416 !important;
  text-decoration: line-through !important;
}
.res-cal-day.res-day-closed .res-cal-day-dot {
  background: #64748b !important;
}
/* Días Agotados */
.res-cal-day.res-day-busy,
.res-day-chip.res-day-busy {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
  background: #141416 !important;
}
.res-cal-day.res-day-busy .res-cal-day-dot {
  background: #ef4444 !important;
}

/* Footer del Calendario */
.res-cal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.res-cal-selected-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  font-weight: 700;
  color: #f3f4f6;
  background: rgba(255, 255, 255, 0.06);
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.res-cal-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ea384c;
}
.res-cal-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}
.res-cal-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.legend-dot.available {
  background: #ea384c;
}
.legend-dot.closed {
  background: #64748b;
}

@media (max-width: 480px) {
  .res-calendar-card {
    padding: 14px 10px 14px 10px;
  }
  .res-cal-grid {
    gap: 5px !important;
  }
  .res-cal-day,
  .res-day-chip {
    min-height: 46px !important;
    border-radius: 10px !important;
  }
  .res-cal-day-num,
  .res-day-num {
    font-size: 0.95rem;
  }
  .res-cal-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
.res-selected-date-indicator {
  margin-top: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary);
}
.res-party-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.res-party-pill {
  border: 1px solid var(--color-border);
  background: var(--color-bg, #ffffff);
  color: var(--color-text-main);
  padding: 8px 18px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 44px;
  text-align: center;
}
.res-party-pill:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.res-party-pill.active {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
}
.res-party-custom input {
  width: 72px;
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  padding: 8px 12px;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 600;
  background: var(--color-bg, #ffffff);
  color: var(--color-text-main);
}
.res-slots-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}
.res-slot-pill {
  border: 1.5px solid var(--color-border);
  background: var(--color-bg, #ffffff);
  color: var(--color-text-main);
  padding: 10px 22px;
  border-radius: var(--radius-md, 10px);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;
}
.res-slot-pill:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.res-slot-pill.active {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}
.res-slot-pill.res-slot-busy {
  opacity: 0.45;
  cursor: not-allowed;
  text-decoration: line-through;
  background: rgba(0, 0, 0, 0.03);
  border-color: transparent;
}
.slot-badge-busy {
  font-size: 0.68rem;
  text-decoration: none;
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}
.res-slots-alert {
  padding: 14px 18px;
  border-radius: var(--radius-md, 10px);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #b91c1c;
  font-size: 0.92rem;
  font-weight: 600;
  margin-top: 10px;
}
.res-grid-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.res-field-group label {
  display: block;
  font-size: 0.88rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--color-text-main);
}
.res-input {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 10px);
  background: var(--color-bg, #ffffff);
  color: var(--color-text-main);
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.res-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
}
.res-textarea {
  resize: vertical;
}
.res-error-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 12px 16px;
  border-radius: var(--radius-md, 10px);
  font-size: 0.92rem;
  font-weight: 600;
  margin-bottom: 20px;
}
.res-form-actions {
  margin-top: 24px;
}
.res-policy-text {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-bottom: 16px;
}
.res-submit-btn {
  width: 100%;
  padding: 14px 24px;
  font-size: 1.05rem;
  font-weight: 700;
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
}
.res-success-view {
  text-align: center;
  padding: 20px 0;
}
.res-success-icon-badge {
  width: 64px;
  height: 64px;
  background: #10b981;
  color: #ffffff;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 16px;
}
.res-success-title {
  font-size: 1.8rem;
  margin-bottom: 8px;
}
.res-success-desc {
  color: var(--color-text-muted);
  font-size: 0.98rem;
  max-width: 500px;
  margin: 0 auto 24px auto;
}
.res-voucher-card {
  background: var(--color-bg, #fafafa);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg, 16px);
  padding: 24px;
  max-width: 460px;
  margin: 0 auto 28px auto;
  text-align: left;
}
.res-voucher-kicker {
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}
.res-voucher-code {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-primary);
  margin: 4px 0 16px 0;
}
.res-voucher-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.res-voucher-item {
  display: flex;
  flex-direction: column;
}
.voucher-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
}
.voucher-value {
  font-size: 0.95rem;
  color: var(--color-text-main);
}
.res-success-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.btn-whatsapp {
  background-color: #25d366;
  color: #ffffff;
}
.btn-whatsapp:hover {
  background-color: #20ba5a;
}
.mt-3 { margin-top: 14px; }
@media (max-width: 640px) {
  .res-card {
    padding: 24px 18px;
  }
  .res-grid-fields {
    grid-template-columns: 1fr;
  }
  .res-voucher-details {
    grid-template-columns: 1fr;
  }
}`,
    jsTemplate: `(function() {
  function isEditorMode() {
    return !!document.getElementById('__landing-blocks-root') &&
      document.documentElement.getAttribute('data-preview-mode') !== 'true';
  }

  function setupTableWidget(root) {
    if (root.__resTableMounted) return;
    root.__resTableMounted = true;

  function resolveRestaurantSlug(root) {
    var slug = root ? (root.getAttribute('data-restaurant-slug') || '') : '';
    if (slug && slug.indexOf('{{') === -1) return slug;

    var elWithSlug = document.querySelector('[data-restaurant-slug]');
    if (elWithSlug) {
      var s = elWithSlug.getAttribute('data-restaurant-slug');
      if (s && s.indexOf('{{') === -1) return s;
    }

    var pathParts = window.location.pathname.split('/');
    var lIdx = pathParts.indexOf('l');
    if (lIdx !== -1 && pathParts[lIdx + 1]) {
      return pathParts[lIdx + 1];
    }

    try {
      if (window.parent && window.parent !== window && window.parent.location) {
        var pParts = window.parent.location.pathname.split('/');
        var pIdx = pParts.indexOf('l');
        if (pIdx !== -1 && pParts[pIdx + 1]) {
          return pParts[pIdx + 1];
        }
      }
    } catch (_) {}

    return '';
  }
    var slug = resolveRestaurantSlug(root);

    var form = root.querySelector('#resTableForm') || root.querySelector('#resBookingForm');
    var daysRow = root.querySelector('#resDaysRow');
    var dateInput = root.querySelector('#resDateInput');
    var slotsContainer = root.querySelector('#resSlotsContainer');
    var slotsAlert = root.querySelector('#resSlotsAlert');
    var slotsStatusBadge = root.querySelector('#resSlotsStatusBadge');
    var selectedDateIndicator = root.querySelector('#resSelectedDateIndicator');
    var partyPills = root.querySelectorAll('.res-party-pill');
    var customPartyInput = root.querySelector('#resCustomPartyInput');
    var selectedPartySizeInput = root.querySelector('#resSelectedPartySize');
    var selectedTimeInput = root.querySelector('#resSelectedTime');

    var nameInput = root.querySelector('#resNameInput');
    var phoneInput = root.querySelector('#resPhoneInput');
    var emailInput = root.querySelector('#resEmailInput');
    var notesInput = root.querySelector('#resNotesInput');
    var submitBtn = root.querySelector('#resSubmitBtn');
    var btnText = root.querySelector('.res-btn-text');
    var btnSpinner = root.querySelector('.res-btn-spinner');
    var errorBox = root.querySelector('#resErrorBox');
    var successView = root.querySelector('#resSuccessView');

    var voucherCode = root.querySelector('#resVoucherCode');
    var voucherDate = root.querySelector('#resVoucherDate');
    var voucherTime = root.querySelector('#resVoucherTime');
    var voucherGuests = root.querySelector('#resVoucherGuests');
    var voucherName = root.querySelector('#resVoucherName');
    var voucherWaBtn = root.querySelector('#resVoucherWaBtn');
    var newBookingBtn = root.querySelector('#resNewBookingBtn');

    var todayObj = new Date();
    var yyyy = todayObj.getFullYear();
    var mm = String(todayObj.getMonth() + 1).padStart(2, '0');
    var dd = String(todayObj.getDate()).padStart(2, '0');
    var todayStr = yyyy + '-' + mm + '-' + dd;
    var selectedDateVal = todayStr;
    var viewYear = todayObj.getFullYear();
    var viewMonth = todayObj.getMonth();
    var recurringClosedDays = [];
    var datesCache = {};

    var resCalPrevBtn = root.querySelector('#resCalPrevBtn');
    var resCalNextBtn = root.querySelector('#resCalNextBtn');
    var resCalMonthTitle = root.querySelector('#resCalMonthTitle');
    var resSelectedDateText = root.querySelector('#resSelectedDateText');

    if (dateInput) {
      dateInput.value = todayStr;
    }

    var dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    var monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    function formatReadableDate(isoStr) {
      if (!isoStr) return '';
      var parts = isoStr.split('-');
      if (parts.length !== 3) return isoStr;
      var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return dayNames[d.getDay()] + ' ' + parseInt(parts[2], 10) + ' de ' + monthNames[d.getMonth()] + ' de ' + parts[0];
    }

    function renderCalendar(year, month) {
      if (!daysRow) return;
      if (resCalMonthTitle) {
        resCalMonthTitle.textContent = monthNames[month] + ' ' + year;
      }
      if (resCalPrevBtn) {
        resCalPrevBtn.disabled = (year < todayObj.getFullYear() || (year === todayObj.getFullYear() && month <= todayObj.getMonth()));
      }

      var firstDay = new Date(year, month, 1).getDay(); // 0 = Domingo
      var daysInMonth = new Date(year, month + 1, 0).getDate();

      daysRow.innerHTML = '';

      for (var i = 0; i < firstDay; i++) {
        var empty = document.createElement('div');
        empty.className = 'res-cal-empty';
        daysRow.appendChild(empty);
      }

      for (var d = 1; d <= daysInMonth; d++) {
        var dStr = String(d).padStart(2, '0');
        var mStr = String(month + 1).padStart(2, '0');
        var iso = year + '-' + mStr + '-' + dStr;
        var dayDate = new Date(year, month, d);
        var dayOfWeek = dayDate.getDay();

        var isPast = (iso < todayStr);
        var isSelected = (iso === selectedDateVal);
        var isClosed = (recurringClosedDays.indexOf(dayOfWeek) !== -1);
        var isFullyBooked = false;

        var cached = datesCache[iso];
        if (cached) {
          if (cached.isClosed || cached.status === 'CLOSED_RECURRING' || cached.status === 'BLOCKED_DATE') isClosed = true;
          if (cached.isFullyBooked || cached.status === 'FULLY_BOOKED') isFullyBooked = true;
        }

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'res-cal-day res-day-chip';
        btn.setAttribute('data-date', iso);
        btn.setAttribute('role', 'gridcell');

        if (isSelected && !isPast && !isClosed) btn.classList.add('active');
        if (isPast) btn.classList.add('res-day-past');
        else if (isClosed) btn.classList.add('res-day-closed');
        else if (isFullyBooked) btn.classList.add('res-day-busy');

        btn.disabled = (isPast || isClosed || isFullyBooked);

        btn.innerHTML = '<span class="res-cal-day-num">' + d + '</span>' +
          (!isPast ? '<span class="res-cal-day-dot"></span>' : '');

        (function(targetIso, targetDisabled) {
          btn.addEventListener('click', function(e) {
            if (isEditorMode()) return;
            e.preventDefault();
            if (targetDisabled) return;
            selectDate(targetIso);
          });
        })(iso, isPast || isClosed || isFullyBooked);

        daysRow.appendChild(btn);
      }
    }

    function selectDate(dateVal) {
      selectedDateVal = dateVal;
      if (dateInput) dateInput.value = dateVal;
      if (daysRow) {
        var chips = daysRow.querySelectorAll('.res-cal-day');
        chips.forEach(function(c) {
          c.classList.toggle('active', c.getAttribute('data-date') === dateVal);
        });
      }
      if (resSelectedDateText) {
        resSelectedDateText.textContent = formatReadableDate(dateVal);
      }
      if (selectedDateIndicator) {
        selectedDateIndicator.style.display = 'inline-flex';
      }
      if (datesCache[dateVal]) {
        renderDaySlots(datesCache[dateVal]);
      } else {
        fetchAvailability(dateVal);
      }
    }

    if (resCalPrevBtn) {
      resCalPrevBtn.addEventListener('click', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();
        if (viewYear < todayObj.getFullYear() || (viewYear === todayObj.getFullYear() && viewMonth <= todayObj.getMonth())) return;
        viewMonth--;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear--;
        }
        renderCalendar(viewYear, viewMonth);
        fetchMonthAvailability(viewYear, viewMonth);
      });
    }

    if (resCalNextBtn) {
      resCalNextBtn.addEventListener('click', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();
        viewMonth++;
        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear++;
        }
        renderCalendar(viewYear, viewMonth);
        fetchMonthAvailability(viewYear, viewMonth);
      });
    }

    function fetchMonthAvailability(year, month) {
      if (!slug) return;
      var mStr = String(month + 1).padStart(2, '0');
      var lastDay = new Date(year, month + 1, 0).getDate();
      var fromIso = year + '-' + mStr + '-01';
      var toIso = year + '-' + mStr + '-' + String(lastDay).padStart(2, '0');
      if (fromIso < todayStr) fromIso = todayStr;

      var url = '/api/public/landing/' + encodeURIComponent(slug) + '/reservations/availability?from=' + encodeURIComponent(fromIso) + '&to=' + encodeURIComponent(toIso);

      fetch(url)
        .then(function(res) {
          if (!res.ok) {
            return fetch('/api/public/landing/' + encodeURIComponent(slug) + '/reservations/availability?date=' + encodeURIComponent(selectedDateVal))
              .then(function(r) { return r.json(); });
          }
          return res.json();
        })
        .then(function(data) {
          if (!data || !data.success || !data.data) return;
          var payload = data.data;
          if (payload.recurringClosedDays && Array.isArray(payload.recurringClosedDays)) {
            recurringClosedDays = payload.recurringClosedDays;
          }
          var datesList = payload.dates || (payload.availability && payload.availability.dates) || [];
          datesList.forEach(function(d) {
            var norm = normalizeDateObject(d);
            datesCache[norm.date] = norm;
          });
          renderCalendar(viewYear, viewMonth);
          if (datesCache[selectedDateVal]) {
            renderDaySlots(datesCache[selectedDateVal]);
          }
        })
        .catch(function(err) {
          console.warn('Error fetching month availability:', err);
        });
    }

    partyPills.forEach(function(pill) {
      pill.addEventListener('click', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();
        partyPills.forEach(function(p) { p.classList.remove('active'); });
        pill.classList.add('active');
        if (selectedPartySizeInput) selectedPartySizeInput.value = pill.getAttribute('data-party');
        if (customPartyInput) customPartyInput.value = '';
      });
    });

    if (customPartyInput) {
      customPartyInput.addEventListener('input', function() {
        if (isEditorMode()) return;
        var val = parseInt(customPartyInput.value, 10);
        if (val > 0) {
          partyPills.forEach(function(p) { p.classList.remove('active'); });
          if (selectedPartySizeInput) selectedPartySizeInput.value = String(val);
        }
      });
    }

    function fetchAvailability(date) {
      if (!slug) return;
      var dateVal = date || selectedDateVal || todayStr;
      if (!dateVal) return;

      if (slotsContainer) {
        slotsContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--color-text-muted); font-size: 0.9rem;">⏳ Consultando turnos disponibles...</div>';
      }
      if (slotsAlert) slotsAlert.style.display = 'none';
      if (slotsStatusBadge) slotsStatusBadge.textContent = '';

      var url = '/api/public/landing/' + encodeURIComponent(slug) + '/reservations/tables/availability?date=' + encodeURIComponent(dateVal);

      fetch(url)
        .then(function(res) {
          if (!res.ok) {
            return fetch('/api/public/landing/' + encodeURIComponent(slug) + '/reservations/availability?date=' + encodeURIComponent(dateVal))
              .then(function(r) { return r.json(); });
          }
          return res.json();
        })
        .then(function(data) {
          if (!data || !data.success || !data.data) {
            renderSlotsFallback();
            return;
          }
          var payload = data.data;

          if (payload.recurringClosedDays && Array.isArray(payload.recurringClosedDays)) {
            recurringClosedDays = payload.recurringClosedDays;
            renderCalendar(viewYear, viewMonth);
          }

          var datesList = payload.dates || (payload.availability && payload.availability.dates) || [];
          var dayInfo = datesList.find(function(d) { return d.date === dateVal; }) || datesList[0] || null;
          renderDaySlots(dayInfo);
        })
        .catch(function(err) {
          console.warn('Error al consultar disponibilidad:', err);
          renderSlotsFallback();
        });
    }

    function renderSlotsFallback() {
      if (slotsContainer) {
        slotsContainer.innerHTML = [
          '<div class="res-slots-grid">',
          '  <button type="button" class="res-slot-pill active" data-time="20:00">20:00</button>',
          '  <button type="button" class="res-slot-pill" data-time="21:00">21:00</button>',
          '  <button type="button" class="res-slot-pill" data-time="22:00">22:00</button>',
          '</div>'
        ].join('\n');
        if (selectedTimeInput) selectedTimeInput.value = '20:00';
        bindSlotButtons();
      }
    }

    function renderDaySlots(dayInfo) {
      if (!slotsContainer) return;
      if (!dayInfo) {
        slotsContainer.innerHTML = '<div class="res-slots-alert" style="display:block;">No se encontró configuración para la fecha seleccionada.</div>';
        if (selectedTimeInput) selectedTimeInput.value = '';
        return;
      }

      if (dayInfo.status === 'CLOSED_RECURRING') {
        slotsContainer.innerHTML = '<div class="res-slots-alert" style="display:block;">🚫 ' + (dayInfo.reason || 'El restaurante se encuentra cerrado en esta fecha por descanso.') + '</div>';
        if (selectedTimeInput) selectedTimeInput.value = '';
        return;
      }

      if (dayInfo.status === 'BLOCKED_DATE') {
        slotsContainer.innerHTML = '<div class="res-slots-alert" style="display:block;">🚫 ' + (dayInfo.reason || 'Fecha no disponible para reservas.') + '</div>';
        if (selectedTimeInput) selectedTimeInput.value = '';
        return;
      }

      if (dayInfo.status === 'EVENT_EXCLUSIVE') {
        slotsContainer.innerHTML = '<div class="res-slots-alert" style="display:block;">🎟️ Esta fecha está reservada para un evento especial exclusivo. Consultá la sección de eventos.</div>';
        if (selectedTimeInput) selectedTimeInput.value = '';
        return;
      }

      if (dayInfo.status === 'FULLY_BOOKED') {
        slotsContainer.innerHTML = '<div class="res-slots-alert" style="display:block;">⏳ Todos los turnos de este día se encuentran completos. Por favor seleccioná otra fecha.</div>';
        if (selectedTimeInput) selectedTimeInput.value = '';
        return;
      }

      if (dayInfo.status === 'NO_SHIFTS_CONFIGURED') {
        slotsContainer.innerHTML = '<div class="res-slots-alert" style="display:block;">No hay turnos disponibles para esta fecha. Contactanos para consultas directas.</div>';
        if (selectedTimeInput) selectedTimeInput.value = '';
        return;
      }

      var availableSlots = dayInfo.availableSlots || [];
      var occupiedTimes = dayInfo.occupiedTimes || [];
      var allTimes = [];
      var seenTimes = {};

      availableSlots.forEach(function(s) {
        if (!seenTimes[s.time]) {
          seenTimes[s.time] = true;
          allTimes.push({ time: s.time, label: s.label, occupied: false });
        }
      });
      occupiedTimes.forEach(function(t) {
        if (!seenTimes[t]) {
          seenTimes[t] = true;
          allTimes.push({ time: t, label: t, occupied: true });
        } else {
          for (var i = 0; i < allTimes.length; i++) {
            if (allTimes[i].time === t) allTimes[i].occupied = true;
          }
        }
      });

      allTimes.sort(function(a, b) { return a.time.localeCompare(b.time); });

      if (allTimes.length === 0) {
        slotsContainer.innerHTML = '<div class="res-slots-alert" style="display:block;">No hay turnos configurados para este día.</div>';
        if (selectedTimeInput) selectedTimeInput.value = '';
        return;
      }

      var html = ['<div class="res-slots-grid">'];
      var firstFreeSelected = false;

      allTimes.forEach(function(slot) {
        var isOccupied = slot.occupied;
        var isSelected = !isOccupied && !firstFreeSelected;
        if (isSelected) {
          firstFreeSelected = true;
          if (selectedTimeInput) selectedTimeInput.value = slot.time;
        }

        var classes = 'res-slot-pill';
        if (isSelected) classes += ' active';
        if (isOccupied) classes += ' res-slot-busy';

        var disabledAttr = isOccupied ? ' disabled title="Turno ya ocupado"' : '';
        var badge = isOccupied ? ' <span class="slot-badge-busy">Ocupado</span>' : '';

        html.push('  <button type="button" class="' + classes + '" data-time="' + slot.time + '"' + disabledAttr + '>' + slot.time + badge + '</button>');
      });
      html.push('</div>');

      slotsContainer.innerHTML = html.join('\n');
      bindSlotButtons();
    }

    function bindSlotButtons() {
      var slotBtns = slotsContainer ? slotsContainer.querySelectorAll('.res-slot-pill:not(:disabled)') : [];
      slotBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          if (isEditorMode()) return;
          e.preventDefault();
          slotsContainer.querySelectorAll('.res-slot-pill').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          if (selectedTimeInput) selectedTimeInput.value = btn.getAttribute('data-time') || '';
        });
      });
    }

    if (form) {
      form.addEventListener('submit', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();

        if (errorBox) { errorBox.style.display = 'none'; errorBox.textContent = ''; }

        var customerName = nameInput ? nameInput.value.trim() : '';
        var customerPhone = phoneInput ? phoneInput.value.trim() : '';
        var customerEmail = emailInput ? emailInput.value.trim() : '';
        var notes = notesInput ? notesInput.value.trim() : '';
        var date = selectedDateVal || (dateInput ? dateInput.value : '');
        var time = selectedTimeInput ? selectedTimeInput.value : '';
        var partySize = selectedPartySizeInput ? parseInt(selectedPartySizeInput.value, 10) : 2;

        if (!date) {
          showError('Por favor seleccioná una fecha para tu reserva.');
          return;
        }
        if (!time) {
          showError('Por favor seleccioná un turno u horario disponible.');
          return;
        }
        if (!customerName) {
          showError('Por favor ingresá tu nombre completo.');
          return;
        }
        if (!customerPhone) {
          showError('Por favor ingresá un número de WhatsApp o teléfono de contacto.');
          return;
        }

        setLoading(true);

        var payload = {
          customerName: customerName,
          customerPhone: customerPhone,
          customerEmail: customerEmail || undefined,
          partySize: partySize,
          date: date,
          time: time,
          notes: notes || undefined
        };

        fetch('/api/public/landing/' + encodeURIComponent(slug) + '/reservations/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function(res) {
            return res.json().then(function(json) {
              return { status: res.status, ok: res.ok, data: json };
            });
          })
          .then(function(resObj) {
            setLoading(false);
            if (!resObj.ok || !resObj.data.success) {
              var errMsg = (resObj.data && resObj.data.error && resObj.data.error.message)
                ? resObj.data.error.message
                : 'Ocurrió un error al procesar tu reserva. Por favor intentá nuevamente.';
              showError(errMsg);
              if (resObj.status === 409) {
                fetchAvailability(date);
              }
              return;
            }

            var resData = resObj.data.data.reservation;
            showSuccess(resData);
          })
          .catch(function() {
            setLoading(false);
            showError('Error de conexión al enviar la reserva. Verificá tu conexión a internet.');
          });
      });
    }

    function showError(msg) {
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        alert(msg);
      }
    }

    function setLoading(isLoading) {
      if (submitBtn) submitBtn.disabled = isLoading;
      if (btnText) btnText.style.display = isLoading ? 'none' : 'inline';
      if (btnSpinner) btnSpinner.style.display = isLoading ? 'inline' : 'none';
    }

    function showSuccess(reservation) {
      if (form) form.style.display = 'none';

      if (successView) {
        successView.style.display = 'block';
        if (voucherCode) voucherCode.textContent = reservation.code || '#RES-OK';
        if (voucherDate) voucherDate.textContent = reservation.date;
        if (voucherTime) voucherTime.textContent = reservation.time + ' hs';
        if (voucherGuests) voucherGuests.textContent = reservation.partySize + ' personas';
        if (voucherName) voucherName.textContent = reservation.customerName;

        var restaurantName = root.getAttribute('data-restaurant-name') || 'el restaurante';
        var restaurantPhone = root.getAttribute('data-restaurant-phone') || '';
        var waPhone = restaurantPhone.replace(/[^0-9]/g, '');
        var waMsg = encodeURIComponent('¡Hola! Tengo una reserva confirmada en ' + restaurantName + '.\\nCódigo: ' + (reservation.code || '') + '\\nFecha: ' + reservation.date + ' ' + reservation.time + ' hs\\nComensales: ' + reservation.partySize + '\\nA nombre de: ' + reservation.customerName);
        var waUrl = waPhone ? ('https://wa.me/' + waPhone + '?text=' + waMsg) : ('https://wa.me/?text=' + waMsg);
        if (voucherWaBtn) voucherWaBtn.href = waUrl;

        successView.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    if (newBookingBtn) {
      newBookingBtn.addEventListener('click', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();
        if (successView) successView.style.display = 'none';
        if (form) {
          form.reset();
          form.style.display = 'block';
        }
        selectedDateVal = todayStr;
        if (dateInput) dateInput.value = todayStr;
        if (selectedPartySizeInput) selectedPartySizeInput.value = '2';
        partyPills.forEach(function(p) {
          p.classList.toggle('active', p.getAttribute('data-party') === '2');
        });
        renderCalendar(viewYear, viewMonth);
        selectDate(todayStr);
        fetchMonthAvailability(viewYear, viewMonth);
      });
    }

    renderCalendar(viewYear, viewMonth);
    selectDate(todayStr);
    if (!isEditorMode()) {
      fetchMonthAvailability(viewYear, viewMonth);
    }
  }

  function checkAndInit() {
    var sections = document.querySelectorAll('.res-table-section, .reservation-section, #reservas, #reservas-mesa');
    sections.forEach(function(sec) {
      setupTableWidget(sec);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndInit);
  } else {
    checkAndInit();
  }

  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function() {
      if (document.documentElement.getAttribute('data-preview-mode') === 'true') {
        checkAndInit();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-preview-mode'] });
  }
})();`,
  },
  {
    moduleKey: "reservations-booking",
    name: "Reservas de Mesas y Eventos (Unificado)",
    description: "Módulo interactivo completo con selector dual: Reserva de Mesas Regulares en Salón (chips interactivos de 14 días y turnos) y Reserva de Entradas para Eventos Especiales (catas, shows y degustaciones con fecha y cupos exclusivos).",
    category: "contacto",
    fields: [
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "Reservas Online" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "Asegurá tu Mesa" },
      { key: "description", label: "Descripción", type: "textarea", defaultValue: "Elegí entre una reserva de mesa regular en nuestro salón o asegurá tus entradas para nuestros eventos y noches temáticas exclusivas." },
      { key: "tableTabLabel", label: "Pestaña: Mesa regular", type: "text", defaultValue: "Mesa Regular" },
      { key: "eventsTabLabel", label: "Pestaña: Eventos", type: "text", defaultValue: "Eventos Especiales" },
      { key: "partyLabel", label: "Etiqueta: Comensales", type: "text", defaultValue: "¿Cuántas personas?" },
      { key: "dateLabel", label: "Etiqueta: Fecha", type: "text", defaultValue: "Fecha de reserva" },
      { key: "slotsLabel", label: "Etiqueta: Horarios", type: "text", defaultValue: "Turnos disponibles" },
      { key: "nameLabel", label: "Etiqueta: Nombre", type: "text", defaultValue: "Nombre y Apellido" },
      { key: "phoneLabel", label: "Etiqueta: WhatsApp", type: "text", defaultValue: "WhatsApp / Teléfono" },
      { key: "emailLabel", label: "Etiqueta: Email", type: "text", defaultValue: "Email (opcional)" },
      { key: "notesLabel", label: "Etiqueta: Comentarios", type: "text", defaultValue: "Aclaraciones o Preferencias" },
      { key: "notesPlaceholder", label: "Placeholder notas", type: "text", defaultValue: "Alergias, cumpleaños, mesa interior o terraza..." },
      { key: "btnSubmitLabel", label: "Texto botón confirmar", type: "text", defaultValue: "Confirmar Reserva" },
      { key: "policyNotice", label: "Texto aviso / política", type: "text", defaultValue: "Tolerancia máxima de 15 minutos. Ante cancelaciones o modificaciones, por favor contactanos con anticipación." },
      { key: "restaurantPhone", label: "WhatsApp para comprobante", type: "text", defaultValue: "+5491100000000" },
      { key: "successTitle", label: "Título al confirmar", type: "text", defaultValue: "¡Reserva Confirmada!" },
      { key: "successMessage", label: "Mensaje de éxito", type: "textarea", defaultValue: "Hemos registrado tu solicitud exitosamente. Podés guardar este comprobante o enviárnoslo por WhatsApp." },
    ],
    htmlTemplate: `<!-- Reservas de Mesas y Eventos Especiales -->
<section class="section reservation-section res-booking-section" id="reservas" data-restaurant-slug="{{restaurantSlug}}" data-restaurant-name="{{restaurantName}}" data-restaurant-phone="{{restaurantPhone}}">
  <div class="container reservation-container">
    <div class="section-header text-center">
      <span class="section-kicker">{{kicker}}</span>
      <h2 class="section-title">{{title}}</h2>
      <p class="section-description">{{description}}</p>
    </div>

    <!-- Selector de Modo / Pestañas Superiores: Mesas vs Eventos -->
    <div class="res-mode-switch-wrapper">
      <div class="res-mode-switch" role="tablist" aria-label="Tipo de reserva">
        <button type="button" class="res-mode-btn active" id="resModeTableBtn" role="tab" aria-selected="true" data-mode="tables">
          <span class="res-mode-icon">🍽️</span>
          <div class="res-mode-btn-content">
            <span class="res-mode-btn-title">{{tableTabLabel}}</span>
            <span class="res-mode-btn-sub">Salón & Turnos Habituales</span>
          </div>
        </button>
        <button type="button" class="res-mode-btn" id="resModeEventBtn" role="tab" aria-selected="false" data-mode="events">
          <span class="res-mode-icon">🎉</span>
          <div class="res-mode-btn-content">
            <span class="res-mode-btn-title">{{eventsTabLabel}}</span>
            <span class="res-mode-btn-sub">Degustaciones & Shows</span>
          </div>
          <span class="res-mode-counter-badge" id="resEventsCountBadge" style="display: none;">0</span>
        </button>
      </div>
    </div>

    <div class="res-card" id="resCard">

      <!-- ============================================== -->
      <!-- PANEL 1: RESERVA DE MESA REGULAR -->
      <!-- ============================================== -->
      <div class="res-mode-panel active" id="resPanelTable">
        <!-- Banner distintivo visual modo mesa -->
        <div class="res-mode-banner res-mode-banner-table">
          <div class="res-mode-banner-left">
            <span class="res-mode-banner-icon">🍽️</span>
            <div>
              <strong class="res-mode-banner-title">Mesa Regular en Salón</strong>
              <p class="res-mode-banner-desc">Elegí comensales, fecha y turno de servicio habitual para almorzar o cenar.</p>
            </div>
          </div>
          <span class="res-mode-pill-tag tag-table">Salón Regular</span>
        </div>

        <form class="res-form" id="resBookingForm" autocomplete="off">
          <input type="hidden" name="time" id="resSelectedTime" value="" />
          <input type="hidden" name="partySize" id="resSelectedPartySize" value="2" />

          <!-- Paso 1: Comensales -->
          <div class="res-form-step">
            <label class="res-step-label">
              <span class="res-step-num step-num-table">1</span>
              <span>{{partyLabel}}</span>
            </label>
            <div class="res-party-selector" id="resPartyPills">
              <button type="button" class="res-party-pill" data-party="1">1</button>
              <button type="button" class="res-party-pill active" data-party="2">2</button>
              <button type="button" class="res-party-pill" data-party="3">3</button>
              <button type="button" class="res-party-pill" data-party="4">4</button>
              <button type="button" class="res-party-pill" data-party="5">5</button>
              <button type="button" class="res-party-pill" data-party="6">6</button>
              <button type="button" class="res-party-pill" data-party="8">8</button>
              <div class="res-party-custom">
                <input type="number" id="resCustomPartyInput" min="1" max="40" placeholder="+8" aria-label="Otra cantidad de comensales" />
              </div>
            </div>
          </div>

          <!-- Paso 2: Calendario Completo Mensual (Grid D L M M J V S) -->
          <div class="res-form-step">
            <div class="res-step-header">
              <label class="res-step-label">
                <span class="res-step-num step-num-table">2</span>
                <span>{{dateLabel}}</span>
              </label>
              <input type="hidden" id="resDateInput" value="" />
            </div>

            <div class="res-calendar-card" id="resCalendarCard">
              <div class="res-cal-header">
                <button type="button" class="res-cal-nav-btn" id="resCalPrevBtn" aria-label="Mes anterior">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div class="res-cal-month-title" id="resCalMonthTitle">Octubre 2026</div>
                <button type="button" class="res-cal-nav-btn" id="resCalNextBtn" aria-label="Mes siguiente">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              <div class="res-cal-weekdays">
                <span>D</span>
                <span>L</span>
                <span>M</span>
                <span>M</span>
                <span>J</span>
                <span>V</span>
                <span>S</span>
              </div>

              <div class="res-cal-grid res-days-row" id="resDaysRow" role="grid" aria-label="Calendario de reservas">
                <div class="res-cal-empty"></div>
                <div class="res-cal-empty"></div>
                <div class="res-cal-empty"></div>
                <div class="res-cal-empty"></div>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-01"><span class="res-cal-day-num">1</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-02"><span class="res-cal-day-num">2</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-03"><span class="res-cal-day-num">3</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip res-day-closed" data-date="2026-10-04"><span class="res-cal-day-num">4</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-05"><span class="res-cal-day-num">5</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-06"><span class="res-cal-day-num">6</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-07"><span class="res-cal-day-num">7</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-08"><span class="res-cal-day-num">8</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-09"><span class="res-cal-day-num">9</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-10"><span class="res-cal-day-num">10</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip res-day-closed" data-date="2026-10-11"><span class="res-cal-day-num">11</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-12"><span class="res-cal-day-num">12</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-13"><span class="res-cal-day-num">13</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-14"><span class="res-cal-day-num">14</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-15"><span class="res-cal-day-num">15</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-16"><span class="res-cal-day-num">16</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-17"><span class="res-cal-day-num">17</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip res-day-closed" data-date="2026-10-18"><span class="res-cal-day-num">18</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-19"><span class="res-cal-day-num">19</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-20"><span class="res-cal-day-num">20</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-21"><span class="res-cal-day-num">21</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-22"><span class="res-cal-day-num">22</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip active" data-date="2026-10-23"><span class="res-cal-day-num">23</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-24"><span class="res-cal-day-num">24</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip res-day-closed" data-date="2026-10-25"><span class="res-cal-day-num">25</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-26"><span class="res-cal-day-num">26</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-27"><span class="res-cal-day-num">27</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-28"><span class="res-cal-day-num">28</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-29"><span class="res-cal-day-num">29</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-30"><span class="res-cal-day-num">30</span><span class="res-cal-day-dot"></span></button>
                <button type="button" class="res-cal-day res-day-chip" data-date="2026-10-31"><span class="res-cal-day-num">31</span><span class="res-cal-day-dot"></span></button>
              </div>

              <div class="res-cal-footer">
                <div class="res-cal-selected-badge" id="resSelectedDateIndicator">
                  <span class="res-cal-badge-dot"></span>
                  <span id="resSelectedDateText">Viernes 23 de Octubre de 2026</span>
                </div>
                <div class="res-cal-legend">
                  <span class="res-cal-legend-item"><span class="legend-dot available"></span> Libre</span>
                  <span class="res-cal-legend-item"><span class="legend-dot closed"></span> Cerrado</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Paso 3: Horarios / Turnos -->
          <div class="res-form-step">
            <div class="res-step-header">
              <label class="res-step-label">
                <span class="res-step-num step-num-table">3</span>
                <span>{{slotsLabel}}</span>
              </label>
              <span class="res-slots-status-badge" id="resSlotsStatusBadge"></span>
            </div>

            <div class="res-slots-container" id="resSlotsContainer">
              <div class="res-slots-grid" id="resSlotsGrid">
                <button type="button" class="res-slot-pill active" data-time="20:00">20:00 hs</button>
                <button type="button" class="res-slot-pill" data-time="21:00">21:00 hs</button>
                <button type="button" class="res-slot-pill" data-time="22:00">22:00 hs</button>
              </div>
            </div>
            <div class="res-slots-alert" id="resSlotsAlert" style="display: none;"></div>
          </div>

          <!-- Paso 4: Datos del Titular -->
          <div class="res-form-step">
            <label class="res-step-label">
              <span class="res-step-num step-num-table">4</span>
              <span>Datos del Titular</span>
            </label>
            <div class="res-grid-fields">
              <div class="res-field-group">
                <label for="resNameInput">{{nameLabel}} *</label>
                <input type="text" id="resNameInput" class="res-input" placeholder="Ej: Valentina Morales" required />
              </div>
              <div class="res-field-group">
                <label for="resPhoneInput">{{phoneLabel}} *</label>
                <input type="tel" id="resPhoneInput" class="res-input" placeholder="Ej: +54 9 11 1234-5678" required />
              </div>
            </div>
            <div class="res-field-group mt-3">
              <label for="resEmailInput">{{emailLabel}}</label>
              <input type="email" id="resEmailInput" class="res-input" placeholder="tuemail@ejemplo.com" />
            </div>
            <div class="res-field-group mt-3">
              <label for="resNotesInput">{{notesLabel}}</label>
              <textarea id="resNotesInput" class="res-input res-textarea" rows="2" placeholder="{{notesPlaceholder}}"></textarea>
            </div>
          </div>

          <div class="res-error-box" id="resErrorBox" style="display: none;"></div>

          <div class="res-form-actions">
            <p class="res-policy-text">ℹ️ {{policyNotice}}</p>
            <button type="submit" class="btn btn-primary res-submit-btn res-btn-table" id="resSubmitBtn">
              <span class="res-btn-text">🍽️ {{btnSubmitLabel}}</span>
              <span class="res-btn-spinner" style="display: none;">⏳ Procesando reserva de mesa...</span>
            </button>
          </div>
        </form>
      </div>

      <!-- ============================================== -->
      <!-- PANEL 2: EVENTO ESPECIAL -->
      <!-- ============================================== -->
      <div class="res-mode-panel" id="resPanelEvent" style="display: none;">
        <!-- Banner distintivo visual modo evento -->
        <div class="res-mode-banner res-mode-banner-event">
          <div class="res-mode-banner-left">
            <span class="res-mode-banner-icon">🎉</span>
            <div>
              <strong class="res-mode-banner-title">Eventos Especiales & Degustaciones Exclusivas</strong>
              <p class="res-mode-banner-desc">Experiencias con fecha y horario puntual fijos, menú temático y cupos limitados.</p>
            </div>
          </div>
          <span class="res-mode-pill-tag tag-event">Cupo Limitado</span>
        </div>

        <!-- Lista de tarjetas de eventos -->
        <div class="res-events-list" id="resEventsList">
          <p class="res-events-heading">Seleccioná el evento para reservar tus lugares:</p>
          <div class="res-events-cards" id="resEventsCards">
            <!-- Dinámico -->
          </div>
        </div>

        <!-- Estado si no hay eventos activos -->
        <div class="res-events-empty" id="resEventsEmpty" style="display: none;">
          <span class="res-events-empty-icon">🎪</span>
          <h4>No hay eventos especiales programados</h4>
          <p>Actualmente no disponemos de eventos especiales activos en cartelera. Te invitamos a reservar una mesa regular en nuestro salón.</p>
          <button type="button" class="btn btn-outline res-switch-to-table-btn" id="resSwitchToTableBtn">
            🍽️ Ir a Reservar Mesa Regular
          </button>
        </div>

        <!-- Formulario de inscripción al evento seleccionado -->
        <form class="res-form res-event-form" id="resEventForm" style="display: none;" autocomplete="off">
          <input type="hidden" name="eventId" id="resEventSelectedId" value="" />
          <input type="hidden" name="partySize" id="resEventSelectedSpots" value="2" />

          <!-- Tarjeta de evento seleccionado -->
          <div class="res-selected-event-card" id="resSelectedEventCard">
            <div class="res-selected-event-top">
              <span class="res-selected-event-badge">🎟️ EVENTO SELECCIONADO</span>
              <button type="button" class="res-change-event-btn" id="resChangeEventBtn">Cambiar evento ✕</button>
            </div>
            <h3 class="res-selected-event-title" id="resSelectedEventTitle">Cena & Maridaje</h3>
            <p class="res-selected-event-desc" id="resSelectedEventDesc"></p>
            <div class="res-selected-event-meta">
              <div class="res-selected-meta-item">
                <span class="meta-label">📅 Fecha fija:</span>
                <strong class="meta-val" id="resSelectedEventDate">-</strong>
              </div>
              <div class="res-selected-meta-item">
                <span class="meta-label">⏰ Horario de inicio:</span>
                <strong class="meta-val" id="resSelectedEventTime">- hs</strong>
              </div>
              <div class="res-selected-meta-item">
                <span class="meta-label">👥 Cupos disponibles:</span>
                <strong class="meta-val" id="resSelectedEventSpotsLeft">-</strong>
              </div>
              <div class="res-selected-meta-item" id="resSelectedPriceWrapper" style="display: none;">
                <span class="meta-label">💳 Precio / Entrada:</span>
                <strong class="meta-val" id="resSelectedEventPrice">-</strong>
              </div>
            </div>
          </div>

          <!-- Paso 1: Cantidad de Entradas / Cupos -->
          <div class="res-form-step">
            <label class="res-step-label">
              <span class="res-step-num step-num-event">1</span>
              <span>¿Cuántos lugares / entradas deseás reservar?</span>
            </label>
            <div class="res-party-selector" id="resEventSpotsPills">
              <button type="button" class="res-party-pill" data-spots="1">1</button>
              <button type="button" class="res-party-pill active" data-spots="2">2</button>
              <button type="button" class="res-party-pill" data-spots="3">3</button>
              <button type="button" class="res-party-pill" data-spots="4">4</button>
              <button type="button" class="res-party-pill" data-spots="5">5</button>
              <button type="button" class="res-party-pill" data-spots="6">6</button>
            </div>
          </div>

          <!-- Paso 2: Datos de Contacto para el Evento -->
          <div class="res-form-step">
            <label class="res-step-label">
              <span class="res-step-num step-num-event">2</span>
              <span>Datos del Titular de la Entrada</span>
            </label>
            <div class="res-grid-fields">
              <div class="res-field-group">
                <label for="resEventNameInput">Nombre y Apellido *</label>
                <input type="text" id="resEventNameInput" class="res-input" placeholder="Ej: Valentina Morales" required />
              </div>
              <div class="res-field-group">
                <label for="resEventPhoneInput">WhatsApp / Teléfono *</label>
                <input type="tel" id="resEventPhoneInput" class="res-input" placeholder="Ej: +54 9 11 1234-5678" required />
              </div>
            </div>
            <div class="res-field-group mt-3">
              <label for="resEventEmailInput">Email (opcional)</label>
              <input type="email" id="resEventEmailInput" class="res-input" placeholder="tuemail@ejemplo.com" />
            </div>
            <div class="res-field-group mt-3">
              <label for="resEventNotesInput">Preferencias o Aclaraciones (opcional)</label>
              <textarea id="resEventNotesInput" class="res-input res-textarea" rows="2" placeholder="Restricciones alimentarias, celiaquía..."></textarea>
            </div>
          </div>

          <div class="res-error-box" id="resEventErrorBox" style="display: none;"></div>

          <div class="res-form-actions">
            <button type="submit" class="btn btn-primary res-submit-btn res-btn-event" id="resEventSubmitBtn">
              <span class="res-event-btn-text">🎉 Confirmar Reserva de Evento</span>
              <span class="res-event-btn-spinner" style="display: none;">⏳ Asegurando tus lugares...</span>
            </button>
          </div>
        </form>
      </div>

      <!-- ============================================== -->
      <!-- VISTA 3: COMPROBANTE DE CONFIRMACIÓN -->
      <!-- ============================================== -->
      <div class="res-success-view" id="resSuccessView" style="display: none;">
        <div class="res-success-header" id="resSuccessHeader">
          <div class="res-success-icon-badge" id="resSuccessIcon">✓</div>
          <h3 class="res-success-title" id="resSuccessTitle">{{successTitle}}</h3>
          <p class="res-success-desc" id="resSuccessDesc">{{successMessage}}</p>
        </div>

        <div class="res-voucher-card" id="resVoucherCard">
          <div class="res-voucher-badge-type tag-table" id="resVoucherBadgeType">🍽️ Comprobante de Mesa Regular</div>
          <div class="res-voucher-kicker" id="resVoucherKicker">Comprobante de Reserva</div>
          <div class="res-voucher-code" id="resVoucherCode">#RES-0000</div>

          <div class="res-voucher-details">
            <div class="res-voucher-item" id="resVoucherEventItem" style="display: none;">
              <span class="voucher-label">Evento Especial</span>
              <strong class="voucher-value" id="resVoucherEvent">-</strong>
            </div>
            <div class="res-voucher-item">
              <span class="voucher-label">Fecha</span>
              <strong class="voucher-value" id="resVoucherDate">-</strong>
            </div>
            <div class="res-voucher-item">
              <span class="voucher-label" id="resVoucherTimeLabel">Turno / Horario</span>
              <strong class="voucher-value" id="resVoucherTime">-</strong>
            </div>
            <div class="res-voucher-item">
              <span class="voucher-label" id="resVoucherGuestsLabel">Comensales</span>
              <strong class="voucher-value" id="resVoucherGuests">-</strong>
            </div>
            <div class="res-voucher-item">
              <span class="voucher-label">Titular</span>
              <strong class="voucher-value" id="resVoucherName">-</strong>
            </div>
          </div>
        </div>

        <div class="res-success-actions">
          <a href="#" target="_blank" rel="noreferrer" class="btn btn-whatsapp res-voucher-wa-btn" id="resVoucherWaBtn">
            <span>Compartir por WhatsApp</span>
          </a>
          <button type="button" class="btn btn-outline res-new-booking-btn" id="resNewBookingBtn">
            Realizar otra reserva
          </button>
        </div>
      </div>

    </div>
  </div>
</section>`,
    cssTemplate: `.reservation-container { max-width: 780px; margin: 0 auto; }
.res-card { background: var(--color-card-bg, #ffffff); border: 1px solid var(--color-border, #e5e7eb); border-radius: var(--radius-lg, 16px); padding: 36px 32px; box-shadow: var(--shadow-soft, 0 4px 20px rgba(0, 0, 0, 0.05)); }
.res-mode-switch-wrapper { display: flex; justify-content: center; margin-bottom: 24px; }
.res-mode-switch { display: inline-flex; background: rgba(0, 0, 0, 0.04); border: 1px solid var(--color-border, #e5e7eb); border-radius: 14px; padding: 5px; gap: 6px; }
.res-mode-btn { display: flex; align-items: center; gap: 10px; border: none; background: transparent; padding: 10px 20px; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; text-align: left; }
.res-mode-btn:hover { background: rgba(0, 0, 0, 0.04); }
.res-mode-btn.active[data-mode="tables"] { background: var(--color-card-bg, #ffffff); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.res-mode-btn.active[data-mode="tables"] .res-mode-btn-title { color: #059669; }
.res-mode-btn.active[data-mode="events"] { background: var(--color-card-bg, #ffffff); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.res-mode-btn.active[data-mode="events"] .res-mode-btn-title { color: #7c3aed; }
.res-mode-icon { font-size: 1.4rem; line-height: 1; }
.res-mode-btn-content { display: flex; flex-direction: column; }
.res-mode-btn-title { font-size: 0.95rem; font-weight: 800; color: var(--color-text-main, #111827); }
.res-mode-btn-sub { font-size: 0.72rem; font-weight: 500; color: var(--color-text-muted, #6b7280); }
.res-mode-counter-badge { background: #7c3aed; color: #ffffff; font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 9999px; margin-left: 4px; }
.res-mode-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 18px; border-radius: 12px; margin-bottom: 24px; }
.res-mode-banner-table { background: rgba(16, 185, 129, 0.08); border: 1.5px solid rgba(16, 185, 129, 0.28); color: #065f46; }
.res-mode-banner-event { background: rgba(124, 58, 237, 0.08); border: 1.5px solid rgba(124, 58, 237, 0.28); color: #5b21b6; }
.res-mode-banner-left { display: flex; align-items: center; gap: 12px; }
.res-mode-banner-icon { font-size: 1.5rem; line-height: 1; flex-shrink: 0; }
.res-mode-banner-title { display: block; font-size: 0.95rem; font-weight: 800; line-height: 1.3; }
.res-mode-banner-desc { margin: 2px 0 0 0; font-size: 0.8rem; opacity: 0.88; line-height: 1.3; }
.res-mode-pill-tag { border-radius: 9999px; padding: 4px 12px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
.tag-table { background: #10b981; color: #ffffff; }
.tag-event { background: #7c3aed; color: #ffffff; }
.step-num-table { background: #10b981 !important; color: #ffffff !important; }
.step-num-event { background: #7c3aed !important; color: #ffffff !important; }
.res-btn-table { background-color: #10b981; }
.res-btn-table:hover { background-color: #059669; }
.res-btn-event { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; }
.res-btn-event:hover { background: linear-gradient(135deg, #6d28d9, #4338ca); }
.res-events-list { margin-bottom: 16px; }
.res-events-heading { font-size: 0.92rem; font-weight: 700; color: var(--color-text-main, #111827); margin-bottom: 12px; }
.res-events-cards { display: grid; grid-template-columns: 1fr; gap: 14px; }
.res-event-card-item { border: 1.5px solid var(--color-border, #e5e7eb); border-radius: 12px; padding: 18px 20px; background: var(--color-bg, #ffffff); display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: all 0.2s ease; }
.res-event-card-item:hover { border-color: #7c3aed; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.12); transform: translateY(-2px); }
.res-event-card-info { flex: 1; }
.res-event-card-title { font-size: 1.1rem; font-weight: 800; color: var(--color-text-main, #111827); margin-bottom: 4px; }
.res-event-card-desc { font-size: 0.85rem; color: var(--color-text-muted, #6b7280); margin-bottom: 8px; line-height: 1.4; }
.res-event-card-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.78rem; font-weight: 700; }
.meta-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; background: rgba(0, 0, 0, 0.05); color: var(--color-text-main, #111827); }
.meta-chip.spots-free { background: rgba(16, 185, 129, 0.12); color: #065f46; }
.meta-chip.spots-full { background: rgba(239, 68, 68, 0.12); color: #991b1b; }
.res-event-pick-btn { padding: 9px 18px; font-size: 0.88rem; font-weight: 700; border-radius: 8px; border: none; background: #7c3aed; color: #ffffff; cursor: pointer; transition: all 0.15s ease; white-space: nowrap; }
.res-event-pick-btn:hover:not(:disabled) { background: #6d28d9; }
.res-event-pick-btn:disabled { opacity: 0.45; cursor: not-allowed; background: #9ca3af; }
.res-events-empty { text-align: center; padding: 36px 20px; background: rgba(0, 0, 0, 0.02); border-radius: 12px; border: 1px dashed var(--color-border, #e5e7eb); }
.res-events-empty-icon { font-size: 2.5rem; display: block; margin-bottom: 10px; }
.res-events-empty h4 { font-size: 1.1rem; font-weight: 800; margin-bottom: 6px; }
.res-events-empty p { font-size: 0.88rem; color: var(--color-text-muted, #6b7280); max-width: 440px; margin: 0 auto 16px auto; }
.res-switch-to-table-btn { font-size: 0.9rem; font-weight: 700; padding: 8px 16px; border-radius: 8px; }
.res-selected-event-card { background: linear-gradient(135deg, rgba(124, 58, 237, 0.06), rgba(99, 102, 241, 0.06)); border: 1.5px solid rgba(124, 58, 237, 0.35); border-radius: 14px; padding: 20px; margin-bottom: 24px; }
.res-selected-event-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.res-selected-event-badge { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #7c3aed; letter-spacing: 0.05em; }
.res-change-event-btn { border: none; background: transparent; font-size: 0.82rem; font-weight: 700; color: #6b7280; cursor: pointer; }
.res-change-event-btn:hover { color: #dc2626; text-decoration: underline; }
.res-selected-event-title { font-size: 1.25rem; font-weight: 800; color: var(--color-text-main, #111827); margin-bottom: 6px; }
.res-selected-event-desc { font-size: 0.88rem; color: var(--color-text-muted, #6b7280); margin-bottom: 12px; line-height: 1.4; }
.res-selected-event-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; background: rgba(255, 255, 255, 0.7); border-radius: 10px; padding: 12px; border: 1px solid rgba(124, 58, 237, 0.15); }
.res-selected-meta-item { display: flex; flex-direction: column; }
.res-selected-meta-item .meta-label { font-size: 0.72rem; color: #6b7280; text-transform: uppercase; font-weight: 700; }
.res-selected-meta-item .meta-val { font-size: 0.95rem; font-weight: 800; color: #111827; }
.res-form-step { margin-bottom: 28px; }
.res-step-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.res-step-label { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.05rem; color: var(--color-text-main, #111827); margin-bottom: 0; }
.res-step-num { width: 26px; height: 26px; border-radius: 50%; background: var(--color-primary, #10b981); color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.82rem; font-weight: 700; flex-shrink: 0; }
.res-calendar-card {
  background: #101014;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 22px 18px 18px 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  color: #f3f4f6;
  user-select: none;
  margin-top: 8px;
}
.res-cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  padding: 0 4px;
}
.res-cal-month-title {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #ffffff;
  text-transform: capitalize;
}
.res-cal-nav-btn {
  background: #1b1b22;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.res-cal-nav-btn:hover:not(:disabled) {
  background: #272732;
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}
.res-cal-nav-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
  pointer-events: none;
}
.res-cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  text-align: center;
  margin-bottom: 12px;
}
.res-cal-weekdays span {
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.res-cal-grid {
  display: grid !important;
  grid-template-columns: repeat(7, 1fr) !important;
  gap: 8px !important;
  margin-bottom: 16px;
}
.res-cal-empty {
  min-height: 52px;
  visibility: hidden;
}
.res-cal-day,
.res-day-chip {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 52px !important;
  padding: 8px 4px !important;
  border-radius: 14px !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  background: #19191d !important;
  color: #ffffff !important;
  cursor: pointer !important;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
  user-select: none !important;
}
.res-cal-day:hover:not(:disabled),
.res-day-chip:hover:not(:disabled) {
  background: #25252c !important;
  border-color: rgba(255, 255, 255, 0.22) !important;
  transform: translateY(-2px);
}
.res-cal-day-num,
.res-day-num {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 3px;
  color: #ffffff;
}
.res-cal-day-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ea384c;
  display: block;
  transition: background 0.15s ease;
}
/* Día Seleccionado (Estilo Imagen 2: Rojo/Coral Sólido) */
.res-cal-day.active,
.res-day-chip.active {
  background: #ea384c !important;
  color: #ffffff !important;
  border-color: #ea384c !important;
  box-shadow: 0 4px 14px rgba(234, 56, 76, 0.45) !important;
  transform: scale(1.03) !important;
}
.res-cal-day.active .res-cal-day-num,
.res-day-chip.active .res-day-num {
  color: #ffffff !important;
  font-weight: 800;
}
.res-cal-day.active .res-cal-day-dot {
  background: #ffffff !important;
}
/* Días Pasados */
.res-cal-day.res-day-past,
.res-day-chip.res-day-past {
  opacity: 0.18 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
  background: transparent !important;
  border-color: transparent !important;
}
.res-cal-day.res-day-past .res-cal-day-dot {
  display: none !important;
}
/* Días Cerrados (Descanso semanal o Bloqueado) */
.res-cal-day.res-day-closed,
.res-day-chip.res-day-closed {
  opacity: 0.35 !important;
  cursor: not-allowed !important;
  background: #141416 !important;
  text-decoration: line-through !important;
}
.res-cal-day.res-day-closed .res-cal-day-dot {
  background: #64748b !important;
}
/* Días Agotados */
.res-cal-day.res-day-busy,
.res-day-chip.res-day-busy {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
  background: #141416 !important;
}
.res-cal-day.res-day-busy .res-cal-day-dot {
  background: #ef4444 !important;
}

/* Footer del Calendario */
.res-cal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.res-cal-selected-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  font-weight: 700;
  color: #f3f4f6;
  background: rgba(255, 255, 255, 0.06);
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.res-cal-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ea384c;
}
.res-cal-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}
.res-cal-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.legend-dot.available {
  background: #ea384c;
}
.legend-dot.closed {
  background: #64748b;
}

@media (max-width: 480px) {
  .res-calendar-card {
    padding: 14px 10px 14px 10px;
  }
  .res-cal-grid {
    gap: 5px !important;
  }
  .res-cal-day,
  .res-day-chip {
    min-height: 46px !important;
    border-radius: 10px !important;
  }
  .res-cal-day-num,
  .res-day-num {
    font-size: 0.95rem;
  }
  .res-cal-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
.res-selected-date-indicator { margin-top: 6px; font-size: 0.85rem; font-weight: 600; color: #10b981; }
.res-party-selector { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.res-party-pill { border: 1px solid var(--color-border, #e5e7eb); background: var(--color-bg, #ffffff); color: var(--color-text-main, #111827); padding: 8px 18px; border-radius: 9999px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.15s ease; min-width: 44px; text-align: center; }
.res-party-pill:hover { border-color: var(--color-primary, #10b981); color: var(--color-primary, #10b981); }
.res-party-pill.active { background: var(--color-primary, #10b981); color: #ffffff; border-color: var(--color-primary, #10b981); box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12); }
#resPanelEvent .res-party-pill:hover { border-color: #7c3aed; color: #7c3aed; }
#resPanelEvent .res-party-pill.active { background: #7c3aed; border-color: #7c3aed; box-shadow: 0 3px 8px rgba(124, 58, 237, 0.25); }
.res-party-custom input { width: 72px; border: 1px solid var(--color-border, #e5e7eb); border-radius: 9999px; padding: 8px 12px; text-align: center; font-size: 0.95rem; font-weight: 600; background: var(--color-bg, #ffffff); color: var(--color-text-main, #111827); }
.res-slots-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.res-slot-pill { border: 1.5px solid var(--color-border, #e5e7eb); background: var(--color-bg, #ffffff); color: var(--color-text-main, #111827); padding: 10px 22px; border-radius: var(--radius-md, 10px); font-weight: 700; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s ease; }
.res-slot-pill:hover:not(:disabled) { border-color: #10b981; color: #10b981; }
.res-slot-pill.active { background: #10b981; color: #ffffff; border-color: #10b981; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.25); }
.res-slot-pill.res-slot-busy { opacity: 0.45; cursor: not-allowed; text-decoration: line-through; background: rgba(0, 0, 0, 0.03); border-color: transparent; }
.slot-badge-busy { font-size: 0.68rem; text-decoration: none; background: rgba(0, 0, 0, 0.1); padding: 2px 6px; border-radius: 4px; }
.res-slots-alert { padding: 14px 18px; border-radius: var(--radius-md, 10px); background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); color: #b91c1c; font-size: 0.92rem; font-weight: 600; margin-top: 10px; }
.res-grid-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.res-field-group label { display: block; font-size: 0.88rem; font-weight: 600; margin-bottom: 6px; color: var(--color-text-main, #111827); }
.res-input { width: 100%; padding: 11px 14px; border: 1px solid var(--color-border, #e5e7eb); border-radius: var(--radius-md, 10px); background: var(--color-bg, #ffffff); color: var(--color-text-main, #111827); font-size: 0.95rem; font-family: inherit; }
.res-input:focus { outline: none; border-color: var(--color-primary, #10b981); box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); }
#resPanelEvent .res-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15); }
.res-textarea { resize: vertical; }
.res-error-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px 16px; border-radius: var(--radius-md, 10px); font-size: 0.92rem; font-weight: 600; margin-bottom: 20px; }
.res-form-actions { margin-top: 24px; }
.res-policy-text { font-size: 0.82rem; color: var(--color-text-muted, #6b7280); line-height: 1.5; margin-bottom: 16px; }
.res-submit-btn { width: 100%; padding: 14px 24px; font-size: 1.05rem; font-weight: 700; border-radius: var(--radius-md, 10px); cursor: pointer; border: none; }
.res-success-view { text-align: center; padding: 20px 0; }
.res-success-icon-badge { width: 64px; height: 64px; background: #10b981; color: #ffffff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; margin-bottom: 16px; }
.res-success-icon-badge.is-event-icon { background: linear-gradient(135deg, #7c3aed, #4f46e5); }
.res-success-title { font-size: 1.8rem; margin-bottom: 8px; }
.res-success-desc { color: var(--color-text-muted, #6b7280); font-size: 0.98rem; max-width: 500px; margin: 0 auto 24px auto; }
.res-voucher-card { background: var(--color-bg, #fafafa); border: 2px dashed var(--color-border, #e5e7eb); border-radius: var(--radius-lg, 16px); padding: 24px; max-width: 480px; margin: 0 auto 28px auto; text-align: left; }
.res-voucher-card.is-event-voucher { border-color: #8b5cf6; background: linear-gradient(135deg, rgba(124, 58, 237, 0.04), rgba(79, 70, 229, 0.04)); }
.res-voucher-badge-type { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; margin-bottom: 12px; }
.res-voucher-badge-type.tag-table { background: rgba(16, 185, 129, 0.15); color: #065f46; }
.res-voucher-badge-type.tag-event { background: rgba(124, 58, 237, 0.15); color: #5b21b6; }
.res-voucher-kicker { font-size: 0.75rem; text-transform: uppercase; font-weight: 800; color: var(--color-text-muted, #6b7280); letter-spacing: 0.05em; }
.res-voucher-code { font-size: 1.5rem; font-weight: 800; color: #10b981; margin: 4px 0 16px 0; }
.res-voucher-card.is-event-voucher .res-voucher-code { color: #7c3aed; }
.res-voucher-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.res-voucher-item { display: flex; flex-direction: column; }
.voucher-label { font-size: 0.75rem; color: var(--color-text-muted, #6b7280); text-transform: uppercase; font-weight: 600; }
.voucher-value { font-size: 0.95rem; color: var(--color-text-main, #111827); }
.res-success-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.btn-whatsapp { background-color: #25d366; color: #ffffff; }
.btn-whatsapp:hover { background-color: #20ba5a; }
.mt-3 { margin-top: 14px; }
@media (max-width: 640px) {
  .res-card { padding: 24px 18px; }
  .res-mode-btn-sub { display: none; }
  .res-grid-fields { grid-template-columns: 1fr; }
  .res-voucher-details { grid-template-columns: 1fr; }
  .res-event-card-item { flex-direction: column; align-items: flex-start; }
  .res-event-pick-btn { width: 100%; text-align: center; }
}`,
    jsTemplate: `(function() {
  function resolveRestaurantSlug(root) {
    var slug = root ? (root.getAttribute('data-restaurant-slug') || '') : '';
    if (slug && slug.indexOf('{{') === -1) return slug;

    var elWithSlug = document.querySelector('[data-restaurant-slug]');
    if (elWithSlug) {
      var s = elWithSlug.getAttribute('data-restaurant-slug');
      if (s && s.indexOf('{{') === -1) return s;
    }

    var pathParts = window.location.pathname.split('/');
    var lIdx = pathParts.indexOf('l');
    if (lIdx !== -1 && pathParts[lIdx + 1]) {
      return pathParts[lIdx + 1];
    }

    try {
      if (window.parent && window.parent !== window && window.parent.location) {
        var pParts = window.parent.location.pathname.split('/');
        var pIdx = pParts.indexOf('l');
        if (pIdx !== -1 && pParts[pIdx + 1]) {
          return pParts[pIdx + 1];
        }
      }
    } catch (_) {}

    return '';
  }

  function normalizeDateObject(d) {
    var isClosed = !d.available || d.status === 'CLOSED' || d.status === 'BLOCKED' || Boolean(d.isClosed);
    var isFullyBooked = d.status === 'FULLY_BOOKED';

    var slots = [];
    if (Array.isArray(d.slots)) {
      slots = d.slots;
    } else if (Array.isArray(d.availableSlots)) {
      d.availableSlots.forEach(function(s) {
        slots.push({
          id: s.id,
          time: s.time,
          label: s.label || '',
          available: true
        });
      });
      if (Array.isArray(d.occupiedTimes)) {
        d.occupiedTimes.forEach(function(t) {
          slots.push({
            time: t,
            label: 'Ocupado',
            available: false
          });
        });
      }
      slots.sort(function(a, b) { return a.time.localeCompare(b.time); });
    }

    if (slots.length > 0 && !isClosed) {
      var freeCount = slots.filter(function(s) { return s.available; }).length;
      if (freeCount === 0) isFullyBooked = true;
    }

    return {
      date: d.date,
      dayOfWeek: d.dayOfWeek,
      available: !isClosed && !isFullyBooked,
      isClosed: isClosed,
      isFullyBooked: isFullyBooked,
      closureReason: d.reason || d.closureReason || (isClosed ? 'Día de descanso' : null),
      slots: slots,
      totalSlots: slots.length
    };
  }

  function generateFallbackDates() {
    var dates = [];
    var today = new Date();
    for (var i = 0; i < 14; i++) {
      var d = new Date(today);
      d.setDate(today.getDate() + i);
      var iso = d.toISOString().split('T')[0];
      var isSun = d.getDay() === 0;
      dates.push({
        date: iso,
        dayOfWeek: d.getDay(),
        available: !isSun,
        isClosed: isSun,
        isFullyBooked: false,
        closureReason: isSun ? 'Cerrado por descanso' : null,
        slots: isSun ? [] : [
          { time: '20:00', available: true, label: 'Cena' },
          { time: '21:00', available: true, label: 'Cena' },
          { time: '22:00', available: true, label: 'Cena' }
        ],
        totalSlots: 3
      });
    }
    return dates;
  }

  function setupUnifiedWidget(root) {
    if (!root) return;

    var currentMode = 'tables';
    var availabilityDates = [];
    var eventsList = [];
    var selectedDateStr = '';
    var selectedTimeStr = '';
    var selectedPartySize = 2;
    var selectedEventObj = null;
    var selectedEventSpots = 2;

    var modeTableBtn = root.querySelector('#resModeTableBtn');
    var modeEventBtn = root.querySelector('#resModeEventBtn');
    var eventsCountBadge = root.querySelector('#resEventsCountBadge');
    var panelTable = root.querySelector('#resPanelTable');
    var panelEvent = root.querySelector('#resPanelEvent');

    var tableForm = root.querySelector('#resBookingForm');
    var daysRow = root.querySelector('#resDaysRow');
    var hiddenDatePicker = root.querySelector('#resDateInput');
    var dateIndicator = root.querySelector('#resSelectedDateIndicator');
    var slotsContainer = root.querySelector('#resSlotsContainer');
    var slotsStatusBadge = root.querySelector('#resSlotsStatusBadge');
    var selectedTimeInput = root.querySelector('#resSelectedTime');
    var selectedPartySizeInput = root.querySelector('#resSelectedPartySize');
    var partyPills = root.querySelectorAll('#resPartyPills .res-party-pill');
    var customPartyInput = root.querySelector('#resCustomPartyInput');
    var tableSubmitBtn = root.querySelector('#resSubmitBtn');
    var tableErrorBox = root.querySelector('#resErrorBox');

    var eventsCardsContainer = root.querySelector('#resEventsCards');
    var eventsEmptyState = root.querySelector('#resEventsEmpty');
    var eventsListSection = root.querySelector('#resEventsList');
    var eventForm = root.querySelector('#resEventForm');
    var eventSelectedIdInput = root.querySelector('#resEventSelectedId');
    var eventSelectedSpotsInput = root.querySelector('#resEventSelectedSpots');
    var eventSpotsPills = root.querySelectorAll('#resEventSpotsPills .res-party-pill');
    var changeEventBtn = root.querySelector('#resChangeEventBtn');
    var switchToTableBtn = root.querySelector('#resSwitchToTableBtn');
    var eventSubmitBtn = root.querySelector('#resEventSubmitBtn');
    var eventErrorBox = root.querySelector('#resEventErrorBox');

    var successView = root.querySelector('#resSuccessView');
    var successIcon = root.querySelector('#resSuccessIcon');
    var voucherCard = root.querySelector('#resVoucherCard');
    var voucherBadgeType = root.querySelector('#resVoucherBadgeType');
    var voucherCode = root.querySelector('#resVoucherCode');
    var voucherEventItem = root.querySelector('#resVoucherEventItem');
    var voucherEvent = root.querySelector('#resVoucherEvent');
    var voucherDate = root.querySelector('#resVoucherDate');
    var voucherTimeLabel = root.querySelector('#resVoucherTimeLabel');
    var voucherTime = root.querySelector('#resVoucherTime');
    var voucherGuestsLabel = root.querySelector('#resVoucherGuestsLabel');
    var voucherGuests = root.querySelector('#resVoucherGuests');
    var voucherName = root.querySelector('#resVoucherName');
    var voucherWaBtn = root.querySelector('#resVoucherWaBtn');
    var newBookingBtn = root.querySelector('#resNewBookingBtn');

    function switchMode(newMode) {
      currentMode = newMode;
      if (modeTableBtn) {
        modeTableBtn.classList.toggle('active', newMode === 'tables');
        modeTableBtn.setAttribute('aria-selected', newMode === 'tables' ? 'true' : 'false');
      }
      if (modeEventBtn) {
        modeEventBtn.classList.toggle('active', newMode === 'events');
        modeEventBtn.setAttribute('aria-selected', newMode === 'events' ? 'true' : 'false');
      }
      if (panelTable) panelTable.style.display = newMode === 'tables' ? 'block' : 'none';
      if (panelEvent) panelEvent.style.display = newMode === 'events' ? 'block' : 'none';

      if (newMode === 'events') {
        if (!eventsList || eventsList.length === 0) {
          if (eventsEmptyState) eventsEmptyState.style.display = 'block';
          if (eventsListSection) eventsListSection.style.display = 'block';
          if (eventForm) eventForm.style.display = 'none';
        } else if (!selectedEventObj) {
          if (eventsListSection) eventsListSection.style.display = 'block';
          if (eventForm) eventForm.style.display = 'none';
        }
      }

      if (successView) successView.style.display = 'none';
      if (tableErrorBox) tableErrorBox.style.display = 'none';
      if (eventErrorBox) eventErrorBox.style.display = 'none';
    }

    if (modeTableBtn) {
      modeTableBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        switchMode('tables');
      });
    }

    if (modeEventBtn) {
      modeEventBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        switchMode('events');
      });
    }

    if (switchToTableBtn) {
      switchToTableBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        switchMode('tables');
      });
    }

    partyPills.forEach(function(pill) {
      pill.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var size = this.getAttribute('data-party');
        selectedPartySize = parseInt(size, 10);
        if (selectedPartySizeInput) selectedPartySizeInput.value = size;
        partyPills.forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
        if (customPartyInput) customPartyInput.value = '';
      });
    });

    if (customPartyInput) {
      customPartyInput.addEventListener('input', function() {
        var val = parseInt(this.value, 10);
        if (val && val > 0) {
          selectedPartySize = val;
          if (selectedPartySizeInput) selectedPartySizeInput.value = String(val);
          partyPills.forEach(function(p) { p.classList.remove('active'); });
        }
      });
    }

    eventSpotsPills.forEach(function(pill) {
      pill.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var spots = this.getAttribute('data-spots');
        selectedEventSpots = parseInt(spots, 10);
        if (eventSelectedSpotsInput) eventSelectedSpotsInput.value = spots;
        eventSpotsPills.forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
      });
    });

    if (changeEventBtn) {
      changeEventBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        selectedEventObj = null;
        if (eventForm) eventForm.style.display = 'none';
        if (eventsListSection) eventsListSection.style.display = 'block';
      });
    }

    var resCalPrevBtn = root.querySelector('#resCalPrevBtn');
    var resCalNextBtn = root.querySelector('#resCalNextBtn');
    var resCalMonthTitle = root.querySelector('#resCalMonthTitle');
    var resSelectedDateText = root.querySelector('#resSelectedDateText');

    var todayObj = new Date();
    var yyyy = todayObj.getFullYear();
    var mm = String(todayObj.getMonth() + 1).padStart(2, '0');
    var dd = String(todayObj.getDate()).padStart(2, '0');
    var todayStr = yyyy + '-' + mm + '-' + dd;
    var viewYear = todayObj.getFullYear();
    var viewMonth = todayObj.getMonth();
    var recurringClosedDays = [];
    var datesCache = {};

    selectedDateStr = todayStr;
    if (hiddenDatePicker) {
      hiddenDatePicker.value = todayStr;
    }

    var dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    var monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    function formatReadableDate(isoStr) {
      if (!isoStr) return '';
      var parts = isoStr.split('-');
      if (parts.length !== 3) return isoStr;
      var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return dayNames[d.getDay()] + ' ' + parseInt(parts[2], 10) + ' de ' + monthNames[d.getMonth()] + ' de ' + parts[0];
    }

    function renderCalendar(year, month) {
      if (!daysRow) return;
      if (resCalMonthTitle) {
        resCalMonthTitle.textContent = monthNames[month] + ' ' + year;
      }
      if (resCalPrevBtn) {
        resCalPrevBtn.disabled = (year < todayObj.getFullYear() || (year === todayObj.getFullYear() && month <= todayObj.getMonth()));
      }

      var firstDay = new Date(year, month, 1).getDay(); // 0 = Domingo
      var daysInMonth = new Date(year, month + 1, 0).getDate();

      daysRow.innerHTML = '';

      for (var i = 0; i < firstDay; i++) {
        var empty = document.createElement('div');
        empty.className = 'res-cal-empty';
        daysRow.appendChild(empty);
      }

      for (var d = 1; d <= daysInMonth; d++) {
        var dStr = String(d).padStart(2, '0');
        var mStr = String(month + 1).padStart(2, '0');
        var iso = year + '-' + mStr + '-' + dStr;
        var dayDate = new Date(year, month, d);
        var dayOfWeek = dayDate.getDay();

        var isPast = (iso < todayStr);
        var isSelected = (iso === selectedDateStr);
        var isClosed = (recurringClosedDays.indexOf(dayOfWeek) !== -1);
        var isFullyBooked = false;

        var cached = datesCache[iso];
        if (cached) {
          if (cached.isClosed || cached.status === 'CLOSED_RECURRING' || cached.status === 'BLOCKED_DATE') isClosed = true;
          if (cached.isFullyBooked || cached.status === 'FULLY_BOOKED') isFullyBooked = true;
        }

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'res-cal-day res-day-chip';
        btn.setAttribute('data-date', iso);
        btn.setAttribute('role', 'gridcell');

        if (isSelected && !isPast && !isClosed) btn.classList.add('active');
        if (isPast) btn.classList.add('res-day-past');
        else if (isClosed) btn.classList.add('res-day-closed');
        else if (isFullyBooked) btn.classList.add('res-day-busy');

        btn.disabled = (isPast || isClosed || isFullyBooked);

        btn.innerHTML = '<span class="res-cal-day-num">' + d + '</span>' +
          (!isPast ? '<span class="res-cal-day-dot"></span>' : '');

        (function(targetIso, targetDisabled) {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (targetDisabled) return;
            selectDate(targetIso);
          });
        })(iso, isPast || isClosed || isFullyBooked);

        daysRow.appendChild(btn);
      }
    }

    function selectDate(dateStr) {
      selectedDateStr = dateStr;
      if (hiddenDatePicker) hiddenDatePicker.value = dateStr;

      var chips = daysRow ? daysRow.querySelectorAll('.res-cal-day') : [];
      chips.forEach(function(c) {
        var match = c.getAttribute('data-date') === dateStr;
        c.classList.toggle('active', match);
      });

      if (resSelectedDateText) {
        resSelectedDateText.textContent = formatReadableDate(dateStr);
      }
      if (dateIndicator) {
        dateIndicator.style.display = 'inline-flex';
      }

      var matchDateObj = datesCache[dateStr] || availabilityDates.find(function(item) { return item.date === dateStr; });
      if (matchDateObj) {
        renderSlots(matchDateObj);
      } else {
        fetchSingleDateSlots(dateStr);
      }
    }

    if (resCalPrevBtn) {
      resCalPrevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (viewYear < todayObj.getFullYear() || (viewYear === todayObj.getFullYear() && viewMonth <= todayObj.getMonth())) return;
        viewMonth--;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear--;
        }
        renderCalendar(viewYear, viewMonth);
        fetchMonthAvailability(viewYear, viewMonth);
      });
    }

    if (resCalNextBtn) {
      resCalNextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        viewMonth++;
        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear++;
        }
        renderCalendar(viewYear, viewMonth);
        fetchMonthAvailability(viewYear, viewMonth);
      });
    }

    function fetchSingleDateSlots(dateStr) {
      var slug = resolveRestaurantSlug(root);
      if (!slug) return;
      var url = '/api/public/landing/' + encodeURIComponent(slug) + '/reservations/tables/availability?date=' + encodeURIComponent(dateStr);
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data || !data.success || !data.data) return;
          var datesList = data.data.dates || [];
          var dayInfo = datesList.find(function(d) { return d.date === dateStr; }) || datesList[0];
          if (dayInfo) {
            var norm = normalizeDateObject(dayInfo);
            datesCache[norm.date] = norm;
            renderSlots(norm);
          }
        })
        .catch(function(err) {
          console.warn('Error fetching single date slots:', err);
        });
    }

    function renderSlots(dateObj) {
      if (!slotsContainer) return;

      var slotsAlert = root.querySelector('#resSlotsAlert');

      if (dateObj.isClosed) {
        slotsContainer.style.display = 'none';
        if (slotsAlert) {
          slotsAlert.textContent = 'El restaurante se encuentra cerrado en esta fecha: ' + (dateObj.closureReason || 'Día de descanso');
          slotsAlert.style.display = 'block';
        }
        if (slotsStatusBadge) slotsStatusBadge.textContent = 'Cerrado';
        selectedTimeStr = '';
        if (selectedTimeInput) selectedTimeInput.value = '';
        return;
      }

      if (dateObj.isFullyBooked) {
        slotsContainer.style.display = 'none';
        if (slotsAlert) {
          slotsAlert.textContent = 'Todos los turnos de este día ya han sido reservados. Por favor seleccioná otra fecha.';
          slotsAlert.style.display = 'block';
        }
        if (slotsStatusBadge) slotsStatusBadge.textContent = 'Agotado';
        selectedTimeStr = '';
        if (selectedTimeInput) selectedTimeInput.value = '';
        return;
      }

      var slots = dateObj.slots || [];
      if (slots.length === 0) {
        slotsContainer.style.display = 'none';
        if (slotsAlert) {
          slotsAlert.textContent = 'No hay turnos configurados para este día.';
          slotsAlert.style.display = 'block';
        }
        if (slotsStatusBadge) slotsStatusBadge.textContent = 'Sin turnos';
        selectedTimeStr = '';
        if (selectedTimeInput) selectedTimeInput.value = '';
        return;
      }

      if (slotsAlert) slotsAlert.style.display = 'none';
      slotsContainer.style.display = 'block';

      var availableCount = slots.filter(function(s) { return s.available; }).length;
      if (slotsStatusBadge) {
        slotsStatusBadge.textContent = availableCount > 0 ? (availableCount + ' horarios libres') : 'Agotado';
      }

      var gridHtml = '<div class="res-slots-grid" id="resSlotsGrid">';
      var firstFreeSlot = '';

      slots.forEach(function(s) {
        if (s.available) {
          if (!firstFreeSlot) firstFreeSlot = s.time;
          gridHtml += '<button type="button" class="res-slot-pill" data-time="' + s.time + '">' + s.time + ' hs</button>';
        } else {
          gridHtml += '<button type="button" class="res-slot-pill res-slot-busy" disabled data-time="' + s.time + '" title="Horario ya reservado">' + s.time + ' hs <span class="slot-badge-busy">Ocupado</span></button>';
        }
      });
      gridHtml += '</div>';
      slotsContainer.innerHTML = gridHtml;

      var slotPills = slotsContainer.querySelectorAll('.res-slot-pill:not(.res-slot-busy)');
      slotPills.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var t = this.getAttribute('data-time');
          selectSlot(t);
        });
      });

      if (firstFreeSlot) {
        selectSlot(firstFreeSlot);
      } else {
        selectedTimeStr = '';
        if (selectedTimeInput) selectedTimeInput.value = '';
      }
    }

    function selectSlot(timeStr) {
      selectedTimeStr = timeStr;
      if (selectedTimeInput) selectedTimeInput.value = timeStr;
      var pills = slotsContainer ? slotsContainer.querySelectorAll('.res-slot-pill') : [];
      pills.forEach(function(p) {
        p.classList.toggle('active', p.getAttribute('data-time') === timeStr);
      });
    }

    function renderEvents(events) {
      eventsList = events || [];
      if (eventsCountBadge) {
        if (eventsList.length > 0) {
          eventsCountBadge.textContent = String(eventsList.length);
          eventsCountBadge.style.display = 'inline-block';
        } else {
          eventsCountBadge.style.display = 'none';
        }
      }

      if (!eventsCardsContainer) return;

      if (eventsList.length === 0) {
        if (eventsEmptyState) eventsEmptyState.style.display = 'block';
        if (eventsListSection) eventsListSection.style.display = 'block';
        eventsCardsContainer.innerHTML = '';
        return;
      }

      if (eventsEmptyState) eventsEmptyState.style.display = 'none';
      if (eventsListSection) eventsListSection.style.display = 'block';

      var cardsHtml = '';
      eventsList.forEach(function(ev) {
        var isSoldOut = Boolean(ev.isSoldOut) || (ev.availableSpots !== undefined && ev.availableSpots <= 0);
        var spotsText = isSoldOut ? 'Agotado' : ((ev.availableSpots !== undefined ? ev.availableSpots : (ev.maxCapacity || 'Cupos')) + ' disponibles');

        cardsHtml += '<div class="res-event-card-item">' +
          '<div class="res-event-card-info">' +
            '<h4 class="res-event-card-title">' + (ev.title || 'Evento Especial') + '</h4>' +
            '<p class="res-event-card-desc">' + (ev.description || 'Experiencia temática exclusiva con menú y propuesta de autor.') + '</p>' +
            '<div class="res-event-card-meta">' +
              '<span class="meta-chip">📅 ' + ev.date + '</span>' +
              '<span class="meta-chip">⏰ ' + ev.time + ' hs</span>' +
              (ev.price ? ('<span class="meta-chip">💳 ' + ev.price + '</span>') : '') +
              '<span class="meta-chip ' + (isSoldOut ? 'spots-full' : 'spots-free') + '">👥 ' + spotsText + '</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="res-event-pick-btn" data-event-id="' + ev.id + '" ' + (isSoldOut ? 'disabled' : '') + '>' +
            (isSoldOut ? 'Agotado' : 'Elegir este Evento →') +
          '</button>' +
        '</div>';
      });

      eventsCardsContainer.innerHTML = cardsHtml;

      var pickBtns = eventsCardsContainer.querySelectorAll('.res-event-pick-btn');
      pickBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var evId = this.getAttribute('data-event-id');
          var evObj = eventsList.find(function(item) { return item.id === evId; });
          if (evObj) {
            selectEvent(evObj);
          }
        });
      });
    }

    function selectEvent(evObj) {
      selectedEventObj = evObj;
      if (eventsListSection) eventsListSection.style.display = 'none';
      if (eventForm) eventForm.style.display = 'block';

      if (eventSelectedIdInput) eventSelectedIdInput.value = evObj.id;
      var titleEl = root.querySelector('#resSelectedEventTitle');
      var descEl = root.querySelector('#resSelectedEventDesc');
      var dateEl = root.querySelector('#resSelectedEventDate');
      var timeEl = root.querySelector('#resSelectedEventTime');
      var spotsEl = root.querySelector('#resSelectedEventSpotsLeft');
      var priceEl = root.querySelector('#resSelectedEventPrice');
      var priceWrapper = root.querySelector('#resSelectedPriceWrapper');

      if (titleEl) titleEl.textContent = evObj.title || 'Evento Especial';
      if (descEl) descEl.textContent = evObj.description || '';
      if (dateEl) dateEl.textContent = evObj.date;
      if (timeEl) timeEl.textContent = evObj.time + ' hs';
      if (spotsEl) spotsEl.textContent = (evObj.availableSpots !== undefined ? evObj.availableSpots : evObj.maxCapacity) + ' lugares restantes';

      if (priceWrapper && priceEl) {
        if (evObj.price) {
          priceEl.textContent = evObj.price;
          priceWrapper.style.display = 'flex';
        } else {
          priceWrapper.style.display = 'none';
        }
      }

      var maxSpots = evObj.availableSpots !== undefined ? evObj.availableSpots : 6;
      eventSpotsPills.forEach(function(pill) {
        var num = parseInt(pill.getAttribute('data-spots') || '1', 10);
        if (num > maxSpots) {
          pill.style.display = 'none';
        } else {
          pill.style.display = 'inline-block';
        }
      });

      var defaultSpots = maxSpots >= 2 ? 2 : 1;
      selectedEventSpots = defaultSpots;
      if (eventSelectedSpotsInput) eventSelectedSpotsInput.value = String(defaultSpots);
      eventSpotsPills.forEach(function(pill) {
        pill.classList.toggle('active', pill.getAttribute('data-spots') === String(defaultSpots));
      });

      eventForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function fetchMonthAvailability(year, month) {
      var slug = resolveRestaurantSlug(root);
      if (!slug) {
        renderCalendar(viewYear, viewMonth);
        return;
      }

      var mStr = String(month + 1).padStart(2, '0');
      var lastDay = new Date(year, month + 1, 0).getDate();
      var fromIso = year + '-' + mStr + '-01';
      var toIso = year + '-' + mStr + '-' + String(lastDay).padStart(2, '0');
      if (fromIso < todayStr) fromIso = todayStr;

      var url = '/api/public/landing/' + encodeURIComponent(slug) + '/reservations/availability?from=' + encodeURIComponent(fromIso) + '&to=' + encodeURIComponent(toIso);
      fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data && data.success && data.data) {
            var payload = data.data;
            if (payload.recurringClosedDays && Array.isArray(payload.recurringClosedDays)) {
              recurringClosedDays = payload.recurringClosedDays;
            }
            var rawDates = payload.dates || [];
            rawDates.forEach(function(d) {
              var norm = normalizeDateObject(d);
              datesCache[norm.date] = norm;
            });
            availabilityDates = Object.values(datesCache);

            renderCalendar(viewYear, viewMonth);

            if (datesCache[selectedDateStr]) {
              renderSlots(datesCache[selectedDateStr]);
            }

            var events = payload.events || [];
            renderEvents(events);
          } else {
            renderCalendar(viewYear, viewMonth);
          }
        })
        .catch(function(err) {
          console.warn('No se pudo cargar disponibilidad:', err);
          renderCalendar(viewYear, viewMonth);
        });
    }

    function fetchAvailability() {
      fetchMonthAvailability(viewYear, viewMonth);
    }

    // Submit Table Reservation
    if (tableForm) {
      tableForm.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (tableErrorBox) tableErrorBox.style.display = 'none';

        var slug = resolveRestaurantSlug(root);
        if (!slug) {
          showTableError('No se pudo identificar el restaurante para procesar la reserva.');
          return;
        }

        if (!selectedDateStr) {
          showTableError('Por favor seleccioná una fecha en el calendario.');
          return;
        }

        if (!selectedTimeStr) {
          showTableError('Por favor seleccioná un turno / horario disponible.');
          return;
        }

        var nameVal = (root.querySelector('#resNameInput').value || '').trim();
        var phoneVal = (root.querySelector('#resPhoneInput').value || '').trim();
        var emailVal = (root.querySelector('#resEmailInput').value || '').trim();
        var notesVal = (root.querySelector('#resNotesInput').value || '').trim();

        if (!nameVal || !phoneVal) {
          showTableError('Nombre y teléfono de WhatsApp son requeridos.');
          return;
        }

        setTableLoading(true);

        var payload = {
          date: selectedDateStr,
          time: selectedTimeStr,
          partySize: selectedPartySize,
          customerName: nameVal,
          customerPhone: phoneVal,
          customerEmail: emailVal || undefined,
          notes: notesVal || undefined,
        };

        var postUrl = '/api/public/landing/' + encodeURIComponent(slug) + '/reservations/tables';

        fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function(res) {
            return res.json().then(function(data) { return { status: res.status, data: data }; });
          })
          .then(function(resObj) {
            setTableLoading(false);
            if (!resObj.data.success) {
              var errMsg = resObj.data.error ? resObj.data.error.message : 'Error al procesar tu reserva de mesa.';
              showTableError(errMsg);
              if (resObj.status === 409) {
                fetchAvailability();
              }
              return;
            }

            var resData = resObj.data.data.reservation;
            showTableSuccess(resData);
          })
          .catch(function() {
            setTableLoading(false);
            showTableError('Error de conexión al enviar la reserva. Verificá tu conexión a internet.');
          });
      });
    }

    // Submit Event Reservation
    if (eventForm) {
      eventForm.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (eventErrorBox) eventErrorBox.style.display = 'none';

        var slug = resolveRestaurantSlug(root);
        if (!slug) {
          showEventError('No se pudo identificar el restaurante para procesar la reserva.');
          return;
        }

        if (!selectedEventObj) {
          showEventError('No se ha seleccionado ningún evento.');
          return;
        }

        var nameVal = (root.querySelector('#resEventNameInput').value || '').trim();
        var phoneVal = (root.querySelector('#resEventPhoneInput').value || '').trim();
        var emailVal = (root.querySelector('#resEventEmailInput').value || '').trim();
        var notesVal = (root.querySelector('#resEventNotesInput').value || '').trim();

        if (!nameVal || !phoneVal) {
          showEventError('Nombre y teléfono de WhatsApp son requeridos.');
          return;
        }

        setEventLoading(true);

        var payload = {
          eventId: selectedEventObj.id,
          partySize: selectedEventSpots,
          customerName: nameVal,
          customerPhone: phoneVal,
          customerEmail: emailVal || undefined,
          notes: notesVal || undefined,
        };

        var postUrl = '/api/public/landing/' + encodeURIComponent(slug) + '/reservations/events';

        fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function(res) {
            return res.json().then(function(data) { return { status: res.status, data: data }; });
          })
          .then(function(resObj) {
            setEventLoading(false);
            if (!resObj.data.success) {
              var errMsg = resObj.data.error ? resObj.data.error.message : 'Error al reservar tu entrada para el evento.';
              showEventError(errMsg);
              return;
            }

            var resData = resObj.data.data.reservation;
            showEventSuccess(resData, selectedEventObj);
          })
          .catch(function() {
            setEventLoading(false);
            showEventError('Error de conexión al reservar el evento. Verificá tu conexión a internet.');
          });
      });
    }

    function showTableError(msg) {
      if (tableErrorBox) {
        tableErrorBox.textContent = msg;
        tableErrorBox.style.display = 'block';
        tableErrorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        alert(msg);
      }
    }

    function showEventError(msg) {
      if (eventErrorBox) {
        eventErrorBox.textContent = msg;
        eventErrorBox.style.display = 'block';
        eventErrorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        alert(msg);
      }
    }

    function setTableLoading(isLoading) {
      if (tableSubmitBtn) tableSubmitBtn.disabled = isLoading;
      var textEl = tableSubmitBtn ? tableSubmitBtn.querySelector('.res-btn-text') : null;
      var spinEl = tableSubmitBtn ? tableSubmitBtn.querySelector('.res-btn-spinner') : null;
      if (textEl) textEl.style.display = isLoading ? 'none' : 'inline';
      if (spinEl) spinEl.style.display = isLoading ? 'inline' : 'none';
    }

    function setEventLoading(isLoading) {
      if (eventSubmitBtn) eventSubmitBtn.disabled = isLoading;
      var textEl = eventSubmitBtn ? eventSubmitBtn.querySelector('.res-event-btn-text') : null;
      var spinEl = eventSubmitBtn ? eventSubmitBtn.querySelector('.res-event-btn-spinner') : null;
      if (textEl) textEl.style.display = isLoading ? 'none' : 'inline';
      if (spinEl) spinEl.style.display = isLoading ? 'inline' : 'none';
    }

    function showTableSuccess(reservation) {
      if (panelTable) panelTable.style.display = 'none';
      if (panelEvent) panelEvent.style.display = 'none';
      var switchWrapper = root.querySelector('.res-mode-switch-wrapper');
      if (switchWrapper) switchWrapper.style.display = 'none';

      if (successView) {
        successView.style.display = 'block';
        if (successIcon) {
          successIcon.textContent = '✓';
          successIcon.className = 'res-success-icon-badge';
        }
        if (voucherCard) {
          voucherCard.className = 'res-voucher-card';
        }
        if (voucherBadgeType) {
          voucherBadgeType.textContent = '🍽️ COMPROBANTE DE MESA REGULAR';
          voucherBadgeType.className = 'res-voucher-badge-type tag-table';
        }
        if (voucherCode) voucherCode.textContent = reservation.code || '#RES-OK';
        if (voucherEventItem) voucherEventItem.style.display = 'none';
        if (voucherDate) voucherDate.textContent = reservation.date;
        if (voucherTimeLabel) voucherTimeLabel.textContent = 'Turno / Horario';
        if (voucherTime) voucherTime.textContent = reservation.time + ' hs';
        if (voucherGuestsLabel) voucherGuestsLabel.textContent = 'Comensales';
        if (voucherGuests) voucherGuests.textContent = reservation.partySize + ' personas';
        if (voucherName) voucherName.textContent = reservation.customerName;

        var restaurantName = root.getAttribute('data-restaurant-name') || 'el restaurante';
        var restaurantPhone = root.getAttribute('data-restaurant-phone') || '';
        var waPhone = restaurantPhone.replace(/[^0-9]/g, '');
        var waMsg = encodeURIComponent('¡Hola! Tengo una reserva confirmada para cenar en ' + restaurantName + '.\\n' +
          '🍽️ Tipo: Reserva de Mesa Regular\\n' +
          'Código: ' + (reservation.code || '') + '\\n' +
          'Fecha: ' + reservation.date + ' ' + reservation.time + ' hs\\n' +
          'Comensales: ' + reservation.partySize + '\\n' +
          'A nombre de: ' + reservation.customerName);
        var waUrl = waPhone ? ('https://wa.me/' + waPhone + '?text=' + waMsg) : ('https://wa.me/?text=' + waMsg);
        if (voucherWaBtn) voucherWaBtn.href = waUrl;

        successView.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function showEventSuccess(reservation, eventObj) {
      if (panelTable) panelTable.style.display = 'none';
      if (panelEvent) panelEvent.style.display = 'none';
      var switchWrapper = root.querySelector('.res-mode-switch-wrapper');
      if (switchWrapper) switchWrapper.style.display = 'none';

      if (successView) {
        successView.style.display = 'block';
        if (successIcon) {
          successIcon.textContent = '🎟️';
          successIcon.className = 'res-success-icon-badge is-event-icon';
        }
        if (voucherCard) {
          voucherCard.className = 'res-voucher-card is-event-voucher';
        }
        if (voucherBadgeType) {
          voucherBadgeType.textContent = '🎉 ENTRADA CONFIRMADA A EVENTO ESPECIAL';
          voucherBadgeType.className = 'res-voucher-badge-type tag-event';
        }
        if (voucherCode) voucherCode.textContent = reservation.code || '#EVT-OK';
        if (voucherEventItem) {
          voucherEventItem.style.display = 'flex';
          if (voucherEvent) voucherEvent.textContent = reservation.eventTitle || eventObj.title || 'Evento Especial';
        }
        if (voucherDate) voucherDate.textContent = reservation.date || eventObj.date;
        if (voucherTimeLabel) voucherTimeLabel.textContent = 'Horario de Inicio';
        if (voucherTime) voucherTime.textContent = (reservation.time || eventObj.time) + ' hs';
        if (voucherGuestsLabel) voucherGuestsLabel.textContent = 'Lugares / Entradas';
        if (voucherGuests) voucherGuests.textContent = reservation.partySize + ' lugares';
        if (voucherName) voucherName.textContent = reservation.customerName;

        var restaurantName = root.getAttribute('data-restaurant-name') || 'el restaurante';
        var restaurantPhone = root.getAttribute('data-restaurant-phone') || '';
        var waPhone = restaurantPhone.replace(/[^0-9]/g, '');
        var waMsg = encodeURIComponent('¡Hola! Reservé mis entradas para el EVENTO ESPECIAL en ' + restaurantName + '.\\n' +
          '🎉 Evento: ' + (reservation.eventTitle || eventObj.title) + '\\n' +
          'Código: ' + (reservation.code || '') + '\\n' +
          'Fecha: ' + (reservation.date || eventObj.date) + ' a las ' + (reservation.time || eventObj.time) + ' hs\\n' +
          'Lugares reservados: ' + reservation.partySize + '\\n' +
          'A nombre de: ' + reservation.customerName);
        var waUrl = waPhone ? ('https://wa.me/' + waPhone + '?text=' + waMsg) : ('https://wa.me/?text=' + waMsg);
        if (voucherWaBtn) voucherWaBtn.href = waUrl;

        successView.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    if (newBookingBtn) {
      newBookingBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (successView) successView.style.display = 'none';
        var switchWrapper = root.querySelector('.res-mode-switch-wrapper');
        if (switchWrapper) switchWrapper.style.display = 'flex';
        switchMode('tables');
        if (tableForm) tableForm.reset();
        if (eventForm) eventForm.reset();
        if (eventsListSection) eventsListSection.style.display = 'block';
        if (eventForm) eventForm.style.display = 'none';
        selectedEventObj = null;
        renderCalendar(viewYear, viewMonth);
        selectDate(todayStr);
        fetchAvailability();
      });
    }

    renderCalendar(viewYear, viewMonth);
    selectDate(todayStr);
    fetchAvailability();
  }

  function checkAndInit() {
    var sections = document.querySelectorAll('.res-booking-section, .reservation-section, #reservas');
    sections.forEach(function(sec) {
      setupUnifiedWidget(sec);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndInit);
  } else {
    checkAndInit();
  }
})();`,
  },
  {
    moduleKey: "reservations-events",
    name: "Eventos Especiales & Degustaciones",
    description: "Módulo interactivo exclusivo para promocionar y reservar eventos especiales, catas y cenas temáticas con visualización de cupos en tiempo real.",
    category: "contacto",
    fields: [
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "Experiencias Únicas" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "Noches Especiales & Eventos" },
      { key: "description", label: "Descripción", type: "textarea", defaultValue: "Descubrí nuestras degustaciones, noches temáticas y cenas de autor con cupos limitados." },
      { key: "emptyMessage", label: "Mensaje si no hay eventos", type: "textarea", defaultValue: "No hay eventos especiales programados en este momento. ¡Volvé a consultar pronto!" },
      { key: "btnBookLabel", label: "Texto botón reservar", type: "text", defaultValue: "Reservar mi Lugar" },
      { key: "partyLabel", label: "Etiqueta: Lugares a reservar", type: "text", defaultValue: "¿Cuántos lugares deseás reservar?" },
      { key: "restaurantPhone", label: "WhatsApp para comprobante", type: "text", defaultValue: "+5491100000000" },
      { key: "successTitle", label: "Título al confirmar", type: "text", defaultValue: "¡Lugar Reservado para el Evento!" },
      { key: "successMessage", label: "Mensaje de éxito", type: "textarea", defaultValue: "Tu lugar para el evento ha sido confirmado. Guardá este comprobante para ingresar." },
    ],
    htmlTemplate: `<!-- Eventos Especiales & Degustaciones -->
<section class="section events-section" id="eventos" data-restaurant-slug="{{restaurantSlug}}" data-restaurant-name="{{restaurantName}}" data-restaurant-phone="{{restaurantPhone}}">
  <div class="container events-container">
    <div class="section-header text-center">
      <span class="section-kicker">{{kicker}}</span>
      <h2 class="section-title">{{title}}</h2>
      <p class="section-description">{{description}}</p>
    </div>

    <!-- Grilla de Eventos -->
    <div class="events-grid" id="eventsListGrid">
      <div class="event-card">
        <div class="event-card-media">
          <div class="event-icon-placeholder">🍷</div>
          <span class="event-badge-price">Degustación Premium</span>
        </div>
        <div class="event-card-content">
          <div class="event-meta-row">
            <span class="event-meta-pill">📅 Próximamente</span>
            <span class="event-meta-pill">⏰ 21:00 hs</span>
          </div>
          <h3 class="event-card-title">Cena & Maridaje de Estación</h3>
          <p class="event-card-desc">Recorrido por nuestros platos más aclamados acompañados por etiquetas seleccionadas.</p>
          <div class="event-card-footer">
            <span class="event-spots-badge">👥 Cupos limitados</span>
            <button type="button" class="btn btn-primary event-book-btn">Reservar mi Lugar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado vacío -->
    <div class="events-empty-state" id="eventsEmptyState" style="display: none;">
      <span class="events-empty-icon">🎪</span>
      <p>{{emptyMessage}}</p>
    </div>

    <!-- Modal para Reservar Lugar en el Evento -->
    <div class="event-modal-backdrop" id="eventModalBackdrop" style="display: none;">
      <div class="event-modal-dialog">
        <button type="button" class="event-modal-close" id="eventModalClose" aria-label="Cerrar modal">✕</button>

        <div class="event-modal-header">
          <span class="event-modal-kicker">Reserva de Evento</span>
          <h3 class="event-modal-title" id="eventModalTitle">Título del Evento</h3>
          <p class="event-modal-subtitle" id="eventModalSubtitle">📅 Fecha • ⏰ Horario</p>
        </div>

        <form class="event-booking-form" id="eventBookingForm" autocomplete="off">
          <input type="hidden" id="eventModalEventId" name="eventId" value="" />
          <input type="hidden" id="eventModalSpots" name="partySize" value="2" />

          <!-- Paso 1: Lugares a reservar -->
          <div class="res-form-step">
            <label class="res-step-label">
              <span class="res-step-num">1</span>
              <span>{{partyLabel}}</span>
            </label>
            <div class="res-party-selector" id="eventSpotsPills">
              <button type="button" class="res-party-pill" data-spots="1">1</button>
              <button type="button" class="res-party-pill active" data-spots="2">2</button>
              <button type="button" class="res-party-pill" data-spots="3">3</button>
              <button type="button" class="res-party-pill" data-spots="4">4</button>
              <button type="button" class="res-party-pill" data-spots="5">5</button>
              <button type="button" class="res-party-pill" data-spots="6">6</button>
            </div>
          </div>

          <!-- Paso 2: Datos de Contacto -->
          <div class="res-form-step">
            <label class="res-step-label">
              <span class="res-step-num">2</span>
              <span>Datos del Titular</span>
            </label>
            <div class="res-grid-fields">
              <div class="res-field-group">
                <label for="eventCustomerName">Nombre y Apellido *</label>
                <input type="text" id="eventCustomerName" class="res-input" placeholder="Ej: Santiago Ramos" required />
              </div>
              <div class="res-field-group">
                <label for="eventCustomerPhone">WhatsApp / Teléfono *</label>
                <input type="tel" id="eventCustomerPhone" class="res-input" placeholder="Ej: +54 9 11 9876-5432" required />
              </div>
            </div>
            <div class="res-field-group mt-3">
              <label for="eventCustomerEmail">Email (opcional)</label>
              <input type="email" id="eventCustomerEmail" class="res-input" placeholder="santiago@ejemplo.com" />
            </div>
            <div class="res-field-group mt-3">
              <label for="eventNotes">Preferencias o Aclaraciones</label>
              <textarea id="eventNotes" class="res-input res-textarea" rows="2" placeholder="Restricciones alimentarias, celiaquía, etc."></textarea>
            </div>
          </div>

          <div class="res-error-box" id="eventErrorBox" style="display: none;"></div>

          <div class="res-form-actions">
            <button type="submit" class="btn btn-primary res-submit-btn" id="eventSubmitBtn">
              <span class="event-btn-text">{{btnBookLabel}}</span>
              <span class="event-btn-spinner" style="display: none;">⏳ Reservando tus cupos...</span>
            </button>
          </div>
        </form>

        <!-- Comprobante de éxito -->
        <div class="event-success-view" id="eventSuccessView" style="display: none;">
          <div class="res-success-header">
            <div class="res-success-icon-badge">✓</div>
            <h3 class="res-success-title">{{successTitle}}</h3>
            <p class="res-success-desc">{{successMessage}}</p>
          </div>

          <div class="res-voucher-card">
            <div class="res-voucher-kicker">Comprobante de Entrada al Evento</div>
            <div class="res-voucher-code" id="eventVoucherCode">#EVT-0000</div>
            <div class="res-voucher-details">
              <div class="res-voucher-item">
                <span class="voucher-label">Evento</span>
                <strong class="voucher-value" id="eventVoucherTitle">-</strong>
              </div>
              <div class="res-voucher-item">
                <span class="voucher-label">Fecha y Hora</span>
                <strong class="voucher-value" id="eventVoucherDate">-</strong>
              </div>
              <div class="res-voucher-item">
                <span class="voucher-label">Lugares Reservados</span>
                <strong class="voucher-value" id="eventVoucherGuests">-</strong>
              </div>
              <div class="res-voucher-item">
                <span class="voucher-label">Titular</span>
                <strong class="voucher-value" id="eventVoucherName">-</strong>
              </div>
            </div>
          </div>

          <div class="res-success-actions">
            <a href="#" target="_blank" rel="noreferrer" class="btn btn-whatsapp res-voucher-wa-btn" id="eventVoucherWaBtn">
              <span>Compartir por WhatsApp</span>
            </a>
            <button type="button" class="btn btn-outline" id="eventCloseSuccessBtn">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: `.events-container {
  max-width: 1080px;
  margin: 0 auto;
}
.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 36px;
}
.event-card {
  display: flex;
  flex-direction: column;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg, 16px);
  overflow: hidden;
  box-shadow: var(--shadow-soft);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.event-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}
.event-card-media {
  position: relative;
  height: 160px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.12) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.event-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.event-icon-placeholder {
  font-size: 3.2rem;
}
.event-badge-price {
  position: absolute;
  top: 14px;
  right: 14px;
  background: var(--color-primary);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 9999px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}
.event-card-content {
  padding: 22px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.event-meta-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.event-meta-pill {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: rgba(0, 0, 0, 0.04);
  padding: 3px 8px;
  border-radius: 6px;
}
.event-card-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--color-text-main);
}
.event-card-desc {
  font-size: 0.92rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-bottom: 18px;
  flex: 1;
}
.event-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}
.event-spots-badge {
  font-size: 0.8rem;
  font-weight: 700;
  color: #059669;
}
.event-spots-badge.sold-out {
  color: #dc2626;
}
.event-book-btn {
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 700;
}
.events-empty-state {
  text-align: center;
  padding: 64px 20px;
  color: var(--color-text-muted);
}
.events-empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 12px;
}
.event-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 16px;
}
.event-modal-dialog {
  background: var(--color-card-bg, #ffffff);
  border-radius: var(--radius-lg, 16px);
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px 24px;
  position: relative;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
}
.event-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-main);
}
.event-modal-kicker {
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: 0.05em;
}
.event-modal-title {
  font-size: 1.4rem;
  font-weight: 800;
  margin: 4px 0 6px 0;
  color: var(--color-text-main);
}
.event-modal-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: 20px;
}`,
    jsTemplate: `(function() {
  function isEditorMode() {
    return !!document.getElementById('__landing-blocks-root') &&
      document.documentElement.getAttribute('data-preview-mode') !== 'true';
  }

  function setupEventsWidget(root) {
    if (root.__resEventsMounted) return;
    root.__resEventsMounted = true;

  function resolveRestaurantSlug(root) {
    var slug = root ? (root.getAttribute('data-restaurant-slug') || '') : '';
    if (slug && slug.indexOf('{{') === -1) return slug;

    var elWithSlug = document.querySelector('[data-restaurant-slug]');
    if (elWithSlug) {
      var s = elWithSlug.getAttribute('data-restaurant-slug');
      if (s && s.indexOf('{{') === -1) return s;
    }

    var pathParts = window.location.pathname.split('/');
    var lIdx = pathParts.indexOf('l');
    if (lIdx !== -1 && pathParts[lIdx + 1]) {
      return pathParts[lIdx + 1];
    }

    try {
      if (window.parent && window.parent !== window && window.parent.location) {
        var pParts = window.parent.location.pathname.split('/');
        var pIdx = pParts.indexOf('l');
        if (pIdx !== -1 && pParts[pIdx + 1]) {
          return pParts[pIdx + 1];
        }
      }
    } catch (_) {}

    return '';
  }
    var slug = resolveRestaurantSlug(root);

    var grid = root.querySelector('#eventsListGrid');
    var emptyState = root.querySelector('#eventsEmptyState');
    var modalBackdrop = root.querySelector('#eventModalBackdrop');
    var modalClose = root.querySelector('#eventModalClose');
    var modalTitle = root.querySelector('#eventModalTitle');
    var modalSubtitle = root.querySelector('#eventModalSubtitle');
    var modalEventIdInput = root.querySelector('#eventModalEventId');
    var modalSpotsInput = root.querySelector('#eventModalSpots');
    var spotsPills = root.querySelectorAll('#eventSpotsPills .res-party-pill');
    var form = root.querySelector('#eventBookingForm');
    var customerNameInput = root.querySelector('#eventCustomerName');
    var customerPhoneInput = root.querySelector('#eventCustomerPhone');
    var customerEmailInput = root.querySelector('#eventCustomerEmail');
    var notesInput = root.querySelector('#eventNotes');
    var submitBtn = root.querySelector('#eventSubmitBtn');
    var btnText = root.querySelector('.event-btn-text');
    var btnSpinner = root.querySelector('.event-btn-spinner');
    var errorBox = root.querySelector('#eventErrorBox');

    var successView = root.querySelector('#eventSuccessView');
    var voucherCode = root.querySelector('#eventVoucherCode');
    var voucherTitle = root.querySelector('#eventVoucherTitle');
    var voucherDate = root.querySelector('#eventVoucherDate');
    var voucherGuests = root.querySelector('#eventVoucherGuests');
    var voucherName = root.querySelector('#eventVoucherName');
    var voucherWaBtn = root.querySelector('#eventVoucherWaBtn');
    var closeSuccessBtn = root.querySelector('#eventCloseSuccessBtn');

    spotsPills.forEach(function(p) {
      p.addEventListener('click', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();
        spotsPills.forEach(function(pill) { pill.classList.remove('active'); });
        p.classList.add('active');
        if (modalSpotsInput) modalSpotsInput.value = p.getAttribute('data-spots') || '2';
      });
    });

    if (modalClose) {
      modalClose.addEventListener('click', function() {
        if (modalBackdrop) modalBackdrop.style.display = 'none';
      });
    }

    if (closeSuccessBtn) {
      closeSuccessBtn.addEventListener('click', function() {
        if (modalBackdrop) modalBackdrop.style.display = 'none';
      });
    }

    function fetchEvents() {
      if (!slug) return;
      var url = '/api/public/landing/' + encodeURIComponent(slug) + '/reservations/events';

      fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (!data || !data.success || !data.data) {
            return;
          }
          var events = data.data.events || [];
          renderEvents(events);
        })
        .catch(function(err) {
          console.warn('Error al obtener eventos especiales:', err);
        });
    }

    function renderEvents(events) {
      if (!grid) return;
      if (!events || events.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';
      grid.style.display = 'grid';

      var html = [];
      events.forEach(function(evt) {
        var isSoldOut = evt.remainingSpots <= 0;
        var spotsText = isSoldOut ? '🚫 Cupos agotados' : ('👥 ' + evt.remainingSpots + ' lugares disponibles');
        var spotsBadgeClass = isSoldOut ? 'event-spots-badge sold-out' : 'event-spots-badge';
        var disabledAttr = isSoldOut ? ' disabled' : '';

        var mediaHtml = evt.imageUrl
          ? '<img src="' + evt.imageUrl + '" alt="' + evt.title + '" class="event-card-img" />'
          : '<div class="event-icon-placeholder">🎟️</div>';

        var priceBadge = evt.priceLabel
          ? '<span class="event-badge-price">' + evt.priceLabel + '</span>'
          : '';

        html.push(
          '<div class="event-card">' +
          '  <div class="event-card-media">' + mediaHtml + priceBadge + '</div>' +
          '  <div class="event-card-content">' +
          '    <div class="event-meta-row">' +
          '      <span class="event-meta-pill">📅 ' + evt.date + '</span>' +
          '      <span class="event-meta-pill">⏰ ' + evt.startTime + ' hs</span>' +
          '    </div>' +
          '    <h3 class="event-card-title">' + evt.title + '</h3>' +
          '    <p class="event-card-desc">' + (evt.description || '') + '</p>' +
          '    <div class="event-card-footer">' +
          '      <span class="' + spotsBadgeClass + '">' + spotsText + '</span>' +
          '      <button type="button" class="btn btn-primary event-book-btn" data-event-id="' + evt.id + '" data-event-title="' + evt.title + '" data-event-date="' + evt.date + '" data-event-time="' + evt.startTime + '" data-event-spots="' + evt.remainingSpots + '"' + disabledAttr + '>Reservar mi Lugar</button>' +
          '    </div>' +
          '  </div>' +
          '</div>'
        );
      });

      grid.innerHTML = html.join('\\n');
      bindEventButtons();
    }

    function bindEventButtons() {
      var bookBtns = grid ? grid.querySelectorAll('.event-book-btn:not(:disabled)') : [];
      bookBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          if (isEditorMode()) return;
          e.preventDefault();

          var eventId = btn.getAttribute('data-event-id');
          var title = btn.getAttribute('data-event-title');
          var date = btn.getAttribute('data-event-date');
          var time = btn.getAttribute('data-event-time');
          var spots = parseInt(btn.getAttribute('data-event-spots') || '10', 10);

          if (modalEventIdInput) modalEventIdInput.value = eventId || '';
          if (modalTitle) modalTitle.textContent = title || 'Evento Especial';
          if (modalSubtitle) modalSubtitle.textContent = '📅 ' + date + ' • ⏰ ' + time + ' hs';

          if (form) {
            form.reset();
            form.style.display = 'block';
          }
          if (successView) successView.style.display = 'none';
          if (errorBox) errorBox.style.display = 'none';

          if (modalSpotsInput) modalSpotsInput.value = '2';
          spotsPills.forEach(function(p) {
            var val = parseInt(p.getAttribute('data-spots') || '1', 10);
            p.style.display = val <= spots ? 'inline-block' : 'none';
            p.classList.toggle('active', val === 2 || (spots === 1 && val === 1));
          });

          if (modalBackdrop) modalBackdrop.style.display = 'flex';
        });
      });
    }

    if (form) {
      form.addEventListener('submit', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();

        if (errorBox) { errorBox.style.display = 'none'; errorBox.textContent = ''; }

        var eventId = modalEventIdInput ? modalEventIdInput.value : '';
        var customerName = customerNameInput ? customerNameInput.value.trim() : '';
        var customerPhone = customerPhoneInput ? customerPhoneInput.value.trim() : '';
        var customerEmail = customerEmailInput ? customerEmailInput.value.trim() : '';
        var notes = notesInput ? notesInput.value.trim() : '';
        var partySize = modalSpotsInput ? parseInt(modalSpotsInput.value, 10) : 2;

        if (!eventId) {
          showModalError('Error: no se identificó el evento seleccionado.');
          return;
        }
        if (!customerName) {
          showModalError('Por favor ingresá tu nombre completo.');
          return;
        }
        if (!customerPhone) {
          showModalError('Por favor ingresá un teléfono o WhatsApp de contacto.');
          return;
        }

        setModalLoading(true);

        var payload = {
          eventId: eventId,
          customerName: customerName,
          customerPhone: customerPhone,
          customerEmail: customerEmail || undefined,
          partySize: partySize,
          notes: notes || undefined
        };

        fetch('/api/public/landing/' + encodeURIComponent(slug) + '/reservations/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function(res) {
            return res.json().then(function(json) {
              return { status: res.status, ok: res.ok, data: json };
            });
          })
          .then(function(resObj) {
            setModalLoading(false);
            if (!resObj.ok || !resObj.data.success) {
              var errMsg = (resObj.data && resObj.data.error && resObj.data.error.message)
                ? resObj.data.error.message
                : 'Ocurrió un error al registrar tu lugar en el evento. Intentá nuevamente.';
              showModalError(errMsg);
              return;
            }

            var resData = resObj.data.data.reservation;
            showModalSuccess(resData);
            fetchEvents();
          })
          .catch(function() {
            setModalLoading(false);
            showModalError('Error de conexión al enviar la reserva.');
          });
      });
    }

    function showModalError(msg) {
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
      } else {
        alert(msg);
      }
    }

    function setModalLoading(isLoading) {
      if (submitBtn) submitBtn.disabled = isLoading;
      if (btnText) btnText.style.display = isLoading ? 'none' : 'inline';
      if (btnSpinner) btnSpinner.style.display = isLoading ? 'inline' : 'none';
    }

    function showModalSuccess(reservation) {
      if (form) form.style.display = 'none';
      if (successView) {
        successView.style.display = 'block';
        if (voucherCode) voucherCode.textContent = reservation.code || '#EVT-OK';
        if (voucherTitle) voucherTitle.textContent = reservation.eventTitle || 'Evento Especial';
        if (voucherDate) voucherDate.textContent = reservation.date + ' ' + reservation.time + ' hs';
        if (voucherGuests) voucherGuests.textContent = reservation.partySize + ' cupos confirmados';
        if (voucherName) voucherName.textContent = reservation.customerName;

        var restaurantName = root.getAttribute('data-restaurant-name') || 'el restaurante';
        var restaurantPhone = root.getAttribute('data-restaurant-phone') || '';
        var waPhone = restaurantPhone.replace(/[^0-9]/g, '');
        var waMsg = encodeURIComponent('¡Hola! Reservé lugares para el evento ' + (reservation.eventTitle || '') + ' en ' + restaurantName + '.\\nCódigo: ' + (reservation.code || '') + '\\nFecha: ' + reservation.date + ' ' + reservation.time + ' hs\\nLugares: ' + reservation.partySize + '\\nA nombre de: ' + reservation.customerName);
        var waUrl = waPhone ? ('https://wa.me/' + waPhone + '?text=' + waMsg) : ('https://wa.me/?text=' + waMsg);
        if (voucherWaBtn) voucherWaBtn.href = waUrl;
      }
    }

    if (!isEditorMode()) {
      fetchEvents();
    }
  }

  function checkAndInitEvents() {
    var sections = document.querySelectorAll('.events-section, #eventos, #eventos-especiales');
    sections.forEach(function(sec) {
      setupEventsWidget(sec);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndInitEvents);
  } else {
    checkAndInitEvents();
  }

  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function() {
      if (document.documentElement.getAttribute('data-preview-mode') === 'true') {
        checkAndInitEvents();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-preview-mode'] });
  }
})();`,
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
