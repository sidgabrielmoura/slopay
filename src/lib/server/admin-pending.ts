import "server-only";
import { cookies } from "next/headers";
import { adminPendingSchema } from "@/features/admin/admin-pending";
import { requestBackend } from "./auth-backend";
import { accessCookie } from "./session";

export async function loadAdminPending() {
  const accessToken = (await cookies()).get(accessCookie)?.value;
  if (!accessToken) return null;
  try {
    const response = await requestBackend("/admin/pending", { method: "GET", accessToken });
    if (!response.ok) return null;
    const result = adminPendingSchema.safeParse(await response.json());
    return result.success ? result.data : null;
  } catch { return null; }
}
