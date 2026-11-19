import type { NextRequest } from "next/server";
import { batchDetailSchema, batchInputSchema, batchListSchema, batchesUnavailable } from "@/features/pix-batches/live-batches";
import { pixResponse } from "@/lib/server/pix-payments";
import { forwardWithdrawalPost, forwardWithdrawalRequest } from "@/lib/server/pix-withdrawals";

const backend = "/payments/pix-withdrawals/batches";

export function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get("page") ?? "1";
  if (!/^[1-9]\d{0,6}$/.test(page)) return pixResponse({ message: "Página de lotes inválida." }, 400);
  return forwardWithdrawalRequest(request, backend, batchListSchema, undefined, new URLSearchParams({ page }));
}

export function POST(request: NextRequest) {
  return forwardWithdrawalPost(request, backend, batchInputSchema, batchDetailSchema, batchesUnavailable, 32_768);
}
