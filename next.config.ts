import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { developmentFeaturesEnabled } from "./src/config/development";
import { productionSentryDsn } from "./src/config/sentry";

export default function nextConfig(phase: string): NextConfig {
  const development = phase === PHASE_DEVELOPMENT_SERVER && developmentFeaturesEnabled();
  const demo = development && process.env.SLOPAY_DEMO_MODE === "1";

  const config: NextConfig = {
    env: {
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ??
        (process.env.VERCEL_ENV === "production" ? productionSentryDsn : ""),
    },
    allowedDevOrigins: phase === PHASE_DEVELOPMENT_SERVER ? ["127.0.0.1", "[::1]"] : undefined,
    distDir: demo ? ".next-demo" : ".next",
    devIndicators: development ? undefined : false,
    typescript: { tsconfigPath: demo ? "tsconfig.demo.json" : "tsconfig.json" },
    reactCompiler: true,
    poweredByHeader: false,
    pageExtensions: demo
      ? ["demo.tsx", "demo.ts", "tsx", "ts", "jsx", "js"]
      : ["live.tsx", "tsx", "ts", "jsx", "js"],
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Referrer-Policy", value: "no-referrer" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
            ...(process.env.NODE_ENV === "production"
              ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
              : []),
          ],
        },
      ];
    },
  };

  const authToken = process.env.SENTRY_AUTH_TOKEN;
  return withSentryConfig(config, {
    org: "develoopergab",
    project: "slopay",
    telemetry: false,
    authToken,
    release: { create: Boolean(authToken), finalize: Boolean(authToken) },
    sourcemaps: { disable: !authToken, deleteSourcemapsAfterUpload: true },
    webpack: {
      autoInstrumentServerFunctions: false,
      autoInstrumentMiddleware: false,
      autoInstrumentAppDirectory: false,
      treeshake: { removeDebugLogging: true, removeTracing: true },
    },
  });
}
