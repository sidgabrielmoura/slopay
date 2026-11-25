import { NextResponse, type NextRequest } from "next/server";
import { setAuthCookie } from "@/lib/server/session";
import { supportActivitySchema, supportContextChanged, supportPanelSessionSchema, supportScopeCookie } from "@/lib/support-scope";
import { appOrigin } from "@/lib/server/auth-backend";
import { z } from "zod";
import { supportEndedSchema } from "@/features/admin/account-support";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

type Context = { params: Promise<{ id: string; action: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id, action } = await params;
  const valid = z.uuidv4().safeParse(id);
  if (!valid.success || action !== "expired") return integrationResponse({ message: "Consulta não encontrada." }, 404);
  const origin = appOrigin(request.url, request.headers.get("host"));
  const response = NextResponse.redirect(new URL("/admin/empresas", origin));
  response.headers.set("Cache-Control", "private, no-store");
  if (request.cookies.get(supportScopeCookie)?.value !== valid.data) return response;
  const status = await forwardIntegrationRequest(request, {
    path: `/admin/support/${valid.data}/status`, output: supportPanelSessionSchema, unavailable: "A sessão está indisponível.",
  });
  if ([401, 403, 404].includes(status.status)) setAuthCookie(response, supportScopeCookie, "", 0);
  return response;
}

export async function POST(request: NextRequest, { params }: Context) {
  const path = await params;
  const id = z.uuidv4().safeParse(path.id);
  const action = path.action;
  if (!id.success || (action !== "activity" && action !== "end")) {
    return integrationResponse({ message: "Operação não encontrada." }, 404);
  }
  const current = request.cookies.get(supportScopeCookie)?.value;
  if (current !== id.data) return integrationResponse({ code: supportContextChanged, message: "A sessão de suporte mudou." }, 409);
  const response = await forwardIntegrationRequest(request, {
    path: `/admin/support/${id.data}/${action}`,
    input: z.strictObject({}),
    output: action === "activity" ? supportActivitySchema : supportEndedSchema,
    unavailable: "A sessão de suporte está temporariamente indisponível.",
  });
  if (action !== "end" || response.status === 403) return response;
  const ended = new NextResponse(response.body, { status: response.status, headers: response.headers });
  setAuthCookie(ended, supportScopeCookie, "", 0);
  return ended;
}
