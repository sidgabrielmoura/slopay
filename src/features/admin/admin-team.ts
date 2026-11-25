import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { operationalPage, operationalSearch } from "./admin-operational-accounts";
import { adminPaginationSchema } from "./admin-pending";
import { adminAccessDraftSchema, adminAccessLevel, adminAccessOptionsSchema, type AdminAccessDraft } from "./admin-access";

export const adminTeamPath = "/admin/equipe";
export const adminTeamUnavailable = "Não foi possível consultar a equipe administrativa.";
export const adminMemberUnavailable = "Não foi possível consultar este membro da equipe.";
const api = "/api/admin/team";
const date = z.iso.datetime({ offset: true });
const count = z.int().nonnegative();
const memberStatus = z.enum(["ACTIVE", "SUSPENDED", "LOCKED", "PENDING_VERIFICATION"]);
const invitationStatus = z.enum(["INVITE_PENDING", "INVITE_ACCEPTED", "INVITE_EXPIRED"]);
const changeAction = z.enum(["SUSPEND", "REACTIVATE", "EDIT_ACCESS", "REMOVE"]);

export const adminMemberStatusFilter = z.enum(["ALL", ...memberStatus.options, ...invitationStatus.options]);
export const adminTeamQuery = z.strictObject({
  search: operationalSearch.default(""),
  status: adminMemberStatusFilter.default("ALL"),
  page: operationalPage.default(1),
});
export const adminMemberQuery = z.strictObject({ page: operationalPage.default(1) });

const member = z.object({
  id: z.uuid(), name: z.string(), email: z.email(), status: memberStatus,
  mfaEnabled: z.boolean(), lastLoginAt: date.nullable(),
  accessLevel: adminAccessLevel.default("VIEWER"),
});
const invitation = z.object({
  status: invitationStatus,
  expiresAt: date,
  acceptedAt: date.nullable(),
  emailState: z.enum(["PENDING", "ACCEPTED", "FAILED"]).nullable(),
});
const teamEntry = z.union([
  member.extend({ kind: z.literal("member").default("member"), invitation: invitation.nullable().default(null) }),
  z.object({
    kind: z.literal("invitation"), id: z.uuid(), email: z.email(),
    status: invitationStatus, invitation, accessLevel: adminAccessLevel.default("VIEWER"),
  }),
]);
export const adminTeamSchema = z.object({
  summary: z.object({ total: count, active: count, suspended: count, restricted: count }),
  items: z.array(teamEntry).max(8),
  pagination: adminPaginationSchema,
});
export const adminMemberSchema = z.object({
  member: member.extend({
    createdAt: date, emailVerified: z.boolean(), passkeyRegistered: z.boolean(), activeSessions: count,
    version: count, availableAction: z.enum(["SUSPEND", "REACTIVATE"]).nullable(),
    canManage: z.boolean().default(false), removalProtected: z.boolean().default(true), grants: adminAccessDraftSchema.shape.grants,
  }),
  history: z.array(z.object({
    id: z.string(), actorName: z.string().nullable(), createdAt: date,
    action: changeAction, reason: z.string().min(1).max(600), revokedSessions: count,
  })).max(8),
  pagination: adminPaginationSchema,
});

export const adminTeamChangeSchema = z.strictObject({
  action: changeAction, version: count.max(2_147_483_646),
  reason: z.string().trim().min(1).max(600).regex(/^(?:[^\p{Cc}\p{Cf}]|[\r\n])*$/u),
  accessLevel: adminAccessLevel.optional(),
  grants: z.array(z.string().regex(/^admin\.[a-z]+\.[a-z]+$/)).max(100).optional(),
  name: z.string().trim().min(2).max(150).optional(),
});
export const adminTeamConfirmedChange = adminTeamChangeSchema.extend({ proof: integrationProofSchema });
export const adminTeamChangedSchema = z.object({ updated: z.literal(true), revokedSessions: count });
export const adminTeamInviteSchema = z.strictObject({
  email: z.email().trim().toLowerCase().max(254), ...adminAccessDraftSchema.shape,
});
const inviteConfirmation = z.string().max(1024).regex(/^[\w-]+\.[\w-]+\.[\w-]+$/);
export const adminTeamInviteOptionsSchema = passkeyOptionsSchema.extend({ confirmation: inviteConfirmation });
export const adminTeamConfirmedInvite = adminTeamInviteSchema.extend({ confirmation: inviteConfirmation, proof: integrationProofSchema });
export const adminTeamInvitedSchema = z.object({ invited: z.literal(true) });

