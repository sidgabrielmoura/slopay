import { z } from "zod";
import { ApiError } from "@/lib/api-client";
import type { AdminPreferences } from "./admin-preferences";
import { adminPaginationSchema, pendingKeySchema, pendingSummarySchema } from "./admin-pending";

export const adminActivityUnavailable = "As notificações estão temporariamente indisponíveis.";
export const adminNoticeTypes = [
  "ACCOUNT_READY", "ACCOUNT_UPDATED", "ACCOUNT_LINKED", "CHARGE_CREATED", "CHARGE_REVIEW", "CHARGE_REVIEW_CLEARED",
  "CHARGE_FAILED", "CHARGE_CANCELLED", "PIX_RECEIVED", "PIX_REFUNDED", "WITHDRAWAL_CREATED", "APPROVAL_REQUIRED",
  "PIX_SENT", "WITHDRAWAL_REVIEW", "WITHDRAWAL_PROCESSING", "WITHDRAWAL_FAILED", "WITHDRAWAL_CANCELLED",
  "WEBHOOK_INTERRUPTED", "WEBHOOK_QUEUE_CLEARED",
] as const;
export const adminNoticeSchema = z.object({
  id: z.uuid(), type: z.enum(adminNoticeTypes), company: z.string(), referenceKey: pendingKeySchema,
  sourceState: z.string().max(40), amountInCents: z.int().positive().nullable(),
  createdAt: z.iso.datetime({ offset: true }), read: z.boolean(),
});
export const adminActivitySchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }), unread: z.int().nonnegative(),
  summary: pendingSummarySchema, queueRevision: z.string(), revision: z.string(),
  pagination: adminPaginationSchema, items: z.array(adminNoticeSchema).max(8),
});
export const markAdminNoticesSchema = z.union([
  z.object({ all: z.literal(true) }).strict(), z.object({ ids: z.array(z.uuid()).min(1).max(100) }).strict(),
]);
export const markAdminNoticesResultSchema = z.object({ updated: z.literal(true) });
export type AdminNotice = z.infer<typeof adminNoticeSchema>;
export type AdminActivity = z.infer<typeof adminActivitySchema>;
type Tone = "info" | "warning" | "success";

export const adminNoticePresentation: Record<AdminNotice["type"], { title: string; tone: Tone; pending?: boolean }> = {
  ACCOUNT_READY: { title: "Cadastro pronto para análise", tone: "info", pending: true },
  ACCOUNT_UPDATED: { title: "Situação do cadastro atualizada", tone: "info" },
  ACCOUNT_LINKED: { title: "Empresa vinculada ao Sandbox", tone: "success" },
  CHARGE_CREATED: { title: "Cobrança Pix registrada", tone: "info" },
  CHARGE_REVIEW: { title: "Recebimento precisa de revisão", tone: "warning", pending: true },
  CHARGE_REVIEW_CLEARED: { title: "Revisão do recebimento atualizada", tone: "info" },
  CHARGE_FAILED: { title: "Cobrança Pix falhou", tone: "warning" },
  CHARGE_CANCELLED: { title: "Cobrança Pix cancelada", tone: "info" },
  PIX_RECEIVED: { title: "Pix recebido", tone: "success" },
  PIX_REFUNDED: { title: "Estorno Pix registrado", tone: "info" },
  WITHDRAWAL_CREATED: { title: "Saque Pix registrado", tone: "info" },
  APPROVAL_REQUIRED: { title: "Saque aguarda aprovação do titular", tone: "warning", pending: true },
  PIX_SENT: { title: "Saque Pix concluído", tone: "success" },
  WITHDRAWAL_REVIEW: { title: "Saque precisa de revisão", tone: "warning", pending: true },
  WITHDRAWAL_PROCESSING: { title: "Saque em processamento", tone: "info" },
  WITHDRAWAL_FAILED: { title: "Saque Pix falhou", tone: "warning" },
  WITHDRAWAL_CANCELLED: { title: "Saque Pix cancelado", tone: "info" },
  WEBHOOK_INTERRUPTED: { title: "Fila de webhook interrompida", tone: "warning", pending: true },
  WEBHOOK_QUEUE_CLEARED: { title: "Fila de webhook atualizada", tone: "info" },
};

const openingNoticeTitles: Record<string, string> = {
  UNDER_REVIEW: "Cadastro em análise",
  CHANGES_REQUESTED: "Ajustes cadastrais solicitados",
  RESUBMITTED: "Cadastro reenviado para análise",
  APPROVED: "Cadastro aprovado",
  REJECTED: "Recusa de cadastro registrada",
};

export function presentAdminNotice(notice: AdminNotice) {
  const presentation = adminNoticePresentation[notice.type];
  const openingTitle = notice.type === "ACCOUNT_UPDATED" && Object.hasOwn(openingNoticeTitles, notice.sourceState)
    ? openingNoticeTitles[notice.sourceState]
    : undefined;
  return openingTitle ? { ...presentation, title: openingTitle, tone: notice.sourceState === "APPROVED" ? "success" : presentation.tone } : presentation;
}

export function showAdminNoticeToast(notice: AdminNotice, preferences: AdminPreferences) {
  if (notice.referenceKey.startsWith("ACCOUNT:")) return preferences.notifyAccountOpenings;
  if (notice.referenceKey.startsWith("WEBHOOK:") || adminNoticePresentation[notice.type].tone === "warning") {
    return preferences.notifyOperationalWarnings;
  }
  return preferences.notifyPix && (notice.amountInCents ?? 0) >= preferences.pixMinimumInCents;
}

export async function fetchAdminActivity(page: number, signal: AbortSignal) {
  const response = await fetch(`/api/admin/notifications?page=${page}`, { signal, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.message ?? adminActivityUnavailable, response.status);
  const result = adminActivitySchema.safeParse(body);
  if (!result.success) throw new ApiError(adminActivityUnavailable, 503);
  return result.data;
}

export async function markAdminNotices(input: z.infer<typeof markAdminNoticesSchema>) {
  const response = await fetch("/api/admin/notifications/read", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !markAdminNoticesResultSchema.safeParse(body).success) {
    throw new ApiError(body?.message ?? "Não foi possível marcar as notificações como lidas.", response.status);
  }
}
