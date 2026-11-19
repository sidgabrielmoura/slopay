import type { NextRequest } from "next/server";
import { liveTransactionFilterSchema, liveTransactionsSchema, statementUnavailableMessage } from "@/features/transactions/live-transactions";
import { requestBackend } from "@/lib/server/auth-backend";
import { accessCookie } from "@/lib/server/session";

const errorMessages: Readonly<Record<number, string>> = {
  400: "Confira os filtros de movimentações.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "A consulta requer uma conta ativa e uma sessão verificada.",
  429: "Aguarde um instante e tente novamente.",
};

function response(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(accessCookie)?.value;
  if (!accessToken) return response({ message: errorMessages[401] }, 401);

  const filters = liveTransactionFilterSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!filters.success) return response({ message: errorMessages[400] }, 400);

  const searchParams = new URLSearchParams();
  for (const [name, value] of Object.entries(filters.data)) {
    if (value) searchParams.set(name, value);
  }

  try {
    const backend = await requestBackend("/dashboard/transactions", { method: "GET", accessToken, searchParams, signal: request.signal });
    if (backend.ok) {
      const data = liveTransactionsSchema.safeParse(await backend.json());
      if (data.success) return response(data.data);
    } else {
      await backend.body?.cancel().catch(() => undefined);
      const message = errorMessages[backend.status];
      if (message) return response({ message }, backend.status);
    }
  } catch {
    return response({ message: statementUnavailableMessage }, 503);
  }
  return response({ message: statementUnavailableMessage }, 503);
}
