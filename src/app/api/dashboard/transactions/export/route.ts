import type { NextRequest } from "next/server";
import { statementExportRequest, statementExportResult } from "@/features/transactions/live-transactions";
import { requestBackend } from "@/lib/server/auth-backend";
import { validatePixPostOrigin, pixResponse } from "@/lib/server/pix-payments";
import { readJson, RequestBodyError } from "@/lib/server/request-json";
import { accessCookie } from "@/lib/server/session";

const unavailable = "Não foi possível exportar o extrato.";

export async function POST(request: NextRequest) {
  const originError = validatePixPostOrigin(request, unavailable);
  if (originError) return originError;
  const accessToken = request.cookies.get(accessCookie)?.value;
  if (!accessToken) return pixResponse({ message: "Sua sessão expirou. Entre novamente." }, 401);

  try {
    const result = statementExportRequest.safeParse(await readJson(request, 4096));
    if (!result.success) return pixResponse({ message: "Confira os filtros e selecione um período de até 366 dias." }, 400);
    const response = await requestBackend("/dashboard/transactions/export", {
      method: "POST", body: result.data, accessToken, signal: request.signal,
    });
    if (response.ok) {
      const data = statementExportResult.safeParse(await response.json());
      return data.success ? pixResponse(data.data) : pixResponse({ message: unavailable }, 503);
    }
    await response.body?.cancel().catch(() => undefined);
    const errors: Record<number, string> = {
      400: "Confira os filtros e o período.",
      401: "Sua sessão expirou. Entre novamente.",
      403: "A exportação requer uma conta ativa e uma sessão verificada.",
      422: "Selecione um período menor para exportar até 10 mil movimentações.",
      429: "Aguarde um instante e tente novamente.",
    };
    if (errors[response.status]) return pixResponse({ message: errors[response.status] }, response.status);
  } catch (error) {
    if (error instanceof RequestBodyError) return pixResponse({ message: "Confira os filtros e o período." }, error.status);
  }
  return pixResponse({ message: unavailable }, 503);
}
