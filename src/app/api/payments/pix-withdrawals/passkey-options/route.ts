import type { NextRequest } from "next/server";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { withdrawalDraftSchema, withdrawalUnavailable } from "@/features/pix-withdraw/pix-withdrawal";
import { forwardWithdrawalPost } from "@/lib/server/pix-withdrawals";

export function POST(request: NextRequest) {
  return forwardWithdrawalPost(
    request, "/payments/pix-withdrawals/passkey-options", withdrawalDraftSchema, passkeyOptionsSchema, withdrawalUnavailable, 1024,
  );
}
