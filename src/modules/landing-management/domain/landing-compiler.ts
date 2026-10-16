/**
 * Pure domain logic for compiling landing page HTML, CSS, and JS into a complete standalone document.
 * Adheres to framework-free architecture rule.
 */

export type CompileLandingInput = {
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  title?: string;
};

export function compileLandingDocument({
  htmlContent,
  cssContent,
  jsContent,
  title = "Restaurante",
}: CompileLandingInput): string {
  // If the user already provided a full <!DOCTYPE html> or <html> document, we inject style and script into head/body
  const hasHtmlTag = /<html[\s>]/i.test(htmlContent);

  if (hasHtmlTag) {
    let result = htmlContent;

    if (cssContent.trim()) {
      const styleTag = `<style id="custom-landing-css">\n${cssContent}\n</style>`;
      if (/<\/head>/i.test(result)) {
        result = result.replace(/<\/head>/i, `${styleTag}\n</head>`);
      } else {
        result = `${styleTag}\n${result}`;
      }
    }

    if (jsContent.trim()) {
      const scriptTag = `<script id="custom-landing-js">\n${jsContent}\n</script>`;
      if (/<\/body>/i.test(result)) {
        result = result.replace(/<\/body>/i, `${scriptTag}\n</body>`);
      } else {
        result = `${result}\n${scriptTag}`;
      }
    }

    return result;
  }

  // Otherwise, wrap the body markup inside a complete, responsive HTML5 shell
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
${cssContent}
  </style>
</head>
<body>
${htmlContent}
  <script>
${jsContent}
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function createDefaultLandingTemplate(restaurantName: string, restaurantSlug: string): {
  html: string;
  css: string;
  js: string;
} {
  const safeName = restaurantName.trim() || "Nuestro Restaurante";
  const menuUrl = `/m/${restaurantSlug}`;

  const html = `<!-- Header / Navegación -->
<header class="site-header">
  <div class="container nav-container">
    <a href="#" class="brand-logo">
      <span class="brand-icon">🍽️</span>
      <span class="brand-name">${safeName}</span>
    </a>

    <nav class="nav-menu" id="navMenu">
      <a href="#inicio" class="nav-link">Inicio</a>
      <a href="#destacados" class="nav-link">Especialidades</a>
      <a href="#experiencia" class="nav-link">Experiencia</a>
      <a href="#contacto" class="nav-link">Ubicación</a>
      <a href="${menuUrl}" target="_top" class="btn btn-primary nav-cta">Ver Carta Digital</a>
    </nav>

    <button class="nav-toggle" id="navToggle" aria-label="Abrir menú">
      <span></span>
      <span></span>
      <span></span>
    </button>
  </div>
</header>

<!-- Hero Section -->
<section class="hero-section" id="inicio">
  <div class="hero-backdrop"></div>
  <div class="container hero-container">
    <div class="hero-content">
      <span class="hero-badge">Sabor & Tradición Gastronómica</span>
      <h1 class="hero-title">Una experiencia culinaria que despierta tus sentidos</h1>
      <p class="hero-subtitle">
        Descubrí ingredientes frescos, recetas de autor y una ambientación pensada para compartir momentos inolvidables en ${safeName}.
      </p>
      <div class="hero-actions">
        <a href="${menuUrl}" target="_top" class="btn btn-primary btn-lg">
          <span>📖 Ver Menú Digital</span>
        </a>
        <a href="#contacto" class="btn btn-secondary btn-lg">
          <span>📍 Cómo Llegar</span>
        </a>
      </div>
    </div>
  </div>
</section>

<!-- Especialidades Destacadas -->
<section class="section specialties-section" id="destacados">
  <div class="container">
    <div class="section-header">
      <span class="section-kicker">Nuestra Propuesta</span>
      <h2 class="section-title">Especialidades de la Casa</h2>
      <p class="section-description">Platos elaborados con dedicación, cuidando cada detalle y selección de materia prima.</p>
    </div>

    <div class="cards-grid">
      <article class="card">
        <div class="card-icon">🥩</div>
        <h3 class="card-title">Cortes Seleccionados</h3>
        <p class="card-text">Cocción a fuego lento con madera de quebracho y sazonado con sales aromáticas exclusivas.</p>
      </article>

      <article class="card featured-card">
        <div class="card-icon">🍝</div>
        <div class="card-badge">Favorito</div>
        <h3 class="card-title">Pastas Artesanales</h3>
        <p class="card-text">Amasadas a diario con sémola de trigo candeal, salsas reducidas por horas y quesos madurados.</p>
      </article>

      <article class="card">
        <div class="card-icon">🍷</div>
        <h3 class="card-title">Cava & Coctelería</h3>
        <p class="card-text">Maridajes recomendados por sommeliers y cócteles clásicos reversionados por nuestro bartender.</p>
      </article>
    </div>

    <div class="section-cta-wrap">
      <a href="${menuUrl}" target="_top" class="btn btn-outline">Explorar toda la carta interactiva →</a>
    </div>
  </div>
</section>

<!-- Experiencia / Historia -->
<section class="section experience-section" id="experiencia">
  <div class="container experience-container">
    <div class="experience-visual">
      <div class="experience-badge-float">
        <span class="exp-number">100%</span>
        <span class="exp-label">Pasión Artesanal</span>
      </div>
      <div class="experience-quote">
        <p>"La cocina no es solo alimentar, es generar recuerdos que perduran en cada bocado."</p>
      </div>
    </div>
    <div class="experience-content">
      <span class="section-kicker">Filosofía</span>
      <h2 class="section-title">Pasión por el detalle</h2>
      <p class="section-text">
        En ${safeName} creemos que cada comida debe ser una celebración. Por eso trabajamos junto a productores locales para garantizar frescura, sustentabilidad y sabor genuino.
      </p>
      <div class="features-list">
        <div class="feature-item">
          <span class="feature-check">✓</span>
          <div>
            <strong>Ingredientes Locales:</strong> Priorizamos productores regionales de primera calidad.
          </div>
        </div>
        <div class="feature-item">
          <span class="feature-check">✓</span>
          <div>
            <strong>Ambiente Cálido:</strong> Espacios diseñados para encuentros relajados y ocasiones especiales.
          </div>
        </div>
        <div class="feature-item">
          <span class="feature-check">✓</span>
          <div>
            <strong>Menú Digital Siempre al Día:</strong> Consultá opciones y sugerencias en tiempo real desde tu móvil.
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Información y Contacto -->
<section class="section contact-section" id="contacto">
  <div class="container">
    <div class="section-header">
      <span class="section-kicker">Visitános</span>
      <h2 class="section-title">Horarios y Ubicación</h2>
      <p class="section-description">Te esperamos con las puertas abiertas para compartir un momento único.</p>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <span class="info-icon">🕒</span>
        <h3>Horarios de Atención</h3>
        <p><strong>Martes a Sábado:</strong> 12:00 a 16:00 | 20:00 a 00:30</p>
        <p><strong>Domingos:</strong> 12:30 a 17:00</p>
        <p class="info-note">Lunes cerrado por descanso del equipo.</p>
      </div>

      <div class="info-card">
        <span class="info-icon">📍</span>
        <h3>Ubicación</h3>
        <p>Avenida Principal 1234, Centro Histórico</p>
        <p>Estacionamiento exclusivo para clientes.</p>
      </div>

      <div class="info-card">
        <span class="info-icon">📞</span>
        <h3>Reservas & Consultas</h3>
        <p>Teléfono: +54 9 11 0000-0000</p>
        <p>WhatsApp: +54 9 11 9999-9999</p>
        <a href="https://wa.me/" target="_blank" rel="noreferrer" class="btn btn-whatsapp mt-3">Escribinos por WhatsApp</a>
      </div>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="site-footer">
  <div class="container footer-container">
    <div class="footer-brand">
      <span class="brand-name">${safeName}</span>
      <p class="footer-copy">© <span id="currentYear"></span> ${safeName}. Todos los derechos reservados.</p>
    </div>
    <div class="footer-links">
      <a href="${menuUrl}" target="_top" class="footer-link">Carta Digital</a>
      <a href="#inicio" class="footer-link">Subir</a>
    </div>
  </div>
</footer>`;

  const css = `/* Reset & Variables */
:root {
  --color-primary: #1e3321;
  --color-primary-light: #2c4a30;
  --color-accent: #c49a45;
  --color-accent-hover: #b08736;
  --color-bg: #faf8f5;
  --color-card-bg: #ffffff;
  --color-text-main: #192019;
  --color-text-muted: #5e695d;
  --color-border: #e8e4dc;
  --font-main: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-serif: 'Playfair Display', Georgia, serif;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 24px;
  --shadow-soft: 0 10px 30px -10px rgba(30, 51, 33, 0.08);
  --shadow-hover: 0 20px 40px -12px rgba(30, 51, 33, 0.16);
  --transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  font-size: 16px;
}

body {
  font-family: var(--font-main);
  background-color: var(--color-bg);
  color: var(--color-text-main);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* Utilitarios & Contenedor */
.container {
  width: 90%;
  max-width: 1140px;
  margin: 0 auto;
}

/* Tipografía */
h1, h2, h3 {
  font-family: var(--font-serif);
  color: var(--color-primary);
  line-height: 1.2;
}

/* Botones */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  text-decoration: none;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid transparent;
}

.btn-primary {
  background-color: var(--color-primary);
  color: #ffffff;
}
.btn-primary:hover {
  background-color: var(--color-primary-light);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(30, 51, 33, 0.2);
}

.btn-secondary {
  background-color: rgba(255, 255, 255, 0.9);
  color: var(--color-primary);
  border-color: var(--color-border);
}
.btn-secondary:hover {
  background-color: #ffffff;
  transform: translateY(-2px);
}

.btn-outline {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: transparent;
}
.btn-outline:hover {
  background-color: var(--color-primary);
  color: #ffffff;
}

.btn-whatsapp {
  background-color: #25d366;
  color: #ffffff;
}
.btn-whatsapp:hover {
  background-color: #20ba5a;
}

.btn-lg {
  padding: 15px 32px;
  font-size: 1.05rem;
}

.mt-3 {
  margin-top: 14px;
}

/* Header */
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: rgba(250, 248, 245, 0.92);
  backdrop-filter: blur(10px);
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

.brand-icon {
  font-size: 1.5rem;
}

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
.nav-link:hover {
  color: var(--color-accent);
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
  width: 24px;
  height: 2px;
  background-color: var(--color-primary);
  transition: var(--transition);
}

/* Hero */
.hero-section {
  position: relative;
  padding: 100px 0 120px;
  overflow: hidden;
  background: linear-gradient(145deg, #f3ede2 0%, #faf8f5 100%);
}

.hero-container {
  position: relative;
  z-index: 2;
}

.hero-content {
  max-width: 680px;
}

.hero-badge {
  display: inline-block;
  padding: 6px 14px;
  background-color: #e8eee6;
  color: var(--color-primary);
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
}

.hero-title {
  font-size: 3.25rem;
  letter-spacing: -0.02em;
  margin-bottom: 20px;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: var(--color-text-muted);
  margin-bottom: 34px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

/* Secciones Generales */
.section {
  padding: 90px 0;
}

.section-header {
  text-align: center;
  max-width: 620px;
  margin: 0 auto 54px;
}

.section-kicker {
  display: block;
  color: var(--color-accent);
  font-size: 0.88rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 8px;
}

.section-title {
  font-size: 2.3rem;
  margin-bottom: 12px;
}

.section-description {
  color: var(--color-text-muted);
  font-size: 1.05rem;
}

/* Cards de Especialidades */
.cards-grid {
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
  border-color: #d6cfc2;
}

.featured-card {
  border-color: var(--color-accent);
  background: linear-gradient(180deg, #fffcf6 0%, #ffffff 100%);
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
}

/* Experiencia */
.experience-section {
  background-color: #f3ede4;
}

.experience-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.experience-visual {
  position: relative;
  background: linear-gradient(135deg, var(--color-primary) 0%, #101c12 100%);
  border-radius: var(--radius-lg);
  padding: 60px 40px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 380px;
}

.experience-quote p {
  font-family: var(--font-serif);
  font-size: 1.45rem;
  font-style: italic;
  line-height: 1.5;
  color: #f7f3ec;
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

/* Info Grid */
.info-grid {
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

/* Footer */
.site-footer {
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
.footer-link:hover {
  color: #ffffff;
}

/* Responsive */
@media (max-width: 868px) {
  .hero-title {
    font-size: 2.4rem;
  }
  .experience-container {
    grid-template-columns: 1fr;
    gap: 36px;
  }
  .nav-menu {
    position: fixed;
    top: 68px;
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
  .nav-menu.open {
    display: flex;
  }
  .nav-toggle {
    display: flex;
  }
}`;

  const js = `// Funcionalidades interactivas de la Landing
document.addEventListener('DOMContentLoaded', () => {
  // Año dinámico en footer
  const yearElement = document.getElementById('currentYear');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Toggle de navegación móvil
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    // Cerrar al hacer clic en un enlace interno
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }
});`;

  return { html, css, js };
}
