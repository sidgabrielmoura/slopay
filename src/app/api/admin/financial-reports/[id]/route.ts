import type { NextRequest } from "next/server";
import { reportFile, reportId } from "@/features/admin/admin-reports";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = reportId.safeParse((await params).id);
  if (!id.success) return integrationResponse({ message: "Relatório não encontrado." }, 404);
  return forwardIntegrationRequest(request, {
    path: `/admin/financial-reports/${id.data}`, output: reportFile, unavailable: "Não foi possível carregar o arquivo.",
  });
}
