import { NextRequest, NextResponse } from "next/server";
import { cleanDocument, isValidCNPJ } from "@/lib/validators";

export const dynamic = "force-dynamic";

function mapCnaeToSegment(
  cnaeDesc: string = ""
): "ECOMMERCE" | "SAAS" | "MARKETPLACE" | "SERVICOS" | "FINTECH" | "OUTRO" {
  const desc = cnaeDesc.toLowerCase();
  if (
    desc.includes("software") ||
    desc.includes("tecnologia") ||
    desc.includes("desenvolvimento") ||
    desc.includes("programação") ||
    desc.includes("dados") ||
    desc.includes("hospedagem")
  ) {
    return "SAAS";
  }
  if (
    desc.includes("comércio") ||
    desc.includes("varej") ||
    desc.includes("loja") ||
    desc.includes("atacado") ||
    desc.includes("eletrônico")
  ) {
    return "ECOMMERCE";
  }
  if (
    desc.includes("intermediação") ||
    desc.includes("agenciamento") ||
    desc.includes("portal") ||
    desc.includes("plataforma")
  ) {
    return "MARKETPLACE";
  }
  if (
    desc.includes("crédito") ||
    desc.includes("financiamento") ||
    desc.includes("investimento") ||
    desc.includes("banco") ||
    desc.includes("pagamento") ||
    desc.includes("corretora")
  ) {
    return "FINTECH";
  }
  if (
    desc.includes("serviço") ||
    desc.includes("consultoria") ||
    desc.includes("assessoria") ||
    desc.includes("publicidade") ||
    desc.includes("treinamento") ||
    desc.includes("administração")
  ) {
    return "SERVICOS";
  }
  return "OUTRO";
}

function mapPorteToSize(
  porte: string = "",
  capitalSocial: number = 0
): "1-10" | "11-50" | "51-200" | "200+" {
  const upper = porte.toUpperCase();
  if (upper.includes("ME") || upper.includes("MICRO")) {
    return "1-10";
  }
  if (upper.includes("EPP") || upper.includes("PEQUENO")) {
    return "11-50";
  }
  // Demais portes
  if (capitalSocial >= 5000000) {
    return "200+";
  }
  return "51-200";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cnpjParam = searchParams.get("cnpj") || "";
  const clean = cleanDocument(cnpjParam);

  if (clean.length !== 14) {
    return NextResponse.json(
      { error: "O CNPJ deve conter exatamente 14 dígitos numéricos." },
      { status: 400 }
    );
  }

  if (!isValidCNPJ(clean)) {
    return NextResponse.json(
      { error: "CNPJ inválido. Verifique os dígitos verificadores informados." },
      { status: 400 }
    );
  }

  try {
    let data: any = null;
    let source = "BrasilAPI";

    // 1. Tenta consulta via BrasilAPI
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      clearTimeout(timeout);

      if (res.status === 200) {
        data = await res.json();
      } else if (res.status === 404) {
        return NextResponse.json(
          { error: "CNPJ não encontrado na base de dados da Receita Federal." },
          { status: 404 }
        );
      }
    } catch {
      // Falha ou timeout no BrasilAPI, tenta fallback
    }

    // 2. Fallback via MinhaReceita
    if (!data) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`https://minhareceita.org/${clean}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        clearTimeout(timeout);

        if (res.status === 200) {
          data = await res.json();
          source = "MinhaReceita";
        } else if (res.status === 404) {
          return NextResponse.json(
            { error: "CNPJ não encontrado na base de dados da Receita Federal." },
            { status: 404 }
          );
        }
      } catch {
        // Fallback falhou
      }
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Instabilidade temporária nos serviços públicos da Receita Federal. Você pode preencher os campos da empresa manualmente.",
          isTemporaryFailure: true,
        },
        { status: 503 }
      );
    }

    // Normaliza os dados
    const razaoSocial = (data.razao_social || data.nome || "").trim();
    const nomeFantasia = (data.nome_fantasia || "").trim();
    const situacaoCadastral = (
      data.descricao_situacao_cadastral ||
      data.situacao_cadastral_descricao ||
      "ATIVA"
    ).toUpperCase();
    const isAtiva = situacaoCadastral.includes("ATIVA");

    const cnaeDescricao =
      data.cnae_fiscal_descricao || data.cnae_fiscal_desc || "";
    const capitalSocial = Number(data.capital_social) || 0;
    const porteDesc = data.porte || data.descricao_porte || "";

    const mappedSegment = mapCnaeToSegment(cnaeDescricao);
    const mappedSize = mapPorteToSize(porteDesc, capitalSocial);

    // Mapeamento dos sócios (QSA)
    const rawQsa = Array.isArray(data.qsa) ? data.qsa : [];
    const qsa = rawQsa.map((s: any) => ({
      nome: (s.nome_socio || s.nome || "").trim(),
      qualificacao: (s.qualificacao_socio || s.qualificacao || "").trim(),
      faixaEtaria: s.faixa_etaria || "",
      cpfMascarado: s.cnpj_cpf_do_socio || "",
    }));

    return NextResponse.json({
      success: true,
      source,
      cnpj: clean,
      razaoSocial,
      nomeFantasia,
      situacaoCadastral,
      isAtiva,
      inconsistencyAlert: !isAtiva
        ? `Inconsistência cadastral: O CNPJ consta como '${situacaoCadastral}' junto à Receita Federal e não está apto a operar.`
        : null,
      cnaeCodigo: data.cnae_fiscal || null,
      cnaeDescricao,
      capitalSocial,
      porte: porteDesc,
      mappedSegment,
      mappedSize,
      qsa,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro inesperado ao consultar CNPJ." },
      { status: 500 }
    );
  }
}
