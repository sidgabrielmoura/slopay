import type { ZodType } from "zod";
import { ApiError } from "@/lib/api-client";

export async function requestPixGateway<T>(
  path: string,
  schema: ZodType<T>,
  unavailable: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = 12_000, ...request } = options ?? {};
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
  const response = await fetch(path, {
    ...request,
    cache: "no-store",
    credentials: "same-origin",
    signal,
  }).catch((error) => {
    if (request.signal?.aborted) throw error;
    throw new ApiError(unavailable, 503);
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data && typeof data.message === "string"
      ? data.message : unavailable;
    const code = data && typeof data === "object" && "code" in data && typeof data.code === "string"
      ? data.code : undefined;
    throw new ApiError(message, response.status, code);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError(unavailable, 503);
  return parsed.data;
}
