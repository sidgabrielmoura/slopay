import { z } from "zod";

export const supportScopeCookie = (process.env.NODE_ENV === "production" ? "__Host-" : "") + "slopay_support";
export const supportScopeHeader = "x-slopay-support-id";
export const supportScopeMeta = "slopay-support";
export const supportApiRequestHeader = "x-slopay-api-request";
export const supportContextChanged = "SUPPORT_CONTEXT_CHANGED";
export const supportSessionUnavailable = "SUPPORT_SESSION_UNAVAILABLE";
export const supportActivitySchema = z.object({ activeForMs: z.int().min(0).max(120_000) });
export const supportPanelSessionSchema = supportActivitySchema.extend({
  id: z.uuidv4(),
  companyId: z.uuid(),
  permissions: z.array(z.string()).optional(),
});
export type PanelSupportSession = z.infer<typeof supportPanelSessionSchema>;

export const supportOwnerConfirmationMessage = "O titular precisa confirmar esta mudança com os próprios fatores.";

export function canActInSupport(session: PanelSupportSession | undefined,
  action: "payments" | "integrations" | "team" | "profile" | "export") {
  return !session || session.permissions?.includes("admin.support." + action) === true;
}

export function isSupportPanelPath(path: string) {
  return /^\/(inicio|pix|movimentacoes|aprovacoes|integracoes|conta|indicadores|preferencias|mais|ajuda|controle-financeiro|comprovantes)(?:[/?]|$)/.test(path);
}

export function isSupportBackendPath(path: string) {
  return /^\/(dashboard|payments|integrations|merchant)(?:\/|$)/.test(path) ||
    ["/auth/profile", "/auth/profile/phone", "/account-opening", "/account-opening/resubmit"].includes(path);
}

export function supportRequestHeaders(path: string, original?: HeadersInit) {
  if (typeof document === "undefined" || !path.startsWith("/api/")) return original;
  const id = document.querySelector<HTMLMetaElement>('meta[name="' + supportScopeMeta + '"]')?.content;
  if (!id) return original;
  const headers = new Headers(original);
  headers.set(supportScopeHeader, id);
  return headers;
}
