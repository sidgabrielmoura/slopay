import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { profilePhoneRequestSchema, profilePhoneResponseSchema } from "@/features/account/profile";
import { passkeyAssertionSchema, passkeyEnrolledSchema, passkeyIdSchema, passkeyListSchema,
  passkeyOptionsSchema, passkeyPairSchema } from "@/features/auth/passkey-contract";
import {
  passwordChangeChallenge, passwordChangeCompletion, passwordChangeGrant, passwordChangeRequest, passwordChangeVerification,
} from "@/features/auth/password-change-contract";
import {
  registrationEmailChallenge, registrationEmailCorrection, registrationEmailRequest, registrationEmailVerification,
} from "@/features/auth/registration-email-contract";
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
  rememberSession,
  saveSession,
  sessionMarkerCookie,
  setAuthCookie,
} from "@/lib/server/session";
import { readJson, RequestBodyError } from "@/lib/server/request-json";

const maxBodyBytes = 8192;
const password = z.string().min(1).max(128);
const code = z.string().trim().min(6).max(128);
const email = z.email().max(254);
const token = z.string().min(1).max(512);
const credentialId = z.string().min(1).max(1024).regex(/^[A-Za-z0-9_-]+$/);
const credential = z.looseObject({
  id: credentialId,
  rawId: credentialId,
  type: z.literal("public-key"),
  response: z.record(z.string(), z.unknown()),
});
const webAuthnOptions = z.looseObject({ challenge: z.string().min(1).max(128) });
const sessionTimes = z.object({ idleExpiresAt: z.iso.datetime(), absoluteExpiresAt: z.iso.datetime() });
const sessionStatus = sessionTimes.extend({
  state: z.enum(["active", "locked"]),
  requiresMfa: z.boolean(),
  passkeysEnabled: z.boolean(),
  hasPasskey: z.boolean(),
});

type Action = {
  mode: "issue" | "challenge" | "refresh" | "unlock" | "rotate" | "logout" | "setup" | "confirm" | "message" | "data";
  body?: z.ZodType;
  response?: z.ZodType;
  bodyLimit?: number;
  optionalBody?: boolean;
  refreshRequired?: boolean;
  sessionRequired?: boolean;
  challengeRequired?: boolean;
};

const actions: Record<string, Action> = {
  login: { mode: "issue", body: z.object({ email, password }) },
  "login/2fa": { mode: "challenge", body: z.object({ code }) },
  "passkeys/login/options": { mode: "data", response: passkeyOptionsSchema, challengeRequired: true },
  "passkeys/login": { mode: "challenge", body: z.object({ credential: passkeyAssertionSchema }), bodyLimit: 32_768 },
  "passkeys/security/options": {
    mode: "data",
    body: z.object({ action: z.enum(["replace-authenticator", "test-passkey"]) }),
    response: passkeyOptionsSchema,
    sessionRequired: true,
  },
  reauth: {
    mode: "rotate",
    body: z.strictObject({ password, twoFactorCode: z.string().regex(/^\d{6}$/) }),
    sessionRequired: true,
  },
  register: {
    mode: "issue",
    body: z.object({
      email,
      password,
      fullName: z.string().trim().min(1).max(100),
      cpf: z.string().regex(/^\d{11}$/),
      phone: z.string().min(1).max(20),
      invitation: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    }),
  },
  "forgot-password": { mode: "message", body: z.object({ email }) },
  "reset-password": { mode: "message", body: z.object({ token, newPassword: password }) },
  "password-change/request": {
    mode: "data", body: passwordChangeRequest, response: passwordChangeChallenge, sessionRequired: true,
  },
  "password-change/verify": {
    mode: "data", body: passwordChangeVerification, response: passwordChangeGrant, sessionRequired: true,
  },
  "password-change/complete": { mode: "rotate", body: passwordChangeCompletion, sessionRequired: true },
  "verify-email": { mode: "message", body: z.object({ token }) },
  "resend-verification": { mode: "message", sessionRequired: true },
  "email-verification/request": {
    mode: "data", body: registrationEmailRequest, response: registrationEmailChallenge, sessionRequired: true,
  },
  "email-verification/verify": { mode: "message", body: registrationEmailVerification, sessionRequired: true },
  "email-verification/correct": { mode: "rotate", body: registrationEmailCorrection, sessionRequired: true },
  refresh: { mode: "refresh" },
  logout: { mode: "logout" },
  "session/status": { mode: "data", response: sessionStatus, refreshRequired: true },
  "session/activity": { mode: "data", response: sessionTimes, sessionRequired: true },
  "profile/phone": {
    mode: "data", body: profilePhoneRequestSchema, response: profilePhoneResponseSchema, sessionRequired: true,
  },
  "session/unlock": { mode: "unlock", body: z.object({ password, code: code.optional() }), refreshRequired: true },
  "passkeys/credentials": { mode: "data", response: passkeyListSchema, sessionRequired: true },
  "passkeys/test": { mode: "message", body: z.object({ credential: passkeyAssertionSchema }), bodyLimit: 32_768, sessionRequired: true },
  "passkeys/register/options": {
    mode: "data", body: z.strictObject({ replaceId: passkeyIdSchema.optional() }),
    optionalBody: true, response: webAuthnOptions, sessionRequired: true,
  },
  "passkeys/register": {
    mode: "data", body: z.strictObject({ credential, replaceId: passkeyIdSchema.optional() }),
    response: passkeyEnrolledSchema, bodyLimit: 32_768, sessionRequired: true,
  },
  "passkeys/replace/options": { mode: "data", body: passkeyPairSchema, response: webAuthnOptions, sessionRequired: true },
  "passkeys/replace": {
    mode: "message", body: passkeyPairSchema.extend({ credential: passkeyAssertionSchema }), bodyLimit: 32_768, sessionRequired: true,
  },
  "passkeys/unlock/options": { mode: "data", response: webAuthnOptions, refreshRequired: true },
  "passkeys/unlock": { mode: "unlock", body: z.object({ credential }), bodyLimit: 32_768, refreshRequired: true },
  "2fa/setup": {
    mode: "setup",
    body: z.object({ password, currentCode: code.optional(), credential: passkeyAssertionSchema.optional() })
      .refine((input) => !(input.currentCode && input.credential)),
    bodyLimit: 32_768,
    sessionRequired: true,
  },
  "2fa/verify": { mode: "confirm", body: z.object({ code }), sessionRequired: true },
};

