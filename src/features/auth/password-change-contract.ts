import { z } from "zod";
import { AUTH_PASSWORD_MAX_LENGTH, AUTH_PASSWORD_MIN_LENGTH } from "./auth-password";

const challengeId = z.uuidv4();
const grant = z.string().regex(/^[0-9a-f]{64}$/);

export const passwordChangeRequest = z.strictObject({
  expectedUserId: z.uuid(),
  confirmedEmail: z.email().max(254),
  resend: z.boolean().optional(),
});

export const passwordChangeChallenge = z.object({
  challengeId,
  expiresAt: z.iso.datetime(),
  resendAt: z.iso.datetime(),
});

export const passwordChangeVerification = z.strictObject({ challengeId, code: z.string().regex(/^\d{6}$/) });
export const passwordChangeGrant = z.object({ grant, expiresAt: z.iso.datetime() });
export const passwordChangeCompletion = z.strictObject({
  challengeId,
  grant,
  newPassword: z.string().min(AUTH_PASSWORD_MIN_LENGTH).max(AUTH_PASSWORD_MAX_LENGTH),
});

export type PasswordChangeChallenge = z.infer<typeof passwordChangeChallenge>;
export type PasswordChangeGrant = z.infer<typeof passwordChangeGrant>;
