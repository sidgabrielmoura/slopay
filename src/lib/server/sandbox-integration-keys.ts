import "server-only";

import { cookies } from "next/headers";
import { sandboxIntegrationStatusSchema, sandboxKeysSchema } from "@/features/integrations/sandbox-keys";
import { requestBackend } from "./auth-backend";
import { accessCookie } from "./session";

export async function loadIntegrationKeys(environment: "sandbox" | "live") {
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
    return keys.success && keys.data.every(key => key.environment === environment)
      ? { state: "ready", keys: keys.data, company: status.data.company } as const
      : { state: "unavailable" } as const;
  } catch {
    return { state: "unavailable" } as const;
  }
}

