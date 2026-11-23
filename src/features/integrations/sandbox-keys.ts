import { z } from "zod";
import { integrationProofSchema, type IntegrationProof } from "./integration-proof";

export const sandboxKeyPermissions = {
  "pix:charges:read": "Consultar cobranças e QR Codes",
  "pix:charges:create": "Criar cobranças Pix",
  "pix:withdrawals:request": "Solicitar saques para aprovação",
  "pix:withdrawals:read": "Consultar saques da integração",
} as const;

const scope = z.enum(Object.keys(sandboxKeyPermissions) as (keyof typeof sandboxKeyPermissions)[]);
export const sandboxKeyId = z.uuid();
export const keyDraftSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(scope).min(1).max(scope.options.length).refine((items) => new Set(items).size === items.length),
  expiresAt: z.iso.datetime({ offset: true }).optional(),
});
export const keyChangeSchema = z.strictObject({ action: z.enum(["pause", "resume", "revoke"]) });
export const keyCreateSchema = keyDraftSchema.extend({ proof: integrationProofSchema });
export const keyStatusSchema = keyChangeSchema.extend({ proof: integrationProofSchema });

export const sandboxKeySchema = z.object({
  id: sandboxKeyId,
  name: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(scope),
  status: z.enum(["active", "paused", "expired", "revoked"]),
  environment: z.enum(["sandbox", "live"]),
  expiresAt: z.iso.datetime().nullable(),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const issuedKeySchema = sandboxKeySchema.extend({ secret: z.string().regex(/^slopay_(?:sbx|live)_[0-9a-f]{64}$/) });
export const sandboxKeysSchema = z.array(sandboxKeySchema);
export const sandboxIntegrationStatusSchema = z.object({
  environment: z.enum(["sandbox", "live"]),
  company: z.object({ id: z.uuid(), legalName: z.string(), cnpj: z.string().nullable() }).nullable(),
  verifiedAt: z.iso.datetime().nullable(),
});

export type SandboxKey = z.infer<typeof sandboxKeySchema>;
export type KeyDraft = z.infer<typeof keyDraftSchema>;
export type KeyChange = z.infer<typeof keyChangeSchema>["action"];
export type KeyProof = IntegrationProof;
export type IssuedKey = z.infer<typeof issuedKeySchema>;

