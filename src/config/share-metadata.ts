import type { Metadata } from "next";
import { brandConfig } from "./brand.config";

export function shareMetadata({
  title,
  description,
  canonical,
  receipt = false,
}: {
  title: string;
  description: string;
  canonical?: "/entrar" | "/criar-conta";
  receipt?: boolean;
}): Metadata {
  const heading = `${title} · ${brandConfig.name}`;
  const image = {
    url: receipt ? "/brand/share-comprovante-pix-v1.png" : "/brand/share-slopay-v1.png",
    width: 1200,
    height: 630,
    alt: receipt ? "SloPay — Comprovante Pix" : "SloPay — Operações Pix para empresas",
  };

  return {
    title,
    description,
    ...(canonical && { alternates: { canonical } }),
    openGraph: {
      type: "website",
      siteName: brandConfig.name,
      locale: "pt_BR",
      title: heading,
      description,
      ...(canonical && { url: canonical }),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: heading,
      description,
      images: [image],
    },
  };
}
