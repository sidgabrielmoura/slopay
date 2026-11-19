import type { NextRequest } from "next/server";
import { accountOpeningApplicationSchema, saveOpeningApplicationSchema } from "@/features/account-validation/account-opening-application";
import { forwardIntegrationRequest } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/account-opening/application",
    output: accountOpeningApplicationSchema,
    unavailable: "Não foi possível consultar sua solicitação.",
  });
}

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/account-opening/application",
    input: saveOpeningApplicationSchema,
    output: accountOpeningApplicationSchema,
    unavailable: "Não foi possível salvar sua solicitação.",
  });
}
