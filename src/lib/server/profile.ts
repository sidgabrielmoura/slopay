import "server-only";

import { cookies } from "next/headers";
import { profileDetailsSchema } from "@/features/account/profile";
import { requestAuthBackend } from "./auth-backend";
import { accessCookie } from "./session";

export async function loadProfileDetails() {
  const accessToken = (await cookies()).get(accessCookie)?.value;
  if (!accessToken) return null;

  try {
    const response = await requestAuthBackend("profile", { method: "GET", accessToken });
    if (!response.ok) return null;
    return profileDetailsSchema.parse(await response.json());
  } catch {
    return null;
  }
}
