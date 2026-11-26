import { z } from "zod";
import { passkeyAssertionSchema, sessionConfirmationTokenSchema } from "@/features/auth/passkey-contract";

export const integrationProofSchema = z.union([
  z.strictObject({ credential: passkeyAssertionSchema }),
  z.strictObject({ verificationCode: z.string().regex(/^\d{6}$/) }),
  z.strictObject({ sessionConfirmation: sessionConfirmationTokenSchema }),
]);

export type IntegrationProof = z.infer<typeof integrationProofSchema>;

