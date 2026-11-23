import { z } from "zod";

export const MAX_PIX_AMOUNT_IN_CENTS = 2_147_483_647;
export const MIN_ASAAS_PIX_AMOUNT_IN_CENTS = 500;
export const asaasPixMinimumMessage = "O valor mínimo para receber Pix no Asaas é R$ 5,00.";

export const pixAmountSchema = z.int().min(1).max(MAX_PIX_AMOUNT_IN_CENTS);
export const pixPaymentIdSchema = z.uuidv4();
export const pixSimulationSchema = z.object({ accepted: z.literal(true) });
export const pixReceiptDatesSchema = z.object({
  paidDate: z.iso.date().nullable(),
  paidAt: z.iso.datetime().nullable(),
  recordedAt: z.iso.datetime(),
});
export const pixPaymentSchema = z.object({
  id: pixPaymentIdSchema,
  environment: z.enum(["sandbox", "live"]),
  amountInCents: pixAmountSchema,
  currency: z.literal("BRL"),
  state: z.enum(["QUEUED", "SUBMITTING", "RECONCILING", "OPEN", "RECEIVED", "REVIEW"]),
  status: z.enum(["PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED"]),
  dueDate: z.iso.date(),
  qrCodeAvailable: z.boolean(),
  createdAt: z.iso.datetime().optional(),
  receipt: pixReceiptDatesSchema.nullish(),
  refund: z.object({ completedInCents: z.int().nonnegative(), pending: z.boolean() }).optional(),
});
export const pixQrCodeSchema = z.object({
  encodedImage: z.string().max(384 * 1024).regex(/^iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/),
  payload: z.string().regex(/^000201[ -~]{20,506}$/),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?)?$/),
});

export type PixReceiptStatus = "preparing" | "pending" | "paid" | "review" | "expired" | "cancelled" | "failed" | "unavailable"
  | "refund-pending" | "refunded" | "partially-refunded";

export type PixReceipt = {
  id: string;
  amountInCents: number;
  status: PixReceiptStatus;
  qrCodeAvailable: boolean;
};

export type PixReceiptCode = z.infer<typeof pixQrCodeSchema>;

export const pixPayerSchema = z.strictObject({
  name: z.string().trim().min(3).max(100),
  document: z.string().regex(/^\d{11}(?:\d{3})?$/),
});
export type PixPayer = z.infer<typeof pixPayerSchema>;

export type PixReceiveGateway = {
  create: (amountInCents: number, key: string, payer?: PixPayer) => Promise<PixReceipt>;
  get: (id: string, signal?: AbortSignal) => Promise<PixReceipt>;
  qrCode?: (id: string, signal?: AbortSignal) => Promise<PixReceiptCode>;
  simulate?: (id: string) => Promise<PixReceipt>;
  requestSimulation?: (id: string) => Promise<void>;
  requestReconciliation?: (id: string) => Promise<unknown>;
};
