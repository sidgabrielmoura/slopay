import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { adminDatePeriod } from "./admin-date-period";
import { operationalPage, operationalSearch } from "./admin-operational-accounts";
import { adminPaginationSchema } from "./admin-pending";

export const adminAuditPath = "/admin/auditoria";
export const adminAuditUnavailable = "Não foi possível consultar a trilha de auditoria.";
export const adminAuditEventUnavailable = "Não foi possível consultar este evento de auditoria.";
const defaultPeriod = "LAST_30_DAYS";
const category = z.enum(["ACCESS", "ADMINISTRATION", "PIX", "INTEGRATIONS"]);
const outcome = z.enum(["COMPLETED", "ALERT", "RECORDED"]);

export const auditCategoryFilter = z.enum(["ALL", ...category.options]);
export const auditOutcomeFilter = z.enum(["ALL", ...outcome.options]);
export const adminAuditQuery = z.strictObject({
  search: operationalSearch.default(""),
  category: auditCategoryFilter.default("ALL"),
  outcome: auditOutcomeFilter.default("ALL"),
  period: adminDatePeriod.default(defaultPeriod),
  page: operationalPage.default(1),
});

const auditEntry = z.object({
  id: z.uuid(), eventType: z.string().regex(/^[A-Z_]+$/).max(64), label: z.string(),
  createdAt: z.iso.datetime({ offset: true }), category, outcome,
  actor: z.object({ name: z.string(), role: z.enum(["ADMIN", "MERCHANT", "OPERATOR", "AUDITOR"]) }).nullable(),
});
export const adminAuditSchema = z.object({ items: z.array(auditEntry).max(8), pagination: adminPaginationSchema });
export const adminAuditEventSchema = auditEntry.extend({
  target: z.object({ id: z.guid(), label: z.string() }).nullable(),
  environment: z.enum(["SANDBOX", "LIVE"]).nullable(), change: z.string().nullable(), reason: z.string().max(600).nullable(),
  support: z.object({
    status: z.enum(["ACTIVE", "ENDED", "EXPIRED"]), adminId: z.uuid(),
    startedAt: z.iso.datetime({ offset: true }), endedAt: z.iso.datetime({ offset: true }).nullable(),
    durationSeconds: z.int().min(0).max(1800),
  }).nullish(),
});

export type AdminAuditQuery = z.infer<typeof adminAuditQuery>;
export type AdminAuditEntry = z.infer<typeof auditEntry>;

export const auditCategoryLabels = { ALL: "Todos os módulos", ACCESS: "Acesso e segurança", ADMINISTRATION: "Administração", PIX: "Operações Pix", INTEGRATIONS: "Integrações" } as const;
export const auditOutcomeLabels = { ALL: "Todos os resultados", COMPLETED: "Concluído", ALERT: "Alerta", RECORDED: "Registrado" } as const;
export const auditActorRoles = { ADMIN: "Superadmin", MERCHANT: "Titular", OPERATOR: "Operador", AUDITOR: "Auditor" } as const;

export function adminAuditQueryFrom(params: Pick<URLSearchParams, "get">): AdminAuditQuery {
  return {
    search: operationalSearch.catch("").parse(params.get("search")),
    category: auditCategoryFilter.catch("ALL").parse(params.get("category")),
    outcome: auditOutcomeFilter.catch("ALL").parse(params.get("outcome")),
    period: adminDatePeriod.catch(defaultPeriod).parse(params.get("period")),
    page: operationalPage.catch(1).parse(params.get("page")),
  };
}

export function adminAuditParams(query: AdminAuditQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.category !== "ALL") params.set("category", query.category);
  if (query.outcome !== "ALL") params.set("outcome", query.outcome);
  if (query.period !== defaultPeriod) params.set("period", query.period);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

export function adminAuditHref(query: AdminAuditQuery) {
  const params = adminAuditParams(query);
  return adminAuditPath + (params.size ? "?" + params : "");
}

const auditApi = "/api/admin/audit";
export const adminAudit = {
  list: (query: AdminAuditQuery, signal: AbortSignal) =>
    requestPixGateway(auditApi + "?" + adminAuditParams(query), adminAuditSchema, adminAuditUnavailable, { signal }),
  event: (id: string, signal: AbortSignal) =>
    requestPixGateway(`${auditApi}/${id}`, adminAuditEventSchema, adminAuditEventUnavailable, { signal }),
};
