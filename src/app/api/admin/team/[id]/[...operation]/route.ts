import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  adminInvitationChangedSchema, adminInvitationChangeSchema, adminInvitationConfirmedChange,
  adminTeamChangedSchema, adminTeamChangeSchema, adminTeamConfirmedChange,
} from "@/features/admin/admin-team";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

const commands = {
  "change/options": { input: adminTeamChangeSchema, output: passkeyOptionsSchema, unavailable: "Não foi possível preparar a confirmação." },
  change: { input: adminTeamConfirmedChange, output: adminTeamChangedSchema, unavailable: "Não foi possível alterar o acesso." },
  "invitation/options": { input: adminInvitationChangeSchema, output: passkeyOptionsSchema, unavailable: "Não foi possível preparar a confirmação." },
  invitation: { input: adminInvitationConfirmedChange, output: adminInvitationChangedSchema, unavailable: "Não foi possível alterar o convite." },
};
type Context = { params: Promise<{ id: string; operation: string[] }> };

export async function POST(request: NextRequest, { params }: Context) {
  const { id, operation } = await params;
  const command = operation.join("/") as keyof typeof commands;
  if (!z.uuid().safeParse(id).success || !Object.hasOwn(commands, command)) {
    return integrationResponse({ message: "Operação não encontrada." }, 404);
  }
  return forwardIntegrationRequest(request, { path: `/admin/team/${id}/${command}`, ...commands[command] });
}
