import { notFound } from "next/navigation";
import { getActiveTenantBySlug } from "@/features/tenants/backend/services/tenant.service";
import { getFontSelection } from "@/features/fonts/backend/services/font.service";
import { FONT_TARGETS, type FontDTO } from "@/features/fonts/backend/types";

export const dynamic = "force-dynamic";

export default async function PublicMenuLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let tenant;
  try { tenant = await getActiveTenantBySlug(slug); } catch { notFound(); }
  const selection = await getFontSelection(tenant!.id);
  const fallback = "Arial, Helvetica, sans-serif";
  const familyFor = (font: FontDTO | null) => font?.fontFamily ?? fallback;
  const cssVars = {
    "--font-menu": familyFor(selection.global),
    "--font-menu-title": familyFor(selection.title ?? selection.global),
    "--font-menu-subtitle": familyFor(selection.subtitle ?? selection.global),
    "--font-menu-group": familyFor(selection.group ?? selection.global),
    "--font-menu-product": familyFor(selection.product ?? selection.global),
    "--font-menu-featured": familyFor(selection.featured ?? selection.global),
  } as React.CSSProperties;
  const uniqueFonts = new Map<string, FontDTO>();
  for (const target of FONT_TARGETS) { const font = selection[target]; if (font) uniqueFonts.set(font.id, font); }
  const activeFonts = Array.from(uniqueFonts.values());
  const googleFonts = activeFonts.filter((font) => font.source === "google" && font.googleFamily);
  const customFonts = activeFonts.filter((font) => font.source === "custom" && font.filePath);

  return <div style={cssVars}>
    {googleFonts.map((font) => <link key={font.id} rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${font.googleFamily!.replace(/ /g, "+")}:wght@${font.weights}&display=swap`} />)}
    {customFonts.length > 0 && <style dangerouslySetInnerHTML={{ __html: customFonts.map((font) => `@font-face{font-family:'${font.name}';src:url('/api/public/menus/${tenant!.slug}/fonts/${font.id}/file');font-weight:400;font-style:normal;font-display:swap;}`).join("\n") }} />}
    {children}
  </div>;
}
