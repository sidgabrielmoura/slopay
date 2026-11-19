import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { developmentFeaturesEnabled } from "./src/config/development";

export default function nextConfig(phase: string): NextConfig {
  const development = phase === PHASE_DEVELOPMENT_SERVER && developmentFeaturesEnabled();
  const demo = development && process.env.SLOPAY_DEMO_MODE === "1";

  return {
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
}
