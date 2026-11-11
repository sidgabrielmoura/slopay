import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  appOrigin,
  authTokensSchema,
  requestAuthBackend,
  sessionUserSchema,
} from "@/lib/server/auth-backend";
import {
  accessCookie,
  challengeCookie,
  clearSession,
  refreshCookie,
  saveSession,
  setAuthCookie,
} from "@/lib/server/session";

const maxBodyBytes = 8192;
const password = z.string().min(1).max(128);
const code = z.string().trim().min(6).max(128);
const email = z.email().max(254);
const token = z.string().min(1).max(512);

type Action = {
  mode: "issue" | "challenge" | "refresh" | "logout" | "setup" | "confirm" | "message";
  body?: z.ZodType;
  sessionRequired?: boolean;
};

const actions: Record<string, Action> = {
  login: { mode: "issue", body: z.object({ email, password }) },
  "login/2fa": { mode: "challenge", body: z.object({ code }) },
  register: {
    mode: "issue",
    body: z.object({
      email,
      password,
      fullName: z.string().trim().min(1).max(100),
      cpf: z.string().regex(/^\d{11}$/),
      phone: z.string().min(1).max(20),
    }),
  },
  "forgot-password": { mode: "message", body: z.object({ email }) },
  "reset-password": { mode: "message", body: z.object({ token, newPassword: password }) },
  "verify-email": { mode: "message", body: z.object({ token }) },
  "resend-verification": { mode: "message", sessionRequired: true },
  refresh: { mode: "refresh" },
  logout: { mode: "logout" },
  "2fa/setup": {
    mode: "setup",
    body: z.object({ password, currentCode: code.optional() }),
    sessionRequired: true,
  },
  "2fa/verify": { mode: "confirm", body: z.object({ code }), sessionRequired: true },
};

const backendMessage = z.object({
  message: z.union([z.string(), z.array(z.string())]).optional(),
  code: z.string().regex(/^[A-Z0-9_]{1,64}$/).optional(),
});

const authIssue = z.object({ user: sessionUserSchema, tokens: authTokensSchema });
const challenge = z.object({
  requires2FA: z.literal(true),
  challengeToken: z.string().min(1).max(3000),
});
const factorSetup = z.object({
  secret: z.string().min(1).max(128),
  qrCodeUri: z.string().startsWith("otpauth://totp/").max(1024),
});
const factorConfirmed = z.object({
  backupCodes: z.array(z.string().min(6).max(128)).min(1).max(20),
});

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const unavailable = () => json({ message: "Serviço de autenticação indisponível. Tente novamente." }, 503);

class RequestBodyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function readJson(request: NextRequest): Promise<unknown> {
  const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json") {
    throw new RequestBodyError(415, "Envie os dados em JSON.");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError(400, "Envie os dados da solicitação.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBodyBytes) {
      await reader.cancel().catch(() => undefined);
      throw new RequestBodyError(413, "Os dados da solicitação excedem o limite.");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string[] }> },
) {
  const path = (await params).action.join("/");
  if (!Object.hasOwn(actions, path)) return json({ message: "Rota indisponível." }, 404);
  const action = actions[path];

  try {
    const fetchSite = request.headers.get("sec-fetch-site");
    if ((fetchSite && fetchSite !== "same-origin") ||
        request.headers.get("origin") !== appOrigin(request.url)) {
      return json({ message: "Origem da solicitação inválida." }, 403);
    }
  } catch {
    return unavailable();
  }

  const accessToken = request.cookies.get(accessCookie)?.value;
  const refreshToken = request.cookies.get(refreshCookie)?.value;
  if (action.sessionRequired && !accessToken) {
    return json({ message: "Sessão expirada. Entre novamente." }, 401);
  }

  let body: unknown;
  try {
    if (action.body) {
      const parsed = action.body.safeParse(await readJson(request));
      if (!parsed.success) return json({ message: "Confira os dados informados." }, 400);
      body = parsed.data;
    }

    if (action.mode === "challenge") {
      const challengeToken = request.cookies.get(challengeCookie)?.value;
      if (!challengeToken) {
        return json({ message: "O desafio expirou. Entre novamente.", code: "CHALLENGE_EXPIRED" }, 401);
      }
      body = { ...(body as { code: string }), challengeToken };
    }

    if (action.mode === "refresh" || action.mode === "logout") {
      if (!refreshToken) {
        const response = action.mode === "logout"
          ? json({ success: true })
          : json({ message: "Sessão expirada. Entre novamente." }, 401);
        clearSession(response);
        return response;
      }
      body = { refreshToken };
    }
  } catch (error) {
    return error instanceof RequestBodyError
      ? json({ message: error.message }, error.status)
      : json({ message: "Os dados da solicitação são inválidos." }, 400);
  }

  try {
    const backend = await requestAuthBackend(path, {
      method: "POST",
      body,
      accessToken: action.sessionRequired ? accessToken : undefined,
    });
    const payload: unknown = await backend.json().catch(() => null);

    if (!backend.ok) {
      if (backend.status >= 500) return unavailable();
      const details = backendMessage.safeParse(payload);
      const message = details.data?.message;
      const response = json({
        message: (Array.isArray(message) ? message[0] : message)?.slice(0, 300) ||
          "A solicitação foi recusada.",
        code: details.data?.code,
      }, backend.status);
      if (action.mode === "refresh" && backend.status === 401) clearSession(response);
      return response;
    }

    if (action.mode === "issue" || action.mode === "challenge") {
      if (path === "login") {
        const pending = challenge.safeParse(payload);
        if (pending.success) {
          const response = json({ requires2FA: true });
          setAuthCookie(response, challengeCookie, pending.data.challengeToken, 5 * 60);
          return response;
        }
      }
      const issued = authIssue.safeParse(payload);
      if (!issued.success) return unavailable();
      const response = json(
        path === "register" ? { success: true } : { user: { role: issued.data.user.role } },
        backend.status,
      );
      saveSession(response, issued.data.tokens);
      return response;
    }

    if (action.mode === "refresh") {
      const tokens = authTokensSchema.safeParse(payload);
      if (!tokens.success) return unavailable();
      const response = json({ success: true });
      saveSession(response, tokens.data);
      return response;
    }

    if (action.mode === "setup") {
      const pending = factorSetup.safeParse(payload);
      return pending.success ? json(pending.data) : unavailable();
    }

    if (action.mode === "confirm") {
      const confirmed = factorConfirmed.safeParse(payload);
      if (!confirmed.success) return unavailable();
      const response = json(confirmed.data);
      clearSession(response);
      return response;
    }

    if (action.mode === "logout") {
      const response = json({ success: true });
      clearSession(response);
      return response;
    }

    return json({ success: true });
  } catch {
    return unavailable();
  }
}
