// Client DSNs only allow ingestion. This public default belongs to develoopergab/slopay.
export const productionSentryDsn =
  "https://dcd67af883033b149ccfef382a545497@o4512447963267072.ingest.us.sentry.io/4512487097565184";

const configuredDsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
const publicDsn = /^https:\/\/[a-f0-9]{32}@o\d+\.ingest(?:\.[a-z]{2})?\.sentry\.io\/\d+$/;

export const sentryDsn = configuredDsn && publicDsn.test(configuredDsn) ? configuredDsn : undefined;
export const sentryIngestOrigin = sentryDsn ? new URL(sentryDsn).origin : undefined;
