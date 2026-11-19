import type { NextRequest } from "next/server";
import { receiptShareSchema, receiptUnavailable } from "@/features/receipts/pix-receipt-share";
import { transactionReferencePattern } from "@/features/transactions/live-transactions";
import { requestBackend } from "@/lib/server/auth-backend";
import { pixResponse, validatePixPostOrigin } from "@/lib/server/pix-payments";
import { accessCookie } from "@/lib/server/session";

const errors: Readonly<Record<number, string>> = {
  401: "Sua sessão expirou. Entre novamente.",
  403: "O compartilhamento requer uma conta ativa e uma sessão verificada.",
  404: "Comprovante indisponível para esta movimentação.",
  409: "O comprovante ficará disponível após a confirmação no Asaas.",
  429: "Aguarde um instante e tente novamente.",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  const originError = validatePixPostOrigin(request, receiptUnavailable);
  if (originError) return originError;
  const accessToken = request.cookies.get(accessCookie)?.value;
  if (!accessToken) return pixResponse({ message: errors[401] }, 401);
  const { reference } = await params;
  if (!transactionReferencePattern.test(reference)) return pixResponse({ message: errors[404] }, 404);

  try {
    const backend = await requestBackend(`/dashboard/transactions/${encodeURIComponent(reference)}/receipt-share`, {
      method: "POST", accessToken, signal: request.signal,
    });
    if (backend.ok) {
      const result = receiptShareSchema.safeParse(await backend.json());
      if (result.success) return pixResponse(result.data, 201);
    } else {
      await backend.body?.cancel().catch(() => undefined);
      if (errors[backend.status]) return pixResponse({ message: errors[backend.status] }, backend.status);
    }
  } catch {
    return pixResponse({ message: receiptUnavailable }, 503);
  }
  return pixResponse({ message: receiptUnavailable }, 503);
}
