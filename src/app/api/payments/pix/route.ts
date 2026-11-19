import type { NextRequest } from "next/server";
import { z } from "zod";
import { pixAmountSchema, pixPaymentIdSchema, pixPaymentSchema } from "@/features/pix-receive/pix-receipt";
import { forwardPixRequest, pixResponse, validatePixPostOrigin } from "@/lib/server/pix-payments";
import { readJson, RequestBodyError } from "@/lib/server/request-json";

const bodySchema = z.strictObject({ amountInCents: pixAmountSchema });

export async function POST(request: NextRequest) {
  const originError = validatePixPostOrigin(request);
  if (originError) return originError;

  const key = pixPaymentIdSchema.safeParse(request.headers.get("idempotency-key"));
  if (!key.success) return pixResponse({ message: "A solicitação precisa de uma chave de idempotência válida." }, 400);

  try {
    const body = bodySchema.safeParse(await readJson(request, 1024));
    if (!body.success) return pixResponse({ message: "Informe um valor válido para receber." }, 400);
    return forwardPixRequest(request, "/payments/pix", pixPaymentSchema, {
      amountInCents: body.data.amountInCents,
      idempotencyKey: key.data,
    });
  } catch (error) {
    if (error instanceof RequestBodyError) return pixResponse({ message: error.message }, error.status);
    return pixResponse({ message: "Confira os dados da cobrança." }, 400);
  }
}
