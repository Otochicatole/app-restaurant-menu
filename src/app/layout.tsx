import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getActiveFont } from "@/features/fonts/backend/services/font.service";
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
  const font = await getActiveFont();

  const googleFontUrl =
    font?.source === "google" && font.googleFamily
      ? `https://fonts.googleapis.com/css2?family=${font.googleFamily.replace(/ /g, "+")}:wght@${font.weights}&display=swap`
      : null;

  const customFontFace =
    font?.source === "custom" && font.filePath
      ? `@font-face{font-family:'${font.name}';src:url('/api/fonts/${font.id}/file');font-weight:400;font-style:normal;font-display:swap;}`
      : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={font?.fontFamily ? ({ "--font-menu": font.fontFamily } as React.CSSProperties) : undefined}
      >
        {googleFontUrl && <link rel="stylesheet" href={googleFontUrl} />}
        {customFontFace && <style dangerouslySetInnerHTML={{ __html: customFontFace }} />}
        {children}
      </body>
    </html>
  );
}
