import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  livePoolConfirmationSchema, livePoolKeyDraft, livePoolKeyProof, liveRoutingDraft, liveRoutingProof, liveWalletControlDraft, liveWalletControlProof, liveWalletPositionsQuery, liveWalletPositionsSchema, walletControlsSchema,
} from "@/features/admin/admin-live-pool-accounts";
import { poolEligibleList, poolOwnersList, poolOwnersQuery, poolUpdated } from "@/features/admin/admin-pool-accounts";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

type Context = { params: Promise<{ operation: string[] }> };
const base = "/admin/live-pool-accounts";
const unavailable = "A configuração das contas bolsão está temporariamente indisponível.";

export async function GET(request: NextRequest, context: Context) {
  const { operation } = await context.params;
  const [section, id] = operation;
  if (operation.length === 1 && (section === "owners" || section === "positions")) {
    const params = request.nextUrl.searchParams;
    if (Array.from(params.keys()).some(key => params.getAll(key).length !== 1))
      return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
    const filters = Object.fromEntries(params);
    if (section === "positions") {
      const query = liveWalletPositionsQuery.safeParse(filters);
      if (!query.success) return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
      const { search, page, status } = query.data;
      const searchParams = new URLSearchParams({ search, page: String(page) });
      if (status !== "ALL") searchParams.set("status", status);
      return forwardIntegrationRequest(request, { path: `${base}/positions`, searchParams, output: liveWalletPositionsSchema, unavailable });
    }
    const query = poolOwnersQuery.safeParse(filters);
    if (!query.success) return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
    return forwardIntegrationRequest(request, { path: `${base}/owners`,
      searchParams: new URLSearchParams({ search: query.data.search, page: String(query.data.page) }), output: poolOwnersList, unavailable });
  }
  if (operation.length === 1 && section === "eligible")
    return forwardIntegrationRequest(request, { path: "/admin/live-pool-accounts/eligible", output: poolEligibleList, unavailable });
  if (operation.length === 2 && section === "controls" && z.uuidv4().safeParse(id).success)
    return forwardIntegrationRequest(request, { path: `${base}/controls/${id.toLowerCase()}`, output: walletControlsSchema, unavailable });
  return integrationResponse({ message: "Consulta não encontrada." }, 404);
}

export async function POST(request: NextRequest, context: Context) {
  const { operation } = await context.params;
  const [section, action] = operation;
  if (operation.length === 3 && section === "positions" && operation[2] === "refresh" && z.uuidv4().safeParse(action).success)
    return forwardIntegrationRequest(request, { path: `${base}/positions/${action.toLowerCase()}/refresh`, input: z.strictObject({}), output: poolUpdated, unavailable });
  const rotationOptions = operation.length === 3 && operation[2] === "options";
  if (action === "key" && z.uuidv4().safeParse(section).success && (operation.length === 2 || rotationOptions))
    return forwardIntegrationRequest(request, { path: `${base}/${section.toLowerCase()}/key${rotationOptions ? "/options" : ""}`,
      input: rotationOptions ? livePoolKeyDraft : livePoolKeyProof,
      output: rotationOptions ? livePoolConfirmationSchema : poolUpdated, unavailable });
  const options = operation.length === 2 && action === "options";
  if ((operation.length !== 1 && !options) || (section !== "controls" && section !== "routing"))
    return integrationResponse({ message: "Operação não encontrada." }, 404);
  const input = section === "controls"
    ? options ? liveWalletControlDraft : liveWalletControlProof
    : options ? liveRoutingDraft : liveRoutingProof;
  return forwardIntegrationRequest(request, { path: `${base}/${section}${options ? "/options" : ""}`,
    input, output: options ? livePoolConfirmationSchema : poolUpdated, unavailable });
}
