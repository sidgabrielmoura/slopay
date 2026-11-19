import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";

export const adminPreferencesPath = "/admin/preferencias";
export const adminPreferencesUnavailable = "Não foi possível consultar as preferências.";
export const adminPreferencesSaveUnavailable = "Não foi possível confirmar o salvamento das preferências.";
export const maxPixNoticeMinimum = 2_000_000_000;

export const adminAppearanceSchema = z.strictObject({
  density: z.enum(["comfortable", "compact"]), hideValues: z.boolean(), reduceMotion: z.boolean(),
});
export const adminPreferencesSchema = adminAppearanceSchema.extend({
  notifyAccountOpenings: z.boolean(), notifyPix: z.boolean(), notifyOperationalWarnings: z.boolean(),
  pixMinimumInCents: z.int().min(0).max(maxPixNoticeMinimum),
});

export const saveAdminPreferencesSchema = z.strictObject({
  changes: adminPreferencesSchema.partial().refine((changes) => Object.values(changes).some((value) => value !== undefined)),
  initialAppearance: adminAppearanceSchema.optional(),
});
export const adminPreferencesViewSchema = z.object({
  preferences: adminPreferencesSchema, updatedAt: z.iso.datetime({ offset: true }).nullable(),
  session: z.object({ idleMinutes: z.int().min(1).max(1440), absoluteHours: z.int().min(1).max(168) }),
  sandboxEnabled: z.boolean(),
});

export type AdminPreferences = z.infer<typeof adminPreferencesSchema>;
export type AdminPreferenceChanges = Partial<AdminPreferences>;
export type AdminPreferencesView = z.infer<typeof adminPreferencesViewSchema>;
type SaveAdminPreferences = z.infer<typeof saveAdminPreferencesSchema>;

export const adminPreferencesKey = (accountId: string) => ["admin-preferences", accountId] as const;

const api = "/api/admin/preferences";
export const adminPreferences = {
  read: (signal: AbortSignal) => requestPixGateway(api, adminPreferencesViewSchema, adminPreferencesUnavailable, { signal }),
  save: (body: SaveAdminPreferences) => requestPixGateway(api, adminPreferencesViewSchema, adminPreferencesSaveUnavailable, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }),
};
