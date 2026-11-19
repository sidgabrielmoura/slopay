import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";

export const merchantTeamRoles = z.enum(["OPERATOR", "AUDITOR"]);
export const merchantTeamRoleLabels = { OPERATOR: "Operador", AUDITOR: "Auditor" } as const;
const version = z.int().min(0).max(2_147_483_647);
export const merchantTeamChange = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("INVITE"), email: z.email().max(254), role: merchantTeamRoles }),
  z.strictObject({ action: z.literal("REVOKE"), id: z.uuid() }),
  z.strictObject({ action: z.literal("ACCESS"), id: z.uuid(), version, role: merchantTeamRoles, suspended: z.boolean() }),
]);
const confirmation = z.string().max(1024).regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
export const merchantTeamReview = passkeyOptionsSchema.extend({ confirmation });
const authorization = { confirmation, proof: integrationProofSchema };
export const merchantTeamAction = z.discriminatedUnion("action", [
  merchantTeamChange.options[0].extend(authorization),
  merchantTeamChange.options[1].extend(authorization),
  merchantTeamChange.options[2].extend(authorization),
]);
export const merchantTeamUpdated = z.object({ updated: z.literal(true) });
const teamState = z.enum(["ACTIVE", "PENDING_SETUP", "LOCKED", "SUSPENDED", "INVITED", "EXPIRED"]);
const teamMember = z.object({
  id: z.uuid(), email: z.string(), name: z.string().nullable(), role: merchantTeamRoles, state: teamState,
  version: version.nullable(),
});
export const merchantTeamReport = z.object({
  pagination: z.object({ page: z.int().positive(), pageSize: z.int().positive(), total: z.int().nonnegative() }),
  items: z.array(teamMember).max(8),
});

export type MerchantTeamChange = z.infer<typeof merchantTeamChange>;
export type MerchantTeamMember = z.infer<typeof teamMember>;

const api = "/api/merchant/team";
const unavailable = "Não foi possível consultar a equipe.";
const post = (body: object) => ({
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
export const merchantTeam = {
  list: (page: number, signal: AbortSignal) => requestPixGateway(
    api + "?page=" + page, merchantTeamReport, unavailable, { signal },
  ),
  options: (action: MerchantTeamChange) => requestPixGateway(
    api + "/options", merchantTeamReview, "Não foi possível preparar a alteração.", post(action),
  ),
  apply: (action: MerchantTeamChange, proof: IntegrationProof, confirmation: string) => requestPixGateway(
    api, merchantTeamUpdated, "Não foi possível registrar a alteração.", post({ ...action, proof, confirmation }),
  ),
};
