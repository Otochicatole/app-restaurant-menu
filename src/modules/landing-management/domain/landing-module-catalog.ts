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
    description: "Sección base vacía para estructurar y soltar componentes a medida.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Sección / Contenedor Libre -->
<section class="section" style="padding: 48px 0;">
  <div class="container" style="max-width: 1100px; margin: 0 auto; padding: 32px 20px; border: 2px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 14px); min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; box-sizing: border-box;">
    <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500;">Contenedor Libre — Arrastrá componentes o hacé clic para insertar</p>
  </div>
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "columns-container",
    name: "Sección 2 Columnas",
    description: "Grilla responsive en 2 columnas para layouts divididos o contenido lado a lado.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Sección 2 Columnas -->
<section class="section" style="padding: 48px 0;">
  <div class="container grid-columns-2" style="max-width: 1100px; margin: 0 auto; padding: 0 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; box-sizing: border-box;">
    <div class="grid-column" style="padding: 24px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 100px; box-sizing: border-box;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 1 — Arrastrá componentes aquí</p>
    </div>
    <div class="grid-column" style="padding: 24px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 100px; box-sizing: border-box;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 2 — Arrastrá componentes aquí</p>
    </div>
  </div>
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "columns-3-container",
    name: "Sección 3 Columnas (CSS Grid)",
    description: "Grilla responsive en 3 columnas ideal para platos, ventajas o servicios.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Sección 3 Columnas -->
<section class="section" style="padding: 48px 0;">
  <div class="container grid-columns-3" style="max-width: 1100px; margin: 0 auto; padding: 0 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; box-sizing: border-box;">
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
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "columns-4-container",
    name: "Sección 4 Columnas (CSS Grid)",
    description: "Grilla en 4 columnas para métricas, fotografías o elementos compactos.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Sección 4 Columnas -->
<section class="section" style="padding: 48px 0;">
  <div class="container grid-columns-4" style="max-width: 1100px; margin: 0 auto; padding: 0 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; box-sizing: border-box;">
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
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "flex-row-container",
    name: "Fila Flexible (Flex Row)",
    description: "Contenedor horizontal flexible con distribución y salto de línea adaptativo.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Fila Flexible -->
