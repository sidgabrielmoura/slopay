import type { NextRequest } from "next/server";
import { z } from "zod";
import { supportActivitySchema, supportEndedSchema } from "@/features/admin/account-support";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const path = await params;
  const id = z.uuidv4().safeParse(path.id);
  const action = path.action;
  if (!id.success || (action !== "activity" && action !== "end")) {
    return integrationResponse({ message: "Operação não encontrada." }, 404);
  }
  return forwardIntegrationRequest(request, {
    path: `/admin/support/${id.data}/${action}`,
    input: z.strictObject({}),
    output: action === "activity" ? supportActivitySchema : supportEndedSchema,
    unavailable: "A sessão de suporte está temporariamente indisponível.",
  });
}
