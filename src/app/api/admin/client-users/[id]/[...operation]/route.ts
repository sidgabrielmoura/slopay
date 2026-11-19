import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  clientUserClosedSchema, clientUserDeletedSchema, clientUserDeletionOptions, clientUserDeletionRequest, clientUserDeletionSchema,
} from "@/features/admin/admin-client-users";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

const commands = {
  "delete/options": {
    input: clientUserDeletionSchema, output: clientUserDeletionOptions, unavailable: "Não foi possível preparar a exclusão.",
  },
  delete: {
    input: clientUserDeletionRequest, output: clientUserDeletedSchema, unavailable: "Não foi possível confirmar a exclusão.",
  },
  "close/options": {
    input: clientUserDeletionSchema, output: clientUserDeletionOptions, unavailable: "Não foi possível preparar o encerramento.",
  },
  close: {
    input: clientUserDeletionRequest, output: clientUserClosedSchema, unavailable: "Não foi possível confirmar o encerramento.",
  },
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; operation: string[] }> }) {
  const { id, operation } = await params;
  const command = operation.join("/") as keyof typeof commands;
  if (!z.uuid().safeParse(id).success || !Object.hasOwn(commands, command)) {
    return integrationResponse({ message: "Operação não encontrada." }, 404);
  }
  return forwardIntegrationRequest(request, { path: `/admin/client-users/${id.toLowerCase()}/${command}`, ...commands[command] });
}
