import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-barlow",
  display: "swap",
});

const barlowCondensada = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--fonte-barlow-condensada",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Calhas Andrade",
  description: "Sistema de gestão da fábrica: orçamentos, obras, financeiro e compras.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Calhas Andrade" },
  icons: { icon: "/icone.svg", apple: "/icone-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#15171c",
  width: "device-width",
  initialScale: 1,
  // O dono precisa poder dar zoom num orcamento na obra, com sol na tela.
  maximumScale: 5,
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${barlow.variable} ${barlowCondensada.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
