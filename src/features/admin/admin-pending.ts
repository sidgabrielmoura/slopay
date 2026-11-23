import { z } from "zod";
import { ApiError } from "@/lib/api-client";

export const adminPendingUnavailable = "A fila de pendências está temporariamente indisponível.";
export const pendingCategories = ["ALL", "ONBOARDING", "PIX_REVIEW", "OWNER_APPROVAL", "WEBHOOK"] as const;
export const pendingCategorySchema = z.enum(pendingCategories);
export const pendingKeySchema = z.string().regex(/^(ACCOUNT|CHARGE|WITHDRAWAL|WEBHOOK):[A-Za-z0-9_-]{1,64}$/);
export const adminPaginationSchema = z.object({ page: z.int().min(1).max(10000), pageSize: z.literal(8), total: z.int().nonnegative() });
export const pendingSummarySchema = z.object({
  total: z.int().nonnegative(), onboarding: z.int().nonnegative(), review: z.int().nonnegative(),
  ownerApproval: z.int().nonnegative(), webhooks: z.int().nonnegative(),
});
export const pendingItemSchema = z.object({
  id: pendingKeySchema,
  category: pendingCategorySchema.exclude(["ALL"]),
  referenceKind: z.enum(["ACCOUNT", "CHARGE", "WITHDRAWAL", "WEBHOOK"]),
  referenceId: z.string().min(1).max(64),
  company: z.string(), ownerName: z.string(), ownerEmail: z.email(),
  amountInCents: z.int().positive().nullable(),
  state: z.enum(["AWAITING_LINK", "ACCOUNT_UNDER_REVIEW", "ACCOUNT_CHANGES_REQUESTED", "ACCOUNT_RESUBMITTED", "REVIEW", "BLOCKED", "AWAITING_APPROVAL", "INTERRUPTED"]),
  responsible: z.enum(["TEAM", "OWNER", "CLIENT_INTEGRATION"]),
  createdAt: z.iso.datetime({ offset: true }), updatedAt: z.iso.datetime({ offset: true }),
});
export const adminPendingSchema = z.object({
  environment: z.enum(["sandbox", "live"]), generatedAt: z.iso.datetime({ offset: true }),
  category: pendingCategorySchema, search: z.string(), summary: pendingSummarySchema, revision: z.string(),
  pagination: adminPaginationSchema, items: z.array(pendingItemSchema).max(8),
});
export const pendingDetailSchema = z.object({ item: pendingItemSchema.nullable() });
export type PendingCategory = z.infer<typeof pendingCategorySchema>;
export type PendingSummary = z.infer<typeof pendingSummarySchema>;
export type PendingItem = z.infer<typeof pendingItemSchema>;
export type AdminPendingReport = z.infer<typeof adminPendingSchema>;

export const pendingCategoryLabels: Record<PendingCategory, string> = {
  ALL: "Todas as pendências", ONBOARDING: "Cadastros", PIX_REVIEW: "Revisões Pix", OWNER_APPROVAL: "Aprovações do titular", WEBHOOK: "Webhooks",
};
export const pendingKindLabels = { ACCOUNT: "Análise de cadastro", CHARGE: "Revisão de recebimento", WITHDRAWAL: "Saque Pix", WEBHOOK: "Fila de webhook" };
export const pendingStateLabels = {
  AWAITING_LINK: "Pronto para análise", ACCOUNT_UNDER_REVIEW: "Cadastro em análise",
  ACCOUNT_CHANGES_REQUESTED: "Ajustes solicitados", ACCOUNT_RESUBMITTED: "Cadastro reenviado",
  REVIEW: "Em revisão", BLOCKED: "Bloqueado para análise", AWAITING_APPROVAL: "Aguardando titular", INTERRUPTED: "Fila interrompida",
};
export const pendingResponsibleLabels = { TEAM: "Equipe Slopay", OWNER: "Titular da empresa", CLIENT_INTEGRATION: "Integração do cliente" };
export const pendingInstructions = {
  ACCOUNT: "Consulte os dados e o histórico na abertura de contas.",
  CHARGE: "Confira a situação oficial do recebimento antes de emitir outra cobrança. A confirmação financeira depende da conciliação do gateway.",
  WITHDRAWAL: "Confira a situação do saque antes de iniciar outra operação. A autorização financeira é feita pelo titular da empresa.",
  WEBHOOK: "A entrega sequencial foi interrompida. O responsável pela integração deve conferir o destino e retomar a fila após corrigir a falha.",
};

export async function fetchAdminPending(category: PendingCategory, search: string, page: number, signal: AbortSignal) {
  const query = new URLSearchParams({ category, search, page: String(page) });
  const response = await fetch(`/api/admin/pending?${query}`, { signal, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.message ?? adminPendingUnavailable, response.status);
  const result = adminPendingSchema.safeParse(body);
  if (!result.success || result.data.category !== category || result.data.search !== search) throw new ApiError(adminPendingUnavailable, 503);
  return result.data;
}

export async function fetchPendingDetail(key: string, signal: AbortSignal) {
  const response = await fetch(`/api/admin/pending/item?key=${encodeURIComponent(key)}`, { signal, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.message ?? adminPendingUnavailable, response.status);
  const result = pendingDetailSchema.safeParse(body);
  if (!result.success) throw new ApiError(adminPendingUnavailable, 503);
  return result.data;
}
