import type { AuthenticationResponseJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { z } from "zod";

const base64url = (max: number) => z.string().min(1).max(max).regex(/^[A-Za-z0-9_-]+$/);
export const passkeyIdSchema = base64url(1024);

export const passkeyAssertionSchema: z.ZodType<AuthenticationResponseJSON> = z.object({
  id: base64url(1024),
  rawId: base64url(1024),
  type: z.literal("public-key"),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
  clientExtensionResults: z.looseObject({}),
  response: z.object({
    authenticatorData: base64url(4096),
    clientDataJSON: base64url(8192),
    signature: base64url(4096),
    userHandle: base64url(1024).optional(),
  }),
});

const authenticationOptions = z.object({
  challenge: base64url(128),
  rpId: z.string().min(1).max(253),
  timeout: z.number().positive(),
  allowCredentials: z.array(z.object({
    id: base64url(1024),
    type: z.literal("public-key"),
    transports: z.array(z.enum(["internal", "hybrid"])).optional(),
  })).min(1),
  userVerification: z.literal("required"),
}) satisfies z.ZodType<PublicKeyCredentialRequestOptionsJSON>;

export const passkeyOptionsSchema = z.object({ options: authenticationOptions.nullable() });
export type PasskeyOptions = z.infer<typeof passkeyOptionsSchema>;

export const passkeyListSchema = z.object({ credentials: z.array(z.object({
  id: passkeyIdSchema, createdAt: z.iso.datetime(), lastUsedAt: z.iso.datetime().nullable(),
})) });
export const passkeyEnrolledSchema = z.object({ success: z.literal(true), credentialId: passkeyIdSchema });
export const passkeyPairSchema = z.strictObject({ replaceId: passkeyIdSchema, newId: passkeyIdSchema });
export type PasskeyList = z.infer<typeof passkeyListSchema>;
export type PasskeyPair = z.infer<typeof passkeyPairSchema>;
