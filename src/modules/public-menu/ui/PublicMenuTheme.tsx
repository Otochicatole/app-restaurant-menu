import { FONT_TARGETS, type FontTarget } from "@/modules/menu-customization/contracts";
import type { PublicMenuFont, PublicMenuTheme as Theme } from "../contracts";

const FALLBACK = "Arial, Helvetica, sans-serif";

export function PublicMenuTheme({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  const global = theme.fonts.global;
  const familyFor = (target: FontTarget) => theme.fonts[target]?.fontFamily ?? global?.fontFamily ?? FALLBACK;
  const cssVariables = {
    "--font-menu": familyFor("global"),
    "--font-menu-title": familyFor("title"),
    "--font-menu-subtitle": familyFor("subtitle"),
    "--font-menu-group": familyFor("group"),
    "--font-menu-product": familyFor("product"),
    "--font-menu-featured": familyFor("featured"),
  } as React.CSSProperties;

  const uniqueFonts = new Map<string, PublicMenuFont>();
  for (const target of FONT_TARGETS) {
    const font = theme.fonts[target];
    if (font) uniqueFonts.set(font.id, font);
  }
  const fonts = [...uniqueFonts.values()];

  return (
    <div data-surface="public-menu" style={cssVariables}>
      {fonts
        .filter((font) => font.source === "google" && font.googleFamily)
        .map((font) => (
          <link
            key={font.id}
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.googleFamily!).replace(/%20/g, "+")}:wght@${encodeURIComponent(font.weights)}&display=swap`}
          />
        ))}
      {fonts
        .filter((font) => font.source === "custom" && font.fileUrl)
        .map((font) => (
          <style key={font.id}>{`@font-face{font-family:"${font.familyAlias}";src:url("${font.fileUrl}");font-weight:400;font-style:normal;font-display:swap;}`}</style>
        ))}
      {children}
    </div>
  );
}
