import type { NextRequest } from "next/server";
import { z } from "zod";
import { approvalDecisionSchema, approvalFilterSchema, approvalItemSchema, approvalPageSchema, approvalReviewSchema, confirmedLiveApprovalSchema } from "@/features/approvals/sandbox-withdrawal-approvals";
import { withdrawalPasskeyOptionsSchema } from "@/features/pix-withdraw/pix-withdrawal";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { apiAccessActionSchema, apiAccessDraftSchema, apiSecuritySchema, requestLogFilterSchema, requestLogsSchema } from "@/features/integrations/sandbox-api";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

const approvals = "/integrations/live/withdrawal-approvals";
const unavailable = "A integração está temporariamente indisponível.";
type Context = { params: Promise<{ operation: string[] }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { operation } = await params;
  if (operation.length === 1 && operation[0] === "api-security")
    return forwardIntegrationRequest(request, { path: "/integrations/live/api-security", output: apiSecuritySchema, unavailable });
  if (operation[0] === "withdrawal-approvals") {
    if (operation.length === 1) {
      const searchParams = request.nextUrl.searchParams;
      const values = Object.fromEntries(searchParams);
      if (Object.keys(values).length !== searchParams.size || !approvalFilterSchema.safeParse(values).success)
        return integrationResponse({ message: "Confira a página das aprovações." }, 400);
      return forwardIntegrationRequest(request, { path: approvals, output: approvalPageSchema, searchParams, unavailable });
    }
    const id = z.uuidv4().safeParse(operation[1]);
    if (operation.length === 2 && id.success)
      return forwardIntegrationRequest(request, { path: `${approvals}/${id.data}`, output: approvalReviewSchema, unavailable });
  }
  if (operation.length === 1 && operation[0] === "request-logs") {
    const searchParams = request.nextUrl.searchParams;
    const values = Object.fromEntries(searchParams);
    if (Object.keys(values).length !== searchParams.size || !requestLogFilterSchema.safeParse(values).success)
      return integrationResponse({ message: "Confira a página do histórico." }, 400);
    return forwardIntegrationRequest(request, { path: "/integrations/live/request-logs", output: requestLogsSchema, searchParams, unavailable });
  }
  return integrationResponse({ message: "Rota indisponível." }, 404);
}

export async function POST(request: NextRequest, { params }: Context) {
  const { operation } = await params;
  if (operation.length === 1 && operation[0] === "api-security")
    return forwardIntegrationRequest(request, { path: "/integrations/live/api-security", input: apiAccessActionSchema, output: apiSecuritySchema, unavailable });
  if (operation.length === 3 && operation[0] === "withdrawal-approvals") {
    const id = z.uuidv4().safeParse(operation[1]);
    if (id.success && operation[2] === "passkey-options")
      return forwardIntegrationRequest(request, { path: `${approvals}/${id.data}/passkey-options`, input: approvalDecisionSchema, output: withdrawalPasskeyOptionsSchema, unavailable });
    if (id.success && operation[2] === "actions")
      return forwardIntegrationRequest(request, { path: `${approvals}/${id.data}/actions`, input: confirmedLiveApprovalSchema, output: approvalItemSchema, unavailable });
  }
  if (operation.length === 2 && operation[0] === "api-security" && operation[1] === "passkey-options")
    return forwardIntegrationRequest(request, {
      path: "/integrations/live/api-security/passkey-options", input: apiAccessDraftSchema, output: passkeyOptionsSchema, unavailable,
    });
  return integrationResponse({ message: "Rota indisponível." }, 404);
}
