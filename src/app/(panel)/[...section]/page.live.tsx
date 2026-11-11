import { notFound } from "next/navigation";
import { LivePanel } from "@/features/auth/components/live-panel";
import { requireSession } from "@/lib/server/session";

const titles: Record<string, string> = {
  inicio: "Painel SloPay",
  pix: "Pix",
  movimentacoes: "Movimentações",
  aprovacoes: "Aprovações",
  integracoes: "Integrações",
  conta: "Conta",
  indicadores: "Indicadores",
  preferencias: "Preferências",
  mais: "Mais",
  ajuda: "Ajuda",
};

export default async function PanelPage({ params }: { params: Promise<{ section: string[] }> }) {
  const { section } = await params;
  if (!Object.hasOwn(titles, section[0])) notFound();

  const returnTo = "/" + section.map(encodeURIComponent).join("/");
  await requireSession(returnTo, { operations: true });
  return (
    <LivePanel
      title={titles[section[0]]}
      message="Os recursos operacionais serão liberados após a homologação das integrações financeiras."
    />
  );
}
