import type { NextRequest } from "next/server";
import { clientUserParams, clientUserQuery, clientUsersSchema, clientUsersUnavailable } from "@/features/admin/admin-client-users";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = clientUserQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros do diretório." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/client-users", output: clientUsersSchema, unavailable: clientUsersUnavailable, searchParams: clientUserParams(query.data),
  });
}
