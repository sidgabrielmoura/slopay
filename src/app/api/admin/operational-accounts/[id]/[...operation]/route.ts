import type { NextRequest } from "next/server";
import { z } from "zod";
import { companyOperationsSchema } from "@/features/admin/admin-companies";
import {
  operationalAccountAuditSchema, operationalAccountKeysSchema, operationalChangeSchema,
  operationalPage, operationalProofSchema, operationalRefreshSchema, operationalUpdatedSchema,
} from "@/features/admin/admin-operational-accounts";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

type Context = { params: Promise<{ id: string; operation: string[] }> };
const queries = {
  operations: { output: companyOperationsSchema, unavailable: "Movimentações indisponíveis." },
  keys: { output: operationalAccountKeysSchema, unavailable: "Chaves Pix indisponíveis." },
  audit: { output: operationalAccountAuditSchema, unavailable: "Auditoria indisponível." },
};
const writes = {
  "status/options": { input: operationalChangeSchema, output: passkeyOptionsSchema, unavailable: "Não foi possível preparar a confirmação." },
  status: { input: operationalProofSchema, output: operationalUpdatedSchema, unavailable: "Confira o estado da conta antes de tentar novamente." },
  refresh: { input: z.strictObject({}), output: operationalRefreshSchema, unavailable: "Não foi possível atualizar o saldo e as chaves Pix.", timeoutMs: 14_000 },
};

export async function GET(request: NextRequest, { params }: Context) {
  const { id, operation } = await params;
  const name = operation[0] as keyof typeof queries;
  if (!z.uuid().safeParse(id).success || operation.length !== 1 || !Object.hasOwn(queries, name)) {
    return integrationResponse({ message: "Consulta não encontrada." }, 404);
  }
  const paramsQuery = request.nextUrl.searchParams;
  const result = z.strictObject({ page: operationalPage.default(1) }).safeParse(Object.fromEntries(paramsQuery));
  if (!result.success || paramsQuery.getAll("page").length > 1) return integrationResponse({ message: "Página inválida." }, 400);
  return forwardIntegrationRequest(request, {
    path: `/admin/operational-accounts/${id}/${name}`, ...queries[name],
    searchParams: new URLSearchParams({ page: String(result.data.page) }),
  });
}

export async function POST(request: NextRequest, { params }: Context) {
  const { id, operation } = await params;
  const name = operation.join("/") as keyof typeof writes;
  if (!z.uuid().safeParse(id).success || !Object.hasOwn(writes, name)) return integrationResponse({ message: "Operação não encontrada." }, 404);
  return forwardIntegrationRequest(request, { path: `/admin/operational-accounts/${id}/${name}`, ...writes[name] });
}
