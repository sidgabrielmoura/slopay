import "server-only";

import type { NextRequest } from "next/server";
import type { ZodType } from "zod";
import { asaasPixMinimumMessage, type PixPayer } from "@/features/pix-receive/pix-receipt";
import { developmentFeaturesEnabled } from "@/config/development";
import { appOrigin, requestBackend } from "./auth-backend";
import { accessCookie } from "./session";

export function pixResponse(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

const errors: Partial<Record<number, string>> = {
  400: "Confira o valor da cobrança.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "Sua conta precisa estar ativa, com e-mail e autenticação em dois fatores verificados.",
  404: "Recebimento Pix indisponível para esta conta ou cobrança.",
  422: "O gateway não aceitou os dados da cobrança.",
  429: "Aguarde um instante e tente novamente.",
};

export function validatePixPostOrigin(
  request: NextRequest,
  unavailable = "O serviço de recebimento Pix está temporariamente indisponível.",
) {
  try {
    const fetchSite = request.headers.get("sec-fetch-site");
    if ((fetchSite && fetchSite !== "same-origin") ||
        request.headers.get("origin") !== appOrigin(request.url, request.headers.get("host"))) {
      return pixResponse({ message: "Origem da solicitação inválida." }, 403);
    }
  } catch {
    return pixResponse({ message: unavailable }, 503);
  }
}

export async function forwardPixRequest(
  request: NextRequest,
  path: `/payments/pix${string}`,
  schema: ZodType<object>,
  operation?: { amountInCents: number; idempotencyKey: string; payer?: PixPayer } | "simulate" | "reconcile",
) {
  const accessToken = request.cookies.get(accessCookie)?.value;
  if (!accessToken) return pixResponse({ message: errors[401] }, 401);
  const simulation = operation === "simulate";
  const payload = typeof operation === "object" ? operation : undefined;

  try {
    const response = await requestBackend(path, {
      method: operation ? "POST" : "GET",
      body: payload ? { amountInCents: payload.amountInCents, payer: payload.payer } : undefined,
      idempotencyKey: payload?.idempotencyKey,
      accessToken,
    });
    if (response.ok) {
      const data = schema.safeParse(await response.json());
      if (data.success && (!("environment" in data.data) || data.data.environment !== "sandbox" || developmentFeaturesEnabled()))
        return pixResponse(data.data, response.status);
    } else {
      if (simulation && response.status === 409) {
        const data = await response.json().catch(() => null);
        const message = data?.code === "ASAAS_WEBHOOK_NOT_CONFIGURED"
          ? "Configure o token do webhook do Asaas no backend para simular o pagamento."
          : data?.code === "ASAAS_SIMULATION_REJECTED"
            ? "O Asaas Sandbox recusou a simulação desta cobrança. Confira a situação no painel do Asaas."
            : "A cobrança não está disponível para simulação.";
        return pixResponse({ message }, 409);
      }
      if (payload && response.status === 400) {
        const data = await response.json().catch(() => null);
        if (data?.code === "PIX_AMOUNT_BELOW_MINIMUM") {
          return pixResponse({ code: data.code, message: asaasPixMinimumMessage }, 400);
        }
        if (["INVALID_PIX_PAYER", "PIX_PAYER_REQUIRED"].includes(data?.code))
          return pixResponse({ code: data.code, message: "Confira o nome e o CPF ou CNPJ do pagador." }, 400);
      } else {
        await response.body?.cancel().catch(() => undefined);
      }
      if (response.status === 409) {
        return pixResponse({
          message: payload
            ? "A cobrança precisa ser conferida no gateway antes de uma nova tentativa."
            : "O QR Code não está disponível para o estado atual da cobrança.",
        }, 409);
      }
      const message = errors[response.status];
      if (message) return pixResponse({ message }, response.status);
    }
  } catch {
    // The client can retry a creation with the same idempotency key.
  }
  return pixResponse({ message: "O serviço de recebimento Pix está temporariamente indisponível." }, 503);
}
