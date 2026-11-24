import { init } from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

if (sentryOptions.enabled) {
  init({
    ...sentryOptions,
    integrations: (defaults) => defaults.filter(({ name }) => name !== "BrowserSession" && name !== "Breadcrumbs"),
  });
}
