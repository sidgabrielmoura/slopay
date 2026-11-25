import type { NextRequest } from "next/server";
import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { openingApprovalOptionsSchema, openingApprovalSchema, openingReviewConfirmedSchema, openingReviewSchema, openingUpdatedSchema } from "@/features/admin/account-openings";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

const operations = {
  review: { input: openingReviewConfirmedSchema, output: openingUpdatedSchema, unavailable: "Não foi possível registrar a decisão." },
  "review/options": { input: openingReviewSchema, output: passkeyOptionsSchema, unavailable: "Não foi possível preparar a confirmação." },
  "approve/options": { input: openingApprovalOptionsSchema, output: passkeyOptionsSchema, unavailable: "Não foi possível preparar a confirmação." },
  approve: { input: openingApprovalSchema, output: openingUpdatedSchema, unavailable: "Consulte a situação do cadastro antes de tentar aprovar novamente." },
} as const;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string[] }> }) {
  const { id, action } = await params;
  const name = action.join("/");
  if (!z.uuid().safeParse(id).success || !Object.hasOwn(operations, name) || request.nextUrl.search) {
    return integrationResponse({ message: "Operação de cadastro inválida." }, 404);
  }
  return forwardIntegrationRequest(request, {
    ...operations[name as keyof typeof operations], path: `/admin/account-openings/${id}/${name}`,
  });
}
