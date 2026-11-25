import type { ZodType } from "zod";
import { ApiError } from "@/lib/api-client";
import { supportContextChanged, supportRequestHeaders, supportSessionUnavailable } from "@/lib/support-scope";

export async function requestPixGateway<T>(
  path: string,
  schema: ZodType<T>,
  unavailable: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = 12_000, signal: callerSignal, ...request } = options ?? {};
  const controller = new AbortController();
  const cancel = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) cancel();
  else callerSignal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      ...request,
      headers: supportRequestHeaders(path, request.headers),
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    }).catch(error => {
      if (callerSignal?.aborted) throw error;
      throw new ApiError(unavailable, 503);
    });
    const data: unknown = await response.json().catch(error => {
      if (callerSignal?.aborted) throw error;
      return null;
    });
    if (!response.ok) {
      const message = data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message : unavailable;
      const code = data && typeof data === "object" && "code" in data && typeof data.code === "string"
        ? data.code : undefined;
      if (typeof window !== "undefined" && (code === supportContextChanged || code === supportSessionUnavailable)) {
        window.dispatchEvent(new Event("slopay:support-ended"));
      }
      throw new ApiError(message, response.status, code);
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new ApiError(unavailable, 503);
    return parsed.data;
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", cancel);
  }
}
