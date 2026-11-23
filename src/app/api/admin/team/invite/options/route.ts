import type { NextRequest } from "next/server";
import { adminTeamInviteOptionsSchema, adminTeamInviteSchema } from "@/features/admin/admin-team";
import { forwardIntegrationRequest } from "@/lib/server/integration-request";

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/admin/team/invite/options", input: adminTeamInviteSchema, output: adminTeamInviteOptionsSchema,
    unavailable: "Não foi possível preparar o convite administrativo. Confira se o envio de e-mails está disponível.",
  });
}
