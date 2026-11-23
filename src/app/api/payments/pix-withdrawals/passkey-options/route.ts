import type { NextRequest } from "next/server";
import { withdrawalDraftSchema, withdrawalPasskeyOptionsSchema, withdrawalUnavailable } from "@/features/pix-withdraw/pix-withdrawal";
import { forwardWithdrawalPost } from "@/lib/server/pix-withdrawals";

export function POST(request: NextRequest) {
  return forwardWithdrawalPost(
    request, "/payments/pix-withdrawals/passkey-options", withdrawalDraftSchema, withdrawalPasskeyOptionsSchema, withdrawalUnavailable, 1024,
  );
}
