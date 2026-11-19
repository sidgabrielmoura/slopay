import { z } from "zod";

const email = z.email().max(254);

export const registrationEmailRequest = z.strictObject({
  confirmedEmail: email,
  resend: z.boolean().optional(),
});
export const registrationEmailChallenge = z.object({
  challengeId: z.uuid(),
  expiresAt: z.iso.datetime(),
  resendAt: z.iso.datetime(),
});
export const registrationEmailVerification = z.strictObject({
  challengeId: z.uuid(),
  code: z.string().regex(/^\d{6}$/),
});
export const registrationEmailCorrection = z.strictObject({
  confirmedEmail: email,
  newEmail: email,
});

export type RegistrationEmailChallenge = z.infer<typeof registrationEmailChallenge>;
