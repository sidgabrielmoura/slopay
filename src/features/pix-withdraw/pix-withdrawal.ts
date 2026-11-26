import { z } from "zod";
import { passkeyAssertionSchema, passkeyOptionsSchema, sessionConfirmationTokenSchema } from "@/features/auth/passkey-contract";
import { expenseCategorySchema } from "@/features/expenses/expenses";
import type { IntegrationProof } from "@/features/integrations/integration-proof";
import { MAX_PIX_AMOUNT_IN_CENTS, pixAmountSchema, pixPaymentIdSchema } from "@/features/pix-receive/pix-receipt";
import { cleanDocument, formatBrazilianInput, pixKeyInputMask } from "@/lib/validators";

export const pixKeyLabels = {
  EMAIL: "E-mail",
  CPF: "CPF",
  CNPJ: "CNPJ",
  PHONE: "Telefone",
  EVP: "Chave aleatória",
} as const;

export const pixKeyTypeSchema = z.enum(["EMAIL", "CPF", "CNPJ", "PHONE", "EVP"]);
export type PixKeyType = z.infer<typeof pixKeyTypeSchema>;

const emailKeyPattern = /^[a-z0-9.!#$%&'*+/=?^_\x60{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
const randomKeyPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function normalizeWithdrawalKey(type: PixKeyType, input: string): string | null {
  const key = input.trim();
  if (type === "EMAIL") return key.length <= 77 && emailKeyPattern.test(key) ? key.toLowerCase() : null;
  if (type === "EVP") return randomKeyPattern.test(key) ? key.toLowerCase() : null;
  const mask = pixKeyInputMask(type);
  if (!mask) return key;
  const formatted = formatBrazilianInput(mask, key);
  if (!formatted) return null;
  if (type === "CPF") {
    const digits = cleanDocument(formatted);
    return /^\d{11}$/.test(digits) ? digits : null;
  }
  if (type === "CNPJ") {
    const document = formatted.replace(/[./-]/g, "");
    return /^[A-Z0-9]{12}\d{2}$/.test(document) ? document : null;
  }
  const digits = cleanDocument(formatted);
  const national = formatted.startsWith("+") ? digits.slice(2) : digits;
  return /^[1-9]\d{9,10}$/.test(national) ? "+55" + national : null;
}

export const withdrawalFeeSchema = z.int().min(0).max(MAX_PIX_AMOUNT_IN_CENTS);
export const withdrawalDraftSchema = z.strictObject({
  amountInCents: pixAmountSchema,
  pixKeyType: pixKeyTypeSchema,
  pixKey: z.string().trim().min(1).max(120).optional(),
  simulate: z.boolean(),
  feeLimitInCents: withdrawalFeeSchema.optional(),
  expenseCategory: expenseCategorySchema.nullable().optional(),
});
export const withdrawalReviewSchema = z.string().regex(/^\d{13}\.[0-9a-f]{64}$/);
export const withdrawalPasskeyOptionsSchema = passkeyOptionsSchema.extend({ review: withdrawalReviewSchema.optional() });
export const withdrawalInputSchema = z.union([
  withdrawalDraftSchema.extend({ verificationCode: z.string().regex(/^\d{6}$/), review: withdrawalReviewSchema.optional() }),
  withdrawalDraftSchema.extend({ credential: passkeyAssertionSchema }),
  withdrawalDraftSchema.extend({ sessionConfirmation: sessionConfirmationTokenSchema }),
]);
export type WithdrawalDraftInput = z.infer<typeof withdrawalDraftSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalInputSchema>;
export type WithdrawalProof = IntegrationProof;

export const withdrawalOptionsSchema = z.object({
  availableBalanceInCents: z.int().nonnegative(),
  feeLimitInCents: withdrawalFeeSchema.nullish(),
  simulationAvailable: z.boolean(),
  simulationDestination: z.string().max(120).nullable(),
});

const withdrawalStatusLabels = {
  QUEUED: "Preparando saque",
  SUBMITTING: "Enviando saque",
  RECONCILING: "Verificando envio",
  PENDING: "Aguardando confirmação",
  IN_BANK_PROCESSING: "Em processamento",
  BLOCKED: "Saque bloqueado",
  DONE: "Saque concluído",
  FAILED: "Saque recusado",
  CANCELLED: "Saque cancelado",
  REVIEW: "Saque em revisão",
} as const;

const withdrawalReasons: Record<string, string> = {
  INSUFFICIENT_BALANCE: "Saldo disponível insuficiente para o saque.",
  AUTHORIZATION_EXPIRED: "A autorização expirou antes do envio. Revise os dados e inicie um novo saque.",
  PROVIDER_REJECTED: "A transferência foi recusada. Confira o saldo e a chave Pix.",
  PROVIDER_FAILED: "A transferência falhou.",
  PROVIDER_ACCESS_DENIED: "A transferência está indisponível para a carteira.",
  PROVIDER_BALANCE_OR_FEE_CHANGED: "A checagem de saldo e tarifa da carteira de pagamentos impediu o envio do saque.",
  PROVIDER_INSUFFICIENT_BALANCE: "O saldo da carteira de pagamentos é insuficiente para cobrir o saque e a tarifa.",
  PROVIDER_FEE_UNAVAILABLE: "A tarifa do saque está temporariamente indisponível.",
  PROVIDER_FEE_LIMIT_EXCEEDED: "A tarifa do saque ultrapassou o limite configurado para a carteira.",
};

export const withdrawalSchema = z.object({
  id: pixPaymentIdSchema,
  environment: z.enum(["sandbox", "live"]),
  state: z.enum(Object.keys(withdrawalStatusLabels) as Array<keyof typeof withdrawalStatusLabels>),
  amountInCents: pixAmountSchema,
  currency: z.literal("BRL"),
  asaasTransferId: z.uuid().nullable(),
  feeInCents: z.int().nonnegative().nullable(),
  expenseCategory: expenseCategorySchema.nullable().optional(),
  destination: z.string().max(80),
  pixKeyType: pixKeyTypeSchema,
  simulated: z.boolean(),
  createdAt: z.iso.datetime(),
  effectiveDate: z.iso.date().nullable(),
  effectiveAt: z.iso.datetime().nullable(),
  confirmedAt: z.iso.datetime().nullable(),
  reason: z.string().max(64).nullable(),
});
export type PixWithdrawal = z.infer<typeof withdrawalSchema>;
export const recentWithdrawalsSchema = z.object({ withdrawals: z.array(withdrawalSchema).max(6) });

export function isWithdrawalFinal(state: PixWithdrawal["state"]) {
  return state === "DONE" || state === "FAILED" || state === "CANCELLED";
}

export function withdrawalStatusLabel(withdrawal: Pick<PixWithdrawal, "state">) {
  return withdrawalStatusLabels[withdrawal.state];
}

export function withdrawalIssue(withdrawal: Pick<PixWithdrawal, "state" | "reason"> | undefined) {
  if (!withdrawal) return null;
  if (withdrawal.state === "REVIEW") return "Acompanhe a revisão deste saque antes de solicitar outro.";
  if (withdrawal.state === "FAILED") {
    return withdrawalReasons[withdrawal.reason ?? ""] ?? "O saque foi encerrado. Consulte os detalhes da operação.";
  }
  return null;
}

export const withdrawalUnavailable = "O serviço de saque Pix está temporariamente indisponível.";
