import type { NextRequest } from "next/server";
import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { supportProofSchema, supportRequestSchema, supportStartedSchema } from "@/features/admin/account-support";
import { companyAuditSchema, companyChangeSchema, companyOperationsSchema, companyPage, companyProofSchema, companyUpdatedSchema } from "@/features/admin/admin-companies";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";
import { forwardPixPricing } from "@/lib/server/pix-pricing-request";

type Context = { params: Promise<{ id: string; section: string[] }> };

export async function GET(request: NextRequest, { params }: Context) {
  const path = await params;
  const id = z.uuid().safeParse(path.id);
  const section = path.section[0];
  if (id.success && path.section.length === 1 && section === "pix-pricing") return forwardPixPricing(request, id.data);
  if (!id.success || path.section.length !== 1 || (section !== "operations" && section !== "audit")) {
    return integrationResponse({ message: "Consulta não encontrada." }, 404);
  }
  const search = request.nextUrl.searchParams;
  const page = z.strictObject({ page: companyPage.default(1) }).safeParse(Object.fromEntries(search));
  if (!page.success || search.getAll("page").length > 1) return integrationResponse({ message: "Página inválida." }, 400);
  return forwardIntegrationRequest(request, {
    path: `/admin/companies/${id.data}/${section}`,
    searchParams: new URLSearchParams({ page: String(page.data.page) }),
    output: section === "operations" ? companyOperationsSchema : companyAuditSchema,
    unavailable: section === "operations" ? "Movimentações indisponíveis." : "Auditoria indisponível.",
  });
}

export async function POST(request: NextRequest, { params }: Context) {
  const path = await params;
  const id = z.uuid().safeParse(path.id);
  const action = path.section.join("/");
  if (id.success && (action === "pix-pricing" || action === "pix-pricing/options")) {
    return forwardPixPricing(request, id.data, action.endsWith("/options"));
  }
  if (id.success && (action === "support" || action === "support/options")) {
    const options = action === "support/options";
    return forwardIntegrationRequest(request, {
      path: `/admin/companies/${id.data}/${action}`,
      input: options ? supportRequestSchema : supportProofSchema,
      output: options ? passkeyOptionsSchema : supportStartedSchema,
      unavailable: "Não foi possível acessar a conta.",
    });
  }
  if (!id.success || (action !== "change" && action !== "change/options")) {
    return integrationResponse({ message: "Operação não encontrada." }, 404);
  }
  const options = action === "change/options";
  return forwardIntegrationRequest(request, {
    path: `/admin/companies/${id.data}/${action}`,
    input: options ? companyChangeSchema : companyProofSchema,
    output: options ? passkeyOptionsSchema : companyUpdatedSchema,
    unavailable: options ? "Não foi possível preparar a confirmação." : "Confira o cadastro antes de tentar salvar novamente.",
  });
}
