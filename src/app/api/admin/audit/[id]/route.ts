import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminAuditEventSchema, adminAuditEventUnavailable } from "@/features/admin/admin-audit";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) return integrationResponse({ message: "Evento de auditoria não encontrado." }, 404);
  return forwardIntegrationRequest(request, {
    path: `/admin/audit/${parsed.data.toLowerCase()}`, output: adminAuditEventSchema, unavailable: adminAuditEventUnavailable,
  });
}