export type AdminTeamQuery = z.infer<typeof adminTeamQuery>;
export type AdminTeamSummary = z.infer<typeof adminTeamSchema>["summary"];
export type AdminTeamMember = z.infer<typeof member>;
export type AdminTeamEntry = z.infer<typeof teamEntry>;
export type AdminMemberDetail = z.infer<typeof adminMemberSchema>["member"];
export type AdminMemberAccessEvent = z.infer<typeof adminMemberSchema>["history"][number];
export type AdminTeamChange = z.infer<typeof adminTeamChangeSchema>;

export const adminTeamStatuses = {
  ACTIVE: { label: "Ativo", variant: "success" },
  SUSPENDED: { label: "Suspenso", variant: "destructive" },
  LOCKED: { label: "Bloqueado", variant: "warning" },
  PENDING_VERIFICATION: { label: "Verificação pendente", variant: "info" },
  INVITE_PENDING: { label: "Convite pendente", variant: "info" },
  INVITE_ACCEPTED: { label: "Convite aceito", variant: "success" },
  INVITE_EXPIRED: { label: "Convite expirado", variant: "secondary" },
} as const;

export function adminTeamQueryFrom(params: Pick<URLSearchParams, "get">): AdminTeamQuery {
  return {
    search: operationalSearch.catch("").parse(params.get("search")),
    status: adminMemberStatusFilter.catch("ALL").parse(params.get("status")),
    page: operationalPage.catch(1).parse(params.get("page")),
  };
}

export function adminTeamParams(query: AdminTeamQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

export function adminTeamHref(query: AdminTeamQuery) {
  const params = adminTeamParams(query);
  return adminTeamPath + (params.size ? "?" + params : "");
}

function post(body: object) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const adminTeamKey = (userId: string) => ["admin-team", userId] as const;
export const adminMemberKey = (userId: string, memberId: string) => ["admin-team-member", userId, memberId] as const;

export const adminTeam = {
  accessOptions: ({ signal }: { signal: AbortSignal }) =>
    requestPixGateway(`${api}/access-options`, adminAccessOptionsSchema, "Níveis de acesso indisponíveis.", { signal }),
  list: (query: AdminTeamQuery, signal: AbortSignal) =>
    requestPixGateway(api + "?" + adminTeamParams(query), adminTeamSchema, adminTeamUnavailable, { signal }),
  member: (id: string, page: number, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}?page=${page}`, adminMemberSchema, adminMemberUnavailable, { signal }),
  options: (id: string, change: AdminTeamChange) =>
    requestPixGateway(`${api}/${id}/change/options`, passkeyOptionsSchema, "Não foi possível preparar a confirmação.", post(change)),
  change: (id: string, change: AdminTeamChange, proof: IntegrationProof) =>
    requestPixGateway(`${api}/${id}/change`, adminTeamChangedSchema, "Não foi possível alterar o acesso.", post({ ...change, proof })),
  inviteOptions: (email: string, access: AdminAccessDraft) =>
    requestPixGateway(`${api}/invite/options`, adminTeamInviteOptionsSchema, "Não foi possível preparar o convite.", post({ email, ...access })),
  invite: (email: string, confirmation: string, proof: IntegrationProof, access: AdminAccessDraft) =>
    requestPixGateway(`${api}/invite`, adminTeamInvitedSchema, "Não foi possível registrar o convite.", post({ email, confirmation, proof, ...access })),
};
