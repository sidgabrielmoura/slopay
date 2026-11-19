import type { NextRequest } from "next/server";
import { ownerOpeningSchema, resubmitOpeningResultSchema, resubmitOpeningSchema } from "@/features/account-validation/owner-account-opening";
import { forwardIntegrationRequest } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/account-opening", output: ownerOpeningSchema, unavailable: "Não foi possível consultar seu cadastro.",
  });
}

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/account-opening/resubmit", input: resubmitOpeningSchema, output: resubmitOpeningResultSchema,
    unavailable: "Não foi possível reenviar seu cadastro.",
  });
}
