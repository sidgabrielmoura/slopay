import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";

const endpoint = "/api/account-opening";
const version = z.int().min(1).max(2_000_000_000);
export const ownerOpeningSchema = z.object({
  review: z.object({
    status: z.enum(["UNDER_REVIEW", "CHANGES_REQUESTED", "RESUBMITTED", "REJECTED"]),
    reason: z.string().nullable(),
    version,
  }).nullable(),
});
export const resubmitOpeningSchema = z.strictObject({ version });
export const resubmitOpeningResultSchema = z.object({ updated: z.literal(true) });

export const ownerAccountOpening = {
  get: (signal: AbortSignal) => requestPixGateway(endpoint, ownerOpeningSchema, "Não foi possível consultar seu cadastro.", { signal }),
  resubmit: (version: number) => requestPixGateway(endpoint, resubmitOpeningResultSchema, "Não foi possível reenviar seu cadastro.", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version }),
  }),
};
