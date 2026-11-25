import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { supportActivitySchema } from "@/lib/support-scope";
import { companiesPath } from "./admin-companies";

export const supportRequestSchema = z.strictObject({ requestId: z.uuidv4() });
export const supportProofSchema = supportRequestSchema.extend({ proof: integrationProofSchema });
export const supportStartedSchema = z.object({ id: z.uuidv4() });
export const supportEndedSchema = z.object({ ended: z.literal(true) });


export const supportHref = (id: string) => `/suporte/conta/${id}`;
export const supportReturnHref = (companyId: string) => `${companiesPath}/${companyId}`;
export const supportApiPath = (id: string, action: "activity" | "end") => `/api/admin/support/${id}/${action}`;

const unavailable = "Não foi possível acessar a conta.";
const jsonPost = (body: object) => ({
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

export const accountSupport = {
  options: (companyId: string, requestId: string) => requestPixGateway(
    `/api/admin/companies/${companyId}/support/options`, passkeyOptionsSchema, unavailable, jsonPost({ requestId }),
  ),
  start: (companyId: string, requestId: string, proof: IntegrationProof) => requestPixGateway(
    `/api/admin/companies/${companyId}/support`, supportStartedSchema, unavailable, jsonPost({ requestId, proof }),
  ),
  activity: (id: string, signal: AbortSignal) => requestPixGateway(
    supportApiPath(id, "activity"), supportActivitySchema, "Não foi possível manter o acesso de suporte.",
    { ...jsonPost({}), signal },
  ),
  end: (id: string) => requestPixGateway(
    supportApiPath(id, "end"), supportEndedSchema, "Não foi possível confirmar o encerramento do suporte.",
    { ...jsonPost({}), keepalive: true },
  ),
};
