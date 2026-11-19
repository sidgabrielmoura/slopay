import type { NextRequest } from "next/server";
import { developmentFeaturesEnabled } from "@/config/development";
import { pixPaymentIdSchema, pixPaymentSchema, pixQrCodeSchema, pixSimulationSchema } from "@/features/pix-receive/pix-receipt";
import { forwardPixRequest, pixResponse, validatePixPostOrigin } from "@/lib/server/pix-payments";

export async function GET(request: NextRequest, { params }: { params: Promise<{ charge: string[] }> }) {
  const { charge } = await params;
  const id = pixPaymentIdSchema.safeParse(charge[0]);
  if (!id.success) return pixResponse({ message: "Cobrança não encontrada." }, 404);

  if (charge.length === 1) {
    return forwardPixRequest(request, `/payments/pix/${id.data}`, pixPaymentSchema);
  }
  if (charge.length === 2 && charge[1] === "qr-code") {
    return forwardPixRequest(request, `/payments/pix/${id.data}/qr-code`, pixQrCodeSchema);
  }
  return pixResponse({ message: "Cobrança não encontrada." }, 404);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ charge: string[] }> }) {
  const { charge } = await params;
  const id = pixPaymentIdSchema.safeParse(charge[0]);
  const action = charge[1];
  if (!id.success || charge.length !== 2 || (action !== "simulate" && action !== "reconcile")) {
    return pixResponse({ message: "Cobrança não encontrada." }, 404);
  }
  if (action === "simulate" && !developmentFeaturesEnabled()) return pixResponse({ message: "Rota indisponível." }, 404);
  const originError = validatePixPostOrigin(request);
  if (originError) return originError;
  return forwardPixRequest(request, `/payments/pix/${id.data}/${action}`, pixSimulationSchema, action);
}
