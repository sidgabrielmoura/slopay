import { z } from "zod";
import { cleanDocument, formatBrazilianInput } from "@/lib/validators";

const brazilianPhone = /^\+55[1-9]\d{9,10}$/;

export const profilePath = "/conta/perfil";
export const profilePhoneInvalid = "Informe um telefone brasileiro com DDD.";

export const profileDetailsSchema = z.object({
  cpfEnding: z.string().regex(/^\d{2}$/).nullable(),
  phone: z.string().max(20).nullable(),
});

export const profilePhoneResponseSchema = z.object({ phone: z.string().regex(brazilianPhone) });
export const profilePhoneRequestSchema = profilePhoneResponseSchema.extend({
  expectedUserId: z.string().min(1).max(100),
}).strict();

export function normalizeProfilePhone(value: string) {
  const formatted = formatBrazilianInput("PHONE", value);
  if (!formatted) return null;
  const digits = cleanDocument(formatted);
  const phone = formatted.startsWith("+") ? `+${digits}` : `+55${digits}`;
  return brazilianPhone.test(phone) ? phone : null;
}
