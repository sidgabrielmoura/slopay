import { z } from "zod";

export const adminPixPayer = z.object({
  name: z.string().max(160).nullable(),
  document: z.string().max(18).nullable(),
  institution: z.string().max(160).nullable(),
  endToEndId: z.string().max(32).nullable(),
});

export type AdminPixPayer = z.infer<typeof adminPixPayer>;
