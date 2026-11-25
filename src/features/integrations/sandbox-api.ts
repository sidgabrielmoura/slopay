import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { integrationProofSchema, type IntegrationProof } from "./integration-proof";

export const apiAccessDraftSchema = z.strictObject({
  version: z.number().int().positive(),
  networks: z.array(z.string().trim().min(1).max(64)).max(20),
});
export const apiAccessActionSchema = apiAccessDraftSchema.extend({ proof: integrationProofSchema });
export const apiSecuritySchema = z.object({
  access: apiAccessDraftSchema.nullable(),
  limits: z.object({ windowSeconds: z.number().int(), requestsPerKey: z.number().int(), requestsPerCompany: z.number().int() }),
  withdrawalsEnabled: z.boolean(),
});
export const integrationLogPageQuery = z.string().regex(/^[1-9]\d{0,5}$/).optional();
export const integrationLogPagination = z.object({ page: z.int().positive(), pageSize: z.int().positive(), total: z.int().nonnegative() });
export const requestLogFilterSchema = z.strictObject({ before: z.uuid().optional(), page: integrationLogPageQuery })
  .refine(({ before, page }) => !before || !page);
export const requestLogsSchema = z.object({
  items: z.array(z.object({
    id: z.uuid(), method: z.enum(["GET", "POST"]), route: z.string(), status: z.number().int(),
    durationMs: z.number().int().nonnegative(), correlationId: z.string(), recordedAt: z.iso.datetime(),
    keyLabel: z.string().nullable(),
  })),
  nextCursor: z.uuid().nullable(),
  pagination: integrationLogPagination.optional(),
});
export type ApiAccessDraft = z.infer<typeof apiAccessDraftSchema>;


export function sandboxApiPost(body: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function integrationApiGateway(development: boolean) {
  const base = development ? "/api/integrations/sandbox" : "/api/integrations/live";
  const unavailable = "A integração está temporariamente indisponível.";
  return {
  security: (signal?: AbortSignal) => requestPixGateway(`${base}/api-security`, apiSecuritySchema, unavailable, { signal }),
  options: (draft: ApiAccessDraft) => requestPixGateway(`${base}/api-security/passkey-options`, passkeyOptionsSchema, unavailable, sandboxApiPost(draft)),
  update: (draft: ApiAccessDraft, proof: IntegrationProof) =>
    requestPixGateway(`${base}/api-security`, apiSecuritySchema, unavailable, sandboxApiPost({ ...draft, proof })),
  requestLogs: (page: number, signal?: AbortSignal) =>
    requestPixGateway(`${base}/request-logs?${new URLSearchParams({ page: String(page) })}`, requestLogsSchema, unavailable, { signal }),
  };
}
