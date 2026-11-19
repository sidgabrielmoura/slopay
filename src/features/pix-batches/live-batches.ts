import { z } from "zod";
import { passkeyAssertionSchema } from "@/features/auth/passkey-contract";
import { expenseCategorySchema } from "@/features/expenses/expenses";
import { pixAmountSchema, pixPaymentIdSchema } from "@/features/pix-receive/pix-receipt";
import { pixKeyTypeSchema, withdrawalFeeSchema, withdrawalSchema } from "@/features/pix-withdraw/pix-withdrawal";
import type { BadgeProps } from "@/components/ui/badge";

export const batchesPath = "/pix/saques-em-lote";
export const maxBatchTransferCount = 12;
export const batchesUnavailable = "O serviço de saques em lote está temporariamente indisponível.";

const transferInput = z.strictObject({
  amountInCents: pixAmountSchema,
  pixKeyType: pixKeyTypeSchema,
  pixKey: z.string().trim().min(1).max(120).optional(),
  expenseCategory: expenseCategorySchema.nullable().optional(),
});
export const batchDraftSchema = z.strictObject({
  title: z.string().trim().max(80).optional(),
  transfers: z.array(transferInput).min(2).max(maxBatchTransferCount),
  simulate: z.boolean(),
  feeLimitInCents: withdrawalFeeSchema.optional(),
});
export const batchInputSchema = z.union([
  batchDraftSchema.extend({ verificationCode: z.string().regex(/^\d{6}$/) }),
  batchDraftSchema.extend({ credential: passkeyAssertionSchema }),
]);
export type BatchDraftInput = z.infer<typeof batchDraftSchema>;
export type BatchInput = z.infer<typeof batchInputSchema>;

const batchStates = ["QUEUED", "PROCESSING", "REVIEW", "DONE", "PARTIAL", "FAILED"] as const;
const count = z.int().nonnegative().max(maxBatchTransferCount);
const money = z.int().nonnegative();
const batchSummary = z.object({
  id: pixPaymentIdSchema,
  title: z.string().max(80).nullable(),
  environment: z.literal("sandbox"),
  createdAt: z.iso.datetime(),
  simulated: z.boolean(),
  state: z.enum(batchStates),
  count: count.min(2),
  completedCount: count,
  failedCount: count,
  reviewCount: count,
  pendingCount: count,
  amountInCents: money.positive(),
  completedAmountInCents: money,
  recordedFeesInCents: money.nullable(),
});
const batchTransfer = withdrawalSchema.pick({
  id: true, state: true, destination: true, pixKeyType: true, expenseCategory: true, amountInCents: true,
  feeInCents: true, simulated: true, confirmedAt: true, reason: true,
}).extend({ position: count.positive() });
export const batchDetailSchema = batchSummary.extend({ transfers: z.array(batchTransfer).min(2).max(maxBatchTransferCount) });
export const batchListSchema = z.object({
  data: z.array(batchSummary).max(10),
  page: z.int().positive(),
  total: z.int().nonnegative(),
  totalPages: z.int().positive(),
});
export type BatchSummary = z.infer<typeof batchSummary>;
export type BatchDetail = z.infer<typeof batchDetailSchema>;

export const batchStatus: Record<BatchSummary["state"], { label: string; variant: BadgeProps["variant"] }> = {
  QUEUED: { label: "Na fila", variant: "secondary" },
  PROCESSING: { label: "Processando", variant: "info" },
  REVIEW: { label: "Em revisão", variant: "warning" },
  DONE: { label: "Concluído", variant: "success" },
  PARTIAL: { label: "Concluído parcialmente", variant: "warning" },
  FAILED: { label: "Encerrado sem pagamento", variant: "destructive" },
};

export function batchIsPending(batch: BatchSummary) {
  return batch.pendingCount > 0 || batch.reviewCount > 0;
}
