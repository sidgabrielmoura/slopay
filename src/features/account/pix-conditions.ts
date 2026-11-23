import { z } from "zod";

export const taxesAndLimitsPath = "/conta/taxas-e-limites";
export const pixConditionsUnavailable = "Não foi possível consultar taxas e limites.";
export const asaasPixLimitsHelp = "https://central.ajuda.asaas.com/hc/pt-br/articles/32013199501723-Como-consultar-meus-limites-Pix";

const cents = z.int().nonnegative();
const promotion = z.object({
  cents,
  expiresAt: z.union([z.iso.date(), z.iso.datetime()]).nullable(),
}).nullable();

export const pixFeesSchema = z.object({
  receipt: z.object({
    fixedInCents: cents.nullable(),
    percentage: z.number().min(0).max(100).nullable(),
    minimumInCents: cents.nullable(),
    maximumInCents: cents.nullable(),
    monthlyFreeReceipts: z.int().positive().nullable(),
    promotion,
  }).nullable(),
  transfer: z.object({
    feeInCents: cents.nullable(),
    monthlyFreeTransfers: z.int().positive().nullable(),
    promotion,
  }).nullable(),
});

export type PixFees = z.infer<typeof pixFeesSchema>;

export const pixConditionsSchema = z.union([
  z.object({ environment: z.null() }),
  z.object({
    environment: z.enum(["sandbox", "live"]),
    minimumChargeInCents: cents.positive(),
    batchLimits: z.object({ minimum: z.int().positive(), maximum: z.int().positive() })
      .refine(({ minimum, maximum }) => minimum <= maximum).nullable(),
    fees: pixFeesSchema.nullable(),
    availableBalanceInCents: cents.nullable(),
    checkedAt: z.iso.datetime().nullable(),
  }),
]);
