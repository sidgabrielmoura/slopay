import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminPixFeeDetail, adminPixFeesUnavailable } from "@/features/admin/admin-pix-fees";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return integrationResponse({ message: "Conta operacional não encontrada." }, 404);
  return forwardIntegrationRequest(request, {
    path: `/admin/pix-fees/${id.data}`, output: adminPixFeeDetail, unavailable: adminPixFeesUnavailable,
  });
}
