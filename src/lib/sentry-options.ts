import type { ErrorEvent } from "@sentry/nextjs";
import { sentryDsn } from "@/config/sentry";

export const backendFailureMessage = "Falha de comunicação com a API do SloPay.";

const exceptionTypes = new Set([
  "Error", "TypeError", "ReferenceError", "SyntaxError", "RangeError", "AggregateError", "ChunkLoadError", "ApiError",
]);

function codePath(path?: string) {
  const clean = path?.replaceAll("\\", "/").split(/[?#]/, 1)[0];
  if (clean?.startsWith("node:")) return clean;
  return clean?.match(/(?:^|\/)((?:_next\/static|\.next\/server|node_modules)\/[\w./()[\]@+-]+)$/)?.[1];
}

function redactError(event: ErrorEvent): ErrorEvent | null {
  if (!event.exception?.values?.length) return null;

  const status = event.tags?.["backend.status"];
  const area = event.tags?.["backend.area"];
  return {
    // Allowlist the metadata we send. Error messages and request context can contain business data.
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: event.release,
    environment: event.environment,
    tags: {
      ...(area === "auth" || area === "api" ? { "backend.area": area } : {}),
      ...(typeof status === "number" && status >= 500 && status <= 599 ? { "backend.status": status } : {}),
    },
    exception: {
      values: event.exception.values.map((exception) => ({
        type: exception.type && exceptionTypes.has(exception.type) ? exception.type : "Error",
        value: exception.value === backendFailureMessage ? backendFailureMessage : "Erro de execução no SloPay.",
        mechanism: exception.mechanism && { type: "generic", handled: exception.mechanism.handled },
        stacktrace: exception.stacktrace && {
          frames: exception.stacktrace.frames?.map((frame) => ({
            filename: codePath(frame.filename),
            abs_path: codePath(frame.abs_path),
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app,
          })),
        },
      })),
    },
    debug_meta: {
      images: event.debug_meta?.images?.flatMap((image) => {
        if (image.type !== "sourcemap") return [];
        const filename = codePath(image.code_file);
        return filename ? [{ type: "sourcemap", code_file: filename, debug_id: image.debug_id }] : [];
      }),
    },
  };
}

export const sentryOptions = {
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
  },
  maxBreadcrumbs: 0,
  sendClientReports: false,
  beforeSend: redactError,
};
