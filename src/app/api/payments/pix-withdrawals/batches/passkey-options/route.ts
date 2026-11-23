import type { NextRequest } from "next/server";
import { withdrawalPasskeyOptionsSchema } from "@/features/pix-withdraw/pix-withdrawal";
import { batchDraftSchema, batchesUnavailable } from "@/features/pix-batches/live-batches";
import { forwardWithdrawalPost } from "@/lib/server/pix-withdrawals";

export function POST(request: NextRequest) {
  return forwardWithdrawalPost(
    request, "/payments/pix-withdrawals/batches/passkey-options", batchDraftSchema, withdrawalPasskeyOptionsSchema, batchesUnavailable, 8192,
  );
}