<section class="section" style="padding: 48px 0;">
  <div class="container flex-row" style="max-width: 1100px; margin: 0 auto; padding: 24px 20px; display: flex; flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 14px); box-sizing: border-box;">
    <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500;">Fila Flex — Insertá elementos para alinearlos horizontalmente</p>
  </div>
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "flex-col-container",
    name: "Columna Flexible (Flex Column)",
    description: "Contenedor vertical flexible para apilar elementos con espaciado uniforme.",
    category: "estructura",
    fields: [],
    htmlTemplate: `<!-- Columna Flexible -->
<section class="section" style="padding: 48px 0;">
  <div class="container flex-col" style="max-width: 1100px; margin: 0 auto; padding: 24px 20px; display: flex; flex-direction: column; align-items: stretch; gap: 16px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 14px); box-sizing: border-box;">
    <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500;">Columna Flex — Insertá elementos para apilarlos verticalmente</p>
  </div>
</section>`,
    cssTemplate: ``,
    jsTemplate: ``,
  },
  {
    moduleKey: "header",
    name: "Barra de Navegación",
    description: "Encabezado sticky con marca editorial, enlaces de sección y botón de acceso a la carta digital.",
    category: "estructura",
    fields: [
      { key: "brandIcon", label: "Marca o monograma", type: "text", defaultValue: "✦" },
      { key: "brandTitle", label: "Nombre visible", type: "text", defaultValue: "{{restaurantName}}" },
      { key: "link1Text", label: "Texto enlace 1", type: "text", defaultValue: "Inicio" },
      { key: "link1Href", label: "Destino enlace 1", type: "url", defaultValue: "#inicio" },
      { key: "link2Text", label: "Texto enlace 2", type: "text", defaultValue: "Especialidades" },
      { key: "link2Href", label: "Destino enlace 2", type: "url", defaultValue: "#destacados" },
      { key: "link3Text", label: "Texto enlace 3", type: "text", defaultValue: "Filosofía" },
      { key: "link3Href", label: "Destino enlace 3", type: "url", defaultValue: "#experiencia" },
      { key: "link4Text", label: "Texto enlace 4", type: "text", defaultValue: "Horarios & Contacto" },
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
  padding: 16px 0;
  transition: var(--transition);
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
  letter-spacing: -0.01em;
}
.brand-icon {
  font-size: 1.15rem;
  color: var(--color-accent);
}
.nav-menu {
  display: flex;
  align-items: center;
  gap: 28px;
}
.nav-link {
  color: var(--color-text-main);
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  transition: var(--transition);
}
.nav-link:hover { color: var(--color-accent); }
.nav-cta {
  padding: 9px 18px;
  font-size: 0.88rem;
  font-weight: 600;
}
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
  width: 22px;
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
    description: "Portada editorial con titular gastronómico de alto impacto, bajada sensorial y botones de acción directos.",
    category: "estructura",
    fields: [
      { key: "badge", label: "Insignia superior", type: "text", defaultValue: "Fuego de Quebracho · Cortes Madurados · Cava" },
      { key: "title", label: "Título principal", type: "text", defaultValue: "El ritual de la brasa viva y los grandes vinos" },
      { key: "subtitle", label: "Subtítulo descriptivo", type: "textarea", defaultValue: "Cortes seleccionados madurados en cámara seca, pesca artesanal del día y cava subterránea de guarda en un ambiente pensado para disfrutar sin prisa." },
      { key: "primaryBtnText", label: "Texto botón principal", type: "text", defaultValue: "Explorar Carta Digital →" },
      { key: "primaryBtnUrl", label: "URL botón principal", type: "url", defaultValue: "{{menuUrl}}" },
      { key: "secondaryBtnText", label: "Texto botón secundario", type: "text", defaultValue: "Reservar Mesa" },
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
  padding: 110px 0 120px;
  overflow: hidden;
  border-bottom: 1px solid var(--color-border);
}
.hero-container {
  position: relative;
  z-index: 2;
}
.hero-content {
  max-width: 740px;
}
.hero-badge {
  display: inline-block;
  padding: 6px 14px;
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-border);
  color: var(--color-accent);
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 22px;
}
.hero-title {
  font-size: clamp(2.8rem, 5.2vw, 4.2rem);
  letter-spacing: -0.025em;
  line-height: 1.08;
  margin-bottom: 22px;
}
.hero-subtitle {
  font-size: 1.15rem;
  line-height: 1.6;
  color: var(--color-text-muted);
  max-width: 620px;
  margin-bottom: 36px;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
@media (max-width: 868px) {
  .hero-section { padding: 72px 0 84px; }
  .hero-title { font-size: 2.35rem; }
  .hero-subtitle { font-size: 1.02rem; margin-bottom: 28px; }
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "specialties-grid",
    name: "Grilla de Especialidades (3 Cards)",
    description: "Tres tarjetas gastronómicas editoriales con categoría, plato insignia, descripción sensorial y llamada a la carta.",
    category: "tarjetas",
    fields: [
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "PROPUESTA GASTRONÓMICA" },
      { key: "sectionTitle", label: "Título de sección", type: "text", defaultValue: "Especialidades de la Casa" },
      { key: "sectionDescription", label: "Descripción de sección", type: "textarea", defaultValue: "Platos concebidos a partir de productos nobles de estación, técnicas de cocción lenta y respeto absoluto por el origen." },
      { key: "card1Icon", label: "Card 1 · Categoría", type: "text", defaultValue: "Fuegos & Brasas" },
      { key: "card1Title", label: "Card 1 · Título", type: "text", defaultValue: "Ojo de Bife Madurado 45 Días" },
      { key: "card1Text", label: "Card 1 · Descripción", type: "textarea", defaultValue: "Cocción a la leña de quebracho colorado, milhojas de papa al romero, manteca de tuétano y sal marina en escamas." },
      { key: "card2Icon", label: "Card 2 · Categoría", type: "text", defaultValue: "Pasta Fatta a Mano" },
      { key: "card2Badge", label: "Card 2 · Etiqueta destacada", type: "text", defaultValue: "Insignia" },
      { key: "card2Title", label: "Card 2 · Título", type: "text", defaultValue: "Tagliolini al Tartufo Nero & Parmigiano" },
      { key: "card2Text", label: "Card 2 · Descripción", type: "textarea", defaultValue: "Pasta fresca elaborada a diario con sémola candeal, manteca de pastura clarificada, trufa negra y queso reggiano 24 meses." },
      { key: "card3Icon", label: "Card 3 · Categoría", type: "text", defaultValue: "Pesca & Cava" },
      { key: "card3Title", label: "Card 3 · Título", type: "text", defaultValue: "Pesca Salvaje del Atlántico Sur" },
      { key: "card3Text", label: "Card 3 · Descripción", type: "textarea", defaultValue: "Pesca de anzuelo sellada a la plancha sobre puré sedoso de coliflor asada, brotes de huerta y reducción de sauvignon blanc." },
      { key: "ctaText", label: "Texto botón inferior", type: "text", defaultValue: "Ver toda la carta con precios y maridajes →" },
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
      <a href="{{ctaUrl}}" target="_top" class="btn btn-secondary">{{ctaText}}</a>
    </div>
  </div>
</section>`,
    cssTemplate: `.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
.card {
  position: relative;
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 34px 28px;
  transition: var(--transition);
}
.card:hover {
  transform: translateY(-4px);
  border-color: var(--color-accent);
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
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.card-icon {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-accent);
  margin-bottom: 14px;
}
.card-title {
  font-size: 1.35rem;
  line-height: 1.25;
  margin-bottom: 12px;
}
.card-text {
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.55;
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
    description: "Módulo de tarjeta individual con categoría, precio o maridaje, descripción sensorial y llamada a la acción.",
    category: "tarjetas",
    fields: [
      { key: "badge", label: "Etiqueta superior", type: "text", defaultValue: "SUGERENCIA DE TEMPORADA" },
      { key: "icon", label: "Ícono o distintivo", type: "text", defaultValue: "✦" },
      { key: "title", label: "Título de la Card", type: "text", defaultValue: "Menú Degustación 5 Pasos & Cava" },
      { key: "priceTag", label: "Precio / Destacado", type: "text", defaultValue: "$ 48.000 por persona" },
      { key: "description", label: "Descripción", type: "textarea", defaultValue: "Recorrido sensorial guiado por el chef ejecutivo maridado con 3 etiquetas de bodegas boutique del Valle de Uco." },
      { key: "buttonText", label: "Texto del botón", type: "text", defaultValue: "Ver Detalles del Menú" },
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 36px;
  transition: var(--transition);
}
.spotlight-card:hover {
  border-color: var(--color-accent);
}
.spotlight-icon {
  font-size: 1.8rem;
  color: var(--color-accent);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
}
.spotlight-body {
  flex: 1;
}
.spotlight-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.spotlight-badge {
  background-color: var(--color-accent);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.spotlight-price {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-primary);
}
.spotlight-title {
  font-size: 1.55rem;
  line-height: 1.25;
  margin-bottom: 8px;
}
.spotlight-desc {
  color: var(--color-text-muted);
  font-size: 0.96rem;
  line-height: 1.55;
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
    description: "Bloque editorial dividido en dos columnas con cita gastronómica, métrica de maduración y compromisos de cocina.",
    category: "contenido",
    fields: [
      { key: "metricNumber", label: "Número / Métrica insignia", type: "text", defaultValue: "45 Días" },
      { key: "metricLabel", label: "Texto insignia", type: "text", defaultValue: "Maduración Propia" },
      { key: "quote", label: "Cita destacada", type: "textarea", defaultValue: "\"La verdadera cocina comienza con el respeto al productor y la paciencia del fuego lento.\"" },
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "FILOSOFÍA & ORIGEN" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "El valor del tiempo y la materia prima" },
      { key: "description", label: "Párrafo principal", type: "textarea", defaultValue: "En {{restaurantName}} cada preparación honra la tradición de los fuegos y el trabajo de pequeños productores agroecológicos. Sin atajos, con fuego real y masa madre viva." },
      { key: "feature1Title", label: "Punto 1 · Título", type: "text", defaultValue: "Maduración en Cámara Seca:" },
      { key: "feature1Text", label: "Punto 1 · Detalle", type: "text", defaultValue: "Temperatura y humedad controladas para cortes vacunos y pesca artesanal." },
      { key: "feature2Title", label: "Punto 2 · Título", type: "text", defaultValue: "Leña de Quebracho Colorado:" },
      { key: "feature2Text", label: "Punto 2 · Detalle", type: "text", defaultValue: "Aroma ahumado limpio y brasa sostenida para un sellado perfecto." },
      { key: "feature3Title", label: "Punto 3 · Título", type: "text", defaultValue: "Cava de Pequeños Productores:" },
      { key: "feature3Text", label: "Punto 3 · Detalle", type: "text", defaultValue: "Selección curada de vinos de altura, baja intervención y cepas autóctonas." },
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
  gap: 56px;
  align-items: center;
}
.experience-visual {
  position: relative;
  background-color: var(--color-primary);
  border-radius: var(--radius-lg);
  padding: 56px 40px;
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
  padding: 8px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 24px;
  align-self: flex-start;
}
.experience-badge-float .exp-number {
  font-size: 1.25rem;
  font-weight: 800;
  margin-right: 6px;
}
.section-text {
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--color-text-muted);
  margin-bottom: 26px;
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
  width: 22px;
  height: 22px;
  background-color: var(--color-primary);
  color: #ffffff;
  border-radius: 50%;
  font-size: 0.75rem;
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
    description: "Banner editorial de alto impacto para anunciar noches especiales, degustaciones maridadas o eventos exclusivos.",
    category: "contenido",
    fields: [
      { key: "tag", label: "Etiqueta", type: "text", defaultValue: "JUEVES A SÁBADOS · 19 A 21 HS" },
      { key: "title", label: "Título de promoción", type: "text", defaultValue: "Aperitivo, Tapas & Coctelería de Autor" },
      { key: "subtitle", label: "Descripción breve", type: "textarea", defaultValue: "Cócteles de autor con botánicos propios, tablas de charcutería artesanal y quesos madurados en nuestro salón." },
      { key: "ctaText", label: "Texto del botón", type: "text", defaultValue: "Ver Carta de Cócteles" },
      { key: "ctaUrl", label: "URL del botón", type: "url", defaultValue: "{{menuUrl}}" },
    ],
    htmlTemplate: `<section class="promo-banner-section">
  <div class="container promo-banner-box">
    <div class="promo-banner-copy">
      <span class="promo-tag">{{tag}}</span>
      <h2 class="promo-title">{{title}}</h2>
      <p class="promo-subtitle">{{subtitle}}</p>
    </div>
    <div class="promo-banner-cta">
      <a href="{{ctaUrl}}" target="_top" class="btn btn-secondary btn-lg">{{ctaText}}</a>
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
  background-color: var(--color-primary);
  color: #ffffff;
  border-radius: var(--radius-lg);
  padding: 48px 44px;
}
.promo-tag {
  display: inline-block;
  background-color: var(--color-accent);
  color: #ffffff;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 5px 12px;
  border-radius: 9999px;
  margin-bottom: 14px;
}
.promo-title {
  color: #ffffff;
  font-size: 2rem;
  line-height: 1.2;
  margin-bottom: 10px;
}
.promo-subtitle {
  color: rgba(255, 255, 255, 0.88);
  max-width: 580px;
  font-size: 1.02rem;
  line-height: 1.5;
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
    description: "Grilla de 3 testimonios con calificación, medio o comensal verificado y estilo editorial.",
    category: "tarjetas",
    fields: [
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "PRENSA & COMENSALES" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "Elogios de la mesa y la crítica" },
      { key: "review1Text", label: "Reseña 1 · Comentario", type: "textarea", defaultValue: "\"Uno de los puntos de brasa más precisos de la gastronomía contemporánea. El maridaje de cava subterránea es impecable.\"" },
      { key: "review1Author", label: "Reseña 1 · Autor", type: "text", defaultValue: "Guía Gastronómica de Autor" },
      { key: "review2Text", label: "Reseña 2 · Comentario", type: "textarea", defaultValue: "\"Atmósfera cuidada, servicio con un ritmo exacto y una carta digital clara que detalla cada productor y origen de la materia prima.\"" },
      { key: "review2Author", label: "Reseña 2 · Autor", type: "text", defaultValue: "Revista Epicúreo · Crítica Independiente" },
      { key: "review3Text", label: "Reseña 3 · Comentario", type: "textarea", defaultValue: "\"La pesca salvaje del día y el postre de cacao al 72% justifican por sí solos la visita. Un restaurante donde el detalle manda.\"" },
      { key: "review3Author", label: "Reseña 3 · Autor", type: "text", defaultValue: "Federico M. · Comensal Verificado" },
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
  font-size: 0.88rem;
  color: var(--color-primary);
  letter-spacing: 0.02em;
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "contact-hours",
    name: "Horarios, Ubicación y WhatsApp",
    description: "Tres tarjetas de servicio: turnos de salón, dirección con notas de acceso y concierge de reservas.",
    category: "contacto",
    fields: [
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "ENCUENTRO & RESERVAS" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "Horarios, Ubicación y Concierge" },
      { key: "description", label: "Descripción", type: "textarea", defaultValue: "Atención personalizada para reservas individuales, mesas corporativas y celebraciones especiales." },
      { key: "hoursTitle", label: "Tarjeta 1 · Título", type: "text", defaultValue: "Turnos de Salón" },
      { key: "hoursLine1", label: "Horario principal", type: "text", defaultValue: "Almuerzos: Mar a Dom · 12:00 a 16:00 hs" },
      { key: "hoursLine2", label: "Horario secundario", type: "text", defaultValue: "Cenas: Mar a Sáb · 20:00 a 00:30 hs" },
      { key: "hoursNote", label: "Nota de horario", type: "text", defaultValue: "Lunes cerrado por recepción de producto fresco." },
      { key: "addressTitle", label: "Tarjeta 2 · Título", type: "text", defaultValue: "Dirección & Cava" },
      { key: "addressLine1", label: "Dirección", type: "text", defaultValue: "Av. de los Patricios 1420, Barrio Histórico" },
      { key: "addressLine2", label: "Detalle de ubicación", type: "text", defaultValue: "Valet parking sin cargo en puerta del restaurante." },
      { key: "contactTitle", label: "Tarjeta 3 · Título", type: "text", defaultValue: "Concierge & Consultas" },
      { key: "phoneText", label: "Teléfono", type: "text", defaultValue: "Salón: +54 9 11 4820-9900" },
      { key: "whatsappText", label: "WhatsApp visible", type: "text", defaultValue: "WhatsApp: +54 9 11 5500-1122" },
      { key: "whatsappUrl", label: "Enlace de WhatsApp", type: "url", defaultValue: "https://wa.me/" },
      { key: "whatsappBtnLabel", label: "Texto botón WhatsApp", type: "text", defaultValue: "Escribir a Concierge por WhatsApp" },
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
      <article class="info-card">
        <span class="info-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
        <h3>{{hoursTitle}}</h3>
        <p>{{hoursLine1}}</p>
        <p>{{hoursLine2}}</p>
        <p class="info-note">{{hoursNote}}</p>
      </article>

      <article class="info-card">
        <span class="info-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span>
        <h3>{{addressTitle}}</h3>
        <p>{{addressLine1}}</p>
        <p>{{addressLine2}}</p>
      </article>

      <article class="info-card">
        <span class="info-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>
        <h3>{{contactTitle}}</h3>
        <p>{{phoneText}}</p>
        <p>{{whatsappText}}</p>
        <a href="{{whatsappUrl}}" target="_blank" rel="noreferrer" class="btn btn-whatsapp mt-3">{{whatsappBtnLabel}}</a>
      </article>
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
  padding: 34px 28px;
  transition: var(--transition);
}
.info-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-3px);
}
.info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background-color: var(--color-bg);
  color: var(--color-primary);
  border: 1px solid var(--color-border);
  margin-bottom: 20px;
}
.info-card h3 {
  font-size: 1.25rem;
  margin-bottom: 12px;
}
.info-note {
  margin-top: 10px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-style: italic;
}
.btn-whatsapp {
  background-color: #128c7e;
  color: #ffffff;
}
.btn-whatsapp:hover {
  background-color: #075e54;
}
.mt-3 { margin-top: 16px; }`,
    jsTemplate: "",
  },
  {
    moduleKey: "reservations-table",
    name: "Reserva de Mesas (Turnos)",
    description: "Módulo oficial estilo MISE: wizard paso a paso con barra de progreso, calendario interactivo con disponibilidad por puntos, selector de comensales, turnos por horario y espacios, y ticket en vivo.",
    category: "contacto",
    fields: [
      { key: "kicker", label: "Subtítulo superior", type: "text", defaultValue: "Reservas Online" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "Asegurá tu Mesa" },
      { key: "description", label: "Descripción", type: "textarea", defaultValue: "Elegí el día, turno y cantidad de comensales. Confirmación inmediata y recordatorio por WhatsApp." },
      { key: "venueName", label: "Nombre del local", type: "text", defaultValue: "Arco" },
      { key: "venueAddress", label: "Dirección del local", type: "text", defaultValue: "Olavarría 3132" },
      { key: "venueCity", label: "Ciudad / Ubicación", type: "text", defaultValue: "Mar del Plata · Argentina" },
      { key: "venueImage", label: "Foto / Logo del local", type: "image", defaultValue: "https://arco.mise.ar/api/foto/img.ficha?v=1791861570" },
      { key: "step1Title", label: "Título Paso 1 (Fecha)", type: "text", defaultValue: "¿Cuándo te esperamos?" },
      { key: "step2Title", label: "Título Paso 2 (Comensales)", type: "text", defaultValue: "¿Cuántos son?" },
      { key: "step3Title", label: "Título Paso 3 (Turno)", type: "text", defaultValue: "¿En qué horario?" },
      { key: "step4Title", label: "Título Paso 4 (Contacto)", type: "text", defaultValue: "Tus datos" },
      { key: "partyLabel", label: "Etiqueta: Comensales", type: "text", defaultValue: "¿Cuántos son?" },
      { key: "dateLabel", label: "Etiqueta: Fecha", type: "text", defaultValue: "Fecha de reserva" },
      { key: "slotsLabel", label: "Etiqueta: Horarios", type: "text", defaultValue: "Turnos disponibles" },
      { key: "nameLabel", label: "Etiqueta: Nombre", type: "text", defaultValue: "Nombre y Apellido" },
      { key: "phoneLabel", label: "Etiqueta: WhatsApp", type: "text", defaultValue: "WhatsApp / Teléfono" },
      { key: "emailLabel", label: "Etiqueta: Email", type: "text", defaultValue: "Email (opcional)" },
      { key: "notesLabel", label: "Etiqueta: Comentarios", type: "text", defaultValue: "Aclaraciones o Preferencias" },
      { key: "notesPlaceholder", label: "Placeholder notas", type: "text", defaultValue: "Alergias, cumpleaños, mesa interior o terraza..." },
      { key: "btnSubmitLabel", label: "Texto botón confirmar", type: "text", defaultValue: "Confirmar reserva" },
      { key: "policyNotice", label: "Texto aviso / política", type: "text", defaultValue: "Tolerancia máxima de 15 minutos. Pasado ese tiempo la mesa se libera." },
      { key: "depositNotice", label: "Texto garantía lateral", type: "text", defaultValue: "Tu mesa, confirmada con la seña." },
      { key: "restaurantPhone", label: "WhatsApp para comprobante", type: "text", defaultValue: "+5492233482402" },
      { key: "successTitle", label: "Título al confirmar", type: "text", defaultValue: "¡Mesa Reservada con Éxito!" },
      { key: "successMessage", label: "Mensaje de éxito", type: "textarea", defaultValue: "Hemos registrado tu turno exitosamente. Podés guardar este comprobante o enviárnoslo por WhatsApp." },
    ],
    htmlTemplate: `<!-- Reserva de Mesas (Turnos - MISE Arco Style) -->
<section class="section reservation-section res-table-section pap-section" id="reservas-mesa" data-restaurant-slug="{{restaurantSlug}}" data-restaurant-name="{{restaurantName}}" data-restaurant-phone="{{restaurantPhone}}">
  <div class="container reservation-container pap-wrapper">
    <div class="pap" id="resPapWidget" aria-label="Reservar una mesa">
      <header class="pap__barra">
        <button type="button" class="pap__atras" id="papBackBtn" disabled aria-label="Volver al paso anterior">‹</button>
        <div class="pap__centro">
          <p class="pap__titulo" id="papStepTitle">{{step1Title}}</p>
          <p class="pap__cuenta" id="papStepCounter">Paso 1 de 4</p>
        </div>
        <span class="pap__hueco" aria-hidden="true"></span>
      </header>

      <div class="pap__avance" aria-hidden="true">
        <i id="papProgressBar" style="width: 25%"></i>
      </div>

      <div class="pap__migas" id="papBreadcrumbs" style="display: none;"></div>

      <div class="pap__cuerpo">
        <!-- Contenedor del Wizard de Pasos (Columna Izquierda en Desktop) -->
        <div class="pap__paso">
          <form class="res-form" id="resTableForm" autocomplete="off">
            <input type="hidden" name="date" id="resDateInput" value="2026-10-25" />
            <input type="hidden" name="partySize" id="resSelectedPartySize" value="2" />
            <input type="hidden" name="time" id="resSelectedTime" value="" />
            <input type="hidden" name="zone" id="resSelectedZone" value="Salón Principal" />

            <!-- PASO 1: Calendario Mensual Interactivo -->
            <div class="pap__paso-view" id="papStep1View" data-step="1">
              <div class="pap__mes">
                <button type="button" class="pap__mesBoton" id="resCalPrevBtn" aria-label="Mes anterior">‹</button>
                <span class="pap__mesNombre" id="resCalMonthTitle">octubre de 2026</span>
                <button type="button" class="pap__mesBoton" id="resCalNextBtn" aria-label="Mes siguiente">›</button>
              </div>

              <div class="pap__cal-weekdays">
                <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
              </div>

              <div class="pap__cal res-cal-grid" id="resDaysRow" role="grid" aria-label="Calendario de reservas">
                <div class="pap__cal-empty res-cal-empty"></div>
                <div class="pap__cal-empty res-cal-empty"></div>
                <div class="pap__cal-empty res-cal-empty"></div>
                <div class="pap__cal-empty res-cal-empty"></div>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-01" role="gridcell" disabled><span>1</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-02" role="gridcell" disabled><span>2</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-03" role="gridcell" disabled><span>3</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-04" role="gridcell" disabled><span>4</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-05" role="gridcell" disabled><span>5</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-06" role="gridcell" disabled><span>6</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-07" role="gridcell" disabled><span>7</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-08" role="gridcell" disabled><span>8</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-09" role="gridcell" disabled><span>9</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-10" role="gridcell" disabled><span>10</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-11" role="gridcell" disabled><span>11</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-12" role="gridcell" disabled><span>12</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-13" role="gridcell" disabled><span>13</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-14" role="gridcell" disabled><span>14</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-15" role="gridcell" disabled><span>15</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-16" role="gridcell" disabled><span>16</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-17" role="gridcell" disabled><span>17</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-18" role="gridcell" disabled><span>18</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-19" role="gridcell" disabled><span>19</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-20" role="gridcell" disabled><span>20</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-21" role="gridcell" disabled><span>21</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-22" role="gridcell" disabled><span>22</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-23" role="gridcell" disabled><span>23</span></button>
                <button type="button" class="pap__celda res-day-chip es-bloqueada" data-date="2026-10-24" role="gridcell" disabled><span>24</span></button>
                <button type="button" class="pap__celda res-day-chip es-elegida active" data-date="2026-10-25" role="gridcell"><span>25</span><span class="pap__punto res-cal-day-dot"></span></button>
                <button type="button" class="pap__celda res-day-chip" data-date="2026-10-26" role="gridcell"><span>26</span><span class="pap__punto res-cal-day-dot"></span></button>
                <button type="button" class="pap__celda res-day-chip" data-date="2026-10-27" role="gridcell"><span>27</span><span class="pap__punto res-cal-day-dot"></span></button>
                <button type="button" class="pap__celda res-day-chip" data-date="2026-10-28" role="gridcell"><span>28</span><span class="pap__punto res-cal-day-dot"></span></button>
                <button type="button" class="pap__celda res-day-chip" data-date="2026-10-29" role="gridcell"><span>29</span><span class="pap__punto res-cal-day-dot"></span></button>
                <button type="button" class="pap__celda res-day-chip" data-date="2026-10-30" role="gridcell"><span>30</span><span class="pap__punto res-cal-day-dot"></span></button>
                <button type="button" class="pap__celda res-day-chip" data-date="2026-10-31" role="gridcell"><span>31</span><span class="pap__punto res-cal-day-dot"></span></button>
              </div>

              <p class="pap__ayuda">Los días con punto tienen lugar. Los apagados están cerrados o completos.</p>
            </div>

            <!-- PASO 2: Cantidad de Comensales -->
            <div class="pap__paso-view" id="papStep2View" data-step="2" style="display: none;">
              <div class="pap__gente">
                <span class="pap__avatar" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"></circle><path d="M4.8 20c0-3.6 3.2-6.2 7.2-6.2s7.2 2.6 7.2 6.2"></path></svg>
                </span>
                <div class="pap__contador">
                  <button type="button" class="pap__mas" id="papPartyMinusBtn" aria-label="Uno menos">−</button>
                  <b class="pap__numero" id="papPartyDisplay">2</b>
                  <button type="button" class="pap__mas" id="papPartyPlusBtn" aria-label="Uno más">+</button>
                </div>
                <p class="pap__ayuda pap__ayuda--centro">Hasta 14 personas se reserva desde acá.</p>
              </div>
            </div>

            <!-- PASO 3: Horarios / Turnos y Espacios -->
            <div class="pap__paso-view" id="papStep3View" data-step="3" style="display: none;">
              <div class="pap__horas-block">
                <p class="pap__rotulo">{{slotsLabel}}</p>
                <div class="res-slots-container" id="resSlotsContainer">
                  <div class="pap__horas res-slots-grid" id="resSlotsGrid">
                    <button type="button" class="pap__hora res-slot-pill active" data-time="20:00">20:00</button>
                    <button type="button" class="pap__hora res-slot-pill" data-time="21:00">21:00</button>
                    <button type="button" class="pap__hora res-slot-pill" data-time="22:00">22:00</button>
                  </div>
                </div>
                <div class="res-slots-alert" id="resSlotsAlert" style="display: none;"></div>

                <p class="pap__rotulo" style="margin-top: 24px;">Elegí el espacio</p>
                <div class="pap__sectores" id="resSectoresGrid">
                  <button type="button" class="pap__sector es-elegido" data-zone="Salón Principal">
                    <b>Salón Principal</b>
                    <small>Adentro frente a la barra y cerca de la música</small>
                  </button>
                  <button type="button" class="pap__sector" data-zone="Deck">
                    <b>Deck al aire libre</b>
                    <small>Afuera sobre la vereda con calefacción</small>
                  </button>
                  <button type="button" class="pap__sector" data-zone="Salón Fondo">
                    <b>Salón Fondo</b>
                    <small>Al fondo, techado y cerrado, donde pasa el DJ</small>
                  </button>
                </div>
              </div>
            </div>

            <!-- PASO 4: Datos de Contacto -->
            <div class="pap__paso-view" id="papStep4View" data-step="4" style="display: none;">
              <div class="pap__form">
                <label class="pap__marco">
                  <span>{{nameLabel}} *</span>
                  <input type="text" id="resNameInput" class="pap__campo res-input" placeholder="Ej: Valentina Morales" required />
                </label>
                <label class="pap__marco">
                  <span>{{phoneLabel}} *</span>
                  <input type="tel" id="resPhoneInput" class="pap__campo res-input" placeholder="Ej: +54 9 11 1234-5678" required />
                </label>
                <label class="pap__marco">
                  <span>{{emailLabel}}</span>
                  <input type="email" id="resEmailInput" class="pap__campo res-input" placeholder="tuemail@ejemplo.com" />
                </label>
                <div class="pap__cumple">
                  <label class="pap__marco">
                    <span>Cumpleaños</span>
                    <select id="resBirthdaySelect" class="pap__campo pap__sel res-input">
                      <option value="no">No festejo</option>
                      <option value="mes">Cumplo este mes</option>
                      <option value="hoy">Festejo hoy</option>
                    </select>
                  </label>
                  <label class="pap__marco">
                    <span>{{notesLabel}}</span>
                    <input type="text" id="resNotesInput" class="pap__campo res-input" placeholder="{{notesPlaceholder}}" />
                  </label>
                </div>
                <p class="pap__nota">ℹ️ {{policyNotice}}</p>
              </div>
            </div>

            <div class="res-error-box" id="resErrorBox" style="display: none;"></div>

            <!-- Barra inferior con acción -->
            <div class="pap__pie es-pegado">
              <button type="button" class="pap__seguir" id="papNextBtn">
                <span>Continuar</span>
              </button>
              <button type="submit" class="pap__seguir pap__seguir--confirmar res-submit-btn" id="resSubmitBtn" style="display: none;">
                <span class="pap__seguir-cuerpo">
                  <svg class="pap__campana" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path class="pap__campana-vapor" d="M13.4 20.6c-.9-1.1.9-2 0-3.1M18.6 20.6c-.9-1.1.9-2 0-3.1"></path>
                    <path d="M3.5 25.5h25"></path>
                    <g class="pap__campana-tapa">
                      <path d="M6.5 22.5a9.5 9.5 0 0 1 19 0z"></path>
                      <path d="M16 13v-1.5"></path>
                      <circle cx="16" cy="10.3" r="1.2"></circle>
                    </g>
                  </svg>
                  <span class="res-btn-text">{{btnSubmitLabel}}</span>
                </span>
                <span class="res-btn-spinner" style="display: none;">⏳ Confirmando reserva de mesa...</span>
              </button>
            </div>
          </form>

          <!-- Comprobante / Voucher de Éxito -->
          <div class="res-success-view pap__voucher-card" id="resSuccessView" style="display: none;">
            <div class="res-success-header">
              <div class="res-success-icon-badge">✓</div>
              <h3 class="res-success-title">{{successTitle}}</h3>
              <p class="res-success-desc">{{successMessage}}</p>
            </div>

            <div class="res-voucher-card">
              <div class="res-voucher-kicker">Comprobante de Reserva Confirmada</div>
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
                  <span class="voucher-label">Espacio</span>
                  <strong class="voucher-value" id="resVoucherZone">-</strong>
                </div>
                <div class="res-voucher-item" style="grid-column: span 2;">
                  <span class="voucher-label">Titular</span>
                  <strong class="voucher-value" id="resVoucherName">-</strong>
                </div>
              </div>
            </div>

            <div class="res-success-actions">
              <a href="#" target="_blank" rel="noreferrer" class="btn btn-whatsapp res-voucher-wa-btn" id="resVoucherWaBtn">
                <span>Enviar Comprobante por WhatsApp</span>
              </a>
              <button type="button" class="btn btn-outline res-new-booking-btn" id="resNewBookingBtn">
                Realizar otra reserva
              </button>
            </div>
          </div>
        </div>

        <!-- Lateral / Resumen del Ticket en Vivo (Columna Derecha en Desktop) -->
        <aside class="pap__lateral" aria-label="Tu reserva">
          <div class="pap__ficha">
            <img class="pap__fichaFoto" src="{{venueImage}}" alt="{{venueName}}" width="204" height="116" loading="lazy" />
            <div class="pap__fichaTexto">
              <b>{{venueName}}</b>
              <small>{{venueAddress}}</small>
              <small>{{venueCity}}</small>
            </div>
          </div>
          <dl class="pap__resumen">
            <div>
              <dt>Noche</dt>
              <dd id="papResumenNoche">domingo 25 de octubre</dd>
            </div>
            <div>
              <dt>Personas</dt>
              <dd id="papResumenPersonas">2</dd>
            </div>
            <div>
              <dt>Hora</dt>
              <dd id="papResumenHora">—</dd>
            </div>
            <div>
              <dt>Dónde</dt>
              <dd id="papResumenDonde">Salón Principal</dd>
            </div>
          </dl>
          <div class="pap__lateralPie">
            <p class="pap__lateralTitulo">{{depositNotice}}</p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</section>`,
    cssTemplate: `.res-table-section {
  --acento: var(--color-primary, #E5392C);
  --violeta: var(--color-primary, #E5392C);
  --violeta-claro: var(--color-primary-light, #FF6B5E);
  --violeta-rgb: 229, 57, 44;
  --fondo-0: var(--color-bg, #0A0807);
  --fondo-1: var(--color-card-bg, #141210);
  --fondo-2: #1c1917;
  --linea: var(--color-border, rgba(255, 255, 255, 0.08));
  --linea-viva: rgba(255, 255, 255, 0.22);
  --texto: var(--color-text-main, #F4EFEA);
  --texto-2: #D0C9C0;
  --texto-3: var(--color-text-muted, #8C847B);
  --r-factor: 1;
  padding: 0 0 24px;
  background: transparent;
  color: var(--texto);
}
.pap-wrapper {
  max-width: 100%;
  margin: 0;
}
.pap-outer-header {
  margin-bottom: 24px;
}
.pap {
  background: var(--fondo-1);
  border: 1px solid var(--linea);
  border-radius: calc(24px * var(--r-factor, 1));
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}
.pap__barra {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--linea);
}
.pap__atras {
  border: 1px solid var(--linea);
  border-radius: 50%;
  width: 38px;
  height: 38px;
  color: var(--texto-2);
  cursor: pointer;
  background: transparent;
  font-size: 1.35rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.16s ease;
}
.pap__atras:hover:not(:disabled) {
  border-color: var(--texto-2);
  color: #ffffff;
  transform: translateX(-2px);
}
.pap__atras:disabled {
  opacity: 0.25;
  cursor: not-allowed;
  pointer-events: none;
}
.pap__centro {
  text-align: center;
}
.pap__titulo {
  letter-spacing: -0.02em;
  color: var(--texto);
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}
.pap__cuenta {
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--texto-3);
  margin: 3px 0 0;
  font-size: 0.65rem;
  font-weight: 600;
}
.pap__hueco {
  width: 38px;
  height: 38px;
}
.pap__avance {
  background: rgba(255, 255, 255, 0.06);
  height: 3px;
  width: 100%;
  overflow: hidden;
}
.pap__avance i {
  background: var(--violeta);
  height: 100%;
  display: block;
  transition: width 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.pap__cuerpo {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 236px !important;
  align-items: start !important;
  gap: 26px !important;
  padding: 24px 26px 26px !important;
}
.pap__lateral {
  display: grid !important;
  background: rgba(229, 57, 44, 0.07);
  border: 1px solid rgba(229, 57, 44, 0.22);
  border-radius: calc(18px * var(--r-factor, 1));
  padding: 16px;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 14px;
  width: 236px;
  box-sizing: border-box;
}
@media (max-width: 760px) {
  .pap__cuerpo {
    display: block !important;
    padding: 18px 16px 20px !important;
  }
  .pap__lateral {
    display: none !important;
  }
}
.pap__lateral .pap__ficha {
  background: transparent;
  border: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  padding: 0;
}
.pap__lateral .pap__fichaFoto {
  border-radius: calc(14px * var(--r-factor, 1));
  width: 100%;
  height: 116px;
  object-fit: cover;
  display: block;
  border: 0;
}
.pap__lateral .pap__fichaTexto {
  gap: 0;
  display: grid;
}
.pap__lateral .pap__fichaTexto b {
  color: var(--texto);
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 3px;
}
.pap__lateral .pap__fichaTexto small {
  color: var(--texto-2);
  font-size: 0.78rem;
  line-height: 1.45;
}
.pap__lateral .pap__resumen {
  border-top: 1px solid rgba(229, 57, 44, 0.2);
  margin: 0;
  display: grid;
}
.pap__lateral .pap__resumen > div {
  border-bottom: 1px solid rgba(229, 57, 44, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 0;
}
.pap__lateral .pap__resumen dt {
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--violeta-claro);
  font-size: 0.625rem;
  font-weight: 700;
}
.pap__lateral .pap__resumen dd {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--texto);
}
.pap__lateralPie {
  text-align: center;
  padding-top: 2px;
}
.pap__lateralTitulo {
  text-align: center;
  text-wrap: balance;
  letter-spacing: -0.02em;
  margin: 0;
  font-size: 0.71875rem;
  color: var(--texto-3);
  line-height: 1.45;
}
.pap__paso {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pap__paso-view {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.pap__mes {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.pap__mesNombre {
  font-size: 1.05rem;
  font-weight: 700;
  text-transform: capitalize;
  color: var(--texto);
}
.pap__mesBoton {
  border: 1px solid var(--linea);
  border-radius: calc(10px * var(--r-factor, 1));
  width: 36px;
  height: 36px;
  color: var(--texto-2);
  cursor: pointer;
  background: var(--fondo-2);
  font-size: 1.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.pap__mesBoton:hover:not(:disabled) {
  border-color: var(--texto-2);
  color: #ffffff;
  transform: translateY(-1px);
}
.pap__mesBoton:disabled {
  opacity: 0.25;
  cursor: not-allowed;
  pointer-events: none;
}
.pap__cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  text-align: center;
  margin-bottom: 8px;
}
.pap__cal-weekdays span {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--texto-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.pap__cal, .res-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.pap__cal-empty, .res-cal-empty {
  aspect-ratio: 1.25;
  min-height: 48px;
  visibility: hidden;
}
.pap__celda, .res-day-chip {
  aspect-ratio: 1.25;
  min-height: 48px;
  border-radius: calc(12px * var(--r-factor, 1));
  background: var(--fondo-2);
  color: var(--texto);
  cursor: pointer;
  border: 1px solid var(--linea);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
  position: relative;
  transition: border-color 0.16s, background 0.16s, transform 0.16s;
  user-select: none;
}
.pap__celda:hover:not(:disabled):not(.es-bloqueada),
.res-day-chip:hover:not(:disabled):not(.es-bloqueada) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.22);
  transform: translateY(-2px);
}
.pap__celda.es-elegida,
.res-day-chip.active {
  background: var(--violeta) !important;
  border-color: var(--violeta) !important;
  color: #ffffff !important;
  font-weight: 800;
  box-shadow: 0 4px 16px rgba(var(--violeta-rgb), 0.4);
}
.pap__celda.es-bloqueada,
.res-day-chip.res-day-closed,
.res-day-chip.res-day-past {
  color: var(--texto-3);
  opacity: 0.28;
  cursor: not-allowed;
  background: transparent;
  border-color: transparent;
  text-decoration: line-through;
}
.pap__punto, .res-cal-day-dot {
  background: var(--violeta-claro);
  border-radius: 50%;
  width: 5px;
  height: 5px;
  position: absolute;
  bottom: 6px;
}
.pap__celda.es-elegida .pap__punto,
.res-day-chip.active .res-cal-day-dot {
  background: #ffffff;
}
.pap__ayuda {
  color: var(--texto-3);
  margin: 14px 0 0;
  font-size: 0.8rem;
  line-height: 1.5;
}
.pap__ayuda--centro {
  text-align: center;
}
.pap__gente {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  text-align: center;
}
.pap__rotulo {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--texto-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 12px;
}
.pap__contador {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  margin: 16px 0 24px;
}
.pap__mas {
  border: 1px solid var(--linea-viva);
  width: 52px;
  height: 52px;
  color: var(--texto);
  cursor: pointer;
  background: var(--fondo-2);
  border-radius: 50%;
  font-size: 1.6rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.16s ease;
}
.pap__mas:hover:not(:disabled) {
  border-color: var(--violeta);
  color: var(--violeta);
  transform: scale(1.08);
}
.pap__mas:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.pap__numero {
  text-align: center;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  min-width: 80px;
  font-size: 4rem;
  font-weight: 800;
  line-height: 1;
  color: var(--texto);
}
.pap__pills-personas {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}
.pap__persona-pill, .res-party-pill {
  border: 1px solid var(--linea);
  border-radius: 999px;
  background: var(--fondo-2);
  color: var(--texto);
  padding: 8px 18px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.pap__persona-pill:hover, .res-party-pill:hover {
  border-color: var(--violeta);
  color: var(--violeta);
}
.pap__persona-pill.es-activa, .res-party-pill.active {
  background: var(--violeta);
  border-color: var(--violeta);
  color: #ffffff;
  font-weight: 700;
}
.pap__horas, .res-slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 10px;
}
.pap__hora, .res-slot-pill {
  border: 1px solid var(--linea);
  border-radius: calc(12px * var(--r-factor, 1));
  background: var(--fondo-2);
  color: var(--texto);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  padding: 14px 6px;
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
  transition: all 0.16s ease;
}
.pap__hora:hover:not(:disabled), .res-slot-pill:hover:not(:disabled) {
  border-color: var(--violeta);
  color: var(--violeta);
  transform: translateY(-1px);
}
.pap__hora.es-elegida, .res-slot-pill.active {
  background: var(--violeta) !important;
  border-color: var(--violeta) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(var(--violeta-rgb), 0.35);
}
.pap__hora:disabled, .res-slot-pill.res-slot-busy {
  opacity: 0.35;
  cursor: not-allowed;
  text-decoration: line-through;
}
.res-slots-alert {
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 12px;
}
.pap__sectores {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}
.pap__sector {
  border: 1px solid var(--linea);
  border-radius: calc(14px * var(--r-factor, 1));
  background: var(--fondo-2);
  text-align: left;
  cursor: pointer;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: all 0.16s ease;
}
.pap__sector:hover {
  border-color: rgba(255, 255, 255, 0.25);
}
.pap__sector.es-elegido {
  border-color: var(--violeta);
  background: rgba(var(--violeta-rgb), 0.14);
}
.pap__sector b {
  color: var(--texto);
  font-size: 0.95rem;
}
.pap__sector small {
  color: var(--texto-3);
  font-size: 0.8rem;
}
.pap__form {
  display: grid;
  gap: 16px;
}
.pap__marco {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pap__marco > span {
  color: var(--texto-2);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.pap__campo, .res-input {
  box-sizing: border-box;
  border: 1px solid var(--linea);
  border-radius: calc(12px * var(--r-factor, 1));
  background: var(--fondo-2);
  width: 100%;
  color: var(--texto);
  padding: 13px 16px;
  font-family: inherit;
  font-size: 0.95rem;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}
.pap__campo:focus, .res-input:focus {
  outline: none;
  border-color: var(--violeta);
  box-shadow: 0 0 0 3px rgba(var(--violeta-rgb), 0.2);
}
.pap__nota {
  color: var(--texto-3);
  font-size: 0.82rem;
  line-height: 1.5;
  margin: 4px 0 0;
}
.res-error-box {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.92rem;
  font-weight: 600;
  margin-top: 14px;
}
.pap__pie {
  margin-top: 24px;
  position: sticky;
  bottom: 0;
  background: var(--fondo-1);
  padding: 16px 0 4px;
}
.pap__seguir, .res-submit-btn {
  border-radius: calc(14px * var(--r-factor, 1));
  background: var(--violeta);
  color: #ffffff;
  letter-spacing: 0.02em;
  cursor: pointer;
  border: 0;
  width: 100%;
  padding: 16px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  transition: all 0.16s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.pap__seguir:hover:not(:disabled), .res-submit-btn:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
}
.pap__seguir:disabled, .res-submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pap__seguir--confirmar {
  background: linear-gradient(135deg, #E5392C, #c02a1f);
  box-shadow: 0 6px 20px rgba(229, 57, 44, 0.4);
}
.res-success-view {
  text-align: center;
  padding: 20px 0;
}
.res-success-icon-badge {
  width: 60px;
  height: 60px;
  background: #10b981;
  color: #ffffff;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 14px;
}
.res-success-title {
  font-size: 1.6rem;
  margin-bottom: 6px;
  color: var(--texto);
}
.res-success-desc {
  color: var(--texto-3);
  font-size: 0.95rem;
  max-width: 500px;
  margin: 0 auto 20px auto;
}
.res-voucher-card {
  background: var(--fondo-2);
  border: 1px dashed var(--linea-viva);
  border-radius: 16px;
  padding: 24px;
  margin: 16px 0 24px;
  text-align: left;
}
.res-voucher-kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--texto-3);
  letter-spacing: 0.08em;
}
.res-voucher-code {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--violeta-claro);
  margin: 4px 0 16px;
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
  font-size: 0.7rem;
  color: var(--texto-3);
  text-transform: uppercase;
  font-weight: 600;
}
.voucher-value {
  font-size: 0.95rem;
  color: var(--texto);
}
.res-success-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}
.btn-whatsapp {
  background: #25d366;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.16s ease;
}
.btn-whatsapp:hover {
  background: #20ba5a;
  transform: translateY(-1px);
}
.res-new-booking-btn {
  background: transparent;
  border: 1px solid var(--linea);
  color: var(--texto);
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.16s ease;
}
.res-new-booking-btn:hover {
  background: var(--fondo-2);
  border-color: var(--texto-2);
}`,
    jsTemplate: `(function() {
  function isEditorMode() {
    return !!document.getElementById('__landing-blocks-root') &&
      document.documentElement.getAttribute('data-preview-mode') !== 'true';
  }

  function setupTableWidget(root) {
    if (root.__resTableMounted) return;
    root.__resTableMounted = true;

    function resolveRestaurantSlug(rootEl) {
      var slug = rootEl ? (rootEl.getAttribute('data-restaurant-slug') || '') : '';
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

    // Wizard navigation controls
    var currentStep = 1;
    var papBackBtn = root.querySelector('#papBackBtn');
    var papStepTitle = root.querySelector('#papStepTitle');
    var papStepCounter = root.querySelector('#papStepCounter');
    var papProgressBar = root.querySelector('#papProgressBar');
    var papNextBtn = root.querySelector('#papNextBtn');
    var submitBtn = root.querySelector('#resSubmitBtn');
    var btnText = root.querySelector('.res-btn-text');
    var btnSpinner = root.querySelector('.res-btn-spinner');

    var step1View = root.querySelector('#papStep1View');
    var step2View = root.querySelector('#papStep2View');
    var step3View = root.querySelector('#papStep3View');
    var step4View = root.querySelector('#papStep4View');

    // Live Sidebar Summary Elements
    var papResumenNoche = root.querySelector('#papResumenNoche');
    var papResumenPersonas = root.querySelector('#papResumenPersonas');
    var papResumenHora = root.querySelector('#papResumenHora');
    var papResumenDonde = root.querySelector('#papResumenDonde');

    // Calendar Elements
    var form = root.querySelector('#resTableForm');
    var daysRow = root.querySelector('#resDaysRow');
    var dateInput = root.querySelector('#resDateInput');
    var resCalPrevBtn = root.querySelector('#resCalPrevBtn');
    var resCalNextBtn = root.querySelector('#resCalNextBtn');
    var resCalMonthTitle = root.querySelector('#resCalMonthTitle');

    // Party elements
    var partyDisplay = root.querySelector('#papPartyDisplay');
    var partyMinusBtn = root.querySelector('#papPartyMinusBtn');
    var partyPlusBtn = root.querySelector('#papPartyPlusBtn');
    var partyPills = root.querySelectorAll('.pap__persona-pill, .res-party-pill');
    var selectedPartySizeInput = root.querySelector('#resSelectedPartySize');

    // Slots & Sectors
    var slotsContainer = root.querySelector('#resSlotsContainer');
    var slotsGrid = root.querySelector('#resSlotsGrid');
    var slotsAlert = root.querySelector('#resSlotsAlert');
    var selectedTimeInput = root.querySelector('#resSelectedTime');
    var selectedZoneInput = root.querySelector('#resSelectedZone');
    var sectorBtns = root.querySelectorAll('.pap__sector');

    // Form inputs
    var nameInput = root.querySelector('#resNameInput');
    var phoneInput = root.querySelector('#resPhoneInput');
    var emailInput = root.querySelector('#resEmailInput');
    var notesInput = root.querySelector('#resNotesInput');
    var errorBox = root.querySelector('#resErrorBox');
    var successView = root.querySelector('#resSuccessView');

    // Voucher elements
    var voucherCode = root.querySelector('#resVoucherCode');
    var voucherDate = root.querySelector('#resVoucherDate');
    var voucherTime = root.querySelector('#resVoucherTime');
    var voucherGuests = root.querySelector('#resVoucherGuests');
    var voucherZone = root.querySelector('#resVoucherZone');
    var voucherName = root.querySelector('#resVoucherName');
    var voucherWaBtn = root.querySelector('#resVoucherWaBtn');
    var newBookingBtn = root.querySelector('#resNewBookingBtn');

    var stepTitles = {
      1: '¿Cuándo te esperamos?',
      2: '¿Cuántos son?',
      3: '¿En qué horario?',
      4: 'Completá tus datos'
    };

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

    var dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    var monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    function formatReadableDateShort(isoStr) {
      if (!isoStr) return '—';
      var parts = isoStr.split('-');
      if (parts.length !== 3) return isoStr;
      var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return parseInt(parts[2], 10) + ' de ' + monthNames[d.getMonth()].toLowerCase();
    }

    var papBreadcrumbs = root.querySelector('#papBreadcrumbs');
    function updateBreadcrumbs() {
      if (!papBreadcrumbs) return;
      if (currentStep === 1) {
        papBreadcrumbs.style.display = 'none';
        papBreadcrumbs.innerHTML = '';
      } else {
        papBreadcrumbs.style.display = 'flex';
        var chips = [];
        if (selectedDateVal) {
          chips.push('<span class="pap__miga">' + formatReadableDateShort(selectedDateVal) + '</span>');
        }
        if (currentStep > 2) {
          var p = selectedPartySizeInput ? selectedPartySizeInput.value : '2';
          chips.push('<span class="pap__miga">' + p + ' personas</span>');
        }
        if (currentStep > 3 && selectedTimeInput && selectedTimeInput.value) {
          chips.push('<span class="pap__miga">' + selectedTimeInput.value + ' hs</span>');
        }
        papBreadcrumbs.innerHTML = chips.join('');
      }
    }

    function goToStep(step) {
      currentStep = step;
      if (step1View) step1View.style.display = (step === 1) ? 'flex' : 'none';
      if (step2View) step2View.style.display = (step === 2) ? 'flex' : 'none';
      if (step3View) step3View.style.display = (step === 3) ? 'flex' : 'none';
      if (step4View) step4View.style.display = (step === 4) ? 'flex' : 'none';

      if (papBackBtn) papBackBtn.disabled = (step === 1);
      if (papStepCounter) papStepCounter.textContent = 'Paso ' + step + ' de 4';
      if (papStepTitle) papStepTitle.textContent = stepTitles[step] || 'Reservar Mesa';

      var progressPercentages = { 1: '25%', 2: '50%', 3: '75%', 4: '100%' };
      if (papProgressBar) papProgressBar.style.width = progressPercentages[step] || '25%';

      updateBreadcrumbs();

      if (step === 4) {
        if (papNextBtn) papNextBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'flex';
      } else {
        if (papNextBtn) papNextBtn.style.display = 'flex';
        if (submitBtn) submitBtn.style.display = 'none';
      }

      // Check button enablement
      if (step === 1 && papNextBtn) {
        papNextBtn.disabled = !selectedDateVal;
      } else if (step === 2 && papNextBtn) {
        papNextBtn.disabled = false;
      } else if (step === 3 && papNextBtn) {
        papNextBtn.disabled = !selectedTimeInput.value;
      }
    }

    if (papBackBtn) {
      papBackBtn.addEventListener('click', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();
        if (currentStep > 1) {
          goToStep(currentStep - 1);
        }
      });
    }

    if (papNextBtn) {
      papNextBtn.addEventListener('click', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();
        if (currentStep === 1) {
          if (!selectedDateVal) return;
          goToStep(2);
        } else if (currentStep === 2) {
          goToStep(3);
        } else if (currentStep === 3) {
          if (!selectedTimeInput || !selectedTimeInput.value) {
            if (slotsAlert) {
              slotsAlert.textContent = 'Por favor seleccioná un turno antes de continuar.';
              slotsAlert.style.display = 'block';
            }
            return;
          }
          goToStep(4);
        }
      });
    }

    function renderCalendar(year, month) {
      if (!daysRow) return;
      if (resCalMonthTitle) {
        resCalMonthTitle.textContent = monthNames[month].toLowerCase() + ' de ' + year;
      }
      if (resCalPrevBtn) {
        resCalPrevBtn.disabled = (year < todayObj.getFullYear() || (year === todayObj.getFullYear() && month <= todayObj.getMonth()));
      }

      var firstDay = new Date(year, month, 1).getDay(); // 0 = Domingo
      var daysInMonth = new Date(year, month + 1, 0).getDate();

      daysRow.innerHTML = '';

      for (var i = 0; i < firstDay; i++) {
        var empty = document.createElement('div');
        empty.className = 'pap__cal-empty res-cal-empty';
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
        btn.className = 'pap__celda res-day-chip';
        btn.setAttribute('data-date', iso);
        btn.setAttribute('role', 'gridcell');

        if (isSelected && !isPast && !isClosed) btn.classList.add('es-elegida', 'active');
        if (isPast) btn.classList.add('es-bloqueada', 'res-day-past');
        else if (isClosed) btn.classList.add('es-bloqueada', 'res-day-closed');
        else if (isFullyBooked) btn.classList.add('es-bloqueada', 'res-day-busy');

        btn.disabled = (isPast || isClosed || isFullyBooked);

        btn.innerHTML = '<span>' + d + '</span>' +
          (!isPast && !isClosed ? '<span class="pap__punto res-cal-day-dot"></span>' : '');

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
        var chips = daysRow.querySelectorAll('.pap__celda, .res-day-chip');
        chips.forEach(function(c) {
          var isMatch = c.getAttribute('data-date') === dateVal;
          c.classList.toggle('es-elegida', isMatch);
          c.classList.toggle('active', isMatch);
        });
      }
      if (papResumenNoche) {
        papResumenNoche.textContent = formatReadableDateShort(dateVal);
      }
      if (papNextBtn && currentStep === 1) {
        papNextBtn.disabled = false;
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
            datesCache[d.date] = d;
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

    // Party size counter
    function updatePartySize(val) {
      var n = Math.max(1, Math.min(val, 20));
      if (partyDisplay) partyDisplay.textContent = String(n);
      if (selectedPartySizeInput) selectedPartySizeInput.value = String(n);
      if (papResumenPersonas) {
        papResumenPersonas.textContent = n + (n === 1 ? ' persona' : ' personas');
      }
      partyPills.forEach(function(p) {
        var pVal = parseInt(p.getAttribute('data-party'), 10);
        var match = (pVal === n) || (n >= 8 && p.getAttribute('data-party') === '8');
        p.classList.toggle('es-activa', match);
        p.classList.toggle('active', match);
      });
      if (partyMinusBtn) partyMinusBtn.disabled = (n <= 1);
    }

    if (partyMinusBtn) {
      partyMinusBtn.addEventListener('click', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();
        var current = parseInt(selectedPartySizeInput ? selectedPartySizeInput.value : '2', 10) || 2;
        updatePartySize(current - 1);
      });
    }

    if (partyPlusBtn) {
      partyPlusBtn.addEventListener('click', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();
        var current = parseInt(selectedPartySizeInput ? selectedPartySizeInput.value : '2', 10) || 2;
        updatePartySize(current + 1);
      });
    }

    partyPills.forEach(function(pill) {
      pill.addEventListener('click', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();
        var n = parseInt(pill.getAttribute('data-party'), 10) || 2;
        updatePartySize(n);
      });
    });

    // Sectors / Espacios
    sectorBtns.forEach(function(secBtn) {
      secBtn.addEventListener('click', function(e) {
        if (isEditorMode()) return;
        e.preventDefault();
        sectorBtns.forEach(function(b) { b.classList.remove('es-elegido'); });
        secBtn.classList.add('es-elegido');
        var zone = secBtn.getAttribute('data-zone') || 'Salón Principal';
        if (selectedZoneInput) selectedZoneInput.value = zone;
        if (papResumenDonde) papResumenDonde.textContent = zone;
      });
    });

    function fetchAvailability(date) {
      if (!slug) return;
      var dateVal = date || selectedDateVal || todayStr;
      if (!dateVal) return;

      if (slotsGrid) {
        slotsGrid.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--texto-3); font-size: 0.9rem; grid-column: 1 / -1;">⏳ Consultando turnos...</div>';
      }
      if (slotsAlert) slotsAlert.style.display = 'none';

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
      if (slotsGrid) {
        slotsGrid.innerHTML = [
          '<button type="button" class="pap__hora res-slot-pill active es-elegida" data-time="20:00">20:00</button>',
          '<button type="button" class="pap__hora res-slot-pill" data-time="21:00">21:00</button>',
          '<button type="button" class="pap__hora res-slot-pill" data-time="22:00">22:00</button>'
        ].join('\n');
        if (selectedTimeInput) selectedTimeInput.value = '20:00';
        if (papResumenHora) papResumenHora.textContent = '20:00 hs';
        bindSlotButtons();
      }
    }

    function renderDaySlots(dayInfo) {
      if (!slotsGrid) return;
      if (!dayInfo) {
        slotsGrid.innerHTML = '<div class="res-slots-alert" style="display:block; grid-column: 1 / -1;">No se encontró configuración para la fecha seleccionada.</div>';
        if (selectedTimeInput) selectedTimeInput.value = '';
        if (papResumenHora) papResumenHora.textContent = '—';
        return;
      }

      if (dayInfo.status === 'CLOSED_RECURRING' || dayInfo.status === 'BLOCKED_DATE' || dayInfo.status === 'FULLY_BOOKED') {
        var msg = (dayInfo.status === 'FULLY_BOOKED')
          ? '⏳ Todos los turnos de este día se encuentran completos. Por favor elegí otra fecha.'
          : '🚫 ' + (dayInfo.reason || 'El restaurante se encuentra cerrado en esta fecha.');
        slotsGrid.innerHTML = '<div class="res-slots-alert" style="display:block; grid-column: 1 / -1;">' + msg + '</div>';
        if (selectedTimeInput) selectedTimeInput.value = '';
        if (papResumenHora) papResumenHora.textContent = '—';
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
        slotsGrid.innerHTML = '<div class="res-slots-alert" style="display:block; grid-column: 1 / -1;">No hay turnos disponibles para esta fecha.</div>';
        if (selectedTimeInput) selectedTimeInput.value = '';
        if (papResumenHora) papResumenHora.textContent = '—';
        return;
      }

      var html = [];
      var firstFreeSelected = false;

      allTimes.forEach(function(slot) {
        var isOccupied = slot.occupied;
        var isSelected = !isOccupied && !firstFreeSelected;
        if (isSelected) {
          firstFreeSelected = true;
          if (selectedTimeInput) selectedTimeInput.value = slot.time;
          if (papResumenHora) papResumenHora.textContent = slot.time + ' hs';
        }

        var classes = 'pap__hora res-slot-pill';
        if (isSelected) classes += ' active es-elegida';
        if (isOccupied) classes += ' res-slot-busy';

        var disabledAttr = isOccupied ? ' disabled title="Turno ocupado"' : '';
        html.push('<button type="button" class="' + classes + '" data-time="' + slot.time + '"' + disabledAttr + '>' + slot.time + '</button>');
      });

      slotsGrid.innerHTML = html.join('\n');
      bindSlotButtons();
    }

    function bindSlotButtons() {
      var slotBtns = slotsGrid ? slotsGrid.querySelectorAll('.pap__hora:not(:disabled), .res-slot-pill:not(:disabled)') : [];
      slotBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          if (isEditorMode()) return;
          e.preventDefault();
          slotsGrid.querySelectorAll('.pap__hora, .res-slot-pill').forEach(function(b) {
            b.classList.remove('active', 'es-elegida');
          });
          btn.classList.add('active', 'es-elegida');
          var timeVal = btn.getAttribute('data-time') || '';
          if (selectedTimeInput) selectedTimeInput.value = timeVal;
          if (papResumenHora) papResumenHora.textContent = timeVal ? (timeVal + ' hs') : '—';
          if (papNextBtn && currentStep === 3) papNextBtn.disabled = false;
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
        var zone = selectedZoneInput ? selectedZoneInput.value : 'Salón Principal';

        if (!date) {
          showError('Por favor seleccioná una fecha para tu reserva.');
          goToStep(1);
          return;
        }
        if (!time) {
          showError('Por favor seleccioná un turno u horario disponible.');
          goToStep(3);
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
          notes: (zone ? ('[Espacio: ' + zone + '] ') : '') + (notes || '')
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
                goToStep(3);
              }
              return;
            }

            var resData = resObj.data.data.reservation;
            showSuccess(resData, zone);
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

    function showSuccess(reservation, zone) {
      if (form) form.style.display = 'none';
      var widget = root.querySelector('#resPapWidget');
      if (widget) {
        var headerBar = widget.querySelector('.pap__barra');
        var progressBar = widget.querySelector('.pap__avance');
        if (headerBar) headerBar.style.display = 'none';
        if (progressBar) progressBar.style.display = 'none';
      }

      if (successView) {
        successView.style.display = 'block';
        if (voucherCode) voucherCode.textContent = reservation.code || '#RES-OK';
        if (voucherDate) voucherDate.textContent = reservation.date;
        if (voucherTime) voucherTime.textContent = reservation.time + ' hs';
        if (voucherGuests) voucherGuests.textContent = reservation.partySize + ' personas';
        if (voucherZone) voucherZone.textContent = zone || 'Salón Principal';
        if (voucherName) voucherName.textContent = reservation.customerName;

        var restaurantName = root.getAttribute('data-restaurant-name') || 'el restaurante';
        var restaurantPhone = root.getAttribute('data-restaurant-phone') || '';
        var waPhone = restaurantPhone.replace(/[^0-9]/g, '');
        var waMsg = encodeURIComponent('¡Hola! Tengo una reserva confirmada en ' + restaurantName + '.\\nCódigo: ' + (reservation.code || '') + '\\nFecha: ' + reservation.date + ' ' + reservation.time + ' hs\\nComensales: ' + reservation.partySize + '\\nEspacio: ' + (zone || 'Salón Principal') + '\\nA nombre de: ' + reservation.customerName);
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
        var widget = root.querySelector('#resPapWidget');
        if (widget) {
          var headerBar = widget.querySelector('.pap__barra');
          var progressBar = widget.querySelector('.pap__avance');
          if (headerBar) headerBar.style.display = 'grid';
          if (progressBar) progressBar.style.display = 'block';
        }
        if (form) {
          form.reset();
          form.style.display = 'block';
        }
        selectedDateVal = todayStr;
        if (dateInput) dateInput.value = todayStr;
        updatePartySize(2);
        renderCalendar(viewYear, viewMonth);
        selectDate(todayStr);
        goToStep(1);
        fetchMonthAvailability(viewYear, viewMonth);
      });
    }

    renderCalendar(viewYear, viewMonth);
    selectDate(todayStr);
    updatePartySize(2);
    goToStep(1);

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
    description: "Módulo interactivo completo sincronizado al CMS: Reserva de Mesas (calendario y turnos en vivo) y Entradas para Eventos Especiales.",
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
        resCalMonthTitle.textContent = monthNames[month].toLowerCase() + ' de ' + year;
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
    description: "Cierre editorial sobrio con nombre completo de la marca, derechos de autor y accesos rápidos.",
    category: "estructura",
    fields: [
      { key: "brandTitle", label: "Nombre del local", type: "text", defaultValue: "{{restaurantName}}" },
      { key: "copyrightText", label: "Texto de derechos", type: "text", defaultValue: "Cocina de estación y cava. Todos los derechos reservados." },
      { key: "menuLinkText", label: "Texto enlace carta", type: "text", defaultValue: "Ver Carta Digital" },
      { key: "topLinkText", label: "Texto enlace subir", type: "text", defaultValue: "Volver arriba ↑" },
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
  background-color: var(--color-primary);
  color: rgba(255, 255, 255, 0.75);
  padding: 48px 0;
  font-size: 0.9rem;
}
.footer-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
}
.footer-brand .brand-name {
  color: #ffffff;
  font-family: var(--font-serif);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  display: block;
  margin-bottom: 6px;
}
.footer-copy {
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.88rem;
}
.footer-links {
  display: flex;
  gap: 24px;
}
.footer-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-weight: 500;
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
    <article class="custom-module-card">
      <h3>{{title}}</h3>
      <p>{{subtitle}}</p>
    </article>
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
    description: "Franja de 4 indicadores gastronómicos numéricos con tipografía display cuidada.",
    category: "contenido",
    fields: [
      { key: "stat1Value", label: "Métrica 1 (Valor)", type: "text", defaultValue: "45 Días" },
      { key: "stat1Label", label: "Métrica 1 (Etiqueta)", type: "text", defaultValue: "Maduración en cámara seca" },
      { key: "stat2Value", label: "Métrica 2 (Valor)", type: "text", defaultValue: "4.9 ★" },
      { key: "stat2Label", label: "Métrica 2 (Etiqueta)", type: "text", defaultValue: "Calificación comensales" },
      { key: "stat3Value", label: "Métrica 3 (Valor)", type: "text", defaultValue: "100%" },
      { key: "stat3Label", label: "Métrica 3 (Etiqueta)", type: "text", defaultValue: "Masa madre & leña viva" },
      { key: "stat4Value", label: "Métrica 4 (Valor)", type: "text", defaultValue: "+350" },
      { key: "stat4Label", label: "Métrica 4 (Etiqueta)", type: "text", defaultValue: "Etiquetas en cava subterránea" },
    ],
    htmlTemplate: `<section class="section stats-strip-section">
  <div class="container stats-strip-grid">
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
</section>`,
    cssTemplate: `.stats-strip-section {
  padding: 56px 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-card-bg);
}
.stats-strip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  text-align: center;
}
.stat-card {
  padding: 16px;
}
.stat-val {
  display: block;
  font-family: var(--font-serif);
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-primary);
  margin-bottom: 6px;
}
.stat-lbl {
  font-size: 0.88rem;
  color: var(--color-text-muted);
  font-weight: 500;
  letter-spacing: 0.02em;
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "gallery-grid",
    name: "Galería de Fotos",
    description: "Mosaico visual de 3 fotografías gastronómicas destacadas con aspecto editorial y pie de imagen.",
    category: "tarjetas",
    fields: [
      { key: "tag", label: "Etiqueta superior", type: "text", defaultValue: "ATMÓSFERA & COCINA" },
      { key: "title", label: "Título de sección", type: "text", defaultValue: "La experiencia en imágenes" },
      { key: "img1Url", label: "Foto 1", type: "image", defaultValue: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85" },
      { key: "img1Caption", label: "Pie de foto 1", type: "text", defaultValue: "Cortes a la Leña de Quebracho" },
      { key: "img2Url", label: "Foto 2", type: "image", defaultValue: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85" },
      { key: "img2Caption", label: "Pie de foto 2", type: "text", defaultValue: "Pastas Amasadas a Mano" },
      { key: "img3Url", label: "Foto 3", type: "image", defaultValue: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85" },
      { key: "img3Caption", label: "Pie de foto 3", type: "text", defaultValue: "Cava de Vinos Subterránea" },
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
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
  transform: scale(1.03);
}
.gallery-item figcaption {
  position: absolute;
  inset: auto 0 0 0;
  padding: 16px 20px;
  background: rgba(14, 18, 15, 0.82);
  backdrop-filter: blur(8px);
  color: #ffffff;
  font-weight: 600;
  font-size: 0.92rem;
}`,
    jsTemplate: "",
  },
  {
    moduleKey: "image-spotlight",
    name: "Sección con Imagen Destacada",
    description: "Bloque visual de dos columnas con fotografía protagonista, texto editorial y llamada a la carta.",
    category: "contenido",
    fields: [
      { key: "kicker", label: "Etiqueta superior", type: "text", defaultValue: "PLATO INSIGNIA" },
      { key: "title", label: "Título principal", type: "text", defaultValue: "Ojo de bife madurado 45 días a la leña viva" },
      { key: "description", label: "Descripción", type: "textarea", defaultValue: "Seleccionamos novillos Angus de pastura y maduramos los cortes en nuestras propias cámaras con ventilación y humedad controlada para concentrar aromas terrosos y terneza absoluta." },
      { key: "photoUrl", label: "Fotografía destacada", type: "image", defaultValue: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85" },
      { key: "photoCaption", label: "Etiqueta sobre la foto", type: "text", defaultValue: "45 días de maduración en cámara seca" },
      { key: "ctaText", label: "Texto del botón", type: "text", defaultValue: "Ver Guía de Cortes & Carta" },
      { key: "ctaUrl", label: "URL del botón", type: "url", defaultValue: "{{menuUrl}}" },
    ],
    htmlTemplate: `<section class="section image-spotlight-section">
  <div class="container image-spotlight-grid">
    <figure class="image-spotlight-media">
      <img src="{{photoUrl}}" alt="{{title}}" loading="lazy" />
      <figcaption class="image-spotlight-caption">{{photoCaption}}</figcaption>
    </figure>
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
  background: rgba(18, 25, 18, 0.85);
  backdrop-filter: blur(8px);
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
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
    description: "Acordeón interactivo para resolver consultas sobre reservas, alérgenos, descorche y eventos.",
    category: "contenido",
    fields: [
      { key: "title", label: "Título FAQ", type: "text", defaultValue: "Preguntas Frecuentes sobre el Servicio" },
      { key: "q1", label: "Pregunta 1", type: "text", defaultValue: "¿Es necesario reservar mesa con anticipación?" },
      { key: "a1", label: "Respuesta 1", type: "textarea", defaultValue: "Recomendamos reservar con 24 a 48 hs de antelación para turnos nocturnos y fines de semana. Las reservas cuentan con una tolerancia de 15 minutos." },
      { key: "q2", label: "Pregunta 2", type: "text", defaultValue: "¿Cuentan con opciones aptas celíacos (sin TACC) o vegetarianas?" },
      { key: "a2", label: "Respuesta 2", type: "textarea", defaultValue: "Sí. Toda nuestra carta digital identifica alérgenos, opciones sin TACC elaboradas con vajilla dedicada y platos vegetarianos de estación." },
      { key: "q3", label: "Pregunta 3", type: "text", defaultValue: "¿Disponen de servicio de descorche y valet parking?" },
      { key: "a3", label: "Respuesta 3", type: "textarea", defaultValue: "Contamos con valet parking sin cargo en puerta y servicio de descorche para botellas especiales que no figuren en nuestra cava subterránea." },
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
.faq-list { display: flex; flex-direction: column; gap: 14px; }
.faq-item {
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  transition: var(--transition);
}
.faq-item[open] {
  border-color: var(--color-accent);
}
.faq-item summary {
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text-main);
  font-size: 1.05rem;
  line-height: 1.4;
}
.faq-item p {
  margin-top: 12px;
  color: var(--color-text-muted);
  font-size: 0.96rem;
  line-height: 1.6;
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
