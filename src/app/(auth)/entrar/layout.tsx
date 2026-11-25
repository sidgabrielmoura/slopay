import type { ReactNode } from "react";
import { shareMetadata } from "@/config/share-metadata";

export const metadata = shareMetadata({
  title: "Entrar",
  description: "Acesse o painel SloPay para acompanhar e operar os pagamentos Pix da sua empresa.",
  canonical: "/entrar",
});

export default function EntrarLayout({ children }: { children: ReactNode }) {
  return children;
}
