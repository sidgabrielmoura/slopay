import type { NextRequest } from "next/server";
import { medCaseDetails, medEventPage, medId } from "@/features/admin/admin-pix-med";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = medId.safeParse((await params).id);
  if (!id.success) return integrationResponse({ message: "Contestação Pix não encontrada." }, 404);
  const search = request.nextUrl.searchParams;
  const query = medEventPage.safeParse(Object.fromEntries(search));
  if (!query.success || search.getAll("page").length > 1) {
    return integrationResponse({ message: "Confira a página de eventos." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: `/admin/pix-med/${id.data}`, output: medCaseDetails, unavailable: "Os detalhes da contestação estão indisponíveis.",
    searchParams: new URLSearchParams({ page: String(query.data.page) }),
  });
}
