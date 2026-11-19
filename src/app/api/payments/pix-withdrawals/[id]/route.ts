import type { NextRequest } from "next/server";
import { pixPaymentIdSchema } from "@/features/pix-receive/pix-receipt";
import { withdrawalSchema } from "@/features/pix-withdraw/pix-withdrawal";
import { pixResponse } from "@/lib/server/pix-payments";
import { forwardWithdrawalRequest } from "@/lib/server/pix-withdrawals";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = pixPaymentIdSchema.safeParse((await context.params).id);
  if (!id.success) return pixResponse({ message: "Saque Pix indisponível." }, 404);
  return forwardWithdrawalRequest(request, `/payments/pix-withdrawals/${id.data.toLowerCase()}`, withdrawalSchema);
}
