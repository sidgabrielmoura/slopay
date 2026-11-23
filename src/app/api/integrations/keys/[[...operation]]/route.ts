import type { NextRequest } from "next/server";
import { developmentFeaturesEnabled } from "@/config/development";
import type { ZodType } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import {
  issuedKeySchema, keyChangeSchema, keyCreateSchema, keyDraftSchema,
  keyStatusSchema, sandboxKeyId, sandboxKeySchema,
} from "@/features/integrations/sandbox-keys";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

const unavailable = "As chaves de API estão temporariamente indisponíveis.";

type Operation = { path: `/${string}`; input: ZodType<object>; output: ZodType<object> };

function operationRoute(segments: string[]): Operation | null {
  const base = `/integrations/${developmentFeaturesEnabled() ? "sandbox" : "live"}/api-keys` as const;
  if (segments.length === 0) return { path: base, input: keyCreateSchema, output: issuedKeySchema };
  if (segments.length === 1 && segments[0] === "passkey-options")
    return { path: `${base}/passkey-options`, input: keyDraftSchema, output: passkeyOptionsSchema };

  const id = sandboxKeyId.safeParse(segments[0]);
  if (segments.length !== 2 || !id.success) return null;
  if (segments[1] === "passkey-options") return {
    path: `${base}/${id.data}/passkey-options`, input: keyChangeSchema, output: passkeyOptionsSchema,
  };
  if (segments[1] === "status") return {
    path: `${base}/${id.data}/status`, input: keyStatusSchema, output: sandboxKeySchema,
  };
  return null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ operation?: string[] }> }) {
  const operation = operationRoute((await params).operation ?? []);
  if (!operation) return integrationResponse({ message: "Rota indisponível." }, 404);
  return forwardIntegrationRequest(request, { ...operation, unavailable });
}

