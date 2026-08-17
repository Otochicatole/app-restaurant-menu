import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getFontSelection } from "@/features/fonts/backend/services/font.service";
import { FONT_TARGETS, type FontDTO } from "@/features/fonts/backend/types";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: {
    default: "Menu - Restaurant",
    template: "%s | Restaurant",
  },
  description: "Our restaurant menu",
  keywords: ["restaurant", "menu", "food", "healthy", "classic"],
  icons: {
    icon: "/coffe.svg",
    shortcut: "/coffe.svg",
  },
  openGraph: {
    title: "Menu - Restaurant",
    description: "Our restaurant menu",
    type: "website",
    siteName: "Restaurant",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const selection = await getFontSelection();

  const FALLBACK_FAMILY = "Arial, Helvetica, sans-serif";
  const globalFont = selection.global;
  const familyFor = (font: FontDTO | null) => font?.fontFamily ?? FALLBACK_FAMILY;

  const cssVars = {
    "--font-menu": familyFor(globalFont),
    "--font-menu-title": familyFor(selection.title ?? globalFont),
    "--font-menu-subtitle": familyFor(selection.subtitle ?? globalFont),
    "--font-menu-group": familyFor(selection.group ?? globalFont),
    "--font-menu-product": familyFor(selection.product ?? globalFont),
    "--font-menu-featured": familyFor(selection.featured ?? globalFont),
  } as Record<string, string>;

  const uniqueFonts = new Map<string, FontDTO>();
  for (const target of FONT_TARGETS) {
    const font = selection[target];
    if (font) uniqueFonts.set(font.id, font);
  }
  const activeFonts = Array.from(uniqueFonts.values());

  const googleFonts = activeFonts.filter((font) => font.source === "google" && font.googleFamily);
  const customFonts = activeFonts.filter((font) => font.source === "custom" && font.filePath);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={cssVars as React.CSSProperties}
      >
        {googleFonts.map((font) => (
          <link
            key={font.id}
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${font.googleFamily!.replace(/ /g, "+")}:wght@${font.weights}&display=swap`}
          />
        ))}
        {customFonts.length > 0 && (
          <style
            dangerouslySetInnerHTML={{
              __html: customFonts
                .map((font) => `@font-face{font-family:'${font.name}';src:url('/api/fonts/${font.id}/file');font-weight:400;font-style:normal;font-display:swap;}`)
                .join("\n"),
            }}
          />
        )}
        {children}
      </body>
    </html>
  );
}
