import type { NextRequest } from "next/server";
import { z } from "zod";
import { clientUserDetailSchema, clientUserUnavailable } from "@/features/admin/admin-client-users";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return integrationResponse({ message: "Usuário não encontrado." }, 404);
  return forwardIntegrationRequest(request, {
    path: `/admin/client-users/${id.data.toLowerCase()}`, output: clientUserDetailSchema, unavailable: clientUserUnavailable,
  });
}
