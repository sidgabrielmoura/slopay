import { captureRequestError } from "@sentry/nextjs";
import { sentryDsn } from "@/config/sentry";

export async function register() {
  if (sentryDsn && process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
}

export const onRequestError = captureRequestError;
