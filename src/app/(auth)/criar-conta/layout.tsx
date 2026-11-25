import type { ReactNode } from "react";
import { shareMetadata } from "@/config/share-metadata";

export const metadata = shareMetadata({
  title: "Criar conta",
  description: "Inicie a abertura da conta da sua empresa no SloPay.",
  canonical: "/criar-conta",
});

export default function CriarContaLayout({ children }: { children: ReactNode }) {
  return children;
}
