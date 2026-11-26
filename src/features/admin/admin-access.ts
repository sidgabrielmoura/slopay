import { z } from "zod";

export const adminAccessLevel = z.enum(["VIEWER", "OPERATOR", "ADMINISTRATOR"]);
export type AdminAccessLevel = z.infer<typeof adminAccessLevel>;
export const adminAccessLevelLabels: Record<AdminAccessLevel, string> = {
  VIEWER: "Consulta",
  OPERATOR: "Operação",
  ADMINISTRATOR: "Administração",
};

const permission = z.string().regex(/^admin\.[a-z]+\.[a-z]+$/);
const permissionList = z.array(permission).max(100);
export const adminAccessDraftSchema = z.object({
  accessLevel: adminAccessLevel.default("VIEWER"),
  grants: permissionList.default([]),
});
export type AdminAccessDraft = z.infer<typeof adminAccessDraftSchema>;

export const adminSessionAccessSchema = z.object({
  level: adminAccessLevel,
  permissions: permissionList,
});
export type AdminSessionAccess = z.infer<typeof adminSessionAccessSchema>;

export const adminAccessOptionsSchema = z.object({
  levels: z.array(adminAccessLevel),
  permissions: z.array(z.object({
    key: permission, label: z.string(), kind: z.enum(["page", "action"]), page: permission.nullable(),
  })),
  defaults: z.record(adminAccessLevel, permissionList),
});

const pageAccess: Record<string, string> = {
  "/admin": "admin.dashboard.read",
  "/admin/pendencias": "admin.pending.read",
  "/admin/abertura-de-contas": "admin.openings.read",
  "/admin/empresas": "admin.companies.read",
  "/admin/usuarios": "admin.users.read",
  "/admin/operacoes": "admin.movements.read",
  "/admin/contestacoes-pix": "admin.med.read",
  "/admin/cobrancas": "admin.movements.read",
  "/admin/extrato": "admin.movements.read",
  "/admin/lotes": "admin.batches.read",
  "/admin/aprovacoes-financeiras": "admin.approvals.read",
  "/admin/saldos": "admin.wallets.read",
  "/admin/contas": "admin.wallets.read",
  "/admin/contas-bolsao": "admin.wallets.read",
  "/admin/regras-de-aprovacao": "admin.wallets.read",
  "/admin/relatorios": "admin.reports.read",
  "/admin/taxas-e-limites": "admin.fees.read",
  "/admin/webhooks": "admin.webhooks.read",
  "/admin/equipe": "admin.team.read",
  "/admin/auditoria": "admin.audit.read",
  "/admin/preferencias": "admin.preferences.self",
};

export function adminPageAllowed(access: AdminSessionAccess | undefined, path: string) {
  const pathname = path.split("?")[0];
  if (/^\/admin\/empresas\/[^/]+\/editar\/?$/.test(pathname)) {
    return access?.permissions.includes("admin.companies.edit") ?? false;
  }
  const required = pageAccess[pathname.split("/").slice(0, 3).join("/")];
  return Boolean(required && (access?.permissions.includes(required) ?? required === "admin.dashboard.read"));
}
