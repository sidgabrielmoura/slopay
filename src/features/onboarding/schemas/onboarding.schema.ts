import { z } from "zod";
import { isValidCPF, isValidCNPJ, cleanDocument } from "@/lib/validators";

export const step1Fields = z.object({
  fullName: z
    .string()
    .min(3, "Nome completo deve ter no mínimo 3 caracteres")
    .max(100, "Nome não pode exceder 100 caracteres")
    .refine(
      (val) => val.trim().split(/\s+/).length >= 2,
      "Informe seu nome e sobrenome completos"
    ),
  cpf: z
    .string()
    .min(11, "CPF incompleto")
    .refine((val) => isValidCPF(val), "CPF inválido. Verifique os dígitos informados"),
  email: z
    .string()
    .min(1, "E-mail corporativo obrigatório")
    .email("Informe um e-mail válido"),
  phone: z
    .string()
    .min(14, "Telefone incompleto")
    .refine(
      (val) => cleanDocument(val).length >= 10,
      "Informe um telefone com DDD válido"
    ),
  roleInCompany: z.enum(["SOCIO", "DIRETOR", "PROCURADOR", "OUTRO"], {
    message: "Selecione seu vínculo com a empresa",
  }),
  roleOther: z.string().optional(),
});

export const step1Schema = step1Fields.refine(
  (data) => {
    if (data.roleInCompany === "OUTRO") {
      return Boolean(data.roleOther && data.roleOther.trim().length >= 2);
    }
    return true;
  },
  {
    message: "Especifique o seu cargo/vínculo com a empresa",
    path: ["roleOther"],
  }
);

export const step2Fields = z.object({
  cnpj: z
    .string()
    .min(14, "CNPJ incompleto")
    .refine((val) => isValidCNPJ(val), "CNPJ inválido. Verifique os dígitos informados"),
  businessSegment: z.enum(
    ["ECOMMERCE", "SAAS", "MARKETPLACE", "SERVICOS", "FINTECH", "OUTRO"],
    {
      message: "Selecione o segmento de atuação",
    }
  ),
  companySize: z.enum(["1-10", "11-50", "51-200", "200+"], {
    message: "Selecione o porte da empresa",
  }),
  website: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(
          val.trim()
        );
      },
      {
        message: "Informe uma URL ou domínio comercial válido (ex: empresa.com.br)",
      }
    ),
  legalName: z.string().optional(),
  tradeName: z.string().optional(),
});

export const step2Schema = step2Fields;

// Campos de acesso (Passo 3)
export const stepAccessFields = z.object({
  accessEmail: z
    .string()
    .min(1, "E-mail de acesso obrigatório")
    .email("Informe um e-mail válido"),
  password: z
    .string()
    .min(12, "A senha deve ter no mínimo 12 caracteres")
    .max(128, "A senha não pode exceder 128 caracteres")
    .refine((val) => /[a-z]/.test(val), "A senha deve conter ao menos uma letra minúscula")
    .refine((val) => /[A-Z]/.test(val), "A senha deve conter ao menos uma letra maiúscula")
    .refine((val) => /[0-9]/.test(val), "A senha deve conter ao menos um número")
    .refine(
      (val) => /[^A-Za-z0-9]/.test(val),
      "A senha deve conter ao menos um caractere especial (!@#$%...)"
    ),
  confirmPassword: z.string().min(1, "Confirme a senha de acesso"),
});

export const stepAccessSchema = stepAccessFields.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  }
);

// Campos de revisão e declaração (Passo 4)
export const stepReviewFields = z.object({
  declarationAccepted: z.boolean().refine((val) => val === true, {
    message:
      "Você deve declarar que as informações fornecidas são verdadeiras para submeter a proposta.",
  }),
});

export const stepReviewSchema = stepReviewFields;

// Aliases para manter compatibilidade
export const step4Fields = stepAccessFields;
export const step4Schema = stepAccessSchema;
export const step5Fields = stepReviewFields;
export const step5Schema = stepReviewSchema;

// Campos legados de operação (opcionais para não quebrar referências)
export const legacyOperationFields = z.object({
  estimatedMonthlyVolume: z.string().optional(),
  averageTicket: z.string().optional(),
  pixUsageType: z.string().optional(),
  integrationChannel: z.string().optional(),
  businessDescription: z.string().optional(),
  notes: z.string().optional(),
});

export const fullOnboardingSchema = z
  .object({
    ...step1Fields.shape,
    ...step2Fields.shape,
    ...stepAccessFields.shape,
    ...stepReviewFields.shape,
    ...legacyOperationFields.shape,
  })
  .refine(
    (data) => {
      if (data.roleInCompany === "OUTRO") {
        return Boolean(data.roleOther && data.roleOther.trim().length >= 2);
      }
      return true;
    },
    {
      message: "Especifique o seu cargo/vínculo com a empresa",
      path: ["roleOther"],
    }
  )
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type Step1FormData = z.infer<typeof step1Schema>;
export type Step2FormData = z.infer<typeof step2Schema>;
export type StepAccessFormData = z.infer<typeof stepAccessSchema>;
export type StepReviewFormData = z.infer<typeof stepReviewSchema>;
export type FullOnboardingFormData = z.infer<typeof fullOnboardingSchema>;

/**
 * Validador síncrono de etapas parciais usando os schemas específicos do Zod.
 * Aplica os erros diretamente no formState do react-hook-form para exibição em tela.
 */
export function validateStepWithSchema(
  schema: z.ZodTypeAny,
  data: any,
  setError: (field: any, error: { type: string; message: string }) => void,
  clearErrors: (fields?: any) => void,
  fieldKeys: string[]
): boolean {
  clearErrors(fieldKeys as any);
  const result = schema.safeParse(data);
  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (field) {
        setError(field as any, {
          type: "manual",
          message: issue.message,
        });
      }
    });
    return false;
  }
  return true;
}