const backendMessage = z.object({
  message: z.union([z.string(), z.array(z.string())]).optional(),
  code: z.string().regex(/^[A-Z0-9_]{1,64}$/).optional(),
});

const authIssue = z.object({ user: sessionUserSchema, tokens: authTokensSchema });
const loginUser = sessionUserSchema.pick({
  id: true, role: true, status: true, onboardingRequired: true, isEmailVerified: true, isTwoFactorEnabled: true,
});
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
  tokens: authTokensSchema,
});

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const unavailable = () => json({ message: "Serviço de autenticação indisponível. Tente novamente." }, 503);

function accessExpiry(accessToken: string | undefined) {
  try {
    const payload = JSON.parse(Buffer.from(accessToken?.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.exp === "number" && Number.isSafeInteger(payload.exp) ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
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
        request.headers.get("origin") !== appOrigin(request.url, request.headers.get("host"))) {
      return json({ message: "Origem da solicitação inválida." }, 403);
    }
  } catch {
    return unavailable();
  }

  const accessToken = request.cookies.get(accessCookie)?.value;
  const refreshToken = request.cookies.get(refreshCookie)?.value;
  if (action.sessionRequired && !accessToken) {
    return json({
      message: "Sessão indisponível.",
      code: refreshToken ? "TOKEN_EXPIRED" : "SESSION_EXPIRED",
    }, 401);
  }

  let body: unknown;
  try {
    if (action.body && (request.body || !action.optionalBody)) {
      const parsed = action.body.safeParse(await readJson(request, action.bodyLimit ?? maxBodyBytes));
      if (!parsed.success) return json({ message: "Confira os dados informados." }, 400);
      body = parsed.data;
    }

    if (action.mode === "challenge" || action.challengeRequired) {
      const challengeToken = request.cookies.get(challengeCookie)?.value;
      if (!challengeToken) {
        return json({ message: "O desafio expirou. Entre novamente.", code: "CHALLENGE_EXPIRED" }, 401);
      }
      body = { ...(body as object | undefined), challengeToken };
    }

    if (action.mode === "refresh" || action.mode === "logout" || action.refreshRequired) {
      if (!refreshToken) {
        const response = action.mode === "logout"
          ? json({ success: true })
          : json({ message: "Sessão expirada. Entre novamente.", code: "SESSION_EXPIRED" }, 401);
        // A concurrent refresh can finish after a status request with no refresh cookie.
        if (action.mode === "logout") clearSession(response);
        return response;
      }
      body = { ...(body as object | undefined), refreshToken };
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
      if (action.mode === "refresh" && backend.status === 401 && details.data?.code !== "SESSION_IDLE") {
        clearSession(response, false);
      }
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
        path === "register" ? { success: true } : { user: loginUser.parse(issued.data.user) },
        backend.status,
      );
      saveSession(response, issued.data.tokens);
      return response;
    }

    if (action.mode === "refresh" || action.mode === "unlock" || action.mode === "rotate") {
      const tokens = path === "reauth"
        ? z.object({ success: z.literal(true), tokens: authTokensSchema }).safeParse(payload).data?.tokens
        : authTokensSchema.safeParse(payload).data;
      if (!tokens) return unavailable();
      const response = json({ success: true });
      saveSession(response, tokens);
      return response;
    }

    if (action.mode === "data") {
      const parsed = action.response?.safeParse(payload);
      if (!parsed?.success) return unavailable();
      if (path !== "session/status") return json(parsed.data);
      const response = json({ ...(parsed.data as object), accessExpiresAt: accessExpiry(accessToken) });
      if (!request.cookies.has(sessionMarkerCookie)) rememberSession(response);
      return response;
    }

    if (action.mode === "setup") {
      const pending = factorSetup.safeParse(payload);
      return pending.success ? json(pending.data) : unavailable();
    }

    if (action.mode === "confirm") {
      const confirmed = factorConfirmed.safeParse(payload);
      if (!confirmed.success) return unavailable();
      const response = json({ backupCodes: confirmed.data.backupCodes });
      saveSession(response, confirmed.data.tokens);
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
