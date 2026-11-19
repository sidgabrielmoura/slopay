import "server-only";

import { cookies } from "next/headers";
import { developmentFeaturesEnabled } from "@/config/development";
import { adminDashboardSchema } from "@/features/admin/admin-dashboard";
import { requestBackend } from "./auth-backend";
import { accessCookie } from "./session";

export async function loadAdminDashboard() {
  const accessToken = (await cookies()).get(accessCookie)?.value;
  if (!accessToken) return null;
  try {
    const response = await requestBackend("/admin/dashboard", { method: "GET", accessToken });
    if (!response.ok) return null;
    const report = adminDashboardSchema.safeParse(await response.json());
    return report.success && (developmentFeaturesEnabled() || report.data.environment === "live") ? report.data : null;
  } catch {
    return null;
  }
}
