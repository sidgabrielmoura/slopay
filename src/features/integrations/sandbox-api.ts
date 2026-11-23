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
export const requestLogFilterSchema = z.strictObject({ before: z.uuid().optional() });
export const requestLogsSchema = z.object({
  items: z.array(z.object({
    id: z.uuid(), method: z.enum(["GET", "POST"]), route: z.string(), status: z.number().int(),
    durationMs: z.number().int().nonnegative(), correlationId: z.string(), recordedAt: z.iso.datetime(),
    keyLabel: z.string().nullable(),
  })),
  nextCursor: z.uuid().nullable(),
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
  requestLogs: (before?: string, signal?: AbortSignal) => {
    const query = before ? `?${new URLSearchParams({ before })}` : "";
    return requestPixGateway(`${base}/request-logs${query}`, requestLogsSchema, unavailable, { signal });
  },
  };
}
