import type { MetadataRoute } from "next";
import { brandConfig } from "@/config/brand.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: brandConfig.name,
    short_name: brandConfig.name,
    description: "Operações Pix para empresas",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: brandConfig.backgroundColor,
    theme_color: brandConfig.backgroundColor,
    icons: [
      { src: "/brand/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/app-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
