import type { NextRequest } from "next/server";
import { merchantTeamAction, merchantTeamChange, merchantTeamReport, merchantTeamReview, merchantTeamUpdated } from "@/features/users/merchant-team";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

type Params = { params: Promise<{ operation?: string[] }> };
const root = "/merchant/team";
const unavailable = "A equipe está temporariamente indisponível.";

export async function GET(request: NextRequest, { params }: Params) {
  if ((await params).operation?.length) return integrationResponse({ message: "Operação não encontrada." }, 404);
  const page = request.nextUrl.searchParams.get("page") ?? "1";
  if (!/^[1-9]\d{0,4}$/.test(page) || Number(page) > 10_000) {
    return integrationResponse({ message: "Página inválida." }, 400);
  }
  return forwardIntegrationRequest(request, { path: root, output: merchantTeamReport, unavailable,
    searchParams: new URLSearchParams({ page }) });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { operation = [] } = await params;
  if (operation.length === 1 && operation[0] === "options") {
    return forwardIntegrationRequest(request, { path: `${root}/options`, input: merchantTeamChange, output: merchantTeamReview, unavailable });
  }
  if (operation.length) return integrationResponse({ message: "Operação não encontrada." }, 404);
  return forwardIntegrationRequest(request, { path: root, input: merchantTeamAction, output: merchantTeamUpdated, unavailable });
}
