import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { adminDatePeriod } from "./admin-date-period";
import { adminPaginationSchema } from "./admin-pending";
import { operationalPage } from "./admin-operational-accounts";
import { pixTransactionSearch } from "./admin-pix-transactions";

export const adminReportsPath = "/admin/relatorios";
export const reportsUnavailable = "Não foi possível consultar os relatórios.";
const api = "/api/admin/financial-reports";
export const reportKind = z.enum(["FINANCIAL", "FEES", "SETTLEMENTS", "ONBOARDING"]);
export const reportPeriod = adminDatePeriod.extract(["LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "LAST_MONTH"]);
export const reportId = z.uuidv4();

const scope = z.strictObject({
  kind: reportKind.default("FINANCIAL"),
  period: reportPeriod.default("LAST_MONTH"),
  search: pixTransactionSearch.default(""),
});
export const reportPreviewQuery = scope.extend({ page: operationalPage.default(1) });
export const reportHistoryQuery = z.strictObject({ page: operationalPage.default(1) });

const range = { fromDate: z.iso.date(), throughDate: z.iso.date() };
export const reportIssue = scope.extend({ ...range, requestId: reportId });
const values = z.record(z.string(), z.string().regex(/^-?\d+$/).nullable());
export const reportPreview = z.object({
  ...range, summary: values, pagination: adminPaginationSchema,
  items: z.array(z.object({ id: z.string(), label: z.string(), cnpj: z.string().nullable(), values })).max(8),
});
const reportInfo = scope.extend({
  ...range, id: reportId, createdAt: z.iso.datetime({ offset: true }), generatedBy: z.string(), rowCount: z.int().min(1).max(5_000),
});
export const reportHistory = z.object({ pagination: adminPaginationSchema, items: z.array(reportInfo).max(8) });
export const reportFile = z.object({ report: reportInfo, csv: z.string().min(1).max(2_097_152) });

export type ReportScope = z.infer<typeof scope>;
export type ReportPreviewQuery = z.infer<typeof reportPreviewQuery>;
export type ReportPreview = z.infer<typeof reportPreview>;
export type ReportHistory = z.infer<typeof reportHistory>;
export type ReportRecord = z.infer<typeof reportInfo>;
export type ReportIssue = z.infer<typeof reportIssue>;

export const reportKindLabels: Record<ReportScope["kind"], string> = {
  FINANCIAL: "Resumo financeiro", FEES: "Tarifas Pix", SETTLEMENTS: "Liquidações Pix", ONBOARDING: "Abertura de contas",
};

export function reportTitle({ kind, period }: Pick<ReportScope, "kind" | "period">) {
  return kind === "FINANCIAL" && period === "LAST_MONTH" ? "Fechamento mensal" : reportKindLabels[kind];
}

export function reportPreviewParams(query: ReportPreviewQuery) {
  const params = new URLSearchParams();
  if (query.kind !== "FINANCIAL") params.set("kind", query.kind);
  if (query.period !== "LAST_MONTH") params.set("period", query.period);
  if (query.search) params.set("search", query.search);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

export function reportQueryFrom(params: Pick<URLSearchParams, "get">) {
  return {
    kind: reportKind.catch("FINANCIAL").parse(params.get("kind")),
    period: reportPeriod.catch("LAST_MONTH").parse(params.get("period")),
    search: pixTransactionSearch.catch("").parse(params.get("search")),
    page: operationalPage.catch(1).parse(params.get("page")),
    historyPage: operationalPage.catch(1).parse(params.get("historyPage")),
  };
}

export function reportPageHref(query: ReportPreviewQuery, historyPage: number) {
  const params = reportPreviewParams(query);
  if (historyPage > 1) params.set("historyPage", String(historyPage));
  return adminReportsPath + (params.size ? "?" + params : "");
}

export const adminReports = {
  preview: (query: ReportPreviewQuery, signal: AbortSignal) =>
    requestPixGateway(`${api}/preview?${reportPreviewParams(query)}`, reportPreview, reportsUnavailable, { signal }),
  history: (page: number, signal: AbortSignal) =>
    requestPixGateway(`${api}?page=${page}`, reportHistory, "Não foi possível consultar os relatórios emitidos.", { signal }),
  file: (id: string) => requestPixGateway(`${api}/${id}`, reportFile, "Não foi possível carregar o arquivo."),
  issue: (input: ReportIssue) => requestPixGateway(api, reportFile, "Não foi possível emitir o relatório.", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), timeoutMs: 16_000,
  }),
};
