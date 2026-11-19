import type { NextRequest } from "next/server";
import { recentWithdrawalsSchema, withdrawalInputSchema, withdrawalSchema, withdrawalUnavailable } from "@/features/pix-withdraw/pix-withdrawal";
import { forwardWithdrawalPost, forwardWithdrawalRequest } from "@/lib/server/pix-withdrawals";

export function GET(request: NextRequest) {
  return forwardWithdrawalRequest(request, "/payments/pix-withdrawals", recentWithdrawalsSchema);
}

export function POST(request: NextRequest) {
  return forwardWithdrawalPost(request, "/payments/pix-withdrawals", withdrawalInputSchema, withdrawalSchema, withdrawalUnavailable, 32_768);
}
