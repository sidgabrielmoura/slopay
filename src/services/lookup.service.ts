import { cleanDocument } from "@/lib/validators";

export interface PersonLookupResponse {
  success: boolean;
  verified: boolean;
  hasExternalProvider: boolean;
  provider?: string;
  fullName?: string;
  birthDate?: string;
  situacao?: string;
  isRegular?: boolean;
  inconsistencyAlert?: string | null;
  cleanCpf: string;
  message?: string;
}

export interface CompanyPartner {
  nome: string;
  qualificacao: string;
  faixaEtaria?: string;
  cpfMascarado?: string;
}

export interface CompanyLookupResponse {
  success: boolean;
  source?: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  isAtiva: boolean;
  inconsistencyAlert?: string | null;
  cnaeCodigo?: number | null;
  cnaeDescricao: string;
  capitalSocial: number;
  porte: string;
  mappedSegment: "ECOMMERCE" | "SAAS" | "MARKETPLACE" | "SERVICOS" | "FINTECH" | "OUTRO";
  mappedSize: "1-10" | "11-50" | "51-200" | "200+";
  qsa: CompanyPartner[];
}

/**
 * Consulta de CPF real via API interna (com integração opcional a provedor de KYC da Receita)
 */
export async function lookupPersonByCpf(cpf: string): Promise<PersonLookupResponse> {
  const clean = cleanDocument(cpf);
  if (clean.length !== 11) {
    throw new Error("O CPF deve conter exatamente 11 dígitos.");
  }

  const res = await fetch(`/api/lookup/cpf?cpf=${encodeURIComponent(clean)}`, {
    headers: { Accept: "application/json" },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Não foi possível validar o CPF.");
  }

  return data;
}

/**
 * Consulta de CNPJ em tempo real na Receita Federal via BrasilAPI / MinhaReceita
 */
export async function lookupCompanyByCnpj(cnpj: string): Promise<CompanyLookupResponse> {
  const clean = cleanDocument(cnpj);
  if (clean.length !== 14) {
    throw new Error("O CNPJ deve conter exatamente 14 dígitos.");
  }

  const res = await fetch(`/api/lookup/cnpj?cnpj=${encodeURIComponent(clean)}`, {
    headers: { Accept: "application/json" },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Não foi possível consultar os dados do CNPJ.");
  }

  return data;
}
