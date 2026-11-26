import "server-only";

import type { NextRequest } from "next/server";
import type { ZodType } from "zod";
import { developmentFeaturesEnabled } from "@/config/development";
import { pixPaymentIdSchema } from "@/features/pix-receive/pix-receipt";
import { withdrawalUnavailable } from "@/features/pix-withdraw/pix-withdrawal";
import { requestBackend } from "./auth-backend";
import { pixResponse, validatePixPostOrigin } from "./pix-payments";
import { readJson, RequestBodyError } from "./request-json";
import { accessCookie } from "./session";

const contextErrors: Partial<Record<number, string>> = {
  400: "Confira o valor e a chave Pix de destino.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "O saque requer uma conta ativa, e-mail verificado e autenticação em dois fatores.",
  404: "Saque Pix indisponível para esta conta ou solicitação.",
  409: "Já existe um saque com esta referência. Consulte o status antes de tentar novamente.",
  422: "Confira o código atual no seu aplicativo autenticador.",
  429: "Muitas tentativas. Aguarde um minuto e tente novamente.",
};

const withdrawalMessages: Partial<Record<string, string>> = {
  PIX_WITHDRAWAL_CODE_REJECTED: "Código incorreto ou já utilizado. Aguarde um novo código do autenticador.",
  PIX_WITHDRAWAL_PASSKEY_REJECTED: "A confirmação expirou ou não corresponde à operação. Tente novamente.",
  INTEGRATION_SESSION_CONFIRMATION_EXPIRED: "O prazo da confirmação terminou. Confirme novamente.",
  PIX_WITHDRAWAL_PROOF_REQUIRED: "Escolha um método para autorizar a operação.",
  PIX_WITHDRAWAL_INVALID_KEY: "A chave Pix não corresponde ao tipo selecionado.",
  PIX_WITHDRAWAL_PENDING: "Já existe um saque em andamento. Acompanhe o resultado antes de iniciar outro.",
  PIX_WITHDRAWAL_INSUFFICIENT_BALANCE: "O saldo disponível não cobre o valor total e as tarifas.",
  PIX_WITHDRAWAL_FEE_CHANGED: "A tarifa mudou. Revise a operação com a tarifa atual.",
  SLOPAY_WITHDRAWAL_FEE_CHANGED: "A tarifa do Slopay ou a franquia mudou. Revise a operação com os valores atuais.",
  PIX_WITHDRAWAL_VALIDATION_NOT_CONFIGURED: "A conta ainda precisa habilitar a validação de saques.",
  PIX_WITHDRAWAL_REVIEW_EXPIRED: "Revise os dados do saque antes de confirmar.",
  PIX_WITHDRAWAL_LIMIT: "O valor excede o limite de saque da conta.",
  PIX_WITHDRAWAL_BATCH_NOT_FOUND: "Lote não encontrado.",
};

export async function forwardWithdrawalRequest(
  request: NextRequest,
  path: `/payments/pix-withdrawals${string}`,
  schema: ZodType<object>,
  operation?: { id: string; input: object },
  searchParams?: URLSearchParams,
) {
  const accessToken = request.cookies.get(accessCookie)?.value;
  if (!accessToken) return pixResponse({ message: contextErrors[401] }, 401);

  try {
    const response = await requestBackend(path, {
      method: operation ? "POST" : "GET",
      body: operation?.input,
      idempotencyKey: operation?.id,
      searchParams,
      accessToken,
    });
    if (response.ok) {
      const parsed = schema.safeParse(await response.json());
      if (parsed.success) return pixResponse(parsed.data, response.status);
    } else {
      const error: { code?: string; message?: unknown } | null = await response.json().catch(() => null);
      const code = error?.code === "INTEGRATION_CODE_REJECTED" ? "PIX_WITHDRAWAL_CODE_REJECTED"
        : error?.code === "INTEGRATION_PASSKEY_REJECTED" ? "PIX_WITHDRAWAL_PASSKEY_REJECTED"
          : typeof error?.code === "string" && (error.code === "INTEGRATION_SESSION_CONFIRMATION_EXPIRED" ||
            error.code === "SLOPAY_WITHDRAWAL_FEE_CHANGED" ||
            /^PIX_WITHDRAWAL_[A-Z_]{1,48}$/.test(error.code)) ? error.code : undefined;
      const rowError = code === "PIX_WITHDRAWAL_INVALID_KEY" && typeof error?.message === "string" &&
        /^Confira a chave Pix da transferência \d{1,2}\.$/.test(error.message) ? error.message : undefined;
      const message = rowError ?? (code ? withdrawalMessages[code] : undefined) ?? contextErrors[response.status];
      if (message) return pixResponse({ code, message }, response.status);
    }
  } catch {
    // A lost response can be recovered using the same withdrawal ID.
  }
  return pixResponse({ message: withdrawalUnavailable }, 503);
}

export async function forwardWithdrawalPost(
  request: NextRequest,
  path: `/payments/pix-withdrawals${string}`,
  inputSchema: ZodType<{ simulate: boolean }>,
  responseSchema: ZodType<object>,
  unavailable: string,
  bodyLimit: number,
) {
  const originError = validatePixPostOrigin(request, unavailable);
  if (originError) return originError;
  const id = pixPaymentIdSchema.safeParse(request.headers.get("idempotency-key"));
  if (!id.success) return pixResponse({ message: "Referência da solicitação inválida." }, 400);

  try {
    const input = inputSchema.safeParse(await readJson(request, bodyLimit));
    if (!input.success) return pixResponse({ message: "Confira os dados informados." }, 400);
    if (input.data.simulate && !developmentFeaturesEnabled())
      return pixResponse({ message: "A simulação está disponível em desenvolvimento." }, 403);
    return forwardWithdrawalRequest(request, path, responseSchema, { id: id.data.toLowerCase(), input: input.data });
  } catch (error) {
    if (error instanceof RequestBodyError) return pixResponse({ message: error.message }, error.status);
    return pixResponse({ message: "Confira os dados informados." }, 400);
  }
}
