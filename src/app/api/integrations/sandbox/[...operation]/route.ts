import type { NextRequest } from "next/server";
import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { approvalDecisionSchema, approvalFilterSchema, approvalItemSchema, approvalPageSchema, approvalReviewSchema, confirmedApprovalSchema } from "@/features/approvals/sandbox-withdrawal-approvals";
import { apiAccessActionSchema, apiAccessDraftSchema, apiSecuritySchema, requestLogFilterSchema, requestLogsSchema } from "@/features/integrations/sandbox-api";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

const base = "/integrations/sandbox";
const unavailable = "A integração Sandbox está temporariamente indisponível.";
type Context = { params: Promise<{ operation: string[] }> };
const idSchema = z.uuid();

export async function GET(request: NextRequest, { params }: Context) {
  const { operation } = await params;
  if (operation.length === 1 && operation[0] === "api-security") {
    return forwardIntegrationRequest(request, { path: `${base}/api-security`, output: apiSecuritySchema, unavailable });
  }
  if (operation.length === 1 && operation[0] === "request-logs") {
    const searchParams = request.nextUrl.searchParams;
    const values = Object.fromEntries(searchParams);
    if (Object.keys(values).length !== searchParams.size || !requestLogFilterSchema.safeParse(values).success) {
      return integrationResponse({ message: "Confira a página do histórico." }, 400);
    }
    return forwardIntegrationRequest(request, { path: `${base}/request-logs`, output: requestLogsSchema, searchParams, unavailable });
  }
  if (operation[0] === "withdrawal-approvals") {
    if (operation.length === 1) {
      const searchParams = request.nextUrl.searchParams;
      const values = Object.fromEntries(searchParams);
      if (Object.keys(values).length !== searchParams.size || !approvalFilterSchema.safeParse(values).success) {
        return integrationResponse({ message: "Confira os filtros de aprovações." }, 400);
      }
      return forwardIntegrationRequest(request, { path: `${base}/withdrawal-approvals`, output: approvalPageSchema, searchParams, unavailable });
    }
    const id = idSchema.safeParse(operation[1]);
    if (operation.length === 2 && id.success) {
      return forwardIntegrationRequest(request, { path: `${base}/withdrawal-approvals/${id.data}`, output: approvalReviewSchema, unavailable });
    }
  }
  return integrationResponse({ message: "Rota indisponível." }, 404);
}

export async function POST(request: NextRequest, { params }: Context) {
  const { operation } = await params;
  if (operation.length === 1 && operation[0] === "api-security") {
    return forwardIntegrationRequest(request, { path: `${base}/api-security`, input: apiAccessActionSchema, output: apiSecuritySchema, unavailable });
  }
  if (operation.length === 2 && operation[0] === "api-security" && operation[1] === "passkey-options") {
    return forwardIntegrationRequest(request, { path: `${base}/api-security/passkey-options`, input: apiAccessDraftSchema, output: passkeyOptionsSchema, unavailable });
  }
  if (operation[0] === "withdrawal-approvals" && operation.length === 3) {
    const id = idSchema.safeParse(operation[1]);
    if (id.success && operation[2] === "passkey-options") return forwardIntegrationRequest(request, {
      path: `${base}/withdrawal-approvals/${id.data}/passkey-options`, input: approvalDecisionSchema, output: passkeyOptionsSchema, unavailable,
    });
    if (id.success && operation[2] === "actions") return forwardIntegrationRequest(request, {
      path: `${base}/withdrawal-approvals/${id.data}/actions`, input: confirmedApprovalSchema, output: approvalItemSchema, unavailable,
    });
  }
  return integrationResponse({ message: "Rota indisponível." }, 404);
}
