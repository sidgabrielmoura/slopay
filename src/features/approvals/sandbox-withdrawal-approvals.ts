import { z } from "zod";
import { withdrawalPasskeyOptionsSchema } from "@/features/pix-withdraw/pix-withdrawal";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { sandboxApiPost } from "@/features/integrations/sandbox-api";
import { requestPixGateway } from "@/lib/pix-gateway-client";

const date = z.iso.datetime();
const cents = z.number().int().nonnegative();
export const approvalItemSchema = z.object({
  id: z.uuid(), environment: z.enum(["sandbox", "live"]), currency: z.literal("BRL"),
  state: z.enum(["AWAITING_APPROVAL", "QUEUED", "SUBMITTING", "RECONCILING", "PENDING", "IN_BANK_PROCESSING", "BLOCKED", "DONE", "FAILED", "CANCELLED", "REVIEW"]),
  amountInCents: cents, feeInCents: cents.nullable(), destination: z.string(),
  pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"]),
  createdAt: date, updatedAt: date, authorizedAt: date.nullable(), confirmedAt: date.nullable(), reason: z.string().nullable(),
});
export const approvalPageSchema = z.object({ enabled: z.boolean(), items: z.array(approvalItemSchema), nextCursor: z.uuid().nullable() });
export const approvalGroupSchema = z.enum(["pending", "history"]);
export const approvalFilterSchema = z.strictObject({ group: approvalGroupSchema.optional(), before: z.uuid().optional() });
export const approvalReviewSchema = approvalItemSchema.extend({ pixKey: z.string(), feeLimitInCents: cents.nullable() });
const approve = z.strictObject({ decision: z.literal("APPROVE"), feeLimitInCents: cents });
const reject = z.strictObject({ decision: z.literal("REJECT") });
export const approvalDecisionSchema = z.discriminatedUnion("decision", [approve, reject]);
export const confirmedApprovalSchema = z.discriminatedUnion("decision", [
  approve.extend({ proof: integrationProofSchema }), reject.extend({ proof: integrationProofSchema }),
]);
const liveProof = { proof: integrationProofSchema, review: z.string().regex(/^\d{13}\.[0-9a-f]{64}$/).optional() };
export const confirmedLiveApprovalSchema = z.discriminatedUnion("decision", [
  approve.extend(liveProof), reject.extend(liveProof),
]);
export type ApprovalGroup = z.infer<typeof approvalGroupSchema>;
export type WithdrawalApproval = z.infer<typeof approvalItemSchema>;
export type WithdrawalApprovalReview = z.infer<typeof approvalReviewSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;

const unavailable = "As aprovações estão temporariamente indisponíveis.";

export function withdrawalApprovalsGateway(development: boolean) {
  const base = `/api/integrations/${development ? "sandbox" : "live"}/withdrawal-approvals`;
  const options = (id: string, decision: ApprovalDecision) =>
    requestPixGateway(`${base}/${id}/passkey-options`, withdrawalPasskeyOptionsSchema, unavailable, sandboxApiPost(decision));

  return {
    list: (group: ApprovalGroup, before?: string, signal?: AbortSignal) => {
      const search = new URLSearchParams({ group, ...(before && { before }) });
      return requestPixGateway(`${base}?${search}`, approvalPageSchema, unavailable, { signal });
    },
    review: (id: string, signal?: AbortSignal) => requestPixGateway(`${base}/${id}`, approvalReviewSchema, unavailable, { signal }),
    options,
    decide: async (id: string, decision: ApprovalDecision, proof: IntegrationProof) => {
      const review = !development && "verificationCode" in proof ? (await options(id, decision)).review : undefined;
      return requestPixGateway(`${base}/${id}/actions`, approvalItemSchema, unavailable, sandboxApiPost({ ...decision, proof, review }));
    },
  };
}
