import type { NextRequest } from "next/server";
import { adminTeamConfirmedInvite, adminTeamInvitedSchema } from "@/features/admin/admin-team";
import { forwardIntegrationRequest } from "@/lib/server/integration-request";

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/admin/team/invite", input: adminTeamConfirmedInvite, output: adminTeamInvitedSchema,
    unavailable: "Não foi possível registrar o convite administrativo. Confira se o envio de e-mails está disponível.",
  });
}
