import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { operationalPage, operationalSearch } from "./admin-operational-accounts";
import { adminPaginationSchema } from "./admin-pending";

export const adminApprovalRulesPath = "/admin/regras-de-aprovacao";
export const adminApprovalRulesUnavailable = "Não foi possível consultar as regras de alçada.";

const ruleStatus = z.enum(["READY", "SETUP_REQUIRED", "DISABLED", "PAUSED", "RESTRICTED"]);
export const ruleStatusFilter = z.enum(["ALL", ...ruleStatus.options]);
export const approvalRulesQuery = z.strictObject({
  search: operationalSearch.default(""),
  status: ruleStatusFilter.default("ALL"),
  page: operationalPage.default(1),
});
const count = z.int().nonnegative();
const wallet = z.object({
  id: z.uuid(),
  company: z.string(),
  ownerName: z.string(),
  cnpj: z.string().nullable(),
  walletSuffix: z.string().max(8),
  status: ruleStatus,
  enabledAt: z.iso.datetime({ offset: true }).nullable(),
  awaitingOwner: count,
});
export const adminApprovalRulesSchema = z.object({
  environment: z.enum(["sandbox", "live"]),
  channels: z.object({ api: z.boolean(), panelPilot: z.boolean() }),
  summary: z.object({ total: count, ready: count }),
  pagination: adminPaginationSchema,
  items: z.array(wallet).max(8),
});

export type ApprovalRulesQuery = z.infer<typeof approvalRulesQuery>;
export type ApprovalRuleWallet = z.infer<typeof wallet>;
export type ApprovalRuleChannels = z.infer<typeof adminApprovalRulesSchema>["channels"];

export const ruleStatusLabels = {
  READY: { label: "Validação habilitada", variant: "success" },
  SETUP_REQUIRED: { label: "Configuração pendente", variant: "warning" },
  DISABLED: { label: "Saques via API desabilitados", variant: "secondary" },
  PAUSED: { label: "Carteira pausada", variant: "warning" },
  RESTRICTED: { label: "Acesso do titular restrito", variant: "destructive" },
} as const;

export function approvalRulesQueryFrom(params: Pick<URLSearchParams, "get">): ApprovalRulesQuery {
  return {
    search: operationalSearch.catch("").parse(params.get("search")),
    status: ruleStatusFilter.catch("ALL").parse(params.get("status")),
    page: operationalPage.catch(1).parse(params.get("page")),
  };
}

export function approvalRulesParams(query: ApprovalRulesQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

export function fetchAdminApprovalRules(query: ApprovalRulesQuery, signal: AbortSignal) {
  return requestPixGateway("/api/admin/approval-rules?" + approvalRulesParams(query), adminApprovalRulesSchema,
    adminApprovalRulesUnavailable, { signal });
}
