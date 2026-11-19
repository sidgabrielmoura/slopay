import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { isValidCNPJ } from "@/lib/validators";

export const accountOpeningSteps = ["Tipo de conta", "Identificação", "Endereço", "Revisão"] as const;
export const companyTypes = [
  { value: "MEI", label: "Microempreendedor individual" },
  { value: "LIMITED", label: "Sociedade limitada" },
  { value: "INDIVIDUAL", label: "Empresário individual" },
  { value: "ASSOCIATION", label: "Associação" },
] as const;
const states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;
export const stateOptions = states.map((state) => ({ value: state, label: state }));
export const maxDeclaredIncome = 2_000_000_000;

export const openingDraftSchema = z.strictObject({
  accountType: z.enum(["PF", "PJ"]),
  whatsapp: z.string().max(24).optional(),
  birthDate: z.string().regex(/^(?:\d{4}-\d{2}-\d{2})?$/).optional(),
  cnpj: z.string().max(18).optional(),
  legalName: z.string().max(150).optional(),
  companyType: z.enum(["MEI", "LIMITED", "INDIVIDUAL", "ASSOCIATION"]).optional(),
  representativeRole: z.string().max(80).optional(),
  postalCode: z.string().regex(/^\d{0,5}(?:-?\d{0,3})$/).optional(),
  address: z.string().max(120).optional(),
  addressNumber: z.string().max(18).optional(),
  complement: z.string().max(80).optional(),
  province: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  state: z.enum(states).optional(),
  activity: z.string().max(100).optional(),
  incomeInCents: z.int().min(0).max(maxDeclaredIncome).optional(),
});
export type OpeningDraft = z.infer<typeof openingDraftSchema>;

const version = z.int().min(0).max(2_000_000_000);
const stepNumber = z.int().min(1).max(accountOpeningSteps.length);
const endpoint = "/api/account-opening/application";
const unavailable = "Não foi possível consultar sua solicitação.";
export const accountOpeningApplicationSchema = z.object({
  owner: z.object({ name: z.string(), cpf: z.string().optional(), email: z.email(), phone: z.string().optional() }),
  state: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "RESUBMITTED", "REJECTED", "APPROVED"]),
  draft: openingDraftSchema.nullable(),
  nextStep: stepNumber,
  version,
  submittedAt: z.iso.datetime().nullable(),
  decidedAt: z.iso.datetime().nullable(),
  reason: z.string().nullable(),
});
export type OpeningApplication = z.infer<typeof accountOpeningApplicationSchema>;
export const saveOpeningApplicationSchema = z.strictObject({
  draft: openingDraftSchema,
  action: z.enum(["SAVE", "SUBMIT"]),
  nextStep: stepNumber,
  version,
  confirmed: z.literal(true).optional(),
});
export type SaveOpeningApplication = z.infer<typeof saveOpeningApplicationSchema>;

export const openingApplication = {
  get: (signal: AbortSignal) => requestPixGateway(endpoint, accountOpeningApplicationSchema, unavailable, { signal }),
  save: (input: SaveOpeningApplication) => requestPixGateway(
    endpoint, accountOpeningApplicationSchema, "Não foi possível salvar sua solicitação.",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
  ),
};

export const accountTypeLabels = { PF: "Pessoa física", PJ: "Empresa ou MEI" } as const;

export function formatOpeningDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" })
    .format(new Date(date.length === 10 ? date + "T12:00:00Z" : date));
}

export function formatPostalCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

export function isOpeningWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^(?:55)?[1-9]\d9\d{8}$/.test(digits) && (!value.startsWith("+") || digits.length === 13);
}

export function validateOpeningStep(
  step: number, draft: OpeningDraft,
): { field: keyof OpeningDraft; message: string } | null {
  if (step === 2) {
    if (!isOpeningWhatsApp(draft.whatsapp ?? "")) return { field: "whatsapp", message: "Informe um WhatsApp válido com DDD." };
    if (draft.accountType === "PF") {
      const date = Date.parse((draft.birthDate ?? "") + "T00:00:00Z");
      if (!Number.isFinite(date) || date >= Date.now() || new Date(date).toISOString().slice(0, 10) !== draft.birthDate) {
        return { field: "birthDate", message: "Informe uma data de nascimento válida." };
      }
    } else {
      if (!isValidCNPJ(draft.cnpj ?? "")) return { field: "cnpj", message: "Informe um CNPJ válido." };
      if (!draft.legalName?.trim()) return { field: "legalName", message: "Informe a razão social." };
      if (!draft.companyType) return { field: "companyType", message: "Selecione o tipo de empresa." };
      if (!draft.representativeRole?.trim()) return { field: "representativeRole", message: "Informe seu vínculo com a empresa." };
    }
  }
  if (step === 3) {
    if (!/^\d{5}-?\d{3}$/.test(draft.postalCode ?? "")) return { field: "postalCode", message: "Informe um CEP com oito dígitos." };
    const required = [
      ["address", "Informe a rua ou avenida."], ["addressNumber", "Informe o número."], ["province", "Informe o bairro."],
      ["city", "Informe a cidade."], ["state", "Selecione a UF."], ["activity", "Informe a atividade principal."],
    ] as const;
    for (const [field, message] of required) {
      if (!draft[field]?.trim()) return { field, message };
    }
    if (draft.incomeInCents === undefined) return {
      field: "incomeInCents", message: "Informe o valor mensal estimado. Use R$ 0,00 se ainda não houver renda ou faturamento.",
    };
  }
  return null;
}
