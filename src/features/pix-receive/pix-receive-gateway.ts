import type { z, ZodType } from "zod";
import { ApiError } from "@/lib/api-client";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { pixPaymentSchema, pixQrCodeSchema, pixSimulationSchema, type PixReceiveGateway, type PixReceipt } from "./pix-receipt";

const endpoint = "/api/payments/pix";
const unavailable = "O serviço de recebimento Pix está temporariamente indisponível.";

function request<T>(path: string, schema: ZodType<T>, options?: RequestInit) {
  return requestPixGateway(path, schema, unavailable, options);
}

function toReceipt(payment: z.infer<typeof pixPaymentSchema>): PixReceipt {
  const { id, amountInCents, state, status, qrCodeAvailable, refund } = payment;
  if (state === "RECEIVED" && status === "PAID") {
    const refunded = refund?.completedInCents ?? 0;
    const receiptStatus = refunded >= amountInCents ? "refunded"
      : refund?.pending ? "refund-pending" : refunded > 0 ? "partially-refunded" : "paid";
    return { id, amountInCents, status: receiptStatus, qrCodeAvailable: false };
  }
  if (status === "CANCELLED") {
    return { id, amountInCents, status: "cancelled", qrCodeAvailable: false };
  }
  if (status === "FAILED") {
    return { id, amountInCents, status: "failed", qrCodeAvailable: false };
  }
  if (state === "REVIEW") return { id, amountInCents, status: "review", qrCodeAvailable: false };
  return {
    id,
    amountInCents,
    status: state === "OPEN" ? "pending" : "preparing",
    qrCodeAvailable: state === "OPEN" && qrCodeAvailable,
  };
}

export const asaasPixReceive: PixReceiveGateway = {
  async create(amountInCents, key, payer) {
    const payment = await request(endpoint, pixPaymentSchema, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify({ amountInCents, payer }),
    });
    if (payment.amountInCents !== amountInCents) throw new ApiError(unavailable, 503);
    return toReceipt(payment);
  },
  async get(id, signal) {
    const payment = await request(endpoint + "/" + encodeURIComponent(id), pixPaymentSchema, { signal });
    if (payment.id !== id) throw new ApiError(unavailable, 503);
    return toReceipt(payment);
  },
  qrCode: (id, signal) => request(endpoint + "/" + encodeURIComponent(id) + "/qr-code", pixQrCodeSchema, { signal }),
  requestReconciliation: (id) => request(endpoint + "/" + encodeURIComponent(id) + "/reconcile", pixSimulationSchema, { method: "POST" }),
  requestSimulation: process.env.NODE_ENV === "development" ? async (id) => {
    await request(endpoint + "/" + encodeURIComponent(id) + "/simulate", pixSimulationSchema, { method: "POST" });
  } : undefined,
};
