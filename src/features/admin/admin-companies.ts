import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { adminPaginationSchema } from "./admin-pending";

export const companiesPath = "/admin/empresas";
export const companiesUnavailable = "Não foi possível consultar as empresas.";

export function refreshAdminCompanyData(client: QueryClient, adminId: string) {
  for (const key of ["admin-companies", "admin-company", "admin-company-audit", "admin-account-openings",
    "admin-account-opening-detail", "admin-pending", "admin-notifications", "admin-dashboard",
    "admin-client-users", "admin-client-user", "admin-audit"]) {
    void client.invalidateQueries({ queryKey: [key, adminId] });
  }
}

const servicePath = "/api/admin/companies";
export const companyAccessStatus = z.enum(["ACTIVE", "SUSPENDED", "LOCKED", "PENDING_VERIFICATION"]);
export const companyStatusFilter = z.enum(["ALL", ...companyAccessStatus.options]);
export const companyPeriod = z.enum(["all", "7d", "30d", "90d"]);
export const companySearch = z.string().trim().max(120).regex(/^[^\p{Cc}\p{Cf}]*$/u);
export const companyPage = z.coerce.number().int().min(1).max(10_000);
export const companiesQuerySchema = z.strictObject({
  search: companySearch.default(""), status: companyStatusFilter.default("ALL"),
  period: companyPeriod.default("all"), page: companyPage.default(1),
});

export const companyStatusLabels: Record<z.infer<typeof companyAccessStatus>, string> = {
  ACTIVE: "Ativo", SUSPENDED: "Suspenso", LOCKED: "Bloqueado", PENDING_VERIFICATION: "Em validação",
};
export const companyPeriodLabels: Record<z.infer<typeof companyPeriod>, string> = {
  all: "Todo o período", "7d": "Últimos 7 dias", "30d": "Últimos 30 dias", "90d": "Últimos 90 dias",
};
export const companySegments = {
  ECOMMERCE: "E-commerce", SAAS: "Software e SaaS", MARKETPLACE: "Marketplace",
  SERVICOS: "Serviços", FINTECH: "Fintech", OUTRO: "Outro",
} as const;
export const companySizes = {
  "1-10": "1 a 10 pessoas", "11-50": "11 a 50 pessoas", "51-200": "51 a 200 pessoas", "200+": "Mais de 200 pessoas",
} as const;

const text = (max: number) => z.string().trim().min(1).max(max).regex(/^[^\p{Cc}\p{Cf}]+$/u);
const date = z.iso.datetime({ offset: true });
const companyProfileSchema = z.strictObject({
  legalName: text(150), tradeName: text(150).nullable(),
  segment: z.enum(["ECOMMERCE", "SAAS", "MARKETPLACE", "SERVICOS", "FINTECH", "OUTRO"]).nullable(),
  companySize: z.enum(["1-10", "11-50", "51-200", "200+"]).nullable(),
  website: text(250).pipe(z.url({ protocol: /^https?$/, hostname: z.regexes.domain }).refine((value) => {
    try {
      const url = new URL(value);
      return !url.username && !url.password;
    } catch { return false; }
  })).nullable(),
  contactName: text(150).nullable(), contactRole: text(100).nullable(),
  contactEmail: z.email().max(254).nullable(), contactPhone: z.string().regex(/^\+55[1-9]\d{9,10}$/).nullable(),
});

export const companyListItemSchema = z.object({
  id: z.uuid(), legalName: z.string(), tradeName: z.string().nullable(), ownerName: z.string(),
  cnpj: z.string().nullable(), createdAt: date, accessStatus: companyAccessStatus,
  linked: z.boolean(), volumeCents: z.int().nonnegative(),
});
export const companiesSchema = z.object({
  summary: z.object({ total: z.int().nonnegative(), active: z.int().nonnegative(), suspended: z.int().nonnegative(), linked: z.int().nonnegative() }),
  pagination: adminPaginationSchema,
  items: z.array(companyListItemSchema).max(8),
});
const profileVersion = z.int().min(0).max(2_000_000_000);
export const companyDetailSchema = companyProfileSchema.extend({
  id: z.uuid(), ownerId: z.uuid(), cnpj: z.string().nullable(), profileVersion, createdAt: date, canManage: z.boolean(),
  owner: z.object({
    operationalClosedAt: z.iso.datetime({ offset: true }).nullish(),
    fullName: z.string(), email: z.string(), phone: z.string(), status: companyAccessStatus,
    isEmailVerified: z.boolean(), twoFactorEnabled: z.boolean(),
  }),
  integration: z.object({ id: z.uuid().optional(), linkedAt: date, verifiedAt: date, withdrawalsEnabled: z.boolean() }).nullable(),
});

