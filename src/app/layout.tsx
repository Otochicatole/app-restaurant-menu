import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
