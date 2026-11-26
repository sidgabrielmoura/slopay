import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { adminDatePeriod } from "./admin-date-period";
import { movementOrigin } from "./admin-movement-origin";
import { movementScope } from "./admin-movement-filters";
import { adminPaginationSchema } from "./admin-pending";
import { adminPixPayer } from "./admin-pix-payer";
import { pixTransactionSearch } from "./admin-pix-transactions";

export const medPath = "/admin/contestacoes-pix";
export const medUnavailable = "A consulta de Contestações Pix está indisponível.";
const api = "/api/admin/pix-med";
export const medId = z.uuidv4().transform(value => value.toLowerCase());
const id = z.uuid();
const instant = z.iso.datetime({ offset: true });
const cents = z.int().nonnegative();
const page = z.coerce.number().int().min(1).max(10_000).default(1);
const singleLine = (limit: number) => z.string().max(limit).regex(/^[^\p{Cc}\p{Cf}]*$/u).trim();

export const medState = z.enum(["OPEN", "WAITING", "CLOSED"]);
export const medBalance = z.enum(["BLOCKED", "RELEASE_REPORTED", "DIVERGENT", "NO_EVENTS"]);
export const medDirection = z.enum(["RECEIVED", "SENT", "UNKNOWN"]);
export const medRequesterKind = z.enum(["UNIDENTIFIED", "CLIENT", "THIRD_PARTY"]);
export const medProviderOutcome = z.enum(["UNCONFIRMED", "UNDER_REVIEW", "RETURNED", "PARTIALLY_RETURNED", "NO_RETURN", "REJECTED"]);
export const medStateLabels = { OPEN: "Em acompanhamento", WAITING: "Aguardando informações", CLOSED: "Revisão encerrada" } as const;
export const medBalanceLabels = {
  BLOCKED: "Bloqueio informado", RELEASE_REPORTED: "Liberação informada", DIVERGENT: "A conciliar", NO_EVENTS: "Sem evento de saldo",
} as const;
export const medDirectionLabels = { RECEIVED: "Pix recebido", SENT: "Pix enviado", UNKNOWN: "Direção a identificar" } as const;
export const medRequesterLabels = { UNIDENTIFIED: "A identificar", CLIENT: "Cliente vinculado", THIRD_PARTY: "Terceiro identificado" } as const;
export const medProviderOutcomeLabels = {
  UNCONFIRMED: "A confirmar", UNDER_REVIEW: "Em análise", RETURNED: "Devolução integral",
  PARTIALLY_RETURNED: "Devolução parcial", NO_RETURN: "Encerrada sem devolução", REJECTED: "Recusada",
} as const;

const scope = { ...movementScope, walletId: id.optional() };
export const medQuery = z.strictObject({
  ...scope, page, search: pixTransactionSearch.default(""),
  period: adminDatePeriod.default("ALL"),
  state: z.enum(["ALL", ...medState.options]).default("ALL"),
  balance: z.enum(["ALL", ...medBalance.options]).default("ALL"),
  direction: z.enum(["ALL", ...medDirection.options]).default("ALL"),
});
export const medOptionsQuery = z.strictObject({
  ...scope, clientSearch: pixTransactionSearch.default(""), walletSearch: pixTransactionSearch.default(""),
});
export const medEventPage = z.strictObject({ page });

const option = z.object({ value: z.string(), label: z.string() });
export const medFilterOptions = z.object({
  clients: z.array(option).max(16), wallets: z.array(option).max(16), providers: z.array(option),
});

const medCase = z.object({
  id: medId, source: z.enum(["WEBHOOK", "ADMIN"]), state: medState, balanceState: medBalance, direction: medDirection,
  createdAt: instant, updatedAt: instant, reviewedAt: instant.nullable(), lastEventAt: instant.nullable(),
  providerCheckedAt: instant.nullable(), providerProtocol: z.string().max(100).nullable(), responseDueOn: z.iso.date().nullable(),
  providerOutcome: medProviderOutcome, providerReturnInCents: cents.nullable(),
  provider: z.object({ code: z.string(), name: z.string() }),
  wallet: z.object({ id, name: z.string(), reference: id }),
  client: z.object({ id, name: z.string(), company: z.string().nullable() }).nullable(),
  requester: z.object({ kind: medRequesterKind, name: z.string().nullable() }),
  operationId: id.nullable(), providerReference: z.string().max(64).nullable(), endToEndId: z.string().max(32).nullable(),
  operationAmountInCents: cents.nullable(),
  blockedInCents: cents, releasedInCents: cents, eventCount: z.int().nonnegative(),
});

