import { ApiError } from "@/lib/api-client";

export function retryAdminRead(failures: number, error: Error) {
  return failures === 0 && error instanceof ApiError && [502, 503, 504].includes(error.status);
}
