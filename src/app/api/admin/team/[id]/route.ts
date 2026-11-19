import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminMemberQuery, adminMemberSchema, adminMemberUnavailable } from "@/features/admin/admin-team";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return integrationResponse({ message: "Membro da equipe não encontrado." }, 404);

  const filters = request.nextUrl.searchParams;
  const query = adminMemberQuery.safeParse(Object.fromEntries(filters));
  if (!query.success || filters.getAll("page").length > 1) {
    return integrationResponse({ message: "Confira a página do histórico." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: `/admin/team/${id.data}`, output: adminMemberSchema, unavailable: adminMemberUnavailable,
    searchParams: new URLSearchParams({ page: String(query.data.page) }),
  });
}
