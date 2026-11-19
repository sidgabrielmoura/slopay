import "server-only";

import { notFound } from "next/navigation";
import type { SessionUser } from "@/lib/server/auth-backend";
import { AdminDemoShell } from "./layout/admin-demo-shell";

const pages = new Map([
  ["", () => import("@/app/admin/page.demo")],
  ["abertura-de-contas", () => import("@/app/admin/abertura-de-contas/page.demo")],
  ["aprovacoes-financeiras", () => import("@/app/admin/aprovacoes-financeiras/page.demo")],
  ["auditoria", () => import("@/app/admin/auditoria/page.demo")],
  ["cobrancas", () => import("@/app/admin/cobrancas/page.demo")],
  ["contas", () => import("@/app/admin/contas/page.demo")],
  ["empresas", () => import("@/app/admin/empresas/page.demo")],
  ["equipe", () => import("@/app/admin/equipe/page.demo")],
  ["extrato", () => import("@/app/admin/extrato/page.demo")],
  ["lotes", () => import("@/app/admin/lotes/page.demo")],
  ["operacoes", () => import("@/app/admin/operacoes/page.demo")],
  ["pendencias", () => import("@/app/admin/pendencias/page.demo")],
  ["preferencias", () => import("@/app/admin/preferencias/page.demo")],
  ["regras-de-aprovacao", () => import("@/app/admin/regras-de-aprovacao/page.demo")],
  ["relatorios", () => import("@/app/admin/relatorios/page.demo")],
  ["saldos", () => import("@/app/admin/saldos/page.demo")],
  ["taxas-e-limites", () => import("@/app/admin/taxas-e-limites/page.demo")],
  ["usuarios", () => import("@/app/admin/usuarios/page.demo")],
  ["webhooks", () => import("@/app/admin/webhooks/page.demo")],
]);

async function PreviewPage({ section }: { section: string[] }) {
  const [area = "", id, action] = section;
  if (section.length <= 1) {
    const load = pages.get(area);
    if (!load) notFound();
    const { default: Page } = await load();
    return <Page />;
  }

  if (section.length === 3 && area === "empresas" && action === "editar") {
    const { default: Page } = await import("@/app/admin/empresas/[empresaId]/editar/page.demo");
    return <Page params={Promise.resolve({ empresaId: id })} />;
  }

  if (section.length === 2) {
    switch (area) {
      case "abertura-de-contas": {
        const { default: Page } = await import("@/app/admin/abertura-de-contas/[solicitacaoId]/page.demo");
        return <Page params={Promise.resolve({ solicitacaoId: id })} />;
      }
      case "contas": {
        const { default: Page } = await import("@/app/admin/contas/[contaId]/page.demo");
        return <Page params={Promise.resolve({ contaId: id })} />;
      }
      case "empresas": {
        const { default: Page } = await import("@/app/admin/empresas/[empresaId]/page.demo");
        return <Page params={Promise.resolve({ empresaId: id })} />;
      }
      case "lotes": {
        const { default: Page } = await import("@/app/admin/lotes/[loteId]/page.demo");
        return <Page params={Promise.resolve({ loteId: id })} />;
      }
    }
  }

  notFound();
}

export function AdminPreview({ section, user }: {
  section: string[];
  user: Pick<SessionUser, "fullName" | "email">;
}) {
  return (
    <AdminDemoShell user={user}>
      <PreviewPage section={section} />
    </AdminDemoShell>
  );
}
