import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminPixFeeDetail, adminPixFeeRefreshUnavailable } from "@/features/admin/admin-pix-fees";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return integrationResponse({ message: "Conta operacional não encontrada." }, 404);
  return forwardIntegrationRequest(request, {
    path: `/admin/pix-fees/${id.data}/refresh`, input: z.strictObject({}), output: adminPixFeeDetail,
    unavailable: adminPixFeeRefreshUnavailable, timeoutMs: 14_000,
  });
}
