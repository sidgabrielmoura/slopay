import type { NextRequest } from "next/server";
import { z } from "zod";
import { companiesUnavailable, companyDetailSchema } from "@/features/admin/admin-companies";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await context.params).id);
  if (!id.success) return integrationResponse({ message: "Empresa não encontrada." }, 404);
  return forwardIntegrationRequest(request, {
    path: `/admin/companies/${id.data}`, output: companyDetailSchema, unavailable: companiesUnavailable,
  });
}
