import type { NextRequest } from "next/server";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { batchDraftSchema, batchesUnavailable } from "@/features/pix-batches/live-batches";
import { forwardWithdrawalPost } from "@/lib/server/pix-withdrawals";

export function POST(request: NextRequest) {
  return forwardWithdrawalPost(
    request, "/payments/pix-withdrawals/batches/passkey-options", batchDraftSchema, passkeyOptionsSchema, batchesUnavailable, 8192,
  );
}