export const companyOperationsSchema = z.object({
  pagination: adminPaginationSchema,
  items: z.array(z.object({
    id: z.string(), kind: z.enum(["RECEIVE", "WITHDRAW", "REFUND"]), amountInCents: z.int().nonnegative(),
    feeInCents: z.int().nullable(), occurredAt: date,
    status: z.enum(["COMPLETED", "PENDING", "PROCESSING", "REVIEW", "FAILED", "CANCELLED", "AWAITING_APPROVAL"]),
  })).max(8),
});
export const companyAuditSchema = z.object({
  pagination: adminPaginationSchema,
  items: z.array(z.object({
    id: z.string(),
    action: z.enum(["COMPANY_PROFILE_UPDATED", "COMPANY_ACCESS_CHANGED", "ASAAS_CONNECTION_CREATED",
      "ASAAS_CREDENTIAL_ROTATED", "ASAAS_WEBHOOK_TOKEN_ROTATED"]),
    actor: z.string().nullable(), createdAt: date, reason: z.string().nullable(), accessStatus: companyAccessStatus.nullable(),
  })).max(8),
});

const changeBase = z.strictObject({
  version: profileVersion,
  reason: z.string().trim().min(1).max(600).regex(/^(?:[^\p{Cc}\p{Cf}]|[\r\n])*$/u),
});
const editCompany = changeBase.extend({ action: z.literal("EDIT_PROFILE"), profile: companyProfileSchema });
const changeAccess = changeBase.extend({ action: z.enum(["SUSPEND", "REACTIVATE"]) });
export const companyChangeSchema = z.discriminatedUnion("action", [editCompany, changeAccess]);
export const companyProofSchema = z.discriminatedUnion("action", [
  editCompany.extend({ proof: integrationProofSchema }), changeAccess.extend({ proof: integrationProofSchema }),
]);
export const companyUpdatedSchema = z.object({ updated: z.literal(true) });

export type CompaniesQuery = z.infer<typeof companiesQuerySchema>;
export type CompanyListItem = z.infer<typeof companyListItemSchema>;
export type CompanyDetail = z.infer<typeof companyDetailSchema>;
export type CompanyAccessStatus = z.infer<typeof companyAccessStatus>;
export type CompanyChange = z.infer<typeof companyChangeSchema>;
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export type CompanyAuditItem = z.infer<typeof companyAuditSchema>["items"][number];
export type CompanyOperation = z.infer<typeof companyOperationsSchema>["items"][number];

export function companiesQueryFrom(params: Pick<URLSearchParams, "get">): CompaniesQuery {
  return {
    search: companySearch.catch("").parse(params.get("search")),
    status: companyStatusFilter.catch("ALL").parse(params.get("status")),
    period: companyPeriod.catch("all").parse(params.get("period")),
    page: companyPage.catch(1).parse(params.get("page")),
  };
}

export function companyListParams(query: CompaniesQuery) {
  const params = new URLSearchParams();
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.period !== "all") params.set("period", query.period);
  if (query.search) params.set("search", query.search);
  if (query.page > 1) params.set("page", String(query.page));
  return params.size ? "?" + params : "";
}

function post(body: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const adminCompanies = {
  list: (query: CompaniesQuery, signal: AbortSignal) =>
    requestPixGateway(servicePath + companyListParams(query), companiesSchema, companiesUnavailable, { signal }),
  detail: (id: string, signal: AbortSignal) =>
    requestPixGateway(servicePath + "/" + id, companyDetailSchema, companiesUnavailable, { signal }),
  operations: (id: string, page: number, signal: AbortSignal) =>
    requestPixGateway(`${servicePath}/${id}/operations?page=${page}`, companyOperationsSchema, "Não foi possível consultar as movimentações.", { signal }),
  audit: (id: string, page: number, signal: AbortSignal) =>
    requestPixGateway(`${servicePath}/${id}/audit?page=${page}`, companyAuditSchema, "Não foi possível consultar a auditoria.", { signal }),
  options: (id: string, change: CompanyChange) =>
    requestPixGateway(`${servicePath}/${id}/change/options`, passkeyOptionsSchema, "Não foi possível preparar a confirmação.", post(change)),
  change: (id: string, change: CompanyChange, proof: IntegrationProof) =>
    requestPixGateway(`${servicePath}/${id}/change`, companyUpdatedSchema, "Não foi possível salvar a alteração da empresa.", post({ ...change, proof })),
};
