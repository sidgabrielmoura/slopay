import { ApiError } from "@/lib/api-client";
import { authApiService } from "@/services/auth-api.service";

export const refreshMargin = 60_000;

export async function withSessionLock<T>(work: () => Promise<T>): Promise<T> {
  if (!navigator.locks) return work();
  return await navigator.locks.request("slopay:session-refresh", work);
}

export function sessionErrorCode(error: unknown) {
  return error instanceof ApiError ? error.code : undefined;
}

export function sessionCanResume(error: unknown) {
  return ["SESSION_ACTIVE", "REFRESH_ALREADY_ROTATED"].includes(sessionErrorCode(error) ?? "");
}

export function sessionEnded(error: unknown) {
  return ["SESSION_EXPIRED", "SESSION_REVOKED", "INVALID_REFRESH"].includes(sessionErrorCode(error) ?? "");
}

export function refreshSessionIfActive() {
  return withSessionLock(async () => {
    let status = await authApiService.sessionStatus();
    if (status.state === "active") {
      try {
        await authApiService.refresh();
      } catch (error) {
        if (sessionErrorCode(error) !== "SESSION_IDLE") throw error;
        status = await authApiService.sessionStatus();
      }
    }
    return status;
  });
}
