import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export const metadata: Metadata = {
  title: { default: "Menús digitales", template: "%s | Menús digitales" },
  description: "Menús digitales para restaurantes y negocios gastronómicos",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col"
        style={{
          "--font-menu": "Arial, Helvetica, sans-serif",
          "--font-menu-title": "Arial, Helvetica, sans-serif",
          "--font-menu-subtitle": "Arial, Helvetica, sans-serif",
          "--font-menu-group": "Arial, Helvetica, sans-serif",
          "--font-menu-product": "Arial, Helvetica, sans-serif",
          "--font-menu-featured": "Arial, Helvetica, sans-serif",
        } as React.CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
