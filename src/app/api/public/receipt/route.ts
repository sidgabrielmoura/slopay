import type { NextRequest } from "next/server";
import { z } from "zod";
import { receiptLinkUnavailable, shareTokenSchema, sharedReceiptSchema, sharedReceiptUnavailable } from "@/features/receipts/pix-receipt-share";
import { requestBackend } from "@/lib/server/auth-backend";
import { pixResponse, validatePixPostOrigin } from "@/lib/server/pix-payments";
import { readJson } from "@/lib/server/request-json";

const lookupSchema = z.object({ shareToken: shareTokenSchema });

export async function POST(request: NextRequest) {
  const originError = validatePixPostOrigin(request, sharedReceiptUnavailable);
  if (originError) return originError;
  const data = lookupSchema.safeParse(await readJson(request, 128).catch(() => null));
  if (!data.success) return pixResponse({ message: receiptLinkUnavailable }, 404);

  try {
    const backend = await requestBackend("/receipts/resolve", { method: "POST", body: data.data, signal: request.signal });
    if (backend.ok) {
      const result = sharedReceiptSchema.safeParse(await backend.json());
      if (result.success) return pixResponse(result.data);
    } else {
      await backend.body?.cancel().catch(() => undefined);
      if (backend.status === 404) return pixResponse({ message: receiptLinkUnavailable }, 404);
      if (backend.status === 429) return pixResponse({ message: "Aguarde um instante e tente novamente." }, 429);
    }
  } catch {
    return pixResponse({ message: sharedReceiptUnavailable }, 503);
  }
  return pixResponse({ message: sharedReceiptUnavailable }, 503);
}
