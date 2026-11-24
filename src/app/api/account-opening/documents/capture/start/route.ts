import type { NextRequest } from "next/server";
import { capturePairingSchema, startCaptureSchema } from "@/features/account-validation/opening-documents";
import { forwardIntegrationRequest } from "@/lib/server/integration-request";

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/account-opening/documents/capture/start",
    input: startCaptureSchema, output: capturePairingSchema,
    unavailable: "Não foi possível gerar o QR Code.",
  });
}
