import { z } from "zod";

export const movementBalance = z.object({
  beforeInCents: z.string().regex(/^-?\d{1,19}$/),
  afterInCents: z.string().regex(/^-?\d{1,19}$/),
  reservedBeforeInCents: z.string().regex(/^\d{1,19}$/),
  reservedAfterInCents: z.string().regex(/^\d{1,19}$/),
});

export type MovementBalance = z.infer<typeof movementBalance>;