export const medReport = z.object({
  available: z.boolean(), items: z.array(medCase).max(8), pagination: adminPaginationSchema,
  summary: z.object({ open: z.int().nonnegative(), blocked: z.int().nonnegative(),
    unidentified: z.int().nonnegative(), blockedInCents: cents }),
});
export const medCaseDetails = medCase.extend({
  revision: z.int().nonnegative(), notes: z.string().nullable(), reviewedBy: z.string().nullable(), clientEmail: z.string().nullable(),
  operation: z.object({
    state: z.string(), feeInCents: cents.nullable(), netInCents: cents.nullable(), refundInCents: cents,
    confirmedAt: instant.nullable(), settledAt: instant.nullable(), origin: movementOrigin, payer: adminPixPayer.nullable(),
    destination: z.string().nullable(), pixKeyType: z.string().nullable(), batchId: id.nullable(),
  }).nullable(),
  providerSnapshot: z.object({
    status: z.string(), amountInCents: cents, netInCents: cents.nullable(), feeInCents: cents.nullable(),
    date: z.iso.date().nullable(), pixId: z.string().nullable(), endToEndId: z.string().nullable(), payer: adminPixPayer.nullable(),
    refunds: z.array(z.object({
      status: z.enum(["PENDING", "CANCELLED", "DONE"]), amountInCents: cents,
      requestedAt: instant.nullable(), endToEndId: z.string().nullable(),
    })),
  }).nullable(),
  eventPagination: adminPaginationSchema,
  events: z.array(z.object({
    id: z.string().max(160), type: z.enum(["BALANCE_VALUE_BLOCKED", "BALANCE_VALUE_UNBLOCKED"]), amountInCents: cents,
    accountId: z.string().nullable(), paymentId: z.string().nullable(), date: z.iso.date().nullable(),
    providerCreatedAt: z.string().nullable(), description: z.string().nullable(), receivedAt: instant,
  })).max(8),
});

export const medRegister = z.strictObject({ operationId: medId });
export const medReview = z.strictObject({
  revision: z.int().min(0).max(2_147_483_646),
  state: medState, requesterKind: medRequesterKind,
  requesterName: singleLine(160).optional(), providerProtocol: singleLine(100).optional(),
  providerOutcome: medProviderOutcome, providerReturnInCents: z.int().min(1).max(2_147_483_647).optional(),
  operationId: medId.optional(),
  responseDueOn: z.iso.date().optional(), notes: z.string().trim().max(1000).optional(),
}).refine(value => (value.requesterKind === "THIRD_PARTY") === Boolean(value.requesterName) &&
  (!(value.state === "CLOSED" || value.operationId) || Boolean(value.notes)) &&
  (value.providerOutcome === "UNCONFIRMED" || Boolean(value.providerProtocol)) &&
  (["RETURNED", "PARTIALLY_RETURNED"].includes(value.providerOutcome) === Boolean(value.providerReturnInCents)),
{ message: "Confira o solicitante, o protocolo, o valor e as observações da revisão." });
export const medSync = z.strictObject({});
export const medMutation = z.object({ id: medId });

export type MedQuery = z.infer<typeof medQuery>;
export type MedItem = z.infer<typeof medCase>;
export type MedDetail = z.infer<typeof medCaseDetails>;
export type MedReview = z.infer<typeof medReview>;

export const initialMedQuery = medQuery.parse({});

export function medQueryFrom(params: Pick<URLSearchParams, "get">): MedQuery {
  const query = Object.fromEntries(Object.keys(medQuery.shape).flatMap(key => {
    const value = params.get(key);
    return value === null ? [] : [[key, value]];
  }));
  return medQuery.catch(initialMedQuery).parse(query);
}

export function medQueryParams(query: MedQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query) as [keyof MedQuery, string | number | undefined][]) {
    if (value !== undefined && value !== initialMedQuery[key]) params.set(key, String(value));
  }
  return params;
}

export function medHref(query: MedQuery, caseId?: string) {
  const params = medQueryParams(query);
  if (caseId) params.set("caso", caseId);
  return medPath + (params.size ? "?" + params : "");
}

const jsonPost = (value: object) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
export const adminPixMed = {
  list: (query: MedQuery, signal?: AbortSignal) => requestPixGateway(api + "?" + medQueryParams(query), medReport, medUnavailable, { signal }),
  options: (input: z.input<typeof medOptionsQuery>, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(medOptionsQuery.parse(input))) if (value) params.set(key, value);
    return requestPixGateway(api + "/filter-options?" + params, medFilterOptions, "Não foi possível consultar os filtros.", { signal });
  },
  detail: (caseId: string, eventPage: number, signal?: AbortSignal) => requestPixGateway(
    api + "/" + caseId + "?page=" + eventPage, medCaseDetails, "Os detalhes da contestação estão indisponíveis.", { signal }),
  register: (operationId: string) => requestPixGateway(api, medMutation, "Não foi possível registrar a contestação.",
    jsonPost(medRegister.parse({ operationId }))),
  review: (caseId: string, review: MedReview) => requestPixGateway(api + "/" + caseId + "/review", medMutation,
    "Não foi possível salvar a revisão.", jsonPost(medReview.parse(review))),
  sync: (caseId: string) => requestPixGateway(api + "/" + caseId + "/sync", medMutation,
    "Não foi possível conferir os dados no provedor.", jsonPost({})),
};
