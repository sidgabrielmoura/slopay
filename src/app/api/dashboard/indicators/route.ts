import type { NextRequest } from "next/server";
import { developmentFeaturesEnabled } from "@/config/development";
import { defaultIndicatorPeriod, indicatorPeriodSchema, indicatorReportSchema, indicatorsUnavailable } from "@/features/analytics/indicators";
import { requestBackend } from "@/lib/server/auth-backend";
import { accessCookie } from "@/lib/server/session";

const errorMessages: Readonly<Partial<Record<number, string>>> = {
  400: "Confira o período selecionado.",
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

  const values = request.nextUrl.searchParams.getAll("period");
  const period = indicatorPeriodSchema.safeParse(values[0] ?? defaultIndicatorPeriod);
  if (!period.success || values.length > 1) return response({ message: errorMessages[400] }, 400);

  try {
    const backend = await requestBackend("/dashboard/indicators", {
      method: "GET",
      accessToken,
      searchParams: new URLSearchParams({ period: period.data }),
      signal: request.signal,
    });
    if (backend.ok) {
      const result = indicatorReportSchema.safeParse(await backend.json());
      if (result.success && result.data.period === period.data && (result.data.environment === "live" ||
          (result.data.environment === "sandbox" && developmentFeaturesEnabled()))) {
        return response(result.data);
      }
    } else {
      await backend.body?.cancel().catch(() => undefined);
      const message = errorMessages[backend.status];
      if (message) return response({ message }, backend.status);
    }
  } catch {
    return response({ message: indicatorsUnavailable }, 503);
  }
  return response({ message: indicatorsUnavailable }, 503);
}
