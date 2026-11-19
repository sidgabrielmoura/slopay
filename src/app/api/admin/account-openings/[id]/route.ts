import type { NextRequest } from "next/server";
import { z } from "zod";
import { accountOpeningDetailSchema, openingPage, openingsUnavailable } from "@/features/admin/account-openings";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const page = openingPage.safeParse(searchParams.get("page") ?? 1);
  if (!z.uuid().safeParse(id).success || !page.success || Array.from(searchParams.keys()).some((key) => key !== "page" || searchParams.getAll(key).length > 1)) {
    return integrationResponse({ message: "Selecione um cadastro e uma página válidos." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: `/admin/account-openings/${id}`, output: accountOpeningDetailSchema, unavailable: openingsUnavailable,
    searchParams: new URLSearchParams({ page: String(page.data) }),
  });
}
