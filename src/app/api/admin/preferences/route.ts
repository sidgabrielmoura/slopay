import type { NextRequest } from "next/server";
import {
  adminPreferencesSaveUnavailable, adminPreferencesUnavailable, adminPreferencesViewSchema, saveAdminPreferencesSchema,
} from "@/features/admin/admin-preferences";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  if (request.nextUrl.search) return integrationResponse({ message: "Solicitação inválida." }, 400);
  return forwardIntegrationRequest(request, {
    path: "/admin/preferences", output: adminPreferencesViewSchema, unavailable: adminPreferencesUnavailable,
  });
}

export function POST(request: NextRequest) {
  if (request.nextUrl.search) return integrationResponse({ message: "Solicitação inválida." }, 400);
  return forwardIntegrationRequest(request, {
    path: "/admin/preferences", input: saveAdminPreferencesSchema, output: adminPreferencesViewSchema,
    unavailable: adminPreferencesSaveUnavailable,
  });
}
