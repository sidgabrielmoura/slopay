import type { Metadata } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { brandConfig } from "@/config/brand.config";
import { developmentFeaturesEnabled } from "@/config/development";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: `${brandConfig.name} · ${brandConfig.tagline}`,
    template: `%s · ${brandConfig.name}`,
  },
  description:
    "Painel operacional de pagamentos Pix de alta fidelidade para empresas e operadores financeiros.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") await connection();

  return (
    <html lang="pt-BR" className={`${inter.variable} dark antialiased`}>
      <body className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <AppProviders developmentFeatures={developmentFeaturesEnabled()}>{children}</AppProviders>
      </body>
    </html>
  );
}
