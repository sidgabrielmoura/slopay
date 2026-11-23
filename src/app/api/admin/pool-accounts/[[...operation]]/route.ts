import type { NextRequest } from "next/server";
import { z } from "zod";
import { developmentFeaturesEnabled } from "@/config/development";
import {
  poolAccountInput, poolAccountsList, poolAccountsQuery, poolAccountsUnavailable, poolCreateInput, poolCreateResult,
  poolEligibleList, poolOptionsUnavailable, poolOwnersList, poolOwnersQuery, poolOwnersUnavailable, poolPolicyInput,
  poolPolicyProof, poolStatusInput, poolStatusProof, poolUpdated, poolWriteUnavailable,
} from "@/features/admin/admin-pool-accounts";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

type Context = { params: Promise<{ operation?: string[] }> };
const base = "/admin/pool-accounts";

const reads = {
  "": { query: poolAccountsQuery, output: poolAccountsList, unavailable: poolAccountsUnavailable },
  owners: { query: poolOwnersQuery, output: poolOwnersList, unavailable: poolOwnersUnavailable },
  eligible: { query: z.strictObject({}), output: poolEligibleList, unavailable: poolAccountsUnavailable },
};

export async function GET(request: NextRequest, context: Context) {
  const { operation = [] } = await context.params;
  const name = operation.join("/") as keyof typeof reads;
  if (!Object.hasOwn(reads, name)) return integrationResponse({ message: "Consulta não encontrada." }, 404);
  const { query, ...config } = reads[name];
  const params = request.nextUrl.searchParams;
  const input = query.safeParse(Object.fromEntries(params));
  if (!input.success || Array.from(params.keys()).some((key) => params.getAll(key).length !== 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }
  const searchParams = new URLSearchParams(Object.entries(input.data).map(([key, value]) => [key, String(value)]));
  return forwardIntegrationRequest(request, { ...config, path: name ? `${base}/${name}` : base, searchParams });
}

export async function POST(request: NextRequest, context: Context) {
  if (!developmentFeaturesEnabled()) {
    return integrationResponse({ message: "Gestão de contas bolsão indisponível neste ambiente." }, 404);
  }
  const { operation = [] } = await context.params;
  const [first, second, third] = operation;
  if (operation.length === 0) {
    return forwardIntegrationRequest(request, {
      path: base, input: poolCreateInput, output: poolCreateResult, unavailable: poolWriteUnavailable, timeoutMs: 22_000,
    });
  }
  if (operation.length === 1 && first === "options") {
    return forwardIntegrationRequest(request, {
      path: `${base}/options`, input: poolAccountInput, output: passkeyOptionsSchema, unavailable: poolOptionsUnavailable,
    });
  }
  if (operation.length === 2 || (operation.length === 3 && third === "options")) {
    const options = operation.length === 3;
    const output = options ? passkeyOptionsSchema : poolUpdated;
    const unavailable = options ? poolOptionsUnavailable : poolWriteUnavailable;
    const suffix = options ? "/options" : "";
    if (first === "owners" && z.uuid().safeParse(second).success) {
      return forwardIntegrationRequest(request, {
        path: `${base}/owners/${second.toLowerCase()}${suffix}`,
        input: options ? poolPolicyInput : poolPolicyProof, output, unavailable,
      });
    }
    if (second === "status" && z.uuid().safeParse(first).success) {
      return forwardIntegrationRequest(request, {
        path: `${base}/${first.toLowerCase()}/status${suffix}`,
        input: options ? poolStatusInput : poolStatusProof, output, unavailable,
      });
    }
  }
  return integrationResponse({ message: "Operação não encontrada." }, 404);
}
