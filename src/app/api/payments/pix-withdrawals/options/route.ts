import type { NextRequest } from "next/server";
import { withdrawalOptionsSchema } from "@/features/pix-withdraw/pix-withdrawal";
import { forwardWithdrawalRequest } from "@/lib/server/pix-withdrawals";

export function GET(request: NextRequest) {
  return forwardWithdrawalRequest(request, "/payments/pix-withdrawals/options", withdrawalOptionsSchema);
}
