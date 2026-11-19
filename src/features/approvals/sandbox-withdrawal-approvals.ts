import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { sandboxApiPost } from "@/features/integrations/sandbox-api";
import { requestPixGateway } from "@/lib/pix-gateway-client";

const date = z.iso.datetime();
const cents = z.number().int().nonnegative();
export const approvalItemSchema = z.object({
  id: z.uuid(), environment: z.literal("sandbox"), currency: z.literal("BRL"),
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
export type ApprovalGroup = z.infer<typeof approvalGroupSchema>;
export type WithdrawalApproval = z.infer<typeof approvalItemSchema>;
export type WithdrawalApprovalReview = z.infer<typeof approvalReviewSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;

const base = "/api/integrations/sandbox/withdrawal-approvals";
const unavailable = "As aprovações estão temporariamente indisponíveis.";

export const withdrawalApprovalsGateway = {
  list: (group: ApprovalGroup, before?: string, signal?: AbortSignal) => {
    const search = new URLSearchParams({ group, ...(before && { before }) });
    return requestPixGateway(`${base}?${search}`, approvalPageSchema, unavailable, { signal });
  },
  review: (id: string, signal?: AbortSignal) => requestPixGateway(`${base}/${id}`, approvalReviewSchema, unavailable, { signal }),
  options: (id: string, decision: ApprovalDecision) => requestPixGateway(`${base}/${id}/passkey-options`, passkeyOptionsSchema, unavailable, sandboxApiPost(decision)),
  decide: (id: string, decision: ApprovalDecision, proof: IntegrationProof) =>
    requestPixGateway(`${base}/${id}/actions`, approvalItemSchema, unavailable, sandboxApiPost({ ...decision, proof })),
};
