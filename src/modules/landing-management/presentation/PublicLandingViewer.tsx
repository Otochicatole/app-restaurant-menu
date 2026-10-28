import Link from "next/link";
import { Utensils } from "lucide-react";
import { LANDING_RUNTIME_NAVIGATION_SCRIPT } from "../domain/landing-compiler";

function ensureRuntimeNavigationScript(html: string): string {
  if (html.includes("__landingNavBound")) {
    return html;
  }
  const tag = `<script>${LANDING_RUNTIME_NAVIGATION_SCRIPT}</script>`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${tag}\n</body>`);
  }
  return `${html}\n${tag}`;
}

export function PublicLandingViewer({
  html,
  restaurantName,
}: {
  html: string;
  restaurantName: string;
}) {
  const enhancedHtml = ensureRuntimeNavigationScript(html);

  return (
    <iframe
      title={`Landing - ${restaurantName}`}
      srcDoc={enhancedHtml}
      className="fixed inset-0 h-full w-full border-0 bg-white"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-top-navigation-by-user-activation"
    />
  );
}

export function LandingPreparationScreen({
  restaurantName,
  menuSlug,
}: {
  restaurantName: string;
  menuSlug: string;
}) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f8f5ee] px-6 text-center text-[#1c2c1a]">
      <div className="max-w-md rounded-3xl border border-[#1c2c1a]/10 bg-white/80 p-8 shadow-sm backdrop-blur-xs sm:p-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef3eb] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#3d5934]">
          <Utensils size={12} />
          {restaurantName}
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#141d14] sm:text-4xl">
          Landing en preparación
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#556353]">
          Estamos preparando nuestro nuevo sitio web. Muy pronto podrás conocer más sobre nuestra propuesta aquí.
        </p>
        <div className="mt-6 pt-6 border-t border-[#1c2c1a]/10">
          <Link
            href={`/m/${menuSlug}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#253621] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a2817]"
          >
            Ver Carta Digital interactiva
          </Link>
        </div>
      </div>
    </main>
  );
}
