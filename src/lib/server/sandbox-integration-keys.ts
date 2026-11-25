import "server-only";

import { cookies } from "next/headers";
import { sandboxIntegrationStatusSchema, sandboxKeysSchema } from "@/features/integrations/sandbox-keys";
import { requestBackend } from "./auth-backend";
import { accessCookie } from "./session";

const pageSize = 8;

export async function loadIntegrationKeys(environment: "sandbox" | "live", requestedPage: number) {
  const path = `/integrations/${environment}` as const;
  const accessToken = (await cookies()).get(accessCookie)?.value;
  if (!accessToken) return { state: "unavailable" } as const;
  try {
    const statusResponse = await requestBackend(`${path}/status`, { method: "GET", accessToken });
    if (statusResponse.status === 404) {
      await statusResponse.body?.cancel();
      return { state: "disabled" } as const;
    }
    if (!statusResponse.ok) {
      await statusResponse.body?.cancel();
      return { state: "unavailable" } as const;
    }
    const status = sandboxIntegrationStatusSchema.safeParse(await statusResponse.json());
    if (!status.success || status.data.environment !== environment) return { state: "unavailable" } as const;
    if (!status.data.company || (environment === "sandbox" && !status.data.verifiedAt)) return { state: "unlinked" } as const;

    const response = await requestBackend(`${path}/api-keys`, { method: "GET", accessToken });
    if (!response.ok) {
      await response.body?.cancel();
      return { state: "unavailable" } as const;
    }
    const keys = sandboxKeysSchema.safeParse(await response.json());
    if (!keys.success || !keys.data.every(key => key.environment === environment)) return { state: "unavailable" } as const;

    // The gateway returns the account's full list (capped at 50), sorted by creation date and ID.
    const total = keys.data.length;
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
    return {
      state: "ready",
      keys: keys.data.slice((page - 1) * pageSize, page * pageSize),
      pagination: { page, pageSize, total },
      company: status.data.company,
    } as const;
  } catch {
    return { state: "unavailable" } as const;
  }
}

