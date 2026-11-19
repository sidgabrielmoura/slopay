import type { NextRequest } from "next/server";
import { batchDetailSchema } from "@/features/pix-batches/live-batches";
import { pixPaymentIdSchema } from "@/features/pix-receive/pix-receipt";
import { pixResponse } from "@/lib/server/pix-payments";
import { forwardWithdrawalRequest } from "@/lib/server/pix-withdrawals";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const batch = pixPaymentIdSchema.safeParse((await params).id);
  if (!batch.success) return pixResponse({ message: "Lote não encontrado." }, 404);
  return forwardWithdrawalRequest(request, `/payments/pix-withdrawals/batches/${batch.data.toLowerCase()}`, batchDetailSchema);
}
