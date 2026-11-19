import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import type { LiveTransactionDetail } from "@/features/transactions/live-transactions";

export const receiptsPath = "/comprovantes";
export const sharedReceiptPath = "/comprovante";
export const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const receiptUnavailable = "Não foi possível preparar o comprovante. Tente novamente.";
export const sharedReceiptUnavailable = "Não foi possível abrir o comprovante. Tente novamente.";
export const receiptLinkUnavailable = "Peça um novo link a quem compartilhou o comprovante.";

export const receiptShareSchema = z.object({
  shareToken: shareTokenSchema,
  expiresAt: z.iso.datetime(),
});

const officialReceiptUrl = /^https:\/\/(?:www\.|sandbox\.)?asaas\.com\/comprovantes\/[A-Za-z0-9_-]+\/?$/;
const maskedDocument = /^(?:\*{3}\.\d{3}\.\d{3}-\*{2}|\*{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/\*{4}-\*{2})$/;

export const sharedReceiptSchema = z.object({
  expiresAt: z.iso.datetime(),
  receipt: z.object({
    environment: z.literal("sandbox"),
    direction: z.enum(["IN", "OUT"]),
    kind: z.literal("refund").optional(),
    simulated: z.boolean(),
    amountInCents: z.int().positive(),
    netInCents: z.int().nonnegative().nullable(),
    feeInCents: z.int().nonnegative().nullable(),
    settledAt: z.iso.datetime().nullable(),
    settledDate: z.iso.date().nullable(),
    createdAt: z.iso.datetime(),
    providerId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
    endToEndId: z.string().regex(/^E[A-Za-z0-9]{31}$/).nullable(),
    officialUrl: z.string().max(500).regex(officialReceiptUrl).nullable(),
    counterparty: z.object({
      name: z.string().min(1).max(160).nullable(),
      document: z.string().regex(maskedDocument).nullable(),
      institution: z.string().min(1).max(160).nullable(),
      ispb: z.string().min(1).max(8).nullable(),
    }),
  }),
});

export type SharedReceipt = z.infer<typeof sharedReceiptSchema>;

export function canSharePixReceipt(
  environment: LiveTransactionDetail["environment"],
  operation: Pick<LiveTransactionDetail["operation"], "status" | "providerId" | "refundedInCents" | "refundPending">,
) {
  return environment === "sandbox" && operation.status === "COMPLETED" && Boolean(operation.providerId) &&
    !operation.refundPending && !operation.refundedInCents;
}

export function createReceiptLink(reference: string, signal?: AbortSignal) {
  const path = "/api/dashboard/transactions/" + encodeURIComponent(reference) + "/receipt-share";
  return requestPixGateway(path, receiptShareSchema, receiptUnavailable, { method: "POST", signal });
}

export function fetchSharedReceipt(token: string, signal: AbortSignal) {
  return requestPixGateway("/api/public/receipt", sharedReceiptSchema, sharedReceiptUnavailable, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shareToken: token }), signal,
  });
}
