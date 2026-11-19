import "server-only";

import { cookies } from "next/headers";
import { sandboxIntegrationStatusSchema, sandboxKeysSchema } from "@/features/integrations/sandbox-keys";
import { requestBackend } from "./auth-backend";
import { accessCookie } from "./session";

export async function loadSandboxIntegrationKeys() {
  const accessToken = (await cookies()).get(accessCookie)?.value;
  if (!accessToken) return { state: "unavailable" } as const;
  try {
    const statusResponse = await requestBackend("/integrations/sandbox/status", { method: "GET", accessToken });
    if (statusResponse.status === 404) {
      await statusResponse.body?.cancel();
      return { state: "disabled" } as const;
    }
    if (!statusResponse.ok) {
      await statusResponse.body?.cancel();
      return { state: "unavailable" } as const;
    }
    const status = sandboxIntegrationStatusSchema.safeParse(await statusResponse.json());
    if (!status.success) return { state: "unavailable" } as const;
    if (!status.data.company || !status.data.verifiedAt) return { state: "unlinked" } as const;

    const response = await requestBackend("/integrations/sandbox/api-keys", { method: "GET", accessToken });
    if (!response.ok) {
      await response.body?.cancel();
      return { state: "unavailable" } as const;
    }
    const keys = sandboxKeysSchema.safeParse(await response.json());
    return keys.success
      ? { state: "ready", keys: keys.data, company: status.data.company } as const
      : { state: "unavailable" } as const;
  } catch {
    return { state: "unavailable" } as const;
  }
}

