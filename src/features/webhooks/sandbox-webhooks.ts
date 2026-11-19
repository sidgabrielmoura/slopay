import { z } from "zod";
import { integrationProofSchema } from "@/features/integrations/integration-proof";

export const sandboxWebhookEvents = ["PIX_CHARGE_CREATED", "PIX_RECEIVED", "PIX_REFUNDED", "APPROVAL_REQUIRED", "PIX_SENT", "WITHDRAWAL_FAILED"] as const;
const eventType = z.enum(sandboxWebhookEvents);
const webhookMode = z.enum(["SEQUENTIAL", "PARALLEL"]);
export const webhookIdSchema = z.uuidv4();
const webhookVersion = z.number().int().positive();

export const webhookSettingsSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  endpointUrl: z.string().trim().max(2048).refine((text) => {
    if (!/^https:\/\//i.test(text) || /[\s\\#]/.test(text) || !URL.canParse(text)) return false;
    const url = new URL(text);
    return Boolean(url.hostname) && !url.username && !url.password && !url.port;
  }),
  eventTypes: z.array(eventType).min(1).max(sandboxWebhookEvents.length).refine((items) => new Set(items).size === items.length),
  deliveryMode: webhookMode,
  retryEnabled: z.boolean(),
});

const target = { id: webhookIdSchema, version: webhookVersion };
export const webhookActionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("create"), settings: webhookSettingsSchema }),
  z.strictObject({ kind: z.literal("update"), ...target, settings: webhookSettingsSchema }),
  z.strictObject({ kind: z.enum(["pause", "enable", "resume", "delete", "rotate-secret", "retry"]), ...target }),
]);

export const confirmedWebhookActionSchema = z.strictObject({ action: webhookActionSchema, proof: integrationProofSchema });
export const webhookVerificationSchema = z.strictObject({ version: webhookVersion });

export const sandboxWebhookSchema = webhookSettingsSchema.extend({
  ...target,
  enabled: z.boolean(),
  verifiedAt: z.iso.datetime().nullable(),
  interruptedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const sandboxWebhookListSchema = z.object({ connected: z.boolean(), webhooks: z.array(sandboxWebhookSchema) });
export const webhookActionResultSchema = z.object({
  webhook: sandboxWebhookSchema,
  signingSecret: z.string().regex(/^whsec_[A-Za-z0-9+/]{43}=$/).optional(),
});

export const webhookDeliveryState = z.enum(["PENDING", "DELIVERED", "EXHAUSTED", "CANCELLED"]);
export const webhookLogFilterSchema = z.strictObject({
  webhookId: webhookIdSchema.optional(),
  state: webhookDeliveryState.optional(),
  before: webhookIdSchema.optional(),
});

export const webhookAttemptSchema = z.object({
  number: z.number().int().positive(),
  state: z.enum(["SENDING", "DELIVERED", "FAILED", "UNKNOWN"]),
  httpStatus: z.number().int().nullable(),
  errorCode: z.string().nullable(),
  durationMs: z.number().int().nullable(),
  startedAt: z.iso.datetime({ offset: true }),
  finishedAt: z.iso.datetime({ offset: true }).nullable(),
});

const webhookDeliverySchema = z.object({
  id: webhookIdSchema,
  state: webhookDeliveryState,
  attemptCount: z.number().int().nonnegative(),
  nextAttemptAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  event: z.object({ id: webhookIdSchema, type: eventType, createdAt: z.iso.datetime() }),
  endpoint: z.object({ ...target, name: z.string() }),
  sending: z.boolean(),
  canRetry: z.boolean(),
});

export const webhookDeliveryPageSchema = z.object({
  items: z.array(webhookDeliverySchema.extend({ lastAttempt: webhookAttemptSchema.nullable() })),
  nextCursor: webhookIdSchema.nullable(),
});
export const webhookDeliveryDetailSchema = webhookDeliverySchema.extend({ attempts: z.array(webhookAttemptSchema) });

export type SandboxWebhook = z.infer<typeof sandboxWebhookSchema>;
export type SandboxWebhookAction = z.infer<typeof webhookActionSchema>;
export type SandboxWebhookActionResult = z.infer<typeof webhookActionResultSchema>;
export type SandboxWebhookDelivery = z.infer<typeof webhookDeliverySchema>;
export type SandboxWebhookAttempt = z.infer<typeof webhookAttemptSchema>;

