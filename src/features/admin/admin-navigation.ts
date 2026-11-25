export type AdminSectionId = "overview" | "pending" | "clients" | "pix" | "treasury" | "webhooks" | "governance" | "settings";

type AdminSectionPage = {
  title: string;
  path: string;
  aliases?: readonly string[];
  badge?: "onboarding" | "ownerApproval";
};

export type AdminSection = {
  id: AdminSectionId;
  title: string;
  path: string;
  pages?: readonly AdminSectionPage[];
};

export const adminSections: readonly AdminSection[] = [
  { id: "overview", title: "Visão geral", path: "/admin" },
  { id: "pending", title: "Pendências", path: "/admin/pendencias" },
  {
    id: "clients", title: "Clientes", path: "/admin/abertura-de-contas",
    pages: [
      { title: "Abertura de contas", path: "/admin/abertura-de-contas", badge: "onboarding" },
      { title: "Empresas", path: "/admin/empresas" },
      { title: "Usuários credenciados", path: "/admin/usuarios" },
    ],
  },
  {
    id: "pix", title: "Pix", path: "/admin/operacoes",
    pages: [
      { title: "Movimentações", path: "/admin/operacoes", aliases: ["/admin/cobrancas", "/admin/extrato"] },
      { title: "Lotes de saída", path: "/admin/lotes" },
      { title: "Aprovações de saque", path: "/admin/aprovacoes-financeiras", badge: "ownerApproval" },
    ],
  },
  {
    id: "treasury", title: "Tesouraria", path: "/admin/saldos",
    pages: [
      { title: "Carteiras", path: "/admin/saldos", aliases: ["/admin/contas", "/admin/contas-bolsao", "/admin/regras-de-aprovacao"] },
      { title: "Relatórios e fechamentos", path: "/admin/relatorios" },
    ],
  },
  { id: "webhooks", title: "Webhooks", path: "/admin/webhooks" },
  {
    id: "governance", title: "Governança", path: "/admin/equipe",
    pages: [
      { title: "Equipe administrativa", path: "/admin/equipe" },
      { title: "Trilha de auditoria", path: "/admin/auditoria" },
    ],
  },
  {
    id: "settings", title: "Configurações", path: "/admin/taxas-e-limites",
    pages: [
      { title: "Taxas e limites", path: "/admin/taxas-e-limites" },
      { title: "Preferências", path: "/admin/preferencias" },
    ],
  },
];

export function matchesAdminPage(pathname: string | null, { path, aliases }: Pick<AdminSectionPage, "path" | "aliases">) {
  return [path, ...(aliases ?? [])].some(candidate => pathname === candidate || pathname?.startsWith(candidate + "/"));
}

export function adminPageSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(input)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) params.set(name, first);
  }
  return params;
}
